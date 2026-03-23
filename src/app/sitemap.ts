import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://eh-universe.com';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/rulebook`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/archive`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];
}
