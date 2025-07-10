import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPolygonPlatesFromSVG } from './lib/poly_plates_svg.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 4;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Globe
const globe = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  new THREE.MeshPhongMaterial({ color: 0x223344, wireframe: false, shininess: 10 })
);
scene.add(globe);

// Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 3, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

createPolygonPlatesFromSVG('./assets/plates.svg', 0xff5533).then(plates => {
  console.log(plates)
  plates.forEach(p => scene.add(p));
});

// Animate
function animate() {
  requestAnimationFrame(animate);

  const angle = 0.001;

  // plate1Group.rotateOnAxis(plate1Pole, angle);
  // plate2Group.rotateOnAxis(plate2Pole, -angle);

  controls.update();
  renderer.render(scene, camera);
}

animate();

// Handle resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
