import * as THREE from "three";
import { updateAspect } from "./helpers";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
camera.position.set(2, 1, 5);

const canvas = document.querySelector("#c");
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

const control = new OrbitControls(camera, renderer.domElement);

// adding light
const color = 0xffffff;
const intensity = 3;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-1, 2, 4);
scene.add(light);

const geometry = new THREE.BoxGeometry(1, 1, 1);

function makeCubeInstance(geometry, color, x) {
  const material = new THREE.MeshPhongMaterial({ color });

  const cube = new THREE.Mesh(geometry, material);

  scene.add(cube);

  cube.position.x = x;

  return cube;
}

const cubes = [
  makeCubeInstance(geometry, 0x44aa88, 0),
  makeCubeInstance(geometry, 0x8844aa, -2),
  makeCubeInstance(geometry, 0xaa8844, 2),
];

// helpers
// this helper visualizes the 3D coordinate system in the scene. (display axes)
// 5 here represents the length of the axes.
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// The grid generated is by default 10 units by 10 units we changed it ot 15.
// 50 number of squares
const gridHelper = new THREE.GridHelper(15, 50);
scene.add(gridHelper);

function animate(time) {
  // converting from milliseconds to seconds
  time *= 0.001;

  updateAspect(renderer, camera);

  renderer.render(scene, camera);

  // rotating each cube from cubes array
  cubes.forEach((cube, index) => {
    const speed = 1 + index * 0.1;
    const rot = time * speed;
    cube.rotation.x = rot;
    cube.rotation.y = rot;
  });
}

renderer.setAnimationLoop(animate);
