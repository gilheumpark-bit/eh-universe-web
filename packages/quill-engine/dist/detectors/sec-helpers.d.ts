import type { SourceFile } from 'ts-morph';
import type { RuleFinding } from '../registry';
export declare function pushUnique(out: RuleFinding[], seen: Set<string>, line: number, message: string): void;
/** SEC-001: SQL 문자열 연결/템플릿 삽입 의심 */
export declare function detectSec001(sourceFile: SourceFile): RuleFinding[];
/** SEC-002: dangerouslySetInnerHTML + innerHTML 비상수 할당 */
export declare function detectSec002(sourceFile: SourceFile): RuleFinding[];
/** SEC-003: child_process exec/spawn 등 셸 명령 조합 의심 */
export declare function detectSec003(sourceFile: SourceFile): RuleFinding[];
/** SEC-004: 경로에 ../ 포함 */
export declare function detectSec004(sourceFile: SourceFile): RuleFinding[];
/** SEC-005: LDAP 필터 문자열 연결 의심 */
export declare function detectSec005(sourceFile: SourceFile): RuleFinding[];
/** SEC-006: quill-engine.ts에서 이미 AST로 처리 — 플러그인 중복 방지 */
export declare function detectSec006(_sourceFile: SourceFile): RuleFinding[];
/** SEC-007: __proto__ / prototype 오염 패턴 */
export declare function detectSec007(sourceFile: SourceFile): RuleFinding[];
/** SEC-008: ReDoS 가능 정규식 (중첩 수량자) */
export declare function detectSec008(sourceFile: SourceFile): RuleFinding[];
/** SEC-009: 하드코딩 비밀번호/API 키 (process.env 제외) */
export declare function detectSec009(sourceFile: SourceFile): RuleFinding[];
/** SEC-010: salt/seed 고정 문자열 */
export declare function detectSec010(sourceFile: SourceFile): RuleFinding[];
/** SEC-011: MD5/SHA1 */
export declare function detectSec011(sourceFile: SourceFile): RuleFinding[];
/** SEC-012: DES/RC4 등 */
export declare function detectSec012(sourceFile: SourceFile): RuleFinding[];
/** SEC-013: jwt.decode / verify 미사용 휴리스틱 */
export declare function detectSec013(sourceFile: SourceFile): RuleFinding[];
/** SEC-014: 세션 ID가 URL에 */
export declare function detectSec014(sourceFile: SourceFile): RuleFinding[];
/** SEC-015: cookie 옵션 httpOnly/secure */
export declare function detectSec015(sourceFile: SourceFile): RuleFinding[];
/** SEC-016: CORS * (헤더 문자열 + cors({ origin: '*' }) ) */
export declare function detectSec016(sourceFile: SourceFile): RuleFinding[];
/** SEC-017: postMessage 대상 * */
export declare function detectSec017(sourceFile: SourceFile): RuleFinding[];
/** SEC-018: 민감 값 로그 */
export declare function detectSec018(sourceFile: SourceFile): RuleFinding[];
/** SEC-019: stack 노출 */
export declare function detectSec019(sourceFile: SourceFile): RuleFinding[];
/** SEC-020: http:// 리터럴 */
export declare function detectSec020(sourceFile: SourceFile): RuleFinding[];
/** SEC-021: localStorage 민감 키 */
export declare function detectSec021(sourceFile: SourceFile): RuleFinding[];
/** SEC-022: debugger + console.debug 다량 */
export declare function detectSec022(sourceFile: SourceFile): RuleFinding[];
/** SEC-023: 사설 IP */
export declare function detectSec023(sourceFile: SourceFile): RuleFinding[];
/** SEC-024: IDOR 패턴 req.params → 쿼리 */
export declare function detectSec024(sourceFile: SourceFile): RuleFinding[];
/** SEC-025: Express 라우트 2인자 (미들웨어 없음) 휴리스틱 */
export declare function detectSec025(sourceFile: SourceFile): RuleFinding[];
/** SEC-026: 클라이언트 전용 권한 검사 ('use client' + role) */
export declare function detectSec026(sourceFile: SourceFile): RuleFinding[];
/** SEC-027: POST에 CSRF 관련 토큰/미들웨어 부재 휴리스틱 */
export declare function detectSec027(sourceFile: SourceFile): RuleFinding[];
