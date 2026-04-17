const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configuredBaseUrl) {
    return '';
  }

  return trimTrailingSlash(configuredBaseUrl);
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};
