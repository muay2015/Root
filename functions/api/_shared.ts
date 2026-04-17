export type ApiEnv = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });

export const readJson = async <T>(request: Request): Promise<T> => request.json() as Promise<T>;
