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
export { extractTextFromUrl, detectUrlInClipboard, isUrl } from './url-import';

// 임베드 위젯 (외부 사이트에 삽입)
export { getEmbedUrl, getEmbedHtml, getEmbedMarkdown, getOEmbedJson, copyEmbedCode, type EmbedConfig, type EmbedType } from './embed';

// 실시간 협업 (멀티유저 편집)
export { createRoomId, getCollabInviteUrl, copyCollabInvite, createLocalUser, createLocalChannel, broadcastEdit, broadcastCursor, onLocalMessage, type CollabUser, type CollabEdit, type CollabRoom } from './realtime-collab';

// SEO 구조화 데이터 (JSON-LD)
export { buildArticleJsonLd, buildWebAppJsonLd, buildBreadcrumbJsonLd, buildFAQJsonLd, jsonLdScript } from './structured-data';

// RSS/Atom 피드
export { generateAtomFeed, generateRssFeed, type FeedItem } from './rss-feed';

// 모바일 UX
export { isMobile, isTouchDevice, onVirtualKeyboard, applySafeArea, onSwipe, onPullToRefresh, getSelectedText } from './mobile-ux';
