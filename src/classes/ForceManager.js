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

  // normal force magnitude
  _normalForceMagnitude = 0;

  // air resistance coefficient
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

  // Fg_total = -m.g.j^
  // Fg_parallel = -m.g.sin(theta).i^
  updateGravity() {
    const m = this._target.mass;
    const g = this._g;
    const surfaceNormal = this._target.contactNormal;
    const worldUp = new THREE.Vector3(0, 1, 0);

    // Check if the surface is flat using dot product,
    // if normal points straight up, dot product is 1
    const isFlat = surfaceNormal.dot(worldUp) > 0.999;

    if (isFlat) {
      // Fg_total = -m.g.j^
      const Fg_total = new THREE.Vector3(0, -m * g, 0);
      this.add({ gravity: Fg_total });
      return;
    }

    // Surface is not flat, calculate Fg_parallel
    // Fg_parallel = -m.g.sin(theta).i^

    // Find a vector pointing sideways along the slope (perpendicular to normal and up)
    // This vector's length naturally contains the sin(theta) scalar
    const slopeSideways = new THREE.Vector3().crossVectors(
      surfaceNormal,
      worldUp,
    );

    // Cross the normal back with the sideways vector to get the vector pointing straight DOWNHILL
    // This gives us the direction (i^), pre-scaled by sin(theta)
    const Fg_parallel = new THREE.Vector3().crossVectors(
      surfaceNormal,
      slopeSideways,
    );

    // Scale by mass and gravity constants
    Fg_parallel.multiplyScalar(m * g);

    this.add({ gravity: Fg_parallel });
  }

  // N = m * g * cos(theta)
  updateNormalForce() {
    const ball = this._target;
    const surfaceNormal = ball.contactNormal;

    if (!ball.onSurface) {
      this._normalForceMagnitude = 0;
      this.remove("normalForce");
      return;
    }

    const m = this._target.mass;
    const g = this._g;

    // calc cosTheta
    const upVector = new THREE.Vector3(0, 1, 0);
    const cosTheta = surfaceNormal.dot(upVector);

    // N = m * g * cos(theta)
    this._normalForceMagnitude = Math.max(0, m * g * cosTheta);

    // normal force Vector = normalForceMagnitude * surfaceNormal
    this.add({
      normalForce: new THREE.Vector3()
        .copy(surfaceNormal)
        .multiplyScalar(this._normalForceMagnitude),
    });
  }

  // F_k = -mu_k * N * v_hat
  updateSlidingFriction() {
    const velocity = this._target.linearVelocity;

    // if ball is not moving, no sliding friction
    if (this._normalForceMagnitude === 0 || velocity.lengthSq() < 0.0001) {
      this.remove("slidingFriction");
      return;
    }

    // velocity direction vector
    const vHat = velocity.clone().normalize();

    // use current friction coefficient
    const mu = this._mu;

    // F_k = -mu_k * N * v_hat
    const frictionForce = vHat.multiplyScalar(-mu * this._normalForceMagnitude);

    this.add({ slidingFriction: frictionForce });
  }

  // tau_f = -mu_r * N * R * omega_hat
  updateRollingFriction() {
    const angularSpeed = this._target.angularVelocity;

    // if ball is not moving, no rolling friction
    if (this._normalForceMagnitude === 0 || Math.abs(angularSpeed) < 0.0001) {
      this.remove("rollingFriction");
      return;
    }

    const r = this._target.radius;

    // |tau| = mu_r * N * R
    const torqueMagnitude = this._c_rr * this._normalForceMagnitude * r;

    // find rotation axis
    const linVel = this._target.linearVelocity;
    const omegaHat = new THREE.Vector3()
      .crossVectors(linVel.clone().normalize(), this._target.contactNormal)
      .normalize();

    // tau_f = -torqueMagnitude * omega_hat
    const resistiveTorque = omegaHat.multiplyScalar(-torqueMagnitude);

    // convert torque to linear force
    const equivalentForce = resistiveTorque.clone().divideScalar(r);

    this.add({ rollingFriction: equivalentForce });
  }

  // F_D = -0.5 * rho * C_d * A * |v|² * v_hat
  updateAirResistance() {
    const velocity = this._target.linearVelocity;
    const speedSq = velocity.lengthSq();

    // if ball is not moving, no air resistance
    if (speedSq < 0.0001) {
      this.remove("airResistance");
      return;
    }

    const r = this._target.radius;

    // A = π * r²
    const r_effective = r * 0.1;
    const A = Math.PI * r_effective * r_effective;

    const C_d = this._target.dragCoefficient;

    // F_D = 0.5 * ρ * C_d * A * v²
    const dragMagnitude = 0.5 * this._rho * C_d * A * speedSq;

    const vHat = velocity.clone().normalize();

    // F_D = -dragMagnitude * v_hat
    const dragForce = vHat.multiplyScalar(-dragMagnitude);

    this.add({ airResistance: dragForce });
  }

  // J = F·Δt → v_final = v_initial + J/m
  applyPlayerImpulse(input, dt) {
    if (this._mode === false) return;

    const ball = this._target;

    const F_magnitude = 20;

    const F_input = new THREE.Vector3();
    if (input.right) F_input.x += F_magnitude;
    if (input.left) F_input.x -= F_magnitude;
    if (input.up) F_input.z -= F_magnitude;
    if (input.down) F_input.z += F_magnitude;

    if (F_input.lengthSq() === 0) return;

    // J = F · Δt
    const J = F_input.clone().multiplyScalar(dt);

    // v_final = v_initial + J/m
    ball.linearVelocity.addScaledVector(J, 1 / ball.mass);
  }

  update(input, dt) {
    const totalForce = new THREE.Vector3(0, 0, 0);

    const ball = this._target;
    const linVel = ball.linearVelocity;

    // Input force (Impulse)
    this.applyPlayerImpulse(input, dt);

    // Gravity
    this.updateGravity();

    // Normal Force
    this.updateNormalForce();

    // Rolling Friction
    this.updateRollingFriction();

    // Sliding Friction
    this.updateSlidingFriction();

    // Air Resistance (Drag Force)
    this.updateAirResistance();

    // Adding forces to the total force vetor
    const forcesKeys = Object.keys(this._forces);

    forcesKeys.forEach((key) => {
      totalForce.add(this._forces[key]);
    });

    // Update acceleration
    const acceleration = totalForce.clone().divideScalar(ball.mass);

    // Update velocity
    linVel.add(acceleration.multiplyScalar(dt));

    // Update position
    ball.position.add(linVel.clone().multiplyScalar(dt));

    // Ball rotation
    if (linVel.length() > 0.0001) {
      // find ball axis of rotation
      const axis = new THREE.Vector3()
        .crossVectors(linVel.clone().normalize(), ball.contactNormal)
        .normalize();

      // calc angular speed and delta angle
      // τ = F_friction × r  →  α = τ / I  →  ω = v/r + α·dt
      const frictionForce = this._forces["slidingFriction"]
        ? this._forces["slidingFriction"].clone()
        : new THREE.Vector3(0, 0, 0);
      const torque = frictionForce.length() * ball.radius;
      const alpha = torque / ball.inertia;
      ball.angularVelocity = linVel.length() / ball.radius + alpha * dt;
      const angleDelta = ball.angularVelocity * dt;

      // Create a quaternion representing only this frame's rotation step
      const rotationStep = new MyQuat().setFromAxisAngle(axis, -angleDelta);

      // Pre-multiply to apply the rotation around the global world axis
      ball.orientation.premultiply(rotationStep);
      ball.orientation.normalize();
      ball.updateMesh();
    }
  }
}
