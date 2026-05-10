// ============================================================
// Attestation Text — ATTESTATION OF GENESIS 4언어 byte-level + 서명 디스클레이머
// ============================================================
//
// stitch_lore_guard `_3` Certificate 본체 의 ATTESTATION OF GENESIS 영역.
// "본 문서는 작가 직접 통제 + 시스템 검증" 진술.
//
// 변경 시 반드시:
//   1. PR 리뷰 + 변호사 1회 재감수
//   2. attestationStatementVersion 갱신 (Major bump)
//   3. 단위 테스트 fixture 업데이트
// ============================================================

// ============================================================
// PART 1 — ATTESTATION OF GENESIS 4언어
// ============================================================

export const ATTESTATION_OF_GENESIS_4LANG = {
  ko: '본 문서는 위 원고가 작가의 직접적인 통제 아래 작성되었으며, 체계적인 세계관 구축과 캐릭터 일관성 규칙에 따라 작업되었음을 확인합니다. 모든 서사 전개와 주제 공명은 Lore Guard Integrity Core를 통해 수동 검증되었습니다.',
  en: "This document verifies that the manuscript was developed under the author's direct control, incorporating systematic world-building and character consistency rules. Every narrative pivot and thematic resonance has been manually validated against the Lore Guard Integrity Core.",
  ja: '本書は、上記原稿が作者の直接的な管理下で作成され、体系的な世界観構築とキャラクター一貫性規則に従って執筆されたことを確認します。すべての叙述の転換と主題の共鳴はLore Guard Integrity Coreによって手動検証されました。',
  zh: '本文件确认上述手稿是在作者直接控制下创作,采用系统化的世界观构建与角色一致性规则。所有叙事转折与主题共鸣均通过Lore Guard Integrity Core进行人工验证。',
} as const;

// ============================================================
// PART 2 — Signature 옆 디스클레이머 (해시 옆 작은 글씨)
// ============================================================

export const SIGNATURE_DISCLAIMER_4LANG = {
  ko: '이 문서는 작업 과정의 기록이며, 저작권 보증은 아닙니다.',
  en: 'This is a record of process, not a guarantee of copyright.',
  ja: '本書は作業過程の記録であり、著作権の保証ではありません。',
  zh: '本文件为工作过程记录,不构成著作权保证。',
} as const;

// ============================================================
// PART 3 — 라벨 (UI 헤더용)
// ============================================================

export const ATTESTATION_LABELS = {
  ko: {
    headerLabel: 'ATTESTATION OF GENESIS',
    titleOfWork: '작품 제목',
    authorName: '작가명',
    serialNo: '발급 번호',
    dateIssued: '발급일',
    digitalSignature: '디지털 서명 / 해시',
    scanForProof: '암호 검증을 위해 스캔',
    workSessions: '작업 세션',
    originSummary: '출처 요약',
    humanControlIndex: 'Human Control Index (HCI)',
  },
  en: {
    headerLabel: 'ATTESTATION OF GENESIS',
    titleOfWork: 'TITLE OF WORK',
    authorName: 'AUTHOR NAME',
    serialNo: 'SERIAL NO.',
    dateIssued: 'DATE ISSUED',
    digitalSignature: 'DIGITAL SIGNATURE / HASH',
    scanForProof: 'SCAN FOR CRYPTOGRAPHIC PROOF',
    workSessions: 'WORK SESSIONS',
    originSummary: 'ORIGIN SUMMARY',
    humanControlIndex: 'Human Control Index (HCI)',
  },
  ja: {
    headerLabel: 'ATTESTATION OF GENESIS',
    titleOfWork: '作品タイトル',
    authorName: '作者名',
    serialNo: '発行番号',
    dateIssued: '発行日',
    digitalSignature: 'デジタル署名 / ハッシュ',
    scanForProof: '暗号検証用スキャン',
    workSessions: '作業セッション',
    originSummary: '出典要約',
    humanControlIndex: 'Human Control Index (HCI)',
  },
  zh: {
    headerLabel: 'ATTESTATION OF GENESIS',
    titleOfWork: '作品标题',
    authorName: '作者姓名',
    serialNo: '发行编号',
    dateIssued: '发行日期',
    digitalSignature: '数字签名 / 哈希',
    scanForProof: '加密验证扫描',
    workSessions: '工作会话',
    originSummary: '来源摘要',
    humanControlIndex: 'Human Control Index (HCI)',
  },
} as const;

/** Attestation 텍스트 버전 (변경 추적). */
export const ATTESTATION_VERSION = '1.0.0' as const;
