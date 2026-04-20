#!/usr/bin/env node
/** 실제 한글 본문 출력 가능 여부 검증 — 4가지 전략 */

const URL = 'http://192.168.219.100:8001/v1/chat/completions';
const MODEL = 'qwen36';

async function ask(strategyName, payload) {
  const t0 = performance.now();
  const r = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, stream: false, temperature: 0.7, ...payload }),
  });
  const data = await r.json();
  const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
  const content = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage ?? {};
  console.log(`\n━━━ ${strategyName} (${elapsed}s, ${usage.completion_tokens} tok) ━━━`);
  console.log(content.slice(0, 500));
  if (content.length > 500) console.log(`...\n[전체 길이: ${content.length}자]`);

  // 첫 한글 문자 위치
  const firstHangul = content.search(/[\uac00-\ud7af]/);
  console.log(`\n👉 첫 한글 위치: ${firstHangul === -1 ? '없음' : firstHangul + '번째 글자'}`);
  if (firstHangul > 0) {
    console.log(`   이후 한글 샘플: "${content.slice(firstHangul, firstHangul + 200).replace(/\n/g, ' ')}"`);
  }
}

(async () => {
  // ── 전략 1: 거대 max_tokens로 thinking 끝나고 한글 나오는지 ──
  await ask('전략1: max_tokens 2000 (thinking 다 먹고 한글 나오길 기대)', {
    messages: [{ role: 'user', content: '"바람이 불었다." 다음 한 문단만 한국어로 이어 써.' }],
    max_tokens: 2000,
  });

  // ── 전략 2: assistant 메시지 prefix로 한글 강제 시작 ──
  await ask('전략2: assistant prefix 한글 강제', {
    messages: [
      { role: 'user', content: '"바람이 불었다." 다음 문장을 이어 써줘.' },
      { role: 'assistant', content: '그' },  // 한글 시작 강제
    ],
    max_tokens: 200,
  });

  // ── 전략 3: stop 토큰으로 thinking 차단 시도 ──
  await ask('전략3: stop 토큰 ["1.", "Here"]', {
    messages: [{ role: 'user', content: '한국어로만 답해. "바람이 불었다." 다음 문장.' }],
    max_tokens: 200,
    stop: ['1.', 'Here', 'Thinking', '**'],
  });

  // ── 전략 4: /no_think + chat_template_kwargs 같은 거 있나 ──
  await ask('전략4: extra_body with chat_template_kwargs', {
    messages: [
      { role: 'system', content: '/no_think' },
      { role: 'user', content: '"바람이 불었다." 다음 문장만.' }
    ],
    max_tokens: 200,
    chat_template_kwargs: { enable_thinking: false },
  });

  // ── 전략 5: completion API로 raw 시도 ──
  console.log('\n━━━ 전략5: completion API (raw) ━━━');
  try {
    const r = await fetch('http://192.168.219.100:8001/v1/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: '다음은 한국 소설 본문이다.\n\n"바람이 불었다. 그는',
        max_tokens: 150,
        temperature: 0.7,
      }),
    });
    const data = await r.json();
    console.log(data.choices?.[0]?.text ?? JSON.stringify(data).slice(0, 300));
  } catch (e) {
    console.log('에러:', e.message);
  }
})();
