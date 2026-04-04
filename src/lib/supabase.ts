import { createClient } from '@supabase/supabase-js';

type SupabaseConfig = {
  key: string;
  url: string;
};

function isLikelyValidSupabaseUrl(value: string) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value);
}

function isLikelyValidPublishableKey(value: string) {
  if (!value.startsWith('sb_publishable_')) {
    return false;
  }

  // Reject obvious placeholder or copied example values before creating a client.
  if (value.includes('SUPABASE') || value.includes('<') || value.includes('>')) {
    return false;
  }

  return value.length > 'sb_publishable_'.length + 20;
}

function parseCombinedUrl(value: string): SupabaseConfig | null {
  const marker = '/sb_publishable_';
  const markerIndex = value.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const url = value.slice(0, markerIndex);
  const key = value.slice(markerIndex + 1);

  if (!url || !key) {
    return null;
  }

  if (!isLikelyValidSupabaseUrl(url) || !isLikelyValidPublishableKey(key)) {
    return null;
  }

  return { url, key };
}

function resolveSupabaseConfig(): SupabaseConfig | null {
  const combined = import.meta.env.VITE_SUPABASE_COMBINED_URL?.trim();
  const separateUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const separateKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (combined) {
    return parseCombinedUrl(combined);
  }

  if (separateUrl && separateKey) {
    if (!isLikelyValidSupabaseUrl(separateUrl) || !isLikelyValidPublishableKey(separateKey)) {
      return null;
    }

    return {
      url: separateUrl,
      key: separateKey,
    };
  }

  return null;
}

const supabaseConfig = resolveSupabaseConfig();

if (!supabaseConfig) {
  console.warn('Supabase is not configured or the publishable key is invalid. Set a real VITE_SUPABASE_COMBINED_URL or VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = supabaseConfig
  ? createClient(supabaseConfig.url, supabaseConfig.key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);
export const supabaseUrl = supabaseConfig?.url ?? null;
