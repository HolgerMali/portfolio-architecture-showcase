import React from 'react';

interface CodeEditorProps {
  code: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  language?: string;
  title?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code, 
  onChange, 
  readOnly = false,
  language = 'text',
  title
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-sm font-medium text-slate-300 uppercase tracking-wider">{title}</span>
          <span className="text-xs text-slate-500">{language}</span>
        </div>
      )}
      <div className="relative flex-1 overflow-hidden">
        <textarea
          className={`w-full h-full p-4 bg-[#0d1117] text-slate-300 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 ${readOnly ? 'cursor-text' : ''}`}
          value={code}
          onChange={(e) => onChange && onChange(e.target.value)}
          readOnly={readOnly}
          spellCheck={false}
        />
      </div>
    </div>
  );
};