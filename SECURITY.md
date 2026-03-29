# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.1.x   | :white_check_mark: Full support |
| 1.0.x   | :warning: Limited support (critical fixes only) |
| < 1.0   | :x: Not supported  |

## Reporting a Vulnerability

If you discover a security vulnerability in EH Universe Web, please report it responsibly.

### How to Report

1. **Email**: Send a detailed report to **security@eh-universe.dev**
2. **Subject line**: `[SECURITY] Brief description of the issue`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

### Response Timeline

| Stage | Timeframe |
|-------|-----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 5 business days |
| Status update | Every 7 days until resolved |
| Fix release | Depends on severity (critical: 72h, high: 2 weeks, medium/low: next release) |

### What to Expect

- You will receive an acknowledgment within 48 hours confirming receipt.
- We will investigate and provide an initial assessment within 5 business days.
- If the vulnerability is accepted, we will work on a fix and coordinate disclosure.
- If the vulnerability is declined, we will provide a detailed explanation.

## Security Scope

The following are considered in-scope vulnerabilities:

- **Authentication/Authorization bypass** in Firebase Auth integration
- **Cross-Site Scripting (XSS)** in user-generated content or AI responses
- **API key exposure** through client-side code or network requests
- **Rate limit bypass** on server-side API routes
- **Injection attacks** via AI prompt inputs or structured generation
- **Data leakage** of user manuscripts, session data, or API keys stored in localStorage
- **CSRF/SSRF** on API endpoints
- **Insecure data storage** exposing sensitive user information

## Out of Scope

The following items are **not** considered vulnerabilities for this project:

- Vulnerabilities in third-party services (Firebase, Vercel, AI providers) -- report these to the respective vendors
- Rate limiting on client-side AI providers when using BYOK (Bring Your Own Key)
- Self-XSS or attacks requiring physical access to the user's browser
- Issues requiring social engineering
- Denial of Service (DoS) attacks against Vercel infrastructure
- Content quality issues in AI-generated text
- Browser extensions or plugins interfering with the application
- Vulnerabilities in unsupported versions (< 1.0)

## Responsible Disclosure Policy

- **Do not** publicly disclose the vulnerability before a fix is available.
- **Do not** exploit the vulnerability beyond what is necessary to demonstrate it.
- **Do not** access or modify other users' data.
- **Do** provide sufficient detail for us to reproduce and fix the issue.
- **Do** give us reasonable time to address the vulnerability before disclosure.

We are committed to working with security researchers and will not pursue legal action against those who discover and report vulnerabilities in good faith following this policy.

## Security Best Practices for Contributors

- Never commit API keys or secrets to the repository.
- Use environment variables (`NEXT_PUBLIC_*` for client, server-only for API keys).
- All API routes must use the rate limiter middleware.
- User input displayed in the UI must be sanitized.
- AI-generated content must be rendered safely (no `dangerouslySetInnerHTML` with raw AI output).
