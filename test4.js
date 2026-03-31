const fs = require('fs');
const path = require('path');

function getExports(fileContent) {
  const exports = [];
  const regex = /export\s+(?:function|const|class|let|var)\s+([a-zA-Z0-9_]+)/g;
  let m;
  while ((m = regex.exec(fileContent)) !== null) {
    exports.push(m[1]);
  }
  return exports;
}

function checkDir(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
  const allContents = [];
  
  function readAll(d) {
    for (const file of fs.readdirSync(d)) {
      const full = path.join(d, file);
      if (fs.statSync(full).isDirectory()) {
         if (file !== 'node_modules' && file !== '.next' && file !== '__tests__') readAll(full);
      } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
        if (!full.includes('.test.')) {
           allContents.push({ path: full, content: fs.readFileSync(full, 'utf8') });
        }
      }
    }
  }
  readAll('src');

  for (const f of files) {
    const fullPath = path.join(dir, f);
    const content = fs.readFileSync(fullPath, 'utf8');
    const exports = getExports(content);
    const name = f.replace('.tsx', '').replace('.ts', '');
    
    const defaultRegex = /export\s+default\s+(?:function|class)\s+([a-zA-Z0-9_]+)/;
    const dm = defaultRegex.exec(content);
    if (dm) exports.push(dm[1]);
    
    exports.push(name);
    
    const uniqueExports = [...new Set(exports)];
    
    let isUsed = false;
    for (const info of allContents) {
      if (info.path.replace(/\\/g, '/') === fullPath.replace(/\\/g, '/')) continue;
      
      for (const e of uniqueExports) {
        if (info.content.includes(e)) {
          isUsed = true;
          break;
        }
      }
      if (isUsed) break;
    }
    
    if (!isUsed) {
      console.log('Unused file (none of its exports found):', fullPath, 'Exports:', uniqueExports);
    }
  }
}

checkDir('src/components/code-studio');
checkDir('src/components/studio');
