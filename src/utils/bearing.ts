// Convert degrees to radians
function toRad(degrees: number): number {
    return degrees * Math.PI / 180;
}

// Convert radians to degrees
function toDeg(radians: number): number {
    return radians * 180 / Math.PI;
}

/**
 * Calculates the initial bearing from point A to point B in degrees (0 = North, 90 = East, etc.)
 */
export function getBearing(startLat: number, startLng: number, destLat: number, destLng: number): number {
    const startLatRad = toRad(startLat);
    const startLngRad = toRad(startLng);
    const destLatRad = toRad(destLat);
    const destLngRad = toRad(destLng);

    const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
    const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
              Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

    const bearingRad = Math.atan2(y, x);
    let bearingDeg = toDeg(bearingRad);

    // Normalize to 0-360
    bearingDeg = (bearingDeg + 360) % 360;
    return bearingDeg;
}

/**
 * Checks if a target bearing is within a certain cone angle from a reference bearing.
 * Handles the 360 degree wrap-around (e.g., 350 degrees is near 10 degrees).
 * coneAngle is total sweep (e.g. 60 means +/- 30 degrees).
 */
export function isWithinCone(targetBearing: number, referenceBearing: number, coneAngle: number = 60): boolean {
    let diff = Math.abs(targetBearing - referenceBearing) % 360;
    if (diff > 180) {
        diff = 360 - diff;
    }
    return diff <= (coneAngle / 2);
}
/**
 * Calculates the cross-track distance in km of a point from a great-circle path.
 * A positive dXt means the point is to the right of the path, a negative dXt to the left.
 */
export function getCrossTrackDistance(startLat: number, startLng: number, destLat: number, destLng: number, pointLat: number, pointLng: number): number {
    const R = 6371; // Earth radius in km
    const d13 = getDistanceAngular(startLat, startLng, pointLat, pointLng);
    const theta13 = toRad(getBearing(startLat, startLng, pointLat, pointLng));
    const theta12 = toRad(getBearing(startLat, startLng, destLat, destLng));

    const dXt = Math.asin(Math.sin(d13) * Math.sin(theta13 - theta12)) * R;
    return dXt;
}

/**
 * Calculates angular distance (in radians) between two points
 */
function getDistanceAngular(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return c;
}
