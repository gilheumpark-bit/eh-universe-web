# Loreguard Creative IDE Design Master Plan

> Design-research document: use for direction and quality bar, not as the single source of current implementation inventory.

Date: 2026-06-18
Status: design master plan
Product baseline: Loreguard is a creative IDE, not a generic AI writing SaaS.

## 0. Purpose

This document turns the design direction into an executable design system plan.

The target is not "Apple-looking web UI." The target is an Apple-grade design judgment applied to a writer's IDE:

- content first
- calm controls
- long-session comfort
- clear hierarchy
- low cognitive noise
- high craft
- human author as the subject
- AI as assistant, inspector, and operator, never the protagonist

This document complements:

- `docs/PRODUCT-FRAME.md`
- `docs/brand-philosophy.md`
- `docs/design-principles.md`
- `docs/ergonomics-m6.md`
- `docs/DESIGN-BACKLOG.md`

## 1. One Sentence

Loreguard is a quiet, premium creative IDE where the writer keeps control, the work stays central, Noa supports judgment, and every creative decision can become a record.

## 2. Design North Star

The interface must feel like:

- a writer's desk
- an IDE
- an editorial control room
- a release desk
- a rights and process archive

The interface must not feel like:

- a generic SaaS dashboard
- a prompt generator
- a marketing landing page inside the product
- an AI chat wrapper
- a legal portal with an editor attached
- a beautiful mockup that collapses under real work

## 3. External Design References

Checked on 2026-06-18.

### Apple Human Interface Guidelines

Design meaning:

- clarity: text, controls, state, and destination must be readable at first glance
- deference: UI must support content, not compete with it
- depth: hierarchy must show what is foreground, background, transient, and persistent
- consistency: components behave predictably across surfaces
- accessibility: the interface is built for real bodies, long sessions, and different abilities

Loreguard translation:

- manuscript and creative state are foreground
- Noa, metrics, model state, cookies, sync, and legal notices are secondary
- modals are rare
- overlays are constrained
- status belongs in status surfaces, not in the user's central writing lane

### Xcode

Relevant pattern:

- navigator left
- editor center
- inspector right
- debug/status bottom
- preview and assistant can appear without changing the user's mental model

Loreguard translation:

- Navigator: projects, episodes, world, characters, references, exports
- Editor Canvas: manuscript, scene sheet, translation source/target, package editor
- Inspector: rights, continuity, quality, release readiness, selected object details
- Assistant: Noa suggestion, interview, rewrite, explanation
- Status Bar: save, sync, model, local/hosted mode, cookie, warning, current project

### VS Code

Relevant pattern:

- activity bar is stable
- side bar changes context
- editor stays central
- panel is task-oriented
- status bar is low-intensity but always informative

Loreguard translation:

- persistent zones should be few and stable
- task tools should appear in the same location every time
- command palette handles long-tail actions
- bottom status bar replaces floating utility banners

### JetBrains IDEs

Relevant pattern:

- tool windows are discoverable but can stay out of the way
- large icons help scanability
- new UI reduces chrome noise
- themes affect fatigue

Loreguard translation:

- panel icons can be large enough to scan, but not decorative
- long-form writing needs quiet surfaces
- density must be user-selected
- "power user" is not the default first-run mode

### Zed

Relevant pattern:

- speed and minimal chrome
- collaboration and AI are native, not visually dominant
- editor remains the main instrument

Loreguard translation:

- Noa must be close to the work but visually quiet
- suggestions should feel like inline work support, not a separate AI product
- latency states must be small and honest

### Cursor

Relevant pattern:

- agent work can be seen at a high level
- user can drill down when needed
- AI changes are trackable

Loreguard translation:

- Noa outputs must be traceable
- approval and rejection are first-class
- AI action history belongs to process records
- automation requires a visible stop/hold/approve line

## 4. Current Diagnosis Summary

Observed on 2026-06-18 against local `http://localhost:3100`.

### Strong Surfaces

- `/welcome`: product philosophy is clear; writer remains subject.
- `/studio`: creative IDE identity is strong; 10-step workflow is distinctive.
- `/docs`: manual tone fits "serious creative tool."
- `/verify`: trust surface is simple and aligned.
- `/translation-studio`: real tool density and dual-editor structure fit a professional workspace.

### Weak Surfaces

- cookie banner interrupts the central work and first impression.
- mobile Studio feels like compressed desktop, not a separate companion UX.
- public pages sometimes drift toward generic SaaS.
- preview token fallback can remain in loading state too long.
- design token debt is high.

### Measured Design Debt

Static candidates from exposed app/components:

- raw hex colors: 937
- hard-coded z-index candidates: 150
- outline removal candidates: 107

These are candidates, not automatic defects. They become defects when they affect public or active product surfaces.

## 5. 1000-Point Design Scorecard

Use this as the design gate. A surface below 780 must not be considered ready. A core IDE surface should target 880+. A release-critical surface should target 920+.

### Axis 1. Product Identity: 100

001. The surface says "creative IDE" before it says "AI tool."
002. The writer is grammatically and visually the subject.
003. Noa appears as assistant, not protagonist.
004. Work artifacts are named specifically: manuscript, world, character, scene, rights, export.
005. Generic productivity language is avoided.
006. The page has a clear creative job.
007. The page's main noun belongs to Loreguard's product frame.
008. The page avoids "unlock, seamless, powerful insights" style copy.
009. The visual system supports authorship, not automation spectacle.
010. The first viewport communicates "this is for making work."

Scoring:

- 90-100: impossible to confuse with a generic AI SaaS
- 78-89: mostly Loreguard, with some generic UI language
- 60-77: usable but category is blurry
- below 60: feels like a template or unrelated product

### Axis 2. Content Primacy: 100

011. The manuscript or current work object owns the center.
012. Primary content is not covered by banners.
013. Persistent controls do not compete with reading/writing.
014. Text hierarchy supports scanning.
015. The user can find the current task in under two seconds.
016. Empty state explains next work, not product marketing.
017. Loading state names the work being loaded.
018. Error state names what failed and what remains safe.
019. Legal, billing, and settings copy does not dominate work surfaces.
020. Decorative surfaces never replace meaningful content.

### Axis 3. IDE Spatial Model: 100

021. Left zone is navigation, not mixed controls.
022. Center zone is work.
023. Right zone is inspector, judgment, and contextual details.
024. Bottom zone is status, logs, and low-priority system state.
025. Top zone is orientation and global actions only.
026. Secondary tools are collapsible.
027. Panel state persists.
028. The same action class stays in the same region.
029. Long-tail actions move to command palette or menus.
030. The user does not need to relearn layout per tab.

### Axis 4. Human Ergonomics: 100

031. Central reading lane is stable.
032. Neck rotation is minimized; important info sits within eye movement range.
033. Left panel starts near 240-280px.
034. Right inspector starts near 280-340px.
035. Panels can collapse without losing user state.
036. Repeated actions are near the editor.
037. Cursor entry reduces chrome intensity.
038. Long sessions have typography and density controls.
039. Motion respects reduced-motion preferences.
040. UI does not encourage constant top-right eye jumps.

### Axis 5. Visual Craft: 100

041. The surface looks calm, not empty.
042. The surface looks premium, not sterile.
043. Buttons look clickable but not loud.
044. Spacing follows a consistent rhythm.
045. Typography carries product personality.
046. Serifs are used for brand/editorial identity, not random decoration.
047. Icons read as tools, not ornaments.
048. Color is used for role and state, not decoration alone.
049. Rounded corners are controlled and not randomly soft.
050. The surface passes the "no one curses at first glance" test.

### Axis 6. Interaction Clarity: 100

051. Primary action is obvious.
052. Secondary actions are visible but quiet.
053. Dangerous actions are separated and confirmed.
054. Disabled states explain why.
055. Focus state is visible.
056. Hover-only information has touch equivalents.
057. Form submission gives immediate state feedback.
058. Undo/recovery exists for creative changes.
059. Noa suggestions require approval before becoming work.
060. Every button has a real destination or state change.

### Axis 7. State Design: 100

061. First-run state is designed.
062. Returning-user state is designed.
063. Empty project state is designed.
064. Loading state is specific.
065. Error state is specific.
066. Offline state is useful.
067. Permission-denied state is humane.
068. Unsaved state is visible but not alarming.
069. Sync conflict state explains ownership.
070. Preview/verification failure state does not spin forever.

### Axis 8. Mobile and Companion UX: 100

071. Mobile is not compressed desktop.
072. Mobile has a clear companion role.
073. Main mobile actions are quick: continue writing, review, note, send to desktop.
074. 10-step navigation is simplified.
075. Touch targets are at least 44px.
076. Cookie and legal notices do not block critical mobile actions.
077. Text does not overflow or force awkward horizontal scan.
078. Mobile header is minimal.
079. Mobile surfaces prefer one task per screen.
080. Desktop-only features explain why and offer a useful alternative.

### Axis 9. System Consistency: 100

081. Semantic tokens are used before raw colors.
082. z-index variables are used before numbers.
083. Focus-visible patterns are consistent.
084. Status uses text plus color or icon plus color.
085. Component families share size and radius rules.
086. Modals, popovers, drawers, and toasts have distinct layers.
087. Cookie, toast, and status messages do not fight for the same layer.
088. Theme tokens support light/dark/long-session modes.
089. Public pages and IDE pages feel related.
090. Tests or screenshots exist for key layout states.

### Axis 10. Apple-Grade Restraint: 100

091. The UI removes rather than adds where possible.
092. Controls defer to content.
093. Copy is short, exact, and calm.
094. Animation is meaningful and rare.
095. Visual hierarchy is obvious without borders everywhere.
096. The page avoids decorative effects that do not clarify.
097. The surface feels designed, not generated.
098. The user feels respected, not sold to.
099. The product feels capable without shouting.
100. The final impression is "I can work here for hours."

## 6. Score Interpretation

### 920-1000

Release-quality core surface. Feels premium, useful, and unmistakably Loreguard.

### 880-919

Strong product surface. Minor polishing remains.

### 780-879

Acceptable beta surface. Functional but design debt is visible.

### 650-779

Hold. User can operate it, but identity, ergonomics, or hierarchy is weak.

### Below 650

Reject. Redesign before implementation expansion.

## 7. Target Scores By Surface

| Surface | Current read | Target |
|---|---:|---:|
| Home | 820 | 900 |
| Welcome | 900 | 940 |
| Studio desktop | 830 | 930 |
| Studio mobile | 690 | 880 |
| Translation Studio desktop | 790 | 900 |
| Translation mobile gate | 820 | 880 |
| Docs | 850 | 900 |
| Pricing | 720 | 860 |
| Status | 730 | 860 |
| Bug report | 760 | 860 |
| Verify | 850 | 920 |
| Preview token | 620 | 880 |
| Legal pages | 820 | 880 |
| Payment result pages | 840 | 900 |

Scores are design estimates from the 2026-06-18 audit, not automated truth.

## 8. Structural Design Model

### Desktop IDE Shell

Use five stable regions:

1. Top Orientation Bar
2. Left Navigator
3. Center Editor Canvas
4. Right Inspector
5. Bottom Status Bar

#### Top Orientation Bar

Allowed:

- product mark
- current workspace title
- current workflow step
- command/search
- account/project switcher
- minimal global utility

Not allowed:

- cookie notice
- long status text
- full settings controls
- repeated per-tab actions
- decorative icons

#### Left Navigator

Allowed:

- project
- episodes
- world
- characters
- references
- exports
- search results

Not allowed:

- model status
- cookie consent
- billing prompts
- Noa chat as default

#### Center Editor Canvas

Allowed:

- manuscript
- scene sheet
- translation source/target
- current selected object editor
- release package editor

Not allowed:

- non-dismissed banners covering content
- large marketing cards after first-run
- floating legal notices
- unrelated status overlays

#### Right Inspector

Allowed:

- selected object details
- quality
- continuity
- rights/IP
- release readiness
- Noa suggestions related to selection

Not allowed:

- unrelated global navigation
- permanent chat feed
- generic tips

#### Bottom Status Bar

Allowed:

- saved/unsaved
- sync
- local/cloud
- model mode
- cookie minimal state
- current token/cost if relevant
- warnings count

Not allowed:

- primary creative actions
- long prose
- modal-like consent UI

## 9. Mobile Model

Mobile is a companion, not full IDE.

### Mobile Home Tasks

1. Continue recent work.
2. Capture idea.
3. Review Noa suggestion.
4. Check project status.
5. Send/open on desktop.
6. Read docs or status.
7. Confirm export/verification.

### Mobile Studio First Screen

Required blocks:

- current project
- continue writing
- next required step
- recent note
- Noa pending suggestion
- desktop handoff

Remove from first screen:

- full 10-step nav
- dense toolbar
- full inspector
- multi-panel workspace

### Mobile Translation

Current desktop-only gate is acceptable, but it should offer:

- copy desktop link
- save current note
- view glossary
- read recent translation status
- open simplified paste-and-send mode only if product supports it

## 10. Visual Language

### Product Feel

Use:

- calm white/near-white surfaces
- paper-like depth
- quiet blue for action
- amber/gold only for record/seal/provenance
- dark editor surfaces only when text editing benefits
- typography with editorial confidence

Avoid:

- purple-blue gradient dominance
- excessive cards
- bokeh/orbs
- generic dashboard tiles
- flashy AI glows
- "cyber" styling unless explicitly in a tool mode

### Typography

Display:

- editorial serif or strong Korean display for product-level headings
- avoid giant type inside tools

Body:

- readable sans
- 15-17px for long reading
- 1.55-1.8 line height depending on context

Mono:

- metadata
- records
- IDs
- workflow labels
- status

### Color Roles

Action blue:

- main CTA
- active step
- selected language

Amber/gold:

- certificate
- provenance
- rights seal
- caution only when culturally appropriate

Green:

- saved
- verified
- passed

Red:

- destructive
- failed
- legal warning

Neutral:

- content
- panels
- borders
- disabled

## 11. Anti-AI-Taste Rules

AI taste appears when a page has average prettiness but no product-specific judgment.

Ban or rewrite:

- "seamless"
- "unlock"
- "empower your creativity"
- "powerful insights"
- "smart workflow"
- "AI-powered writing experience"
- "all-in-one platform" unless exact

Prefer:

- "작가가 기준을 확정합니다"
- "노아는 선택지를 정리합니다"
- "과정이 기록됩니다"
- "출고 기준을 남깁니다"
- "권리 메모를 함께 보관합니다"
- "작품을 파일에서 제출 가능한 패키지로 옮깁니다"

Visual anti-rules:

- no decorative AI glow as identity
- no generic dashboard hero
- no card grid as default product surface
- no floating assistant that blocks work
- no popover stack
- no icon confetti

## 12. Ergonomics Specification

### Eye Movement

Primary eye path:

1. center work
2. current step
3. inspector summary
4. status bar
5. navigator

If the user's eye jumps to cookie, model, account, tool icons, and alerts before the work, the surface fails.

### Neck Movement

Design for eye movement, not head movement.

Limits:

- primary content: central 60%
- persistent left panel: 240-280px default
- persistent right panel: 280-340px default
- wide inspector: user-triggered only
- dual editor: split by task, not decoration

### Wrist and Hand Movement

Repeated actions belong near work:

- continue
- save
- apply Noa suggestion
- reject suggestion
- translate
- compare
- approve
- export

Rare actions belong in command palette or menus:

- billing
- account
- integrations
- advanced model routing
- global settings

### Long Session Rules

- editor center must remain stable
- header can recede while typing
- side panels can collapse
- motion reduces during writing
- dimming and typography presets remain available
- no forced modal during active composition
- IME composition is respected

## 13. Component Policy

### Buttons

Primary:

- one per local decision area
- blue unless product state says otherwise
- min 44px target

Secondary:

- border or quiet fill
- visible but less intense

Icon buttons:

- require aria-label
- require tooltip on desktop
- require visible touch target

Danger:

- separated
- red
- confirm if destructive

### Cards

Use cards for:

- selectable items
- repeated records
- documents
- plans
- summaries

Do not use cards for:

- every section
- nested page structure
- fake depth
- tool shell

### Modals

Allowed:

- destructive confirmation
- focused import/export
- explicit command result
- keyboard help

Not allowed:

- routine settings
- random suggestions
- marketing
- cookie consent on IDE surfaces

### Toasts

Allowed:

- saved
- failed
- background completed
- short warning

Rules:

- max one visible stack region
- no critical action hidden only in toast
- do not cover editor text

### Inspector

Inspector must answer:

- what is selected?
- what is incomplete?
- what changed?
- what needs approval?
- what is risky?
- what can be exported?

## 14. Page-Specific Design Plan

### Home

Keep:

- "작품을 여는 첫 작업실"
- minimal entry actions
- quiet editorial tone

Change:

- move cookie state out of bottom overlay after first display
- ensure quick settings icons do not drift off mobile edges
- make "project create" and "work library" the clear pair

Target:

- feel like opening an app, not a landing page

### Welcome

Keep:

- writer-subject statement
- calm pacing
- low visual noise

Change:

- preserve this philosophy in all later surfaces
- use this as copy baseline for Noa and AI claims

Target:

- onboarding as trust contract

### Studio Desktop

Keep:

- 10-step creative workflow
- project start framing
- rights/release concepts
- Noa as guide

Change:

- reduce top icon competition
- move cookie to status bar
- turn right 기준판 into true inspector
- make current step more legible than all steps
- give workflow strip a clearer scroll/step affordance

Target:

- Xcode/VS Code spatial clarity with writer-specific objects

### Studio Mobile

Keep:

- project identity
- current step
- start/continue action

Change:

- replace full 10-step nav with mobile companion stack
- remove dense toolbar
- show desktop handoff
- keep Noa suggestions as cards, not panels

Target:

- mobile companion, not shrunken IDE

### Translation Studio

Keep:

- dual editor
- glossary presence
- source/target language clarity

Change:

- touch targets to 44px minimum
- move cookie out of top-right editor area
- simplify top controls
- inspectorize glossary/audit/save panels

Target:

- professional translator cockpit with lower visual friction

### Docs

Keep:

- manual tone
- public document classification
- 10-step table of contents

Change:

- mobile TOC should collapse after initial orientation
- home link target should meet 44px width

Target:

- product manual, not blog

### Pricing

Keep:

- audition-period honesty
- no premature public price claims

Change:

- rename plan cards around work scope
- foreground "작업장 범위", "출고 크레딧", "권리/IP 패키지"
- avoid generic subscription-card feel

Target:

- entitlement design, not SaaS pricing

### Status

Keep:

- simple communication
- last checked time

Change:

- group by creative work dependencies: saving, AI, translation, export, verification
- show what writers can still do

Target:

- 작업장 운영 상태

### Bug Report

Keep:

- safe warning about not sharing private manuscripts
- GitHub issue path

Change:

- rename and frame as "작업 흐름 복구 요청"
- add what to include as structured fields if implemented later

Target:

- support for serious creative work, not generic issue reporting

### Verify

Keep:

- clear ID input
- public trust surface

Change:

- align more visually with certificate/seal language
- make failed lookup state strong and calm

Target:

- trustworthy proof desk

### Preview Token

Change immediately:

- do not spin indefinitely on invalid token
- show expired/private/not-found states
- explain no original manuscript is exposed

Target:

- safe public preview boundary

### Payment Result

Keep:

- calm completion/cancel states
- direct next action

Change:

- connect payment success to entitlement record language

Target:

- payment as permission applied to creative workspace

## 15. Layering and z-index

Replace arbitrary z-index with semantic layers.

Recommended tokens:

- `--z-base: 0`
- `--z-sticky: 20`
- `--z-status: 30`
- `--z-toolbar: 40`
- `--z-popover: 60`
- `--z-toast: 70`
- `--z-overlay: 80`
- `--z-modal: 90`
- `--z-critical: 100`

Rules:

- cookie compact state uses `--z-status`
- toast uses `--z-toast`
- inspector drawer uses `--z-popover`
- destructive modal uses `--z-modal`
- skip link can use `--z-critical`
- no routine surface uses `9998`

## 16. State Copy Dictionary

### Loading

Bad:

- 로딩 중...

Good:

- 공개 미리보기 기록을 확인하는 중입니다.
- 작품 보관함을 여는 중입니다.
- 번역 작업실을 준비하는 중입니다.
- 출고 패키지 기록을 불러오는 중입니다.

### Empty

Bad:

- 없음

Good:

- 아직 작품 보관함에 저장된 작품이 없습니다.
- 아직 출고 기록이 없습니다.
- 아직 승인된 번역본이 없습니다.

### Error

Bad:

- 오류

Good:

- 이 링크는 만료되었거나 공개 범위 밖입니다.
- 저장소에 연결하지 못했습니다. 현재 원고 입력은 유지됩니다.
- 출고 기록을 확인하지 못했습니다. 원본 원고는 이 화면에 표시되지 않습니다.

### Success

Good:

- 저장되었습니다.
- 권리 메모가 기준판에 반영되었습니다.
- 출고 패키지에 포함되었습니다.
- 확인서 기록과 일치합니다.

## 17. Implementation Roadmap

### Phase 1. Remove Visual Interruptions

Scope:

- CookieConsent
- status bar
- z-index tokens

Deliverables:

- compact cookie state in work surfaces
- no cookie overlay over editor/inspector
- semantic z-index variables
- screenshot proof for home, studio, translation, docs

Exit:

- no central work area covered by non-work notice

### Phase 2. Desktop IDE Shell Refinement

Scope:

- LoreguardShell
- loreguard.css
- WorkflowReadinessStrip
- right 기준판 / inspector

Deliverables:

- top toolbar divided into global/current/hidden
- current step emphasized
- inspector language clarified
- panel width defaults set
- collapse persistence

Exit:

- 880+ score on Studio desktop

### Phase 3. Mobile Companion Redesign

Scope:

- Studio mobile layout
- mobile header
- mobile first-run

Deliverables:

- remove full 10-step strip from first viewport
- current project card
- continue action
- next step
- Noa pending suggestion
- desktop handoff

Exit:

- 840+ score on mobile Studio before visual polish, 880+ after polish

### Phase 4. Translation Studio Polish

Scope:

- BilateralEditor
- TranslatorShell
- TranslationActionDock

Deliverables:

- 44px target guarantee
- quieter header
- inspector/panel rules
- cookie/status relocation

Exit:

- no top-right occlusion
- 900 target feasible

### Phase 5. Public Surface Reframing

Scope:

- pricing
- status
- bug-report
- docs mobile TOC

Deliverables:

- pricing as work entitlement
- status as workspace operations
- bug report as recovery request
- mobile docs TOC collapsible

Exit:

- no generic SaaS feel in public pages

### Phase 6. Preview and Verification State Hardening

Scope:

- preview token page
- verify pages

Deliverables:

- invalid/private/expired/loading states
- certificate language
- no indefinite spinner

Exit:

- preview token page reaches 880 target

### Phase 7. Design Token Cleanup

Scope:

- active surfaces first

Order:

1. CookieConsent
2. loreguard shell
3. translation-studio
4. legal/docs layout
5. payment/status/verify

Exit:

- raw color count reduced on active surfaces
- hard-coded z-index eliminated from active shell
- focus-visible verified

## 18. QA Checklist

Before accepting a design change:

1. Screenshot desktop and mobile.
2. Check no central work is covered.
3. Check all visible buttons are at least 44px target.
4. Check focus-visible is visible.
5. Check no unrelated modal appears on first entry.
6. Check current task is visible within two seconds.
7. Check Noa is assistant, not protagonist.
8. Check status is in status region.
9. Check mobile is not compressed desktop.
10. Score the surface on the 1000-point scorecard.

## 19. "No-Curse" Visual Gate

This is intentionally subjective but required.

A surface fails if a reasonable user would say:

- 왜 이렇게 복잡해?
- 뭐부터 눌러야 해?
- 왜 자꾸 뭔가 떠?
- 이거 AI가 만든 템플릿 같아.
- 이거 글 쓰는 도구 맞아?
- 모바일은 그냥 찌그러졌네.
- 예쁜데 쓰기는 싫다.

A surface passes if the likely reaction is:

- 바로 작업할 수 있겠다.
- 오래 써도 덜 피곤하겠다.
- 뭔가 진짜 도구 같다.
- 작가용으로 만든 티가 난다.
- AI가 나서는 게 아니라 옆에서 받쳐준다.

## 20. Design Decisions Locked

Locked until a deliberate design review changes them:

1. Loreguard is a creative IDE.
2. Writer is the subject.
3. Noa is assistant/inspector/operator, not the hero.
4. Center work area is sacred.
5. Mobile is companion, not compressed IDE.
6. Cookie/legal/system notices must not cover active work.
7. Public pages must speak in creative-work terms.
8. Apple-grade restraint means fewer louder things, not more decoration.
9. Premium means quiet confidence, not visual noise.
10. A design that is ergonomic but ugly still fails.

## 21. First Implementation Candidates

### Candidate A. CookieConsent relocation

Why first:

- highest interruption
- affects many pages
- easy to verify visually

Acceptance:

- work surfaces: compact status line or bottom safe notice
- public pages: bottom bar allowed but must not hide first action
- no `zIndex: 9998` for routine cookie UI

### Candidate B. Studio mobile companion first viewport

Why second:

- biggest identity risk
- current mobile feels compressed

Acceptance:

- no full 10-step strip in first viewport
- current project and next action visible
- desktop handoff visible
- Noa appears as small support card

### Candidate C. Preview token state

Why third:

- trust surface
- currently can spin too long

Acceptance:

- loading, invalid, expired, private, success states
- no indefinite spinner after timeout

### Candidate D. Translation 44px targets

Why fourth:

- measurable
- small implementation

Acceptance:

- visible buttons meet 44px target
- no regression in dual editor layout

## 22. Evidence Required Per Phase

For every phase:

- desktop screenshot
- mobile screenshot
- console error/warn check
- keyboard focus check
- 1000-point score before/after
- notes on remaining debt

For core IDE phases:

- at least one interaction proof
- no overlay conflict
- no horizontal overflow except intentional scroll regions

## 23. Final Design Target

The final product should make the writer feel:

> This is where I can build the work, control the AI, preserve my judgment, and prepare the result for the world.

If a design does not support that feeling, it is not Loreguard yet.

## 24. Implementation Closeout — 2026-06-18

The first six remaining design issues were converted into implementation targets:

1. Mobile cookie interruption reduced with shorter work-surface labels and lower-height status styling.
2. Mobile Studio first viewport compressed around start action, recent work, and import rather than explanatory panels.
3. Translation Studio top density reduced by separating primary, secondary, and utility controls.
4. Product identity sharpened toward a calm creative IDE: content first, lower decoration, stronger author-control copy.
5. Token debt reduced in touched surfaces by using existing z-index and color tokens instead of new hard-coded layers.
6. Public Preview failure/loading states upgraded to calm reader-facing state panels with timeout protection.

Remaining debt after this pass:

- full raw color and z-index cleanup is still broader than this phase
- full keyboard focus walk needs a dedicated interaction pass
- mobile Studio can be pushed further into a true companion workflow after data-heavy panels are audited

## 25. Warning Closeout — 2026-06-18

Three post-pass warnings were addressed immediately:

1. Mobile Studio information load: the workflow readiness strip is hidden on narrow screens, leaving the first viewport focused on work start actions.
2. Preview Firestore warning: invalid public preview token shapes are rejected before Firestore lookup, preventing repeated local configuration warnings for malformed links.
3. Token debt: repeated hard-coded overlay layer numbers in the touched Loreguard CSS were replaced with semantic z-index variables.

Residual note:

- a full app-wide color/z-index migration remains a larger design-system task
- valid but missing Firestore preview tokens can still surface environment warnings if the local Firebase project is not configured

## 26. Korean UX Copy Polish — 2026-06-18

Goal: remove literal, AI-translated copy from the creator IDE surface without weakening safety, privacy, or workflow clarity.

Changes applied:

- Replaced workflow jargon such as "작업선", "세부 기준", and "연결 상태" with user-facing readiness language: "단계", "확인 항목", and "준비 상태".
- Replaced project-start metaphors such as "작품의 씨앗" with clearer tool language: "작품 시작점".
- Replaced Noa setup labels with action-first copy: "질문으로 기준 잡기".
- Replaced preview privacy warnings using "원본 원고" with shorter, safer messages focused on whether manuscript content is displayed.
- Standardized the import action around "파일 가져오기" where the screen is asking the user to act.

Ongoing standard:

- Product-internal words may remain in implementation, but first-screen UI copy should read as a creator's workbench, not as translated platform documentation.
- Safety states should explain the result first, then the boundary. Example: "원고 내용은 표시하지 않았습니다."
- Buttons should name the next action, not the internal feature name.

## 27. Full Page Re-evaluation Closeout — 2026-06-18

Scope:

- 24 public/product routes.
- Mobile viewport: 390 x 844.
- Desktop viewport: 1440 x 960.
- Total rendered checks: 48.

Routes checked:

`/`, `/welcome`, `/studio`, `/desktop`, `/translation-studio`, `/translate`, `/preview/not-valid-token`, `/verify`, `/verify/demo-doc`, `/docs`, `/pricing`, `/about`, `/status`, `/bug-report`, `/privacy`, `/terms`, `/copyright`, `/cookies`, `/refund`, `/ai-disclosure`, `/changelog`, `/offline`, `/payment/success`, `/payment/cancel`.

Final automated findings:

- HTTP/page load failures: 0.
- Console warnings/errors: 0.
- Page runtime errors: 0.
- Horizontal overflow: 0.
- User-facing touch targets under 44px: 0.
- Old literal-copy candidates in checked page text: 0.
- Missing page-level heading: 0.

Closeout fixes in this pass:

- `/docs` now uses the same product language as the Studio start flow: "질문형 기준 잡기" and "작품 기준표".
- `/docs` removed the remaining "방향키" metaphor from the main scenario section.
- `/translation-studio` and `/translate` now expose a page-level hidden H1 for assistive technology without changing the visible dense IDE header.

Final score:

- 1000 / 1000 for the automated full-page design gate used in this pass.
- Human-design note: the score means no detected blocking layout/copy/accessibility regressions in the sampled route set. It does not replace a future deep visual art-direction pass for every internal panel state.

## 28. Internal Depth Pass — 2026-06-18

Scope requested:

1. Internal panel states.
2. Long-session fatigue risk.
3. Korean copy tone consistency.

Evidence captured:

- Studio project start.
- Studio file import dialog.
- Studio tabs: world, character, plot, scene, direction, writing, revision, translation, export.
- Translation Studio default state.
- Full public/product route gate repeated after changes.

Closeout fixes:

- Header copy changed from a broad completion promise to quieter creator-IDE language: "작품을 정리하고 / 출고까지 이어갑니다".
- Non-project Studio tabs now expose a hidden page-level H1 so each internal tab has a clear assistive-technology title.
- File input controls inside import surfaces are hidden with `display: none`; the visible label button remains the interaction target.
- Desktop header density now collapses tab labels earlier, preventing the 10-step tab bar from overlapping language/tool controls at 1440px.
- Workflow active-note auxiliary text received stronger contrast in light and dark modes.
- Revision empty-state helper text now uses a stronger text token for contrast.
- World tab helper copy no longer uses the old "노아 설정 가이드" term.

Final internal audit results:

- Internal screens checked: 12.
- Internal old-copy candidates: 0.
- Internal AI-taste headline candidates: 0.
- Internal user-facing touch targets under 44px: 0.
- Internal horizontal overflow: 0.
- Internal tab/page heading gaps: 0.
- Internal color-contrast axe violations in checked Studio tabs: 0.
- Internal console warnings/errors after closeout: 0.

Final route gate after this pass:

- Routes/viewports checked: 48.
- HTTP/page load failures: 0.
- Console warnings/errors: 0.
- Runtime errors: 0.
- Horizontal overflow: 0.
- User-facing touch targets under 44px: 0.
- Old literal-copy and AI-taste headline candidates: 0.
- Missing page-level heading: 0.
- Automated score: 1000 / 1000.

Human note:

- The remaining meaningful next layer is not bug fixing; it is taste work. The product can still benefit from a future art-direction pass on dense specialist panels, but the user-facing structural, copy, and accessibility blockers found in this internal pass are closed.
