// ── AI Model Registry ─────────────────────────────────────────────────────────
// One place to add, remove, or reorder models.
// Routes and service logic never touch model strings — only this file does.
//
// Add a new provider:  add a key with apiKeyEnv + models array + any extra cfg.
// Reorder priority:    move entries up/down inside models[].
// Deprecate a model:   delete its entry — zero code changes elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

const AI_REGISTRY = {

  gemini: {
    apiKeyEnv: 'GEMINI_API_KEY',
    baseUrl:   'https://generativelanguage.googleapis.com/v1beta/models',
    // Ordered by preference — first entry is tried first
    models: [
      { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash'      },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite'  },
      { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash'       },
    ],
  },

  groq: {
    apiKeyEnv:   'GROQ_API_KEY',
    url:         'https://api.groq.com/openai/v1/chat/completions',
    temperature: 0.7,
    max_tokens:  2048,
    models: [
      { id: 'llama3-8b-8192',            label: 'LLaMA 3 8B'           },
      { id: 'llama-3.1-8b-instant',      label: 'LLaMA 3.1 8B Instant' },
      { id: 'llama3-70b-8192',           label: 'LLaMA 3 70B'          },
      { id: 'llama-3.3-70b-versatile',   label: 'LLaMA 3.3 70B'        },
      { id: 'gemma2-9b-it',              label: 'Gemma 2 9B'           },
    ],
  },

};

module.exports = { AI_REGISTRY };
