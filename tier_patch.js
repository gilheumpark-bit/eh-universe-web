const fs = require('fs');

const path = 'src/app/api/chat/route.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Definition and resolveAuth signature change
content = content.replace(
  'function resolveAuth(provider: ServerProviderId, clientKey: string | undefined, ip: string, requestId: string): { ok: true; auth: ResolvedAuth } | { ok: false; response: NextResponse } {',
  `export type UserTier = 'none' | 'free' | 'pro';

/** Auth gate: handle user tiers, reject unauthenticated users without BYOK */
function resolveAuth(provider: ServerProviderId, clientKey: string | undefined, ip: string, requestId: string, userTier: UserTier): { ok: true; auth: ResolvedAuth } | { ok: false; response: NextResponse } {
  const userApiKey = normalizeUserApiKey(clientKey);
  const isByok = userApiKey.length > 0;

  // 비로그인은 수동 모드(BYOK)만 허용
  if (userTier === 'none' && !isByok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '비로그인 사용자는 개인 API 키(수동 모드)를 설정해야 사용할 수 있습니다. 로그인 후 기본 무료 할당량을 이용하세요.', requestId },
        { status: 401 }
      )
    };
  }

  // 프로 티어 로직 설계 (현재 락 상태)
  if (userTier === 'pro') {
    // TODO: 무제한 토큰, NOA 검사 완화 등 프로 혜택 적용 대상. 현재 설계 완료 후 락(Lock)
  }

  const hostedGeminiEnabled = provider === 'gemini' && hasServerProviderCredentials('gemini');`
);

// Remove the old hostedGeminiEnabled line that was inside the original function
content = content.replace(
  /\n\s*const userApiKey = normalizeUserApiKey\(clientKey\);\n\s*const isByok = userApiKey\.length > 0;\n\s*const hostedGeminiEnabled = provider === 'gemini' && hasServerProviderCredentials\('gemini'\);\n\n\s*if \(provider === 'gemini'\) {/,
  `\n\n  if (provider === 'gemini') {`
);


// 2. Change token budget limit handling by skipping it for pro Tier in theory (but pro is locked)
content = content.replace(
  'const budget = checkTokenBudget(ip, false);',
  'const budget = userTier === \'pro\' ? { allowed: true, remaining: Infinity } : checkTokenBudget(ip, false);'
);
content = content.replace(
  'const budget = checkTokenBudget(ip, isByok);',
  'const budget = (userTier === \'pro\' || isByok) ? { allowed: true, remaining: Infinity } : checkTokenBudget(ip, false);'
);

// 3. Inject UserTier extraction in POST handler
content = content.replace(
  'const authResult = resolveAuth(provider, clientKey, ip, requestId);',
  `    // TODO: Connect with actual Client Auth headers later.
    let userTier: UserTier = 'none';
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      userTier = token === 'PRO_LOCKED' ? 'pro' : 'free'; // 로그인 기본(free), 프로는 예약(lock)
    }

    const authResult = resolveAuth(provider, clientKey, ip, requestId, userTier);`
);

// 4. Update NOA tier scanning rules based on UserTier logic (bonus implementation)
content = content.replace(
  'sourceTier: auth.isByok ? 3 : 2, // BYOK는 외부 출처로 간주하여 감시 강화',
  `sourceTier: userTier === 'pro' ? 1 : (auth.isByok ? 3 : 2), // 프로는 내부 1등급 완화 보호, 기본 로그인은 2, 비로그인(BYOK)은 제일 빡빡한 3등급`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Tier Architecture applied successfully.');
