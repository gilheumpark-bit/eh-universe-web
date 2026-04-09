# Security Policy

## Supported Versions

Currently only the `main` branch and the latest released alpha versions are actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within the NOA Code Studio, please report it via private message or encrypted channels directly to the maintainers rather than creating a public issue.

Our commitment:
- We will acknowledge receipt of your vulnerability report within 48 hours.
- We will provide a timeline for addressing the issue via a patch release.
- For verified vulnerabilities, reporters will be listed in our security advisories to provide attribution for your contribution.

### Special Notes regarding `eval`, `exec`
Because NOA Code Studio creates Sandboxed WebContainers and executes code via AI inference, please make sure your security report distinguishes between vulnerabilities impacting the *host Electron main process* and the isolated *renderer/container processes*. Vulnerabilities compromising the context isolation layer or native proxy.ts will be treated as Critical (P0).
