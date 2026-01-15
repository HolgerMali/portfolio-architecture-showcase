import React, { useState, useEffect } from 'react';
import { AnalysisStep, ModelConfig, LlmProvider, ApiKeys } from '../types';
import { Settings, Save, Cpu, RotateCcw, Server, Key, RefreshCw, X } from 'lucide-react';

interface SettingsModalProps {
  initialConfig?: ModelConfig;
  initialKeys: ApiKeys;
  onSave: (config: ModelConfig, keys: ApiKeys) => void;
  onClose: () => void;
}

// Default Models for fallback
const GOOGLE_DEFAULTS = [
  { label: 'Gemini 3 Pro (Preview)', value: 'gemini-3-pro-preview' },
  { label: 'Gemini 3 Flash (Preview)', value: 'gemini-3-flash-preview' },
  { label: 'Gemini Flash (Latest)', value: 'gemini-flash-latest' },
  { label: 'Gemini Flash Lite', value: 'gemini-flash-lite-latest' },
];

const OPENROUTER_DEFAULTS = [
  { label: 'Google Gemma 3 27B IT (Free)', value: 'google/gemma-3-27b-it:free' },
  { label: 'OpenAI GPT-4o', value: 'openai/gpt-4o' },
  { label: 'Anthropic Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
  { label: 'Meta Llama 3.1 405B', value: 'meta-llama/llama-3.1-405b-instruct' },
];

const DEFAULT_CONFIG: ModelConfig = {
  [AnalysisStep.ANALYST]: { provider: 'google', model: 'gemini-3-flash-preview' },
  [AnalysisStep.ARCHITECT]: { provider: 'google', model: 'gemini-3-flash-preview' },
  [AnalysisStep.CODER]: { provider: 'google', model: 'gemini-3-flash-preview' },
  [AnalysisStep.AUDITOR]: { provider: 'openrouter', model: 'google/gemma-3-27b-it:free' },
};

interface ModelOption {
  label: string;
  value: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ initialConfig, initialKeys, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'models'>('keys');
  const [config, setConfig] = useState<ModelConfig>(initialConfig || DEFAULT_CONFIG);
  const [keys, setKeys] = useState<ApiKeys>(initialKeys);
  const [openRouterModels, setOpenRouterModels] = useState<ModelOption[]>(OPENROUTER_DEFAULTS);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Load OpenRouter cache if available
  useEffect(() => {
    const cached = localStorage.getItem('legacy_refactor_or_models');
    if (cached) {
      try {
        setOpenRouterModels(JSON.parse(cached));
      } catch(e) {}
    }
  }, []);

  const handleProviderChange = (step: AnalysisStep, provider: LlmProvider) => {
    const defaultModel = provider === 'google' ? GOOGLE_DEFAULTS[1].value : openRouterModels[0].value;
    setConfig(prev => ({
      ...prev,
      [step]: { provider, model: defaultModel }
    }));
  };

  const handleModelChange = (step: AnalysisStep, model: string) => {
    setConfig(prev => ({
      ...prev,
      [step]: { ...prev[step], model }
    }));
  };

  const fetchOpenRouterModels = async () => {
    if (!keys.openrouter) {
      setFetchError("Please save an OpenRouter API Key first.");
      return;
    }
    
    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          "Authorization": `Bearer ${keys.openrouter}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch models");
      
      const data = await response.json();
      
      const models = data.data.map((m: any) => ({
        label: m.name,
        value: m.id,
        isFree: m.id.includes(':free') || m.pricing?.input === '0'
      }));

      // Sort: Free first (alpha), then Paid (alpha)
      models.sort((a: any, b: any) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.label.localeCompare(b.label);
      });

      const options = models.map((m: any) => ({ label: m.label, value: m.value }));
      
      setOpenRouterModels(options);
      localStorage.setItem('legacy_refactor_or_models', JSON.stringify(options));
      setActiveTab('models'); // Switch to models tab to show results
    } catch (err: any) {
      setFetchError(err.message || "Could not fetch models.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = () => {
    onSave(config, keys);
    onClose();
  };

  const stepsToConfigure = [
    { key: AnalysisStep.ANALYST, label: 'Analyst Step', desc: 'Analyzes logic & dependencies' },
    { key: AnalysisStep.ARCHITECT, label: 'Architect Step', desc: 'Designs system structure' },
    { key: AnalysisStep.CODER, label: 'Coder Step', desc: 'Generates implementation' },
    { key: AnalysisStep.AUDITOR, label: 'Auditor Step', desc: 'Security review (Cross-Model)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
               <Settings className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Application Settings</h2>
              <p className="text-slate-400 text-xs">Manage API Keys and Agent Configurations</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('keys')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'keys' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-400 hover:text-slate-200'}`}
          >
            API Keys
          </button>
          <button 
            onClick={() => setActiveTab('models')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'models' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Model Configuration
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'keys' && (
            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="flex items-center space-x-2 text-sm font-bold text-slate-200">
                   <div className="p-1 bg-blue-500/20 rounded"><Key className="w-3 h-3 text-blue-400" /></div>
                   <span>Google Gemini API Key</span>
                 </label>
                 <input 
                    type="password" 
                    value={keys.google}
                    onChange={(e) => setKeys(prev => ({...prev, google: e.target.value}))}
                    placeholder="AIza..."
                    className="w-full bg-[#0b1120] border border-slate-700 text-slate-200 text-sm rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                 />
                 <p className="text-xs text-slate-500">Required for most operations. Stored locally.</p>
               </div>

               <div className="space-y-2 pt-4 border-t border-slate-800">
                 <label className="flex items-center space-x-2 text-sm font-bold text-slate-200">
                   <div className="p-1 bg-purple-500/20 rounded"><Key className="w-3 h-3 text-purple-400" /></div>
                   <span>OpenRouter API Key</span>
                 </label>
                 <div className="flex space-x-2">
                    <input 
                        type="password" 
                        value={keys.openrouter}
                        onChange={(e) => setKeys(prev => ({...prev, openrouter: e.target.value}))}
                        placeholder="sk-or-..."
                        className="flex-1 bg-[#0b1120] border border-slate-700 text-slate-200 text-sm rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <button 
                      onClick={fetchOpenRouterModels}
                      disabled={isFetching || !keys.openrouter}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                       {isFetching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                       <span>Fetch Models</span>
                    </button>
                 </div>
                 {fetchError && <p className="text-xs text-red-400">{fetchError}</p>}
                 <p className="text-xs text-slate-500">Required for Auditor step or alternate models.</p>
               </div>
            </div>
          )}

          {activeTab === 'models' && (
             <div className="space-y-6">
               <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg mb-6">
                  <p className="text-xs text-blue-300">
                    <span className="font-bold">Note:</span> If you fetched models from OpenRouter, they will appear in the dropdowns below when "OpenRouter" is selected as the provider.
                  </p>
               </div>

               {stepsToConfigure.map((step) => {
                const currentSelection = config[step.key as AnalysisStep];
                const isGoogle = currentSelection.provider === 'google';
                const availableModels = isGoogle ? GOOGLE_DEFAULTS : openRouterModels;

                return (
                  <div key={step.key} className="flex flex-col space-y-2 pb-4 border-b border-slate-800/50 last:border-0">
                     <div className="flex justify-between items-end mb-1">
                       <label className="text-sm font-bold text-slate-200">{step.label}</label>
                       <span className="text-[10px] text-slate-500 uppercase tracking-wide">{step.desc}</span>
                     </div>
                     
                     <div className="flex space-x-4">
                       <div className="w-1/3 relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Server className="w-4 h-4 text-slate-500" />
                          </div>
                          <select
                            value={currentSelection.provider}
                            onChange={(e) => handleProviderChange(step.key as AnalysisStep, e.target.value as LlmProvider)}
                            className="w-full bg-[#0b1120] border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                          >
                            <option value="google">Google Gemini</option>
                            <option value="openrouter">OpenRouter</option>
                          </select>
                       </div>

                       <div className="w-2/3 relative">
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Cpu className="w-4 h-4 text-slate-500" />
                         </div>
                         <select
                           value={currentSelection.model}
                           onChange={(e) => handleModelChange(step.key as AnalysisStep, e.target.value)}
                           className="w-full bg-[#0b1120] border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                         >
                           {availableModels.map(model => (
                             <option key={model.value} value={model.value}>
                               {model.label}
                             </option>
                           ))}
                         </select>
                       </div>
                     </div>
                  </div>
                );
              })}
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <button 
            onClick={() => setConfig(DEFAULT_CONFIG)}
            className="flex items-center space-x-2 text-xs text-slate-500 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
