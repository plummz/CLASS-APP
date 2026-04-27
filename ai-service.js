// ── AI Service Layer ──────────────────────────────────────────────────────────
// Handles the actual HTTP calls to each provider and the fallback loop.
// Routes only call tryWithFallback() — they never touch model IDs or API URLs.
// ─────────────────────────────────────────────────────────────────────────────

const { AI_REGISTRY } = require('./features/ai/ai-config');

// ── Per-provider call functions ───────────────────────────────────────────────

async function callGemini(model, messages, apiKey, cfg) {
  const contents = messages.map(m => ({
    role:  m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const res  = await fetch(`${cfg.baseUrl}/${model.id}:generateContent?key=${apiKey}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ contents }),
  });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data.error?.message || `HTTP ${res.status}`;
    const err = new Error(errMsg);
    // Mark quota errors so tryWithFallback can skip to next provider
    if (errMsg.includes('Resource has been exhausted') ||
        errMsg.includes('Quota') ||
        errMsg.includes('quota')) {
      err.isQuotaError = true;
    }
    throw err;
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response');
  return text;
}

async function callGroq(model, messages, apiKey, cfg) {
  const res  = await fetch(cfg.url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body:    JSON.stringify({
      model:       model.id,
      messages:    messages.map(m => ({ role: m.role, content: m.content })),
      temperature: cfg.temperature,
      max_tokens:  cfg.max_tokens,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response');
  return text;
}

// Map provider name → its call function.
// Adding a new provider: add its function above, then register it here.
const PROVIDERS = {
  gemini: callGemini,
  groq:   callGroq,
};

// ── Local fallback summarizer ──────────────────────────────────────────────────
// When all AI providers fail, extract key sentences from the text.

function localFallbackSummarize(text) {
  if (!text || text.trim().length === 0) {
    return 'No content to summarize.';
  }

  // Split into sentences (basic heuristic)
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) return text.substring(0, 500);

  // Take ~30% of sentences, up to 5, ensuring diversity
  const count = Math.max(2, Math.min(5, Math.ceil(sentences.length * 0.3)));
  const indices = [];
  const step = Math.max(1, Math.floor(sentences.length / count));
  for (let i = 0; i < sentences.length && indices.length < count; i += step) {
    indices.push(i);
  }

  return indices
    .map(i => sentences[i])
    .join('. ') + '.';
}

// ── Fallback loop ─────────────────────────────────────────────────────────────
// Three-tier fallback: Gemini → Groq → Local summarizer
// If Gemini hits quota, skip it and go straight to Groq.

async function tryWithFallback(provider, messages) {
  const cfg = AI_REGISTRY[provider];
  if (!cfg) throw new Error(`Unknown provider: ${provider}`);

  const apiKey = process.env[cfg.apiKeyEnv];
  if (!apiKey) throw new Error(`${cfg.apiKeyEnv} is not configured on the server`);

  const call   = PROVIDERS[provider];
  const errors = [];
  let quotaHit = false;

  // Try all models in the current provider
  for (const model of cfg.models) {
    try {
      console.log(`[ai:${provider}] trying ${model.id}`);
      const text = await call(model, messages, apiKey, cfg);
      console.log(`[ai:${provider}] success  ${model.id}`);
      return { text };
    } catch (err) {
      console.warn(`[ai:${provider}] failed   ${model.id} — ${err.message}`);
      errors.push(`${model.label}: ${err.message}`);
      // If quota error, mark it so we skip to next provider
      if (err.isQuotaError) {
        quotaHit = true;
      }
    }
  }

  // If Gemini hit quota, skip to Groq directly
  if (provider === 'gemini' && quotaHit) {
    console.log('[ai] Gemini quota exhausted, switching to Groq');
    try {
      return await tryWithFallback('groq', messages);
    } catch (groqErr) {
      console.log('[ai] Groq also failed, falling back to local summarizer');
      // Extract the text from messages to summarize locally
      const textToSummarize = messages.map(m => m.content).join('\n');
      return { text: localFallbackSummarize(textToSummarize), fromLocal: true };
    }
  }

  // If Groq failed and we're asked for Groq, try local summarizer as final fallback
  if (provider === 'groq') {
    console.log('[ai] All Groq models failed, falling back to local summarizer');
    const textToSummarize = messages.map(m => m.content).join('\n');
    return { text: localFallbackSummarize(textToSummarize), fromLocal: true };
  }

  // Every model in the list failed and no fallback available
  const summary = errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n');
  throw new Error(`All ${provider} models failed:\n${summary}`);
}

module.exports = { tryWithFallback };
