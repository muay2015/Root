function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

export function getApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return `${normalizeBaseUrl(configuredBaseUrl)}${normalizedPath}`;
  }

  return normalizedPath;
}

export async function parseJsonResponse<T>(
  response: Response,
  options?: {
    emptyBodyMessage?: string;
    invalidJsonMessage?: string;
  },
) {
  const raw = await response.text();
  const body = raw.trim();

  if (!body) {
    throw new Error(options?.emptyBodyMessage ?? 'The API returned an empty response.');
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    const preview = body.slice(0, 140).replace(/\s+/g, ' ');
    const reason = contentType.includes('text/html')
      ? 'The API returned HTML instead of JSON. Check the deployed API URL or reverse proxy.'
      : `The API returned invalid JSON${preview ? `: ${preview}` : '.'}`;

    throw new Error(options?.invalidJsonMessage ?? reason);
  }
}
