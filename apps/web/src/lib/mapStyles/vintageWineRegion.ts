/**
 * Custom MapLibre style for HelloLocal wine-region maps.
 *
 * Built from OpenFreeMap Bright (planet tiles + OFM glyphs/sprites) with a
 * warmer parchment / olive / sepia palette. No API key; not a Carto basemap.
 *
 * Regenerate: fetch https://tiles.openfreemap.org/styles/bright and re-apply
 * the vintage remaps in the sibling .json (or rebuild via the generation script).
 */
import type { StyleSpecification } from "maplibre-gl";
import styleJson from "./vintageWineRegion.json";

/** Parchment land, richer greens, dusty water, burnished roads, sepia labels. */
export const vintageWineRegionStyle = styleJson as StyleSpecification;

export const VINTAGE_WINE_REGION_STYLE_ID = "ofm-vintage-wine-1";
