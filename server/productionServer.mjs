import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DASHBOARD_CACHE_TTL_MS,
  loadDashboardData,
} from "./dashboardDataService.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendJson(res, statusCode, data, cacheControl = "no-store") {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": cacheControl,
  });
  res.end(JSON.stringify(data));
}

function sendStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = path.join(distDir, safePath);
  const filePath = requestedPath.startsWith(distDir)
    ? requestedPath
    : path.join(distDir, "index.html");

  fs.stat(filePath, (statError, stat) => {
    const finalPath = !statError && stat.isFile() ? filePath : path.join(distDir, "index.html");
    const ext = path.extname(finalPath);

    fs.readFile(finalPath, (readError, content) => {
      if (readError) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "content-type": contentTypes[ext] || "application/octet-stream",
        "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      });
      res.end(content);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/rostics-dashboard-api" || url.pathname === "/rostics-dashboard-api/") {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    try {
      const data = await loadDashboardData({ root });
      sendJson(res, 200, data, `private, max-age=${DASHBOARD_CACHE_TTL_MS / 1000}`);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  sendStatic(req, res);
});

server.listen(port, () => {
  console.log(`Rostics dashboard listening on http://localhost:${port}`);
});
