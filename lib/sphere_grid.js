import * as THREE from 'three';
import { latLonToVector3, vector3ToLatLon, calculatePolygonSize, isPointInPolygon, interpolateGreatCircle } from './sphere_math.js'

function generateSphericalGrid(points, baseDensity = 15) {
  const gridPoints = new Set();

  // Calculate weighted center point and size
  let centerVec = new THREE.Vector3();
  points.forEach(point => {
    const v = latLonToVector3(point[0], point[1]);
    centerVec.add(v);
  });
  centerVec.normalize();
  const center = vector3ToLatLon(centerVec);
  const size = calculatePolygonSize(points);

  // Calculate adaptive grid parameters based on polygon size
  const numRings = Math.max(5, Math.min(10, Math.ceil(size / 8)));
  const pointsPerRing = Math.max(16, Math.min(48, Math.ceil(size * 2.5)));
  const maxAngularDistance = Math.PI / 180 * size / 2; // Convert size to radians
  const jitterAmount = maxAngularDistance * 0.05; // 5% jitter

  // Add small offset to center point for natural look
  const centerOffset = new THREE.Vector3(
    (Math.random() - 0.5) * jitterAmount * 0.5,
    (Math.random() - 0.5) * jitterAmount * 0.5,
    (Math.random() - 0.5) * jitterAmount * 0.5
  );
  centerVec = centerVec.clone().add(centerOffset).normalize();
  const [centerLat, centerLon] = vector3ToLatLon(centerVec);
  gridPoints.add(`${centerLat.toFixed(6)},${centerLon.toFixed(6)}`);

  // Create concentric rings of points using spherical coordinates
  for (let ring = 1; ring <= numRings; ring++) {
    // Use non-linear ring spacing for better distribution
    const ringRadius = Math.pow(ring / numRings, 0.9) * maxAngularDistance;
    const ringPoints = Math.floor(pointsPerRing * Math.sqrt(ring / numRings));

    for (let i = 0; i < ringPoints; i++) {
      // Add small phase shift per ring for less regular pattern
      const azimuth = ((i + ring * 0.5) / ringPoints) * 2 * Math.PI;

      // Add controlled randomness to radius and azimuth
      const jitteredRadius = ringRadius + (Math.random() - 0.5) * jitterAmount;
      const jitteredAzimuth = azimuth + (Math.random() - 0.5) * jitterAmount;

      // Calculate spherical coordinates relative to center
      const sinRadius = Math.sin(jitteredRadius);
      const cosRadius = Math.cos(jitteredRadius);

      // Convert to Cartesian coordinates
      const x = sinRadius * Math.cos(jitteredAzimuth);
      const y = sinRadius * Math.sin(jitteredAzimuth);
      const z = cosRadius;

      // Create basis vectors for rotation
      const northPole = new THREE.Vector3(0, 1, 0);
      const rotationAxis = new THREE.Vector3().crossVectors(northPole, centerVec).normalize();
      const rotationAngle = Math.acos(centerVec.dot(northPole));

      // Create and rotate the point
      const point = new THREE.Vector3(x, z, y); // Note: y and z swapped for correct orientation
      if (!rotationAxis.equals(new THREE.Vector3(0, 0, 0))) {
        point.applyAxisAngle(rotationAxis, rotationAngle);
      }

      const [lat, lon] = vector3ToLatLon(point);

      // Only add points that fall within the polygon
      if (isPointInPolygon([lat, lon], points)) {
        gridPoints.add(`${lat.toFixed(6)},${lon.toFixed(6)}`);
      }
    }
  }

  // Add boundary points with high density and slight inward offset
  const density = Math.max(10, Math.min(50, Math.round(baseDensity * (180 / size))));
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const segment = interpolateGreatCircle(p1, p2, density);

    segment.forEach(p => {
      const vec = latLonToVector3(p[0], p[1]);
      const centerDir = latLonToVector3(center[0], center[1]);
      // Move point slightly towards center
      const offsetVec = new THREE.Vector3().copy(vec)
        .lerp(centerDir, 0.02)
        .normalize();
      const [lat, lon] = vector3ToLatLon(offsetVec);
      gridPoints.add(`${lat.toFixed(6)},${lon.toFixed(6)}`);
    });
  }

  // Convert back to points array
  return Array.from(gridPoints).map(str => {
    const [lat, lon] = str.split(',').map(Number);
    return [lat, lon];
  });
}

export { generateSphericalGrid }