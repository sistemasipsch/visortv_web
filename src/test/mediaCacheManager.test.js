import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mediaCacheManager from '../services/mediaCacheManager';

describe('mediaCacheManager', () => {
  const originalImage = globalThis.Image;

  beforeEach(async () => {
    await mediaCacheManager.clearPackageCache();
    vi.restoreAllMocks();

    globalThis.Image = class {
      constructor() {
        this.complete = true;
        this.naturalWidth = 1920;
        this.src = '';
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 5);
      }
      decode() {
        return Promise.resolve();
      }
    };
  });

  afterEach(() => {
    globalThis.Image = originalImage;
  });

  it('reports cache API support status safely', () => {
    const isSupported = mediaCacheManager.isCacheSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('prewarmVideo returns true without throwing CORS or making fetch requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await mediaCacheManager.prewarmVideo('https://visortvapi.clinicalhouse.co/public/storage/media/test.mp4');
    expect(result).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('prewarmVideo returns false for empty url', async () => {
    const result = await mediaCacheManager.prewarmVideo('');
    expect(result).toBe(false);
  });

  it('preloadImage successfully decodes and handles sliding window', async () => {
    const urls = [
      'https://example.com/img1.jpg',
      'https://example.com/img2.jpg',
      'https://example.com/img3.jpg',
      'https://example.com/img4.jpg',
    ];

    for (const url of urls) {
      const res = await mediaCacheManager.preloadImage(url);
      expect(res).toBe(true);
    }
  });

  it('preloadSedePackage processes images and videos sequentially without fetch errors', async () => {
    const playlist = [
      { id: 1, type: 'image', url: '/public/storage/media/img1.jpg' },
      { id: 2, type: 'video', url: '/public/storage/media/vid1.mp4' },
      { id: 3, type: 'image', url: '/public/storage/media/img2.png' },
    ];

    const preloadImageSpy = vi.spyOn(mediaCacheManager, 'preloadImage');
    const prewarmVideoSpy = vi.spyOn(mediaCacheManager, 'prewarmVideo');

    await mediaCacheManager.preloadSedePackage(playlist);

    expect(preloadImageSpy).toHaveBeenCalledTimes(2);
    expect(prewarmVideoSpy).toHaveBeenCalledTimes(1);
  });

  it('clearPackageCache safely deallocates images', async () => {
    await mediaCacheManager.preloadImage('https://example.com/to_clear.jpg');
    await expect(mediaCacheManager.clearPackageCache()).resolves.not.toThrow();
  });
});
