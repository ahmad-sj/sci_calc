import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Timer } from "three";
import { updateAllGuiDisplays } from "./helpers";

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
const cameraOffset = new THREE.Vector3(0, 10, 30); // Distance from object
let cameraMode = true;

// ==================================================
// globals
const gui = new GUI();

const timer = new Timer();
timer.connect(document);

const groundY = 0;

// pressed arrows status
const input = {
  left: false,
  right: false,
  up: false,
  down: false,
  reset: false,
  mode1: false,
  mode2: false,
  camera: false,
  type: false,
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

// ===================================================
// draw boxes
const woodBoxPosition = new THREE.Vector3(16, 1, 3);
const woodBoxSize = 2;
const woodBox = new Box(woodBoxPosition, woodBoxSize, "wood_box");
woodBox.mass = 3;
woodBox.addToScene(scene);

const ironBoxPosition = new THREE.Vector3(-16, 1, -6);
const ironBoxSize = 2;
const ironBox = new Box(ironBoxPosition, ironBoxSize, "iron_box");
ironBox.mass = 8;
ironBox.addToScene(scene);

// ===================================================
// draw slope
const slopePosition = new THREE.Vector3(0, 5, 0);
const slopeWidth = 16;
const slopeLength = 16;
const slopeNormal = new THREE.Vector3(0, 1, 0).normalize();

const slope = new Slope(slopePosition, slopeWidth, slopeLength, slopeNormal);

// show normals of slope vertices
const planeHelper = new VertexNormalsHelper(slope.mesh, 1, 0xff0000);
scene.add(planeHelper);

slope.addToScene(scene);

// ==================================================
// draw ball
const ball = new Ball();
ball.position.set(0, 10, 0);
ball.addToScene(scene);

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
const forceManager = new ForceManager();
forceManager.target = ball;
forceManager._airResistanceMultiplier = 1;

// ==================================================
// collisions handling
const collisionManager = new CollisionManager(forceManager);
collisionManager.addItem({ ground: ground });
collisionManager.addItem({ ball: ball });
collisionManager.addItem({ woodBox: woodBox });
collisionManager.addItem({ ironBox: ironBox });
collisionManager.addItem({ slope: slope });

// ==================================================
// lil-gui controls

// Ball folder
const ballFolder = gui.addFolder("Ball");
ballFolder.add(ball, "mass", 0.5, 9, 0.25).name("mass");
ballFolder.add(ball, "inertia").name("inertia").disable();
ballFolder.add(ball, "effectiveMass").name("effective mass").disable();
ballFolder.add(ball, "onSurface").name("on surface").disable();
ballFolder.add(ball, "type", Object.keys(ball.textures)).name("type");

// coefficients / constants controls
const coffecientsFolder = gui.addFolder("Coefficients / Constants");
coffecientsFolder.add(forceManager, "_g", 0, 50, 0.2).name("gravity");
coffecientsFolder.add(forceManager, "_mu", 0, 1, 0.1).name("fr_sliding");
coffecientsFolder.add(forceManager, "_c_rr", 0, 0.1, 0.001).name("fr_rolling");
coffecientsFolder.add(forceManager, "_rho", 0, 3, 0.3).name("rho_air");
coffecientsFolder.add(ball, "dragCoefficient", 0, 1, 0.01).name("drag");
coffecientsFolder
  .add(ball, "_restitutionCoefficient", 0, 1, 0.05)
  .name("restitution");
coffecientsFolder
  .add(forceManager, "_airResistanceMultiplier", 0, 3, 0.1)
  .name("air resistance mult");

// Wood Box Folder
const woodBoxFolder = gui.addFolder("Wood Box");
woodBoxFolder.add(woodBox, "_mass", 1, 20, 0.5).name("Mass");
woodBoxFolder.add(woodBox, "_mu_floor", 0.1, 5, 0.1).name("Ground Friction");

// Iron Box Folder
const ironBoxFolder = gui.addFolder("Iron Box");
ironBoxFolder.add(ironBox, "_mass", 1, 20, 0.5).name("Mass");
ironBoxFolder.add(ironBox, "_mu_floor", 0.1, 5, 0.1).name("Ground Friction");

// Energy Folder
const energyFolder = gui.addFolder("Energy");
energyFolder.add(ball, "KE").name("KE_ball").disable();
energyFolder.add(woodBox, "KE").name("KE_box (wood)").disable();
energyFolder.add(ironBox, "KE").name("KE_box (iron)").disable();
energyFolder.add(woodBox, "lastEnergyLoss").name("ΔKE (wood)").disable();
energyFolder.add(ironBox, "lastEnergyLoss").name("ΔKE (iron)").disable();

// ==================================================
function controlKeys() {
  if (input.reset) {
    ball.reset();
    slope.reset();
  }
  if (input.mode1) {
    forceManager.mode = false;
  }
  if (input.mode2) {
    forceManager.mode = true;
  }
  if (!forceManager.mode) {
    slope.rotate(input);
  }
  if (input.camera) {
    cameraMode = !cameraMode;
  }
  if (input.type) {
    ball.type =
      ball.type === "wood"
        ? "stone"
        : ball.type === "stone"
          ? "paper"
          : ball.type === "paper"
            ? "wood"
            : "wood";
  }
}

// ==================================================

function updateCamera() {
  if (cameraMode) {
    // move camera with ball position
    camera.position.copy(ball.position).add(cameraOffset);
    camera.lookAt(ball.position);
  } else {
    // control camera with mouse
    controls.target.copy(ball.position);
    controls.update();
  }
}

// ==================================================
// drawing loop
function animate(time) {
  timer.update(time);
  const dt = timer.getDelta();

  controlKeys();

  planeHelper.update();

  collisionManager.update(dt);
  forceManager.update(input, dt);

  updateAllGuiDisplays(gui);

  updateCamera();

  // update display aspect ratio after screen resize
  updateAspect(renderer, camera);

  // draw the scene
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
