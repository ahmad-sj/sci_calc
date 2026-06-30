import * as THREE from "three";
import { MyQuat } from "./MyQuat";

export class ForceManager {
  _target;
  _forces = {};
  _g = 9.81; // gravity acceleration
  _c_rr = 0.05; // rolling resistance coefficient
  _mu = 0.05; // sliding friction coefficient
  _normalForceMagnitude = 0; // قيمة القوة الطبيعية لاستخدامها في حساب الاحتكاك

  // moving mode (true by tilting, false by moving)
  _mode = false;

  set target(item) {
    this._target = item;
  }

  get target() {
    return this._target;
  }

  get g() {
    return this._g;
  }

  get mode() {
    return this._mode;
  }

  set mode(boolean) {
    this._mode = boolean;
  }

  add(force) {
    this._forces[Object.keys(force)[0]] = Object.values(force)[0];
  }

  getForce(forceName) {
    return this._forces[forceName];
  }

  remove(forceName) {
    delete this._forces[forceName];
  }

  updateGravity(normal) {
    // Fg = (m.g.sin(theta)).i^ - (m.g.cos(theta)).j^

    const target = this._target;

    const globalGravity = new THREE.Vector3(0, -this.g * target.mass, 0);

    if (normal.x === 0 && normal.y === 1 && normal.z === 0) {
      this.add({ gravity: globalGravity });
      return;
    }

    const Fg_down = normal.clone().multiplyScalar(globalGravity.dot(normal));

    const Fg_parallel = globalGravity.clone().sub(Fg_down);

    this.add({ gravity: Fg_parallel });
  }

  removeGravity() {
    this.remove("gravity");
  }

  /**
   * حساب مقدار القوة الطبيعية وتخزينه لاستخدامه في قوى الاحتكاك
   * @param {THREE.Vector3} surfaceNormal - ناظم السطح الحالي
   * @param {boolean} isGrounded - هل الكرة تلامس السطح؟
   */
  updateNormalForce(surfaceNormal, isGrounded) {
    // إذا كانت الكرة في الهواء، القوة الطبيعية تنعدم فوراً
    if (!isGrounded) {
      this._normalForceMagnitude = 0;
      return;
    }

    // جلب الكتلة والجاذبية من المتغيرات الأصلية للكلاس
    const m = this._target.mass;
    const g = this._g;

    // حساب زاوية الميلان باستخدام الضرب النقطي (Dot Product)
    const upVector = new THREE.Vector3(0, 1, 0);
    const cosTheta = surfaceNormal.dot(upVector);

    // القانون الفيزيائي: N = m * g * cos(theta)
    // نضمن أن القيمة لا تنزل تحت الصفر بأي حال
    this._normalForceMagnitude = Math.max(0, m * g * cosTheta);
  }

  // كرمال نستدعي قيمة القوة الطبيعية بسهولة بكود الاحتكاك
  get normalForceMagnitude() {
    return this._normalForceMagnitude;
  }

  update(input, dt) {
    const totalForce = new THREE.Vector3(0, 0, 0);

    const ball = this._target;
    const linVel = ball.linearVelocity;

    const moveForce = 20;
    const inputForce = new THREE.Vector3();

    if (this.mode === true) {
      if (input.right) inputForce.x += moveForce;
      if (input.left) inputForce.x -= moveForce;
      if (input.up) inputForce.z -= moveForce;
      if (input.down) inputForce.z += moveForce;
    }

    const normal = ball._mass * this._g;

    if (linVel.length() > 0) {
      const dir = linVel.clone().normalize();

      // ==================================================
      // Rolling Resistance
      const rollingResistance = dir
        .clone()
        .negate()
        .multiplyScalar(this._c_rr * normal);

      // ==================================================
      // Sliding friction
      const slidingFriction = dir
        .clone()
        .negate()
        .multiplyScalar(this._mu * normal);

      totalForce.add(rollingResistance);
      totalForce.add(slidingFriction);

      // ==================================================
      // Air friction
    }

    // ==================================================
    // Input force
    totalForce.add(inputForce);

    // ==================================================
    // dynamically added forces
    const forcesKeys = Object.keys(this._forces);

    forcesKeys.forEach((key) => {
      totalForce.add(this._forces[key]);
    });

    // ==================================================
    // Acceleration
    const acceleration = totalForce.clone().divideScalar(ball.mass);

    linVel.add(acceleration.multiplyScalar(dt));

    ball.position.add(linVel.clone().multiplyScalar(dt));

    // ==================================================
    // Ball rotation
    if (linVel.length() > 0.0001) {
      // 1. Calculate the physical world axis of rotation
      const axis = new THREE.Vector3()
        .crossVectors(linVel.clone().normalize(), ball.contactNormal)
        .normalize();

      // 2. Calculate angular speed and delta angle
      ball.angularVelocity = linVel.length() / ball.radius;
      const angleDelta = ball.angularVelocity * dt;

      // 3. Create a quaternion representing ONLY this frame's rotation step
      const rotationStep = new MyQuat().setFromAxisAngle(axis, -angleDelta);

      // 4. Pre-multiply to apply the rotation around the global world axis
      ball.orientation.premultiply(rotationStep);
      ball.orientation.normalize();
      ball.updateMesh();
    }
  }
}
