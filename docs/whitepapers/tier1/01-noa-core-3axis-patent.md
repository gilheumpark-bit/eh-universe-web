# NOA Core 3-Axis Patent — Whitepaper Tier 1

**Status:** Implementation evidence as of M4 (2026-04-19)
**Implementation reference:** `docs/origin-tagging-spec.md`

## Executive Summary

NOA Core 3-Axis defines three orthogonal axes that any responsible AI authoring
system must track at the per-field level:

1. **Persona** — who/what produced this value (Author / Template / Engine-Suggest / Engine-Draft)
2. **Sovereignty** — author authority is highest, engine output is downgraded by default
3. **Audit** — every edit is recorded with origin, timestamp, and source reference

Loreguard M4 ships the first production implementation of these axes for the
novel scene-sheet (14+ fields). Patent is no longer a paper diagram — it is
reproducible code with 97 unit tests + 4 E2E scenarios passing.

## Axis 1 — Persona

Each scene-sheet field carries an `EntryOrigin` enum:

```ts
type EntryOrigin = 'USER' | 'TEMPLATE' | 'ENGINE_SUGGEST' | 'ENGINE_DRAFT';
```

Implementation: `src/lib/studio-types.ts`

| Persona          | Source                                     |
|------------------|--------------------------------------------|
| `USER`           | Author keyboard input                      |
| `TEMPLATE`       | System default (e.g. genre preset)         |
| `ENGINE_SUGGEST` | Engine-generated, author-accepted          |
| `ENGINE_DRAFT`   | Engine-generated, awaiting author confirm  |

**Patent claim 1:** No engine output may share the same persona slot as an
author-accepted value. The `ENGINE_DRAFT` persona is a quarantine state until
explicit author promotion.

## Axis 2 — Sovereignty

Author authority overrides all other personas. Implementation enforces this in
three places:

### Pipeline (engine prompt)

```
[USER] 작가 직접 입력 — 우선 존중. 그대로 반영하라.
[ENGINE_DRAFT] 엔진 미확정 초안 — 그대로 따라 쓰지 말고 작가 의도 추정.
```

(`src/engine/pipeline.ts` — `buildOriginGuide`)

### Quality Gate (scoring)

```ts
if (userPct >= 80) directorScore += 10;       // sovereignty bonus
if (userPct < 30)  directorScore -= 10;       // engine-dependence penalty
```

(`src/engine/quality-gate.ts` — `computeAuthorLeadAdjustment`)

### Promotion (manual override)

```ts
tracker.acceptEngineContent(sceneDir, 'cliffhanger');
// ENGINE_DRAFT → USER + editedBy event recorded
```

(`src/hooks/useOriginTracker.ts` — `acceptEngineContent`)

**Patent claim 2:** Engine output cannot promote itself. Sovereignty transfer
requires explicit author action (`acceptEngineContent` or `markAsUser`).

## Axis 3 — Audit

Every value carries:

```ts
interface OriginMetadata {
  origin: EntryOrigin;
  createdAt: number;            // ms since epoch
  editedBy?: OriginEditEvent[]; // FIFO max 20 entries
  sourceReferenceId?: string;   // preset id / suggestion id
}
```

(`src/lib/studio-types.ts` — `OriginMetadata`)

History is bounded (20 events per field) to keep memory predictable while still
covering ~95% of practical edit patterns. The `sourceReferenceId` enables
forensic trace back to specific genre presets, episode-transition suggestions,
or AI generation requests.

**Patent claim 3:** No origin transition is recorded silently. Every state
change appends to `editedBy` with a precise timestamp.

## Backward Compatibility

V1 scene-sheet data (no `_originVersion`) is automatically migrated to V2 with
all fields tagged `USER` — the safest default since pre-M4 data was, by
construction, author-authored.

`migrateFromV2()` performs lossless reverse conversion (metadata discarded,
values 100% preserved). 1,000-cycle stress test in
`src/lib/__tests__/origin-migration.test.ts` confirms zero data loss.

## AI Co-Authorship Disclosure

The Audit axis enables automatic legal-grade disclosure generation:

| Grade                    | Boundary       | Use case                       |
|--------------------------|----------------|--------------------------------|
| `human-authored`         | userPct ≥ 80   | Solo author, AI peripheral     |
| `co-authored-human-led`  | userPct ≥ 60   | Co-write, author drives        |
| `ai-assisted`            | userPct ≥ 30   | AI heavy, author edits         |
| `ai-generated`           | userPct < 30   | AI primary, author prompts     |

(`src/lib/ai-disclosure-generator.ts` — `determineDisclosureGrade`)

Export pipeline (EPUB / DOCX) auto-attaches the appropriate 4-language
disclosure — KDP, Apple Books, and Royal Road compliance is now zero-touch.

## Implementation Status (M4)

| Feature                                | Status     | Tests        |
|----------------------------------------|------------|--------------|
| V1↔V2 migration                        | Complete   | 35 unit      |
| Origin tag injection (pipeline)        | Complete   | 10 unit      |
| OriginBadge UI (4 lang × 4 origin)     | Complete   | 17 unit      |
| useOriginTracker hook                  | Complete   | 11 unit      |
| AI co-authorship disclosure            | Complete   | 20 unit      |
| Quality gate weighting                 | Complete   | 4 unit       |
| Settings toggle + grade preview UI     | Complete   | 4 E2E        |

**Total: 97 unit + 4 E2E tests passing.**

## Open Items (Future Tiers)

These extend the patent but are out of M4 scope:

- **Per-character persona** — extend Origin to character traits (M5 candidate)
- **Cryptographic signing** — sign editedBy entries to prevent tampering
- **Cross-project audit ledger** — federated origin trace across projects

---

*This implementation is the first production deployment of NOA Core 3-Axis on
a commercial product. Loreguard treats the patent as a runtime contract, not a
paper diagram.*
