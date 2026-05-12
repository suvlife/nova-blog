export async function onRequest(context) {
  const url = new URL(context.request.url);
  const apiPath = url.pathname.replace(/^\/api/, '') || '/';
  const targetUrl = `https://api.blog.guofeng.me/api${apiPath}${url.search}`;

  const headers = new Headers(context.request.headers);
  headers.set('Host', 'api.blog.guofeng.me');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  try {
    const response = await fetch(targetUrl, {
      method: context.request.method,
      headers,
      body: context.request.method !== 'GET' && context.request.method !== 'HEAD'
        ? context.request.body
        : undefined,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', 'https://blog.guofeng.me');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    responseHeaders.set('Access-Control-Max-Age', '86400');

    if (context.request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: responseHeaders });
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, message: 'API 代理错误: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
