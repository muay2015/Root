export const onRequestGet = async (context: {
  env: {
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
  };
}) => {
  const openAiApiKey = context.env.OPENAI_API_KEY?.trim() || '';
  const openAiModel = context.env.OPENAI_MODEL?.trim() || 'gpt-5.4-mini';

  return Response.json({
    ok: true,
    provider: openAiApiKey ? 'openai' : 'mock',
    model: openAiModel,
    keyLoaded: openAiApiKey.length > 0,
  });
};
