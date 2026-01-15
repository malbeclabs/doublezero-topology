import distance from "@turf/distance";
import { point } from "@turf/helpers";

export function generateGeodesicArc(
  start: [number, number],
  end: [number, number],
  steps?: number,
): [number, number][] {
  try {
    const distanceKm = distance(point(start), point(end), { units: "kilometers" });
    const numPoints = steps || calculateArcSteps(distanceKm);

    const startLon = start[0];
    const startLat = start[1];
    let endLon = end[0];
    const endLat = end[1];

    // Wrap across the antimeridian so long links take the shortest path.
    const lonDiff = endLon - startLon;
    if (Math.abs(lonDiff) > 180) {
      endLon += lonDiff > 0 ? -360 : 360;
    }

    const midLon = (startLon + endLon) / 2;
    const midLat = (startLat + endLat) / 2;

    const latDiff = endLat - startLat;

    const lineLength = Math.sqrt(lonDiff * lonDiff + latDiff * latDiff);
    let offsetFactor = 0.2;
    if (distanceKm > 7000) {
      offsetFactor = 0.1;
    } else if (distanceKm > 3000) {
      offsetFactor = 0.18;
    }
    const avgAbsLat = (Math.abs(startLat) + Math.abs(endLat)) / 2;
    const latScale = 1 - Math.min(avgAbsLat, 60) / 60 * 0.25;
    offsetFactor *= latScale;

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

      const lon = oneMinusTSquared * startLon + twoOneMinusTTimesT * controlPoint[0] + tSquared * endLon;
      const lat = oneMinusTSquared * startLat + twoOneMinusTTimesT * controlPoint[1] + tSquared * endLat;

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
  const distanceKm = distance(point(start), point(end), { units: "kilometers" });
  return distanceKm > 50;
}
