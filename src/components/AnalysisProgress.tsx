
import React from 'react';
import { AnalysisStep, ModelConfig } from '../types';
import { Brain, PencilRuler, Terminal, ShieldCheck, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';

interface AnalysisProgressProps {
  currentStep: AnalysisStep;
  modelConfig?: ModelConfig;
}

const STEP_DEFINITIONS = [
  {
    id: AnalysisStep.ANALYST,
    label: "Analyst",
    description: "Mapping logic & security flaws",
    icon: Brain,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20"
  },
  {
    id: AnalysisStep.ARCHITECT,
    label: "Architect",
    description: "Designing Pydantic models",
    icon: PencilRuler,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20"
  },
  {
    id: AnalysisStep.CODER,
    label: "Coder",
    description: "Implementing FastAPI logic",
    icon: Terminal,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20"
  },
  {
    id: AnalysisStep.AUDITOR,
    label: "Auditor",
    description: "Verifying security & hallucinations",
    icon: ShieldCheck,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20"
  }
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ currentStep, modelConfig }) => {
  const getStepStatus = (stepId: AnalysisStep) => {
    const stepOrder = [
      AnalysisStep.ANALYST,
      AnalysisStep.ARCHITECT,
      AnalysisStep.CODER,
      AnalysisStep.AUDITOR,
      AnalysisStep.COMPLETE
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (currentStep === AnalysisStep.ERROR) return 'error';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getModelInfo = (stepId: AnalysisStep) => {
    if (!modelConfig) return "Pending...";
    const selection = modelConfig[stepId as keyof ModelConfig];
    if (!selection) return "Unknown";

    let displayModel = selection.model;
    if (displayModel.startsWith('gemini-')) displayModel = displayModel.replace('gemini-', 'Gemini ');
    if (displayModel.includes('/')) displayModel = displayModel.split('/')[1]; // Remove provider prefix in model name if exists

    return `${selection.provider === 'google' ? 'Google' : 'OpenRouter'} • ${displayModel}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-2xl mx-auto my-8 shadow-2xl">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 text-center">
        Migration Chain of Thought
      </h3>
      <div className="space-y-4">
        {STEP_DEFINITIONS.map((step) => {
          const status = getStepStatus(step.id);
          const isCompleted = status === 'completed';
          const isActive = status === 'active';
          const isPending = status === 'pending';
          const modelInfo = getModelInfo(step.id);

          return (
            <div 
              key={step.id}
              className={`
                relative flex items-center p-4 rounded-xl border transition-all duration-500
                ${isActive ? `${step.bg} ${step.border} scale-[1.02] shadow-lg` : 'bg-slate-800/30 border-slate-800'}
                ${isPending ? 'opacity-50 grayscale' : 'opacity-100'}
              `}
            >
              <div className={`p-3 rounded-lg mr-4 ${isActive || isCompleted ? step.bg : 'bg-slate-800'}`}>
                <step.icon className={`w-6 h-6 ${isActive || isCompleted ? step.color : 'text-slate-600'}`} />
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`font-bold ${isActive || isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                    {step.label}
                  </h4>
                  <span className="text-[10px] font-mono bg-black/30 px-2 py-0.5 rounded text-slate-400 border border-slate-700/50">
                    {modelInfo}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{step.description}</p>
              </div>

              <div className="ml-4 w-6 flex justify-center">
                 {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                 {isActive && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
                 {isPending && <CircleDashed className="w-5 h-5 text-slate-700" />}
              </div>
              
              {isActive && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-12 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
