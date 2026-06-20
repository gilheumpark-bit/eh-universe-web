// ============================================================
// Web Features Module — 웹 플랫폼 고유 기능 통합
// ============================================================
// 설치형에서는 불가능하거나 매우 어려운, 웹에서만 가능한 것들.
// dynamic import로 필요할 때만 로드.

// 공유 링크 (URL 하나로 결과물 공유)
export { createShareLink, resolveShareLink, copyShareLink, type SharePayload, type ShareResult, type ShareType } from './shareable-links';

// 딥링크 (문장/줄/세그먼트 단위 링크)
export { createDeepLinkHash, parseDeepLinkHash, scrollToDeepLink, getDeepLinkUrl, copyDeepLink } from './deep-links';

// URL 가져오기 (URL → 본문 추출 → 번역/분석)
// [Z1c-mid-ports 로드맵 대기] 외부 fetch 부작용 + 본문 권리 검토 필요 — 새 6탭 셸 배선 금지
// (소비처 0 정직 보고). 코드 보존 — 로드맵 확정 시 Phase 2 에서 배선.
export { extractTextFromUrl, detectUrlInClipboard, isUrl } from './url-import';

// 임베드 위젯 (외부 사이트에 삽입)
export { getEmbedUrl, getEmbedHtml, getEmbedMarkdown, getOEmbedJson, copyEmbedCode, type EmbedConfig, type EmbedType } from './embed';

// 실시간 협업 (멀티유저 편집)
// [Z1c-mid-ports 로드맵 대기] 동시 편집 = 충돌 해소·권한 모델 미확정 (부작용 大) —
// 새 6탭 셸 배선 금지 (소비처 0 정직 보고). 코드 보존 — 로드맵 확정 시 Phase 2 에서 배선.
export { createRoomId, getCollabInviteUrl, copyCollabInvite, createLocalUser, createLocalChannel, broadcastEdit, broadcastCursor, onLocalMessage, type CollabUser, type CollabEdit, type CollabRoom } from './realtime-collab';

// SEO 구조화 데이터 (JSON-LD)
export { buildArticleJsonLd, buildWebAppJsonLd, buildBreadcrumbJsonLd, buildFAQJsonLd, jsonLdScript } from './structured-data';

// 모바일 UX
export { isMobile, isTouchDevice, onVirtualKeyboard, applySafeArea, onSwipe, onPullToRefresh, getSelectedText } from './mobile-ux';

// 보안 강화
export { hardenExternalLinks, devToolsWarning, escapeHtml, sanitizeInput, computeIntegrityHash, safeJsonParse, isAllowedMimeType, maskSecret } from './security-hardening';

// 반응형 유틸리티
export { getDeviceType, getOptimalImageSrc, setupHiDPICanvas, getVisualViewport, printContent, type DeviceType } from './responsive';

// PWA 설치 프롬프트
export { initInstallPrompt, canInstall, isInstalled, showInstallPrompt, onInstallStateChange } from './pwa-install';

// 적응형 로딩 (네트워크 품질 기반)
export { getConnectionQuality, getAdaptiveConfig, onConnectionChange, requestPersistentStorage, getStorageUsage, prefetchOnVisible, type ConnectionQuality } from './adaptive-loading';

// 국제화 (Intl API)
export { segmentSentences, segmentWords, formatDate, formatNumber, formatRelativeTime, detectTextDirection, normalizeText } from './intl-utils';
