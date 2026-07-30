// Cloudflare Pages Function — proxy v86 resources (libv86, BIOS, images)
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const v86Path = path.substring('/v86'.length);

  // libv86.js and v86.wasm from npm (jsdelivr) — has proper API with add_listener
  let upstreamUrl;
  if (v86Path === '/libv86.js' || v86Path === '/v86.wasm') {
    upstreamUrl = 'https://cdn.jsdelivr.net/npm/v86@0.5.44/build' + v86Path;
  } else {
    upstreamUrl = 'https://copy.sh/v86' + v86Path;
  }

  try {
    const resp = await fetch(upstreamUrl);
    if (!resp.ok) return new Response('Resource not found', { status: 404 });

    const ext = path.split('.').pop().toLowerCase();
    const mimes = {
      js: 'application/javascript', wasm: 'application/wasm',
      bin: 'application/octet-stream', img: 'application/octet-stream',
    };

    return new Response(resp.body, {
      headers: {
        'Content-Type': mimes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch (e) {
    return new Response('Proxy error: ' + e.message, { status: 503 });
  }
}