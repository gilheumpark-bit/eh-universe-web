"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useCallback } from "react";
import { Plus, X, Terminal as TerminalIcon, Columns2, Rows2 } from "lucide-react";

interface TermPane { id: string; name: string }

type SplitDir = "none" | "horizontal" | "vertical";

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=TermPane,SplitDir

// ============================================================
// PART 2 — Component
// ============================================================

export function SplitTerminal() {
  const [panes, setPanes] = useState<TermPane[]>([{ id: "t1", name: "Terminal 1" }]);
  const [activeId, setActiveId] = useState("t1");
  const [splitDir, setSplitDir] = useState<SplitDir>("none");
  const [splitRatio, setSplitRatio] = useState(50);

  const addPane = useCallback(() => {
    const id = crypto.randomUUID();
    const num = panes.length + 1;
    setPanes((p) => [...p, { id, name: `Terminal ${num}` }]);
    setActiveId(id);
    if (panes.length === 1) setSplitDir("horizontal");
  }, [panes]);

  const closePane = useCallback((id: string) => {
    setPanes((p) => {
      const next = p.filter((t) => t.id !== id);
      if (next.length === 0) return [{ id: "t1", name: "Terminal 1" }];
      if (activeId === id) setActiveId(next[0].id);
      if (next.length === 1) setSplitDir("none");
      return next;
    });
  }, [activeId]);

  const toggleSplit = () => {
    if (panes.length < 2) { addPane(); return; }
    setSplitDir((d) => d === "horizontal" ? "vertical" : d === "vertical" ? "none" : "horizontal");
  };

  const handleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startRatio = splitRatio;

    const onMove = (me: MouseEvent) => {
      const container = splitDir === "horizontal" ? window.innerWidth : 192;
      const delta = splitDir === "horizontal" ? me.clientX - startX : me.clientY - startY;
      const pct = (delta / container) * 100;
      setSplitRatio(Math.max(20, Math.min(80, startRatio + pct)));
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div className="flex flex-col h-48 border-t border-white/8">
      <div className="flex items-center bg-[#0f1419] border-b border-white/8 px-1 flex-shrink-0">
        {panes.map((p) => (
          <button key={p.id} onClick={() => setActiveId(p.id)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] border-r border-white/8 ${p.id === activeId ? "bg-[#0a0e17] text-white" : "text-white/40 hover:bg-white/5"}`}>
            <TerminalIcon size={10} />{p.name}
            {panes.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); closePane(p.id); }} className="hover:text-red-400 ml-1 cursor-pointer"><X size={8} /></span>
            )}
          </button>
        ))}
        <button onClick={addPane} className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded" title="새 터미널"><Plus size={10} /></button>
        <button onClick={toggleSplit} className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded ml-auto" title="분할">
          {splitDir === "horizontal" ? <Columns2 size={10} /> : <Rows2 size={10} />}
        </button>
      </div>
      <div className={`flex-1 overflow-hidden flex ${splitDir === "vertical" ? "flex-col" : "flex-row"}`}>
        {splitDir === "none" ? (
          panes.map((p) => (
            <div key={p.id} className={p.id === activeId ? "flex-1 bg-[#0a0e17] p-2 font-mono text-xs text-green-400" : "hidden"}>
              <div className="text-white/30 text-[10px] mb-1">$ {p.name}</div>
              <div className="text-white/50">Ready. Type a command...</div>
            </div>
          ))
        ) : (
          <>
            <div style={{ flex: `0 0 ${splitRatio}%` }} className="overflow-hidden bg-[#0a0e17] p-2 font-mono text-xs text-green-400">
              <div className="text-white/30 text-[10px] mb-1">$ {panes[0]?.name}</div>
              <div className="text-white/50">Ready.</div>
            </div>
            <div className={`${splitDir === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"} bg-white/10 hover:bg-purple-500/50 transition-colors`}
              onMouseDown={handleResize} />
            {panes.length > 1 && (
              <div className="flex-1 overflow-hidden bg-[#0a0e17] p-2 font-mono text-xs text-green-400">
                <div className="text-white/30 text-[10px] mb-1">$ {panes[1]?.name}</div>
                <div className="text-white/50">Ready.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=Component | inputs=none | outputs=JSX
