import * as THREE from "three";
import { loadTexture } from "~/src/helpers";

export class Box {
  size = 1;
  _position = new THREE.Vector3(0, 0, 0);
  _mass = 5; // كتلة الصندوق أكبر من الكرة عادة، بيقاوم الدفع أكتر
  _velocity = new THREE.Vector3(0, 0, 0);
  _friction = 2.5; // معامل احتكاك الصندوق مع الأرض (إبطاء تدريجي)

  // دوران الصندوق حول المحور العمودي Y (لما يصطدم بزاوية بعيدة عن مركزه)
  _angularVelocity = 0; // راديان/ثانية
  _rotationY = 0; // زاوية الدوران الحالية
  _angularFriction = 4; // إبطاء تدريجي للدوران (أكبر من الاحتكاك الخطي عادة)

  _minX = this._position.x - this.size / 2;
  _maxX = this._position.x + this.size / 2;
  _minY = this._position.y - this.size / 2;
  _maxY = this._position.y + this.size / 2;
  _minZ = this._position.z - this.size / 2;
  _maxZ = this._position.z + this.size / 2;

  constructor(position, size, textureName) {
    this._position.copy(position);
    this.size = size;

    this.update();

    const materials = [];

    for (let index = 1; index <= 6; index++) {
      materials.push(
        new THREE.MeshBasicMaterial({
          map: loadTexture(`static/textures/${textureName}.jpg`),
        }),
      );
    }

    this.geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
    this.mesh = new THREE.Mesh(this.geometry, materials);
    this.mesh.position.copy(this._position);
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  get position() {
    return this._position;
  }

  set position(value) {
    this._position = value;
    this.mesh.position.copy(this._position);
  }

  get mass() {
    return this._mass;
  }

  set mass(value) {
    this._mass = value;
  }

  get friction() {
    return this._friction;
  }

  set friction(value) {
    this._friction = value;
  }

  get velocity() {
    return this._velocity;
  }

  set velocity(vector) {
    this._velocity = vector;
  }

  get angularVelocity() {
    return this._angularVelocity;
  }

  set angularVelocity(value) {
    this._angularVelocity = value;
  }

  get angularFriction() {
    return this._angularFriction;
  }

  set angularFriction(value) {
    this._angularFriction = value;
  }

  // عزم القصور الذاتي لمكعب صلب حول محور عمودي من مركزه
  // I = (1/6) * m * size^2 (تقريب قياسي لمكعب متجانس)
  get momentOfInertia() {
    return (1 / 6) * this._mass * this.size * this.size;
  }

  update() {
    // Update the min and max values
    this._minX = this._position.x - this.size / 2;
    this._maxX = this._position.x + this.size / 2;
    this._minY = this._position.y - this.size / 2;
    this._maxY = this._position.y + this.size / 2;
    this._minZ = this._position.z - this.size / 2;
    this._maxZ = this._position.z + this.size / 2;
  }

  // ==================================================
  // إضافة دفعة (impulse) على الصندوق - عادة نتيجة اصطدام بالكرة
  applyImpulse(impulseVector) {
    // J = m * Δv  =>  Δv = J / m
    const deltaV = impulseVector.clone().divideScalar(this._mass);
    this._velocity.add(deltaV);
  }

  // ==================================================
  // إضافة عزم دوران (Torque) حول المحور العمودي Y
  // بينتج عن اصطدام بعيد عن مركز الصندوق (r × F)
  // Δω = torque / I
  applyTorque(torqueY) {
    const deltaOmega = torqueY / this.momentOfInertia;
    this._angularVelocity += deltaOmega;

    // حد أقصى للسرعة الزاوية حتى يضل الدوران بسيط ومنطقي بصرياً
    const maxAngularVelocity = 4; // راديان/ثانية
    this._angularVelocity = THREE.MathUtils.clamp(
      this._angularVelocity,
      -maxAngularVelocity,
      maxAngularVelocity,
    );
  }

  // ==================================================
  // تحديث حركة الصندوق بكل فريم (دفع + احتكاك + دوران)
  updatePhysics(dt) {
    // ---------- الحركة الخطية ----------
    if (this._velocity.length() > 0) {
      // نخلي الصندوق يتحرك أفقياً بس (X,Z) ونثبته على الأرض عمودياً
      this._velocity.y = 0;

      // تحريك الموقع
      this._position.add(this._velocity.clone().multiplyScalar(dt));
      this.mesh.position.copy(this._position);

      // إبطاء تدريجي بسبب احتكاك الصندوق مع الأرض
      const speed = this._velocity.length();
      const frictionDecel = this._friction * dt;

      if (frictionDecel >= speed) {
        this._velocity.set(0, 0, 0);
      } else {
        const direction = this._velocity.clone().normalize();
        this._velocity.sub(direction.multiplyScalar(frictionDecel));
      }

      // تحديث الحدود (bounds) بعد التحرك
      this.update();
    }

    // ---------- الدوران ----------
    if (Math.abs(this._angularVelocity) > 0.0001) {
      this._rotationY += this._angularVelocity * dt;
      this.mesh.rotation.y = this._rotationY;

      // إبطاء تدريجي للدوران (مقاومة الأرض للف)
      const angularSpeed = Math.abs(this._angularVelocity);
      const angularDecel = this._angularFriction * dt;

      if (angularDecel >= angularSpeed) {
        this._angularVelocity = 0;
      } else {
        this._angularVelocity -=
          Math.sign(this._angularVelocity) * angularDecel;
      }
    }
  }
}





/*import * as THREE from "three";
import { loadTexture } from "~/src/helpers";

export class Box {
  size = 1;
  _position = new THREE.Vector3(0, 0, 0);

  _minX = this._position.x - this.size / 2;
  _maxX = this._position.x + this.size / 2;
  _minY = this._position.y - this.size / 2;
  _maxY = this._position.y + this.size / 2;
  _minZ = this._position.z - this.size / 2;
  _maxZ = this._position.z + this.size / 2;

  constructor(position, size, textureName) {
    this._position.copy(position);
    this.size = size;

    this.update();

    const materials = [];

    for (let index = 1; index <= 6; index++) {
      materials.push(
        new THREE.MeshBasicMaterial({
          map: loadTexture(`static/textures/${textureName}.jpg`),
        }),
      );
    }

    this.geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
    this.mesh = new THREE.Mesh(this.geometry, materials);
    this.mesh.position.copy(this._position);
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  get position() {
    return this._position;
  }

  set position(value) {
    this._position = value;
    this.mesh.position.copy(this._position);
  }

  update() {
    // Update the min and max values
    this._minX = this._position.x - this.size / 2;
    this._maxX = this._position.x + this.size / 2;
    this._minY = this._position.y - this.size / 2;
    this._maxY = this._position.y + this.size / 2;
    this._minZ = this._position.z - this.size / 2;
    this._maxZ = this._position.z + this.size / 2;
  }
}*/
