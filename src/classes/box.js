import * as THREE from "three";
import { loadTexture } from "~/src/helpers";

export class Box {
  size = 1;
  _position = new THREE.Vector3(0, 0, 0);

  // ===============================================
  _mass = 5;
  _velocity = new THREE.Vector3(0, 0, 0);
  _mu_floor = 0.6;
  _angularVelocity = new THREE.Vector3(0, 0, 0);
  _lastEnergyLoss = 0;

  get angularVelocity() {
    return this._angularVelocity;
  }
  set angularVelocity(value) {
    this._angularVelocity.copy(value);
  }
  // ===============================================

  _minX = this._position.x - this.size / 2;
  _maxX = this._position.x + this.size / 2;
  _minY = this._position.y - this.size / 2;
  _maxY = this._position.y + this.size / 2;
  _minZ = this._position.z - this.size / 2;
  _maxZ = this._position.z + this.size / 2;

  constructor(position, size, textureName) {
    this._position.copy(position);
    this.size = size;

    this.update();

    const materials = [];

    for (let index = 1; index <= 6; index++) {
      materials.push(
        new THREE.MeshBasicMaterial({
          map: loadTexture(`static/textures/${textureName}.jpg`),
        }),
      );
    }

    this.geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
    this.mesh = new THREE.Mesh(this.geometry, materials);
    this.mesh.position.copy(this._position);
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  get position() {
    return this._position;
  }

  set position(value) {
    this._position = value;
    this.mesh.position.copy(this._position);
  }

  // ===============================================
  // getters setters
  get mass() {
    return this._mass;
  }

  set mass(value) {
    this._mass = value;
  }

  get velocity() {
    return this._velocity;
  }

  set velocity(value) {
    this._velocity.copy(value);
  }

  get lastEnergyLoss() {
    return +this._lastEnergyLoss.toFixed(4);
  }

  set lastEnergyLoss(number) {
    this._lastEnergyLoss = number;
  }

  get KE() {
    return +(0.5 * this._mass * this._velocity.lengthSq()).toFixed(4);
  }

  // ===============================================
  updateMovement(dt, g = 9.81) {
    if (this._velocity.length() >= 0.01) {
      const dir = this._velocity.clone().normalize();

      // a_C = -mu_floor * g * u_vC
      const frictionDecel = this._mu_floor * g;
      const frictionAcc = dir.multiplyScalar(-frictionDecel);

      // v_C(t+dt) = v_C(t) + a_C * dt
      this._velocity.addScaledVector(frictionAcc, dt);

      // x_C(t+dt) = x_C(t) + v_C * dt
      this._position.addScaledVector(this._velocity, dt);
      this.mesh.position.copy(this._position);
      this.update();
    } else {
      this._velocity.set(0, 0, 0);
    }

    this.mesh.rotation.x += this._angularVelocity.x * dt;
    this.mesh.rotation.y += this._angularVelocity.y * dt;
    this.mesh.rotation.z += this._angularVelocity.z * dt;

    this._angularVelocity.multiplyScalar(0.92);
  }
  // ===============================================

  update() {
    // Update the min and max values
    this._minX = this._position.x - this.size / 2;
    this._maxX = this._position.x + this.size / 2;
    this._minY = this._position.y - this.size / 2;
    this._maxY = this._position.y + this.size / 2;
    this._minZ = this._position.z - this.size / 2;
    this._maxZ = this._position.z + this.size / 2;
  }
}
