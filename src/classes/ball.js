import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

export class Ball {
  _radius = 1;
  _sphereWidthDivisions = 32;
  _sphereHeightDivisions = 16;

  _mass = 1;
  _position;
  _linearVelocity = new THREE.Vector3(0, 0, 0);
  _angularVelocity = 0;
  _groundY = 0;

  // ==================================================
  constructor() {
    this.geometry = new THREE.SphereGeometry(
      this._radius,
      this._sphereWidthDivisions,
      this._sphereHeightDivisions,
    );

    this.texture = textureLoader.load("static/textures/stone.jpg");
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.material = new THREE.MeshPhongMaterial({ map: this.texture });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(new THREE.Vector3(0, 0, 0));
    this._position = this.mesh.position;
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
  rotate(axis, angle) {
    this.mesh.rotateOnAxis(axis, angle);
  }
}
