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
        // الكرة فوق السطح بدون تلامس -> ليست على الأرض
        return false;
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
          // تلامس مع منحدر مسطح -> القوة الطبيعية = (0,1,0)
          ball.contactNormal = new THREE.Vector3(0, 1, 0);
          return true;
        }

        // slope is not flat
        ball.contactNormal = slope.normal;
        this.forceManager.updateGravity(slope.normal);
        this.correctPositionOnSlope(ball, slope, distanceToSurface);
        // تلامس مع منحدر مائل
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

    // هل الكرة تلامس سطحاً (أرضاً أو منحدراً)؟
    let isGrounded = this.checkSlopeCollision();
    let isOnSlope = false;
    const targetGroundY = ground._position.y + ball.radius;

    if (!isGrounded) {
      this.forceManager.updateGravity(new THREE.Vector3(0, 1, 0));
    }




    if (ball.position.y < targetGroundY) {
      forceManager.removeGravity();
      ball.position.y = targetGroundY;
      ball.contactNormal = new THREE.Vector3(0, 1, 0);
      // تلامس مع الأرض العادية
      isGrounded = true;
      isOnSlope = false;
    }else if (isGrounded) {
      const normal = ball.contactNormal;
      isOnSlope = !(normal.x === 0 && normal.y === 1 && normal.z === 0);
    }

    // ربط القوة الطبيعية والاحتكاك بحالة التلامس الفعلية
    forceManager.updateNormalForce(ball.contactNormal, isGrounded);
    forceManager.updateSlidingFriction(isOnSlope);
    forceManager.updateRollingFriction();
    forceManager.updateAirResistance();
  }
}
