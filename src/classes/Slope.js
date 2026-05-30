import * as THREE from "three";
import { getNormalAngleRad } from "../helpers.js";

export class Slope {
  _position = new THREE.Vector3(0, 0, 0);
  _width;
  _length;
  _height;
  _angle;

  constructor(position, width, length, groundY, normal) {
    this._width = width;
    this._length = length;

    this._position = position.clone();
    // this._normal = new THREE.Vector3(0, 0.94, 0.342).normalize();
    this._normal = normal.clone();

    // Calculate plane equation: Ax + By + Cz + D = 0
    this.A = this.normal.x;
    this.B = this.normal.y;
    this.C = this.normal.z;
    this.D = -this.normal.dot(this._position);

    // this._position.y -= this._position.y - groundY;
    // this._position.y += this._height / 2;

    this._minX = position.x - this._width / 2;
    this._maxX = position.x + this._width / 2;

    this._minY = position.y - this._height / 2;
    this._maxY = position.y + this._height / 2;

    this._minZ = position.z - this._length / 2;
    this._maxZ = position.z + this._length / 2;

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load("static/textures/slope.jpg");

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.repeat.set(width / 2, length / 2);

    this.geometry = new THREE.PlaneGeometry(width, length);
    this.material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    this.material.color.setRGB(1.5, 1.5, 1.5);

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(this._position);
    // this.mesh.rotation.x = -1 * ((Math.PI * 70) / 180);

    this.geometry.lookAt(this._normal);
    this._position = this.mesh.position;
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  get position() {
    return this._position;
  }

  get normal() {
    return this._normal;
  }

  set normal(vector) {
    this._normal = vector.clone();
  }

  get angleRad() {
    return getNormalAngleRad(this._normal);
  }

  get height() {
    return Math.sin(this.angleRad) * this._length;
  }

  // Get height at given X,Z position
  getHeightAt(x, z) {
    if (this.B === 0) return this.point.y; // Vertical plane
    return -(this.A * x + this.C * z + this.D) / this.B;
  }

  // Check if point is within slope bounds
  containsPoint(x, z) {
    const localX = x - this._position.x;
    const localZ = z - this._position.z;
    return (
      Math.abs(localX) <= this._width / 2 &&
      Math.abs(localZ) <= this._length / 2
    );
  }
}
