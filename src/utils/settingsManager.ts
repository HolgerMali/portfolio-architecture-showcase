// utils/settingsManager.ts

export const getStoredApiKey = (provider: 'google' | 'openrouter'): string | undefined => {
  if (typeof window === 'undefined') return undefined; // Server-side safety

  // 1. Priorität: User hat es im UI eingegeben (LocalStorage)
  const storedKey = localStorage.getItem(`${provider.toUpperCase()}_API_KEY`);
  if (storedKey) return storedKey;

  // 2. Priorität: Environment Variable (für lokale Dev oder Docker)
  if (provider === 'google') return process.env.API_KEY;
  if (provider === 'openrouter') return process.env.OPENROUTER_API_KEY;

  return undefined;
};

export const getModelForRole = (role: 'analyst' | 'architect' | 'coder' | 'auditor') => {
    // Hier später: Logic um das vom User gewählte Modell aus LocalStorage zu holen
    // Default Fallback:
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`MODEL_${role.toUpperCase()}`);
        if (stored) return JSON.parse(stored); // Erwartet { provider: '...', model: '...' }
    }
    
    // Default Defaults
    if (role === 'auditor') return { provider: 'openrouter', model: 'google/gemma-3-27b-it:free' };
    return { provider: 'google', model: 'gemini-3.0-flash' };
};