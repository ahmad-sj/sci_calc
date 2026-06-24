import * as THREE from "three";

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

  checkSlopeCollision() {
    const ball = this._items["ball"];
    const slope = this._items["slope"];

    // console.log("angle", THREE.MathUtils.radToDeg(Math.acos(slope.normal.y)));
    // console.log("slope normal", slope.normal);

    // Get theoretical ground height at ball's center (X,Z)
    const slopeY = slope.getHeightAt(ball.position.x, ball.position.z);

    // Distance from ball center to slope surface
    const distanceToSurface = ball.position.y - (slopeY + ball.radius);

    // check if ball is within slope bounds (X,Z)
    if (slope.contains(ball)) {
      // if ball is above slope surface
      if (distanceToSurface >= 0) {
        this.forceManager.updateGravity(new THREE.Vector3(0, 1, 0));
        // console.log("distance greater than 0: ", distanceToSurface);
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
