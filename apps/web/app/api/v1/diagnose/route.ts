const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "https://smart-agric-api.vercel.app").replace(
  /\/$/,
  ""
);

const buildHeaders = (request: Request) => {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  return headers;
};

const proxyRequest = async (request: Request, target: string) => {
  const init: RequestInit = {
    method: request.method,
    headers: buildHeaders(request),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    // @ts-expect-error - duplex is required for streaming bodies in Node.
    init.duplex = "half";
  }

  const response = await fetch(target, init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
};

export async function POST(request: Request) {
  return proxyRequest(request, `${API_BASE}/api/v1/diagnose`);
}
