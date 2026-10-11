import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("apps/web/out");
const prefix = "/momentum-project";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === prefix) {
      res.writeHead(302, { Location: prefix + "/" });
      res.end();
      return;
    }
    if (!url.pathname.startsWith(prefix + "/")) throw new Error("Not found");
    let relative = decodeURIComponent(url.pathname.slice(prefix.length));
    if (relative.endsWith("/")) relative += "index.html";
    const file = path.resolve(root, "." + relative);
    if (!file.startsWith(root + path.sep)) throw new Error("Not found");
    const content = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(3200, "127.0.0.1", () =>
  console.log("Preview: http://127.0.0.1:3200/momentum-project/welcome/"),
);
