const fs = require("fs");
const path = require("path");

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git") {
        walk(path.join(dir, file), fileList);
      }
    } else {
      if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

const targetDir = path.join(__dirname, "apps/desktop/renderer/components/code-studio");
const tsFiles = walk(targetDir);

let markdown = "# Missing Translations Report\n\n";
markdown += "The following inline `L4` calls are missing Japanese (`ja` / `jp`) or Chinese (`zh` / `cn`) translations.\n\n";

for (const file of tsFiles) {
  const content = fs.readFileSync(file, "utf8");
  const l4Regex = /L4\([a-zA-Z]+,\s*\{([\s\S]*?)\}/g;
  let match;
  let missingInFile = [];

  while ((match = l4Regex.exec(content)) !== null) {
    const params = match[1];
    
    const hasJp = /ja\s*:|jp\s*:/.test(params);
    const hasZh = /zh\s*:|cn\s*:/.test(params);

    if (!hasJp || !hasZh) {
      const koMatch = params.match(/ko\s*:\s*(['"`])([\s\S]*?)\1/);
      const enMatch = params.match(/en\s*:\s*(['"`])([\s\S]*?)\1/);

      missingInFile.push({
        ko: koMatch ? koMatch[2] : "unknown",
        en: enMatch ? enMatch[2] : "unknown",
        missingJp: !hasJp,
        missingZh: !hasZh,
      });
    }
  }

  if (missingInFile.length > 0) {
    markdown += `### ${path.relative(__dirname, file)}\n`;
    markdown += `| Korean (ko) | English (en) | Missing JP | Missing CN |\n`;
    markdown += `|-------------|--------------|------------|------------|\n`;
    for (const item of missingInFile) {
      markdown += `| ${item.ko.replace(/\n/g, " ")} | ${item.en.replace(/\n/g, " ")} | ${item.missingJp ? "❌" : "✅"} | ${item.missingZh ? "❌" : "✅"} |\n`;
    }
    markdown += "\n";
  }
}

fs.writeFileSync(path.join(__dirname, "missing_translations_report.md"), markdown);
