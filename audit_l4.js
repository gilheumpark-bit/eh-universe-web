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

const results = [];
let totalL4s = 0;
let totalMissingJp = 0;
let totalMissingZh = 0;

for (const file of tsFiles) {
  const content = fs.readFileSync(file, "utf8");
  // Match L4(lang, { ... }) blocks coarsely
  // This regex matches L4(lang, { ... }) considering line breaks up to the closing brace.
  const l4Regex = /L4\([a-zA-Z]+,\s*\{([\s\S]*?)\}/g;
  let match;
  let missingInFile = [];

  while ((match = l4Regex.exec(content)) !== null) {
    totalL4s++;
    const params = match[1];
    
    // Check if ja: or jp: exists
    const hasJp = /ja\s*:|jp\s*:/.test(params);
    // Check if zh: or cn: exists
    const hasZh = /zh\s*:|cn\s*:/.test(params);

    if (!hasJp || !hasZh) {
      if (!hasJp) totalMissingJp++;
      if (!hasZh) totalMissingZh++;

      // Extract ko and en strings if possible for report
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
    results.push({
      file: path.relative(__dirname, file),
      missing: missingInFile,
    });
  }
}

console.log(JSON.stringify({
  totalL4s,
  totalMissingJp,
  totalMissingZh,
  filesWithMissingTranslations: results
}, null, 2));

