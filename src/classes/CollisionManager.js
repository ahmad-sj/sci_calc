import * as THREE from "three";
import { Ground } from "./Ground";

export class CollisionManager {
  _items = [];
  _ball;
  _ground;

  constructor(ball, ground, forceManager) {
    this._ball = ball;
    this._ground = ground;
    this._forceManager = forceManager;
    this._items.push(ground);
  }

  addItem(item) {
    this._items.push(item);
  }

  get forceManager() {
    return this._forceManager;
  }

  set forceManager(manager) {
    this._forceManager = manager;
  }

  checkCollision(item) {
    // 1. إيجاد أقرب نقطة على الصندوق لمركز الكرة
    const closestPoint = {
      x: Math.max(item._minX, Math.min(this._ball.position.x, item._maxX)),
      y: Math.max(item._minY, Math.min(this._ball.position.y, item._maxY)),
      z: Math.max(item._minZ, Math.min(this._ball.position.z, item._maxZ)),
    };

    // 2. حساب المسافة بين مركز الكرة وهذه النقطة
    const distance = Math.sqrt(
      (closestPoint.x - this._ball.position.x) ** 2 +
        (closestPoint.y - this._ball.position.y) ** 2 +
        (closestPoint.z - this._ball.position.z) ** 2,
    );

    // 3. إذا كانت المسافة أقل من نصف القطر، فهناك تصادم
    return {
      isColliding: distance < this._ball.radius,
      closestPoint: closestPoint,
      distance: distance,
    };
  }

  handleCollision() {
    for (const item of this._items) {
      const collision = this.checkCollision(item);

      if (collision.isColliding) {
        // حساب سهم الدفع (Normal)
        const overlap = this._ball.radius - collision.distance;

        // اتجاه الدفع من النقطة الأقرب باتجاه مركز الكرة
        const direction = {
          x:
            (this._ball.position.x - collision.closestPoint.x) /
            collision.distance,
          y:
            (this._ball.position.y - collision.closestPoint.y) /
            collision.distance,
          z:
            (this._ball.position.z - collision.closestPoint.z) /
            collision.distance,
        };

        if (item instanceof Ground) {
          this._ball._position.y = item._position.y + this._ball.radius;

          const normalForce = new THREE.Vector3(0, 1, 0).multiplyScalar(
            this._ball.mass * 9.8,
          );

          this.forceManager._forces["normal"] = normalForce;
        } else {
          // إعادة تموضع الكرة خارج الجسم تماماً
          const ballNewX = this._ball.position.x + direction.x * overlap;
          const ballNewY = this._ball.position.y + direction.y * overlap;
          const ballNewZ = this._ball.position.z + direction.z * overlap;
          const ballNewPosition = new THREE.Vector3(
            ballNewX,
            ballNewY,
            ballNewZ,
          );
          this._ball.position = ballNewPosition;

          // عكس السرعة لمحاكاة الارتداد
          this._ball._linearVelocity.negate().multiplyScalar(0.5);
        }
      }
    }

    const ballX = this._ball.position.x;
    const ballZ = this._ball.position.z;
    const ballR = this._ball.radius;

    // check if ball is off ground plane
    if (
      ballX + ballR < this._ground._minX ||
      ballX + ballR > this._ground._maxX ||
      ballZ + ballR < this._ground._minZ ||
      ballZ + ballR > this._ground._maxZ
    ) {
      delete this.forceManager._forces["normal"];
    }
  }
}
