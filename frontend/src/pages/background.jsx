import * as THREE from 'three';

let scene, camera, renderer, particles;

export function initThreeBackground() {
  // Prevent multiple canvases
  const existingCanvas = document.querySelector('canvas');
  if (existingCanvas) return;

  // Initialize scene and camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  // Initialize renderer with transparency
  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.top = 0;
  renderer.domElement.style.left = 0;
  renderer.domElement.style.zIndex = -1;

  // Create particle geometry
  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  const PARTICLE_COUNT = 200;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    vertices.push(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  const material = new THREE.PointsMaterial({
    size: 0.05,
    transparent: true,
    opacity: 0.5,
    color: new THREE.Color('#0EA5E9'),
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (particles) {
    particles.rotation.y += 0.001;
    particles.rotation.x += 0.001;
  }
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}
