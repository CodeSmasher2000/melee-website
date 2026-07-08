import { createRenderer } from "./app/createRenderer.js";
import { createOceanWorld } from "./app/createOceanWorld.js";
import { setupGui } from "./app/setupGui.js";

const container = document.getElementById("container");
const { renderer, bloomPass } = createRenderer(container);

let world;

(async () => {
  world = await createOceanWorld(renderer, container);

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
