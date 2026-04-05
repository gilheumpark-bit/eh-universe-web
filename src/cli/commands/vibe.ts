// ============================================================
// CS Quill 🦔 — cs vibe command
// ============================================================
// 바이브코더 모드: 자연어 100%, 기술 0.
// 스펙 정리 → 확인 → 생성 → 미리보기

import { runGenerate } from './generate';

// ============================================================
// PART 1 — Vibe System Prompt
// ============================================================

const VIBE_SPEC_PROMPT = `You are a product manager for CS Quill. The user is a non-developer (vibe coder).
They will describe what they want in everyday language. Your job:

1. Extract concrete features from their description
2. Present them as a simple checklist (emoji + short description)
3. Suggest a tech stack based on the project context
4. Output JSON:

{
  "features": ["📸 Photo upload", "❤️ Likes + comments", "👤 Profile page"],
  "techStack": "Next.js + TypeScript + Tailwind",
  "estimatedFiles": 5,
  "prompt": "Create a photo sharing app with: upload, likes, comments, profile, mobile responsive"
}

Keep it SIMPLE. No jargon. The user doesn't know what an API is.`;

// IDENTITY_SEAL: PART-1 | role=vibe-prompt | inputs=none | outputs=VIBE_SPEC_PROMPT

// ============================================================
// PART 2 — Vibe Runner
// ============================================================

export async function runVibe(prompt: string): Promise<void> {
  console.log('🦔 CS Quill — 바이브 모드 ✨\n');

  // Step 1: Parse vibe into spec
  console.log('  뭘 만들지 정리할게요...\n');

  let specRaw = '';
  try {
    const { streamChat } = await import('@/lib/ai-providers');
    await streamChat({
      systemInstruction: VIBE_SPEC_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      onChunk: (t: string) => { specRaw += t; },
    });
  } catch {
    console.log('  ⚠️  AI 연결 실패. 직접 생성으로 전환합니다.\n');
    await runGenerate(prompt, { mode: 'full', structure: 'auto' });
    return;
  }

  // Parse spec
  let spec: { features: string[]; techStack: string; estimatedFiles: number; prompt: string };
  try {
    const jsonMatch = specRaw.match(/\{[\s\S]*\}/);
    spec = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    spec = null as never;
  }

  if (!spec) {
    // Fallback: use original prompt directly
    console.log('  스펙 정리를 건너뛰고 바로 만들게요.\n');
    await runGenerate(prompt, { mode: 'full', structure: 'auto' });
    return;
  }

  // Show spec
  console.log('  ┌──────────────────────────────────┐');
  for (const feature of spec.features) {
    console.log(`  │ ${feature.padEnd(34)}│`);
  }
  console.log('  └──────────────────────────────────┘');
  console.log(`\n  🛠️  ${spec.techStack}`);
  console.log(`  📁 약 ${spec.estimatedFiles}개 파일\n`);

  // Step 2: Generate (delegates to cs generate)
  console.log('  🦔 만드는 중... ☕ 잠깐 쉬세요\n');

  await runGenerate(spec.prompt, {
    mode: 'full',
    structure: 'auto',
  });
}

// IDENTITY_SEAL: PART-2 | role=vibe-runner | inputs=prompt | outputs=generated-code
