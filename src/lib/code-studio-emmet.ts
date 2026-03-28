// ============================================================
// PART 1 — CSS Abbreviation Map
// ============================================================
// Ported from CSL IDE emmet-provider.ts

type MonacoModule = typeof import("monaco-editor");

const CSS_ABBREVIATIONS: Record<string, string> = {
  d: "display: ", dn: "display: none;", db: "display: block;", df: "display: flex;", dg: "display: grid;", dib: "display: inline-block;", di: "display: inline;",
  fxd: "flex-direction: ", fxdr: "flex-direction: row;", fxdc: "flex-direction: column;", fxw: "flex-wrap: wrap;",
  jc: "justify-content: ", jcc: "justify-content: center;", jcsb: "justify-content: space-between;", jcsa: "justify-content: space-around;", jcfs: "justify-content: flex-start;", jcfe: "justify-content: flex-end;",
  ai: "align-items: ", aic: "align-items: center;", aifs: "align-items: flex-start;", aife: "align-items: flex-end;", ais: "align-items: stretch;",
  fg: "flex-grow: ", fg1: "flex-grow: 1;", fs: "flex-shrink: ", fs0: "flex-shrink: 0;",
  pos: "position: ", posa: "position: absolute;", posr: "position: relative;", posf: "position: fixed;", poss: "position: sticky;",
  m: "margin: ", mt: "margin-top: ", mr: "margin-right: ", mb: "margin-bottom: ", ml: "margin-left: ", mx: "margin-left: ; margin-right: ;", my: "margin-top: ; margin-bottom: ;", ma: "margin: auto;",
  p: "padding: ", pt: "padding-top: ", pr: "padding-right: ", pb: "padding-bottom: ", pl: "padding-left: ", px: "padding-left: ; padding-right: ;", py: "padding-top: ; padding-bottom: ;",
  w: "width: ", w100: "width: 100%;", h: "height: ", h100: "height: 100%;", mw: "max-width: ", mh: "max-height: ", miw: "min-width: ", mih: "min-height: ",
  fz: "font-size: ", fw: "font-weight: ", fwb: "font-weight: bold;", fwn: "font-weight: normal;", ff: "font-family: ",
  ta: "text-align: ", tac: "text-align: center;", tal: "text-align: left;", tar: "text-align: right;",
  td: "text-decoration: ", tdn: "text-decoration: none;", tdu: "text-decoration: underline;",
  tt: "text-transform: ", ttu: "text-transform: uppercase;", ttl: "text-transform: lowercase;",
  lh: "line-height: ", ls: "letter-spacing: ",
  c: "color: ", bg: "background: ", bgc: "background-color: ", op: "opacity: ",
  bd: "border: ", bdn: "border: none;", bdrs: "border-radius: ", bdc: "border-color: ", bdw: "border-width: ",
  ov: "overflow: ", ovh: "overflow: hidden;", ova: "overflow: auto;", ovs: "overflow: scroll;",
  cur: "cursor: ", curp: "cursor: pointer;", curd: "cursor: default;",
  v: "visibility: ", vh: "visibility: hidden;", zi: "z-index: ",
  trs: "transition: ", trf: "transform: ", bs: "box-shadow: ", bxz: "box-sizing: border-box;",
};

// IDENTITY_SEAL: PART-1 | role=CSS abbreviation map | inputs=none | outputs=abbreviation→expansion

// ============================================================
// PART 2 — HTML Snippets & Abbreviation Parser
// ============================================================

const HTML_SNIPPETS: Record<string, string> = {
  "!": `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  \${1}\n</body>\n</html>`,
  "link:css": '<link rel="stylesheet" href="${1:style.css}">',
  "script:src": '<script src="${1:script.js}"></script>',
  "a:link": '<a href="${1:url}">${2:Link}</a>',
  "img": '<img src="${1}" alt="${2}">',
  "btn": '<button type="${1:button}">${2:Button}</button>',
  "form:post": '<form action="${1}" method="post">\n  ${2}\n</form>',
};

const SELF_CLOSING_TAGS = new Set(["img", "br", "hr", "input", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr"]);

interface EmmetNode { tag: string; id: string; classes: string[]; text: string; count: number; children: EmmetNode[]; siblings: EmmetNode[]; }

function parseAbbreviation(abbr: string): EmmetNode | null {
  try { return parseExpression(abbr, 0).node; } catch { return null; }
}

function parseExpression(abbr: string, pos: number): { node: EmmetNode; pos: number } {
  const { node, pos: initPos } = parseElement(abbr, pos);
  let p = initPos;
  while (p < abbr.length) {
    if (abbr[p] === ">") { p++; const child = parseExpression(abbr, p); node.children.push(child.node); p = child.pos; }
    else if (abbr[p] === "+") { p++; const sibling = parseExpression(abbr, p); node.siblings.push(sibling.node); p = sibling.pos; }
    else if (abbr[p] === ")") break;
    else break;
  }
  return { node, pos: p };
}

function parseElement(abbr: string, pos: number): { node: EmmetNode; pos: number } {
  const node: EmmetNode = { tag: "div", id: "", classes: [], text: "", count: 1, children: [], siblings: [] };
  let p = pos;

  if (p < abbr.length && abbr[p] === "(") {
    p++;
    const inner = parseExpression(abbr, p);
    p = inner.pos;
    if (p < abbr.length && abbr[p] === ")") p++;
    if (p < abbr.length && abbr[p] === "*") {
      p++;
      let numStr = "";
      while (p < abbr.length && /\d/.test(abbr[p])) { numStr += abbr[p]; p++; }
      inner.node.count = parseInt(numStr, 10) || 1;
    }
    return { node: inner.node, pos: p };
  }

  let tag = "";
  while (p < abbr.length && /[a-zA-Z0-9]/.test(abbr[p])) { tag += abbr[p]; p++; }
  if (tag) node.tag = tag;

  while (p < abbr.length) {
    if (abbr[p] === "#") { p++; let id = ""; while (p < abbr.length && /[a-zA-Z0-9_-]/.test(abbr[p])) { id += abbr[p]; p++; } node.id = id; }
    else if (abbr[p] === ".") { p++; let cls = ""; while (p < abbr.length && /[a-zA-Z0-9_-]/.test(abbr[p])) { cls += abbr[p]; p++; } if (cls) node.classes.push(cls); }
    else if (abbr[p] === "{") { p++; let text = ""; let depth = 1; while (p < abbr.length && depth > 0) { if (abbr[p] === "{") depth++; else if (abbr[p] === "}") { depth--; if (depth === 0) { p++; break; } } text += abbr[p]; p++; } node.text = text; }
    else if (abbr[p] === "*") { p++; let numStr = ""; while (p < abbr.length && /\d/.test(abbr[p])) { numStr += abbr[p]; p++; } node.count = parseInt(numStr, 10) || 1; }
    else break;
  }
  return { node, pos: p };
}

// IDENTITY_SEAL: PART-2 | role=HTML snippet + abbreviation parser | inputs=abbreviation string | outputs=EmmetNode tree

// ============================================================
// PART 3 — Renderer & Expand Functions
// ============================================================

function renderNode(node: EmmetNode, indent: string, isJSX: boolean): string {
  const lines: string[] = [];
  for (let i = 0; i < node.count; i++) {
    const tag = node.tag;
    const isSelfClosing = SELF_CLOSING_TAGS.has(tag);
    const attrs: string[] = [];
    if (node.id) attrs.push(`id="${node.id}"`);
    if (node.classes.length > 0) attrs.push(`${isJSX ? "className" : "class"}="${node.classes.join(" ")}"`);
    const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";

    if (isSelfClosing) {
      lines.push(`${indent}<${tag}${attrStr}${isJSX ? " /" : ""}>`);
    } else {
      const childContent: string[] = [];
      for (const child of node.children) childContent.push(renderNode(child, indent + "  ", isJSX));
      if (childContent.length > 0) { lines.push(`${indent}<${tag}${attrStr}>`); lines.push(...childContent); lines.push(`${indent}</${tag}>`); }
      else if (node.text) { lines.push(`${indent}<${tag}${attrStr}>${node.text}</${tag}>`); }
      else { lines.push(`${indent}<${tag}${attrStr}></${tag}>`); }
    }
  }
  for (const sibling of node.siblings) lines.push(renderNode(sibling, indent, isJSX));
  return lines.join("\n");
}

function expandCSSAbbreviation(abbr: string): string | null {
  if (CSS_ABBREVIATIONS[abbr]) return CSS_ABBREVIATIONS[abbr];
  const numMatch = abbr.match(/^([a-z]+)(\d+(?:-\d+)*)$/);
  if (numMatch) {
    const [, prop, nums] = numMatch;
    const values = nums.split("-").map((n) => `${n}px`).join(" ");
    const propMap: Record<string, string> = {
      m: "margin", mt: "margin-top", mr: "margin-right", mb: "margin-bottom", ml: "margin-left",
      p: "padding", pt: "padding-top", pr: "padding-right", pb: "padding-bottom", pl: "padding-left",
      w: "width", h: "height", t: "top", r: "right", b: "bottom", l: "left",
      fz: "font-size", fw: "font-weight", lh: "line-height", ls: "letter-spacing",
      bdrs: "border-radius", bdw: "border-width", zi: "z-index", op: "opacity",
      mw: "max-width", mh: "max-height", gap: "gap",
    };
    if (propMap[prop]) return `${propMap[prop]}: ${values};`;
  }
  return null;
}

/** Expand an Emmet abbreviation to HTML/JSX/CSS. */
export function expandAbbreviation(abbr: string, language: string): string {
  if (HTML_SNIPPETS[abbr]) return HTML_SNIPPETS[abbr].replace(/\$\{\d+(?::([^}]*))?\}/g, (_m, def) => def || "");
  if (language === "css" || language === "scss" || language === "less") {
    const cssResult = expandCSSAbbreviation(abbr);
    if (cssResult) return cssResult;
  }
  const isJSX = ["javascript", "typescript", "javascriptreact", "typescriptreact"].includes(language);
  const node = parseAbbreviation(abbr);
  if (!node) return abbr;
  return renderNode(node, "", isJSX);
}

// IDENTITY_SEAL: PART-3 | role=Emmet expansion | inputs=abbreviation,language | outputs=expanded code string

// ============================================================
// PART 4 — Monaco Completion Provider Registration
// ============================================================

/** Register Emmet completion provider for Monaco (HTML/JSX/CSS). */
export function registerEmmetProvider(monaco: MonacoModule): { dispose: () => void } {
  const disposables: { dispose: () => void }[] = [];
  const htmlLanguages = ["html", "javascript", "typescript", "javascriptreact", "typescriptreact"];
  const cssLanguages = ["css", "scss", "less"];
  const allLanguages = [...htmlLanguages, ...cssLanguages];

  for (const lang of allLanguages) {
    const disposable = monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: [">", "+", "*", ".", "#", "{", "("],
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        const abbrMatch = textBeforeCursor.match(/([a-zA-Z][a-zA-Z0-9.#>+*(){}\-:]*[a-zA-Z0-9})])$/);
        if (!abbrMatch) return { suggestions: [] };

        const abbr = abbrMatch[1];
        if (abbr.length < 2) return { suggestions: [] };

        const language = model.getLanguageId();
        const isCSSLang = cssLanguages.includes(language);
        const suggestions: import("monaco-editor").languages.CompletionItem[] = [];
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column - abbr.length,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };

        if (isCSSLang) {
          const cssResult = expandCSSAbbreviation(abbr);
          if (cssResult) {
            suggestions.push({
              label: abbr, kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: cssResult, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: `Emmet: ${cssResult}`, range, sortText: "0",
            });
          }
        }

        if (HTML_SNIPPETS[abbr]) {
          suggestions.push({
            label: abbr, kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: HTML_SNIPPETS[abbr], insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: `Emmet snippet`, range, sortText: "0",
          });
        }

        if (!isCSSLang) {
          const isJSX = htmlLanguages.slice(1).includes(language);
          const node = parseAbbreviation(abbr);
          if (node && node.tag !== abbr) {
            const expanded = renderNode(node, "", isJSX);
            if (expanded && expanded !== abbr) {
              suggestions.push({
                label: abbr, kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: expanded, insertTextRules: monaco.languages.CompletionItemInsertTextRule.None,
                detail: `Emmet: ${expanded.split("\n")[0]}`, range, sortText: "0",
              });
            }
          }
        }
        return { suggestions };
      },
    });
    disposables.push(disposable);
  }
  return { dispose: () => disposables.forEach((d) => d.dispose()) };
}

// IDENTITY_SEAL: PART-4 | role=Monaco Emmet provider | inputs=monaco instance | outputs=completion provider disposable
