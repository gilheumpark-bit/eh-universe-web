# Loreguard v2.3.0-alpha — Authorship Journal

**Release date**: 2026-05-10
**Branch**: `master`
**Stability**: Alpha — deployable
**Prior release**: [`v2.2.0-alpha`](RELEASE-NOTES-v2.2.0-alpha.md) (2026-04-20)

---

## What's new (for writers)

- **Authorship Journal — visible proof of how you wrote it.** Every keystroke, every AI suggestion accepted or rejected, every external import is recorded as you write. When you're ready to submit, one click bundles a notarized package: your manuscript, a process certificate, a source bundle, and a digital signature. Designed for publisher / platform / archive / private-archive submission.
- **HCI (Human Control Index) 0-100.** A single number that tells you (and your publisher) how much of the work was your judgment vs. machine assistance. Three axes — Author Intent, Manual Edit Density, Narrative Logic. Nine origin types weighted by control depth.
- **Witness Seal.** Each issued certificate gets a serial: `LG-{YY}{MM}-{serial}-{hash4}`. Doubles as a verification fingerprint for content authenticity claims.
- **4-language certificate (KO / EN / JA / ZH).** Limitation Statement + Attestation of Genesis + Signature Disclaimer all locked at byte level. No translation drift between issuances.
- **Color-blind friendly origin track.** Nine origin types, nine distinct symbols (◼▲★◆▼⬢□◯◑) plus color. WCAG 1.4.1 compliant.
- **Modern Institutionalism design language.** Sharp 0px corners (Witness Seal alone is 50% rounded). Newsreader serif headlines. Public Sans body. Inter mono for data. Accent Gold #D4AF37 for seal. Royal Blue #4169E1 for verified status. Zero external link in the rendered output — the document is self-contained.

---

## Under the hood (for engineers)

### Milestone chain (SHAs)

| Track | Head SHA | Ships |
|---|---|---|
| Visual Charter v1.0 / Track-D Phase 1 | `ad9513d0` | `_1`/`_2`/`_3`/`_4` four screens + 14 modules in `src/lib/creative-process/` |
| ARCS / 11-agent registry | `d9153ade` | `WRITING_AGENT_REGISTRY` + IP Guard L1-L5 + Compliance 7-axis |
| i18n SSR + 41-band wiring | `bb322ce3` → `5c14350e` | metadata / html-lang / og / sitemap / manifest 4-language SSR |
| Phase 1 quality push | `3cc454e9` | TokenBudgetToast 16-day silent fail / HCI EN forbidden word / color-blind support |
| INTERNAL doc isolation (security audit) | `0cad96bd` | 7 INTERNAL docs `git rm --cached` + .gitignore strengthening |
| Paperwork (license / governance / release) | `d4721ffd` → `ffd92769` | NOTICE / ROADMAP / GOVERNANCE / pricing placeholder / CONTRIBUTING / commit policy |
| Bug hunt (virtual server ESLint sweep) | `f5b3e32a` → `0373c72f` | 17 ESLint errors + 3 stale-closure bugs → 0 application warnings |
| Real navigation fix (dock buttons) | `0bd82e21` | Universe / Translation dock entries clickable (`Link` → `button` + `router.push`) |
| Release hygiene finalize | `master` | `RELEASE-NOTES-v2.3.0-alpha.md` + version sync (CHANGELOG / ROADMAP / NOTICE) + lsp-spec canonical path |

### Metrics

| Metric | v2.2.0-alpha (M7) | v2.3.0-alpha (this release) |
|---|---|---|
| Jest tests | 3,217 passing | **3,772 passing** (+555) |
| Jest suites | 289 | **350** (+61) |
| TypeScript errors | 0 | **0** (strict) |
| ESLint errors | — | **0 application errors** (178 CLI intentional warnings, scoped via `eslint.config.mjs` override) |
| Lighthouse A11y | 100 / 100 × 5 pages | **100 / 100 × 5 pages** (maintained) |
| 16 IDE-value matrix | ~46% | **95%+** (Phase B-F complete) |
| 14-axis grade | B (74) | **A- (82)** |
| Patent | — | **KIPO 10-2026-0038027** (Fast-Track filed) |
| License | Legacy transition note | **UNLICENSED / Proprietary** — current repository rights notice |
| Static pages built | 56 | 56 |

### New in v2.3.0-alpha

#### Visual Charter v1.0 — `src/lib/creative-process/` (14 modules)

- `types.ts` — 9 Origin + ProcessCertificate + sealNumber / hciPayload / originSummary / workSessions
- `origin-adapter.ts` — EntryOrigin → CreativeOriginType single-direction
- `limitation-text.ts` — `LIMITATION_TEXT_4LANG` byte-level + `assertNoForbiddenWords`
- `external-status-mapper.ts` — internal 6 → external 5 label mapping
- `event-recorder.ts` / `source-recorder.ts` / `idb-store.ts` — IDB append-only storage
- `report-builder.ts` — 10 sections + HCI + sealNumber + ATTESTATION integration
- `html-renderer.ts` / `markdown-renderer.ts` — self-contained output (zero external link)
- `visual-tokens.ts` — Sharp 0px / Newsreader / Gold #D4AF37 design tokens
- `hci-calculator.ts` — 9 Origin weights + HCI 0-100 + 3-axis
- `attestation-text.ts` — ATTESTATION OF GENESIS 4-language byte-level
- `seal-issuer.ts` — `LG-{YY}{MM}-{serial}-{hash4}` IDB counter + Witness Seal SVG + Donut SVG
- `qr-renderer.ts` — qrcode dynamic import + placeholder fallback
- `submission-package.ts` — `_1` 4 artifact bundle + 4 Distribution Profile
- `provenance-analyzer.ts` — `_4` 3-axis + Active Actors + Chronology + Ledger
- `hci-label-migration.ts` — retroactive notice for prior 'Verified'/'Unverified' EN labels

#### Visual Charter v1.0 — `src/components/studio/` (4 screens)

- `_1` `SubmissionPackageBuilder.tsx` — 4 artifact wizard + Cover Preview
- `_2` `CreativeContributionInspector.tsx` — Chapter-level Origin Track + HCI + Witness Log
- `_3` `settings/CreativeProcessSection.tsx` — Settings Advanced issuance UI (already wired)
- `_4` `ProvenanceReport.tsx` — 3-axis + Active Actors + Chronology + Ledger

`NovelIDELauncher` integration: 'journal' tab (ScrollText icon) toggles `_2` Inspector + `_4` Provenance sub-view. 'Submit' button opens `_1` SubmissionPackageBuilder full-screen modal.

#### ARCS layer (already in v2.3.0-alpha CHANGELOG, cataloged here for visibility)

- `WRITING_AGENT_REGISTRY` (`lib/ai/writing-agent-registry.ts`) — 11 agents × 6 GuardId × 11 ContextBlockId single registry
- `SAFETY_REGISTRY` (`lib/ai/safety-registry.ts`) — PRISM 3 tiers (all-ages / teen-15 / mature-18)
- `IP Guard L1-L5` (`lib/ip-guard/`) — 5-layer brand / copyright defense
- `Compliance 7-axis` (`lib/compliance/axes/`) — worldview / character / direction / genre / scene-sheet / continuity / IP

### Known limitations (deliberately deferred)

- **`qrcode` npm package** — currently dynamic import + placeholder SVG fallback. Phase 2 will install the real package.
- **`legal` view** — `_1`/`_2`/`_3`/`_4` only. Legal-deposit + court-evidence view deferred to post-lawyer review.
- **Long-Arc Verifier embedding cache** — IDB scaffolding present; LLM embedding integration is Phase 2.
- **Reader Sim 4-market personas** (KO / EN / JP / ZH) — Phase 3 after beta launch.
- **Cloudflare Tunnel / Tailscale recovery for DGX** — currently internal-network direct (ROADMAP §2.3).
- **Native reviewer pass for 4-language assets** (~$400) — Phase 3.

### Security audit (2026-05-10)

GitHub repo full audit found 7 INTERNAL-marked documents leaking publicly:

- **P0 isolation (3 files — self-marked INTERNAL)**:
  - `docs/pitch-deck-draft.md` (633 lines, "INTERNAL — IR · investor pitch · demoday")
  - `docs/competitive-analysis.md` (618 lines, "INTERNAL — team · investor share")
  - `docs/brand-hierarchy.md` ("INTERNAL — team share")
- **P1 isolation (4 files — internal audit nature)**:
  - `docs/m7-hardening-audit.md`, `m7-final-verification.txt`, `m8-ux-balance-audit.md`, `m9-audit-unconnected-unfinished.md`

Treatment: `git rm --cached` (working tree preserved) + `.gitignore` strengthening (case-insensitive + hyphen variants + INTERNAL audit globs). Git history retention — BFG / git-filter-repo decision deferred.

**v2.3.0-alpha additional finalize (2026-05-10)**:

- `NARRATIVE_SENTINEL.md` (Triple Logic Core trade secret) → moved to EH parent folder + .gitignore.
- `GEMINI.md` (NOA v1.2 stale; v2.1 integrated into AGENTS.md / CLAUDE.md) → moved + .gitignore + 4 reference files updated.
- `VERIFY_PROMPT.md` (claims 1,600 tests; current is 3,772) → moved + .gitignore.
- `IR_PITCH_STRATEGY.md` (already untracked via .gitignore line 167) → moved to EH parent folder to eliminate OneDrive sync exposure.

---

## Upgrade notes (for users)

None breaking. Existing projects open transparently:

- Authorship Journal accumulation begins at first launch — no opt-in required.
- IDB store `loreguard_creative_process` is created on first event.
- Prior 'Verified' / 'Unverified' EN labels (forbidden words) are silently rewritten to 'Strong' / 'Limited' on first read; `hci-label-migration.ts` handles retroactive notice for already-issued certificates.
- Manuscript content / save engine / origin tagging system: zero changes (Isolation §1 — 8 absolute forbidden files held at 0-byte diff).

---

## License & Patent

| Item | License | Audience |
|---|---|---|
| Software | [UNLICENSED / Proprietary](../LICENSE) | private commercial product; written permission required |

Pre-cutoff (commit `414fe9ea` and earlier): CC-BY-NC-4.0 (irrevocable rights preserved).

**Patent**: KIPO application 10-2026-0038027 (Fast-Track filed) — ARCS / IP Guard L1-L5 / Compliance 7-axis. Patent-related permissions require a separate written agreement.

---

## Contact

- General: gilheumpark@gmail.com
- Security: security@eh-universe.dev
- License inquiries: gilheumpark@gmail.com (subject `[LICENSE]`)
- Patent: gilheumpark@gmail.com (subject `[PATENT]`)
- Alpha writer recruitment: gilheumpark@gmail.com (subject `[ALPHA]`)

---

> *"Novels, verified like code."*
> *"코드처럼 검증되는 소설."*

— Park Gilheum (BDFL), 2026-05-10
