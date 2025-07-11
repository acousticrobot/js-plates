import * as THREE from 'three';
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

  // Group points by rings based on distance from center
  const rings = [];
  const centerVec = new THREE.Vector3();
  latLonPoints.forEach(point => {
    const v = latLonToVector3(point[0], point[1]);
    centerVec.add(v);
  });
  centerVec.normalize();
  const [centerLat, centerLon] = vector3ToLatLon(centerVec);
  const centerPos = latLonToXYZ(centerLat, centerLon);

  // Sort points into rings based on angular distance from center
  const points3D = gridPoints.map(([lat, lon]) => latLonToXYZ(lat, lon));
  const centerPoint = points3D.find(p => p.distanceTo(centerPos) < 0.01);
  if (centerPoint) rings.push([centerPoint]);

  const remainingPoints = points3D.filter(p => p !== centerPoint);
  const maxDist = Math.max(...remainingPoints.map(p => p.angleTo(centerVec)));
  const numRings = 10;
  const ringThresholds = Array.from({length: numRings}, (_, i) => (i + 1) * maxDist / numRings);

  ringThresholds.forEach((threshold, i) => {
    const ringPoints = remainingPoints.filter(p => {
      const angle = p.angleTo(centerVec);
      return angle <= threshold && (i === 0 || angle > ringThresholds[i - 1]);
    });
    if (ringPoints.length > 0) rings.push(ringPoints);
  });

  // Create triangles by connecting adjacent rings
  for (let i = 0; i < rings.length - 1; i++) {
    const innerRing = rings[i];
    const outerRing = rings[i + 1];

    // For the center point (first ring), connect to all points in next ring
    if (i === 0 && innerRing.length === 1) {
      const center = innerRing[0];
      for (let j = 0; j < outerRing.length; j++) {
        const p1 = outerRing[j];
        const p2 = outerRing[(j + 1) % outerRing.length];

        // Add triangle
        [center, p1, p2].forEach(pos => {
          positions.push(pos.x, pos.y, pos.z);
          const distanceFromCenter = pos.distanceTo(centerPos);
          const t = Math.pow(Math.min(1, distanceFromCenter), 0.5);
          const baseColor = new THREE.Color(color);
          const edgeColor = new THREE.Color().setHex(color).multiplyScalar(1.5);
          const vertexColor = baseColor.lerp(edgeColor, t);
          colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
        });
      }
    } else {
      // Connect points between adjacent rings
      for (let j = 0; j < outerRing.length; j++) {
        const p1 = outerRing[j];
        const p2 = outerRing[(j + 1) % outerRing.length];
        const innerIdx = Math.floor(j * innerRing.length / outerRing.length);
        const nextInnerIdx = Math.floor((j + 1) * innerRing.length / outerRing.length);
        const p3 = innerRing[innerIdx];
        const p4 = innerRing[(innerIdx + 1) % innerRing.length];

        // Add two triangles
        [p1, p2, p3, p2, p4, p3].forEach(pos => {
          positions.push(pos.x, pos.y, pos.z);
          const distanceFromCenter = pos.distanceTo(centerPos);
          const t = Math.pow(Math.min(1, distanceFromCenter), 0.5);
          const baseColor = new THREE.Color(color);
          const edgeColor = new THREE.Color().setHex(color).multiplyScalar(1.5);
          const vertexColor = baseColor.lerp(edgeColor, t);
          colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
        });
      }
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  // Create base material settings for consistent transparency
  const baseMatSettings = {
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true
  };

  // Create surface material
  const material = new THREE.MeshPhongMaterial({
    ...baseMatSettings,
    vertexColors: true,
    opacity: 0.85,
    shininess: 80,
    emissive: new THREE.Color(color).multiplyScalar(0.15),
    flatShading: true // Enable flat shading to show triangulation
  });

  // Create surface mesh
  const surfaceMesh = new THREE.Mesh(geometry, material);

  // Create wireframe material
  const wireframeMaterial = new THREE.LineBasicMaterial({
    ...baseMatSettings,
    color: 0xffffff,
    opacity: 0.15
  });

  // Create meshes
  const wireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    wireframeMaterial
  );
  const outline = new THREE.Line(
    outlineGeometry,
    new THREE.LineBasicMaterial({
      ...baseMatSettings,
      color: 0xffffff,
      linewidth: 2,
      opacity: 1
    })
  );

  // Set render order to ensure proper transparency
  surfaceMesh.renderOrder = 0;
  wireframe.renderOrder = 1;
  outline.renderOrder = 2;

  // Create group and add meshes
  const group = new THREE.Group();
  group.add(surfaceMesh);
  group.add(wireframe);
  group.add(outline);

  return group;
}

export { createPolygonPlate };
