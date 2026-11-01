/**
 * MapLibre GL JS v6 ships a separate worker module. Bundlers (Vite) break
 * auto-detection of that URL, which yields a blank map and:
 * "Worker failed to load. Check that the worker URL is correct."
 *
 * Import this module once before any Map is created.
 * Use `?worker&url` so Vite also bundles the worker's shared chunk.
 */
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);
