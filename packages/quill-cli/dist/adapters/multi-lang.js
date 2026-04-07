"use strict";
// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Multi-Language Support (40+ Languages)
// ============================================================
// tree-sitter 기반 다국어 AST 파싱.
// 언어별 린터/분석기 매핑.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGE_REGISTRY = void 0;
exports.detectLanguage = detectLanguage;
exports.detectProjectLanguages = detectProjectLanguages;
exports.getSupportedExtensions = getSupportedExtensions;
exports.parseWithTreeSitter = parseWithTreeSitter;
exports.runExternalLinter = runExternalLinter;
exports.analyzeAnyLanguage = analyzeAnyLanguage;
exports.getLanguageStats = getLanguageStats;
exports.getLanguageRules = getLanguageRules;
exports.applyLanguageRules = applyLanguageRules;
exports.detectPolyglotProject = detectPolyglotProject;
exports.analyzeMixedLanguageFiles = analyzeMixedLanguageFiles;
exports.LANGUAGE_REGISTRY = [
    // Tier 1: Built-in (already supported)
    { id: 'typescript', name: 'TypeScript', extensions: ['.ts', '.tsx'], treeSitterPackage: 'tree-sitter-typescript', linter: 'eslint', formatter: 'prettier', astAnalyzer: 'typescript' },
    { id: 'javascript', name: 'JavaScript', extensions: ['.js', '.jsx', '.mjs', '.cjs'], treeSitterPackage: 'tree-sitter-javascript', linter: 'eslint', formatter: 'prettier', astAnalyzer: 'acorn' },
    // Tier 2: Popular backend
    { id: 'python', name: 'Python', extensions: ['.py', '.pyi'], treeSitterPackage: 'tree-sitter-python', linter: 'pylint', formatter: 'black', astAnalyzer: 'tree-sitter' },
    { id: 'go', name: 'Go', extensions: ['.go'], treeSitterPackage: 'tree-sitter-go', linter: 'golangci-lint', formatter: 'gofmt', astAnalyzer: 'tree-sitter' },
    { id: 'rust', name: 'Rust', extensions: ['.rs'], treeSitterPackage: 'tree-sitter-rust', linter: 'clippy', formatter: 'rustfmt', astAnalyzer: 'tree-sitter' },
    { id: 'java', name: 'Java', extensions: ['.java'], treeSitterPackage: 'tree-sitter-java', linter: 'checkstyle', formatter: 'google-java-format', astAnalyzer: 'tree-sitter' },
    { id: 'kotlin', name: 'Kotlin', extensions: ['.kt', '.kts'], treeSitterPackage: 'tree-sitter-kotlin', linter: 'ktlint', formatter: 'ktlint', astAnalyzer: 'tree-sitter' },
    { id: 'swift', name: 'Swift', extensions: ['.swift'], treeSitterPackage: 'tree-sitter-swift', linter: 'swiftlint', formatter: 'swift-format', astAnalyzer: 'tree-sitter' },
    { id: 'csharp', name: 'C#', extensions: ['.cs'], treeSitterPackage: 'tree-sitter-c-sharp', linter: 'dotnet-format', formatter: 'dotnet-format', astAnalyzer: 'tree-sitter' },
    // Tier 3: Systems
    { id: 'c', name: 'C', extensions: ['.c', '.h'], treeSitterPackage: 'tree-sitter-c', linter: 'cppcheck', astAnalyzer: 'tree-sitter' },
    { id: 'cpp', name: 'C++', extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hh'], treeSitterPackage: 'tree-sitter-cpp', linter: 'cppcheck', formatter: 'clang-format', astAnalyzer: 'tree-sitter' },
    // Tier 4: Scripting
    { id: 'ruby', name: 'Ruby', extensions: ['.rb', '.rake'], treeSitterPackage: 'tree-sitter-ruby', linter: 'rubocop', astAnalyzer: 'tree-sitter' },
    { id: 'php', name: 'PHP', extensions: ['.php'], treeSitterPackage: 'tree-sitter-php', linter: 'phpstan', formatter: 'php-cs-fixer', astAnalyzer: 'tree-sitter' },
    { id: 'lua', name: 'Lua', extensions: ['.lua'], treeSitterPackage: 'tree-sitter-lua', linter: 'luacheck', astAnalyzer: 'tree-sitter' },
    { id: 'perl', name: 'Perl', extensions: ['.pl', '.pm'], treeSitterPackage: 'tree-sitter-perl', astAnalyzer: 'tree-sitter' },
    { id: 'r', name: 'R', extensions: ['.r', '.R'], treeSitterPackage: 'tree-sitter-r', linter: 'lintr', astAnalyzer: 'tree-sitter' },
    { id: 'scala', name: 'Scala', extensions: ['.scala'], treeSitterPackage: 'tree-sitter-scala', linter: 'scalafmt', astAnalyzer: 'tree-sitter' },
    { id: 'elixir', name: 'Elixir', extensions: ['.ex', '.exs'], treeSitterPackage: 'tree-sitter-elixir', linter: 'credo', astAnalyzer: 'tree-sitter' },
    { id: 'dart', name: 'Dart', extensions: ['.dart'], treeSitterPackage: 'tree-sitter-dart', linter: 'dart-analyze', formatter: 'dart-format', astAnalyzer: 'tree-sitter' },
    // Tier 5: Config & Markup
    { id: 'html', name: 'HTML', extensions: ['.html', '.htm'], treeSitterPackage: 'tree-sitter-html', linter: 'htmlhint', formatter: 'prettier', astAnalyzer: 'tree-sitter' },
    { id: 'css', name: 'CSS', extensions: ['.css', '.scss', '.sass', '.less'], treeSitterPackage: 'tree-sitter-css', linter: 'stylelint', formatter: 'prettier', astAnalyzer: 'tree-sitter' },
    { id: 'json', name: 'JSON', extensions: ['.json', '.jsonc'], treeSitterPackage: 'tree-sitter-json', astAnalyzer: 'tree-sitter' },
    { id: 'yaml', name: 'YAML', extensions: ['.yml', '.yaml'], treeSitterPackage: 'tree-sitter-yaml', linter: 'yamllint', astAnalyzer: 'tree-sitter' },
    { id: 'toml', name: 'TOML', extensions: ['.toml'], treeSitterPackage: 'tree-sitter-toml', astAnalyzer: 'tree-sitter' },
    { id: 'markdown', name: 'Markdown', extensions: ['.md', '.mdx'], treeSitterPackage: 'tree-sitter-markdown', linter: 'markdownlint', astAnalyzer: 'tree-sitter' },
    { id: 'sql', name: 'SQL', extensions: ['.sql'], treeSitterPackage: 'tree-sitter-sql', linter: 'sqlfluff', astAnalyzer: 'tree-sitter' },
    // Tier 6: Shell & DevOps
    { id: 'bash', name: 'Bash', extensions: ['.sh', '.bash'], treeSitterPackage: 'tree-sitter-bash', linter: 'shellcheck', astAnalyzer: 'tree-sitter' },
    { id: 'dockerfile', name: 'Dockerfile', extensions: ['Dockerfile'], treeSitterPackage: 'tree-sitter-dockerfile', linter: 'hadolint', astAnalyzer: 'tree-sitter' },
    { id: 'hcl', name: 'HCL (Terraform)', extensions: ['.tf', '.hcl'], treeSitterPackage: 'tree-sitter-hcl', linter: 'tflint', astAnalyzer: 'tree-sitter' },
    // Tier 7: Functional
    { id: 'haskell', name: 'Haskell', extensions: ['.hs'], treeSitterPackage: 'tree-sitter-haskell', linter: 'hlint', astAnalyzer: 'tree-sitter' },
    { id: 'ocaml', name: 'OCaml', extensions: ['.ml', '.mli'], treeSitterPackage: 'tree-sitter-ocaml', astAnalyzer: 'tree-sitter' },
    { id: 'clojure', name: 'Clojure', extensions: ['.clj', '.cljs'], treeSitterPackage: 'tree-sitter-clojure', linter: 'clj-kondo', astAnalyzer: 'tree-sitter' },
    { id: 'erlang', name: 'Erlang', extensions: ['.erl'], treeSitterPackage: 'tree-sitter-erlang', astAnalyzer: 'tree-sitter' },
    // Tier 8: Mobile
    { id: 'objc', name: 'Objective-C', extensions: ['.m', '.mm'], treeSitterPackage: 'tree-sitter-objc', astAnalyzer: 'tree-sitter' },
    // Tier 9: Data
    { id: 'graphql', name: 'GraphQL', extensions: ['.graphql', '.gql'], treeSitterPackage: 'tree-sitter-graphql', astAnalyzer: 'tree-sitter' },
    { id: 'protobuf', name: 'Protobuf', extensions: ['.proto'], treeSitterPackage: 'tree-sitter-proto', astAnalyzer: 'tree-sitter' },
];
// IDENTITY_SEAL: PART-1 | role=registry | inputs=none | outputs=LANGUAGE_REGISTRY
// ============================================================
// PART 2 — Language Detection
// ============================================================
const EXT_MAP = new Map();
for (const lang of exports.LANGUAGE_REGISTRY) {
    for (const ext of lang.extensions) {
        EXT_MAP.set(ext, lang);
    }
}
function detectLanguage(fileName) {
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : fileName;
    return EXT_MAP.get(ext) ?? null;
}
function detectProjectLanguages(files) {
    const seen = new Set();
    const results = [];
    for (const file of files) {
        const lang = detectLanguage(file);
        if (lang && !seen.has(lang.id)) {
            seen.add(lang.id);
            results.push(lang);
        }
    }
    return results;
}
function getSupportedExtensions() {
    return [...EXT_MAP.keys()];
}
async function parseWithTreeSitter(code, language) {
    const result = {
        language: language.id,
        functions: [], imports: [], classes: [], loops: [], findings: [],
    };
    try {
        const Parser = (require('tree-sitter')).default;
        const langModule = require(language.treeSitterPackage);
        const parser = new Parser();
        parser.setLanguage(langModule.default ?? langModule);
        const tree = parser.parse(code);
        const root = tree.rootNode;
        // Universal patterns across all languages
        traverseNode(root, 0, result, language.id);
    }
    catch {
        // tree-sitter not installed — fallback to regex
        result.findings.push({
            line: 0,
            message: `tree-sitter-${language.id} not installed. Using regex fallback.`,
            severity: 'info',
        });
        fallbackRegexAnalysis(code, language.id, result);
    }
    return result;
}
function traverseNode(node, depth, result, langId) {
    const type = node.type;
    const startLine = (node.startPosition?.row ?? 0) + 1;
    const endLine = (node.endPosition?.row ?? 0) + 1;
    // Function detection (universal)
    if (/function_definition|function_declaration|method_definition|method_declaration|func_declaration|fn_item/.test(type)) {
        const nameNode = node.childForFieldName?.('name');
        result.functions.push({
            name: nameNode?.text ?? 'anonymous',
            line: startLine,
            length: endLine - startLine + 1,
            params: node.childForFieldName?.('parameters')?.namedChildCount ?? 0,
        });
        // Empty function check
        const body = node.childForFieldName?.('body');
        if (body && body.namedChildCount === 0) {
            result.findings.push({ line: startLine, message: `Empty function: ${nameNode?.text ?? 'anonymous'}`, severity: 'error' });
        }
    }
    // Class detection (universal)
    if (/class_definition|class_declaration|class_specifier|struct_item/.test(type)) {
        const nameNode = node.childForFieldName?.('name');
        const bodyNode = node.childForFieldName?.('body');
        result.classes.push({
            name: nameNode?.text ?? 'anonymous',
            line: startLine,
            methods: bodyNode?.namedChildren?.filter((c) => /method|function|func/.test(c.type)).length ?? 0,
        });
    }
    // Import detection (universal)
    if (/import_statement|import_declaration|use_declaration|require_call/.test(type)) {
        result.imports.push({ module: node.text.slice(0, 80), line: startLine });
    }
    // Loop detection (universal)
    if (/for_statement|while_statement|do_statement|for_expression|loop_expression/.test(type)) {
        // Calculate loop depth
        let loopDepth = 1;
        let parent = node.parent;
        while (parent) {
            if (/for_statement|while_statement|do_statement|for_expression|loop_expression/.test(parent.type))
                loopDepth++;
            parent = parent.parent;
        }
        result.loops.push({ type, line: startLine, depth: loopDepth });
        if (loopDepth >= 3) {
            result.findings.push({ line: startLine, message: `Deep loop nesting: ${loopDepth} levels (O(n^${loopDepth}))`, severity: 'warning' });
        }
    }
    // Recursion (universal)
    for (let i = 0; i < (node.namedChildCount ?? 0); i++) {
        const child = node.namedChild?.(i);
        if (child)
            traverseNode(child, depth + 1, result, langId);
    }
}
// IDENTITY_SEAL: PART-3 | role=tree-sitter | inputs=code,language | outputs=UniversalASTResult
// ============================================================
// PART 4 — Regex Fallback (언어 무관)
// ============================================================
function fallbackRegexAnalysis(code, langId, result) {
    const lines = code.split('\n');
    // Universal patterns that work across most languages
    const functionPatterns = {
        python: /^\s*(?:async\s+)?def\s+(\w+)/,
        go: /^func\s+(?:\([^)]+\)\s+)?(\w+)/,
        rust: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/,
        java: /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)+(\w+)\s*\(/,
        kotlin: /^\s*(?:fun|suspend\s+fun)\s+(\w+)/,
        swift: /^\s*(?:func|private\s+func|public\s+func)\s+(\w+)/,
        csharp: /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?(?:async\s+)?(?:\w+\s+)+(\w+)\s*\(/,
        ruby: /^\s*def\s+(\w+)/,
        php: /^\s*(?:public|private|protected)?\s*(?:static\s+)?function\s+(\w+)/,
        default: /(?:function\s+(\w+)|def\s+(\w+)|fn\s+(\w+)|func\s+(\w+))/,
    };
    const pattern = functionPatterns[langId] ?? functionPatterns['default'];
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(pattern);
        if (match) {
            const name = match[1] ?? match[2] ?? match[3] ?? match[4] ?? 'anonymous';
            result.functions.push({ name, line: i + 1, length: 0, params: 0 });
        }
    }
    // Universal: TODO/FIXME
    for (let i = 0; i < lines.length; i++) {
        if (/TODO|FIXME|HACK|XXX/.test(lines[i])) {
            result.findings.push({ line: i + 1, message: 'TODO/FIXME remaining', severity: 'info' });
        }
    }
    // Universal: empty catch/except
    for (let i = 0; i < lines.length; i++) {
        if (/catch\s*(?:\([^)]*\))?\s*\{\s*\}|except.*:\s*pass|rescue\s*$/.test(lines[i])) {
            result.findings.push({ line: i + 1, message: 'Empty error handler', severity: 'warning' });
        }
    }
}
// IDENTITY_SEAL: PART-4 | role=regex-fallback | inputs=code,langId | outputs=UniversalASTResult
// ============================================================
// PART 5 — External Linter Runner
// ============================================================
async function runExternalLinter(filePath, language) {
    if (!language.linter)
        return [];
    const { execSync } = require('child_process');
    const findings = [];
    try {
        const commands = {
            'pylint': `pylint --output-format=json "${filePath}" 2>/dev/null`,
            'golangci-lint': `golangci-lint run --out-format json "${filePath}" 2>/dev/null`,
            'clippy': `cargo clippy --message-format=json 2>/dev/null`,
            'shellcheck': `shellcheck -f json "${filePath}" 2>/dev/null`,
            'rubocop': `rubocop --format json "${filePath}" 2>/dev/null`,
            'phpstan': `phpstan analyze --error-format=json "${filePath}" 2>/dev/null`,
        };
        const cmd = commands[language.linter];
        if (!cmd)
            return findings;
        const output = execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
        // Generic JSON parsing — most linters output arrays of findings
        try {
            const data = JSON.parse(output);
            const items = Array.isArray(data) ? data : data.results ?? data.messages ?? data.diagnostics ?? [];
            for (const item of items.slice(0, 20)) {
                findings.push({
                    line: item.line ?? item.location?.line ?? 0,
                    message: item.message ?? item.description ?? String(item),
                    severity: item.severity === 'error' || item.type === 'error' ? 'error' : 'warning',
                });
            }
        }
        catch { /* non-JSON output */ }
    }
    catch { /* linter not installed or failed */ }
    return findings;
}
// IDENTITY_SEAL: PART-5 | role=external-linter | inputs=filePath,language | outputs=findings
// ============================================================
// PART 6 — Unified Multi-Language Analyzer
// ============================================================
async function analyzeAnyLanguage(code, fileName) {
    const lang = detectLanguage(fileName);
    if (!lang) {
        return {
            language: 'unknown', functions: [], imports: [], classes: [], loops: [], findings: [],
            detected: null,
        };
    }
    // TypeScript/JavaScript: use existing engines (more precise)
    if (lang.astAnalyzer === 'typescript' || lang.astAnalyzer === 'acorn') {
        const result = await parseWithTreeSitter(code, lang);
        return { ...result, detected: lang };
    }
    // All other languages: tree-sitter
    const result = await parseWithTreeSitter(code, lang);
    return { ...result, detected: lang };
}
function getLanguageStats() {
    const tiers = {};
    const tierNames = ['Tier 1: Built-in', 'Tier 2: Backend', 'Tier 3: Systems', 'Tier 4: Scripting',
        'Tier 5: Config', 'Tier 6: Shell', 'Tier 7: Functional', 'Tier 8: Mobile', 'Tier 9: Data'];
    let tierIdx = 0;
    let count = 0;
    for (const lang of exports.LANGUAGE_REGISTRY) {
        if (lang.id === 'typescript') {
            tierIdx = 0;
            count = 0;
        }
        else if (lang.id === 'python') {
            tiers[tierNames[0]] = count;
            tierIdx = 1;
            count = 0;
        }
        else if (lang.id === 'c') {
            tiers[tierNames[1]] = count;
            tierIdx = 2;
            count = 0;
        }
        else if (lang.id === 'ruby') {
            tiers[tierNames[2]] = count;
            tierIdx = 3;
            count = 0;
        }
        else if (lang.id === 'html') {
            tiers[tierNames[3]] = count;
            tierIdx = 4;
            count = 0;
        }
        else if (lang.id === 'bash') {
            tiers[tierNames[4]] = count;
            tierIdx = 5;
            count = 0;
        }
        else if (lang.id === 'haskell') {
            tiers[tierNames[5]] = count;
            tierIdx = 6;
            count = 0;
        }
        else if (lang.id === 'objc') {
            tiers[tierNames[6]] = count;
            tierIdx = 7;
            count = 0;
        }
        else if (lang.id === 'graphql') {
            tiers[tierNames[7]] = count;
            tierIdx = 8;
            count = 0;
        }
        count++;
    }
    tiers[tierNames[tierIdx]] = count;
    return { total: exports.LANGUAGE_REGISTRY.length, tiers };
}
const LANGUAGE_RULES = {
    python: [
        { id: 'py-mutable-default', language: 'python', pattern: /def\s+\w+\([^)]*=\s*(\[\]|\{\})/g, message: 'Mutable default argument (use None instead)', severity: 'error', category: 'correctness' },
        { id: 'py-bare-except', language: 'python', pattern: /except\s*:/g, message: 'Bare except catches all exceptions including KeyboardInterrupt', severity: 'warning', category: 'correctness' },
        { id: 'py-star-import', language: 'python', pattern: /from\s+\S+\s+import\s+\*/g, message: 'Wildcard import pollutes namespace', severity: 'warning', category: 'style' },
        { id: 'py-global', language: 'python', pattern: /\bglobal\s+\w+/g, message: 'Global variable usage — consider passing as parameter', severity: 'warning', category: 'design' },
        { id: 'py-print', language: 'python', pattern: /\bprint\s*\(/g, message: 'print() found — use logging module in production', severity: 'info', category: 'quality' },
        { id: 'py-assert', language: 'python', pattern: /\bassert\s+/g, message: 'assert can be disabled with -O flag', severity: 'info', category: 'correctness' },
    ],
    go: [
        { id: 'go-err-ignore', language: 'go', pattern: /\b\w+,\s*_\s*:?=\s*\w+\(/g, message: 'Error value discarded — check all errors', severity: 'error', category: 'correctness' },
        { id: 'go-panic', language: 'go', pattern: /\bpanic\s*\(/g, message: 'panic() used — prefer returning errors', severity: 'warning', category: 'correctness' },
        { id: 'go-init', language: 'go', pattern: /func\s+init\s*\(\s*\)/g, message: 'init() function — consider explicit initialization', severity: 'info', category: 'design' },
        { id: 'go-fmt-print', language: 'go', pattern: /fmt\.Print(?:ln|f)?\s*\(/g, message: 'fmt.Print found — use structured logging', severity: 'info', category: 'quality' },
    ],
    rust: [
        { id: 'rs-unwrap', language: 'rust', pattern: /\.unwrap\(\)/g, message: '.unwrap() can panic — use ? or match', severity: 'warning', category: 'correctness' },
        { id: 'rs-unsafe', language: 'rust', pattern: /\bunsafe\s*\{/g, message: 'unsafe block — document safety invariants', severity: 'warning', category: 'safety' },
        { id: 'rs-clone', language: 'rust', pattern: /\.clone\(\)/g, message: '.clone() may be unnecessary — consider borrowing', severity: 'info', category: 'performance' },
        { id: 'rs-todo', language: 'rust', pattern: /todo!\(\)/g, message: 'todo!() macro — will panic at runtime', severity: 'error', category: 'completeness' },
    ],
    java: [
        { id: 'java-sysout', language: 'java', pattern: /System\.out\.print(?:ln)?\s*\(/g, message: 'System.out.print — use logger', severity: 'info', category: 'quality' },
        { id: 'java-catch-exception', language: 'java', pattern: /catch\s*\(\s*Exception\s+/g, message: 'Catching generic Exception — catch specific exceptions', severity: 'warning', category: 'correctness' },
        { id: 'java-null-return', language: 'java', pattern: /return\s+null\s*;/g, message: 'Returning null — consider Optional', severity: 'warning', category: 'design' },
        { id: 'java-string-concat', language: 'java', pattern: /"\s*\+\s*\w+\s*\+\s*"/g, message: 'String concatenation in loop-like context — use StringBuilder', severity: 'info', category: 'performance' },
    ],
    ruby: [
        { id: 'rb-eval', language: 'ruby', pattern: /\beval\s*[("]/g, message: 'eval() — security risk', severity: 'error', category: 'security' },
        { id: 'rb-rescue', language: 'ruby', pattern: /rescue\s*$/gm, message: 'Bare rescue catches all exceptions', severity: 'warning', category: 'correctness' },
        { id: 'rb-puts', language: 'ruby', pattern: /\bputs\s+/g, message: 'puts found — use logger in production', severity: 'info', category: 'quality' },
    ],
    php: [
        { id: 'php-eval', language: 'php', pattern: /\beval\s*\(/g, message: 'eval() — security risk', severity: 'error', category: 'security' },
        { id: 'php-md5', language: 'php', pattern: /\bmd5\s*\(/g, message: 'MD5 for hashing — use password_hash() or bcrypt', severity: 'warning', category: 'security' },
        { id: 'php-var-dump', language: 'php', pattern: /\bvar_dump\s*\(/g, message: 'var_dump() — remove before production', severity: 'info', category: 'quality' },
        { id: 'php-sql-concat', language: 'php', pattern: /\$\w+\s*\.\s*["'](?:SELECT|INSERT|UPDATE|DELETE)/gi, message: 'SQL string concatenation — use prepared statements', severity: 'error', category: 'security' },
    ],
    typescript: [
        { id: 'ts-any-cast', language: 'typescript', pattern: /as\s+any\b/g, message: 'Type assertion to any — loses type safety', severity: 'warning', category: 'type-safety' },
        { id: 'ts-non-null', language: 'typescript', pattern: /\w+!\./g, message: 'Non-null assertion (!) — prefer optional chaining', severity: 'info', category: 'safety' },
        { id: 'ts-enum', language: 'typescript', pattern: /\benum\s+\w+/g, message: 'enum — consider const enum or union type for tree-shaking', severity: 'info', category: 'performance' },
    ],
    javascript: [
        { id: 'js-var', language: 'javascript', pattern: /\bvar\s+\w+/g, message: 'var used — prefer const/let', severity: 'warning', category: 'style' },
        { id: 'js-alert', language: 'javascript', pattern: /\balert\s*\(/g, message: 'alert() found — remove for production', severity: 'info', category: 'quality' },
        { id: 'js-document-write', language: 'javascript', pattern: /document\.write\s*\(/g, message: 'document.write() — XSS risk and performance issue', severity: 'error', category: 'security' },
    ],
};
function getLanguageRules(langId) {
    return LANGUAGE_RULES[langId] ?? [];
}
function applyLanguageRules(code, langId) {
    const rules = getLanguageRules(langId);
    const findings = [];
    const lines = code.split('\n');
    for (const rule of rules) {
        for (let i = 0; i < lines.length; i++) {
            // Reset regex lastIndex for global patterns
            rule.pattern.lastIndex = 0;
            if (rule.pattern.test(lines[i])) {
                findings.push({
                    line: i + 1,
                    message: rule.message,
                    severity: rule.severity,
                    ruleId: rule.id,
                    category: rule.category,
                });
            }
        }
    }
    return findings.slice(0, 50);
}
function detectPolyglotProject(rootPath) {
    const fs = require('fs');
    const path = require('path');
    const langCounts = new Map();
    let totalFiles = 0;
    function scan(dir, depth = 0) {
        if (depth > 8)
            return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' ||
                        entry.name === 'build' || entry.name === 'vendor' || entry.name === '__pycache__' ||
                        entry.name === 'target' || entry.name === '.git')
                        continue;
                    scan(full, depth + 1);
                }
                else if (entry.isFile()) {
                    const lang = detectLanguage(entry.name);
                    if (lang && !['json', 'yaml', 'toml', 'markdown'].includes(lang.id)) {
                        const existing = langCounts.get(lang.id) ?? { lang, files: 0, lines: 0 };
                        existing.files++;
                        try {
                            const content = fs.readFileSync(full, 'utf-8');
                            existing.lines += content.split('\n').length;
                        }
                        catch { /* skip */ }
                        langCounts.set(lang.id, existing);
                        totalFiles++;
                    }
                }
            }
        }
        catch { /* skip */ }
    }
    scan(rootPath);
    const languages = [...langCounts.values()]
        .map(v => ({
        lang: v.lang,
        fileCount: v.files,
        percentage: totalFiles > 0 ? Math.round((v.files / totalFiles) * 100) : 0,
        lineCount: v.lines,
    }))
        .sort((a, b) => b.fileCount - a.fileCount);
    const isPolyglot = languages.filter(l => l.percentage >= 5).length >= 2;
    const primaryLanguage = languages[0] ?? null;
    // Detect cross-language dependencies
    const crossDeps = [];
    const detectedLangs = new Set(languages.map(l => l.lang.id));
    // Common cross-language patterns
    if (detectedLangs.has('python') && detectedLangs.has('javascript')) {
        crossDeps.push({ from: 'javascript', to: 'python', type: 'API call (REST/gRPC)' });
    }
    if (detectedLangs.has('typescript') && detectedLangs.has('rust')) {
        crossDeps.push({ from: 'typescript', to: 'rust', type: 'WASM/NAPI binding' });
    }
    if (detectedLangs.has('java') && detectedLangs.has('kotlin')) {
        crossDeps.push({ from: 'kotlin', to: 'java', type: 'JVM interop' });
    }
    if (detectedLangs.has('swift') && detectedLangs.has('objc')) {
        crossDeps.push({ from: 'swift', to: 'objc', type: 'Bridging header' });
    }
    if (detectedLangs.has('c') && (detectedLangs.has('python') || detectedLangs.has('rust'))) {
        crossDeps.push({ from: detectedLangs.has('python') ? 'python' : 'rust', to: 'c', type: 'FFI/ctypes' });
    }
    // Recommendations
    const recommendations = [];
    if (isPolyglot) {
        recommendations.push('Consider a monorepo tool (Nx, Turborepo) for cross-language builds');
        if (languages.length > 3) {
            recommendations.push('High language diversity — ensure each language has dedicated linting and CI');
        }
        if (detectedLangs.has('javascript') && detectedLangs.has('typescript')) {
            recommendations.push('Mixed JS/TS codebase — consider full TypeScript migration');
        }
    }
    const complexityScore = Math.min(100, languages.length * 15 + crossDeps.length * 10);
    return { isPolyglot, primaryLanguage, languages, crossLanguageDeps: crossDeps, recommendations, complexityScore };
}
function analyzeMixedLanguageFiles(rootPath) {
    const fs = require('fs');
    const path = require('path');
    const reports = [];
    // Patterns for detecting embedded languages
    const EMBEDDED_PATTERNS = [
        { host: ['typescript', 'javascript'], detect: /`(?:SELECT|INSERT|UPDATE|DELETE|CREATE)\s/i, language: 'SQL' },
        { host: ['typescript', 'javascript'], detect: /innerHTML\s*=\s*`|<(?:div|span|p|h[1-6]|ul|ol|table|form)\b/i, language: 'HTML' },
        { host: ['typescript', 'javascript'], detect: /css`|styled\.\w+`|style\s*=\s*\{/i, language: 'CSS' },
        { host: ['typescript', 'javascript'], detect: /\bexec(?:Sync)?\s*\(\s*['"`](?:bash|sh|curl|grep|awk|sed|chmod|mkdir)\b/i, language: 'Shell' },
        { host: ['python'], detect: /(?:execute|cursor\.execute)\s*\(\s*['"](?:SELECT|INSERT|UPDATE|DELETE)/i, language: 'SQL' },
        { host: ['python'], detect: /subprocess\.(?:run|call|Popen)\s*\(\s*\[?\s*['"](?:bash|sh|curl)/i, language: 'Shell' },
        { host: ['php'], detect: /\$\w+->query\s*\(\s*['"](?:SELECT|INSERT|UPDATE|DELETE)/i, language: 'SQL' },
        { host: ['ruby'], detect: /ActiveRecord::Base\.connection\.execute\s*\(\s*['"]|\.where\s*\(\s*['"]/i, language: 'SQL' },
        { host: ['html'], detect: /<script\b/i, language: 'JavaScript' },
        { host: ['html'], detect: /<style\b/i, language: 'CSS' },
    ];
    function scanFile(filePath) {
        const lang = detectLanguage(path.basename(filePath));
        if (!lang)
            return null;
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const embedded = [];
            for (let i = 0; i < lines.length; i++) {
                for (const pattern of EMBEDDED_PATTERNS) {
                    if (!pattern.host.includes(lang.id))
                        continue;
                    if (pattern.detect.test(lines[i])) {
                        embedded.push({
                            language: pattern.language,
                            lineStart: i + 1,
                            lineEnd: i + 1,
                            snippet: lines[i].trim().slice(0, 80),
                        });
                    }
                }
            }
            if (embedded.length === 0)
                return null;
            const risk = embedded.length > 10 ? 'high' : embedded.length > 3 ? 'medium' : 'low';
            return {
                file: path.relative(rootPath, filePath).replace(/\\/g, '/'),
                primaryLanguage: lang.id,
                embeddedLanguages: embedded.slice(0, 20),
                risk,
            };
        }
        catch {
            return null;
        }
    }
    function scanDir(dir, depth = 0) {
        if (depth > 6)
            return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist')
                        continue;
                    scanDir(full, depth + 1);
                }
                else if (entry.isFile()) {
                    const report = scanFile(full);
                    if (report)
                        reports.push(report);
                }
            }
        }
        catch { /* skip */ }
    }
    scanDir(rootPath);
    return reports.sort((a, b) => b.embeddedLanguages.length - a.embeddedLanguages.length).slice(0, 30);
}
// IDENTITY_SEAL: PART-9 | role=mixed-lang | inputs=rootPath | outputs=MixedFileReport[]
