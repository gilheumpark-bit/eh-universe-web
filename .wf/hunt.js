export const meta = {
  name: 'appwide-high-critical-hunt',
  description: '앱 전역 high/critical 전수 사냥 — 9 서브시스템 독립 적대 리뷰 + 무조건5 + 보안스캔 → 통합판독자',
  phases: [
    { title: 'Hunt', detail: '9 독립 적대 리뷰어 (서브시스템별·게이트 실행·증거 기반)' },
    { title: 'Arbitrate', detail: '통합판독자 — high/critical dedup·랭크' },
  ],
}

const APP = 'C:/Users/sung4/OneDrive/바탕 화면/EH/eh-universe-web'

const RULES = [
  '[4원칙] 적합성/동작정확성(빈값·0·실패·동시성·타임아웃)/안전성(인젝션·시크릿·권한)/회귀방지.',
  '[무조건5] 보안스캔(hardcode 키·eval/exec·shell 주입·dangerouslySetInnerHTML)·로직에러(분기·오프바이원·상태전이)·테스트/린트/타입 회귀(직접 실행)·git diff 영향도·독립(자기점검 금지).',
  '적대적: 데이터 유실/오염·권한 우회·인젝션·경합·상태 전이 결함을 적극 유도해 찾아라. high/critical 만 보고(medium/low 는 notes). 모든 finding 에 file:line 증거 — 추측/취향 금지. 증거 없으면 보고 X.',
].join('\n')

const S = {
  type: 'object', additionalProperties: false,
  properties: {
    subsystem: { type: 'string' },
    high_critical: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['critical', 'high'] },
          category: { type: 'string' },
          file_line: { type: 'string' },
          problem: { type: 'string' },
          repro_or_evidence: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'category', 'file_line', 'problem', 'repro_or_evidence', 'fix'],
      },
    },
    gates_run: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['subsystem', 'high_critical', 'gates_run', 'notes'],
}

phase('Hunt')

const subs = [
  { k: 'translate', b: '번역 파이프라인: TabTranslate.tsx·lib/translation/(dual-pipeline·ncg-nct·source-integrity·author-signoff·glossary)·persistTranslations·restore. 데이터 유실/오염·회차 매핑·사인오프 무결성·고아 데이터·번역 경합 집중.' },
  { k: 'writing', b: '집필: TabWriting.tsx·useStudioAI·engine/pipeline.ts·StudioShell editDraft persistence·useProjectManager.setConfig(stale-closure)·자동저장 경합·회차/세션 전환 데이터 유실·undo 링버퍼.' },
  { k: 'world-char-plot', b: '세계관/캐릭터/플롯/연출: TabWorld·TabCharacter·TabPlot·TabDirection·studio-types StoryConfig·setConfig 경쟁·AI 컨텍스트 주입·V2 TaggedValue unwrap·orphan 필드.' },
  { k: 'ai-gates', b: 'AI 보안 게이트: lib/noa/(runNoa·server-gate·block-policy·trinity·judgment·audit chain)·applyNoaGate 전 경로 강제·차단 우회·시크릿·프롬프트 인젝션·필터 우회·fail-open 위험.' },
  { k: 'save-engine', b: '저장 엔진: lib/save-engine/(indexeddb-adapter·recovery·beacon·firestore-mirror·tab-sync)·useRecovery·multi-tab 경합·QuotaExceeded·데이터 손상/격리·복구 무결성.' },
  { k: 'payments', b: '결제: api/checkout·api/stripe/webhook·firebase-id-token stripeRole·웹훅 서명·멱등성·권한 상승·시크릿·실패 전파.' },
  { k: 'cert-cp', b: '확인서/IP: lib/creative-process/(event-recorder·chain-verify·github-mirror·seal-issuer)·api/cp/register·api/cp/verify·firestore.rules certificates·해시체인 위변조·PAT 노출·rules 우회·opt-in.' },
  { k: 'api-routes', b: 'API 라우트 전반: api/(chat·complete·structured-generate·translate·image-gen·analyze-chapter·gemini-structured·fetch-url·share·csrf)·인증/인가·rate-limit·입력검증·SSRF·시크릿 노출·CSRF.' },
  { k: 'frontend-a11y', b: '프론트/접근성/반응형: loreguard 패널 전반·globals.css/loreguard.css·a11y(포커스 트랩·aria·대비)·반응형 clipping·다국어 길이·디자인 토큰·사용자 흐름 단절·상태 피드백.' },
]

const hunts = await parallel(subs.map((x) => () =>
  agent(
    RULES + '\n\n대상 서브시스템 [' + x.k + '] in ' + APP + ':\n' + x.b +
      '\n\n실제 파일 grep/read 로 적대적 분석 + 관련 tsc/eslint/jest 직접 실행(gates_run 에 기록). high/critical 만(증거 file:line 필수). JSON only.',
    { label: 'hunt:' + x.k, phase: 'Hunt', schema: S, model: 'opus', agentType: 'Explore' }
  )))

const ok = hunts.filter(Boolean)

phase('Arbitrate')

const ARB = {
  type: 'object', additionalProperties: false,
  properties: {
    confirmed_high_critical: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['critical', 'high'] },
          subsystem: { type: 'string' },
          file_line: { type: 'string' },
          problem: { type: 'string' },
          fix: { type: 'string' },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
        },
        required: ['severity', 'subsystem', 'file_line', 'problem', 'fix', 'effort'],
      },
    },
    verdict: { type: 'string', enum: ['CLEAN', 'FIXES_NEEDED'] },
    dropped_as_noise: { type: 'array', items: { type: 'string' } },
    coverage_statement: { type: 'string' },
  },
  required: ['confirmed_high_critical', 'verdict', 'dropped_as_noise', 'coverage_statement'],
}

const arb = await agent(
  '[통합판독자] 9 서브시스템 적대 사냥의 high/critical 을 dedup·검증·랭크. 증거(file_line) 없거나 추측·취향·가정형(미래에 X하면)·이미 정상 동작인 것은 dropped_as_noise 로 기각(정직·인플레이션 차단). confirmed_high_critical = 실제 코드 결함으로 확정된 high/critical 만. verdict=CLEAN 이면 0건. coverage_statement = 정직한 커버리지(전수 vs 샘플·미커버 영역). 사냥 결과:\n\n' +
    ok.map((r) => '### ' + r.subsystem + '\nHC: ' + JSON.stringify(r.high_critical) + '\ngates:' + JSON.stringify(r.gates_run) + '\nnotes:' + JSON.stringify(r.notes)).join('\n\n'),
  { label: 'arbiter', phase: 'Arbitrate', schema: ARB, model: 'opus' }
)

return { hunt_counts: ok.map((r) => ({ s: r.subsystem, hc: r.high_critical.length })), arbiter: arb }
