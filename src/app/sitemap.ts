import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://eh-universe.com';
  const now = new Date().toISOString();

  return [
    // Core pages
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/studio`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/codex`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/network`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/archive`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },

    // Reference & docs
    { url: `${base}/rulebook`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/reference`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

    // Network sub-pages
    { url: `${base}/network/guidelines`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },

    // Tools
    { url: `${base}/tools/soundtrack`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/galaxy-map`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/vessel`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/warp-gate`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/noa-tower`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/neka-sound`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/style-studio`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
