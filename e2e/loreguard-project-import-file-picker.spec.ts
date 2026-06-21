import { expect, test } from "@playwright/test";

test.describe("Loreguard project import file picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("noa-lg-onboarded", "1");
      window.localStorage.setItem("noa-lg-theme", "light");
    });
  });

  test("loads markdown files through the project-start file input and keeps them as candidates", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded", timeout: 45_000 });

    await expect(page.getByRole("heading", { name: "프로젝트 생성" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("불러오기 파일별 결과")).toHaveCount(0);

    const input = page.locator('input[type="file"][accept=".txt,.md,.json,.docx,.pdf,.epub"]');
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

    await expect(page.getByText(/1\/1개 파일에서 후보 2건을 만들었습니다\./)).toBeVisible();
    await expect(page.getByLabel("불러오기 파일별 결과")).toContainText("후보 생성");
    await expect(page.getByLabel("불러오기 파일별 결과")).toContainText("world-rights-import.md");
    await expect(page.getByLabel("불러오기 분류 요약")).toContainText("세계관 1");
    await expect(page.getByLabel("불러오기 분류 요약")).toContainText("권리/IP 메모 1");
    await expect(page.getByText("프로젝트에 채택").first()).toBeVisible();
    await expect(page.getByText("대기 중")).toHaveCount(0);
  });

  test("records unsupported files without creating import candidates", async ({ page }) => {
    await page.goto("/studio", { waitUntil: "domcontentloaded", timeout: 45_000 });

    await expect(page.getByRole("heading", { name: "프로젝트 생성" })).toBeVisible({ timeout: 30_000 });

    const input = page.locator('input[type="file"][accept=".txt,.md,.json,.docx,.pdf,.epub"]');
    await input.setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: Buffer.from("not-a-real-image", "utf8"),
    });

    await expect(page.getByText("지원 형식은 .txt, .md, .json, .docx, .pdf, .epub 입니다.")).toBeVisible();
    await expect(page.getByLabel("불러오기 파일별 결과")).toContainText("미지원");
    await expect(page.getByLabel("불러오기 파일별 결과")).toContainText("cover.png");
    await expect(page.getByText("대기 중")).toBeVisible();
  });

  test("keeps project import available inside the mobile project canvas sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio", { waitUntil: "domcontentloaded", timeout: 45_000 });

    await expect(page.getByRole("heading", { name: "프로젝트 생성" })).toBeVisible({ timeout: 30_000 });

    const openCanvas = page.getByRole("button", { name: "프로젝트 설정 캔버스 열기" });
    await expect(openCanvas).toBeVisible();
    await openCanvas.click();

    const canvasDialog = page.getByRole("dialog", { name: "프로젝트 설정 캔버스" });
    await expect(canvasDialog).toBeVisible();
    await expect(page.locator("body")).toHaveAttribute("data-lg-mobile-sheet-open", "1");

    const input = canvasDialog.locator('input[type="file"][accept=".txt,.md,.json,.docx,.pdf,.epub"]');
    await expect(input).toHaveCount(1);

    await input.setInputFiles({
      name: "mobile-world-import.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(
        [
          "# 세계관 메모",
          "세계관 배경과 역사, 세력, 국가, 문화, 금기, 마법 기술을 모바일에서 불러온다.",
        ].join("\n"),
        "utf8",
      ),
    });

    await expect(canvasDialog.getByText(/1\/1개 파일에서 후보 1건을 만들었습니다\./)).toBeVisible();
    await expect(canvasDialog.getByLabel("불러오기 파일별 결과")).toContainText("후보 생성");
    await expect(canvasDialog.getByLabel("불러오기 분류 요약")).toContainText("세계관 1");
    await expect(canvasDialog.getByText("프로젝트에 채택")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(canvasDialog).toBeHidden();
    await expect(page.locator("body")).not.toHaveAttribute("data-lg-mobile-sheet-open", "1");
  });
});
