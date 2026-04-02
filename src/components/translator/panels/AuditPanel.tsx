import React from 'react';
import { Activity, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

export function AuditPanel() {
  const issues = [
    { id: 1, type: 'warning', text: 'Potential mistranslation detected in line 14: "He fired" could be meant as termination from job.', severity: 'medium' },
    { id: 2, type: 'style', text: 'Inconsistent formality. Used informal tone in paragraph 3 where it is formal elsewhere.', severity: 'low' },
  ];

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-secondary">
            <Activity className="w-4 h-4 text-accent-green" />
            <span className="text-[13px] font-medium">Quality Audit</span>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1 text-[11px] text-accent-green bg-accent-green/10 px-2 py-0.5 rounded border border-accent-green/20">
              <CheckCircle className="w-3 h-3" /> 85% Score
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pointer-events-auto">
        {issues.map(issue => (
          <div key={issue.id} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
             <div className="shrink-0 mt-0.5">
               {issue.severity === 'high' ? (
                 <ShieldAlert className="w-4 h-4 text-red-400" />
               ) : (
                 <AlertTriangle className={`w-4 h-4 ${issue.severity === 'medium' ? 'text-accent-amber' : 'text-accent-indigo'}`} />
               )}
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[13px] text-text-secondary leading-snug">{issue.text}</span>
               <div className="flex gap-3 text-[11px] text-text-tertiary mt-1">
                 <button className="hover:text-accent-cyan underline transition-colors">Locate Error</button>
                 <button className="hover:text-accent-cyan underline transition-colors">Ignore</button>
               </div>
             </div>
          </div>
        ))}

        {issues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-60">
            <CheckCircle className="w-8 h-8 text-accent-green" />
            <span className="text-[13px] text-text-secondary w-2/3 text-center">All quality checks passed. Code looks clean and consistent.</span>
          </div>
        )}
      </div>

      <div className="p-4 shrink-0 border-t border-white/5 pointer-events-auto">
        <button className="w-full py-1.5 flex justify-center items-center gap-2 bg-white/5 hover:bg-white/10 text-text-secondary text-[12px] rounded-md transition-colors border border-white/10">
          <Activity className="w-3.5 h-3.5" />
          Run Full Scan
        </button>
      </div>
    </div>
  );
}
