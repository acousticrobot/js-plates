import * as THREE from 'three';
import { latLonToXYZ } from './sphere_math.js';


function createCircularPlate(centerLat, centerLon, radiusDeg, segments = 32, color = 0xff5533) {
  const center = new THREE.Vector3(...latLonToXYZ(centerLat, centerLon));
  const up = center.clone().normalize(); // local up vector at center point

  // Create orthonormal basis for local tangent plane
  const tangent = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0, 1, 0)).normalize();
  const bitangent = new THREE.Vector3().crossVectors(up, tangent).normalize();

  const positions = [];
  const centerXYZ = center.toArray();
  positions.push(...centerXYZ); // center vertex

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    // Local displacement on tangent plane
    const localOffset = tangent.clone().multiplyScalar(dx).add(bitangent.clone().multiplyScalar(dy));

    // Convert offset degrees to radians on the sphere
    const arc = (radiusDeg / 180) * Math.PI; // radius in radians
    const rotated = center.clone().applyAxisAngle(localOffset, arc).normalize().multiplyScalar(1.01); // slightly above globe

    positions.push(...rotated.toArray());
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(
    Array.from({ length: segments }, (_, i) => [0, i + 1, i + 2]).flat()
  );
  geom.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });

  const mesh = new THREE.Mesh(geom, mat);
  return mesh;
}

function createSquarePlate(centerLat, centerLon, sizeDeg = 10, color = 0x33bbff) {
  const center = new THREE.Vector3(...latLonToXYZ(centerLat, centerLon));
  const up = center.clone().normalize();

  // Generate orthonormal basis
  const tangent = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0, 1, 0)).normalize();
  const bitangent = new THREE.Vector3().crossVectors(up, tangent).normalize();

  const halfSizeRad = (sizeDeg / 2 / 180) * Math.PI;

  const cornerOffsets = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1]
  ];

  const cornerVectors = cornerOffsets.map(([dx, dy]) => {
    const offset = tangent.clone().multiplyScalar(dx)
      .add(bitangent.clone().multiplyScalar(dy))
      .normalize();
    const corner = center.clone().applyAxisAngle(offset, halfSizeRad)
      .normalize().multiplyScalar(1.01); // hover slightly above the sphere
    return corner;
  });

  const positions = new Float32Array([
    ...cornerVectors[0].toArray(), ...cornerVectors[1].toArray(), ...cornerVectors[2].toArray(),
    ...cornerVectors[0].toArray(), ...cornerVectors[2].toArray(), ...cornerVectors[3].toArray()
  ]);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });

  return new THREE.Mesh(geom, mat);
}

export { createCircularPlate, createSquarePlate };
