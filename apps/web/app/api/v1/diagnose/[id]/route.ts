const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "https://smart-agric-api.vercel.app/").replace(
  /\/$/,
  ""
);

const buildHeaders = (request: Request) => {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("ngrok-skip-browser-warning", "true");
  return headers;
};

const proxyRequest = async (request: Request, target: string) => {
  console.info("[diagnose-proxy] request", {
    method: request.method,
    target,
  });
  const init: RequestInit = {
    method: request.method,
    headers: buildHeaders(request),
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    // @ts-expect-error - duplex is required for streaming bodies in Node.
    init.duplex = "half";
  }

  let response: Response;
  try {
    response = await fetch(target, init);
  } catch (error) {
    console.error("[diagnose-proxy] fetch error", error);
    throw error;
  }
  console.info("[diagnose-proxy] response", {
    status: response.status,
    ok: response.ok,
  });
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return proxyRequest(request, `${API_BASE}/api/v1/diagnose/${params.id}`);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return proxyRequest(request, `${API_BASE}/api/v1/diagnose/${params.id}`);
}
