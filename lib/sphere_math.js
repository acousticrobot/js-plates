import * as THREE from 'three';

// Convert latitude and longitude to 3D coordinates on a unit sphere
function latLonToXYZ(lat, lon, radius = 1) {
  // Convert to radians
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;

  // Convert to Cartesian coordinates using standard spherical formula
  // x = r * cos(lat) * cos(lon)
  // y = r * sin(lat)
  // z = r * cos(lat) * sin(lon)
  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.sin(lonRad);

  // Return as Vector3 for proper Three.js geometry creation
  return new THREE.Vector3(x, y, z);
}

export { latLonToXYZ }
