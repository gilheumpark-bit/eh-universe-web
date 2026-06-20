# Loreguard Web Architecture

Last updated: 2026-06-16

This root file is intentionally short. The canonical architecture document is
`docs/ARCHITECTURE.md`.

## Active Product Surface

- Loreguard Studio: `/studio`
- Translation Studio: `/translation-studio`
- Docs and public pages: `/docs`, `/about`, `/pricing`, `/status`, `/changelog`
- Legal and support pages: `/terms`, `/privacy`, `/copyright`, `/ai-disclosure`, `/cookies`, `/refund`, `/verify`

## Removed Surface Rule

Former experimental surfaces are not active product promises and must not be
documented as current app areas. Their old route names are kept only in blocked
route tests, redirects, cleanup notes, or explicit historical records.

Use `docs/ARCHITECTURE.md` for current implementation details.
