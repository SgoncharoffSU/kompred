import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buffer => {
      this.result = buffer;
      this.onloadend && this.onloadend();
    }).catch(error => {
      this.error = error;
      this.onerror && this.onerror(error);
    });
  }
};

const root = process.cwd();
const outDir = path.join(root, 'php_hosting', 'public', 'ar', 'assets');
const glbFile = path.join(outDir, 'bath.glb');
const glbAndroidFile = path.join(outDir, 'bath-android.glb');
const usdzFile = path.join(outDir, 'bath.usdz');
const usdzIosFile = path.join(outDir, 'bath-ios-v6.usdz');

function mat(color, transparent = false, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.02,
    transparent,
    opacity
  });
}

function box(parent, size, pos, material, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radius, height, pos, material, name = '') {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 28), material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

const scene = new THREE.Scene();
scene.name = 'Bathhouse';

const group = new THREE.Group();
group.name = 'Bath 2x2';
scene.add(group);

const width = 2;
const depth = 2;
const height = 2.4;
const wood = mat('#6f4a2f');
const wall = mat('#ad7a4b');
const dark = mat('#24313b');
const bedding = mat('#e6edf7');
const blanket = mat('#2563eb');
const skin = mat('#f2b383');
const shirt = mat('#ef4444');
const pants = mat('#1d4ed8');

box(group, [width, 0.12, depth], [0, height - 0.06, 0], wall, 'ceiling ring');
box(group, [width, 0.12, depth], [0, 0.06, 0], wall, 'floor ring');
box(group, [0.12, height, depth], [-width / 2 + 0.06, height / 2, 0], wall, 'left wall');
box(group, [0.12, height, depth], [width / 2 - 0.06, height / 2, 0], wall, 'right wall');
box(group, [width - 0.9, height, 0.12], [0, height / 2, -depth / 2 + 0.06], wall, 'back wall');
box(group, [0.55, height - 0.9, 0.12], [-0.675, (height - 0.9) / 2 + 0.45, depth / 2 - 0.06], wall, 'front left wall');
box(group, [0.55, height - 0.9, 0.12], [0.675, (height - 0.9) / 2 + 0.45, depth / 2 - 0.06], wall, 'front right wall');
box(group, [0.9, 0.9, 0.12], [0, height - 0.45, depth / 2 - 0.06], wall, 'front lintel');
const roof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.25, 4), mat('#2f3b45'));
roof.name = 'roof';
roof.position.set(0, height + 0.55, 0);
roof.rotation.y = Math.PI / 4;
group.add(roof);

box(group, [0.9, 1.9, 0.08], [-0.44, 0.95, depth / 2 + 0.045], dark, 'door');
box(group, [0.5, 1.2, 0.5], [0.56, height + 0.7, -0.36], dark, 'chimney');
box(group, [1.72, 0.05, 1.72], [0, 0.16, 0], mat('#8b5f38'), 'floor');
box(group, [1.9, 0.12, 1.05], [0, 0.06, 1.58], wood, 'deck');

const table = new THREE.Group();
table.name = 'table';
box(table, [0.72, 0.08, 0.48], [0, 0.78, 0], wood);
for (const p of [[-0.3, 0.38, -0.18], [0.3, 0.38, -0.18], [-0.3, 0.38, 0.18], [0.3, 0.38, 0.18]]) {
  box(table, [0.07, 0.72, 0.07], p, wood);
}
table.position.set(-0.32, 0.16, 0.28);
group.add(table);

const monitor = new THREE.Group();
monitor.name = 'monitor facing player';
box(monitor, [0.52, 0.34, 0.05], [0, 1.08, 0], dark);
box(monitor, [0.45, 0.26, 0.055], [0, 1.08, -0.032], mat('#22c55e'));
box(monitor, [0.08, 0.18, 0.04], [0, 0.84, 0], dark);
box(monitor, [0.26, 0.04, 0.18], [0, 0.74, 0], dark);
box(monitor, [0.10, 0.10, 0.06], [-0.14, 1.09, -0.065], mat('#ef4444'));
box(monitor, [0.10, 0.10, 0.06], [0.02, 1.09, -0.065], mat('#3b82f6'));
box(monitor, [0.10, 0.10, 0.06], [0.18, 1.09, -0.065], mat('#facc15'));
monitor.position.set(-0.32, 0.16, 0.18);
group.add(monitor);

const chair = new THREE.Group();
chair.name = 'chair';
box(chair, [0.42, 0.08, 0.42], [0, 0.48, 0], mat('#475569'));
box(chair, [0.42, 0.55, 0.08], [0, 0.78, -0.21], mat('#475569'));
for (const p of [[-0.16, 0.24, -0.14], [0.16, 0.24, -0.14], [-0.16, 0.24, 0.14], [0.16, 0.24, 0.14]]) {
  box(chair, [0.05, 0.42, 0.05], p, mat('#334155'));
}
chair.position.set(-0.32, 0.16, -0.38);
group.add(chair);

const person = new THREE.Group();
person.name = 'person playing';
box(person, [0.28, 0.42, 0.24], [0, 0.8, 0], shirt);
cylinder(person, 0.15, 0.18, [0, 1.1, 0], skin);
box(person, [0.15, 0.36, 0.13], [-0.08, 0.42, 0.03], pants);
box(person, [0.15, 0.36, 0.13], [0.08, 0.42, 0.03], pants);
box(person, [0.36, 0.08, 0.08], [0, 0.9, 0.22], skin);
person.position.set(-0.32, 0.18, -0.28);
group.add(person);

const bed = new THREE.Group();
bed.name = 'bed on floor';
box(bed, [0.78, 0.16, 0.95], [0, 0.08, 0], mat('#7c5237'));
box(bed, [0.72, 0.12, 0.86], [0, 0.22, 0], bedding);
box(bed, [0.72, 0.10, 0.46], [0, 0.30, 0.16], blanket);
box(bed, [0.32, 0.10, 0.18], [0, 0.35, -0.27], mat('#f8fafc'));
bed.position.set(0.45, 0.16, -0.16);
group.add(bed);

scene.updateMatrixWorld(true);
const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(scene, { binary: true });
const androidScene = scene.clone(true);
androidScene.name = 'Bathhouse Android';
const androidRoot = androidScene.getObjectByName('Bath 2x2');
if (androidRoot) {
  androidRoot.scale.setScalar(0.62);
  androidRoot.updateMatrixWorld(true);
}
androidScene.updateMatrixWorld(true);
const androidGlb = await exporter.parseAsync(androidScene, { binary: true });
const usdzExporter = new USDZExporter();
const usdz = await usdzExporter.parseAsync(scene, { quickLookCompatible: true });
const iosScene = new THREE.Scene();
iosScene.name = 'Bathhouse iOS';
const iosGroup = new THREE.Group();
iosGroup.name = 'Bath 2x2 iOS';
iosScene.add(iosGroup);

const iosWall = mat('#ad7a4b');
const iosTrim = mat('#6f442a');
const iosDark = mat('#26313a');

const houseShape = new THREE.Shape();
houseShape.moveTo(-1.0, 0);
houseShape.lineTo(-1.0, 2.25);
houseShape.lineTo(0, 3.22);
houseShape.lineTo(1.0, 2.25);
houseShape.lineTo(1.0, 0);
houseShape.closePath();
const houseGeo = new THREE.ExtrudeGeometry(houseShape, { depth: 2.0, bevelEnabled: false });
houseGeo.center();
const house = new THREE.Mesh(houseGeo, iosWall);
house.name = 'iOS solid bathhouse';
house.position.set(0, 1.61, 0);
iosGroup.add(house);

box(iosGroup, [0.72, 1.45, 0.08], [-0.38, 0.76, 1.04], iosDark, 'iOS door');
box(iosGroup, [0.10, 0.10, 0.08], [-0.07, 0.9, 1.09], mat('#facc15'), 'iOS door handle');
box(iosGroup, [0.52, 0.52, 0.08], [0.56, 1.38, 1.04], mat('#dceef7'), 'iOS window');
box(iosGroup, [0.08, 0.56, 0.08], [0.56, 1.38, 1.09], iosTrim, 'iOS window v');
box(iosGroup, [0.56, 0.08, 0.08], [0.56, 1.38, 1.09], iosTrim, 'iOS window h');
box(iosGroup, [2.24, 0.10, 1.0], [0, 0.05, 1.55], wood, 'iOS deck');
box(iosGroup, [0.34, 0.95, 0.34], [0.58, 3.08, -0.42], iosDark, 'iOS chimney');
box(iosGroup, [0.44, 0.10, 0.44], [0.58, 3.60, -0.42], iosDark, 'iOS chimney cap');
for (let i = 0; i < 7; i += 1) {
  const y = 0.36 + i * 0.25;
  box(iosGroup, [2.04, 0.035, 0.06], [0, y, 1.08], iosTrim, `iOS front line ${i}`);
}
iosScene.updateMatrixWorld(true);
const iosUsdz = await usdzExporter.parseAsync(iosScene, { quickLookCompatible: true });

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(glbFile, Buffer.from(glb));
fs.writeFileSync(glbAndroidFile, Buffer.from(androidGlb));
fs.writeFileSync(usdzFile, Buffer.from(usdz));
fs.writeFileSync(usdzIosFile, Buffer.from(iosUsdz));
console.log(glbFile);
console.log(glbAndroidFile);
console.log(usdzFile);
console.log(usdzIosFile);
