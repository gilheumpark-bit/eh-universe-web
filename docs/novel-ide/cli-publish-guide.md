# Loreguard CLI — npm publish 가이드

> **B-3 / 별도 npm package `@loreguard/cli` 설정 가이드.**
> 코드는 본 repo 안에 있지만, npm publish 는 별도 dist 빌드 + manifest 필요.
> 카테고리 정합 ✓ — 작가 워크플로우(CLI) → Loreguard 호출 방향.

---

## 1. 구조

```
eh-universe-web/
├── src/cli/
│   ├── bin/loreguard.ts         # entry — bin
│   ├── commands/
│   │   ├── lint-novel.ts        # lint subcommand
│   │   ├── simulate-novel.ts    # simulate subcommand
│   │   └── symbols-novel.ts     # symbols subcommand
│   └── loreguard-cli-package.json  # publish source manifest
└── docs/novel-ide/
    ├── lsp-spec.md
    ├── external-integration.md
    └── cli-publish-guide.md     # 본 문서
```

---

## 2. 빌드 (별도 tsconfig.cli.json 필요)

`tsconfig.cli.json` (신설 권장):
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist/cli",
    "rootDir": "src/cli",
    "module": "ES2022",
    "target": "ES2020",
    "declaration": true,
    "noEmit": false,
    "isolatedModules": false
  },
  "include": ["src/cli/**/*"],
  "exclude": ["src/cli/**/__tests__/**"]
}
```

빌드:
```bash
npx tsc -p tsconfig.cli.json
```

---

## 3. publish

```bash
# 1. dist/cli/package.json 으로 manifest 복사
cp src/cli/loreguard-cli-package.json dist/cli/package.json

# 2. README + LICENSE 복사
cp docs/novel-ide/lsp-spec.md dist/cli/README.md
cp LICENSE dist/cli/LICENSE

# 3. publish
cd dist/cli && npm publish
```

---

## 4. 사용자 설치

```bash
npm install -g @loreguard/cli
loreguard --help
```

---

## 5. CI 통합

GitHub Actions:
```yaml
- uses: actions/setup-node@v4
  with: { node-version: '20' }
- run: npm install -g @loreguard/cli
- run: loreguard lint manuscript.md
  env:
    LOREGUARD_LSP_TOKEN: ${{ secrets.LOREGUARD_TOKEN }}
```

또는 `.github/actions/loreguard-lint/action.yml` (이미 작성됨):
```yaml
- uses: ./.github/actions/loreguard-lint
  with:
    manuscript: 'manuscript.md'
    token: ${{ secrets.LOREGUARD_TOKEN }}
    threshold: 70
```

---

## 6. Pre-commit hook

`.git/hooks/pre-commit`:
```bash
#!/usr/bin/env bash
exec scripts/loreguard-pre-commit.sh
```

또는 husky:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "scripts/loreguard-pre-commit.sh"
    }
  }
}
```

---

## 7. 다음 단계 (외부 절차)

- [ ] npm organization 'loreguard' 생성
- [ ] publisher 토큰 발급
- [ ] dist 빌드 검증
- [ ] semver 0.1.0 → 1.0.0 (안정화 후)
- [ ] CHANGELOG.md
- [ ] examples/ 추가 (.github/actions 사용 예시 manuscript.md 샘플)

본 문서 = 코드 작업 완료 표시. 외부 절차는 publish 시점 처리.
