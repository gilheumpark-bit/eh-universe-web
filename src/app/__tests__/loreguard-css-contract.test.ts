import { readFileSync } from "fs";
import { join } from "path";

const css = readFileSync(join(process.cwd(), "src/app/loreguard.css"), "utf8");

describe("loreguard.css product contracts", () => {
  it("keeps the desktop canvas wide while releasing width below 1180px", () => {
    expect(css).toMatch(/\.eh-app\s*\{[\s\S]*?min-width:\s*1180px;/);
    expect(css).toMatch(/@media\s*\(max-width:\s*1179\.98px\)\s*\{[\s\S]*?\.eh-app\s*\{[^}]*min-width:\s*0;/);
  });

  it("keeps reading mode visually focused on the manuscript surface", () => {
    expect(css).toContain(".eh-app .wr-read-mode .wr-production-board { display: none; }");
    expect(css).toMatch(/\.eh-app \.wr-reader-page\s*\{[\s\S]*?max-width:\s*760px;/);
    expect(css).toMatch(/\.eh-app \.wr-read-p\s*\{[\s\S]*?text-wrap:\s*pretty;/);
  });
});
