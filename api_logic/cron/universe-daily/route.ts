export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { createServerGeminiClient } from '@/lib/google-genai-server';
import { logger } from '../_stubs/logger';
import { collectionName } from '@/lib/firebase';
import { firestoreCreateDocument, firestoreListDocuments } from '@/lib/firestore-service-rest';

// Vercel Cron Job: 매일 자정 실행
// vercel.json 에 요건 등록: { "crons": [{ "path": "/api/cron/universe-daily", "schedule": "0 0 * * *" }] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stringField(fields: any, key: string): string {
  return fields?.[key]?.stringValue ?? '';
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.CRON_SECRET?.trim();
    if (process.env.NODE_ENV === 'production') {
      if (!secret) {
        return NextResponse.json({ error: 'Cron secret not configured' }, { status: 503 });
      }
      if (authHeader !== `Bearer ${secret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    } else if (secret && authHeader !== `Bearer ${secret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({ error: 'Firebase project ID not configured.' }, { status: 500 });
    }

    const postsCollection = collectionName('posts');
    const dailyCollection = collectionName('universe_daily');

    const listed = await firestoreListDocuments(projectId, postsCollection, { pageSize: 10 });
    if (!listed.ok) {
      if ((listed as {ok: false; error: string}).error === 'no_service_account') {
        logger.warn('universe-daily', 'VERTEX_AI_CREDENTIALS missing — skip Firestore read; no daily news.');
        return NextResponse.json({
          ok: false,
          skipped: true,
          message: 'Service account not configured — set VERTEX_AI_CREDENTIALS for Firestore access.',
        });
      }
      return NextResponse.json({ error: 'Failed to list posts from Firestore.' }, { status: 502 });
    }

    const docs = listed.documents as { fields?: Record<string, unknown> }[];
    if (!docs.length) {
      return NextResponse.json({ message: 'No new posts today. Skipping news generation.' });
    }

    const recentLore = docs
      .map((doc) => {
        const f = doc.fields;
        const title = stringField(f, 'title') || '제목 없음';
        const content = stringField(f, 'content') || '';
        return `- [${title}]: ${content.substring(0, 300)}...`;
      })
      .join('\n');

    const gemini = createServerGeminiClient();

    const prompt = `당신은 'EH-Universe(6600만년의 역사를 지닌 우주 SF 세계관)'의 수석 기자입니다. 
다음은 오늘 유저들이 세계관에 새롭게 추가하거나 수정한 설정(Lore)들입니다.
이 설정들을 바탕으로, 세계관 내에 거주하는 사람들이 읽을 법한 흥미로운 "오늘의 우주 연방 뉴스" 또는 "뒷골목 소문" 형식의 텍스트를 3개 작성해 주세요. 
말투는 매우 기자답거나 정보상 같아야 하며, 절대 AI가 썼다는 티를 내지 마세요.
전체 길이는 300자를 넘지 않게 아나운서 브리핑처럼 요약해 주세요.

새로운 설정 목록:
${recentLore}

[유니버스 데일리 뉴스 브리핑]`;

    const aiRes = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const newsText = aiRes.text ?? '';

    const now = new Date().toISOString();
    const saved = await firestoreCreateDocument(projectId, dailyCollection, {
      body: { stringValue: newsText },
      createdAt: { timestampValue: now },
      sourcePostCount: { integerValue: String(docs.length) },
    });

    if (!saved.ok) {
      logger.warn('universe-daily', 'Generated news but Firestore write failed', (saved as {ok: false; error: string}).error);
      return NextResponse.json({
        ok: true,
        news: newsText,
        sourceCount: docs.length,
        persistWarning: 'Firestore write skipped or failed — check service account permissions.',
        message: 'Universe Daily news generated (response only).',
      });
    }

    logger.info('universe-daily', 'Stored universe_daily document', { name: saved.name });

    return NextResponse.json({
      ok: true,
      news: newsText,
      sourceCount: docs.length,
      document: saved.name,
      message: 'Universe Daily news generated and stored.',
    });
  } catch (error: unknown) {
    logger.error('universe-daily/cron', error);
    return NextResponse.json({ error: 'Failed to generate daily news.' }, { status: 500 });
  }
}

