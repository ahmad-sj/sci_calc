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
const cameraOffset = new THREE.Vector3(0, 10, 20); // Distance from object
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
woodBox.addToScene(scene);

const ironBoxPosition = new THREE.Vector3(-16, 1, -6);
const ironBoxSize = 2;
const ironBox = new Box(ironBoxPosition, ironBoxSize, "iron_box");
ironBox.addToScene(scene);
///
woodBox.mass = 3;  // صندوق خشب 
ironBox.mass = 8;  // صندوق حديد
////
// ===================================================
// draw slope
const slopePosition = new THREE.Vector3(0, 5, 0);
const slopeWidth = 16;
const slopeLength = 16;
const slopeNormal = new THREE.Vector3(0, 1, 0).normalize();

const slope = new Slope(slopePosition, slopeWidth, slopeLength, slopeNormal);

// show normals of solpe vertices
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
// force manager — لازم يكون قبل الـ gui كرمال نقدر نربطه
const forceManager = new ForceManager();
forceManager.target = ball;
forceManager._airResistanceMultiplier = 1; // مضاعف مقاومة الهواء

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

// ── Ball Folder ──────────────────────────────────────────────────────
const ballFolder = gui.addFolder("Ball");

// mass: عرض فقط (بيتغير تلقائياً مع type)
ballFolder.add(ball, "mass").name("mass").disable();

// type: dropdown يغير نوع الكرة ويحدث العرض
ballFolder
  .add(ball, "type", Object.keys(ball.textures))
  .name("type")
  .onChange(() => {
    updateAllGuiDisplays(gui);
  });

// I = 2/5 * m * r²: عرض فقط
const ballDisplayI = { get I() { return +ball.inertia.toFixed(4); } };
ballFolder.add(ballDisplayI, "I").name("I (Moment of Inertia)").disable();

// m_eff = (7/5)*m: عرض فقط
const ballDisplayMeff = { get m_eff() { return +((7 / 5) * ball.mass).toFixed(4); } };
ballFolder.add(ballDisplayMeff, "m_eff").name("m_eff = (7/5)·m").disable();

// ── Physics Folder ───────────────────────────────────────────────────
const physicsFolder = gui.addFolder("Physics");

// Rolling Friction c_rr: 0.001 → 0.05
physicsFolder
  .add(forceManager, "_c_rr", 0.001, 0.05, 0.001)
  .name("Rolling Friction (c_rr)");

// Sliding Friction mu: 0.05 → 0.8
physicsFolder
  .add(forceManager, "_mu_flat", 0.05, 0.8, 0.01)
  .name("Sliding Friction (mu)");

// Air Resistance multiplier: 0 → 3
physicsFolder
  .add(forceManager, "_airResistanceMultiplier", 0, 3, 0.1)
  .name("Air Resistance x");

// ── Wood Box Folder ──────────────────────────────────────────────────
const woodBoxFolder = gui.addFolder("Wood Box");

// Mass: 1 → 20 kg
woodBoxFolder
  .add(woodBox, "_mass", 1, 20, 0.5)
  .name("Mass");

// Ground Friction: 0.1 → 5
woodBoxFolder
  .add(woodBox, "_mu_floor", 0.1, 5, 0.1)
  .name("Ground Friction");

// ── Iron Box Folder ──────────────────────────────────────────────────
const ironBoxFolder = gui.addFolder("Iron Box");

// Mass: 1 → 20 kg
ironBoxFolder
  .add(ironBox, "_mass", 1, 20, 0.5)
  .name("Mass");

// Ground Friction: 0.1 → 5
ironBoxFolder
  .add(ironBox, "_mu_floor", 0.1, 5, 0.1)
  .name("Ground Friction");

// ==================================================
/////
// ── Energy Folder ────────────────────────────────────────────────────
const energyFolder = gui.addFolder("Energy");

// KE_ball = ½·m·v² + ½·I·ω²
const energyDisplay = {
  get "KE_ball"() {
    return +(0.5 * ball.mass * ball.linearVelocity.lengthSq()
           + 0.5 * ball.inertia * ball.angularVelocity * ball.angularVelocity).toFixed(4);
  },
  get "KE_box_wood"() {
    return +(0.5 * woodBox.mass * woodBox.velocity.lengthSq()).toFixed(4);
  },
  get "KE_box_iron"() {
    return +(0.5 * ironBox.mass * ironBox.velocity.lengthSq()).toFixed(4);
  },
  get "ΔKE_wood"() {
  return +collisionManager.lastEnergyLossWood.toFixed(4);
},
get "ΔKE_iron"() {
  return +collisionManager.lastEnergyLossIron.toFixed(4);
},
};

energyFolder.add(energyDisplay, "KE_ball").name("KE_ball").disable();
energyFolder.add(energyDisplay, "KE_box_wood").name("KE_box (wood)").disable();
energyFolder.add(energyDisplay, "KE_box_iron").name("KE_box (iron)").disable();
// ΔKE منفصل لكل صندوق
energyFolder.add(energyDisplay, "ΔKE_wood").name("ΔKE (wood)").disable();
energyFolder.add(energyDisplay, "ΔKE_iron").name("ΔKE (iron)").disable();
/////////
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
  updateAllGuiDisplays(gui);

  forceManager.update(input, dt);

  console.log("contact: ", ball.contactNormal);
  console.log("slope: ", slope.normal);

  updateCamera();

  // update display aspect ratio after screen resize
  updateAspect(renderer, camera);

  // draw the scene
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
