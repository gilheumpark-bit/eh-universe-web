import { RuleDetector } from '../registry';
import { detectSec001 } from './sec-helpers';

export const sec001Detector: RuleDetector = {
  ruleId: 'SEC-001',
  detect: detectSec001,
};
