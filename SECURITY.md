# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x-beta | Yes |
| < 0.1 | No |

## Reporting a Vulnerability

**Do not open a public issue.** Report via GitHub private vulnerability reporting or email the maintainer directly.

- Acknowledgment within 48 hours
- Timeline for fix provided within 1 week
- Attribution in security advisories for verified reports

## Security Architecture

### API Key Protection

- Keys stored in OS keychain via `electron.safeStorage` (DPAPI on Windows, Keychain on macOS, libsecret on Linux)
- Renderer process can SET/HAS/LIST/DELETE keys but **never GET**
- `window.cs.keystore` exposes no decryption to the renderer
- XSS cannot exfiltrate API keys by design

### Process Isolation

- `contextIsolation: true` — renderer has no access to Node.js APIs
- `nodeIntegration: false` — no `require()` in renderer
- All privileged operations go through the preload bridge (`window.cs`)
- Preload exposes only typed, narrow methods

### Content Security

- Production builds: `Cross-Origin-Embedder-Policy: require-corp` + `Cross-Origin-Opener-Policy: same-origin`
- External links open in default browser (not in-app)
- No `eval()`, `new Function()` in application code
- Design transpiler has FORBIDDEN_PATTERN blocklist

### MCP Server Security

- MCP servers run as child processes with inherited env only
- No automatic execution of tools — user must configure servers explicitly
- Server configs stored in `userData/mcp-servers.json` (not in renderer localStorage)
- Max 3 auto-restarts before marking server as failed

### Severity Classification

| Severity | Description |
|----------|-------------|
| P0 Critical | Context isolation bypass, main process compromise, key exfiltration |
| P1 High | Arbitrary file write outside project scope, remote code execution in renderer |
| P2 Medium | Information disclosure, denial of service, sandbox escape |
| P3 Low | UI redressing, non-exploitable edge cases |

## Known Limitations

- `sandbox: false` on renderer window (required for preload Node APIs like chokidar)
- `forceCodeSigning: false` in electron-builder (no code signing certificate yet)
- Local Ollama connections are unencrypted HTTP (localhost only)
