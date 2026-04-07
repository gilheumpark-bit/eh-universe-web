import { RuleDetector } from '../registry';
import { detectSec019 } from './sec-helpers';

export const sec019Detector: RuleDetector = {
  ruleId: 'SEC-019',
  detect: detectSec019,
};
