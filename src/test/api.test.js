import { describe, it, expect, vi } from 'vitest';
import api, { sedesService, playlistService } from '../services/api';

describe('Frontend API Services', () => {
  it('has axios configured with defaults and interceptors', () => {
    expect(api.defaults.headers['Accept']).toBe('application/json');
    expect(api.defaults.timeout).toBe(60000);
  });

  it('playlistService formats slug and id parameters correctly', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true } });

    await playlistService.getPlaylist('sede-principal');
    expect(getSpy).toHaveBeenCalledWith('/playlist', {
      params: { slug: 'sede-principal' }
    });

    await playlistService.getPlaylist(1);
    expect(getSpy).toHaveBeenCalledWith('/playlist', {
      params: { sede_id: 1 }
    });

    await playlistService.checkVersion('sede-norte');
    expect(getSpy).toHaveBeenCalledWith('/playlist', {
      params: { slug: 'sede-norte', check_version: 1 }
    });

    getSpy.mockRestore();
  });

  it('sedesService passes publicOnly parameter appropriately', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true } });

    await sedesService.getAll(true);
    expect(getSpy).toHaveBeenCalledWith('/sedes', {
      params: { public: 1 }
    });

    await sedesService.getAll(false);
    expect(getSpy).toHaveBeenCalledWith('/sedes', {
      params: {}
    });

    getSpy.mockRestore();
  });

  it('mediaService.delete invokes delete and falls back to post on method errors', async () => {
    const { mediaService } = await import('../services/api');
    const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ data: { success: true } });

    const res = await mediaService.delete(42);
    expect(deleteSpy).toHaveBeenCalledWith('/media/42');
    expect(res.data.success).toBe(true);
    deleteSpy.mockRestore();

    // Test fallback when HTTP DELETE is disallowed (405)
    const error405 = new Error('Method Not Allowed');
    error405.response = { status: 405 };
    const deleteFailSpy = vi.spyOn(api, 'delete').mockRejectedValue(error405);
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, fallback: true } });

    const fallbackRes = await mediaService.delete(42);
    expect(postSpy).toHaveBeenCalledWith('/media/42/delete');
    expect(fallbackRes.data.fallback).toBe(true);

    deleteFailSpy.mockRestore();
    postSpy.mockRestore();
  });

  it('mediaService.bulkDelete posts list of ids', async () => {
    const { mediaService } = await import('../services/api');
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true } });

    await mediaService.bulkDelete([10, 20, 30]);
    expect(postSpy).toHaveBeenCalledWith('/media/bulk-delete', { ids: [10, 20, 30] });

    postSpy.mockRestore();
  });
});
