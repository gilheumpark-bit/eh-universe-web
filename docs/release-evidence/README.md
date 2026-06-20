# Loreguard Release Evidence Intake

이 폴더는 Day 0 정적 PASS 이후에도 Release verdict가 HOLD로 남는 외부 실행 증거를 보관한다.

현재 로컬 증거 기준으로 `T10-agent-runner-containment`와 `T13-vector-memory-isolation`은 disabled attestation으로 닫혀 있다. 정식 출시를 막는 상용 핵심 게이트는 `T2-live-stripe-billing`과 `T11-signed-c2pa-external-chain`이다. 나머지 HOLD는 스테이징/프로덕션 재현, CI, 법무, 관측성, 공급망 증거가 첨부되기 전까지 유지한다.

증거 파일은 JSON만 허용한다. 각 파일은 하나의 artifact type을 증명한다.

## Required Shape

```json
{
  "kind": "loreguard.release-evidence.v1",
  "gate": "T15",
  "requirementId": "T15-live-author-session",
  "environment": "staging",
  "artifactType": "live-author-session-run-artifact",
  "generatedAt": "2026-06-12T17:30:00+09:00",
  "source": "https://github.com/org/repo/actions/runs/123456789",
  "summary": "Deployed /studio author session generated and exported Work Receipt package artifacts.",
  "checks": [
    {
      "id": "author-session-package-export",
      "status": "PASS",
      "evidence": "Run artifact contains work-receipt-journal and ip-pack-manifest output hashes."
    }
  ],
  "hashes": [
    {
      "path": "docs/release-evidence/artifacts/work-receipts-example.json",
      "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  ],
  "limitations": [
    "This records the run artifact only. It does not certify copyright ownership or legal compliance."
  ]
}
```

## Rules

- `kind` must be `loreguard.release-evidence.v1`.
- `gate` must match the target T gate.
- `requirementId` must match the scanner requirement id.
- `environment` must be one of `staging`, `production`, `external-ci`, `external-provider`, `legal-review`, `disabled-attestation`.
- `checks` must be non-empty and every check must be `PASS`.
- `hashes` are optional, but every included hash must point to an existing attached file under `docs/release-evidence/artifacts/` and match a 64-character SHA-256 hex digest.
- Evidence JSON and attached artifacts must not contain raw secrets. Redact API keys, service-account private keys, Bearer tokens, webhook signing secrets, GitHub tokens, and provider keys before placing logs in this folder.
- Alternative evidence is evaluated as a complete group, not as any single item. For example, external memory/RAG evidence must include both tenant isolation and stale invalidation replay unless the external-memory-disabled attestation is used.
- Evidence must not claim 인증, 보증, 완전 방어, 100% 저작권 보호, or legal substitution.

## Artifact-Specific Checks

Some gates require exact check IDs, not a generic PASS note.

### T2 live Stripe billing

`live-stripe-replay` must include PASS evidence for:

- `stripe-checkout-completed-event`
- `stripe-webhook-signature-verified`
- `subscription-entitlement-upserted`
- `release-credit-purchase-grant-applied`

`paid-session-e2e` must include PASS evidence for:

- `paid-session-access-granted`
- `release-credit-debit-recorded`
- `client-claim-refresh-observed`

### T11 signed C2PA and provenance chain

`signed-c2pa-manifest-store` must include PASS evidence for:

- `c2pa-manifest-store-signed`
- `c2pa-manifest-store-verifier-pass`
- `c2pa-asset-hash-binding`

`external-provenance-chain` must include PASS evidence for:

- `external-chain-pointer-recorded`
- `external-chain-roundtrip-lookup`

## Commands

```powershell
npm run gate:evidence
npm run gate:evidence:answer
npm run gate:evidence:answer:json
npm run gate:evidence:remaining
npm run gate:evidence:remaining -- --json
npm run gate:evidence -- --write docs/gates/release-evidence-status-2026-06-12.json
npm run gate:evidence -- --fail-on-hold
npm run gate:evidence -- --self-test
npm run gate:evidence:compose -- --self-test
npm run gate:evidence:templates
```

Use `gate:evidence:answer` when you only need the one-line remaining count:

```text
상용 핵심 막힘은 2개, 누락 증거 산출물은 4개입니다. 전체 release evidence HOLD는 14개입니다.
```

Use `gate:evidence:answer:json` when automation needs the numeric fields:

```json
{
  "coreRemainingCount": 2,
  "missingArtifactCount": 4,
  "overallHoldCount": 14
}
```

Write the one-line answer snapshot when you need a dated gate artifact:

```powershell
npm run gate:evidence:answer -- --write docs/gates/release-evidence-answer-2026-06-15.md
npm run gate:evidence:answer:json -- --write docs/gates/release-evidence-answer-2026-06-15.json
```

Current expected state is HOLD until the required external/staging/live evidence files are attached. Do not delete the existing T10/T13 disabled-attestation JSON files unless the retired agent runner or external memory/RAG surface is intentionally reintroduced and replaced with live denial/isolation evidence.

## Current Local Preflight

Use this sequence after local release-hardening work:

```powershell
npm run gate:disabled-attestations
npm run gate:evidence -- --write docs/gates/release-evidence-status-2026-06-12.json
npm run gate:evidence:remaining
npm run check:user-exposure
npx tsc --noEmit --pretty false
```

Expected local state before external evidence is attached:

- `gate:evidence` remains `HOLD`.
- `gate:evidence:remaining` reports 2 core commercial blockers.
- `gate:baseline` may show static blocker count 0 while release evidence is still HOLD.
- T2 cannot pass without real Stripe checkout/webhook/paid-session evidence.
- T11 cannot pass without a signed C2PA Manifest Store verifier result and external provenance-chain lookup evidence.

## Template Workflow

Generate non-scanned templates:

```powershell
npm run gate:evidence:templates
```

This writes `.template.jsonc` files under `docs/release-evidence/templates/`.

Templates are intentionally not counted by `gate:evidence` because the scanner only accepts completed `.json` files with `kind: "loreguard.release-evidence.v1"`.

After a real staging/live/provider/legal/CI run:

1. Pick the matching `.template.jsonc`.
2. Copy it to `docs/release-evidence/<short-evidence-name>.json`.
3. Change `kind` to `loreguard.release-evidence.v1`.
4. Put any local run artifacts under `docs/release-evidence/artifacts/`.
5. Replace all placeholders with concrete source links, timestamps, check evidence, artifact paths, and hashes.
6. Redact raw secrets from every log before attaching it. Keep unredacted originals outside the repo in the provider dashboard or a secret-managed incident store.
7. Set every `checks[].status` to `PASS` only after the evidence is real.
8. Run:

```powershell
npm run gate:evidence -- --write docs/gates/release-evidence-status-2026-06-12.json
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
```

For a single requirement template:

```powershell
node scripts/loreguard-release-evidence-scan.mjs --template T15-live-author-session
node scripts/loreguard-release-evidence-scan.mjs --template T12-live-ai-supply-chain --artifact-type ci-run-artifact
```

Compose a completed evidence file after a real run:

```powershell
npm run gate:evidence:compose -- `
  --template docs/release-evidence/templates/T11-signed-c2pa-external-chain__signed-c2pa-manifest-store.template.jsonc `
  --out docs/release-evidence/t11-signed-c2pa-manifest-store.json `
  --source "https://example.test/run-or-provider-attestation" `
  --check "c2pa-manifest-store-signed=Signed manifest store artifact was produced by the external C2PA tool." `
  --check "c2pa-manifest-store-verifier-pass=Verifier output attached with PASS result." `
  --check "c2pa-asset-hash-binding=Verifier output shows the asset hash binding." `
  --artifact "C:\path\to\signed-manifest-store.c2pa"
```

For Stripe/Firebase replay evidence:

```powershell
npm run gate:evidence:compose -- `
  --template docs/release-evidence/templates/T2-live-stripe-billing__live-stripe-replay.template.jsonc `
  --out docs/release-evidence/t2-live-stripe-replay.json `
  --source "https://dashboard.stripe.com/test/events/evt_..." `
  --check "stripe-checkout-completed-event=checkout.session.completed test event captured." `
  --check "stripe-webhook-signature-verified=Webhook signature verification log attached." `
  --check "subscription-entitlement-upserted=Firestore subscription entitlement update log attached." `
  --check "release-credit-purchase-grant-applied=Release credit purchase-grant ledger entry attached." `
  --artifact "C:\path\to\stripe-replay-log.json"
```
