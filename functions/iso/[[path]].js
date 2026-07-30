// Cloudflare Pages Function — proxy ISO files from GitHub with BPB patching
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const isoName = url.pathname;

  const GITHUB_RAW = 'https://raw.githubusercontent.com/HuHuBasic/Basic-OS/main';
  const isoUrl = GITHUB_RAW + isoName;

  const ISO_BPB_PATCH = {
    '/iso/basic-os-64.iso':    { sectors: 9960,  spf: 30 },
    '/iso/basic-os-32.iso':    { sectors: 10116, spf: 30 },
    '/iso/basic-os-64-32.iso': { sectors: 10004, spf: 30 },
  };

  try {
    const resp = await fetch(isoUrl);
    if (!resp.ok) return new Response('ISO not found', { status: 404 });

    const buffer = await resp.arrayBuffer();
    let patched = buffer;
    const patch = ISO_BPB_PATCH[isoName];
    if (patch) {
      const data = new Uint8Array(buffer);
      // Only patch if BPB is corrupt (0x90 markers)
      if (data[0x0B] === 0x90 && data[0x0C] === 0x90) {
        const view = new DataView(buffer);
        view.setUint16(0x0B, 512, true);
        data[0x0D] = 1;
        view.setUint16(0x0E, 1, true);
        data[0x10] = 2;
        view.setUint16(0x11, 224, true);
        view.setUint16(0x13, 0, true);
        data[0x15] = 0xF0;
        view.setUint16(0x16, patch.spf, true);
        view.setUint16(0x18, 63, true);
        view.setUint16(0x1A, 16, true);
        view.setUint32(0x1C, 0, true);
        view.setUint32(0x20, patch.sectors, true);
        // Fix boot catalog pointer
        const BOOT_RECORD_OFFSET = 0x8000;
        const BOOT_CATALOG_PTR_OFFSET = BOOT_RECORD_OFFSET + 0x47;
        if (buffer.byteLength > BOOT_CATALOG_PTR_OFFSET + 4) {
          const currentPtr = view.getUint32(BOOT_CATALOG_PTR_OFFSET, true);
          if (currentPtr === 32) view.setUint32(BOOT_CATALOG_PTR_OFFSET, 48, true);
        }
        patched = buffer;
      }
    }

    return new Response(patched, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Content-Length': String(patched.byteLength),
      },
    });
  } catch (e) {
    return new Response('ISO proxy error: ' + e.message, { status: 503 });
  }
}