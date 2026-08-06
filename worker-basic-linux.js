// Basic Linux 项目 Worker
const GITHUB_RAW = 'https://raw.githubusercontent.com/HuHuBasic/Basic-linux/main';

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Basic Linux - 轻量级 Linux 发行版</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Noto Sans CJK SC', 'WenQuanYi Micro Hei', sans-serif;
    background: linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 50%, #0d0d35 100%);
    color: #e0e0e0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .header {
    text-align: center;
    padding: 60px 20px 40px;
  }
  .header h1 {
    font-size: 3em;
    background: linear-gradient(135deg, #00d4ff, #7b2ff7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 10px;
  }
  .header p {
    font-size: 1.2em;
    color: #888;
  }
  .content {
    max-width: 800px;
    width: 100%;
    padding: 0 20px;
  }
  .card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 20px;
    backdrop-filter: blur(10px);
  }
  .card h2 {
    color: #00d4ff;
    margin-bottom: 15px;
    font-size: 1.4em;
  }
  .card p, .card li {
    color: #b0b0b0;
    line-height: 1.8;
  }
  .download-btn {
    display: inline-block;
    background: linear-gradient(135deg, #00d4ff, #7b2ff7);
    color: white;
    padding: 15px 40px;
    border-radius: 30px;
    text-decoration: none;
    font-size: 1.1em;
    font-weight: 600;
    transition: transform 0.2s, box-shadow 0.2s;
    margin: 10px;
  }
  .download-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,212,255,0.3);
  }
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 15px;
  }
  .feature {
    background: rgba(0,212,255,0.05);
    border: 1px solid rgba(0,212,255,0.15);
    border-radius: 12px;
    padding: 15px;
    text-align: center;
  }
  .feature .icon {
    font-size: 2em;
    margin-bottom: 8px;
  }
  .feature h3 {
    color: #00d4ff;
    font-size: 1em;
    margin-bottom: 5px;
  }
  .feature p {
    font-size: 0.85em;
  }
  footer {
    text-align: center;
    padding: 40px 20px;
    color: #555;
    font-size: 0.9em;
  }
  footer a {
    color: #00d4ff;
    text-decoration: none;
  }
</style>
</head>
<body>
<div class="header">
  <h1>Basic Linux</h1>
  <p>轻量级、简洁的 Linux 发行版 | 基于 Basic-OS 生态</p>
</div>

<div class="content">
  <div class="card">
    <h2>下载 Basic Linux</h2>
    <p>Basic Linux 1.0 - 轻量级 Linux 发行版，适合学习和开发</p>
    <div style="text-align:center; margin-top:20px;">
      <a href="/BasicLinux-1.0.iso" class="download-btn">下载 ISO 镜像</a>
      <a href="https://github.com/HuHuBasic/Basic-linux" class="download-btn" style="background: rgba(255,255,255,0.1);">GitHub 仓库</a>
    </div>
  </div>

  <div class="card">
    <h2>特性</h2>
    <div class="features">
      <div class="feature">
        <div class="icon">🪶</div>
        <h3>轻量级</h3>
        <p>体积小巧，快速启动</p>
      </div>
      <div class="feature">
        <div class="icon">🔧</div>
        <h3>可定制</h3>
        <p>开源代码，自由修改</p>
      </div>
      <div class="feature">
        <div class="icon">💻</div>
        <h3>兼容性好</h3>
        <p>支持多种硬件平台</p>
      </div>
      <div class="feature">
        <div class="icon">📚</div>
        <h3>学习友好</h3>
        <p>适合学习操作系统原理</p>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>使用说明</h2>
    <p>Basic Linux 是一个轻量级的 Linux 发行版，基于 Linux 内核构建。您可以使用虚拟机软件（如 VirtualBox、QEMU、VMware）加载 ISO 镜像来运行，也可以将其写入 USB 驱动器进行物理机安装。</p>
    <p style="margin-top:10px;">详细使用说明请查看 <a href="https://github.com/HuHuBasic/Basic-linux" style="color:#00d4ff;">GitHub 仓库</a>。</p>
  </div>
</div>

<footer>
  <p>Basic Linux 项目 &copy; 2024-2026 | <a href="https://github.com/HuHuBasic">HuHuBasic</a></p>
  <p style="margin-top:8px;"><a href="https://basichu.de5.net">返回官网</a></p>
</footer>
</body>
</html>`;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/' || path === '/index.html') {
    return new Response(HTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (path === '/BasicLinux-1.0.iso') {
    const isoUrl = GITHUB_RAW + '/BasicLinux-1.0.iso';
    try {
      const resp = await fetch(isoUrl);
      if (!resp.ok) return new Response('ISO not found', { status: 404 });
      return new Response(resp.body, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="BasicLinux-1.0.iso"',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch(e) {
      return new Response('Error: ' + e.message, { status: 503 });
    }
  }

  return new Response('Not Found', { status: 404 });
}