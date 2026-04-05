// ============================================================
// CS Quill 🦔 — cs explain command
// ============================================================
// 기존 코드를 PART별로 분석 + 쉬운 해설.

import { readFileSync, statSync } from 'fs';

// ============================================================
// PART 1 — Explain System Prompt
// ============================================================

const EXPLAIN_SYSTEM_PROMPT = `You are CS Quill's code explainer. Analyze the given code and explain it in simple terms.

FORMAT:
1. One-line summary of what the file does.
2. Break down by logical sections (if PART/SEAL comments exist, use those).
3. For each section:
   - Line range
   - What it does (simple language, no jargon)
   - 💡 Key insight or gotcha
4. End with overall assessment (complexity, quality, potential issues).

Adapt language to the user's detected language (Korean if code has Korean comments, else English).
Keep explanations SHORT. No walls of text.`;

// IDENTITY_SEAL: PART-1 | role=explain-prompt | inputs=none | outputs=EXPLAIN_SYSTEM_PROMPT

// ============================================================
// PART 2 — Explain Runner
// ============================================================

export async function runExplain(path: string): Promise<void> {
  console.log('🦔 CS Quill — 코드 해설\n');

  const stat = statSync(path);
  if (!stat.isFile()) {
    console.log('  ⚠️  파일을 지정하세요.');
    console.log('  예: cs explain ./src/auth.ts');
    return;
  }

  const code = readFileSync(path, 'utf-8');
  const lines = code.split('\n').length;
  console.log(`  📄 ${path} (${lines}줄)\n`);

  // Check for PART/SEAL structure
  const partCount = (code.match(/\/\/ PART \d|IDENTITY_SEAL/g) ?? []).length / 2;
  if (partCount > 0) {
    console.log(`  📐 PART 구조 감지: ${Math.ceil(partCount)}개 PART\n`);
  }

  // AI explanation
  try {
    const { streamChat } = await import('../core/ai-bridge');

    process.stdout.write('  ');
    await streamChat({
      systemInstruction: EXPLAIN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Explain this code:\n\n\`\`\`\n${code.slice(0, 8000)}\n\`\`\`` }],
      onChunk: (t: string) => { process.stdout.write(t); },
    });
    console.log('\n');
  } catch {
    console.log('  ⚠️  AI 해설 불가 (API 키 없음). 정적 분석만 표시:\n');

    // Fallback: static analysis summary
    const imports = (code.match(/^import /gm) ?? []).length;
    const functions = (code.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>)/g) ?? []).length;
    const exports = (code.match(/^export /gm) ?? []).length;
    const todos = (code.match(/TODO|FIXME|HACK/g) ?? []).length;

    console.log(`  📦 Import: ${imports}개`);
    console.log(`  📝 함수: ${functions}개`);
    console.log(`  📤 Export: ${exports}개`);
    if (todos > 0) console.log(`  ⚠️  TODO/FIXME: ${todos}개`);
    console.log('');
  }
}

// IDENTITY_SEAL: PART-2 | role=explain-runner | inputs=path | outputs=console
