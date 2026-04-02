import React, { useState } from 'react';
import { MessageSquare, Send, Sparkles } from 'lucide-react';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [messages] = useState([
    { id: 1, role: 'assistant', text: 'Hello! I am your translation assistant. I can help clarify nuances, suggest alternatives, or check styles.' },
  ]);

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2 text-text-secondary">
          <MessageSquare className="w-4 h-4 text-accent-cyan" />
          <span className="text-[13px] font-medium">Assistant Chat</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pointer-events-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 
              ${msg.role === 'user' ? 'bg-accent-indigo text-white' : 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'}`}
            >
              {msg.role === 'user' ? <MessageSquare className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>
            <div className={`p-3 rounded-lg text-[13px] leading-relaxed 
              ${msg.role === 'user' ? 'bg-accent-indigo/10 text-text-primary border border-accent-indigo/20 rounded-tr-sm' : 'bg-white/5 text-text-secondary border border-white/10 rounded-tl-sm'}`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 shrink-0 border-t border-white/5 pointer-events-auto">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about translation nuance or style..."
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-3 pr-10 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/50 transition-all resize-none h-[44px] max-h32"
            rows={1}
          />
          <button className="absolute right-2 top-[50%] -translate-y-1/2 p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-accent-cyan transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          <button className="text-[11px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-text-tertiary hover:text-text-secondary transition-colors border border-white/10">
            Check Tone
          </button>
          <button className="text-[11px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-text-tertiary hover:text-text-secondary transition-colors border border-white/10">
            Suggest Alternative
          </button>
        </div>
      </div>
    </div>
  );
}
