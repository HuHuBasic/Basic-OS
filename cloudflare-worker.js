// Basic-OS Cloudflare Worker — 静态网站托管
// 通过 Cloudflare CDN 加速，国内可访问

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;

    // 根路径重定向到 /Basic-OS/
    if (path === '/') {
      return Response.redirect('/Basic-OS/', 301);
    }

    // 去掉 /Basic-OS 前缀
    if (path.startsWith('/Basic-OS')) {
      path = path.substring('/Basic-OS'.length) || '/';
    }

    if (path === '/') path = '/index.html';

    // 根据扩展名设置 MIME 类型
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.ttf': 'font/ttf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.iso': 'application/octet-stream',
      '.sh': 'text/plain; charset=utf-8',
      '.md': 'text/plain; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
      // 从 GitHub raw 获取文件
      const githubUrl = 'https://raw.githubusercontent.com/HuHuBasic/Basic-OS/main' + path;
      const response = await fetch(githubUrl);

      if (!response.ok) {
        // 如果文件不存在，返回 index.html（SPA 回退）
        if (path !== '/index.html') {
          const indexResp = await fetch('https://raw.githubusercontent.com/HuHuBasic/Basic-OS/main/index.html');
          return new Response(await indexResp.text(), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        return new Response('Not Found', { status: 404 });
      }

      return new Response(response.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (e) {
      return new Response('Service Unavailable: ' + e.message, { status: 503 });
    }
  },
};