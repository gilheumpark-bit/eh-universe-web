// ============================================================
// PART 1 — Types & IndexedDB Cache
// ============================================================
// Type Acquisition — Fetch real .d.ts type definitions from
// esm.sh CDN for all dependencies in package.json.
// Ported from CSL IDE type-acquisition.ts for EH Universe.
// ============================================================

type Monaco = typeof import("monaco-editor");

const DB_NAME = "eh-type-cache";
const DB_VERSION = 1;
const STORE_NAME = "types";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedType {
  key: string;
  content: string;
  fetchedAt: number;
}

function openTypeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCachedType(key: string): Promise<string | null> {
  try {
    const db = await openTypeDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result as CachedType | undefined;
        if (result && Date.now() - result.fetchedAt < CACHE_TTL_MS) {
          resolve(result.content);
          return;
        }
        resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCachedType(key: string, content: string): Promise<void> {
  try {
    const db = await openTypeDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const entry: CachedType = { key, content, fetchedAt: Date.now() };
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Cache is best-effort
  }
}

async function clearAllCachedTypes(): Promise<void> {
  try {
    const db = await openTypeDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Silently fail
  }
}

// IDENTITY_SEAL: PART-1 | role=types+IndexedDB cache | inputs=key | outputs=cached d.ts content

// ============================================================
// PART 2 — Built-in Type Stubs
// ============================================================

const BUILTIN_STUBS: Record<string, string> = {
  tailwindcss: `
declare module "tailwindcss" {
  interface Config {
    content?: string[] | { relative?: boolean; files: string[] };
    theme?: { extend?: Record<string, unknown>; colors?: Record<string, unknown>; [key: string]: unknown };
    plugins?: Array<unknown>;
    darkMode?: "class" | "media" | ["class", string];
    prefix?: string;
    important?: boolean | string;
    [key: string]: unknown;
  }
  export default function tailwindcss(config: Config): unknown;
  export type { Config };
}`,
  "class-variance-authority": `
declare module "class-variance-authority" {
  type ClassValue = string | null | undefined | false | Record<string, boolean>;
  type StringToBoolean<T> = T extends "true" | "false" ? boolean : T;
  interface CVAConfig<T extends Record<string, Record<string, ClassValue>>> {
    base?: ClassValue; variants?: T;
    compoundVariants?: Array<{ [K in keyof T]?: StringToBoolean<keyof T[K]> | StringToBoolean<keyof T[K]>[]; } & { class?: ClassValue; className?: ClassValue }>;
    defaultVariants?: { [K in keyof T]?: StringToBoolean<keyof T[K]> };
  }
  export function cva<T extends Record<string, Record<string, ClassValue>>>(
    base?: ClassValue, config?: CVAConfig<T>,
  ): (props?: { [K in keyof T]?: StringToBoolean<keyof T[K]> } & { class?: ClassValue; className?: ClassValue }) => string;
  export type VariantProps<T extends (...args: any) => any> = Omit<Parameters<T>[0], "class" | "className">;
}`,
  clsx: `
declare module "clsx" {
  type ClassValue = string | number | boolean | null | undefined | ClassValue[] | Record<string, boolean | null | undefined>;
  export function clsx(...inputs: ClassValue[]): string;
  export default clsx;
}`,
  "tailwind-merge": `
declare module "tailwind-merge" {
  export function twMerge(...classLists: (string | undefined | null | false)[]): string;
  export function twJoin(...classLists: (string | undefined | null | false)[]): string;
  export function createTailwindMerge(config: Record<string, unknown>): typeof twMerge;
  export function extendTailwindMerge(config: Record<string, unknown>): typeof twMerge;
}`,
  "lucide-react": `
declare module "lucide-react" {
  import { FC, SVGAttributes } from "react";
  interface IconProps extends SVGAttributes<SVGElement> {
    size?: number | string; color?: string; strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean; className?: string;
  }
  type Icon = FC<IconProps>;
  export const ChevronRight: Icon; export const ChevronLeft: Icon;
  export const ChevronDown: Icon; export const ChevronUp: Icon;
  export const X: Icon; export const Plus: Icon; export const Minus: Icon;
  export const Check: Icon; export const Search: Icon; export const Settings: Icon;
  export const Menu: Icon; export const Home: Icon; export const File: Icon;
  export const Folder: Icon; export const FolderOpen: Icon; export const Trash: Icon;
  export const Edit: Icon; export const Copy: Icon; export const Save: Icon;
  export const Download: Icon; export const Upload: Icon; export const ExternalLink: Icon;
  export const RefreshCw: Icon; export const Loader2: Icon;
  export const AlertCircle: Icon; export const AlertTriangle: Icon; export const Info: Icon;
  export const Eye: Icon; export const EyeOff: Icon; export const Lock: Icon; export const Unlock: Icon;
  export const Terminal: Icon; export const Code: Icon; export const GitBranch: Icon;
  export const Play: Icon; export const Pause: Icon; export const Square: Icon;
  export const Zap: Icon; export const MoreHorizontal: Icon; export const MoreVertical: Icon;
  export const Maximize: Icon; export const Minimize: Icon;
  export const PanelLeft: Icon; export const PanelRight: Icon;
  export const GripVertical: Icon; export const Command: Icon; export const Keyboard: Icon;
  const _default: Record<string, Icon>;
  export default _default;
}`,
  "framer-motion": `
declare module "framer-motion" {
  import { FC, ReactNode, CSSProperties, HTMLAttributes } from "react";
  type MotionValue<T = number> = { get(): T; set(v: T): void };
  type TargetAndTransition = Record<string, unknown>;
  type VariantLabels = string | string[];
  interface MotionProps extends HTMLAttributes<HTMLElement> {
    initial?: boolean | TargetAndTransition | VariantLabels;
    animate?: TargetAndTransition | VariantLabels;
    exit?: TargetAndTransition | VariantLabels;
    transition?: Record<string, unknown>;
    variants?: Record<string, TargetAndTransition>;
    whileHover?: TargetAndTransition | VariantLabels;
    whileTap?: TargetAndTransition | VariantLabels;
    drag?: boolean | "x" | "y";
    layout?: boolean | "position" | "size";
    layoutId?: string;
    style?: CSSProperties; className?: string; children?: ReactNode;
    [key: string]: unknown;
  }
  type MotionComponent = FC<MotionProps>;
  export const motion: {
    div: MotionComponent; span: MotionComponent; p: MotionComponent;
    a: MotionComponent; button: MotionComponent; ul: MotionComponent;
    li: MotionComponent; section: MotionComponent; header: MotionComponent;
    footer: MotionComponent; nav: MotionComponent; main: MotionComponent;
    img: MotionComponent; svg: MotionComponent; h1: MotionComponent;
    h2: MotionComponent; h3: MotionComponent; form: MotionComponent;
    input: MotionComponent; [key: string]: MotionComponent;
  };
  export const AnimatePresence: FC<{ children?: ReactNode; mode?: "sync" | "wait" | "popLayout"; initial?: boolean }>;
  export function useMotionValue<T = number>(initial: T): MotionValue<T>;
  export function useAnimation(): { start(def: string | TargetAndTransition): Promise<void>; stop(): void };
  export function useInView(ref: { current: Element | null }, options?: { once?: boolean }): boolean;
}`,
  zustand: `
declare module "zustand" {
  type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
  type GetState<T> = () => T;
  type StoreApi<T> = { getState: GetState<T>; setState: SetState<T>; subscribe: (listener: (state: T, prevState: T) => void) => () => void };
  type StateCreator<T> = (set: SetState<T>, get: GetState<T>, api: StoreApi<T>) => T;
  export function create<T>(initializer: StateCreator<T>): {
    (): T; <U>(selector: (state: T) => U): U;
    getState: GetState<T>; setState: SetState<T>;
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;
  };
  export default create;
}`,
  "@radix-ui/react-slot": `
declare module "@radix-ui/react-slot" {
  import { FC, ReactNode, HTMLAttributes } from "react";
  export const Slot: FC<HTMLAttributes<HTMLElement> & { children?: ReactNode }>;
  export const Slottable: FC<{ children?: ReactNode }>;
}`,
};

// IDENTITY_SEAL: PART-2 | role=built-in type stubs | inputs=none | outputs=BUILTIN_STUBS map

// ============================================================
// PART 3 — Package Parsing & Batch Fetching
// ============================================================

interface ParsedDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

function parseDependencies(packageJsonContent: string): ParsedDependencies {
  try {
    const parsed = JSON.parse(packageJsonContent);
    return {
      dependencies: parsed.dependencies ?? {},
      devDependencies: parsed.devDependencies ?? {},
    };
  } catch {
    return { dependencies: {}, devDependencies: {} };
  }
}

async function batchFetch<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item !== undefined) {
            await fn(item);
          }
        }
      })(),
    );
  }

  await Promise.all(workers);
}

const SKIP_PACKAGES = new Set([
  "typescript", "eslint", "prettier", "postcss", "autoprefixer",
  "next", "react", "react-dom",
  "@types/react", "@types/react-dom", "@types/node",
]);

const TYPES_PACKAGE_MAP: Record<string, string> = {
  "styled-components": "styled-components",
  lodash: "lodash", express: "express", jest: "jest",
  mocha: "mocha", uuid: "uuid", cors: "cors",
};

async function fetchTypeDefinition(
  pkg: string,
  version: string,
): Promise<{ content: string; source: "types" | "package" | "stub" } | null> {
  if (BUILTIN_STUBS[pkg]) {
    return { content: BUILTIN_STUBS[pkg], source: "stub" };
  }

  const cacheKey = `${pkg}@${version}`;
  const cached = await getCachedType(cacheKey);
  if (cached) {
    return { content: cached, source: "types" };
  }

  const typesName = pkg.startsWith("@")
    ? pkg.replace("@", "").replace("/", "__")
    : (TYPES_PACKAGE_MAP[pkg] ?? pkg);

  // Try @types first
  try {
    const url = `https://esm.sh/v135/@types/${typesName}/index.d.ts`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const content = await res.text();
      if (content.length > 50 && !content.includes("<!DOCTYPE") && !content.includes("<html")) {
        await setCachedType(cacheKey, content);
        return { content, source: "types" };
      }
    }
  } catch {
    // @types fetch failed
  }

  // Fallback: try package itself
  try {
    const url = `https://esm.sh/v135/${pkg}/index.d.ts`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const content = await res.text();
      if (content.length > 50 && !content.includes("<!DOCTYPE") && !content.includes("<html")) {
        await setCachedType(cacheKey, content);
        return { content, source: "package" };
      }
    }
  } catch {
    // Both fetches failed
  }

  return null;
}

// IDENTITY_SEAL: PART-3 | role=fetch+parse | inputs=packageJson | outputs=type definitions

// ============================================================
// PART 4 — State & Monaco Registration
// ============================================================

interface TypeAcquisitionState {
  acquiredTypes: Map<string, string>;
  registeredLibs: Map<string, { dispose(): void }>;
  lastPackageJsonHash: string;
}

const state: TypeAcquisitionState = {
  acquiredTypes: new Map(),
  registeredLibs: new Map(),
  lastPackageJsonHash: "",
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

function registerTypeLib(
  monaco: Monaco,
  pkg: string,
  content: string,
): { dispose(): void } {
  const filePath = `file:///node_modules/${pkg}/index.d.ts`;
  const ts = (monaco.languages as Record<string, unknown> as {
    typescript: {
      typescriptDefaults: { addExtraLib(content: string, filePath: string): { dispose(): void } };
      javascriptDefaults: { addExtraLib(content: string, filePath: string): { dispose(): void } };
    };
  }).typescript;

  const tsDisposable = ts.typescriptDefaults.addExtraLib(content, filePath);
  const jsDisposable = ts.javascriptDefaults.addExtraLib(content, filePath);

  return {
    dispose() {
      tsDisposable.dispose();
      jsDisposable.dispose();
    },
  };
}

// IDENTITY_SEAL: PART-4 | role=state+registration | inputs=Monaco,pkg,content | outputs=disposable

// ============================================================
// PART 5 — Public API
// ============================================================

let monacoInstance: Monaco | null = null;

/**
 * Set the Monaco instance used for type registration.
 * Must be called before acquireTypes().
 */
export function setMonacoInstance(monaco: Monaco): void {
  monacoInstance = monaco;
}

/**
 * Acquire type definitions for all dependencies listed in a package.json.
 * Fetches .d.ts files from esm.sh CDN, caches them in IndexedDB,
 * and registers them as extra libs in Monaco's TypeScript service.
 */
export async function acquireTypes(packageJson: string): Promise<void> {
  if (!monacoInstance) {
    console.warn("[type-acquisition] Monaco instance not set. Call setMonacoInstance() first.");
    return;
  }

  const monaco = monacoInstance;
  const hash = simpleHash(packageJson);
  if (hash === state.lastPackageJsonHash) return;
  state.lastPackageJsonHash = hash;

  const { dependencies, devDependencies } = parseDependencies(packageJson);
  const allDeps = { ...dependencies, ...devDependencies };

  const packagesToFetch: Array<{ name: string; version: string }> = [];

  for (const [name, version] of Object.entries(allDeps)) {
    if (SKIP_PACKAGES.has(name)) continue;
    if (name.startsWith("@types/")) continue;
    if (state.acquiredTypes.has(name) && state.registeredLibs.has(name)) continue;

    const cleanVersion = (version as string).replace(/^[\^~>=<*]/, "").split(" ")[0];
    packagesToFetch.push({ name, version: cleanVersion });
  }

  // Remove types for packages no longer in dependencies
  for (const [pkg] of state.acquiredTypes) {
    if (!allDeps[pkg] && !BUILTIN_STUBS[pkg]) {
      const lib = state.registeredLibs.get(pkg);
      if (lib) {
        lib.dispose();
        state.registeredLibs.delete(pkg);
      }
      state.acquiredTypes.delete(pkg);
    }
  }

  // Register stubs for packages in dependencies that have built-in stubs
  for (const [name] of Object.entries(allDeps)) {
    if (BUILTIN_STUBS[name] && !state.registeredLibs.has(name)) {
      const content = BUILTIN_STUBS[name];
      const lib = registerTypeLib(monaco, name, content);
      state.registeredLibs.set(name, lib);
      state.acquiredTypes.set(name, content);
    }
  }

  if (packagesToFetch.length === 0) return;

  await batchFetch(packagesToFetch, 5, async ({ name, version }) => {
    try {
      const result = await fetchTypeDefinition(name, version);
      if (result) {
        const oldLib = state.registeredLibs.get(name);
        if (oldLib) oldLib.dispose();

        const lib = registerTypeLib(monaco, name, result.content);
        state.registeredLibs.set(name, lib);
        state.acquiredTypes.set(name, result.content);
      }
    } catch (err) {
      console.warn(`[type-acquisition] Failed to acquire types for ${name}:`, err);
    }
  });
}

/**
 * Clear all cached types from IndexedDB and unregister all extra libs.
 */
export async function clearTypeCache(): Promise<void> {
  for (const [, lib] of state.registeredLibs) {
    lib.dispose();
  }
  state.registeredLibs.clear();
  state.acquiredTypes.clear();
  state.lastPackageJsonHash = "";
  await clearAllCachedTypes();
}

/**
 * Check if types have been acquired for a specific package.
 */
export function hasTypesFor(pkg: string): boolean {
  return state.acquiredTypes.has(pkg);
}

/**
 * Dispose all resources and reset state.
 */
export function disposeTypeAcquisition(): void {
  for (const [, lib] of state.registeredLibs) {
    lib.dispose();
  }
  state.registeredLibs.clear();
  state.acquiredTypes.clear();
  state.lastPackageJsonHash = "";
  monacoInstance = null;
}

// IDENTITY_SEAL: PART-5 | role=public API | inputs=packageJson | outputs=acquired types in Monaco
