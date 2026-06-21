let cpAlertAt = 0;

function surfaceCpLogFailure(): void {
  const now = Date.now();
  if (now - cpAlertAt < 60_000) return;
  cpAlertAt = now;
  try {
    window.dispatchEvent(
      new CustomEvent("noa:alert", {
        detail: { message: "창작 과정 기록 실패 — 확인서 정확도에 영향", variant: "warning" },
      }),
    );
  } catch {
    /* noop */
  }
}

export function fireCpLog(promise: Promise<string | null> | null | undefined): void {
  if (!promise) {
    surfaceCpLogFailure();
    return;
  }
  promise.then((id) => {
    if (id === null) surfaceCpLogFailure();
  }).catch(() => surfaceCpLogFailure());
}

export const getCreativeLogger = () =>
  typeof window !== "undefined" ? window.__creativeLogger ?? null : null;
