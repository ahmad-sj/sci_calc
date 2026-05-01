import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Timer } from "three";

import {
  updateAspect,
  addLights,
  checkerboardPlane,
  listenToKeyboard,
  drawSkybox,
} from "./helpers";

import GUI from "lil-gui";
import { Ball } from "./classes/ball";
import { Box } from "./classes/box";

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
const groundY = 0;
const textureLoader = new THREE.TextureLoader();

const timer = new Timer();
timer.connect(document);

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
addLights(scene);

// ==================================================
// drawing checkerboard plane
scene.add(checkerboardPlane(40));

// ==================================================
// draw ball
const ball = new Ball();
ball.addToScene(scene);

// ===================================================
// draw boxes
const woodBoxPosition = new THREE.Vector3(5, 1, 0);
const woodBoxSize = 2;
const woodBox = new Box(woodBoxPosition, woodBoxSize, "wood_box");
woodBox.addToScene(scene);

const ironBoxPosition = new THREE.Vector3(-5, 1, -6);
const ironBoxSize = 2;
const ironBox = new Box(ironBoxPosition, ironBoxSize, "iron_box");
ironBox.addToScene(scene);

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

const cameraOffset = new THREE.Vector3(0, 10, 20); // Distance from object

// ==================================================
// lil-gui controls

const ballFolder = gui.addFolder("Ball");

ballFolder.add(ball, "mass", 1, 3, 0.5).name("mass");

// ==================================================
// drawing loop

function animate(time) {
  timer.update(time);
  const dt = timer.getDelta();

  // ball.update();
  ball.move(input, dt);

  // Update camera position based on object position + offset
  // camera.position.copy(ball.position).add(cameraOffset);
  // camera.lookAt(ball.position);

  // update camera position according to ball position
  controls.target.copy(ball.position);
  controls.update();

  // update display aspect ratio after screen resize
  updateAspect(renderer, camera);

  // draw the scene
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
