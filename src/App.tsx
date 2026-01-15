
import React, { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { RefactorResult, Tab, AnalysisStep, AnalystPlan, FileMap, LogEntry, ModelConfig, ApiKeys } from './types';
import { startAnalysis, completeMigration } from './services/migrationService'; // Updated import
import { DEMO_PHP_CODE, ADMIN_PORTAL_MAIN, ADMIN_PORTAL_DEP } from './constants';
import { CodeEditor } from './components/CodeEditor';
import { SecurityCard } from './components/SecurityCard';
import { AnalysisProgress } from './components/AnalysisProgress';
import { DependencyModal } from './components/DependencyModal';
import { MultiFileViewer } from './components/MultiFileViewer';
import { DebugViewer } from './components/DebugViewer';
import { SettingsModal } from './components/SettingsModal'; // Updated component
import { 
  Code, 
  ShieldAlert, 
  FileJson, 
  Zap, 
  ArrowRight, 
  Loader2, 
  Terminal,
  Play,
  FileText,
  CheckCircle,
  Download,
  Bug,
  RotateCcw,
  Settings as SettingsIcon,
  Skull
} from 'lucide-react';

const App: React.FC = () => {
  const [inputCode, setInputCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>(Tab.INPUT);
  const [result, setResult] = useState<RefactorResult | null>(null);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>(AnalysisStep.IDLE);
  const [error, setError] = useState<string | null>(null);
  
  // Settings State
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ google: '', openrouter: '' });
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // State for dependency flow
  const [partialPlan, setPartialPlan] = useState<AnalystPlan | null>(null);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [preloadedDependencies, setPreloadedDependencies] = useState<FileMap>({});

  // State for logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // On Mount: Load Config and Keys
  useEffect(() => {
    const storedConfig = localStorage.getItem('legacy_refactor_model_config_v2');
    const storedKeys = localStorage.getItem('legacy_refactor_api_keys');
    
    // Bessere Default-Logik:
    let initialKeys: ApiKeys = { 
      // Nutze process.env als Fallback, falls im UI nichts eingegeben wurde
      google: process.env.API_KEY || '', 
      openrouter: process.env.OPENROUTER_API_KEY || '' 
    };

    if (storedKeys) {
      try {
        const parsedKeys = JSON.parse(storedKeys);
        // Mische gespeicherte Keys mit Env-Keys (User-Input gewinnt)
        if (parsedKeys.google) initialKeys.google = parsedKeys.google;
        if (parsedKeys.openrouter) initialKeys.openrouter = parsedKeys.openrouter;
      } catch (e) {}
    }
    setApiKeys(initialKeys);

    if (storedConfig) {
      try {
        setModelConfig(JSON.parse(storedConfig));
      } catch (e) {
        setShowSettingsModal(true);
      }
    } else {
      setShowSettingsModal(true);
    }
  }, []);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev, entry]);
  }, []);

  const handleReset = () => {
    setInputCode('');
    setResult(null);
    setAnalysisStep(AnalysisStep.IDLE);
    setError(null);
    setPartialPlan(null);
    setLogs([]);
    setPreloadedDependencies({});
    setActiveTab(Tab.INPUT);
  };

  const handleSettingsSave = (config: ModelConfig, keys: ApiKeys) => {
    setModelConfig(config);
    setApiKeys(keys);
    localStorage.setItem('legacy_refactor_model_config_v2', JSON.stringify(config));
    localStorage.setItem('legacy_refactor_api_keys', JSON.stringify(keys));
    setShowSettingsModal(false);
  };

  const handleStartAnalysis = useCallback(async () => {
    if (!inputCode.trim()) return;
    
    // Safety check: Config must be loaded
    if (!modelConfig) {
        setShowSettingsModal(true);
        return;
    }

    setAnalysisStep(AnalysisStep.ANALYST);
    setError(null);
    setResult(null);
    setPartialPlan(null);
    setLogs([]); 

    try {
      // WICHTIG: Die Reihenfolge der Argumente muss stimmen!
      // startAnalysis(code, config, keys, onProgress, onLog)
      const { plan, needsFiles } = await startAnalysis(
        inputCode, 
        modelConfig, 
        apiKeys, // HIER SIND DIE KEYS!
        (step) => setAnalysisStep(step), 
        addLog
      );

      if (needsFiles) {
        setPartialPlan(plan);
        setAnalysisStep(AnalysisStep.WAITING_FOR_USER);
        setShowDependencyModal(true);
      } else {
        // completeMigration(plan, context, config, keys, onProgress, onLog)
        const finalResult = await completeMigration(
            plan, 
            { 'main.legacy': inputCode }, 
            modelConfig, 
            apiKeys, // UND HIER!
            (step) => setAnalysisStep(step), 
            addLog
        );
        setResult(finalResult);
        setActiveTab(Tab.CODE);
      }
    } catch (err: any) {
      setAnalysisStep(AnalysisStep.ERROR);
      // Verbesserte Fehlermeldung
      setError(err.message || "Analysis failed. Check LLM Logs for details.");
    }
  }, [inputCode, addLog, modelConfig, apiKeys]);

  const handleDependencySubmit = async (additionalFiles: FileMap) => {
    setShowDependencyModal(false);
    if (!partialPlan || !modelConfig) return;

    try {
      const fullContext: FileMap = {
        'main.legacy': inputCode,
        ...additionalFiles
      };

      const finalResult = await completeMigration(
          partialPlan, 
          fullContext, 
          modelConfig, 
          apiKeys, // KEYS ÜBERGEBEN
          (step) => setAnalysisStep(step), 
          addLog
      );
      setResult(finalResult);
      setActiveTab(Tab.CODE);
    } catch (err: any) {
      setAnalysisStep(AnalysisStep.ERROR);
      setError(err.message || "Error completing migration with dependencies.");
    }
  };

  const handleDownloadZip = async () => {
    if (!result?.generatedFiles) return;

    const zip = new JSZip();
    Object.entries(result.generatedFiles).forEach(([filename, content]) => {
      zip.file(filename, content as string);
    });
    zip.file("README.md", `# Migration Report\n\n${result.plan.summary}\n\n## Strategy\n${result.plan.migration_strategy}`);

    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "refactored_project.zip";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const loadDemo = () => {
    setInputCode(DEMO_PHP_CODE);
    setPreloadedDependencies({});
    setResult(null);
    setAnalysisStep(AnalysisStep.IDLE);
    setLogs([]);
    setError(null);
  };

  const loadAdminDemo = () => {
    setInputCode(ADMIN_PORTAL_MAIN);
    setPreloadedDependencies({
      'includes/auth_logic.php': ADMIN_PORTAL_DEP
    });
    setResult(null);
    setAnalysisStep(AnalysisStep.IDLE);
    setLogs([]);
    setError(null);
  };

  const isProcessing = analysisStep !== AnalysisStep.IDLE && analysisStep !== AnalysisStep.COMPLETE && analysisStep !== AnalysisStep.ERROR && analysisStep !== AnalysisStep.WAITING_FOR_USER;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1120] text-slate-200">
      
      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal 
          initialConfig={modelConfig || undefined} 
          initialKeys={apiKeys}
          onSave={handleSettingsSave}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Dependency Modal */}
      {showDependencyModal && partialPlan && (
        <DependencyModal 
          requiredFiles={partialPlan.required_files}
          onSubmit={handleDependencySubmit}
          onCancel={() => {
            setShowDependencyModal(false);
            setAnalysisStep(AnalysisStep.IDLE);
          }}
          preloadedDependencies={preloadedDependencies}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              LegacyRefactor AI
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide">MODULAR LEGACY TO PYTHON MIGRATION</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           {result && (
             <div className="flex items-center text-emerald-400 text-xs font-bold px-3 py-1 bg-emerald-500/10 rounded border border-emerald-500/20 animate-pulse">
               <CheckCircle className="w-3 h-3 mr-1.5" />
               MIGRATION COMPLETE
             </div>
           )}
          
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-slate-800 border border-transparent hover:border-slate-700"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>

          {(inputCode || result || logs.length > 0) && (
            <button 
              onClick={handleReset}
              className="flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-slate-800 border border-transparent hover:border-slate-700"
              title="Clear all data and start over"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </button>
          )}

          <div className="flex space-x-2">
            <button 
              onClick={loadDemo}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded border border-indigo-500/30 hover:bg-indigo-500/10"
            >
              Load osCommerce Demo
            </button>
            <button 
              onClick={loadAdminDemo}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors px-3 py-1.5 rounded border border-rose-500/30 hover:bg-rose-500/10"
            >
              <Skull className="w-3 h-3" />
              Admin Portal (Hard)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar / Navigation */}
        <aside className="w-20 bg-[#0f172a] border-r border-slate-800 flex flex-col items-center py-6 space-y-6">
          <TabButton 
            active={activeTab === Tab.INPUT} 
            onClick={() => setActiveTab(Tab.INPUT)} 
            icon={<Code className="w-5 h-5" />} 
            label="Source" 
          />
          <div className="w-8 h-px bg-slate-800" />
          <TabButton 
            active={activeTab === Tab.PLAN} 
            onClick={() => setActiveTab(Tab.PLAN)} 
            icon={<FileText className="w-5 h-5" />} 
            label="Plan"
            disabled={!result}
          />
          <TabButton 
            active={activeTab === Tab.CODE} 
            onClick={() => setActiveTab(Tab.CODE)} 
            icon={<Zap className="w-5 h-5" />} 
            label="Code"
            disabled={!result}
          />
          <TabButton 
            active={activeTab === Tab.SECURITY} 
            onClick={() => setActiveTab(Tab.SECURITY)} 
            icon={<ShieldAlert className="w-5 h-5" />} 
            label="Audit"
            disabled={!result}
          />
          <div className="flex-1" />
          <TabButton 
            active={activeTab === Tab.LOGS} 
            onClick={() => setActiveTab(Tab.LOGS)} 
            icon={<Bug className="w-5 h-5" />} 
            label="LLM Logs"
          />
        </aside>

        {/* Content Area */}
        <section className="flex-1 flex flex-col relative bg-[#0b1120]">
          
          {/* Main Viewport */}
          <div className="flex-1 p-6 overflow-hidden flex flex-col">
            
            {/* INPUT TAB */}
            {activeTab === Tab.INPUT && (
              <div className="h-full flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-slate-300">Legacy Source Code (PHP / Python)</h2>
                  <button
                    onClick={handleStartAnalysis}
                    disabled={isProcessing || !inputCode.trim() || !modelConfig}
                    className={`
                      flex items-center space-x-2 px-6 py-2.5 rounded-lg font-semibold transition-all shadow-lg
                      ${isProcessing || !inputCode.trim() || !modelConfig
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25 active:scale-95'}
                    `}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Start Migration Chain</span>
                      </>
                    )}
                  </button>
                </div>
                
                {isProcessing || analysisStep === AnalysisStep.WAITING_FOR_USER ? (
                  <div className="flex-1 flex items-center justify-center">
                    <AnalysisProgress currentStep={analysisStep} modelConfig={modelConfig || undefined} />
                  </div>
                ) : (
                  <div className="flex-1 relative">
                    <CodeEditor 
                      code={inputCode} 
                      onChange={setInputCode} 
                      language="text" 
                      title="Legacy Entry Point"
                    />
                    {!inputCode && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center text-slate-600">
                          <p className="mb-2">Paste legacy PHP or Python code here</p>
                          <p className="text-sm opacity-50">or click "Load osCommerce Demo" above</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PLAN TAB */}
            {activeTab === Tab.PLAN && result && (
              <div className="h-full flex flex-col">
                <h2 className="text-lg font-semibold text-slate-300 mb-4">Analyst's Migration Plan</h2>
                <div className="flex-1 overflow-auto bg-slate-900 rounded-lg p-6 border border-slate-700">
                  <div className="prose prose-invert max-w-none">
                    <h3 className="text-indigo-400">Summary</h3>
                    <p>{result.plan.summary}</p>
                    <h3 className="text-indigo-400">Detected Dependencies</h3>
                     {result.plan.required_files.length > 0 ? (
                       <ul className="list-disc pl-5">
                         {result.plan.required_files.map((f, i) => <li key={i} className="font-mono text-sm text-amber-400">{f}</li>)}
                       </ul>
                     ) : <p className="text-slate-500 italic">No external dependencies found.</p>}
                    <h3 className="text-indigo-400">Variables</h3>
                    <ul className="list-disc pl-5">
                      {result.plan.variables.map((v, i) => <li key={i} className="font-mono text-sm text-slate-400">{v}</li>)}
                    </ul>
                    <h3 className="text-indigo-400">Strategy</h3>
                    <p className="whitespace-pre-wrap">{result.plan.migration_strategy}</p>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === Tab.SECURITY && result && (
              <div className="h-full flex flex-col">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">Auditor's Report</h2>
                    <div className="flex space-x-2 text-sm">
                      <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                        {result.securityReport.filter(i => i.severity === 'Critical' || i.severity === 'High').length} Critical/High
                      </span>
                      <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                        {result.securityReport.length} Findings
                      </span>
                    </div>
                 </div>
                 
                 <div className="bg-slate-800/50 p-4 rounded-lg mb-4 border-l-4 border-indigo-500">
                    <h4 className="font-bold text-indigo-300 mb-1">Auditor Comments</h4>
                    <p className="text-sm text-slate-300 italic">"{result.auditorComments}"</p>
                 </div>

                 <div className="flex-1 overflow-auto pr-2 pb-10">
                   {result.securityReport.map((issue, idx) => (
                     <SecurityCard key={idx} issue={issue} />
                   ))}
                 </div>
              </div>
            )}

            {/* CODE TAB (Merged) */}
            {activeTab === Tab.CODE && result && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-300">Generated Modules</h2>
                  <button 
                    onClick={handleDownloadZip}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Project ZIP</span>
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <MultiFileViewer 
                    files={result.generatedFiles}
                    title="Project Files"
                  />
                </div>
              </div>
            )}

            {/* LOGS TAB (New) */}
            {activeTab === Tab.LOGS && (
              <div className="h-full flex flex-col">
                <DebugViewer logs={logs} />
              </div>
            )}

            {activeTab !== Tab.INPUT && activeTab !== Tab.LOGS && !result && !isProcessing && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <ArrowRight className="w-12 h-12 mb-4 opacity-20" />
                <p>Run analysis to view results</p>
                <button onClick={() => setActiveTab(Tab.INPUT)} className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm">
                  Go to Source
                </button>
              </div>
            )}

            {error && (
               <div className="absolute bottom-6 right-6 max-w-md bg-red-900/90 border border-red-700 text-white p-4 rounded-lg shadow-xl backdrop-blur-sm animate-bounce-in z-50">
                 <h4 className="font-bold flex items-center mb-1"><ShieldAlert className="w-4 h-4 mr-2"/> Analysis Failed</h4>
                 <p className="text-sm opacity-90 mb-2">{error}</p>
                 <button 
                   onClick={() => setActiveTab(Tab.LOGS)}
                   className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
                 >
                   View Debug Logs
                 </button>
                 <button onClick={() => setError(null)} className="absolute top-2 right-2 hover:bg-white/20 rounded p-1">
                   <span className="sr-only">Dismiss</span>
                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
               </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

// Sidebar Button Helper
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}> = ({ active, onClick, icon, label, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex flex-col items-center justify-center space-y-1 w-full py-2 transition-all relative
      ${active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}
      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-500/10' : 'bg-transparent'}`}>
      {icon}
    </div>
    <span className="text-[10px] font-medium tracking-wide">{label}</span>
    {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-indigo-500 rounded-l-full" />}
  </button>
);

export default App;