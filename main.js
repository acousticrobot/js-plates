import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createPolygonPlatesFromSVG } from './lib/poly_plates_svg.js';

// Set up scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Set up camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 1, 2);
camera.lookAt(0, 0, 0);

// Set up renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Add lights
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-1, -1, -1);
scene.add(fillLight);

const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
topLight.position.set(0, 1, 0);
scene.add(topLight);

// Create globe
const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
const globeMaterial = new THREE.MeshPhongMaterial({
  color: 0x4488aa,
  transparent: true,
  opacity: 0.2,
  side: THREE.DoubleSide,
  shininess: 50
});
const globe = new THREE.Mesh(globeGeometry, globeMaterial);
scene.add(globe);

// Add helpers
const axesHelper = new THREE.AxesHelper(2);
scene.add(axesHelper);

const gridHelper = new THREE.GridHelper(2, 20);
scene.add(gridHelper);

// Load and add plates
console.log('Loading plates from SVG...');
createPolygonPlatesFromSVG('assets/plates.svg')
  .then(plates => {
    console.log('Plates loaded:', plates);
    plates.forEach(plate => scene.add(plate));
  })
  .catch(error => console.error('Error loading plates:', error));

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
