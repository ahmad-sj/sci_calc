import * as THREE from "three";
import { MyQuat } from "./MyQuat.js";

export class Slope {
  _position = new THREE.Vector3(0, 0, 0);
  _width;
  _length;
  _height;

  _orientation = new MyQuat();

  constructor(position, width, length, normal) {
    this._width = width;
    this._length = length;
    this._position = position.clone();
    this._normal = normal.clone();

    this.setPlaneEquation(normal);
    this.setBounds(position, width, length);
    const texture = this.configTexture(this._width, this._length);

    this.geometry = new THREE.PlaneGeometry(width, length);
    this.material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    this.material.color.setRGB(1.5, 1.5, 1.5);

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(this._position);

    this.orientation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    this.updateMesh();

    this._position = this.mesh.position;
  }

  // Calculate plane equation: Ax + By + Cz + D = 0
  setPlaneEquation(slopeNormal) {
    this.A = slopeNormal.x;
    this.B = slopeNormal.y;
    this.C = slopeNormal.z;
    this.D = -slopeNormal.dot(this._position);
  }

  setBounds(slopePosition, slopeWidth, slopeLength) {
    this._minX = slopePosition.x - slopeWidth / 2;
    this._maxX = slopePosition.x + slopeWidth / 2;

    this._minZ = slopePosition.z - slopeLength / 2;
    this._maxZ = slopePosition.z + slopeLength / 2;
  }

  configTexture(slopeWidth, slopeLength) {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load("static/textures/slope.jpg");

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(slopeWidth / 2, slopeLength / 2);

    return texture;
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  get position() {
    return this._position;
  }

  set position(vector) {
    this._position = vector.clone();
  }

  get normal() {
    return this._normal;
  }

  set normal(vector) {
    this._normal = vector.clone();
  }

  get orientation() {
    return this._orientation;
  }

  set orientation(myQuat) {
    this._orientation = myQuat;
  }

  // Get height at given X,Z position
  getHeightAt(x, z) {
    if (this.B === 0) return 100000; // Vertical plane
    return -(this.A * x + this.C * z + this.D) / this.B;
  }

  // rotate slope with keyboard input
  rotate(input) {
    let rotationSpeed = 0.015;

    if (input.right) {
      this.orientation.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotationSpeed);
      this.updateOrientation();
    }
    if (input.left) {
      this.orientation.rotateOnAxis(new THREE.Vector3(0, 1, 0), -rotationSpeed);
      this.updateOrientation();
    }
    if (input.up) {
      this.orientation.rotateOnAxis(new THREE.Vector3(1, 0, 0), -rotationSpeed);
      this.updateOrientation();
    }
    if (input.down) {
      this.orientation.rotateOnAxis(new THREE.Vector3(1, 0, 0), rotationSpeed);
      this.updateOrientation();
    }
  }

  // Apply the rotation of the orientation to get the world normal
  updateNormal() {
    const defaultNormal = new THREE.Vector3(0, 0, 1);

    const rotatedNormal = this.orientation.rotateVector(defaultNormal);
    this._normal = rotatedNormal.normalize();

    // update plane equation after rotation
    this.setPlaneEquation(this._normal);
  }

  updateMesh() {
    this.mesh.quaternion.set(
      this.orientation.x,
      this.orientation.y,
      this.orientation.z,
      this.orientation.w,
    );
  }

  updateOrientation() {
    this.updateMesh();
    this.updateNormal();
  }

  reset() {
    this._normal.set(0, 1, 0);
    this.setPlaneEquation(this._normal);

    this.orientation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    this.updateMesh();
  }

  // Check if ball is within slope bounds
  contains(ball) {
    return (
      ball.position.x >= this._minX - ball.radius / 3 &&
      ball.position.x <= this._maxX + ball.radius / 3 &&
      ball.position.z >= this._minZ + ball.radius / 3 &&
      ball.position.z <= this._maxZ - ball.radius / 3
    );
  }
}
