"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  type Lang,
  type Civilization,
  type CustomPhoneme,
  type LangWord,
  type SigClass,
  type WaveType,
  SIG_CLASS_META,
  GENRE_PHONEME_PRESETS,
  L4,
} from "./types";

// ============================================================
// PART 1 — Language Forge (world language generator)
// Phoneme design, vocabulary builder, sentence composer
// ============================================================

export function LanguageForge({ 
  lang, 
  civs,
  phonemes,
  setPhonemes,
  words,
  setWords
}: { 
  lang: Lang; 
  civs: Civilization[];
  phonemes: CustomPhoneme[];
  setPhonemes: React.Dispatch<React.SetStateAction<CustomPhoneme[]>>;
  words: LangWord[];
  setWords: React.Dispatch<React.SetStateAction<LangWord[]>>;
}) {

  const [subTab, setSubTab] = useState<"phonemes" | "words" | "compose">("phonemes");
  const [composeBuf, setComposeBuf] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vizFrameRef = useRef<number | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024;
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    return audioCtxRef.current;
  }, []);

  // ── Waveform visualizer ──
  useEffect(() => {
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
      ctx2!.fillStyle = "rgba(10,10,12,0.85)";
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
  }, []);

  // IDENTITY_SEAL: PART-1 | role=audio-context-and-viz | inputs=canvasRef,analyserRef | outputs=waveform-render

  // ============================================================
  // PART 2 — Phoneme playback (signal synthesis)
  // ============================================================

  const playPhoneme = useCallback((ph: CustomPhoneme) => {
    if (ph.freq === 0) return;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const duration = ph.type === "consonant" ? 0.4 : 0.35;
    const gainNode = ctx.createGain();
    gainNode.connect(analyserRef.current!);

    setPlayingId(ph.id);
    setTimeout(() => setPlayingId(null), duration * 1000);

    if (ph.sigClass === "sustained") {
      const osc = ctx.createOscillator();
      osc.type = ph.wave;
      osc.frequency.setValueAtTime(ph.freq, now);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gainNode.gain.setValueAtTime(0.18, now + duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      osc.start(now); osc.stop(now + duration);
    } else if (ph.sigClass === "modulated") {
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      carrier.type = ph.wave; modulator.type = "sine";
      carrier.frequency.setValueAtTime(ph.freq, now);
      modulator.frequency.setValueAtTime(ph.freq * 0.5, now);
      modGain.gain.setValueAtTime(ph.freq * 1.5, now);
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(gainNode);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      carrier.start(now); carrier.stop(now + duration);
      modulator.start(now); modulator.stop(now + duration);
    } else if (ph.sigClass === "percussive") {
      const osc = ctx.createOscillator();
      osc.type = ph.wave;
      osc.frequency.setValueAtTime(ph.freq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(ph.freq * 0.3, now + 0.15);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0.28, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now); osc.stop(now + 0.2);
    } else if (ph.sigClass === "cyclic") {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = ph.wave; lfo.type = "sine";
      osc.frequency.setValueAtTime(ph.freq, now);
      lfo.frequency.setValueAtTime(6, now);
      lfoGain.gain.setValueAtTime(0.12, now);
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      osc.start(now); osc.stop(now + duration);
      lfo.start(now); lfo.stop(now + duration);
    }
  }, [getAudioCtx]);

  const playSequence = useCallback((phIds: string[]) => {
    const delay = 280;
    phIds.forEach((pid, i) => {
      const ph = phonemes.find(p => p.id === pid);
      if (ph) setTimeout(() => playPhoneme(ph), i * delay);
    });
  }, [phonemes, playPhoneme]);

  const speakTTS = useCallback((roman: string) => {
    if (!window.speechSynthesis || !roman.trim()) return;
    const utt = new SpeechSynthesisUtterance(roman);
    utt.lang = "en-US";
    utt.rate = 0.85;
    utt.pitch = 1.1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utt);
  }, []);

  const loadPreset = useCallback((presetKey: string) => {
    const preset = GENRE_PHONEME_PRESETS[presetKey];
    if (!preset) return;
    setPhonemes(preset.phonemes.map((p, i) => ({ ...p, id: `ph-${presetKey}-${i}-${Date.now()}` })));
  }, [setPhonemes]);

  // IDENTITY_SEAL: PART-2 | role=phoneme-playback | inputs=CustomPhoneme | outputs=audio-signal

  // ============================================================
  // PART 3 — Custom phoneme & word builder state
  // ============================================================

  const [newPhForm, setNewPhForm] = useState({ symbol: "", roman: "", type: "consonant" as "consonant" | "vowel", sigClass: "sustained" as SigClass, freq: 300, wave: "sine" as WaveType });

  const addPhoneme = () => {
    if (!newPhForm.symbol.trim() || !newPhForm.roman.trim()) return;
    setPhonemes(prev => [...prev, { ...newPhForm, id: `ph-custom-${Date.now()}` }]);
    setNewPhForm({ symbol: "", roman: "", type: "consonant", sigClass: "sustained", freq: 300, wave: "sine" });
  };

  const [newWordMeaning, setNewWordMeaning] = useState("");
  const [wordPhBuf, setWordPhBuf] = useState<string[]>([]);

  const addWord = () => {
    if (!newWordMeaning.trim() || wordPhBuf.length === 0) return;
    const roman = wordPhBuf.map(id => phonemes.find(p => p.id === id)?.roman || "").join("");
    setWords(prev => [...prev, { id: `w-${Date.now()}`, meaning: newWordMeaning.trim(), phonemes: [...wordPhBuf], roman }]);
    setNewWordMeaning("");
    setWordPhBuf([]);
  };

  const consonants = phonemes.filter(p => p.type === "consonant");
  const vowels = phonemes.filter(p => p.type === "vowel");

  const composeRoman = composeBuf.map(wid => words.find(w => w.id === wid)?.roman || "").join(" ");
  const composePhIds = composeBuf.flatMap(wid => words.find(w => w.id === wid)?.phonemes || []);

  // IDENTITY_SEAL: PART-3 | role=builder-state | inputs=user-input | outputs=phonemes,words

  // ============================================================
  // PART 4 — Render
  // ============================================================

  return (
    <div className="space-y-5">
      {/* Sub tabs */}
      <div className="flex gap-2">
        {([
          { id: "phonemes" as const, ko: "음소 설계", en: "Phonemes" },
          { id: "words" as const, ko: "어휘 빌더", en: "Vocabulary" },
          { id: "compose" as const, ko: "문장 합성", en: "Compose" },
        ]).map(st => (
          <button key={st.id} onClick={() => setSubTab(st.id)}
            className={`px-3 py-1.5 rounded text-[10px] font-bold font-[family-name:var(--font-mono)] tracking-wider uppercase transition-all ${
              subTab === st.id ? "bg-accent-purple text-white" : "bg-bg-primary text-text-tertiary border border-border hover:text-text-secondary"
            }`}>
            {L4(lang, st)}
          </button>
        ))}
      </div>

      {/* Waveform canvas */}
      <canvas ref={canvasRef} className="w-full h-16 rounded border border-border bg-bg-primary" />

      {/* ====== PHONEMES TAB ====== */}
      {subTab === "phonemes" && (
        <div className="space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider">
              {L4(lang, { ko: "프리셋:", en: "Presets:" })}
            </span>
            {Object.entries(GENRE_PHONEME_PRESETS).map(([key, val]) => (
              <button key={key} onClick={() => loadPreset(key)}
                className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors">
                {L4(lang, val.label)}
              </button>
            ))}
          </div>

          {/* Consonant/Vowel grid */}
          {phonemes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
                  {L4(lang, { ko: "자음", en: "Consonants" })} ({consonants.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {consonants.map(ph => {
                    const meta = SIG_CLASS_META[ph.sigClass];
                    return (
                      <button key={ph.id} onClick={() => playPhoneme(ph)}
                        className={`relative px-2.5 py-2 rounded border text-xs font-bold transition-all ${
                          playingId === ph.id ? "ring-2 ring-accent-purple scale-105" : ""
                        }`}
                        style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}10` }}
                        title={`${ph.roman} | ${ph.freq}Hz | ${meta.ko}`}
                      >
                        <div className="text-sm">{ph.symbol}</div>
                        <div className="text-[7px] opacity-60">{ph.roman}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
                  {L4(lang, { ko: "모음", en: "Vowels" })} ({vowels.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {vowels.map(ph => {
                    const meta = SIG_CLASS_META[ph.sigClass];
                    return (
                      <button key={ph.id} onClick={() => playPhoneme(ph)}
                        className={`relative px-2.5 py-2 rounded border text-xs font-bold transition-all ${
                          playingId === ph.id ? "ring-2 ring-accent-purple scale-105" : ""
                        }`}
                        style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}10` }}
                        title={`${ph.roman} | ${ph.freq}Hz | ${meta.ko}`}
                      >
                        <div className="text-sm">{ph.symbol}</div>
                        <div className="text-[7px] opacity-60">{ph.roman}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Add custom phoneme */}
          <div className="border border-border rounded-lg p-3 bg-bg-primary space-y-2">
            <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
              {L4(lang, { ko: "커스텀 음소 추가", en: "Add Custom Phoneme" })}
            </h4>
            <div className="flex flex-wrap gap-2">
              <input value={newPhForm.symbol} onChange={e => setNewPhForm(p => ({ ...p, symbol: e.target.value }))}
                placeholder={L4(lang, { ko: "기호", en: "Symbol" })} className="w-16 bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent-purple" />
              <input value={newPhForm.roman} onChange={e => setNewPhForm(p => ({ ...p, roman: e.target.value }))}
                placeholder={L4(lang, { ko: "로마자", en: "Roman" })} className="w-20 bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent-purple" />
              <select value={newPhForm.type} onChange={e => setNewPhForm(p => ({ ...p, type: e.target.value as "consonant" | "vowel" }))}
                className="bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none">
                <option value="consonant">{L4(lang, { ko: "자음", en: "Cons." })}</option>
                <option value="vowel">{L4(lang, { ko: "모음", en: "Vowel" })}</option>
              </select>
              <select value={newPhForm.sigClass} onChange={e => setNewPhForm(p => ({ ...p, sigClass: e.target.value as SigClass }))}
                className="bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none">
                {(Object.keys(SIG_CLASS_META) as SigClass[]).map(sc => (
                  <option key={sc} value={sc}>{L4(lang, SIG_CLASS_META[sc])}</option>
                ))}
              </select>
              <input type="number" value={newPhForm.freq} onChange={e => setNewPhForm(p => ({ ...p, freq: parseInt(e.target.value) || 0 }))}
                className="w-16 bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none" placeholder="Hz" />
              <select value={newPhForm.wave} onChange={e => setNewPhForm(p => ({ ...p, wave: e.target.value as WaveType }))}
                className="bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none">
                <option value="sine">Sine</option><option value="sawtooth">Saw</option>
                <option value="square">Square</option><option value="triangle">Triangle</option>
              </select>
              <button onClick={addPhoneme} className="px-3 py-1 bg-accent-purple text-white rounded text-xs font-bold">+</button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[9px]">
            {(Object.keys(SIG_CLASS_META) as SigClass[]).map(sc => (
              <span key={sc} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: SIG_CLASS_META[sc].color }} />
                {L4(lang, SIG_CLASS_META[sc])}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ====== WORDS TAB ====== */}
      {subTab === "words" && (
        <div className="space-y-4">
          {phonemes.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-xs italic">
              {L4(lang, { ko: "먼저 음소 탭에서 음소를 추가하세요", en: "Add phonemes in the Phonemes tab first" })}
            </div>
          ) : (
            <>
              <div className="border border-border rounded-lg p-3 bg-bg-primary space-y-3">
                <input value={newWordMeaning} onChange={e => setNewWordMeaning(e.target.value)}
                  placeholder={L4(lang, { ko: "뜻 (예: 불, 물, 인사)", en: "Meaning (e.g. fire, water, hello)" })}
                  className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-xs outline-none focus:border-accent-purple" />

                <div className="flex flex-wrap gap-1">
                  {phonemes.filter(p => p.sigClass !== "silent").map(ph => (
                    <button key={ph.id} onClick={() => { setWordPhBuf(prev => [...prev, ph.id]); playPhoneme(ph); }}
                      className="px-2 py-1 rounded border text-[10px] font-bold hover:scale-105 transition-all"
                      style={{ borderColor: SIG_CLASS_META[ph.sigClass].color, color: SIG_CLASS_META[ph.sigClass].color }}>
                      {ph.symbol}
                    </button>
                  ))}
                </div>

                {wordPhBuf.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-text-tertiary">{L4(lang, { ko: "조합:", en: "Build:" })}</span>
                    {wordPhBuf.map((pid, i) => {
                      const ph = phonemes.find(p => p.id === pid);
                      return (
                        <span key={i} className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[10px] font-bold cursor-pointer hover:line-through"
                          onClick={() => setWordPhBuf(prev => prev.filter((_, idx) => idx !== i))}>
                          {ph?.symbol}
                        </span>
                      );
                    })}
                    <span className="text-[10px] text-text-secondary font-[family-name:var(--font-mono)]">
                      &rarr; {wordPhBuf.map(id => phonemes.find(p => p.id === id)?.roman || "").join("")}
                    </span>
                    <button onClick={() => playSequence(wordPhBuf)} className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[9px] font-bold">
                      &#9654;
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={addWord} disabled={!newWordMeaning.trim() || wordPhBuf.length === 0}
                    className="px-4 py-1.5 bg-accent-purple text-white rounded text-xs font-bold disabled:opacity-30">
                    {L4(lang, { ko: "단어 등록", en: "Register Word" })}
                  </button>
                  <button onClick={() => setWordPhBuf([])} className="px-3 py-1.5 bg-bg-secondary border border-border rounded text-xs text-text-tertiary">
                    {L4(lang, { ko: "초기화", en: "Clear" })}
                  </button>
                </div>
              </div>

              {words.length > 0 && (
                <div className="space-y-1.5">
                  {words.map(w => (
                    <div key={w.id} className="flex items-center justify-between bg-bg-primary border border-border rounded px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-text-primary">{w.meaning}</span>
                        <span className="text-[10px] text-accent-purple font-[family-name:var(--font-mono)] font-bold">{w.roman}</span>
                        <span className="text-[9px] text-text-tertiary">
                          [{w.phonemes.map(pid => phonemes.find(p => p.id === pid)?.symbol).join("")}]
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => playSequence(w.phonemes)} className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[9px] font-bold">&#9654; SIG</button>
                        <button onClick={() => speakTTS(w.roman)} className="px-2 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-[9px] font-bold">&#9654; TTS</button>
                        <button onClick={() => setWords(prev => prev.filter(ww => ww.id !== w.id))} className="text-text-tertiary hover:text-accent-red text-xs">&#10005;</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ====== COMPOSE TAB ====== */}
      {subTab === "compose" && (
        <div className="space-y-4">
          {words.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-xs italic">
              {L4(lang, { ko: "먼저 어휘 탭에서 단어를 등록하세요", en: "Register words in the Vocabulary tab first" })}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider">
                  {L4(lang, { ko: "단어를 클릭하여 문장 조립:", en: "Click words to compose sentence:" })}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {words.map(w => (
                    <button key={w.id} onClick={() => setComposeBuf(prev => [...prev, w.id])}
                      className="px-2.5 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors">
                      {w.meaning} <span className="text-text-tertiary">({w.roman})</span>
                    </button>
                  ))}
                </div>
              </div>

              {composeBuf.length > 0 && (
                <div className="border border-accent-purple/30 bg-accent-purple/5 rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {composeBuf.map((wid, i) => {
                      const w = words.find(ww => ww.id === wid);
                      return (
                        <span key={i} className="px-2 py-1 bg-accent-purple/10 text-accent-purple rounded text-xs font-bold cursor-pointer hover:line-through"
                          onClick={() => setComposeBuf(prev => prev.filter((_, idx) => idx !== i))}>
                          {w?.meaning}
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-sm font-bold text-text-primary font-[family-name:var(--font-mono)]">
                    {composeRoman}
                  </div>

                  {civs.length > 0 && (
                    <div className="flex items-center gap-2 text-[9px] text-text-tertiary">
                      <span>{L4(lang, { ko: "문명 지정:", en: "Assign to civ:" })}</span>
                      {civs.map(c => (
                        <button key={c.id} onClick={() => {
                          setWords(prev => prev.map(w =>
                            composeBuf.includes(w.id) ? { ...w, civId: c.id } : w
                          ));
                        }}
                          className="px-1.5 py-0.5 rounded border text-[9px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ borderColor: c.color, color: c.color }}
                          title={lang === 'ko' ? `${c.name}에 귀속` : `Assign to ${c.name}`}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => playSequence(composePhIds)}
                      className="px-4 py-2 bg-accent-purple text-white rounded text-xs font-bold flex items-center gap-1.5">
                      &#9654; {L4(lang, { ko: "신호음 재생", en: "Play Signal" })}
                    </button>
                    <button onClick={() => speakTTS(composeRoman)}
                      className="px-4 py-2 bg-accent-blue text-white rounded text-xs font-bold flex items-center gap-1.5">
                      &#9654; {L4(lang, { ko: "TTS 발음", en: "TTS Speak" })}
                    </button>
                    <button onClick={() => setComposeBuf([])} className="px-3 py-2 bg-bg-secondary border border-border rounded text-xs text-text-tertiary">
                      {L4(lang, { ko: "초기화", en: "Clear" })}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 text-[9px] font-[family-name:var(--font-mono)] pt-2 border-t border-border">
        <span className="text-text-tertiary">{L4(lang, { ko: "음소", en: "Phonemes" })}: <span className="text-accent-purple font-bold">{phonemes.length}</span></span>
        <span className="text-text-tertiary">{L4(lang, { ko: "자음", en: "Cons" })}: <span className="font-bold">{consonants.length}</span></span>
        <span className="text-text-tertiary">{L4(lang, { ko: "모음", en: "Vowels" })}: <span className="font-bold">{vowels.length}</span></span>
        <span className="text-text-tertiary">{L4(lang, { ko: "어휘", en: "Words" })}: <span className="text-accent-purple font-bold">{words.length}</span></span>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=language-forge-render | inputs=lang,civs | outputs=JSX
