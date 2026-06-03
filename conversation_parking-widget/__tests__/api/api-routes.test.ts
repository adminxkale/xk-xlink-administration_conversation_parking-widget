import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../app/api/send-template/route';
import { GET as getGroupPhones } from '../../app/api/proxy-group-phones/route';
import { GET as getChannels } from '../../app/api/proxy-channels/route';

function buildPostRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/send-template', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/send-template', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns 400 with error mentioning missing fields when body is empty', async () => {
    const request = buildPostRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('destinationLine');
    expect(json.error).toContain('conversationId');
  });

  it('returns 400 mentioning conversationId when only destinationLine is provided', async () => {
    const request = buildPostRequest({ destinationLine: '+573001234567' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('conversationId');
    expect(json.error).not.toContain('destinationLine');
  });

  it('returns 502 when external endpoint fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('Service Unavailable', { status: 503 }),
    );

    const request = buildPostRequest({
      destinationLine: '+573001234567',
      conversationId: 'conv-123',
    });
    const response = await POST(request);

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});

describe('GET /api/proxy-group-phones', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubEnv('AUTH_USER', 'TestUser');
    vi.stubEnv('AUTH_PASS', 'TestPass');
    vi.stubEnv('STAGE', 'dev');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns data for the given tenant', async () => {
    const apiResponse = [
      {
        group_id: 'grp-42',
        phone_numbers: { 'Line A': '+573001234567', 'Line B': '+573009876543' },
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(apiResponse),
    });

    const request = new Request(
      'http://localhost/api/proxy-group-phones?tenant=Xkale',
    );
    const response = await getGroupPhones(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual(apiResponse);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api-dev.xlinkapp.cloud/management-multitenant/external/management-tables/xlink-dev-template-cache/Xkale',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('returns 400 without tenant', async () => {
    const request = new Request('http://localhost/api/proxy-group-phones');
    const response = await getGroupPhones(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('tenant');
  });

  it('returns 502 when external API returns error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const request = new Request(
      'http://localhost/api/proxy-group-phones?tenant=Xkale',
    );
    const response = await getGroupPhones(request);

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error).toContain('503');
  });
});

describe('GET /api/proxy-channels', () => {
  it('returns channels with phone_number and name', async () => {
    const response = await getChannels();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    for (const channel of json) {
      expect(channel).toHaveProperty('phone_number');
      expect(channel).toHaveProperty('name');
    }
  });
});
