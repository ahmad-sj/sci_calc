import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

export class Ball {
  radius = 1;
  _mass = 1;
  position = new THREE.Vector3(0, 0, 0);
  linearVelocity = new THREE.Vector3(0, 0, 0);
  angularVelocity = 0;
  _groundY = 0;
  onGround = this.position.y <= this._groundY + this.radius + 0.001;

  sphereWidthDivisions = 32;
  sphereHeightDivisions = 16;

  constructor() {
    this.geometry = new THREE.SphereGeometry(
      this.radius,
      this.sphereWidthDivisions,
      this.sphereHeightDivisions,
    );

    this.texture = textureLoader.load("static/textures/stone.jpg");
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.material = new THREE.MeshPhongMaterial({ map: this.texture });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(this.position);
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  get groundY() {
    return this._groundY;
  }

  set groundY(number) {
    this._groundY = number;
    this.mesh.position.y = number + this.radius;
  }

  get mass() {
    return this._mass;
  }

  set mass(number) {
    this._mass = number;
    this.radius = this._mass;
    this.mesh.scale.x = this.mesh.scale.y = this.mesh.scale.z = this.radius;

    if (this.position.y > this._groundY + this.radius) {
      this.position.y = this._groundY + this.radius;
      if (this.linearVelocity.y < 0) this.linearVelocity.y = 0;
    }
  }

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

    const pos = this.mesh.position;
    const radius = this.radius;

    const onGround = pos.y <= this._groundY + radius + 0.001;

    const totalForce = new THREE.Vector3();

    // -----------------------------------
    // 1. الجاذبية
    // -----------------------------------
    // if (!onGround) {
    //   totalForce.y -= g * this.mass;
    // }

    // if (onGround) {
    const normal = this.mass * g;
    const speed1 = this.linearVelocity.length();

    if (speed1 > 0) {
      const dir = this.linearVelocity.clone().normalize();

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
    // } else {
    //   totalForce.add(inputForce);
    // }

    // -----------------------------------
    // 5. التسارع
    // -----------------------------------
    const acceleration = totalForce.clone().divideScalar(this.mass);

    // -----------------------------------
    // 6. تحديث السرعة
    // -----------------------------------
    const oldSpeed = this.linearVelocity.length();
    this.linearVelocity.add(acceleration.multiplyScalar(dt));

    // -----------------------------------
    // 7. منع overshoot فقط (بدون kill)
    // -----------------------------------
    const newSpeed = this.linearVelocity.length();

    if (onGround && inputForce.length() === 0) {
      if (newSpeed > oldSpeed) {
        this.linearVelocity.set(0, 0, 0);
      }
    }

    // -----------------------------------
    // 8. تحديث الموقع
    // -----------------------------------
    pos.add(this.linearVelocity.clone().multiplyScalar(dt));

    // -----------------------------------
    // 9. تصادم الأرض
    // -----------------------------------
    if (pos.y < this._groundY + radius) {
      pos.y = this._groundY + radius;
      if (this.linearVelocity.y < 0) this.linearVelocity.y = 0;
    }

    this.position = pos;

    // -----------------------------------
    // 10. الدوران
    // -----------------------------------
    const speed = this.linearVelocity.length();

    if (speed > 0.0001) {
      const axis = new THREE.Vector3()
        .crossVectors(
          this.linearVelocity.clone().normalize(),
          new THREE.Vector3(0, 1, 0),
        )
        .normalize();

      this.angularVelocity = speed / radius;
      this.mesh.rotateOnAxis(axis, -this.angularVelocity * dt);
    }
  }
}
