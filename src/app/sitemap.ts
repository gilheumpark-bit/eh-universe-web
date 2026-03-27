import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://eh-universe.com';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/studio`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/codex`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/network`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/archive`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/tools/soundtrack`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/galaxy-map`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/vessel`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/warp-gate`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/noa-tower`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];
}
