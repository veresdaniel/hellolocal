export type MapPoint = { lat: number; lng: number };

export type MapFrame = { lat: number; lng: number; zoom: number };

/** Center and zoom that fit the given points. One point uses singleZoom. */
export function framePoints(points: MapPoint[], singleZoom: number): MapFrame {
  if (points.length === 0) {
    return { lat: 47.4979, lng: 19.0402, zoom: singleZoom };
  }
  if (points.length === 1) {
    return { lat: points[0].lat, lng: points[0].lng, zoom: singleZoom };
  }
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const range = Math.max(maxLat - minLat, maxLng - minLng);
  let zoom = 14;
  if (range > 3) zoom = 6;
  else if (range > 1.5) zoom = 7;
  else if (range > 0.8) zoom = 8;
  else if (range > 0.4) zoom = 9;
  else if (range > 0.2) zoom = 10;
  else if (range > 0.1) zoom = 11;
  else if (range > 0.05) zoom = 12;
  else if (range > 0.02) zoom = 13;
  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
    zoom,
  };
}
