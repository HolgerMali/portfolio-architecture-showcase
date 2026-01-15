import React from 'react';
import { SecurityIssue } from '../types';

interface SecurityCardProps {
  issue: SecurityIssue;
}

export const SecurityCard: React.FC<SecurityCardProps> = ({ issue }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500/10 border-red-500/50 text-red-400';
      case 'High': return 'bg-orange-500/10 border-orange-500/50 text-orange-400';
      case 'Medium': return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400';
      case 'Low': return 'bg-blue-500/10 border-blue-500/50 text-blue-400';
      default: return 'bg-slate-700 border-slate-600 text-slate-300';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)} mb-4 transition-all hover:translate-x-1`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg">{issue.title}</h3>
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${getSeverityColor(issue.severity).replace('bg-', 'bg-opacity-20 ')}`}>
          {issue.severity}
        </span>
      </div>
      <p className="text-sm opacity-90 mb-3 leading-relaxed">{issue.description}</p>
      <div className="flex items-center text-xs opacity-70 bg-black/20 p-2 rounded">
        <span className="font-mono">Location: {issue.location}</span>
      </div>
    </div>
  );
};