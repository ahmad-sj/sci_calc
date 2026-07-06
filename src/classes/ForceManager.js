import * as THREE from "three";
import { MyQuat } from "./MyQuat";

export class ForceManager {
  _target;

  // applied forces list
  _forces = {};

  // gravity acceleration
  _g = 9.81;

  // rolling resistance coefficient
  _c_rr = 0.003;

  // sliding friction coefficient (default 0.3 for flat surface, 0.1 for slope)
  // updated from CollisionManager when ball is in contact with slope or ground
  _mu = 0.3;

  // قيمة القوة الطبيعية لاستخدامها في حساب الاحتكاك
  _normalForceMagnitude = 0;

  // كثافة الهواء kg/m³
  _rho = 1.225;

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

  updateGravity() {
    const m = this._target.mass;
    const g = this._g;
    const surfaceNormal = this._target.contactNormal;
    const worldUp = new THREE.Vector3(0, 1, 0);

    // 1. Check if the surface is flat
    // using dot product, if normal points straight up, dot product is 1
    const isFlat = surfaceNormal.dot(worldUp) > 0.999;

    if (isFlat) {
      // Fg_total = -m.g.j^
      const Fg_total = new THREE.Vector3(0, -m * g, 0);
      this.add({ gravity: Fg_total });
      return;
    }

    // Surface is not flat, calculate Fg_parallel
    // Fg_parallel = -m.g.sin(theta).i^

    // 2. Find a vector pointing sideways along the slope (perpendicular to normal and up)
    // This vector's length naturally contains the sin(theta) scalar
    const slopeSideways = new THREE.Vector3().crossVectors(
      surfaceNormal,
      worldUp,
    );

    // 3. Cross the normal back with the sideways vector to get the vector pointing straight DOWNHILL
    // This gives us the direction (i^), pre-scaled by sin(theta)
    const Fg_parallel = new THREE.Vector3().crossVectors(
      surfaceNormal,
      slopeSideways,
    );

    // 4. Scale by mass and gravity constants
    Fg_parallel.multiplyScalar(m * g);

    // 5. Pass the downhill sliding force to the physics system
    this.add({ gravity: Fg_parallel });
  }

  // القانون الفيزيائي: N = m * g * cos(theta)
  updateNormalForce() {
    const ball = this._target;
    const surfaceNormal = ball.contactNormal;

    // إذا كانت الكرة في الهواء، القوة الطبيعية تنعدم فوراً
    if (!ball.onSurface) {
      this._normalForceMagnitude = 0;
      this.remove("normalForce");
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

    // normal force Vector = normalForceMagnitude * surfaceNormal
    this.add({
      normalForce: new THREE.Vector3()
        .copy(surfaceNormal)
        .multiplyScalar(this._normalForceMagnitude),
    });
  }

  /**
   * 1.3 حساب وتطبيق قوة الاحتكاك الانزلاقي (Sliding Friction)
   * الصيغة الشعاعية: F_k = -mu_k * N * v_hat
   */
  updateSlidingFriction() {
    // جلب سرعة الكرة الخطية الحالية
    const velocity = this._target.linearVelocity;

    // إذا كانت القوة الطبيعية صفر (بالهواء) أو الكرة ساكنة، لا يوجد احتكاك
    if (this._normalForceMagnitude === 0 || velocity.lengthSq() < 0.0001) {
      this.remove("slidingFriction");
      return;
    }

    // حساب متجه وحدة اتجاه الحركة: v_hat = v / |v|
    const vHat = velocity.clone().normalize();

    // اختيار معامل الاحتكاك حسب نوع السطح
    const mu = this._mu;

    // تطبيق الصيغة الشعاعية: F_k = -mu_k * N * v_hat
    const frictionForce = vHat.multiplyScalar(-mu * this._normalForceMagnitude);

    // إضافة القوة لقائمة القوى
    this.add({ slidingFriction: frictionForce });
  }

  /**
   * 2.3 حساب وتطبيق الاحتكاك الدوراني (Rolling Friction) والعزم المقاوم
   * الصيغة: tau_f = -mu_r * N * R * omega_hat
   */
  updateRollingFriction() {
    // جلب السرعة الزاوية (رقم scalar بالكود الأصلي)
    const angularSpeed = this._target.angularVelocity;

    // إذا كانت القوة الطبيعية صفر أو الكرة لا تدور، لا يوجد احتكاك دوراني
    if (this._normalForceMagnitude === 0 || Math.abs(angularSpeed) < 0.0001) {
      this.remove("rollingFriction");
      return;
    }

    // جلب نصف قطر الكرة
    const r = this._target.radius;

    // 1. حساب مقدار العزم المقاوم: |tau| = mu_r * N * R
    const torqueMagnitude = this._c_rr * this._normalForceMagnitude * r;

    // 2. حساب محور الدوران (omega_hat) من السرعة الخطية وناظم السطح

    const linVel = this._target.linearVelocity;
    const omegaHat = new THREE.Vector3()
      .crossVectors(linVel.clone().normalize(), this._target.contactNormal)
      .normalize();

    // 3. العزم المقاوم: tau_f = -torqueMagnitude * omega_hat
    const resistiveTorque = omegaHat.multiplyScalar(-torqueMagnitude);

    // 4. تحويل العزم إلى قوة خطية مكافئة وإضافتها للقوى

    const equivalentForce = resistiveTorque.clone().divideScalar(r);
    this.add({ rollingFriction: equivalentForce });
  }

  /**
   * 3.7 حساب وتطبيق قوة مقاومة الهواء (Air Resistance / Drag Force)
   * الصيغة الشعاعية: F_D = -0.5 * rho * C_d * A * |v|² * v_hat
   * تعمل بكل الحالات (على الأرض أو بالهواء) لأنها تعتمد على السرعة فقط
   */
  updateAirResistance() {
    // جلب سرعة الكرة الخطية الحالية
    const velocity = this._target.linearVelocity;
    const speedSq = velocity.lengthSq();

    // إذا كانت الكرة ساكنة تماماً، لا توجد مقاومة هواء
    if (speedSq < 0.0001) {
      this.remove("airResistance");
      return;
    }

    // جلب نصف قطر الكرة الفعلي
    const r = this._target.radius;

    // مساحة المقطع العرضي: A = π * r²
    // نستخدم نصف قطر صغير (0.3) بدل القيمة الكاملة لأن أبعاد اللعبة
    // أكبر من الواقع الفيزيائي — هاد يخلي مقاومة الهواء محسوسة بدون ما توقف الكرة
    const r_effective = r * 0.1;
    const A = Math.PI * r_effective * r_effective;

    // معامل السحب حسب نوع الكرة (من جدول الدراسة الفيزيائية)
    const C_d = this._target.dragCoefficient;

    // مقدار قوة مقاومة الهواء: F_D = 0.5 * ρ * C_d * A * v²
    const dragMagnitude = 0.5 * this._rho * C_d * A * speedSq;

    // متجه وحدة الاتجاه: v_hat = v / |v|
    const vHat = velocity.clone().normalize();

    // الصيغة الشعاعية: F_D = -dragMagnitude * v_hat (عكس اتجاه الحركة)
    const dragForce = vHat.multiplyScalar(-dragMagnitude);

    // إضافة القوة لقائمة القوى
    this.add({ airResistance: dragForce });
  }

  /**
   * 5. قوة دفع اللاعب (Player Impulse)
   * الصيغة: J = F·Δt → v_final = v_initial + J/m
   * اللاعب لا يغير موقع الكرة مباشرة، بل يغير سرعتها عبر دفعة فيزيائية
   * @param {Object} input - أزرار التحكم المضغوطة
   * @param {number} dt - الزمن بين الفريمين
   */
  applyPlayerImpulse(input, dt) {
    // لا يعمل إلا بمود تحريك الكرة مباشرة (mode = true)
    if (this._mode === false) return;

    const ball = this._target;

    // مقدار القوة المؤثرة خلال فترة الضغط
    const F_magnitude = 20;

    // متجه القوة حسب الزر المضغوط
    const F_input = new THREE.Vector3();
    if (input.right) F_input.x += F_magnitude;
    if (input.left) F_input.x -= F_magnitude;
    if (input.up) F_input.z -= F_magnitude;
    if (input.down) F_input.z += F_magnitude;

    // إذا ما في زر مضغوط، لا يوجد دفع
    if (F_input.lengthSq() === 0) return;

    // حساب الدفعة: J = F · Δt
    const J = F_input.clone().multiplyScalar(dt);

    // تطبيق الدفعة على السرعة: v_final = v_initial + J/m
    ball.linearVelocity.addScaledVector(J, 1 / ball.mass);
  }

  update(input, dt) {
    const totalForce = new THREE.Vector3(0, 0, 0);

    const ball = this._target;
    const linVel = ball.linearVelocity;

    // ==================================================
    // Input force (Impulse) - تطبيق دفعة اللاعب مباشرة على السرعة
    // J = F·Δt → v_final = v_initial + J/m
    this.applyPlayerImpulse(input, dt);

    // ==================================================
    // Gravity - تطبيق القوة الجاذبية
    this.updateGravity();

    // ==================================================
    // Normal Force - حساب القوة الطبيعية لتطبيقها على الاحتكاك
    this.updateNormalForce();

    // ==================================================
    // Rolling Friction - الاحتكاك الدوراني
    this.updateRollingFriction();

    // ==================================================
    // Sliding Friction - الاحتكاك الانزلاقي
    this.updateSlidingFriction();

    // ==================================================
    // Air Resistance (Drag Force) - مقاومة الهواء
    this.updateAirResistance();

    // ==================================================
    // dynamically added forces (gravity + friction + airResistance)
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
      // τ = F_friction × r  →  α = τ / I  →  ω = v/r + α·dt
      const frictionForce = this._forces["slidingFriction"]
        ? this._forces["slidingFriction"].clone()
        : new THREE.Vector3(0, 0, 0);
      const torque = frictionForce.length() * ball.radius;
      const alpha = torque / ball.inertia;
      ball.angularVelocity = linVel.length() / ball.radius + alpha * dt;
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
