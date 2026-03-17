export async function onRequest(context) {
  const { request } = context;

  const incomingUrl = new URL(request.url);
  const pathname = incomingUrl.pathname.replace(/^\/api\/v1\/donate/, "");
  const search = incomingUrl.search || "";

  const targetUrl = new URL(
    `/api/v1/donate${pathname}${search}`,
    "https://api.salafimasjid.app",
  );

  const init = {
    method: request.method,
    headers: request.headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const upstreamResponse = await fetch(targetUrl.toString(), init);

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("content-length");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

