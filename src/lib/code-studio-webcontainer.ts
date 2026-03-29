/**
 * code-studio-webcontainer.ts
 * WebContainer wrapper with graceful simulation fallback.
 * Dynamically imports @webcontainer/api when available;
 * otherwise provides an in-memory simulation for common operations.
 */

// ============================================================
// PART 1 — Public Interface & Factory
// ============================================================

export interface WebContainerInstance {
  /** true if backed by a real WebContainer, false if simulated */
  isAvailable: boolean;
  /** Run a shell command and return output */
  run(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  /** Write a file to the virtual filesystem */
  writeFile(path: string, content: string): Promise<void>;
  /** Read a file from the virtual filesystem */
  readFile(path: string): Promise<string>;
  /** Install npm dependencies */
  installDependencies(): Promise<void>;
  /** Start a dev server on the given port, returns preview URL */
  startDevServer(port: number): Promise<string>;
  /** Tear down the container */
  dispose(): void;
}

/**
 * Boot a WebContainer if the API is available,
 * otherwise fall back to a simulated environment.
 */
export async function createWebContainer(): Promise<WebContainerInstance> {
  try {
    const real = await bootRealContainer();
    if (real) return real;
  } catch {
    // dynamic import failed or boot threw — fall through to simulation
  }
  return createSimulatedContainer();
}

// IDENTITY_SEAL: PART-1 | role=public API | inputs=none | outputs=WebContainerInstance

// ============================================================
// PART 2 — Real WebContainer Adapter
// ============================================================

async function bootRealContainer(): Promise<WebContainerInstance | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let api: any;
  try {
    const moduleName = "@webcontainer/api";
    api = await (Function('m', 'return import(m)')(moduleName));
  } catch {
    return null;
  }

  if (!api?.WebContainer?.boot) return null;

  const container = await api.WebContainer.boot();
  let disposed = false;

  return {
    isAvailable: true,

    async run(command: string) {
      if (disposed) {
        return { stdout: "", stderr: "Container disposed", exitCode: 1 };
      }
      const parts = command.split(/\s+/);
      const cmd = parts[0] ?? "";
      const args = parts.slice(1);

      try {
        const process = await container.spawn(cmd, args);
        let stdout = "";
        const stderr = "";

        const stdoutReader = process.output.getReader();
        const decoder = new TextDecoder();

        // Read stdout stream
        let done = false;
        while (!done) {
          const result = await stdoutReader.read();
          if (result.value) {
            stdout += typeof result.value === "string"
              ? result.value
              : decoder.decode(result.value);
          }
          done = result.done;
        }

        const exitCode = await process.exit;
        return { stdout, stderr, exitCode };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { stdout: "", stderr: message, exitCode: 1 };
      }
    },

    async writeFile(path: string, content: string) {
      if (disposed) return;
      await container.fs.writeFile(path, content);
    },

    async readFile(path: string) {
      if (disposed) return "";
      const buf = await container.fs.readFile(path);
      return typeof buf === "string" ? buf : new TextDecoder().decode(buf);
    },

    async installDependencies() {
      if (disposed) return;
      const process = await container.spawn("npm", ["install"]);
      await process.exit;
    },

    async startDevServer(port: number) {
      if (disposed) return "";
      container.spawn("npm", ["run", "dev", "--", "--port", String(port)]);

      // Wait for the server-ready event
      return new Promise<string>((resolve) => {
        container.on("server-ready", (_p: number, url: string) => {
          resolve(url);
        });
        // Timeout fallback
        setTimeout(() => resolve(`http://localhost:${port}`), 15_000);
      });
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      container.teardown?.();
    },
  };
}

// IDENTITY_SEAL: PART-2 | role=real WebContainer bridge | inputs=@webcontainer/api | outputs=WebContainerInstance

// ============================================================
// PART 3 — Simulated Container
// ============================================================

interface SimProcess {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function createSimulatedContainer(): WebContainerInstance {
  const fs = new Map<string, string>();
  let disposed = false;
  let devServerRunning = false;

  // Seed some default files
  fs.set("/package.json", JSON.stringify({
    name: "simulated-project",
    version: "1.0.0",
    scripts: { dev: "next dev", build: "next build" },
  }, null, 2));
  fs.set("/index.js", "console.log('Hello from simulated container');");

  return {
    isAvailable: false,

    async run(command: string): Promise<SimProcess> {
      if (disposed) {
        return { stdout: "", stderr: "[sim] Container disposed", exitCode: 1 };
      }
      return simulateCommand(command, fs, () => devServerRunning);
    },

    async writeFile(path: string, content: string) {
      if (disposed) return;
      const normalized = normalizePath(path);
      fs.set(normalized, content);
    },

    async readFile(path: string) {
      if (disposed) return "";
      const normalized = normalizePath(path);
      const content = fs.get(normalized);
      if (content == null) {
        throw new Error(`ENOENT: no such file '${normalized}'`);
      }
      return content;
    },

    async installDependencies() {
      if (disposed) return;
      // Simulate npm install with progress
      await delay(200);
      fs.set("/node_modules/.package-lock.json", "{}");
    },

    async startDevServer(port: number) {
      if (disposed) return "";
      devServerRunning = true;
      await delay(300);
      return `http://localhost:${port}`;
    },

    dispose() {
      disposed = true;
      devServerRunning = false;
      fs.clear();
    },
  };
}

// IDENTITY_SEAL: PART-3 | role=simulated container | inputs=none | outputs=WebContainerInstance(sim)

// ============================================================
// PART 4 — Command Simulation Engine
// ============================================================

function simulateCommand(
  command: string,
  fs: Map<string, string>,
  isServerRunning: () => boolean,
): SimProcess {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0] ?? "";
  const args = parts.slice(1);

  switch (cmd) {
    case "echo":
      return ok(args.join(" "));

    case "pwd":
      return ok("/home/project");

    case "whoami":
      return ok("code-studio");

    case "date":
      return ok(new Date().toISOString());

    case "ls": {
      const dir = args[0] ?? "/";
      const prefix = normalizePath(dir);
      const entries = new Set<string>();
      for (const key of Array.from(fs.keys())) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length).replace(/^\//, "");
          const topEntry = rest.split("/")[0];
          if (topEntry) entries.add(topEntry);
        }
      }
      return entries.size > 0
        ? ok(Array.from(entries).sort().join("\n"))
        : ok("");
    }

    case "cat": {
      const target = args[0];
      if (!target) return err("cat: missing operand", 1);
      const normalized = normalizePath(target);
      const content = fs.get(normalized);
      if (content == null) return err(`cat: ${target}: No such file or directory`, 1);
      return ok(content);
    }

    case "mkdir":
      // Directories are implicit in our Map-based fs
      return ok("");

    case "touch": {
      const file = args[0];
      if (!file) return err("touch: missing operand", 1);
      const norm = normalizePath(file);
      if (!fs.has(norm)) fs.set(norm, "");
      return ok("");
    }

    case "node":
      if (args[0] === "-v" || args[0] === "--version") return ok("v20.11.0");
      if (args[0] === "-e" && args[1]) return ok(`[sim] eval: ${args.slice(1).join(" ")}`);
      return ok("[sim] node executed");

    case "npm":
    case "npx":
      return simulateNpm(args);

    case "git":
      return simulateGit(args);

    case "clear":
      return ok("");

    default:
      return err(`[sim] command not found: ${cmd}`, 127);
  }
}

function simulateNpm(args: string[]): SimProcess {
  const sub = args[0] ?? "";
  switch (sub) {
    case "-v":
    case "--version":
      return ok("10.2.0");
    case "install":
    case "i":
      return ok(
        "[sim] added 127 packages in 2.3s\n\n0 vulnerabilities",
      );
    case "run": {
      const script = args[1] ?? "unknown";
      return ok(`[sim] > ${script}\n[sim] script executed successfully`);
    }
    case "test":
      return ok("[sim] Tests passed: 12/12");
    case "init":
      return ok("[sim] Initialized package.json");
    default:
      return ok(`[sim] npm ${args.join(" ")}`);
  }
}

function simulateGit(args: string[]): SimProcess {
  const sub = args[0] ?? "";
  switch (sub) {
    case "status":
      return ok("On branch main\nnothing to commit, working tree clean");
    case "log":
      return ok("commit abc1234 (HEAD -> main)\nAuthor: Code Studio\nDate: today\n\n    Initial commit");
    case "init":
      return ok("Initialized empty Git repository in /home/project/.git/");
    case "branch":
      return ok("* main");
    default:
      return ok(`[sim] git ${args.join(" ")}`);
  }
}

// IDENTITY_SEAL: PART-4 | role=command simulation | inputs=command string,fs map | outputs=SimProcess

// ============================================================
// PART 5 — Utilities
// ============================================================

function ok(stdout: string): SimProcess {
  return { stdout, stderr: "", exitCode: 0 };
}

function err(stderr: string, exitCode: number): SimProcess {
  return { stdout: "", stderr, exitCode };
}

function normalizePath(p: string): string {
  let normalized = p.startsWith("/") ? p : "/" + p;
  normalized = normalized.replace(/\/+/g, "/");
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// IDENTITY_SEAL: PART-5 | role=shared utilities | inputs=various | outputs=helper functions
