import * as THREE from "three";
import { loadSRGBTexture } from "../helpers.js";
import { MyQuat } from "./MyQuat.js";

export class Ball {
  _radius = 1;
  _sphereWidthDivisions = 32;
  _sphereHeightDivisions = 16;

  _mass = 1;
  _position;
  _linearVelocity = new THREE.Vector3(0, 0, 0);
  _angularVelocity = 0;
  _groundY = 0;

  _orientation = new MyQuat();
  _contactNormal = new THREE.Vector3(0, 1, 0);

  _dragCoefficient = 0.47;
  _restitutionCoefficient = 0.4;

  _onSurface = false;

  // ==================================================
  constructor() {
    this.geometry = new THREE.SphereGeometry(
      this._radius,
      this._sphereWidthDivisions,
      this._sphereHeightDivisions,
    );

    this.textures = {
      wood: loadSRGBTexture("static/textures/ball/wood/base.jpg"),
      stone: loadSRGBTexture("static/textures/ball/stone/base.jpg"),
      paper: loadSRGBTexture("static/textures/ball/paper/base.jpg"),
    };

    this.material = new THREE.MeshPhongMaterial();

    this.type = "wood";

    this.mesh = new THREE.Mesh(this.geometry, this.material);

    this.mesh.position.copy(new THREE.Vector3(0, 0, 0));
    this._position = this.mesh.position;

    const axesHelper = new THREE.AxesHelper(2);

    this.mesh.add(axesHelper);
  }

  // ==================================================
  addToScene(scene) {
    scene.add(this.mesh);
  }

  // ==================================================
  get radius() {
    return this._radius;
  }

  // ==================================================
  get mass() {
    return this._mass;
  }

  set mass(number) {
    this._mass = number;
  }

  // ==================================================
  get position() {
    return this._position;
  }

  set position(vector) {
    this._position.copy(vector);
  }

  // ==================================================
  get linearVelocity() {
    return this._linearVelocity;
  }

  set linearVelocity(vector) {
    this._linearVelocity = vector;
  }

  // ==================================================
  get angularVelocity() {
    return this._angularVelocity;
  }

  set angularVelocity(vector) {
    this._angularVelocity = vector;
  }

  // ==================================================
  get contactNormal() {
    return this._contactNormal;
  }

  set contactNormal(vector) {
    this._contactNormal = vector;
  }

  // ==================================================
  get onSurface() {
    return this._onSurface;
  }

  set onSurface(boolean) {
    this._onSurface = boolean;
  }

  // ==================================================
  set type(input) {
    // update ball type
    this._type = input;

    // setting ball properties based on type
    switch (input) {
      case "paper": {
        this._mass = 0.75;
        this._dragCoefficient = 0.47;
        this._restitutionCoefficient = 0.15;
        break;
      }
      case "stone": {
        this._mass = 3;
        this._dragCoefficient = 0.52;
        this._restitutionCoefficient = 0.25;
        break;
      }
      case "wood": {
        this._mass = 1.5;
        this._dragCoefficient = 0.47;
        this._restitutionCoefficient = 0.4;
        break;
      }
    }

    // applying textures
    this.material.map = this.textures[input];

    const textureLoader = new THREE.TextureLoader();

    const bumpMap = textureLoader.load(
      `static/textures/ball/${input}/bump_map.jpg`,
    );
    this.material.bumpMap = bumpMap;

    const normalMap = textureLoader.load(
      `static/textures/ball/${input}/normal_map.jpg`,
    );
    this.material.normalMap = normalMap;

    this.material.needsUpdate = true;
  }

  get type() {
    return this._type;
  }

  get orientation() {
    return this._orientation;
  }

  set orientation(myQuat) {
    this._orientation = myQuat;
  }

  // ==================================================
  get inertia() {
    // I = 2/5 * m * r²
    return +((2 / 5) * this._mass * this._radius * this._radius).toFixed(4);
  }

  get effectiveMass() {
    return +((7 / 5) * this._mass).toFixed(4);
  }

  get KE() {
    // KE_ball = ½·m·v² + ½·I·ω²
    return +(
      0.5 * this._mass * this._linearVelocity.lengthSq() +
      0.5 * this.inertia * this._angularVelocity * this._angularVelocity
    ).toFixed(4);
  }

  // ==================================================
  get dragCoefficient() {
    return this._dragCoefficient;
  }

  set dragCoefficient(number) {
    this._dragCoefficient = number;
  }

  // ==================================================
  get restitutionCoefficient() {
    return this._restitutionCoefficient;
  }

  set restitutionCoefficient(number) {
    this._restitutionCoefficient = number;
  }

  // ==================================================
  reset() {
    this.linearVelocity.set(0, 0, 0);
    this.angularVelocity = 0;

    this.orientation.identity();
    this.updateMesh(this.orientation);

    this.position.set(0, 10, 0);
    this.mass = 1;
    this.contactNormal.set(0, 1, 0);
  }

  updateMesh() {
    this.mesh.quaternion.set(
      this.orientation.x,
      this.orientation.y,
      this.orientation.z,
      this.orientation.w,
    );
  }
}
