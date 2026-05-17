let server;

async function getServer() {
  if (!server) {
    const mod = await import("../dist/server/index.js");
    server = mod.default ?? mod;
  }
  return server;
}

export default async function handler(req, res) {
  try {
    const { default: handler } = await getServer();
    const url = new URL(req.url, `https://${req.headers.host}`);
    const request = new Request(url, {
      method: req.method,
      headers: new Headers(req.headers),
      body: req.method !== "GET" && req.method !== "HEAD" ? await new Promise((resolve) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
      }) : undefined,
    });
    const response = await handler.fetch(request, {}, {});
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const text = await response.text();
    res.end(text);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
