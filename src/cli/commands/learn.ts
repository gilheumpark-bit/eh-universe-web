// ============================================================
// CS Quill 🦔 — cs learn command
// ============================================================
// 주니어용: 수정 이유를 쉽게 설명해줌.
// 최근 검증 결과를 가져와서 각 수정 항목을 교육적으로 해설.

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ReceiptData } from '../formatters/receipt';

// ============================================================
// PART 1 — Learn Runner
// ============================================================

export async function runLearn(topic?: string): Promise<void> {
  console.log('🦔 CS Quill — 학습 모드\n');

  // Topic-specific learning
  if (topic) {
    try {
      const { streamChat } = await import('../core/ai-bridge');
      const { getTemperature } = await import('../core/ai-config');
      console.log(`  📚 "${topic}" 학습 중...\n  `);
      await streamChat({
        systemInstruction: 'You are a friendly Korean coding mentor. Explain the given topic with examples. Use 💡 for tips. Keep it under 20 lines.',
        messages: [{ role: 'user', content: `Explain: ${topic}` }],
        onChunk: (t: string) => { process.stdout.write(t); },
        temperature: getTemperature('explain'),
      });
      console.log('\n');
      return;
    } catch {
      console.log('  ⚠️  AI 연결 실패. 최근 검증 기록 기반으로 학습합니다.\n');
    }
  }

  // Load latest receipt
  const receiptDir = join(process.cwd(), '.cs', 'receipts');
  if (!existsSync(receiptDir)) {
    console.log('  📭 검증 기록이 없습니다. cs generate 또는 cs verify 먼저 실행하세요.\n');
    return;
  }

  const files = readdirSync(receiptDir).filter(f => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) {
    console.log('  📭 영수증이 없습니다.\n');
    return;
  }

  const latest: ReceiptData = JSON.parse(readFileSync(join(receiptDir, files[0]), 'utf-8'));

  console.log(`  📄 최근 검증: ${latest.id} (${new Date(latest.timestamp).toLocaleString()})\n`);

  // Find teams with issues
  const problemTeams = latest.pipeline.teams.filter(t => t.score < 80);

  if (problemTeams.length === 0) {
    console.log('  ✅ 모든 팀 통과! 잘하고 있어요.\n');
    return;
  }

  // AI explanation for each problem team
  try {
    const { streamChat } = await import('../core/ai-bridge');

    for (const team of problemTeams) {
      console.log(`  ─── ${team.name} (${team.score}/100) ───\n`);

      const learnPrompt = `You are a friendly coding mentor. Explain this verification result to a beginner.

Team: ${team.name}
Score: ${team.score}/100
Findings: ${team.findings} issues
Blocking: ${team.blocking}

Explain:
1. What this team checks (1 sentence, simple)
2. Why it matters (real-world consequence)
3. How to fix it (practical tip)

Use Korean. Be encouraging. Use 💡 for tips. Keep it SHORT (3-5 lines per section).`;

      process.stdout.write('  ');
      await streamChat({
        systemInstruction: 'You are a friendly Korean coding mentor for beginners.',
        messages: [{ role: 'user', content: learnPrompt }],
        onChunk: (t: string) => { process.stdout.write(t); },
      });
      console.log('\n');
    }
  } catch {
    // Fallback: static explanation
    const explanations: Record<string, string> = {
      simulation: '💡 무한루프나 재귀 위험이 감지됐어요. 루프에 종료 조건이 있는지 확인하세요.',
      generation: '💡 TODO/빈함수가 남아있어요. 구현을 완성하세요.',
      validation: '💡 타입 안전이나 null 체크가 부족해요. ?. (옵셔널 체이닝)을 활용하세요.',
      'size-density': '💡 함수가 너무 길거나 복잡해요. 작은 함수로 나눠보세요.',
      'asset-trace': '💡 사용하지 않는 코드가 있어요. 정리하면 깔끔해져요.',
      stability: '💡 에러 처리가 부족해요. try-catch를 추가하세요.',
      'release-ip': '💡 보안 이슈가 감지됐어요. 하드코딩된 비밀번호/키를 환경변수로 옮기세요.',
      governance: '💡 아키텍처 규칙 위반이에요. 프로젝트 구조를 확인하세요.',
    };

    for (const team of problemTeams) {
      console.log(`  ${team.name} (${team.score}/100)`);
      console.log(`  ${explanations[team.name] ?? '💡 이 영역을 개선해보세요.'}\n`);
    }
  }
}

// IDENTITY_SEAL: PART-1 | role=learn-runner | inputs=none | outputs=console
