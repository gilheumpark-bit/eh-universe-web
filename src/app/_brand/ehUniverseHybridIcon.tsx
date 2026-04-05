import type { CSSProperties, ReactElement } from 'react';

const palette = {
  bgTop: '#f8f4ed',
  bgBottom: '#e7dfd3',
  frame: '#6a776b',
  medallion: '#5c6b5e',
  medallionEdge: '#48574a',
  orbit: '#758473',
  orbitAccent: '#d6c4a0',
  spark: '#71806f',
  sparkMuted: '#8d9a88',
  text: '#f8f4ed',
};

type EhUniverseHybridIconProps = {
  size: number;
  compact?: boolean;
};

function px(value: number): string {
  return `${Math.round(value)}px`;
}

function absoluteBox(top: number, left: number, width: number, height: number, extra: CSSProperties): CSSProperties {
  return {
    position: 'absolute',
    top: px(top),
    left: px(left),
    width: px(width),
    height: px(height),
    ...extra,
  };
}

export function EhUniverseHybridIcon({ size, compact = false }: EhUniverseHybridIconProps): ReactElement {
  const frameInset = size * (compact ? 0.082 : 0.074);
  const frameBorder = Math.max(3, Math.round(size * 0.01));
  const medallionSize = size * (compact ? 0.58 : 0.54);
  const medallionTop = size * (compact ? 0.205 : 0.2);
  const medallionLeft = (size - medallionSize) / 2;
  const medallionBorder = Math.max(3, Math.round(size * 0.012));
  const orbitWidth = medallionSize * (compact ? 1.08 : 1.18);
  const orbitHeight = medallionSize * (compact ? 0.4 : 0.44);
  const orbitTop = medallionTop + medallionSize * 0.31;
  const orbitLeft = (size - orbitWidth) / 2;
  const orbitBorder = Math.max(3, Math.round(size * (compact ? 0.022 : 0.015)));
  const orbitAccentBorder = Math.max(2, Math.round(orbitBorder * 0.6));
  const orbitDotSize = size * (compact ? 0.06 : 0.045);
  const ehFontSize = medallionSize * (compact ? 0.43 : 0.4);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: compact ? '22%' : '24%',
        background: `linear-gradient(180deg, ${palette.bgTop} 0%, ${palette.bgBottom} 100%)`,
      }}
    >
      <div
        style={absoluteBox(frameInset, frameInset, size - frameInset * 2, size - frameInset * 2, {
          borderRadius: px(size * 0.19),
          border: `${frameBorder}px solid ${palette.frame}`,
          background: compact ? 'rgba(243, 238, 230, 0.84)' : 'rgba(247, 243, 236, 0.74)',
        })}
      />
      <div
        style={absoluteBox(orbitTop, orbitLeft, orbitWidth, orbitHeight, {
          borderRadius: '999px',
          border: `${orbitBorder}px solid ${palette.orbit}`,
          opacity: 0.84,
          transform: 'rotate(-22deg)',
        })}
      />
      {!compact ? (
        <div
          style={absoluteBox(orbitTop + size * 0.012, orbitLeft + size * 0.02, orbitWidth * 0.94, orbitHeight * 0.88, {
            borderRadius: '999px',
            border: `${orbitAccentBorder}px solid ${palette.orbitAccent}`,
            opacity: 0.72,
            transform: 'rotate(17deg)',
          })}
        />
      ) : null}
      <div
        style={absoluteBox(medallionTop, medallionLeft, medallionSize, medallionSize, {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '999px',
          border: `${medallionBorder}px solid ${palette.medallionEdge}`,
          background: palette.medallion,
          color: palette.text,
          fontSize: px(ehFontSize),
          fontWeight: 700,
          fontFamily: 'serif',
          letterSpacing: px(size * -0.03),
          lineHeight: 1,
        })}
      >
        EH
      </div>
      <div
        style={absoluteBox(medallionTop + medallionSize * 0.05, medallionLeft + medallionSize * 0.83, orbitDotSize, orbitDotSize, {
          borderRadius: '999px',
          background: palette.orbitAccent,
        })}
      />
      <div
        style={absoluteBox(size * 0.18, size * 0.24, size * 0.016, size * 0.016, {
          borderRadius: '999px',
          background: palette.spark,
        })}
      />
      {!compact ? (
        <div
          style={absoluteBox(size * 0.74, size * 0.28, size * 0.012, size * 0.012, {
            borderRadius: '999px',
            background: palette.sparkMuted,
          })}
        />
      ) : null}
    </div>
  );
}
