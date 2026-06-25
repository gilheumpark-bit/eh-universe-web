import { expect, test } from "@playwright/test";

test.describe("Loreguard project import file picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("noa-lg-onboarded", "1");
      window.localStorage.setItem("noa-lg-theme", "light");
      window.localStorage.setItem("eh-lang", "ko");
      window.localStorage.setItem("noa_studio_lang", "KO");
      document.cookie = "eh-lang=ko; path=/; SameSite=Lax";
    });
  });

  test("loads markdown files through the project-start file input and keeps them as candidates", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded", timeout: 45_000 });

    await expect(page.getByRole("heading", { name: "작품의 기준선 만들기" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("파일별 읽기 결과")).toHaveCount(0);

    await page.getByRole("button", { name: "파일 가져오기" }).click();
    await expect(page.getByRole("dialog", { name: "읽은 자료 검토" })).toBeVisible();

    const input = page.locator('input[type="file"][accept=".txt,.md,.json,.docx,.hwpx,.pdf,.epub"]');
    await expect(input).toHaveCount(1);

    await input.setInputFiles({
      name: "world-rights-import.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(
        [
          "# 세계관 설정",
          "세계관 배경, 역사, 세력, 국가, 마법 기술, 금기를 정리한다.",
          "",
          "# 권리 IP 메모",
          "원작자, 공동저작, 외부자료 출처, 상업 이용, 상표 위험을 확인한다.",
        ].join("\n"),
        "utf8",
      ),
    });

    await expect(page.getByText(/1\/1개 파일에서 반영할 자료 2건을 분류했습니다\./)).toBeVisible();
    await expect(page.getByLabel("파일별 읽기 결과")).toContainText("자료 분류");
    await expect(page.getByLabel("파일별 읽기 결과")).toContainText("world-rights-import.md");
    await expect(page.getByLabel("읽은 자료 분류 요약")).toContainText("세계관 1");
    await expect(page.getByLabel("읽은 자료 분류 요약")).toContainText("권리/IP 메모 1");
    await expect(page.getByText("작품 기준에 반영").first()).toBeVisible();
    await expect(page.getByText("대기 중")).toHaveCount(0);
  });

  test("records unsupported files without creating import candidates", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded", timeout: 45_000 });

    await expect(page.getByRole("heading", { name: "작품의 기준선 만들기" })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "파일 가져오기" }).click();
    await expect(page.getByRole("dialog", { name: "읽은 자료 검토" })).toBeVisible();

    const input = page.locator('input[type="file"][accept=".txt,.md,.json,.docx,.hwpx,.pdf,.epub"]');
    await input.setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: Buffer.from("not-a-real-image", "utf8"),
    });

    await expect(page.getByText("지원 형식은 .txt, .md, .json, .docx, .hwpx, .pdf, .epub 입니다.")).toBeVisible();
    await expect(page.getByLabel("파일별 읽기 결과")).toContainText("미지원");
    await expect(page.getByLabel("파일별 읽기 결과")).toContainText("cover.png");
    await expect(page.getByText("자료를 기다리는 중")).toBeVisible();
  });

  test("keeps mobile on sketch capture and points the author back to the PC workspace", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio", { waitUntil: "domcontentloaded", timeout: 45_000 });

    await expect(page.getByRole("heading", { name: "로어가드 · 모바일 스케치" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "세계관 메모" })).toBeVisible();
    await expect(page.getByRole("button", { name: "PC 데스크톱 모드 전환" })).toBeVisible();
    await expect(page.locator('input[type="file"][accept=".txt,.md,.json,.docx,.hwpx,.pdf,.epub"]')).toHaveCount(0);
  });
});
