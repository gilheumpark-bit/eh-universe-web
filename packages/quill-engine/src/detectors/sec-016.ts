import { RuleDetector } from '../registry';
import { detectSec016 } from './sec-helpers';

export const sec016Detector: RuleDetector = {
  ruleId: 'SEC-016',
  detect: detectSec016,
};
