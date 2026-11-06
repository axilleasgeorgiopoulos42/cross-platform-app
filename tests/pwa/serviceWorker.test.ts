// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildServiceWorker } = require('../../scripts/pwa/service-worker');

const ORIGIN = 'https://app.test';
const norm = (k: any) => new URL(typeof k === 'string' ? k : k.url, ORIGIN).href;

type Res = {
  ok: boolean;
  status: number;
  type: string;
  body: string;
  headers: { get: (name: string) => string | null };
  clone: () => Res;
};
function res(body: string, o: Partial<Res> & { contentType?: string } = {}): Res {
  const { contentType = 'application/javascript', ...rest } = o;
  const r: Res = {
    ok: true,
    status: 200,
    type: 'basic',
    body,
    headers: { get: (n: string) => (n.toLowerCase() === 'content-type' ? contentType : null) },
    clone: () => r,
    ...rest,
  };
  return r;
}

function setup(urls: string[] = ['/index.html', '/app.js'], version = 'v1') {
  const store = new Map<string, Map<string, Res>>();
  const wrap = (m: Map<string, Res>) => ({
    put: async (k: any, r: Res) => {
      m.set(norm(k), r);
    },
    match: async (k: any) => m.get(norm(k)),
  });
  const caches = {
    open: async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      return wrap(store.get(name)!);
    },
    keys: async () => [...store.keys()],
    delete: async (name: string) => store.delete(name),
    match: async (k: any) => {
      for (const m of store.values()) {
        const hit = m.get(norm(k));
        if (hit) return hit;
      }
      return undefined;
    },
  };
  const fetchFn = jest.fn(async (k: any) => res('net:' + norm(k)));
  const handlers: Record<string, (e: any) => void> = {};
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (t: string, fn: (e: any) => void) => {
      handlers[t] = fn;
    },
    skipWaiting: jest.fn(),
    clients: { claim: jest.fn(async () => undefined) },
  };
  const source = buildServiceWorker(version, urls);
  new Function('self', 'caches', 'fetch', source)(self, caches, fetchFn);
  const fire = (type: string, init: any = {}) => {
    const out: { waited?: Promise<any>; responded?: Promise<any> } = {};
    const event = {
      ...init,
      waitUntil: (p: Promise<any>) => {
        out.waited = p;
      },
      respondWith: (p: Promise<any>) => {
        out.responded = p;
      },
    };
    handlers[type](event);
    return out;
  };
  const seed = (name: string, entries: Record<string, Res>) => {
    const m = new Map<string, Res>();
    for (const [k, v] of Object.entries(entries)) m.set(norm(k), v);
    store.set(name, m);
  };
  const cacheOf = (name: string) => store.get(name);
  return { source, store, fetchFn, self, fire, seed, cacheOf };
}

const nav = (path = '/expenses') => ({
  request: { method: 'GET', mode: 'navigate', url: ORIGIN + path },
});
const asset = (path: string) => ({
  request: { method: 'GET', mode: 'no-cors', url: ORIGIN + path },
});

describe('buildServiceWorker', () => {
  it('embeds version and urls', () => {
    const { source } = setup();
    expect(source).toContain('planner-v1');
    expect(source).toContain('"/index.html"');
  });

  it('install caches every url and then skips waiting', async () => {
    const h = setup();
    await h.fire('install').waited;
    const c = h.cacheOf('planner-v1')!;
    expect([...c.keys()].sort()).toEqual([ORIGIN + '/app.js', ORIGIN + '/index.html']);
    expect(h.self.skipWaiting).toHaveBeenCalledTimes(1);
    expect(h.fetchFn).toHaveBeenCalledWith('/index.html', { cache: 'reload' });
  });

  it('install failure leaves old caches and does not skip waiting', async () => {
    const h = setup();
    h.seed('planner-v0', { '/index.html': res('old') });
    h.fetchFn.mockImplementation(async (k: any) =>
      norm(k).endsWith('/app.js') ? ({ ok: false, status: 500 } as any) : res('x'),
    );
    await expect(h.fire('install').waited).rejects.toBeDefined();
    expect(h.self.skipWaiting).not.toHaveBeenCalled();
    expect(h.store.has('planner-v0')).toBe(true);
  });

  it('failed install removes its partial cache and keeps older generations', async () => {
    const h = setup();
    h.seed('planner-v0', { '/index.html': res('old') });
    h.fetchFn.mockImplementation(async (k: any) =>
      norm(k).endsWith('/app.js') ? ({ ok: false, status: 500 } as any) : res('x'),
    );
    await expect(h.fire('install').waited).rejects.toBeDefined();
    expect(h.store.has('planner-v1')).toBe(false);
    expect(h.store.has('planner-v0')).toBe(true);
    expect(h.self.skipWaiting).not.toHaveBeenCalled();
  });

  it('after a failed v1 install, v2 keeps v0 as the previous generation', async () => {
    const h1 = setup(['/index.html', '/app.js'], 'v1');
    h1.seed('planner-v0', { '/index.html': res('old') });
    h1.fetchFn.mockImplementation(async () => ({ ok: false, status: 500 }) as any);
    await expect(h1.fire('install').waited).rejects.toBeDefined();
    // Same cache storage, new worker version.
    const h2 = setup(['/index.html', '/app.js'], 'v2');
    for (const [k, v] of h1.store) h2.store.set(k, v);
    await h2.fire('install').waited;
    await h2.fire('activate').waited;
    expect([...h2.store.keys()]).toEqual(['planner-v0', 'planner-v2']);
  });

  it('failed reinstall of the same version does not delete the existing cache', async () => {
    const h = setup();
    h.seed('planner-v1', { '/index.html': res('live') });
    h.fetchFn.mockImplementation(async () => ({ ok: false, status: 500 }) as any);
    await expect(h.fire('install').waited).rejects.toBeDefined();
    expect(h.store.has('planner-v1')).toBe(true);
  });

  it('activate keeps current and previous generation', async () => {
    const h = setup(['/index.html'], 'c');
    h.seed('planner-a', {});
    h.seed('planner-b', {});
    h.seed('planner-c', {});
    h.seed('other-cache', {});
    await h.fire('activate').waited;
    expect(h.store.has('planner-a')).toBe(false);
    expect(h.store.has('planner-b')).toBe(true);
    expect(h.store.has('planner-c')).toBe(true);
    expect(h.store.has('other-cache')).toBe(true);
    expect(h.self.clients.claim).toHaveBeenCalled();
  });

  it('navigation is answered with cached index.html', async () => {
    const h = setup();
    const idx = res('index-v1');
    h.seed('planner-v1', { '/index.html': idx });
    h.fetchFn.mockRejectedValue(new Error('offline'));
    const out = h.fire('fetch', nav());
    expect(await out.responded).toBe(idx);
  });

  it('navigation uses the current index.html, not an older generation', async () => {
    const h = setup();
    const oldIdx = res('index-v0');
    h.seed('planner-v0', { '/index.html': oldIdx });
    await h.fire('install').waited;
    const out = h.fire('fetch', nav());
    const r = await out.responded;
    expect(r).not.toBe(oldIdx);
    expect(r.body).toBe('net:' + ORIGIN + '/index.html');
  });

  it('navigation falls back to network when index.html is not cached', async () => {
    const h = setup();
    const out = h.fire('fetch', nav());
    const r = await out.responded;
    expect(r.body).toBe('net:' + ORIGIN + '/expenses');
    expect(h.fetchFn).toHaveBeenCalledTimes(1);
  });

  it('asset cache hit does not touch the network', async () => {
    const h = setup();
    const js = res('js');
    h.seed('planner-v1', { '/app.js': js });
    const out = h.fire('fetch', asset('/app.js'));
    expect(await out.responded).toBe(js);
    expect(h.fetchFn).not.toHaveBeenCalled();
  });

  it('asset missing from current cache is served from an older generation', async () => {
    const h = setup();
    const js = res('old-js');
    h.seed('planner-v0', { '/chunk.js': js });
    h.seed('planner-v1', {});
    const out = h.fire('fetch', asset('/chunk.js'));
    expect(await out.responded).toBe(js);
    expect(h.fetchFn).not.toHaveBeenCalled();
  });

  it('asset miss fetches then caches a 200 basic response', async () => {
    const h = setup();
    h.seed('planner-v1', {});
    const out = h.fire('fetch', asset('/new.js'));
    const r = await out.responded;
    expect(r.body).toBe('net:' + ORIGIN + '/new.js');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.cacheOf('planner-v1')!.get(ORIGIN + '/new.js')).toBe(r);
  });

  it('install rejects when a non-html url returns 200 text/html (SPA rewrite)', async () => {
    const h = setup();
    h.seed('planner-v0', { '/index.html': res('old') });
    h.fetchFn.mockImplementation(async (k: any) =>
      norm(k).endsWith('/app.js')
        ? res('<html>', { contentType: 'text/html; charset=utf-8' })
        : res('x'),
    );
    await expect(h.fire('install').waited).rejects.toThrow('/app.js');
    expect(h.self.skipWaiting).not.toHaveBeenCalled();
    expect(h.store.has('planner-v1')).toBe(false);
    expect(h.store.has('planner-v0')).toBe(true);
  });

  it('install succeeds when /index.html itself is text/html', async () => {
    const h = setup();
    h.fetchFn.mockImplementation(async (k: any) =>
      norm(k).endsWith('/index.html')
        ? res('<html>', { contentType: 'text/html; charset=utf-8' })
        : res('x'),
    );
    await h.fire('install').waited;
    expect(h.self.skipWaiting).toHaveBeenCalledTimes(1);
    expect(h.cacheOf('planner-v1')!.size).toBe(2);
  });

  it('runtime text/html response for an asset is returned but not cached', async () => {
    const h = setup();
    h.seed('planner-v1', {});
    const html = res('<html>', { contentType: 'text/html' });
    h.fetchFn.mockResolvedValueOnce(html);
    expect(await h.fire('fetch', asset('/gone.js')).responded).toBe(html);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.cacheOf('planner-v1')!.size).toBe(0);
  });

  it('runtime javascript asset is still cached', async () => {
    const h = setup();
    h.seed('planner-v1', {});
    const js = res('js', { contentType: 'application/javascript' });
    h.fetchFn.mockResolvedValueOnce(js);
    expect(await h.fire('fetch', asset('/ok.js')).responded).toBe(js);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.cacheOf('planner-v1')!.get(ORIGIN + '/ok.js')).toBe(js);
  });

  it('404 and opaque responses are not cached', async () => {
    const h = setup();
    h.seed('planner-v1', {});
    const notFound = res('nf', { status: 404, ok: false });
    const opaque = res('op', { type: 'opaque' });
    h.fetchFn.mockResolvedValueOnce(notFound).mockResolvedValueOnce(opaque);
    expect(await h.fire('fetch', asset('/missing.js')).responded).toBe(notFound);
    expect(await h.fire('fetch', asset('/op.js')).responded).toBe(opaque);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.cacheOf('planner-v1')!.size).toBe(0);
  });

  it('asset url with a query string misses the cache and goes to the network', async () => {
    const h = setup();
    h.seed('planner-v1', { '/app.js': res('js') });
    const r = await h.fire('fetch', asset('/app.js?x=1')).responded;
    expect(r.body).toBe('net:' + ORIGIN + '/app.js?x=1');
    expect(h.fetchFn).toHaveBeenCalledTimes(1);
  });

  it('non-GET and cross-origin requests are not handled', () => {
    const h = setup();
    const post = h.fire('fetch', { request: { method: 'POST', mode: 'cors', url: ORIGIN + '/api' } });
    const cross = h.fire('fetch', {
      request: { method: 'GET', mode: 'cors', url: 'https://other.test/x.js' },
    });
    expect(post.responded).toBeUndefined();
    expect(cross.responded).toBeUndefined();
  });
});
