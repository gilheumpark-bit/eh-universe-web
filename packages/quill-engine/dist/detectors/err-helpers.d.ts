import { CallExpression, CatchClause, Node, PropertyAccessExpression, TryStatement } from 'ts-morph';
/** throw new Error(password) 등 식별자명이 민감한 경우 */
export declare function sensitiveIdentifierInThrownExpr(expr: Node): boolean;
export declare function sensitiveLiteralInExpression(expr: Node): boolean;
export declare function tryNestingDepth(tryNode: TryStatement): number;
export declare function isUnawaitedPromiseCall(call: CallExpression): boolean;
/** 응답/클라이언트로 stack이 새는 패턴만 (console.* 제외) */
export declare function isUserFacingStackLeak(stackAccess: PropertyAccessExpression): boolean;
export declare function catchHasTypeNarrowing(c: CatchClause): boolean;
export declare function reactBusyNotResetInCatch(c: CatchClause): boolean;
