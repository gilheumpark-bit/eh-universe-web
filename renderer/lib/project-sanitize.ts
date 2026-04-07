// ============================================================
// Project data sanitization — strip engine artifacts from loaded data
// ============================================================

import { Project } from '@/lib/studio-types';
import { stripEngineArtifacts } from '@/engine/pipeline';

/**
 * 로드된 프로젝트 데이터에서 엔진 아티팩트를 제거합니다.
 * localStorage/IndexedDB에서 복원 시 호출됩니다.
 */
export function sanitizeLoadedProjects(projects: Project[]): Project[] {
  return projects.map(project => ({
    ...project,
    sessions: project.sessions.map(session => {
      const messages = session.messages.map(message => {
        if (message.role !== 'assistant' || !message.content) return message;
        const cleanContent = stripEngineArtifacts(message.content);
        const cleanVersions = message.versions?.map(version => stripEngineArtifacts(version));
        return {
          ...message,
          content: cleanContent,
          versions: cleanVersions,
        };
      });

      const manuscripts = session.config.manuscripts?.map(manuscript => {
        const cleanContent = stripEngineArtifacts(manuscript.content);
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
  }));
}
