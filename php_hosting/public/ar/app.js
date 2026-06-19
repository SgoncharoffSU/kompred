import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODELS = {
  siberia: { title: 'Баня', width: 2, depth: 2, wall: '#b98a58', roof: '#2f3b45' },
  taiga: { title: 'Тайга', width: 2, depth: 2, wall: '#a97548', roof: '#31483d' },
  compact: { title: 'Компакт', width: 2, depth: 2, wall: '#c79a67', roof: '#374151' }
};

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const state = {
  modelKey: params.get('model') || 'siberia',
  width: 2,
  depth: 2,
  scale: parseFloat(params.get('scale') || '1') || 1,
  scaleTarget: parseFloat(params.get('scale') || '1') || 1,
  rotate: parseFloat(params.get('rot') || '0') || 0,
  tilt: parseFloat(params.get('tilt') || '0') || 0,
  placed: false,
  ar: false
};

const viewport = $('viewport');
const app = document.querySelector('.app');
const cameraFeed = $('cameraFeed');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 120);
camera.position.set(3.4, 2.6, 4.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.setClearAlpha(0);
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x7a8794, 0.85));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(6, 10, 5);
sun.castShadow = true;
sun.intensity = 0.75;
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0xcdd6de, roughness: 0.88, metalness: 0.02 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(80, 80, 0x94a3b8, 0xb6c0ca);
grid.material.opacity = 0.38;
grid.material.transparent = true;
scene.add(grid);

const bath = new THREE.Group();
scene.add(bath);

const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.55, 0.62, 48).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x0f766e })
);
reticle.visible = false;
reticle.matrixAutoUpdate = false;
scene.add(reticle);

function makeMat(color, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

function addBox(group, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addCylinder(group, radius, height, position, material, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function rebuildBath() {
  bath.clear();
  const preset = MODELS[state.modelKey] || MODELS.siberia;
  const width = state.width || preset.width;
  const depth = state.depth || preset.depth;
  const height = Math.max(2.4, Math.min(3.5, width * 0.42));
  const wall = new THREE.MeshStandardMaterial({ color: preset.wall, roughness: 0.72, metalness: 0.02, transparent: true, opacity: 0.46 });
  const dark = makeMat('#24313b');
  const wood = makeMat('#8a623f');
  const bedding = makeMat('#e6edf7');
  const blanket = makeMat('#2563eb');
  const skin = makeMat('#f2b383');
  const shirt = makeMat('#ef4444');
  const pants = makeMat('#1d4ed8');

  addBox(bath, [width, height, depth], [0, height / 2, 0], wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 1.25, 4), makeMat(preset.roof, 0.62));
  roof.position.set(0, height + 0.55, 0);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = depth / width;
  roof.castShadow = true;
  bath.add(roof);

  addBox(bath, [0.9, 1.9, 0.08], [-width * 0.22, 0.95, depth / 2 + 0.045], dark);
  addBox(bath, [0.5, 1.2, 0.5], [width * 0.28, height + 0.7, -depth * 0.18], dark);

  const deck = addBox(bath, [width * 0.95, 0.12, 1.05], [0, 0.06, depth / 2 + 0.58], wood);
  deck.castShadow = false;

  addBox(bath, [width * 0.86, 0.05, depth * 0.86], [0, 0.16, 0], makeMat('#b78352'));

  const table = new THREE.Group();
  addBox(table, [0.72, 0.08, 0.48], [0, 0.78, 0], wood);
  [[-0.3, 0.38, -0.18], [0.3, 0.38, -0.18], [-0.3, 0.38, 0.18], [0.3, 0.38, 0.18]].forEach(p => addBox(table, [0.07, 0.72, 0.07], p, wood));
  table.position.set(-0.32, 0.16, 0.28);
  bath.add(table);

  const monitor = new THREE.Group();
  addBox(monitor, [0.52, 0.34, 0.05], [0, 1.08, 0], dark);
  addBox(monitor, [0.45, 0.26, 0.055], [0, 1.08, -0.032], makeMat('#22c55e'));
  addBox(monitor, [0.08, 0.18, 0.04], [0, 0.84, 0], dark);
  addBox(monitor, [0.26, 0.04, 0.18], [0, 0.74, 0], dark);
  addBox(monitor, [0.10, 0.10, 0.06], [-0.14, 1.09, -0.065], makeMat('#ef4444'));
  addBox(monitor, [0.10, 0.10, 0.06], [0.02, 1.09, -0.065], makeMat('#3b82f6'));
  addBox(monitor, [0.10, 0.10, 0.06], [0.18, 1.09, -0.065], makeMat('#facc15'));
  monitor.position.set(-0.32, 0.16, 0.18);
  bath.add(monitor);

  const chair = new THREE.Group();
  addBox(chair, [0.42, 0.08, 0.42], [0, 0.48, 0], makeMat('#475569'));
  addBox(chair, [0.42, 0.55, 0.08], [0, 0.78, -0.21], makeMat('#475569'));
  [[-0.16, 0.24, -0.14], [0.16, 0.24, -0.14], [-0.16, 0.24, 0.14], [0.16, 0.24, 0.14]].forEach(p => addBox(chair, [0.05, 0.42, 0.05], p, makeMat('#334155')));
  chair.position.set(-0.32, 0.16, -0.38);
  bath.add(chair);

  const person = new THREE.Group();
  addBox(person, [0.28, 0.42, 0.24], [0, 0.8, 0], shirt);
  addCylinder(person, 0.15, 0.18, [0, 1.1, 0], skin, 28);
  addBox(person, [0.15, 0.36, 0.13], [-0.08, 0.42, 0.03], pants);
  addBox(person, [0.15, 0.36, 0.13], [0.08, 0.42, 0.03], pants);
  addBox(person, [0.36, 0.08, 0.08], [0, 0.9, 0.22], skin);
  person.position.set(-0.32, 0.18, -0.28);
  bath.add(person);

  const bed = new THREE.Group();
  addBox(bed, [0.78, 0.16, 0.95], [0, 0.08, 0], makeMat('#7c5237'));
  addBox(bed, [0.72, 0.12, 0.86], [0, 0.22, 0], bedding);
  addBox(bed, [0.72, 0.10, 0.46], [0, 0.30, 0.16], blanket);
  addBox(bed, [0.32, 0.10, 0.18], [0, 0.35, -0.27], makeMat('#f8fafc'));
  bed.position.set(0.45, 0.16, -0.16);
  bath.add(bed);

  bath.scale.setScalar(state.scaleTarget);
  bath.rotation.y = THREE.MathUtils.degToRad(state.rotate);
  bath.rotation.x = THREE.MathUtils.degToRad(state.tilt);
  $('modelSelect').value = state.modelKey;
}

function updateUrl() {
  const next = new URL(location.href);
  next.searchParams.set('model', state.modelKey);
  next.searchParams.set('w', String(state.width || MODELS[state.modelKey].width));
  next.searchParams.set('d', String(state.depth || MODELS[state.modelKey].depth));
  next.searchParams.set('scale', state.scaleTarget.toFixed(2));
  next.searchParams.set('rot', String(Math.round(state.rotate)));
  next.searchParams.set('tilt', String(Math.round(state.tilt)));
  history.replaceState(null, '', next);
}

function applyState() {
  rebuildBath();
  updateUrl();
}

$('modelSelect').addEventListener('change', e => {
  state.modelKey = e.target.value;
  state.width = MODELS[state.modelKey].width;
  state.depth = MODELS[state.modelKey].depth;
  applyState();
});

function setStatus(text) {
  $('status').textContent = text;
}

let hitTestSource = null;
let refSpace = null;
let cameraStream = null;

async function getCameraStream() {
  const attempts = [
    { video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: true, audio: false }
  ];
  let lastError = null;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('camera unavailable');
}

function stopCameraStream() {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null;
  cameraFeed.srcObject = null;
}

async function startAR() {
  if (!window.isSecureContext) {
    setStatus('Откройте HTTPS-ссылку');
    return;
  }
  if (!navigator.xr) {
    setStatus('Нужен Android Chrome с ARCore');
    return;
  }
  const supported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
  if (!supported) {
    setStatus('ARCore/WebXR не поддерживается');
    return;
  }
  setStatus('Запускаю AR...');
  try {
    stopCameraStream();
    app.classList.remove('camera-on');
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'local-floor'],
      domOverlay: { root: document.body }
    });
    renderer.xr.setReferenceSpaceType('local');
    await renderer.xr.setSession(session);
  } catch (err) {
    console.warn('Android WebXR start failed', err);
    app.classList.remove('xr-on');
    bath.visible = true;
    floor.visible = true;
    grid.visible = true;
    controls.enabled = true;
    setStatus(`AR не запустился: ${err && err.name ? err.name : 'ошибка'}`);
  }
}

$('arButton').addEventListener('click', startAR);

renderer.xr.addEventListener('sessionstart', async () => {
  state.ar = true;
  state.placed = false;
  app.classList.add('xr-on');
  app.classList.remove('camera-on');
  floor.visible = false;
  grid.visible = false;
  controls.enabled = false;
  bath.visible = true;
  bath.position.set(0, 0, -4);
  setStatus('Наведите на землю и нажмите на экран');
  const session = renderer.xr.getSession();
  try {
    const viewerSpace = await session.requestReferenceSpace('viewer');
    refSpace = await session.requestReferenceSpace('local');
    if (session.requestHitTestSource) {
      hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    }
  } catch (err) {
    console.warn('AR hit-test unavailable', err);
    hitTestSource = null;
    setStatus('Модель перед вами, настройте двумя пальцами');
  }
  session.addEventListener('select', () => {
    if (reticle.visible) bath.position.copy(reticle.position);
    bath.visible = true;
    state.placed = true;
    setStatus('Два пальца: масштаб и поворот');
  });
});

renderer.xr.addEventListener('sessionend', () => {
  state.ar = false;
  app.classList.remove('xr-on');
  bath.visible = true;
  reticle.visible = false;
  hitTestSource = null;
  floor.visible = true;
  grid.visible = true;
  controls.enabled = true;
  setStatus('3D режим');
});

let lastTouchDistance = 0;
let lastTouchAngle = 0;
let lastTouchCenterY = 0;
let dragPointer = null;
let dragStart = null;
let dragBase = null;

renderer.domElement.addEventListener('pointerdown', e => {
  if (!app.classList.contains('camera-on')) return;
  dragPointer = e.pointerId;
  dragStart = { x: e.clientX, y: e.clientY };
  dragBase = bath.position.clone();
  renderer.domElement.setPointerCapture(e.pointerId);
});

renderer.domElement.addEventListener('pointermove', e => {
  if (!app.classList.contains('camera-on') || dragPointer !== e.pointerId || !dragStart || !dragBase) return;
  if (lastTouchDistance) return;
  const dx = (e.clientX - dragStart.x) / Math.max(innerWidth, 1);
  const dy = (e.clientY - dragStart.y) / Math.max(innerHeight, 1);
  bath.position.x = THREE.MathUtils.clamp(dragBase.x + dx * 5.2, -3.2, 3.2);
  bath.position.y = THREE.MathUtils.clamp(dragBase.y - dy * 3.4, -1.2, 2.5);
});

renderer.domElement.addEventListener('pointerup', () => {
  dragPointer = null;
  dragStart = null;
  dragBase = null;
});

window.addEventListener('touchmove', e => {
  if (e.touches.length !== 2) return;
  const [a, b] = e.touches;
  const dx = b.clientX - a.clientX;
  const dy = b.clientY - a.clientY;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const centerY = (a.clientY + b.clientY) / 2;
  if (lastTouchDistance) {
    const ratio = dist / lastTouchDistance;
    const eased = Math.pow(ratio, 0.65);
    state.scaleTarget = THREE.MathUtils.clamp(state.scaleTarget * eased, 0.5, 1.6);
    state.rotate += THREE.MathUtils.radToDeg(angle - lastTouchAngle);
    state.tilt = THREE.MathUtils.clamp(state.tilt + (centerY - lastTouchCenterY) * 0.18, -55, 55);
    bath.rotation.y = THREE.MathUtils.degToRad(state.rotate);
    bath.rotation.x = THREE.MathUtils.degToRad(state.tilt);
    updateUrl();
  }
  lastTouchDistance = dist;
  lastTouchAngle = angle;
  lastTouchCenterY = centerY;
}, { passive: true });
window.addEventListener('touchend', () => {
  lastTouchDistance = 0;
  lastTouchAngle = 0;
  lastTouchCenterY = 0;
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate(_time, frame) {
  const currentScale = bath.scale.x || state.scaleTarget;
  const nextScale = THREE.MathUtils.lerp(currentScale, state.scaleTarget, 0.42);
  bath.scale.setScalar(nextScale);
  state.scale = nextScale;
  if (frame && hitTestSource && refSpace) {
    const results = frame.getHitTestResults(hitTestSource);
    if (results.length) {
      const pose = results[0].getPose(refSpace);
      reticle.visible = true;
      reticle.matrix.fromArray(pose.transform.matrix);
      reticle.position.setFromMatrixPosition(reticle.matrix);
      if (!state.placed) bath.position.copy(reticle.position);
      if (!state.placed) setStatus('Нажмите на экран, чтобы поставить баню');
    } else {
      reticle.visible = false;
      if (!state.placed) setStatus('Медленно наведите камеру на землю');
    }
  }
  controls.update();
  renderer.render(scene, camera);
}

state.width = state.width || MODELS[state.modelKey]?.width || MODELS.siberia.width;
state.depth = state.depth || MODELS[state.modelKey]?.depth || MODELS.siberia.depth;
rebuildBath();
renderer.setAnimationLoop(animate);

if (!window.isSecureContext) {
  setStatus('Нужен HTTPS для AR');
} else if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-ar')
    .then(ok => {
      setStatus(ok ? 'Android AR готов' : 'Нужен Android Chrome с ARCore');
    })
    .catch(() => setStatus('3D режим'));
} else {
  setStatus('Нужен Android Chrome с ARCore');
}
