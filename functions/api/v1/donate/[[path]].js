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
  // Tell Django the original request came via HTTPS (needed for
  // SECURE_PROXY_SSL_HEADER so Django doesn't 301-redirect to HTTPS)
  headers.set("X-Forwarded-Proto", "https");

  const init = {
    method: request.method,
    headers: headers,
    redirect: "manual", // Pass redirects through to the browser (critical for Stripe checkout)
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(targetUrl.toString(), init);
  } catch (err) {
    return new Response(
      JSON.stringify({ detail: "Payment service temporarily unavailable." }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("content-length");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

