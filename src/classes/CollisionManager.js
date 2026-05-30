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
    // 1. إيجاد أقرب نقطة على الصندوق لمركز الكرة
    const closestPoint = getClosestPoint3d(item, ball);

    // 2. حساب المسافة بين مركز الكرة وهذه النقطة
    const distance = Math.sqrt(
      (closestPoint.x - ball.position.x) ** 2 +
        (closestPoint.y - ball.position.y) ** 2 +
        (closestPoint.z - ball.position.z) ** 2,
    );

    // 3. إذا كانت المسافة أقل من نصف القطر، فهناك تصادم
    return {
      isColliding: distance < ball.radius,
      closestPoint: closestPoint,
      distance: distance,
    };
  }

  checkBoxCollision(item, ball) {
    const collision = this.checkAABBCollision(ball, item);

    if (collision.isColliding) {
      // حساب سهم الدفع (Normal)
      const overlap = ball.radius - collision.distance;

      // اتجاه الدفع من النقطة الأقرب باتجاه مركز الكرة
      const direction = {
        x: (ball.position.x - collision.closestPoint.x) / collision.distance,
        y: (ball.position.y - collision.closestPoint.y) / collision.distance,
        z: (ball.position.z - collision.closestPoint.z) / collision.distance,
      };

      // إعادة تموضع الكرة خارج الجسم تماماً
      const ballNewX = ball.position.x + direction.x * overlap;
      const ballNewY = ball.position.y + direction.y * overlap;
      const ballNewZ = ball.position.z + direction.z * overlap;
      const ballNewPosition = new THREE.Vector3(ballNewX, ballNewY, ballNewZ);
      ball.position = ballNewPosition;

      // عكس السرعة لمحاكاة الارتداد
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
    if (
      ball.position.x >= slope._minX - ball.radius &&
      ball.position.x <= slope._maxX + ball.radius &&
      ball.position.z >= slope._minZ + ball.radius &&
      ball.position.z <= slope._maxZ - ball.radius
    ) {
      // console.log("distance: ", distanceToSurface);

      if (distanceToSurface < 0) {
        this.resolveCollision(ball, slope, distanceToSurface);
        return true;
      }
    }

    return false;
  }

  resolveCollision(ball, slope, penetrationDepth) {
    // 1. Position correction
    const correction = slope.normal.clone().multiplyScalar(-penetrationDepth);
    ball.position.add(correction);

    this.forceManager.updateGravity(slope.normal);
  }

  update() {
    const ball = this._items["ball"];
    const ground = this._items["ground"];
    const forceManager = this._forceManager;

    // 1. Check boxes first if needed
    for (const item of Object.values(this._items)) {
      if (item.constructor.name === "Box") {
        this.checkBoxCollision(item, ball);
      }
    }

    // 2. Check slope collision first
    const isOnSlope = this.checkSlopeCollision();

    if (!isOnSlope) {
      const targetGroundY = ground._position.y + ball.radius;

      if (ball.position.y > targetGroundY) {
        forceManager.updateGravity(new THREE.Vector3(0, 1, 0));
      }

      if (ball.position.y < targetGroundY) {
        forceManager.removeGravity();
        ball.position.y = targetGroundY;
      }
    }
  }
}
