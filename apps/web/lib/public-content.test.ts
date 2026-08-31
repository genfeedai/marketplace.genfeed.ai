import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  fetchPublicContent,
  getApiBaseUrl,
  getPublicMediaUrl,
  parseCollection,
} from './public-content';

describe('public Genfeed content client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test('normalizes the configured API origin to the versioned API', () => {
    vi.stubEnv('NEXT_PUBLIC_GENFEED_API_URL', 'https://api.genfeed.ai/');

    expect(getApiBaseUrl()).toBe('https://api.genfeed.ai/v1');

    vi.stubEnv('NEXT_PUBLIC_GENFEED_API_URL', 'https://api.genfeed.ai/v1');
    expect(getApiBaseUrl()).toBe('https://api.genfeed.ai/v1');
  });

  test('fetches and flattens a JSON:API public collection', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'video-1',
              type: 'videos',
              attributes: { label: 'Launch film', duration: 12 },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchPublicContent('videos')).resolves.toEqual({
      items: [
        {
          id: 'video-1',
          resourceType: 'videos',
          label: 'Launch film',
          duration: 12,
        },
      ],
      status: 'success',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.genfeed.ai/v1/public/videos?page=1&limit=20&sort=-createdAt',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  test('returns an explicit unavailable result for API failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );

    await expect(fetchPublicContent('images')).resolves.toEqual({
      items: [],
      message: 'Genfeed returned HTTP 503.',
      status: 'unavailable',
    });
  });

  test('rejects malformed collections instead of presenting a false empty state', () => {
    expect(parseCollection({ data: {} })).toBeNull();
    expect(parseCollection({ data: [] })).toEqual([]);
  });

  test('builds versioned public media URLs', () => {
    expect(getPublicMediaUrl('musics', 'track/1')).toBe(
      'https://api.genfeed.ai/v1/public/musics/track%2F1/audio.mp3',
    );
  });
});
