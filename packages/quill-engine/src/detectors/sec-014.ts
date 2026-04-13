import { RuleDetector } from '../registry';
import { detectSec014 } from './sec-helpers';

export const sec014Detector: RuleDetector = {
  ruleId: 'SEC-014',
  detect: detectSec014,
};
