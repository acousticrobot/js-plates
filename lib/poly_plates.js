import * as THREE from 'three';
import { latLonToXYZ } from './sphere_math.js';
import earcut from 'earcut';

function createPolygonPlate(latLonArray, color = 0x00ccff) {
  const positions = [];
  const flatPositions = []; // for earcut
  const vertexMap = [];

  // Convert lat/lon to XYZ on sphere
  latLonArray.forEach(([lat, lon]) => {
    const xyz = latLonToXYZ(lat, lon);
    positions.push(...xyz);
    flatPositions.push(xyz[0], xyz[1], xyz[2]); // used for display
    vertexMap.push(new THREE.Vector3(...xyz));
  });

  // Project onto a flat plane for triangulation using a local tangent basis
  // Use the average of all points as a projection center
  const center = vertexMap.reduce((acc, v) => acc.add(v), new THREE.Vector3()).multiplyScalar(1 / vertexMap.length).normalize();
  const up = center.clone().normalize();
  const tangent = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0, 1, 0)).normalize();
  const bitangent = new THREE.Vector3().crossVectors(up, tangent).normalize();

  const projected2D = vertexMap.map(v => {
    const rel = v.clone().sub(center);
    return [
      rel.dot(tangent),
      rel.dot(bitangent)
    ];
  });

  const flat = projected2D.flat();
  const indices = earcut(flat);

  // Now convert back to 3D geometry
  const flattened3D = projected2D.map(([x, y]) =>
    center.clone()
      .add(tangent.clone().multiplyScalar(x))
      .add(bitangent.clone().multiplyScalar(y))
      .normalize()
      .multiplyScalar(1.01) // hover above globe
      .toArray()
  ).flat();

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(flattened3D, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });

  return new THREE.Mesh(geom, mat);
}

export { createPolygonPlate }
