import { expect, test } from "@playwright/test";

/**
 * HTTP 메서드 제약: 본문 없이 잘못된 메서드만 호출 (상태 변이·과금 없음).
 * Next App Router는 미구현 메서드에 대해 405를 반환하는 것이 일반적이다.
 */
test.describe("API method guards (no side effects)", () => {
  test("POST /api/health is not allowed (GET-only)", async ({ request }) => {
    const res = await request.post("/api/health", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(405);
  });

  test("GET /api/chat is not allowed (POST-only)", async ({ request }) => {
    const res = await request.get("/api/chat");
    expect(res.status()).toBe(405);
  });

  test("POST /api/ai-capabilities is not allowed (GET-only)", async ({ request }) => {
    const res = await request.post("/api/ai-capabilities", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(405);
  });

  test("DELETE /api/agent-search/status is not allowed", async ({ request }) => {
    const res = await request.fetch("/api/agent-search/status", { method: "DELETE" });
    expect(res.status()).toBe(405);
  });
});
