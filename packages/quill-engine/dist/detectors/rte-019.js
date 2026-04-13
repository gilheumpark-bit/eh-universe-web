import { findUnreachableInBlocks } from './rte-helpers';
export const rte019Detector = {
    ruleId: 'RTE-019',
    detect: (sourceFile) => {
        const findings = [];
        for (const u of findUnreachableInBlocks(sourceFile)) {
            findings.push({ line: u.line, message: `도달 불가 코드 — ${u.reason}` });
        }
        return findings;
    },
};
