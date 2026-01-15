
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Check, AlertCircle, UploadCloud, Zap } from 'lucide-react';
import { FileMap } from '../types';

interface DependencyModalProps {
  requiredFiles: string[];
  onSubmit: (files: FileMap) => void;
  onCancel: () => void;
  preloadedDependencies?: FileMap;
}

export const DependencyModal: React.FC<DependencyModalProps> = ({ requiredFiles, onSubmit, onCancel, preloadedDependencies }) => {
  // Store content for each required file
  const [fileContents, setFileContents] = useState<FileMap>({});
  const [dragActive, setDragActive] = useState<string | null>(null);

  // Auto-fill dependencies if available in preload
  useEffect(() => {
    if (preloadedDependencies && Object.keys(preloadedDependencies).length > 0) {
       const newContents = { ...fileContents };
       let changed = false;
       requiredFiles.forEach(f => {
         // Match exact filename or try logic to find if it exists
         if (preloadedDependencies[f] && !newContents[f]) {
           newContents[f] = preloadedDependencies[f];
           changed = true;
         }
       });
       if (changed) setFileContents(newContents);
    }
  }, [requiredFiles, preloadedDependencies]);

  const handleContentChange = (filename: string, content: string) => {
    setFileContents(prev => ({
      ...prev,
      [filename]: content
    }));
  };

  const processFile = (file: File, filename: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleContentChange(filename, text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent, filename: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], filename);
    }
  };

  const handleDragOver = (e: React.DragEvent, filename: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragActive !== filename) {
      setDragActive(filename);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, filename: string) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], filename);
    }
  };

  const isComplete = requiredFiles.every(f => fileContents[f] && fileContents[f].trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in-up">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start space-x-4">
          <div className="p-3 bg-amber-500/10 rounded-lg">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Missing Dependencies Detected</h2>
            <p className="text-slate-400 text-sm mt-1">
              The AI found <code className="text-amber-400">{requiredFiles.length}</code> external dependencies. 
              Please provide their content to ensure accurate refactoring.
            </p>
          </div>
        </div>

        {/* Body - List of Files */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {requiredFiles.map((filename) => {
            const isPreloaded = preloadedDependencies && preloadedDependencies[filename];
            
            return (
              <div key={filename} className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="font-mono text-sm text-slate-200">{filename}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isPreloaded && (
                       <span className="flex items-center text-xs text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                         <Zap className="w-3 h-3 mr-1" /> Auto-filled from Demo
                       </span>
                    )}
                    {fileContents[filename]?.length > 0 && (
                       <span className="flex items-center text-xs text-emerald-400 font-medium">
                         <Check className="w-3 h-3 mr-1" /> Provided
                       </span>
                    )}
                  </div>
                </div>
                
                {/* Drag & Drop / Upload Area */}
                <div 
                  className={`
                    relative group cursor-pointer transition-all duration-200
                    ${dragActive === filename ? 'bg-indigo-500/20' : 'bg-[#0b1120] hover:bg-slate-800/30'}
                  `}
                  onDragOver={(e) => handleDragOver(e, filename)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, filename)}
                >
                   <input 
                      type="file" 
                      id={`file-upload-${filename}`}
                      className="hidden" 
                      onChange={(e) => handleFileSelect(e, filename)}
                    />
                    
                    {/* Visual Drop Zone Header */}
                    <label 
                      htmlFor={`file-upload-${filename}`} 
                      className="flex items-center justify-center space-x-2 w-full py-2 border-b border-dashed border-slate-700 text-xs text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/50 cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Click to upload <b>{filename}</b> or drag & drop here</span>
                    </label>

                    <textarea
                      className={`
                        w-full h-40 bg-transparent p-4 text-xs font-mono text-slate-300 focus:outline-none resize-none placeholder:text-slate-600
                        ${dragActive === filename ? 'opacity-50 blur-[1px]' : 'opacity-100'}
                      `}
                      placeholder={`Paste content of ${filename} manually...`}
                      value={fileContents[filename] || ''}
                      onChange={(e) => handleContentChange(filename, e.target.value)}
                      spellCheck={false}
                    />
                    
                    {dragActive === filename && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-indigo-600/90 text-white px-4 py-2 rounded-lg font-bold shadow-xl animate-bounce">
                          Drop to Load Content
                        </div>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(fileContents)}
            disabled={!isComplete}
            className={`
              flex items-center space-x-2 px-6 py-2 rounded-lg font-bold text-sm transition-all
              ${isComplete 
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:shadow-lg hover:shadow-indigo-500/25 text-white' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
            `}
          >
            <span>Resume Analysis</span>
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};