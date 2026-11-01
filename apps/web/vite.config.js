import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Generate version.json before build
function generateVersionJson() {
    try {
        const packageJson = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8"));
        const version = packageJson.version || "0.1.0-beta";
        const buildHash = createHash("md5")
            .update(`${Date.now()}-${Math.random()}`)
            .digest("hex");
        const versionInfo = {
            version,
            buildHash,
            timestamp: Date.now(),
        };
        writeFileSync(join(__dirname, "public/version.json"), JSON.stringify(versionInfo, null, 2), "utf-8");
        console.log(`[Vite] Generated version.json: ${version} (${buildHash.substring(0, 7)})`);
    }
    catch (error) {
        console.warn("[Vite] Failed to generate version.json:", error);
    }
}
// Read version from package.json for Vite define
const packageJson = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8"));
const appVersion = packageJson.version || "0.1.0-beta";
export default defineConfig(({ mode }) => {
    const isStaging = mode === "staging";
    const isLive = mode === "live";
    const liveApiTarget = "https://api.hello-local.io";
    const stagingApiUrl = isStaging
        ? process.env.VITE_API_URL ||
            loadEnv(mode, __dirname, "VITE_").VITE_API_URL ||
            "http://localhost:3003"
        : "http://localhost:3002";
    const apiProxyTarget = isLive
        ? liveApiTarget
        : isStaging
            ? stagingApiUrl
            : "http://localhost:3002";
    const serverPort = isLive ? 5175 : isStaging ? 5174 : 5173;
    return {
    plugins: [
        react(),
        {
            name: 'generate-version',
            buildStart() {
                // Generate version.json at the start of each build
                generateVersionJson();
            },
        },
        {
            name: 'favicon-fallback',
            configureServer(server) {
                // Add middleware early to catch favicon requests before other handlers
                server.middlewares.use((req, res, next) => {
                    // Skip WebSocket upgrade requests
                    if (req.headers.upgrade === 'websocket') {
                        return next();
                    }
                    if (req.url === '/favicon.ico' || req.url?.startsWith('/favicon.ico?')) {
                        try {
                            const iconPath = join(__dirname, 'public', 'favicon.ico');
                            if (existsSync(iconPath)) {
                                res.setHeader('Content-Type', 'image/x-icon');
                                res.setHeader('Cache-Control', 'public, max-age=31536000');
                                res.statusCode = 200;
                                res.end(readFileSync(iconPath));
                                return;
                            }
                        }
                        catch (error) {
                            console.error('[Vite] favicon-fallback error:', error);
                        }
                    }
                    next();
                });
            },
        },
        {
            name: "live-browse-banner",
            configureServer(server) {
                if (!isLive)
                    return;
                server.httpServer?.once("listening", () => {
                    console.warn("");
                    console.warn("[local:live] Proxy /api → https://api.hello-local.io — production data, browse-only.");
                    console.warn("[local:live] No local API / no production DATABASE_URL in this process. Do not seed/migrate/truncate live.");
                    console.warn("");
                });
            },
        },
    ],
    define: {
        // Inject version from package.json at build time
        __APP_VERSION__: JSON.stringify(appVersion),
        ...(isLive ? { "import.meta.env.VITE_API_URL": JSON.stringify("") } : {}),
    },
    resolve: {
        alias: {
            "mapbox-gl": "maplibre-gl",
        },
    },
    server: {
        host: 'localhost', // Listen on localhost only (fixes EPERM on macOS)
        port: serverPort,
        strictPort: isStaging || isLive,
        // HMR is automatically configured by Vite, no need for explicit config
        proxy: {
            "/api": {
                target: apiProxyTarget,
                changeOrigin: true,
                secure: isLive ? true : undefined,
                ws: true, // Enable WebSocket proxying for API
            },
        },
        watch: {
            usePolling: false, // Use native file system events
        },
    },
    build: {
        // Remove all console statements in production build
        esbuild: {
            drop: mode === "production" ? ["console", "debugger"] : [],
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    // React core libraries
                    "react-vendor": ["react", "react-dom", "react-router-dom"],
                    // Query library
                    "query-vendor": ["@tanstack/react-query"],
                    // i18n libraries
                    "i18n-vendor": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
                    // Map libraries (large)
                    "map-vendor": ["maplibre-gl", "react-map-gl/maplibre"],
                    // Editor libraries (large, only used in admin)
                    "editor-vendor": ["@tiptap/react", "@tiptap/starter-kit", "@tiptap/extension-placeholder"],
                    // Chart library
                    "chart-vendor": ["recharts"],
                    // State management
                    "state-vendor": ["zustand"],
                },
            },
        },
        chunkSizeWarningLimit: 1000, // Increase limit to 1MB for better visibility
    },
    };
});
