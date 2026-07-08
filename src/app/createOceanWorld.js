import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createVideoObject } from "./createVideoObject.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export async function createOceanWorld(renderer, container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    95,
    window.innerWidth / window.innerHeight,
    1,
    20000,
  );
  camera.position.set(0, 40, 180);
  // console.log(window.innerWidth, window.innerHeight);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
  );
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.setPath("models/gltf/");

  const clock = new THREE.Clock();
  const sun = new THREE.Vector3();
  const smallDevice = window.innerWidth < 600;
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
  const water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      "https://threejs.org/examples/textures/waternormals.jpg",
      // "/dist/assets/waternormals.jpg",
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      },
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xf19df2,
    waterColor: 0x002629,
    distortionScale: 3.7,
    fog: scene.fog !== undefined,
  });
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;
  skyUniforms.turbidity.value = 14;
  skyUniforms.rayleigh.value = 2.5;
  skyUniforms.mieCoefficient.value = 0.001;
  skyUniforms.mieDirectionalG.value = 0.8;
  skyUniforms.cloudCoverage.value = 0.4;
  skyUniforms.cloudDensity.value = 0.45;
  skyUniforms.cloudElevation.value = 0.5;

  const parameters = {
    elevation: 3.5,
    azimuth: 180,
    exposure: 1,
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const sceneEnv = new THREE.Scene();
  let renderTarget;

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);
    sky.material.uniforms.sunPosition.value.copy(sun);
    water.material.uniforms.sunDirection.value.copy(sun).normalize();

    if (renderTarget !== undefined) {
      renderTarget.dispose();
    }

    sceneEnv.add(sky);
    renderTarget = pmremGenerator.fromScene(sceneEnv);
    scene.add(sky);
    scene.environment = renderTarget.texture;
  }

  updateSun();

  const material = new THREE.MeshStandardMaterial({
    roughness: 0.1,
    metalness: 0.9,
    emissive: 0x121314,
    color: 0x00fff2,
  });
  let mesh;

  // Load font and create text geometry
  const fontLoader = new FontLoader();
  fontLoader.load(
    "assets/fonts/MPLUSRounded1c-Regular.typeface.json",
    (font) => {
      const textGeometry = new TextGeometry("melee", {
        font: font,
        size: smallDevice ? 25 : 50,
        depth: 10,
        height: 0.5,
        curveSegments: 18,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelOffset: 0,
        bevelSegments: 5,
      });
      textGeometry.center();
      mesh.geometry.dispose();
      mesh.geometry = textGeometry;
    },
  );

  // Create a placeholder mesh with plane geometry initially
  const geometry = new THREE.PlaneGeometry(10, 10);
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = smallDevice ? 0 : -70;
  scene.add(mesh);

  // Add 3 decorative cubes in front of the text with pastel colors
  const pastelColors = [0xffb3d9, 0xb3d9ff, 0xb3ffb3, 0xb3f3b3]; // Pastel pink, blue, green
  const cubeSize = smallDevice ? 8 : 10;
  const cubePositions = smallDevice ? [-24, -8, 8, 24] : [-30, -10, 10, 30]; // Spread along X axis
  const cubeUrls = [
    "https://open.spotify.com/artist/0GrNBtcJYTH8AQ13dqKW6O?si=HgSxavGLSRuhQYF_vYWxhw",
    "https://youtu.be/MEfXX-nsxhQ?si=jz_i4UfG1BauwJ__",
    "https://instagram.com/jonatanwahlstedt",
    "mailto:jonatanwahlstedt@gmail.com",
  ];

  const textureLoader = new THREE.TextureLoader();
  const clickableCubes = [];
  const clickableBusts = [];

  // Raycaster for click detection
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const cubeMesh = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 1.0,
    emissive: 0x121314,
  });
  pastelColors.forEach((color, index) => {
    let cubeMaterial;

    // Right cube (index 2) gets Spotify texture
    if (index === 0) {
      textureLoader.load("/assets/spotifylogo.png", (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        cubeMaterial.map = texture;
        cubeMaterial.needsUpdate = true;
      });
      cubeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 1.0,
        emissive: 0x121314,
      });
    }
    if (index === 1) {
      textureLoader.load("/assets/youtube.svg", (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        cubeMaterial.map = texture;
        cubeMaterial.needsUpdate = true;
      });
      cubeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 1.0,
        emissive: 0x121314,
      });
    }
    if (index === 2) {
      textureLoader.load("/assets/Instagram.svg", (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        cubeMaterial.map = texture;
        cubeMaterial.needsUpdate = true;
      });
      cubeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 1.0,
        emissive: 0x121314,
      });
    }
    if (index === 3) {
      textureLoader.load("/assets/mail.png", (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        cubeMaterial.map = texture;
        cubeMaterial.needsUpdate = true;
      });
      cubeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 1.0,
        emissive: 0x121314,
      });
    } else {
      cubeMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.1,
        metalness: 1.0,
      });
    }

    const cubeGeom = new RoundedBoxGeometry(
      cubeSize,
      cubeSize,
      cubeSize,
      smallDevice ? 4 : 4,
      smallDevice ? 1 : 1,
    );
    const cubeMesh = new THREE.Mesh(cubeGeom, cubeMaterial);
    cubeMesh.userData.url = cubeUrls[index]; // Store the URL
    scene.add(cubeMesh);
    clickableCubes.push(cubeMesh);
  });

  // Setup video object
  const videoElement = document.getElementById("video");
  // const videoObject = createVideoObject(scene, videoElement);
  const videoObject = createVideoObject(scene, videoElement, {
    useImage: true,
    imagePath: "assets/albumcover.jpg", // Set to true to use a static image instead of video
  });

  // Define createBustPedestal function before calling it
  async function createBustPedestal(x) {
    // bust GLB 2
    try {
      const gltf = await loader.loadAsync("tennyson-bust.glb");
      const bust = gltf.scene;
      bust.rotation.y = Math.PI;

      // Load Spotify image texture
      textureLoader.load("/assets/spotifylogo.png", (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        // Apply texture to all meshes in the bust
        bust.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: 0.3,
              metalness: 0.8,
            });
          }
        });
      });

      const targetHeight = smallDevice ? 35.5 : 45.5;
      const sizeBox = new THREE.Box3().setFromObject(bust);
      const size = new THREE.Vector3();
      sizeBox.getSize(size);
      bust.scale.setScalar(targetHeight / size.y);

      const fitBox = new THREE.Box3().setFromObject(bust);
      const center = new THREE.Vector3();
      fitBox.getCenter(center);
      bust.position.set(
        //bustX - center.x,
        x,
        -0.7 - fitBox.min.y,
        smallDevice ? -70 : -20,
      );
      bust.userData.rotationSpeed = 0;
      scene.add(bust);
      clickableBusts.push(bust);
      console.log("Bust model loaded successfully");
    } catch (e) {
      console.log("Could not load bust model:", e);
    }
  }

  await createBustPedestal(smallDevice ? -70 : -120);
  await createBustPedestal(smallDevice ? 70 : 120);

  // Add a spotlight aimed directly at the video cubes
  const light = new THREE.SpotLight(0xffffff, 10);
  light.position.set(0, 80, 200);
  light.target.position.set(0, 50, 0);
  light.angle = Math.PI / 4;
  light.penumbra = 0.2;
  light.distance = 500;
  scene.add(light);
  scene.add(light.target);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI / 2.1; // Limit vertical rotation to prevent going below the water
  controls.maxTargetRadius = 600; // Limit how far the camera can move away from the target
  controls.target.set(0, 70, 0);
  controls.minDistance = 40;
  controls.maxDistance = 300;
  controls.update();

  // Add click listener for cubes and busts
  window.addEventListener("click", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Check for cube clicks
    const cubeIntersects = raycaster.intersectObjects(clickableCubes);
    if (cubeIntersects.length > 0) {
      const clickedObject = cubeIntersects[0].object;
      if (clickedObject.userData.url) {
        window.open(clickedObject.userData.url, "_blank");
      }
      return;
    }

    // Check for bust clicks
    const bustIntersects = raycaster.intersectObjects(clickableBusts, true);
    if (bustIntersects.length > 0) {
      // Find the root bust object
      let bustObject = bustIntersects[0].object;
      while (bustObject.parent && bustObject.parent !== scene) {
        bustObject = bustObject.parent;
      }
      // Increase rotation speed
      if (bustObject.userData) {
        bustObject.userData.rotationSpeed += 0.02;
      }
    }
  });

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function renderFrame() {
    const time = performance.now() * 0.001;

    if (mesh) {
      mesh.position.y = Math.sin(time) * 20 + 10;
      mesh.rotation.x = time * 0.5;
      // mesh.rotation.z = time * 0.51;
    }

    // Update clickable cubes to follow camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    clickableCubes.forEach((cube, index) => {
      // Position cube in front of camera
      cube.position.copy(camera.position).addScaledVector(cameraDirection, 80);
      // Spread them horizontally
      cube.position.x += cubePositions[index];
      // Move them lower on the screen
      cube.position.y -= 60;
    });

    // Update bust rotations
    clickableBusts.forEach((bust) => {
      if (bust.userData.rotationSpeed) {
        bust.rotation.y += bust.userData.rotationSpeed;
        // Gradually decay the rotation speed
        bust.userData.rotationSpeed *= 0.98;
        // Stop rotating when speed is very small
        if (Math.abs(bust.userData.rotationSpeed) < 0.0001) {
          bust.userData.rotationSpeed = 0;
        }
      }
    });

    const delta = clock.getDelta();
    water.material.uniforms.time.value += delta;
    sky.material.uniforms.time.value = time;

    // parameters.elevation += 0.01;
    // updateSun();
    videoObject.updateVideo();
    renderer.render(scene, camera);
    // if (controls) {
    //   console.log(controls.target.x, controls.target.y, controls.target.z);
    // }
    // stats.update();
  }

  return {
    updateSun,
    skyUniforms,
    waterUniforms: water.material.uniforms,
    parameters,
    onResize,
    renderFrame,
    // stats,
  };
}
