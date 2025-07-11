import * as THREE from 'three';
import earcut from 'earcut';
import { latLonToXYZ, latLonToVector3, vector3ToLatLon, interpolateGreatCircle, } from './sphere_math.js';
import { generateSphericalGrid } from './sphere_grid.js';

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
