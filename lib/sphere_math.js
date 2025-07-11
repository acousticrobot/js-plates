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

function latLonToVector3(lat, lon) {
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  return new THREE.Vector3(
    Math.cos(latRad) * Math.cos(lonRad),
    Math.sin(latRad),
    Math.cos(latRad) * Math.sin(lonRad)
  ).normalize();
}

function vector3ToLatLon(v) {
  const lat = Math.asin(v.y) * 180 / Math.PI;
  const lon = Math.atan2(v.z, v.x) * 180 / Math.PI;
  return [lat, lon];
}

function interpolateGreatCircle(p1, p2, segments = 30) {
  const points = [];
  const v1 = latLonToVector3(p1[0], p1[1]);
  const v2 = latLonToVector3(p2[0], p2[1]);

  // Calculate the angle between vectors
  const angle = v1.angleTo(v2);
  const axis = new THREE.Vector3().crossVectors(v1, v2).normalize();

  // Use quaternion for smoother rotation
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    q.setFromAxisAngle(axis, angle * t);
    v.copy(v1).applyQuaternion(q);
    points.push(vector3ToLatLon(v));
  }

  return points;
}

function calculatePolygonSize(points) {
  // Calculate approximate size based on maximum angular distance
  let maxAngle = 0;
  for (let i = 0; i < points.length; i++) {
    const v1 = latLonToVector3(points[i][0], points[i][1]);
    for (let j = i + 1; j < points.length; j++) {
      const v2 = latLonToVector3(points[j][0], points[j][1]);
      const angle = v1.angleTo(v2);
      maxAngle = Math.max(maxAngle, angle);
    }
  }
  return maxAngle * 180 / Math.PI;
}

function isPointInPolygon(point, polygon) {
  // Convert test point to vector
  const [testLat, testLon] = point;
  const testPoint = latLonToVector3(testLat, testLon);

  // Convert polygon points to vectors
  const polygonVectors = polygon.map(([lat, lon]) => latLonToVector3(lat, lon));

  // Calculate polygon center
  const center = new THREE.Vector3();
  polygonVectors.forEach(v => center.add(v));
  center.normalize();

  let windingNumber = 0;
  for (let i = 0; i < polygonVectors.length; i++) {
    const p1 = polygonVectors[i];
    const p2 = polygonVectors[(i + 1) % polygonVectors.length];

    // Create a plane containing the great circle arc and the center
    const normal = new THREE.Vector3().crossVectors(p1, p2).normalize();
    const d = normal.dot(testPoint);

    // Check which side of the plane the test point lies
    if (d > 0 && p1.angleTo(testPoint) < p1.angleTo(p2)) {
      windingNumber++;
    } else if (d < 0 && p2.angleTo(testPoint) < p2.angleTo(p1)) {
      windingNumber--;
    }
  }

  return Math.abs(windingNumber) > 0;
}
export { 
  interpolateGreatCircle, 
  calculatePolygonSize, 
  isPointInPolygon,
  latLonToXYZ, 
  latLonToVector3, 
  vector3ToLatLon 
}


