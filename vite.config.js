import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  DASHBOARD_CACHE_TTL_MS,
  loadDashboardData,
} from "./server/dashboardDataService.mjs";

function dashboardApiPlugin() {
  return {
    name: "dashboard-api",
    configureServer(server) {
      server.middlewares.use("/rostics-dashboard-api", async (req, res) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const data = await loadDashboardData({ root: server.config.root });
          res.statusCode = 200;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", `private, max-age=${DASHBOARD_CACHE_TTL_MS / 1000}`);
          res.end(JSON.stringify(data));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), dashboardApiPlugin()],
});
