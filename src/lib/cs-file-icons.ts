// ============================================================
// File Icons — Extension-based icon + color mapping
// ============================================================

export interface FileIconInfo {
  icon: string;  // emoji or lucide name
  color: string;
}

const EXT_MAP: Record<string, FileIconInfo> = {
  ts: { icon: "TS", color: "#3178c6" },
  tsx: { icon: "TX", color: "#3178c6" },
  js: { icon: "JS", color: "#f7df1e" },
  jsx: { icon: "JX", color: "#61dafb" },
  py: { icon: "PY", color: "#3776ab" },
  rs: { icon: "RS", color: "#dea584" },
  go: { icon: "GO", color: "#00add8" },
  java: { icon: "JV", color: "#ed8b00" },
  c: { icon: "C", color: "#a8b9cc" },
  cpp: { icon: "C+", color: "#00599c" },
  html: { icon: "HT", color: "#e34c26" },
  css: { icon: "CS", color: "#1572b6" },
  scss: { icon: "SC", color: "#cc6699" },
  json: { icon: "{ }", color: "#f7df1e" },
  yaml: { icon: "YM", color: "#cb171e" },
  yml: { icon: "YM", color: "#cb171e" },
  md: { icon: "MD", color: "#083fa1" },
  mdx: { icon: "MX", color: "#083fa1" },
  sql: { icon: "SQ", color: "#e38c00" },
  sh: { icon: "SH", color: "#4eaa25" },
  dockerfile: { icon: "DK", color: "#2496ed" },
  svg: { icon: "SV", color: "#ffb13b" },
  png: { icon: "IM", color: "#a4c639" },
  jpg: { icon: "IM", color: "#a4c639" },
  gif: { icon: "GF", color: "#a4c639" },
  env: { icon: "EN", color: "#ecd53f" },
  toml: { icon: "TM", color: "#9c4121" },
  prisma: { icon: "PR", color: "#2d3748" },
  graphql: { icon: "GQ", color: "#e535ab" },
  vue: { icon: "VU", color: "#42b883" },
  svelte: { icon: "SV", color: "#ff3e00" },
  astro: { icon: "AS", color: "#ff5d01" },
};

const NAME_MAP: Record<string, FileIconInfo> = {
  "package.json": { icon: "NP", color: "#cb3837" },
  "tsconfig.json": { icon: "TS", color: "#3178c6" },
  ".gitignore": { icon: "GI", color: "#f05033" },
  ".env": { icon: "EN", color: "#ecd53f" },
  ".env.local": { icon: "EN", color: "#ecd53f" },
  "dockerfile": { icon: "DK", color: "#2496ed" },
  "makefile": { icon: "MK", color: "#6d8086" },
  "readme.md": { icon: "RM", color: "#083fa1" },
  "license": { icon: "LI", color: "#d4aa00" },
};

export function getFileIcon(fileName: string): FileIconInfo {
  const lower = fileName.toLowerCase();
  if (NAME_MAP[lower]) return NAME_MAP[lower];

  const ext = lower.split(".").pop() ?? "";
  return EXT_MAP[ext] ?? { icon: "FI", color: "#8b949e" };
}

export function getFolderIcon(folderName: string): { color: string } {
  const special: Record<string, string> = {
    src: "#58a6ff",
    components: "#bc8cff",
    lib: "#3fb950",
    hooks: "#d29922",
    api: "#f85149",
    app: "#58a6ff",
    test: "#3fb950",
    tests: "#3fb950",
    __tests__: "#3fb950",
    public: "#d29922",
    styles: "#1572b6",
    assets: "#f7df1e",
    node_modules: "#6d8086",
    ".git": "#f05033",
  };
  return { color: special[folderName.toLowerCase()] ?? "#d29922" };
}
