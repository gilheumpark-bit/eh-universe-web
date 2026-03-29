"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useCallback, useMemo } from "react";
import { FileText, ChevronRight, ChevronLeft, Check, Sparkles, Loader2, X } from "lucide-react";

interface SpecQuestion {
  id: string; question: string; category: string;
  type: "text" | "textarea" | "select" | "multi-select";
  placeholder?: string; options?: string[];
}

interface SpecAnswer { questionId: string; answer: string | string[] }

interface ProjectSpec {
  category: string; title: string; answers: SpecAnswer[];
}

interface Props {
  initialPrompt?: string;
  onComplete: (spec: ProjectSpec) => void;
  onClose: () => void;
}

const CATEGORIES = [
  { id: "web-app", label: "웹 앱", icon: "🌐" },
  { id: "api", label: "API 서버", icon: "⚡" },
  { id: "mobile", label: "모바일", icon: "📱" },
  { id: "library", label: "라이브러리", icon: "📦" },
  { id: "cli", label: "CLI 도구", icon: "🖥️" },
  { id: "other", label: "기타", icon: "🔧" },
];

const QUESTIONS: SpecQuestion[] = [
  { id: "q1", question: "프로젝트의 주요 기능은 무엇인가요?", category: "기능", type: "textarea", placeholder: "핵심 기능을 설명해주세요" },
  { id: "q2", question: "기술 스택을 선택하세요", category: "기술", type: "multi-select", options: ["React", "Next.js", "Vue", "Svelte", "Express", "FastAPI", "Tailwind CSS", "TypeScript"] },
  { id: "q3", question: "대상 사용자는 누구인가요?", category: "기획", type: "text", placeholder: "예: 개발자, 일반 사용자, 기업" },
  { id: "q4", question: "배포 환경은?", category: "인프라", type: "select", options: ["Vercel", "AWS", "GCP", "Docker", "기타"] },
];

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=SpecQuestion,Props

// ============================================================
// PART 2 — Component
// ============================================================

export function ProjectSpecForm({ initialPrompt, onComplete, onClose }: Props) {
  const [step, setStep] = useState<"category" | "questions" | "review">("category");
  const [category, setCategory] = useState("web-app");
  const [title, setTitle] = useState(initialPrompt ?? "");
  const [answers, setAnswers] = useState<SpecAnswer[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [autoFilling, setAutoFilling] = useState(false);

  const setAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setAnswers((prev) => {
      const idx = prev.findIndex((a) => a.questionId === questionId);
      if (idx >= 0) { const u = [...prev]; u[idx] = { questionId, answer }; return u; }
      return [...prev, { questionId, answer }];
    });
  }, []);

  const getAnswer = useCallback((questionId: string): string | string[] => {
    return answers.find((a) => a.questionId === questionId)?.answer ?? "";
  }, [answers]);

  const handleAutoFill = useCallback(async () => {
    if (!title.trim()) return;
    setAutoFilling(true);
    await new Promise((r) => setTimeout(r, 1000));
    setAnswers([
      { questionId: "q1", answer: `${title} 관련 핵심 기능 구현` },
      { questionId: "q2", answer: ["React", "TypeScript", "Tailwind CSS"] },
      { questionId: "q3", answer: "개발자" },
      { questionId: "q4", answer: "Vercel" },
    ]);
    setAutoFilling(false); setStep("review");
  }, [title]);

  const handleComplete = useCallback(() => {
    onComplete({ category, title, answers });
  }, [category, title, answers, onComplete]);

  const currentQuestion = QUESTIONS[currentQ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#0a0e17] border border-white/10 rounded-xl w-[640px] max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-purple-400" />
            <span className="text-sm font-semibold text-white">프로젝트 명세서</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
              {step === "category" ? "1/3" : step === "questions" ? `2/3 (${currentQ + 1}/${QUESTIONS.length})` : "3/3"}
            </span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {step === "category" && (
            <div>
              <p className="text-sm mb-1 text-white">어떤 프로젝트를 만드시겠어요?</p>
              <p className="text-xs text-white/40 mb-4">프롬프트를 입력하면 카테고리가 자동 선택됩니다</p>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 수제 케이크 쇼핑몰 만들어줘"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-purple-500 mb-4" />
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat.id} onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors ${category === cat.id ? "border-purple-500 bg-purple-500/10 text-purple-400" : "border-white/10 hover:bg-white/5 text-white/50"}`}>
                    <span>{cat.icon}</span><span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === "questions" && currentQuestion && (
            <div>
              <p className="text-[10px] text-purple-400 mb-1">{currentQuestion.category}</p>
              <p className="text-sm font-medium text-white mb-3">{currentQuestion.question}</p>
              {currentQuestion.type === "text" && (
                <input value={(getAnswer(currentQuestion.id) as string) ?? ""} onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                  placeholder={currentQuestion.placeholder} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-purple-500" autoFocus />
              )}
              {currentQuestion.type === "textarea" && (
                <textarea value={(getAnswer(currentQuestion.id) as string) ?? ""} onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                  placeholder={currentQuestion.placeholder} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-purple-500 min-h-[100px]" autoFocus />
              )}
              {currentQuestion.type === "select" && currentQuestion.options && (
                <div className="grid grid-cols-2 gap-2">
                  {currentQuestion.options.map((opt) => (
                    <button key={opt} onClick={() => setAnswer(currentQuestion.id, opt)}
                      className={`px-3 py-2 rounded-lg text-xs border text-left transition-colors ${getAnswer(currentQuestion.id) === opt ? "border-purple-500 bg-purple-500/10 text-purple-400" : "border-white/10 hover:bg-white/5 text-white/50"}`}>{opt}</button>
                  ))}
                </div>
              )}
              {currentQuestion.type === "multi-select" && currentQuestion.options && (
                <div className="grid grid-cols-2 gap-2">
                  {currentQuestion.options.map((opt) => {
                    const current = (getAnswer(currentQuestion.id) as string[]) ?? [];
                    const selected = Array.isArray(current) && current.includes(opt);
                    return (
                      <button key={opt} onClick={() => setAnswer(currentQuestion.id, selected ? current.filter((v) => v !== opt) : [...current, opt])}
                        className={`px-3 py-2 rounded-lg text-xs border text-left transition-colors ${selected ? "border-green-500 bg-green-500/10 text-green-400" : "border-white/10 hover:bg-white/5 text-white/50"}`}>{selected ? "✓ " : ""}{opt}</button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-center gap-1 mt-6">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentQ ? "bg-purple-400" : i < currentQ ? "bg-green-400" : "bg-white/10"}`} />
                ))}
              </div>
            </div>
          )}
          {step === "review" && (
            <div>
              <p className="text-sm font-medium text-white mb-3">명세서 확인</p>
              <div className="space-y-2">
                {QUESTIONS.map((q) => {
                  const answer = getAnswer(q.id);
                  const text = Array.isArray(answer) ? answer.join(", ") : answer;
                  if (!text) return null;
                  return <div key={q.id} className="flex items-start gap-2 text-xs"><span className="text-white/40 min-w-[120px]">{q.question}</span><span className="text-white/70">{text}</span></div>;
                })}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/8">
          <div>
            {step === "category" && title.trim() && (
              <button onClick={handleAutoFill} disabled={autoFilling}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-500/15 text-purple-400 rounded-lg hover:bg-purple-500/25 disabled:opacity-50">
                {autoFilling ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI 자동 완성
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === "questions" && currentQ > 0 && (
              <button onClick={() => setCurrentQ((p) => p - 1)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white/40 hover:text-white"><ChevronLeft size={12} /> 이전</button>
            )}
            {step === "category" && <button onClick={() => { if (title.trim()) setStep("questions"); }} disabled={!title.trim()} className="flex items-center gap-1 px-4 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-30">다음 <ChevronRight size={12} /></button>}
            {step === "questions" && currentQ < QUESTIONS.length - 1 && <button onClick={() => setCurrentQ((p) => p + 1)} className="flex items-center gap-1 px-4 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700">다음 <ChevronRight size={12} /></button>}
            {step === "questions" && currentQ === QUESTIONS.length - 1 && <button onClick={() => setStep("review")} className="flex items-center gap-1 px-4 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700">확인 <Check size={12} /></button>}
            {step === "review" && <button onClick={handleComplete} className="flex items-center gap-1 px-4 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"><Sparkles size={12} /> 프로젝트 생성</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=Component | inputs=Props | outputs=JSX
