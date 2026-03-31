const fs = require("fs");
const file = fs.readFileSync("src/components/code-studio/CodeStudioPanelManager.tsx", "utf8");
const idx = file.indexOf("          } : null}");
console.log("Index 1:", idx);
console.log(file.substr(idx, 100));
const expected = "          } : null}\r\n        />";
console.log("Equal?", file.substr(idx, expected.length) === expected);

const patched = file.substr(0, idx) + 
`          } : null}
          files={Object.entries(stagedFiles || {}).map(([name]) => ({
            name,
            status: "pending",
            comments: [],
            findings: [{ severity: "info", message: "Self-repair fix staged for review", source: "pipeline", line: 0 }] as any
          }))}
          onApproveFile={onApproveFile}
          onRejectFile={onRejectFile}
        />` + file.substr(idx + expected.length);

fs.writeFileSync("src/components/code-studio/CodeStudioPanelManager.tsx", patched, "utf8");
console.log("Patched!");
