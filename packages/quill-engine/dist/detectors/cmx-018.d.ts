import { RuleDetector } from '../registry';
/**
 * CMX-018: Feature Envy
 * Detects methods that access another object's properties/methods more than their own class's.
 * Heuristic: counts `this.X` vs `otherObj.X` property accesses in each method.
 */
export declare const cmx018Detector: RuleDetector;
