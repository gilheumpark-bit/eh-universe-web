# 0014. Visual Generation Endpoint Is Internal Opt-In

- Status: Accepted
- Date: 2026-06-21
- Deciders: Loreguard engineering

## Context

Loreguard Studio currently positions visual work as notes, references, and external handoff material. The product surface should not promise in-app image creation while the visual tab says the app does not create images internally.

The legacy `/api/image-gen` route is still useful for development experiments and provider compatibility checks, but leaving the flag enabled by default creates a product-contract mismatch.

## Decision

`IMAGE_GENERATION` defaults to `false`.

The route and client service short-circuit unless `NEXT_PUBLIC_FF_IMAGE_GENERATION=true` or the local feature override explicitly enables it. The route copy uses neutral visual-endpoint language instead of public image-generation sales language.

## Rationale

- Public product language stays aligned with the current “visual brief / handoff” flow.
- Internal testing remains possible without reviving a visible feature.
- Default-off protects cost, provider policy, and user-expectation boundaries.

## Consequences

- Positive: no accidental in-app visual generation promise.
- Positive: tests now cover both default-disabled and explicit opt-in behavior.
- Trade-off: developers must enable the flag when testing visual provider routes.

## Alternatives

- Delete `/api/image-gen` — rejected because it removes useful internal test coverage and future integration scaffolding.
- Keep default-on and hide UI only — rejected because hidden-but-active behavior invites stale product promises.

