// 生成自包含 Cloudflare Worker 脚本
const fs = require('fs');
const path = require('path');

const vmHtml = fs.readFileSync(path.join(__dirname, 'vm.html'), 'utf-8');

// 读取 worker 模板
let worker = fs.readFileSync(path.join(__dirname, 'cloudflare-worker-vm.js'), 'utf-8');

// 替换 fetch 调用为内联 HTML
const fetchBlock = `const html = await fetch('https://raw.githubusercontent.com/HuHuBasic/Basic-OS/main/vm.html');
    if (!html.ok) return new Response('Not Found', { status: 404 });
    return new Response(html.body, {`;

const inlineBlock = `const html = VM_HTML_TEMPLATE;
    return new Response(html, {`;

worker = worker.replace(fetchBlock, inlineBlock);

// 在文件开头插入 VM_HTML_TEMPLATE
const escapedHtml = vmHtml.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
const templateDecl = `const VM_HTML_TEMPLATE = \`${escapedHtml}\`;\n\n`;

worker = templateDecl + worker;

fs.writeFileSync(path.join(__dirname, 'cloudflare-worker-vm-self-contained.js'), worker);

console.log('Generated cloudflare-worker-vm-self-contained.js');
console.log('VM HTML size:', vmHtml.length, 'bytes');
console.log('Worker total size:', worker.length, 'bytes');