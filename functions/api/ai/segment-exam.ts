import { segmentExamWithOpenAI } from '../../../src/lib/server/openaiVisionService';
import { json, readJson, type ApiEnv } from '../_shared';

type SegmentExamPayload = {
  image?: {
    mimeType?: string;
    data?: string;
  };
  subject?: string;
};

type PagesContext = {
  env: ApiEnv;
  request: Request;
};

export const onRequestPost = async ({ env, request }: PagesContext) => {
  try {
    const payload = await readJson<SegmentExamPayload>(request);
    const apiKey = env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return json({ error: 'OpenAI API key is not configured.' }, 401);
    }

    if (!payload.image?.data) {
      return json({ error: 'Image data is required.' }, 400);
    }

    const base64Data = payload.image.data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const questions = await segmentExamWithOpenAI({
      imageBuffer,
      mimeType: payload.image.mimeType || 'image/png',
      apiKey,
      subject: payload.subject,
      model: env.OPENAI_MODEL,
    });

    return json({
      title: `${payload.subject || 'image'} extracted questions`,
      questions,
      questionCount: questions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: 'GPT-4o segmentation failure', details: message }, 500);
  }
};
