import { RuleDetector } from '../registry';
import { detectSec008 } from './sec-helpers';

export const sec008Detector: RuleDetector = {
  ruleId: 'SEC-008',
  detect: detectSec008,
};
