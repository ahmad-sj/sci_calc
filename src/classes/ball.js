import * as THREE from "three";
import { loadSRGBTexture } from "../helpers.js";
import { MyQuat } from "./MyQuat.js";

export class Ball {
  _radius = 1;
  _sphereWidthDivisions = 32;
  _sphereHeightDivisions = 16;

  _mass = 1;
  _position;
  _linearVelocity = new THREE.Vector3(0, 0, 0);
  _angularVelocity = 0;
  _groundY = 0;

  _orientation = new MyQuat();
  _contactNormal = new THREE.Vector3(0, 1, 0);

  // معامل مقاومة الهواء (Air Drag Coefficient) - يحدد حسب نوع الكرة
  _dragCoefficient = 0.05;

  // معامل قوة التأثير عند الاصطدام بالصناديق - يحدد حسب نوع الكرة
  // إضافي فوق تأثير الكتلة نفسها (يمثل صلابة/ليونة المادة وقت الصدمة)
  _impactForceMultiplier = 1;

  // ==================================================
  constructor() {
    this.geometry = new THREE.SphereGeometry(
      this._radius,
      this._sphereWidthDivisions,
      this._sphereHeightDivisions,
    );

    this.textures = {
      wood: loadSRGBTexture("static/textures/ball/wood/base.jpg"),
      stone: loadSRGBTexture("static/textures/ball/stone/base.jpg"),
      paper: loadSRGBTexture("static/textures/ball/paper/base.jpg"),
    };

    this.material = new THREE.MeshPhongMaterial();

    this.type = "wood";

    this.mesh = new THREE.Mesh(this.geometry, this.material);

    this.mesh.position.copy(new THREE.Vector3(0, 0, 0));
    this._position = this.mesh.position;

    const axesHelper = new THREE.AxesHelper(2);

    this.mesh.add(axesHelper);
  }

  // ==================================================
  addToScene(scene) {
    scene.add(this.mesh);
  }

  // ==================================================
  get radius() {
    return this._radius;
  }

  // ==================================================
  get mass() {
    return this._mass;
  }

  set mass(number) {
    this._mass = number;
    this._radius = number;
    this.mesh.scale.x = this.mesh.scale.y = this.mesh.scale.z = number;
  }

  // ==================================================
  get position() {
    return this._position;
  }

  set position(vector) {
    this._position.copy(vector);
  }

  // ==================================================
  get groundY() {
    return this._groundY;
  }

  set groundY(number) {
    this._groundY = number;
    this._position.y = number + this._radius;
  }

  // ==================================================
  get linearVelocity() {
    return this._linearVelocity;
  }

  set linearVelocity(vector) {
    this._linearVelocity = vector;
  }

  // ==================================================
  get isOnGround() {
    return !(this._position.y <= this._groundY + this._radius + 0.001);
  }

  // ==================================================
  get angularVelocity() {
    return this._angularVelocity;
  }

  set angularVelocity(vector) {
    this._angularVelocity = vector;
  }

  // ==================================================
  // 4.2 عزم القصور الذاتي الدوراني (Moment of Inertia)
  // I = (2/5) * m * r^2  -> صيغة الكرة الصلبة المتجانسة بالضبط متل الصورة
  get momentOfInertia() {
    return (2 / 5) * this._mass * this._radius * this._radius;
  }

  // كمية الحركة الدورانية (Angular Momentum): L = I * ω
  get angularMomentum() {
    return this.momentOfInertia * this._angularVelocity;
  }

  // الكتلة الفعّالة (Effective Mass) — هون يظهر تأثير I فعلياً
  // لما قوة تُطبّق على كرة تتدحرج، لازم تسرّع حركتين بنفس الوقت (خطية + زاوية)
  // فالكرة "تحسّ" أثقل مما هي فعلاً:
  //   m_eff = m + I/r²
  //         = m + (2/5)·m·r²/r²
  //         = m·(1 + 2/5)
  //         = (7/5)·m
  // الحجرية (m=3):   m_eff = 4.2  → أصعب تحريكاً وإيقافاً
  // الخشبية (m=1.5): m_eff = 2.1  → متوسطة
  // الورقية (m=0.75): m_eff = 1.05 → أسهل تحريكاً وإيقافاً
  get effectiveMass() {
    return this._mass + this.momentOfInertia / (this._radius * this._radius);
  }

  // ==================================================
  get contactNormal() {
    return this._contactNormal;
  }

  set contactNormal(vector) {
    this._contactNormal = vector;
  }

  // ==================================================
  // معامل مقاومة الهواء الحالي (يستخدمه ForceManager)
  get dragCoefficient() {
    return this._dragCoefficient;
  }

  // معامل قوة التأثير عند الاصطدام بالصناديق (يستخدمه CollisionManager)
  get impactForceMultiplier() {
    return this._impactForceMultiplier;
  }

  // ==================================================
  set type(input) {
    // update ball type
    this._type = input;

    // setting ball properties based on type
    switch (input) {
      case "paper": {
        this._mass = 0.75;
        // الورق خفيف جداً وسطحه واسع نسبياً لوزنه -> الهواء بيأثر فيه كتير
        this._dragCoefficient = 0.08;
        // الورق يلين/يمتص جزء من الصدمة -> تأثير أضعف عالصندوق حتى لو نفس السرعة
        this._impactForceMultiplier = 0.4;
        break;
      }
      case "stone": {
        this._mass = 3;
        // الحجر ثقيل وكثيف -> الهواء بالكاد يأثر فيه
        this._dragCoefficient = 0.005;
        // الحجر صلب وما بيمتص طاقة -> ينقل الصدمة كاملة (وأكتر) عالصندوق
        this._impactForceMultiplier = 1.4;
        break;
      }
      case "wood": {
        this._mass = 1.5;
        // الخشب بالوسط بين التانيين
        this._dragCoefficient = 0.03;
        this._impactForceMultiplier = 1;
        break;
      }
    }

    // applying textures
    this.material.map = this.textures[input];

    const textureLoader = new THREE.TextureLoader();

    const bumpMap = textureLoader.load(
      `static/textures/ball/${input}/bump_map.jpg`,
    );
    this.material.bumpMap = bumpMap;

    const normalMap = textureLoader.load(
      `static/textures/ball/${input}/normal_map.jpg`,
    );
    this.material.normalMap = normalMap;

    this.material.needsUpdate = true;
  }

  get type() {
    return this._type;
  }

  get orientation() {
    return this._orientation;
  }

  set orientation(myQuat) {
    this._orientation = myQuat;
  }

  // ==================================================
  rotate(axis, angle) {
    this.mesh.rotateOnAxis(axis, angle);
  }

  reset() {
    this.linearVelocity.set(0, 0, 0);
    this.angularVelocity = 0;

    this.orientation.identity();
    this.updateMesh(this.orientation);

    // ترجع فوق المستوى المائل (28, 5, 0) بنفس موقع البداية
    this.position.set(28, 8, 0);
    this.mass = 1;
    this.contactNormal.set(0, 1, 0);
  }

  updateMesh() {
    this.mesh.quaternion.set(
      this.orientation.x,
      this.orientation.y,
      this.orientation.z,
      this.orientation.w,
    );
  }
}





/*import * as THREE from "three";
import { loadSRGBTexture } from "../helpers.js";
import { MyQuat } from "./MyQuat.js";

export class Ball {
  _radius = 1;
  _sphereWidthDivisions = 32;
  _sphereHeightDivisions = 16;

  _mass = 1;
  _position;
  _linearVelocity = new THREE.Vector3(0, 0, 0);
  _angularVelocity = 0;
  _groundY = 0;

  _orientation = new MyQuat();
  _contactNormal = new THREE.Vector3(0, 1, 0);

  // معامل مقاومة الهواء (Air Drag Coefficient) - يحدد حسب نوع الكرة
  _dragCoefficient = 0.05;

  // معامل قوة التأثير عند الاصطدام بالصناديق - يحدد حسب نوع الكرة
  // إضافي فوق تأثير الكتلة نفسها (يمثل صلابة/ليونة المادة وقت الصدمة)
  _impactForceMultiplier = 1;

  // ==================================================
  constructor() {
    this.geometry = new THREE.SphereGeometry(
      this._radius,
      this._sphereWidthDivisions,
      this._sphereHeightDivisions,
    );

    this.textures = {
      wood: loadSRGBTexture("static/textures/ball/wood/base.jpg"),
      stone: loadSRGBTexture("static/textures/ball/stone/base.jpg"),
      paper: loadSRGBTexture("static/textures/ball/paper/base.jpg"),
    };

    this.material = new THREE.MeshPhongMaterial();

    this.type = "wood";

    this.mesh = new THREE.Mesh(this.geometry, this.material);

    this.mesh.position.copy(new THREE.Vector3(0, 0, 0));
    this._position = this.mesh.position;

    const axesHelper = new THREE.AxesHelper(2);

    this.mesh.add(axesHelper);
  }

  // ==================================================
  addToScene(scene) {
    scene.add(this.mesh);
  }

  // ==================================================
  get radius() {
    return this._radius;
  }

  // ==================================================
  get mass() {
    return this._mass;
  }

  set mass(number) {
    this._mass = number;
    this._radius = number;
    this.mesh.scale.x = this.mesh.scale.y = this.mesh.scale.z = number;
  }

  // ==================================================
  get position() {
    return this._position;
  }

  set position(vector) {
    this._position.copy(vector);
  }

  // ==================================================
  get groundY() {
    return this._groundY;
  }

  set groundY(number) {
    this._groundY = number;
    this._position.y = number + this._radius;
  }

  // ==================================================
  get linearVelocity() {
    return this._linearVelocity;
  }

  set linearVelocity(vector) {
    this._linearVelocity = vector;
  }

  // ==================================================
  get isOnGround() {
    return !(this._position.y <= this._groundY + this._radius + 0.001);
  }

  // ==================================================
  get angularVelocity() {
    return this._angularVelocity;
  }

  set angularVelocity(vector) {
    this._angularVelocity = vector;
  }

  // ==================================================
  // 4.2 عزم القصور الذاتي الدوراني (Moment of Inertia)
  // I = (2/5) * m * r^2  -> صيغة الكرة الصلبة المتجانسة بالضبط متل الصورة
  get momentOfInertia() {
    return (2 / 5) * this._mass * this._radius * this._radius;
  }

  // كمية الحركة الدورانية (Angular Momentum): L = I * ω
  get angularMomentum() {
    return this.momentOfInertia * this._angularVelocity;
  }

  // الكتلة الفعّالة (Effective Mass) — هون يظهر تأثير I فعلياً
  // لما قوة تُطبّق على كرة تتدحرج، لازم تسرّع حركتين بنفس الوقت (خطية + زاوية)
  // فالكرة "تحسّ" أثقل مما هي فعلاً:
  //   m_eff = m + I/r²
  //         = m + (2/5)·m·r²/r²
  //         = m·(1 + 2/5)
  //         = (7/5)·m
  // الحجرية (m=3):   m_eff = 4.2  → أصعب تحريكاً وإيقافاً
  // الخشبية (m=1.5): m_eff = 2.1  → متوسطة
  // الورقية (m=0.75): m_eff = 1.05 → أسهل تحريكاً وإيقافاً
  get effectiveMass() {
    return this._mass + this.momentOfInertia / (this._radius * this._radius);
  }

  // ==================================================
  get contactNormal() {
    return this._contactNormal;
  }

  set contactNormal(vector) {
    this._contactNormal = vector;
  }

  // ==================================================
  // معامل مقاومة الهواء الحالي (يستخدمه ForceManager)
  get dragCoefficient() {
    return this._dragCoefficient;
  }

  // معامل قوة التأثير عند الاصطدام بالصناديق (يستخدمه CollisionManager)
  get impactForceMultiplier() {
    return this._impactForceMultiplier;
  }

  // ==================================================
  set type(input) {
    // update ball type
    this._type = input;

    // setting ball properties based on type
    switch (input) {
      case "paper": {
        this._mass = 0.75;
        // الورق خفيف جداً وسطحه واسع نسبياً لوزنه -> الهواء بيأثر فيه كتير
        this._dragCoefficient = 0.08;
        // الورق يلين/يمتص جزء من الصدمة -> تأثير أضعف عالصندوق حتى لو نفس السرعة
        this._impactForceMultiplier = 0.4;
        break;
      }
      case "stone": {
        this._mass = 3;
        // الحجر ثقيل وكثيف -> الهواء بالكاد يأثر فيه
        this._dragCoefficient = 0.005;
        // الحجر صلب وما بيمتص طاقة -> ينقل الصدمة كاملة (وأكتر) عالصندوق
        this._impactForceMultiplier = 1.4;
        break;
      }
      case "wood": {
        this._mass = 1.5;
        // الخشب بالوسط بين التانيين
        this._dragCoefficient = 0.03;
        this._impactForceMultiplier = 1;
        break;
      }
    }

    // applying textures
    this.material.map = this.textures[input];

    const textureLoader = new THREE.TextureLoader();

    const bumpMap = textureLoader.load(
      `static/textures/ball/${input}/bump_map.jpg`,
    );
    this.material.bumpMap = bumpMap;

    const normalMap = textureLoader.load(
      `static/textures/ball/${input}/normal_map.jpg`,
    );
    this.material.normalMap = normalMap;

    this.material.needsUpdate = true;
  }

  get type() {
    return this._type;
  }

  get orientation() {
    return this._orientation;
  }

  set orientation(myQuat) {
    this._orientation = myQuat;
  }

  // ==================================================
  rotate(axis, angle) {
    this.mesh.rotateOnAxis(axis, angle);
  }

  reset() {
    this.linearVelocity.set(0, 0, 0);
    this.angularVelocity = 0;

    this.orientation.identity();
    this.updateMesh(this.orientation);

    this.position.set(0, 10, 0);
    this.mass = 1;
    this.contactNormal.set(0, 1, 0);
  }

  updateMesh() {
    this.mesh.quaternion.set(
      this.orientation.x,
      this.orientation.y,
      this.orientation.z,
      this.orientation.w,
    );
  }
}*/