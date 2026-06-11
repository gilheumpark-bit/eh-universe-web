// ============================================================
// 회귀 가드 — 회차 전환 시 undo 링버퍼 cross-document 오염 (wf_8af5aa6f loop2 CRITICAL)
// ------------------------------------------------------------
// 버그: 회차 A 입력 → 회차 B 전환 → (무입력) → Ctrl+Z 시 직전 회차(A) 본문이
//       현재 회차(B) 에디터에 주입됨. 원인: StudioShell setEditDraft(NEW)가 config commit
//       *다음* commit 에 발화 → reset effect 가 baseline=OLD 로 박은 뒤 NEW 도착을 watch 가
//       push → OLD 가 B 의 undo 스택에 진입.
// 수정: TabWriting.tsx suppressNextDeltaRef — 전환 후 최초 본문 변화 1건을 baseline 으로만
//       흡수(push 금지).
//
// 실행: 개발 서버(:3011) 띄운 뒤  `node scripts/regression/undo-cross-episode.e2e.mjs`
// CI: e2e 잡에서 dev/preview 서버 대상 실행. exit 1 = 회귀(오염 재발).
// ============================================================
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://localhost:3011';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 120)));

function fail(msg) {
  console.error('❌ REGRESSION: ' + msg);
  browser.close().finally(() => process.exit(1));
}

try {
  await page.goto(BASE + '/studio', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    localStorage.setItem('noa-lg-onboarded', '1');
    localStorage.setItem('noa-lg-theme', 'light');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const ck = page.locator('button', { hasText: '필수만' }).first();
  if (await ck.count()) { await ck.click().catch(() => {}); await page.waitForTimeout(300); }
  const rd = page.locator('[data-testid="recovery-dialog-backdrop"]');
  if (await rd.count()) { await page.locator('[data-testid="recovery-dialog-backdrop"] button').last().click().catch(() => {}); await page.waitForTimeout(500); }

  const names = await page.$$eval('.eh-nav .eh-tab', (e) => e.map((x) => x.textContent.trim()));
  const go = async (kw) => {
    const i = names.findIndex((t) => t.includes(kw));
    if (i < 0) return false;
    await (await page.$$('.eh-nav .eh-tab'))[i].click();
    await page.waitForTimeout(1400);
    return true;
  };

  await go('집필');
  const create = page.locator('.eh-workspace button', { hasText: /새 작품|시작/ }).first();
  if (await create.count()) { await create.click(); await page.waitForTimeout(2000); }

  const ta = () => page.locator('.eh-workspace textarea').first();
  const MARK = 'EP1-REGRESSION-MARKER-가가가';

  // 회차 1 본문 입력 + 디바운스 확정(>400ms)
  await ta().click();
  await ta().fill('회차1 ' + MARK);
  await page.waitForTimeout(900);

  // 회차 다음으로 전환
  const next = page.locator('.eh-workspace button[aria-label*="다음"], .eh-workspace button[title*="다음"]').first();
  if (!(await next.count())) fail('회차 "다음" 네비게이션 버튼을 찾지 못함 (테스트 전제 깨짐)');
  await next.click();
  await page.waitForTimeout(1600);

  // ★ B 에서 무입력 — 전환 delta 가 push 될 시간(>400ms) 충분히 대기
  await page.waitForTimeout(900);

  // 첫/둘째 Ctrl+Z — 버그면 EP1 마커가 주입됨
  await ta().click();
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500);
  const u1 = await ta().inputValue().catch(() => '?');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500);
  const u2 = await ta().inputValue().catch(() => '?');

  if (u1.includes(MARK) || u2.includes(MARK)) {
    fail(`회차 전환 후 Ctrl+Z 에 직전 회차 본문(${MARK})이 현재 회차 에디터에 주입됨 — cross-episode undo 오염 재발`);
  }
  if (pageErrors.length) {
    fail('pageerror 발생: ' + JSON.stringify([...new Set(pageErrors)].slice(0, 3)));
  }

  console.log('✅ PASS — cross-episode undo 오염 없음 (Ctrl+Z 후 직전 회차 본문 미주입)');
  await browser.close();
  process.exit(0);
} catch (e) {
  fail('예외: ' + String(e && e.message).slice(0, 160));
}
