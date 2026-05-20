const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "https://smart-agric-api.vercel.app/").replace(
  /\/$/,
  ""
);

const buildHeaders = (request: Request) => {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("ngrok-skip-browser-warning", "true");
  return headers;
};

const proxyRequest = async (request: Request, target: string) => {
  console.info("[diagnose-proxy] request", {
    method: request.method,
    target,
  });
  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers: buildHeaders(request),
    });
  } catch (error) {
    console.error("[diagnose-proxy] fetch error", error);
    throw error;
  }
  let responseBody = "";
  try {
    responseBody = await response.clone().text();
  } catch (error) {
    console.error("[diagnose-proxy] response read error", error);
  }
  console.info("[diagnose-proxy] response", {
    status: response.status,
    ok: response.ok,
    body: responseBody.slice(0, 2000),
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
