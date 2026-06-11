export const meta = {
  name: 'fixW1-security-payment-cert',
  description: 'Wave1: noa Trinity VETO·SSRF·complete auth·share·stripe x2·cert collection/HMAC/serial·a11y — 검증 2루프',
  phases: [
    { title: 'Implement', detail: '6 구현 (파일 비중첩)' },
    { title: 'Loop1', detail: '독립 리뷰 + 판독 + 수리' },
    { title: 'Loop2', detail: '전수 재검 + 최종 판독 + 수리' },
  ],
}

const APP = 'C:/Users/sung4/OneDrive/바탕 화면/EH/eh-universe-web'

const P = [
  '[4원칙] 적합성/동작정확성(빈값·실패·동시성 엣지)/안전성(인젝션·시크릿·권한·SSRF)/회귀방지(tsc·eslint·jest green 유지).',
  '[구현 규칙] 코드 수정만·범위 외 리팩터링 금지. 마지막 메시지 텍스트로만: 변경 파일+1줄 이유+실행 명령+gaps(미고지 금지). 스펙의 파일/라인 바로 READ 후 수정.',
  '[공통] 보안 수정은 우회 경로 전수 차단·fail-secure·기존 정상 흐름 보존·테스트 추가(가능 시).',
].join('\n')

const RV = {
  type: 'object', additionalProperties: false,
  properties: {
    task: { type: 'string' },
    must_fix: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      file_line: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' },
    }, required: ['severity', 'file_line', 'problem', 'fix'] } },
    checks_passed: { type: 'array', items: { type: 'string' } },
  },
  required: ['task', 'must_fix', 'checks_passed'],
}
const AB = {
  type: 'object', additionalProperties: false,
  properties: { verdicts: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    task: { type: 'string' }, verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, fail_items: { type: 'array', items: { type: 'string' } },
  }, required: ['task', 'verdict', 'fail_items'] } } },
  required: ['verdicts'],
}

const TASKS = [
  { name: 'W1-noa', spec: [
    'SOLE OWNER: src/lib/noa/index.ts + src/lib/noa/judgment/index.ts (+ trinity/config READ).',
    '(critical #2) Trinity VETO 무시: runNoa(index.ts:265 부근)가 trinity.finalVote 를 읽지 않고 allowed=tactical.selectedPath!==BLOCK 로만 결정 → 도메인(creative ×0.1)/출처(tier1 ×0.3) 배수로 깎여 인젝션 통과. 수정: runNoa 에서 trinity.finalVote==="VETO" 면 도메인/출처 배수 무관 강제 BLOCK(allowed=false·tactical override). 보안 신호는 가용성 배수로 완화 불가하도록 하드 경로.',
    '(high #10) sourceTier 완화 배수가 인젝션 신호까지 곱함: judgment 에서 보안성 신호(Trinity VETO·prompt injection·SQL/RCE 패턴 가산)는 sourceTier/domain 완화 배수 미적용 하드 가산으로 분리, 출처/도메인 배수는 사실성/할루 리스크에만. 기존 점수 흐름 보존·과차단 주의(정당 창작 호러/성인 묘사는 PRISM 등급 연동 유지).',
    '테스트: tier1/creative 경로에서 인젝션 입력이 BLOCK 되는지 단위 테스트 추가.',
  ].join('\n') },
  { name: 'W1-ssrf', spec: [
    'SOLE OWNER: src/lib/fetch-url-guard.ts + src/app/api/fetch-url/route.ts.',
    '(critical #5) SSRF IPv6 우회: assertUrlAllowedForFetch 가 IPv4 리터럴·[::1] 만 차단, ULA([fc00::1]·[fd00::2])·IPv4-mapped([::ffff:127.0.0.1]) 통과. validatePostFetchUrl ^fc00:/^fe80: 도 hostname 이 대괄호 보존해 미매치. 또 사후검증이 fetch 後 실행돼 SSRF 이미 발생.',
    '수정: 호스트 정규화(대괄호 제거) 후 사전(fetch 전) 검증으로 차단 — fc00::/7·fe80::/10·::1·::ffff:0:0/96(IPv4-mapped)·화이트리스트 외 모든 IPv6 리터럴 거부. validatePostFetchUrl 도 동일 정규화. DNS rebinding 대비 가능 시 resolved IP 재검(범위 내). 정상 외부 URL 흐름 보존.',
    '테스트: http://[fc00::1]/·[::ffff:127.0.0.1]·[::1] 차단, 정상 https 통과 단위 테스트.',
  ].join('\n') },
  { name: 'W1-complete-share', spec: [
    'SOLE OWNER: src/app/api/complete/route.ts + src/app/api/share/route.ts.',
    '(high #17) /api/complete 인증 우회: body.apiKey 가 정규식(/^sk-|AIza|gsk_/)에 맞으면 firebaseVerified 없이 통과(L72)하나 그 키는 인증용일 뿐 생성엔 서버 env 키 사용(L160) → 가짜 키로 호스팅 크레딧 무제한 소모. 수정: BYOK 경로면 클라 키를 실제 생성에 전달(resolveServerProviderKey 에 byokKey 인자)해 공격자 자기 키로 과금되게 하거나, hosted 경로는 firebaseVerified 필수. chat/structured-generate 와 동일 정책.',
    '(high #18) /api/share 100개 list 선형스캔: fetchFromFirestore 가 firestoreListDocuments(pageSize:100) 앞쪽 100개만 스캔 → shares 100 초과 시 비결정 404. 수정: firestoreGetDocument(PROJECT_ID, `shares/${id}`) 단건 조회로 교체(firestore-service-rest.ts:35 존재), POST persistToFirestore 도 documentId=id 고정.',
  ].join('\n') },
  { name: 'W1-stripe', spec: [
    'SOLE OWNER: src/app/api/stripe/webhook/route.ts.',
    '(high #13) checkout.session.completed 가 payment_status 검사 없이 client_reference_id 만으로 pro 부여(L228) → unpaid/pending 세션도 pro. 수정: applyStripeRoleClaim(uid,"set") 전 session.payment_status==="paid"(필요시 session.status==="complete") 가드. unpaid/no_payment_required/pending 보류, invoice.paid 또는 subscription status active/trialing 에서만 set.',
    '(high #14) charge.refunded 가 부분환불에도 무조건 pro 제거(L244) → 소액 부분환불로 정당 구독 강등. 수정: charge.amount_refunded >= charge.amount(전액)일 때만 clear, 부분환불은 로그만·권한 유지. 더 견고: 강등을 customer.subscription.deleted/updated(status) 단일 소스로.',
    '기존 웹훅 서명검증·event.id 멱등성 보존. 테스트: unpaid 세션 미부여·부분환불 미강등 단위 테스트.',
  ].join('\n') },
  { name: 'W1-cert', spec: [
    'SOLE OWNER: src/app/api/cp/register/route.ts + src/app/api/cp/verify/[id]/route.ts + src/lib/creative-process/registry-contract.ts + src/lib/creative-process/seal-issuer.ts + firestore.rules(certificates/registry 규칙).',
    '(critical #4) register 가 "certificates" collection write, verify 는 CP_REGISTRY_COLLECTION="cp_cert_registry" read → 등록한 확인서가 항상 cert_not_registered. 수정: 단일 collection 통일(register 의 "certificates" 리터럴을 CP_REGISTRY_COLLECTION 으로 교체) + firestore.rules 정렬. 왕복 통합 테스트 추가.',
    '(high #15) HMAC 필드/payload 이중 불일치: register 는 registrySignature 필드 + 10필드 canonical, verify 는 entry.hmac(미존재) + 4필드 payload → 변조검출 항상 실패/미작동. 수정: register·verify 가 동일 함수·필드("hmac" 또는 "registrySignature" 택1)·동일 payload(uid/visibility/issuerType 포함 확장) 사용. parseRegistryDocument 필드명 정렬. 왕복 테스트.',
    '(high #16) seal serial race: getNextMonthlySerial 이 readonly getAll+max+1, unique 제약 없어 동시 발급 시 동일 LG-{YY}{MM}-{serial}. 수정: 월별 발급을 readwrite 트랜잭션 원자화 또는 promise 큐 직렬화, 가능 시 sealNumber unique 인덱스. 허위 주석(15,18 "IDB unique 강제") 실제 동작에 맞게 수정.',
    '시크릿(HMAC secret) 서버 env 유지·노출 금지.',
  ].join('\n') },
  { name: 'W1-a11y', spec: [
    'SOLE OWNER: src/components/loreguard/LoreguardStudio.tsx (Settings slide-over 영역만).',
    '(high #19) Settings slide-over 가 role=dialog aria-modal=true 인데 useFocusTrap·useBodyScrollLock·초기 포커스·언마운트 복원 전무(8 모달 중 유일 누락). 형제 패널(RevisionPanel 등) 패턴 미러: const settingsRef=useRef(null); useFocusTrap(settingsRef, showSettings); useBodyScrollLock(showSettings); dialog div 에 ref 부착. 기존 훅 재사용·Tab 트래핑·초기 포커스·복원 확보. 기존 닫기/Escape 동작 보존.',
  ].join('\n') },
]

phase('Implement')
const impls = await parallel(TASKS.map((t) => () =>
  agent(P + '\n\nIMPLEMENT (' + t.name + ') in ' + APP + ':\n' + t.spec, { label: 'impl:' + t.name, phase: 'Implement' })))

const RB = [
  '[독립 리뷰어 — JSON only·자기점검 금지] 초급: 문법/타입/널/예외. 중급: 기존 동작 파손·에러 일관성·계약 영향. 고급: 보안(우회 경로 잔존=critical·시크릿·권한)·운영성·유지보수.',
  '무조건5: 보안 스캔·로직 에러·tsc/eslint/jest 실측·diff 영향도·(승인은 판독자).',
  '특별: 보안 수정의 우회 경로 잔존=critical(직접 재현 시도)·결제 가드가 정상결제 막음=high·cert collection/HMAC 여전히 불일치=high·focus trap 미작동=high·과차단(정당 입력 BLOCK)=high·보고-실제 diff 불일치=high.',
].join('\n')
const review = (ctx, t, tag) => agent(RB + '\n\n[' + tag + ']\nSPEC:\n' + t.spec + '\n\n구현:\n' + ctx + '\n\n' + APP + ' git diff 확정+정독+tsc/eslint/jest 실측+우회 재현 시도. JSON only.',
  { label: tag + ':' + t.name, phase: tag === 'loop1' ? 'Loop1' : 'Loop2', schema: RV, model: 'opus' })

phase('Loop1')
const r1 = await parallel(impls.map((im, i) => () => (im ? review(String(im).slice(0, 2400), TASKS[i], 'loop1') : Promise.resolve(null))))
const a1 = await agent('[통합판독자·루프1] high/critical 존재만. PASS/FAIL(task에 W1-* 이름).\n\n' + JSON.stringify(r1.filter(Boolean)), { label: 'arb1', phase: 'Loop1', schema: AB, model: 'opus' })
const f1 = (a1.verdicts || []).filter((v) => v.verdict === 'FAIL')
const rep1 = await parallel(f1.map((f) => () => { const t = TASKS.find((x) => f.task.indexOf(x.name) >= 0) || { name: f.task, spec: '' }; return agent(P + '\n\nREPAIR ONLY for ' + t.name + ':\n' + JSON.stringify(f.fail_items) + '\n\n원 스펙:\n' + t.spec, { label: 'rep1:' + t.name, phase: 'Loop1' }) }))

phase('Loop2')
const r2 = await parallel(TASKS.map((t, i) => () => { const base = impls[i]; if (!base) return Promise.resolve(null); const ri = f1.findIndex((f) => f.task.indexOf(t.name) >= 0); const ctx = ri >= 0 && rep1[ri] ? String(base).slice(0, 1100) + '\n[수리1]\n' + String(rep1[ri]).slice(0, 1100) : String(base).slice(0, 2400); return review(ctx, t, 'loop2') }))
const a2 = await agent('[통합판독자·루프2 전수재검] high/critical 존재만.\n\n' + JSON.stringify(r2.filter(Boolean)), { label: 'arb2', phase: 'Loop2', schema: AB, model: 'opus' })
const f2 = (a2.verdicts || []).filter((v) => v.verdict === 'FAIL')
const rep2 = await parallel(f2.map((f) => () => { const t = TASKS.find((x) => f.task.indexOf(x.name) >= 0) || { name: f.task, spec: '' }; return agent(P + '\n\nREPAIR ONLY for ' + t.name + ':\n' + JSON.stringify(f.fail_items) + '\n\n원 스펙:\n' + t.spec, { label: 'rep2:' + t.name, phase: 'Loop2' }) }))
let af = a2
if (f2.length > 0) {
  const rr = await parallel(f2.map((f, i) => () => { if (!rep2[i]) return Promise.resolve(null); const t = TASKS.find((x) => f.task.indexOf(x.name) >= 0) || { name: f.task, spec: '' }; return review('[수리2]\n' + String(rep2[i]).slice(0, 2400), t, 'loop2') }))
  af = await agent('[통합판독자·최종] 수리2 후 high/critical 잔존만.\n' + JSON.stringify(rr.filter(Boolean)), { label: 'arbF', phase: 'Loop2', schema: AB, model: 'opus' })
}
return { loop1: { repaired: f1.length }, loop2: { repaired: f2.length }, final: af }
