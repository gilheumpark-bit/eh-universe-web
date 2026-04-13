"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles, Key, MessageSquare, Layers, ShieldCheck, Rocket, FileCode } from "lucide-react";

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

const STORAGE_KEY = "eh_onboarding_done";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { icon: <Sparkles size={28} className="text-amber-400" />, title: "EH Code Studio에 오신 것을 환영합니다", description: "NOA 기반 코드 에디터에서 코딩, 디버깅, 배포까지 모든 것을 한 곳에서 처리하세요." },
  { icon: <FileCode size={28} className="text-green-400" />, title: "에디터 & 파일 탐색기", description: "좌측 사이드바에서 파일을 탐색하고, Monaco 기반 에디터에서 코드를 작성하세요. 자동 완성과 구문 강조를 지원합니다." },
  { icon: <MessageSquare size={28} className="text-blue-400" />, title: "NOA 채팅 & 에이전트", description: "우측 패널에서 NOA와 대화하며 코드를 생성하거나 수정할 수 있습니다. Ctrl+L로 채팅을 열어보세요." },
  { icon: <Layers size={28} className="text-amber-400" />, title: "파이프라인 & 터미널", description: "하단 터미널에서 명령을 실행하고, NOA 파이프라인으로 코드 품질을 자동 검사합니다." },
  { icon: <ShieldCheck size={28} className="text-cyan-400" />, title: "보안 & 테스트", description: "버그 파인더와 정적 분석으로 코드 안전성을 검증하고, 테스트를 실행할 수 있습니다." },
  { icon: <Key size={28} className="text-amber-400" />, title: "API 키 설정", description: "설정에서 NOA 프로바이더의 API 키를 등록하면 NOA 기능을 최대로 활용할 수 있습니다." },
  { icon: <Rocket size={28} className="text-amber-400" />, title: "준비 완료!", description: "이제 Code Studio의 모든 기능을 자유롭게 사용해 보세요. 좌측 하단 도움말에서 단축키를 확인할 수 있습니다." },
];

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=Props,STEPS

// ============================================================
// PART 2 — Component
// ============================================================

export function OnboardingGuide({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== "true"; }
    catch { return true; }
  });

  // mount 시 이미 완료 상태면 부모에 알림 (onComplete는 stable 참조 가정)
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  useEffect(() => { if (!visible) onCompleteRef.current(); }, [visible]);

  const markDone = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch { /* noop */ }
  }, []);

  const handleComplete = useCallback(() => { markDone(); setVisible(false); onComplete(); }, [onComplete, markDone]);
  const handleSkip = useCallback(() => { markDone(); setVisible(false); onSkip(); }, [onSkip, markDone]);
  const handleNext = useCallback(() => { if (step < STEPS.length - 1) setStep((s) => s + 1); else handleComplete(); }, [step, handleComplete]);
  const handlePrev = useCallback(() => { if (step > 0) setStep((s) => s - 1); }, [step]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, handleSkip, handleNext, handlePrev]);

  if (!visible) return null;
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-bg-primary border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-[10px] text-white/60 font-mono">{step + 1} / {STEPS.length}</span>
          <button onClick={handleSkip} aria-label="건너뛰기" className="text-white/60 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="flex justify-center gap-1.5 px-5 pb-3">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-amber-500" : i < step ? "w-2 bg-amber-500/50" : "w-2 bg-white/10"}`} />
          ))}
        </div>
        <div className="px-6 py-4 flex flex-col items-center text-center">
          <div className="mb-4 p-3 rounded-full bg-white/5">{current.icon}</div>
          <h2 className="text-lg font-semibold text-white mb-3">{current.title}</h2>
          <p className="text-xs text-white/50 leading-relaxed whitespace-pre-line text-left w-full">{current.description}</p>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/8">
          <button onClick={handleSkip} className="text-xs text-white/60 hover:text-white transition-colors">건너뛰기</button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={handlePrev} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white/50 hover:text-white border border-white/10 rounded-lg">
                <ChevronLeft size={12} /> 이전
              </button>
            )}
            <button onClick={handleNext} className="flex items-center gap-1 px-4 py-1.5 text-xs text-white bg-amber-800 hover:bg-amber-700 rounded-lg transition-colors">
              {isLast ? "시작하기" : "다음"}{!isLast && <ChevronRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function resetOnboarding() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

// IDENTITY_SEAL: PART-2 | role=Component | inputs=Props | outputs=JSX
