/**
 * DGX Spark AI Server Client
 * 
 * Vercel에 배포된 Next.js 앱에서 로컬(혹은 원격 포트포워딩된) DGX 서버의 FastAPI로 요청을 넘겨주는 서비스입니다.
 */

// 개발/운영 환경에 맞게 DGX 서버 IP를 세팅해야 합니다.
// 로컬 개발일 경우 127.0.0.1:8000 이며, Vercel 운영 서버일 때는 사용자의 퍼블릭 IP나 터널링 URL로 설정해야 합니다.
export const SPARK_SERVER_URL = process.env.SPARK_SERVER_URL || 'http://127.0.0.1:8000';

export async function streamSparkAI(
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  temperature: number
): Promise<ReadableStream> {
  const url = `${SPARK_SERVER_URL}/v1/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Spark API ${res.status}: ${err}`);
  }

  if (!res.body) throw new Error('Empty response body from Spark Server');
  return res.body;
}

export async function analyzeDataOnSpark(query: string) {
  const url = `${SPARK_SERVER_URL}/api/spark/analyze`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  if (!res.ok) throw new Error('Failed to analyze data on Spark');
  return await res.json();
}
