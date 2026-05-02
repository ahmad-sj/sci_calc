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

    if (this._position.y > this._groundY + this._radius) {
      this._position.y = this._groundY + this._radius;
      if (this._linearVelocity.y < 0) this._linearVelocity.y = 0;
    }
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
    return this._position.y <= this._groundY + this._radius + 0.001;
  }

  // ==================================================
  move(input, dt) {
    const g = 9.8;

    const mu = 0.05; // احتكاك انزلاقي (خفيف)
    const c_rr = 0.02; //مقاومة التدحرج (الأهم)

    const moveForce = 20;
    const inputForce = new THREE.Vector3();

    if (input.right) inputForce.x += moveForce;
    if (input.left) inputForce.x -= moveForce;
    if (input.up) inputForce.z -= moveForce;
    if (input.down) inputForce.z += moveForce;

    const pos = this._position;
    const radius = this._radius;

    const totalForce = new THREE.Vector3();

    // -----------------------------------
    // 1. الجاذبية
    // -----------------------------------

    const normal = this.mass * g;

    if (this._linearVelocity.length() > 0) {
      const dir = this._linearVelocity.clone().normalize();

      // -----------------------------------
      // 2. Rolling Resistance
      // -----------------------------------
      const rollingResistance = dir
        .clone()
        .negate()
        .multiplyScalar(c_rr * normal);

      // -----------------------------------
      // 3. Sliding friction (اختياري خفيف)
      // -----------------------------------
      const slidingFriction = dir
        .clone()
        .negate()
        .multiplyScalar(mu * normal);

      totalForce.add(rollingResistance);
      totalForce.add(slidingFriction);
    }

    // -----------------------------------
    // 4. قوة التحكم
    // -----------------------------------
    totalForce.add(inputForce);

    // -----------------------------------
    // 5. التسارع
    // -----------------------------------
    const acceleration = totalForce.clone().divideScalar(this.mass);

    // -----------------------------------
    // 6. تحديث السرعة
    // -----------------------------------
    const oldSpeed = this._linearVelocity.length();
    this._linearVelocity.add(acceleration.multiplyScalar(dt));

    // -----------------------------------
    // 7. منع overshoot فقط (بدون kill)
    // -----------------------------------
    const newSpeed = this._linearVelocity.length();

    if (this.isOnGround && inputForce.length() === 0) {
      if (newSpeed > oldSpeed) {
        this._linearVelocity.set(0, 0, 0);
      }
    }

    // -----------------------------------
    // 8. تحديث الموقع
    // -----------------------------------
    pos.add(this._linearVelocity.clone().multiplyScalar(dt));

    // -----------------------------------
    // 9. تصادم الأرض
    // -----------------------------------
    if (pos.y < this._groundY + radius) {
      pos.y = this._groundY + radius;
      if (this._linearVelocity.y < 0) this._linearVelocity.y = 0;
    }

    // -----------------------------------
    // 10. الدوران
    // -----------------------------------
    if (this._linearVelocity.length() > 0.0001) {
      const axis = new THREE.Vector3()
        .crossVectors(
          this._linearVelocity.clone().normalize(),
          new THREE.Vector3(0, 1, 0),
        )
        .normalize();

      this._angularVelocity = this._linearVelocity.length() / this._radius;
      this.mesh.rotateOnAxis(axis, -this._angularVelocity * dt);
    }
  }
}
