// Cloudflare Worker for Basic-OS Desktop
// Serves the full desktop UI at /, fonts at /shared/fonts/, VM resources at /v86/* and /iso/*

const GITHUB_RAW = 'https://raw.githubusercontent.com/HuHuBasic/Basic-OS/main';

// Font files - served from worker (small enough to bundle)
const FONT_FILES = {
  '/shared/fonts/ArsenalSC-Regular.ttf': GITHUB_RAW + '/shared/fonts/ArsenalSC-Regular.ttf',
  '/shared/fonts/BricolageGrotesque-Regular.ttf': GITHUB_RAW + '/shared/fonts/BricolageGrotesque-Regular.ttf',
  '/shared/fonts/BricolageGrotesque-Bold.ttf': GITHUB_RAW + '/shared/fonts/BricolageGrotesque-Bold.ttf',
  '/shared/fonts/GeistMono-Regular.ttf': GITHUB_RAW + '/shared/fonts/GeistMono-Regular.ttf',
  '/shared/fonts/GeistMono-Bold.ttf': GITHUB_RAW + '/shared/fonts/GeistMono-Bold.ttf',
};

function getMime(path) {
  const ext = path.split('.').pop().toLowerCase();
  const mimes = {
    js: 'application/javascript', wasm: 'application/wasm',
    bin: 'application/octet-stream', img: 'application/octet-stream',
    iso: 'application/octet-stream', html: 'text/html; charset=utf-8',
    css: 'text/css', json: 'application/json',
    png: 'image/png', svg: 'image/svg+xml',
    ttf: 'font/ttf', woff: 'font/woff', woff2: 'font/woff2',
  };
  return mimes[ext] || 'application/octet-stream';
}

async function handleRequest(request) {
  const url = new URL(request.url);
  let path = url.pathname;

  // Serve main desktop page
  if (path === '/' || path === '/index.html') {
    // Fetch the latest desktop HTML from GitHub
    try {
      const resp = await fetch(GITHUB_RAW + '/index.html', { cf: { cacheTtl: 300 } });
      if (resp.ok) {
        let html = await resp.text();
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch(e) {
      // Fallback: serve embedded desktop page
    }
    // If fetch fails, return error
    return new Response('Failed to load desktop page', { status: 503 });
  }

  // Serve font files
  if (path.startsWith('/shared/fonts/')) {
    const fontUrl = FONT_FILES[path];
    if (fontUrl) {
      try {
        const resp = await fetch(fontUrl, { cf: { cacheTtl: 86400 } });
        if (resp.ok && resp.body) {
          return new Response(resp.body, {
            headers: {
              'Content-Type': 'font/ttf',
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      } catch(e) {}
    }
    return new Response('Font not found', { status: 404 });
  }

  // Proxy v86 resources
  if (path.startsWith('/v86/') || path.startsWith('/build/')) {
    let v86Path;
    if (path.startsWith('/v86/')) {
      v86Path = path.substring('/v86'.length);
      const rootFiles = ['/v86_all.js', '/v86.wasm', '/libv86.js', '/libv86.mjs', '/libv86-debug.js', '/v86-fallback.wasm', '/v86.css', '/xterm.js'];
      if (rootFiles.includes(v86Path)) {
        v86Path = '/build' + v86Path;
      }
    } else {
      v86Path = path;
    }

    let v86Url;
    if (v86Path === '/build/libv86.js' || v86Path === '/build/v86.wasm') {
      v86Url = 'https://cdn.jsdelivr.net/npm/v86@0.5.44' + v86Path;
    } else {
      v86Url = 'https://copy.sh/v86' + v86Path;
    }
    try {
      const resp = await fetch(v86Url);
      if (!resp.ok) return new Response('v86 resource not found', { status: 404 });
      return new Response(resp.body, {
        headers: {
          'Content-Type': getMime(v86Path),
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      });
    } catch(e) {
      return new Response('v86 proxy error: ' + e.message, { status: 503 });
    }
  }

  // Proxy ReactOS ISOs
  if (path === '/iso/reactos-livecd.iso' || path === '/iso/reactos-bootcd.iso') {
    const reactosUrl = path === '/iso/reactos-livecd.iso'
      ? 'https://iso.reactos.org/livecd/latest-x86-gcc-lin-rel'
      : 'https://iso.reactos.org/bootcd/latest-x86-gcc-lin-rel';
    try {
      const resp = await fetch(reactosUrl, { redirect: 'follow' });
      if (!resp.ok) return new Response('ReactOS ISO not found', { status: 404 });
      return new Response(resp.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      });
    } catch(e) {
      return new Response('ReactOS proxy error: ' + e.message, { status: 503 });
    }
  }

  // Proxy GitHub-based ISO files
  if (path.startsWith('/iso/')) {
    const isoName = path.substring('/iso'.length);
    const isoUrl = GITHUB_RAW + isoName;
    try {
      const resp = await fetch(isoUrl);
      if (!resp.ok) return new Response('ISO not found', { status: 404 });
      return new Response(resp.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
      });
    } catch(e) {
      return new Response('ISO proxy error: ' + e.message, { status: 503 });
    }
  }

  // Proxy other static files from GitHub
  try {
    const ghUrl = GITHUB_RAW + path;
    const resp = await fetch(ghUrl);
    if (!resp.ok) return new Response('Not Found', { status: 404 });
    return new Response(resp.body, {
      headers: {
        'Content-Type': getMime(path),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch(e) {
    return new Response('Service Unavailable', { status: 503 });
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});