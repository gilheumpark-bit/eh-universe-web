# 0015. Release Evidence Gates Separate Code Cleanliness From Launch Readiness

- Status: Accepted
- Date: 2026-06-21
- Deciders: Loreguard engineering

## Context

Static checks can prove that the local codebase has no current blockers, but they cannot prove live checkout, external registry lookup, deployed destructive recovery, legal review, or C2PA-ready external-chain behavior.

The Day 0 gate therefore reports two outcomes:

- local static baseline
- release evidence verdict

This avoids the common failure mode where green tests are mistaken for commercial launch readiness.

## Decision

Keep `npm run gate:baseline` split into:

- `Day 0 static baseline: PASS/FAIL`
- `Release verdict: PASS/HOLD`

The release verdict remains `HOLD` until external/staging evidence files are attached and the evidence gate passes.

## Rationale

- Prevents false confidence from local-only validation.
- Makes investor/demo readiness distinct from public launch readiness.
- Keeps destructive workflow, payment, provenance, and legal evidence explicit.

## Consequences

- Positive: release reports are harder to overclaim.
- Positive: developers can still merge local code improvements while release evidence remains pending.
- Trade-off: the product may look “not done” even when local code quality is clean. That is intentional.

## Alternatives

- Collapse all gates into one PASS/FAIL — rejected because it hides why launch is blocked.
- Remove evidence gates until beta — rejected because trust/provenance is a core product promise.

