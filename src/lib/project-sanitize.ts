// ============================================================
// Project data sanitization — strip engine artifacts from loaded data
// ============================================================

import { Project } from '@/lib/studio-types';
import { stripEngineArtifacts } from '@/engine/pipeline';

const TEST_INPUT_RESIDUE_PATTERN = /\bAI-TEST-INPUT(?:-[A-Z0-9_-]+)?\b[ \t]*/g;
const QA_MANUSCRIPT_RESIDUE_PATTERNS = [
  /export zip manuscript for Loreguard package download check\.\s*Author controls the final direction and the package records the process\.?/gi,
];
const QA_PROJECT_NAME_PATTERN = /프로젝트-[A-Z]-\d{4,}/g;
const QA_RIGHTS_NOTE_PATTERN = /\b[A-Z]\s*권리\s*\d{4,}\b/g;

function stripTestInputResidue(text: string): string {
  let clean = text.replace(TEST_INPUT_RESIDUE_PATTERN, '');
  for (const pattern of QA_MANUSCRIPT_RESIDUE_PATTERNS) {
    clean = clean.replace(pattern, '');
  }
  return clean
    .replace(QA_PROJECT_NAME_PATTERN, '새 작품')
    .replace(QA_RIGHTS_NOTE_PATTERN, '권리/IP 메모')
    .replace(TEST_INPUT_RESIDUE_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n');
}

function stripAssistantArtifacts(text: string): string {
  return stripTestInputResidue(stripEngineArtifacts(text));
}

/**
 * 저장소에서 되살리는 단일 텍스트 조각을 화면에 올리기 전에 정리합니다.
 * 프로젝트 배열뿐 아니라 세션별 임시 초안(localStorage)에도 같은 규칙을 적용합니다.
 */
export function sanitizeLoadedText(text: string): string {
  return stripAssistantArtifacts(text);
}

function sanitizeProjectValue<T>(value: T): T {
  if (typeof value === 'string') return stripTestInputResidue(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeProjectValue(item)) as T;
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sanitizeProjectValue(item),
    ]),
  ) as T;
}

/**
 * 로드된 프로젝트 데이터에서 엔진 아티팩트를 제거합니다.
 * localStorage/IndexedDB에서 복원 시 호출됩니다.
 */
export function sanitizeLoadedProjects(projects: Project[]): Project[] {
  return projects.map(project => {
    const cleanProject = sanitizeProjectValue(project);

    return {
      ...cleanProject,
      sessions: cleanProject.sessions.map(session => {
        const messages = session.messages.map(message => {
          if (message.role !== 'assistant' || !message.content) return message;
          const cleanContent = stripAssistantArtifacts(message.content);
          const cleanVersions = message.versions?.map(version => stripAssistantArtifacts(version));
          return {
            ...message,
            content: cleanContent,
            versions: cleanVersions,
          };
        });

        const manuscripts = session.config.manuscripts?.map(manuscript => {
          const cleanContent = stripAssistantArtifacts(manuscript.content);
          return {
            ...manuscript,
            content: cleanContent,
            charCount: cleanContent.length,
          };
        });

        return {
          ...session,
          messages,
          config: manuscripts ? { ...session.config, manuscripts } : session.config,
        };
      }),
    };
  });
}
