import { createRenderer } from "./app/createRenderer.js";
import { createOceanWorld } from "./app/createOceanWorld.js";
import { setupGui } from "./app/setupGui.js";
import { createSynthesizer } from "./app/synthesizer.js";

const container = document.getElementById("container");
const { renderer, bloomPass } = createRenderer(container);

let world;

(async () => {
  // Initialize synthesizer (async: reverb must load before connecting)
  const synth = await createSynthesizer();

  world = await createOceanWorld(renderer, container, synth);

  // setupGui({
  //   renderer,
  //   bloomPass,
  //   parameters: world.parameters,
  //   skyUniforms: world.skyUniforms,
  //   updateSun: world.updateSun,
  //   waterUniforms: world.waterUniforms,
  // });

  window.addEventListener("resize", world.onResize);

  renderer.setAnimationLoop(() => {
    world.renderFrame();
  });
})();
