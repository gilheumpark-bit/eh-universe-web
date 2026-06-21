# 0013. Engine / Lib Boundary For Shared Text Cleanup

- Status: Accepted
- Date: 2026-06-21
- Deciders: Loreguard engineering

## Context

`src/lib` contains storage, export, billing, creative-process, and product-facing utilities. `src/engine` contains writing-engine prompt assembly, scoring, post-processing, and story mechanics.

Several low-level `src/lib` utilities previously imported `stripEngineArtifacts` from `@/engine/pipeline`. That worked at runtime, but it made simple storage/export cleanup depend on the full writing-engine barrel. It also blurred the architectural direction because `src/engine` already imports shared types and helpers from `src/lib`.

## Decision

Move the engine-artifact stripping core to `src/lib/engine-artifacts.ts`.

`src/engine/pipeline-postprocess.ts` now imports the shared base cleanup and layers engine-only language purification on top. Storage and export utilities import the base cleanup directly from `src/lib`.

## Rationale

- Shared cleanup is not a writing-engine concern.
- Storage/export should not import the full pipeline barrel for a pure text sanitizer.
- Engine-specific language purity remains in `src/engine` because it depends on engine contamination dictionaries and logging behavior.

## Consequences

- Positive: reduces `src/lib` to `src/engine/pipeline` coupling.
- Positive: keeps one shared artifact-removal implementation for engine, export, and project restore paths.
- Trade-off: there are now two public names by intent: `stripEngineArtifactsBase` for shared cleanup and `stripEngineArtifacts` for engine post-processing.

## Alternatives

- Keep importing from `@/engine/pipeline` — rejected because it hides a heavy dependency behind a small utility call.
- Move all language purity code into `src/lib` — deferred because contamination dictionaries and engine reporting need a broader boundary pass.

