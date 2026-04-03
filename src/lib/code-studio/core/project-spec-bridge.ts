import type { ProjectSpec } from "@/lib/code-studio/core/project-spec";
import { formatSpecForAI } from "@/lib/code-studio/core/project-spec";

export interface ProjectSpecFormAnswer {
  questionId: string;
  answer: string | string[];
}

export interface ProjectSpecFormData {
  category: string;
  title: string;
  answers: ProjectSpecFormAnswer[];
}

export const CODE_STUDIO_SPEC_CHAT_SEED_KEY = "eh-cs-chat-seed";

function answerAsString(form: ProjectSpecFormData, questionId: string): string {
  const found = form.answers.find((a) => a.questionId === questionId)?.answer;
  if (Array.isArray(found)) return found.join(", ");
  return typeof found === "string" ? found.trim() : "";
}

function answerAsArray(form: ProjectSpecFormData, questionId: string): string[] {
  const found = form.answers.find((a) => a.questionId === questionId)?.answer;
  if (Array.isArray(found)) return found.map((v) => String(v).trim()).filter(Boolean);
  if (typeof found === "string") return found.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
}

export function toCoreProjectSpec(form: ProjectSpecFormData): ProjectSpec {
  const title = form.title.trim() || "Untitled Project";
  const summary = answerAsString(form, "q1");
  const techStack = answerAsArray(form, "q2");
  const targetUsers = answerAsString(form, "q3");
  const deploy = answerAsString(form, "q4");
  const extra = [targetUsers ? `Target users: ${targetUsers}` : "", deploy ? `Deployment: ${deploy}` : ""]
    .filter(Boolean)
    .join(" | ");

  return {
    id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: title,
    description: [summary, extra].filter(Boolean).join("\n"),
    techStack,
    framework: form.category,
    dependencies: {},
    devDependencies: {},
    scripts: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function buildProjectSpecChatSeed(spec: ProjectSpec): string {
  const header = formatSpecForAI(spec);
  return [
    "Use this Project Spec as the single source of truth.",
    header,
    "Generate a practical bootstrap plan, then propose initial file scaffolding for this repository.",
  ].join("\n\n");
}

