import * as THREE from "three";
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

    if (!collision.isColliding) return;

    // ── الخطوة 1: حساب ناظم التصادم n̂ ────────────────────────
    // n̂ = d / |d|  حيث d = C_ball - P_closest
    let normal;
    if (collision.distance < 0.0001) {
      // حالة خاصة: مركز الكرة داخل الصندوق تقريباً
      normal = new THREE.Vector3(0, 1, 0);
    } else {
      normal = new THREE.Vector3()
        .subVectors(ball.position, collision.closestPoint)
        .normalize();
    }

    // ── الخطوة 2: تصحيح الموضع (Position Correction) ──────────
    // depth = r - |d|
    // C'_ball = C_ball + n̂ * depth
    const penetrationDepth = ball.radius - collision.distance;
    ball.position = ball.position
      .clone()
      .addScaledVector(normal, penetrationDepth);

    // ── الخطوة 3: حساب السرعة النسبية عند نقطة التماس ──────────
    // r_A = -r * n̂  (من مركز الكرة إلى نقطة التماس)
    const rA = normal.clone().multiplyScalar(-ball.radius);

    // v_rel = (v_B + ω_B × r_A) - v_C
    // ω_B × r_A: السرعة المماسية الناتجة عن دوران الكرة
    const omegaVec = new THREE.Vector3().crossVectors(
      new THREE.Vector3(0, ball.angularVelocity, 0),
      rA,
    );
    const vRel = new THREE.Vector3()
      .addVectors(ball.linearVelocity, omegaVec)
      .sub(item.velocity);

    // v_rel_n = v_rel · n̂ (إسقاط على محور العمود)
    const vRelN = vRel.dot(normal);

    // إذا الجسمان يبتعدان → لا تصادم فعلي
    if (vRelN > 0) return;

    // ── الخطوة 4: حساب مقدار الدفعة Jn ────────────────────────
    // معامل الارتداد حسب نوع الكرة
    const e = ball.restitutionCoefficient;

    // I_B = 2/5 * m * r²  (من getter بـ ball.js)
    const I_B = ball.inertia;

    // |r_A × n̂|²
    const rAxN = new THREE.Vector3().crossVectors(rA, normal);
    const rAxNSq = rAxN.lengthSq();

    // Jn = -(1+e) * v_rel_n / (1/m_B + 1/m_C + |r_A×n̂|²/I_B)
    const denominator = 1 / ball.mass + 1 / item.mass + rAxNSq / I_B;
    const Jn = (-(1 + e) * vRelN) / denominator;

    // ── حساب الطاقة قبل التصادم ─────────────────────────────────
    // KE_before = ½·m_ball·v² + ½·I·ω² (الصندوق ساكن قبل التصادم)
    const KE_before =
      0.5 * ball.mass * ball.linearVelocity.lengthSq() +
      0.5 * ball.inertia * ball.angularVelocity * ball.angularVelocity;

    // ── الخطوة 5: تحديث السرعات ─────────────────────────────────
    // v'_B = v_B + (Jn/m_B) * n̂  (الكرة)
    ball.linearVelocity.addScaledVector(normal, Jn / ball.mass);

    // v'_C = v_C - (Jn/m_C) * n̂  (الصندوق - إشارة سالبة: نيوتن الثالث)
    item.velocity.addScaledVector(normal, -Jn / item.mass);

    // الخطوة 6: عزم الدوران على الصندوق
    // نقطة التصادم بالنسبة لمركز الصندوق
    const rBox = new THREE.Vector3().subVectors(
      collision.closestPoint,
      item.position,
    );
    // فقط إذا في ذراع دوران حقيقي (ضربة على الزاوية مش الوجه)
    if (Math.abs(Jn) > 0.5 && rBox.lengthSq() > 0.01) {
      // عزم الدوران = r × (Jn * n̂)
      const impulseVec = normal.clone().multiplyScalar(Jn);
      const torque = new THREE.Vector3().crossVectors(rBox, impulseVec);

      // I_box = 1/6 * m * size²  (للمكعب)
      const I_box = (1 / 6) * item.mass * item.size * item.size * 2;

      // تحديث السرعة الزاوية للصندوق
      item.angularVelocity.addScaledVector(torque, -1 / I_box);
    }
    // ── حساب الطاقة بعد التصادم والطاقة المفقودة ────────────────
    // KE_after = ½·m_ball·v'² + ½·I·ω'² + ½·m_box·v_box'²
    const KE_after =
      0.5 * ball.mass * ball.linearVelocity.lengthSq() +
      0.5 * ball.inertia * ball.angularVelocity * ball.angularVelocity +
      0.5 * item.mass * item.velocity.lengthSq();

    // ΔKE = KE_before - KE_after (دايماً موجب — طاقة فقدت)
    item.lastEnergyLoss = Math.max(0, KE_before - KE_after);
  }

  checkSlopeCollision() {
    const ball = this._items["ball"];
    const slope = this._items["slope"];
    const forceManager = this._forceManager;

    // Get theoretical ground height at ball's center (X,Z)
    const slopeY = slope.getHeightAt(ball.position.x, ball.position.z);

    // Distance from ball center to slope surface
    const distanceToSurface = ball.position.y - (slopeY + ball.radius);

    // check if ball is within slope bounds (X,Z)
    if (slope.contains(ball)) {
      // if ball is above slope surface
      if (distanceToSurface >= 0) {
        forceManager.updateGravity(new THREE.Vector3(0, 1, 0));
        return false;
      }

      // if ball is below slope surface
      if (slopeY > ball.position.y + ball.radius) {
        return false;
      }

      // if ball penetrated slope surface
      if (distanceToSurface < 0) {
        // slope is flat
        if (slope.normal.x == 0 && slope.normal.y == 1 && slope.normal.z == 0) {
          forceManager.removeGravity();
          this.correctPositionOnSlope(ball, slope, distanceToSurface);
          ball.contactNormal = new THREE.Vector3(0, 1, 0);
          forceManager._mu = 0.3;
          return true;
        }

        // slope is not flat
        ball.contactNormal = slope.normal;
        forceManager._mu = 0.1;
        forceManager.updateGravity(slope.normal);
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

  update(dt) {
    const ball = this._items["ball"];
    const ground = this._items["ground"];
    const forceManager = this._forceManager;

    // Check collision with boxes
    for (const item of Object.values(this._items)) {
      if (item.constructor.name === "Box") {
        this.checkBoxCollision(item, ball);
      }
    }

    for (const item of Object.values(this._items)) {
      if (item.constructor.name === "Box") {
        item.updateMovement(dt);
      }
    }

    // ===============================================
    // check collision with slope
    const isOnSlope = this.checkSlopeCollision();

    if (!isOnSlope) {
      forceManager.updateGravity(new THREE.Vector3(0, 1, 0));
    }

    // ===============================================
    // Check collision with ground
    let isOnGround = false;
    const targetGroundY = ground._position.y + ball.radius;

    // if ball penetrated the ground (also means ball on ground)
    if (ball.position.y < targetGroundY) {
      forceManager.removeGravity();
      ball.position.y = targetGroundY;
      ball.contactNormal = new THREE.Vector3(0, 1, 0);
      isOnGround = true;
    }

    ball.onSurface = isOnGround || isOnSlope;
  }
}
