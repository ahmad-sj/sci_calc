import * as THREE from "three";

export class MyQuat {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  identity() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
    return this;
  }

  clone() {
    return new MyQuat(this.x, this.y, this.z, this.w);
  }

  normalize() {
    const len = Math.sqrt(
      this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w,
    );

    if (len === 0) return this.identity();

    const inv = 1 / len;

    this.x *= inv;
    this.y *= inv;
    this.z *= inv;
    this.w *= inv;

    return this;
  }

  multiply(q) {
    const ax = this.x;
    const ay = this.y;
    const az = this.z;
    const aw = this.w;

    const bx = q.x;
    const by = q.y;
    const bz = q.z;
    const bw = q.w;

    this.x = aw * bx + ax * bw + ay * bz - az * by;
    this.y = aw * by - ax * bz + ay * bw + az * bx;
    this.z = aw * bz + ax * by - ay * bx + az * bw;
    this.w = aw * bw - ax * bx - ay * by - az * bz;

    return this;
  }

  premultiply(q) {
    return this.copy(q.clone().multiply(this));
  }

  copy(q) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }

  setFromAxisAngle(axis, angle) {
    const halfAngle = angle * 0.5;
    const s = Math.sin(halfAngle);

    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(halfAngle);

    return this;
  }

  rotateVector(v) {
    const qx = this.x;
    const qy = this.y;
    const qz = this.z;
    const qw = this.w;

    const vx = v.x;
    const vy = v.y;
    const vz = v.z;

    const ix = qw * vx + qy * vz - qz * vy;
    const iy = qw * vy + qz * vx - qx * vz;
    const iz = qw * vz + qx * vy - qy * vx;
    const iw = -qx * vx - qy * vy - qz * vz;

    return new THREE.Vector3(
      ix * qw + iw * -qx + iy * -qz - iz * -qy,
      iy * qw + iw * -qy + iz * -qx - ix * -qz,
      iz * qw + iw * -qz + ix * -qy - iy * -qx,
    );
  }

  rotateOnAxis(axis, angle) {
    const rotation = new MyQuat().setFromAxisAngle(axis, angle);

    return this.multiply(rotation);
  }
}
