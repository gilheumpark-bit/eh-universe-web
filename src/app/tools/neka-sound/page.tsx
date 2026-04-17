"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import ToolNav from "@/components/tools/ToolNav";

/* ─── DATA ─── */
interface Consonant {
  id: string; roman: string; ko: string; sig: SigType;
  desc: string; freq: number; sym: string; ttsRoman: string;
}
interface Vowel {
  id: string; roman: string; axis: string;
  freq: number; sym: string; ttsRoman: string;
}
type SigType = "jis" | "byun" | "sun" | "chung" | "mu";

const CONSONANTS: Consonant[] = [
  { id:"C01", roman:"si",   ko:"ㅅ", sig:"jis",   desc:"지속",     freq:220, sym:"＋", ttsRoman:"si" },
  { id:"C02", roman:"ko",   ko:"ㄱ", sig:"byun",  desc:"변조",     freq:280, sym:"∧", ttsRoman:"ko" },
  { id:"C03", roman:"reu",  ko:"ㄹ", sig:"chung", desc:"출력",     freq:340, sym:"∨", ttsRoman:"reu" },
  { id:"C04", roman:"na",   ko:"ㄴ", sig:"sun",   desc:"순환",     freq:196, sym:"◎", ttsRoman:"na" },
  { id:"C05", roman:"ta",   ko:"ㄷ", sig:"byun",  desc:"변조",     freq:310, sym:"∼", ttsRoman:"ta" },
  { id:"C06", roman:"ma",   ko:"ㅁ", sig:"jis",   desc:"지속",     freq:200, sym:"□", ttsRoman:"ma" },
  { id:"C07", roman:"pā",   ko:"ㅂ", sig:"chung", desc:"출력",     freq:370, sym:"✕", ttsRoman:"pa" },
  { id:"C08", roman:"o",    ko:"ㅇ", sig:"mu",    desc:"무성",     freq:0,   sym:"○", ttsRoman:"" },
  { id:"C09", roman:"ja",   ko:"ㅈ", sig:"chung", desc:"출력",     freq:400, sym:"△", ttsRoman:"ja" },
  { id:"C10", roman:"cha",  ko:"ㅊ", sig:"byun",  desc:"변조+",    freq:440, sym:"∩", ttsRoman:"cha" },
  { id:"C11", roman:"ka",   ko:"ㅋ", sig:"jis",   desc:"강지속",   freq:260, sym:"≡", ttsRoman:"ka" },
  { id:"C12", roman:"tha",  ko:"ㅌ", sig:"byun",  desc:"압변조",   freq:480, sym:"∿", ttsRoman:"tha" },
  { id:"C13", roman:"pha",  ko:"ㅍ", sig:"jis",   desc:"강지속",   freq:290, sym:"⊞", ttsRoman:"pha" },
  { id:"C14", roman:"ha",   ko:"ㅎ", sig:"sun",   desc:"순환+지속", freq:170, sym:"⊕", ttsRoman:"ha" },
  { id:"C15", roman:"khra", ko:"—",  sig:"byun",  desc:"이중변조", freq:520, sym:"∞", ttsRoman:"khra" },
  { id:"C16", roman:"tsin", ko:"—",  sig:"chung", desc:"출력+순환", freq:560, sym:"⩚", ttsRoman:"tsin" },
  { id:"C17", roman:"vra",  ko:"—",  sig:"byun",  desc:"약변조",   freq:300, sym:"≈", ttsRoman:"vra" },
  { id:"C18", roman:"ghn",  ko:"—",  sig:"chung", desc:"광대출력", freq:600, sym:"⊠", ttsRoman:"ghn" },
];

const VOWELS: Vowel[] = [
  { id:"V01", roman:"a",  axis:"축1 수직", freq:440, sym:"|",  ttsRoman:"a" },
  { id:"V02", roman:"eu", axis:"축2 수평", freq:330, sym:"—",  ttsRoman:"eu" },
  { id:"V03", roman:"oh", axis:"축3 대각", freq:385, sym:"/",  ttsRoman:"oh" },
  { id:"V04", roman:"ah", axis:"축1+우",   freq:495, sym:"⊢",  ttsRoman:"ah" },
  { id:"V05", roman:"eo", axis:"축1+좌",   freq:415, sym:"⊣",  ttsRoman:"eo" },
  { id:"V06", roman:"oo", axis:"축2+상",   freq:350, sym:"⊤",  ttsRoman:"oo" },
  { id:"V07", roman:"u",  axis:"축2+하",   freq:310, sym:"⊥",  ttsRoman:"u" },
  { id:"V08", roman:"ae", axis:"축1+이음", freq:460, sym:"⊩",  ttsRoman:"ae" },
  { id:"V09", roman:"ei", axis:"축3+지",   freq:370, sym:"╱",  ttsRoman:"ei" },
  { id:"V10", roman:"oe", axis:"축복합",   freq:523, sym:"⊞",  ttsRoman:"oe" },
  { id:"V11", roman:"ōi", axis:"축3 이음", freq:392, sym:"╲",  ttsRoman:"oi" },
  { id:"V12", roman:"ōa", axis:"황제 전용", freq:880, sym:"⊕", ttsRoman:"oa" },
];

const SIG_COLORS: Record<SigType, string> = {
  jis: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  byun: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  sun: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  chung: "text-red-400 bg-red-400/10 border-red-400/20",
  mu: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
};
const SIG_LABEL: Record<string, { ko: string; en: string }> = {
  jis:   { ko: "직선·지속", en: "Linear·Sustained" },
  byun:  { ko: "곡선·변조", en: "Curved·FM" },
  sun:   { ko: "원형·순환", en: "Circular·Cyclic" },
  chung: { ko: "각진·충격", en: "Angular·Percussive" },
  mu:    { ko: "무성",      en: "Silent" },
};
const SIG_DOT_COLORS: Record<SigType, string> = {
  jis: "bg-sky-400", byun: "bg-purple-400", sun: "bg-emerald-400", chung: "bg-red-400", mu: "bg-zinc-500",
};

interface Syllable {
  displaySym: string;
  roman: string;
}

/* ─── COMPONENT ─── */
export default function NekaSoundPage() {
  const { lang } = useLang();
  const en = lang !== "ko";

  const [tab, setTab] = useState<"tts" | "sig">("tts");
  const [selectedCons, setSelectedCons] = useState<Consonant | null>(null);
  const [syllables, setSyllables] = useState<Syllable[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingLabel, setPlayingLabel] = useState("");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ttsCanvasRef = useRef<HTMLCanvasElement>(null);
  const vizFrameRef = useRef<number | null>(null);
  const ttsVizFrameRef = useRef<number | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024;
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    return audioCtxRef.current;
  }, []);

  /* ── Visualizer ── */
  useEffect(() => {
    if (tab !== "sig") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2 = canvas.getContext("2d");
    if (!ctx2) return;
    const analyser = analyserRef.current;
    const bufLen = analyser ? analyser.frequencyBinCount : 512;
    const dataArr = new Uint8Array(bufLen);

    function draw() {
      vizFrameRef.current = requestAnimationFrame(draw);
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w;
      canvas!.height = h;
      ctx2!.fillStyle = "#0a0a0c";
      ctx2!.fillRect(0, 0, w, h);
      if (analyser) {
        analyser.getByteTimeDomainData(dataArr);
        ctx2!.lineWidth = 1.5;
        ctx2!.strokeStyle = "#7b5ea7";
        ctx2!.shadowBlur = 6;
        ctx2!.shadowColor = "#7b5ea7";
        ctx2!.beginPath();
        const sliceW = w / bufLen;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const v = dataArr[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) { ctx2!.moveTo(x, y); } else { ctx2!.lineTo(x, y); }
          x += sliceW;
        }
        ctx2!.stroke();
      }
    }
    draw();
    return () => {
      if (vizFrameRef.current) cancelAnimationFrame(vizFrameRef.current);
    };
  }, [tab]);

  /* ── TTS Tab Visualizer ── */
  useEffect(() => {
    if (tab !== "tts") {
      if (ttsVizFrameRef.current) cancelAnimationFrame(ttsVizFrameRef.current);
      return;
    }
    const canvas = ttsCanvasRef.current;
    if (!canvas) return;
    const ctx2 = canvas.getContext("2d");
    if (!ctx2) return;
    const analyser = analyserRef.current;
    const bufLen = analyser ? analyser.frequencyBinCount : 512;
    const dataArr = new Uint8Array(bufLen);

    function draw() {
      ttsVizFrameRef.current = requestAnimationFrame(draw);
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w;
      canvas!.height = h;
      ctx2!.fillStyle = "#0a0a0c";
      ctx2!.fillRect(0, 0, w, h);
      if (analyser) {
        analyser.getByteTimeDomainData(dataArr);
        ctx2!.lineWidth = 1.2;
        ctx2!.strokeStyle = "#d4a017";
        ctx2!.shadowBlur = 4;
        ctx2!.shadowColor = "#d4a017";
        ctx2!.beginPath();
        const sliceW = w / bufLen;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const v = dataArr[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) { ctx2!.moveTo(x, y); } else { ctx2!.lineTo(x, y); }
          x += sliceW;
        }
        ctx2!.stroke();
      }
    }
    draw();
    return () => {
      if (ttsVizFrameRef.current) cancelAnimationFrame(ttsVizFrameRef.current);
    };
  }, [tab]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, []);

  /* ── TTS Logic ── */
  const selectCons = (c: Consonant) => {
    setSelectedCons(c);
  };

  const selectVow = (v: Vowel) => {
    if (!selectedCons) {
      setSyllables(prev => [...prev, { displaySym: v.sym, roman: v.ttsRoman }]);
    } else {
      const sym = (selectedCons.roman === "o" ? "" : selectedCons.sym) + v.sym;
      const roman = (selectedCons.ttsRoman || "") + v.ttsRoman;
      setSyllables(prev => [...prev, { displaySym: sym, roman }]);
      setSelectedCons(null);
    }
  };

  const removeSyllable = (i: number) => {
    setSyllables(prev => prev.filter((_, idx) => idx !== i));
  };

  const speakAll = () => {
    if (!window.speechSynthesis) return;
    const text = syllables.map(s => s.roman).join("");
    if (!text.trim()) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-US";
    utt.rate = 0.85;
    utt.pitch = 1.1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utt);
  };

  /* ── Synthesize all syllables via Web Audio (signal-style) ── */
  const [isSynthPlaying, setIsSynthPlaying] = useState(false);
  const synthAll = useCallback(() => {
    if (syllables.length === 0) return;
    setIsSynthPlaying(true);
    const ctx = getAudioCtx();
    let offset = ctx.currentTime + 0.05;
    const noteDur = 0.25;
    const gap = 0.05;

    for (const syl of syllables) {
      if (syl.roman.trim() === "") { offset += 0.15; continue; }
      // find matching consonant + vowel
      const chars = syl.roman;
      const matchedCons = CONSONANTS.find(c => c.ttsRoman && chars.startsWith(c.ttsRoman));
      const vowPart = matchedCons ? chars.slice(matchedCons.ttsRoman.length) : chars;
      const matchedVow = VOWELS.find(v => v.ttsRoman === vowPart);

      const freq = matchedCons && matchedCons.freq > 0
        ? matchedCons.freq + (matchedVow ? matchedVow.freq * 0.3 : 0)
        : (matchedVow ? matchedVow.freq : 440);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = matchedCons?.sig === "byun" ? "sawtooth" : matchedCons?.sig === "chung" ? "square" : "sine";
      osc.frequency.setValueAtTime(freq, offset);
      if (matchedVow) {
        osc.frequency.linearRampToValueAtTime(freq * 1.05, offset + noteDur * 0.5);
        osc.frequency.linearRampToValueAtTime(freq, offset + noteDur);
      }
      osc.connect(gain);
      gain.connect(analyserRef.current ?? ctx.destination);
      gain.gain.setValueAtTime(0, offset);
      gain.gain.linearRampToValueAtTime(0.18, offset + 0.02);
      gain.gain.setValueAtTime(0.18, offset + noteDur - 0.04);
      gain.gain.linearRampToValueAtTime(0, offset + noteDur);
      osc.start(offset);
      osc.stop(offset + noteDur);
      offset += noteDur + gap;
    }
    const totalDur = (offset - ctx.currentTime) * 1000 + 100;
    setTimeout(() => setIsSynthPlaying(false), totalDur);
  }, [syllables, getAudioCtx]);

  /* ── Signal Sound ── */
  const playSigSound = (data: { sig?: SigType; freq: number; roman: string; id: string }, type: "cons" | "vow") => {
    const ctx = getAudioCtx();
    const sig = data.sig || "vow";
    const baseFreq = data.freq || 440;

    setPlayingId(data.id);
    setTimeout(() => setPlayingId(null), 500);
    setPlayingLabel(`${data.roman} (${data.id}) — ${SIG_LABEL[sig]?.[en ? "en" : "ko"] || (en ? "Axis·Freq" : "축·주파수")} ${baseFreq ? baseFreq + "Hz" : ""}`);

    if (baseFreq === 0) return;

    const duration = type === "cons" ? 0.5 : 0.4;
    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(analyserRef.current!);

    if (sig === "jis") {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gainNode.gain.setValueAtTime(0.18, now + duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      osc.start(now); osc.stop(now + duration);
    } else if (sig === "byun") {
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      carrier.type = "sine"; modulator.type = "sine";
      carrier.frequency.setValueAtTime(baseFreq, now);
      modulator.frequency.setValueAtTime(baseFreq * 0.5, now);
      modGain.gain.setValueAtTime(baseFreq * 1.5, now);
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(gainNode);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      carrier.start(now); carrier.stop(now + duration);
      modulator.start(now); modulator.stop(now + duration);
    } else if (sig === "sun") {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = "sine"; lfo.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);
      lfo.frequency.setValueAtTime(6, now);
      lfoGain.gain.setValueAtTime(0.12, now);
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.0, now + duration);
      osc.start(now); osc.stop(now + duration);
      lfo.start(now); lfo.stop(now + duration);
    } else if (sig === "chung") {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(baseFreq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, now + 0.15);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0.28, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now); osc.stop(now + 0.2);
    } else {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gainNode.gain.setValueAtTime(0.15, now + duration - 0.06);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      osc.start(now); osc.stop(now + duration);
    }
  };

  /* ── Shared Cell Renderer ── */
  const ConsCell = ({ c, onClick, isActive }: { c: Consonant; onClick: () => void; isActive: boolean }) => (
    <button
      onClick={onClick}
      aria-label={`Consonant ${c.roman} (${c.id})`}
      aria-pressed={isActive}
      className={`flex flex-col items-center p-3 border rounded-lg transition-[transform,opacity,background-color,border-color,color] select-none cursor-pointer
        ${isActive
          ? "border-accent-amber bg-[#d4a017]/10 shadow-[0_0_12px_rgba(212,160,23,0.2)]"
          : "border-border bg-bg-secondary hover:border-accent-purple hover:bg-accent-purple/5"
        }`}
    >
      <span className="text-xl text-[#d4a017] font-serif leading-none mb-1">{c.sym}</span>
      <span className="font-mono text-[11px] text-text-primary">{c.roman}</span>
      <span className="text-[9px] text-text-tertiary">{c.ko}</span>
      <span className="text-[8px] text-text-tertiary/50 tracking-wider mt-0.5">{c.id}</span>
      <span className={`text-[7px] px-1.5 py-0.5 rounded mt-1 border ${SIG_COLORS[c.sig]}`}>
        {SIG_LABEL[c.sig][en ? "en" : "ko"]}
      </span>
    </button>
  );

  const VowCell = ({ v, onClick, isActive }: { v: Vowel; onClick: () => void; isActive: boolean }) => (
    <button
      onClick={onClick}
      aria-label={`Vowel ${v.roman} (${v.id})`}
      aria-pressed={isActive}
      className={`flex flex-col items-center p-3 border rounded-lg transition-[transform,opacity,background-color,border-color,color] select-none cursor-pointer
        ${isActive
          ? "border-accent-amber bg-[#d4a017]/10"
          : "border-border bg-bg-secondary hover:border-accent-purple hover:bg-accent-purple/5"
        }`}
    >
      <span className="text-xl text-[#d4a017] font-serif leading-none mb-1">{v.sym}</span>
      <span className="font-mono text-[11px] text-text-primary">{v.roman}</span>
      <span className="text-[9px] text-text-tertiary">{v.axis}</span>
      <span className="text-[8px] text-text-tertiary/50 tracking-wider mt-0.5">{v.id}</span>
    </button>
  );

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <ToolNav
            toolName={en ? "NEKA Sound" : "네카 사운드"}
            isKO={!en}
            relatedTools={[
              { href: '/tools/soundtrack', label: en ? 'Soundtrack' : '사운드트랙' },
              { href: '/tools/noa-tower', label: en ? 'NOA Tower' : 'NOA 타워' },
            ]}
          />

          <div className="doc-header motion-rise motion-rise-delay-1 rounded-t-[24px] mb-0">
            <span className="badge badge-blue mr-2">TOOL</span>
            {en
              ? "Document Level: PUBLIC — Level 0 — Interactive Interface"
              : "문서 등급: PUBLIC — Level 0 — 인터랙티브 인터페이스"}
          </div>

          <div className="premium-panel motion-rise motion-rise-delay-2 rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">
            {/* Title */}
            <div className="text-center mb-10">
              <p className="font-mono text-[9px] tracking-[0.4em] text-text-tertiary uppercase mb-2">
                NEKA LANGUAGE SYSTEM
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#d4a017] mb-2">
                {en ? "NEKA CHEMICAL SIGNAL — SOUND INTERFACE" : "네카 화학신호 — 음향 인터페이스"}
              </h1>
              <p className="font-mono text-xs text-text-tertiary">
                {en ? "Consonants 18 · Vowels 12 / Sichor Origin / Chemical Signal → Sound" : "자음 18자 · 모음 12자 / Sichor 기원 / 화학신호 → 음향 변환"}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border mb-8 gap-0" role="tablist" aria-label="Sound mode selection">
              <button
                onClick={() => setTab("tts")}
                aria-label={en ? "TTS Pronunciation tab" : "TTS 발음 탭"}
                aria-selected={tab === "tts"}
                role="tab"
                className={`px-6 py-3 font-mono text-[10px] tracking-widest border-b-2 transition-[transform,opacity,background-color,border-color,color] -mb-px ${
                  tab === "tts" ? "text-accent-purple border-accent-purple" : "text-text-tertiary border-transparent hover:text-text-secondary"
                }`}
              >
                ▶ TTS {en ? "PRONUNCIATION" : "발음"}
              </button>
              <button
                onClick={() => setTab("sig")}
                aria-label={en ? "Signal Sound tab" : "신호음 탭"}
                aria-selected={tab === "sig"}
                role="tab"
                className={`px-6 py-3 font-mono text-[10px] tracking-widest border-b-2 transition-[transform,opacity,background-color,border-color,color] -mb-px ${
                  tab === "sig" ? "text-accent-purple border-accent-purple" : "text-text-tertiary border-transparent hover:text-text-secondary"
                }`}
              >
                ◈ {en ? "SIGNAL SOUND" : "신호음 (화학신호)"}
              </button>
            </div>

            {/* ═══ TTS TAB ═══ */}
            {tab === "tts" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Info Box */}
                <div className="border-l-2 border-accent-purple bg-accent-purple/5 p-4 text-xs text-text-secondary leading-relaxed">
                  <strong className="text-accent-purple">
                    {en ? "Usage:" : "사용법:"}
                  </strong>{" "}
                  {en
                    ? "Click consonant → vowel to compose syllables. Collect syllables and press ▶ Play to hear TTS pronunciation. C01–C14 map to Korean phonemes. C15–C18 are Neka-unique (human approximation)."
                    : "자음 → 모음 순서로 클릭하면 음절이 조합됩니다. 조합된 음절들을 모아 ▶ 재생하면 TTS가 읽어줍니다. C01~C14는 한글 대응. C15~C18은 네카 고유 음소 (인류 발음 근사치)."}
                </div>

                {/* Consonants Grid */}
                <div>
                  <h2 className="font-mono text-[9px] tracking-[0.3em] text-text-tertiary uppercase mb-3">
                    {en ? "CONSONANTS (18)" : "자음 — CONSONANTS (18)"}
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2">
                    {CONSONANTS.map(c => (
                      <ConsCell
                        key={c.id} c={c}
                        onClick={() => selectCons(c)}
                        isActive={selectedCons?.id === c.id}
                      />
                    ))}
                  </div>
                </div>

                {/* Vowels Grid */}
                <div>
                  <h2 className="font-mono text-[9px] tracking-[0.3em] text-text-tertiary uppercase mb-3">
                    {en ? "VOWELS (12)" : "모음 — VOWELS (12)"}
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {VOWELS.map(v => (
                      <VowCell
                        key={v.id} v={v}
                        onClick={() => selectVow(v)}
                        isActive={false}
                      />
                    ))}
                  </div>
                </div>

                {/* Composer */}
                <div>
                  <h2 className="font-mono text-[9px] tracking-[0.3em] text-text-tertiary uppercase mb-3">
                    {en ? "COMPOSER" : "조합기 — COMPOSER"}
                  </h2>
                  <div className="border border-border bg-bg-tertiary rounded-lg p-5 space-y-4">
                    {/* Display */}
                    <div className="min-h-[56px] border border-border border-l-2 border-l-[#d4a017] bg-bg-primary rounded p-3 flex items-center flex-wrap gap-2">
                      {syllables.length === 0 && !selectedCons && (
                        <span className="text-text-tertiary text-xs italic">
                          {en ? "Click consonant + vowel to compose" : "자음 + 모음을 클릭해 조합하세요"}
                        </span>
                      )}
                      {syllables.map((s, i) =>
                        s.displaySym === " " ? (
                          <span key={i} className="inline-block w-4" />
                        ) : (
                          <button
                            key={i}
                            onClick={() => removeSyllable(i)}
                            title={en ? "Click to remove" : "클릭하여 삭제"}
                            className="inline-flex flex-col items-center px-2 py-1 bg-[#d4a017]/10 border border-[#d4a017]/30 rounded cursor-pointer hover:bg-[#d4a017]/20 transition-colors"
                          >
                            <span className="text-lg text-[#d4a017]">{s.displaySym}</span>
                            <span className="text-[9px] text-text-tertiary">{s.roman}</span>
                          </button>
                        )
                      )}
                      {selectedCons && (
                        <span className="px-2 py-1 border border-dashed border-[#d4a017] text-[#d4a017] text-sm rounded opacity-70">
                          {selectedCons.sym}
                        </span>
                      )}
                    </div>
                    {/* Buttons */}
                    {/* TTS Mini Visualizer */}
                    <div className="border border-border border-t-2 border-t-[#d4a017] bg-bg-primary rounded overflow-hidden relative">
                      <span className="absolute top-1 left-2.5 font-mono text-[7px] tracking-widest text-[#d4a017]/50">
                        SYNTH OUTPUT
                      </span>
                      <canvas ref={ttsCanvasRef} className="block w-full h-14" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={speakAll} aria-label={en ? "Play all (TTS)" : "전체 재생 (TTS)"} className="px-4 py-2 border border-accent-purple text-accent-purple font-mono text-[9px] tracking-widest hover:bg-accent-purple hover:text-white transition-colors rounded">
                        ▶ {en ? "TTS SPEAK" : "TTS 발음"}
                      </button>
                      <button
                        onClick={synthAll}
                        disabled={isSynthPlaying || syllables.length === 0}
                        aria-label={en ? "Synthesize all syllables" : "음향 합성 재생"}
                        className="px-4 py-2 border border-[#d4a017] text-[#d4a017] font-mono text-[9px] tracking-widest hover:bg-[#d4a017] hover:text-black transition-[opacity,background-color,border-color,color] rounded disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        ♫ {en ? "SYNTH PLAY" : "음향 합성"}
                      </button>
                      <button onClick={() => setSyllables(prev => [...prev, { displaySym: " ", roman: " " }])} aria-label={en ? "Add space" : "공백 추가"} className="px-4 py-2 border border-border text-text-tertiary font-mono text-[9px] tracking-widest hover:border-text-secondary hover:text-text-secondary transition-colors rounded">
                        SPACE
                      </button>
                      <button
                        onClick={() => {
                          if (selectedCons) setSelectedCons(null);
                          else setSyllables(prev => prev.slice(0, -1));
                        }}
                        aria-label={en ? "Delete last syllable" : "마지막 음절 삭제"}
                        className="px-4 py-2 border border-border text-text-tertiary font-mono text-[9px] tracking-widest hover:border-text-secondary hover:text-text-secondary transition-colors rounded"
                      >
                        ← DEL
                      </button>
                      <button
                        onClick={() => { setSyllables([]); setSelectedCons(null); }}
                        aria-label={en ? "Clear all syllables" : "전체 삭제"}
                        className="px-4 py-2 border border-border text-text-tertiary font-mono text-[9px] tracking-widest hover:border-red-500 hover:text-red-500 transition-colors rounded"
                      >
                        CLEAR
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-center text-[10px] text-text-tertiary italic">
                  {en
                    ? "Note: TTS uses browser speech engine. Neka-unique phonemes (khra, tsin, vra, ghn) are output as approximations."
                    : "TTS는 브라우저 음성 엔진 사용. 네카 고유 음소(khra, tsin, vra, ghn)는 근사 발음으로 출력됩니다."}
                  <br />
                  <span className="text-[#d4a017]">
                    {en
                      ? "Converting chemical signals to sound is an unofficial interpretation."
                      : "화학신호를 소리로 변환하는 것은 비공식 해석임."}
                  </span>
                </p>
              </div>
            )}

            {/* ═══ SIGNAL TAB ═══ */}
            {tab === "sig" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Info Box */}
                <div className="border-l-2 border-accent-purple bg-accent-purple/5 p-4 text-xs text-text-secondary leading-relaxed">
                  <strong className="text-accent-purple">
                    {en ? "Chemical Signal Concept:" : "화학신호 컨셉:"}
                  </strong>{" "}
                  {en
                    ? "Neka communicate via chemical signals through RIDE crystals, not sound. Each signal type has different acoustic characteristics. Click to play the electronic sound for each signal type."
                    : "네카는 소리가 아닌 RIDE 결정을 통한 화학신호로 소통합니다. 신호 유형별로 다른 음향 특성을 부여했습니다. 클릭하면 해당 신호 유형의 전자음이 재생됩니다."}
                  <br />
                  <strong className="text-text-primary">
                    {en
                      ? "Linear=Sustained · Curved=FM · Circular=Cyclic · Angular=Percussive"
                      : "직선=지속음 · 곡선=변조음 · 원형=순환음 · 각진형=충격음"}
                  </strong>
                </div>

                {/* Signal Legend */}
                <div className="flex gap-4 flex-wrap">
                  {(["jis", "byun", "sun", "chung", "mu"] as SigType[]).map(s => (
                    <div key={s} className="flex items-center gap-2 text-[10px] text-text-tertiary">
                      <div className={`w-2.5 h-2.5 rounded-full ${SIG_DOT_COLORS[s]}`} />
                      {SIG_LABEL[s][en ? "en" : "ko"]}
                    </div>
                  ))}
                </div>

                {/* Visualizer */}
                <div className="border border-border border-t-2 border-t-accent-purple bg-bg-primary rounded overflow-hidden relative">
                  <span className="absolute top-1.5 left-3 font-mono text-[8px] tracking-widest text-accent-purple/60">
                    SIGNAL OUTPUT
                  </span>
                  <canvas ref={canvasRef} className="block w-full h-20" />
                </div>

                {/* Playing Now */}
                {playingLabel && (
                  <div className="flex items-center gap-2 text-[10px] text-accent-purple min-h-[20px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
                    {playingLabel}
                  </div>
                )}

                {/* Consonants Grid */}
                <div>
                  <h2 className="font-mono text-[9px] tracking-[0.3em] text-text-tertiary uppercase mb-3">
                    {en ? "CONSONANTS (18) / SIGNAL-TYPE SOUND" : "자음 — CONSONANTS (18) / 신호 유형별 음향"}
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2">
                    {CONSONANTS.map(c => (
                      <ConsCell
                        key={c.id} c={c}
                        onClick={() => playSigSound(c, "cons")}
                        isActive={playingId === c.id}
                      />
                    ))}
                  </div>
                </div>

                {/* Vowels Grid */}
                <div>
                  <h2 className="font-mono text-[9px] tracking-[0.3em] text-text-tertiary uppercase mb-3">
                    {en ? "VOWELS (12) / AXIS-BASED FREQUENCY" : "모음 — VOWELS (12) / 축 기반 주파수"}
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {VOWELS.map(v => (
                      <VowCell
                        key={v.id} v={v}
                        onClick={() => playSigSound({ ...v, sig: undefined as unknown as SigType }, "vow")}
                        isActive={playingId === v.id}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-center text-[10px] text-text-tertiary italic">
                  {en
                    ? "Chemical signal → electronic sound conversion is a creative interpretation. Actual Neka communication is based on RIDE crystal resonance."
                    : "화학신호 → 전자음 변환은 창작 해석입니다. 실제 네카 소통 방식은 RIDE 결정 공명 기반."}
                  <br />
                  <span className="text-[#d4a017]">
                    {en
                      ? "Playing this file is not technically 'pronouncing' Neka."
                      : "이 파일을 재생하는 것은 기술적으로 네카어를 발음하는 게 아닙니다."}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link
              href="/archive/neka-language"
              aria-label={en ? "Back to Neka language article" : "네카 언어 문서로 돌아가기"}
              className="font-mono text-xs text-accent-purple hover:underline tracking-wider"
            >
              ← {en ? "BACK TO NEKA LANGUAGE ARTICLE" : "네카 언어 문서로 돌아가기"}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
