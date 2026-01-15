import React, { useState, useEffect } from 'react';
import { FileMap } from '../types';
import { CodeEditor } from './CodeEditor';
import { FileJson, FileCode, Copy, Download } from 'lucide-react';

interface MultiFileViewerProps {
  files: FileMap;
  title?: string;
}

export const MultiFileViewer: React.FC<MultiFileViewerProps> = ({ files, title }) => {
  const filenames = Object.keys(files);
  const [activeFile, setActiveFile] = useState<string>(filenames[0] || '');

  useEffect(() => {
    if (filenames.length > 0 && !filenames.includes(activeFile)) {
      setActiveFile(filenames[0]);
    }
  }, [files]);

  if (!activeFile) return <div className="p-4 text-slate-500">No files generated.</div>;

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeFile]);
  };

  return (
    <div className="flex h-full border border-slate-700 rounded-lg overflow-hidden bg-[#0d1117] shadow-xl">
      {/* Sidebar - File Explorer */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title || "Explorer"}</h3>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {filenames.map(fname => (
            <button
              key={fname}
              onClick={() => setActiveFile(fname)}
              className={`
                w-full text-left px-4 py-2.5 flex items-center space-x-2 text-sm transition-colors border-l-2
                ${activeFile === fname 
                  ? 'bg-slate-800 border-indigo-500 text-indigo-300' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}
              `}
            >
              <FileCode className="w-4 h-4 opacity-70" />
              <span className="truncate font-mono text-xs">{fname}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-sm font-medium text-slate-200 font-mono">{activeFile}</span>
          <button 
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors" 
            title="Copy Code"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <CodeEditor 
             code={files[activeFile]} 
             language="python" 
             readOnly={true} 
             // We omit title in CodeEditor because we have the file header above
          />
        </div>
      </div>
    </div>
  );
};
