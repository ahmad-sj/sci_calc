import * as THREE from "three";
import { loadTexture } from "~/src/helpers";

export class Box {
  size = 1;
  position;

  constructor(position, size, textureName) {
    this.position = position;
    this.size = size;

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
    this.mesh.position.copy(this.position);
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }
}
