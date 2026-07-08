import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

export function setupGui({
  renderer,
  bloomPass,
  parameters,
  updateSun,
  skyUniforms,
  waterUniforms,
}) {
  const gui = new GUI();

  const folderSky = gui.addFolder("Sky");
  folderSky.add(parameters, "elevation", 0, 90, 0.1).onChange(updateSun);
  folderSky.add(parameters, "azimuth", -180, 180, 0.1).onChange(updateSun);
  folderSky.add(parameters, "exposure", 0, 1, 0.0001).onChange((value) => {
    renderer.toneMappingExposure = value;
  });
  folderSky.open();

  const folderWater = gui.addFolder("Water");
  folderWater
    .add(waterUniforms.distortionScale, "value", 0, 8, 0.1)
    .name("distortionScale");
  folderWater.add(waterUniforms.size, "value", 0.1, 10, 0.1).name("size");
  folderWater.open();

  const folderClouds = gui.addFolder("Clouds");
  folderClouds
    .add(skyUniforms.cloudCoverage, "value", 0, 1, 0.01)
    .name("coverage");
  folderClouds
    .add(skyUniforms.cloudDensity, "value", 0, 1, 0.01)
    .name("density");
  folderClouds
    .add(skyUniforms.cloudElevation, "value", 0, 1, 0.01)
    .name("elevation");
  folderClouds.open();

  const folderBloom = gui.addFolder("Bloom");
  folderBloom.add(bloomPass, "strength", 0, 3, 0.01);
  folderBloom.add(bloomPass, "radius", 0, 1, 0.01);
  folderBloom.open();

  return gui;
}
