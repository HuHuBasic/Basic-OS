// Cloudflare Worker for Basic-OS VM
// Proxies v86 resources from copy.sh and serves VM page with COOP/COEP headers

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const GITHUB_RAW = 'https://raw.githubusercontent.com/HuHuBasic/Basic-OS/main';

// BPB patching for corrupt Basic-OS ISO files
const ISO_BPB_PATCH = {
  '/basic-os-64.iso':    { size: 5099520, sectors: 9960,  spf: 30 },
  '/basic-os-32.iso':    { size: 5179392, sectors: 10116, spf: 30 },
  '/basic-os-64-32.iso': { size: 5122048, sectors: 10004, spf: 30 },
};

function getMime(path) {
  const ext = path.split('.').pop().toLowerCase();
  const mimes = {
    js: 'application/javascript',
    wasm: 'application/wasm',
    bin: 'application/octet-stream',
    img: 'application/octet-stream',
    iso: 'application/octet-stream',
    html: 'text/html; charset=utf-8',
    css: 'text/css',
    json: 'application/json',
    png: 'image/png',
    svg: 'image/svg+xml',
    ttf: 'font/ttf',
    woff: 'font/woff',
    woff2: 'font/woff2',
  };
  return mimes[ext] || 'application/octet-stream';
}

function patchBPB(buffer, totalSectors, sectorsPerFat) {
  const data = new Uint8Array(buffer);
  if (data[0x0B] !== 0x90 || data[0x0C] !== 0x90) return buffer;
  const view = new DataView(buffer);
  view.setUint16(0x0B, 512, true);
  data[0x0D] = 1;
  view.setUint16(0x0E, 1, true);
  data[0x10] = 2;
  view.setUint16(0x11, 224, true);
  view.setUint16(0x13, 0, true);
  data[0x15] = 0xF0;
  view.setUint16(0x16, sectorsPerFat, true);
  view.setUint16(0x18, 63, true);
  view.setUint16(0x1A, 16, true);
  view.setUint32(0x1C, 0, true);
  view.setUint32(0x20, totalSectors, true);
  return buffer;
}

function patchBootCatalog(buffer) {
  const data = new Uint8Array(buffer);
  const BOOT_RECORD_OFFSET = 0x8000;
  const BOOT_CATALOG_PTR_OFFSET = BOOT_RECORD_OFFSET + 0x47;
  if (buffer.byteLength <= BOOT_CATALOG_PTR_OFFSET + 4) return buffer;
  const view = new DataView(buffer);
  const currentPtr = view.getUint32(BOOT_CATALOG_PTR_OFFSET, true);
  if (currentPtr === 32) {
    view.setUint32(BOOT_CATALOG_PTR_OFFSET, 48, true);
  }
  return buffer;
}

async function handleRequest(request) {
  const url = new URL(request.url);
  let path = url.pathname;

  // Serve main page
  if (path === '/' || path === '/index.html') {
    const html = await fetch('https://raw.githubusercontent.com/HuHuBasic/Basic-OS/main/vm.html');
    if (!html.ok) return new Response('Not Found', { status: 404 });
    return new Response(html.body, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, must-revalidate',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Proxy v86 resources
  // libv86.js and v86.wasm from npm (jsdelivr) - proper API with add_listener
  // BIOS, images from copy.sh
  if (path.startsWith('/v86/') || path.startsWith('/build/')) {
    let v86Path;
    let v86Url;
    if (path.startsWith('/v86/')) {
      v86Path = path.substring('/v86'.length);
      // Map root-level files to /build/ directory
      const rootFiles = ['/v86_all.js', '/v86.wasm', '/libv86.js', '/libv86.mjs', '/libv86-debug.js', '/v86-fallback.wasm', '/v86.css', '/xterm.js'];
      if (rootFiles.includes(v86Path)) {
        v86Path = '/build' + v86Path;
      }
    } else {
      v86Path = path; // /build/... already has correct structure
    }
    
    // libv86.js and v86.wasm from npm package (jsdelivr) - has proper API
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

  // Proxy ISO files from GitHub with BPB patching
  if (path.startsWith('/iso/')) {
    const isoName = path.substring('/iso'.length);
    const isoUrl = GITHUB_RAW + isoName;
    try {
      const resp = await fetch(isoUrl);
      if (!resp.ok) return new Response('ISO not found', { status: 404 });
      const buffer = await resp.arrayBuffer();
      let patched = buffer;
      const patch = ISO_BPB_PATCH[isoName];
      if (patch) {
        patched = patchBPB(buffer, patch.sectors, patch.spf);
        patched = patchBootCatalog(patched);
      }
      return new Response(patched, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Content-Length': String(patched.byteLength),
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