export type ProjectReleasePurpose = 'serial' | 'contest' | 'publisher' | 'ip_pitch' | 'private_archive';
export type ProjectTargetMarket = 'KR' | 'US' | 'EU' | 'GB' | 'AU' | 'JP' | 'CN' | 'TW' | 'GLOBAL';
export type ProjectTargetLanguage = 'KO' | 'EN' | 'JP' | 'CN';
export type ProjectRightsStatus =
  | 'author_owned'
  | 'co_created'
  | 'licensed_source'
  | 'external_materials'
  | 'needs_review';

export interface ProjectRightsLedgerEntry {
  id: string;
  categoryKo: string;
  ownerKo: string;
  usageScopeKo: string;
  exclusivityKo?: string;
  termKo?: string;
  regionKo?: string;
  mediaKo?: string;
  evidenceFileKo?: string;
  statusKo: string;
  noteKo: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ExternalCraftReferenceRecord {
  id: string;
  sourceProjectId: string;
  sourceProjectTitle: string;
  objective: string;
  patternSummary: string;
  rhythmNotes: string[];
  tensionMoves: string[];
  sceneTransitionMoves: string[];
  prohibitedTerms: string[];
  sourceHash: string;
  createdAt: string;
}

export type AcceptedImportBucket =
  | 'world'
  | 'characters'
  | 'items'
  | 'mainScenario'
  | 'scenes'
  | 'direction'
  | 'manuscript'
  | 'rightsIp'
  | 'unclassified';

export type AcceptedImportTargetType = 'world' | 'character' | 'scene' | 'manuscript' | 'metadata' | 'other';
export type ImportFileReportStatus = 'success' | 'failed' | 'unsupported' | 'empty';
export type ImportFileReportReasonCode =
  | 'unsupported-format'
  | 'requires-login'
  | 'server-extraction-failed'
  | 'empty-extraction'
  | 'magic-byte-mismatch'
  | 'file-too-large'
  | 'zip-bomb-risk'
  | 'password-protected'
  | 'image-only-source'
  | 'drm-or-corrupt-epub'
  | 'missing-epub-navigation'
  | 'pdf-page-markers-normalized'
  | 'pdf-running-lines-normalized'
  | 'unknown';

export interface ImportFileReportRecord {
  id: string;
  fileName: string;
  status: ImportFileReportStatus;
  detail: string;
  candidateCount: number;
  importedAt: string;
  reasonCode?: ImportFileReportReasonCode;
}

export interface AcceptedImportCandidateRecord {
  id: string;
  sourceFileName: string;
  bucket: AcceptedImportBucket;
  targetType: AcceptedImportTargetType;
  title: string;
  text: string;
  excerpt: string;
  confidence: number;
  reason: string;
  detectedFormat: 'txt' | 'md' | 'json' | 'docx' | 'pdf' | 'epub';
  sectionIndex: number;
  charCount: number;
  importedAt: string;
  acceptedAt: string;
  routedToStage?: string;
  routedTargetKey?: string;
  routedAt?: string;
  appliedBasisSuggestions?: boolean;
  alignmentWarnings?: Array<{
    code: string;
    severity?: 'info' | 'warning';
    label: string;
    detail: string;
  }>;
  basisSuggestions?: Array<{
    field: string;
    label: string;
    currentLabel: string;
    nextLabel: string;
    value: string;
    detail: string;
  }>;
}

export type WorldFactArcsStatus = 'not_checked' | 'draft' | 'hold' | 'pass' | 'conflict';

export interface WorldFieldEvidenceRecord {
  fieldKey: string;
  sourceLabel: string;
  sourceFileName?: string;
  sourceCandidateId?: string;
  confidence?: number;
  conflictCount: number;
  arcsStatus: WorldFactArcsStatus;
  updatedAt: string;
  note?: string;
}

export type MainScenarioActId = 'act1' | 'act2' | 'act3';

export interface MainScenarioSentence {
  id: string;
  index: number;
  label: string;
  text: string;
}

export interface MainScenarioAct {
  id: MainScenarioActId;
  title: string;
  seasonLabel?: string;
  startEpisode?: number;
  endEpisode?: number;
  summary: string;
}

export interface MainScenarioEvent {
  id: string;
  order: number;
  title: string;
  cause?: string;
  effect?: string;
  linkedEpisode?: number;
  locked?: boolean;
}

export interface MainScenarioEndingLock {
  locked: boolean;
  finalImage?: string;
  thematicAnswer?: string;
  mustResolve?: string;
  updatedAt?: string;
}

export interface MainScenarioStructure {
  sevenSentenceSynopsis?: MainScenarioSentence[];
  acts?: MainScenarioAct[];
  endingLock?: MainScenarioEndingLock;
  eventChain?: MainScenarioEvent[];
  updatedAt?: string;
}
