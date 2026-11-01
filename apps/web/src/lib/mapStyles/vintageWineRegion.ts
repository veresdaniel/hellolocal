/**
 * Custom MapLibre style for HelloLocal wine-region maps.
 *
 * Built from OpenFreeMap Bright layer structure + planet tiles / OFM glyphs &
 * sprites, with a parchment / olive / dusty-teal / sepia paint remap.
 * Keyless; not a Carto basemap. OFM stock fonts are Noto Sans only (no serif).
 *
 * Base: https://tiles.openfreemap.org/styles/bright — colors live in the JSON.
 */
import type { StyleSpecification } from "maplibre-gl";
import styleJson from "./vintageWineRegion.json";

/** Parchment land, richer greens, dusty water, burnished roads, sepia labels. */
export const vintageWineRegionStyle = styleJson as StyleSpecification;

/** Bump when the JSON palette changes so MapComponent remounts cleanly. */
export const VINTAGE_WINE_REGION_STYLE_ID = "ofm-vintage-wine-2";