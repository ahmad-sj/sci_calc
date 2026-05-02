import * as THREE from "three";

export class ForceManager {
  _ball;
  _forces = {};
  _g = 9.8;
  _c_rr = 0.05; //مقاومة التدحرج (الأهم)
  _mu = 0.05; // احتكاك انزلاقي (خفيف)

  constructor(ball) {
    this._ball = ball;
  }

  add(force) {
    this._forces.push(force);
  }

  apply(input, dt) {
    const totalForce = new THREE.Vector3(0, 0, 0);
    const linVel = this._ball.linearVelocity;

    const moveForce = 20;
    const inputForce = new THREE.Vector3();

    if (input.right) inputForce.x += moveForce;
    if (input.left) inputForce.x -= moveForce;
    if (input.up) inputForce.z -= moveForce;
    if (input.down) inputForce.z += moveForce;

    // -----------------------------------
    // 1. الجاذبية
    // -----------------------------------
    const weightForce = new THREE.Vector3(0, -1, 0).multiplyScalar(
      this._ball._mass * this._g,
    );

    totalForce.add(weightForce);

    const normal = this._ball.mass * this._g;

    if (linVel.length() > 0) {
      const dir = linVel.clone().normalize();

      // -----------------------------------
      // 2. Rolling Resistance
      // -----------------------------------
      const rollingResistance = dir
        .clone()
        .negate()
        .multiplyScalar(this._c_rr * normal);

      // -----------------------------------
      // 3. Sliding friction (اختياري خفيف)
      // -----------------------------------
      const slidingFriction = dir
        .clone()
        .negate()
        .multiplyScalar(this._mu * normal);

      totalForce.add(rollingResistance);
      totalForce.add(slidingFriction);
    }

    // -----------------------------------
    // 4. قوة التحكم
    // -----------------------------------
    totalForce.add(inputForce);

    // -----------------------------------
    // dynamically added forces
    const forcesKeys = Object.keys(this._forces);

    forcesKeys.forEach((key) => {
      totalForce.add(this._forces[key]);
    });

    // -----------------------------------
    // 5. التسارع
    // -----------------------------------
    const acceleration = totalForce.clone().divideScalar(this._ball.mass);

    const pos = this._ball._position;

    // const oldSpeed = linVel.length();

    linVel.add(acceleration.multiplyScalar(dt));

    // const newSpeed = linVel.length();

    pos.add(linVel.clone().multiplyScalar(dt));

    // -----------------------------------
    // الدوران
    // -----------------------------------
    if (linVel.length() > 0.0001) {
      const axis = new THREE.Vector3()
        .crossVectors(linVel.clone().normalize(), new THREE.Vector3(0, 1, 0))
        .normalize();

      this._ball.angularVelocity = linVel.length() / this._ball.radius;
      this._ball.rotate(axis, -this._ball._angularVelocity * dt);
    }
  }
}
