// ── AI Service Layer ──────────────────────────────────────────────────────────
// Handles the actual HTTP calls to each provider and the fallback loop.
// Routes only call tryWithFallback() — they never touch model IDs or API URLs.
// ─────────────────────────────────────────────────────────────────────────────

const { AI_REGISTRY } = require('./ai-config');

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
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);

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

// ── Fallback loop ─────────────────────────────────────────────────────────────
// Iterates through cfg.models in order, returns on first success,
// collects errors for logging, throws only if every model fails.

async function tryWithFallback(provider, messages) {
  const cfg = AI_REGISTRY[provider];
  if (!cfg) throw new Error(`Unknown provider: ${provider}`);

  const apiKey = process.env[cfg.apiKeyEnv];
  if (!apiKey) throw new Error(`${cfg.apiKeyEnv} is not configured on the server`);

  const call   = PROVIDERS[provider];
  const errors = [];

  for (const model of cfg.models) {
    try {
      console.log(`[ai:${provider}] trying ${model.id}`);
      const text = await call(model, messages, apiKey, cfg);
      console.log(`[ai:${provider}] success  ${model.id}`);
      return { text };
    } catch (err) {
      console.warn(`[ai:${provider}] failed   ${model.id} — ${err.message}`);
      errors.push(`${model.label}: ${err.message}`);
    }
  }

  // Every model in the list failed
  const summary = errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n');
  throw new Error(`All ${provider} models failed:\n${summary}`);
}

module.exports = { tryWithFallback };
