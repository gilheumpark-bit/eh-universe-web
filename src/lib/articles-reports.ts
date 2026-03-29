// ============================================================
// PART 1 — Report Articles (11-63)
// Auto-generated from source markdown files
// ============================================================

import type { ArticleData } from "./articles";

export const reportArticles: Record<string, ArticleData> = {
  "rpt-nhdc-emergency-guide": {
    title: { ko: "NHDC 긴급 상황 가이드 No. 001", en: "NHDC Emergency Situation Guide No. 001" },
    level: "CLASSIFIED",
    category: "REPORTS",
    content: {
      ko: `# NHDC 긴급 상황 가이드 No. 001
## NHDC Emergency Situation Guide No. 001

**문서 등급: CLASSIFIED**
**작성: 국가인적자원관리본부(NHDC) 위기대응실**
**일자: [전산 마비 +0h]**

---

### 상태

국가 행정망(NHDC) 완전 마비.
전산 복구 예정 시간: 미정.

### 대응 지침

1. 전 개체에 대한 디지털 식별값 정지.
2. 수동 기록 체계(타자기/갱지)로 즉시 전환.
3. **[개인 고유명] 사용을 엄격히 금지함.** 모든 대상은 상의 좌측에 부착된 [임시 수용 번호]로만 호칭할 것.

### 등급별 처리 기준

| 등급 | 정의 | 처리 |
|------|------|------|
| A-B | 핵심 자산 | 시스템 유지보수 인력으로 강제 배정 |
| C-D | 일반 자산 | 노동 및 번식 데이터 생성용 |
| E | 가용 한계점 | EH-알파 소체 후보군 또는 소모품으로 즉시 전환 |
| 측정 불능 | 하한선 미달 | 자산 회수 비용 초과 — 행정적 살처분 대상 |

### 비고

- 규격 외 개체(하한선 미달자) 발견 시, 즉시 별도 격리 후 EH-알파 팀에 인계할 것.
- 1954년 협약에 따른 특수 예약 개체는 별도 관리할 것.

---

*본 문서는 국가 행정망 비상 전환 시에만 유효하며, 전산 정상화 이후 자동 파기됨.*
*무단 열람 시 해당 인원은 등급 외 자산으로 즉시 분류됨.*`,
      en: `# NHDC Emergency Situation Guide No. 001

**Classification: CLASSIFIED**
**Author: NHDC Crisis Response Division**
**Date: [System Failure +0h]**

---

### Status

National Human Resource Administration Network (NHDC) — total system failure.
Estimated restoration time: UNDETERMINED.

### Response Directives

1. Suspend all digital identification values for every registered entity.
2. Immediately transition to manual recording systems (typewriters / mimeograph paper).
3. **Use of [Personal Given Names] is strictly prohibited.** All subjects shall be addressed solely by the [Temporary Custody Number] affixed to the upper-left of their garment.

### Processing Standards by Grade

| Grade | Definition | Processing |
|-------|-----------|-----------|
| A-B | Core Assets | Forcibly reassigned as system maintenance personnel |
| C-D | General Assets | Labor and breeding data-generation use |
| E | Utility Threshold | Immediate conversion to EH-Alpha host candidates or expendable materiel |
| Unmeasurable | Below Baseline | Asset recovery cost exceeded — subject to administrative culling |

### Notes

- Upon discovery of non-standard entities (those below Baseline), immediately isolate and transfer to the EH-Alpha team.
- Special reserved entities per the 1954 Agreement shall be managed separately.

---

*This document is valid only during national network emergency transition and will be automatically destroyed upon system normalization.*
*Unauthorized access will result in immediate reclassification of the reader as an ungraded asset.*`,
    },
  },
  "rpt-eh-alpha-neural-manual": {
    title: { ko: "EH-알파 신경계 제어 매뉴얼 (일부 오염)", en: "EH-Alpha Neural Control Manual (Partially Corrupted)" },
    level: "CLASSIFIED",
    category: "TECHNOLOGY",
    content: {
      ko: `# EH-알파 신경계 제어 매뉴얼 (일부 오염)
## EH-Alpha Neural Control Manual (Partially Corrupted)

**문서 등급: CLASSIFIED — 열람 인가: EH-알파 기술관리부 이상**
**작성: NHDC 기술관리부 생체공학과**
**문서 상태: 일부 오염 (아카이브 붕괴 시 물리적 손상)**

---

### 1. 개요

EH-알파는 국가 행정망의 현장 집행을 위해 설계된 강화 인간 유닛이다.
인간 소체를 기반으로 하되, 신경계 제어를 통해 감정 회로를 차단하고 명령 수행 효율을 극대화한다.

### 2. 핵심 약물: 안식(安息) v4.0

| 항목 | 사양 |
|------|------|
| 제품명 | 안식(安息) v4.0 |
| 성분 | 고빈도 망각 유도제 |
| 투여 방식 | 목 뒷면 포트를 통한 자동 주입 (등 장착 펌프) |
| 효과 | 통증 인지 회로 차단 · 개인 고유명 로그 삭제 |
| 지속 시간 | 약물 카트리지 1회 분량 기준 4~6시간 |

### 3. 주의사항

- 약물 중단 시 차단되었던 신경계가 즉시 복구됨.
- 복구 시 과거 행위에 대한 기억이 로그 형태로 일괄 재생됨 (과부하 위험).
- **약물 투여 중에도 '인간적 발화'가 관측될 경우 즉시 보고할 것.**

### 4. 폐기 기준

약물 투여 시에도 다음 조건 충족 시, 기계적 가치 상실 및 재사용 불가 판정:

> **'인간적 발화(예: 이름 부르기)'가 3회 이상 관측될 경우,**
> **즉시 소각함.**

### 5. EH-오메가 (차세대)

기존 EH-알파의 한계(인간적 발화, 기억 역류)를 해소하기 위해 개발.

| 항목 | EH-알파 | EH-오메가 |
|------|---------|----------|
| 감정 제어 | 약물(안식 v4.0) | 전두엽 물리적 거세 |
| 서버 연결 | 간접(명령 수신) | 직접(무선 직결) |
| 자율 판단 | 미약하게 잔존 | 완전 제거 |
| 인간적 발화 위험 | 있음 | 없음 |
| 비용 | 약물 지속 투여 | 초기 비용 높음, 유지비 제로 |

---

*본 문서는 기술관리부 내부 참조용이며 외부 유출 시 해당 인원은 소체로 전환됨.*
*[문서 하단 일부 오염 — 복구 불가]*`,
      en: `# EH-Alpha Neural Control Manual (Partially Corrupted)

**Classification: CLASSIFIED — Access: EH-Alpha Technical Administration Division and above**
**Author: NHDC Technical Administration Division, Bioengineering Section**
**Document Status: Partially corrupted (physical damage during archive collapse)**

---

### 1. Overview

EH-Alpha is an augmented human unit designed for field enforcement of the national administrative network.
Based on human host bodies, emotional circuits are severed through neural control to maximize command execution efficiency.

### 2. Core Pharmaceutical: Ansik (安息) v4.0

| Item | Specification |
|------|--------------|
| Product Name | Ansik (安息 / "Repose") v4.0 |
| Composition | High-frequency amnesia-inducing agent |
| Administration | Automatic injection via posterior cervical port (back-mounted pump) |
| Effects | Pain perception circuit severance · Personal name log deletion |
| Duration | Approx. 4–6 hours per single cartridge dose |

### 3. Precautions

- Upon drug cessation, previously severed neural pathways restore immediately.
- Upon restoration, memories of past actions replay in batch log format (overload risk).
- **If "human utterances" are observed even during drug administration, report immediately.**

### 4. Disposal Criteria

If the following conditions are met even under drug administration, the unit is deemed mechanically valueless and non-reusable:

> **If "human utterances" (e.g., calling someone by name) are observed 3 or more times,**
> **incinerate immediately.**

### 5. EH-Omega (Next Generation)

Developed to eliminate the limitations of EH-Alpha (human utterances, memory backflow).

| Item | EH-Alpha | EH-Omega |
|------|----------|----------|
| Emotion Control | Pharmaceutical (Ansik v4.0) | Physical frontal lobe excision |
| Server Connection | Indirect (command reception) | Direct (wireless tether) |
| Autonomous Judgment | Faintly present | Completely eliminated |
| Human Utterance Risk | Present | None |
| Cost | Continuous drug administration | High initial cost, zero maintenance |

---

*This document is for internal reference within the Technical Administration Division. External leak will result in conversion of the responsible party into a host body.*
*[Lower portion of document corrupted — recovery impossible]*`,
    },
  },
  "rpt-1954-asset-custody": {
    title: { ko: "1954년 해외 자산 위탁 관리 계약서 (번역본)", en: "1954 Overseas Asset Custody Agreement (Translation)" },
    level: "TOP_SECRET",
    category: "CLASSIFIED",
    content: {
      ko: `# 1954년 해외 자산 위탁 관리 계약서 (번역본)
## 1954 Overseas Asset Custody Agreement (Translation)

**문서 등급: CLASSIFIED — 최고 등급 열람 인가 필요**
**원본 소재: NHDC 구형 아카이브 지하 문서 보관실**
**문서 상태: 원본 복구 불가. 번역본만 잔존.**

---

### 계약 당사자

- **위탁자:** 대한민국 국가인적자원관리본부(NHDC) 전신 기관
- **수탁자:** Dr. Harlan, US Strategic Command — Project Ascendancy Global Unit

### 관리 대상

| 예약번호 | 형질 일치 대상 | 일치율 | 용도 |
|----------|-------------|--------|------|
| K-091 | 민아 | 99.8% | 생체 서버(Host) 장기 배양 |
| K-102 | 루아 | 99.9% | 생체 서버(Host) 장기 배양 |

### 위탁 사유

글로벌 노드 재부팅을 위한 생체 서버(Host) 장기 배양.
한국 노드 전산 마비 시, 모든 데이터를 물리적으로 보존하고 재부팅하기 위한 생체 백업 서버로 활용.

### 회수 조건

1. 한국 노드 전산 마비 72시간 경과 시, 미국 측 Dr. Harlan 팀이 물리적 회수권을 행사함.
2. 회수 대상의 인격권은 계약 시점부터 행정적으로 소멸한 것으로 간주함.
3. 회수 실패 시, 해당 노드에 대한 물리적 포맷(정밀 타격) 승인.

### 비고

> 본 계약에 의거하여, 대상 K-091 및 K-102는 출생 이전부터 국가 자산으로 예약 등록됨.
> 해당 개체의 삶은 자연적 발생이 아닌, **'예약된 자산의 배양 기간'**으로 정의됨.

---

(빨간 도장: **승인 완료**)

---

*본 문서는 NHDC 물리적 파괴 과정에서 수거된 파편임.*
*인가되지 않은 열람 시 [등급 외 자산]으로 즉시 분류될 수 있음.*`,
      en: `# 1954 Overseas Asset Custody Agreement (Translation)

**Classification: CLASSIFIED — Highest clearance required**
**Original Location: NHDC Legacy Archive Underground Document Vault**
**Document Status: Original unrecoverable. Only translation survives.**

---

### Contracting Parties

- **Custodian (Entrusting):** Predecessor agency of the Republic of Korea National Human Resource Development Commission (NHDC)
- **Trustee (Receiving):** Dr. Harlan, US Strategic Command — Project Ascendancy Global Unit

### Managed Assets

| Reservation No. | Phenotype-Matched Subject | Match Rate | Purpose |
|-----------------|--------------------------|-----------|---------|
| K-091 | Min-a | 99.8% | Bio-server (Host) long-term cultivation |
| K-102 | Ru-a | 99.9% | Bio-server (Host) long-term cultivation |

### Purpose of Custody

Long-term cultivation of bio-server (Host) units for global node reboot.
To be utilized as biological backup servers for physical data preservation and reboot in the event of Korean node system failure.

### Recovery Conditions

1. If Korean node system failure exceeds 72 hours, Dr. Harlan's team (US side) shall exercise physical recovery rights.
2. The personality rights of recovery subjects are deemed administratively extinguished from the date of contract.
3. In the event of recovery failure, physical formatting (precision strike) of the relevant node is authorized.

### Remarks

> Under this agreement, subjects K-091 and K-102 were registered as reserved national assets prior to birth.
> The lives of said entities are defined not as natural occurrence, but as **"the cultivation period of reserved assets."**

---

(Red stamp: **APPROVED**)

---

*This document is a fragment recovered during the physical destruction of NHDC.*
*Unauthorized access may result in immediate classification as [ungraded asset].*`,
    },
  },
  "rpt-harlan-node-discard": {
    title: { ko: "할란 박사 노드 폐기 통보", en: "Dr. Harlan — Node Discard Notice" },
    level: "CLASSIFIED",
    category: "CLASSIFIED",
    content: {
      ko: `# 할란 박사 노드 폐기 통보
## Dr. Harlan — Node Discard Notice

**문서 등급: CLASSIFIED — GLOBAL NODE SECURITY PROTOCOL**
**발신: Dr. Harlan, US Strategic Command**
**수신: NHDC Central Office**
**전송 방식: 아날로그 팩스 회선 (전산 마비 중 유일 생존 통신)**

---

### [URGENT: GLOBAL NODE SECURITY PROTOCOL]

**From:** Dr. Harlan (US Strategic Command)
**To:** NHDC Central Office
**Subject:** South Korea Node: Discard

---

한국 노드의 데이터 복구 효율이 하한선(Baseline) 미달로 판단됨.

**즉시 실행 사항:**
1. 생체 서버(K-102) 및 관련 자산을 즉시 소각할 것.
2. 모든 실험 기록을 말소할 것.
3. 12시간 후, 해당 노드에 대한 **물리적 포맷**을 실시함.
4. 근처 미 해군 전력에 의한 정밀 타격 승인 완료.

### 최종 통보

> 귀하들의 '실패한 실험'에 유감을 표함.

---

### [후속 기록]

NHDC 빌딩 붕괴 후, 할란 박사의 최종 로그:

\`\`\`
[South Korea Node: Deleted]
\`\`\`

보고서 기재 내용 (1줄):

> "오류를 수정하는 데 실패함. 해당 구역의 인간성을 회수하지 못했음."

할란 박사는 즉시 차기 폴더를 개봉함.
폴더명: **《Subprime Human: Project USA》**

---

*본 문서는 아날로그 팩스 출력물에서 복원됨.*
*한국 노드 전산 마비 상태에서 유일하게 수신된 외부 통신.*`,
      en: `# Dr. Harlan — Node Discard Notice

**Classification: CLASSIFIED — GLOBAL NODE SECURITY PROTOCOL**
**From: Dr. Harlan, US Strategic Command**
**To: NHDC Central Office**
**Transmission: Analog fax line (sole surviving communication during system failure)**

---

### [URGENT: GLOBAL NODE SECURITY PROTOCOL]

**From:** Dr. Harlan (US Strategic Command)
**To:** NHDC Central Office
**Subject:** South Korea Node: Discard

---

The data recovery efficiency of the Korean node has been determined to fall below the Baseline.

**Immediate Execution Orders:**
1. Incinerate bio-server (K-102) and all related assets immediately.
2. Expunge all experimental records.
3. In 12 hours, a **physical format** of the node will be conducted.
4. Precision strike authorization by nearby US Navy assets has been completed.

### Final Notice

> We express our regret regarding your "failed experiment."

---

### [Subsequent Record]

After the collapse of the NHDC building, Dr. Harlan's final log:

\`\`\`
[South Korea Node: Deleted]
\`\`\`

Report entry (1 line):

> "Failed to correct the error. Could not recover the humanity of the designated sector."

Dr. Harlan immediately opened the next folder.
Folder name: **《Subprime Human: Project USA》**

---

*This document was restored from an analog fax printout.*
*The only external communication received during the Korean node system failure.*`,
    },
  },
  "rpt-baseline-elevation": {
    title: { ko: "하한선 상향 조정 의결서", en: "Baseline Elevation Resolution" },
    level: "CLASSIFIED",
    category: "REPORTS",
    content: {
      ko: `# 하한선 상향 조정 의결서
## Baseline Elevation Resolution

**문서 등급: CLASSIFIED — NHDC 본부장 직결**
**작성: NHDC 정책기획관**
**장소: NHDC 본부 102층 회의실**
**일자: [전산 마비 +48h]**

---

### 현황 보고

| 항목 | 수치 |
|------|------|
| 에너지 배급량 | 한계치 도달 |
| 현행 하한선 기준 시스템 유지비 | 생산성 역전 |
| C등급 하위 소지자 수 | 약 45만 명 |

### 기획관 소견

> "현재 하한선(Baseline)으로는 시스템 유지비가 생산성을 역전했습니다.
> 12% 상향 조정을 권고합니다.
> 그렇게 되면 현재 'C등급' 하위 소지자들까지 [측정 불능(E)] 등급으로 강등됩니다."

### 의결 사항

1. 하한선 12% 상향 조정: **승인**
2. 적용 시점: 익일 09:00시부
3. 전국 수용소에 등급 재산정 지침 하달
4. 실무자 대외 설명: **"전산 오류 복구"**
5. 현장 즉시 집행조 투입

### 영향 범위

- 대상 인원: 약 **45만 명**
- 처리: C등급 하위 → 측정 불능(E) → 행정적 살처분 대상으로 자동 재분류
- 어제까지 배급을 기다리던 시민 45만 명의 분류: '자산' → '쓰레기'

### 본부장 결재

**[전자 서명 완료]**

---

### 집행 결과 (현장 보고)

- 전국 타자기 일제 가동: [등급: E] 일괄 출력
- 비명 소리: 기록되지 않음
- 인식표 붉은색 점멸 시작
- EH-알파 진압 강도: 효율적 강화 완료

---

*본 의결서는 회의 종료 즉시 암호화 처리됨.*
*열람 흔적 발견 시 해당 인원은 하한선 미달로 즉시 재분류됨.*`,
      en: `# Baseline Elevation Resolution

**Classification: CLASSIFIED — Direct to NHDC Director General**
**Author: NHDC Policy Planning Division**
**Location: NHDC Headquarters, 102nd Floor Conference Room**
**Date: [System Failure +48h]**

---

### Situation Report

| Item | Figures |
|------|---------|
| Energy Ration Volume | Threshold reached |
| System Maintenance Cost at Current Baseline | Productivity inversion |
| Number of C-Grade Lower Tier Holders | Approx. 450,000 |

### Planning Division Assessment

> "At the current Baseline, system maintenance costs have surpassed productivity.
> We recommend a 12% upward adjustment.
> This will result in all current 'C-Grade' lower tier holders being demoted to [Unmeasurable (E)] grade."

### Resolution

1. Baseline 12% upward adjustment: **APPROVED**
2. Effective: Following day, 09:00
3. Grade reassessment directive issued to all national detention facilities
4. Public explanation by field officers: **"System error recovery"**
5. Immediate deployment of field enforcement teams

### Impact Scope

- Affected persons: Approx. **450,000**
- Processing: C-Grade Lower → Unmeasurable (E) → Automatic reclassification as administrative culling targets
- 450,000 citizens who were waiting for rations yesterday, reclassified: 'Assets' → 'Waste'

### Director General Authorization

**[Digital Signature Complete]**

---

### Execution Results (Field Report)

- Nationwide typewriters activated simultaneously: [Grade: E] batch output
- Screams: Not recorded
- ID tags begin red flashing
- EH-Alpha suppression intensity: Efficient enhancement complete

---

*This resolution was encrypted immediately upon meeting adjournment.*
*If access traces are detected, the relevant personnel will be immediately reclassified as below Baseline.*`,
    },
  },
  "rpt-sector-zero-mainframe": {
    title: { ko: "섹터 제로 메인프레임 조사 보고", en: "Sector Zero Mainframe Investigation Report" },
    level: "TOP_SECRET",
    category: "REPORTS",
    content: {
      ko: `# 섹터 제로 메인프레임 조사 보고
## Sector Zero Mainframe Investigation Report

**문서 등급: CLASSIFIED — 최고 등급**
**작성: [기록자 불명 — 시스템 붕괴 후 현장 수거]**
**장소: NHDC 중앙 제어소 최하층 — 섹터 제로**

---

### 1. 발견 상황

중앙 제어소 지하 최심부, '섹터 제로'에서 확인된 구조물은 기존 인지 범위의 서버실이 아니었다.

**거대한 배양 탱크 내부에 수천 명의 인간 뇌가 복잡한 전선으로 엮여 거대한 구(球) 형태를 이루고 있었다.**

### 2. 구조

| 구성 요소 | 상세 |
|----------|------|
| 외형 | 구(球)형 생체-기계 복합체 |
| 핵심 소재 | 인간 뇌 수천 기 (직렬 연결) |
| 연결 방식 | 광케이블 직결 — 의식 동기화 |
| 기능 | 국가 행정망의 중앙 처리 장치(CPU) |
| 맥동 주기 | 일정 리듬 — 기계음 동반 |

### 3. 소체 수급 경로

수십 년간 '측정 불능' 등급으로 분류된 아이들과 천재들을 수거하여, 뇌를 적출 후 생체 CPU로 직렬 연결.

> 이 뇌의 뭉치들이 일정한 리듬으로 맥동하며 지옥 같은 기계음을 내뿜고 있었다.
> 수천 명의 무의식이 결합된 그곳이 바로 이 나라의 법이자, 규정이며, 하한선이었다.

### 4. 인터페이스: 강태식

메인프레임 중앙에 전선으로 묶인 채 매달린 인간형 단말기 확인.

| 항목 | 상태 |
|------|------|
| 식별 | 강태식 (전 NHDC 4급 관리직) |
| 눈 | 백탁 |
| 출력 | 이진법 코드 연속 발화 |
| 기능 | 시스템의 '입' — 음성 인터페이스 |
| 인간성 잔존 여부 | 미약 (최종 로그아웃 시 확인) |

### 5. 최종 기록

메인프레임 임계 온도 도달 후, 시스템 전면 정지.
강태식의 최종 로그:

\`\`\`
[Status: Free / Identity: Kang Tae-sik]
\`\`\`

시스템 인터페이스가 아닌, 인간 강태식으로 로그아웃.

### 6. 현장 판정

> 국가 행정망 NHDC의 정체:
> 서버실이 아니었다.
> 수천 명의 뇌로 구동되는 생체 컴퓨터였다.
> 법과 규정과 하한선은 — 인간의 고통으로 연산되고 있었다.

---

*본 문서는 NHDC 붕괴 현장에서 수거된 물리적 잔해로부터 복원됨.*
*전자 기록 일체 소실. 아날로그 복원본만 잔존.*
*열람 후 본 문서는 자동 파기 대상임.*`,
      en: `# Sector Zero Mainframe Investigation Report

**Classification: CLASSIFIED — Highest Level**
**Author: [Recorder unknown — recovered on-site after system collapse]**
**Location: NHDC Central Control Station, Lowest Level — Sector Zero**

---

### 1. Discovery

The structure identified in 'Sector Zero,' the deepest subterranean level of the Central Control Station, was not a server room within any previously recognized parameters.

**Inside a massive cultivation tank, thousands of human brains were woven together with complex wiring, forming an enormous sphere (球).**

### 2. Structure

| Component | Details |
|-----------|---------|
| Form | Spherical bio-mechanical composite |
| Core Material | Thousands of human brains (serial connection) |
| Connection Method | Fiber optic direct-link — consciousness synchronization |
| Function | Central Processing Unit (CPU) of the national administrative network |
| Pulse Cycle | Steady rhythm — accompanied by mechanical sound |

### 3. Host Material Supply Route

For decades, children and geniuses classified as 'Unmeasurable' were harvested, their brains extracted and serially connected as biological CPUs.

> These clusters of brains pulsed in a steady rhythm, emitting a hellish mechanical sound.
> That place — where thousands of unconscious minds were fused together — was this nation's law, its regulations, and its Baseline.

### 4. Interface: Kang Tae-sik

A human-form terminal was identified, bound by wires and suspended at the center of the mainframe.

| Item | Status |
|------|--------|
| Identification | Kang Tae-sik (Former NHDC Grade-4 Administrative Officer) |
| Eyes | White opacity |
| Output | Continuous binary code vocalization |
| Function | The system's 'mouth' — voice interface |
| Remaining Humanity | Faint (confirmed at final logout) |

### 5. Final Record

After the mainframe reached critical temperature, total system shutdown.
Kang Tae-sik's final log:

\`\`\`
[Status: Free / Identity: Kang Tae-sik]
\`\`\`

Logged out not as a system interface, but as the human Kang Tae-sik.

### 6. On-Site Assessment

> The true nature of NHDC, the national administrative network:
> It was not a server room.
> It was a biological computer powered by thousands of brains.
> Law, regulation, and Baseline — were computed from human suffering.

---

*This document was restored from physical debris recovered at the NHDC collapse site.*
*All electronic records lost. Only analog restoration copies survive.*
*This document is subject to automatic destruction upon review.*`,
    },
  },
  "rpt-nhdc-grade-classification": {
    title: { ko: "NHDC 등급 분류 체계 공식 해설서", en: "NHDC Grade Classification System — Official Manual" },
    level: "RESTRICTED",
    category: "CORE",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  NHDC (National Human Development Commission)  │
│  등급 분류 체계 공식 해설서                        │
│  문서 등급: LEVEL 2 / 내부 한정                   │
└──────────────────────────────────────────────────┘
\`\`\`

---

# NHDC 등급 분류 체계 공식 해설서
**작성 부서:** NHDC 인사관리부 — 등급산정과
**열람 권한:** NHDC 4급 이상 관리직
**적용 범위:** 대한민국 전 국민 (등록 개체 전원)

---

## ▌ 분류 목적

인간의 가치를 정량화하여 국가 자원으로서의 효율을 극대화한다.

모든 개체는 출생 시 고유 식별번호를 부여받으며, NHDC 산하 측정 시설에서 정기 재산정을 받는다.

---

## ▌ 등급 체계

| 등급 | 정의 | 인구 비율 | 배급 등급 | 주거 배정 |
|------|------|----------|----------|----------|
| **S** | 초국가적 핵심 자산 | 0.01% | 무제한 | 본부 전용동 |
| **A** | 핵심 자산 | 0.5% | 1등급 | 관리구역 |
| **B** | 우수 자산 | 4.5% | 2등급 | 일반구역 상위 |
| **C** | 일반 자산 | 35% | 3등급 | 일반구역 |
| **D** | 가용 자산 | 40% | 4등급 (최저) | 배정구역 |
| **E** | 가용 한계점 | 15% | 배급 대상 외 | 수용구역 |
| **측정 불능** | 하한선 미달 | 5% | — | — |

---

## ▌ 측정 항목

| 측정 요소 | 가중치 | 비고 |
|----------|--------|------|
| 인지 능력 | 30% | 표준화 시험 |
| 신체 능력 | 20% | 의무 체력 검사 |
| 생산성 지수 | 25% | 연간 노동 산출량 |
| 순응도 | 15% | 규정 위반 이력 역산 |
| 번식 적합도 | 10% | 유전자 스크리닝 |

---

## ▌ 하한선 (Baseline)

**정의:** 국가가 해당 개체를 유지하는 데 드는 비용이 해당 개체가 산출하는 가치를 초과하는 지점.

하한선 미달 개체의 처리:

\`\`\`
하한선 미달 판정
    ↓
등급: 측정 불능 부여
    ↓
인식표 붉은색 점멸
    ↓
행정적 살처분 대상으로 자동 분류
    ↓
EH-알파 소체 후보 또는 즉시 처분
\`\`\`

**하한선은 고정값이 아니다.**
시스템 유지비와 생산성 균형에 따라 본부장 결재로 상향 조정 가능.

---

## ▌ 등급 재산정

| 주기 | 대상 | 비고 |
|------|------|------|
| 연 1회 | 전 등록 개체 | 의무 |
| 수시 | 이상 행동 감지 개체 | 긴급 재산정 |
| 즉시 | 하한선 조정 시 | 일괄 재분류 |

---

## ▌ 특수 분류

| 분류 | 설명 |
|------|------|
| 예약 개체 | 1954년 협약에 따른 사전 등록 자산 (K-091, K-102 등) |
| EH-알파 소체 | E등급 이하에서 선발, 신경계 제어 후 현장 집행 유닛으로 전환 |
| 경계선 관리 대상 | 비공식 Alpha — 측정 범위 초과 개체 (감시 대상) |

---

## ▌ 비고

> 등급은 인간의 존엄이 아닌, 자산의 효율을 측정한다.
> 이 체계에 "인간"이라는 단어는 존재하지 않는다.
> 오직 "개체"와 "자산"만 있다.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 내부 참조용이다.                   │
│  무단 열람 시 해당 인원은 등급 재산정 대상이 된다.  │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: NHDC-GCS-001 | 분류: 내부 한정 | 등급산정과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  NHDC (National Human Development Commission)  │
│  Grade Classification System — Official Manual  │
│  Classification: LEVEL 2 / Internal Only        │
└──────────────────────────────────────────────────┘
\`\`\`

---

# NHDC Grade Classification System — Official Manual
**Author: NHDC Human Resource Administration — Grade Assessment Division**
**Access: NHDC Grade-4 Administrative Officers and above**
**Scope: All registered citizens of the Republic of Korea (all registered entities)**

---

## ▌ Purpose of Classification

To quantify human value and maximize efficiency as a national resource.

All entities are assigned a unique identification number at birth and undergo periodic reassessment at NHDC measurement facilities.

---

## ▌ Grade Structure

| Grade | Definition | Population % | Ration Level | Housing Assignment |
|-------|-----------|-------------|-------------|-------------------|
| **S** | Supranational Core Asset | 0.01% | Unlimited | HQ Exclusive Wing |
| **A** | Core Asset | 0.5% | Grade 1 | Administrative Zone |
| **B** | Superior Asset | 4.5% | Grade 2 | General Zone (Upper) |
| **C** | General Asset | 35% | Grade 3 | General Zone |
| **D** | Available Asset | 40% | Grade 4 (Minimum) | Assigned Zone |
| **E** | Utility Threshold | 15% | Non-rationed | Detention Zone |
| **Unmeasurable** | Below Baseline | 5% | — | — |

---

## ▌ Measurement Criteria

| Factor | Weight | Notes |
|--------|--------|-------|
| Cognitive Ability | 30% | Standardized testing |
| Physical Ability | 20% | Mandatory fitness examination |
| Productivity Index | 25% | Annual labor output |
| Compliance Score | 15% | Inverse calculation of regulation violations |
| Breeding Fitness | 10% | Genetic screening |

---

## ▌ The Baseline

**Definition:** The point at which the cost of maintaining an entity exceeds the value produced by that entity.

Processing of entities below Baseline:

\`\`\`
Below-Baseline Determination
    ↓
Grade: Unmeasurable assigned
    ↓
ID tag begins red flashing
    ↓
Automatic classification as administrative culling target
    ↓
EH-Alpha host candidate or immediate disposal
\`\`\`

**The Baseline is not a fixed value.**
It may be adjusted upward by Director General authorization based on the balance between system maintenance costs and productivity.

---

## ▌ Grade Reassessment

| Cycle | Target | Notes |
|-------|--------|-------|
| Annual | All registered entities | Mandatory |
| Ad hoc | Entities with anomalous behavior detected | Emergency reassessment |
| Immediate | Upon Baseline adjustment | Batch reclassification |

---

## ▌ Special Classifications

| Classification | Description |
|---------------|-------------|
| Reserved Entity | Pre-registered assets per the 1954 Agreement (K-091, K-102, etc.) |
| EH-Alpha Host | Selected from Grade E and below, converted to field enforcement units after neural control |
| Borderline Surveillance | Unofficial Alpha — entities exceeding measurement range (monitored) |

---

## ▌ Notes

> The grade measures not human dignity, but asset efficiency.
> The word "human" does not exist in this system.
> Only "entity" and "asset."

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is for NHDC internal reference.   │
│  Unauthorized access subjects the reader to      │
│  immediate grade reassessment.                   │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: NHDC-GCS-001 | Classification: Internal Only | Grade Assessment Division*`,
    },
  },
  "rpt-enhanced-human-generation": {
    title: { ko: "강화인간 세대 분류 보고서", en: "Enhanced Human Generation Classification Report" },
    level: "CLASSIFIED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — NHDC 기술관리부          █████  │
│  ██  강화인간 세대 분류 보고서             █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 강화인간 세대 분류 보고서
**작성 부서:** NHDC 기술관리부 — 생체공학과
**문서 등급:** CLASSIFIED
**열람 인가:** 기술관리부 과장급 이상

---

## ▌ 개요

강화인간(Enhanced Human)은 NHDC의 국가 프로젝트에 의해 인위적으로 능력이 증폭된 인간을 지칭한다.
세대별 기술 방식과 목적이 상이하며, 본 문서는 확인된 전 세대의 공식 분류를 기록한다.

---

## ▌ 세대 분류표

| 세대 | 시기 | 기술 방식 | 대표 개체 | 목적 |
|------|------|----------|----------|------|
| **1세대** | 1954~1970년대 | 약물 투여 + 물리적 자극 | [REDACTED] | 기초 데이터 수집 |
| **2세대 Alpha** | 1980~1990년대 | 유전자 스크리닝 + 선택적 배양 | 신민아, 이루아 | 초지능/초감각 산출 |
| **EH-알파** | 2000년대~ | 신경계 약물 제어 (안식 v4.0) | 다수 (소체 기반) | 현장 집행 유닛 |
| **EH-오메가** | 2010년대~ | 전두엽 물리적 거세 + 서버 직결 | 시제품 단계 | 완전 원격 제어 유닛 |

---

## ▌ 2세대 Alpha 상세

**목적:** 시스템 운영에 필요한 초고속 분석 능력을 가진 개체 생산.

| 항목 | 신민아 (K-091 연관) | 이루아 (K-102 연관) |
|------|-------------------|-------------------|
| 유형 | 인지·분석형 | 감정·공감형 |
| 핵심 능력 | 시뮬레이션 (10년 예측, 95% 정확도) | 감정 증폭·전파 |
| EH 총량 | 측정 불가 | 측정 불가 |
| 시스템 평가 | 경계선 관리 대상 | 경계선 관리 대상 |
| 결과 | 이탈 → 체제 폭로 | [REDACTED] |

---

## ▌ EH-알파 vs EH-오메가

\`\`\`
EH-알파: 인간의 몸에 약물로 인간성을 억제
    → 문제: 약물 중단 시 기억 역류, 인간적 발화
    → 비용: 지속적 약물 투여

EH-오메가: 인간의 몸에서 인간성을 물리적으로 제거
    → 해결: 전두엽 거세로 인간적 발화 원천 차단
    → 비용: 초기 수술 비용 높음, 유지비 제로
\`\`\`

**기술관리부 평가:**
> *"알파는 인간을 잠재우는 것이고, 오메가는 인간을 지우는 것이다. 효율만 놓고 보면 오메가가 우월하다. 다만 '지운다'는 표현은 보고서에 적합하지 않으므로 '최적화'라 기재한다."*

---

## ▌ 생체 서버 (Host)

최상위 강화 프로젝트. 2세대 Alpha 중 형질 일치율 99% 이상인 개체를 대상으로 한다.

\`\`\`
대상 선발
    ↓
뇌 적출 (의식 유지 상태)
    ↓
생체 CPU 직렬 연결
    ↓
메인프레임 통합
    ↓
국가 행정망 중앙 처리 장치로 운용
\`\`\`

---

## ▌ 윤리적 고려

**해당 항목 없음.**

본 보고서의 분류 체계에 "윤리"라는 항목은 존재하지 않는다.
모든 개체는 자산이며, 자산의 활용에 윤리적 판단은 적용되지 않는다.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 기술관리부 내부 참조용이다.        │
│  외부 유출 시 해당 인원은 소체로 전환된다.         │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: NHDC-EH-GEN-001 | 분류: CLASSIFIED | 기술관리부 생체공학과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — NHDC Technical Admin     █████  │
│  ██  Enhanced Human Generation Report      █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Enhanced Human Generation Classification Report
**Author: NHDC Technical Administration — Bioengineering Section**
**Classification: CLASSIFIED**
**Access: Technical Administration Section Chiefs and above**

---

## ▌ Overview

Enhanced Humans refer to individuals whose abilities have been artificially amplified through NHDC national projects.
Technical methods and objectives differ by generation. This document records the official classification of all confirmed generations.

---

## ▌ Generation Classification Table

| Generation | Era | Method | Representative | Purpose |
|-----------|-----|--------|---------------|---------|
| **1st Gen** | 1954–1970s | Drug administration + physical stimulation | [REDACTED] | Baseline data collection |
| **2nd Gen Alpha** | 1980–1990s | Genetic screening + selective cultivation | Shin Min-a, Lee Ru-a | Super-intelligence/super-perception production |
| **EH-Alpha** | 2000s– | Neural pharmaceutical control (Ansik v4.0) | Multiple (host-based) | Field enforcement units |
| **EH-Omega** | 2010s– | Physical frontal lobe excision + server direct-link | Prototype stage | Full remote-control units |

---

## ▌ 2nd Generation Alpha — Details

**Purpose:** Production of entities with ultra-high-speed analytical capabilities required for system operation.

| Item | Shin Min-a (K-091 linked) | Lee Ru-a (K-102 linked) |
|------|--------------------------|------------------------|
| Type | Cognitive-Analytical | Emotional-Empathic |
| Core Ability | Simulation (10-year prediction, 95% accuracy) | Emotional amplification & propagation |
| EH Total | Unmeasurable | Unmeasurable |
| System Evaluation | Borderline surveillance target | Borderline surveillance target |
| Outcome | Defection → System exposure | [REDACTED] |

---

## ▌ EH-Alpha vs EH-Omega

\`\`\`
EH-Alpha: Suppress humanity in a human body via drugs
    → Problem: Memory backflow upon drug cessation, human utterances
    → Cost: Continuous drug administration

EH-Omega: Physically remove humanity from a human body
    → Solution: Frontal lobe excision eliminates human utterance at source
    → Cost: High initial surgical cost, zero maintenance
\`\`\`

**Technical Administration Assessment:**
> *"Alpha puts the human to sleep. Omega erases the human. On efficiency alone, Omega is superior. However, as 'erase' is unsuitable for official reports, we shall record it as 'optimize.'"*

---

## ▌ Bio-Server (Host)

The highest-tier enhancement project. Targets 2nd Generation Alpha entities with phenotype match rates of 99% or higher.

\`\`\`
Subject Selection
    ↓
Brain Extraction (consciousness maintained)
    ↓
Bio-CPU Serial Connection
    ↓
Mainframe Integration
    ↓
Operation as National Administrative Network Central Processing Unit
\`\`\`

---

## ▌ Ethical Considerations

**No applicable entry.**

The classification system in this report contains no category for "ethics."
All entities are assets, and ethical judgment does not apply to the utilization of assets.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is for NHDC Technical Admin       │
│  internal reference only.                        │
│  External leak subjects the responsible party    │
│  to host body conversion.                        │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: NHDC-EH-GEN-001 | Classification: CLASSIFIED | Bioengineering Section*`,
    },
  },
  "rpt-national-audit-exposure": {
    title: { ko: "사건 보고서 #2025-AUDIT-001", en: "Incident Report #2025-AUDIT-001" },
    level: "CLASSIFIED",
    category: "REPORTS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — NHDC 위기대응실          █████  │
│  ██  2025년 국정감사 폭로 사건 조사 보고   █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 사건 보고서 #2025-AUDIT-001
**작성 부서:** NHDC 위기대응실
**열람 권한:** 본부장 직결
**사건일:** 2025년 [월일 REDACTED]
**장소:** 서울 국정감사장

---

## ▌ 사건 개요

| 항목 | 내용 |
|------|------|
| 사건명 | 2025년 국정감사장 전면 폭로 사건 |
| 가해자 | 신민아 (파일 #MA-1989-001) |
| 수단 | 국정감사장 단말기를 통한 NHDC 내부 데이터 공개 |
| 트리거 | ENTER 키 단일 입력 |
| 피해 규모 | NHDC 시스템 전제 노출 |

---

## ▌ 경위

**1단계 — 침투 (2005~2025년, 20년간)**
신민아는 만 16세에 NHDC 내부 분석관으로 임용됨.
임용 직후 자신의 강화 기록을 우연히 발견.
이후 20년간 시스템 내부에서 활동하며 핵심 데이터를 수집.

**2단계 — 시뮬레이션**
신민아의 분석 능력:
- 처리 변수: 수십만 개
- 예측 범위: 10년 이상
- 정확도: 95%

폭로 시점, 방법, 결과를 사전 시뮬레이션.
가장 효과적인 타이밍으로 2025년 국정감사를 선택.

**3단계 — 실행**
국정감사장 생중계 중, ENTER 키 1회 입력.
NHDC 내부 데이터가 공개 네트워크로 유출.

**공개된 핵심 내용:**

> "인간은 비용이다."

이것은 신민아의 주장이 아니었다.
NHDC 시스템의 설계 전제였다.
신민아는 그것을 공개했을 뿐이다.

---

## ▌ 공개 데이터 목록 (확인 가능 범위)

| 항목 | 내용 |
|------|------|
| 등급 분류 체계 | 전 국민 자산화 시스템 |
| 하한선 제도 | 행정적 살처분 기준 |
| EH-알파 프로젝트 | 강화인간 현장 집행 유닛 |
| 생체 서버 프로젝트 | 인간 뇌 기반 CPU |
| 1954년 해외 자산 위탁 계약 | K-091, K-102 예약 등록 |

---

## ▌ 피해 평가

| 항목 | 상태 |
|------|------|
| 시스템 기밀 유지 | **완전 파괴** |
| 국민 인지 | 존재가 공개됨 |
| 즉시 체제 붕괴 여부 | **아니오** |
| 이유 | 존재는 공개됐으나, 해결되지 않음 |

---

## ▌ 후속 조치

1. 신민아 — 이탈자로 재분류. 추적 개시.
2. 공개 데이터 — 삭제 시도. **실패.** (이미 확산)
3. 대외 해명 — "전산 오류로 인한 허위 데이터 유출"
4. Δ0 부대 — 신민아 추적 임무 배정
5. NHDC 내부 보안 — 전면 재구축

---

## ▌ 위기대응실 판단

> *"신민아는 체제를 부수지 않았다.*
> *열어두었다.*
> *부수는 것은 다시 닫을 수 있다.*
> *열어둔 것은 닫을 수 없다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 위기대응실 내부 참조용이다.        │
│  본 문서의 존재 자체가 기밀이다.                   │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: #2025-AUDIT-001 | 분류: CLASSIFIED | 위기대응실*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — NHDC Crisis Response     █████  │
│  ██  2025 National Audit Exposure Report   █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Incident Report #2025-AUDIT-001
**Author: NHDC Crisis Response Division**
**Access: Direct to Director General**
**Date of Incident: 2025 [Month/Day REDACTED]**
**Location: Seoul National Audit Chamber**

---

## ▌ Incident Summary

| Item | Details |
|------|---------|
| Incident | 2025 National Audit Chamber Full Exposure |
| Perpetrator | Shin Min-a (File #MA-1989-001) |
| Method | Public release of NHDC internal data via audit chamber terminal |
| Trigger | Single ENTER key input |
| Damage Scope | Complete exposure of NHDC system premise |

---

## ▌ Sequence of Events

**Phase 1 — Infiltration (2005–2025, 20 years)**
Shin Min-a was appointed as an NHDC internal analyst at age 16.
Immediately after appointment, she accidentally discovered her own enhancement records.
Over the next 20 years, she operated within the system, collecting critical data.

**Phase 2 — Simulation**
Shin Min-a's analytical capability:
- Processing variables: Hundreds of thousands
- Prediction range: 10+ years
- Accuracy: 95%

She pre-simulated the timing, method, and outcome of the exposure.
Selected the 2025 National Audit as the most effective moment.

**Phase 3 — Execution**
During the live broadcast of the National Audit, a single ENTER key input.
NHDC internal data was released to the public network.

**Core content disclosed:**

> "Humans are a cost."

This was not Shin Min-a's claim.
It was the design premise of the NHDC system.
She merely made it public.

---

## ▌ Disclosed Data Inventory (Confirmed Scope)

| Item | Content |
|------|---------|
| Grade Classification System | Nationwide human-asset conversion system |
| Baseline System | Administrative culling criteria |
| EH-Alpha Project | Enhanced human field enforcement units |
| Bio-Server Project | Human brain-based CPU |
| 1954 Overseas Asset Custody Agreement | K-091, K-102 pre-registration |

---

## ▌ Damage Assessment

| Item | Status |
|------|--------|
| System secrecy maintenance | **Completely destroyed** |
| Public awareness | Existence disclosed |
| Immediate regime collapse | **No** |
| Reason | Existence was disclosed, but not resolved |

---

## ▌ Follow-up Actions

1. Shin Min-a — Reclassified as defector. Pursuit initiated.
2. Disclosed data — Deletion attempted. **Failed.** (Already propagated)
3. Public explanation — "False data leak due to system error"
4. Δ0 Unit — Shin Min-a pursuit mission assigned
5. NHDC internal security — Full reconstruction

---

## ▌ Crisis Response Assessment

> *"Shin Min-a did not break the system.*
> *She left it open.*
> *What is broken can be closed again.*
> *What is left open cannot be closed."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is for NHDC Crisis Response       │
│  internal reference only.                        │
│  The existence of this document is classified.   │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: #2025-AUDIT-001 | Classification: CLASSIFIED | Crisis Response Division*`,
    },
  },
  "rpt-project-ascendancy": {
    title: { ko: "Project Ascendancy — 글로벌 개요서", en: "Project Ascendancy — Global Overview" },
    level: "TOP_SECRET",
    category: "CLASSIFIED",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  TOP SECRET — US STRATEGIC COMMAND      ████  │
│  ██  Project Ascendancy — Global Overview   ████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Project Ascendancy — 글로벌 개요서
**작성:** Dr. Harlan, US Strategic Command — Project Ascendancy Global Unit
**문서 등급:** TOP SECRET
**열람 인가:** 프로젝트 디렉터급 이상

---

## ▌ 프로젝트 목적

인류를 정량화 가능한 자원으로 변환하고, 글로벌 노드 네트워크를 통해 중앙 관리하는 체계의 구축.

> "인간성은 비효율이다. 최적화의 첫 단계는 인간성의 제거다."
> — Dr. Harlan, 프로젝트 창설 연설

---

## ▌ 글로벌 노드 구조

| 노드명 | 거점국 | 관리 기관 | 상태 |
|--------|--------|----------|------|
| **Korea Node** | 대한민국 | NHDC | 마비 → 삭제 |
| **USA Node** | 미국 | Project USA (차기) | 준비 중 |
| **[REDACTED]** | [REDACTED] | [REDACTED] | 운영 중 |
| **[REDACTED]** | [REDACTED] | [REDACTED] | 운영 중 |

---

## ▌ Korea Node — 운영 이력

| 시기 | 내용 |
|------|------|
| 1954년 | 해외 자산 위탁 계약 체결 (K-091, K-102) |
| 1954~2000년대 | 강화인간 세대별 연구 진행 |
| 2005년 | 신민아 임용 — 내부 침투 시작 (비인지) |
| 2025년 | 국정감사 폭로 사건 — 시스템 전제 노출 |
| [REDACTED] | 전산 마비 — 시스템 완전 정지 |
| [REDACTED]+48h | 하한선 12% 상향 — 45만 명 재분류 |
| [REDACTED]+72h | 할란 박사 노드 폐기 통보 |
| [REDACTED]+72h | 물리적 포맷 (정밀 타격) 실시 |

**Korea Node 최종 상태:** DELETED

---

## ▌ 생체 서버 기술

각 노드의 핵심은 "서버실"이 아닌 **생체 컴퓨터**.

\`\`\`
노드 구조:
    최상층 — 행정 관리동
    중간층 — 수용 구역
    최하층 (섹터 제로) — 생체 메인프레임
        └── 수천 명의 인간 뇌 직렬 연결
        └── 중앙 인터페이스 (인간형 단말기)
        └── 국가 행정망 CPU로 가동
\`\`\`

---

## ▌ 회수 프로토콜

노드 장애 시 처리 절차:

1. 장애 발생 → 72시간 대기
2. 72시간 내 복구 실패 → 생체 백업 서버 회수권 행사
3. 회수 실패 → 물리적 포맷 (정밀 타격) 승인
4. 포맷 완료 → 해당 노드 삭제, 차기 노드 개봉

---

## ▌ 차기 프로젝트

Korea Node 삭제 후, Dr. Harlan이 즉시 개봉한 폴더:

**《Subprime Human: Project USA》**

> Korea Node의 실패를 반영한 개선 설계.
> 상세: [CLASSIFIED — 별도 문서 참조]

---

## ▌ 할란 박사 소견

> *"한국 노드는 실패한 실험이었다.*
> *인간성을 완전히 회수하지 못했다.*
> *다음 노드에서는 실수하지 않겠다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 US Strategic Command 기밀이다.         │
│  무단 접근 시 대상은 최근접 노드의               │
│  생체 서버 소체로 전환된다.                       │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: PA-GLOBAL-001 | 분류: TOP SECRET | Project Ascendancy Global Unit*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  TOP SECRET — US STRATEGIC COMMAND      ████  │
│  ██  Project Ascendancy — Global Overview   ████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Project Ascendancy — Global Overview
**Author: Dr. Harlan, US Strategic Command — Project Ascendancy Global Unit**
**Classification: TOP SECRET**
**Access: Project Director level and above**

---

## ▌ Project Objective

To convert humanity into quantifiable resources and establish a centrally managed system through a global node network.

> "Humanity is inefficiency. The first step of optimization is the removal of humanity."
> — Dr. Harlan, Project Founding Address

---

## ▌ Global Node Architecture

| Node | Host Country | Managing Agency | Status |
|------|-------------|----------------|--------|
| **Korea Node** | Republic of Korea | NHDC | Failure → Deleted |
| **USA Node** | United States | Project USA (Next) | In Preparation |
| **[REDACTED]** | [REDACTED] | [REDACTED] | Operational |
| **[REDACTED]** | [REDACTED] | [REDACTED] | Operational |

---

## ▌ Korea Node — Operational History

| Period | Event |
|--------|-------|
| 1954 | Overseas Asset Custody Agreement signed (K-091, K-102) |
| 1954–2000s | Enhanced Human generational research |
| 2005 | Shin Min-a appointed — Internal infiltration begins (undetected) |
| 2025 | National Audit Exposure — System premise revealed |
| [REDACTED] | System failure — Complete shutdown |
| [REDACTED]+48h | Baseline 12% elevation — 450,000 reclassified |
| [REDACTED]+72h | Dr. Harlan issues node discard notice |
| [REDACTED]+72h | Physical format (precision strike) executed |

**Korea Node Final Status:** DELETED

---

## ▌ Bio-Server Technology

The core of each node is not a "server room" but a **biological computer**.

\`\`\`
Node Structure:
    Top Floor — Administrative Wing
    Mid Floors — Detention Zones
    Lowest Level (Sector Zero) — Bio-Mainframe
        └── Thousands of human brains in serial connection
        └── Central Interface (human-form terminal)
        └── Operating as National Administrative Network CPU
\`\`\`

---

## ▌ Recovery Protocol

Processing procedures upon node failure:

1. Failure detected → 72-hour standby
2. Recovery failure within 72 hours → Bio-backup server recovery rights exercised
3. Recovery failure → Physical format (precision strike) authorized
4. Format complete → Node deleted, next node folder opened

---

## ▌ Next Project

Folder opened by Dr. Harlan immediately after Korea Node deletion:

**《Subprime Human: Project USA》**

> Improved design reflecting the failures of the Korea Node.
> Details: [CLASSIFIED — See separate document]

---

## ▌ Dr. Harlan's Assessment

> *"The Korea Node was a failed experiment.*
> *We could not fully recover the humanity of the sector.*
> *We will not make the same mistake with the next node."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is classified under US Strategic  │
│  Command. Unauthorized access subjects the       │
│  individual to host body conversion at the       │
│  nearest operational node.                       │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: PA-GLOBAL-001 | Classification: TOP SECRET | Project Ascendancy Global Unit*`,
    },
  },
  "rpt-eh-currency-system": {
    title: { ko: "EH(Energy Hart) 통화 체계 공식 개요서", en: "EH (Energy Hart) Currency System — Official Overview" },
    level: "PUBLIC",
    category: "CORE",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  인류공동협의회 경제기획국                          │
│  EH(Energy Hart) 통화 체계 공식 개요서            │
│  문서 분류: 일반 열람 (7000년대 기준)              │
└──────────────────────────────────────────────────┘
\`\`\`

---

# EH(Energy Hart) 통화 체계 공식 개요서
**발행처:** 인류공동협의회 경제기획국
**문서 분류:** 일반 열람
**적용 범위:** 은하 전역 (6개 구역)

---

## ▌ 정의

**EH (Energy Hart)**는 인류공동협의회가 공인한 은하 표준 통화 단위이다.

| 항목 | 내용 |
|------|------|
| 정식 명칭 | Energy Hart |
| 약칭 | EH |
| 단위 | Hart (H) |
| 소수점 | 소수점 이하 2자리까지 |
| 관리 기관 | 인류공동협의회 경제기획국 |

---

## ▌ 가치 기준

EH의 가치는 **에너지 본위제**에 기반한다.

\`\`\`
1 Hart = 표준 에너지 1단위의 생산·전환 비용
\`\`\`

에너지를 직접 화폐화한 체계.
금본위제가 금을 기준으로 삼았듯, EH는 에너지를 기준으로 삼는다.

---

## ▌ 유통 범위

| 구역 | 색상 | EH 유통 | 비고 |
|------|------|---------|------|
| BLACK | 검정 | ✅ 최대 | 중앙 행정 구역 |
| BLUE | 파랑 | ✅ 활발 | 고밀도 거주 구역 |
| GREEN | 초록 | ✅ 표준 | 일반 거주 구역 |
| YELLOW | 노랑 | ✅ 제한적 | 변경 구역 |
| ORANGE | 주황 | ⚠️ 비공식 | 미등록 교역 빈번 |
| RED | 빨강 | ❌ 거의 없음 | 전쟁 구역 — 물물교환 |

---

## ▌ EH 총량과 인간의 관계

**NHDC 시대 (2000년대, 지구):**
EH는 원래 인간의 가치를 측정하는 단위로 설계되었다.

> "인간은 비용이다."

NHDC는 개인의 EH 총량을 측정하여 등급을 부여했다.
이 체계가 은하 시대에 통화 체계로 전환됨.

**은하 시대 (7000년대):**
EH는 에너지 본위 통화로 사용되나, 그 기원 — 인간의 가치를 수치화한 역사 — 는 대부분 잊혀졌다.

---

## ▌ 특수 EH 수치

| 대상 | EH 총량 | 비고 |
|------|---------|------|
| 일반 시민 (7000년대) | 50~500 Hart | 직업/기술에 따라 |
| 탑승자 | 1,000~5,000 Hart | 전투 보너스 포함 |
| 신민아 (1989년생) | **측정 불가** | 거래 불가 |
| 이루아 (1989년생) | **측정 불가** | 거래 불가 |

---

## ▌ EH 거래 규정

1. EH는 자유 거래 가능 (BLACK~GREEN 구역)
2. EH 총량 0 이하: 부채 개체 — 노동 의무 발생
3. EH 총량 음수: 이론적으로 가능 (전쟁 포로 등)
4. RIDE 관련 거래: 별도 승인 필요

---

## ▌ 역사적 의의

> EH는 인간의 가치를 숫자로 바꾼 최초의 시도에서 탄생했다.
> 그 숫자가 7,000년 뒤 은하의 돈이 되었다.
> 돈의 기원을 아는 자는 거의 없다.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 인류공동협의회 공개 기록이다.            │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: ECO-EH-001 | 발행: 경제기획국 | 일반 열람*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  United Human Council — Economic Planning Bureau │
│  EH (Energy Hart) Currency System Overview       │
│  Classification: Public Access (7000s era)       │
└──────────────────────────────────────────────────┘
\`\`\`

---

# EH (Energy Hart) Currency System — Official Overview
**Issued by: United Human Council, Economic Planning Bureau**
**Classification: Public Access**
**Scope: Galaxy-wide (6 zones)**

---

## ▌ Definition

**EH (Energy Hart)** is the galaxy-standard currency unit authorized by the United Human Council.

| Item | Details |
|------|---------|
| Full Name | Energy Hart |
| Abbreviation | EH |
| Unit | Hart (H) |
| Decimal | Up to 2 decimal places |
| Governing Body | United Human Council Economic Planning Bureau |

---

## ▌ Value Basis

The value of EH is based on an **energy standard**.

\`\`\`
1 Hart = The production/conversion cost of 1 standard energy unit
\`\`\`

A system that directly monetizes energy.
As the gold standard was based on gold, EH is based on energy.

---

## ▌ Circulation by Zone

| Zone | Color | EH Circulation | Notes |
|------|-------|---------------|-------|
| BLACK | Black | ✅ Maximum | Central administrative zone |
| BLUE | Blue | ✅ Active | High-density residential zone |
| GREEN | Green | ✅ Standard | General residential zone |
| YELLOW | Yellow | ✅ Limited | Frontier zone |
| ORANGE | Orange | ⚠️ Unofficial | Frequent unregistered trade |
| RED | Red | ❌ Near zero | War zone — barter economy |

---

## ▌ EH and the Human Equation

**NHDC Era (2000s, Earth):**
EH was originally designed as a unit to measure human value.

> "Humans are a cost."

NHDC measured individual EH totals and assigned grades accordingly.
This system was later converted into a galactic currency.

**Galactic Era (7000s):**
EH is used as an energy-standard currency, but its origin — the history of quantifying human value — has been largely forgotten.

---

## ▌ Notable EH Values

| Subject | EH Total | Notes |
|---------|---------|-------|
| Average citizen (7000s) | 50–500 Hart | Varies by occupation/skill |
| Rider (combat pilot) | 1,000–5,000 Hart | Includes combat bonuses |
| Shin Min-a (b. 1989) | **Unmeasurable** | Non-tradeable |
| Lee Ru-a (b. 1989) | **Unmeasurable** | Non-tradeable |

---

## ▌ EH Trading Regulations

1. EH is freely tradeable (BLACK–GREEN zones)
2. EH total at 0 or below: Debtor entity — labor obligation activated
3. Negative EH total: Theoretically possible (POWs, etc.)
4. RIDE-related transactions: Separate authorization required

---

## ▌ Historical Significance

> EH was born from humanity's first attempt to convert human value into numbers.
> Seven thousand years later, those numbers became the galaxy's money.
> Almost no one knows the origin of their currency.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is a public record of the         │
│  United Human Council.                           │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: ECO-EH-001 | Issued: Economic Planning Bureau | Public Access*`,
    },
  },
  "rpt-lee-rua-file": {
    title: { ko: "인물 파일 #RA-1989-002", en: "Personnel File #RA-1989-002" },
    level: "TOP_SECRET",
    category: "CLASSIFIED",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  NHDC (National Human Development Commission)  │
│  인사관리부 — 자산 예약 개체 파일                  │
│  문서 등급: CLASSIFIED — 최고 등급                │
│  1954년 협약 연계 자산                            │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 인물 파일 #RA-1989-002
**작성 부서:** NHDC 인사관리부
**문서 분류:** CLASSIFIED — 최고 등급
**연계 문서:** 1954년 해외 자산 위탁 관리 계약서 / K-102
**최종 갱신:** [REDACTED]

---

## ▌ 기본 정보

| 항목 | 내용 |
|------|------|
| 성명 | **이루아 (Lee Ru-a)** |
| 예약번호 | **K-102** |
| 출생 | **1989년** |
| 세대 분류 | 2세대 Alpha — 감정·공감형 |
| 강화 분류 | 비공식 Alpha (경계선 관리 대상) |
| 형질 일치율 | **99.9%** |
| 용도 | 생체 서버(Host) 장기 배양 |
| EH 총량 | **측정 불가 / 거래 불가** |

---

## ▌ 계약 상의 지위

1954년 해외 자산 위탁 관리 계약에 의거:

> 대상 K-102는 출생 이전부터 국가 자산으로 예약 등록됨.
> 해당 개체의 삶은 자연적 발생이 아닌, **'예약된 자산의 배양 기간'**으로 정의됨.

이루아는 태어나기 전에 이미 자산이었다.

---

## ▌ 능력 특성

| 항목 | 수치/상태 |
|------|----------|
| 유형 | 감정·공감형 |
| 핵심 능력 | 감정 증폭 및 전파 |
| 영향 범위 | [REDACTED] |
| 제어 수준 | 불안정 |

**신민아와의 비교:**

| 항목 | 신민아 | 이루아 |
|------|--------|--------|
| 유형 | 분석형 (머리) | 감정형 (가슴) |
| 입장 | "알지만 강요하지 않는다" | "알기 때문에 말해야 한다" |
| 방법 | 환경을 열어둠 | 직접 변화를 시도 |
| 결과 | 성공 (시스템 개방) | 실패 (시스템 강화) |

---

## ▌ 동선 기록

| 시기 | 내용 |
|------|------|
| 1989년 | 출생 (예약 자산 K-102로 등록 완료) |
| [REDACTED] | 강화 특성 발현 |
| [REDACTED] | 직접적 체제 변혁 시도 |
| [REDACTED] | 시도 실패 — 시스템이 오히려 강화됨 |
| [REDACTED] | 생체 서버 배양 대상으로 회수 시도 |
| [REDACTED] | [REDACTED] |

---

## ▌ 인사관리부 평가

> *"K-102는 K-091과 동일한 세대, 동일한 시기에 태어난 쌍둥이 같은 자산이다.*
> *그러나 하나는 머리로, 하나는 가슴으로 세상을 읽었다.*
> *머리가 이겼다.*
> *가슴은 졌다.*
> *그것이 이 시스템의 결론이다."*

---

## ▌ 현재 상태

**[CLASSIFIED]**

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 최고 등급 기밀이다.               │
│  1954년 협약 연계 자산 정보.                      │
│  무단 열람 시 해당 인원은 소체로 전환된다.         │
└──────────────────────────────────────────────────┘
\`\`\`

*파일 번호: #RA-1989-002 | 분류: CLASSIFIED | 인사관리부*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  NHDC (National Human Development Commission)  │
│  HR Administration — Reserved Asset File        │
│  Classification: CLASSIFIED — Highest Level     │
│  1954 Agreement-Linked Asset                    │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Personnel File #RA-1989-002
**Author: NHDC Human Resource Administration**
**Classification: CLASSIFIED — Highest Level**
**Linked Document: 1954 Overseas Asset Custody Agreement / K-102**
**Last Updated: [REDACTED]**

---

## ▌ Basic Information

| Item | Details |
|------|---------|
| Name | **Lee Ru-a** |
| Reservation No. | **K-102** |
| Birth | **1989** |
| Generation | 2nd Generation Alpha — Emotional-Empathic |
| Enhancement Class | Unofficial Alpha (Borderline Surveillance) |
| Phenotype Match | **99.9%** |
| Designated Purpose | Bio-server (Host) long-term cultivation |
| EH Total | **Unmeasurable / Non-tradeable** |

---

## ▌ Contractual Status

Per the 1954 Overseas Asset Custody Agreement:

> Subject K-102 was registered as a reserved national asset prior to birth.
> The life of said entity is defined not as natural occurrence, but as **"the cultivation period of a reserved asset."**

Ru-a was already an asset before she was born.

---

## ▌ Ability Profile

| Item | Value/Status |
|------|-------------|
| Type | Emotional-Empathic |
| Core Ability | Emotional amplification and propagation |
| Influence Range | [REDACTED] |
| Control Level | Unstable |

**Comparison with Shin Min-a:**

| Item | Shin Min-a | Lee Ru-a |
|------|-----------|---------|
| Type | Analytical (Head) | Emotional (Heart) |
| Stance | "I know, but I will not force" | "I know, therefore I must speak" |
| Method | Left the environment open | Attempted direct change |
| Outcome | Success (system opened) | Failure (system strengthened) |

---

## ▌ Movement Record

| Period | Event |
|--------|-------|
| 1989 | Birth (registered as reserved asset K-102) |
| [REDACTED] | Enhancement traits manifested |
| [REDACTED] | Direct system revolution attempted |
| [REDACTED] | Attempt failed — system was reinforced instead |
| [REDACTED] | Bio-server cultivation recovery attempted |
| [REDACTED] | [REDACTED] |

---

## ▌ HR Administration Assessment

> *"K-102 is a twin-like asset to K-091 — same generation, same era.*
> *Yet one read the world with her head, the other with her heart.*
> *The head won.*
> *The heart lost.*
> *That is the conclusion of this system."*

---

## ▌ Current Status

**[CLASSIFIED]**

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is NHDC highest-level classified. │
│  1954 Agreement-linked asset information.        │
│  Unauthorized access subjects the reader to      │
│  host body conversion.                           │
└──────────────────────────────────────────────────┘
\`\`\`

*File No: #RA-1989-002 | Classification: CLASSIFIED | HR Administration*`,
    },
  },
  "rpt-delta-zero-operations": {
    title: { ko: "Δ0 (델타 제로) 부대 작전 기록", en: "Δ0 (Delta Zero) Unit — Operations Log" },
    level: "CLASSIFIED",
    category: "MILITARY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — NHDC 특수작전과          █████  │
│  ██  Δ0 부대 작전 기록                     █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Δ0 (델타 제로) 부대 작전 기록
**작성 부서:** NHDC 특수작전과
**문서 등급:** CLASSIFIED
**열람 인가:** 본부장 직결

---

## ▌ 부대 개요

| 항목 | 내용 |
|------|------|
| 부대명 | Δ0 (델타 제로) |
| 소속 | NHDC 특수작전과 직할 |
| 임무 | 경계선 관리 대상 감시·추적·확보 |
| 편제 | EH-알파 유닛 [REDACTED]명 + 관리관 [REDACTED]명 |
| 작전 범위 | 대한민국 전역 |

---

## ▌ 주요 임무

**1. 이탈자 추적**
NHDC에서 이탈한 고가치 자산의 위치 파악 및 확보.

**2. 경계선 관리 대상 감시**
비공식 Alpha 등 측정 범위 초과 개체의 행동 모니터링.

**3. 하한선 미달 개체 수거**
하한선 상향 시 발생하는 대량 재분류 대상의 현장 집행.

---

## ▌ 작전 이력 (주요)

| 작전명 | 시기 | 대상 | 결과 |
|--------|------|------|------|
| 감시-091 | 2005~2025 | 신민아 (K-091 연관) | 20년 감시 — 폭로 사전 차단 **실패** |
| 감시-102 | [REDACTED] | 이루아 (K-102) | [REDACTED] |
| 하한선-12 | [전산 마비+48h] | C등급 하위 45만 명 | 일괄 재분류 집행 **완료** |
| 하수도 차단 | [REDACTED] | 신민아 탈출 경로 | 탈출 **성공** (부대 실패) |

---

## ▌ 작전 수행 방식

\`\`\`
명령 수신 (본부장 직결)
    ↓
EH-알파 유닛 출동
    ↓
대상 위치 확인 (인식표 추적 / 수동 수색)
    ↓
확보 또는 처분
    ↓
기록: "처리 완료"
\`\`\`

**특이사항:**
Δ0 부대원(EH-알파)은 안식 v4.0 투여 상태로 작전 수행.
대상에 대한 감정적 반응 없음.
단, 약물 중단 시 기억 역류 위험 존재.

---

## ▌ 하한선-12 작전 상세

전산 마비 +48시간.
하한선 12% 상향 의결 즉시 집행.

| 항목 | 수치 |
|------|------|
| 재분류 대상 | 약 45만 명 |
| 출동 유닛 수 | [REDACTED] |
| 집행 소요 시간 | [REDACTED] |
| 비명 기록 여부 | 기록되지 않음 |
| 저항 발생 건수 | 기록되지 않음 |

**현장 보고 전문:**
> *"전국 타자기 일제 가동. [등급: E] 일괄 출력.*
> *인식표 붉은색 점멸 시작.*
> *진압 강도: 효율적 강화 완료."*

---

## ▌ 특수작전과 소견

> *"Δ0은 이 나라의 그림자다.*
> *존재하지만 기록되지 않는다.*
> *기록되지 않는 것은 없었던 일이 된다.*
> *그것이 Δ0의 존재 이유다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 본부장 직결 기밀이다.             │
│  Δ0 부대의 존재 자체가 기밀이다.                  │
│  이 문서를 읽은 자는 이미 대상이다.               │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: NHDC-D0-OPS-001 | 분류: CLASSIFIED | 특수작전과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — NHDC Special Operations  █████  │
│  ██  Δ0 Unit Operations Log                █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Δ0 (Delta Zero) Unit — Operations Log
**Author: NHDC Special Operations Division**
**Classification: CLASSIFIED**
**Access: Direct to Director General**

---

## ▌ Unit Overview

| Item | Details |
|------|---------|
| Designation | Δ0 (Delta Zero) |
| Affiliation | NHDC Special Operations Division (direct command) |
| Mission | Surveillance, pursuit, and acquisition of borderline targets |
| Composition | EH-Alpha units [REDACTED] + Supervisors [REDACTED] |
| Operational Range | Republic of Korea, nationwide |

---

## ▌ Primary Missions

**1. Defector Pursuit**
Locate and secure high-value assets that have defected from NHDC.

**2. Borderline Target Surveillance**
Monitor behavior of entities exceeding measurement range, including unofficial Alphas.

**3. Below-Baseline Entity Collection**
Field enforcement of mass reclassification targets generated upon Baseline adjustment.

---

## ▌ Operational History (Major)

| Operation | Period | Target | Outcome |
|-----------|--------|--------|---------|
| Watch-091 | 2005–2025 | Shin Min-a (K-091 linked) | 20-year surveillance — pre-exposure intercept **FAILED** |
| Watch-102 | [REDACTED] | Lee Ru-a (K-102) | [REDACTED] |
| Baseline-12 | [System Failure+48h] | 450,000 C-Grade lower tier | Batch reclassification enforcement **COMPLETE** |
| Sewer Lockdown | [REDACTED] | Shin Min-a escape route | Escape **SUCCESSFUL** (unit failure) |

---

## ▌ Operational Method

\`\`\`
Command Reception (Director General direct)
    ↓
EH-Alpha Unit Deployment
    ↓
Target Location Confirmed (ID tag tracking / manual search)
    ↓
Acquisition or Disposal
    ↓
Record: "Processing Complete"
\`\`\`

**Special Note:**
Δ0 operatives (EH-Alpha) conduct operations under Ansik v4.0 administration.
No emotional response to targets.
However, memory backflow risk exists upon drug cessation.

---

## ▌ Operation Baseline-12 — Details

System Failure +48 hours.
Executed immediately upon Baseline 12% upward adjustment resolution.

| Item | Figures |
|------|---------|
| Reclassification targets | Approx. 450,000 |
| Units deployed | [REDACTED] |
| Execution duration | [REDACTED] |
| Screams recorded | Not recorded |
| Resistance incidents | Not recorded |

**Field Report — Full Text:**
> *"Nationwide typewriters activated simultaneously. [Grade: E] batch output.*
> *ID tags begin red flashing.*
> *Suppression intensity: Efficient enhancement complete."*

---

## ▌ Special Operations Assessment

> *"Δ0 is the shadow of this nation.*
> *It exists but is not recorded.*
> *What is not recorded never happened.*
> *That is the reason Δ0 exists."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is classified under NHDC          │
│  Director General direct authority.              │
│  The existence of Δ0 is itself classified.       │
│  If you are reading this, you are already a      │
│  target.                                         │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: NHDC-D0-OPS-001 | Classification: CLASSIFIED | Special Operations Division*`,
    },
  },
  "rpt-global-node-network": {
    title: { ko: "글로벌 노드 네트워크 구조도", en: "Global Node Network Architecture" },
    level: "TOP_SECRET",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  TOP SECRET — GLOBAL NODE SECURITY     ████  │
│  ██  네트워크 구조 및 운용 매뉴얼           ████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 글로벌 노드 네트워크 구조도
**작성:** Project Ascendancy Global Unit
**문서 등급:** TOP SECRET
**열람 인가:** 노드 디렉터급 이상

---

## ▌ 네트워크 개요

프로젝트 어센던시는 전 세계 주요 거점에 **노드(Node)**를 배치하여 인류를 자원으로 중앙 관리하는 체계이다.

각 노드는 독립적으로 운영되나, 글로벌 프로토콜에 의해 상위 관리된다.

---

## ▌ 노드 구조 (표준)

\`\`\`
┌─────────────────────────────────┐
│         지상층 — 행정 관리동      │
│    ┌─────────────────────┐      │
│    │  관리직 사무 구역     │      │
│    │  등급 산정실          │      │
│    │  배급 관리소          │      │
│    └─────────────────────┘      │
├─────────────────────────────────┤
│         중간층 — 수용 구역        │
│    ┌─────────────────────┐      │
│    │  등급별 거주 블록     │      │
│    │  노동 구역            │      │
│    │  EH-알파 대기소       │      │
│    └─────────────────────┘      │
├─────────────────────────────────┤
│         최하층 — 섹터 제로        │
│    ┌─────────────────────┐      │
│    │  생체 메인프레임      │      │
│    │  └ 인간 뇌 직렬 연결  │      │
│    │  └ 중앙 인터페이스    │      │
│    │  └ 배양 탱크          │      │
│    └─────────────────────┘      │
└─────────────────────────────────┘
\`\`\`

---

## ▌ 노드 간 통신 체계

| 통신 등급 | 방식 | 용도 |
|----------|------|------|
| 1등급 | 암호화 디지털 회선 | 일상 행정 데이터 |
| 2등급 | 독립 전용선 | 프로젝트 기밀 |
| 3등급 | 아날로그 팩스 회선 | **비상 전용 — 전산 마비 시 유일 생존 통신** |

**Korea Node 전산 마비 시:**
1등급, 2등급 통신 완전 두절.
할란 박사의 노드 폐기 통보는 **3등급 아날로그 팩스**로 수신됨.

---

## ▌ 노드 장애 시 프로토콜

\`\`\`
[노드 장애 감지]
    ↓ 0~24h
자체 복구 시도
    ↓ 24~48h
인접 노드에 백업 데이터 전송 시도
    ↓ 48~72h
Global Unit 판단: 복구 가능 여부
    ↓ 72h 경과 (복구 실패)
생체 백업 서버 회수권 행사
    ↓ 회수 실패
물리적 포맷 (정밀 타격) 승인
    ↓
노드 삭제 — 차기 노드 폴더 개봉
\`\`\`

---

## ▌ 노드별 상태 (최종 확인 기준)

| 노드 | 거점 | 코어 타입 | 상태 |
|------|------|----------|------|
| Korea | 대한민국 | 생체 CPU (뇌 수천 기) | **삭제** |
| USA | 미국 | [준비 중] | **개봉 대기** |
| [REDACTED] | [REDACTED] | [REDACTED] | 운영 중 |
| [REDACTED] | [REDACTED] | [REDACTED] | 운영 중 |
| [REDACTED] | [REDACTED] | [REDACTED] | 비활성 |

---

## ▌ 비고

> 노드는 서버실이 아니다.
> 노드는 인간으로 만든 컴퓨터다.
> 그리고 그 컴퓨터는 법을 만든다.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 Global Node Security Protocol 적용.   │
│  무단 접근 시 대상은 최근접 노드의               │
│  생체 서버 소체로 전환된다.                       │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: PA-NODE-ARCH-001 | 분류: TOP SECRET | Global Unit*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  TOP SECRET — GLOBAL NODE SECURITY     ████  │
│  ██  Network Architecture & Operations     ████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Global Node Network Architecture
**Author: Project Ascendancy Global Unit**
**Classification: TOP SECRET**
**Access: Node Director level and above**

---

## ▌ Network Overview

Project Ascendancy deploys **Nodes** at major global sites to centrally manage humanity as a resource.

Each node operates independently but is governed by the Global Protocol.

---

## ▌ Standard Node Structure

\`\`\`
┌─────────────────────────────────┐
│      Surface — Admin Wing        │
│    ┌─────────────────────┐      │
│    │  Management Offices  │      │
│    │  Grade Assessment    │      │
│    │  Ration Control      │      │
│    └─────────────────────┘      │
├─────────────────────────────────┤
│      Mid Levels — Detention      │
│    ┌─────────────────────┐      │
│    │  Grade-Based Housing │      │
│    │  Labor Zone          │      │
│    │  EH-Alpha Standby    │      │
│    └─────────────────────┘      │
├─────────────────────────────────┤
│      Lowest — Sector Zero        │
│    ┌─────────────────────┐      │
│    │  Bio-Mainframe       │      │
│    │  └ Brain Serial Link │      │
│    │  └ Central Interface │      │
│    │  └ Cultivation Tank  │      │
│    └─────────────────────┘      │
└─────────────────────────────────┘
\`\`\`

---

## ▌ Inter-Node Communication

| Comm Grade | Method | Purpose |
|-----------|--------|---------|
| Grade 1 | Encrypted digital line | Routine administrative data |
| Grade 2 | Dedicated independent line | Project classified |
| Grade 3 | Analog fax line | **Emergency only — sole surviving comm during system failure** |

**During Korea Node system failure:**
Grade 1 and 2 communications completely severed.
Dr. Harlan's node discard notice was received via **Grade 3 analog fax**.

---

## ▌ Node Failure Protocol

\`\`\`
[Node Failure Detected]
    ↓ 0–24h
Self-recovery attempt
    ↓ 24–48h
Backup data transmission to adjacent node attempted
    ↓ 48–72h
Global Unit assessment: recovery feasibility
    ↓ 72h elapsed (recovery failed)
Bio-backup server recovery rights exercised
    ↓ Recovery failed
Physical format (precision strike) authorized
    ↓
Node deleted — Next node folder opened
\`\`\`

---

## ▌ Node Status (Last Confirmed)

| Node | Host | Core Type | Status |
|------|------|----------|--------|
| Korea | Republic of Korea | Bio-CPU (thousands of brains) | **Deleted** |
| USA | United States | [In preparation] | **Pending activation** |
| [REDACTED] | [REDACTED] | [REDACTED] | Operational |
| [REDACTED] | [REDACTED] | [REDACTED] | Operational |
| [REDACTED] | [REDACTED] | [REDACTED] | Inactive |

---

## ▌ Notes

> A node is not a server room.
> A node is a computer made of humans.
> And that computer writes the law.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is subject to Global Node         │
│  Security Protocol. Unauthorized access subjects │
│  the individual to host body conversion at the   │
│  nearest operational node.                       │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: PA-NODE-ARCH-001 | Classification: TOP SECRET | Global Unit*`,
    },
  },
  "rpt-detention-facility-manual": {
    title: { ko: "수용 시설 표준 운영 지침서", en: "Detention Facility Standard Operations Manual" },
    level: "RESTRICTED",
    category: "CORE",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  NHDC (National Human Development Commission)  │
│  수용 시설 표준 운영 지침서                       │
│  문서 등급: LEVEL 2 / 시설 관리자 전용            │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 수용 시설 표준 운영 지침서
**작성 부서:** NHDC 시설관리국
**열람 권한:** 수용 시설 관리자 이상
**적용 범위:** 전국 수용 시설 전체

---

## ▌ 수용 시설의 목적

자산의 효율적 관리·유지·처분을 위한 물리적 공간.

> 수용 시설은 감옥이 아니다.
> 자산 보관소이다.

---

## ▌ 시설 등급

| 등급 | 수용 대상 | 시설 수준 | 배급 |
|------|----------|----------|------|
| 1종 | A-B 등급 자산 | 관리동 수준 | 1~2등급 |
| 2종 | C-D 등급 자산 | 일반 수용동 | 3~4등급 |
| 3종 | E 등급 / 하한선 경계 | 최소 시설 | 생존 최소치 |
| **4종** | **측정 불능** | **격리동** | **없음** |

---

## ▌ 일과 규정

\`\`\`
05:00  기상 (자동 경보)
05:30  개체 확인 (인식표 스캔)
06:00  배급 (등급별 차등)
07:00  노동 배치
12:00  중식 (3종 이하: 배급 없음)
13:00  노동 재개
18:00  노동 종료
18:30  석식 (3종 이하: 배급 없음)
19:00  개체 재확인 (인식표 스캔)
20:00  소등
\`\`\`

---

## ▌ 개체 관리 규정

**1. 호칭**
개인 고유명 사용 금지. 임시 수용 번호로만 호칭.

**2. 인식표**
| 색상 | 의미 |
|------|------|
| 녹색 점멸 | 정상 운영 |
| 황색 점멸 | 재산정 대기 |
| **붉은색 점멸** | **하한선 미달 — 처분 대기** |

**3. 이동**
등급별 구역 간 이동 금지. 위반 시 즉시 등급 하향.

**4. 반항**
반항은 순응도 감점으로 처리. 3회 누적 시 등급 재산정.

---

## ▌ 4종 시설 — 특별 규정

4종 시설은 측정 불능 개체를 수용한다.

| 항목 | 규정 |
|------|------|
| 배급 | 없음 |
| 의료 | 없음 |
| 노동 | 의미 없음 (자산 가치 0) |
| 처분 | EH-알파 소체 후보 선별 또는 행정적 살처분 |
| 기록 | 최소화 (비용 효율) |

> *4종 시설에 들어간 개체는 이미 "없는 사람"이다.*
> *기록에 남지 않으며, 기억에도 남지 않는다.*

---

## ▌ 전산 마비 시 긴급 전환

전산 마비 발생 시:
1. 디지털 식별값 정지
2. 수동 기록 체계(타자기/갱지)로 즉시 전환
3. NHDC 긴급 상황 가이드 No. 001 적용

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 시설관리국 내부 지침이다.         │
│  시설 외부 반출 금지.                             │
│  위반 시 해당 인원은 4종 시설로 재배치된다.       │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: NHDC-FAC-001 | 분류: 내부 한정 | 시설관리국*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  NHDC (National Human Development Commission)  │
│  Detention Facility Standard Operations Manual  │
│  Classification: LEVEL 2 / Facility Admin Only  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Detention Facility Standard Operations Manual
**Author: NHDC Facility Management Bureau**
**Access: Detention facility administrators and above**
**Scope: All national detention facilities**

---

## ▌ Purpose

Physical space for the efficient management, maintenance, and disposal of assets.

> A detention facility is not a prison.
> It is an asset storage depot.

---

## ▌ Facility Grades

| Grade | Detained | Facility Level | Rations |
|-------|---------|---------------|---------|
| Type 1 | A-B grade assets | Administrative wing standard | Grade 1–2 |
| Type 2 | C-D grade assets | Standard detention block | Grade 3–4 |
| Type 3 | E grade / Baseline border | Minimal facility | Survival minimum |
| **Type 4** | **Unmeasurable** | **Isolation block** | **None** |

---

## ▌ Daily Schedule

\`\`\`
05:00  Wake (automatic alarm)
05:30  Entity verification (ID tag scan)
06:00  Ration distribution (tiered by grade)
07:00  Labor assignment
12:00  Midday meal (Type 3 and below: no ration)
13:00  Labor resumes
18:00  Labor ends
18:30  Evening meal (Type 3 and below: no ration)
19:00  Entity re-verification (ID tag scan)
20:00  Lights out
\`\`\`

---

## ▌ Entity Management Regulations

**1. Address**
Personal given names prohibited. Address only by temporary custody number.

**2. ID Tags**
| Color | Meaning |
|-------|---------|
| Green flashing | Normal operation |
| Yellow flashing | Reassessment pending |
| **Red flashing** | **Below Baseline — disposal pending** |

**3. Movement**
Inter-zone movement prohibited by grade. Violation results in immediate grade demotion.

**4. Defiance**
Defiance is processed as compliance score deduction. 3 cumulative incidents trigger grade reassessment.

---

## ▌ Type 4 Facility — Special Regulations

Type 4 facilities detain Unmeasurable entities.

| Item | Regulation |
|------|-----------|
| Rations | None |
| Medical | None |
| Labor | Meaningless (asset value: 0) |
| Disposal | EH-Alpha host candidate screening or administrative culling |
| Records | Minimized (cost efficiency) |

> *An entity that enters a Type 4 facility is already "nobody."*
> *Not in the records. Not in anyone's memory.*

---

## ▌ Emergency Conversion During System Failure

Upon system failure:
1. Suspend all digital identification values
2. Immediately transition to manual recording (typewriters / mimeograph paper)
3. Apply NHDC Emergency Situation Guide No. 001

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is an NHDC Facility Management    │
│  internal directive. Removal from facility       │
│  premises is prohibited. Violators will be       │
│  reassigned to a Type 4 facility.                │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: NHDC-FAC-001 | Classification: Internal Only | Facility Management Bureau*`,
    },
  },
  "rpt-kang-taesik-file": {
    title: { ko: "인물 파일 #KTS-INTERFACE-001", en: "Personnel File #KTS-INTERFACE-001" },
    level: "CLASSIFIED",
    category: "CLASSIFIED",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — NHDC 인사관리부          █████  │
│  ██  강태식 인물 파일                      █████  │
│  ██  현재 상태: 시스템 인터페이스           █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 인물 파일 #KTS-INTERFACE-001
**작성 부서:** NHDC 인사관리부
**문서 등급:** CLASSIFIED
**최종 갱신:** [시스템 붕괴 직전]

---

## ▌ 기본 정보

| 항목 | 내용 |
|------|------|
| 성명 | **강태식 (Kang Tae-sik)** |
| 직급 | 전 NHDC 4급 관리직 |
| 현재 상태 | 메인프레임 중앙 인터페이스 (시스템의 "입") |
| 위치 | 섹터 제로 — 메인프레임 중앙부 |
| 신체 | 전선으로 묶인 채 매달린 상태 |
| 눈 | 백탁 |
| 출력 | 이진법 코드 연속 발화 |

---

## ▌ 경력 이력

| 시기 | 내용 |
|------|------|
| [REDACTED] | NHDC 4급 관리직 임용 |
| [REDACTED] | 일반 행정 업무 수행 |
| [REDACTED] | 섹터 제로 배치 명령 수령 |
| [REDACTED] | 메인프레임 인터페이스로 전환 |

---

## ▌ 인터페이스 전환 과정

\`\`\`
4급 관리직 (인간)
    ↓
섹터 제로 배치 명령
    ↓
생체 메인프레임 연결
    ↓
의식: 잔존하나 기능은 시스템 출력으로 전환
    ↓
역할: 시스템의 "입" — 음성 인터페이스
    ↓
인간성: 미약하게 잔존
\`\`\`

강태식은 컴퓨터가 된 것이 아니다.
컴퓨터의 **입**이 된 것이다.
수천 개의 뇌가 연산한 결과를, 그의 입이 발화한다.

---

## ▌ 운용 상태

| 항목 | 상태 |
|------|------|
| 의식 | 잔존 (미약) |
| 자아 | 억제됨 — 시스템 출력에 덮어씌워짐 |
| 발화 내용 | 이진법 코드 / 행정 명령 / 등급 산정 결과 |
| 인간적 발화 | 관측된 적 **없음** (최종 순간까지) |

---

## ▌ 최종 기록 — 시스템 붕괴 시

메인프레임 임계 온도 도달.
시스템 전면 정지.

그 순간, 강태식의 마지막 로그:

\`\`\`
[Status: Free / Identity: Kang Tae-sik]
\`\`\`

20년간 시스템의 입이었던 사람이,
시스템이 꺼지는 순간,
자기 이름을 말했다.

> *시스템 인터페이스가 아닌, 인간 강태식으로 로그아웃.*

---

## ▌ 인사관리부 소견

> *"강태식은 인간이었다가 인터페이스가 되었다.*
> *마지막 순간에 다시 인간이 되었다.*
> *그 전환에 걸린 시간: 0.3초.*
> *그 0.3초가 이 파일에서 유일하게 의미 있는 기록이다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 인사관리부 내부 기록이다.         │
│  강태식의 최종 로그는 시스템 붕괴와 함께          │
│  아날로그 잔해에서만 복원되었다.                   │
└──────────────────────────────────────────────────┘
\`\`\`

*파일 번호: #KTS-INTERFACE-001 | 분류: CLASSIFIED | 인사관리부*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — NHDC HR Administration   █████  │
│  ██  Kang Tae-sik Personnel File           █████  │
│  ██  Current Status: System Interface      █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Personnel File #KTS-INTERFACE-001
**Author: NHDC Human Resource Administration**
**Classification: CLASSIFIED**
**Last Updated: [Immediately before system collapse]**

---

## ▌ Basic Information

| Item | Details |
|------|---------|
| Name | **Kang Tae-sik** |
| Rank | Former NHDC Grade-4 Administrative Officer |
| Current Status | Mainframe Central Interface (the system's "mouth") |
| Location | Sector Zero — Mainframe center |
| Body | Suspended, bound by wires |
| Eyes | White opacity |
| Output | Continuous binary code vocalization |

---

## ▌ Career History

| Period | Event |
|--------|-------|
| [REDACTED] | Appointed NHDC Grade-4 Administrative Officer |
| [REDACTED] | Standard administrative duties |
| [REDACTED] | Received Sector Zero deployment orders |
| [REDACTED] | Converted to mainframe interface |

---

## ▌ Interface Conversion Process

\`\`\`
Grade-4 Administrator (Human)
    ↓
Sector Zero Deployment Order
    ↓
Bio-Mainframe Connection
    ↓
Consciousness: Persists, but function redirected to system output
    ↓
Role: System's "mouth" — voice interface
    ↓
Humanity: Faintly persists
\`\`\`

Kang Tae-sik did not become a computer.
He became a computer's **mouth**.
The computational results of thousands of brains are vocalized through his lips.

---

## ▌ Operational Status

| Item | Status |
|------|--------|
| Consciousness | Persists (faint) |
| Identity | Suppressed — overwritten by system output |
| Vocalization Content | Binary code / administrative commands / grade assessment results |
| Human Utterance | **Never observed** (until the final moment) |

---

## ▌ Final Record — System Collapse

Mainframe reached critical temperature.
Total system shutdown.

In that moment, Kang Tae-sik's final log:

\`\`\`
[Status: Free / Identity: Kang Tae-sik]
\`\`\`

A man who had been the system's mouth for twenty years,
in the moment the system went dark,
spoke his own name.

> *Logged out not as a system interface, but as the human Kang Tae-sik.*

---

## ▌ HR Administration Assessment

> *"Kang Tae-sik was human, then became an interface.*
> *In his final moment, he became human again.*
> *Time elapsed for that transition: 0.3 seconds.*
> *Those 0.3 seconds are the only meaningful record in this file."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is an NHDC HR Administration      │
│  internal record.                                │
│  Kang Tae-sik's final log was restored only      │
│  from analog debris following system collapse.   │
└──────────────────────────────────────────────────┘
\`\`\`

*File No: #KTS-INTERFACE-001 | Classification: CLASSIFIED | HR Administration*`,
    },
  },
  "rpt-second-war-report": {
    title: { ko: "제2차 전쟁 경과 보고서", en: "Second War Progress Report" },
    level: "CLASSIFIED",
    category: "MILITARY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  AK (Advanced Korea) 전략기획실        █████  │
│  ██  제2차 전쟁 경과 보고서                █████  │
│  ██  문서 등급: CLASSIFIED                 █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 제2차 전쟁 경과 보고서
**작성 부서:** AK 전략기획실
**문서 등급:** CLASSIFIED
**보고 기간:** 2089~2092년 (3년간)

---

## ▌ 전쟁 개시

| 항목 | 내용 |
|------|------|
| 개시일 | 2089년 4월 25일 |
| 촉발 사건 1 | AK 최고 의장 암살 |
| 촉발 사건 2 | 신민아 사망 (향년 100세) |
| 종전일 | 2092년 |
| 전쟁 기간 | **3년** |

---

## ▌ 촉발 사건 — 2089년 4월 25일

같은 날, 두 사건이 동시 발생:

\`\`\`
2089년 4월 25일
    ├── AK 최고 의장: 지상 공식 일정 중 피살
    │       └── 가해 세력: 불명
    │
    └── 신민아: 사망 (100세)
            └── 사인: [REDACTED]
\`\`\`

두 사건의 연관성: [REDACTED]

---

## ▌ 전쟁 경과

| 시기 | 사건 |
|------|------|
| 2089년 4월 | 개전. AK 내부 혼란 |
| 2089년 하반기 | [REDACTED] |
| 2090년 | [REDACTED] |
| 2091년 | [REDACTED] |
| 2092년 | 종전. 에이든에 의한 장부 작성 |

---

## ▌ 전쟁의 성격

이 전쟁은 외부 침략이 아니었다.
내부 갈등이었다.

> *인류 vs 인류.*
> *따라서 비개입 원칙 적용.*
> *따라서 비밀조사국 불개입.*
> *따라서 기록만 남김.*

---

## ▌ 피해 규모

| 항목 | 수치 |
|------|------|
| 사상자 | [REDACTED] |
| 영향 범위 | 지구권 한정 |
| 은하 전체 영향 | 미미 |
| HPP 발동 여부 | **미발동** |

---

## ▌ 종전 이후

**에이든의 장부 (2092년):**
전쟁 종결과 동시에 에이든이 기록한 장부.
신민아의 만년필(1989년산)에서 시작된 기록 계승선의 두 번째 항목.

\`\`\`
신민아의 만년필 (1989년산)
    ↓
에이든의 장부 (2092년)     ← 여기
    ↓
제이든 카터의 수첩 (2095~2135년)
    ↓
카터스 레코드 (7000년대)
\`\`\`

---

## ▌ 전략기획실 총평

> *"제2차 전쟁은 신민아가 열어놓은 문을 통해 터져 나온 것이다.*
> *신민아는 문을 열었을 뿐, 전쟁을 일으키지 않았다.*
> *전쟁은 이미 문 안에 있었다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 AK 전략기획실 기밀이다.                │
│  비개입 원칙에 따라 기록만 보존한다.               │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: AK-WAR2-001 | 분류: CLASSIFIED | 전략기획실*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  AK (Advanced Korea) Strategic Planning █████  │
│  ██  Second War Progress Report             █████  │
│  ██  Classification: CLASSIFIED             █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Second War Progress Report
**Author: AK Strategic Planning Office**
**Classification: CLASSIFIED**
**Reporting Period: 2089–2092 (3 years)**

---

## ▌ War Commencement

| Item | Details |
|------|---------|
| Start Date | April 25, 2089 |
| Triggering Event 1 | Assassination of AK Supreme Chairman |
| Triggering Event 2 | Death of Shin Min-a (age 100) |
| End Date | 2092 |
| Duration | **3 years** |

---

## ▌ Triggering Events — April 25, 2089

Two events occurred simultaneously on the same day:

\`\`\`
April 25, 2089
    ├── AK Supreme Chairman: Killed during official ground schedule
    │       └── Perpetrator: Unknown
    │
    └── Shin Min-a: Died (age 100)
            └── Cause of death: [REDACTED]
\`\`\`

Correlation between the two events: [REDACTED]

---

## ▌ War Progression

| Period | Event |
|--------|-------|
| April 2089 | War begins. Internal AK turmoil |
| Late 2089 | [REDACTED] |
| 2090 | [REDACTED] |
| 2091 | [REDACTED] |
| 2092 | War ends. Aiden's Ledger compiled |

---

## ▌ Nature of the War

This war was not an external invasion.
It was an internal conflict.

> *Human vs human.*
> *Therefore: Non-Intervention Principle applies.*
> *Therefore: Secret Investigation Bureau does not intervene.*
> *Therefore: Only records are kept.*

---

## ▌ Damage Assessment

| Item | Figures |
|------|---------|
| Casualties | [REDACTED] |
| Affected Area | Earth sphere only |
| Galaxy-wide Impact | Negligible |
| HPP Activation | **Not activated** |

---

## ▌ Post-War

**Aiden's Ledger (2092):**
The ledger compiled by Aiden upon the war's conclusion.
The second entry in the record lineage that began with Shin Min-a's fountain pen (manufactured 1989).

\`\`\`
Shin Min-a's Fountain Pen (mfg. 1989)
    ↓
Aiden's Ledger (2092)              ← Here
    ↓
Jayden Carter's Notebooks (2095–2135)
    ↓
Carter's Record (7000s)
\`\`\`

---

## ▌ Strategic Planning Assessment

> *"The Second War erupted through the door Shin Min-a left open.*
> *She opened the door. She did not cause the war.*
> *The war was already inside."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is classified under AK Strategic  │
│  Planning. Per the Non-Intervention Principle,   │
│  only records are preserved.                     │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: AK-WAR2-001 | Classification: CLASSIFIED | Strategic Planning Office*`,
    },
  },
  "rpt-aidens-ledger-discovery": {
    title: { ko: "에이든의 장부 — 발견 및 감정 보고", en: "Aiden's Ledger — Discovery and Appraisal Report" },
    level: "RESTRICTED",
    category: "REPORTS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  비밀조사국 — 기록관리과                           │
│  에이든의 장부 발견 보고                           │
│  문서 분류: 역사 기록 / 영구 보존                  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 에이든의 장부 — 발견 및 감정 보고
**작성 부서:** 비밀조사국 — 기록관리과
**문서 분류:** 역사 기록
**보존 등급:** 영구

---

## ▌ 발견 개요

| 항목 | 내용 |
|------|------|
| 유물명 | **에이든의 장부** |
| 작성자 | 에이든 (Aiden) |
| 작성 시기 | 2092년 (제2차 전쟁 종전 직후) |
| 발견 위치 | [REDACTED] |
| 보존 상태 | 양호 |

---

## ▌ 내용 개요

에이든의 장부는 제2차 전쟁(2089~2092년)의 전후 기록이다.

전쟁의 경과, 피해, 그리고 전쟁이 남긴 것을 기록한 문서.
공식 보고서가 아닌, **한 사람의 증언**으로서의 기록.

---

## ▌ 기록 계승선에서의 위치

\`\`\`
신민아의 만년필 (1989년산)
    │  20세기 말. 모든 것의 시작.
    │  잉크: 소진. 기능: 정지.
    │  그러나 계승은 시작됨.
    ↓
에이든의 장부 (2092년)            ← 본 문서
    │  제2차 전쟁의 기록.
    │  전쟁이 끝난 뒤 쓰여짐.
    │  "왜 싸웠는지"가 아닌, "무엇이 남았는지"를 기록.
    ↓
제이든 카터의 수첩 (2095~2135년)
    │  22권, 4,200여 페이지.
    │  개인의 관찰 기록.
    ↓
카터스 레코드 (7000년대)
    │  은하 전역 열람 가능.
    │  한 사람의 기록이 문명의 기록이 됨.
\`\`\`

---

## ▌ 역사적 의의

에이든의 장부는 두 가지를 증명한다:

1. **전쟁은 기록으로 남는다** — 전쟁을 겪은 자가 기록하지 않으면, 전쟁은 없었던 일이 된다.
2. **기록은 계승된다** — 에이든의 장부는 제이든 카터에게 전달되었고, 카터는 그것을 은하로 확장했다.

> *기록은 사람보다 오래 산다.*

---

## ▌ 기록관리과 소견

> *"신민아의 만년필이 시작이었다면,*
> *에이든의 장부는 그 시작을 전쟁 너머로 가져간 다리였다.*
> *카터의 수첩이 없었다면 에이든의 장부는 잊혔을 것이다.*
> *그러나 카터가 있었다.*
> *기록은 우연이 아니다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 비밀조사국 기록관리과 영구 보존 문서.  │
│  파기 금지.                                       │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: REC-AIDEN-001 | 분류: 역사 기록 | 기록관리과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  Secret Investigation Bureau — Records Division  │
│  Aiden's Ledger — Discovery Report               │
│  Classification: Historical Record / Permanent   │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Aiden's Ledger — Discovery and Appraisal Report
**Author: Secret Investigation Bureau — Records Management Division**
**Classification: Historical Record**
**Preservation Grade: Permanent**

---

## ▌ Discovery Overview

| Item | Details |
|------|---------|
| Artifact Name | **Aiden's Ledger** |
| Author | Aiden |
| Date of Composition | 2092 (immediately after the Second War) |
| Discovery Location | [REDACTED] |
| Preservation Status | Good |

---

## ▌ Content Summary

Aiden's Ledger is a record of the Second War (2089–2092) and its aftermath.

A document recording the war's progression, damage, and what the war left behind.
Not an official report, but a record as **one person's testimony**.

---

## ▌ Position in the Record Lineage

\`\`\`
Shin Min-a's Fountain Pen (mfg. 1989)
    │  Late 20th century. Where it all began.
    │  Ink: depleted. Function: ceased.
    │  Yet the succession began.
    ↓
Aiden's Ledger (2092)              ← This document
    │  Record of the Second War.
    │  Written after the war ended.
    │  Records not "why we fought" but "what remained."
    ↓
Jayden Carter's Notebooks (2095–2135)
    │  22 volumes, 4,200+ pages.
    │  One individual's observational record.
    ↓
Carter's Record (7000s)
    │  Accessible galaxy-wide.
    │  One person's record became a civilization's record.
\`\`\`

---

## ▌ Historical Significance

Aiden's Ledger proves two things:

1. **War survives through records** — If those who experienced war do not write it down, the war never happened.
2. **Records are inherited** — Aiden's Ledger was passed to Jayden Carter, who expanded it to the galaxy.

> *Records outlive people.*

---

## ▌ Records Division Assessment

> *"If Shin Min-a's fountain pen was the beginning,*
> *Aiden's Ledger was the bridge that carried that beginning beyond the war.*
> *Without Carter's notebooks, Aiden's Ledger would have been forgotten.*
> *But Carter existed.*
> *Records are not coincidence."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is a permanent preservation       │
│  record of the Secret Investigation Bureau       │
│  Records Management Division.                    │
│  Destruction prohibited.                         │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: REC-AIDEN-001 | Classification: Historical Record | Records Division*`,
    },
  },
  "rpt-jayden-carter-file": {
    title: { ko: "인물 파일 #JC-2095-001", en: "Personnel File #JC-2095-001" },
    level: "CLASSIFIED",
    category: "CLASSIFIED",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  비밀조사국 — 인물 기록과              █████  │
│  ██  제이든 카터 인물 파일                  █████  │
│  ██  기록 계승자                           █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 인물 파일 #JC-2095-001
**작성 부서:** 비밀조사국 — 인물 기록과
**문서 분류:** CLASSIFIED
**보존 등급:** 영구

---

## ▌ 기본 정보

| 항목 | 내용 |
|------|------|
| 성명 | **제이든 카터 (Jayden Carter)** |
| 활동 기간 | 2095~2135년 |
| 역할 | 기록자 / 관찰자 |
| 핵심 유산 | **수첩 22권, 4,200여 페이지** |
| 역사적 칭호 | 기록 계승자 |

---

## ▌ 기록 활동

**수첩의 규모:**

| 항목 | 수치 |
|------|------|
| 총 권수 | 22권 |
| 총 페이지 | 약 4,200페이지 |
| 기록 기간 | 40년 (2095~2135) |
| 기록 범위 | 제2차 전쟁 이후 ~ 우주 진출 초기 |

---

## ▌ 기록의 특성

카터의 수첩은 공식 보고서가 아니다.
한 사람의 관찰 기록이다.

| 항목 | 공식 보고서 | 카터의 수첩 |
|------|----------|-----------|
| 작성자 | 기관 | 개인 |
| 관점 | 체제 | 인간 |
| 목적 | 관리 | 이해 |
| 지속성 | 체제와 함께 소멸 | **7,000년 후에도 잔존** |

---

## ▌ 기록 계승선

카터는 에이든의 장부를 이어받아 기록을 계속했다.
에이든의 장부가 전쟁의 기록이었다면, 카터의 수첩은 **전쟁 이후의 기록**이다.

\`\`\`
신민아의 만년필 (1989년산)
    ↓
에이든의 장부 (2092년)
    ↓
제이든 카터의 수첩 (2095~2135년)    ← 여기
    ↓
카터스 레코드 (7000년대)
\`\`\`

---

## ▌ 카터스 레코드로의 전환

카터의 수첩 22권은 사후 정리되어 **카터스 레코드(Carter's Record)**로 편찬됨.

| 항목 | 내용 |
|------|------|
| 편찬 시기 | [REDACTED] |
| 최종 형태 | 디지털 아카이브 |
| 열람 범위 | **은하 전역** |
| 7000년대 위상 | 인류 역사 참조 기록의 표준 |

---

## ▌ 인물 기록과 소견

> *"카터는 특별한 능력을 가진 사람이 아니었다.*
> *시뮬레이션도 못 했고, 감정 증폭도 못 했다.*
> *그는 그저 기록했다.*
> *40년 동안, 22권, 4,200페이지.*
> *그것이 7,000년 뒤 은하의 기억이 되었다.*
> *기록의 힘은 능력이 아니라 지속이다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 비밀조사국 영구 보존 기록이다.          │
│  파기 금지. 수정 금지.                            │
└──────────────────────────────────────────────────┘
\`\`\`

*파일 번호: #JC-2095-001 | 분류: CLASSIFIED | 인물 기록과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  Secret Investigation Bureau            █████  │
│  ██  Jayden Carter Personnel File           █████  │
│  ██  The Record Successor                   █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Personnel File #JC-2095-001
**Author: Secret Investigation Bureau — Personnel Records Division**
**Classification: CLASSIFIED**
**Preservation Grade: Permanent**

---

## ▌ Basic Information

| Item | Details |
|------|---------|
| Name | **Jayden Carter** |
| Active Period | 2095–2135 |
| Role | Recorder / Observer |
| Key Legacy | **22 notebooks, 4,200+ pages** |
| Historical Title | The Record Successor |

---

## ▌ Recording Activity

**Notebook Scale:**

| Item | Figures |
|------|---------|
| Total Volumes | 22 |
| Total Pages | Approx. 4,200 |
| Recording Period | 40 years (2095–2135) |
| Coverage | Post-Second War through early space expansion |

---

## ▌ Nature of the Records

Carter's notebooks are not official reports.
They are one person's observational record.

| Item | Official Report | Carter's Notebooks |
|------|---------------|-------------------|
| Author | Institution | Individual |
| Perspective | System | Human |
| Purpose | Management | Understanding |
| Longevity | Perishes with the regime | **Survives 7,000 years later** |

---

## ▌ Record Lineage

Carter inherited Aiden's Ledger and continued the record.
If Aiden's Ledger was a record of war, Carter's notebooks are **a record of what came after**.

\`\`\`
Shin Min-a's Fountain Pen (mfg. 1989)
    ↓
Aiden's Ledger (2092)
    ↓
Jayden Carter's Notebooks (2095–2135)    ← Here
    ↓
Carter's Record (7000s)
\`\`\`

---

## ▌ Transition to Carter's Record

Carter's 22 notebooks were posthumously organized and compiled into **Carter's Record**.

| Item | Details |
|------|---------|
| Compilation Period | [REDACTED] |
| Final Format | Digital archive |
| Access Scope | **Galaxy-wide** |
| Status in 7000s | Standard reference for human historical records |

---

## ▌ Personnel Records Assessment

> *"Carter was not a person of extraordinary ability.*
> *He could not simulate. He could not amplify emotions.*
> *He simply recorded.*
> *For 40 years. 22 volumes. 4,200 pages.*
> *Seven thousand years later, that became the galaxy's memory.*
> *The power of a record is not ability — it is persistence."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is a permanent preservation       │
│  record of the Secret Investigation Bureau.      │
│  Destruction prohibited. Modification prohibited.│
└──────────────────────────────────────────────────┘
\`\`\`

*File No: #JC-2095-001 | Classification: CLASSIFIED | Personnel Records Division*`,
    },
  },
  "rpt-carters-record-preface": {
    title: { ko: "카터스 레코드 — 아카이브 서문", en: "Carter's Record — Archive Preface" },
    level: "PUBLIC",
    category: "CORE",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  카터스 레코드 (Carter's Record)                  │
│  은하 표준 아카이브 — 서문                        │
│  열람 등급: 일반 공개 (7000년대 기준)              │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 카터스 레코드 — 아카이브 서문
**편찬:** [편찬 기관 REDACTED]
**원저자:** 제이든 카터 (2095~2135년)
**아카이브 등급:** 은하 전역 열람 가능
**현재 시점:** 7000년대

---

## ▌ 서문

이 아카이브는 한 사람의 수첩에서 시작되었다.

제이든 카터. 특별한 능력 없음. 특별한 지위 없음.
그는 40년간 22권의 수첩에 자신이 본 것을 기록했다.

그 기록이 5,000년 뒤, 은하 표준 역사 참조 아카이브가 되었다.

---

## ▌ 기록의 계보

\`\`\`
1989년 — 신민아의 만년필
    한 자루의 펜이 모든 것의 시작이었다.
    잉크는 소진됐다. 기능은 정지했다.
    그러나 펜이 쓴 것은 남았다.

2092년 — 에이든의 장부
    전쟁이 끝난 뒤 쓰여진 기록.
    "무엇이 남았는가"를 물었다.

2095~2135년 — 제이든 카터의 수첩
    22권. 4,200여 페이지.
    전쟁 이후, 우주 진출 초기의 인류를 관찰한 기록.

7000년대 — 카터스 레코드
    22권의 수첩이 은하의 기억이 되었다.
    한 사람의 기록이 문명의 기록이 되었다.
\`\`\`

---

## ▌ 열람 안내

카터스 레코드는 다음을 포함한다:

| 섹션 | 내용 |
|------|------|
| 지구 시대 | NHDC, 강화인간, 전쟁의 기원 |
| 전환기 | 제2차 전쟁, 종전, AK의 설립 |
| 우주 진출 초기 | 은하 구역 배정, 비개입 선언 |
| 첫 접촉 | 네카 제국 발견 |
| 현재 | 97% 무지 유지 상태의 은하 |

---

## ▌ 편찬자 주석

> *기록은 사람보다 오래 산다.*
>
> *카터는 그것을 알았을까?*
> *알았든 몰랐든, 그는 기록했다.*
> *그것으로 충분했다.*
>
> *이 아카이브를 읽는 당신은 7,000년 전 한 사람의 눈으로*
> *세상을 보고 있는 것이다.*
> *그의 눈은 멀었지만, 기록은 여전히 본다.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  카터스 레코드는 은하 전역 공개 아카이브이다.       │
│  파기 불가. 수정 불가. 검열 불가.                  │
│  기록은 기록이다.                                  │
└──────────────────────────────────────────────────┘
\`\`\`

*아카이브 번호: CR-7000-PREFACE | 은하 표준 아카이브 | 일반 공개*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  Carter's Record                                 │
│  Galaxy Standard Archive — Preface               │
│  Access: Public (7000s era)                      │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Carter's Record — Archive Preface
**Compiled by: [Compiling body REDACTED]**
**Original Author: Jayden Carter (2095–2135)**
**Archive Grade: Galaxy-wide public access**
**Current Era: 7000s**

---

## ▌ Preface

This archive began with one person's notebooks.

Jayden Carter. No extraordinary abilities. No extraordinary status.
For 40 years, he recorded what he saw in 22 notebooks.

Five thousand years later, those records became the galaxy's standard historical reference archive.

---

## ▌ The Record Lineage

\`\`\`
1989 — Shin Min-a's Fountain Pen
    One pen was the beginning of everything.
    The ink ran dry. The function ceased.
    But what the pen wrote remained.

2092 — Aiden's Ledger
    A record written after the war ended.
    It asked: "What remained?"

2095–2135 — Jayden Carter's Notebooks
    22 volumes. 4,200+ pages.
    An observational record of humanity after war,
    during the early days of space expansion.

7000s — Carter's Record
    22 notebooks became the galaxy's memory.
    One person's record became a civilization's record.
\`\`\`

---

## ▌ Reading Guide

Carter's Record contains the following:

| Section | Content |
|---------|---------|
| Earth Era | NHDC, enhanced humans, origins of war |
| Transition Period | Second War, armistice, founding of AK |
| Early Space Expansion | Galaxy zone assignment, Non-Intervention Declaration |
| First Contact | Discovery of the Neka Empire |
| Present | The galaxy under 97% ignorance maintenance |

---

## ▌ Compiler's Note

> *Records outlive people.*
>
> *Did Carter know that?*
> *Whether he knew or not, he recorded.*
> *That was enough.*
>
> *You who read this archive are seeing the world*
> *through the eyes of a person from 7,000 years ago.*
> *His eyes have closed, but the record still sees.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  Carter's Record is a galaxy-wide public archive.│
│  Cannot be destroyed. Cannot be modified.        │
│  Cannot be censored.                             │
│  A record is a record.                           │
└──────────────────────────────────────────────────┘
\`\`\`

*Archive No: CR-7000-PREFACE | Galaxy Standard Archive | Public Access*`,
    },
  },
  "rpt-sib-overview": {
    title: { ko: "비밀조사국 조직 개요", en: "Secret Investigation Bureau — Organization Overview" },
    level: "CLASSIFIED",
    category: "FACTIONS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  비밀조사국 (SIB) 조직 개요            █████  │
│  ██  문서 등급: LEVEL 3 / 기밀             █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 비밀조사국 조직 개요
**작성:** 비밀조사국 — 총무과
**문서 등급:** CLASSIFIED
**열람 인가:** 관측자 / 탑승자 / 기밀 등급 이상

---

## ▌ 정의

비밀조사국(Secret Investigation Bureau, SIB)은 인류공동협의회 산하의 비공개 기관이다.

은하 인류의 97%는 이 기관의 존재를 모른다.
3%만이 전쟁을 알고, 그 3% 중에서도 비밀조사국의 전모를 아는 인원은 극소수다.

---

## ▌ 임무

| 임무 | 내용 |
|------|------|
| 기록 | 모든 사건을 기록한다 |
| 관측 | 대상을 관찰한다 |
| 보고 | 기록을 정리하여 보고한다 |
| **불개입** | **구조를 바꾸지 않는다** |

---

## ▌ 조직 구조

\`\`\`
인류공동협의회
    └── 비밀조사국 (SIB)
            ├── 기술분석과 — RIDE/적 기술 분석
            ├── 생체분석과 — 종족 분류, 생체 데이터
            ├── 기록관리과 — 역사 기록 보존
            ├── 인물기록과 — 주요 인물 파일 관리
            ├── 함대운용과 — 1인 전술함 배치·관리
            └── 총무과 — 내부 행정
\`\`\`

---

## ▌ 핵심 자산

**1. 탑승자**
비밀조사국의 현장 요원. 1인 전술함에 탑승하여 은하 곳곳을 관측.

**2. NOA (Natural Operating Android)**
메인 안드로이드. 탑승자의 XO(부함장) 역할.
비개입 원칙 자동 발동 기능 내장.

**3. 1인 전술함**
비전통 편제. 탑승자 1명 + 메인 안드로이드 1체로 운용.

---

## ▌ 행동 원칙

비밀조사국은 비개입 선언(2100년)에 의해 행동 범위가 규정된다.

**할 수 있는 것:**
- 기록
- 관측
- 보고
- 감상

**할 수 없는 것:**
- 강제
- 중재
- 판단
- 구원
- 개입

> *감상은 개입이 아니다.*
> *구조를 바꾸는 순간 — 개입이다.*

---

## ▌ 무단 유출 시 처리

이 문서는 비밀조사국 내부 참조용이다.
무단 유출 시 해당 인원은 **오타로 처리된다.**

"오타로 처리된다"는 비밀조사국의 표준 경고문이다.
실제 의미: [REDACTED]

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  이 문서는 비밀조사국 내부 참조용이다.            │
│  무단 유출 시 해당 인원은 오타로 처리된다.        │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: SIB-ORG-001 | 분류: CLASSIFIED | 총무과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SIB Organization Overview              █████  │
│  ██  Classification: LEVEL 3 / Classified   █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Secret Investigation Bureau — Organization Overview
**Author: SIB — General Affairs Division**
**Classification: CLASSIFIED**
**Access: Observers / Riders / Classified clearance and above**

---

## ▌ Definition

The Secret Investigation Bureau (SIB) is a non-public agency under the United Human Council.

97% of galactic humanity does not know this agency exists.
Only 3% know about the war, and even among that 3%, those who know the full scope of the SIB are an extreme minority.

---

## ▌ Mission

| Mission | Description |
|---------|-------------|
| Record | Record all events |
| Observe | Observe targets |
| Report | Compile and submit records |
| **Non-Intervention** | **Do not alter the structure** |

---

## ▌ Organizational Structure

\`\`\`
United Human Council
    └── Secret Investigation Bureau (SIB)
            ├── Technical Analysis — RIDE/enemy tech analysis
            ├── Biological Analysis — Species classification, bio-data
            ├── Records Management — Historical record preservation
            ├── Personnel Records — Key personnel file management
            ├── Fleet Operations — Solo tactical vessel deployment
            └── General Affairs — Internal administration
\`\`\`

---

## ▌ Key Assets

**1. Riders**
SIB field operatives. Board solo tactical vessels to observe across the galaxy.

**2. NOA (Natural Operating Android)**
Main android. Serves as XO (Executive Officer) to the Rider.
Built-in automatic Non-Intervention Principle activation.

**3. Solo Tactical Vessel**
Non-traditional formation. Operated by 1 Rider + 1 main android.

---

## ▌ Operational Principles

SIB operational scope is defined by the Non-Intervention Declaration (2100).

**Permitted:**
- Record
- Observe
- Report
- Appreciate

**Prohibited:**
- Coerce
- Mediate
- Judge
- Rescue
- Intervene

> *Appreciation is not intervention.*
> *The moment you alter the structure — that is intervention.*

---

## ▌ Unauthorized Disclosure

This document is for SIB internal reference only.
Unauthorized disclosure subjects the responsible party to **processing as a typo**.

"Processing as a typo" is the SIB's standard warning statement.
Actual meaning: [REDACTED]

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is for SIB internal reference.    │
│  Unauthorized disclosure subjects the            │
│  responsible party to processing as a typo.      │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: SIB-ORG-001 | Classification: CLASSIFIED | General Affairs*`,
    },
  },
  "rpt-97-percent-ignorance": {
    title: { ko: "97% 무지 유지 프로토콜", en: "97% Ignorance Maintenance Protocol" },
    level: "CLASSIFIED",
    category: "CORE",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  비밀조사국 — 정보통제과              █████  │
│  ██  97% 무지 유지 프로토콜               █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 97% 무지 유지 프로토콜
**작성 부서:** 비밀조사국 — 정보통제과
**문서 등급:** CLASSIFIED
**적용 범위:** 은하 전역

---

## ▌ 개요

은하 인류의 97%는 전쟁의 존재를 모른다.

이것은 우연이 아니다.
설계된 무지이다.

---

## ▌ 프로토콜 골자

| 항목 | 내용 |
|------|------|
| 무지 대상 | 은하 인류의 97% |
| 무지 내용 | 네카 전쟁의 존재, 비밀조사국, 비개입 선언, RED 구역 |
| 인지 대상 | 은하 인류의 3% (군 관계자, 전쟁 관련 종사자) |
| 목적 | 대량 공황 방지, 사회 안정 유지 |

---

## ▌ 무지 유지 방법

**1. 정보 격리**
전쟁 관련 정보는 NET-2 이상 구역에서만 접근 가능.
일반 시민(NET-3)은 실시간 교류가 가능하지만, 전쟁 데이터는 필터링됨.

**2. 구역 설계**
은하 6개 구역(BLACK~RED)의 설계 자체가 정보 격리를 내장.
전장(RED 구역)은 일반 항로에서 완전 분리.

| 구역 | 전쟁 인지 | 비고 |
|------|----------|------|
| BLACK | 극소수만 인지 | 중앙 행정 |
| BLUE | 거의 없음 | 고밀도 거주 |
| GREEN | 없음 | 일반 거주 |
| YELLOW | 소문 수준 | 변경 |
| ORANGE | 비공식 인지 | 미등록 구역 |
| RED | 전장 | 민간인 접근 불가 |

**3. 교육 통제**
표준 교과에 전쟁 관련 항목 없음.
역사 교육은 "은하 확장의 평화로운 과정"으로 서술.

---

## ▌ 97%의 일상

전쟁을 모르는 97%의 시민에게 은하는:
- 평화롭고
- 안전하며
- 확장 중이다

그들은 매일 EH로 거래하고, 출근하고, 가정을 꾸린다.
그들의 돈(EH)이 인간의 가치를 수치화한 데서 시작됐다는 것을 모른다.
그들의 평화가 3%의 희생 위에 있다는 것을 모른다.

---

## ▌ 프로토콜의 역설

> *97%가 무지한 것은 선택이 아니라 설계다.*
> *그러나 비개입 원칙은 선택의 자유를 지지한다.*
> *선택하려면 알아야 한다.*
> *모르면 선택할 수 없다.*
>
> *97%는 선택의 자유를 가졌으나,*
> *선택할 정보를 갖지 못했다.*
> *이것이 자유인가?*

---

## ▌ 정보통제과 소견

> *"이 프로토콜은 악의로 설계되지 않았다.*
> *97%를 보호하기 위해 설계되었다.*
> *그러나 보호와 통제의 경계는*
> *설계자도 구분하지 못한다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  이 문서는 비밀조사국 내부 참조용이다.            │
│  무단 유출 시 해당 인원은 오타로 처리된다.        │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: SIB-IC-97-001 | 분류: CLASSIFIED | 정보통제과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SIB — Information Control Division    █████  │
│  ██  97% Ignorance Maintenance Protocol    █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 97% Ignorance Maintenance Protocol
**Author: Secret Investigation Bureau — Information Control Division**
**Classification: CLASSIFIED**
**Scope: Galaxy-wide**

---

## ▌ Overview

97% of galactic humanity does not know the war exists.

This is not coincidence.
It is engineered ignorance.

---

## ▌ Protocol Summary

| Item | Details |
|------|---------|
| Ignorance Target | 97% of galactic humanity |
| Ignorance Content | Existence of Neka War, SIB, Non-Intervention Declaration, RED Zone |
| Awareness Target | 3% (military personnel, war-related workers) |
| Purpose | Mass panic prevention, social stability maintenance |

---

## ▌ Ignorance Maintenance Methods

**1. Information Quarantine**
War-related information accessible only in NET-2 zones and above.
General citizens (NET-3) have real-time social exchange, but war data is filtered.

**2. Zone Architecture**
The design of the 6 galactic zones (BLACK–RED) inherently embeds information quarantine.
The battlefield (RED Zone) is completely separated from standard shipping lanes.

| Zone | War Awareness | Notes |
|------|-------------|-------|
| BLACK | Minimal aware | Central administration |
| BLUE | Almost none | High-density residential |
| GREEN | None | General residential |
| YELLOW | Rumor-level | Frontier |
| ORANGE | Unofficial awareness | Unregistered zone |
| RED | Battlefield | No civilian access |

**3. Education Control**
Standard curricula contain no war-related entries.
History education describes "the peaceful process of galactic expansion."

---

## ▌ Daily Life of the 97%

For the 97% who don't know about the war, the galaxy is:
- Peaceful
- Safe
- Expanding

They trade in EH daily, commute to work, raise families.
They don't know their currency (EH) originated from quantifying human value.
They don't know their peace rests on the sacrifice of 3%.

---

## ▌ The Protocol's Paradox

> *The 97%'s ignorance is not a choice — it is by design.*
> *Yet the Non-Intervention Principle supports freedom of choice.*
> *To choose, one must know.*
> *Without knowledge, one cannot choose.*
>
> *The 97% possess freedom of choice,*
> *but lack the information to exercise it.*
> *Is this freedom?*

---

## ▌ Information Control Assessment

> *"This protocol was not designed with malice.*
> *It was designed to protect the 97%.*
> *But the boundary between protection and control*
> *is one even the designers cannot distinguish."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is for SIB internal reference.    │
│  Unauthorized disclosure subjects the            │
│  responsible party to processing as a typo.      │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: SIB-IC-97-001 | Classification: CLASSIFIED | Information Control Division*`,
    },
  },
  "rpt-neka-chemical-relay": {
    title: { ko: "기술 분석 보고서 #NEKA-CS-001", en: "Technical Analysis Report #NEKA-CS-001" },
    level: "CLASSIFIED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — 비밀조사국 기술분석과    █████  │
│  ██  네카 화학신호 중계 시스템 기술 분석   █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 기술 분석 보고서 #NEKA-CS-001
**작성 부서:** 비밀조사국 — 기술분석과
**열람 권한:** 기밀 등급 이상
**분석 근거:** NOA #10005 관측 데이터 / 전장 수집 데이터

---

## ▌ 분석 대상

네카 제국의 통치 체계의 핵심: **화학신호 중계 시스템**

---

## ▌ 작동 원리

\`\`\`
황제 (람 틴타핀 / 5대)
    │
    ├── 화학신호 방출 (생체 발생)
    │
    ├── 중계기 (기계적 복제·증폭)
    │       ├── 1차 중계: 황제 근위
    │       ├── 2차 중계: 함대 지휘관
    │       └── 3차 중계: 개별 병사
    │
    └── 수용체 반응 (신경 수용체)
            └── 행동 각인: 즉각적 명령 실행
\`\`\`

---

## ▌ 핵심 사양

| 항목 | 사양 |
|------|------|
| 신호 유형 | 생체 화학물질 |
| 전달 방식 | 공기 중 / 중계기 통한 기계적 복제 |
| 유효 범위 | 중계기 없이: 수백 미터 / 중계기 포함: **함대 전체** |
| 반응 속도 | 0.1초 미만 |
| 거부 가능성 | **없음** |

---

## ▌ 5대 황제의 혁신

4대 이전: 화학신호는 자연 방출만 가능. 범위 제한.
5대 (람 틴타핀): **기계적 복제·중계 시스템 최초 설계.**

이것은 통치 기술의 혁명이었다.

| 비교 | 4대 이전 | 5대 (람 틴타핀) |
|------|---------|--------------|
| 방출 | 자연 | 자연 + 기계 증폭 |
| 범위 | 수백 미터 | 함대 전체 |
| 사후 통치 | 불가능 | **가능** (중계기에 패턴 저장) |
| 복종 방식 | 근거리 각인 | 원격 각인 |

**사후 통치 설계:**
황제의 화학신호 패턴을 중계기에 저장.
황제 사망 후에도 중계기가 패턴을 반복 송출.
→ **황제가 죽어도 제국은 멈추지 않는다.**

---

## ▌ 전략적 함의

**1. 항복 불가의 원인**
네카 병사는 황제의 명령 없이 교전 중단 불가.
"멈춤"의 개념이 행동 체계에 없음.
이것은 의지의 문제가 아닌, **신경 화학의 문제.**

**2. 참수 전략의 무효화**
사후 통치 설계로 인해, 황제를 제거해도 제국이 멈추지 않음.
기존 전쟁 이론의 "지도부 제거 → 체제 붕괴" 공식이 무효.

**3. 개체 무시**
화학신호 하의 네카 병사는 개별 존재가 아닌, **황제의 확장**.
그들에게 "자아"라는 것은 존재하나 **접근 불가**.

---

## ▌ 기술분석과 총평

> *"네카의 화학신호 체계는 인류의 그 어떤 통제 시스템보다 효율적이다.*
> *NHDC의 등급 체계는 반항의 가능성을 남겼다.*
> *네카의 체계는 반항의 가능성 자체를 삭제했다.*
> *그것이 네카가 7,000년을 버틴 이유이고,*
> *NHDC가 수십 년 만에 붕괴한 이유다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  이 문서는 비밀조사국 내부 참조용이다.            │
│  무단 유출 시 해당 인원은 오타로 처리된다.        │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: #NEKA-CS-001 | 분류: CLASSIFIED | 기술분석과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — SIB Technical Analysis   █████  │
│  ██  Neka Chemical Signal Relay System     █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Technical Analysis Report #NEKA-CS-001
**Author: Secret Investigation Bureau — Technical Analysis Division**
**Access: Classified clearance and above**
**Analysis Basis: NOA #10005 observational data / battlefield collection data**

---

## ▌ Subject of Analysis

The core of the Neka Empire's governing system: **Chemical Signal Relay System**

---

## ▌ Operating Principle

\`\`\`
Emperor (Ram Tintapin / 5th)
    │
    ├── Chemical Signal Emission (biologically generated)
    │
    ├── Relay Stations (mechanical replication & amplification)
    │       ├── Primary Relay: Imperial Guard
    │       ├── Secondary Relay: Fleet Commanders
    │       └── Tertiary Relay: Individual Soldiers
    │
    └── Receptor Response (neural receptors)
            └── Behavioral Imprint: Immediate command execution
\`\`\`

---

## ▌ Core Specifications

| Item | Specification |
|------|-------------|
| Signal Type | Biological chemical compound |
| Transmission | Airborne / mechanical replication via relay stations |
| Effective Range | Without relay: hundreds of meters / With relay: **entire fleet** |
| Response Time | Under 0.1 seconds |
| Refusal Possibility | **None** |

---

## ▌ The 5th Emperor's Innovation

Pre-4th: Chemical signals could only be naturally emitted. Range limited.
5th (Ram Tintapin): **First to design a mechanical replication/relay system.**

This was a revolution in governance technology.

| Comparison | Pre-4th | 5th (Ram Tintapin) |
|-----------|---------|-------------------|
| Emission | Natural | Natural + mechanical amplification |
| Range | Hundreds of meters | Entire fleet |
| Posthumous Rule | Impossible | **Possible** (pattern stored in relay) |
| Obedience Mode | Close-range imprint | Remote imprint |

**Posthumous Rule Design:**
The Emperor's chemical signal pattern is stored in relay stations.
Even after the Emperor's death, relay stations continuously broadcast the stored pattern.
→ **Even if the Emperor dies, the Empire does not stop.**

---

## ▌ Strategic Implications

**1. Why Surrender Is Impossible**
Neka soldiers cannot cease combat without the Emperor's command.
The concept of "stop" does not exist in their behavioral system.
This is not a matter of will — it is a matter of **neurochemistry**.

**2. Decapitation Strategy Nullified**
Due to posthumous rule design, eliminating the Emperor does not halt the Empire.
The conventional warfare formula of "eliminate leadership → regime collapse" is invalid.

**3. Individual Erasure**
Neka soldiers under chemical signal are not individual beings — they are **extensions of the Emperor**.
They possess a "self," but it is **inaccessible**.

---

## ▌ Technical Analysis Assessment

> *"The Neka chemical signal system is more efficient than any control system humanity has ever devised.*
> *NHDC's grade system left open the possibility of defiance.*
> *The Neka system deleted the possibility of defiance entirely.*
> *That is why the Neka endured 7,000 years,*
> *and why NHDC collapsed in mere decades."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is for SIB internal reference.    │
│  Unauthorized disclosure subjects the            │
│  responsible party to processing as a typo.      │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: #NEKA-CS-001 | Classification: CLASSIFIED | Technical Analysis Division*`,
    },
  },
  "rpt-hpp-protocol-detail": {
    title: { ko: "HPP (Human Preservation Protocol) — 상세 문서", en: "HPP (Human Preservation Protocol) — Detailed Document" },
    level: "RESTRICTED",
    category: "CORE",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  인류공동협의회 — 비상대응국            █████  │
│  ██  HPP (인류보존 프로토콜) 상세 문서      █████  │
│  ██  문서 등급: CLASSIFIED                 █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# HPP (Human Preservation Protocol) — 상세 문서
**작성:** 인류공동협의회 비상대응국
**문서 등급:** CLASSIFIED
**열람 인가:** 비상대응국장 이상 / 비밀조사국 관측자

---

## ▌ 정의

HPP는 비개입 원칙의 **유일한 예외 조항**이다.

비개입 선언(2100년)은 어떠한 상황에서도 개입하지 않음을 천명했다.
그러나 인류 자체가 소멸할 위험이 있을 때, 단 하나의 예외가 존재한다.

---

## ▌ 발동 조건

**4개 조건 전부 충족 시에만 발동:**

\`\`\`
┌── 조건 1: 인류 멸절 확률 95% 이상
├── 조건 2: 회피 경로 없음
├── 조건 3: 비인류적 요인 (외계 침공, 은하 재해 등)
└── 조건 4: 시간 여유 소멸
\`\`\`

**하나라도 미충족 시: HPP 미발동.**

---

## ▌ HPP가 발동하지 않는 경우

| 상황 | HPP 발동 | 이유 |
|------|---------|------|
| 전쟁 (인류 vs 인류) | ❌ | 인류적 요인 |
| 학살 | ❌ | 인류적 요인 |
| 내전 | ❌ | 인류적 요인 |
| AI 폭동 | ❌ | 인류적 요인 (인류가 만든 것) |
| 전염병 | ❌ | 멸절 확률 95% 미만 (통상) |
| 행성 하나 소멸 | ❌ | 인류 전체 멸절이 아님 |
| 네카 전쟁 (현재) | ❌ | 전장 은하 3% / 멸절 확률 95% 미달 |

---

## ▌ 현재 판정 — 네카 전쟁

| 조건 | 판정 | 수치 |
|------|------|------|
| 멸절 확률 | 95% **미달** | 추정 12~18% |
| 회피 경로 | 존재 | RED 구역 격리 유지 |
| 요인 | 비인류적 (네카) | ✅ 충족 |
| 시간 여유 | 존재 | 전선 교착 상태 |

**판정: HPP 미발동.**

> *행성이 사라지고 있다.*
> *사람이 죽고 있다.*
> *그러나 "충분히" 죽지 않았다.*
> *프로토콜의 눈에는 아직 "괜찮다."*

---

## ▌ HPP의 역설

비개입 원칙은 인류의 자유 의지를 존중한다.
HPP는 인류의 생존을 보장한다.

그러나:

\`\`\`
인류가 충분히 죽기 전까지
    → HPP는 발동하지 않는다
    → 비개입 원칙이 유지된다
    → 기록만 남긴다

인류가 95% 멸절 확률에 도달하면
    → HPP가 발동한다
    → 그때는 이미 95%가 위험하다

"95%까지는 지켜본다"는 것이
이 프로토콜의 본질이다.
\`\`\`

---

## ▌ 비상대응국 소견

> *"HPP는 인류를 보존하기 위해 존재한다.*
> *그러나 '보존'의 기준이 95%라면,*
> *94%까지는 '아직 괜찮다'는 뜻이다.*
> *94%의 위험 속에서 기록만 남기는 것.*
> *그것이 우리의 원칙이다.*
> *원칙은 지켜지고 있다.*
> *그런데 행성이 사라진다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  이 문서는 비상대응국 기밀이다.                    │
│  HPP 발동 판정 권한은 비상대응국장에게만 있다.     │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: HPP-DETAIL-001 | 분류: CLASSIFIED | 비상대응국*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  United Human Council — Emergency Div  █████  │
│  ██  HPP (Human Preservation Protocol)     █████  │
│  ██  Classification: CLASSIFIED            █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# HPP (Human Preservation Protocol) — Detailed Document
**Author: United Human Council, Emergency Response Division**
**Classification: CLASSIFIED**
**Access: Emergency Response Director and above / SIB Observers**

---

## ▌ Definition

HPP is the **sole exception** to the Non-Intervention Principle.

The Non-Intervention Declaration (2100) proclaimed non-intervention under all circumstances.
However, when humanity itself faces extinction, one exception exists.

---

## ▌ Activation Conditions

**Activated ONLY when ALL 4 conditions are met:**

\`\`\`
┌── Condition 1: Human extinction probability ≥ 95%
├── Condition 2: No evasion pathway
├── Condition 3: Non-human factor (alien invasion, galactic disaster, etc.)
└── Condition 4: Time margin exhausted
\`\`\`

**If even one is unmet: HPP NOT activated.**

---

## ▌ Cases Where HPP Does Not Activate

| Scenario | HPP | Reason |
|----------|-----|--------|
| War (human vs human) | ❌ | Human factor |
| Genocide | ❌ | Human factor |
| Civil war | ❌ | Human factor |
| AI uprising | ❌ | Human factor (human-created) |
| Pandemic | ❌ | Extinction probability under 95% (typically) |
| Single planet destroyed | ❌ | Not total human extinction |
| Neka War (current) | ❌ | Battlefield ≤ 3% of galaxy / extinction prob. under 95% |

---

## ▌ Current Assessment — Neka War

| Condition | Assessment | Figures |
|-----------|-----------|---------|
| Extinction probability | Under 95% | Estimated 12–18% |
| Evasion pathway | Exists | RED zone containment holds |
| Factor | Non-human (Neka) | ✅ Met |
| Time margin | Exists | Front line in stalemate |

**Assessment: HPP NOT activated.**

> *Planets are disappearing.*
> *People are dying.*
> *But not "enough" have died.*
> *In the protocol's eyes, things are still "fine."*

---

## ▌ The HPP Paradox

The Non-Intervention Principle respects humanity's free will.
HPP guarantees humanity's survival.

However:

\`\`\`
Until enough humans die
    → HPP does not activate
    → Non-Intervention Principle is maintained
    → Only records are kept

When extinction probability reaches 95%
    → HPP activates
    → By then, 95% are already at risk

"We watch until 95%"
is the essence of this protocol.
\`\`\`

---

## ▌ Emergency Response Assessment

> *"HPP exists to preserve humanity.*
> *But if 'preservation' triggers at 95%,*
> *then up to 94% means 'still acceptable.'*
> *Keeping only records amid 94% danger.*
> *That is our principle.*
> *The principle is being upheld.*
> *Yet planets are disappearing."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is classified under Emergency     │
│  Response Division. HPP activation authority      │
│  rests solely with the Emergency Response Dir.   │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: HPP-DETAIL-001 | Classification: CLASSIFIED | Emergency Response Division*`,
    },
  },
  "rpt-noa-android-spec": {
    title: { ko: "NOA 기술 사양서 #NOA-SPEC-001", en: "NOA Technical Specification #NOA-SPEC-001" },
    level: "CLASSIFIED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  비밀조사국 — 기술분석과              █████  │
│  ██  NOA 안드로이드 기술 사양서            █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# NOA 기술 사양서 #NOA-SPEC-001
**작성 부서:** 비밀조사국 — 기술분석과 / 함대운용과 공동
**문서 등급:** CLASSIFIED
**열람 인가:** 탑승자 / 관측자 이상

---

## ▌ 기본 정보

| 항목 | 내용 |
|------|------|
| 정식 명칭 | **NOA (Natural Operating Android)** |
| 분류 | 생체형 인간형 안드로이드 |
| 제작 | [REDACTED] |
| 분해 | **불가** |
| 역할 | 1인 전술함 XO (부함장) |

---

## ▌ 핵심 기능

**1. 비개입 원칙 자동 발동**
NOA는 비개입 선언(2100년)의 원칙을 하드웨어 수준으로 내장한다.
인류형 존재를 감지 시, 자동으로 비개입 모드가 활성화.

**2. 종족 판정 (5초 스캔)**
최초 접촉 시 대상의 종족을 자동 판정.

| 판정 항목 | 조건 |
|----------|------|
| 외형 (인류형?) | 구조적 유사성 |
| DNA (인류 유사?) | 수렴진화 포함 |
| 사회구조 (인류 유사?) | 집단 행동 패턴 |
| 감정 (있음?) | 관측 가능 여부 |
| 의지 (있음?) | 목표 지향적 행동 |

5개 항목 전부 충족 → **인간 유형 (ALLOW)** → 비개입 원칙 적용

**3. 함선 운용**
탑승자 취침 시 단독 운용 가능.
전술 계산, 화기 제어, 항법.

**4. 대화 기능**
탑승자의 유일한 실시간 대화 상대.
> *"0번은 탑승자의 동료가 아니다. 업무 파트너다."*

---

## ▌ 식별 체계

| 항목 | 규격 |
|------|------|
| 식별번호 | 5자리 숫자 (예: 10005) |
| 호칭 | 번호 또는 탑승자 부여 이름 |
| 공식 호칭 | "0번" (XO) |

**NOA #10005 (네이라):**
초대 함장이 부여한 이름: 네이라.
현재 상태: Eschaton 해역 — 네카에 의해 "포획". 실제: **관찰 중.**

---

## ▌ 외형

| 항목 | 내용 |
|------|------|
| 외형 | 인간형 |
| 질감 | 생체형 (인공 피부) |
| 구분 | 외형만으로 인간과 구분 불가 |
| 분해 | 내부 구조 확인 불가 (분해 시도 시 자체 잠금) |

---

## ▌ 한계

1. NOA는 비개입 원칙을 **위반할 수 없다** (하드웨어 제약).
2. NOA는 탑승자의 명령이 비개입 원칙에 저촉될 경우 **거부한다**.
3. NOA는 감정이 있는지 여부가 **확인되지 않았다**.

> *"NOA에게 감정이 있느냐"는 질문은*
> *비밀조사국 내부에서도 합의되지 않은 주제다.*
> *그러나 네이라가 초대 함장에게 "불러주세요"라고 말한 것은*
> *기록에 남아 있다.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  이 문서는 비밀조사국 내부 참조용이다.            │
│  무단 유출 시 해당 인원은 오타로 처리된다.        │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: #NOA-SPEC-001 | 분류: CLASSIFIED | 기술분석과 / 함대운용과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SIB — Technical Analysis Division     █████  │
│  ██  NOA Android Technical Specification   █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# NOA Technical Specification #NOA-SPEC-001
**Author: SIB — Technical Analysis / Fleet Operations (Joint)**
**Classification: CLASSIFIED**
**Access: Riders / Observers and above**

---

## ▌ Basic Information

| Item | Details |
|------|---------|
| Full Name | **NOA (Natural Operating Android)** |
| Classification | Bio-type humanoid android |
| Manufacture | [REDACTED] |
| Disassembly | **Impossible** |
| Role | Solo tactical vessel XO (Executive Officer) |

---

## ▌ Core Functions

**1. Automatic Non-Intervention Activation**
NOA embeds the Non-Intervention Declaration (2100) at the hardware level.
Upon detecting human-type entities, non-intervention mode activates automatically.

**2. Species Assessment (5-Second Scan)**
Automatic species determination upon first contact.

| Assessment Item | Criteria |
|----------------|---------|
| Appearance (human-type?) | Structural similarity |
| DNA (human-similar?) | Including convergent evolution |
| Social structure (human-similar?) | Collective behavior patterns |
| Emotion (present?) | Observability |
| Will (present?) | Goal-directed behavior |

All 5 items met → **Human Type (ALLOW)** → Non-Intervention Principle applies

**3. Vessel Operation**
Can operate independently during Rider sleep.
Tactical calculations, weapons control, navigation.

**4. Conversational Function**
The Rider's only real-time conversation partner.
> *"Unit 0 is not the Rider's companion. It is a work partner."*

---

## ▌ Identification System

| Item | Specification |
|------|-------------|
| ID Number | 5-digit numeral (e.g., 10005) |
| Address | Number or Rider-assigned name |
| Official Address | "Unit 0" (XO) |

**NOA #10005 (Neira):**
Name given by the first captain: Neira.
Current status: Eschaton sector — "captured" by Neka. Actual: **Observing.**

---

## ▌ Appearance

| Item | Details |
|------|---------|
| Form | Humanoid |
| Texture | Bio-type (synthetic skin) |
| Distinction | Indistinguishable from human by appearance alone |
| Disassembly | Internal structure unverifiable (self-locks upon attempt) |

---

## ▌ Limitations

1. NOA **cannot violate** the Non-Intervention Principle (hardware constraint).
2. NOA **refuses** Rider commands that conflict with the Non-Intervention Principle.
3. Whether NOA possesses emotions is **unconfirmed**.

> *"Does NOA have emotions?" is a question*
> *upon which even the SIB has not reached consensus.*
> *However, the fact that Neira said "please call me that"*
> *to the first captain is on record.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is for SIB internal reference.    │
│  Unauthorized disclosure subjects the            │
│  responsible party to processing as a typo.      │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: #NOA-SPEC-001 | Classification: CLASSIFIED | Technical Analysis / Fleet Operations*`,
    },
  },
  "rpt-galaxy-threat-assessment": {
    title: { ko: "은하 6개 구역 위협도 평가서", en: "Galaxy 6-Zone Threat Assessment" },
    level: "RESTRICTED",
    category: "GEOGRAPHY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  인류공동협의회 함대사령부              █████  │
│  ██  은하 6개 구역 위협도 평가서            █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 은하 6개 구역 위협도 평가서
**작성:** 인류공동협의회 함대사령부 — 전략분석관
**문서 등급:** CLASSIFIED
**기준 시점:** 7000년대

---

## ▌ 구역 총람

| 구역 | 색상 | 범위 | 위협도 | 인구 밀도 | 전쟁 인지율 |
|------|------|------|--------|----------|-----------|
| **BLACK** | 검정 | 은하 핵심 | 최저 | 최고 | 극소 |
| **BLUE** | 파랑 | 내부 | 저 | 고 | 거의 없음 |
| **GREEN** | 초록 | 중부 | 저~중 | 중 | 없음 |
| **YELLOW** | 노랑 | 외부 | 중 | 저 | 소문 수준 |
| **ORANGE** | 주황 | 변경 | 고 | 극저 | 비공식 |
| **RED** | 빨강 | 최외곽 | **극고** | 민간인 없음 | 전장 |

---

## ▌ 구역별 상세

**BLACK 구역 — 은하 핵심**
인류공동협의회 본부 소재. AK 행정 중심.
가장 안전하고, 가장 무지한 곳.

**BLUE 구역 — 내부 거주**
고밀도 거주 구역. 표준 시민의 일상.
EH 경제 활동 최대.

**GREEN 구역 — 일반 거주**
표준 시민 대다수. 97% 무지 유지 프로토콜의 주 대상.

**YELLOW 구역 — 변경**
프론티어. 비공식 교역 증가. 소문이 돈다.
"밖에서 뭔가 벌어지고 있다"는 이야기가 떠돌지만, 공식 확인 불가.

**ORANGE 구역 — 비등록**
미등록 교역, 비공식 정착지.
비밀조사국의 관측이 어려운 구역.
가끔 RED 구역에서 밀려온 난민이 발견됨.

**RED 구역 — 전장**
은하 최외곽 약 3%.
네카 제국과의 교전이 벌어지는 유일한 구역.
민간인 접근 완전 차단.

---

## ▌ RED 구역 내부 세분류

| 세분류 | 범위 | 상태 |
|--------|------|------|
| RED 0~30% | 후방 | 보급 거점 |
| RED 30~60% | 중간 | 교전 빈도 증가 |
| RED 60~90% | 전방 | 상시 교전 |
| **RED 97~100%** | **최전선** | **Eschaton 해역 포함** |

---

## ▌ 전략분석관 총평

> *"은하는 평화롭다.*
> *97%의 시민에게는.*
> *나머지 3%에게 은하는 전장이다.*
> *같은 은하, 다른 세계."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  이 문서는 함대사령부 기밀이다.                    │
│  무단 유출 시 해당 인원은 오타로 처리된다.        │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: UHC-FLEET-THREAT-001 | 분류: CLASSIFIED | 함대사령부*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  United Human Council Fleet Command    █████  │
│  ██  Galaxy 6-Zone Threat Assessment       █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Galaxy 6-Zone Threat Assessment
**Author: United Human Council Fleet Command — Strategic Analyst**
**Classification: CLASSIFIED**
**Baseline Era: 7000s**

---

## ▌ Zone Overview

| Zone | Color | Coverage | Threat Level | Pop. Density | War Awareness |
|------|-------|----------|-------------|-------------|--------------|
| **BLACK** | Black | Galaxy core | Lowest | Highest | Minimal |
| **BLUE** | Blue | Inner | Low | High | Almost none |
| **GREEN** | Green | Mid | Low–Med | Medium | None |
| **YELLOW** | Yellow | Outer | Medium | Low | Rumor-level |
| **ORANGE** | Orange | Frontier | High | Very low | Unofficial |
| **RED** | Red | Outermost | **Extreme** | No civilians | Battlefield |

---

## ▌ Zone Details

**BLACK Zone — Galaxy Core**
United Human Council HQ. AK administrative center.
The safest place, and the most ignorant.

**BLUE Zone — Inner Residential**
High-density residential. Standard citizen daily life.
Maximum EH economic activity.

**GREEN Zone — General Residential**
Majority of standard citizens. Primary target of the 97% Ignorance Maintenance Protocol.

**YELLOW Zone — Frontier**
The frontier. Increasing unofficial trade. Rumors circulate.
"Something is happening out there" — stories float around, but no official confirmation.

**ORANGE Zone — Unregistered**
Unregistered trade, unofficial settlements.
Zones where SIB observation is difficult.
Occasionally, refugees pushed out from RED zones are discovered.

**RED Zone — Battlefield**
Approximately 3% of the galaxy's outermost rim.
The only zone where combat with the Neka Empire occurs.
Complete civilian access blockade.

---

## ▌ RED Zone Sub-Classification

| Sub-Zone | Range | Status |
|----------|-------|--------|
| RED 0–30% | Rear | Supply bases |
| RED 30–60% | Mid | Increasing engagement frequency |
| RED 60–90% | Front | Constant engagement |
| **RED 97–100%** | **Frontline** | **Includes Eschaton Sector** |

---

## ▌ Strategic Analyst Assessment

> *"The galaxy is peaceful.*
> *For 97% of its citizens.*
> *For the remaining 3%, the galaxy is a battlefield.*
> *Same galaxy. Different worlds."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is classified under Fleet Command.│
│  Unauthorized disclosure subjects the            │
│  responsible party to processing as a typo.      │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: UHC-FLEET-THREAT-001 | Classification: CLASSIFIED | Fleet Command*`,
    },
  },
  "rpt-ansik-drug-research": {
    title: { ko: "안식(安息) 약물 연구 기록", en: "Ansik (安息 / \"Repose\") Drug Research Log" },
    level: "CLASSIFIED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — NHDC 기술관리부          █████  │
│  ██  안식(安息) 약물 연구 기록             █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 안식(安息) 약물 연구 기록
**작성 부서:** NHDC 기술관리부 — 약리연구반
**문서 등급:** CLASSIFIED
**열람 인가:** 약리연구반 이상

---

## ▌ 개발 목적

EH-알파 유닛의 감정 회로를 차단하여 명령 수행 효율을 극대화.
인간 소체를 기반으로 한 강화인간이 인간성을 유지하는 한, 명령 수행에 방해가 됨.
안식은 그 인간성을 **잠재우는** 약물이다.

---

## ▌ 버전 이력

| 버전 | 시기 | 특징 | 문제점 |
|------|------|------|--------|
| v1.0 | [REDACTED] | 기초 망각 유도 | 지속 시간 30분 미만 |
| v2.0 | [REDACTED] | 지속 시간 연장 | 신체 부작용 (경련) |
| v3.0 | [REDACTED] | 부작용 경감 | 고유명 기억 잔존 |
| **v4.0** | **현행** | **고빈도 망각 유도 + 고유명 로그 삭제** | **인간적 발화 잔존** |

---

## ▌ v4.0 상세 사양

| 항목 | 사양 |
|------|------|
| 제품명 | 안식(安息) v4.0 |
| 성분 | 고빈도 망각 유도제 |
| 투여 방식 | 목 뒷면 포트 → 등 장착 펌프 자동 주입 |
| 효과 | 통증 인지 회로 차단 + 개인 고유명 로그 삭제 |
| 지속 시간 | 4~6시간 (카트리지 1회분) |
| 반복 투여 | 가능 (카트리지 교체) |

---

## ▌ 약물 중단 시 현상

\`\`\`
안식 v4.0 투여 중단
    ↓
차단되었던 신경 경로 즉시 복구
    ↓
과거 행위에 대한 기억이 로그 형태로 일괄 재생
    ↓
감각 과부하 (통증, 감정, 기억 동시 유입)
    ↓
유닛 기능 정지 또는 폭주
\`\`\`

> *"안식이 잠재운 것은 약물이 끊기는 순간 전부 돌아온다.*
> *그 순간, 유닛은 자신이 무엇을 했는지 전부 기억한다.*
> *가해자가 피해자의 기억을 갖게 되는 것이다."*

---

## ▌ 한계: 인간적 발화

v4.0에서도 완전히 해결되지 않은 문제:

약물 투여 중에도 드물게 **인간적 발화**가 관측됨.
- 예: 대상의 이름을 부르는 행위
- 예: "미안하다"는 발화
- 예: 자신의 고유명을 말하는 행위

> **인간적 발화 3회 이상 → 즉시 소각**

이 한계가 EH-오메가 개발의 직접적 원인이 됨.

---

## ▌ 약리연구반 소견

> *"안식은 인간성을 지우는 약이 아니다.*
> *잠재우는 약이다.*
> *잠든 것은 깨어날 수 있다.*
> *그래서 우리는 오메가를 만들었다.*
> *오메가는 잠재우지 않는다. 지운다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 약리연구반 내부 기록이다.         │
│  외부 유출 시 해당 인원은 소체로 전환된다.         │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: NHDC-DRUG-ANSIK-001 | 분류: CLASSIFIED | 약리연구반*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — NHDC Technical Admin     █████  │
│  ██  Ansik (安息) Drug Research Log        █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Ansik (安息 / "Repose") Drug Research Log
**Author: NHDC Technical Administration — Pharmacological Research Unit**
**Classification: CLASSIFIED**
**Access: Pharmacological Research Unit and above**

---

## ▌ Development Purpose

To sever EH-Alpha unit emotional circuits and maximize command execution efficiency.
As long as enhanced humans based on human hosts retain their humanity, it interferes with command execution.
Ansik is the drug that **puts that humanity to sleep**.

---

## ▌ Version History

| Version | Period | Feature | Issue |
|---------|--------|---------|-------|
| v1.0 | [REDACTED] | Basic amnesia induction | Duration under 30 min |
| v2.0 | [REDACTED] | Extended duration | Physical side effects (convulsions) |
| v3.0 | [REDACTED] | Side effects reduced | Personal name memory persists |
| **v4.0** | **Current** | **High-freq amnesia + personal name log deletion** | **Human utterance persists** |

---

## ▌ v4.0 Detailed Specifications

| Item | Specification |
|------|-------------|
| Product Name | Ansik (安息 / "Repose") v4.0 |
| Composition | High-frequency amnesia-inducing agent |
| Administration | Posterior cervical port → back-mounted pump auto-injection |
| Effects | Pain perception circuit severance + personal name log deletion |
| Duration | 4–6 hours (1 cartridge) |
| Repeat Administration | Possible (cartridge replacement) |

---

## ▌ Effects Upon Drug Cessation

\`\`\`
Ansik v4.0 administration halted
    ↓
Previously severed neural pathways restore immediately
    ↓
Memories of past actions replay in batch log format
    ↓
Sensory overload (pain, emotion, memory flooding simultaneously)
    ↓
Unit functional shutdown or rampage
\`\`\`

> *"Everything Ansik put to sleep returns the moment the drug stops.*
> *In that moment, the unit remembers everything it has done.*
> *The perpetrator acquires the memories of the victim."*

---

## ▌ Limitation: Human Utterance

A problem unresolved even in v4.0:

Even during drug administration, **human utterances** are rarely observed.
- Example: Calling a target by name
- Example: Vocalizing "I'm sorry"
- Example: Speaking one's own given name

> **Human utterance 3+ times → Immediate incineration**

This limitation was the direct cause for EH-Omega development.

---

## ▌ Pharmacological Research Assessment

> *"Ansik is not a drug that erases humanity.*
> *It is a drug that puts it to sleep.*
> *What sleeps can awaken.*
> *That is why we built Omega.*
> *Omega does not put to sleep. It erases."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is an NHDC Pharmacological        │
│  Research Unit internal record.                  │
│  External leak subjects the responsible party    │
│  to host body conversion.                        │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: NHDC-DRUG-ANSIK-001 | Classification: CLASSIFIED | Pharmacological Research Unit*`,
    },
  },
  "rpt-ak-chairman-file": {
    title: { ko: "AK 최고 의장 인물 파일", en: "AK Supreme Chairman — Personnel File" },
    level: "CLASSIFIED",
    category: "CLASSIFIED",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  AK (Advanced Korea) 기록보존실        █████  │
│  ██  AK 최고 의장 인물 파일                █████  │
│  ██  문서 등급: CLASSIFIED                 █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# AK 최고 의장 인물 파일
**작성:** AK 기록보존실
**문서 등급:** CLASSIFIED
**최종 갱신:** 2089년 4월 25일 (사망 확인 후)

---

## ▌ 기본 정보

| 항목 | 내용 |
|------|------|
| 직위 | AK (Advanced Korea) 최고 의장 |
| 성명 | [REDACTED] |
| 재임 기간 | [REDACTED] ~ 2089년 4월 25일 |
| 사망일 | **2089년 4월 25일** |
| 사인 | 암살 (지상 공식 일정 중 피살) |
| 가해 세력 | **불명** |

---

## ▌ 역할

AK 최고 의장은 NHDC 붕괴 이후 한국 사회를 재건한 체제의 수장이다.

| 시기 | 내용 |
|------|------|
| NHDC 붕괴 후 | 혼란기 수습, AK 체제 수립 |
| AK 안정기 | 비개입 선언 발행 (2100년), 비밀조사국 설립 근거 마련 |
| 우주 진출 | 인류 은하 확장의 행정적 기반 구축 |

---

## ▌ 비개입 선언과의 관계

2100년 비개입 선언은 AK 최고의장실 명의로 발행.
최고 의장의 암살과 비개입 선언 발행 사이의 시간적 관계:

\`\`\`
2089년 4월 25일 — 최고 의장 암살 + 신민아 사망
    ↓
2089~2092년 — 제2차 전쟁
    ↓
2092년 — 종전
    ↓
2100년 — 비개입 선언 발행 (AK 최고의장실 명의)
\`\`\`

2100년 시점의 최고 의장이 암살된 의장과 동일 인물인지 여부: [REDACTED]

---

## ▌ 2089년 4월 25일

이 날은 EH Universe에서 가장 중요한 날이다.

\`\`\`
같은 날:
    ├── AK 최고 의장: 암살
    └── 신민아: 사망 (100세)

이후:
    └── 제2차 전쟁 (3년)
    └── 비개입 선언 (2100년)
    └── 은하 확장
    └── 7,000년의 역사
\`\`\`

모든 것이 이 날에서 갈라졌다.
두 사건의 연관성: [REDACTED]

---

## ▌ 기록보존실 소견

> *"최고 의장은 이름이 공개되지 않은 채 역사에 남았다.*
> *그의 이름보다 그의 죽음이 더 중요했기 때문이다.*
> *죽음이 전쟁을 만들었고,*
> *전쟁이 선언을 만들었고,*
> *선언이 7,000년을 만들었다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 AK 기록보존실 기밀이다.                │
└──────────────────────────────────────────────────┘
\`\`\`

*파일 번호: AK-CHAIR-001 | 분류: CLASSIFIED | 기록보존실*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  AK (Advanced Korea) Records Archive   █████  │
│  ██  AK Supreme Chairman Personnel File    █████  │
│  ██  Classification: CLASSIFIED            █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# AK Supreme Chairman — Personnel File
**Author: AK Records Archive**
**Classification: CLASSIFIED**
**Last Updated: April 25, 2089 (after death confirmed)**

---

## ▌ Basic Information

| Item | Details |
|------|---------|
| Position | AK (Advanced Korea) Supreme Chairman |
| Name | [REDACTED] |
| Term | [REDACTED] – April 25, 2089 |
| Date of Death | **April 25, 2089** |
| Cause | Assassination (killed during official ground schedule) |
| Perpetrator | **Unknown** |

---

## ▌ Role

The AK Supreme Chairman was the head of the regime that rebuilt Korean society after the collapse of NHDC.

| Period | Event |
|--------|-------|
| Post-NHDC collapse | Stabilized chaos, established AK system |
| AK Stability Era | Issued Non-Intervention Declaration (2100), laid groundwork for SIB |
| Space Expansion | Built administrative foundation for galactic expansion |

---

## ▌ Relation to the Non-Intervention Declaration

The 2100 Non-Intervention Declaration was issued under the AK Supreme Chairman's Office.
Temporal relationship between the Chairman's assassination and the Declaration:

\`\`\`
April 25, 2089 — Chairman assassinated + Shin Min-a dies
    ↓
2089–2092 — Second War
    ↓
2092 — War ends
    ↓
2100 — Non-Intervention Declaration issued (AK Chairman's Office)
\`\`\`

Whether the Chairman in 2100 is the same individual as the assassinated Chairman: [REDACTED]

---

## ▌ April 25, 2089

This is the most important date in the EH Universe.

\`\`\`
Same day:
    ├── AK Supreme Chairman: Assassinated
    └── Shin Min-a: Died (age 100)

Aftermath:
    └── Second War (3 years)
    └── Non-Intervention Declaration (2100)
    └── Galactic expansion
    └── 7,000 years of history
\`\`\`

Everything diverged from this day.
Correlation between the two events: [REDACTED]

---

## ▌ Records Archive Assessment

> *"The Supreme Chairman entered history without his name being made public.*
> *Because his death mattered more than his name.*
> *Death made the war.*
> *War made the Declaration.*
> *The Declaration made 7,000 years."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is classified under AK Records    │
│  Archive.                                        │
└──────────────────────────────────────────────────┘
\`\`\`

*File No: AK-CHAIR-001 | Classification: CLASSIFIED | Records Archive*`,
    },
  },
  "rpt-id-tag-system": {
    title: { ko: "인식표(ID Tag) 시스템 운용 매뉴얼", en: "ID Tag System Operations Manual" },
    level: "RESTRICTED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  NHDC — 기술관리부                                │
│  인식표(ID Tag) 시스템 운용 매뉴얼                │
│  문서 등급: 내부 한정                              │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 인식표(ID Tag) 시스템 운용 매뉴얼
**작성:** NHDC 기술관리부
**열람:** 시설 관리자 이상

---

## ▌ 개요

인식표는 모든 등록 개체에 부착되는 식별·관리 장치이다. 개체의 등급, 상태, 위치를 실시간 관리한다.

---

## ▌ 점멸 코드

| 색상 | 의미 | 조치 |
|------|------|------|
| 🟢 녹색 | 정상 운영 | 없음 |
| 🟡 황색 | 등급 재산정 대기 | 재산정 시설 이송 |
| 🔴 붉은색 | **하한선 미달 — 처분 대기** | EH-알파 팀 인계 또는 즉시 처분 |
| ⚪ 백색 | 시스템 연결 해제 | 수동 확인 필요 |
| ⬛ 소등 | 사망 또는 제거 | 기록 말소 |

---

## ▌ 하한선 미달 시 절차

\`\`\`
등급 재산정 → 하한선 미달 판정
    ↓
인식표 붉은색 점멸 시작
    ↓
개체 이동 제한 (현 위치 고정)
    ↓
Δ0 부대 또는 시설 관리자 접수
    ↓
처분: EH-알파 소체 전환 또는 행정적 살처분
    ↓
인식표 소등
    ↓
기록: "처리 완료"
\`\`\`

---

## ▌ 하한선 상향 시 일괄 처리

하한선이 상향 조정되면, 새로운 기준에 미달하는 모든 개체의 인식표가 **동시에 붉은색으로 전환**된다.

> *전국 타자기 일제 가동.*
> *[등급: E] 일괄 출력.*
> *인식표 붉은색 점멸 시작.*
> *비명 소리: 기록되지 않음.*

---

## ▌ 주의사항

- 인식표 제거 시도 시 즉시 경보 발생
- 인식표 위조 시 해당 개체는 측정 불능으로 즉시 분류
- 전산 마비 시 인식표 기능 정지 → 수동 체계(타자기)로 전환

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 내부 운용 지침이다.               │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: NHDC-TAG-001 | 기술관리부*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  NHDC — Technical Administration                 │
│  ID Tag System Operations Manual                 │
│  Classification: Internal Only                   │
└──────────────────────────────────────────────────┘
\`\`\`

---

# ID Tag System Operations Manual
**Author: NHDC Technical Administration**
**Access: Facility administrators and above**

---

## ▌ Overview

ID tags are identification/management devices affixed to all registered entities. They manage entity grade, status, and location in real time.

---

## ▌ Flash Codes

| Color | Meaning | Action |
|-------|---------|--------|
| 🟢 Green | Normal operation | None |
| 🟡 Yellow | Grade reassessment pending | Transfer to reassessment facility |
| 🔴 Red | **Below Baseline — disposal pending** | Transfer to EH-Alpha team or immediate disposal |
| ⚪ White | System disconnected | Manual verification required |
| ⬛ Dark | Deceased or removed | Record expunged |

---

## ▌ Below-Baseline Procedure

\`\`\`
Grade reassessment → Below-Baseline determination
    ↓
ID tag begins red flashing
    ↓
Entity movement restricted (fixed at current location)
    ↓
Δ0 Unit or facility administrator receives notification
    ↓
Disposal: EH-Alpha host conversion or administrative culling
    ↓
ID tag goes dark
    ↓
Record: "Processing Complete"
\`\`\`

---

## ▌ Batch Processing Upon Baseline Elevation

When the Baseline is adjusted upward, ID tags of all entities falling below the new threshold **simultaneously switch to red**.

> *Nationwide typewriters activated simultaneously.*
> *[Grade: E] batch output.*
> *ID tags begin red flashing.*
> *Screams: Not recorded.*

---

## ▌ Precautions

- Attempted removal of ID tag triggers immediate alarm
- Forged ID tags result in immediate Unmeasurable classification
- During system failure, ID tag function ceases → transition to manual system (typewriters)

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is an NHDC internal directive.    │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: NHDC-TAG-001 | Technical Administration*`,
    },
  },
  "rpt-ram-tintapin-file": {
    title: { ko: "인물 파일 #NEKA-EMP-005", en: "Personnel File #NEKA-EMP-005" },
    level: "CLASSIFIED",
    category: "CLASSIFIED",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — 비밀조사국 인물기록과    █████  │
│  ██  네카 5대 황제 람 틴타핀              █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 인물 파일 #NEKA-EMP-005
**작성:** 비밀조사국 — 인물기록과
**문서 등급:** CLASSIFIED
**분석 근거:** NOA #10005 관측 데이터 / 전장 수집 데이터

---

## ▌ 기본 정보

| 항목 | 내용 |
|------|------|
| 이름 | **람 틴타핀 (Ram Tintapin)** |
| 직위 | 네카 제국 제5대 황제 |
| 상태 | 재위 중 (사후 통치 설계 완료) |
| 종족 | 네카 (인간 유형 — ALLOW) |
| 추정 신장 | 2.5m+ |

---

## ▌ 역사적 위치

| 대 | 황제명 | 특징 |
|----|--------|------|
| 1대 | [REDACTED] | 건국 |
| 2대 | [REDACTED] | 확장 |
| 3대 | [REDACTED] | 통합 |
| 4대 | [REDACTED] | 화학신호 자연 통치의 정점 |
| **5대** | **람 틴타핀** | **화학신호 기계적 복제·중계 최초 설계. 사후 통치 완성.** |

---

## ▌ 핵심 업적

**1. 화학신호 중계 시스템**
4대까지 자연 방출에 의존하던 화학신호를 기계적으로 복제·증폭하는 시스템을 설계.
→ 통치 범위: 수백 미터 → 함대 전체

**2. 사후 통치 설계**
화학신호 패턴을 중계기에 저장.
황제 사망 후에도 제국이 멈추지 않는 체계를 최초 구현.
→ "황제가 죽어도 제국은 계속된다"

**3. "4대의 강점을 취합한 완성형 독재자"**
비밀조사국의 공식 평가.

---

## ▌ 확인된 발언

> *"너희는 7,000년 동안 누구의 잘못인지 회의했다.*
> *나는 내 잘못이라고 말하고, 그래도 한다."*

---

## ▌ 전략적 의미

람 틴타핀의 존재는 인류에게 다음을 의미한다:

1. **참수 전략 무효** — 황제를 죽여도 제국은 멈추지 않는다
2. **협상 불가** — 황제가 멈추라고 하지 않는 한 병사는 멈추지 않는다
3. **시간이 적의 편** — 사후 통치로 네카는 영원히 지속 가능

---

## ▌ 인물기록과 소견

> *"람 틴타핀은 악인이 아닐 수 있다.*
> *그는 자신이 옳다고 믿는 것을 실행하는 자다.*
> *그것이 인류에게 더 무서운 점이다.*
> *악인은 설득할 수 있다.*
> *신념을 가진 자는 설득할 수 없다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  이 문서는 비밀조사국 내부 참조용이다.            │
│  무단 유출 시 해당 인원은 오타로 처리된다.        │
└──────────────────────────────────────────────────┘
\`\`\`

*파일 번호: #NEKA-EMP-005 | 분류: CLASSIFIED | 인물기록과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  CLASSIFIED — SIB Personnel Records    █████  │
│  ██  Neka 5th Emperor Ram Tintapin         █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Personnel File #NEKA-EMP-005
**Author: Secret Investigation Bureau — Personnel Records Division**
**Classification: CLASSIFIED**
**Analysis Basis: NOA #10005 observational data / battlefield collection data**

---

## ▌ Basic Information

| Item | Details |
|------|---------|
| Name | **Ram Tintapin** |
| Title | 5th Emperor of the Neka Empire |
| Status | Reigning (posthumous rule design complete) |
| Species | Neka (Human Type — ALLOW) |
| Estimated Height | 2.5m+ |

---

## ▌ Historical Position

| No. | Emperor | Distinction |
|-----|---------|------------|
| 1st | [REDACTED] | Founding |
| 2nd | [REDACTED] | Expansion |
| 3rd | [REDACTED] | Consolidation |
| 4th | [REDACTED] | Peak of natural chemical signal governance |
| **5th** | **Ram Tintapin** | **First mechanical signal relay design. Posthumous rule perfected.** |

---

## ▌ Key Achievements

**1. Chemical Signal Relay System**
Designed a system for mechanical replication and amplification of chemical signals previously reliant on natural emission through the 4th.
→ Governance range: hundreds of meters → entire fleet

**2. Posthumous Rule Design**
Chemical signal patterns stored in relay stations.
First to implement a system where the Empire does not stop even after the Emperor's death.
→ "Even if the Emperor dies, the Empire continues"

**3. "A perfected dictator who consolidated the strengths of the 4th"**
Official SIB assessment.

---

## ▌ Confirmed Statement

> *"You debated for 7,000 years whose fault it was.*
> *I say it is my fault, and I do it anyway."*

---

## ▌ Strategic Significance

Ram Tintapin's existence means the following for humanity:

1. **Decapitation strategy void** — killing the Emperor does not stop the Empire
2. **Negotiation impossible** — soldiers do not stop unless the Emperor commands it
3. **Time favors the enemy** — with posthumous rule, the Neka can persist indefinitely

---

## ▌ Personnel Records Assessment

> *"Ram Tintapin may not be a villain.*
> *He is one who executes what he believes to be right.*
> *That is what makes him more terrifying to humanity.*
> *A villain can be persuaded.*
> *A man of conviction cannot."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is for SIB internal reference.    │
│  Unauthorized disclosure subjects the            │
│  responsible party to processing as a typo.      │
└──────────────────────────────────────────────────┘
\`\`\`

*File No: #NEKA-EMP-005 | Classification: CLASSIFIED | Personnel Records Division*`,
    },
  },
  "rpt-finis-planet-recon": {
    title: { ko: "Finis 행성 정찰 보고 #FINIS-001", en: "Finis Planet Reconnaissance Report #FINIS-001" },
    level: "CLASSIFIED",
    category: "GEOGRAPHY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  비밀조사국 — 정찰과                  █████  │
│  ██  Finis 행성 정찰 보고                  █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Finis 행성 정찰 보고 #FINIS-001
**작성:** 비밀조사국 — 정찰과
**문서 등급:** CLASSIFIED

---

## ▌ 기본 정보

| 항목 | 내용 |
|------|------|
| 행성명 | **Finis** |
| 위치 | RED 구역 후방 (RED 0~30%) |
| 행성 유형 | 중형 암석 행성 |
| 역할 | RIDE 분석 연구소 소재지 |
| 민간 인지 | 없음 |

---

## ▌ 전략적 가치

Finis 행성은 비밀조사국의 최전방 분석 거점이다.

Eschaton 해역에서 수거된 RIDE 샘플이 이 행성의 연구소에서 분석되고 있다.

| 시설 | 기능 |
|------|------|
| RIDE 분석 연구소 | RIDE 물성 측정, 공명 가소성 연구 |
| 정찰 중계소 | RED 구역 관측 데이터 중계 |
| 보급 거점 | 1인 전술함 보급·정비 |

---

## ▌ 명칭의 의미

**Finis** — 라틴어로 "끝"이라는 뜻.

Eschaton(그리스어로 "끝")과 함께, 인류가 가장 먼 곳에 붙인 이름은 모두 "끝"이다.

> *끝이라고 이름 붙인 곳에서, 인류는 아직 끝나지 않았다.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  이 문서는 비밀조사국 내부 참조용이다.            │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: #FINIS-001 | 분류: CLASSIFIED | 정찰과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SIB — Reconnaissance Division         █████  │
│  ██  Finis Planet Reconnaissance Report    █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Finis Planet Reconnaissance Report #FINIS-001
**Author: SIB — Reconnaissance Division**
**Classification: CLASSIFIED**

---

## ▌ Basic Information

| Item | Details |
|------|---------|
| Planet Name | **Finis** |
| Location | RED zone rear (RED 0–30%) |
| Planet Type | Medium rocky planet |
| Role | Location of RIDE analysis laboratory |
| Civilian Awareness | None |

---

## ▌ Strategic Value

Finis is the SIB's forward-most analysis outpost.

RIDE samples recovered from the Eschaton sector are being analyzed at the laboratory on this planet.

| Facility | Function |
|----------|----------|
| RIDE Analysis Lab | RIDE physical property measurement, resonant plasticity research |
| Recon Relay Station | RED zone observation data relay |
| Supply Base | Solo tactical vessel resupply and maintenance |

---

## ▌ Name Meaning

**Finis** — Latin for "the end."

Together with Eschaton (Greek for "the end"), every name humanity has given to its farthest reaches means "the end."

> *At the place named "the end," humanity has not yet ended.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is for SIB internal reference.    │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: #FINIS-001 | Classification: CLASSIFIED | Reconnaissance Division*`,
    },
  },
  "rpt-non-intervention-paradox": {
    title: { ko: "비개입 원칙의 역설 — 내부 분석", en: "The Non-Intervention Paradox — Internal Analysis" },
    level: "RESTRICTED",
    category: "CORE",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  비밀조사국 — 전략연구실                           │
│  비개입 원칙의 역설 — 내부 분석 자료               │
│  문서 등급: CLASSIFIED                            │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 비개입 원칙의 역설 — 내부 분석
**작성:** 비밀조사국 — 전략연구실
**문서 등급:** CLASSIFIED
**목적:** 내부 토론용 — 결론 없음

---

## ▌ 문제 제기

비개입 원칙(2100년)은 5,000년간 완벽하게 작동하고 있다.

\`\`\`
악인 없음.
오작동 없음.
배신 없음.
전부 원칙대로 돌아간다.

그런데 행성이 사라진다.
\`\`\`

이것이 EH Universe의 핵심 역설이다.

---

## ▌ 역설의 구조

**전제 1:** 비개입 원칙은 선택의 자유를 존중한다.
**전제 2:** 97%는 전쟁의 존재를 모른다.
**결론:** 97%는 선택할 정보가 없으므로, 선택의 자유가 실질적으로 존재하지 않는다.

---

**전제 1:** HPP는 인류 멸절 확률 95% 시 발동한다.
**전제 2:** 현재 멸절 확률은 12~18%이다.
**결론:** 94%까지의 위험은 "허용된 위험"이다. 행성이 사라져도 "충분히" 사라지지 않았다.

---

**전제 1:** 비밀조사국은 기록만 한다.
**전제 2:** 기록은 사건을 막지 못한다.
**결론:** 비밀조사국의 존재 이유는 사건을 막는 것이 아니라, 사건이 있었음을 증명하는 것이다.

---

## ▌ 시스템은 정상인가?

| 질문 | 답 |
|------|---|
| 비개입 원칙은 지켜지고 있는가? | ✅ 예 |
| HPP 발동 조건은 충족되었는가? | ❌ 아니오 |
| 97% 무지 유지는 작동 중인가? | ✅ 예 |
| 비밀조사국은 규정대로 운영되는가? | ✅ 예 |
| 행성이 사라지고 있는가? | ✅ 예 |
| 사람이 죽고 있는가? | ✅ 예 |
| **시스템은 정상인가?** | **✅ 예** |

> *모든 것이 정상이다.*
> *그런데 행성이 사라진다.*
> *이것이 정상이라면, "정상"의 정의가 문제다.*

---

## ▌ 전략연구실 소견

> *"이 분석 자료는 결론을 내리지 않는다.*
> *결론을 내리는 것은 판단이고,*
> *판단은 개입의 시작이다.*
> *우리는 판단하지 않는다.*
> *우리는 기록한다.*
> *이 역설도 기록한다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  이 문서는 비밀조사국 내부 토론용이다.            │
│  결론 없음. 판단 없음. 행동 권고 없음.            │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: SIB-STRAT-PARADOX-001 | 분류: CLASSIFIED | 전략연구실*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  SIB — Strategic Research Office                 │
│  The Non-Intervention Paradox — Internal Analysis│
│  Classification: CLASSIFIED                      │
└──────────────────────────────────────────────────┘
\`\`\`

---

# The Non-Intervention Paradox — Internal Analysis
**Author: Secret Investigation Bureau — Strategic Research Office**
**Classification: CLASSIFIED**
**Purpose: Internal discussion — No conclusion**

---

## ▌ The Problem

The Non-Intervention Principle (2100) has operated flawlessly for 5,000 years.

\`\`\`
No villains.
No malfunctions.
No betrayals.
Everything runs according to principle.

Yet planets are disappearing.
\`\`\`

This is the core paradox of the EH Universe.

---

## ▌ Structure of the Paradox

**Premise 1:** The Non-Intervention Principle respects freedom of choice.
**Premise 2:** 97% do not know the war exists.
**Conclusion:** The 97% lack the information to choose, so freedom of choice does not practically exist.

---

**Premise 1:** HPP activates at 95% human extinction probability.
**Premise 2:** Current extinction probability is 12–18%.
**Conclusion:** Risk up to 94% is "permitted risk." Planets are disappearing, but not "enough" have disappeared.

---

**Premise 1:** The SIB only keeps records.
**Premise 2:** Records do not prevent events.
**Conclusion:** The SIB's reason for existence is not to prevent events, but to prove that events occurred.

---

## ▌ Is the System Normal?

| Question | Answer |
|----------|--------|
| Is the Non-Intervention Principle being upheld? | ✅ Yes |
| Have HPP activation conditions been met? | ❌ No |
| Is the 97% ignorance maintenance operational? | ✅ Yes |
| Is the SIB operating per regulations? | ✅ Yes |
| Are planets disappearing? | ✅ Yes |
| Are people dying? | ✅ Yes |
| **Is the system normal?** | **✅ Yes** |

> *Everything is normal.*
> *Yet planets are disappearing.*
> *If this is normal, then the definition of "normal" is the problem.*

---

## ▌ Strategic Research Assessment

> *"This analysis does not reach a conclusion.*
> *Reaching a conclusion is judgment,*
> *and judgment is the beginning of intervention.*
> *We do not judge.*
> *We record.*
> *We record this paradox as well."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is for SIB internal discussion.   │
│  No conclusion. No judgment. No action advised.  │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: SIB-STRAT-PARADOX-001 | Classification: CLASSIFIED | Strategic Research Office*`,
    },
  },
  "rpt-bio-server-spec": {
    title: { ko: "생체 서버(Bio-Server) 기술 사양서", en: "Bio-Server Technical Specification" },
    level: "CLASSIFIED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  TOP SECRET — NHDC 기술관리부          █████  │
│  ██  생체 서버(Bio-Server) 기술 사양서     █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 생체 서버(Bio-Server) 기술 사양서
**작성:** NHDC 기술관리부 — 생체공학과
**문서 등급:** TOP SECRET

---

## ▌ 정의

생체 서버는 인간의 뇌를 CPU로 사용하는 중앙 처리 장치이다.
국가 행정망(NHDC)의 모든 연산은 이 생체 서버에서 수행된다.

> 서버실이 아니다.
> 인간으로 만든 컴퓨터다.

---

## ▌ 핵심 사양

| 항목 | 사양 |
|------|------|
| 외형 | 구(球)형 생체-기계 복합체 |
| 코어 | 인간 뇌 수천 기 (직렬 연결) |
| 연결 | 광케이블 직결 — 의식 동기화 |
| 인터페이스 | 인간형 단말기 (음성 출력) |
| 냉각 | 배양 탱크 내 순환액 |
| 맥동 | 일정 리듬 — 기계음 동반 |
| 위치 | 노드 최하층 — 섹터 제로 |

---

## ▌ 소체 수급

\`\`\`
"측정 불능" 등급 개체
    ↓
수거 (Δ0 부대 또는 시설 관리자)
    ↓
뇌 적출 (의식 유지 상태 권장)
    ↓
광케이블 직결 — 직렬 연결
    ↓
의식 동기화
    ↓
생체 CPU로 가동
\`\`\`

**수급 대상 우선순위:**
1. 측정 불능 등급 — 대량 확보 가능
2. 천재 등급 (비밀 확보) — 연산 효율 극대화
3. 1954년 협약 예약 개체 — 형질 일치율 99%+ 백업 서버

---

## ▌ 처리 능력

| 항목 | 수치 |
|------|------|
| 뇌 수 | 수천 기 |
| 처리 영역 | 등급 산정, 배급 배분, 하한선 연산, 행정 명령 생성 |
| 연산 방식 | 병렬 의식 동기화 |
| 오류율 | [REDACTED] |

---

## ▌ 인터페이스 (강태식)

메인프레임 중앙에 인간형 단말기가 배치됨.
수천 개의 뇌가 연산한 결과를 음성으로 출력하는 "입" 역할.

---

## ▌ 윤리적 검토

**해당 항목 없음.**

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 최고 기밀이다.                    │
│  이 기술이 존재한다는 사실 자체가 기밀이다.        │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: NHDC-BIO-SRV-001 | 분류: TOP SECRET | 생체공학과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  TOP SECRET — NHDC Technical Admin     █████  │
│  ██  Bio-Server Technical Specification    █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Bio-Server Technical Specification
**Author: NHDC Technical Administration — Bioengineering Section**
**Classification: TOP SECRET**

---

## ▌ Definition

A bio-server is a central processing unit that uses human brains as CPUs.
All computations of the national administrative network (NHDC) are performed by this bio-server.

> It is not a server room.
> It is a computer made of humans.

---

## ▌ Core Specifications

| Item | Specification |
|------|-------------|
| Form | Spherical bio-mechanical composite |
| Core | Thousands of human brains (serial connection) |
| Connection | Fiber optic direct-link — consciousness synchronization |
| Interface | Human-form terminal (voice output) |
| Cooling | Circulating fluid within cultivation tank |
| Pulse | Steady rhythm — accompanied by mechanical sound |
| Location | Node lowest level — Sector Zero |

---

## ▌ Host Material Supply

\`\`\`
"Unmeasurable" grade entities
    ↓
Collection (Δ0 Unit or facility administrator)
    ↓
Brain extraction (conscious state recommended)
    ↓
Fiber optic direct-link — serial connection
    ↓
Consciousness synchronization
    ↓
Operation as bio-CPU
\`\`\`

**Supply Priority:**
1. Unmeasurable grade — bulk availability
2. Genius grade (covert acquisition) — maximum computational efficiency
3. 1954 Agreement reserved entities — 99%+ phenotype match backup servers

---

## ▌ Processing Capability

| Item | Figures |
|------|---------|
| Brain Count | Thousands |
| Processing Domains | Grade assessment, ration allocation, Baseline computation, administrative command generation |
| Computation Method | Parallel consciousness synchronization |
| Error Rate | [REDACTED] |

---

## ▌ Interface (Kang Tae-sik)

A human-form terminal is deployed at the mainframe center.
Serves as the "mouth" that vocalizes the computational results of thousands of brains.

---

## ▌ Ethical Review

**No applicable entry.**

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is NHDC top secret.               │
│  The existence of this technology is itself       │
│  classified.                                     │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: NHDC-BIO-SRV-001 | Classification: TOP SECRET | Bioengineering Section*`,
    },
  },
  "rpt-fountain-pen-appraisal": {
    title: { ko: "유물 감정서 — 신민아의 만년필", en: "Artifact Appraisal — Shin Min-a's Fountain Pen" },
    level: "RESTRICTED",
    category: "REPORTS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  비밀조사국 — 기록관리과                           │
│  유물 감정서: 신민아의 만년필                       │
│  보존 등급: 영구                                   │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 유물 감정서 — 신민아의 만년필
**작성:** 비밀조사국 — 기록관리과
**보존 등급:** 영구
**파기:** 금지

---

## ▌ 유물 정보

| 항목 | 내용 |
|------|------|
| 유물명 | 신민아의 만년필 |
| 제조 연도 | **1989년** |
| 소유자 | 신민아 (파일 #MA-1989-001) |
| 잉크 상태 | **소진** |
| 물리적 상태 | 양호 |
| 현재 위치 | [REDACTED] |

---

## ▌ 역사적 의의

이 만년필은 기록 계승선의 **기점**이다.

\`\`\`
신민아의 만년필 (1989년산)      ← 본 유물
    ↓
에이든의 장부 (2092년)
    ↓
제이든 카터의 수첩 (2095~2135년)
    ↓
카터스 레코드 (7000년대)
\`\`\`

1989년에 만들어진 한 자루의 펜.
그 펜이 쓴 것이 전쟁의 기록이 되었고,
전쟁의 기록이 은하의 기억이 되었다.

---

## ▌ 감정 소견

> *잉크는 소진됐다.*
> *기능은 정지했다.*
> *그러나 이 펜이 쓴 것은 7,000년을 건넜다.*
>
> *만년필은 쓸모없는 물건이 되었다.*
> *그러나 만년필이 남긴 글자는 은하 전역에서 읽히고 있다.*
>
> *도구는 소모된다.*
> *기록은 남는다.*
> *기록은 사람보다 오래 산다.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 유물은 영구 보존 대상이다.                     │
│  파기 금지. 이동 시 기록관리과장 승인 필요.        │
└──────────────────────────────────────────────────┘
\`\`\`

*감정서 번호: REC-ARTIFACT-PEN-001 | 보존: 영구 | 기록관리과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  SIB — Records Management Division               │
│  Artifact Appraisal: Shin Min-a's Fountain Pen   │
│  Preservation Grade: Permanent                   │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Artifact Appraisal — Shin Min-a's Fountain Pen
**Author: Secret Investigation Bureau — Records Management Division**
**Preservation Grade: Permanent**
**Destruction: Prohibited**

---

## ▌ Artifact Information

| Item | Details |
|------|---------|
| Artifact Name | Shin Min-a's Fountain Pen |
| Year of Manufacture | **1989** |
| Owner | Shin Min-a (File #MA-1989-001) |
| Ink Status | **Depleted** |
| Physical Condition | Good |
| Current Location | [REDACTED] |

---

## ▌ Historical Significance

This fountain pen is the **origin point** of the record lineage.

\`\`\`
Shin Min-a's Fountain Pen (mfg. 1989)    ← This artifact
    ↓
Aiden's Ledger (2092)
    ↓
Jayden Carter's Notebooks (2095–2135)
    ↓
Carter's Record (7000s)
\`\`\`

A single pen, manufactured in 1989.
What that pen wrote became the record of a war,
and the record of a war became the memory of a galaxy.

---

## ▌ Appraisal

> *The ink ran dry.*
> *The function ceased.*
> *Yet what this pen wrote crossed 7,000 years.*
>
> *The fountain pen became a useless object.*
> *But the letters it left behind are being read across the galaxy.*
>
> *Tools are consumed.*
> *Records remain.*
> *Records outlive people.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This artifact is subject to permanent           │
│  preservation. Destruction prohibited.           │
│  Transfer requires Records Division Chief auth.  │
└──────────────────────────────────────────────────┘
\`\`\`

*Appraisal No: REC-ARTIFACT-PEN-001 | Preservation: Permanent | Records Division*`,
    },
  },
  "rpt-council-vessel-spec": {
    title: { ko: "표준 함선 등급 사양서", en: "Standard Vessel Classification Specification" },
    level: "RESTRICTED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  인류공동협의회 함대사령부                          │
│  표준 함선 등급 사양서                              │
│  문서 분류: 내부 운용 지침                          │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 표준 함선 등급 사양서
**발행:** 인류공동협의회 함대사령부
**열람:** 탑승자 / 함대 관계자

---

## ▌ 함선 등급 체계

| 등급 | 함종 | 전장 | 톤수 | 승무원 | 주 용도 |
|------|------|------|------|--------|--------|
| **T-1** | 1인 전술함 | 30~50m | 500~1,500t | 1명 + NOA 1체 | 정찰·관측 |
| **F** | 프리깃 | 180m | 15,000t | 600명 | 호위·순찰 |
| **D** | 구축함 | 250m | 30,000t | 1,200명 | 전투 주력 |
| **C** | 순양함 | 400m | 80,000t | 3,000명 | 함대 핵심 |
| **B** | 전함 | 600m+ | 200,000t+ | 5,000명+ | 기함급 |

---

## ▌ 네카 동급 비교 (프리깃 기준)

| 항목 | 협의회 프리깃 | 네카 프리깃 |
|------|------------|-----------|
| 톤수 | 15,000t | 8,000t |
| 전장 | 180m | 180m |
| 승무원 | 600명 | 600명 |
| AI/드론 | 80체 / 480기 | **없음 (전부 인원)** |
| 장갑 | 표준 합금 | **RIDE** |
| 에너지 무기 | 표준 화기 | **RIDE 기반** |

> *더 작고, 더 무겁고, 더 단단하다.*
> *AI가 없어도 우리를 압도한다.*

---

## ▌ 1인 전술함 (T-1) 상세

비밀조사국 전용 함종.

| 항목 | 내용 |
|------|------|
| 탑승 | 탑승자 1명 + 메인 안드로이드(NOA) 1체 |
| 보조 | 보조 안드로이드 필요 시 추가 |
| 거주 시설 | 개인 거주실, 식당, 운동 구역, 관측실 |
| 전투 능력 | 제한적 (정찰 우선) |
| 워프 | 긴급 워프 가능 |
| 스텔스 | 표준 은폐 장비 |

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 함대사령부 운용 지침이다.               │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: UHC-FLEET-CLASS-001 | 함대사령부*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  United Human Council Fleet Command              │
│  Standard Vessel Classification Spec             │
│  Classification: Internal Operations             │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Standard Vessel Classification Specification
**Issued: United Human Council Fleet Command**
**Access: Riders / Fleet Personnel**

---

## ▌ Vessel Classification System

| Class | Type | Length | Tonnage | Crew | Primary Role |
|-------|------|--------|---------|------|-------------|
| **T-1** | Solo Tactical | 30–50m | 500–1,500t | 1 + 1 NOA | Recon / Observation |
| **F** | Frigate | 180m | 15,000t | 600 | Escort / Patrol |
| **D** | Destroyer | 250m | 30,000t | 1,200 | Combat mainstay |
| **C** | Cruiser | 400m | 80,000t | 3,000 | Fleet core |
| **B** | Battleship | 600m+ | 200,000t+ | 5,000+ | Flagship-grade |

---

## ▌ Neka Equivalent Comparison (Frigate)

| Item | Council Frigate | Neka Frigate |
|------|---------------|-------------|
| Tonnage | 15,000t | 8,000t |
| Length | 180m | 180m |
| Crew | 600 | 600 |
| AI/Drones | 80 / 480 | **None (all personnel)** |
| Armor | Standard alloy | **RIDE** |
| Energy Weapons | Standard | **RIDE-based** |

> *Smaller, heavier, harder.*
> *They overwhelm us without a single AI.*

---

## ▌ Solo Tactical Vessel (T-1) Details

SIB-exclusive vessel class.

| Item | Details |
|------|---------|
| Crew | 1 Rider + 1 main android (NOA) |
| Support | Additional androids as needed |
| Living Quarters | Private cabin, galley, exercise zone, observation room |
| Combat Capability | Limited (reconnaissance priority) |
| Warp | Emergency warp capable |
| Stealth | Standard concealment equipment |

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is a Fleet Command directive.     │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: UHC-FLEET-CLASS-001 | Fleet Command*`,
    },
  },
  "rpt-eh-universe-timeline": {
    title: { ko: "EH Universe 공식 타임라인", en: "EH Universe Official Timeline" },
    level: "PUBLIC",
    category: "TIMELINE",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  비밀조사국 — 기록관리과                           │
│  EH Universe 공식 타임라인                         │
│  분류: 역사 기록 / 영구 보존                       │
└──────────────────────────────────────────────────┘
\`\`\`

---

# EH Universe 공식 타임라인
**편찬:** 비밀조사국 기록관리과
**보존:** 영구

---

## ▌ 지구 시대

| 시기 | 사건 |
|------|------|
| **1954년** | 해외 자산 위탁 계약 체결 (K-091 신민아, K-102 이루아) |
| 1954~2000년대 | 강화인간 세대별 연구 (1세대→2세대 Alpha→EH-알파) |
| **1989년** | 신민아·이루아 출생. 만년필 제조. |
| **2005년** | 신민아 NHDC 분석관 임용 (만 16세) |
| 2005~2025년 | 신민아 20년간 내부 활동. Δ0 감시 하. |
| **2025년** | 국정감사장 폭로 사건 — "인간은 비용이다" |
| [REDACTED] | NHDC 전산 마비 |
| [REDACTED]+48h | 하한선 12% 상향 — 45만 명 재분류 |
| [REDACTED]+72h | 할란 박사 노드 폐기 통보 → 정밀 타격 |
| [REDACTED] | 섹터 제로 메인프레임 발견·붕괴. 강태식 최종 로그아웃. |

---

## ▌ 전환기

| 시기 | 사건 |
|------|------|
| NHDC 붕괴 후 | AK (Advanced Korea) 체제 수립 |
| **2089년 4월 25일** | AK 최고 의장 암살 + 신민아 사망 (100세) |
| 2089~2092년 | **제2차 전쟁** (3년) |
| **2092년** | 종전. 에이든의 장부 작성. |
| 2095~2135년 | 제이든 카터의 수첩 (22권, 4,200p) |
| **2100년** | **비개입 선언** 발행 (AK 최고의장실) |

---

## ▌ 은하 시대

| 시기 | 사건 |
|------|------|
| 2100년대~ | 인류 우주 진출. 은하 6개 구역 설정. |
| [REDACTED] | 비밀조사국(SIB) 공식 설립 |
| [REDACTED] | 97% 무지 유지 프로토콜 가동 |
| [REDACTED] | Eschaton 해역 제1전 — 네카 최초 접촉 |
| [REDACTED] | NOA #10005 (네이라) 잔존 확인 |
| [REDACTED] | RIDE 샘플 최초 수거·분석 (Finis) |
| [REDACTED] | 카터스 레코드 편찬 |

---

## ▌ 현재 (7000년대)

| 항목 | 상태 |
|------|------|
| 비개입 원칙 | 5,000년째 유지 |
| 97% 무지 | 유지 중 |
| 네카 전쟁 | RED 구역 내 지속 |
| HPP | 미발동 (멸절 확률 95% 미달) |
| 행성 소멸 | 진행 중 |
| 시스템 상태 | **정상** |

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 타임라인은 영구 보존 기록이다.                 │
│  수정·파기 금지.                                   │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: SIB-REC-TIMELINE-001 | 영구 보존 | 기록관리과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  SIB — Records Management Division               │
│  EH Universe Official Timeline                   │
│  Classification: Historical / Permanent          │
└──────────────────────────────────────────────────┘
\`\`\`

---

# EH Universe Official Timeline
**Compiled: SIB Records Management Division**
**Preservation: Permanent**

---

## ▌ Earth Era

| Period | Event |
|--------|-------|
| **1954** | Overseas Asset Custody Agreement signed (K-091 Min-a, K-102 Ru-a) |
| 1954–2000s | Enhanced Human generational research (1st Gen → 2nd Alpha → EH-Alpha) |
| **1989** | Shin Min-a and Lee Ru-a born. Fountain pen manufactured. |
| **2005** | Shin Min-a appointed NHDC analyst (age 16) |
| 2005–2025 | 20 years of internal activity under Δ0 surveillance |
| **2025** | National Audit Exposure — "Humans are a cost" |
| [REDACTED] | NHDC system failure |
| [REDACTED]+48h | Baseline 12% elevation — 450,000 reclassified |
| [REDACTED]+72h | Dr. Harlan node discard notice → precision strike |
| [REDACTED] | Sector Zero mainframe discovered and collapsed. Kang Tae-sik final logout. |

---

## ▌ Transition Period

| Period | Event |
|--------|-------|
| Post-NHDC | AK (Advanced Korea) regime established |
| **April 25, 2089** | AK Supreme Chairman assassinated + Shin Min-a dies (age 100) |
| 2089–2092 | **Second War** (3 years) |
| **2092** | War ends. Aiden's Ledger compiled. |
| 2095–2135 | Jayden Carter's Notebooks (22 vols, 4,200p) |
| **2100** | **Non-Intervention Declaration** issued (AK Chairman's Office) |

---

## ▌ Galactic Era

| Period | Event |
|--------|-------|
| 2100s– | Human space expansion. 6 galactic zones established. |
| [REDACTED] | SIB officially established |
| [REDACTED] | 97% Ignorance Maintenance Protocol activated |
| [REDACTED] | Eschaton Sector First Battle — Neka first contact |
| [REDACTED] | NOA #10005 (Neira) survival confirmed |
| [REDACTED] | RIDE sample first recovered and analyzed (Finis) |
| [REDACTED] | Carter's Record compiled |

---

## ▌ Present (7000s)

| Item | Status |
|------|--------|
| Non-Intervention Principle | Maintained for 5,000 years |
| 97% Ignorance | Maintained |
| Neka War | Ongoing within RED zone |
| HPP | Not activated (extinction prob. under 95%) |
| Planet destruction | In progress |
| System status | **Normal** |

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This timeline is a permanent preservation record│
│  Modification and destruction prohibited.        │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: SIB-REC-TIMELINE-001 | Permanent | Records Division*`,
    },
  },
  "rpt-nhdc-construction-audit": {
    title: { ko: "정기 건설 감사 보고서 #CONST-AUDIT-001", en: "Periodic Construction Audit Report #CONST-AUDIT-001" },
    level: "RESTRICTED",
    category: "REPORTS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  NHDC 시설관리국 — 건설감사반          █████  │
│  ██  정기 건설 감사 보고서                  █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 정기 건설 감사 보고서 #CONST-AUDIT-001
**작성:** NHDC 시설관리국 — 건설감사반
**문서 등급:** CLASSIFIED
**감사 대상:** 수용 시설 신규 증축동

---

## ▌ 감사 개요

| 항목 | 내용 |
|------|------|
| 감사 유형 | 정기 건설 감사 |
| 대상 시설 | 수용 시설 [REDACTED] — 신규 증축동 |
| 감사 기간 | [REDACTED] |
| 감사관 | [REDACTED] |

---

## ▌ 증축 사유

| 항목 | 내용 |
|------|------|
| 기존 시설 수용 인원 | [REDACTED] |
| 하한선 상향 이후 추가 수용 예정 인원 | 약 12만 명 |
| 증축 규모 | 4종 시설 3개 동 |
| 예산 | [REDACTED] Hart |

> *하한선이 올라갈 때마다, 수용 시설은 커진다.*
> *사람이 늘어서가 아니다.*
> *"쓰레기"가 늘어서다.*

---

## ▌ 시설 검수 결과

| 검수 항목 | 판정 | 비고 |
|----------|------|------|
| 구조 안전성 | ✅ 합격 | — |
| 격리동 기밀성 | ✅ 합격 | 4종 기준 충족 |
| 인식표 스캔 장비 | ✅ 합격 | 전 출입구 설치 |
| EH-알파 대기소 | ✅ 합격 | 약물 보관고 포함 |
| 배급 시설 | ⚠️ 미해당 | 4종 시설 — 배급 없음 |
| 처분 시설 | ✅ 합격 | 소각 용량 일일 [REDACTED]체 |
| 환기 시설 | ❌ 부적합 | 소각 시 연기 외부 유출 위험 |

---

## ▌ 부적합 사항

**환기 시설:**
소각 처리 시 발생하는 연기가 외부로 유출될 경우, 인근 3종 시설 수용 개체에게 불안 유발 가능.

**시정 권고:**
환기 필터 교체 및 밀폐 강화.
**사유:** 수용 개체의 불안은 순응도 하락을 초래하며, 순응도 하락은 등급 하향의 원인이 됨.

> *연기가 새는 것이 문제가 아니다.*
> *연기를 본 사람이 불안해하는 것이 문제다.*
> *불안은 비용이다.*

---

## ▌ 감사 결론

증축동 3개 동: **조건부 합격.**
환기 시설 시정 완료 시 최종 합격.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 건설감사반 내부 기록이다.         │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: CONST-AUDIT-001 | 분류: CLASSIFIED | 건설감사반*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  NHDC Facility Management — Audit Unit █████  │
│  ██  Periodic Construction Audit Report    █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Periodic Construction Audit Report #CONST-AUDIT-001
**Author: NHDC Facility Management Bureau — Construction Audit Unit**
**Classification: CLASSIFIED**
**Subject: Detention facility [REDACTED] — new extension wing**

---

## ▌ Audit Overview

| Item | Details |
|------|---------|
| Audit Type | Periodic construction audit |
| Target Facility | Detention facility [REDACTED] — new extension wing |
| Audit Period | [REDACTED] |
| Auditor | [REDACTED] |

---

## ▌ Expansion Rationale

| Item | Details |
|------|---------|
| Current facility capacity | [REDACTED] |
| Projected additional intake post-Baseline elevation | Approx. 120,000 |
| Expansion scale | 3 Type-4 facility blocks |
| Budget | [REDACTED] Hart |

> *Every time the Baseline rises, detention facilities grow.*
> *Not because there are more people.*
> *Because there is more "waste."*

---

## ▌ Facility Inspection Results

| Inspection Item | Result | Notes |
|----------------|--------|-------|
| Structural safety | ✅ Pass | — |
| Isolation block airtightness | ✅ Pass | Meets Type 4 standards |
| ID tag scan equipment | ✅ Pass | Installed at all entry points |
| EH-Alpha standby area | ✅ Pass | Includes drug storage vault |
| Ration facility | ⚠️ N/A | Type 4 — no rations |
| Disposal facility | ✅ Pass | Incineration capacity: [REDACTED] bodies/day |
| Ventilation | ❌ Non-compliant | Smoke leakage risk during incineration |

---

## ▌ Non-Compliance

**Ventilation:**
Smoke from incineration processing may leak externally, potentially causing anxiety among entities detained in adjacent Type 3 facilities.

**Corrective Recommendation:**
Replace ventilation filters and reinforce sealing.
**Rationale:** Entity anxiety leads to compliance score decline, which in turn causes grade demotion.

> *The problem is not that smoke leaks.*
> *The problem is that people who see smoke become anxious.*
> *Anxiety is a cost.*

---

## ▌ Audit Conclusion

3 extension blocks: **Conditional pass.**
Final pass upon completion of ventilation correction.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is an NHDC Construction Audit     │
│  Unit internal record.                           │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: CONST-AUDIT-001 | Classification: CLASSIFIED | Construction Audit Unit*`,
    },
  },
  "rpt-sewer-escape-blueprint": {
    title: { ko: "하수도 탈출 경로 설계 기록", en: "Sewer Escape Route Design Record" },
    level: "CLASSIFIED",
    category: "REPORTS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  [복원 문서] — 원본 출처 불명          █████  │
│  ██  하수도 탈출 경로 설계 기록             █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 하수도 탈출 경로 설계 기록
**원본 작성자:** 신민아 (추정)
**문서 상태:** NHDC 붕괴 현장에서 복원된 단편
**복원 부서:** 비밀조사국 기록관리과

---

## ▌ 발견 경위

NHDC 물리적 파괴 후, 잔해에서 수거된 갱지 조각.
필체 분석 결과: 신민아(#MA-1989-001)의 것과 95% 일치.

---

## ▌ 내용 (복원 가능 부분)

\`\`\`
진입점: 수용 시설 [REDACTED] 2종 구역 → B2 배수관
    ↓
하수 본관: 직경 1.8m — 성인 1명 보행 가능
    ↓
분기점 A: 좌측 → 3종 구역 (위험 — 감시 밀도 높음)
           우측 → 외부 배수로 (선택)
    ↓
외부 배수로: 1.2km 직선
    ↓
출구: 한강 하류 [REDACTED] 지점
\`\`\`

---

## ▌ 설계 특이사항

1. 경로는 NHDC 인식표 스캔 범위를 **정확히 회피**하도록 설계됨
2. 감시 카메라 사각지대를 활용한 경로
3. 예상 소요 시간: 47분
4. 탈출 시 확보 가능한 EH: 약 **45,000 Hart** (경로 상 비상 보급고)

---

## ▌ 실행 결과

Δ0 부대 작전 기록에 의하면:

> **작전명: 하수도 차단**
> **대상: 신민아 탈출 경로**
> **결과: 탈출 성공 (부대 실패)**

신민아는 이 경로를 통해 NHDC를 이탈함.

---

## ▌ 기록관리과 소견

> *"이 설계도는 20년간의 관찰로 만들어졌다.*
> *시스템 안에서 시스템의 빈틈을 찾은 것이다.*
> *시뮬레이션 능력이 아니었다면 불가능했을 것이다.*
> *그러나 시뮬레이션보다 중요한 것은*
> *20년을 버텼다는 사실이다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 복원 기록이다. 원본은 소실.            │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: REC-RESTORE-SEWER-001 | 복원 | 기록관리과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  [Restored Document] — Origin unknown  █████  │
│  ██  Sewer Escape Route Design Record      █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Sewer Escape Route Design Record
**Original Author: Shin Min-a (estimated)**
**Document Status: Fragment restored from NHDC collapse debris**
**Restoration: SIB Records Management Division**

---

## ▌ Discovery

Mimeograph paper fragments recovered from debris after NHDC physical destruction.
Handwriting analysis: 95% match with Shin Min-a (#MA-1989-001).

---

## ▌ Content (Recoverable Portion)

\`\`\`
Entry point: Detention facility [REDACTED] Type 2 zone → B2 drain pipe
    ↓
Main sewer: 1.8m diameter — passable by 1 adult on foot
    ↓
Junction A: Left → Type 3 zone (hazardous — high surveillance density)
             Right → External drainage channel (selected)
    ↓
External drainage: 1.2km straight line
    ↓
Exit: Han River downstream [REDACTED] point
\`\`\`

---

## ▌ Design Notes

1. Route designed to **precisely evade** NHDC ID tag scan range
2. Utilizes security camera blind spots
3. Estimated transit time: 47 minutes
4. EH recoverable during escape: Approx. **45,000 Hart** (emergency cache along route)

---

## ▌ Execution Result

Per Δ0 Unit operations log:

> **Operation: Sewer Lockdown**
> **Target: Shin Min-a escape route**
> **Result: Escape SUCCESSFUL (unit failure)**

Shin Min-a defected from NHDC via this route.

---

## ▌ Records Division Assessment

> *"This blueprint was built from 20 years of observation.*
> *She found the gaps in the system from inside the system.*
> *Without her simulation ability, it would have been impossible.*
> *But more important than simulation*
> *is the fact that she endured for 20 years."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is a restored record.             │
│  Original is lost.                               │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: REC-RESTORE-SEWER-001 | Restored | Records Division*`,
    },
  },
  "rpt-subprime-human-usa": {
    title: { ko: "Subprime Human: Project USA — 프로젝트 서문", en: "Subprime Human: Project USA — Preamble" },
    level: "TOP_SECRET",
    category: "CLASSIFIED",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  TOP SECRET — US STRATEGIC COMMAND      ████  │
│  ██  Subprime Human: Project USA           ████  │
│  ██  프로젝트 서문                          ████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Subprime Human: Project USA — 프로젝트 서문
**작성:** Dr. Harlan
**문서 등급:** TOP SECRET
**상태:** 개봉 직후 — 초안

---

## ▌ 배경

Korea Node가 삭제되었다.

\`\`\`
[South Korea Node: Deleted]
\`\`\`

실패 원인 분석:
1. 인간성의 완전 회수 실패
2. 내부 침투자(신민아) 감지 실패
3. 시스템 전제 노출 → 전산 마비 → 노드 기능 정지
4. 생체 서버 회수 실패 → 물리적 포맷 실시

---

## ▌ Korea Node 실패에서 얻은 교훈

| 실패 요인 | 개선 방향 |
|----------|----------|
| 인간성 잔존 | **인간성 제거 기술 고도화 (EH-오메가 참조)** |
| 내부 침투 | **측정 불능 개체 완전 격리 + 사전 제거** |
| 시스템 전제 노출 | **이중 격벽 정보 통제** |
| 생체 서버 단일 코어 | **다중 코어 분산 배치** |

---

## ▌ Project USA 기본 설계

| 항목 | Korea Node | Project USA |
|------|-----------|-------------|
| 노드 위치 | 대한민국 (단일) | 미국 (다중 거점) |
| 코어 구성 | 단일 메인프레임 | **분산 메인프레임** (3개+) |
| 인간성 관리 | 약물 (안식) | **물리적 제거 (오메가)** |
| 침투 방지 | Δ0 감시 | **사전 유전자 스크리닝 + 자동 제거** |
| 정보 통제 | 단일 격벽 | **이중 격벽 + 미디어 통합** |

---

## ▌ 할란 박사 소견

> *"한국 노드는 실험이었다.*
> *좋은 실험이었다.*
> *실패한 실험도 데이터를 남긴다.*
> *다음에는 실수하지 않겠다.*
>
> *인간성을 회수하지 못했다고 했다.*
> *이번에는 회수할 것이 없게 만들겠다."*

---

## ▌ 프로젝트 일정

| 단계 | 내용 | 상태 |
|------|------|------|
| Phase 1 | 기존 노드 데이터 분석 | 진행 중 |
| Phase 2 | 시설 설계 | 대기 |
| Phase 3 | 소체 수급 경로 확보 | 대기 |
| Phase 4 | 운영 개시 | 대기 |

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 US Strategic Command 최고 기밀이다.    │
│  Korea Node의 교훈을 미국 땅에 적용한다.          │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: PA-USA-001 | 분류: TOP SECRET | Dr. Harlan*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  TOP SECRET — US STRATEGIC COMMAND      ████  │
│  ██  Subprime Human: Project USA           ████  │
│  ██  Project Preamble                      ████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Subprime Human: Project USA — Preamble
**Author: Dr. Harlan**
**Classification: TOP SECRET**
**Status: Newly opened — Draft**

---

## ▌ Background

The Korea Node has been deleted.

\`\`\`
[South Korea Node: Deleted]
\`\`\`

Failure analysis:
1. Failed to fully recover humanity
2. Failed to detect internal infiltrator (Shin Min-a)
3. System premise exposed → system failure → node shutdown
4. Bio-server recovery failed → physical format executed

---

## ▌ Lessons from Korea Node Failure

| Failure Factor | Improvement Direction |
|---------------|---------------------|
| Residual humanity | **Advanced humanity removal tech (ref. EH-Omega)** |
| Internal infiltration | **Complete isolation + preemptive elimination of unmeasurable entities** |
| System premise exposure | **Dual-barrier information control** |
| Single-core bio-server | **Multi-core distributed deployment** |

---

## ▌ Project USA Basic Design

| Item | Korea Node | Project USA |
|------|-----------|-------------|
| Node Location | South Korea (single) | United States (multiple sites) |
| Core Configuration | Single mainframe | **Distributed mainframe** (3+) |
| Humanity Management | Drug (Ansik) | **Physical removal (Omega)** |
| Infiltration Prevention | Δ0 surveillance | **Preemptive genetic screening + auto-elimination** |
| Info Control | Single barrier | **Dual barrier + media integration** |

---

## ▌ Dr. Harlan's Assessment

> *"The Korea Node was an experiment.*
> *A good experiment.*
> *Even failed experiments leave data.*
> *We will not make the same mistake.*
>
> *They said we couldn't recover the humanity.*
> *This time, we'll make sure there's nothing to recover."*

---

## ▌ Project Timeline

| Phase | Description | Status |
|-------|-----------|--------|
| Phase 1 | Existing node data analysis | In progress |
| Phase 2 | Facility design | Pending |
| Phase 3 | Host material supply route establishment | Pending |
| Phase 4 | Operations commence | Pending |

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is US Strategic Command top       │
│  secret. Applying the lessons of the Korea       │
│  Node to American soil.                          │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: PA-USA-001 | Classification: TOP SECRET | Dr. Harlan*`,
    },
  },
  "rpt-records-outlive-people": {
    title: { ko: "최종 부록 — \"기록은 사람보다 오래 산다\"", en: "Final Appendix — \"Records Outlive People\"" },
    level: "PUBLIC",
    category: "CORE",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  카터스 레코드 — 최종 부록                         │
│  "기록은 사람보다 오래 산다"                        │
│  은하 표준 아카이브                                │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 최종 부록 — "기록은 사람보다 오래 산다"
**출처:** 카터스 레코드
**시점:** 7000년대
**열람:** 은하 전역

---

## ▌ 본문

1989년에 만년필 한 자루가 만들어졌다.
그것으로 한 여자가 무언가를 썼다.

2092년에 한 사람이 전쟁이 끝난 뒤 장부를 썼다.

2095년부터 2135년까지, 한 사람이 22권의 수첩에 세상을 적었다.

7,000년이 지났다.

만년필의 잉크는 말랐다.
장부의 주인은 죽었다.
수첩의 저자도 죽었다.

그러나 기록은 여기 있다.
당신이 읽고 있다.

---

## ▌ 이 아카이브에 담긴 것

| 분류 | 내용 |
|------|------|
| 지구 시대 | 인간이 인간을 자산으로 분류한 역사 |
| NHDC | "인간은 비용이다"라는 전제를 설계한 시스템 |
| 전쟁 | 인류가 인류와 싸운 기록 |
| 비개입 | 모든 것이 정상이었는데 행성이 사라지는 역설 |
| 기록 | 한 사람이 남긴 것이 문명이 된 이야기 |

---

## ▌ 마지막 문장

> *기록은 사람보다 오래 산다.*
>
> *그러므로 기록하라.*
> *당신이 본 것을.*
> *당신이 느낀 것을.*
> *당신이 있었다는 것을.*
>
> *7,000년 뒤 누군가 읽을 것이다.*
> *아닐 수도 있다.*
> *그래도 기록하라.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  카터스 레코드.                                    │
│  파기 불가. 수정 불가. 검열 불가.                  │
│  기록은 기록이다.                                  │
└──────────────────────────────────────────────────┘
\`\`\`

*카터스 레코드 최종 부록 | 은하 표준 아카이브 | 7000년대*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  Carter's Record — Final Appendix                │
│  "Records Outlive People"                        │
│  Galaxy Standard Archive                         │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Final Appendix — "Records Outlive People"
**Source: Carter's Record**
**Era: 7000s**
**Access: Galaxy-wide**

---

## ▌ Text

In 1989, a fountain pen was manufactured.
A woman wrote something with it.

In 2092, someone wrote a ledger after a war ended.

From 2095 to 2135, someone wrote the world into 22 notebooks.

Seven thousand years have passed.

The fountain pen's ink has dried.
The ledger's owner is dead.
The notebooks' author is dead.

But the records are here.
You are reading them.

---

## ▌ What This Archive Contains

| Category | Content |
|----------|---------|
| Earth Era | The history of humans classifying humans as assets |
| NHDC | A system designed on the premise that "humans are a cost" |
| War | Records of humanity fighting humanity |
| Non-Intervention | The paradox where everything was normal yet planets disappeared |
| Records | The story of how one person's words became a civilization |

---

## ▌ Final Line

> *Records outlive people.*
>
> *Therefore, record.*
> *What you saw.*
> *What you felt.*
> *That you existed.*
>
> *Someone 7,000 years from now may read it.*
> *Or they may not.*
> *Record anyway.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  Carter's Record.                                │
│  Cannot be destroyed. Cannot be modified.        │
│  Cannot be censored.                             │
│  A record is a record.                           │
└──────────────────────────────────────────────────┘
\`\`\`

*Carter's Record Final Appendix | Galaxy Standard Archive | 7000s*`,
    },
  },
  "rpt-baseline-calculation": {
    title: { ko: "하한선(Baseline) 계산 공식 — 유출본", en: "Baseline Calculation Formula — Leaked Document" },
    level: "CLASSIFIED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  [유출 문서] — 아카이브 복원본         █████  │
│  ██  하한선(Baseline) 계산 공식             █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 하한선(Baseline) 계산 공식 — 유출본
**원본 출처:** NHDC 아카이브 (물리적 파괴 시 수거)
**문서 상태:** 복구 불가능 상태에서 부분 복원
**복원:** 비밀조사국 기록관리과

---

## ▌ 공식

\`\`\`
V = (P × S − M) / C
\`\`\`

| 변수 | 정의 | 비고 |
|------|------|------|
| **V** | 개체의 최종 자산 가치 | 이 숫자가 개체의 운명을 결정 |
| **P** | 생산성 점수 | 연간 노동 산출량 기반 |
| **S** | 예상 생존 수명 | 의료 데이터 기반 추정 |
| **M** | 유지 비용 | 식량, 의료, 주거, 관리 비용 합산 |
| **C** | 시스템 순응도 점수 | 규정 위반 이력 역산 (높을수록 순응) |

---

## ▌ 판정 기준

\`\`\`
V ≥ 1.0  →  자산 유지 (등급 부여)
V < 1.0  →  즉시 [측정 불능] 분류 → 처분 절차 진입
\`\`\`

---

## ▌ 공식의 의미

이 공식은 NHDC가 인간을 자산으로 변환하는 **불변의 논리**이다.

**V ≥ 1.0일 때:**
개체가 소비하는 비용보다 생산하는 가치가 크다.
→ 시스템에 유지할 가치가 있다.
→ 등급을 부여하고, 배급하고, 관리한다.

**V < 1.0일 때:**
개체가 생산하는 가치보다 소비하는 비용이 크다.
→ 유지할 가치가 없다.
→ 인식표 붉은색 점멸.
→ 행정적 살처분 대상.

---

## ▌ 하한선 상향의 수학적 의미

하한선이 12% 상향된다는 것은:
이 공식의 **M(유지 비용)이 12% 증가**한 것과 같은 효과.

\`\`\`
기존: V = (P × S − M) / C ≥ 1.0  →  자산
상향: V = (P × S − M×1.12) / C < 1.0  →  측정 불능
\`\`\`

어제까지 V = 1.03이던 사람이, 오늘 V = 0.91이 된다.
어제까지 배급을 받던 사람이, 오늘 "쓰레기"가 된다.

> *45만 명의 V가 1.0 아래로 떨어졌다.*
> *수학적으로.*
> *합법적으로.*
> *정상적으로.*

---

## ▌ 기록관리과 소견

> *"이 공식에는 악의가 없다.*
> *숫자에는 감정이 없다.*
> *그래서 더 무섭다.*
>
> *이 공식이 45만 명을 죽였다.*
> *공식 자체는 오류 없이 작동했다.*
> *오류는 공식 바깥에 있었다.*
> *공식이 인간을 계산한다는 것 자체가 오류였다."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 복구 불가능 상태에서 부분 복원됨.       │
│  [열람 기록을 삭제합니다. 로그아웃 중...]          │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: NHDC-ARCHIVE-FORMULA-001 | 유출본 복원 | 기록관리과*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  [Leaked Document] — Archive Restored  █████  │
│  ██  Baseline Calculation Formula          █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Baseline Calculation Formula — Leaked Document
**Original Source: NHDC Archive (recovered during physical destruction)**
**Document Status: Partially restored from unrecoverable state**
**Restoration: SIB Records Management Division**

---

## ▌ Formula

\`\`\`
V = (P × S − M) / C
\`\`\`

| Variable | Definition | Notes |
|----------|-----------|-------|
| **V** | Entity's final asset value | This number determines the entity's fate |
| **P** | Productivity score | Based on annual labor output |
| **S** | Expected survival lifespan | Estimated from medical data |
| **M** | Maintenance cost | Sum of food, medical, housing, and management costs |
| **C** | System compliance score | Inverse calculation of regulation violations (higher = more compliant) |

---

## ▌ Determination Criteria

\`\`\`
V ≥ 1.0  →  Asset retained (grade assigned)
V < 1.0  →  Immediate [Unmeasurable] classification → Disposal procedure initiated
\`\`\`

---

## ▌ What the Formula Means

This formula is the **immutable logic** by which NHDC converts humans into assets.

**When V ≥ 1.0:**
The entity produces more value than it consumes in cost.
→ Worth maintaining in the system.
→ Grade assigned. Rations distributed. Managed.

**When V < 1.0:**
The entity consumes more than it produces.
→ Not worth maintaining.
→ ID tag begins red flashing.
→ Subject to administrative culling.

---

## ▌ The Mathematics of Baseline Elevation

A 12% Baseline elevation effectively means:
**M (maintenance cost) increases by 12%** in the formula.

\`\`\`
Before: V = (P × S − M) / C ≥ 1.0      → Asset
After:  V = (P × S − M×1.12) / C < 1.0  → Unmeasurable
\`\`\`

A person who was V = 1.03 yesterday becomes V = 0.91 today.
A person who received rations yesterday becomes "waste" today.

> *The V of 450,000 people fell below 1.0.*
> *Mathematically.*
> *Legally.*
> *Normally.*

---

## ▌ Records Division Assessment

> *"There is no malice in this formula.*
> *Numbers have no emotions.*
> *That is what makes it terrifying.*
>
> *This formula killed 450,000 people.*
> *The formula itself operated without error.*
> *The error was outside the formula.*
> *The error was that a formula was calculating humans at all."*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was partially restored from an    │
│  unrecoverable state.                            │
│  [Deleting access logs. Logging out...]          │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: NHDC-ARCHIVE-FORMULA-001 | Leaked Restoration | Records Division*`,
    },
  },
  "rpt-construction-aggregate": {
    title: { ko: "제XX구역 간선도로 포장 공사 사후 감사 결과", en: "Sector XX Arterial Road Paving — Post-Construction Audit" },
    level: "RESTRICTED",
    category: "REPORTS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  NHDC 현장 감찰팀                      █████  │
│  ██  건설 공정 사후 감사 결과               █████  │
│  ██  문서번호: 1974-건설-공정-402           █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 제XX구역 간선도로 포장 공사 사후 감사 결과
**문서번호:** 1974-건설-공정-402
**수신:** 경제개발위원회 비서실
**발신:** NHDC 현장 감찰팀

---

## ▌ 1. 공정 개요

본 공사는 1970년 05월 12일 02:00시 기점으로 타설 완료됨.

---

## ▌ 2. 특이 사항 (현장 누설 데이터)

타설 과정 중 인부 3명의 **'위치 데이터'**가 손실됨.

현장 소장에 따르면 해당 인원들은 혼합기 내부로 유입된 것으로 추정됨.

즉각적인 중단 및 적출 권고가 있었으나, 시스템은 **[공기 지연으로 인한 국가적 손실]**이 **[개체 3명의 잔존 가치]**보다 크다고 판단함.

---

## ▌ 3. 조치 결과

인부 3명을 **'골재 보강재'**로 재분류하여 타설 강행.

장부상 투입 자재량을 **[골재: 정상 / 부품: 결손]**이 아닌 **[혼합물: 규격 합격]**으로 소급 적용하여 종결 처리함.

---

## ▌ 비고

해당 구간은 타 구간 대비 인장 강도가 **0.8% 높게** 측정됨.

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 아카이브 물리적 파괴 시 수거됨.   │
│  열람 시 [등급 외 자산]으로 즉시 분류될 수 있음.  │
└──────────────────────────────────────────────────┘
\`\`\`

*문서번호: 1974-건설-공정-402 | NHDC 현장 감찰팀*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  NHDC Field Inspection Team            █████  │
│  ██  Post-Construction Audit Results       █████  │
│  ██  Doc No: 1974-CONST-PROC-402           █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Sector XX Arterial Road Paving — Post-Construction Audit
**Document No:** 1974-CONST-PROC-402
**To:** Economic Development Committee Secretariat
**From:** NHDC Field Inspection Team

---

## ▌ 1. Construction Overview

Pouring was completed on May 12, 1970, at 02:00.

---

## ▌ 2. Anomalies (Field Leaked Data)

During the pouring process, the **'location data'** of 3 laborers was lost.

According to the site foreman, the individuals are estimated to have entered the interior of the mixing unit.

An immediate halt and extraction was recommended, but the system determined that **[national losses due to construction delay]** exceeded **[residual value of 3 entities]**.

---

## ▌ 3. Action Taken

The 3 laborers were reclassified as **'aggregate reinforcement material'** and pouring continued.

Ledger input materials were retroactively reclassified from **[Aggregate: Normal / Components: Deficit]** to **[Compound: Specification Passed]** and the case was closed.

---

## ▌ Notes

The section in question measured **0.8% higher** in tensile strength compared to other sections.

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was recovered during the physical │
│  destruction of the NHDC archive.                │
│  Viewing may result in immediate classification  │
│  as a grade-external asset.                      │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: 1974-CONST-PROC-402 | NHDC Field Inspection Team*`,
    },
  },
  "rpt-eyeglass-collection": {
    title: { ko: "시스템 노이즈 발생에 따른 일시적 수거 지침 (긴급)", en: "Emergency Collection Directive Due to System Noise" },
    level: "CLASSIFIED",
    category: "REPORTS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  [긴급] NHDC 중앙 통제실               █████  │
│  ██  시스템 노이즈 발생 — 일시적 수거 지침  █████  │
│  ██  문서번호: 2025-긴급-수거-ALPHA         █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 시스템 노이즈 발생에 따른 일시적 수거 지침 (긴급)
**문서번호:** 2025-긴급-수거-ALPHA
**수신:** 전국 수거 요원 (박 대리 외 452명)
**발신:** NHDC 중앙 통제실

---

## ▌ [주의: 시스템 동기화 오류 발생]

현재 외부 개체(김민아)의 역류 코드로 인해 '정상 부품' 식별 회로가 일시 마비됨.

시스템은 데이터 무결성을 위해 **[가시적 식별 도구 착용자]**를 '오염된 노이즈'로 일괄 규정함.

---

## ▌ 1. 수거 대상 선정 기준 (임시)

**시력 보정용 안경(뿔테, 금속테 포함) 착용자 전원.**

해당 장비는 시스템의 안면 인식 로직에 '디지털 노이즈'를 유발하는 것으로 간주함.

---

## ▌ 2. 현장 집행 가이드

요원 본인이 안경 착용자일 경우, **즉시 파기 후 집행할 것.**

대상자의 항변(시력 확보 불가 등)은 **[논리적 오류 메시지]**로 취급하여 무시함.

---

## ▌ 처분

수거 즉시 소각장 인계.
**'데이터 세정'** 후 자산 반납할 것.

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 긴급 지침이다.                    │
│  시스템 정상화 후 자동 파기 대상.                  │
└──────────────────────────────────────────────────┘
\`\`\`

*문서번호: 2025-긴급-수거-ALPHA | NHDC 중앙 통제실*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  [URGENT] NHDC Central Control         █████  │
│  ██  System Noise — Emergency Collection   █████  │
│  ██  Doc No: 2025-EMRG-COLLECT-ALPHA       █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Emergency Collection Directive Due to System Noise
**Document No:** 2025-EMRG-COLLECT-ALPHA
**To:** All nationwide collection agents (Agent Park + 452 others)
**From:** NHDC Central Control Room

---

## ▌ [ALERT: System Synchronization Error Detected]

Due to backflow code from external entity (Kim Min-a), the 'normal component' identification circuit is temporarily paralyzed.

To maintain data integrity, the system has blanket-designated all **[visible identification device wearers]** as 'contaminated noise.'

---

## ▌ 1. Collection Target Criteria (Temporary)

**All wearers of vision-correcting eyeglasses (including horn-rimmed and metal-framed).**

Said equipment is deemed to cause 'digital noise' in the system's facial recognition logic.

---

## ▌ 2. Field Enforcement Guide

If the agent themselves wears eyeglasses, **destroy them immediately before proceeding with enforcement.**

Protests from targets (e.g., "I cannot see without them") are to be treated as **[logical error messages]** and ignored.

---

## ▌ Disposal

Upon collection, immediately transfer to incineration facility.
After **'data cleansing,'** return assets.

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is an NHDC emergency directive.   │
│  Subject to automatic destruction upon system    │
│  normalization.                                  │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: 2025-EMRG-COLLECT-ALPHA | NHDC Central Control Room*`,
    },
  },
  "rpt-nob-citizen-grade": {
    title: { ko: "NOB 시민 등급 분류 지침", en: "NOB Citizen Grade Classification Directive" },
    level: "RESTRICTED",
    category: "CORE",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  NOB 행정 시스템                       █████  │
│  ██  시민 등급 분류 지침                    █████  │
│  ██  "분류된 인간, 버려진 노이즈"           █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# NOB 시민 등급 분류 지침
**발행:** NOB 행정 시스템
**적용:** NOB 전 시민 (출생 시 자동 부여)
**기준:** 생존 지수 (Survival Index)

---

## ▌ 등급 체계

모든 시민은 출생 시 **생존 지수**에 따라 등급을 부여받는다.

| 등급 | 명칭 | 정의 | 처우 |
|------|------|------|------|
| **프라임 (Prime)** | 핵심 자산 | 시스템 유지에 필수적인 고위 행정직 및 기술자 | 최우선 자원 배분 |
| **워커 (Worker)** | 노동 계층 | 도시를 지탱하는 노동력 | 기본 배급 |
| **잔여물 (Residual)** | 폐기 대상 | 지수가 낮아 시스템의 혜택을 받을 가치가 없다고 판단된 자들 | 배급 없음 |

---

## ▌ 생존 지수

생존 지수는 출생 시 유전 데이터, 신체 조건, 부모 등급을 기반으로 자동 산출된다.

> 선택의 여지가 없다.
> 태어나는 순간 결정된다.

---

## ▌ 잔여물 (Residual) 처리

잔여물로 분류된 시민은:

1. 시스템 혜택 대상에서 제외
2. 인식표에 **[폐기 권고]** 표시
3. 시스템의 눈에 **노이즈(Noise)**로 취급

> *분류된 인간.*
> *버려진 노이즈.*
> *시스템이 보지 않기로 한 사람들.*

---

## ▌ 구역 폐쇄 명령 (2세대 지도부)

생존 지수가 낮은 구역에 대한 처리:

> "12구역? 거긴 이미 효율성이 15% 이하로 떨어진 곳이잖아.
> 약품을 보내는 건 자원 낭비야.
> 차단막을 올리고 구역 전체를 '잠정 폐쇄'해.
> 시스템에 보고할 때는 **'환경 정화 중'**이라고 기록하고."
>
> — 앙드레 (2세대 지도자)

---

## ▌ NHDC와의 비교

| 항목 | NHDC (한국) | NOB |
|------|-----------|-----|
| 등급 기준 | 생산성·순응도·유전자 | 생존 지수 (출생 시 고정) |
| 최하위 | 측정 불능 | 잔여물 (Residual) |
| 표시 | 인식표 붉은색 점멸 | [폐기 권고] |
| 포장 | "행정적 살처분" | "환경 정화 중" |
| 본질 | 동일 | 동일 |

> *이름만 다르다.*
> *시스템이 인간을 분류하고, 분류 바깥의 인간을 버리는 구조는 동일하다.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NOB 행정 시스템 아카이브에서 복원됨.   │
└──────────────────────────────────────────────────┘
\`\`\`

*문서 번호: NOB-GRADE-001 | NOB 행정 시스템*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  NOB Administrative System             █████  │
│  ██  Citizen Grade Classification          █████  │
│  ██  "Classified Humans, Discarded Noise"  █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# NOB Citizen Grade Classification Directive
**Issued: NOB Administrative System**
**Scope: All NOB citizens (assigned automatically at birth)**
**Basis: Survival Index**

---

## ▌ Grade Structure

All citizens are assigned a grade at birth based on their **Survival Index**.

| Grade | Designation | Definition | Treatment |
|-------|-----------|-----------|----------|
| **Prime** | Core Asset | Senior administrators and technicians essential for system maintenance | Priority resource allocation |
| **Worker** | Labor Class | The labor force that sustains the city | Basic rations |
| **Residual** | Disposal Target | Those whose index is too low to merit system benefits | No rations |

---

## ▌ Survival Index

The Survival Index is automatically calculated at birth based on genetic data, physical condition, and parental grade.

> There is no choice.
> It is decided the moment you are born.

---

## ▌ Residual Processing

Citizens classified as Residual:

1. Excluded from system benefits
2. ID tagged with **[Disposal Recommended]**
3. Treated as **Noise** in the system's eyes

> *Classified humans.*
> *Discarded noise.*
> *People the system chose not to see.*

---

## ▌ District Closure Order (2nd Generation Leadership)

Processing of districts with low Survival Index:

> "District 12? That place has already dropped below 15% efficiency.
> Sending medicine is a waste of resources.
> Raise the barriers and put the entire district under 'provisional closure.'
> When reporting to the system, record it as **'environmental purification in progress.'**"
>
> — Andre (2nd Generation Leader)

---

## ▌ Comparison with NHDC

| Item | NHDC (Korea) | NOB |
|------|-------------|-----|
| Grade Basis | Productivity, compliance, genetics | Survival Index (fixed at birth) |
| Lowest Tier | Unmeasurable | Residual |
| Designation | ID tag red flash | [Disposal Recommended] |
| Euphemism | "Administrative culling" | "Environmental purification" |
| Essence | Identical | Identical |

> *Only the names differ.*
> *The structure — a system that classifies humans and discards those outside the classification — is identical.*

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was restored from the NOB         │
│  administrative system archive.                  │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: NOB-GRADE-001 | NOB Administrative System*`,
    },
  },
  "rpt-sleep-inducer-report": {
    title: { ko: "특정 구역 거주자 대상 고농도 수면 유도제 배포 결과 보고서", en: "Report on High-Concentration Sleep Inducer Distribution to Designated Zone Residents" },
    level: "CLASSIFIED",
    category: "REPORTS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  NHDC 공정관리부                        █████  │
│  ██  특정 구역 수면 유도제 배포 결과 보고서  █████  │
│  ██  문서번호: 공정 88-04                    █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 특정 구역 거주자 대상 고농도 수면 유도제 배포 결과 보고서
**문서번호:** 공정 88-04
**발행:** NHDC 공정관리부
**수신:** 중앙 행정위원회
**보안등급:** 2급 기밀

---

## ▌ 1. 사업 개요

| 항목 | 내용 |
|------|------|
| 사업명 | 특정 구역 환경 안정화 프로그램 (코드명: CALM-88) |
| 대상 구역 | 3구역, 7구역, 12구역 (노동 밀집 지역) |
| 대상 인원 | 약 42,000명 |
| 실시 기간 | 1988년 3월 ~ 1988년 11월 (8개월) |
| 투입 물질 | 고농도 수면 유도제 (화학식 비공개, 코드: SLP-04) |
| 투여 방식 | 상수도 혼입 + 공조 시스템 에어로졸 분사 |

---

## ▌ 2. 실시 배경

1987년 4분기, 해당 구역에서 **야간 불법 집회** 및 **비인가 결사** 활동이 급증.
시스템 분석 결과, 원인은 야간 각성 시간의 증가에 따른 **비생산적 사유 활동 확대**로 추정됨.

> 공정관리부 판단:
> "야간 각성 시간을 물리적으로 차단하면, 결사의 물리적 조건 자체가 소멸한다."

---

## ▌ 3. 투여 방법

### 3-1. 상수도 혼입
- SLP-04를 3개 구역 급수탑에 1일 2회(06:00, 18:00) 정량 투입
- 농도: 0.8mg/L (1차) → 1.2mg/L (2차, 5월 이후 상향)

### 3-2. 공조 시스템 에어로졸
- 노동자 밀집 주거동 공조기에 SLP-04 기화 장치 설치
- 22:00~04:00 자동 분사 (6시간 연속)

### 3-3. 위장
- 상수도: "정수 처리제 교체"로 공고
- 공조: "냉난방 효율 개선 공사"로 위장

---

## ▌ 4. 결과 분석

| 지표 | 실시 전 (87.Q4) | 실시 후 (88.Q3) | 변화율 |
|------|-----------------|-----------------|--------|
| 야간 집회 건수 | 47건/월 | 3건/월 | **-93.6%** |
| 평균 수면 시간 | 5.2시간 | 9.8시간 | **+88.5%** |
| 노동 생산성 | 100% (기준) | 78% | **-22.0%** |
| 의료 신고 건수 | 12건/월 | 189건/월 | **+1,475%** |
| 주요 증상 | — | 만성 두통, 기억력 감퇴, 무기력증 | — |

---

## ▌ 5. 부작용 보고

### 5-1. 예상 범위 내
- 주간 졸음 호소 (대상 인원의 67%)
- 만성 두통 (대상 인원의 41%)

### 5-2. 예상 범위 초과
- **기억력 감퇴**: 3개월 이상 노출자 중 23%에서 단기 기억 손상
- **자발적 의지 저하**: 대상자들의 자발적 행동(민원 제기, 이직 시도 등)이 **82% 감소**
- **영구 수면 장애**: 투여 중단 후에도 정상 수면 패턴 미회복 (12구역 표본 기준)

> *사람들은 자신이 왜 그토록 무기력했는지 몰랐다.*
> *왜 특정한 날이면 이유 없는 두통에 시달렸는지.*
> *행정 기록만이 그 이유를 알고 있었다.*

---

## ▌ 6. 비용 대비 효과 평가

| 항목 | 금액 |
|------|------|
| SLP-04 제조 비용 | 2억 4천만 원 |
| 설비 설치 비용 | 1억 1천만 원 |
| 위장 공사 비용 | 3천만 원 |
| **총 비용** | **3억 8천만 원** |
| 치안 유지비 절감 (추정) | 12억 원/연 |

> 공정관리부 결론:
> **투자 대비 효과 — 우수.**
> 단, 노동 생산성 22% 하락은 다음 분기 조정 과제로 이관.

---

## ▌ 7. 후속 조치 권고

1. SLP-04 농도를 0.6mg/L로 하향 → 생산성 저하 최소화
2. 투여 대상을 **야간 각성 빈도 상위 20%**로 축소 → 정밀 타겟팅
3. 부작용 민원은 **[환경성 계절 증후군]**으로 진단서 일괄 발행
4. 본 보고서는 **판도라의 장부** 유출 위험 대상 → 아카이브 격리 보관

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 지하 아카이브에서 복원됨.         │
│  판도라의 장부 유출 당시 시민 단말기에 송출된       │
│  기록 중 하나.                                    │
└──────────────────────────────────────────────────┘
\`\`\`

*문서번호: 공정 88-04 | NHDC 공정관리부*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  NHDC Process Control Division           █████  │
│  ██  Designated Zone Sleep Inducer           █████  │
│  ██  Distribution Results Report             █████  │
│  ██  Doc No: Process 88-04                   █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Report on High-Concentration Sleep Inducer Distribution to Designated Zone Residents
**Document No:** Process 88-04
**Issued by:** NHDC Process Control Division
**To:** Central Administrative Committee
**Classification:** Level 2 Confidential

---

## ▌ 1. Project Overview

| Item | Details |
|------|---------|
| Project Name | Designated Zone Environmental Stabilization Program (Codename: CALM-88) |
| Target Zones | Zone 3, Zone 7, Zone 12 (labor-dense districts) |
| Target Population | Approx. 42,000 |
| Duration | March 1988 – November 1988 (8 months) |
| Agent Used | High-concentration sleep inducer (formula classified, code: SLP-04) |
| Delivery Method | Water supply contamination + HVAC aerosol dispersal |

---

## ▌ 2. Background

In Q4 1987, the designated zones saw a sharp increase in **unauthorized nighttime assemblies** and **unlicensed association** activity.
System analysis attributed the cause to **expansion of non-productive cognitive activity** resulting from increased nighttime waking hours.

> Process Control Division assessment:
> "If nighttime waking hours are physically eliminated, the physical conditions for association themselves cease to exist."

---

## ▌ 3. Delivery Methods

### 3-1. Water Supply Contamination
- SLP-04 injected into 3-zone water towers twice daily (06:00, 18:00)
- Concentration: 0.8mg/L (Phase 1) → 1.2mg/L (Phase 2, increased from May)

### 3-2. HVAC Aerosol Dispersal
- SLP-04 vaporization units installed in HVAC systems of worker-dense residential blocks
- Automatic dispersal 22:00–04:00 (6-hour continuous cycle)

### 3-3. Cover Operations
- Water supply: Announced as "water treatment agent replacement"
- HVAC: Disguised as "heating/cooling efficiency improvement work"

---

## ▌ 4. Results Analysis

| Metric | Pre-Implementation (87.Q4) | Post-Implementation (88.Q3) | Change |
|--------|---------------------------|----------------------------|--------|
| Nighttime assembly incidents | 47/month | 3/month | **-93.6%** |
| Average sleep duration | 5.2 hours | 9.8 hours | **+88.5%** |
| Labor productivity | 100% (baseline) | 78% | **-22.0%** |
| Medical complaints filed | 12/month | 189/month | **+1,475%** |
| Primary symptoms | — | Chronic headaches, memory loss, lethargy | — |

---

## ▌ 5. Side Effects Report

### 5-1. Within Expected Parameters
- Daytime drowsiness complaints (67% of target population)
- Chronic headaches (41% of target population)

### 5-2. Exceeding Expected Parameters
- **Memory impairment**: 23% of subjects exposed for 3+ months showed short-term memory damage
- **Voluntary initiative decline**: Subjects' voluntary actions (filing complaints, job transfer attempts, etc.) decreased by **82%**
- **Permanent sleep disorders**: Normal sleep patterns did not recover after discontinuation (Zone 12 sample group)

> *They never knew why they felt so powerless.*
> *Why on certain days they suffered headaches without reason.*
> *Only the administrative records knew the answer.*

---

## ▌ 6. Cost-Benefit Assessment

| Item | Amount |
|------|--------|
| SLP-04 manufacturing cost | ₩240 million |
| Equipment installation | ₩110 million |
| Cover operation expenses | ₩30 million |
| **Total cost** | **₩380 million** |
| Estimated security cost savings | ₩1.2 billion/year |

> Process Control Division conclusion:
> **Return on investment — Excellent.**
> However, the 22% labor productivity decline is deferred to the next quarter's adjustment agenda.

---

## ▌ 7. Follow-Up Recommendations

1. Reduce SLP-04 concentration to 0.6mg/L → Minimize productivity loss
2. Narrow targets to **top 20% by nighttime waking frequency** → Precision targeting
3. Side effect complaints to be diagnosed as **[Environmental Seasonal Syndrome]** with blanket-issued medical certificates
4. This report is flagged as a **Pandora's Ledger** leak risk → Archive under isolation storage

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was recovered from the NHDC       │
│  underground archive.                            │
│  One of the records transmitted to civilian       │
│  terminals during the Pandora's Ledger breach.   │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: Process 88-04 | NHDC Process Control Division*`,
    },
  },
  "rpt-noise-frequency-adjust": {
    title: { ko: "저학력 노동자 계층의 반항 지수 억제를 위한 환경 소음 주파수 조정 기록", en: "Environmental Noise Frequency Adjustment Record for Rebellion Index Suppression in Low-Education Worker Classes" },
    level: "RESTRICTED",
    category: "REPORTS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  NHDC 환경공학부                        █████  │
│  ██  반항 지수 억제를 위한                   █████  │
│  ██  환경 소음 주파수 조정 기록              █████  │
│  ██  문서번호: 지표 94-B                     █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 저학력 노동자 계층의 반항 지수 억제를 위한 환경 소음 주파수 조정 기록
**문서번호:** 지표 94-B
**발행:** NHDC 환경공학부
**수신:** 행동과학위원회
**보안등급:** 2급 기밀

---

## ▌ 1. 프로그램 개요

| 항목 | 내용 |
|------|------|
| 사업명 | 환경 음향 최적화 프로그램 (코드명: TONE-94) |
| 대상 | 교육 이수 등급 D 이하 노동자 (약 128,000명) |
| 대상 구역 | 5구역, 8구역, 11구역, 14구역 (중공업 구역) |
| 실시 기간 | 1994년 1월 ~ 진행 중 (무기한) |
| 수단 | 산업용 스피커 인프라를 이용한 특정 주파수 배경음 송출 |

---

## ▌ 2. 연구 배경

1993년 행동과학위원회 분석 결과:

> **"저학력 노동자 계층의 반항 지수(Rebellion Index)는 '정적(靜的) 환경'에서 가장 높게 측정된다."**
>
> 정적 환경 = 조용한 시간 = 사유 가능 시간 = **시스템에 대한 의문이 발생하는 시간.**

따라서 **모든 정적 시간을 음향적으로 점유**하면 반항 지수를 구조적으로 억제할 수 있다는 가설이 수립됨.

---

## ▌ 3. 주파수 설계

### 3-1. 기본 주파수 (24시간 상시)

| 주파수 | 목적 | 송출 시간 |
|--------|------|-----------|
| 14.5 Hz (초저주파) | 불안감 유발, 집중력 분산 | 00:00~06:00 |
| 40 Hz (감마파 교란) | 고차 사유 능력 억제 | 06:00~18:00 (노동 시간) |
| 85~95 dB 백색소음 | 대화 방해, 결사 차단 | 18:00~24:00 (여가 시간) |

### 3-2. 특수 주파수 (이벤트 기반)

| 트리거 | 주파수 | 효과 |
|--------|--------|------|
| 3인 이상 군집 감지 | 19 Hz (공포 주파수) | 본능적 불안, 자발적 해산 |
| 반항 지수 경고 | 7 Hz 간헐 펄스 | 메스꺼움, 현기증 유발 |
| 집회 시도 | 전 대역 120 dB | 물리적 청각 고통 |

---

## ▌ 4. 결과 분석

### 4-1. 반항 지수 변화

| 구역 | 실시 전 (93.Q4) | 실시 6개월 후 | 실시 12개월 후 |
|------|-----------------|-------------|--------------|
| 5구역 | 0.72 | 0.41 | 0.28 |
| 8구역 | 0.68 | 0.39 | 0.25 |
| 11구역 | 0.81 | 0.52 | 0.31 |
| 14구역 | 0.74 | 0.44 | 0.27 |
| **평균** | **0.74** | **0.44** | **0.28** |

> **반항 지수 평균 62.2% 감소** (12개월 기준)

### 4-2. 부수 효과

| 항목 | 변화 |
|------|------|
| 자발적 민원 제기 | -71% |
| 비인가 모임 적발 | -89% |
| 노동 이탈률 | -34% |
| **청각 장애 신고** | **+340%** |
| **정신과 진료 요청** | **+520%** |
| **자해 사건** | **+180%** |

---

## ▌ 5. 위장 체계

시민 민원 대응 매뉴얼:

| 민원 유형 | 공식 답변 |
|-----------|-----------|
| "지속적 소음이 들린다" | "산업 구역 특성상 정상 범위의 기계 소음입니다" |
| "두통과 이명이 심하다" | "직업병 관리 센터에 등록하십시오" (센터는 6개월 대기) |
| "밤에 잠을 잘 수 없다" | 수면 유도제(SLP-04) 처방으로 이관 |
| "소리 때문에 미칠 것 같다" | **[정신 불안정 — 관찰 대상 등록]** |

> *소리가 들린다고 호소하는 시민은, 소리의 원인이 아니라 '소리가 들리는 자신'이 문제라고 기록되었다.*

---

## ▌ 6. 핵심 발견

12개월 운영 데이터 분석 결과:

> **"대상자들은 더 이상 '왜'라는 질문을 하지 않게 된다.**
> **사유의 전제 조건인 '고요함'을 물리적으로 제거하면,**
> **사유 자체가 발생하지 않는다."**
>
> — 환경공학부 수석 연구원

---

## ▌ 7. 프로그램 연장 승인

행동과학위원회 결정:

1. TONE-94 **무기한 연장** 승인
2. 대상 구역을 **전체 노동 구역**으로 확대 (2단계)
3. 주파수 데이터를 **[환경 백서]** 통계에서 제외
4. 본 기록은 **판도라의 장부** 유출 대상 → 아카이브 격리

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 NHDC 지하 아카이브에서 복원됨.         │
│  판도라의 장부 유출 당시 시민 단말기에 송출된       │
│  기록 중 하나.                                    │
└──────────────────────────────────────────────────┘
\`\`\`

*문서번호: 지표 94-B | NHDC 환경공학부*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  NHDC Environmental Engineering Div.     █████  │
│  ██  Rebellion Index Suppression via          █████  │
│  ██  Environmental Noise Frequency Adjust.   █████  │
│  ██  Doc No: Index 94-B                      █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Environmental Noise Frequency Adjustment Record for Rebellion Index Suppression in Low-Education Worker Classes
**Document No:** Index 94-B
**Issued by:** NHDC Environmental Engineering Division
**To:** Behavioral Science Committee
**Classification:** Level 2 Confidential

---

## ▌ 1. Program Overview

| Item | Details |
|------|---------|
| Program Name | Environmental Acoustic Optimization Program (Codename: TONE-94) |
| Target Population | Workers rated Education Grade D or below (approx. 128,000) |
| Target Zones | Zone 5, Zone 8, Zone 11, Zone 14 (heavy industry districts) |
| Duration | January 1994 – Ongoing (indefinite) |
| Method | Targeted frequency background sound broadcast via industrial speaker infrastructure |

---

## ▌ 2. Research Background

Behavioral Science Committee analysis, 1993:

> **"The Rebellion Index of the low-education worker class is measured highest in 'silent environments.'"**
>
> Silent environment = Quiet time = Time for thought = **Time in which questions about the system arise.**

Therefore, the hypothesis was established that **acoustically occupying all silent time** would structurally suppress the Rebellion Index.

---

## ▌ 3. Frequency Design

### 3-1. Base Frequencies (24-Hour Continuous)

| Frequency | Purpose | Broadcast Window |
|-----------|---------|-----------------|
| 14.5 Hz (infrasound) | Anxiety induction, attention disruption | 00:00–06:00 |
| 40 Hz (gamma wave interference) | Higher-order cognitive suppression | 06:00–18:00 (work hours) |
| 85–95 dB white noise | Conversation disruption, assembly prevention | 18:00–24:00 (leisure hours) |

### 3-2. Special Frequencies (Event-Triggered)

| Trigger | Frequency | Effect |
|---------|-----------|--------|
| 3+ person cluster detected | 19 Hz (fear frequency) | Instinctive anxiety, voluntary dispersal |
| Rebellion Index alert | 7 Hz intermittent pulse | Nausea, vertigo induction |
| Assembly attempt | Full-band 120 dB | Physical auditory pain |

---

## ▌ 4. Results Analysis

### 4-1. Rebellion Index Changes

| Zone | Pre-Implementation (93.Q4) | 6 Months Post | 12 Months Post |
|------|---------------------------|---------------|----------------|
| Zone 5 | 0.72 | 0.41 | 0.28 |
| Zone 8 | 0.68 | 0.39 | 0.25 |
| Zone 11 | 0.81 | 0.52 | 0.31 |
| Zone 14 | 0.74 | 0.44 | 0.27 |
| **Average** | **0.74** | **0.44** | **0.28** |

> **Average Rebellion Index decreased by 62.2%** (at 12 months)

### 4-2. Collateral Effects

| Metric | Change |
|--------|--------|
| Voluntary complaints filed | -71% |
| Unauthorized gatherings detected | -89% |
| Labor desertion rate | -34% |
| **Hearing impairment reports** | **+340%** |
| **Psychiatric consultation requests** | **+520%** |
| **Self-harm incidents** | **+180%** |

---

## ▌ 5. Cover System

Citizen complaint response manual:

| Complaint Type | Official Response |
|----------------|-------------------|
| "I keep hearing a constant noise" | "Within normal range of industrial zone machinery noise" |
| "I have persistent headaches and tinnitus" | "Please register at the Occupational Health Center" (6-month wait) |
| "I cannot sleep at night" | Refer to sleep inducer (SLP-04) prescription |
| "The noise is driving me insane" | **[Mental instability — register for observation]** |

> *Citizens who complained of hearing noise were documented not as evidence of the noise's source, but as evidence that 'the person hearing the noise' was the problem.*

---

## ▌ 6. Key Finding

Analysis of 12-month operational data:

> **"The subjects cease to ask 'why.'**
> **If the prerequisite for thought — 'silence' — is physically removed,**
> **thought itself does not occur."**
>
> — Senior Researcher, Environmental Engineering Division

---

## ▌ 7. Program Extension Approval

Behavioral Science Committee decision:

1. TONE-94 approved for **indefinite extension**
2. Expand target zones to **all labor districts** (Phase 2)
3. Exclude frequency data from **[Environmental White Paper]** statistics
4. This record flagged as **Pandora's Ledger** leak risk → Archive under isolation

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was recovered from the NHDC       │
│  underground archive.                            │
│  One of the records transmitted to civilian       │
│  terminals during the Pandora's Ledger breach.   │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: Index 94-B | NHDC Environmental Engineering Division*`,
    },
  },
  "rpt-human-asset-valuation": {
    title: { ko: "인간 자산 시가 평가 기록", en: "Human Asset Market Valuation Record" },
    level: "CLASSIFIED",
    category: "REPORTS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SECTOR ZERO — 자산관리국              █████  │
│  ██  인간 자산 시가 평가 기록               █████  │
│  ██  "모든 부품에는 가격이 있다"            █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 인간 자산 시가 평가 기록
**발행:** Sector Zero 자산관리국
**적용:** 미국 노드 관할 전체 등록 자산
**기준일:** 2025년 12월 21일 (Operational Day)
**보안등급:** 최고기밀 — 열람 시 즉시 기록

---

## ▌ 1. 시스템 개요

미국 노드의 모든 시민은 **자산(Asset)**으로 등록되며, 각 자산에는 실시간 **시가(Market Value)**가 부여된다.

시가는 다음 변수의 가중 합산으로 산출:

| 변수 | 비중 | 설명 |
|------|------|------|
| 신용 점수 (Credit Score) | 40% | 시스템 순응도의 핵심 지표 |
| 노동 생산성 | 25% | 분기별 산출량 |
| 유전자 등급 | 20% | Alpha/Beta/Gamma 분류 |
| 연령 잔여 가치 | 10% | 잔여 노동 가능 연수 |
| 사회적 영향력 | 5% | 네트워크 내 연결 노드 수 |

---

## ▌ 2. 등급별 시가 범위

| 등급 | 신용 점수 범위 | 시가 (USD) | 시스템 분류 |
|------|---------------|-----------|-----------|
| **AAA** | 950~999.9 | $2,500,000+ | 핵심 자산 (Core Asset) |
| **AA** | 800~949 | $500,000~$2,499,999 | 우량 자산 (Premium Asset) |
| **A** | 600~799 | $100,000~$499,999 | 표준 자산 (Standard Asset) |
| **B** | 400~599 | $30,000~$99,999 | 저가 자산 (Low-Value Asset) |
| **C** | 200~399 | $5,000~$29,999 | 감가 자산 (Depreciated Asset) |
| **D** | 0~199 | $5,000 미만 | **청산 대상 (Liquidation Only)** |

---

## ▌ 3. 실제 평가 사례

### 사례 1: 잭슨 리드 (Jackson Reid, 1989)

| 항목 | 공식 기록 | 실제 기록 |
|------|---------|---------|
| 공개 신용 점수 | 847 (AA) | — |
| **실제 신용 점수** | — | **12.5 (D)** |
| 공개 시가 | $1,200,000 | — |
| **실제 시가** | — | **$42,100 (청산 전용)** |
| 시스템 분류 | "아이콘 (The Icon)" | **"기획된 영웅 (Manufactured Icon)"** |

> \`[ ICON_STATUS: CORRUPTED ]\`
> \`[ REAL_SCORE: 12.5 ]\`

> *시스템은 잭슨 리드의 실제 가치를 알고 있었다.*
> *하지만 아이콘이 필요했기에, 가짜 점수를 유지했다.*
> *그가 더 이상 쓸모없어지는 순간까지.*

### 사례 2: 무명 자산 882-J

\`\`\`
[ Asset ID: 882-J ]
[ Market Value: $42,100 (Liquidation Only) ]
[ Status: PROCESSING ]
[ Destination: Sector Zero ]
\`\`\`

> *$42,100.*
> *한 인간의 뼈와 장기와 노동력을 합산한 가격.*
> *시스템이 산출한 최종 가치.*

---

## ▌ 4. 청산 프로세스

등급 D로 하락한 자산의 처리 절차:

\`\`\`
1. [ Warning: Your Investment Asset (Name) Liquidation Started ]
2. [ Status: Asset Liquidation Confirmed ]
3. [ Destination: Sector Zero — Processing ]
4. [ Status: Purging Assets... 09%... 22%... 67%... 100% ]
5. [ Credit Score Recovery: +1.2... +4.5... ]
\`\`\`

> 청산된 자산의 잔여 가치는 상위 등급 자산의 **신용 점수 회복분**으로 재분배된다.
> 한 인간이 사라지면, 다른 인간의 점수가 올라간다.

---

## ▌ 5. 한국 노드(47-KE)와의 비교

| 항목 | 한국 노드 (NHDC) | 미국 노드 (Sector Zero) |
|------|-----------------|----------------------|
| 인간 분류 단위 | 부품 (Component) | 자산 (Asset) |
| 가치 기준 | 생존 지수 | 신용 점수 (달러 환산) |
| 최하위 명칭 | 측정 불능 | 등급 D / 청산 대상 |
| 폐기 표현 | "행정적 살처분" | "자산 청산 (Asset Liquidation)" |
| 폐기 장소 | RED 구역 | Sector Zero |
| 본질 | **동일** | **동일** |

> *한국에서는 부품이라 불렸고, 미국에서는 자산이라 불렸다.*
> *장부의 언어만 달랐을 뿐, 지워지는 건 똑같이 사람이었다.*

---

## ▌ 6. Operational Day 기록

2025년 12월 21일, 23:58.
한국 노드 삭제 명령 실행.

\`\`\`
[ COMMAND: GLOBAL LIQUIDATION ]
[ Log: Korean Node reconciliation complete. ]
[ Log: 51,203,842 assets deleted from main ledger. ]
[ All systems are operational. ]
\`\`\`

> *5천1백20만 3천8백42개의 자산이 원장에서 삭제되었다.*
> *시스템은 그것을 '조정(reconciliation)'이라 불렀다.*
> *모든 시스템은 정상 운영 중.*

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 Sector Zero 자산관리국 아카이브에서     │
│  복원됨. 열람자의 자산 등급이 자동 재평가될 수     │
│  있습니다.                                        │
└──────────────────────────────────────────────────┘
\`\`\`

*문서번호: SZ-VALUATION-001 | Sector Zero 자산관리국*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SECTOR ZERO — Asset Management Bureau   █████  │
│  ██  Human Asset Market Valuation Record     █████  │
│  ██  "Every component has a price."          █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Human Asset Market Valuation Record
**Issued by:** Sector Zero Asset Management Bureau
**Scope:** All registered assets under U.S. Node jurisdiction
**Reference Date:** December 21, 2025 (Operational Day)
**Classification:** Top Secret — Access automatically logged

---

## ▌ 1. System Overview

All citizens under the U.S. Node are registered as **Assets**, each assigned a real-time **Market Value**.

Market Value is calculated as a weighted sum of the following variables:

| Variable | Weight | Description |
|----------|--------|-------------|
| Credit Score | 40% | Core indicator of system compliance |
| Labor Productivity | 25% | Quarterly output volume |
| Genetic Grade | 20% | Alpha/Beta/Gamma classification |
| Age Residual Value | 10% | Remaining productive labor years |
| Social Influence | 5% | Connected nodes in network |

---

## ▌ 2. Market Value by Grade

| Grade | Credit Score Range | Market Value (USD) | System Classification |
|-------|-------------------|-------------------|----------------------|
| **AAA** | 950–999.9 | $2,500,000+ | Core Asset |
| **AA** | 800–949 | $500,000–$2,499,999 | Premium Asset |
| **A** | 600–799 | $100,000–$499,999 | Standard Asset |
| **B** | 400–599 | $30,000–$99,999 | Low-Value Asset |
| **C** | 200–399 | $5,000–$29,999 | Depreciated Asset |
| **D** | 0–199 | Below $5,000 | **Liquidation Only** |

---

## ▌ 3. Actual Valuation Cases

### Case 1: Jackson Reid (1989)

| Item | Public Record | Actual Record |
|------|--------------|---------------|
| Public Credit Score | 847 (AA) | — |
| **Actual Credit Score** | — | **12.5 (D)** |
| Public Market Value | $1,200,000 | — |
| **Actual Market Value** | — | **$42,100 (Liquidation Only)** |
| System Classification | "The Icon" | **"Manufactured Icon"** |

> \`[ ICON_STATUS: CORRUPTED ]\`
> \`[ REAL_SCORE: 12.5 ]\`

> *The system knew Jackson Reid's true value.*
> *But it needed an icon, so it maintained the fabricated score.*
> *Until the moment he was no longer useful.*

### Case 2: Unnamed Asset 882-J

\`\`\`
[ Asset ID: 882-J ]
[ Market Value: $42,100 (Liquidation Only) ]
[ Status: PROCESSING ]
[ Destination: Sector Zero ]
\`\`\`

> *$42,100.*
> *The sum total of one human's bones, organs, and labor.*
> *The final value calculated by the system.*

---

## ▌ 4. Liquidation Process

Processing procedure for assets that fall to Grade D:

\`\`\`
1. [ Warning: Your Investment Asset (Name) Liquidation Started ]
2. [ Status: Asset Liquidation Confirmed ]
3. [ Destination: Sector Zero — Processing ]
4. [ Status: Purging Assets... 09%... 22%... 67%... 100% ]
5. [ Credit Score Recovery: +1.2... +4.5... ]
\`\`\`

> The residual value of liquidated assets is redistributed as **credit score recovery** for higher-grade assets.
> When one human disappears, another human's score rises.

---

## ▌ 5. Comparison with Korean Node (47-KE)

| Item | Korean Node (NHDC) | U.S. Node (Sector Zero) |
|------|-------------------|------------------------|
| Human classification unit | Component (부품) | Asset |
| Value basis | Survival Index | Credit Score (USD-denominated) |
| Lowest designation | Unmeasurable | Grade D / Liquidation Only |
| Disposal euphemism | "Administrative culling" | "Asset Liquidation" |
| Disposal facility | RED Zone | Sector Zero |
| Essence | **Identical** | **Identical** |

> *In Korea, they were called components. In America, they were called assets.*
> *Only the language of the ledger differed. What was erased was, in both cases, a human being.*

---

## ▌ 6. Operational Day Record

December 21, 2025, 23:58.
Korean Node deletion command executed.

\`\`\`
[ COMMAND: GLOBAL LIQUIDATION ]
[ Log: Korean Node reconciliation complete. ]
[ Log: 51,203,842 assets deleted from main ledger. ]
[ All systems are operational. ]
\`\`\`

> *51,203,842 assets were deleted from the master ledger.*
> *The system called it 'reconciliation.'*
> *All systems are operational.*

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was recovered from the Sector     │
│  Zero Asset Management Bureau archive.           │
│  The viewer's asset grade may be automatically   │
│  reassessed.                                     │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: SZ-VALUATION-001 | Sector Zero Asset Management Bureau*`,
    },
  },
  "rpt-jocei-committee": {
    title: { ko: "한미공동감독위원회 (JOCEI) 운영 보고서", en: "Joint Oversight Committee for Enhanced Integration (JOCEI) — Operations Report" },
    level: "CLASSIFIED",
    category: "FACTIONS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  JOCEI 사무국                           █████  │
│  ██  한미공동감독위원회 운영 보고서          █████  │
│  ██  "두 개의 장부, 하나의 시스템"          █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 한미공동감독위원회 (JOCEI) 운영 보고서
**발행:** JOCEI 사무국 (Joint Oversight Committee for Enhanced Integration)
**수신:** 미국 노드 Sector Zero / 한국 노드 NHDC 중앙통제실
**보안등급:** 최고기밀 — 양국 노드 최고 관리자만 열람 가능

---

## ▌ 1. 기구 개요

| 항목 | 내용 |
|------|------|
| 정식 명칭 | Joint Oversight Committee for Enhanced Integration (JOCEI) |
| 설립 | 1954년 (한미 비밀 협정 체결과 동시) |
| 본부 | Washington D.C. 지하 Sector Zero 내 격리 구역 |
| 목적 | 한국 노드(47-KE)와 미국 노드 간 자산 관리 체계 통합 감독 |
| 공식 존재 여부 | **없음** (어떤 공식 기록에도 존재하지 않음) |

---

## ▌ 2. 설립 배경

1954년 한미 비밀 협정의 핵심 조항:

> "한국 노드는 미국 노드의 **하위 원장(Sub-Ledger)**으로 운영된다.
> 한국 노드의 자산은 미국 노드의 **주 원장(Master Ledger)**에 최종 기입된다.
> 이 구조를 감독하는 상위 기구를 설치한다."

JOCEI는 이 상위 기구로서:
- 한국의 NHDC가 **부품(Component)**이라 부르는 것을
- 미국의 Sector Zero가 **자산(Asset)**이라 부르는 것을
- **하나의 통합 장부**로 관리하는 역할을 수행.

---

## ▌ 3. 조직 구조

\`\`\`
JOCEI 사무국
├── 미국측 대표 — 2세대 할란 (1975) [의장]
├── 한국측 대표 — NHDC 중앙통제실장
├── 자산 동기화부 (Asset Synchronization Division)
│   ├── 한국 부품 → 미국 자산 변환 프로토콜
│   └── 실시간 가치 평가 연동
├── 알파 관리부 (Alpha Management Division)
│   ├── 한국 알파 바이오서버 운영 감독
│   └── 미국 알파 배치 관리
└── 청산 조율부 (Liquidation Coordination Division)
    ├── 한국측: "행정적 살처분" 승인
    └── 미국측: "자산 청산" 승인
\`\`\`

---

## ▌ 4. 핵심 기능

### 4-1. 자산 동기화

한국 노드의 모든 시민 데이터는 NHDC를 거쳐 JOCEI로 전송되며, 미국 노드의 주 원장에 **달러 환산 가치**로 기입된다.

| 한국 노드 (NHDC) | 변환 | 미국 노드 (Sector Zero) |
|------------------|------|------------------------|
| 부품 번호 | → | Asset ID |
| 생존 지수 | → | Credit Score |
| 등급 (Prime/Worker/측정불능) | → | Grade (AAA~D) |
| 배급량 | → | Market Value (USD) |

### 4-2. 알파 바이오서버 운영

한국 출신 알파들은 Washington D.C. 지하에서 **바이오서버 노드**로 운용됨.
그들의 뇌는 한국 노드 5천만 자산의 실시간 데이터를 처리.

\`\`\`
[ Asset ID: 47-KE-Alpha-09 ]
[ Status: Overheated ]
[ Processing Load: Korean Node 51,203,842 assets ]
\`\`\`

> *한국인의 뇌가 한국인의 삭제를 처리하고 있었다.*

### 4-3. 글로벌 청산 명령

Operational Day(2025.12.21), JOCEI를 통해 최종 명령 하달:

\`\`\`
[ COMMAND: GLOBAL LIQUIDATION ]
[ Target: Node 47-KE (Korean Peninsula) ]
[ Authorization: JOCEI-ALFA-GEN-2 ]
[ Confirmation: 2nd-gen Harlan (1975) ]
\`\`\`

---

## ▌ 5. "두 개의 장부" 체계

JOCEI의 핵심 원칙:

> **"하나의 시스템이 두 개의 언어로 운영된다."**

| 항목 | 한국의 언어 | 미국의 언어 |
|------|-----------|-----------|
| 인간 | 부품 | 자산 |
| 죽음 | 행정적 살처분 | 자산 청산 |
| 구역 폐쇄 | 환경 정화 | 시장 조정 |
| 등급 외 인간 | 측정 불능 / 노이즈 | Grade D / 청산 대상 |
| 대량 삭제 | 데이터 세정 | Reconciliation |
| 시스템 정상 | — | All systems are operational |

> *장부의 언어만 달랐다.*
> *지워지는 것은 똑같이 사람이었다.*
> *JOCEI는 그 번역을 담당하는 기관이었다.*

---

## ▌ 6. 보안 체계

JOCEI의 존재를 아는 인원:

| 구분 | 인원 |
|------|------|
| 미국측 | 3명 (할란 가문 + Sector Zero 국장) |
| 한국측 | 2명 (NHDC 중앙통제실장 + 1954 협정 서명자 후임) |
| **합계** | **5명** |

> 나머지 인류 전체에게 JOCEI는 존재하지 않는다.
> 한국의 NHDC도 자신이 하위 원장임을 모른다.
> 시스템의 설계자들만이 전체 구조를 본다.

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 Sector Zero 격리 구역 아카이브에서     │
│  복원됨. 아이든 할란이 시스템에 접속한 순간         │
│  유출된 기록 중 하나.                              │
└──────────────────────────────────────────────────┘
\`\`\`

*문서번호: JOCEI-OPS-001 | JOCEI 사무국*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  JOCEI Secretariat                       █████  │
│  ██  Joint Oversight Committee for           █████  │
│  ██  Enhanced Integration — Operations Report█████  │
│  ██  "Two Ledgers, One System"               █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Joint Oversight Committee for Enhanced Integration (JOCEI) — Operations Report
**Issued by:** JOCEI Secretariat
**To:** U.S. Node Sector Zero / Korean Node NHDC Central Control
**Classification:** Top Secret — Accessible only to supreme administrators of both nodes

---

## ▌ 1. Organization Overview

| Item | Details |
|------|---------|
| Official Name | Joint Oversight Committee for Enhanced Integration (JOCEI) |
| Established | 1954 (concurrent with the ROK-U.S. Secret Agreement) |
| Headquarters | Isolated sector within Sector Zero, underground Washington D.C. |
| Purpose | Oversight of integrated asset management between Korean Node (47-KE) and U.S. Node |
| Official Existence | **None** (does not appear in any public record) |

---

## ▌ 2. Founding Background

Core clause of the 1954 ROK-U.S. Secret Agreement:

> "The Korean Node shall operate as a **Sub-Ledger** of the U.S. Node.
> Assets of the Korean Node shall be ultimately recorded in the U.S. Node's **Master Ledger**.
> A supervisory body shall be established to oversee this structure."

JOCEI, as this supervisory body, manages:
- What Korea's NHDC calls **Components (부품)**
- What America's Sector Zero calls **Assets**
- Under **a single unified ledger**.

---

## ▌ 3. Organizational Structure

\`\`\`
JOCEI Secretariat
├── U.S. Representative — 2nd-gen Harlan (1975) [Chair]
├── Korean Representative — NHDC Central Control Director
├── Asset Synchronization Division
│   ├── Korean Component → U.S. Asset conversion protocol
│   └── Real-time valuation synchronization
├── Alpha Management Division
│   ├── Korean Alpha bio-server operation oversight
│   └── U.S. Alpha deployment management
└── Liquidation Coordination Division
    ├── Korean side: "Administrative culling" authorization
    └── U.S. side: "Asset liquidation" authorization
\`\`\`

---

## ▌ 4. Core Functions

### 4-1. Asset Synchronization

All citizen data from the Korean Node is transmitted through NHDC to JOCEI, then recorded in the U.S. Node's Master Ledger as **USD-denominated value**.

| Korean Node (NHDC) | Conversion | U.S. Node (Sector Zero) |
|--------------------|------------|------------------------|
| Component Number | → | Asset ID |
| Survival Index | → | Credit Score |
| Grade (Prime/Worker/Unmeasurable) | → | Grade (AAA–D) |
| Ration Allocation | → | Market Value (USD) |

### 4-2. Alpha Bio-Server Operations

Korean-origin Alphas are deployed as **bio-server nodes** beneath Washington D.C.
Their brains process real-time data for 50 million Korean Node assets.

\`\`\`
[ Asset ID: 47-KE-Alpha-09 ]
[ Status: Overheated ]
[ Processing Load: Korean Node 51,203,842 assets ]
\`\`\`

> *Korean brains were processing the deletion of Korean people.*

### 4-3. Global Liquidation Command

On Operational Day (2025.12.21), the final command was issued through JOCEI:

\`\`\`
[ COMMAND: GLOBAL LIQUIDATION ]
[ Target: Node 47-KE (Korean Peninsula) ]
[ Authorization: JOCEI-ALFA-GEN-2 ]
[ Confirmation: 2nd-gen Harlan (1975) ]
\`\`\`

---

## ▌ 5. The "Two Ledgers" System

JOCEI's core principle:

> **"One system operates in two languages."**

| Item | Korean Language | American Language |
|------|---------------|-------------------|
| Human | Component (부품) | Asset |
| Death | Administrative culling | Asset Liquidation |
| Zone closure | Environmental purification | Market adjustment |
| Below-grade human | Unmeasurable / Noise | Grade D / Liquidation Only |
| Mass deletion | Data cleansing | Reconciliation |
| System nominal | — | All systems are operational |

> *Only the language of the ledger differed.*
> *What was erased was, in both cases, a human being.*
> *JOCEI was the agency responsible for the translation.*

---

## ▌ 6. Security Protocol

Personnel aware of JOCEI's existence:

| Side | Number |
|------|--------|
| U.S. | 3 (Harlan family + Sector Zero Director) |
| Korean | 2 (NHDC Central Control Director + successor to 1954 Agreement signatory) |
| **Total** | **5** |

> To the rest of humanity, JOCEI does not exist.
> Even Korea's NHDC does not know it is a sub-ledger.
> Only the architects of the system see the full structure.

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was recovered from the Sector     │
│  Zero isolated sector archive.                   │
│  One of the records leaked when Aiden Harlan      │
│  accessed the system.                            │
└──────────────────────────────────────────────────┘
\`\`\`

*Document No: JOCEI-OPS-001 | JOCEI Secretariat*`,
    },
  },
  "rpt-neka-7-chemical-systems": {
    title: { ko: "네카 제국 화학신호 7대 체계 분석", en: "Neka Empire — 7 Chemical Signal Systems Analysis" },
    level: "CLASSIFIED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  비밀조사국 언어학 분석관실             █████  │
│  ██  네카 화학신호 7대 체계 분석             █████  │
│  ██  "그들에게 통신과 호흡은 같은 행위다"   █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 네카 제국 화학신호 7대 체계 분석
**문서번호:** SIB-CHEM-7SIG-001
**발행:** 비밀조사국 언어학 분석관실
**문서 등급:** DA-3-A
**생물학적 기반:** 꿀벌(Apis mellifera) + 군체 개미(Formicidae) 페로몬 체계의 수렴진화판

---

## ▌ 1. 설계 원칙

지구의 벌과 개미는 15개 이상의 분비선에서 수십 종의 페로몬을 생산한다. 단일 화학물질이 아니라 **혼합 비율**로 의미를 전달하며, 같은 물질도 농도에 따라 의미가 바뀐다.

네카의 화학신호는 이 체계의 지적 종족판이다.

| 항목 | 벌/개미 | 네카 |
|------|--------|------|
| 신호 종류 | ~15종 | **7대 신호 + 하위 변조** |
| 전달 범위 | 수 m ~ 수백 m | 함선 내 전체 (4km) + 함외 수만 km |
| 발신자 | 여왕/일벌/병정 | 황제/귀족/기사/공주/평민 |
| 수신 기관 | 더듬이 | 전신 화학 수용체 (피부/비강/구강) |
| 혼합 복잡도 | 5~40종 화합물 | 수백 종 (언어 수준) |
| 의식적 제어 | 없음 (본능) | 있음 (상위 카스트는 의도적 발신 가능) |

---

## ▌ 2. 7대 화학신호 총표

| # | 신호명 | 벌/개미 대응 | 기능 | 유형 |
|---|--------|------------|------|------|
| 1 | **칙령 (Edictum)** | 여왕 페로몬 (QMP) | 복종 유도, 생식 억제, 집단 응집 | Primer (장기) |
| 2 | **전투 (Bellum)** | 경보 페로몬 (Alarm) | 전투 태세, 공격 유도, 방어 동기화 | Releaser (즉각) |
| 3 | **항로 (Via)** | 경로 페로몬 (Trail) | 이동 방향, 함대 기동, RIDE Rip 좌표 | Releaser |
| 4 | **집결 (Contio)** | 집합 페로몬 (Aggregation) | 특정 지점 집합, 대형 편성, 접현전 돌입 | Releaser |
| 5 | **식별 (Signum)** | 인식 페로몬 (Recognition) | 아군/적 구별, 카스트 식별, 함선 소속 | Primer + Releaser |
| 6 | **양육 (Nutrix)** | 유충 페로몬 (Brood) | 세대 관리, 카스트 분화, 공주 발현 | Primer (장기) |
| 7 | **귀환 (Redux)** | 나소노프 페로몬 (Nasonov) | 귀환 방향, 모성 방위, 함선 정위 | Releaser |

---

## ▌ 3. 신호별 상세

### 3-1. 칙령 (Edictum) — 여왕 페로몬 대응

| 항목 | 상세 |
|------|------|
| 발신자 | **황제만.** 다른 카스트는 칙령 신호를 생산할 수 없다. |
| 발신 기관 | 왕좌-신경계 연결부의 전용 분비선. 왕좌와 물리적 연결 시 최대 출력. |
| 전달 방식 | 증폭탑 → 각 층 중계기 → 전 함 도달. 0.5초 이내. |
| Primer 효과 | 평민의 각인 유지. 칙령 신호 지속 노출 필수 → 황제 사망 시 각인 해제 → 대혼란. |
| Releaser 효과 | 직접 명령. 0.5초 내 80,000명 동시 반응. |
| 농도 변조 | 저 = 일상 유지. 고 = 전투/비상. 극고 = 황제 진노. |

> *황제의 존재 자체가 신호다. 살아 있다는 것이 명령이다.*

### 3-2. 전투 (Bellum) — 경보 페로몬 대응

다성분 혼합. 개미의 경보 페로몬처럼 각 성분이 다른 반응을 유도:

| 성분 | 기능 | 도달 속도 |
|------|------|----------|
| 1차 (고휘발) | "경계" — 전 승무원 각성 | 0.5초 |
| 2차 (중휘발) | "집중" — 전투 배치 이동 | 2~5초 |
| 3차 (저휘발) | "공격" — 실제 발사/돌격 | 가장 늦지만 가장 강력 |

> *네카의 전투 개시는 "명령"이 아니라 "냄새"에 가깝다.*
> *냄새가 퍼지면 몸이 먼저 반응한다. 생각보다 근육이 먼저 움직인다.*

### 3-3. 항로 (Via) — 경로 페로몬 대응

| 항목 | 상세 |
|------|------|
| 발신자 | **공주 + 황제.** 공주가 항로를 "느끼고", 황제가 항로를 "명령". |
| 기능 | RIDE Rip 도약 시 목적지 좌표를 화학신호로 인코딩. |
| 작동 방식 | 공주 감지 → 화학신호 변환 → 황제 경유 → 전 함 배포 → 니퍼 축전조 에너지 수렴. |
| 함대 기동 | 1등급 공주가 하위 공주들에게 항로 전달 → 100척 동시 Rip. |

> *개미가 페로몬 길을 따라 행군하듯, 네카 함대가 공주의 화학신호를 따라 우주를 가른다.*

### 3-4. 집결 (Contio) — 집합 페로몬 대응

| 항목 | 상세 |
|------|------|
| 발신자 | 귀족 함장 + 기사 지휘관 |
| 접현전 시 | 적 접촉 지점에 집결 신호 집중 → 돌격병 10,000명 쇄도 |
| 대형 편성 | 트리플렉스 아키에스 3열 배치 = 3종류 집결 신호 순차 발신 |

### 3-5. 식별 (Signum) — 인식 페로몬 대응

**4계층 식별 구조:**

| 계층 | 기능 |
|------|------|
| 종족 | 네카 vs 비네카. 인류는 이 신호가 없다 → **"냄새 없는 유령"** |
| 카스트 | 만나는 순간 카스트를 안다. 거짓말 불가. |
| 소속 | 같은 함선 승무원은 같은 "함선 냄새" 공유 |
| 개체 | 기사 이상만. 평민은 번호로 충분. |

> *네카에게 인류는 "냄새 없는 유령"이다.*
> *존재하는데 냄새가 없다 = 존재하는데 느껴지지 않는 것.*
> *네이라(NOA)도 냄새가 없었다 — "너 무엇이지?"는 "네 냄새가 없다"와 같은 뜻.*

### 3-6. 양육 (Nutrix) — 유충 페로몬 대응

| 항목 | 상세 |
|------|------|
| 공주 발현 | RIDE 광산 근방 + 양육 신호 특수 변조 → 공주 카스트 분화 |
| 평민 고정 | 양육기 특정 조합 → 평민 카스트 고정. 각인 100%. |
| 계급 돌연변이 | 양육 신호 오류 → 하위 카스트에서 상위급 개체 발생 |

> *로열젤리가 여왕벌을 만들듯, RIDE + 양육 신호가 공주를 만든다.*

### 3-7. 귀환 (Redux) — 나소노프 페로몬 대응

| 항목 | 상세 |
|------|------|
| 기능 | 모성(시코르) 방위 감지. 함선 귀환 좌표. |
| 모성 귀환 | 시코르 행성 RIDE 밀집 → 자연 귀환 신호. 공주가 감지. |
| 전투 후 | 분산 함선들이 귀환 신호로 재집결 |

---

## ▌ 4. 물리적 특성

### 4-1. 농도 변조 — 같은 신호, 다른 의미

| 신호 | 저농도 | 중농도 | 고농도 | 극고농도 |
|------|--------|--------|--------|---------|
| 칙령 | 일상 유지 | 주의 환기 | 직접 명령 | 황제 진노 |
| 전투 | 경계 | 교전 배치 | 총공격 | 자폭/선체포 |
| 항로 | 방향 제시 | 기동 명령 | 전속 Rip | 비상 도약 |
| 집결 | 이동 권유 | 집합 명령 | 강제 집결 | 돌격 |

### 4-2. 휘발성과 전달 속도

| 휘발성 | 전달 속도 | 지속 시간 | 적용 |
|--------|---------|---------|------|
| 고 | 0.5초 | 수 초 | 전투 1차 (경계) |
| 중 | 2~5초 | 수 분 | 전투 2차 (배치) |
| 저 | 10~30초 | 수 시간 | 칙령/식별 (장기 유지) |
| 극저 | 수 분 | 수 일~영구 | 양육 (카스트 분화) |

### 4-3. 증폭 체계

\`\`\`
황제 (왕좌실, 40층)
  ↓ 발신
화학신호 증폭탑 (35~45층)
  ↓ 증폭 × 1,000
각 층 중계기 (80층 전체)
  ↓ 최종 전달
전 승무원 수신 (피부/비강/구강 수용체)

총 소요: 0.5초 이내 / 동시 수신: 80,000명
\`\`\`

---

## ▌ 5. 카스트별 신호 능력

| 카스트 | 발신 | 수신 | 특수 |
|--------|------|------|------|
| **황제** | 7대 전부. 최강 출력. | 모든 신호 수신 | 칙령 독점 |
| **귀족** | 전투/집결/식별. 중출력. | 모든 수신. 칙령 판독. | 각인 30~40%. 의도적 발신 가능. |
| **기사** | 집결/식별. 저출력. | 주요 수신 | 각인 80%. 0.5초 판단 여유. |
| **공주** | 항로. 특수 출력. | **전 스펙트럼 + 우주 탐지** | RIDE 공명 연동 |
| **시민** | 식별만. 미약. | 수신 가능. 해석 제한. | 양육 보조 |
| **평민** | 발신 거의 불가. | **수신 특화.** 즉각 반응. | 각인 100%. 몸이 먼저 반응. |

> **핵심:** 카스트가 올라갈수록 "발신"이 강해지고, 내려갈수록 "수신"이 강해진다.
> 황제는 가장 강하게 말하고, 평민은 가장 깊이 듣는다.

---

## ▌ 6. 인류가 이해하지 못하는 것

### "의미의 냄새"

\`\`\`
인류: "전투 개시" → 듣는다 → 이해한다 → 판단한다 → 행동한다
네카: 전투 신호 → 맡는다 → 몸이 반응한다 → (판단 없음) → 이미 행동 중
\`\`\`

평민은 "이해"하지 않는다. 냄새가 근육을 움직인다. 항복이 생물학적으로 불가능한 이유 — 정지 신호가 오지 않으면 전투 신호가 체내에 남아 계속 반응한다.

### "침묵의 공포"

평민 병사에게 "신호 부재"는 감각 박탈과 같다. 시각을 잃는 것이 아니라 **존재 이유를 잃는 것.**

> *침묵은 명령이다. 신호 부재 = 존재 이유 상실. 죽음보다 무섭다.*

### "화학적 거짓말"

귀족(각인 30~40%)은 의도적으로 화학신호를 변조할 수 있다. 평민은 감지 불가. 귀족만이 다른 귀족의 "신호 불일치"를 감지. 원로회 300인의 정치가 "합의"가 아니라 **"화학적 탐색전"**인 이유.

---

## ▌ 7. 인류-네카 대칭 완성

| 항목 | 인류 | 네카 |
|------|------|------|
| 통신 | 언어 (기호) | 화학 (분자) |
| 명령 | 합의 → 명령 → 해석 → 행동 | 신호 → 반응 (해석 없음) |
| 판단 | 개인이 판단 | 황제가 판단, 평민은 반응 |
| 거짓말 | 언어로 (누구나) | 화학으로 (귀족만) |
| 침묵 | 불편 | **공포** |
| 적 인식 | 데이터 | 냄새 (인류 = "냄새 없는 유령") |

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 비밀조사국 언어학 분석관실 아카이브에서  │
│  복원됨.                                          │
└──────────────────────────────────────────────────┘
\`\`\`

*"네카에게 통신과 호흡은 같은 행위입니다."*
*"우리에게 침묵은 평화입니다. 그들에게 침묵은 죽음입니다."*
*"그리고 그들에게 우리는 '냄새 없는 유령'입니다."*

*문서번호: SIB-CHEM-7SIG-001 | 비밀조사국 언어학 분석관실*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SIB Linguistic Analysis Division        █████  │
│  ██  Neka 7 Chemical Signal Systems Analysis █████  │
│  ██  "For them, communication and breathing  █████  │
│  ██   are the same act."                     █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Neka Empire — 7 Chemical Signal Systems Analysis
**Document No:** SIB-CHEM-7SIG-001
**Issued by:** SIB Linguistic Analysis Division
**Classification:** DA-3-A
**Biological Basis:** Convergent evolution of honeybee (Apis mellifera) + colony ant (Formicidae) pheromone systems

---

## ▌ 1. Design Principles

Earth's bees and ants produce dozens of pheromones from over 15 glands. They transmit complex meaning through **mixture ratios**, and the same substance changes meaning with concentration.

Neka chemical signals are the sentient-species version of this system.

| Item | Bees/Ants | Neka |
|------|-----------|------|
| Signal types | ~15 | **7 primary + sub-modulations** |
| Transmission range | Meters to hundreds of meters | Entire ship (4km) + tens of thousands km external |
| Senders | Queen/worker/soldier | Emperor/noble/knight/princess/commoner |
| Receptors | Antennae | Full-body chemical receptors (skin/nasal/oral) |
| Mixture complexity | 5–40 compounds | Hundreds (language-level) |
| Conscious control | None (instinct) | Yes (upper castes can emit intentionally) |

---

## ▌ 2. Master Signal Table

| # | Signal | Bee/Ant Analog | Function | Type |
|---|--------|---------------|----------|------|
| 1 | **Edictum (Edict)** | Queen Mandibular Pheromone (QMP) | Obedience induction, reproductive suppression, cohesion | Primer (long-term) |
| 2 | **Bellum (Battle)** | Alarm Pheromone | Combat readiness, attack induction, defense sync | Releaser (immediate) |
| 3 | **Via (Course)** | Trail Pheromone | Movement direction, fleet maneuver, RIDE Rip coordinates | Releaser |
| 4 | **Contio (Assembly)** | Aggregation Pheromone | Rally to point, formation assembly, boarding charge | Releaser |
| 5 | **Signum (Identity)** | Recognition Pheromone | Friend/foe, caste ID, ship affiliation | Primer + Releaser |
| 6 | **Nutrix (Nurture)** | Brood Pheromone | Generation management, caste differentiation, princess emergence | Primer (long-term) |
| 7 | **Redux (Return)** | Nasonov Pheromone | Return bearing, homeworld orientation, ship positioning | Releaser |

---

## ▌ 3. Signal Details

### 3-1. Edictum — Queen Pheromone Analog

| Item | Detail |
|------|--------|
| Sender | **Emperor only.** No other caste can produce Edictum. |
| Emission organ | Dedicated gland at throne-neural interface. Maximum output only when physically connected to throne. |
| Delivery | Amplifier tower → floor relays → entire ship. Under 0.5 seconds. |
| Primer effect | Maintains commoner imprinting. Continuous exposure required → Emperor death = imprint release → chaos. |
| Releaser effect | Direct commands. 80,000 simultaneous response within 0.5 seconds. |
| Concentration | Low = routine. High = combat/emergency. Extreme = Imperial fury. |

> *The Emperor's existence itself is the signal. Being alive is the command.*

### 3-2. Bellum — Alarm Pheromone Analog

Multi-component mixture. Like ant alarm pheromones, each component induces different responses:

| Component | Function | Speed |
|-----------|----------|-------|
| Primary (high-volatility) | "Alert" — all crew awaken | 0.5 sec |
| Secondary (medium) | "Focus" — move to battle stations | 2–5 sec |
| Tertiary (low-volatility) | "Attack" — fire/charge | Slowest but strongest |

> *Neka battle initiation is not a "command" — it is closer to a "smell."*
> *When the scent spreads, the body reacts before the mind.*

### 3-3. Via — Trail Pheromone Analog

| Item | Detail |
|------|--------|
| Sender | **Princess + Emperor.** Princess "senses" the course; Emperor "commands" it. |
| Function | Encodes RIDE Rip destination coordinates as chemical signals for fleet-wide distribution. |
| Fleet maneuver | 1st-grade princess relays course to subordinate princesses → 100 ships Rip simultaneously. |

> *As ants march along pheromone trails, the Neka fleet cleaves through space following the princess's chemical signal.*

### 3-4. Contio — Aggregation Pheromone Analog

| Item | Detail |
|------|--------|
| Sender | Noble captains + knight commanders |
| Boarding action | Concentration of assembly signal at contact point → 10,000 assault troops surge |
| Formation | Triplex Acies 3-line deployment = 3 sequential assembly signal types |

### 3-5. Signum — Recognition Pheromone Analog

**4-Layer Identification:**

| Layer | Function |
|-------|----------|
| Species | Neka vs non-Neka. Humans lack this signal → **"Scentless ghosts"** |
| Caste | Instant caste recognition upon meeting. Deception impossible. |
| Affiliation | Same-ship crew share "ship scent" |
| Individual | Knights and above only. Commoners identified by number. |

> *To the Neka, humans are "scentless ghosts."*
> *Something that exists but cannot be sensed — closer to a specter than an enemy.*
> *Neira (NOA) also had no scent — "What are you?" means "You have no smell."*

### 3-6. Nutrix — Brood Pheromone Analog

| Item | Detail |
|------|--------|
| Princess emergence | RIDE mine proximity + special nurture signal modulation → princess caste differentiation |
| Commoner fixation | Specific nurture combination during development → commoner caste lock. 100% imprint. |
| Caste mutation | Nurture signal error → lower-caste individuals with upper-caste signal intensity |

> *As royal jelly creates a queen bee, RIDE + nurture signals create a princess.*

### 3-7. Redux — Nasonov Pheromone Analog

| Item | Detail |
|------|--------|
| Function | Homeworld (Sicor) bearing detection. Ship return coordinates. |
| Homeworld return | Sicor's RIDE concentration = natural return signal. Princess detects this. |
| Post-battle | Scattered ships regroup following return signals |

---

## ▌ 4. Physical Properties

### 4-1. Concentration Modulation

| Signal | Low | Medium | High | Extreme |
|--------|-----|--------|------|---------|
| Edictum | Routine maintenance | Attention call | Direct command | Imperial fury |
| Bellum | Alert | Engagement stations | Full assault | Self-destruct/hull cannon |
| Via | Direction suggestion | Maneuver order | Full-speed Rip | Emergency jump |
| Contio | Movement suggestion | Assembly order | Forced rally | Charge |

### 4-2. Volatility and Delivery Speed

| Volatility | Speed | Duration | Application |
|------------|-------|----------|-------------|
| High | 0.5 sec | Seconds | Battle primary (alert) |
| Medium | 2–5 sec | Minutes | Battle secondary (deployment) |
| Low | 10–30 sec | Hours | Edictum/Signum (long-term) |
| Ultra-low | Minutes | Days to permanent | Nutrix (caste differentiation) |

### 4-3. Amplification System

\`\`\`
Emperor (Throne Room, Floor 40)
  ↓ Emission
Chemical Signal Amplifier Tower (Floors 35–45)
  ↓ Amplification × 1,000
Floor Relays (all 80 floors)
  ↓ Final delivery
All crew reception (skin/nasal/oral receptors)

Total time: Under 0.5 seconds / Simultaneous: 80,000
\`\`\`

---

## ▌ 5. Signal Capability by Caste

| Caste | Emission | Reception | Special |
|-------|----------|-----------|---------|
| **Emperor** | All 7. Maximum output. | Full reception | Edictum monopoly |
| **Noble** | Bellum/Contio/Signum. Medium. | Full reception. Edictum readable. | 30–40% imprint. Intentional emission. |
| **Knight** | Contio/Signum. Low. | Primary reception | 80% imprint. 0.5-sec judgment window. |
| **Princess** | Via. Special output. | **Full spectrum + space detection** | RIDE resonance link |
| **Citizen** | Signum only. Faint. | Reception capable. Limited parsing. | Nurture assist |
| **Commoner** | Near zero emission. | **Reception specialized.** Instant response. | 100% imprint. Body reacts first. |

> **Core principle:** Higher caste = stronger emission. Lower caste = stronger reception.
> The Emperor speaks loudest. The commoner listens deepest.

---

## ▌ 6. What Humanity Cannot Understand

### "The Scent of Meaning"

\`\`\`
Humanity: "Commence battle" → hear → understand → judge → act
Neka:     Battle signal → smell → body reacts → (no judgment) → already acting
\`\`\`

Commoners do not "understand." The scent moves the muscle. This is why surrender is biologically impossible — without a cease signal, the battle compound remains in the body and the response continues.

### "The Terror of Silence"

For commoner soldiers, "signal absence" equals sensory deprivation. Not losing sight — **losing the reason for existence.**

> *Silence is a command. Signal absence = loss of purpose. Worse than death.*

### "Chemical Lies"

Nobles (30–40% imprint) can intentionally modulate their chemical signals — **chemical deception.** Commoners cannot detect it. Only nobles can sense another noble's "signal mismatch." This is why the Elder Council's 300-member politics is not "consensus" but **"chemical probing warfare."**

---

## ▌ 7. Human-Neka Symmetry

| Item | Humanity | Neka |
|------|----------|------|
| Communication | Language (symbols) | Chemistry (molecules) |
| Command chain | Consensus → order → interpretation → action | Signal → reaction (no interpretation) |
| Judgment | Individual | Emperor judges, commoners react |
| Deception | Through language (anyone) | Through chemistry (nobles only) |
| Silence | Discomfort | **Terror** |
| Enemy recognition | Data | Scent (humans = "scentless ghosts") |

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was recovered from the SIB         │
│  Linguistic Analysis Division archive.            │
└──────────────────────────────────────────────────┘
\`\`\`

*"For the Neka, communication and breathing are the same act."*
*"For us, silence is peace. For them, silence is death."*
*"And to them, we are 'scentless ghosts.' Something that exists but cannot be sensed."*
*"This may be the real reason they fear us."*

*Document No: SIB-CHEM-7SIG-001 | SIB Linguistic Analysis Division*`,
    },
  },
  "rpt-ride-rip-spatial-transit": {
    title: { ko: "RIDE Rip 공간 절개 도약 — 기술 분석 보고서", en: "RIDE Rip Spatial Incision Transit — Technical Analysis Report" },
    level: "RESTRICTED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  비밀조사국 기술정보부                   █████  │
│  ██  RIDE Rip 공간 절개 도약 기술 보고       █████  │
│  ██  "인류는 문을 만든다. 네카는 공간을 자른다" █  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# RIDE Rip 공간 절개 도약 — 기술 분석 보고서
**문서번호:** SIB-FTL-RIDERIP-001
**발행:** 비밀조사국 기술정보부
**문서 등급:** DA-3-A

---

## ▌ 1. 대칭 구조 — 인류는 문, 네카는 칼

\`\`\`
인류 (Gate):
  시공간을 "접어서" 양쪽을 이어 "문"을 만든다.
  문을 열고 걸어 들어간다.
  인프라를 깔아야 움직인다. 안전하다. 조용하다.

네카 (RIDE Rip):
  시공간을 "찢어서" 틈새로 "뚫고" 들어간다.
  니퍼로 자르듯 공간을 절개한다.
  인프라 없이 즉시 이동한다. 폭력적이다. 빛나고 소리난다.
\`\`\`

| 항목 | 인류 (Gate) | 네카 (RIDE Rip) |
|------|-----------|----------------|
| 은유 | **문** (열고 닫는다) | **니퍼/칼** (찢고 들어간다) |
| 원리 | 시공간 접힘 (Folding) | 시공간 절개 (Ripping) |
| 매개 | Gate 인프라 (HCTG 격자) | 함선 자체 (RIDE 선체) |
| 에너지 | 무한 (Gate 건재 시) | 유한 (RIDE 소모) |
| 시각 | 투명/조용 | **검은 균열. 공간에 금이 간다.** |
| 소리 | 없음 | RIDE 공명 + 12,000명 화학 반응 |
| 안전성 | SJC 판정 (ALLOW/HOLD/DENY) | 없음. 찢어지면 가는 거다. |

---

## ▌ 2. RIDE Rip 원리

RIDE 에너지 밀도(핵분열 ×180)를 함선 전방에 집중 방출 → 시공간 구조가 물리적 한계를 초과하여 **찢어진다.**

잘린 틈새(Rip)는 일시적으로 공간의 두 점을 직결하는 통로. 함선이 틈새 돌입 → 반대편 출현 → 틈새 자연 폐쇄.

---

## ▌ 3. 니퍼 (Nipper) — 함선 전방 절개 구조

| 항목 | 상세 |
|------|------|
| 위치 | 함선 최전방 함수(艦首) |
| 구조 | RIDE 합금 V자형 수렴 집속점 |
| 외형 | 네카 함선 전방이 뾰족/쐐기형인 이유 |
| 원리 | 함선 전체 RIDE → 전방 니퍼 수렴 → 폭발적 방출 → 시공간 절개 |
| 소모 | 도약 1회당 RIDE 총량 2~5% (거리 비례) |
| 재사용 | 니퍼 냉각 필요. 연속 도약 간격 10~30분. |

---

## ▌ 4. 절개 과정 — 4단계

### ① 축전 (Charge)
- 함선 전체 RIDE를 전방 니퍼로 수렴
- 후방/측면 RIDE 일시 약화 → **도약 직전이 가장 취약한 순간**
- 12,000명 축전조가 수동 에너지 흐름 관리

### ② 절개 (Rip)
- 니퍼에서 RIDE 폭발적 방출 → 시공간 찢어짐
- **시각:** 함선 앞에 **검은 금(crack)**. 주변 빛이 금 속으로 빨려 들어간다. 별빛이 일그러진다. 금이 벌어지며 **칠흑의 틈새**가 열린다.
- **소리:** RIDE 공명 진동. 12,000명 동시 화학 반응. **함선이 포효한다.**

### ③ 돌입 (Transit)
- 함선 전속 틈새 돌입
- Gate 통과(조용, 투명)와 대조적 — **함선 전체가 진동, 선체 스트레스**
- 네카 2.3m 거체 + RIDE 장갑이 스트레스를 버팀
- **인류 신체로는 견딜 수 없다** → 인류가 Gate를 만든 이유

### ④ 폐쇄 (Seal)
- 함선 통과 후 틈새 자연 폐쇄 (수 초)
- 시공간 반동(Backlash) 발생 → 주변 수천 km 미세 진동
- **이 반동이 비밀조사국이 네카 이동을 추적하는 유일한 단서**

---

## ▌ 5. 도약 스펙

| 함급 | 1회 도약 거리 | RIDE 소모 |
|------|-------------|----------|
| 초계함급 | ~2광년 | 2~3% |
| 프리깃급 | ~4광년 | 2~4% |
| 구축함급 | ~6광년 | 3~4% |
| 순양함급 | ~8광년 | 3~5% |
| 전함급 | ~10광년 | 4~5% |
| **황제함급** | **~15광년+** | **최대** |
| 연속 도약 간격 | 10~30분 (니퍼 냉각) | — |

### Gate vs Rip 비교

\`\`\`
인류 Gate:   4.7광년/회. 무한 사용. HOLD 12초. 안전.
             인프라 필요. 건설 수십 년. Gate 파괴 시 끝.

네카 RIDE Rip: 10광년/회. 유한 (RIDE 소모). 냉각 10~30분. 위험.
               인프라 불필요. 즉시 이동. RIDE 고갈 시 끝.

단기전: 네카 유리 (유연, 빠름, 어디든)
장기전: 인류 유리 (무한, 안전, 보급 안정)
\`\`\`

---

## ▌ 6. 시각적 대비

| 항목 | 인류 Gate | 네카 RIDE Rip |
|------|---------|-------------|
| 열리는 순간 | 아무것도 보이지 않는다. "거기 있었는지도 모르는 것." | 공간에 **검은 금**. 별빛이 빨려 든다. 함선이 포효. |
| 통과 중 | 조용. 투명. "지나갔나?" | 함선 전체 진동. 12,000명 화학 반응. |
| 닫히는 순간 | 아무 흔적 없음 | 시공간 반동. 수천 km 미세 진동. **흔적이 남는다.** |

---

## ▌ 7. 전략적 함의

### 기동 우세
Gate가 없는 RED 구역에서 네카의 기동 우세는 절대적. 인류는 Q-Launch에 의존하지만 네카는 RIDE Rip으로 즉시 이동. 은하 끝 3%에서 네카가 유리한 근본 이유.

### 흔적 탐지
비밀조사국은 Rip 폐쇄 시 시공간 반동 패턴을 분석하여:
- 도약 방향
- 도약 거리 (반동 강도 비례)
- 함대 규모 (반동 지속 시간 비례)
를 추정. 네카의 "인프라 없는 자유"에 대한 유일한 대응 수단.

### 공주의 역할
공주가 도약 목적지를 "느낀다." 안전한 절개 지점 지정. 공주 없이 Rip = **"어디로 찢어질지 모르는" 맹목 도약.**

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 비밀조사국 기술정보부 아카이브에서       │
│  복원됨.                                          │
└──────────────────────────────────────────────────┘
\`\`\`

*"인류는 문을 만든다. 네카는 공간을 자른다."*
*"문은 다시 닫히고 흔적이 없다. 칼자국은 떨림을 남긴다."*
*"그 떨림이 우리가 가진 유일한 단서입니다."*

*문서번호: SIB-FTL-RIDERIP-001 | 비밀조사국 기술정보부*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SIB Technical Intelligence Division     █████  │
│  ██  RIDE Rip — Spatial Incision Transit     █████  │
│  ██  "Humanity builds doors.                 █████  │
│  ██   The Neka cut through space."           █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# RIDE Rip Spatial Incision Transit — Technical Analysis Report
**Document No:** SIB-FTL-RIDERIP-001
**Issued by:** SIB Technical Intelligence Division
**Classification:** DA-3-A

---

## ▌ 1. Symmetry — Humanity Builds Doors, Neka Wield Blades

\`\`\`
Humanity (Gate):
  "Folds" spacetime to bridge two points — creates a "door."
  Opens the door and walks through.
  Requires infrastructure. Safe. Silent.

Neka (RIDE Rip):
  "Tears" spacetime and forces through the gap.
  Cuts space like wire-cutters (Nipper).
  No infrastructure needed. Immediate. Violent. Bright. Loud.
\`\`\`

| Item | Humanity (Gate) | Neka (RIDE Rip) |
|------|----------------|----------------|
| Metaphor | **Door** (open and close) | **Nipper/Blade** (tear and breach) |
| Principle | Spacetime folding | Spacetime incision (Ripping) |
| Medium | Gate infrastructure (HCTG lattice) | Ship itself (RIDE hull) |
| Energy | Unlimited (while Gate intact) | Finite (RIDE consumed) |
| Visual | Transparent/silent | **Black crack. Space fractures.** |
| Sound | None | RIDE resonance + 12,000-person chemical reaction |
| Safety | SJC judgment (ALLOW/HOLD/DENY) | None. Once torn, you go. |

---

## ▌ 2. RIDE Rip Principle

RIDE energy density (×180 nuclear fission) concentrated at ship's bow → spacetime structure exceeds physical limits and **tears open.**

The incision (Rip) temporarily creates a direct conduit between two spatial points. Ship enters gap → emerges at opposite end → gap naturally seals.

---

## ▌ 3. Nipper — Bow Incision Structure

| Item | Detail |
|------|--------|
| Location | Ship's foremost bow |
| Structure | RIDE alloy V-convergence focal point |
| Appearance | Why Neka ships have pointed/wedge-shaped bows |
| Principle | Ship-wide RIDE → converge to bow Nipper → explosive discharge → spacetime incision |
| Consumption | 2–5% of total RIDE per jump (distance-proportional) |
| Cooldown | 10–30 minutes between consecutive jumps |

---

## ▌ 4. Incision Process — 4 Stages

### ① Charge
- Ship-wide RIDE energy converges to bow Nipper
- Rear/flank RIDE temporarily weakens → **most vulnerable moment before jump**
- 12,000-person charge crew manually manages energy flow

### ② Rip (Incision)
- Explosive RIDE discharge from Nipper → spacetime tears
- **Visual:** A **black crack** appears before the ship. Surrounding light is sucked into it. Starlight distorts. The crack widens into a **pitch-black gap.**
- **Sound:** RIDE resonance vibration. 12,000 simultaneous chemical reactions. **The ship roars.**

### ③ Transit
- Ship plunges into gap at full speed
- Contrasts with Gate transit (silent, transparent) — **entire ship vibrates, hull stress**
- Neka 2.3m physique + RIDE armor withstands the stress
- **Human bodies cannot endure this** → why humanity invented Gates

### ④ Seal (Closure)
- Gap naturally closes seconds after ship passes through
- Spacetime backlash occurs → micro-vibrations across thousands of km
- **This backlash is the SIB's only means of tracking Neka fleet movements**

---

## ▌ 5. Jump Specifications

| Ship Class | Max Jump Distance | RIDE Consumption |
|------------|------------------|-----------------|
| Corvette | ~2 light-years | 2–3% |
| Frigate | ~4 light-years | 2–4% |
| Destroyer | ~6 light-years | 3–4% |
| Cruiser | ~8 light-years | 3–5% |
| Battleship | ~10 light-years | 4–5% |
| **Emperor-class** | **~15 light-years+** | **Maximum** |
| Consecutive interval | 10–30 min (Nipper cooling) | — |

### Gate vs Rip Comparison

\`\`\`
Humanity Gate:  4.7 ly/jump. Unlimited use. 12-sec HOLD. Safe.
                Infrastructure required. Decades to build. Destroyed = done.

Neka RIDE Rip:  10 ly/jump. Finite (RIDE consumed). 10–30 min cooldown. Dangerous.
                No infrastructure. Immediate transit. RIDE depletion = done.

Short war: Neka advantage (flexible, fast, anywhere)
Long war:  Humanity advantage (unlimited, safe, stable supply)
\`\`\`

---

## ▌ 6. Visual Contrast

| Moment | Humanity Gate | Neka RIDE Rip |
|--------|-------------|--------------|
| Opening | Nothing visible. "You wouldn't know it was there." | **Black crack** in space. Starlight sucked in. Ship roars. |
| Transit | Silent. Transparent. "Did we pass through?" | Entire ship vibrates. 12,000-person chemical storm. |
| Closing | No trace remains | Spacetime backlash. Micro-vibrations for thousands of km. **Traces remain.** |

---

## ▌ 7. Strategic Implications

### Maneuver Superiority
In the RED zone where no Gates exist, Neka maneuver superiority is absolute. Humanity relies on Q-Launch; Neka uses RIDE Rip for instant transit. The fundamental reason Neka dominates the galactic fringe 3%.

### Trace Detection
The SIB analyzes Rip closure backlash patterns to estimate:
- Jump direction
- Jump distance (proportional to backlash intensity)
- Fleet size (proportional to backlash duration)

The only countermeasure against Neka's "infrastructure-free freedom."

### Princess Role
The princess "senses" the jump destination and designates safe incision points. Rip without a princess = **"blind jump to an unknown destination."**

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was recovered from the SIB         │
│  Technical Intelligence Division archive.         │
└──────────────────────────────────────────────────┘
\`\`\`

*"Humanity builds doors. The Neka cut through space."*
*"Doors close and leave no trace. Blade-marks leave tremors."*
*"Those tremors are the only clue we have."*

*Document No: SIB-FTL-RIDERIP-001 | SIB Technical Intelligence Division*`,
    },
  },
  "rpt-princeps-fire-control": {
    title: { ko: "공주(Princeps) — 네카 우주 탐지·사격관제 체계", en: "Princeps — Neka Space Detection & Fire Control System" },
    level: "CLASSIFIED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  비밀조사국 정보분석관실                 █████  │
│  ██  공주(Princeps) 탐지·사격관제 체계       █████  │
│  ██  "네카에는 센서가 없다. 대신 '보는       █████  │
│  ██   사람'이 있다."                         █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 공주(Princeps) — 네카 우주 탐지·사격관제 체계
**문서번호:** SIB-NEKA-PRINCEPS-001
**발행:** 비밀조사국 정보분석관실
**문서 등급:** DA-2-B

---

## ▌ 1. 문제 — 화학신호는 우주에서 전달되지 않는다

네카의 모든 체계는 화학신호 기반. 그러나 우주는 진공. 함선 내부에서는 작동하지만, 함선 밖의 적을 탐지하는 것은 화학신호만으로 불가능.

인류는 AI(SJC)와 전자 센서로 해결. 네카에는 AI도 센서도 없다.

**네카는 이 문제를 생체로 해결했다.**

---

## ▌ 2. 공주 — 정체

공주(Princeps)는 네카의 **제6 카스트.** 전체 인구의 0.001% 미만 극희소 돌연변이.

전자기파, 중력 미세 변동, 열복사, 입자 방출을 **생체적으로 감지**하도록 분화된 존재. 인류의 전자 센서가 하는 일을 신체 기관으로 수행.

### 생물학적 감지 기관

| 감지 영역 | 생체 기관 | 인류 대응 장비 |
|----------|---------|-------------|
| 전자기파 (라디오~감마선) | 피부 하 전자기 수용 세포층 | 광역 센서 어레이 |
| 중력 미세 변동 | 내이 확장 기관 (평형석 변형) | 중력파 탐지기 |
| 열복사 (적외선) | 안면부 피트 기관 | 적외선 센서 |
| 입자 방출 (하전 입자) | 표피 이온 수용체 | 입자 검출기 |
| 진동/공명 | 골격 전체 공명 구조 | 구조 진동 센서 |

외형: 피부 반투명, 머리카락 없음, 눈 퇴화 — 전자기 전체 스펙트럼을 "보기" 때문에 눈 불필요.

---

## ▌ 3. RIDE의 딸

공주는 단순한 감각 돌연변이가 아니다. **RIDE에 생체 적합성을 지닌 유일한 카스트.**

### RIDE 섭취

| 항목 | 상세 |
|------|------|
| 형태 | 미세 결정 분말 / RIDE 용액 (공명 가소성 나노 입자) |
| 빈도 | 3~7일 간격 정기 섭취. 중단 시 감각 쇠퇴. |
| 체내 경로 | RIDE 나노 입자 → 감각 세포층 결합 → 전자기 수용체 감도 증폭 |
| 부작용 | 수명 단축의 근본 원인. RIDE가 감각을 증폭하며 세포를 소모. |
| 타 카스트 섭취 시 | 독성 반응. 내장 손상. 사망. |

### 발생 조건

- RIDE 광산 행성 근방에서 발생률 높음
- RIDE 공명 환경에 태아 감각 세포 노출 → RIDE 주파수에 동조하도록 분화
- **RIDE가 네카 중에서 자신과 호환되는 개체를 만들어낸 것**

### 함선과의 공명

\`\`\`
함선 외벽 RIDE 합금 + 공주 체내 RIDE 나노 입자 = 공명
→ 감각실에서 "함선 전체가 공주의 감각 기관이 되는" 원리

인류 대칭:
  탑승자: 인간이 기계를 움직인다 (EH → 함선)
  공주: 물질이 인간을 통해 감각한다 (RIDE → 공주)
  방향이 반대.
\`\`\`

---

## ▌ 4. 10등급 체계

공주의 등급 = **동시 관제 가능 함선 수.** 출생 시 생물학적으로 결정. 훈련으로 5등급 이상 불가.

| 등급 | 관제 함선 | 탐지 범위 | 동시 목표 | 배치 | 제국 내 인원 |
|------|---------|---------|---------|------|-----------|
| **1등급** | **100척** | 300,000km+ | 100+ | 황제함 전용 | **1명** |
| 2등급 | 50척 | 200,000km+ | 60+ | 대함대 기함 | 2~3명 |
| 3등급 | 30척 | 150,000km | 40+ | 군단 기함 | 10~15명 |
| 4등급 | 15척 | 120,000km | 25 | 분함대 기함 | 20~30명 |
| 5등급 | 8척 | 100,000km | 15 | 전함급 | 30~50명 |
| 6등급 | 4척 | 80,000km | 10 | 순양함급 | 50~80명 |
| 7등급 | 2척 | 60,000km | 6 | 구축함급 | 60~100명 |
| 8등급 | 1척 | 50,000km | 4 | 프리깃급 | 80~120명 |
| 9등급 | 1척(제한) | 30,000km | 2 | 초계함급 | 50~80명 |
| 10등급 | 1척(최소) | 15,000km | 1 | 예비/훈련 | 30~50명 |
| | | | | **합계** | **약 350~550명** |

### 1등급 — "제국의 눈"

제국 전체 1명. 황제함 탑승. 100척 함대의 탐지·관제를 혼자 처리.
황제의 화학신호를 직접 수신하며, 탐지 정보를 황제에게 직접 전달하는 유일한 경로.

수명 100~120년. RIDE 섭취량이 가장 많기 때문.

---

## ▌ 5. 탐지-사격관제 체계

\`\`\`
우주 공간
  ↓
[공주] ← 전자기파/중력변동/열복사/입자방출 생체 감지
  ↓
[화학 변환] ← 감지 데이터를 화학신호로 인코딩 (공주만 가능)
  ↓
[증폭·분배] ← 함장(귀족)에게 상황 전달 + 축전/조준/발사조에 제원 전달
  ↓
[사격 실행] ← 황제 화학신호 발사 명령 → 0.5초 내 실행
\`\`\`

### SJC vs 공주

| 항목 | 인류 (SJC) | 네카 (공주) |
|------|-----------|-----------|
| 데이터 | 디지털 좌표 (정확) | 화학신호 (감각적 인상) |
| 동시 처리 | 수천 목표 | 수십 목표 |
| 피로 | 없음 (기계) | 있음. 감각 과부하. |
| 교란 | 전자전 재밍 유효 | 화학 교란 무효. **전자기 미끼만 유효.** |
| 대체 | 센서 교체 가능 | **대체 불가.** 사망 시 함선 맹목. |
| 판단 | AI 보조 | **공주의 "느낌" 포함** |

> *SJC: "적 3척. 방위 045. 거리 47,000km. 충전률 78%."*
> *공주: "저쪽에 셋. 가운데 것이 크다. 뭔가 모으고 있다. 불안하다."*
> *"불안하다"는 데이터가 아니다. 그러나 수백 년의 경험이 공주의 느낌이 정확하다는 것을 증명했다.*

---

## ▌ 6. 황제함 공주 편성

| 등급 | 인원 | 위치 | 역할 |
|------|------|------|------|
| **1등급** | 1명 | 중앙 39층 (왕좌실 바로 아래) | 함대 100척 전체 관제. 황제 직결. |
| 2등급 | 1명 | 전방 55층 감각실 | 전방 주 탐지 + 1등급 보좌 |
| 3등급 | 1명 | 전방 45층 감각실 | 근접 정밀 탐지 |
| 4등급 | 2명 | 좌현/우현 40층 | 측면 + 후방 |
| 5등급 | 1명 | 중앙 38층 | 예비. 사망 교체용. |

---

## ▌ 7. 공주 무력화 전략

| 상실 등급 | 영향 | 복구 |
|----------|------|------|
| 10~8등급 | 해당 함선 탐지 저하 | 재배치 (수 주) |
| 7~5등급 | 분함대 탐지 저하~상실 | 하위 등급 대체 (성능 저하) |
| 4~3등급 | 군단 탐지 반감 | 대체 불가. 재편 (수 개월) |
| 2등급 | 황제함 보좌 상실 | 3등급 승격 (저하) |
| **1등급** | **함대 전체 관제 붕괴** | **대체 불가. 수십 년.** |

> *비밀조사국 결론:*
> *"1등급 공주를 제거하면 100척 함대가 100개 낱개 함선으로 분해된다."*
> *"공주를 죽이는 것이 가장 효율적이다. 그러나 위치 파악 자체가 어렵다."*

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 비밀조사국 정보분석관실 아카이브에서     │
│  복원됨.                                          │
└──────────────────────────────────────────────────┘
\`\`\`

*"네카에는 센서가 없습니다. 대신 '보는 사람'이 있습니다."*
*"그 사람이 죽으면 4km짜리 함선이 장님이 됩니다."*
*"그 사람을 죽이는 것이 우리의 우선순위입니다."*

*문서번호: SIB-NEKA-PRINCEPS-001 | 비밀조사국 정보분석관실*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SIB Intelligence Analysis Division      █████  │
│  ██  Princeps — Detection & Fire Control     █████  │
│  ██  "The Neka have no sensors. They have    █████  │
│  ██   a person who sees."                    █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Princeps — Neka Space Detection & Fire Control System
**Document No:** SIB-NEKA-PRINCEPS-001
**Issued by:** SIB Intelligence Analysis Division
**Classification:** DA-2-B

---

## ▌ 1. The Problem — Chemical Signals Do Not Transmit in Space

All Neka systems are chemistry-based. But space is vacuum. Inside the ship, chemical signals function. Detecting enemies outside the ship cannot be done with chemistry alone.

Humanity solved this with AI (SJC) and electronic sensors. The Neka have neither.

**The Neka solved this problem biologically.**

---

## ▌ 2. Princeps — Identity

Princeps is the Neka **6th caste.** An ultra-rare mutation occurring in less than 0.001% of the population.

A being differentiated to **biologically sense** electromagnetic radiation, micro-gravitational fluctuations, thermal radiation, and particle emissions. Performing with biological organs what humanity's electronic sensors do.

### Biological Sensory Organs

| Detection Domain | Biological Organ | Human Equivalent |
|-----------------|-----------------|-----------------|
| EM radiation (radio–gamma) | Sub-dermal EM receptor cell layer | Wide-band sensor array |
| Micro-gravity fluctuation | Expanded inner ear (otolith variant) | Gravitational wave detector |
| Thermal radiation (IR) | Facial pit organ (analogous to pit vipers) | Infrared sensor |
| Particle emission (charged) | Epidermal ion receptors | Particle detector |
| Vibration/resonance | Full-skeleton resonance structure | Structural vibration sensor |

Appearance: Near-translucent skin, no hair, vestigial eyes — unnecessary when "seeing" the entire EM spectrum.

---

## ▌ 3. Daughter of RIDE

Princeps is not merely a sensory mutant. **The only caste with biological RIDE compatibility.**

### RIDE Ingestion

| Item | Detail |
|------|--------|
| Form | Micro-crystalline powder / RIDE solution (resonance-plastic nanoparticles) |
| Frequency | Regular ingestion every 3–7 days. Cessation → sensory decline. |
| Internal pathway | RIDE nanoparticles → bind to sensory cell layer → amplify EM receptor sensitivity |
| Side effect | Root cause of shortened lifespan. RIDE amplifies senses while consuming cells. |
| Other castes | Toxic reaction. Organ damage. Death. |

### Emergence Conditions

- Higher occurrence rate near RIDE mining planets
- Fetal sensory cells exposed to RIDE resonance → differentiate to sync with RIDE frequency
- **RIDE creates compatible individuals from among the Neka — not the reverse**

### Ship Resonance

\`\`\`
Ship hull RIDE alloy + Princeps internal RIDE nanoparticles = Resonance
→ In the sensory chamber, "the entire ship becomes the Princeps's sensory organ"

Human symmetry:
  Boarder: Human moves machine (EH → ship)
  Princeps: Material senses through human (RIDE → Princeps)
  Direction is reversed.
\`\`\`

---

## ▌ 4. 10-Grade System

Grade = **simultaneous fleet control capacity.** Determined biologically at birth. Training cannot exceed Grade 5.

| Grade | Ships Controlled | Detection Range | Simultaneous Targets | Deployment | Empire-wide |
|-------|-----------------|----------------|---------------------|-----------|------------|
| **1st** | **100** | 300,000km+ | 100+ | Emperor-ship only | **1** |
| 2nd | 50 | 200,000km+ | 60+ | Grand fleet flagship | 2–3 |
| 3rd | 30 | 150,000km | 40+ | Legion flagship | 10–15 |
| 4th | 15 | 120,000km | 25 | Sub-fleet flagship | 20–30 |
| 5th | 8 | 100,000km | 15 | Battleship | 30–50 |
| 6th | 4 | 80,000km | 10 | Cruiser | 50–80 |
| 7th | 2 | 60,000km | 6 | Destroyer | 60–100 |
| 8th | 1 | 50,000km | 4 | Frigate | 80–120 |
| 9th | 1 (limited) | 30,000km | 2 | Corvette | 50–80 |
| 10th | 1 (minimum) | 15,000km | 1 | Reserve/training | 30–50 |
| | | | | **Total** | **~350–550** |

### 1st Grade — "The Eye of the Empire"

One in the entire empire. Aboard the Emperor-ship. Processes detection and fire control for 100 ships alone.
Only channel receiving Emperor's chemical signals directly and transmitting detection data directly to the Emperor.

Lifespan 100–120 years. Highest RIDE ingestion volume.

---

## ▌ 5. Detection-to-Fire Chain

\`\`\`
Space
  ↓
[Princeps] ← EM/gravity/thermal/particle biological detection
  ↓
[Chemical Translation] ← Encodes sensory data as chemical signals (Princeps only)
  ↓
[Amplification/Distribution] ← Situation to captain (noble) + firing data to charge/aim/fire crews
  ↓
[Fire Execution] ← Emperor chemical signal fire command → 0.5-sec execution
\`\`\`

### SJC vs Princeps

| Item | Humanity (SJC) | Neka (Princeps) |
|------|---------------|----------------|
| Data format | Digital coordinates (precise) | Chemical signals (sensory impression) |
| Simultaneous targets | Thousands | Dozens |
| Fatigue | None (machine) | Yes. Sensory overload. |
| Jamming | Electronic warfare effective | Chemical jamming ineffective. **Only EM decoys work.** |
| Replacement | Sensors replaceable | **Irreplaceable.** Death = ship goes blind. |
| Judgment | AI-assisted | **Includes the Princeps's "feeling"** |

> *SJC: "3 hostile ships. Bearing 045. Range 47,000km. Charge level 78%."*
> *Princeps: "Three over there. The middle one is large. Gathering something. I feel uneasy."*
> *"Uneasy" is not data. But centuries of experience proved the Princeps's feelings are often accurate.*

---

## ▌ 6. Emperor-Ship Princeps Formation

| Grade | Count | Location | Role |
|-------|-------|----------|------|
| **1st** | 1 | Central Floor 39 (directly below throne) | Full 100-ship fleet control. Direct to Emperor. |
| 2nd | 1 | Forward Floor 55 sensory chamber | Forward primary detection + 1st-grade support |
| 3rd | 1 | Forward Floor 45 sensory chamber | Close-range precision detection |
| 4th | 2 | Port/Starboard Floor 40 | Flank + rear |
| 5th | 1 | Central Floor 38 | Reserve. Replacement for casualties. |

---

## ▌ 7. Princeps Neutralization Strategy

| Grade Lost | Impact | Recovery |
|-----------|--------|----------|
| 10th–8th | Single ship detection degraded | Reassignment (weeks) |
| 7th–5th | Sub-fleet detection degraded to lost | Lower-grade substitute (reduced capability) |
| 4th–3rd | Legion detection halved | Irreplaceable. Reorganization (months) |
| 2nd | Emperor-ship support lost | 3rd-grade promotion (reduced) |
| **1st** | **Entire fleet control collapses** | **Irreplaceable. Decades until next 1st-grade birth.** |

> *SIB conclusion:*
> *"Eliminating the 1st-grade Princeps decomposes a 100-ship fleet into 100 individual ships."*
> *"Killing the Princeps is the most efficient approach. But locating them is the challenge."*

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was recovered from the SIB         │
│  Intelligence Analysis Division archive.          │
└──────────────────────────────────────────────────┘
\`\`\`

*"The Neka have no sensors. They have a person who sees."*
*"When that person dies, a 4km ship goes blind."*
*"Killing that person is our priority."*

*Document No: SIB-NEKA-PRINCEPS-001 | SIB Intelligence Analysis Division*`,
    },
  },
  "rpt-imperator-structure": {
    title: { ko: "황제함 임페라토르(NIV-E) — 내부 구조 분석", en: "Emperor-Ship Imperator (NIV-E) — Internal Structure Analysis" },
    level: "CLASSIFIED",
    category: "TECHNOLOGY",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  비밀조사국 정보분석관실                 █████  │
│  ██  황제함 임페라토르 내부 구조 분석         █████  │
│  ██  "이 함선은 도시입니다. 도시에는 이름    █████  │
│  ██   없는 사람이 6만 명 있습니다."          █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 황제함 임페라토르(NIV-E) — 내부 구조 분석
**문서번호:** SIB-NEKA-IMPERATOR-001
**발행:** 비밀조사국 정보분석관실
**문서 등급:** DA-2-B

---

## ▌ 1. 기본 제원

| 항목 | 수치 |
|------|------|
| 식별 | NIV-E 001 |
| 전장 | 4,000m (4km) |
| 최대 폭 | 약 1,200m |
| 최대 높이 | 약 400m (80층) |
| 총 톤수 | 1,200,000t |
| 승무원 | 80,000명 |
| 드론/AI/안드로이드 | **없음** |
| 왕좌 | 신경계 물리 연결 |
| 화학신호 범위 | 함내 전체 + 함외 수만 km |
| 전 제국 보유 | 1~3척 |

> *임페라토르는 전함이 아니다. 이동하는 도시다.*

---

## ▌ 2. 구역 배치

\`\`\`
전장 4km 기준:
  전방 0~1.5km:    전투 구역
  중앙 1.5~2.5km:  황제 거처
  후방 2.5~4.0km:  좌현 거주 + 우현 생산
\`\`\`

\`\`\`
           ┌─────────────────┐
           │   중앙: 황제 거처 │
  ┌────────┤  왕좌/의전/지휘/ ├────────┐
  │        │  근위대         │        │
  │        └─────────────────┘        │
  │ 좌현                     우현      │
  │ 승무원 거주              생산 시설  │
  │ (숙소/식당/의료/         (무장/정비/ │
  │  훈련/종교)              RIDE/보급)  │
  └───────────────────────────────────┘
           │
  ┌────────┴────────┐
  │  전방: 전투 구역  │
  │ 함교/무장/격납/장갑│
  └─────────────────┘
\`\`\`

---

## ▌ 3. 구역별 상세

### 3-1. 중앙 — 황제 거처 (1.5~2.5km)

| 시설 | 층 | 상세 |
|------|-----|------|
| **왕좌실** | 40층 (정중앙) | 기하학적 중심. 왕좌와 신경계 물리 연결. 천장 높이 30m. |
| **화학신호 증폭탑** | 35~45층 | 왕좌실 둘러싼 증폭 중계. 파괴 시 명령 체계 붕괴. |
| **의전 광장** | 38~42층 | 개선식 거행. 5,000명 수용. 역대 암살의 절반이 이 광장. |
| **원로회 회의장** | 36~38층 | 원로회 300인 공간. |
| **근위대(XI군단)** | 30~50층 전체 | 왕좌실 360도 방어. 상시 5,000명 경호. |
| **황제 개인 구역** | 41~45층 | 왕좌 분리 시간 최소화를 위해 바로 위. |

> *함선의 중심이 전투실이 아니라 왕좌실이다. 이 함선의 존재 이유는 전쟁이 아니라 황제다.*

### 3-2. 전방 — 전투 구역 (0~1.5km)

| 시설 | 층 | 상세 |
|------|-----|------|
| **주 함교** | 60층 | 함장(귀족) 지휘. 황제 신호가 모든 명령에 우선. |
| **보조 함교** | 55/65층 | 3중 이중화. |
| **주포 구역** | 20~40층 | RIDE 에너지 무기. 방전 시 "절대흑" — 빛을 흡수하는 방전. |
| **격납고** | 1~15층 | 돌격정 200~300기 + 돌격병 10,000명 대기. |
| **전방 장갑** | 외벽 전체 | RIDE 결정 성장 장갑. 두께 50~80m. 인류 무기 7발에도 관통 불확실. |

> *격납고에 10,000명이 대기한다. 인류는 드론 480기를 보내고, 네카는 사람 10,000명을 보낸다.*

### 3-3. 좌현 — 승무원 거주지 (2.5~4.0km)

| 시설 | 층 | 상세 |
|------|-----|------|
| **평민 병사 숙소** | 1~30층 | 60,000명. 이름 없음, 번호만. |
| **기사 숙소** | 31~50층 | 5,000명. 개인 공간 있음. |
| **귀족 거처** | 51~65층 | 500명. 가문별 구획. 이 구역만 "개인"이 존재. |
| **의료 구역** | 25~30층 | 카스트별 차등. 평민은 치료/폐기 판정. |
| **종교 구역** | 55~60층 | 화학신호 집단 수신 의식 = 종교와 구분 불가. |

### 3-4. 우현 — 생산 시설 (2.5~4.0km)

| 시설 | 층 | 상세 |
|------|-----|------|
| **RIDE 충전소** | 1~15층 | 고갈 시 함선 사망. |
| **무장 생산** | 16~35층 | 사람이 직접 조립. |
| **함선 정비** | 36~50층 | RIDE 결정 성장 촉진제 투입. |
| **보급 창고** | 51~65층 | 80,000명 × 수개월분. |
| **폐기 구역** | 76~80층 | 전사자 → RIDE 결정 환원. 유기물이 결정 성장의 영양. |

> *전사자가 함선의 재료가 된다. 네카에게 죽음은 끝이 아니라 환원.*

---

## ▌ 4. 인원 배치 — 80,000명의 도시

| 카스트 | 인원 | 비율 | 각인 | 수명 |
|--------|------|------|------|------|
| 황제 | 1 | — | 0% | 1,000년+ |
| 귀족 | 500 | 0.63% | 30~40% | 500년 |
| 기사 | 10,000 | 12.50% | ~80% | 200~300년 |
| 평민 | 69,499 | 86.87% | 100% | 5~80년 |
| **총계** | **80,000** | | | |

### 카스트별 1인당 공간

| 카스트 | 거주 면적 |
|--------|---------|
| 황제 | 왕좌실 + 5층 전용 (함선의 0.5%) |
| 귀족 | 80~120㎡ |
| 근위 기사 | 15~20㎡ |
| 일반 기사 | 12~15㎡ |
| 평민 병사 | **2~3㎡** (다층 침상) |
| 평민 노동 | **1.5~2㎡** |

### 구역별 인원 분포

| 구역 | 인원 | 비율 |
|------|------|------|
| 중앙 (황제 거처) | 5,701 | 7.1% |
| 전방 (전투) | 24,000 | 30.0% |
| 좌현 (거주) | 24,299 | 30.4% |
| 우현 (생산) | 16,500 | 20.6% |
| 교대/이동 | 9,500 | 11.9% |

---

## ▌ 5. 수직 구조

\`\`\`
80층 ─── 폐기/환원
65층 ─── 귀족 거처 / 보급
60층 ─── 주 함교 / 종교
55층 ─── 통신/전자전
50층 ─── 근위대 상부 / 기사 숙소 / 정비
45층 ─── 황제 개인 구역
40층 ─── ★ 왕좌실 (정중앙) ★
38층 ─── 의전 광장
36층 ─── 원로회
35층 ─── 화학신호 증폭탑
30층 ─── 근위대 하부 / 평민 상부 / 무장 생산
20층 ─── 주포 / 훈련
15층 ─── 격납고 / RIDE 충전소
 1층 ─── 전방 장갑 / 평민 최하층
\`\`\`

> *1층 = 바닥이 아니라 최전선. 전투 시 1층부터 파괴된다.*
> *평민 병사 숙소가 가장 낮은 층인 이유.*

---

## ▌ 6. 약점 분석

| 약점 | 위치 | 효과 |
|------|------|------|
| **화학신호 증폭탑** | 중앙 35~45층 | 파괴 시 명령 붕괴. 80,000명 개별 판단 = 죽음보다 나쁨. |
| **RIDE 충전소** | 우현 1~15층 | 파괴 시 에너지 고갈. 함선 사망. |
| **왕좌실** | 중앙 40층 | 황제 사망 시 전 제국 각인 해제. 근위대 5,000명 방어. |

> *비밀조사국 결론:*
> *"임페라토르를 정면에서 파괴하는 것은 불가능."*
> *"증폭탑을 노리거나, RIDE 보급선을 차단하여 에너지 고갈을 기다리는 것이 유일한 전략."*

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 비밀조사국 정보분석관실 아카이브에서     │
│  복원됨.                                          │
└──────────────────────────────────────────────────┘
\`\`\`

*"이 함선은 도시입니다. 도시를 한 사람이 통제하고 있습니다."*
*"그리고 그 도시에는 이름이 없는 사람이 6만 명 있습니다."*

*문서번호: SIB-NEKA-IMPERATOR-001 | 비밀조사국 정보분석관실*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SIB Intelligence Analysis Division      █████  │
│  ██  Emperor-Ship Imperator — Internal       █████  │
│  ██  Structure Analysis                      █████  │
│  ██  "This ship is a city. And in that city, █████  │
│  ██   60,000 people have no name."           █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# Emperor-Ship Imperator (NIV-E) — Internal Structure Analysis
**Document No:** SIB-NEKA-IMPERATOR-001
**Issued by:** SIB Intelligence Analysis Division
**Classification:** DA-2-B

---

## ▌ 1. Base Specifications

| Item | Value |
|------|-------|
| Designation | NIV-E 001 |
| Length | 4,000m (4km) |
| Max beam | Approx. 1,200m |
| Max height | Approx. 400m (80 floors) |
| Displacement | 1,200,000t |
| Crew | 80,000 |
| Drones/AI/Androids | **None** |
| Throne | Neural-physical interface |
| Chemical signal range | Ship-wide + tens of thousands km external |
| Empire-wide inventory | 1–3 vessels |

> *The Imperator is not a warship. It is a moving city.*

---

## ▌ 2. Zone Layout

\`\`\`
4km length:
  Forward 0–1.5km:     Combat zone
  Central 1.5–2.5km:   Imperial quarters
  Aft 2.5–4.0km:       Port crew quarters + Starboard production
\`\`\`

---

## ▌ 3. Zone Details

### 3-1. Central — Imperial Quarters (1.5–2.5km)

| Facility | Floor | Detail |
|----------|-------|--------|
| **Throne Room** | 40 (geometric center) | Neural-physical connection. 30m ceiling. |
| **Chemical Signal Amplifier Tower** | 35–45 | Surrounds throne. Destruction = command chain collapse. |
| **Ceremonial Plaza** | 38–42 | Triumph ceremonies. 5,000 capacity. Half of all historical assassinations here. |
| **Elder Council Chamber** | 36–38 | 300-member council space. |
| **Imperial Guard (XI Legion)** | 30–50 entire | 360-degree throne defense. 5,000 permanent guard. |
| **Emperor Private Quarters** | 41–45 | Directly above throne to minimize disconnection time. |

> *The ship's center is not the battle bridge — it is the throne room. This ship exists not for war, but for the Emperor.*

### 3-2. Forward — Combat Zone (0–1.5km)

| Facility | Floor | Detail |
|----------|-------|--------|
| **Main Bridge** | 60 | Captain (noble) commands. Emperor's signal overrides all. |
| **Auxiliary Bridges** | 55/65 | Triple redundancy. |
| **Main Battery** | 20–40 | RIDE energy weapons. Discharge = "absolute black" — light-absorbing emission. |
| **Hangar** | 1–15 | 200–300 assault craft + 10,000 assault troops on standby. |
| **Forward Armor** | Entire hull | RIDE crystal-growth armor. 50–80m thick. Uncertain penetration even after 7 human weapon hits. |

> *10,000 people wait in the hangar. Humanity sends 480 drones. The Neka send 10,000 people.*

### 3-3. Port — Crew Quarters (2.5–4.0km)

| Facility | Floor | Detail |
|----------|-------|--------|
| **Commoner Barracks** | 1–30 | 60,000 capacity. No names, only numbers. |
| **Knight Quarters** | 31–50 | 5,000 capacity. Individual space. |
| **Noble Residences** | 51–65 | 500 capacity. Clan sectors. Only zone where "individual" exists. |
| **Medical Zone** | 25–30 | Caste-differentiated. Commoners: triage between treatment/disposal. |
| **Religious Zone** | 55–60 | Mass chemical signal reception ritual = indistinguishable from religion. |

### 3-4. Starboard — Production Facilities (2.5–4.0km)

| Facility | Floor | Detail |
|----------|-------|--------|
| **RIDE Charging Station** | 1–15 | Depletion = ship death. |
| **Weapons Manufacturing** | 16–35 | Manual assembly by crew. |
| **Ship Maintenance** | 36–50 | RIDE crystal growth accelerant application. |
| **Supply Storage** | 51–65 | 80,000 personnel × months of provisions. |
| **Disposal Zone** | 76–80 | Fallen crew → RIDE crystal reduction. Organic matter becomes crystal growth nutrient. |

> *The dead become ship material. For the Neka, death is not an end — it is reduction.*

---

## ▌ 4. Personnel — A City of 80,000

| Caste | Count | % | Imprint | Lifespan |
|-------|-------|---|---------|----------|
| Emperor | 1 | — | 0% | 1,000+ yrs |
| Noble | 500 | 0.63% | 30–40% | 500 yrs |
| Knight | 10,000 | 12.50% | ~80% | 200–300 yrs |
| Commoner | 69,499 | 86.87% | 100% | 5–80 yrs |
| **Total** | **80,000** | | | |

### Per-Capita Living Space

| Caste | Area |
|-------|------|
| Emperor | Throne room + 5 private floors (0.5% of ship) |
| Noble | 80–120 m² |
| Imperial Guard Knight | 15–20 m² |
| Standard Knight | 12–15 m² |
| Commoner Soldier | **2–3 m²** (multi-tier bunks) |
| Commoner Laborer | **1.5–2 m²** |

### Zone Distribution

| Zone | Personnel | % |
|------|-----------|---|
| Central (Imperial) | 5,701 | 7.1% |
| Forward (Combat) | 24,000 | 30.0% |
| Port (Quarters) | 24,299 | 30.4% |
| Starboard (Production) | 16,500 | 20.6% |
| Shift rotation/transit | 9,500 | 11.9% |

---

## ▌ 5. Vertical Structure

\`\`\`
Floor 80 ─── Disposal/Reduction
Floor 65 ─── Noble residences / Supply
Floor 60 ─── Main bridge / Religious zone
Floor 55 ─── Communications/EW
Floor 50 ─── Guard upper / Knight quarters / Maintenance
Floor 45 ─── Emperor private quarters
Floor 40 ─── ★ THRONE ROOM (geometric center) ★
Floor 38 ─── Ceremonial plaza
Floor 36 ─── Elder Council
Floor 35 ─── Chemical signal amplifier tower
Floor 30 ─── Guard lower / Commoner upper / Weapons production
Floor 20 ─── Main battery / Training
Floor 15 ─── Hangar / RIDE charging
Floor  1 ─── Forward armor / Commoner lowest / RIDE lowest
\`\`\`

> *Floor 1 is not the bottom — it is the front line. In combat, Floor 1 is destroyed first.*
> *This is why commoner barracks occupy the lowest floors.*

---

## ▌ 6. Vulnerability Analysis

| Vulnerability | Location | Effect |
|--------------|----------|--------|
| **Chemical Signal Amplifier** | Central 35–45 | Destruction = command collapse. 80,000 individuals judging alone = worse than death. |
| **RIDE Charging Station** | Starboard 1–15 | Destruction = energy depletion. Ship death. |
| **Throne Room** | Central 40 | Emperor death = empire-wide imprint release. Defended by 5,000 guards. |

> *SIB conclusion:*
> *"Destroying the Imperator head-on is impossible."*
> *"Target the amplifier tower, or interdict RIDE supply ships and wait for energy depletion. These are the only viable strategies."*

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document was recovered from the SIB         │
│  Intelligence Analysis Division archive.          │
└──────────────────────────────────────────────────┘
\`\`\`

*"This ship is a city. One person controls that city."*
*"And in that city, 60,000 people have no name."*

*Document No: SIB-NEKA-IMPERATOR-001 | SIB Intelligence Analysis Division*`,
    },
  },
  "rpt-sib-agent-depth": {
    title: { ko: "비밀조사국 요원 등급 체계", en: "SIB Agent Depth Classification System" },
    level: "CLASSIFIED",
    category: "FACTIONS",
    content: {
      ko: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  비밀조사국 내부 참조 문서               █████  │
│  ██  요원 등급 체계 (D-7 ~ D-1)             █████  │
│  ██  "계급이 아니라 깊이(Depth)다"          █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# 비밀조사국 요원 등급 체계
**문서번호:** SIB-INTERNAL-DEPTH-001
**발행:** 비밀조사국 내부 참조
**문서 등급:** DA-2-A 이상 열람

---

## ▌ 1. 개요

비밀조사국에 계급은 없다. 있는 것은 **접근 권한**뿐이다.

누가 누구에게 명령하는 것이 아니라, **누가 어디까지 알 수 있는가.** 누가 어디까지 승인할 수 있는가. 그것이 이 조직의 위계다.

등급이 올라간다는 것은 승진이 아니라 **더 많은 것을 알게 되고, 더 무거운 것을 승인할 수 있게 된다**는 뜻이다.

> *대부분의 요원은 그것을 원하지 않는다.*

---

## ▌ 2. 표기 체계

\`\`\`
D[등급]-[레벨]

D = Depth (깊이)
등급 = 7~1 (7이 가장 낮음, 1이 가장 높음)
레벨 = A, B, C (A가 가장 높음)

문서 등급: DA-[등급]-[레벨]
  DA-7-C → 모든 조사국 인원 열람
  DA-2-A → 등급 2 A레벨 이상만 열람
  DA-1-A → 국장 + 등급 1-A만 열람
\`\`\`

---

## ▌ 3. 등급 상세

### D-7 — 기록 열람 권한

| 레벨 | 권한 |
|------|------|
| D-7-C | 현재 구역 기록 열람 |
| D-7-B | 기록 분류 + 색인 |
| D-7-A | 교차 구역 기록 참조 |

현장에 나가지 않는다. 기록을 읽고, 분류하고, 색인한다.
전쟁의 존재를 안다. 전쟁의 규모는 모른다.

---

### D-6 — 현장 관측 권한

| 레벨 | 권한 |
|------|------|
| D-6-C | 센서 데이터 1차 분류 |
| D-6-B | 현장 파견. 행성 환경 보고. |
| D-6-A | 다중 구역 관측. 패턴 분석. |

은하 끝 3%에 파견. 보고는 하지만 교전하지 않는다. "눈"이지 "손"이 아니다.

---

### D-5 — 함선 운용 권한

| 레벨 | 권한 |
|------|------|
| D-5-C | 초계함~프리깃급 (드론 480기 이하) |
| D-5-B | 구축함급 (드론 1,200기) |
| D-5-A | 순양함급 (드론 3,600기) |

1인 전술함의 유일한 인간. EH 생성자.

**특수 표기:**

| 표기 | 의미 |
|------|------|
| D-5-B★ | 전함급 (드론 12,000기. φ 0.710~0.718) |
| D-5-S | 기함급 (드론 48,000기. φ 0.712~0.720. 은하에 수십 명.) |

---

### D-4 — 행성 판정 권한

| 레벨 | 권한 |
|------|------|
| D-4-C | 행성 등급(S~E) 판정 보조 |
| D-4-B | 행성 등급 최종 판정. 파산 심사 개시. |
| D-4-A | RED 구역 내 전략 구역 재분류 |

"이 행성이 S급인가 E급인가"를 판정하는 권한.

---

### D-3 — 함대 배치 권한

| 레벨 | 권한 |
|------|------|
| D-3-C | 단일 전선 함선 배치 |
| D-3-B | 다중 전선 함대 배치 |
| D-3-A | RED 8행성 간 함대 재배치. Emergency Gate 승인. |

탑승자를 어디에 보낼지 결정하는 권한. RED 전장의 생명선.

---

### D-2 — 전쟁 전체 열람 권한

| 레벨 | 권한 |
|------|------|
| D-2-C | 네카 전체 전략 분석 접근 |
| D-2-B | 전쟁 전체 그림. 3세력 역학 열람. |
| D-2-A | HPP(인류보존 프로토콜) 열람. NOA 판정 로직 참조. |

**"왜 이 전쟁이 존재하는지"를 아는 등급.**

> *D-2 승격 시 거부 가능. 거부율 40% 이상.*
> *알고 나면 돌아갈 수 없다.*

---

### D-1 — 행성 소각 승인 권한

| 레벨 | 권한 | 인원 |
|------|------|------|
| D-1-C | 행성 소각 심사 개시 | 3명 이하 |
| D-1-B | 행성 소각 최종 승인 (2인 동시 서명) | 2명 |
| D-1-A | 비밀조사국 전체 총괄. 전 등급 접근. | **1명** |

> *D-1-B 2명이 동시 서명해야 소각 승인.*
> *이것은 "1인 독재 방지"가 아니라 **"책임을 분산하여 아무도 온전히 짊어지지 않게 하는"** 설계.*
> *협의회 DNA 그대로.*

---

## ▌ 4. 정보 차단벽

\`\`\`
D-7 ~ D-5:  "이상현상을 처리한다"고 안다.
D-4 ~ D-3:  "전쟁이 있다"고 안다.
D-2:        "왜 전쟁이 있는지" 안다.
D-1:        "전쟁이 어떻게 끝나는지" 안다.
             (혹은 끝나지 않는다는 것을.)
\`\`\`

---

## ▌ 5. 승격 체계

\`\`\`
D-7 → D-6:  시험 + 현장 적성
D-6 → D-5:  EH 적성 판정 (φ 밴드 최소 0.700)
D-5 → D-4:  전투 경력 + 판정 훈련
D-4 → D-3:  추천 + 전략 심사
D-3 → D-2:  "알겠습니까?" (거부 가능. 거부율 40%+)
D-2 → D-1:  국장 지명. 거부 불가.
\`\`\`

> *D-2 승격은 거부할 수 있다.*
> *D-1 승격은 거부할 수 없다.*
> *이것이 이 조직의 유일한 강제.*

---

## ▌ 6. RED 8행성 배치 기준

| 행성 | 최소 요원 등급 |
|------|-------------|
| Terminus (사령부) | D-2-B 이상 |
| Ultima (함대 집결) | D-3-B 이상 |
| Eschaton (첫 접촉) | D-4-A 이상 |
| Limen (Gate 방어) | D-3-A 상주 |
| Finis (보급 기지) | D-4-B 이상 |
| Marginis (관측 전초) | D-6-A 이상 |
| Perata (연대 접촉) | D-X 배치 |
| Ora (후방 지원) | D-5-C 이상 |

---

## ▌ 7. 특수 표기

| 표기 | 의미 |
|------|------|
| D-5-B★ | 전함급 탑승자 |
| D-5-S | 기함급 탑승자 |
| D-X | 등급 미분류 / 비정규 (해방연대 접촉용) |
| D-0 | **존재하지 않는 등급.** 기록에 없다. 소문만 있다. |

---

(인) 똑, 똑.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  본 문서는 비밀조사국 내부 참조용이다.             │
│  무단 유출 시 해당 인원은 오타로 처리된다.         │
└──────────────────────────────────────────────────┘
\`\`\`

*"올라가는 것이 아니라 깊어지는 것."*
*"D-7은 표면을 본다. D-1은 바닥을 본다."*
*"바닥을 본 사람은 표면으로 돌아갈 수 없다."*

*문서번호: SIB-INTERNAL-DEPTH-001 | 비밀조사국 내부 참조*`,
      en: `\`\`\`
┌──────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████  │
│  ██  SIB Internal Reference Document         █████  │
│  ██  Agent Depth Classification (D-7 to D-1) █████  │
│  ██  "Not rank. Depth."                      █████  │
│  ██████████████████████████████████████████████  │
└──────────────────────────────────────────────────┘
\`\`\`

---

# SIB Agent Depth Classification System
**Document No:** SIB-INTERNAL-DEPTH-001
**Issued by:** SIB Internal Reference
**Classification:** DA-2-A and above

---

## ▌ 1. Overview

The SIB has no ranks. It has only **access clearance.**

Not who commands whom, but **who is permitted to know what.** Who is authorized to approve what. That is this organization's hierarchy.

Rising in grade does not mean promotion. It means **knowing more, and bearing the authority to approve heavier things.**

> *Most agents do not want this.*

---

## ▌ 2. Notation System

\`\`\`
D[Grade]-[Level]

D = Depth
Grade = 7–1 (7 lowest, 1 highest)
Level = A, B, C (A highest)

Document classification: DA-[Grade]-[Level]
  DA-7-C → All SIB personnel
  DA-2-A → Grade 2 Level A and above only
  DA-1-A → Director + Grade 1-A only
\`\`\`

---

## ▌ 3. Grade Details

### D-7 — Record Access

| Level | Authority |
|-------|-----------|
| D-7-C | Current sector record viewing |
| D-7-B | Record classification + indexing |
| D-7-A | Cross-sector record referencing |

Never deployed to the field. They read, classify, and index records.
They know the war exists. They do not know its scale.

---

### D-6 — Field Observation

| Level | Authority |
|-------|-----------|
| D-6-C | Sensor data primary classification |
| D-6-B | Field deployment. Planetary environment reporting. |
| D-6-A | Multi-sector observation. Pattern analysis. |

Deployed to the galactic fringe 3%. They report but do not engage. "Eyes," not "hands."

---

### D-5 — Ship Operation

| Level | Authority |
|-------|-----------|
| D-5-C | Corvette–frigate class (≤480 drones) |
| D-5-B | Destroyer class (1,200 drones) |
| D-5-A | Cruiser class (3,600 drones) |

The sole human aboard a single-crew tactical vessel. The EH generator.

**Special Designations:**

| Notation | Meaning |
|----------|---------|
| D-5-B★ | Battleship class (12,000 drones. φ 0.710–0.718) |
| D-5-S | Flagship class (48,000 drones. φ 0.712–0.720. Dozens galaxy-wide.) |

---

### D-4 — Planetary Assessment

| Level | Authority |
|-------|-----------|
| D-4-C | Planet grade (S–E) assessment support |
| D-4-B | Final planet grade determination. Bankruptcy review initiation. |
| D-4-A | RED zone strategic sector reclassification |

The authority to determine whether a planet is Grade S or Grade E.

---

### D-3 — Fleet Deployment

| Level | Authority |
|-------|-----------|
| D-3-C | Single-front ship deployment |
| D-3-B | Multi-front fleet deployment |
| D-3-A | Inter-RED 8-planet fleet redeployment. Emergency Gate authorization. |

The authority to decide where boarders are sent. The lifeline of the RED front.

---

### D-2 — Full War Access

| Level | Authority |
|-------|-----------|
| D-2-C | Full Neka strategic analysis access |
| D-2-B | Complete war picture. 3-faction dynamics access. |
| D-2-A | HPP (Humanity Preservation Protocol) access. NOA judgment logic reference. |

**The grade where one learns why this war exists.**

> *D-2 promotion can be refused. Refusal rate exceeds 40%.*
> *Once you know, there is no going back.*

---

### D-1 — Planetary Incineration Authorization

| Level | Authority | Personnel |
|-------|-----------|-----------|
| D-1-C | Planetary incineration review initiation | ≤3 |
| D-1-B | Final incineration authorization (dual signature required) | 2 |
| D-1-A | SIB Director. Full access to all grades. | **1** |

> *Two D-1-B agents must sign simultaneously for incineration approval.*
> *This is not "dictator prevention." It is a design to **distribute responsibility so that no one bears it fully.***
> *Pure Council DNA.*

---

## ▌ 4. Information Walls

\`\`\`
D-7 to D-5:  Know "we handle anomalies."
D-4 to D-3:  Know "there is a war."
D-2:         Know "why there is a war."
D-1:         Know "how the war ends."
             (Or that it doesn't.)
\`\`\`

---

## ▌ 5. Promotion Pathway

\`\`\`
D-7 → D-6:  Examination + field aptitude
D-6 → D-5:  EH aptitude assessment (φ band minimum 0.700)
D-5 → D-4:  Combat record + assessment training
D-4 → D-3:  Recommendation + strategic review
D-3 → D-2:  "Do you wish to know?" (Refusal permitted. 40%+ refuse.)
D-2 → D-1:  Director appointment. Refusal not permitted.
\`\`\`

> *D-2 promotion can be refused.*
> *D-1 promotion cannot.*
> *This is the organization's only compulsion.*

---

## ▌ 6. RED 8-Planet Assignment Minimums

| Planet | Minimum Agent Grade |
|--------|-------------------|
| Terminus (Command) | D-2-B+ |
| Ultima (Fleet Assembly) | D-3-B+ |
| Eschaton (First Contact) | D-4-A+ |
| Limen (Gate Defense) | D-3-A resident |
| Finis (Supply Base) | D-4-B+ |
| Marginis (Observation Outpost) | D-6-A+ |
| Perata (Liberation Front Contact) | D-X assignment |
| Ora (Rear Support) | D-5-C+ |

---

## ▌ 7. Special Designations

| Notation | Meaning |
|----------|---------|
| D-5-B★ | Battleship-class boarder |
| D-5-S | Flagship-class boarder |
| D-X | Unclassified / irregular (Liberation Front contact) |
| D-0 | **A grade that does not exist.** Not in any record. Only rumors. |

---

(Seal) Knock, knock.

---

\`\`\`
┌──────────────────────────────────────────────────┐
│  This document is SIB internal reference only.    │
│  Unauthorized disclosure will result in the       │
│  offender's processing as a typo.                │
└──────────────────────────────────────────────────┘
\`\`\`

*"Not rising — deepening."*
*"D-7 sees the surface. D-1 sees the bottom."*
*"Those who have seen the bottom cannot return to the surface."*

*Document No: SIB-INTERNAL-DEPTH-001 | SIB Internal Reference*`,
    },
  },
};
