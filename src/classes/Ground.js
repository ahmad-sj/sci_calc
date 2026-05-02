import * as THREE from "three";

export class Ground {
  _size = 10;
  _position = new THREE.Vector3(0, 0, 0);

  _minX = this._position.x - this._size / 2;
  _maxX = this._position.x + this._size / 2;
  _minY = this._position.y - this._size / 2;
  _maxY = this._position.y + this._size / 2;
  _minZ = this._position.z - this._size / 2;
  _maxZ = this._position.z + this._size / 2;

  constructor(position, size) {
    this._size = size;
    const textureLoader = new THREE.TextureLoader();
    const checkerTexture = textureLoader.load("static/textures/checker.png");

    checkerTexture.wrapS = THREE.RepeatWrapping;
    checkerTexture.wrapT = THREE.RepeatWrapping;
    checkerTexture.magFilter = THREE.NearestFilter;
    checkerTexture.colorSpace = THREE.SRGBColorSpace;
    const repeats = size / 2;
    checkerTexture.repeat.set(repeats, repeats);

    this.geometry = new THREE.PlaneGeometry(size, size);
    this.material = new THREE.MeshBasicMaterial({
      map: checkerTexture,
      side: THREE.DoubleSide,
    });
    this.material.color.setRGB(1.5, 1.5, 1.5);

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(position);
    this.mesh.rotation.x = Math.PI * -0.5;
    this._position = this.mesh.position;

    this.update();
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  update() {
    // Update the min and max values
    this._minX = this._position.x - this._size / 2;
    this._maxX = this._position.x + this._size / 2;
    this._minY = this._position.y - this._size / 2;
    this._maxY = this._position.y + this._size / 2;
    this._minZ = this._position.z - this._size / 2;
    this._maxZ = this._position.z + this._size / 2;
  }
}
