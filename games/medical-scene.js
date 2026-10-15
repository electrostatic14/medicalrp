import * as THREE from "../assets/vendor/three.module.js";
import { OrbitControls } from "../assets/vendor/OrbitControls.js";

const PALETTE = {
  teal: 0x46ebd1,
  blue: 0x85baff,
  amber: 0xffc579,
  red: 0xff7d86,
};

/** A small, entirely local procedural theatre. No model downloads or real clinical procedures. */
export class MedicalScene {
  constructor(
    host,
    { mode = "feldsher", quality = "medium", onInteract = () => {} } = {},
  ) {
    this.host = host;
    this.mode = mode;
    this.onInteract = onInteract;
    this.labels = [];
    this.interactables = [];
    this.materials = new Set();
    this.geometries = new Set();
    this.textures = new Set();
    this.disposed = false;
    this.stability = 80;
    this.status = "ОЖИДАНИЕ";
    this.quality = quality;
    this.container = document.createElement("div");
    this.container.className = "medical-viewport";
    this.container.setAttribute(
      "aria-label",
      mode === "surgeon" ? "Трёхмерная операционная" : "Трёхмерная палата",
    );
    host.append(this.container);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x071723);
    this.scene.fog = new THREE.Fog(0x071723, 13, 27);
    this.camera = new THREE.PerspectiveCamera(43, 1, 0.1, 45);
    this.camera.position.set(5.6, 4.7, 6.2);
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: quality !== "low",
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch (error) {
      this.container.remove();
      throw new Error("WEBGL_UNAVAILABLE", { cause: error });
    }
    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        quality === "high" ? 2 : quality === "low" ? 1 : 1.5,
      ),
    );
    this.renderer.shadowMap.enabled = quality !== "low";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Проведите пальцем для вращения. Два пальца — масштаб. Коснитесь оборудования.",
    );
    this.container.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.35, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 3.2;
    this.controls.maxDistance = 13;
    this.controls.maxPolarAngle = Math.PI / 2.12;
    this.controls.minPolarAngle = 0.18;
    this.controls.update();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.scene.add(new THREE.HemisphereLight(0xc0edff, 0x122139, 2.3));
    const sun = new THREE.DirectionalLight(0xe1f5ff, 3.4);
    sun.position.set(2, 7, 3);
    sun.castShadow = quality !== "low";
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -6,
      right: 6,
      top: 6,
      bottom: -6,
      near: 0.2,
      far: 18,
    });
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);
    const accent = new THREE.PointLight(0x43e8d2, 13, 10, 2);
    accent.position.set(-2, 3, -2);
    this.scene.add(accent);
    this.buildRoom();
    this.buildBed();
    this.buildEquipment();
    this.buildLights();
    this.label("patient", "ПАЦИЕНТ", new THREE.Vector3(0, 1.75, 0.2));
    this.label("monitor", "МОНИТОР", new THREE.Vector3(-1.9, 2.5, -1.3));
    this.label("oxygen", "КОНТУР", new THREE.Vector3(-2.25, 1.5, 0.65));
    this.label("tray", "ИНСТРУМЕНТЫ", new THREE.Vector3(1.9, 1.65, 0.1));
    this.ring = this.mesh(
      new THREE.TorusGeometry(0.42, 0.012, 5, 56),
      this.material(PALETTE.teal, {
        emissive: PALETTE.teal,
        emissiveIntensity: 0.7,
      }),
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.set(0, 1.8, 0.1);
    this.ring.visible = false;
    this.scene.add(this.ring);
    this.boundDown = (event) => this.pointerDown(event);
    this.boundUp = (event) => this.pointerUp(event);
    this.boundCancel = () => {
      this.press = null;
      this.controls.enabled = !this.manipulating;
    };
    this.renderer.domElement.addEventListener("pointerdown", this.boundDown);
    this.renderer.domElement.addEventListener("pointerup", this.boundUp);
    this.renderer.domElement.addEventListener(
      "pointercancel",
      this.boundCancel,
    );
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.clockStart = performance.now();
    this.tick = this.tick.bind(this);
    this.frame = requestAnimationFrame(this.tick);
  }

  material(color, options = {}) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.15,
      ...options,
    });
    this.materials.add(material);
    return material;
  }

  mesh(geometry, material, position, parent = this.scene, target = null) {
    this.geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    if (position) object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    if (target) {
      object.userData.target = target;
      this.interactables.push(object);
    }
    return object;
  }

  box(size, color, position, parent = this.scene, target = null, options = {}) {
    return this.mesh(
      new THREE.BoxGeometry(...size),
      this.material(color, options),
      position,
      parent,
      target,
    );
  }

  cylinder(
    r1,
    r2,
    height,
    color,
    position,
    parent = this.scene,
    target = null,
    options = {},
  ) {
    return this.mesh(
      new THREE.CylinderGeometry(r1, r2, height, 18),
      this.material(color, options),
      position,
      parent,
      target,
    );
  }

  sphere(size, color, position, parent = this.scene, target = null) {
    const ball = this.mesh(
      new THREE.SphereGeometry(1, 20, 14),
      this.material(color),
      position,
      parent,
      target,
    );
    ball.scale.set(...size);
    return ball;
  }

  buildRoom() {
    this.box([10, 0.15, 9], 0x142b3b, [0, -0.1, 0]);
    this.box([10, 4.8, 0.18], 0x193349, [0, 2.3, -4]);
    this.box([0.18, 4.8, 8], 0x122b40, [-5, 2.3, 0]);
    const grout = this.material(0x264555);
    for (let i = -4; i <= 4; i++) {
      this.mesh(new THREE.BoxGeometry(0.012, 0.004, 8.8), grout, [
        i,
        -0.019,
        0.4,
      ]);
      this.mesh(new THREE.BoxGeometry(9.8, 0.004, 0.012), grout, [
        0,
        -0.018,
        i,
      ]);
    }
    this.box(
      [9.8, 0.045, 0.06],
      PALETTE.teal,
      [0, 1.05, -3.88],
      undefined,
      null,
      { emissive: PALETTE.teal, emissiveIntensity: 0.7 },
    );
    this.box(
      [0.06, 0.045, 7.8],
      PALETTE.teal,
      [-4.87, 1.05, 0],
      undefined,
      null,
      { emissive: PALETTE.teal, emissiveIntensity: 0.5 },
    );
    // Backlit, frosted window and recessed wall panels.
    this.box([3.1, 1.65, 0.08], 0x335a70, [-1.5, 2.8, -3.88]);
    this.box([2.9, 1.45, 0.05], 0x77c7de, [-1.5, 2.8, -3.8], undefined, null, {
      emissive: 0x365e73,
      emissiveIntensity: 0.6,
    });
    this.box([0.05, 1.5, 0.06], 0x234050, [-1.5, 2.8, -3.73]);
    this.box([2.95, 0.05, 0.06], 0x234050, [-1.5, 2.8, -3.72]);
    for (let i = 0; i < 3; i++) {
      const x = 1.5 + i * 0.85;
      this.box([0.8, 2.3, 0.7], 0x284357, [x, 1.15, -3.4]);
      this.box([0.7, 1.05, 0.03], 0x36596d, [x, 1.7, -3.03]);
      this.box([0.7, 1.05, 0.03], 0x36596d, [x, 0.58, -3.03]);
      this.box([0.04, 0.28, 0.05], 0x99bed0, [x + 0.22, 1.65, -3.0]);
      this.box([0.04, 0.28, 0.05], 0x99bed0, [x + 0.22, 0.65, -3.0]);
    }
    // Medical cross: three dimensional, no image dependency.
    this.box(
      [0.17, 0.65, 0.07],
      0x56e9d1,
      [-4.84, 3.1, -1.5],
      undefined,
      null,
      { emissive: 0x1f756c },
    );
    this.box(
      [0.17, 0.19, 0.55],
      0x56e9d1,
      [-4.84, 3.1, -1.5],
      undefined,
      null,
      { emissive: 0x1f756c },
    );
  }

  buildBed() {
    const metal = 0x738f9d;
    this.box([1.7, 0.24, 3.3], metal, [0, 1.05, 0]);
    this.box([1.58, 0.2, 3.12], 0xc6e0df, [0, 1.27, 0]);
    this.box([0.4, 0.8, 1.1], 0x455f70, [0, 0.55, -0.1]);
    this.box([1.35, 0.14, 2.2], 0x3d596b, [0, 0.16, 0]);
    for (const x of [-0.6, 0.6])
      for (const z of [-1.15, 1.15]) {
        const wheel = this.cylinder(0.12, 0.12, 0.09, 0x0b1a28, [x, 0.13, z]);
        wheel.rotation.z = Math.PI / 2;
      }
    for (const x of [-0.87, 0.87]) {
      this.box([0.045, 0.28, 2.4], 0x90b8c0, [x, 1.48, 0.1]);
      this.box([0.06, 0.05, 2.5], metal, [x, 1.65, 0.1]);
    }
    this.box([0.95, 0.17, 0.6], 0xf1efdf, [0, 1.44, -1.1]);
    this.patient = new THREE.Group();
    this.scene.add(this.patient);
    const skin = 0xd2ab91;
    this.sphere(
      [0.3, 0.32, 0.32],
      skin,
      [0, 1.68, -1.04],
      this.patient,
      "patient",
    );
    this.sphere([0.32, 0.15, 0.31], 0x493f3e, [0, 1.88, -1.09], this.patient);
    this.sphere(
      [0.045, 0.03, 0.035],
      0x364b54,
      [-0.105, 1.79, -0.777],
      this.patient,
    );
    this.sphere(
      [0.045, 0.03, 0.035],
      0x364b54,
      [0.105, 1.79, -0.777],
      this.patient,
    );
    this.sphere([0.06, 0.045, 0.06], skin, [0, 1.69, -0.743], this.patient);
    this.torso = this.sphere(
      [0.46, 0.22, 0.67],
      this.mode === "surgeon" ? 0x2b8990 : 0x8cbdcf,
      [0, 1.53, -0.18],
      this.patient,
      "patient",
    );
    for (const side of [-1, 1]) {
      const arm = this.sphere(
        [0.13, 0.14, 0.57],
        skin,
        [side * 0.56, 1.5, -0.18],
        this.patient,
        "patient",
      );
      arm.rotation.y = side * 0.1;
      this.sphere(
        [0.14, 0.08, 0.19],
        skin,
        [side * 0.6, 1.5, 0.42],
        this.patient,
        "patient",
      );
      this.sphere(
        [0.19, 0.16, 0.7],
        0x719da7,
        [side * 0.23, 1.48, 0.9],
        this.patient,
        "patient",
      );
      this.sphere(
        [0.17, 0.12, 0.22],
        skin,
        [side * 0.23, 1.47, 1.51],
        this.patient,
      );
    }
    if (this.mode === "surgeon") {
      this.box(
        [1.35, 0.025, 1.4],
        0x277a82,
        [0, 1.76, 0.18],
        this.patient,
        "patient",
      );
      this.cylinder(
        0.29,
        0.29,
        0.026,
        0x102f43,
        [0, 1.78, 0.07],
        this.patient,
        "patient",
      );
      this.cylinder(
        0.22,
        0.22,
        0.03,
        0x79d8d0,
        [0, 1.79, 0.07],
        this.patient,
        "patient",
        { emissive: 0x195d58, emissiveIntensity: 0.7 },
      );
      // The operating area is an abstract luminous training surface, never anatomical gore.
      this.box(
        [0.26, 0.035, 0.035],
        0xb6fff0,
        [0, 1.82, 0.07],
        this.patient,
        "patient",
      );
      this.box(
        [0.035, 0.035, 0.26],
        0xb6fff0,
        [0, 1.82, 0.07],
        this.patient,
        "patient",
      );
    }
  }

  buildEquipment() {
    // Stand and live monitor.
    this.box([0.65, 0.12, 0.6], 0x415c6e, [-1.85, 0.15, -1.5]);
    this.cylinder(0.045, 0.045, 1.5, 0x91aeb8, [-1.85, 0.9, -1.5]);
    this.box(
      [1.05, 0.8, 0.13],
      0x0c1e2c,
      [-1.85, 2.05, -1.5],
      undefined,
      "monitor",
    );
    this.monitorCanvas = document.createElement("canvas");
    this.monitorCanvas.width = 512;
    this.monitorCanvas.height = 320;
    this.monitorContext = this.monitorCanvas.getContext("2d");
    this.monitorTexture = new THREE.CanvasTexture(this.monitorCanvas);
    this.monitorTexture.colorSpace = THREE.SRGBColorSpace;
    this.textures.add(this.monitorTexture);
    const monitorMaterial = new THREE.MeshBasicMaterial({
      map: this.monitorTexture,
    });
    this.materials.add(monitorMaterial);
    this.mesh(
      new THREE.PlaneGeometry(0.94, 0.63),
      monitorMaterial,
      [-1.85, 2.06, -1.422],
      undefined,
      "monitor",
    );
    for (const x of [-2.21, -2.07, -1.93])
      this.sphere(
        [0.027, 0.027, 0.025],
        0x61d1c3,
        [x, 1.71, -1.418],
        undefined,
        "monitor",
      );
    // Fictional oxygen/stability system.
    this.cylinder(
      0.25,
      0.25,
      1.35,
      0x6ca6a8,
      [-2.3, 0.8, 0.65],
      undefined,
      "oxygen",
    );
    this.sphere(
      [0.25, 0.16, 0.25],
      0x97c1bb,
      [-2.3, 1.48, 0.65],
      undefined,
      "oxygen",
    );
    this.cylinder(
      0.06,
      0.06,
      0.16,
      0xd2d5be,
      [-2.3, 1.64, 0.65],
      undefined,
      "oxygen",
    );
    const dial = this.cylinder(
      0.14,
      0.14,
      0.06,
      0xb9edeb,
      [-2.3, 1.72, 0.72],
      undefined,
      "oxygen",
    );
    dial.rotation.x = Math.PI / 2;
    const tubeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.3, 1.6, 0.65),
      new THREE.Vector3(-1.5, 1.5, 0.2),
      new THREE.Vector3(-0.9, 1.85, -0.8),
      new THREE.Vector3(-0.12, 1.7, -0.75),
    ]);
    this.mesh(
      new THREE.TubeGeometry(tubeCurve, 28, 0.025, 6, false),
      this.material(0x7de5dc, { transparent: true, opacity: 0.75 }),
    );
    // Trolley and distinct, raycastable instrument shapes.
    this.box([1.2, 0.09, 1.8], 0x7395a2, [1.9, 1.22, 0.1], undefined, "tray");
    this.box([1.1, 0.03, 1.7], 0x1a565e, [1.9, 1.28, 0.1], undefined, "tray");
    this.box([1.1, 0.08, 1.65], 0x365769, [1.9, 0.4, 0.1]);
    for (const x of [1.4, 2.4])
      for (const z of [-0.65, 0.85]) {
        this.cylinder(0.025, 0.025, 0.95, 0x8faab5, [x, 0.75, z]);
        this.sphere([0.08, 0.09, 0.08], 0x0e2331, [x, 0.12, z]);
      }
    const instrumentIds =
      this.mode === "surgeon"
        ? ["scanner", "scalpel", "forceps", "patch", "suture"]
        : ["sensor", "pads", "mask"];
    instrumentIds.forEach((id, i) => {
      const group = new THREE.Group();
      group.position.set(
        1.9 + (i % 2 ? 0.23 : -0.23),
        1.35,
        -0.5 + Math.floor(i / 2) * 0.52,
      );
      group.rotation.y = -0.25;
      this.scene.add(group);
      const material = this.material(
        id === "patch" || id === "mask" ? 0x7bd8c9 : 0xb5d1dc,
        { metalness: 0.7, roughness: 0.3 },
      );
      const handle = this.mesh(
        new THREE.BoxGeometry(0.09, 0.055, 0.38),
        material,
        [0, 0, 0],
        group,
        id,
      );
      handle.userData.draggable = true;
      this.mesh(
        new THREE.SphereGeometry(0.09, 10, 8),
        this.material(PALETTE.teal),
        [0, 0.02, -0.18],
        group,
        id,
      ).userData.draggable = true;
      if (id === "forceps" || id === "suture") {
        for (const dx of [-0.055, 0.055]) {
          const tip = this.mesh(
            new THREE.TorusGeometry(0.052, 0.012, 5, 16),
            material,
            [dx, 0, 0.19],
            group,
            id,
          );
          tip.rotation.x = Math.PI / 2;
          tip.userData.draggable = true;
        }
      }
      if (id === "patch" || id === "pads")
        this.mesh(
          new THREE.BoxGeometry(0.25, 0.025, 0.22),
          material,
          [0, 0.02, -0.12],
          group,
          id,
        ).userData.draggable = true;
    });
    if (this.mode === "surgeon") {
      this.box([0.85, 1.25, 0.8], 0x315165, [-3.25, 0.78, -2.6]);
      this.box([0.65, 0.5, 0.12], 0x0c2435, [-3.25, 1.68, -2.25]);
      this.box(
        [0.54, 0.35, 0.03],
        0x66c5c1,
        [-3.25, 1.68, -2.17],
        undefined,
        null,
        { emissive: 0x26534d },
      );
      for (const x of [-3.45, -3.12])
        this.cylinder(0.12, 0.12, 0.5, 0x89acb6, [x, 1.5, -2.65]);
    }
  }

  buildLights() {
    const armMaterial = this.material(0x7f9aa7, { metalness: 0.55 });
    this.mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.1, 12),
      armMaterial,
      [0, 4.3, -0.5],
    );
    this.box([2.3, 0.09, 0.1], 0x7f9aa7, [0.75, 3.75, -0.5]);
    const lamps =
      this.mode === "surgeon"
        ? [
            [-0.5, 3.4, -0.4],
            [1.4, 3.6, -0.6],
          ]
        : [[0, 3.5, -0.4]];
    lamps.forEach((position) => {
      this.cylinder(0.57, 0.45, 0.17, 0xc1d6d4, position);
      for (let i = 0; i < 7; i++) {
        const angle = (i * Math.PI * 2) / 6;
        this.cylinder(
          0.105,
          0.105,
          0.025,
          0xdcfff2,
          [
            position[0] + Math.cos(angle) * 0.31,
            position[1] - 0.096,
            position[2] + Math.sin(angle) * 0.31,
          ],
          undefined,
          null,
          { emissive: 0x9fffe6, emissiveIntensity: 1.7 },
        );
      }
      const spot = new THREE.SpotLight(0xc7fff2, 25, 9, Math.PI / 5, 0.6, 2);
      spot.position.set(...position);
      spot.target.position.set(0, 1.5, 0);
      this.scene.add(spot, spot.target);
    });
  }

  label(target, title, point) {
    const label = document.createElement("button");
    label.type = "button";
    label.className = "scene-marker";
    label.textContent = title;
    label.setAttribute(
      "aria-label",
      `Осмотреть: ${title.toLocaleLowerCase("ru")}`,
    );
    label.addEventListener("click", () => this.onInteract(target));
    this.container.append(label);
    this.labels.push({ element: label, point });
  }

  pick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(this.interactables, false)[0]
      ?.object;
  }

  pointerDown(event) {
    if (this.manipulating || event.isPrimary === false) return;
    const object = this.pick(event);
    this.press = {
      x: event.clientX,
      y: event.clientY,
      target: object?.userData.target,
      drag: object?.userData.draggable,
    };
    if (this.press.drag) {
      this.controls.enabled = false;
      this.renderer.domElement.setPointerCapture(event.pointerId);
      this.ring.visible = true;
    }
  }

  pointerUp(event) {
    if (!this.press || this.manipulating) return;
    const press = this.press;
    this.press = null;
    const distance = Math.hypot(
      event.clientX - press.x,
      event.clientY - press.y,
    );
    const object = this.pick(event);
    if (press.drag && distance > 9) {
      if (object?.userData.target === "patient")
        this.onInteract("patient", press.target);
      else this.onInteract(press.target, null, "select");
    } else if (distance < 9 && press.target) this.onInteract(press.target);
    this.controls.enabled = true;
    this.ring.visible = Boolean(this.selectedTool);
  }

  setTool(id) {
    this.selectedTool = id;
    this.ring.visible = Boolean(id);
  }
  setStatus(stability, label = this.status) {
    this.stability = stability;
    this.status = label;
  }
  setManipulating(value) {
    this.manipulating = value;
    this.controls.enabled = !value;
  }

  focus(view = "field") {
    const positions = {
      field: [2.8, 4.4, 3],
      room: [5.6, 4.7, 6.2],
      monitor: [-0.2, 2.8, 2.4],
      top: [0.1, 7, 1.3],
    };
    this.transition = {
      from: this.camera.position.clone(),
      to: new THREE.Vector3(...(positions[view] || positions.room)),
      targetFrom: this.controls.target.clone(),
      targetTo: new THREE.Vector3(
        view === "monitor" ? -1.4 : 0,
        1.5,
        view === "monitor" ? -1 : 0,
      ),
      start: performance.now(),
    };
  }

  resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  updateMonitor(time) {
    const c = this.monitorContext;
    if (!c) return;
    c.fillStyle = "#061923";
    c.fillRect(0, 0, 512, 320);
    c.fillStyle = "#78d6ca";
    c.font = "bold 22px sans-serif";
    c.fillText("MEDICAL RP  /  SIM", 22, 34);
    c.fillStyle = this.stability > 40 ? "#56f1c3" : "#ffb782";
    c.font = "bold 70px monospace";
    c.fillText(String(Math.round(this.stability)).padStart(2, "0"), 24, 121);
    c.font = "16px sans-serif";
    c.fillText("СТАБИЛЬНОСТЬ", 145, 93);
    c.fillText(this.status.slice(0, 21), 24, 290);
    c.strokeStyle = "#173e4c";
    c.lineWidth = 1;
    for (let x = 0; x < 512; x += 24) {
      c.beginPath();
      c.moveTo(x, 145);
      c.lineTo(x, 255);
      c.stroke();
    }
    c.strokeStyle = "#58f4c9";
    c.lineWidth = 3;
    c.beginPath();
    for (let x = 0; x < 512; x += 3) {
      const beat = ((x + time * 95) % 145) / 145;
      const y =
        204 +
        Math.sin(x * 0.06 + time) * 3 -
        Math.exp(-((beat - 0.44) ** 2) / 0.0007) * 44 +
        Math.exp(-((beat - 0.49) ** 2) / 0.0005) * 22;
      if (!x) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    this.monitorTexture.needsUpdate = true;
  }

  tick(now) {
    if (this.disposed) return;
    const time = (now - this.clockStart) / 1000;
    if (this.transition) {
      const p = Math.min(1, (now - this.transition.start) / 650);
      const eased = 1 - (1 - p) ** 3;
      this.camera.position.lerpVectors(
        this.transition.from,
        this.transition.to,
        eased,
      );
      this.controls.target.lerpVectors(
        this.transition.targetFrom,
        this.transition.targetTo,
        eased,
      );
      if (p === 1) this.transition = null;
    }
    this.controls.update();
    this.torso.scale.y = 0.22 + Math.sin(time * 1.5) * 0.009;
    if (this.ring.visible)
      this.ring.material.emissiveIntensity = 0.7 + Math.sin(time * 3) * 0.3;
    if (
      !this.lastMonitor ||
      now - this.lastMonitor > (this.quality === "low" ? 160 : 80)
    ) {
      this.updateMonitor(time);
      this.lastMonitor = now;
    }
    this.camera.updateMatrixWorld();
    for (const { element, point } of this.labels) {
      const projected = point.clone().project(this.camera);
      element.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
      element.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
      element.style.display =
        projected.z > 1 ||
        Math.abs(projected.x) > 0.96 ||
        Math.abs(projected.y) > 0.97
          ? "none"
          : "";
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.renderer.domElement.removeEventListener("pointerdown", this.boundDown);
    this.renderer.domElement.removeEventListener("pointerup", this.boundUp);
    this.renderer.domElement.removeEventListener(
      "pointercancel",
      this.boundCancel,
    );
    this.controls.dispose();
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.container.remove();
  }
}

const frac = (n) => n - Math.floor(n);
const seeded = (seed) => (index) =>
  frac(Math.sin(seed * 13.117 + index * 78.233) * 43758.5453);

/** Enlarged, non-graphic training field. Coordinates are normalized for any screen size. */
export class PrecisionField {
  constructor(
    host,
    {
      kind = "trace",
      seed = 1,
      difficulty = "easy",
      initial = {},
      onProgress = () => {},
      onError = () => {},
      onComplete = () => {},
    } = {},
  ) {
    this.host = host;
    this.kind = kind;
    this.random = seeded(seed);
    this.difficulty = difficulty;
    this.onProgress = onProgress;
    this.onError = onError;
    this.onComplete = onComplete;
    this.progress = initial.progress || 0;
    this.index = initial.index || 0;
    this.angle = initial.angle || 0;
    this.object = initial.object || { x: 0.29, y: 0.7 };
    this.tolerance =
      difficulty === "hard" ? 0.047 : difficulty === "medium" ? 0.061 : 0.083;
    this.start = performance.now();
    this.last = this.start;
    this.done = false;
    this.targetAngle = (this.random(4) * 1.5 + 0.25) * Math.PI;
    this.nodes = Array.from(
      { length: kind === "stitch" ? 10 : 35 },
      (_, i, list) => {
        const t = i / ((kind === "stitch" ? 10 : 35) - 1);
        return kind === "stitch"
          ? { x: 0.22 + t * 0.56, y: i % 2 ? 0.62 : 0.38 }
          : {
              x: 0.16 + t * 0.68,
              y:
                0.5 +
                Math.sin(t * Math.PI * 2 + this.random(2) * 2) * 0.18 +
                Math.sin(t * Math.PI * 4) * 0.055,
            };
      },
    );
    this.goal = { x: 0.8, y: 0.28 };
    this.obstacles = [
      { x: 0.48, y: 0.49, r: 0.08 },
      { x: 0.65, y: 0.7, r: 0.1 },
    ];
    this.element = document.createElement("div");
    this.element.className = "precision-field";
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute(
      "aria-label",
      {
        trace:
          "Проведите инструментом по светящейся траектории от начальной точки",
        stitch: "Соедините пронумерованные точки шва по порядку",
        extract: "Перенесите светящийся объект в контейнер, обходя препятствия",
        align: "Поверните сегмент до совпадения с контуром и отпустите",
        hold: "Удерживайте палец на движущемся маркере",
      }[kind],
    );
    this.element.append(this.canvas);
    host.append(this.element);
    this.context = this.canvas.getContext("2d");
    this.down = (e) => this.pointerDown(e);
    this.move = (e) => this.pointerMove(e);
    this.up = (e) => this.pointerUp(e);
    this.canvas.addEventListener("pointerdown", this.down);
    this.canvas.addEventListener("pointermove", this.move);
    this.canvas.addEventListener("pointerup", this.up);
    this.canvas.addEventListener("pointercancel", this.up);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.element);
    this.resize();
    this.draw = this.draw.bind(this);
    this.frame = requestAnimationFrame(this.draw);
  }

  resize() {
    this.width = Math.max(1, this.element.clientWidth);
    this.height = Math.max(1, this.element.clientHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  position(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  distance(a, b) {
    return Math.hypot(a.x - b.x, (a.y - b.y) * 0.7);
  }
  distanceToSegment(point, a, b) {
    const dx = b.x - a.x,
      dy = (b.y - a.y) * 0.7;
    const fraction = Math.max(
      0,
      Math.min(
        1,
        ((point.x - a.x) * dx + (point.y - a.y) * 0.7 * dy) /
          (dx * dx + dy * dy || 1),
      ),
    );
    return this.distance(point, {
      x: a.x + fraction * dx,
      y: a.y + fraction * (b.y - a.y),
    });
  }
  error(message) {
    if (performance.now() - (this.lastError || 0) > 1000) {
      this.lastError = performance.now();
      this.onError(message);
    }
  }

  pointerDown(event) {
    if (this.done || this.pointerId != null) return;
    event.preventDefault();
    this.pointerId = event.pointerId;
    this.point = this.position(event);
    this.canvas.setPointerCapture(event.pointerId);
    if (
      (this.kind === "trace" || this.kind === "stitch") &&
      this.distance(
        this.point,
        this.nodes[Math.min(this.index, this.nodes.length - 1)],
      ) >
        this.tolerance * 1.8
    ) {
      this.error("Начните с подсвеченной точки.");
      return;
    }
    if (
      this.kind === "extract" &&
      this.distance(this.point, this.object) > this.tolerance * 1.8
    )
      return;
    this.active = true;
    this.pointerMove(event);
  }

  pointerMove(event) {
    if (event.pointerId !== this.pointerId || !this.active || this.done) return;
    event.preventDefault();
    this.point = this.position(event);
    if (this.kind === "trace" || this.kind === "stitch") {
      let advanced = false;
      while (
        this.index < this.nodes.length &&
        this.distance(this.point, this.nodes[this.index]) < this.tolerance
      ) {
        this.index++;
        advanced = true;
      }
      if (advanced) {
        this.progress = this.index / this.nodes.length;
        this.emit();
      } else if (
        this.index &&
        this.distanceToSegment(
          this.point,
          this.nodes[this.index - 1],
          this.nodes[Math.min(this.index, this.nodes.length - 1)],
        ) >
          this.tolerance * 1.5
      )
        this.error("Точность снижена: вернитесь к светящейся точке.");
      if (this.index >= this.nodes.length) this.complete();
    } else if (this.kind === "extract") {
      const next = {
        x: Math.max(0.08, Math.min(0.92, this.point.x)),
        y: Math.max(0.12, Math.min(0.88, this.point.y)),
      };
      if (this.obstacles.some((o) => this.distance(o, next) < o.r + 0.018)) {
        this.error("Не касайтесь защитных зон.");
        return;
      }
      if (this.distance(next, this.object) > 0.15) return;
      this.object = next;
      this.progress = Math.max(
        this.progress,
        1 - this.distance(next, this.goal) / 0.65,
      );
      this.emit();
      if (this.distance(next, this.goal) < 0.065) this.complete();
    } else if (this.kind === "align") {
      this.angle = Math.atan2((this.point.y - 0.5) * 0.7, this.point.x - 0.5);
      const diff = Math.abs(
        Math.atan2(
          Math.sin(this.angle - this.targetAngle),
          Math.cos(this.angle - this.targetAngle),
        ),
      );
      this.progress = Math.max(0, 1 - diff / Math.PI);
      this.emit();
    }
  }

  pointerUp(event) {
    if (event.pointerId !== this.pointerId) return;
    if (this.kind === "align" && this.active) {
      const diff = Math.abs(
        Math.atan2(
          Math.sin(this.angle - this.targetAngle),
          Math.cos(this.angle - this.targetAngle),
        ),
      );
      if (
        diff <
        (this.difficulty === "hard"
          ? 0.11
          : this.difficulty === "medium"
            ? 0.17
            : 0.24)
      )
        this.complete();
      else this.error("Контуры ещё не совпали. Поверните сегмент точнее.");
    }
    this.active = false;
    this.pointerId = null;
    this.emit();
  }

  emit() {
    this.onProgress({
      progress: this.progress,
      index: this.index,
      angle: this.angle,
      object: this.object,
    });
  }
  complete() {
    if (this.done) return;
    this.done = true;
    this.progress = 1;
    this.emit();
    this.onComplete();
  }

  draw(now) {
    if (this.destroyed) return;
    const dt = document.hidden ? 0 : Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    const c = this.context,
      w = this.width,
      h = this.height;
    const time = (now - this.start) / 1000;
    c.clearRect(0, 0, w, h);
    const gradient = c.createRadialGradient(
      w / 2,
      h / 2,
      10,
      w / 2,
      h / 2,
      w * 0.65,
    );
    gradient.addColorStop(0, "#123b47");
    gradient.addColorStop(1, "#061b2b");
    c.fillStyle = gradient;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#204552";
    c.lineWidth = 1;
    for (let x = 0; x < w; x += 28) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let y = 0; y < h; y += 28) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    c.strokeStyle = "#3d8f8a";
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(w / 2, h / 2, w * 0.43, h * 0.37, 0, 0, Math.PI * 2);
    c.stroke();
    const point = (p, radius, color, stroke = false) => {
      c.beginPath();
      c.ellipse(p.x * w, p.y * h, radius * w, radius * w, 0, 0, Math.PI * 2);
      if (stroke) {
        c.strokeStyle = color;
        c.lineWidth = 2;
        c.stroke();
      } else {
        c.fillStyle = color;
        c.fill();
      }
    };
    if (this.kind === "trace" || this.kind === "stitch") {
      c.strokeStyle = "#7fc1c0";
      c.lineWidth = this.kind === "stitch" ? 2 : 5;
      c.setLineDash([5, 7]);
      c.beginPath();
      this.nodes.forEach((p, i) => {
        if (!i) c.moveTo(p.x * w, p.y * h);
        else c.lineTo(p.x * w, p.y * h);
      });
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = "#5cf7cc";
      c.lineWidth = 5;
      c.beginPath();
      this.nodes.slice(0, this.index).forEach((p, i) => {
        if (!i) c.moveTo(p.x * w, p.y * h);
        else c.lineTo(p.x * w, p.y * h);
      });
      c.stroke();
      this.nodes.forEach((p, i) => {
        if (
          this.kind === "trace" &&
          i % 4 &&
          i !== this.index &&
          i !== this.nodes.length - 1
        )
          return;
        point(
          p,
          i === this.index ? 0.025 : 0.012,
          i < this.index ? "#54f6c6" : i === this.index ? "#fff1c4" : "#6f999d",
        );
        if (this.kind === "stitch") {
          c.fillStyle = "#d8f7ed";
          c.font = "bold 12px sans-serif";
          c.fillText(String(i + 1), p.x * w - 3, p.y * h - 14);
        }
      });
    } else if (this.kind === "extract") {
      this.obstacles.forEach((obstacle) => {
        point(obstacle, obstacle.r, "#552f47");
        point(obstacle, obstacle.r, "#ed8d9e", true);
      });
      point(this.goal, 0.07, "#58dcca", true);
      point(this.goal, 0.052, "#1d6b65");
      c.fillStyle = "#bceee2";
      c.font = "12px sans-serif";
      c.fillText("КОНТЕЙНЕР", this.goal.x * w - 30, this.goal.y * h - w * 0.09);
      point(this.object, 0.035, "#fff0bd");
      point(this.object, 0.05, "#f8cc7d", true);
    } else if (this.kind === "align") {
      const segment = (angle, color, dashed) => {
        c.save();
        c.translate(w / 2, h / 2);
        c.rotate(angle);
        c.strokeStyle = color;
        c.lineWidth = 4;
        c.setLineDash(dashed ? [7, 7] : []);
        c.beginPath();
        c.moveTo(-w * 0.22, -h * 0.065);
        c.lineTo(w * 0.15, -h * 0.065);
        c.lineTo(w * 0.22, 0);
        c.lineTo(w * 0.15, h * 0.065);
        c.lineTo(-w * 0.22, h * 0.065);
        c.closePath();
        c.stroke();
        c.restore();
      };
      point({ x: 0.5, y: 0.5 }, 0.28, "#316a74", true);
      segment(this.targetAngle, "#d7fff0", true);
      segment(this.angle, this.progress > 0.96 ? "#6df4cb" : "#e8bd76", false);
      c.fillStyle = "#a6cbd0";
      c.font = "12px sans-serif";
      c.textAlign = "center";
      c.fillText("ПОВЕРНИТЕ • СОВМЕСТИТЕ • ОТПУСТИТЕ", w / 2, h * 0.91);
      c.textAlign = "left";
    } else if (this.kind === "hold") {
      this.movingTarget = {
        x: 0.5 + Math.sin(time * 0.75) * 0.23,
        y: 0.5 + Math.cos(time * 0.91) * 0.16,
      };
      point(this.movingTarget, this.tolerance * 1.25, "#39d0b7", true);
      point(this.movingTarget, 0.024, "#e0fff0");
      if (this.active && this.point) {
        const inside =
          this.distance(this.point, this.movingTarget) < this.tolerance * 1.4;
        if (inside)
          this.progress = Math.min(
            1,
            this.progress +
              dt /
                (this.difficulty === "hard"
                  ? 10
                  : this.difficulty === "medium"
                    ? 8
                    : 6),
          );
        else {
          this.progress = Math.max(0, this.progress - dt * 0.025);
          this.error("Сопровождайте светящийся маркер инструментом.");
        }
        point(this.point, 0.018, inside ? "#7effda" : "#ffb7ac");
        if (now - (this.lastEmit || 0) > 350) {
          this.lastEmit = now;
          this.emit();
        }
        if (this.progress >= 1) this.complete();
      }
    }
    c.fillStyle = "#a9d1d5";
    c.font = "11px monospace";
    c.fillText("VIRTUAL TRAINING FIELD", 16, 24);
    c.textAlign = "right";
    c.fillStyle = "#67e9cf";
    c.fillText(`${Math.round(this.progress * 100)}%`, w - 16, 24);
    c.textAlign = "left";
    this.frame = requestAnimationFrame(this.draw);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.canvas.removeEventListener("pointerdown", this.down);
    this.canvas.removeEventListener("pointermove", this.move);
    this.canvas.removeEventListener("pointerup", this.up);
    this.canvas.removeEventListener("pointercancel", this.up);
    this.element.remove();
  }
}

export function webglFallback(session) {
  session.paused = true;
  const card = document.createElement("div");
  card.className = "webgl-fallback";
  const title = document.createElement("h3");
  title.textContent = "Не удалось включить 3D";
  const description = document.createElement("p");
  description.textContent =
    "Этой миссии нужен WebGL. Включите аппаратное ускорение и обновите браузер. Сессия сохранена в этом браузере: вернитесь в центр и продолжите после включения WebGL.";
  card.append(title, description);
  session.scene.append(card);
  session.setObjective(
    "WebGL недоступен. Вы можете вернуться в игровой центр.",
  );
}
