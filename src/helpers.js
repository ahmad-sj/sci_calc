import * as THREE from "three";
import GUI from "lil-gui";

const textureLoader = new THREE.TextureLoader();

export function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  //clientWidth is Content width + Padding.
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

export function updateAspect(renderer, camera) {
  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
}

export class AxisGridHelper {
  constructor(node, units = 10) {
    const axes = new THREE.AxesHelper();
    axes.material.depthTest = false;
    axes.renderOrder = 2; // after the grid
    node.add(axes);

    const grid = new THREE.GridHelper(units, units);
    grid.material.depthTest = false;
    grid.renderOrder = 1;
    node.add(grid);

    this.grid = grid;
    this.axes = axes;
    this.visible = false;
  }
  get visible() {
    return this._visible;
  }
  set visible(v) {
    this._visible = v;
    this.grid.visible = v;
    this.axes.visible = v;
  }
}

export class DegRadHelper {
  constructor(obj, prop) {
    this.obj = obj;
    this.prop = prop;
  }
  get value() {
    return THREE.MathUtils.radToDeg(this.obj[this.prop]);
  }
  set value(v) {
    this.obj[this.prop] = THREE.MathUtils.degToRad(v);
  }
}

export class StringToNumberHelper {
  constructor(obj, prop) {
    this.obj = obj;
    this.prop = prop;
  }
  get value() {
    return this.obj[this.prop];
  }
  set value(v) {
    this.obj[this.prop] = parseFloat(v);
  }
}

export class ColorGUIHelper {
  constructor(object, prop) {
    this.object = object;
    this.prop = prop;
  }
  get value() {
    return "#" + this.object[this.prop].getHexString();
  }
  set value(hexString) {
    this.object[this.prop].set(hexString);
  }
}

export function addLights(gui, scene) {
  const color = 0xffffff;
  const intensity = 1;

  // HemisphereLight
  /* A HemisphereLight takes a sky color and a ground color and just multiplies the material's color between those 2 colors
the sky color if the surface of the object is pointing up and the ground color if the surface of the object is pointing down. */
  const skyColor = 0xffffff; // light blue
  const groundColor = 0x878787;

  const hemisphereLight = new THREE.HemisphereLight(
    skyColor,
    groundColor,
    intensity,
  );
  scene.add(hemisphereLight);

  // const gui = new GUI();

  const hemisphereLightFolder = gui.addFolder("HemisphereLight");

  hemisphereLight.visible = true;
  hemisphereLightFolder.add(hemisphereLight, "visible").name("hemisphereLight");

  hemisphereLightFolder
    .addColor(new ColorGUIHelper(hemisphereLight, "color"), "value")
    .name("skyColor");
  hemisphereLightFolder
    .addColor(new ColorGUIHelper(hemisphereLight, "groundColor"), "value")
    .name("groundColor");
  hemisphereLightFolder.add(hemisphereLight, "intensity", 0, 5, 0.01);

  // DirectionalLight
  /* a directional light computes light coming in one direction.
  There is no point the light comes from,
  it's an infinite plane of light shooting out parallel rays of light. */

  const directionalLight = new THREE.DirectionalLight(color, intensity);
  directionalLight.position.set(0, 10, 0);
  directionalLight.target.position.set(-5, 0, 0);
  scene.add(directionalLight);
  scene.add(directionalLight.target);

  directionalLight.visible = true;

  const directionalLightFolder = gui.addFolder("DirectionalLight");

  directionalLightFolder
    .add(directionalLight, "visible")
    .name("directionalLight");
  directionalLightFolder
    .addColor(new ColorGUIHelper(directionalLight, "color"), "value")
    .name("color");
  directionalLightFolder.add(directionalLight, "intensity", 0, 5, 0.01);

  // const directionalLightHelper = new THREE.DirectionalLightHelper(
  //   directionalLight,
  // );
  // directionalLightHelper.visible = false;
  // directionalLightFolder.add(directionalLightHelper, "visible").name("helper");

  // scene.add(directionalLightHelper);
}

export function checkerboardPlane(planeSize) {
  const textureLoader = new THREE.TextureLoader();
  const checkerTexture = textureLoader.load("static/textures/checker.png");

  checkerTexture.wrapS = THREE.RepeatWrapping;
  checkerTexture.wrapT = THREE.RepeatWrapping;
  checkerTexture.magFilter = THREE.NearestFilter;
  checkerTexture.colorSpace = THREE.SRGBColorSpace;
  const repeats = planeSize / 2;
  checkerTexture.repeat.set(repeats, repeats);

  const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
  const planeMat = new THREE.MeshBasicMaterial({
    map: checkerTexture,
    side: THREE.DoubleSide,
  });
  planeMat.color.setRGB(1.5, 1.5, 1.5);
  const mesh = new THREE.Mesh(planeGeo, planeMat);
  mesh.rotation.x = Math.PI * -0.5;
  return mesh;
}

export function loadTexture(path) {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function listenToKeyboard(input) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") input.right = true;
    if (e.key === "ArrowLeft") input.left = true;
    if (e.key === "ArrowUp") input.up = true;
    if (e.key === "ArrowDown") input.down = true;
  });

  document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowRight") input.right = false;
    if (e.key === "ArrowLeft") input.left = false;
    if (e.key === "ArrowUp") input.up = false;
    if (e.key === "ArrowDown") input.down = false;
  });
}

export function drawSkybox(scene) {
  const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([
    "static/textures/skybox/px.png",
    "static/textures/skybox/nx.png",
    "static/textures/skybox/py.png",
    "static/textures/skybox/nx.png",
    "static/textures/skybox/pz.png",
    "static/textures/skybox/nz.png",
  ]);
  scene.background = texture;
}

export const loadSRGBTexture = (url) => {
  const texture = textureLoader.load(url);
  // CRUCIAL: Assign the sRGB color space to the texture
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export function getClosestPoint3d(item, ball) {
  return {
    x: Math.max(item._minX, Math.min(ball.position.x, item._maxX)),
    y: Math.max(item._minY, Math.min(ball.position.y, item._maxY)),
    z: Math.max(item._minZ, Math.min(ball.position.z, item._maxZ)),
  };
}

export function updateAllGuiDisplays(targetGui) {
  // Update all controllers in the current folder/root
  for (const controller of targetGui.controllers) {
    controller.updateDisplay();
  }
  // Walk through nested folders
  for (const folder of targetGui.folders) {
    updateAllGuiDisplays(folder);
  }
}

export function getNormalAngleRad(normal) {
  // 1. Define the world's horizontal plane normal (pointing straight up)
  const upAxis = new THREE.Vector3(0, 1, 0);

  // 2. Get the angle in radians between the slope normal and the up axis
  let angleToUp = normal.angleTo(upAxis);

  // 3. (Optional) Get the actual slope angle from the horizontal axis
  // let slopeAngle = Math.PI / 2 - angleToUp;

  // Convert to degrees if needed
  // let slopeDegrees = THREE.MathUtils.radToDeg(slopeAngle);
  // return 90 - slopeDegrees;
  return angleToUp;
}
