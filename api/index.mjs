import { join } from "path";

let server;

export default async function handler(req, res) {
  try {
    if (!server) {
      const base = join(process.cwd(), "dist/server");
      const candidates = ["server.js", "index.js"];
      let mod;
      for (const file of candidates) {
        try {
          mod = await import(join(base, file));
          if (mod) break;
        } catch {}
      }
      server = mod?.default ?? mod;
    }
    const url = new URL(req.url, `https://${req.headers.host}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else if (value !== undefined) {
        headers.set(key, value);
      }
    }
    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? await new Promise((resolve) => {
            const chunks = [];
            req.on("data", (c) => chunks.push(c));
            req.on("end", () => resolve(Buffer.concat(chunks)));
          })
        : undefined;
    const request = new Request(url, { method: req.method, headers, body });
    const response = await server.fetch(request, {}, {});
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
