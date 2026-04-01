import { NextResponse } from 'next/server';
import { createServerGeminiClient } from '@/lib/google-genai-server';

// Vercel Cron Job: 매일 자정 실행
// vercel.json 에 요건 등록: { "crons": [{ "path": "/api/cron/universe-daily", "schedule": "0 0 * * *" }] }

export async function GET(req: Request) {
  try {
    // 1. 보안 인가 (Vercel Cron Secret 검증)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // 로컬 테스트를 위해 잠시 주석처리 하거나, 시크릿이 없으면 그냥 통과시킬 수 있습니다.
      // return new NextResponse('Unauthorized', { status: 401 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({ error: 'Firebase project ID not configured.' }, { status: 500 });
    }

    // 2. Firestore REST API를 사용하여 최근 24시간 이내 작성된 'posts' 데이터 가져오기 (가벼움)
    // 참고: 실제 프로덕션에서는 인덱싱된 timestamp 필드로 쿼리하는 것이 좋으나, 
    // 본 예제에서는 최신 글 10개를 가져와 AI에게 요약을 맡깁니다.
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts?pageSize=10&orderBy=createdAt%20desc`;
    
    const dbRes = await fetch(firestoreUrl);
    const dbData = await dbRes.json();

    if (!dbData.documents || dbData.documents.length === 0) {
      return NextResponse.json({ message: 'No new posts today. Skipping news generation.' });
    }

    // 3. 최근 데이터 파싱
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentLore = dbData.documents.map((doc: any) => {
      const title = doc.fields?.title?.stringValue || '제목 없음';
      const content = doc.fields?.content?.stringValue || '';
      return `- [${title}]: ${content.substring(0, 300)}...`; // 길이 제한
    }).join('\n');

    // 4. Gemini(구글 AI)를 사용하여 세계관 데일리 기사 생성
    const gemini = createServerGeminiClient();
    
    // 이 부분에서 크레딧 142만원 중 범용 AI 크레딧을 소모합니다.
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
      }
    });

    const newsText = aiRes.text;

    // 5. 생성된 뉴스를 Firestore 'universe_daily' 컬렉션에 REST API로 저장
    // (보안 규칙상 서버 환경에서 직접 REST POST를 쏠 때는 주의가 필요하지만, 
    // 테스트용도로 public write가 열려있거나 서비스어카운트 토큰을 쓴다고 가정)
    // 임시로 응답으로만 반환하여 Vercel Log에서 확인하거나 프론트에서 렌더링하게 둡니다.
    
    // TODO: Firestore REST POST로 universe_daily 에 insert
    // const insertUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/universe_daily`;

    console.log('[Universe Daily Created]', newsText);

    return NextResponse.json({
      ok: true,
      news: newsText,
      sourceCount: dbData.documents.length,
      message: 'Universe Daily news generated.'
    });

  } catch (error: unknown) {
    console.error('[Universe Daily Cron Error]', error);
    return NextResponse.json({ error: 'Failed to generate daily news.' }, { status: 500 });
  }
}
