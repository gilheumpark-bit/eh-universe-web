/**
 * Re-exports the real audit engine from `@eh/quill-engine` so Code Studio panels
 * resolve a single module path in the desktop bundle.
 */
export {
  runProjectAudit,
  formatAuditReport,
  type AuditProgressCallback,
} from "@eh/quill-engine/audit/audit-engine";
