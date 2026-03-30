// ============================================================
// Code Studio — Voice Input (Web Speech API)
// ============================================================

/* ── Types ── */

export interface VoiceInputConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
}

export interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  confidence: number;
}

export type VoiceInputCallback = (state: VoiceInputState) => void;

/* ── Default config ── */

export const DEFAULT_VOICE_CONFIG: VoiceInputConfig = {
  language: 'ko-KR',
  continuous: true,
  interimResults: true,
};

/* ── Feature detection ── */

export function isVoiceInputSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
}

/* ── Voice Input Controller ── */

export class VoiceInputController {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private state: VoiceInputState = {
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    confidence: 0,
  };
  private callback: VoiceInputCallback | null = null;

  constructor(private config: VoiceInputConfig = DEFAULT_VOICE_CONFIG) {}

  private notify(): void {
    this.callback?.({ ...this.state });
  }

  onStateChange(cb: VoiceInputCallback): void {
    this.callback = cb;
  }

  start(): boolean {
    if (!isVoiceInputSupported()) {
      this.state.error = 'Speech recognition not supported';
      this.notify();
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
          this.state.confidence = result[0].confidence;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) this.state.transcript += final;
      this.state.interimTranscript = interim;
      this.notify();
    };

    this.recognition.onerror = (event: { error: string }) => {
      this.state.error = event.error;
      this.state.isListening = false;
      this.notify();
    };

    this.recognition.onend = () => {
      this.state.isListening = false;
      this.notify();
    };

    try {
      this.recognition.start();
      this.state.isListening = true;
      this.state.error = null;
      this.state.transcript = '';
      this.state.interimTranscript = '';
      this.notify();
      return true;
    } catch {
      this.state.error = 'Failed to start recognition';
      this.notify();
      return false;
    }
  }

  stop(): string {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.state.isListening = false;
    this.notify();
    return this.state.transcript;
  }

  getTranscript(): string {
    return this.state.transcript;
  }

  getState(): VoiceInputState {
    return { ...this.state };
  }

  setLanguage(lang: string): void {
    this.config.language = lang;
  }

  dispose(): void {
    this.stop();
    this.callback = null;
  }
}

// IDENTITY_SEAL: role=VoiceInput | inputs=Web Speech API | outputs=VoiceInputState,transcript
