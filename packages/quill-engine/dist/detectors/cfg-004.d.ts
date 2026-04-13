import { RuleDetector } from '../registry';
/**
 * CFG-004: target: ES3
 * Detects when the TypeScript compilation target is set to the outdated ES3.
 * ES3 produces unnecessarily bloated output and lacks modern features.
 */
export declare const cfg004Detector: RuleDetector;
