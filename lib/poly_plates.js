import * as THREE from 'three';
import earcut from 'earcut';
import { latLonToXYZ } from './sphere_math.js';

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

function createPolygonPlate(latLonPoints, color = 0x00ccff) {
  if (!latLonPoints || latLonPoints.length < 3) return null;

  // Create outline first
  const outlineGeometry = new THREE.BufferGeometry();
  const outlinePositions = [];
  
  // Generate interpolated points for the outline
  for (let i = 0; i < latLonPoints.length; i++) {
    const p1 = latLonPoints[i];
    const p2 = latLonPoints[(i + 1) % latLonPoints.length];
    const segmentPoints = interpolateGreatCircle(p1, p2, 30);
    segmentPoints.forEach(([lat, lon]) => {
      const pos = latLonToXYZ(lat, lon);
      outlinePositions.push(pos.x, pos.y, pos.z);
    });
  }
  outlineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(outlinePositions, 3));

  // Generate grid points for surface
  const gridPoints = generateSphericalGrid(latLonPoints, 10);

  // Create surface geometry
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const points2D = [];
  const points3D = [];

  // Calculate center position for projection
  const centerVec = new THREE.Vector3();
  latLonPoints.forEach(point => {
    const v = latLonToVector3(point[0], point[1]);
    centerVec.add(v);
  });
  centerVec.normalize();
  const [centerLat, centerLon] = vector3ToLatLon(centerVec);
  const centerPos = latLonToXYZ(centerLat, centerLon);
  const centerDir = new THREE.Vector3().copy(centerPos);

  // Create orthonormal basis for projection
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, centerDir).normalize();
  const forward = new THREE.Vector3().crossVectors(centerDir, right).normalize();

  gridPoints.forEach(([lat, lon]) => {
    const pos = latLonToXYZ(lat, lon);
    points3D.push(pos);

    // Project onto plane perpendicular to center direction
    const toPoint = new THREE.Vector3().copy(pos).sub(centerPos);
    const x = toPoint.dot(right);
    const y = toPoint.dot(forward);
    points2D.push(x, y);
  });

  // Sort points by distance from center for better triangulation
  const centerIdx = points3D.findIndex(p => p.equals(centerPos));
  if (centerIdx !== -1) {
    // Move center point to start of arrays
    points3D.unshift(points3D.splice(centerIdx, 1)[0]);
    const centerProj = points2D.splice(centerIdx * 2, 2);
    points2D.unshift(...centerProj);
  }

  // Triangulate the points
  const triangles = earcut(points2D, null, 2);

  // Create the final geometry
  triangles.forEach(index => {
    const pos = points3D[index];
    positions.push(pos.x, pos.y, pos.z);

    // Calculate color based on distance from center
    const distanceFromCenter = new THREE.Vector3(pos.x, pos.y, pos.z).distanceTo(centerPos);
    const t = Math.pow(Math.min(1, distanceFromCenter), 0.5);
    const baseColor = new THREE.Color(color);
    const edgeColor = new THREE.Color().setHex(color).multiplyScalar(1.5);
    const vertexColor = baseColor.lerp(edgeColor, t);
    colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  // Create materials with enhanced visual properties
  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    shininess: 80,
    emissive: new THREE.Color(color).multiplyScalar(0.15),
    flatShading: true // Enable flat shading to better show the triangulation
  });

  // Create surface mesh
  const surfaceMesh = new THREE.Mesh(geometry, material);

  // Create materials
  const solidMaterial = new THREE.MeshPhongMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    shininess: 100,
    emissive: new THREE.Color(color).multiplyScalar(0.2)
  });

  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15
  });

  // Create meshes
  const solidMesh = new THREE.Mesh(geometry, solidMaterial);
  const wireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    wireframeMaterial
  );
  const outline = new THREE.Line(
    outlineGeometry,
    new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
  );

  // Create group and add meshes
  const group = new THREE.Group();
  group.add(surfaceMesh);
  group.add(wireframe);
  group.add(outline);

  return group;
}

export { createPolygonPlate };
