// ============================================================
// PART 1 - CORE ENUMS AND LABEL MAPS
// ============================================================

export const USER_ROLES = ["member", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const BOARD_TYPES = [
  "notice",
  "registry",
  "log",
  "settlement",
  "if",
  "feedback",
] as const;
export type BoardType = (typeof BOARD_TYPES)[number];

export const REPORT_TYPES = [
  "manual",
  "guide",
  "technical",
  "settlement",
  "observation",
  "incident",
  "testimony",
  "recovered",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const PLANET_GOALS = ["maintain", "develop", "collapse", "experiment"] as const;
export type PlanetGoal = (typeof PLANET_GOALS)[number];

export const PLANET_STATUSES = [
  "maintain",
  "develop",
  "collapse",
  "experiment",
  "freeze",
  "discard",
] as const;
export type PlanetStatus = (typeof PLANET_STATUSES)[number];

export const VISIBILITIES = ["public", "members", "private"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const OFFICIALITIES = ["official", "unofficial", "fan", "experimental", "pending"] as const;
export type Officiality = (typeof OFFICIALITIES)[number];

export const REPORT_TYPE_TO_BOARD_TYPE: Record<ReportType, BoardType> = {
  manual: "notice",
  guide: "registry",
  technical: "registry",
  settlement: "settlement",
  observation: "log",
  incident: "log",
  testimony: "log",
  recovered: "log",
};

// IDENTITY_SEAL: PART-1 | role=domain enums and mappings | inputs=none | outputs=typed constants

// ============================================================
// PART 2 - FIRESTORE RECORD SHAPES
// ============================================================

export interface UserRecord {
  id: string;
  nickname: string;
  role: UserRole;
  badges: string[];
  planetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanetStats {
  logCount: number;
  settlementCount: number;
  lastLogAt: string | null;
  lastSettlementAt: string | null;
  featuredPostId?: string | null;
}

export interface PlanetRecord {
  id: string;
  ownerId: string;
  name: string;
  code?: string;
  genre: string;
  civilizationLevel: string;
  goal: PlanetGoal;
  status: PlanetStatus;
  ehRisk?: number | null;
  systemExposure?: number | null;
  summary: string;
  visibility: Visibility;
  representativeTags: string[];
  tags?: string[];
  coreRules: string[];
  featuredFaction?: string;
  featuredCharacter?: string;
  transcendenceCost?: string;
  transcendenceCosts?: string[];
  stats: PlanetStats;
  createdAt: string;
  updatedAt: string;
}

export interface PostRecord {
  id: string;
  authorId: string;
  planetId: string;
  boardType: BoardType;
  reportType: ReportType;
  title: string;
  content: string;
  summary?: string;
  eventCategory?: string;
  region?: string;
  intervention?: boolean;
  ehImpact?: number | null;
  followupStatus?: PlanetStatus;
  tags: string[];
  officiality: Officiality;
  visibility: Visibility;
  isPinned: boolean;
  isOfficial: boolean;
  metrics: {
    viewCount: number;
    commentCount: number;
    reactionCount: number;
  };
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementRecord {
  id: string;
  planetId: string;
  postId: string;
  verdict: PlanetStatus;
  ehValue?: number | null;
  risk?: number | null;
  action?: string;
  archiveLevel?: string;
  operatorId: string;
  auditNote?: string;
  createdAt: string;
}

export interface CommentRecord {
  id: string;
  postId: string;
  planetId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export const REACTION_TYPES = ["like", "fire", "insight", "touching", "warning"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  like: "\u{1F44D}",
  fire: "\u{1F525}",
  insight: "\u{1F4A1}",
  touching: "\u{1F3AD}",
  warning: "\u{26A0}\u{FE0F}",
};

export interface ReactionRecord {
  id: string;
  targetType: "planet" | "post";
  targetId: string;
  userId: string;
  reactionType: ReactionType;
  createdAt: string;
}

export interface BookmarkRecord {
  planetId: string;
  createdAt: string;
}

export const REPORT_REASONS = ["spam", "inappropriate", "copyright", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface ReportRecord {
  id: string;
  reporterId: string;
  targetType: "planet" | "post" | "comment";
  targetId: string;
  reason: ReportReason;
  detail: string;
  createdAt: string;
  status: "pending" | "reviewed" | "dismissed";
}

// IDENTITY_SEAL: PART-2 | role=firestore record contracts | inputs=entity payloads | outputs=typed records

// ============================================================
// PART 3 - WIZARD INPUT CONTRACTS
// ============================================================

export interface PlanetWizardDraft {
  name: string;
  code: string;
  genre: string;
  civilizationLevel: string;
  goal: PlanetGoal;
  status: PlanetStatus;
  summary: string;
  ehRisk: number | null;
  systemExposure: number | null;
  representativeTags: string[];
  tags?: string[];
  coreRules: string[];
  featuredFaction: string;
  featuredCharacter: string;
  transcendenceCost: string;
  transcendenceCosts: string[];
}

export interface FirstLogDraft {
  title: string;
  reportType: Extract<
    ReportType,
    "observation" | "incident" | "testimony" | "recovered" | "settlement" | "manual" | "technical"
  >;
  eventCategory: string;
  content: string;
  region: string;
  intervention: boolean;
  ehImpact: number | null;
  followupStatus: PlanetStatus | null;
}

export interface CreatePlanetWithFirstLogInput {
  ownerId: string;
  planet: PlanetWizardDraft;
  firstLog: FirstLogDraft;
  visibility?: Visibility;
}

export interface CreatePostInput {
  authorId: string;
  planetId: string;
  reportType: ReportType;
  title: string;
  content: string;
  eventCategory?: string;
  region?: string;
  intervention?: boolean;
  ehImpact?: number | null;
  followupStatus?: PlanetStatus | null;
  tags?: string[];
  visibility?: Visibility;
}

export interface UpdatePostInput {
  postId: string;
  updaterId: string; // 작성자 또는 관리자 검증용
  title?: string;
  content?: string;
  reportType?: ReportType;
  eventCategory?: string;
  region?: string;
  intervention?: boolean;
  ehImpact?: number | null;
  followupStatus?: PlanetStatus | null;
  tags?: string[];
  visibility?: Visibility;
}

export interface CreateSettlementInput {
  operatorId: string;
  planetId: string;
  postId: string;
  verdict: PlanetStatus;
  ehValue?: number | null;
  risk?: number | null;
  action?: string;
  archiveLevel?: string;
  auditNote?: string;
}

export interface CreateBoardPostInput {
  authorId: string;
  boardType: BoardType;
  title: string;
  content: string;
  tags?: string[];
  planetId?: string;
  visibility?: Visibility;
}

// IDENTITY_SEAL: PART-3 | role=wizard input contracts | inputs=form state | outputs=create payloads
