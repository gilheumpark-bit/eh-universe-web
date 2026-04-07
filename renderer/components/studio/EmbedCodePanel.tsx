"use client";

// ============================================================
// EmbedCodePanel — 임베드 코드 복사 패널
// ============================================================
// ShareToNetwork 모달 하단 또는 독립적으로 사용.
// 세계관 문서, 캐릭터 카드 등을 외부 사이트에 삽입할 수 있는
// iframe 코드를 생성하고 클립보드에 복사.

import React, { useState, useCallback, useMemo } from 'react';
import { Code2, Copy, Check } from 'lucide-react';
import type { EmbedType, EmbedConfig } from '@/lib/web-features/embed';

interface Props {
  /** 임베드 대상 유형 */
  type: EmbedType;
  /** 대상 ID */
  id: string;
  /** 제목 (미리보기 표시용) */
  title?: string;
  /** 한국어 여부 */
  isKO?: boolean;
}

const THEME_OPTIONS = [
  { value: 'dark' as const, ko: '다크', en: 'Dark' },
  { value: 'light' as const, ko: '라이트', en: 'Light' },
];

const SIZE_PRESETS = [
  { label: '작게', en: 'Small', width: '400px', height: '300px' },
  { label: '보통', en: 'Medium', width: '600px', height: '400px' },
  { label: '크게', en: 'Large', width: '100%', height: '600px' },
];

export default function EmbedCodePanel({ type, id, title, isKO = true }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [sizeIndex, setSizeIndex] = useState(1);
  const [copied, setCopied] = useState(false);

  const config: EmbedConfig = useMemo(() => ({
    type,
    id,
    theme,
    width: SIZE_PRESETS[sizeIndex].width,
    height: SIZE_PRESETS[sizeIndex].height,
  }), [type, id, theme, sizeIndex]);

  const embedHtml = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eh-universe.com';
    const params = new URLSearchParams();
    if (config.theme) params.set('theme', config.theme);
    const query = params.toString();
    const url = `${origin}/embed/${config.type}/${config.id}${query ? `?${query}` : ''}`;
    const width = config.width || '100%';
    const height = config.height || '400px';
    return `<iframe src="${url}" width="${width}" height="${height}" style="border:1px solid #333;border-radius:12px;" frameborder="0" allow="clipboard-write" loading="lazy"></iframe>`;
  }, [config]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = embedHtml;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [embedHtml]);

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Code2 className="w-4 h-4 text-accent-amber" />
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
          {isKO ? '임베드 코드' : 'Embed Code'}
        </span>
      </div>

      {title && (
        <p className="text-[11px] text-text-tertiary truncate">
          {isKO ? '대상: ' : 'Target: '}{title}
        </p>
      )}

      {/* 테마 선택 */}
      <div className="flex gap-1.5">
        {THEME_OPTIONS.map(t => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
              theme === t.value
                ? 'bg-accent-amber/20 border-accent-amber text-white'
                : 'border-border text-text-tertiary'
            }`}
          >
            {isKO ? t.ko : t.en}
          </button>
        ))}
      </div>

      {/* 크기 선택 */}
      <div className="flex gap-1.5">
        {SIZE_PRESETS.map((s, i) => (
          <button
            key={i}
            onClick={() => setSizeIndex(i)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
              sizeIndex === i
                ? 'bg-white/10 border-white/20 text-white'
                : 'border-border text-text-tertiary'
            }`}
          >
            {isKO ? s.label : s.en}
          </button>
        ))}
      </div>

      {/* 코드 미리보기 */}
      <div className="relative">
        <pre className="text-[9px] text-text-tertiary bg-black/30 border border-border/50 rounded-xl p-3 overflow-x-auto select-all leading-relaxed">
          {embedHtml}
        </pre>
        <button
          onClick={handleCopy}
          className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${
            copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-text-tertiary hover:text-white'
          }`}
          title={isKO ? '복사' : 'Copy'}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
