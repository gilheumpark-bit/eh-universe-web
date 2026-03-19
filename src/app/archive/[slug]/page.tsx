import ArticleClient from "./ArticleClient";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ArticleClient slug={slug} />;
}
