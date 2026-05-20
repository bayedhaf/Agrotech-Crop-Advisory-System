const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "https://smart-agric-api.vercel.app").replace(
  /\/$/,
  ""
);

const buildHeaders = (request: Request) => {
  const headers = new Headers(request.headers);
  headers.delete("host");
  return headers;
};

const proxyRequest = async (request: Request, target: string) => {
  const response = await fetch(target, {
    method: request.method,
    headers: buildHeaders(request),
  });
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
};

export async function GET(request: Request) {
  return proxyRequest(request, `${API_BASE}/api/v1/diagnose/history`);
}
