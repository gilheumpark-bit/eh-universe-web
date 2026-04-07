import { BinaryExpression, Block, CallExpression, ElementAccessExpression, Node, SourceFile, SwitchStatement, Type } from 'ts-morph';
/** TypeScript optional chaining — ?. 토큰 */
export declare function hasQuestionDotToken(node: Node): boolean;
/** a?.b.c 체인에서 최초 ?. 여부 */
export declare function expressionRootHasOptionalChain(node: Node): boolean;
export declare function typeHasNull(t: Type): boolean;
export declare function typeHasUndefined(t: Type): boolean;
/** JSON.parse 등: try의 try 블록 안에만 있는지 (catch/finally 제외) */
export declare function isInTryBlockOnly(node: Node): boolean;
/** || 대신 ??가 더 맞을 수 있는 패턴 (좌변이 boolean이 아님) */
export declare function isSuspiciousBarBar(be: BinaryExpression): boolean;
/** 무한 루프: while(true) / for(;;) 본문에 break/return/throw 없음 */
export declare function loopBodyLacksExit(body: Block | undefined): boolean;
export declare function isWhileTrueOrForEver(node: Node): boolean;
/** case fall-through: break/return/throw 없이 다음 case로 이어짐 */
export declare function findSwitchFallThroughs(sw: SwitchStatement): number[];
/** return/throw 이후 동일 블록 내 문장 */
export declare function findUnreachableInBlocks(sf: SourceFile): Array<{
    line: number;
    reason: string;
}>;
/** 항상 같은 결과인 if 조건 (리터럴) */
export declare function isDeadBranchCondition(expr: Node): 'always-false' | 'always-true' | null;
export declare function isJsonParseCall(node: Node): node is CallExpression;
export declare function isParseIntCall(node: Node): node is CallExpression;
/** arr[arr.length] 형태 (대개 off-by-one / undefined) */
export declare function isArrayLengthAsIndex(ea: ElementAccessExpression): boolean;
