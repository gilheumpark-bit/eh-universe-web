import fs from 'fs';
import path from 'path';

// Load the original reportArticles
const { reportArticles } = require('./src/lib/articles-reports');

const outDir = path.join(__dirname, 'src/data/reports');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let newContent = `import type { ArticleData } from "./articles";\n\n`;
let exportObj = `export const reportArticles: Record<string, ArticleData> = {\n`;

for (const key of Object.keys(reportArticles)) {
  const safeName = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeName}.json`;
  const filePath = path.join(outDir, fileName);
  
  // Write the JSON file
  fs.writeFileSync(filePath, JSON.stringify(reportArticles[key], null, 2));
  
  // Prepare new ts content
  const varName = safeName.replace(/-(.)/g, (g) => g[1].toUpperCase());
  newContent += `import ${varName}Data from "../data/reports/${fileName}";\n`;
  exportObj += `  "${key}": ${varName}Data as unknown as ArticleData,\n`;
}

exportObj += `};\n`;
newContent += `\n${exportObj}`;

fs.writeFileSync(path.join(__dirname, 'src/lib/articles-reports.ts'), newContent);
console.log('Done splitting reports.');
