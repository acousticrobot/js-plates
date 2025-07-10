import * as THREE from 'three';
import { latLonToXYZ } from './sphere_math.js';

function createPolygonPlate(latLonArray, color = 0x00ccff) {
  // Ensure we have enough points for triangulation
  if (latLonArray.length < 3) return null;

  const positions = [];
  const vertexMap = [];

  // Convert lat/lon to XYZ on sphere
  latLonArray.forEach(([lat, lon]) => {
    const xyz = latLonToXYZ(lat, lon);
    positions.push(...xyz);
    vertexMap.push(new THREE.Vector3(...xyz));
  });

  // Calculate grid dimensions from the number of points
  const gridX = 30; // Must match numPointsX from poly_plates_svg.js
  const gridY = 15; // Must match numPointsY from poly_plates_svg.js
  
  // Create triangles for the grid
  const indices = [];
  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      const i0 = y * (gridX + 1) + x;
      const i1 = i0 + 1;
      const i2 = i0 + (gridX + 1);
      const i3 = i1 + (gridX + 1);

      // Create two triangles for each grid cell
      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
    }
  }

  // Create the final geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Create two materials: one solid and one wireframe
  const solidMaterial = new THREE.MeshPhongMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    shininess: 80,
    emissive: 0x331111,
    emissiveIntensity: 0.2
  });

  const wireframeMaterial = new THREE.MeshPhongMaterial({
    color: 0x000000,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    depthWrite: false
  });

  // Create two meshes: one for solid, one for wireframe
  const solidMesh = new THREE.Mesh(geometry, solidMaterial);
  const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);

  // Create a group to hold both meshes
  const group = new THREE.Group();
  group.add(solidMesh);
  group.add(wireframeMesh);

  return group;
}

export { createPolygonPlate }
