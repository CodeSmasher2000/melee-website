import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    outputBufferType: THREE.HalfFloatType,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.97;
  container.appendChild(renderer.domElement);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85,
  );
  bloomPass.threshold = 0;
  bloomPass.strength = 0.1;
  bloomPass.radius = 0;
  renderer.setEffects([bloomPass]);

  return { renderer, bloomPass };
}
