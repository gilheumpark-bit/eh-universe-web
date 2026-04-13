// ============================================================
// Code Studio — Project Audit Engine: Types
// ============================================================
// 16-area audit system across 4 categories.
// Pure types — no runtime logic.
export const AUDIT_AREA_LABELS = {
    operations: { en: 'Operations', ko: '운영성' },
    complexity: { en: 'Code Complexity', ko: '코드 복잡도' },
    architecture: { en: 'Architecture', ko: '아키텍처' },
    dependencies: { en: 'Dependency Health', ko: '의존성 건강' },
    testing: { en: 'Testing', ko: '테스트' },
    'error-handling': { en: 'Error Handling', ko: '에러 핸들링' },
    'feature-completeness': { en: 'Feature Completeness', ko: '기능 완성도' },
    documentation: { en: 'Documentation', ko: '문서' },
    'design-system': { en: 'Design System', ko: '디자인 시스템' },
    accessibility: { en: 'Accessibility', ko: '접근성' },
    'ux-quality': { en: 'UX Quality', ko: 'UX 품질' },
    i18n: { en: 'Internationalization', ko: '국제화' },
    security: { en: 'Security', ko: '보안' },
    performance: { en: 'Performance', ko: '성능' },
    'api-health': { en: 'API Health', ko: 'API 건강' },
    'env-config': { en: 'Environment Config', ko: '환경 설정' },
};
export const CATEGORY_LABELS = {
    'code-health': { en: 'Code Health', ko: '코드 건강' },
    quality: { en: 'Quality Assurance', ko: '품질 보증' },
    'user-experience': { en: 'User Experience', ko: '사용자 경험' },
    'infra-security': { en: 'Infra & Security', ko: '인프라 & 보안' },
};
export const AREA_TO_CATEGORY = {
    operations: 'code-health',
    complexity: 'code-health',
    architecture: 'code-health',
    dependencies: 'code-health',
    testing: 'quality',
    'error-handling': 'quality',
    'feature-completeness': 'quality',
    documentation: 'quality',
    'design-system': 'user-experience',
    accessibility: 'user-experience',
    'ux-quality': 'user-experience',
    i18n: 'user-experience',
    security: 'infra-security',
    performance: 'infra-security',
    'api-health': 'infra-security',
    'env-config': 'infra-security',
};
export const CATEGORY_WEIGHTS = {
    'code-health': 0.30,
    quality: 0.25,
    'user-experience': 0.25,
    'infra-security': 0.20,
};
// IDENTITY_SEAL: PART-4 | role=audit-context | inputs=none | outputs=AuditContext
