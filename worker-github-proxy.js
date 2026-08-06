// 代理到 GitHub Pages 的 Worker
const TARGET = 'https://huhubasic.github.io';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const targetUrl = TARGET + url.pathname + url.search;

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow',
  });

  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  
  return new Response(response.body, {
    status: response.status,
    headers: headers,
  });
}