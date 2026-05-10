# Loreguard VS Code 확장 — 사양서

> # ⚠️ 폐기 (DEPRECATED) — 2026-05-07
>
> **카테고리 모순으로 폐기.**
>
> Loreguard 는 **소설가의 IDE / Novel IDE** 카테고리 창시자.
> 카테고리 창시자가 다른 카테고리(코드 IDE) 의 marketplace 부속 도구로 들어가는 것은
> 자기 카테고리 부정 — VS Code 가 본진, Loreguard 는 lint 부속 으로 읽힘.
>
> **레퍼런스 검증:**
> - VS Code 가 Adobe Creative Cloud marketplace 에 들어가지 않음
> - Logic Pro 가 GarageBand 플러그인으로 들어가지 않음
> - Final Cut Pro 가 iMovie 부속으로 들어가지 않음
>
> **대체 — `docs/novel-ide/external-integration.md`:** CLI (`npx loreguard lint`) + 출판사 CMS API + CI 통합. 외부가 Loreguard 를 호출, Loreguard 가 외부에 흡수되지 않음.
>
> 본 사양서는 **사상사 자료**로만 보존.

---

## 원본 사양 (참조용)

> Loreguard LSP API 의 첫 번째 외부 통합 데모. VS Code Marketplace 출시 → 카테고리 락인 효과.
> 본 문서는 별도 repo 작성 시 참조용.

---

## 0. 결정 사항

| 항목 | 결정 |
|---|---|
| **repo** | `github.com/<owner>/loreguard-vscode` (별도) |
| **이름** | `Loreguard Lint` |
| **publisher** | `loreguard` |
| **카테고리** | Linters / Other |
| **라이선스** | MIT (확장 자체는 OSS) |
| **마켓** | VS Code Marketplace + Open VSX |
| **target host** | VS Code 1.85+ |

---

## 1. 기능 (Phase 1 MVP)

### 1.1 Lint 명령
| 단축키 / 명령 | 동작 |
|---|---|
| `Loreguard: Lint Manuscript` | 활성 파일 → POST /api/lsp/lint → 결과 Output Channel + Problems 패널 표시 |
| `Loreguard: Show Symbol Outline` | POST /api/lsp/symbols → Tree View 사이드바 |
| `Loreguard: Live Diagnostics` | SSE /api/lsp/diagnostics?token=… 구독 → 실시간 알림 |

### 1.2 Diagnostics
- 5축 위반 → `vscode.Diagnostic` 매핑
- severity: error → ERROR / warning → WARNING / info → INFO
- 클릭 시 episodeId × charOffset 로 활성 파일 점프

### 1.3 Status Bar
- 우측 상태바에 `Loreguard: 87/100` 형식 점수 표시
- 클릭 → Lint 재실행

---

## 2. 설정 (settings.json)

```jsonc
{
  "loreguard.apiBaseUrl": "https://ehsu.app",
  "loreguard.apiToken": "lg_lsp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "loreguard.lintOnSave": true,
  "loreguard.liveDiagnostics": false,
  "loreguard.episodeFormat": "auto" // "auto" | "single" | "markdown-headers"
}
```

---

## 3. 파일 형식 인식

### auto
- 파일이 `.md` 이고 `# EP{n}` 헤더가 있으면 → markdown-headers
- 그 외 → single (전체 = EP1)

### markdown-headers
```markdown
# EP1
김준이 검을 휘둘렀다.

# EP2
[떡밥-검은검] 김준은 새로운 검을 보았다.
```

### single
파일 전체를 EP1 으로 처리.

---

## 4. 구조

```
loreguard-vscode/
├── package.json              # extension manifest
├── README.md
├── src/
│   ├── extension.ts          # activate() / 명령 등록
│   ├── lspClient.ts          # fetch wrapper
│   ├── parser.ts             # manuscript.md → episodes
│   ├── diagnostics.ts        # 5축 위반 → vscode.Diagnostic
│   ├── statusBar.ts          # 우측 점수 표시
│   ├── symbolTree.ts         # Symbol Outline TreeView
│   └── sse.ts                # diagnostics SSE 구독
├── tsconfig.json
└── .vscode/launch.json       # debug
```

---

## 5. package.json (extension manifest 초안)

```json
{
  "name": "loreguard-lint",
  "displayName": "Loreguard Lint",
  "description": "Verify novels like code — 5-axis lint via Loreguard LSP",
  "version": "0.1.0",
  "publisher": "loreguard",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Linters", "Other"],
  "keywords": ["novel", "writing", "lint", "loreguard", "ide"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      { "command": "loreguard.lint",        "title": "Loreguard: Lint Manuscript" },
      { "command": "loreguard.symbols",     "title": "Loreguard: Show Symbol Outline" },
      { "command": "loreguard.live",        "title": "Loreguard: Toggle Live Diagnostics" }
    ],
    "configuration": {
      "title": "Loreguard",
      "properties": {
        "loreguard.apiBaseUrl":   { "type": "string", "default": "https://ehsu.app" },
        "loreguard.apiToken":     { "type": "string", "default": "" },
        "loreguard.lintOnSave":   { "type": "boolean", "default": true },
        "loreguard.liveDiagnostics": { "type": "boolean", "default": false },
        "loreguard.episodeFormat": { "type": "string", "enum": ["auto","single","markdown-headers"], "default": "auto" }
      }
    },
    "views": {
      "explorer": [
        { "id": "loreguard.symbolOutline", "name": "Loreguard Symbols" }
      ]
    }
  },
  "activationEvents": [
    "onLanguage:markdown",
    "onCommand:loreguard.lint"
  ],
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

---

## 6. 핵심 코드 골격 (extension.ts)

```typescript
import * as vscode from 'vscode';
import { lintManuscript } from './lspClient';
import { parseEpisodes } from './parser';
import { applyDiagnostics } from './diagnostics';
import { startSse, stopSse } from './sse';

const diagnosticCollection = vscode.languages.createDiagnosticCollection('loreguard');

export function activate(context: vscode.ExtensionContext) {
  // Lint command
  context.subscriptions.push(
    vscode.commands.registerCommand('loreguard.lint', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const cfg = vscode.workspace.getConfiguration('loreguard');
      const token = cfg.get<string>('apiToken');
      if (!token) {
        vscode.window.showErrorMessage('Loreguard: API token not configured.');
        return;
      }
      const text = editor.document.getText();
      const episodes = parseEpisodes(text, cfg.get<string>('episodeFormat') ?? 'auto');
      const result = await lintManuscript({
        baseUrl: cfg.get<string>('apiBaseUrl') ?? 'https://ehsu.app',
        token,
        episodes,
      });
      applyDiagnostics(diagnosticCollection, editor.document, result, episodes);
      vscode.window.showInformationMessage(`Loreguard: ${result.overallScore}/100`);
    }),
  );

  // Lint on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const cfg = vscode.workspace.getConfiguration('loreguard');
      if (!cfg.get<boolean>('lintOnSave')) return;
      if (doc.languageId !== 'markdown') return;
      vscode.commands.executeCommand('loreguard.lint');
    }),
  );

  // Live diagnostics toggle
  context.subscriptions.push(
    vscode.commands.registerCommand('loreguard.live', () => {
      const cfg = vscode.workspace.getConfiguration('loreguard');
      const enabled = !cfg.get<boolean>('liveDiagnostics');
      cfg.update('liveDiagnostics', enabled, vscode.ConfigurationTarget.Global);
      if (enabled) startSse(diagnosticCollection);
      else stopSse();
    }),
  );
}

export function deactivate() {
  diagnosticCollection.dispose();
  stopSse();
}
```

---

## 7. 출시 체크리스트

- [ ] Marketplace publisher account 발급 (loreguard)
- [ ] `vsce` 도구 설치
- [ ] `vsce package` 로 .vsix 빌드 → 로컬 테스트
- [ ] `vsce publish` 로 Marketplace 업로드
- [ ] Open VSX (Eclipse Foundation) 동시 등록
- [ ] README 에 데모 GIF (소설 작성 → 저장 시 lint diagnostic 표시)
- [ ] icon.png (128x128) — Loreguard 로고

---

## 8. 작업 시간 추정

| 단계 | turns |
|---|---|
| repo 초기화 + manifest | 1 |
| LSP client + parser | 2 |
| Diagnostics 매핑 | 1 |
| Status Bar + 명령 | 1 |
| Symbol TreeView | 2 |
| SSE 구독 | 1 |
| 로컬 데모 + .vsix 빌드 | 1 |
| **합계** | **9 turns / ~50 분** |

Marketplace 출시는 별도 (publisher 가입 등 외부 절차).

---

## 9. 검증

- `npm run compile` 통과
- 로컬 .vsix 설치 → 샘플 manuscript.md 로 lint 명령 → Problems 패널 표시 확인
- Status Bar 점수 표시 확인
- Live Diagnostics 토글 → SSE heartbeat 수신 확인
