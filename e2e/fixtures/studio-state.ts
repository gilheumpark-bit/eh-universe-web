import type { Page } from "@playwright/test";

type PrimeStudioOptions = {
  onboarded?: boolean;
  withProject?: boolean;
  lang?: "KO" | "EN" | "JP" | "CN";
};

function buildSeedProject(now: number) {
  return [{
    id: "e2e-studio-project",
    name: "E2E Studio Project",
    description: "seed project for backup-tier e2e",
    genre: "SF",
    createdAt: now,
    lastUpdate: now,
    sessions: [{
      id: "e2e-studio-session",
      title: "검증 회차",
      messages: [],
      lastUpdate: now,
      config: {
        genre: "SF",
        episode: 1,
        totalEpisodes: 12,
        guardrails: { min: 3500, max: 5500 },
        corePremise: "E2E backup-tier fixture.",
        manuscripts: [],
        characters: [],
      },
    }],
  }];
}

export async function primeStudio(
  page: Page,
  options: PrimeStudioOptions = {},
): Promise<void> {
  const now = Date.now();
  const projects = options.withProject ? buildSeedProject(now) : [];
  await page.addInitScript(({ projectsJson, onboarded, lang }) => {
    try {
      localStorage.clear();
      if (onboarded) {
        localStorage.setItem("eh-onboarded", "1");
        localStorage.setItem("noa-lg-onboarded", "1");
        localStorage.setItem("noa_first_visit_seen", "1");
      }
      localStorage.setItem("eh-user-role", "writer");
      localStorage.setItem("noa_studio_lang", lang);
      localStorage.setItem("noa_projects_v2", projectsJson);
      localStorage.setItem("noa_payment_status", "paid");
      localStorage.setItem("noa_entitlement_plan", "pro");
    } catch {
      /* ignore */
    }
  }, {
    projectsJson: JSON.stringify(projects),
    onboarded: options.onboarded ?? true,
    lang: options.lang ?? "KO",
  });
}
