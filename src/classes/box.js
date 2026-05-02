import * as THREE from "three";
import { loadTexture } from "~/src/helpers";

export class Box {
  size = 1;
  _position = new THREE.Vector3(0, 0, 0);

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
