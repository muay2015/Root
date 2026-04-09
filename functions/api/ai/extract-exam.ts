import { extractExamApiResponse } from '../../../src/lib/server/extractExamApi.ts';

type PagesContext = {
  request: Request;
  env: {
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
  };
};

export const onRequestPost = async (context: PagesContext) => {
  let payload: unknown;

  try {
    payload = await context.request.json();
  } catch {
    return Response.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  const result = await extractExamApiResponse({
    payload: payload as Parameters<typeof extractExamApiResponse>[0]['payload'],
    openAiApiKey: context.env.OPENAI_API_KEY,
    openAiModel: context.env.OPENAI_MODEL,
  });

  return Response.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' },
  });
};
