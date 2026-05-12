import { extractStreamUrl, type MixlrUserResponse } from '../mixlr';

function makeResponse(overrides: Partial<MixlrUserResponse> = {}): MixlrUserResponse {
  return {
    id: 4895725,
    username: 'salafi publications',
    slug: 'salafi-publications',
    url: 'https://mixlr.com/salafi-publications',
    profile_image_url: 'https://example.com/avatar.jpg',
    is_live: false,
    channel: {
      name: 'Live Events',
      logo_url: 'https://example.com/logo.jpg',
      url: 'https://salafipublications.mixlr.com',
      theme_color: '#47add8',
    },
    ...overrides,
  };
}

describe('extractStreamUrl', () => {
  it('returns null when live_stream_url_enabled is false (toggle off)', () => {
    const r = makeResponse({ live_stream_url_enabled: false, live_stream_url: 'https://stream.example/aac' });
    expect(extractStreamUrl(r)).toBeNull();
  });

  it('returns null when the gate is missing entirely (older response shape)', () => {
    const r = makeResponse({ live_stream_url: 'https://stream.example/aac' });
    expect(extractStreamUrl(r)).toBeNull();
  });

  it('returns live_stream_url when gate is on and the canonical field is present', () => {
    const r = makeResponse({
      live_stream_url_enabled: true,
      live_stream_url: 'https://stream.example/salafi-publications.aac',
    });
    expect(extractStreamUrl(r)).toBe('https://stream.example/salafi-publications.aac');
  });

  it('falls back to stream_url when live_stream_url is absent (Mixlr field-name uncertainty)', () => {
    const r = makeResponse({
      live_stream_url_enabled: true,
      stream_url: 'https://stream.example/fallback.aac',
    });
    expect(extractStreamUrl(r)).toBe('https://stream.example/fallback.aac');
  });

  it('returns null when gate is on but no candidate URL is provided', () => {
    const r = makeResponse({ live_stream_url_enabled: true });
    expect(extractStreamUrl(r)).toBeNull();
  });

  it('ignores empty-string URLs', () => {
    const r = makeResponse({
      live_stream_url_enabled: true,
      live_stream_url: '',
      stream_url: 'https://stream.example/non-empty.aac',
    });
    expect(extractStreamUrl(r)).toBe('https://stream.example/non-empty.aac');
  });
});
