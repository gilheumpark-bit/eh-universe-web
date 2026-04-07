export type ArticleData = {
  title: { ko: string; en: string; ja?: string; zh?: string };
  level: string;
  category: string;
  content: { ko: string; en: string; ja?: string; zh?: string };
  image?: string;
  related?: string[];
};

import coreData from "./articles-core";
import timelineData from "./articles-timeline";
import factionsData from "./articles-factions";
import technologyData from "./articles-technology";
import geographyData from "./articles-geography";
import militaryData from "./articles-military";
import classifiedData from "./articles-classified";
import reportsData from "./articles-reports";

export const articles: Record<string, ArticleData> = {
  ...coreData,
  ...timelineData,
  ...factionsData,
  ...technologyData,
  ...geographyData,
  ...militaryData,
  ...classifiedData,
  ...reportsData,
};

export function getArticleTitle(slug: string, lang: "ko" | "en" | "ja" | "zh"): string {
  const article = articles[slug];
  if (!article) return slug;
  return article.title[lang] || article.title.en || article.title.ko;
}
