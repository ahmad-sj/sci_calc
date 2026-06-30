import * as THREE from "three";
import { getClosestPoint3d } from "../helpers";

export class CollisionManager {
  _items = {};
  _restitution = 0.6; // نسبة الطاقة المنقولة للصندوق عند الاصطدام
  _tangentialTransfer = 0.6; // نسبة المركبة الجانبية (الزاوية) المنقولة للصندوق
  _torqueMultiplier = 0.5; // معامل تخفيف عام لعزم الدوران (دوران بسيط مو مبالغ فيه)

  constructor(forceManager) {
    this._forceManager = forceManager;
  }

  get forceManager() {
    return this._forceManager;
  }

  get restitution() {
    return this._restitution;
  }

  set restitution(value) {
    this._restitution = value;
  }

  get tangentialTransfer() {
    return this._tangentialTransfer;
  }

  set tangentialTransfer(value) {
    this._tangentialTransfer = value;
  }

  get torqueMultiplier() {
    return this._torqueMultiplier;
  }

  set torqueMultiplier(value) {
    this._torqueMultiplier = value;
  }

  addItem(item) {
    this._items[Object.keys(item)[0]] = Object.values(item)[0];
  }

  checkAABBCollision(ball, item) {
    // 1. Find closest point on item to ball's center
    const closestPoint = getClosestPoint3d(item, ball);

    // 2. Calc distance between ball's center and closest point
    const distance = Math.sqrt(
      (closestPoint.x - ball.position.x) ** 2 +
        (closestPoint.y - ball.position.y) ** 2 +
        (closestPoint.z - ball.position.z) ** 2,
    );

    // 3. if distance is smaller than ball's radius, we have a collision
    return {
      isColliding: distance < ball.radius,
      closestPoint: closestPoint,
      distance: distance,
    };
  }

  checkBoxCollision(item, ball) {
    const collision = this.checkAABBCollision(ball, item);

    if (collision.isColliding) {
      // calc overlap between ball and item
      const overlap = ball.radius - collision.distance;

      // calc overlapping direction vector
      const direction = {
        x: (ball.position.x - collision.closestPoint.x) / collision.distance,
        y: (ball.position.y - collision.closestPoint.y) / collision.distance,
        z: (ball.position.z - collision.closestPoint.z) / collision.distance,
      };

      // correct ball's position to prevent penetration
      const ballNewX = ball.position.x + direction.x * overlap;
      const ballNewY = ball.position.y + direction.y * overlap;
      const ballNewZ = ball.position.z + direction.z * overlap;
      const ballNewPosition = new THREE.Vector3(ballNewX, ballNewY, ballNewZ);
      ball.position = ballNewPosition;

      // ==================================================
      // نقل الزخم (Momentum) للصندوق حسب زاوية الاصطدام
      // اتجاه التصادم (direction) هو متجه من أقرب نقطة بالصندوق باتجاه مركز الكرة
      // لو الكرة جاية مباشرة عالصندوق (ضربة مباشرة Face-on) -> دفع قوي
      // لو الكرة لامست الصندوق بزاوية حادة (ضربة جانبية Glancing) -> دفع أضعف
      const collisionNormal = new THREE.Vector3(
        direction.x,
        direction.y,
        direction.z,
      ).normalize();

      // عكس الاتجاه: نريد متجه اصطدام الكرة بالصندوق (من الكرة باتجاه الصندوق)
      const hitDirection = collisionNormal.clone().negate();

      // إسقاط متجه سرعة الكرة على اتجاه الاصطدام
      // هاد الإسقاط (dot product) هو يلي بيحدد "زاوية الاصطدام":
      // كلما كانت السرعة موازية لاتجاه الاصطدام (ضربة مباشرة)، كانت القيمة أكبر
      // وكلما كانت عمودية عليه (ضربة جانبية)، كانت القيمة أصغر أو حتى صفر
      const impactSpeed = ball.linearVelocity.dot(hitDirection);

      // ما ننقل زخم إلا لو الكرة فعلاً ماشية باتجاه الصندوق (impactSpeed > 0)
      if (impactSpeed > 0) {
        const restitution = this._restitution; // نسبة الطاقة المنقولة للصندوق (0 = بدون نقل، 1 = نقل كامل)

        // ==================================================
        // أ) المركبة العمودية (Normal Component)
        // هاي يلي بتحدد قوة "الدفع المباشر" حسب عمق الاصطدام بوجه الصندوق
        // ضربنا بـ impactForceMultiplier حتى يختلف تأثير الكرة الحجرية عن الورقية
        // حتى لو نفس السرعة والكتلة المتساوية تقريباً
        const impulseMagnitude =
          ball.mass * impactSpeed * restitution * ball.impactForceMultiplier;
        const impulseVector = hitDirection
          .clone()
          .multiplyScalar(impulseMagnitude);

        item.applyImpulse(impulseVector);

        // ==================================================
        // ب) المركبة الجانبية (Tangential Component) - هاي يلي بتعطي "زاوية" الحركة
        // منفصل سرعة الكرة لمركبتين: عمودية على وجه الصندوق (Normal) وجانبية معه (Tangential)
        // المركبة الجانبية هي يلي بتخلي الصندوق يتحرك بزاوية مناسبة لاتجاه قدوم الكرة
        // مش بس عمودي على الوجه يلي صدمته
        const normalVelocityComponent = hitDirection
          .clone()
          .multiplyScalar(impactSpeed);
        const tangentialVelocityComponent = ball.linearVelocity
          .clone()
          .sub(normalVelocityComponent);

        const tangentialImpulse = tangentialVelocityComponent
          .clone()
          .multiplyScalar(
            ball.mass * this._tangentialTransfer * ball.impactForceMultiplier,
          );

        item.applyImpulse(tangentialImpulse);

        // ==================================================
        // ج) عزم الدوران (Torque) - τ = r × F
        // r: متجه من مركز الصندوق لنقطة التماس (closestPoint)
        // F: مجموع القوة المطبقة (عمودية + جانبية)
        // كلما كانت نقطة التماس أبعد عن مركز الصندوق (ضربة بزاوية/طرف)
        // كلما كان عزم الدوران أكبر -> الصندوق بيفتل أكتر
        //
        // ملاحظة هامة: مركبة Y لجداء اتجاهي r × F هي:
        // (r × F)_y = r.z * F.x - r.x * F.z
        // (كانت معكوسة سابقاً وهيك كان الفتل بيصير بالاتجاه الغلط)
        const leverArm = new THREE.Vector3(
          collision.closestPoint.x - item.position.x,
          0,
          collision.closestPoint.z - item.position.z,
        );

        const totalImpulseXZ = impulseVector.clone().add(tangentialImpulse);
        totalImpulseXZ.y = 0;

        const torqueY =
          leverArm.z * totalImpulseXZ.x - leverArm.x * totalImpulseXZ.z;

        // معامل تخفيف عام حتى يصير الدوران بسيط ومناسب، مو مبالغ فيه
        item.applyTorque(torqueY * this._torqueMultiplier);

        // الكرة بتفقد جزء من سرعتها بنفس الاتجاه (قانون حفظ الزخم التقريبي)
        const ballVelocityLoss = hitDirection
          .clone()
          .multiplyScalar(impactSpeed * restitution);
        ball.linearVelocity.sub(ballVelocityLoss);
      }

      // ارتداد بسيط متبقي عالكرة (نفس السلوك القديم لمنع الانغراس بالصندوق)
      ball._linearVelocity.multiplyScalar(0.8);

      // ==================================================
      // تفعيل وضع الاحتكاك الانزلاقي بـ ForceManager
      // طالما الكرة بتماس مع صندوق، استخدم معامل الاحتكاك الانزلاقي
      // بدل الدوراني بهاد الفريم
      this.forceManager.isSlidingOnBox = true;
    }
  }

  // ==================================================
  // اصطدام صندوق مع صندوق
  // فحص تداخل (Overlap) على محوري X,Z (بما إنه الصناديق ماشية عالأرض بنفس الارتفاع تقريباً)
  checkBoxBoxCollision(boxA, boxB) {
    const overlapX =
      Math.min(boxA._maxX, boxB._maxX) - Math.max(boxA._minX, boxB._minX);
    const overlapZ =
      Math.min(boxA._maxZ, boxB._maxZ) - Math.max(boxA._minZ, boxB._minZ);

    // ما في تداخل -> ما في اصطدام
    if (overlapX <= 0 || overlapZ <= 0) return;

    // نختار محور الفصل الأقل تداخلاً (Minimum Translation Vector)
    // هاد المحور هو اتجاه "السطح" يلي صار فيه التصادم فعلياً
    let normal;
    let penetration;

    if (overlapX < overlapZ) {
      normal = new THREE.Vector3(
        boxA.position.x < boxB.position.x ? -1 : 1,
        0,
        0,
      );
      penetration = overlapX;
    } else {
      normal = new THREE.Vector3(
        0,
        0,
        boxA.position.z < boxB.position.z ? -1 : 1,
      );
      penetration = overlapZ;
    }

    // ==================================================
    // تصحيح المواقع لمنع تداخل الصناديق ببعض (توزيع التصحيح بالتساوي)
    const correction = normal.clone().multiplyScalar(penetration / 2);
    boxA.position = boxA.position.clone().sub(correction);
    boxB.position = boxB.position.clone().add(correction);
    boxA.update();
    boxB.update();

    // ==================================================
    // تبادل الزخم (Elastic Collision Response) باستخدام كتلتي الصندوقين
    // الصيغة القياسية: J = -(1+e) * (v_rel . normal) / (1/mA + 1/mB)
    const relativeVelocity = boxA.velocity.clone().sub(boxB.velocity);
    const velAlongNormal = relativeVelocity.dot(normal);

    // لو عم يبتعدوا عن بعض أصلاً، ما في داعي نطبق Impulse
    if (velAlongNormal > 0) return;

    const e = this._restitution;
    const invMassA = 1 / boxA.mass;
    const invMassB = 1 / boxB.mass;

    const impulseMagnitude = (-(1 + e) * velAlongNormal) / (invMassA + invMassB);
    const impulse = normal.clone().multiplyScalar(impulseMagnitude);

    boxA.velocity.add(impulse.clone().multiplyScalar(invMassA));
    boxB.velocity.sub(impulse.clone().multiplyScalar(invMassB));

    // ==================================================
    // عزم دوران بسيط (Torque) لو التصادم صار بزاوية (مو وجه بوجه بالظبط)
    // نقيس مدى "الإزاحة الجانبية" بين مركزي الصندوقين عَ المحور العمودي على الـ normal
    // كل ما زادت الإزاحة الجانبية، كل ما كان عزم الدوران أكبر
    const tangentAxis =
      overlapX < overlapZ
        ? new THREE.Vector3(0, 0, 1) // التصادم عَ محور X -> الإزاحة الجانبية عَ Z
        : new THREE.Vector3(1, 0, 0); // التصادم عَ محور Z -> الإزاحة الجانبية عَ X

    const lateralOffset = boxB.position.clone().sub(boxA.position).dot(tangentAxis);

    // عتبة بسيطة: لو الإزاحة الجانبية صغيرة جداً (تصادم وجه بوجه تماماً) ما منولد عزم
    const offsetThreshold = 0.05;

    if (Math.abs(lateralOffset) > offsetThreshold) {
      const torqueMagnitude =
        impulseMagnitude * lateralOffset * 0.5 * this._torqueMultiplier;

      boxA.applyTorque(-torqueMagnitude);
      boxB.applyTorque(torqueMagnitude);
    }
  }

  checkSlopeCollision() {
    const ball = this._items["ball"];
    const slope = this._items["slope"];

    // Get theoretical ground height at ball's center (X,Z)
    const slopeY = slope.getHeightAt(ball.position.x, ball.position.z);

    // Distance from ball center to slope surface
    const distanceToSurface = ball.position.y - (slopeY + ball.radius);

    // check if ball is within slope bounds (X,Z)
    if (slope.contains(ball)) {
      // if ball is above slope surface
      if (distanceToSurface >= 0) {
        this.forceManager.updateGravity(new THREE.Vector3(0, 1, 0));
        return true;
      }

      // if ball is below slope surface
      if (slopeY > ball.position.y + ball.radius) {
        this.forceManager.removeGravity();
        return false;
      }

      // if ball is penetrating slope surface
      if (distanceToSurface < 0) {
        // if slope is flat
        if (slope.normal.x == 0 && slope.normal.y == 1 && slope.normal.z == 0) {
          this.forceManager.removeGravity();
          this.correctPositionOnSlope(ball, slope, distanceToSurface);
          return true;
        }

        // slope is not flat
        ball.contactNormal = slope.normal;
        this.forceManager.updateGravity(slope.normal);
        this.correctPositionOnSlope(ball, slope, distanceToSurface);
        return true;
      }
    }

    return false;
  }

  correctPositionOnSlope(ball, slope, penetrationDepth) {
    const correction = slope.normal.clone().multiplyScalar(-penetrationDepth);
    ball.position.add(correction);
  }

  update() {
    const ball = this._items["ball"];
    const ground = this._items["ground"];
    const forceManager = this._forceManager;

    // Check collision with boxes
    for (const item of Object.values(this._items)) {
      if (item.constructor.name === "Box") {
        this.checkBoxCollision(item, ball);
      }
    }

    // Check collision between boxes themselves
    const boxes = Object.values(this._items).filter(
      (item) => item.constructor.name === "Box",
    );

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        this.checkBoxBoxCollision(boxes[i], boxes[j]);
      }
    }

    const onSlope = this.checkSlopeCollision();

    const targetGroundY = ground._position.y + ball.radius;

    if (!onSlope) {
      this.forceManager.updateGravity(new THREE.Vector3(0, 1, 0));
    }

    if (ball.position.y < targetGroundY) {
      forceManager.removeGravity();
      ball.position.y = targetGroundY;
      ball.contactNormal = new THREE.Vector3(0, 1, 0);
    }
  }
}





/*import * as THREE from "three";
import { getClosestPoint3d } from "../helpers";

export class CollisionManager {
  _items = {};

  constructor(forceManager) {
    this._forceManager = forceManager;
  }

  get forceManager() {
    return this._forceManager;
  }

  addItem(item) {
    this._items[Object.keys(item)[0]] = Object.values(item)[0];
  }

  checkAABBCollision(ball, item) {
    // 1. Find closest point on item to ball's center
    const closestPoint = getClosestPoint3d(item, ball);

    // 2. Calc distance between ball's center and closest point
    const distance = Math.sqrt(
      (closestPoint.x - ball.position.x) ** 2 +
        (closestPoint.y - ball.position.y) ** 2 +
        (closestPoint.z - ball.position.z) ** 2,
    );

    // 3. if distance is smaller than ball's radius, we have a collision
    return {
      isColliding: distance < ball.radius,
      closestPoint: closestPoint,
      distance: distance,
    };
  }

  checkBoxCollision(item, ball) {
    const collision = this.checkAABBCollision(ball, item);

    if (collision.isColliding) {
      // calc overlap between ball and item
      const overlap = ball.radius - collision.distance;

      // calc overlapping direction vector
      const direction = {
        x: (ball.position.x - collision.closestPoint.x) / collision.distance,
        y: (ball.position.y - collision.closestPoint.y) / collision.distance,
        z: (ball.position.z - collision.closestPoint.z) / collision.distance,
      };

      // correct ball's position to prevent penetration
      const ballNewX = ball.position.x + direction.x * overlap;
      const ballNewY = ball.position.y + direction.y * overlap;
      const ballNewZ = ball.position.z + direction.z * overlap;
      const ballNewPosition = new THREE.Vector3(ballNewX, ballNewY, ballNewZ);
      ball.position = ballNewPosition;

      // mocking collision response
      ball._linearVelocity.negate().multiplyScalar(0.5);
    }
  }

  checkSlopeCollision() {
    const ball = this._items["ball"];
    const slope = this._items["slope"];

    // Get theoretical ground height at ball's center (X,Z)
    const slopeY = slope.getHeightAt(ball.position.x, ball.position.z);

    // Distance from ball center to slope surface
    const distanceToSurface = ball.position.y - (slopeY + ball.radius);

    // check if ball is within slope bounds (X,Z)
    if (slope.contains(ball)) {
      // if ball is above slope surface
      if (distanceToSurface >= 0) {
        this.forceManager.updateGravity(new THREE.Vector3(0, 1, 0));
        return true;
      }

      // if ball is below slope surface
      if (slopeY > ball.position.y + ball.radius) {
        this.forceManager.removeGravity();
        return false;
      }

      // if ball is penetrating slope surface
      if (distanceToSurface < 0) {
        // if slope is flat
        if (slope.normal.x == 0 && slope.normal.y == 1 && slope.normal.z == 0) {
          this.forceManager.removeGravity();
          this.correctPositionOnSlope(ball, slope, distanceToSurface);
          return true;
        }

        // slope is not flat
        ball.contactNormal = slope.normal;
        this.forceManager.updateGravity(slope.normal);
        this.correctPositionOnSlope(ball, slope, distanceToSurface);
        return true;
      }
    }

    return false;
  }

  correctPositionOnSlope(ball, slope, penetrationDepth) {
    const correction = slope.normal.clone().multiplyScalar(-penetrationDepth);
    ball.position.add(correction);
  }

  update() {
    const ball = this._items["ball"];
    const ground = this._items["ground"];
    const forceManager = this._forceManager;

    // Check collision with boxes
    for (const item of Object.values(this._items)) {
      if (item.constructor.name === "Box") {
        this.checkBoxCollision(item, ball);
      }
    }

    const onSlope = this.checkSlopeCollision();

    const targetGroundY = ground._position.y + ball.radius;

    if (!onSlope) {
      this.forceManager.updateGravity(new THREE.Vector3(0, 1, 0));
    }

    if (ball.position.y < targetGroundY) {
      forceManager.removeGravity();
      ball.position.y = targetGroundY;
      ball.contactNormal = new THREE.Vector3(0, 1, 0);
    }
  }
}
*/