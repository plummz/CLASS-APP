// Central AI provider configuration — all model names live here.
// To switch models, update this file only; routes pick it up automatically.

const AI_CONFIG = {
  gemini: {
    apiKeyEnv: 'GEMINI_API_KEY',
    baseUrl:   'https://generativelanguage.googleapis.com/v1beta/models',
    primary:   'gemini-1.5-flash',
    fallback:  'gemini-1.5-flash-8b',
  },
  groq: {
    apiKeyEnv: 'GROQ_API_KEY',
    url:       'https://api.groq.com/openai/v1/chat/completions',
    primary:   'llama3-8b-8192',
    fallback:  'llama3-70b-8192',
    temperature: 0.7,
    max_tokens:  2048,
  },
};

function getAIProvider(provider) {
  const cfg = AI_CONFIG[provider];
  if (!cfg) throw new Error(`Unknown AI provider: ${provider}`);
  return cfg;
}

module.exports = { AI_CONFIG, getAIProvider };
