import * as THREE from "three";
import { MyQuat } from "./MyQuat";

export class ForceManager {
  _target;
  _forces = {};
  _g = 9.81; // تسارع الجاذبية الأرضية
  _c_rr = 0.015; // معامل الاحتكاك الدوراني (Rolling Resistance Coefficient)
  // ملاحظة: بعد ربط الحساب بصيغة τ=Iα (حيث I=(2/5)mr²)، الناتج الفعلي = (5/2)·c_rr·N
  // يعني القيمة الفعلية المؤثرة أكبر 2.5 ضعف من c_rr نفسها، لهيك خفّضنا القيمة الافتراضية
  _mu = 0.3; // معامل الاحتكاك الانزلاقي (Sliding Friction Coefficient) - بيصير اكبر من الدوراني عادة

  // وضع التحريك (true = تمييل السطح، false = دفع مباشر)
  _mode = false;

  // فلاغ بيحدد إذا الكرة حالياً ملامسة لصندوق (يحدّده CollisionManager)
  _isSlidingOnBox = false;

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

  // معامل الاحتكاك الدوراني - قابل للتعديل من الواجهة
  get rollingFriction() {
    return this._c_rr;
  }

  set rollingFriction(value) {
    this._c_rr = value;
  }

  // معامل الاحتكاك الانزلاقي - قابل للتعديل من الواجهة
  get slidingFriction() {
    return this._mu;
  }

  set slidingFriction(value) {
    this._mu = value;
  }

  // بيسمح لـ CollisionManager يخبر ForceManager إنه في تماس مع صندوق
  set isSlidingOnBox(value) {
    this._isSlidingOnBox = value;
  }

  get isSlidingOnBox() {
    return this._isSlidingOnBox;
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

  // ==================================================
  // الجاذبية: تتحلل لمركبتين بالنسبة للسطح المائل
  // Fg = (m.g.sin(theta)) موازية للسطح - (m.g.cos(theta)) عمودية على السطح
  updateGravity(normal) {
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

  // ==================================================
  // قوة الاحتكاك الدوراني (Rolling Friction)
  // بتصير لما الكرة عم "تتدحرج" بشكل طبيعي على الأرض/المنحدر (بدون ملامسة صندوق)
  // الصيغة: F_rr = - c_rr * N * (اتجاه الحركة)
  calculateRollingFriction(ball, normalForceMagnitude) {
    const linVel = ball.linearVelocity;

    if (linVel.length() === 0) return new THREE.Vector3(0, 0, 0);

    const direction = linVel.clone().normalize();

    // ==================================================
    // تطبيق فعلي لمفهوم القصور الذاتي الدوراني (الصورة - البند 2.4):
    //
    // 1) قوة مقاومة الدحرجة عند نقطة التماس (Contact Point)
    const rollingResistanceForce = this._c_rr * normalForceMagnitude;

    // 2) هاي القوة بتولّد عزم دوران (Torque) حول مركز الكرة
    //    ذراع العزم = نصف القطر (نقطة التماس عَ سطح الكرة)
    //    τ = F × r
    const torque = rollingResistanceForce * ball.radius;

    // 3) التباطؤ الزاوي الحقيقي حسب عزم القصور الذاتي
    //    τ = I·α  =>  α = τ / I
    //    وI هون محسوبة فعلياً من I = (2/5)·m·r² (صيغة الكرة الصلبة بالصورة)
    const angularDeceleration = torque / ball.momentOfInertia;

    // 4) تحويل التباطؤ الزاوي لتباطؤ خطي مكافئ
    //    بشرط التدحرج بدون انزلاق (Rolling Without Slipping): v = ω·r  =>  a = α·r
    const linearDecelerationMagnitude = angularDeceleration * ball.radius;

    // القوة المكافئة المطبقة عَ مركز كتلة الكرة (F = m·a)
    const dragMagnitude = ball.mass * linearDecelerationMagnitude;

    return direction.negate().multiplyScalar(dragMagnitude);
  }

  // ==================================================
  // قوة الاحتكاك الانزلاقي (Sliding Friction) - مع الصناديق
  // بتصير لما الكرة بتلامس صندوق وعم تنزلق عليه/بجانبه
  // الصيغة: F_s = - mu * N * (اتجاه الحركة)
  // معامل الاحتكاك الانزلاقي أكبر من الدوراني لأنه الاحتكاك بين سطحين متلاصقين
  // بينتج مقاومة أكبر من تدحرج الكرة الحر
  calculateSlidingFriction(ball, normalForceMagnitude) {
    const linVel = ball.linearVelocity;

    if (linVel.length() === 0) return new THREE.Vector3(0, 0, 0);

    const direction = linVel.clone().normalize();

    return direction.negate().multiplyScalar(this._mu * normalForceMagnitude);
  }

  // ==================================================
  // قوة مقاومة الهواء (Air Resistance / Drag)
  // بتختلف حسب نوع الكرة (ورقية تتأثر كتير، صخرية بالكاد تتأثر)
  // الصيغة: F_drag = - dragCoefficient * |v|^2 * (اتجاه الحركة)
  // ملاحظة: تتناسب مع مربع السرعة، عكس الاحتكاك العادي المتناسب مع السرعة مباشرة
  // مضاعف عام لمقاومة الهواء (يطبق فوق معامل النوع الأساسي بـ Ball)
  _airResistanceMultiplier = 1;

  get airResistanceMultiplier() {
    return this._airResistanceMultiplier;
  }

  set airResistanceMultiplier(value) {
    this._airResistanceMultiplier = value;
  }

  calculateAirResistance(ball) {
    const linVel = ball.linearVelocity;
    const speed = linVel.length();

    if (speed === 0) return new THREE.Vector3(0, 0, 0);

    const direction = linVel.clone().normalize();
    const dragMagnitude =
      ball.dragCoefficient * this._airResistanceMultiplier * speed * speed;

    return direction.negate().multiplyScalar(dragMagnitude);
  }

  // ==================================================
  // تحديث الحركة الخطية (Linear Motion)
  // v = v0 + a*dt
  // x = x0 + v*dt
  updateLinearMotion(ball, totalForce, dt) {
    const acceleration = totalForce.clone().divideScalar(ball.mass);

    const linVel = ball.linearVelocity;
    linVel.add(acceleration.multiplyScalar(dt));

    ball.position.add(linVel.clone().multiplyScalar(dt));
  }

  // ==================================================
  // تحديث دوران الكرة بناء على حركتها الخطية (Rolling Rotation)
  // مرتبط بالحركة الخطية: omega = v / r
  updateBallRotation(ball, dt) {
    const linVel = ball.linearVelocity;

    if (linVel.length() <= 0.0001) return;

    // 1. محور الدوران الفيزيائي العالمي
    const axis = new THREE.Vector3()
      .crossVectors(linVel.clone().normalize(), ball.contactNormal)
      .normalize();

    // 2. السرعة الزاوية والزاوية اللحظية
    ball.angularVelocity = linVel.length() / ball.radius;
    const angleDelta = ball.angularVelocity * dt;

    // 3. كواتيرنيون يمثل خطوة الدوران لهاد الفريم فقط
    const rotationStep = new MyQuat().setFromAxisAngle(axis, -angleDelta);

    // 4. premultiply لتطبيق الدوران حول المحور العالمي (مش المحلي)
    ball.orientation.premultiply(rotationStep);
    ball.orientation.normalize();
    ball.updateMesh();
  }

  // ==================================================
  update(input, dt) {
    const totalForce = new THREE.Vector3(0, 0, 0);

    const ball = this._target;

    // ==================================================
    // قوة الدفع من اللاعب (وضع الدفع المباشر)
    const moveForce = 20;
    const inputForce = new THREE.Vector3();

    if (this.mode === true) {
      if (input.right) inputForce.x += moveForce;
      if (input.left) inputForce.x -= moveForce;
      if (input.up) inputForce.z -= moveForce;
      if (input.down) inputForce.z += moveForce;
    }

    totalForce.add(inputForce);

    // ==================================================
    // القوة العمودية (Normal Force) المستعملة بحساب الاحتكاك
    // N = m * g (تقريب بسيط بافتراض ارتكاز الكرة على السطح)
    const normalForceMagnitude = ball.mass * this._g;

    // ==================================================
    // اختيار نوع الاحتكاك المناسب حسب حالة التماس
    // لو الكرة ملامسة صندوق -> احتكاك انزلاقي
    // غير هيك (تدحرج حر على الأرض/المنحدر) -> احتكاك دوراني
    let frictionForce;

    if (this._isSlidingOnBox) {
      frictionForce = this.calculateSlidingFriction(ball, normalForceMagnitude);
    } else {
      frictionForce = this.calculateRollingFriction(ball, normalForceMagnitude);
    }

    totalForce.add(frictionForce);

    // ==================================================
    // قوة مقاومة الهواء (تعتمد على نوع الكرة الحالي)
    const airResistance = this.calculateAirResistance(ball);
    totalForce.add(airResistance);

    // ==================================================
    // القوى المضافة ديناميكياً (متل الجاذبية)
    const forcesKeys = Object.keys(this._forces);
    forcesKeys.forEach((key) => {
      totalForce.add(this._forces[key]);
    });

    // ==================================================
    // تحديث الحركة الخطية (موقع وسرعة الكرة)
    this.updateLinearMotion(ball, totalForce, dt);

    // ==================================================
    // تحديث دوران الكرة (Rolling Rotation) بناء على حركتها
    this.updateBallRotation(ball, dt);

    // إعادة تصفير فلاغ التماس مع الصندوق، لازم CollisionManager
    // يعيد تفعيله بكل فريم إذا لسا في تماس
    this._isSlidingOnBox = false;
  }
}
