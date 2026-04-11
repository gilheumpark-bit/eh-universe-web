import { isFeatureEnabled } from '@/lib/feature-flags';

// ============================================================
// PART 1 — Provider Interface & Types
// ============================================================

export interface ImageGenOptions {
  width?: number;
  height?: number;
  n?: number; // number of images (default 1)
  seed?: number; // For Image2Image tunneling consistency
  referenceImageUrl?: string; // For ControlNet/Img2Img reference (needs API support)
}

export interface ImageGenResult {
  url: string;
  revised_prompt?: string;
}

export interface ImageGenError {
  message: string;
  code?: string;
}

export type ImageGenProvider = 'openai' | 'stability' | 'local-spark';

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=ImageGenProvider,ImageGenResult

// ============================================================
// PART 2 — API Call Functions
// ============================================================

/**
 * Generate images via server-side proxy route.
 * The actual API call happens in /api/image-gen/route.ts.
 */
export async function generateImage(
  provider: ImageGenProvider,
  prompt: string,
  negativePrompt: string,
  apiKey: string,
  options: ImageGenOptions = {},
  signal?: AbortSignal
): Promise<{ images: ImageGenResult[]; error?: string }> {
  if (typeof window !== 'undefined' && !isFeatureEnabled('IMAGE_GENERATION')) {
    return { images: [], error: 'Image generation is disabled.' };
  }
  try {
    const res = await fetch('/api/image-gen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        prompt,
        negativePrompt,
        apiKey: provider === 'local-spark' ? 'dgx-server' : apiKey,
        width: options.width || 1024,
        height: options.height || 1024,
        n: options.n || 1,
        seed: options.seed,
        referenceImageUrl: options.referenceImageUrl,
      }),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      return { images: [], error: err.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { images: data.images || [] };
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return { images: [], error: 'Request cancelled' };
    }
    return { images: [], error: (e as Error).message };
  }
}

// IDENTITY_SEAL: PART-2 | role=api-calls | inputs=provider,prompt,apiKey | outputs=ImageGenResult[]

// ============================================================
// PART 3 — Provider metadata
// ============================================================

export const IMAGE_PROVIDERS: {
  id: ImageGenProvider;
  name: string;
  models: string[];
  maxSize: number;
  free?: boolean;
  badge?: string;
}[] = [
  {
    id: 'local-spark',
    name: 'DGX Spark',
    models: ['sdxl-1.0', 'flux-schnell-fp8'],
    maxSize: 1536,
    free: true,
    badge: '128GB VRAM · Free',
  },
  {
    id: 'openai',
    name: 'OpenAI DALL-E 3',
    models: ['dall-e-3'],
    maxSize: 1792,
  },
  {
    id: 'stability',
    name: 'Stability AI (SDXL)',
    models: ['stable-diffusion-xl-1024-v1-0'],
    maxSize: 1536,
  },
];

// IDENTITY_SEAL: PART-3 | role=metadata | inputs=none | outputs=IMAGE_PROVIDERS
