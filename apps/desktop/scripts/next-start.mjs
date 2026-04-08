import { spawn } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const rendererDir = args[0] ?? "renderer";
const port = process.env.PORT?.trim() || "8888";

const nextBinName = process.platform === "win32" ? "next.cmd" : "next";
const nextBinPath = path.join(process.cwd(), "node_modules", ".bin", nextBinName);
const child =
  process.platform === "win32"
    ? spawn(`"${nextBinPath}" start -p ${port} ${rendererDir}`, {
        stdio: "inherit",
        shell: true,
      })
    : spawn(nextBinPath, ["start", "-p", port, rendererDir], { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

