import { getRule } from './catalog';
export class DetectorRegistry {
    detectors = new Map();
    register(detector) {
        if (!getRule(detector.ruleId)) {
            console.warn(`[Quill] Warning: Rule '${detector.ruleId}' is not defined in rule-catalog.ts`);
        }
        this.detectors.set(detector.ruleId, detector);
    }
    getDetectors() {
        return Array.from(this.detectors.values());
    }
    getRegistryStatus() {
        return {
            connected: this.detectors.size,
            registeredRules: Array.from(this.detectors.keys())
        };
    }
}
export const detectorRegistry = new DetectorRegistry();
