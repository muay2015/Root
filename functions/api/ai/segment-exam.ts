import { segmentExamWithOpenAI } from '../../../src/lib/server/openaiVisionService.ts';

type PagesContext = {
  request: Request;
  env: {
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
  };
};

export const onRequestPost = async (context: PagesContext) => {
  let payload: any;

  try {
    payload = await context.request.json();
  } catch {
    return Response.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  const { image, subject } = payload;
  const openAiApiKey = context.env.OPENAI_API_KEY;
  const openAiModel = context.env.OPENAI_MODEL || 'gpt-4o';

  if (!openAiApiKey) {
    return Response.json(
      { error: 'OpenAI API 키가 설정되지 않았습니다.' },
      { status: 401 },
    );
  }

  if (!image?.data) {
    return Response.json(
      { error: '이미지 데이터가 없습니다.' },
      { status: 400 },
    );
  }

  try {
    // Cloudflare Worker 환경에서는 Buffer 대신 Uint8Array 등을 사용하거나, 
    // openaiVisionService.ts가 Buffer를 필요로 하는지 확인해야 함.
    // 하지만 openai-api 등 modern 패키지는 둘 다 잘 지원함.
    // 만약 Buffer 에러가 나면 여기서 처리가 필요할 수 있음.
    
    // 이전에 base64를 Buffer로 변환했으나 Worker에서는atob나 b64 decoding이 필요할 수 있음.
    const base64Data = image.data.replace(/^data:image\/\w+;base64,/, '');
    
    // node logic
    // const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Cloudflare logic (Buffer is available in some wrangler versions or with nodejs_compat)
    // 여기서는 service의 인터페이스를 맞추기 위해 Buffer를 사용함.
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const questions = await segmentExamWithOpenAI({
      imageBuffer,
      mimeType: image.mimeType || 'image/png',
      apiKey: openAiApiKey,
      subject,
      model: openAiModel,
    });

    return Response.json({
      title: `${subject || '이미지'} 기출문제`,
      questions,
      questionCount: questions.length,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (err: any) {
    console.error('SEGMENT EXAM ERROR (Cloudflare):', err);
    return Response.json(
      { error: '이미지 분석 중 오류가 발생했습니다.', details: err.message },
      { status: 500 }
    );
  }
};
