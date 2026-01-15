import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  Upload, 
  AlertCircle, 
  Info,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Clock,
  Cpu
} from 'lucide-react';

interface DebugViewerProps {
  logs: LogEntry[];
}

export const DebugViewer: React.FC<DebugViewerProps> = ({ logs }) => {
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-expand the latest log when it comes in
  useEffect(() => {
    if (logs.length > 0) {
      setExpandedIndices(prev => {
        const next = new Set(prev);
        next.add(logs.length - 1);
        return next;
      });
    }
  }, [logs.length]);

  const toggleExpand = (index: number) => {
    const next = new Set(expandedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedIndices(next);
  };

  const expandAll = () => {
    const all = new Set(logs.map((_, i) => i));
    setExpandedIndices(all);
  };

  const collapseAll = () => {
    setExpandedIndices(new Set());
  };

  const handleCopy = (content: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatTokens = (num?: number) => {
    if (!num) return '0';
    return num > 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    return ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Terminal className="w-12 h-12 mb-4 opacity-20" />
        <p>No LLM logs recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0d1117] border border-slate-700 rounded-lg overflow-hidden">
       {/* Header with Controls */}
       <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
         <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            Raw LLM Interaction Logs
            <span className="bg-slate-700 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">
              {logs.length} entries
            </span>
         </h3>
         <div className="flex space-x-2">
           <button 
             onClick={expandAll}
             className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
             title="Expand All"
           >
             <Maximize2 className="w-4 h-4" />
           </button>
           <button 
             onClick={collapseAll}
             className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
             title="Collapse All"
           >
             <Minimize2 className="w-4 h-4" />
           </button>
         </div>
       </div>

       {/* Log List */}
       <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
         {logs.map((log, index) => {
           const isExpanded = expandedIndices.has(index);
           let icon = <Info className="w-4 h-4 text-blue-400" />;
           let colorClass = "border-blue-500/20 bg-blue-500/5";
           
           if (log.type === 'prompt') {
             icon = <Upload className="w-4 h-4 text-purple-400" />;
             colorClass = "border-purple-500/20 bg-purple-500/5";
           } else if (log.type === 'response') {
             icon = <Terminal className="w-4 h-4 text-emerald-400" />;
             colorClass = "border-emerald-500/20 bg-emerald-500/5";
           } else if (log.type === 'error') {
             icon = <AlertCircle className="w-4 h-4 text-red-400" />;
             colorClass = "border-red-500/20 bg-red-500/5";
           }

           return (
             <div key={index} className={`rounded-lg border ${colorClass} overflow-hidden shadow-sm`}>
               <button 
                 onClick={() => toggleExpand(index)}
                 className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors group"
               >
                 <div className="flex items-center space-x-3 overflow-hidden">
                   {icon}
                   <div className="flex flex-col items-start min-w-0">
                     <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-300 uppercase truncate">{log.step} - {log.type}</span>
                        {/* Metrics Badge */}
                        {(log.durationMs || log.tokens) && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-normal bg-black/20 px-2 py-0.5 rounded ml-2">
                                {log.durationMs && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {formatDuration(log.durationMs)}
                                    </span>
                                )}
                                {log.tokens && (
                                    <span className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1">
                                        <Cpu className="w-3 h-3" /> {formatTokens(log.tokens.total)} toks
                                    </span>
                                )}
                            </div>
                        )}
                     </div>
                     <span className="text-[10px] text-slate-500 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</span>
                   </div>
                 </div>
                 {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
               </button>
               
               {isExpanded && (
                 <div className="relative p-3 border-t border-slate-700/50 bg-black/20 overflow-x-auto group/content">
                   <button
                     onClick={(e) => handleCopy(log.content, index, e)}
                     className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white opacity-0 group-hover/content:opacity-100 transition-opacity z-10 border border-slate-700"
                     title="Copy content"
                   >
                     {copiedIndex === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                   </button>
                   <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all pr-8">{log.content}</pre>
                 </div>
               )}
             </div>
           );
         })}
       </div>
    </div>
  );
};