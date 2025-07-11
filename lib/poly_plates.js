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

function generateSphericalGrid(points, baseDensity = 10) {
  // Adjust density based on polygon size
  const size = calculatePolygonSize(points);
  const density = Math.max(5, Math.min(30, Math.round(baseDensity * (180 / size))));
  
  const gridPoints = new Set();
  
  // Add original points
  points.forEach(point => {
    gridPoints.add(`${point[0].toFixed(6)},${point[1].toFixed(6)}`);
  });

  // Generate grid points along great circles
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const interpolated = interpolateGreatCircle(points[i], points[j], density);
      interpolated.forEach(point => {
        gridPoints.add(`${point[0].toFixed(6)},${point[1].toFixed(6)}`);
      });
    }
  }

  // Add interior grid points
  const centerVec = new THREE.Vector3();
  points.forEach(point => {
    const v = latLonToVector3(point[0], point[1]);
    centerVec.add(v);
  });
  centerVec.normalize();
  const center = vector3ToLatLon(centerVec);

  // Add radial points from center
  points.forEach(point => {
    const radialPoints = interpolateGreatCircle(center, point, Math.floor(density / 2));
    radialPoints.forEach(point => {
      gridPoints.add(`${point[0].toFixed(6)},${point[1].toFixed(6)}`);
    });
  });

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

  // Create surface geometry using grid points
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const points2D = [];

  // Add all grid points
  gridPoints.forEach(([lat, lon]) => {
    const pos = latLonToXYZ(lat, lon);
    positions.push(pos.x, pos.y, pos.z);
    points2D.push(lon / 360 + 0.5, lat / 180 + 0.5);
  });

  // Triangulate using the 2D points
  const triangles = earcut(points2D.flat(), null, 2);
  
  // Set up attributes
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();

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
  group.add(solidMesh);
  group.add(wireframe);
  group.add(outline);

  return group;
}

export { createPolygonPlate };
