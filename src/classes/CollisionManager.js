import * as THREE from "three";

export class CollisionManager {
  _items = [];
  _ball;

  constructor(ball) {
    this._ball = ball;
  }

  addItem(item) {
    this._items.push(item);
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
        const overlap = this._ball._radius - collision.distance;

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

        // إعادة تموضع الكرة خارج الجسم تماماً
        const ballNewX = this._ball.position.x + direction.x * overlap;
        const ballNewY = this._ball.position.y + direction.y * overlap;
        const ballNewZ = this._ball.position.z + direction.z * overlap;
        const ballNewPosition = new THREE.Vector3(ballNewX, ballNewY, ballNewZ);
        this._ball.position = ballNewPosition;

        // عكس السرعة لمحاكاة الارتداد
        this._ball._linearVelocity.negate().multiplyScalar(0.5);
      }
    }
  }
}
