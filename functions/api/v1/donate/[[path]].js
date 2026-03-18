export async function onRequest(context) {
  const { request } = context;

  const incomingUrl = new URL(request.url);
  const pathname = incomingUrl.pathname.replace(/^\/api\/v1\/donate/, "");
  const search = incomingUrl.search || "";

  const targetUrl = new URL(
    `/api/v1/donate${pathname}${search}`,
    "https://api.salafimasjid.app",
  );

  const headers = new Headers(request.headers);
  // Remove Cloudflare-specific headers that shouldn't be forwarded
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");

  const init = {
    method: request.method,
    headers: headers,
    redirect: "manual", // Pass redirects through to the browser (critical for Stripe checkout)
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

