import { generateExamApiResponse } from '../../../src/lib/server/generateExamApi';
import { json, readJson, type ApiEnv } from '../_shared';

type PagesContext = {
  env: ApiEnv;
  request: Request;
};

export const onRequestPost = async ({ env, request }: PagesContext) => {
  try {
    const payload = await readJson<any>(request);
    const result = await generateExamApiResponse({
      payload,
      openAiApiKey: env.OPENAI_API_KEY,
      openAiModel: env.OPENAI_MODEL,
    });

    return json(result.body, result.status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
};
