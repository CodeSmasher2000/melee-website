import * as THREE from "three";
import { ensureAudioStarted } from "./synthesizer.js";

// ── Dimensions ────────────────────────────────────────────────────────────────
const WHITE_W = 3.6;
const WHITE_H = 1.0;
const WHITE_D = 16;
const BLACK_W = 2.1;
const BLACK_H = 1.8; // total height (protrudes above white keys)
const BLACK_D = 9;
const GAP = 0.1; // gap between white keys
const SLOT = WHITE_W + GAP; // spacing between key centres
const PRESS_Y = 0.45; // how far a key travels when pressed

// ── Note definitions ──────────────────────────────────────────────────────────
const WHITE_NOTES = [
  "C3",
  "D3",
  "E3",
  "F3",
  "G3",
  "A3",
  "B3",
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
  "F5",
];

// leftIndex = the index of the left neighbour white key
const BLACK_DEFS = [
  { note: "C#3", leftIndex: 0 },
  { note: "D#3", leftIndex: 1 },
  { note: "F#3", leftIndex: 3 },
  { note: "G#3", leftIndex: 4 },
  { note: "A#3", leftIndex: 5 },
  { note: "C#4", leftIndex: 7 },
  { note: "D#4", leftIndex: 8 },
  { note: "F#4", leftIndex: 10 },
  { note: "G#4", leftIndex: 11 },
  { note: "A#4", leftIndex: 12 },
  { note: "C#5", leftIndex: 14 },
  { note: "D#5", leftIndex: 15 },
];

const KB_MAP = {
  z: "C3",
  x: "D3",
  c: "E3",
  v: "F3",
  b: "G3",
  n: "A3",
  m: "B3",
  a: "C4",
  s: "D4",
  d: "E4",
  f: "F4",
  g: "G4",
  h: "A4",
  j: "B4",
  k: "C5",
  l: "D5",
  ";": "E5",
  "'": "F5",
};

// ── Factory ───────────────────────────────────────────────────────────────────
export function createPiano3D(scene, camera, renderer, synth, controls) {
  const group = new THREE.Group();
  scene.add(group);

  const totalWidth = WHITE_NOTES.length * SLOT - GAP;
  const startX = -totalWidth / 2; // left edge of key 0

  // Piano body / chassis
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(totalWidth + 2.5, WHITE_H + 1.2, WHITE_D + 2.5),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.65,
      metalness: 0.55,
    }),
  );
  chassis.position.y = -WHITE_H / 2 - 0.6;
  group.add(chassis);

  // Tracking structures
  const noteMeshMap = {}; // note string → Mesh
  const meshDataMap = new WeakMap(); // Mesh → { note, baseY }
  const allKeyMeshes = [];

  // ── White keys ──
  const whiteGeom = new THREE.BoxGeometry(WHITE_W, WHITE_H, WHITE_D);
  WHITE_NOTES.forEach((note, i) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf5f0e0,
      roughness: 0.2,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(whiteGeom, mat);
    mesh.position.set(startX + i * SLOT + WHITE_W / 2, 0, 0);
    group.add(mesh);
    noteMeshMap[note] = mesh;
    meshDataMap.set(mesh, { note, baseY: 0 });
    allKeyMeshes.push(mesh);
  });

  // ── Black keys ──
  // Black key centre x = startX + (leftIndex+1)*SLOT - GAP/2
  // (exactly midway between the two neighbouring white key centres)
  const blackGeom = new THREE.BoxGeometry(BLACK_W, BLACK_H, BLACK_D);
  const blackBaseY = WHITE_H / 2 + BLACK_H / 2; // sits on top of white keys
  const blackBaseZ = -(WHITE_D - BLACK_D) / 2; // back edges aligned

  BLACK_DEFS.forEach(({ note, leftIndex }) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      roughness: 0.45,
      metalness: 0.2,
    });
    const mesh = new THREE.Mesh(blackGeom, mat);
    const x = startX + (leftIndex + 1) * SLOT - GAP / 2;
    mesh.position.set(x, blackBaseY, blackBaseZ);
    group.add(mesh);
    noteMeshMap[note] = mesh;
    meshDataMap.set(mesh, { note, baseY: blackBaseY });
    allKeyMeshes.push(mesh);
  });

  // Dedicated light so piano is always visible regardless of scene lighting
  const pianoLight = new THREE.PointLight(0xfff8f0, 10, 70, 2);
  pianoLight.position.set(0, 18, 0);
  group.add(pianoLight);

  // ── Key animation ─────────────────────────────────────────────────────────
  function pressKey(note) {
    const mesh = noteMeshMap[note];
    if (!mesh) return;
    const { baseY } = meshDataMap.get(mesh);
    mesh.position.y = baseY - PRESS_Y;
    mesh.material.emissive.set(0x6644ee);
    mesh.material.emissiveIntensity = 0.5;
  }

  function releaseKey(note) {
    const mesh = noteMeshMap[note];
    if (!mesh) return;
    const { baseY } = meshDataMap.get(mesh);
    mesh.position.y = baseY;
    mesh.material.emissive.set(0x000000);
    mesh.material.emissiveIntensity = 0;
  }

  // ── Pointer interaction ───────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let heldMesh = null;

  renderer.domElement.addEventListener("pointerdown", async (e) => {
    if (camera.position.y > 0) return; // Don't allow piano interaction above sea level
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // Black keys checked first (they're on top physically)
    const blackMeshes = allKeyMeshes.filter((m) => {
      const d = meshDataMap.get(m);
      return d && d.baseY > 0;
    });
    const whiteMeshes = allKeyMeshes.filter((m) => {
      const d = meshDataMap.get(m);
      return d && d.baseY === 0;
    });

    const hits = [
      ...raycaster.intersectObjects(blackMeshes),
      ...raycaster.intersectObjects(whiteMeshes),
    ];

    if (hits.length > 0) {
      e.stopPropagation();
      heldMesh = hits[0].object;
      const { note } = meshDataMap.get(heldMesh);
      if (controls) controls.enabled = false;
      await ensureAudioStarted();
      pressKey(note);
      synth.playNote(note);
    }
  });

  window.addEventListener("pointerup", () => {
    if (heldMesh) {
      const { note } = meshDataMap.get(heldMesh);
      releaseKey(note);
      synth.stopNote(note);
      heldMesh = null;
    }
    if (controls) controls.enabled = true;
  });

  // ── Keyboard visual feedback (audio already handled in synthesizer.js) ────
  document.addEventListener("keydown", (e) => {
    const note = KB_MAP[e.key.toLowerCase()];
    if (note && !e.repeat) pressKey(note);
  });
  document.addEventListener("keyup", (e) => {
    const note = KB_MAP[e.key.toLowerCase()];
    if (note) releaseKey(note);
  });

  // Fixed world position — same layer as the statue busts (z = -20)
  // y=1.5 so the chassis bottom sits at ~y=-0.7, matching bust ground level
  group.position.set(0, -195, -110);
  group.scale.setScalar(5);
  group.rotation.x = Math.PI / 4; // tilt front edge down toward camera
  // rotation.y = 0: piano front (+Z face) looks toward the camera's default position (z=180)

  return { update: () => {}, group };
}
