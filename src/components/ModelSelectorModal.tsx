
import React, { useState, useEffect } from 'react';
import { AnalysisStep, ModelConfig, LlmProvider, ModelSelection } from '../types';
import { Settings, Save, Cpu, RotateCcw, Server } from 'lucide-react';

interface ModelSelectorModalProps {
  initialConfig?: ModelConfig;
  onSave: (config: ModelConfig) => void;
}

// Model Options
const GOOGLE_MODELS = [
  { label: 'Gemini 3 Pro (Preview)', value: 'gemini-3-pro-preview' },
  { label: 'Gemini 3 Flash (Preview)', value: 'gemini-3-flash-preview' },
  { label: 'Gemini Flash (Latest)', value: 'gemini-flash-latest' },
  { label: 'Gemini Flash Lite', value: 'gemini-flash-lite-latest' },
];

const OPENROUTER_MODELS = [
  { label: 'Google Gemma 3 27B IT', value: 'google/gemma-3-27b-it:free' },
  { label: 'Qwen3 Coder', value: 'qwen/qwen3-coder:free' },
  { label: 'OpenAI GPT-4o', value: 'openai/gpt-4o' },
  { label: 'Anthropic Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
  { label: 'Meta Llama 3.1 405B', value: 'meta-llama/llama-3.1-405b-instruct' },
];

// Default configuration with Auditor using OpenRouter as requested
const DEFAULT_CONFIG: ModelConfig = {
  [AnalysisStep.ANALYST]: { provider: 'google', model: 'gemini-3-flash-preview' },
  [AnalysisStep.ARCHITECT]: { provider: 'google', model: 'gemini-3-pro' },
  [AnalysisStep.CODER]: { provider: 'openrouter', model: 'mistralai/devstral-2512:free' },
  [AnalysisStep.AUDITOR]: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
};

// Storage key versioned to force reset for new schema
const STORAGE_KEY = 'legacy_refactor_model_config_v2';

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({ initialConfig, onSave }) => {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    // 1. Try to use passed initial config
    if (initialConfig) {
      setConfig(initialConfig);
      return;
    }

    // 2. Try to load from local storage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Basic validation to check if structure matches new schema
        if (parsed[AnalysisStep.ANALYST]?.provider) {
           setConfig(parsed);
        } else {
           setConfig(DEFAULT_CONFIG);
        }
      } catch (e) {
        setConfig(DEFAULT_CONFIG);
      }
    } else {
      setConfig(DEFAULT_CONFIG);
    }
  }, [initialConfig]);

  const handleProviderChange = (step: AnalysisStep, provider: LlmProvider) => {
    // When switching provider, pick the first default model of that provider
    const defaultModel = provider === 'google' ? GOOGLE_MODELS[1].value : OPENROUTER_MODELS[0].value;
    
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

  const handleResetDefaults = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    onSave(config);
  };

  const stepsToConfigure = [
    { key: AnalysisStep.ANALYST, label: 'Analyst Step', desc: 'Analyzes logic & dependencies' },
    { key: AnalysisStep.ARCHITECT, label: 'Architect Step', desc: 'Designs system structure' },
    { key: AnalysisStep.CODER, label: 'Coder Step', desc: 'Generates implementation' },
    { key: AnalysisStep.AUDITOR, label: 'Auditor Step', desc: 'Security review (Cross-Model)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
        
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
               <Settings className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Multi-Provider Configuration</h2>
              <p className="text-slate-400 text-xs">Configure LLM providers and models for each agent.</p>
            </div>
          </div>
          <button 
            onClick={handleResetDefaults}
            className="text-slate-500 hover:text-white transition-colors p-2 rounded hover:bg-slate-800"
            title="Reset to Defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {stepsToConfigure.map((step) => {
            const currentSelection = config[step.key as AnalysisStep];
            const isGoogle = currentSelection.provider === 'google';
            const availableModels = isGoogle ? GOOGLE_MODELS : OPENROUTER_MODELS;

            return (
              <div key={step.key} className="flex flex-col space-y-2 pb-4 border-b border-slate-800/50 last:border-0">
                 <div className="flex justify-between items-end mb-1">
                   <label className="text-sm font-bold text-slate-200">{step.label}</label>
                   <span className="text-[10px] text-slate-500 uppercase tracking-wide">{step.desc}</span>
                 </div>
                 
                 <div className="flex space-x-4">
                   {/* Provider Select */}
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

                   {/* Model Select */}
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

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
