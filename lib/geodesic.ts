import * as turf from "@turf/turf";

export function generateGeodesicArc(
  start: [number, number],
  end: [number, number],
  steps?: number,
): [number, number][] {
  try {
    const distance = turf.distance(start, end, { units: "kilometers" });
    const numPoints = steps || calculateArcSteps(distance);

    const midLon = (start[0] + end[0]) / 2;
    const midLat = (start[1] + end[1]) / 2;

    const lonDiff = end[0] - start[0];
    const latDiff = end[1] - start[1];

    const lineLength = Math.sqrt(lonDiff * lonDiff + latDiff * latDiff);
    const offsetFactor = 0.2;

    let perpLon = -latDiff / lineLength * lineLength * offsetFactor;
    let perpLat = lonDiff / lineLength * lineLength * offsetFactor;

    if (perpLat < 0) {
      perpLat = -perpLat;
      perpLon = -perpLon;
    }

    const controlPoint: [number, number] = [midLon + perpLon, midLat + perpLat];

    const coordinates: [number, number][] = [];

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const oneMinusT = 1 - t;
      const oneMinusTSquared = oneMinusT * oneMinusT;
      const tSquared = t * t;
      const twoOneMinusTTimesT = 2 * oneMinusT * t;

      const lon = oneMinusTSquared * start[0] + twoOneMinusTTimesT * controlPoint[0] + tSquared * end[0];
      const lat = oneMinusTSquared * start[1] + twoOneMinusTTimesT * controlPoint[1] + tSquared * end[1];

      coordinates.push([lon, lat]);
    }

    return coordinates;
  } catch {
    return [start, end];
  }
}

export function calculateArcSteps(distance: number): number {
  if (distance < 500) return 50;
  if (distance < 2000) return 100;
  if (distance < 5000) return 150;
  return 200;
}

export function shouldUseGeodesicArc(
  start: [number, number],
  end: [number, number],
): boolean {
  const distance = turf.distance(start, end, { units: "kilometers" });
  return distance > 50;
}
