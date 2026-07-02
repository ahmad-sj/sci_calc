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
    this._radius = number;
    this.mesh.scale.x = this.mesh.scale.y = this.mesh.scale.z = number;
  }
// عزم القصور الذاتي للكرة المتجانسة: I = 2/5 * m * r²
  get inertia() {
    return (2 / 5) * this._mass * this._radius * this._radius;
  }
  
  // ==================================================
  get position() {
    return this._position;
  }

  set position(vector) {
    this._position.copy(vector);
  }

  // ==================================================
  get groundY() {
    return this._groundY;
  }

  set groundY(number) {
    this._groundY = number;
    this._position.y = number + this._radius;
  }

  // ==================================================
  get linearVelocity() {
    return this._linearVelocity;
  }

  set linearVelocity(vector) {
    this._linearVelocity = vector;
  }

  // ==================================================
  get isOnGround() {
    return !(this._position.y <= this._groundY + this._radius + 0.001);
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
  set type(input) {
    // update ball type
    this._type = input;

    // setting ball properties based on type
    switch (input) {
      case "paper": {
        this._mass = 0.75;
        break;
      }
      case "stone": {
        this._mass = 3;
        break;
      }
      case "wood": {
        this._mass = 1.5;
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
  rotate(axis, angle) {
    this.mesh.rotateOnAxis(axis, angle);
  }

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
