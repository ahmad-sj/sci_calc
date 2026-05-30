import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Timer } from "three";
import { updateAllGuiDisplays } from "./helpers";
import { getNormalAngleRad } from "./helpers";

import {
  updateAspect,
  addLights,
  // checkerboardPlane,
  listenToKeyboard,
  drawSkybox,
} from "./helpers";

import GUI from "lil-gui";
import { Ground } from "./classes/Ground";
import { Ball } from "./classes/ball";
import { Box } from "./classes/box";
import { Slope } from "./classes/Slope";
import { CollisionManager } from "./classes/CollisionManager";
import { ForceManager } from "./classes/ForceManager";

import { VertexNormalsHelper } from "three/examples/jsm/helpers/VertexNormalsHelper.js";

// ==================================================
// setup scene, camera, renderer
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
camera.position.set(0, 10, 20);

const canvas = document.querySelector("#c");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

// ==================================================
//setting camera controls
const controls = new OrbitControls(camera, renderer.domElement);
// controls.target.set(0, 5, 0);
// controls.update();

// ==================================================
// globals
const gui = new GUI();

const timer = new Timer();
timer.connect(document);

const groundY = 0;

// ==================================================
// pressed arrows status
const input = {
  left: false,
  right: false,
  up: false,
  down: false,
};

// ==================================================
// lights
addLights(gui, scene);

// ==================================================
// draw ground
const groundPosition = new THREE.Vector3(0, groundY, 0);
const groundSize = 80;
const ground = new Ground(groundPosition, groundSize);
ground.addToScene(scene);

// ==================================================
// draw ball
const ball = new Ball();
ball.addToScene(scene);

// ===================================================
// draw boxes
const woodBoxPosition = new THREE.Vector3(7, 1, 3);
const woodBoxSize = 2;
const woodBox = new Box(woodBoxPosition, woodBoxSize, "wood_box");
woodBox.addToScene(scene);

const ironBoxPosition = new THREE.Vector3(-9, 1, -6);
const ironBoxSize = 2;
const ironBox = new Box(ironBoxPosition, ironBoxSize, "iron_box");
ironBox.addToScene(scene);

// ===================================================
const slopeNormal = new THREE.Vector3(0, 1, 0.5).normalize();
const slopeAngleRad = getNormalAngleRad(slopeNormal);

const slopeWidth = 4;
const slopeLength = 16;

const SlopeXPosition = 0;
const slopeYPosition = groundY + Math.sin(slopeAngleRad) * (slopeLength / 2);
const SlopeZPosition = -10;

const slopePosition = new THREE.Vector3(
  SlopeXPosition,
  slopeYPosition,
  SlopeZPosition,
);

const slope = new Slope(
  slopePosition,
  slopeWidth,
  slopeLength,
  groundY,
  slopeNormal,
);

const planeHelper = new VertexNormalsHelper(slope.mesh, 1, 0xff0000);
scene.add(planeHelper);

slope.addToScene(scene);

const textureLoader = new THREE.TextureLoader();
const slsTexture = textureLoader.load("static/textures/wall.jpg");

const slsGeometry = new THREE.PlaneGeometry(slopeLength, slope.height);
const slsMaterial = new THREE.MeshBasicMaterial({
  map: slsTexture,
  side: THREE.DoubleSide,
});

const slsMesh = new THREE.Mesh(slsGeometry, slsMaterial);
slsMesh.position.copy(
  new THREE.Vector3(
    slope.position.x + slope._width / 2,
    slope.position.y,
    slope.position.z,
  ),
);
scene.add(slsMesh);
slsMesh.rotation.y = Math.PI * -0.5;

// ===================================================
// draw origin axis
const axesHelper = new THREE.AxesHelper(15);
scene.add(axesHelper);

// ===================================================
// catching arrow keys pressing
listenToKeyboard(input);

// ===================================================
// draw skybox
drawSkybox(scene);

// ==================================================
const cameraOffset = new THREE.Vector3(0, 10, 20); // Distance from object

// ==================================================
// lil-gui controls
const ballFolder = gui.addFolder("Ball");
ballFolder.add(ball, "mass").name("mass").disable();

ballFolder
  .add(ball, "type", Object.keys(ball.textures))
  .name("type")
  .onChange(() => {
    updateAllGuiDisplays(gui);
  });

// ==================================================
const forceManager = new ForceManager();
forceManager.target = ball;

// ==================================================
// collisions handling
const collisionManager = new CollisionManager(forceManager);
collisionManager.addItem({ ground: ground });
collisionManager.addItem({ ball: ball });
collisionManager.addItem({ woodBox: woodBox });
collisionManager.addItem({ ironBox: ironBox });
collisionManager.addItem({ slope: slope });

// ==================================================
// drawing loop

function animate(time) {
  timer.update(time);
  const dt = timer.getDelta();

  planeHelper.update();

  collisionManager.update();
  forceManager.update(input, dt);

  // change camera position according to ball position
  // camera.position.copy(ball.position).add(cameraOffset);
  // camera.lookAt(ball.position);

  // control camera with mouse
  controls.target.copy(ball.position);
  controls.update();

  // update display aspect ratio after screen resize
  updateAspect(renderer, camera);

  // draw the scene
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
