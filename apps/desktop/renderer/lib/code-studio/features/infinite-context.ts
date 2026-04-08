/**
 * EH Code Studio - Infinite Context Engine v4.0
 * 
 * [ARCHITECTURE]
 * 1. Semantic Graph: Maps exports/imports to understand project structure.
 * 2. Identity Seal Detection: Categorizes files using IDENTITY_SEAL comments.
 * 3. Priority-Based Injection: Feeds context based on "Relationship Score".
 */

import path from 'path';

// @block { "id": "context-types", "type": "types" }
export interface FileMetadata {
  path: string;
  name: string;
  role?: string;
  exports: string[];
  dependencies: string[];
  lastModified: number;
  seal?: string;
  contentSummary?: string;
}

export class InfiniteContextEngine {
  private static instance: InfiniteContextEngine;
  private projectRoot: string = '';
  private index: Map<string, FileMetadata> = new Map();
  private isIndexing: boolean = false;

  private constructor() {}

  public static getInstance(): InfiniteContextEngine {
    if (!InfiniteContextEngine.instance) {
      InfiniteContextEngine.instance = new InfiniteContextEngine();
    }
    return InfiniteContextEngine.instance;
  }

  /**
   * 프로젝트 초기화 시 파일 목록을 로드하여 기초 인덱스를 생성합니다.
   */
  public async initializeIndex(root: string, fileList: string[]): Promise<void> {
    if (this.isIndexing) return;
    this.isIndexing = true;
    this.projectRoot = root;

    console.log(`[InfiniteContext] Indexing ${fileList.length} files...`);

    for (const filePath of fileList) {
      if (this.shouldIgnore(filePath)) continue;
      
      const meta = await this.analyzeFile(filePath);
      this.index.set(filePath, meta);
    }

    this.isIndexing = false;
    console.log(`[InfiniteContext] Indexing complete. Graph density: ${this.index.size} nodes.`);
  }

  /**
   * 파일의 내용을 분석하여 메타데이터를 추출합니다.
   */
  private async analyzeFile(filePath: string): Promise<FileMetadata> {
    const name = path.basename(filePath);
    
    // 구조적 분석 (Regex 기반 임시 구현 - 향후 AST 파서 연결)
    return {
      path: filePath,
      name,
      exports: [], 
      dependencies: [], 
      lastModified: Date.now(),
      role: this.detectRole(filePath)
    };
  }

  private detectRole(filePath: string): string {
    if (filePath.includes('/components/')) return 'UI_COMPONENT';
    if (filePath.includes('/lib/') || filePath.includes('/utils/')) return 'LOGIC_LIB';
    if (filePath.includes('/api/')) return 'SERVER_ROUTE';
    if (filePath.endsWith('.test.ts') || filePath.endsWith('.spec.ts')) return 'TEST_CASE';
    return 'UNKNOWN';
  }

  private shouldIgnore(filePath: string): boolean {
    const skipList = ['node_modules', '.git', '.next', 'dist', 'build', '.gemini'];
    return skipList.some(skip => filePath.includes(skip));
  }

  /**
   * 쿼리에 가장 적합한 파일 컨텍스트 목록을 반환합니다.
   */
  public getContextForQuery(query: string, limit: number = 15): FileMetadata[] {
    const queryLower = query.toLowerCase();
    
    return Array.from(this.index.values())
      .map(meta => ({
        meta,
        score: this.calculateScore(meta, queryLower)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.meta);
  }

  private calculateScore(meta: FileMetadata, query: string): number {
    let score = 0;
    // 명칭 매칭 (가장 높은 가중치)
    if (meta.name.toLowerCase().includes(query)) score += 50;
    if (meta.path.toLowerCase().includes(query)) score += 20;

    // 역할 기반 가중치
    if (query.includes('ui') || query.includes('컴포넌트')) {
      if (meta.role === 'UI_COMPONENT') score += 15;
    }
    if (query.includes('api') || query.includes('서버')) {
      if (meta.role === 'SERVER_ROUTE') score += 15;
    }
    
    return score;
  }
}

export const infiniteContext = InfiniteContextEngine.getInstance();
// IDENTITY_SEAL: PART-CORE | role=CONTEXT_ENGINE | inputs=PROJECT_FILES | outputs=SEMANTIC_GRAPH
