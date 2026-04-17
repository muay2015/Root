import { json, type ApiEnv } from './_shared';

type PagesContext = {
  env: ApiEnv;
};

export const onRequestGet = ({ env }: PagesContext) => {
  const hasOpenAiKey = Boolean(env.OPENAI_API_KEY?.trim());

  return json({
    ok: true,
    provider: hasOpenAiKey ? 'openai' : 'mock',
    model: env.OPENAI_MODEL?.trim() || 'gpt-4o',
    openaiKeyLoaded: hasOpenAiKey,
  });
};
