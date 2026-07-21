import * as THREE from "three";

function change_uvs(geometry, unitx, unity, offsetx, offsety) {
  const uvs = geometry.attributes.uv.array;

  for (let i = 0; i < uvs.length; i += 2) {
    uvs[i] = (uvs[i] + offsetx) * unitx;
    uvs[i + 1] = (uvs[i + 1] + offsety) * unity;
  }
}

export function createVideoObject(scene, videoElement, options = {}) {
  const useImage = options.useImage || false;
  const imagePath = options.imagePath || null;

  let mouseX = 0;
  let mouseY = 0;

  let windowHalfX = window.innerWidth / 2;
  let windowHalfY = window.innerHeight / 2;

  let cube_count;

  const meshes = [];
  const materials = [];
  const xgrid = 20;
  const ygrid = 10;

  // Image paths for cycling
  const imagePaths = ["/assets/albumcover.jpg", "/assets/ThisIsCover.png"];
  let currentImageIndex = 0;

  // Setup texture - either video or image
  let texture = null;
  const textureLoader = new THREE.TextureLoader();

  const loadImageTexture = (path) => {
    textureLoader.load(path, (loadedTexture) => {
      texture = loadedTexture;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;
      // Update materials with the texture
      for (let i = 0; i < materials.length; i++) {
        materials[i].transparent = false;
        materials[i].map = texture;
        materials[i].needsUpdate = true;
      }
    });
  };

  if (useImage && imagePath) {
    // IMAGE MODE - start with the provided image
    loadImageTexture(imagePath);
  } else {
    // VIDEO MODE (default)
    videoElement.crossOrigin = "anonymous";

    // Add event listeners for debugging
    videoElement.addEventListener("loadstart", () =>
      console.log("Video: loadstart"),
    );
    videoElement.addEventListener("canplay", () => {
      console.log("Video: canplay event fired");
      initVideoTexture();
    });
    videoElement.addEventListener("error", (e) => {
      console.error("Video loading error:", e);
    });
    videoElement.addEventListener("play", () => console.log("Video: playing"));

    const initVideoTexture = () => {
      if (!texture) {
        texture = new THREE.VideoTexture(videoElement);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        // Update materials with the texture
        for (let i = 0; i < materials.length; i++) {
          materials[i].map = texture;
          materials[i].needsUpdate = true;
        }
        console.log("Video texture initialized successfully");
      }
    };

    // Start loading the video
    videoElement.load();
    videoElement.play().catch((err) => {
      console.warn(
        "Video autoplay failed (this is normal on some browsers):",
        err,
      );
    });
  }

  let i, j, ox, oy, geometry;

  const ux = 1 / xgrid;
  const uy = 1 / ygrid;

  const xsize = 240 / xgrid;
  const ysize = 242 / ygrid;

  const parameters = {
    color: 0xffffff,
    emissive: 0x111111,
    shininess: 100,
  };

  cube_count = 0;

  for (i = 0; i < xgrid; i++) {
    for (j = 0; j < ygrid; j++) {
      ox = i;
      oy = j;

      geometry = new THREE.BoxGeometry(xsize, ysize, xsize);

      change_uvs(geometry, ux, uy, ox, oy);

      materials[cube_count] = new THREE.MeshPhongMaterial(parameters);

      const material = materials[cube_count];

      material.hue = i / xgrid;
      material.saturation = 1 - j / ygrid;

      material.color.setHSL(material.hue, material.saturation, 0.5);

      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.x = (i - xgrid / 2) * xsize;
      mesh.position.y = (j - ygrid / 2) * ysize + 150;
      mesh.position.z = -150;

      mesh.scale.x = mesh.scale.y = mesh.scale.z = 1;

      scene.add(mesh);

      mesh.dx = 0.001 * (0.5 - Math.random());
      mesh.dy = 0.001 * (0.5 - Math.random());

      meshes[cube_count] = mesh;

      cube_count += 1;
    }
  }

  document.addEventListener("mousemove", onDocumentMouseMove);
  window.addEventListener("resize", onWindowResize);

  function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
  }

  function onDocumentMouseMove(event) {
    mouseX = event.clientX - windowHalfX;
    mouseY = (event.clientY - windowHalfY) * 0.3;
  }

  let h,
    counter = 1;

  function updateVideo() {
    if (counter > 599) {
      const fadeProgress = Math.min(1, (counter - 599) / 160);
      const alpha = 1 - fadeProgress;

      for (let i = 0; i < cube_count; i++) {
        const material = materials[i];
        const mesh = meshes[i];

        material.transparent = true;
        material.opacity = alpha;
        material.needsUpdate = true;
      }

      if (alpha <= 0) {
        counter = 1;

        // Switch to next image if in image mode
        if (useImage && imagePath) {
          currentImageIndex = (currentImageIndex + 1) % imagePaths.length;
          loadImageTexture(imagePaths[currentImageIndex]);
        }
        return;
      }

      counter++;
      return;
    }

    const time = Date.now() * 0.000002;

    // Update video texture every frame if in video mode
    if (!useImage && texture) {
      texture.needsUpdate = true;
    }

    for (let i = 0; i < cube_count; i++) {
      const material = materials[i];

      h = ((360 * (material.hue + time)) % 360) / 360;
      material.color.setHSL(h, material.saturation, 0.5);
    }

    if (counter % 250 > 100) {
      for (let i = 0; i < cube_count; i++) {
        const mesh = meshes[i];

        mesh.rotation.x += 10 * mesh.dx;
        mesh.rotation.y += 10 * mesh.dy;

        mesh.position.x -= 250 * mesh.dx;
        mesh.position.y += 250 * mesh.dy;
        mesh.position.z += 300 * mesh.dx;
      }
    }

    if (counter % 250 === 0) {
      for (let i = 0; i < cube_count; i++) {
        const mesh = meshes[i];

        mesh.dx *= -1;
        mesh.dy *= -1;
      }
    }

    counter++;
  }

  return {
    meshes,
    updateVideo,
  };
}
