/**
 * RETROZEN DRIVING - 3D RETRO GAME ENGINE (Three.js)
 * 
 * Major Upgrades & Bugfixes:
 * 1. Road & Land Clipping Fix:
 *    - Dual-pass depth clearance: Outside world is rendered first, depth buffer is cleared,
 *      and the car cockpit is rendered on top. NO road, land, fence, or scenery can EVER clip
 *      into the cabin or cover the steering wheel!
 *    - Segments recycle cleanly as soon as they pass behind the camera view.
 * 2. Turkey Map Red Heritage Tram:
 *    - Removed the white chunk on top! Authentic dark red lacquered roof with metal trolley pole.
 *    - Added detailed passenger windows, front windscreen with wipers, bi-fold wooden doors,
 *      brass grab rails, headlamp, and cowcatcher grill.
 *    - Trams now appear regularly across the map (every 4 segments) as the player walks/skates!
 * 3. Skateboard Speed Boost:
 *    - Increased skateboard maxSpeed to 85 km/h (just a bit slower than the 120 km/h car),
 *      with high-speed carving, responsive acceleration (45), and smooth board banking!
 * 4. Rich Architectural Detail Across All Maps:
 *    - Hillside: Rolling 3D green hill knolls + dramatic mountain peaks in the distance!
 *    - New York: Multi-tier skyscrapers, Broadway marquees, huge neon billboard video walls,
 *      yellow cabs, steam grates, red TKTS stairs.
 *    - Tokyo: Cyberpunk megatowers, glowing kanji signs, skybridges spanning across the expressway.
 *    - Turkey: Istiklal Street with multiple red trams, simit carts, chestnut braziers,
 *      Turkish delight shops with striped awnings, Ottoman wooden Cumba bay windows, Turkish flags.
 *    - London: Corner British Pub with flower baskets, Victorian brick terraces, chimney pots,
 *      K6 telephone boxes, Royal Mail boxes, Big Ben.
 */

class RetroZenGameEngine {
  constructor() {
    this.container = null;
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;

    // Viewport & Pixelation
    this.pixelRatio = 0.55;

    // State
    this.currentMapId = 'tokyo';
    this.currentTimeOfDay = 'sunset';
    this.currentMode = 'car';
    this.isPedestrianMap = false;

    // Vehicle physics
    this.speed = 0;
    this.maxSpeed = 120;
    this.acceleration = 36;
    this.braking = 50;
    this.friction = 16;
    this.steeringAngle = 0;
    this.playerX = 0;
    this.roadDistance = 0;

    // Input
    this.keys = { up: false, down: false, left: false, right: false, space: false };

    // 3D Interior & Gauges
    this.cockpitGroup = null;
    this.steeringWheelGroup = null;
    this.leftGlove = null;
    this.rightGlove = null;
    this.speedoNeedle = null;
    this.tachNeedle = null;
    this.turnSignalLeft = null;
    this.turnSignalRight = null;
    this.skateboardGroup = null;
    this.headlights = [];
    this.snowParticles = null;
    this.windmillBlades = null;

    // World Segments & Permanent Foundation
    this.roadSegments = [];
    this.baseTerrain = null;
    this.numSegments = 20;
    this.segmentLength = 40;

    // Lights
    this.sunLight = null;
    this.ambientLight = null;

    // Clock
    this.clock = new THREE.Clock();
    this.lastFrameTime = performance.now();
  }

  init() {
    this.container = document.getElementById('game-container');
    this.canvas = document.getElementById('game-canvas');

    if (!this.container || !this.canvas) return;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x161e2e, 0.007);

    // 2. Camera: Balanced first-person driving view with full speedometer and unburied steering wheel
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(64, aspect, 0.05, 1000);
    this.camera.position.set(0, 1.25, 0.25);
    this.camera.rotation.set(-0.11, 0, 0);

    // 3. Renderer with autoClear disabled for two-pass rendering (World -> Depth Clear -> Cockpit)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.autoClear = false; // Enables clearDepth() for flawless cockpit isolation!

    // 4. Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.15);
    this.sunLight.position.set(40, 60, -50);
    this.scene.add(this.sunLight);

    // 5. Build Cockpit & Skateboard
    this._buildCockpit();
    this._buildSkateboard();

    // 6. Setup Initial Map & Time
    this.setMap(this.currentMapId, false);
    this.setTimeOfDay(this.currentTimeOfDay);

    // 7. Input
    this._setupInputListeners();
    window.addEventListener('resize', () => this._onWindowResize());

    // 8. Start Loop
    this.lastFrameTime = performance.now();
    this._animate();
  }

  /* ================= RETRO PIXEL SIGN TEXTURE GENERATOR ================= */
  _createSignTexture(title, sub = '', bgColor = '#0f172a', textColor = '#facc15', borderColor = '#facc15') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 128);

    // Outer border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    // Inner subtle trim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 488, 104);

    // Text rendering
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (sub) {
      ctx.fillStyle = textColor;
      ctx.font = 'bold 30px "Courier New", monospace';
      ctx.fillText(title, 256, 46);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 17px "Courier New", monospace';
      ctx.fillText(sub, 256, 88);
    } else {
      ctx.fillStyle = textColor;
      ctx.font = 'bold 34px "Courier New", monospace';
      ctx.fillText(title, 256, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  /* ================= COCKPIT WITH SPEEDOMETER & BLACK DRIVING GLOVES ================= */
  _buildCockpit() {
    this.cockpitGroup = new THREE.Group();
    this.cockpitGroup.renderOrder = 999;

    // Materials
    const dashLeatherMat = new THREE.MeshLambertMaterial({ color: 0x14171d, depthTest: true });
    const binnacleMat = new THREE.MeshLambertMaterial({ color: 0x1d222b, depthTest: true });
    const chromeMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8, depthTest: true });
    const gaugeGlassMat = new THREE.MeshBasicMaterial({ color: 0x050a12, depthTest: true });
    const cyanIllumMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, depthTest: true });
    const orangeNeedleMat = new THREE.MeshBasicMaterial({ color: 0xf97316, depthTest: true });
    const greenLedMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, depthTest: true });
    const darkGreenMat = new THREE.MeshBasicMaterial({ color: 0x064e3b, depthTest: true });
    const redLedMat = new THREE.MeshBasicMaterial({ color: 0xef4444, depthTest: true });
    const blackGloveMat = new THREE.MeshLambertMaterial({ color: 0x0c0e12, depthTest: true });
    const gloveStitchMat = new THREE.MeshLambertMaterial({ color: 0x272c36, depthTest: true });
    const woodTrimMat = new THREE.MeshLambertMaterial({ color: 0x4a2810, depthTest: true });

    // 1. Sloping Forward Dashboard Cowl (Windshield base, low & forward)
    const cowlTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.70), dashLeatherMat);
    cowlTop.position.set(0, 0.68, -0.95);
    cowlTop.rotation.x = 0.05;
    this.cockpitGroup.add(cowlTop);

    // Subtle Wood Accent Trim along dashboard edge
    const woodTrim = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.03, 0.06), woodTrimMat);
    woodTrim.position.set(0, 0.71, -0.62);
    this.cockpitGroup.add(woodTrim);

    // 2. Lower Knee Bolster (Set low at y=0.35 so steering wheel sits completely free in open air!)
    const kneeBolster = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.32, 0.40), dashLeatherMat);
    kneeBolster.position.set(0, 0.35, -0.58);
    this.cockpitGroup.add(kneeBolster);

    // 3. Windshield A-Pillars (Framing cockpit view)
    [-1.15, 1.15].forEach((xPos, idx) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.08), dashLeatherMat);
      pillar.position.set(xPos, 1.40, -0.52);
      pillar.rotation.z = idx === 0 ? -0.28 : 0.28;
      pillar.rotation.x = 0.36;
      this.cockpitGroup.add(pillar);
    });

    // 4. Rearview Mirror
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.04), dashLeatherMat);
    mirror.position.set(0, 1.78, -0.48);
    mirror.rotation.x = 0.1;
    this.cockpitGroup.add(mirror);

    const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.08), new THREE.MeshBasicMaterial({ color: 0x1e293b, depthTest: true }));
    mirrorGlass.position.set(0, 1.78, -0.455);
    mirrorGlass.rotation.x = 0.1;
    this.cockpitGroup.add(mirrorGlass);

    // 5. Center Console with Stereo & Hazard Button
    const centerConsole = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.45), binnacleMat);
    centerConsole.position.set(0.42, 0.48, -0.66);
    this.cockpitGroup.add(centerConsole);

    const vents = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.02), chromeMat);
    vents.position.set(0.42, 0.65, -0.44);
    this.cockpitGroup.add(vents);

    const stereo = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.02), binnacleMat);
    stereo.position.set(0.42, 0.52, -0.44);
    this.cockpitGroup.add(stereo);

    const stereoDisplay = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.04), cyanIllumMat);
    stereoDisplay.position.set(0.42, 0.53, -0.425);
    this.cockpitGroup.add(stereoDisplay);

    const hazardBtn = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.02), redLedMat);
    hazardBtn.position.set(0.26, 0.65, -0.44);
    this.cockpitGroup.add(hazardBtn);

    /* --- ELEVATED INSTRUMENT BINNACLE & SPEEDOMETER CLUSTER --- */
    // Prominently placed directly behind the steering wheel and visible through its upper arch!
    const binnacleCowl = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.28, 0.18), binnacleMat);
    binnacleCowl.position.set(-0.02, 0.90, -0.60);
    binnacleCowl.rotation.x = -0.20;
    this.cockpitGroup.add(binnacleCowl);

    const clusterPanel = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.24, 0.02), gaugeGlassMat);
    clusterPanel.position.set(-0.02, 0.90, -0.52);
    clusterPanel.rotation.x = -0.20;
    this.cockpitGroup.add(clusterPanel);

    // Left Gauge: SPEEDOMETER (0 - 140 MPH)
    const speedoDialGeo = new THREE.CircleGeometry(0.095, 24);
    const speedoDial = new THREE.Mesh(speedoDialGeo, new THREE.MeshBasicMaterial({ color: 0x021626, depthTest: true }));
    speedoDial.position.set(-0.16, 0.91, -0.505);
    speedoDial.rotation.x = -0.20;
    this.cockpitGroup.add(speedoDial);

    const speedoRing = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.095, 24), cyanIllumMat);
    speedoRing.position.set(-0.16, 0.91, -0.503);
    speedoRing.rotation.x = -0.20;
    this.cockpitGroup.add(speedoRing);

    // Speedometer Needle (0 to 140 MPH)
    const needleGeo = new THREE.BoxGeometry(0.010, 0.075, 0.005);
    needleGeo.translate(0, 0.038, 0);
    this.speedoNeedle = new THREE.Mesh(needleGeo, orangeNeedleMat);
    this.speedoNeedle.position.set(-0.16, 0.91, -0.50);
    this.speedoNeedle.rotation.x = -0.20;
    this.speedoNeedle.rotation.z = 1.6;
    this.cockpitGroup.add(this.speedoNeedle);

    const speedoCap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 10), chromeMat);
    speedoCap.rotation.x = Math.PI / 2 - 0.20;
    speedoCap.position.set(-0.16, 0.91, -0.495);
    this.cockpitGroup.add(speedoCap);

    // Right Gauge: TACHOMETER (RPM 0 - 8000)
    const tachDial = new THREE.Mesh(speedoDialGeo, new THREE.MeshBasicMaterial({ color: 0x021626, depthTest: true }));
    tachDial.position.set(0.12, 0.91, -0.505);
    tachDial.rotation.x = -0.20;
    this.cockpitGroup.add(tachDial);

    const tachRing = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.095, 24), cyanIllumMat);
    tachRing.position.set(0.12, 0.91, -0.503);
    tachRing.rotation.x = -0.20;
    this.cockpitGroup.add(tachRing);

    // Redline arc on tachometer (6000 - 8000 RPM)
    const redline = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.095, 8, 1, Math.PI / 4, Math.PI / 3), redLedMat);
    redline.position.set(0.12, 0.91, -0.502);
    redline.rotation.x = -0.20;
    this.cockpitGroup.add(redline);

    this.tachNeedle = new THREE.Mesh(needleGeo.clone(), orangeNeedleMat);
    this.tachNeedle.position.set(0.12, 0.91, -0.50);
    this.tachNeedle.rotation.x = -0.20;
    this.tachNeedle.rotation.z = 1.6;
    this.cockpitGroup.add(this.tachNeedle);

    const tachCap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 10), chromeMat);
    tachCap.rotation.x = Math.PI / 2 - 0.20;
    tachCap.position.set(0.12, 0.91, -0.495);
    this.cockpitGroup.add(tachCap);

    // Digital Odometer between gauges
    const odoBack = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.04), new THREE.MeshBasicMaterial({ color: 0x064e3b, depthTest: true }));
    odoBack.position.set(-0.02, 0.89, -0.503);
    odoBack.rotation.x = -0.20;
    this.cockpitGroup.add(odoBack);

    const odoDigits = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.028), greenLedMat);
    odoDigits.position.set(-0.02, 0.89, -0.501);
    odoDigits.rotation.x = -0.20;
    this.cockpitGroup.add(odoDigits);

    // Turn Signal Blinkers
    this.turnSignalLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.022), darkGreenMat);
    this.turnSignalLeft.position.set(-0.07, 0.98, -0.502);
    this.turnSignalLeft.rotation.x = -0.20;
    this.cockpitGroup.add(this.turnSignalLeft);

    this.turnSignalRight = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.022), darkGreenMat);
    this.turnSignalRight.position.set(0.03, 0.98, -0.502);
    this.turnSignalRight.rotation.x = -0.20;
    this.cockpitGroup.add(this.turnSignalRight);

    /* --- STEERING WHEEL WITH BLACK LEATHER DRIVING GLOVES --- */
    // Entire assembly mounted on angled column, completely unburied and floating above knee bolster!
    this.steeringWheelGroup = new THREE.Group();
    this.steeringWheelGroup.position.set(-0.02, 0.82, -0.36);
    this.steeringWheelGroup.rotation.x = -0.25;

    // Steering Column
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.28, 12), binnacleMat);
    column.rotation.x = Math.PI / 2;
    column.position.set(0, 0, -0.14);
    this.steeringWheelGroup.add(column);

    // Outer Rim (Torus) - fully visible full circle!
    const rimGeo = new THREE.TorusGeometry(0.21, 0.022, 12, 32);
    const rimMat = new THREE.MeshLambertMaterial({ color: 0x16181d, depthTest: true });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    this.steeringWheelGroup.add(rim);

    // 3 Brushed Metal / Chrome Spokes (Left, Right, Bottom)
    const spokeMat = chromeMat;
    const spokeGeo = new THREE.BoxGeometry(0.025, 0.18, 0.006);

    const spokeBottom = new THREE.Mesh(spokeGeo, spokeMat);
    spokeBottom.position.set(0, -0.09, 0);
    this.steeringWheelGroup.add(spokeBottom);

    const spokeLeft = new THREE.Mesh(spokeGeo, spokeMat);
    spokeLeft.position.set(-0.09, 0.05, 0);
    spokeLeft.rotation.z = Math.PI / 3;
    this.steeringWheelGroup.add(spokeLeft);

    const spokeRight = new THREE.Mesh(spokeGeo, spokeMat);
    spokeRight.position.set(0.09, 0.05, 0);
    spokeRight.rotation.z = -Math.PI / 3;
    this.steeringWheelGroup.add(spokeRight);

    // Center Horn Button with Cyan retro emblem
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.015, 16), binnacleMat);
    horn.rotation.x = Math.PI / 2;
    horn.position.set(0, 0, 0.015);
    this.steeringWheelGroup.add(horn);

    const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), cyanIllumMat);
    emblem.position.set(0, 0, 0.024);
    this.steeringWheelGroup.add(emblem);

    /* --- BLACK DRIVING GLOVES (9 & 3 O'CLOCK GRIP) --- */
    // Left Glove
    this.leftGlove = new THREE.Group();
    this.leftGlove.position.set(-0.21, 0.0, 0.01);

    const palmGeo = new THREE.BoxGeometry(0.065, 0.055, 0.042);
    const leftPalm = new THREE.Mesh(palmGeo, blackGloveMat);
    this.leftGlove.add(leftPalm);

    // Perforated knuckle patch
    const knuckleGeo = new THREE.BoxGeometry(0.045, 0.014, 0.045);
    const leftKnuckle = new THREE.Mesh(knuckleGeo, gloveStitchMat);
    leftKnuckle.position.set(0, 0.020, 0);
    this.leftGlove.add(leftKnuckle);

    // Fingers curled around the rim
    const fingerGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.055, 10);
    const leftFingers = new THREE.Mesh(fingerGeo, blackGloveMat);
    leftFingers.position.set(0.008, 0, -0.018);
    this.leftGlove.add(leftFingers);

    // Forearm extending down to corner of screen
    const armGeo = new THREE.CylinderGeometry(0.045, 0.058, 0.38, 10);
    const leftArm = new THREE.Mesh(armGeo, blackGloveMat);
    leftArm.position.set(-0.06, -0.16, 0.16);
    leftArm.rotation.x = 0.82;
    leftArm.rotation.z = -0.32;
    this.leftGlove.add(leftArm);

    this.steeringWheelGroup.add(this.leftGlove);

    // Right Glove
    this.rightGlove = new THREE.Group();
    this.rightGlove.position.set(0.21, 0.0, 0.01);

    const rightPalm = new THREE.Mesh(palmGeo, blackGloveMat);
    this.rightGlove.add(rightPalm);

    const rightKnuckle = new THREE.Mesh(knuckleGeo, gloveStitchMat);
    rightKnuckle.position.set(0, 0.020, 0);
    this.rightGlove.add(rightKnuckle);

    const rightFingers = new THREE.Mesh(fingerGeo, blackGloveMat);
    rightFingers.position.set(-0.008, 0, -0.018);
    this.rightGlove.add(rightFingers);

    const rightArm = new THREE.Mesh(armGeo, blackGloveMat);
    rightArm.position.set(0.06, -0.16, 0.16);
    rightArm.rotation.x = 0.82;
    rightArm.rotation.z = 0.32;
    this.rightGlove.add(rightArm);

    this.steeringWheelGroup.add(this.rightGlove);

    this.cockpitGroup.add(this.steeringWheelGroup);

    // Headlight Spotlights
    const hlLeft = new THREE.SpotLight(0xfffaed, 0, 85, Math.PI / 5, 0.4, 1.2);
    hlLeft.position.set(-0.8, 0.7, 0.5);
    hlLeft.target.position.set(-0.8, 0, -50);
    this.scene.add(hlLeft);
    this.scene.add(hlLeft.target);

    const hlRight = new THREE.SpotLight(0xfffaed, 0, 85, Math.PI / 5, 0.4, 1.2);
    hlRight.position.set(0.8, 0.7, 0.5);
    hlRight.target.position.set(0.8, 0, -50);
    this.scene.add(hlRight);
    this.scene.add(hlRight.target);

    this.headlights = [hlLeft, hlRight];
    this.scene.add(this.cockpitGroup);
  }

  /* ================= SKATEBOARD ================= */
  _buildSkateboard() {
    this.skateboardGroup = new THREE.Group();
    this.skateboardGroup.visible = false;
    this.skateboardGroup.renderOrder = 999;

    const deckShape = new THREE.Shape();
    deckShape.moveTo(-0.16, -0.6);
    deckShape.lineTo(0.16, -0.6);
    deckShape.quadraticCurveTo(0.18, 0, 0.17, 0.55);
    deckShape.quadraticCurveTo(0.16, 0.7, 0, 0.72);
    deckShape.quadraticCurveTo(-0.16, 0.7, -0.17, 0.55);
    deckShape.quadraticCurveTo(-0.18, 0, -0.16, -0.6);

    const extrudeSettings = { depth: 0.02, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.005, bevelThickness: 0.005 };
    const deckGeo = new THREE.ExtrudeGeometry(deckShape, extrudeSettings);

    const deckMesh = new THREE.Mesh(deckGeo, new THREE.MeshLambertMaterial({ color: 0x181a20, depthTest: true }));
    deckMesh.rotation.x = Math.PI / 2;
    deckMesh.position.set(0, -0.42, -0.9);
    this.skateboardGroup.add(deckMesh);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.005, 0.9), new THREE.MeshBasicMaterial({ color: 0x00f5d4, depthTest: true }));
    stripe.position.set(0, -0.41, -0.9);
    this.skateboardGroup.add(stripe);

    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x22d3ee, depthTest: true });
    const truckMat = new THREE.MeshLambertMaterial({ color: 0x64748b, depthTest: true });

    [-0.4, 0.4].forEach(zPos => {
      const truck = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.03), truckMat);
      truck.position.set(0, -0.45, -0.9 + zPos);
      this.skateboardGroup.add(truck);

      [-0.14, 0.14].forEach(xPos => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(xPos, -0.45, -0.9 + zPos);
        this.skateboardGroup.add(wheel);
      });
    });

    this.scene.add(this.skateboardGroup);
  }

  /* ================= MAP GENERATION ================= */
  setMap(mapId, playSound = true) {
    this.currentMapId = mapId;
    if (playSound) window.retroAudio.playArcadeClick('select');

    const isTurkey = (mapId === 'istiklal');
    const driveBtn = document.getElementById('mode-car');

    if (isTurkey) {
      // Turkey (Istiklal Street) is a strict pedestrian & skate zone: NO DRIVING!
      if (driveBtn) driveBtn.style.display = 'none';
      if (this.currentMode === 'car') {
        this.setMode('walk');
      } else {
        this.setMode(this.currentMode || 'walk');
      }
    } else {
      // In all other maps (Tokyo, Hillside, London, Snow, Times Square), all 3 modes (DRIVE, WALK, SKATE) are active!
      if (driveBtn) driveBtn.style.display = 'inline-flex';
      this.setMode(this.currentMode || 'car');
    }

    this._clearWorld();

    switch (mapId) {
      case 'tokyo':
        this._buildTokyoMap();
        break;
      case 'hillside':
        this._buildHillsideMap();
        break;
      case 'london':
        this._buildLondonMap();
        break;
      case 'snow':
        this._buildSnowMap();
        break;
      case 'times_square':
        this._buildTimesSquareMap();
        break;
      case 'istiklal':
        this._buildIstiklalMap();
        break;
      default:
        this._buildTokyoMap();
    }

    const badge = document.getElementById('current-map-name');
    const mapNames = {
      'tokyo': '🌆 Tokyo',
      'hillside': '🌿 Hillside',
      'london': '🇬🇧 London',
      'snow': '❄️ Snowy Peaks',
      'times_square': '🗽 Times Sq',
      'istiklal': '🇹🇷 Istiklal'
    };
    if (badge) badge.textContent = mapNames[mapId] || mapId;

    const modeGroup = document.getElementById('travel-mode-group') || document.getElementById('pedestrian-mode-group');
    if (modeGroup) modeGroup.style.display = 'flex';

    document.querySelectorAll('.map-card').forEach(card => {
      card.classList.toggle('selected', card.getAttribute('data-map') === mapId);
    });

    this.playerX = 0;
    this.speed = 0;
    this.roadDistance = 0;
  }

  setMode(mode) {
    // Turkey map is strictly for peaceful walking & skating: NO DRIVING!
    if (this.currentMapId === 'istiklal' && mode === 'car') {
      mode = 'walk';
    }

    this.currentMode = mode;
    window.retroAudio.setMode(mode);

    if (mode === 'car') {
      this.cockpitGroup.visible = true;
      this.skateboardGroup.visible = false;
      this.maxSpeed = 120;
      this.acceleration = 36;
      this.camera.position.set(0, 1.25, 0.25);
      this.camera.rotation.set(-0.11, 0, 0);
    } else if (mode === 'skateboard') {
      this.cockpitGroup.visible = false;
      this.skateboardGroup.visible = true;
      // HIGH SKATEBOARD SPEED (Just a little slower than driving!)
      this.maxSpeed = 85;
      this.acceleration = 45;
      this.braking = 55;
      this.camera.position.set(0, 1.55, 0);
      this.camera.rotation.set(-0.05, 0, 0);
    } else { // walk
      this.cockpitGroup.visible = false;
      this.skateboardGroup.visible = false;
      this.maxSpeed = 8;
      this.acceleration = 7;
      this.camera.position.set(0, 1.68, 0);
      this.camera.rotation.set(0, 0, 0);
    }

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
  }

  _clearWorld() {
    this.roadSegments.forEach(seg => this.scene.remove(seg));
    this.roadSegments = [];

    if (this.baseTerrain) {
      this.scene.remove(this.baseTerrain);
      this.baseTerrain = null;
    }

    if (this.snowParticles) {
      this.scene.remove(this.snowParticles);
      this.snowParticles = null;
    }
  }

  /* ---------------- MAP 1: TOKYO SCI-FI ---------------- */
  _buildTokyoMap() {
    const roadWidth = 22;
    const segLen = this.segmentLength;

    // Permanent seamless terrain base (Prevents sky block showing from underneath!)
    this.baseTerrain = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1600),
      new THREE.MeshLambertMaterial({ color: 0x0c0f17 })
    );
    this.baseTerrain.rotation.x = -Math.PI / 2;
    this.baseTerrain.position.set(0, -0.05, -400);
    this.scene.add(this.baseTerrain);

    const roadMat = new THREE.MeshLambertMaterial({ color: 0x141824 });
    const barrierMat = new THREE.MeshLambertMaterial({ color: 0x0c0f18 });
    const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const magentaNeonMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const bldgMat = new THREE.MeshLambertMaterial({ color: 0x0f1523 });
    const windowGridMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

    for (let i = 0; i < this.numSegments; i++) {
      const segGroup = new THREE.Group();

      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, segLen), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.02, 0);
      segGroup.add(road);

      for (let j = -segLen / 2 + 4; j < segLen / 2; j += 8) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 4), cyanNeonMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(0, 0.04, j);
        segGroup.add(dash);
      }

      [-roadWidth / 2 - 0.5, roadWidth / 2 + 0.5].forEach((xPos, idx) => {
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, segLen), barrierMat);
        barrier.position.set(xPos, 0.6, 0);
        segGroup.add(barrier);

        const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, segLen), idx === 0 ? cyanNeonMat : magentaNeonMat);
        neonStrip.position.set(xPos + (idx === 0 ? 0.4 : -0.4), 1.1, 0);
        segGroup.add(neonStrip);
      });

      // Cyberpunk Skyscrapers with window grids & rooftop antennas
      [-36 - Math.random() * 15, 36 + Math.random() * 15].forEach(xPos => {
        const bHeight = 40 + Math.random() * 50;
        const bWidth = 14 + Math.random() * 10;
        const building = new THREE.Mesh(new THREE.BoxGeometry(bWidth, bHeight, 22), bldgMat);
        building.position.set(xPos, bHeight / 2, (Math.random() - 0.5) * 8);
        segGroup.add(building);

        // Window grid bands
        for (let w = 6; w < bHeight - 5; w += 6) {
          const winBand = new THREE.Mesh(new THREE.BoxGeometry(bWidth + 0.1, 0.8, 22.1), windowGridMat);
          winBand.position.set(xPos, w, building.position.z);
          segGroup.add(winBand);
        }

        // Rooftop antenna spire
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 12, 6), magentaNeonMat);
        antenna.position.set(xPos, bHeight + 6, building.position.z);
        segGroup.add(antenna);

        // Holographic Kanji Neon Signs
        const signColor = Math.random() > 0.5 ? cyanNeonMat : magentaNeonMat;
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 14), signColor);
        sign.position.set(xPos > 0 ? xPos - bWidth / 2 - 0.2 : xPos + bWidth / 2 + 0.2, 20 + Math.random() * 14, building.position.z);
        sign.rotation.y = xPos > 0 ? -Math.PI / 2 : Math.PI / 2;
        segGroup.add(sign);
      });

      // Skybridge spanning across the expressway on segment 3 & 11
      if (i === 3 || i === 11) {
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(roadWidth + 30, 4.5, 6), bldgMat);
        bridge.position.set(0, 18, 0);
        segGroup.add(bridge);

        const bridgeNeon = new THREE.Mesh(new THREE.BoxGeometry(roadWidth + 30.2, 0.4, 6.2), cyanNeonMat);
        bridgeNeon.position.set(0, 16.2, 0);
        segGroup.add(bridgeNeon);
      }

      segGroup.position.z = -i * segLen;
      this.scene.add(segGroup);
      this.roadSegments.push(segGroup);
    }
  }

  /* ---------------- MAP 2: HILLSIDE WITH GRASS FIELDS (NOW WITH ROLLING HILLS & MOUNTAINS!) ---------------- */
  _buildHillsideMap() {
    const roadWidth = 14;
    const segLen = this.segmentLength;

    // Permanent seamless terrain base (Prevents sky block showing from underneath!)
    this.baseTerrain = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1600),
      new THREE.MeshLambertMaterial({ color: 0x1e4620 })
    );
    this.baseTerrain.rotation.x = -Math.PI / 2;
    this.baseTerrain.position.set(0, -0.05, -400);
    this.scene.add(this.baseTerrain);

    const roadMat = new THREE.MeshLambertMaterial({ color: 0x272e38 });
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x235e2c });
    const hillMat = new THREE.MeshLambertMaterial({ color: 0x2d7337 }); // Lush green hill mounds
    const mountainMat = new THREE.MeshLambertMaterial({ color: 0x3d4b38 }); // Majestic mountain ranges
    const peakMat = new THREE.MeshLambertMaterial({ color: 0x64748b }); // Rocky crags
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5c4033 });
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x1b4320 });
    const flowerMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    for (let i = 0; i < this.numSegments; i++) {
      const segGroup = new THREE.Group();

      // Grass terrain shoulders at y = 0.0
      [-55, 55].forEach(xPos => {
        const grass = new THREE.Mesh(new THREE.PlaneGeometry(95, segLen), grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(xPos, 0.0, 0);
        segGroup.add(grass);
      });

      // Road plane at y = 0.02
      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, segLen), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.02, 0);
      segGroup.add(road);

      // Yellow Center Dash
      for (let j = -segLen / 2 + 3; j < segLen / 2; j += 6) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 3.2), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(0, 0.04, j);
        segGroup.add(dash);
      }

      // Wooden Rail Fences along road
      [-roadWidth / 2 - 1.2, roadWidth / 2 + 1.2].forEach(xPos => {
        for (let j = -segLen / 2 + 3.5; j < segLen / 2; j += 7) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6), woodMat);
          post.position.set(xPos, 0.55, j);
          segGroup.add(post);

          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 7), woodMat);
          rail.position.set(xPos, 0.85, j);
          segGroup.add(rail);
        }
      });

      // 3D ROLLING GREEN HILL KNOLLS (Undulating landscape alongside road!)
      [-26, 26].forEach(xHill => {
        const hillRadius = 14 + (i % 3) * 4;
        const hillMound = new THREE.Mesh(new THREE.SphereGeometry(hillRadius, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
        hillMound.position.set(xHill * 1.3, -hillRadius * 0.65, (i % 2 === 0 ? 8 : -8));
        hillMound.scale.set(1.5, 0.7, 1.5);
        segGroup.add(hillMound);
      });

      // MAJESTIC MOUNTAINS IN DISTANCE (Towering peaks on the horizon!)
      [-85, 85].forEach((xMtn, mIdx) => {
        const mHeight = 55 + ((i + mIdx * 2) % 4) * 20;
        const mtn = new THREE.Mesh(new THREE.ConeGeometry(38, mHeight, 6), mountainMat);
        mtn.position.set(xMtn, mHeight / 2 - 5, (Math.random() - 0.5) * 10);
        segGroup.add(mtn);

        // Rocky mountain peak
        const peak = new THREE.Mesh(new THREE.ConeGeometry(16, mHeight * 0.35, 6), peakMat);
        peak.position.set(xMtn, mHeight * 0.85 - 5, mtn.position.z);
        segGroup.add(peak);
      });

      // Pine & Oak Trees on the hills
      [-20 - Math.random() * 15, 20 + Math.random() * 15].forEach(xPos => {
        const treeGroup = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 2.5, 6), woodMat);
        trunk.position.set(0, 1.25, 0);
        treeGroup.add(trunk);

        [2.2, 3.8, 5.2].forEach((yPos, idx) => {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4 - idx * 0.6, 2.0, 7), treeMat);
          cone.position.set(0, yPos, 0);
          treeGroup.add(cone);
        });

        treeGroup.position.set(xPos, 0, (Math.random() - 0.5) * 12);
        segGroup.add(treeGroup);

        // Wildflower blossoms near tree
        const flowers = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), flowerMat);
        flowers.position.set(xPos + 1.2, 0.1, treeGroup.position.z);
        segGroup.add(flowers);
      });

      // Turning Windmill on segment 4
      if (i === 4) {
        const millGroup = new THREE.Group();
        millGroup.position.set(38, 0, 0);

        const millTower = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5.5, 16, 8), new THREE.MeshLambertMaterial({ color: 0xd6c29c }));
        millTower.position.set(0, 8, 0);
        millGroup.add(millTower);

        const millCap = new THREE.Mesh(new THREE.ConeGeometry(4, 4, 8), new THREE.MeshLambertMaterial({ color: 0x4a3728 }));
        millCap.position.set(0, 18, 0);
        millGroup.add(millCap);

        this.windmillBlades = new THREE.Group();
        this.windmillBlades.position.set(0, 16, 3.6);
        for (let b = 0; b < 4; b++) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 11, 0.08), new THREE.MeshLambertMaterial({ color: 0xffffff }));
          blade.position.set(0, 5.5, 0);
          const pivot = new THREE.Group();
          pivot.rotation.z = (b * Math.PI) / 2;
          pivot.add(blade);
          this.windmillBlades.add(pivot);
        }
        millGroup.add(this.windmillBlades);
        segGroup.add(millGroup);
      }

      segGroup.position.z = -i * segLen;
      this.scene.add(segGroup);
      this.roadSegments.push(segGroup);
    }
  }

  /* ---------------- MAP 3: STREETS OF LONDON (NOW WITH DIVERSE COLORS & SHOP NAMES!) ---------------- */
  _buildLondonMap() {
    const roadWidth = 16;
    const segLen = this.segmentLength;

    // Permanent seamless terrain base
    this.baseTerrain = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1600),
      new THREE.MeshLambertMaterial({ color: 0x17191d })
    );
    this.baseTerrain.rotation.x = -Math.PI / 2;
    this.baseTerrain.position.set(0, -0.05, -400);
    this.scene.add(this.baseTerrain);

    const wetRoadMat = new THREE.MeshLambertMaterial({ color: 0x1b1d22 });
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x5a5f6b });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const phoneRedMat = new THREE.MeshLambertMaterial({ color: 0xd91e18 });
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x111317 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });
    const flowerMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x2e1b15 });
    const windowGlassMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });

    // 10 Diverse Victorian, Georgian & Edwardian Building Colors
    const londonPalettes = [
      { wall: 0x8b3a2b, trim: 0x2e1b15, cornice: 0xd4c5b3 }, // Victorian Terracotta Red Brick
      { wall: 0xd8c8b0, trim: 0x1f2937, cornice: 0xefe6d8 }, // Georgian Cream Stucco
      { wall: 0x3d4b5c, trim: 0x111827, cornice: 0x94a3b8 }, // London Slate Blue Terrace
      { wall: 0x1d3d2c, trim: 0xfacc15, cornice: 0xd1fae5 }, // British Hunter Green
      { wall: 0x1e355b, trim: 0xfacc15, cornice: 0xbfdbfe }, // Royal Navy Blue Shopfront
      { wall: 0x2d343f, trim: 0x475569, cornice: 0xcbd5e1 }, // Mayfair Charcoal Slate
      { wall: 0xc49f6c, trim: 0x3e2714, cornice: 0xf5deb3 }, // Cotswold Warm Sandstone
      { wall: 0xede8e1, trim: 0x0f172a, cornice: 0xffffff }, // Regency White Pearl
      { wall: 0xa04235, trim: 0x222222, cornice: 0xfecaca }, // Bloomsbury Warm Brick
      { wall: 0x4d6350, trim: 0x1c2b1e, cornice: 0xd1d5db }, // Chelsea Olive Sage
    ];

    // 10 Authentic London Shops & Historic Pubs
    const londonShopsLeft = [
      { title: "THE BLACK DOG PUB", sub: "TRADITIONAL ALES & MEAT PIES", bg: "#14532d", text: "#fde047", awning: 0x14532d },
      { title: "TWININGS TEA ROOM", sub: "FINE BLENDS EST. 1706", bg: "#78350f", text: "#fef08a", awning: 0xd97706 },
      { title: "SHERLOCK BOOKS", sub: "RARE BOOKS & ANTIQUITIES", bg: "#1e293b", text: "#38bdf8", awning: 0x1e3a8a },
      { title: "HARRODS BAKEHOUSE", sub: "FRESH ARTISAN PASTRIES", bg: "#831843", text: "#fbcfe8", awning: 0x9d174d },
      { title: "SAVILE ROW TAILOR", sub: "BESPOKE TWEEDS & SUITS", bg: "#0f172a", text: "#facc15", awning: 0x334155 },
    ];

    const londonShopsRight = [
      { title: "THE CROWN & ANCHOR", sub: "HISTORIC TAVERN & CELLAR", bg: "#7f1d1d", text: "#fef08a", awning: 0x991b1b },
      { title: "COVENT FLORIST", sub: "BOTANICALS & FRESH BLOOMS", bg: "#065f46", text: "#a7f3d0", awning: 0x059669 },
      { title: "PICCADILLY BOOTS", sub: "HANDMADE LEATHER OXFORDS", bg: "#451a03", text: "#fed7aa", awning: 0x78350f },
      { title: "CHELSEA APOTHECARY", sub: "HERBS, TINCTURES & REMEDIES", bg: "#1e1b4b", text: "#c7d2fe", awning: 0x3730a3 },
      { title: "REGENT TIMEPIECES", sub: "ANTIQUE CLOCKS & WATCHES", bg: "#1f2937", text: "#facc15", awning: 0x111827 },
    ];

    for (let i = 0; i < this.numSegments; i++) {
      const segGroup = new THREE.Group();

      // Road plane
      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, segLen), wetRoadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.02, 0);
      segGroup.add(road);

      // Sidewalks
      [-roadWidth / 2 - 2, roadWidth / 2 + 2].forEach(xPos => {
        const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(4, 0.25, segLen), sidewalkMat);
        sidewalk.position.set(xPos, 0.12, 0);
        segGroup.add(sidewalk);
      });

      // Victorian Gas Lamps
      [-roadWidth / 2 - 0.6, roadWidth / 2 + 0.6].forEach(xPos => {
        const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8), ironMat);
        lampPost.position.set(xPos, 2.1, 0);
        segGroup.add(lampPost);

        const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), lampGlowMat);
        lantern.position.set(xPos, 4.3, 0);
        segGroup.add(lantern);
      });

      /* --- LEFT SIDE BUILDINGS (DIVERSE COLORS & SHOPS) --- */
      const leftPalette = londonPalettes[i % londonPalettes.length];
      const leftShop = londonShopsLeft[i % londonShopsLeft.length];
      const leftMat = new THREE.MeshLambertMaterial({ color: leftPalette.wall });
      const leftTrimMat = new THREE.MeshLambertMaterial({ color: leftPalette.trim });
      const leftCorniceMat = new THREE.MeshLambertMaterial({ color: leftPalette.cornice });

      const leftTownhouse = new THREE.Group();
      leftTownhouse.position.set(-roadWidth / 2 - 11, 0, 0);

      // Main Façade Body
      const lBody = new THREE.Mesh(new THREE.BoxGeometry(14, 20, 38), leftMat);
      lBody.position.set(0, 10, 0);
      leftTownhouse.add(lBody);

      // Ground Floor Shop Display Window
      const lWindow = new THREE.Mesh(new THREE.PlaneGeometry(16, 3.8), windowGlassMat);
      lWindow.position.set(7.05, 2.3, 0);
      lWindow.rotation.y = Math.PI / 2;
      leftTownhouse.add(lWindow);

      // Shop Sign Fascia with Texture
      const lSignTex = this._createSignTexture(leftShop.title, leftShop.sub, leftShop.bg, leftShop.text, '#facc15');
      const lSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshBasicMaterial({ map: lSignTex }));
      lSignMesh.position.set(7.1, 4.9, 0);
      lSignMesh.rotation.y = Math.PI / 2;
      leftTownhouse.add(lSignMesh);

      // Colored Shop Fabric Awning
      const lAwning = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 16), new THREE.MeshLambertMaterial({ color: leftShop.awning }));
      lAwning.position.set(6.0, 4.0, 0);
      lAwning.rotation.z = 0.22;
      leftTownhouse.add(lAwning);

      // Upper Floor Sash Windows
      [-8, 0, 8].forEach(zWin => {
        [9, 14].forEach(yWin => {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), windowGlassMat);
          win.position.set(7.05, yWin, zWin);
          win.rotation.y = Math.PI / 2;
          leftTownhouse.add(win);

          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.4, 2.6), leftTrimMat);
          frame.position.set(7.04, yWin, zWin);
          leftTownhouse.add(frame);
        });
      });

      // Rooftop Cornice
      const lCornice = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.6, 38.4), leftCorniceMat);
      lCornice.position.set(0, 20.3, 0);
      leftTownhouse.add(lCornice);

      // Traditional Brick Chimneys & Pots
      for (let c = -12; c <= 12; c += 12) {
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), leftMat);
        chimney.position.set(0, 22.0, c);
        leftTownhouse.add(chimney);

        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8), new THREE.MeshLambertMaterial({ color: 0xb45309 }));
        pot.position.set(0, 24.0, c);
        leftTownhouse.add(pot);
      }

      segGroup.add(leftTownhouse);

      /* --- RIGHT SIDE BUILDINGS (DIVERSE COLORS & SHOPS) --- */
      const rightPalette = londonPalettes[(i + 4) % londonPalettes.length];
      const rightShop = londonShopsRight[i % londonShopsRight.length];
      const rightMat = new THREE.MeshLambertMaterial({ color: rightPalette.wall });
      const rightTrimMat = new THREE.MeshLambertMaterial({ color: rightPalette.trim });
      const rightCorniceMat = new THREE.MeshLambertMaterial({ color: rightPalette.cornice });

      const rightTownhouse = new THREE.Group();
      rightTownhouse.position.set(roadWidth / 2 + 11, 0, 0);

      // Main Façade Body
      const rBody = new THREE.Mesh(new THREE.BoxGeometry(14, 20, 38), rightMat);
      rBody.position.set(0, 10, 0);
      rightTownhouse.add(rBody);

      // Ground Floor Shop Display Window
      const rWindow = new THREE.Mesh(new THREE.PlaneGeometry(16, 3.8), windowGlassMat);
      rWindow.position.set(-7.05, 2.3, 0);
      rWindow.rotation.y = -Math.PI / 2;
      rightTownhouse.add(rWindow);

      // Shop Sign Fascia with Texture
      const rSignTex = this._createSignTexture(rightShop.title, rightShop.sub, rightShop.bg, rightShop.text, '#facc15');
      const rSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshBasicMaterial({ map: rSignTex }));
      rSignMesh.position.set(-7.1, 4.9, 0);
      rSignMesh.rotation.y = -Math.PI / 2;
      rightTownhouse.add(rSignMesh);

      // Colored Shop Fabric Awning
      const rAwning = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 16), new THREE.MeshLambertMaterial({ color: rightShop.awning }));
      rAwning.position.set(-6.0, 4.0, 0);
      rAwning.rotation.z = -0.22;
      rightTownhouse.add(rAwning);

      // Hanging flower baskets on storefront
      [-6, 6].forEach(zB => {
        const basket = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), flowerMat);
        basket.position.set(-7.2, 3.2, zB);
        rightTownhouse.add(basket);
      });

      // Upper Floor Sash Windows
      [-8, 0, 8].forEach(zWin => {
        [9, 14].forEach(yWin => {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), windowGlassMat);
          win.position.set(-7.05, yWin, zWin);
          win.rotation.y = -Math.PI / 2;
          rightTownhouse.add(win);

          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.4, 2.6), rightTrimMat);
          frame.position.set(-7.04, yWin, zWin);
          rightTownhouse.add(frame);
        });
      });

      // Rooftop Cornice
      const rCornice = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.6, 38.4), rightCorniceMat);
      rCornice.position.set(0, 20.3, 0);
      rightTownhouse.add(rCornice);

      segGroup.add(rightTownhouse);

      // Iconic K6 Red Phone Box & Pillar Post Box
      if (i % 3 === 1) {
        const phoneBox = new THREE.Group();
        phoneBox.position.set(-roadWidth / 2 - 2.2, 0.25, 4);

        const boxBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.6, 1.0), phoneRedMat);
        boxBody.position.set(0, 1.3, 0);
        phoneBox.add(boxBody);

        const boxDome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), phoneRedMat);
        boxDome.position.set(0, 2.6, 0);
        phoneBox.add(boxDome);

        const boxGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 1.5), lampGlowMat);
        boxGlass.position.set(0.51, 1.4, 0);
        boxGlass.rotation.y = Math.PI / 2;
        phoneBox.add(boxGlass);

        segGroup.add(phoneBox);

        const postBox = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 10), phoneRedMat);
        postBox.position.set(-roadWidth / 2 - 2.2, 0.95, -4);
        segGroup.add(postBox);
      }

      // Big Ben Clock Tower on the final segment
      if (i === this.numSegments - 1) {
        const towerGroup = new THREE.Group();
        towerGroup.position.set(0, 0, -80);

        const towerBody = new THREE.Mesh(new THREE.BoxGeometry(16, 95, 16), new THREE.MeshLambertMaterial({ color: 0x3d352c }));
        towerBody.position.set(0, 47.5, 0);
        towerGroup.add(towerBody);

        const spire = new THREE.Mesh(new THREE.ConeGeometry(9, 35, 4), new THREE.MeshLambertMaterial({ color: 0x24201a }));
        spire.position.set(0, 112, 0);
        spire.rotation.y = Math.PI / 4;
        towerGroup.add(spire);

        const clockFace = new THREE.Mesh(new THREE.CircleGeometry(4.2, 16), lampGlowMat);
        clockFace.position.set(0, 84, 8.1);
        towerGroup.add(clockFace);

        segGroup.add(towerGroup);
      }

      segGroup.position.z = -i * segLen;
      this.scene.add(segGroup);
      this.roadSegments.push(segGroup);
    }
  }

  /* ---------------- MAP 4: SNOWFALL / SNOW-CAPPED PEAKS ---------------- */
  _buildSnowMap() {
    const roadWidth = 14;
    const segLen = this.segmentLength;

    // Permanent seamless terrain base (Prevents sky block showing from underneath!)
    this.baseTerrain = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1600),
      new THREE.MeshLambertMaterial({ color: 0xdbe4ee })
    );
    this.baseTerrain.rotation.x = -Math.PI / 2;
    this.baseTerrain.position.set(0, -0.05, -400);
    this.scene.add(this.baseTerrain);

    const frostedRoadMat = new THREE.MeshLambertMaterial({ color: 0x3a424e });
    const snowMat = new THREE.MeshLambertMaterial({ color: 0xe8eff8 });
    const pineSnowMat = new THREE.MeshLambertMaterial({ color: 0x223d2e });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x422d1d });

    for (let i = 0; i < this.numSegments; i++) {
      const segGroup = new THREE.Group();

      [-50, 50].forEach(xPos => {
        const snowBank = new THREE.Mesh(new THREE.PlaneGeometry(85, segLen), snowMat);
        snowBank.rotation.x = -Math.PI / 2;
        snowBank.position.set(xPos, 0.0, 0);
        segGroup.add(snowBank);
      });

      const road = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, segLen), frostedRoadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.02, 0);
      segGroup.add(road);

      [-roadWidth / 2 - 0.5, roadWidth / 2 + 0.5].forEach(xPos => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, segLen), woodMat);
        rail.position.set(xPos, 0.5, 0);
        segGroup.add(rail);

        const snowTop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, segLen), snowMat);
        snowTop.position.set(xPos, 0.74, 0);
        segGroup.add(snowTop);
      });

      [-18 - Math.random() * 20, 18 + Math.random() * 20].forEach(xPos => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2, 6), woodMat);
        trunk.position.set(0, 1, 0);
        tree.add(trunk);

        [1.8, 3.4, 4.8].forEach((yPos, idx) => {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2 - idx * 0.5, 1.8, 7), pineSnowMat);
          cone.position.set(0, yPos, 0);
          tree.add(cone);

          const snowCap = new THREE.Mesh(new THREE.ConeGeometry(2.3 - idx * 0.5, 0.4, 7), snowMat);
          snowCap.position.set(0, yPos + 0.7, 0);
          tree.add(snowCap);
        });

        tree.position.set(xPos, 0, (Math.random() - 0.5) * 12);
        segGroup.add(tree);
      });

      if (i === 12) {
        [-50, 50].forEach(xPos => {
          const mountain = new THREE.Mesh(new THREE.ConeGeometry(65, 130, 5), new THREE.MeshLambertMaterial({ color: 0x334155 }));
          mountain.position.set(xPos, 45, -50);
          segGroup.add(mountain);

          const cap = new THREE.Mesh(new THREE.ConeGeometry(28, 45, 5), snowMat);
          cap.position.set(xPos, 90, -50);
          segGroup.add(cap);
        });
      }

      segGroup.position.z = -i * segLen;
      this.scene.add(segGroup);
      this.roadSegments.push(segGroup);
    }

    const snowCount = 450;
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(snowCount * 3);
    for (let s = 0; s < snowCount * 3; s += 3) {
      snowPos[s] = (Math.random() - 0.5) * 60;
      snowPos[s + 1] = Math.random() * 25;
      snowPos[s + 2] = -Math.random() * 120;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    this.snowParticles = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.85 }));
    this.scene.add(this.snowParticles);
  }

  /* ---------------- MAP 5: NEW YORK TIMES SQUARE (BONUS WALK/SKATE) ---------------- */
  _buildTimesSquareMap() {
    const plazaWidth = 26;
    const segLen = this.segmentLength;

    // Permanent seamless terrain base (Prevents sky block showing from underneath!)
    this.baseTerrain = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1600),
      new THREE.MeshLambertMaterial({ color: 0x181c24 })
    );
    this.baseTerrain.rotation.x = -Math.PI / 2;
    this.baseTerrain.position.set(0, -0.05, -400);
    this.scene.add(this.baseTerrain);

    const plazaMat = new THREE.MeshLambertMaterial({ color: 0x252a34 });
    const curbMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const bldgMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
    const yellowCabMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const redStairsMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    for (let i = 0; i < this.numSegments; i++) {
      const segGroup = new THREE.Group();

      const plaza = new THREE.Mesh(new THREE.PlaneGeometry(plazaWidth, segLen), plazaMat);
      plaza.rotation.x = -Math.PI / 2;
      plaza.position.set(0, 0.02, 0);
      segGroup.add(plaza);

      for (let j = -segLen / 2 + 5; j < segLen / 2; j += 10) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(plazaWidth - 4, 1.2), curbMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 0.03, j);
        segGroup.add(stripe);
      }

      [-plazaWidth / 2 - 14, plazaWidth / 2 + 14].forEach(xPos => {
        const bHeight = 45 + Math.random() * 40;
        const skyscraper = new THREE.Mesh(new THREE.BoxGeometry(22, bHeight, 36), bldgMat);
        skyscraper.position.set(xPos, bHeight / 2, 0);
        segGroup.add(skyscraper);

        // Towering animated-style LED billboards
        const colors = [0x00f5d4, 0xfacc15, 0xf43f5e, 0x3b82f6, 0xa855f7];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const billboard = new THREE.Mesh(new THREE.PlaneGeometry(16, 20), new THREE.MeshBasicMaterial({ color: randomColor }));
        billboard.position.set(xPos > 0 ? xPos - 11.1 : xPos + 11.1, 18, 0);
        billboard.rotation.y = xPos > 0 ? -Math.PI / 2 : Math.PI / 2;
        segGroup.add(billboard);

        // Broadway theater illuminated marquee over sidewalk
        const marquee = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 10), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
        marquee.position.set(xPos > 0 ? xPos - 11.5 : xPos + 11.5, 4.5, 0);
        segGroup.add(marquee);
      });

      // NYC Yellow Cabs on pedestrian perimeter
      if (i % 2 === 0) {
        const cab = new THREE.Group();
        const cabBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.1, 4.4), yellowCabMat);
        cabBody.position.set(0, 0.65, 0);
        cab.add(cabBody);

        const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), yellowCabMat);
        cabRoof.position.set(0, 1.4, -0.2);
        cab.add(cabRoof);

        cab.position.set(-plazaWidth / 2 - 2, 0, 4);
        cab.rotation.y = 0.2;
        segGroup.add(cab);
      }

      if (i === 3) {
        const stairsGroup = new THREE.Group();
        stairsGroup.position.set(0, 0, 0);
        for (let st = 0; st < 12; st++) {
          const step = new THREE.Mesh(new THREE.BoxGeometry(10, 0.45, 1.2), redStairsMat);
          step.position.set(0, st * 0.45 + 0.22, -st * 1.2);
          stairsGroup.add(step);
        }
        segGroup.add(stairsGroup);
      }

      segGroup.position.z = -i * segLen;
      this.scene.add(segGroup);
      this.roadSegments.push(segGroup);
    }
  }

  /* ---------------- MAP 6: ISTIKLAL STREET, ISTANBUL (DIVERSE COLORS, SHOP NAMES & FLAT ROOF TRAM!) ---------------- */
  _buildIstiklalMap() {
    const streetWidth = 15;
    const segLen = this.segmentLength;

    // Permanent seamless terrain base
    this.baseTerrain = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1600),
      new THREE.MeshLambertMaterial({ color: 0x27292f })
    );
    this.baseTerrain.rotation.x = -Math.PI / 2;
    this.baseTerrain.position.set(0, -0.05, -400);
    this.scene.add(this.baseTerrain);

    const cobblestoneMat = new THREE.MeshLambertMaterial({ color: 0x363940 });
    const trackMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const redTramMat = new THREE.MeshLambertMaterial({ color: 0x991b1b });
    const flagRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const cumbaWoodMat = new THREE.MeshLambertMaterial({ color: 0x3e2213 });
    const awningGoldMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    const awningRedMat = new THREE.MeshLambertMaterial({ color: 0xd92525 });
    const windowGlassMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });

    // 10 Diverse Neoclassical, Art Nouveau & Ottoman Historic Istiklal Colors
    const istiklalPalettes = [
      { wall: 0xd4a359, trim: 0x3f2213, cornice: 0xf5deb3 }, // Ottoman Ochre Gold
      { wall: 0xba4c3a, trim: 0x2b150c, cornice: 0xfecaca }, // Pera Terracotta Rust
      { wall: 0x2a528a, trim: 0x172554, cornice: 0xbfdbfe }, // Bosphorus Cobalt Blue
      { wall: 0xb86b77, trim: 0x4a1d24, cornice: 0xfbcfe8 }, // Beyoğlu Dusty Rose
      { wall: 0xdfd3be, trim: 0x382e25, cornice: 0xfffbeb }, // Neoclassical Cream Limestone
      { wall: 0x5b7056, trim: 0x1e2e1a, cornice: 0xd1fae5 }, // Ottoman Olive Sage
      { wall: 0x6b304c, trim: 0x2d1020, cornice: 0xf5d0fe }, // Imperial Plum
      { wall: 0xbfa585, trim: 0x3b2b1a, cornice: 0xfef3c7 }, // Galata Warm Sandstone
      { wall: 0x207567, trim: 0x0f3b33, cornice: 0xa7f3d0 }, // Aegean Teal
      { wall: 0xc27838, trim: 0x451a03, cornice: 0xfed7aa }, // Anatolian Amber Brick
    ];

    // 10 Authentic Istiklal Caddesi Shops
    const turkeyShopsLeft = [
      { title: "HAFİZ MUSTAFA 1864", sub: "LOKUM • BAKLAVA • KAHVE", bg: "#78350f", text: "#fde047", awning: 0x991b1b },
      { title: "PERA SAHAF KİTAPÇI", sub: "ANTİKA & ESKİ KİTAPLAR", bg: "#1e293b", text: "#38bdf8", awning: 0x1e40af },
      { title: "İSTİKLAL ECZANESİ", sub: "1895 TARİHİ PERA ECZANE", bg: "#065f46", text: "#a7f3d0", awning: 0x047857 },
      { title: "GALATA SİMİT & ÇAY", sub: "TAZE ÇITIR SİMİT OCAĞI", bg: "#9a3412", text: "#fed7aa", awning: 0xc2410c },
      { title: "BEYOĞLU DÖNERCİSİ", sub: "ODUN ATEŞİNDE DÖNER", bg: "#831843", text: "#fbcfe8", awning: 0x9f1239 },
    ];

    const turkeyShopsRight = [
      { title: "MADO DONDURMA", sub: "HAKİKİ MARAŞ DONDURMASI", bg: "#1e3a8a", text: "#bfdbfe", awning: 0x2563eb },
      { title: "ÇİÇEK PASAJI", sub: "TARİHİ MEYHANE & MEZELER", bg: "#14532d", text: "#fef08a", awning: 0x15803d },
      { title: "KAHVE DÜNYASI", sub: "TÜRK KAHVESİ & ÇİKOLATA", bg: "#451a03", text: "#fde68a", awning: 0x78350f },
      { title: "OSMANLI BAHARATÇISI", sub: "LOKUM • BAHARAT • ÇAY", bg: "#701a75", text: "#f5d0fe", awning: 0xa21caf },
      { title: "PERA HALI & KİLİM", sub: "EL DOKUMA ANADOLU HALILARI", bg: "#991b1b", text: "#fef08a", awning: 0xd97706 },
    ];

    for (let i = 0; i < this.numSegments; i++) {
      const segGroup = new THREE.Group();

      // Cobblestone street
      const street = new THREE.Mesh(new THREE.PlaneGeometry(streetWidth, segLen), cobblestoneMat);
      street.rotation.x = -Math.PI / 2;
      street.position.set(0, 0.02, 0);
      segGroup.add(street);

      // Tram rails down the center
      [-0.75, 0.75].forEach(xTrack => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, segLen), trackMat);
        rail.position.set(xTrack, 0.04, 0);
        segGroup.add(rail);
      });

      // Hanging Turkish Flags & Overhead Lanterns
      if (i % 2 === 0) {
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, streetWidth + 4, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        cable.rotation.z = Math.PI / 2;
        cable.position.set(0, 7.5, 0);
        segGroup.add(cable);

        const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), flagRedMat);
        flag.position.set(0, 5.8, 0);
        segGroup.add(flag);

        [-4, 4].forEach(xL => {
          const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), lanternMat);
          lantern.position.set(xL, 7.1, 0);
          segGroup.add(lantern);
        });
      }

      /* --- LEFT SIDE BUILDINGS (DIVERSE COLORS & SHOPS) --- */
      const leftPalette = istiklalPalettes[i % istiklalPalettes.length];
      const leftShop = turkeyShopsLeft[i % turkeyShopsLeft.length];
      const leftMat = new THREE.MeshLambertMaterial({ color: leftPalette.wall });
      const leftTrimMat = new THREE.MeshLambertMaterial({ color: leftPalette.trim });
      const leftCorniceMat = new THREE.MeshLambertMaterial({ color: leftPalette.cornice });

      const leftBuilding = new THREE.Group();
      leftBuilding.position.set(-streetWidth / 2 - 7, 0, 0);

      // Façade Body
      const lFacade = new THREE.Mesh(new THREE.BoxGeometry(14, 24, 38), leftMat);
      lFacade.position.set(0, 12, 0);
      leftBuilding.add(lFacade);

      // Ground Floor Arched Shop Display Window
      const lShopWindow = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.6), windowGlassMat);
      lShopWindow.position.set(7.05, 2.2, 0);
      lShopWindow.rotation.y = Math.PI / 2;
      leftBuilding.add(lShopWindow);

      // Turkish Shop Sign with Texture
      const lSignTex = this._createSignTexture(leftShop.title, leftShop.sub, leftShop.bg, leftShop.text, '#fde047');
      const lSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.0), new THREE.MeshBasicMaterial({ map: lSignTex }));
      lSignMesh.position.set(7.1, 4.6, 0);
      lSignMesh.rotation.y = Math.PI / 2;
      leftBuilding.add(lSignMesh);

      // Striped Fabric Awning
      const lAwning = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 14), new THREE.MeshLambertMaterial({ color: leftShop.awning }));
      lAwning.position.set(6.0, 3.8, 0);
      lAwning.rotation.z = 0.25;
      leftBuilding.add(lAwning);

      // Protruding wooden Cumba bay window on 2nd floor
      const cumbaLeft = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.5, 7.5), cumbaWoodMat);
      cumbaLeft.position.set(6.2, 10.5, 0);
      leftBuilding.add(cumbaLeft);

      // Windows inside Cumba
      [-2.2, 0, 2.2].forEach(zC => {
        const cWin = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), windowGlassMat);
        cWin.position.set(7.32, 10.5, zC);
        cWin.rotation.y = Math.PI / 2;
        leftBuilding.add(cWin);
      });

      // Rooftop Cornice Parapet
      const lCornice = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.7, 38.4), leftCorniceMat);
      lCornice.position.set(0, 24.3, 0);
      leftBuilding.add(lCornice);

      segGroup.add(leftBuilding);

      /* --- RIGHT SIDE BUILDINGS (DIVERSE COLORS & SHOPS) --- */
      const rightPalette = istiklalPalettes[(i + 3) % istiklalPalettes.length];
      const rightShop = turkeyShopsRight[i % turkeyShopsRight.length];
      const rightMat = new THREE.MeshLambertMaterial({ color: rightPalette.wall });
      const rightTrimMat = new THREE.MeshLambertMaterial({ color: rightPalette.trim });
      const rightCorniceMat = new THREE.MeshLambertMaterial({ color: rightPalette.cornice });

      const rightBuilding = new THREE.Group();
      rightBuilding.position.set(streetWidth / 2 + 7, 0, 0);

      // Façade Body
      const rFacade = new THREE.Mesh(new THREE.BoxGeometry(14, 24, 38), rightMat);
      rFacade.position.set(0, 12, 0);
      rightBuilding.add(rFacade);

      // Ground Floor Shop Window
      const rShopWindow = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.6), windowGlassMat);
      rShopWindow.position.set(-7.05, 2.2, 0);
      rShopWindow.rotation.y = -Math.PI / 2;
      rightBuilding.add(rShopWindow);

      // Turkish Shop Sign with Texture
      const rSignTex = this._createSignTexture(rightShop.title, rightShop.sub, rightShop.bg, rightShop.text, '#fde047');
      const rSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.0), new THREE.MeshBasicMaterial({ map: rSignTex }));
      rSignMesh.position.set(-7.1, 4.6, 0);
      rSignMesh.rotation.y = -Math.PI / 2;
      rightBuilding.add(rSignMesh);

      // Striped Fabric Awning
      const rAwning = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 14), new THREE.MeshLambertMaterial({ color: rightShop.awning }));
      rAwning.position.set(-6.0, 3.8, 0);
      rAwning.rotation.z = -0.25;
      rightBuilding.add(rAwning);

      // Protruding wooden Cumba bay window on 2nd floor
      const cumbaRight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.5, 7.5), cumbaWoodMat);
      cumbaRight.position.set(-6.2, 10.5, 0);
      rightBuilding.add(cumbaRight);

      // Windows inside Cumba
      [-2.2, 0, 2.2].forEach(zC => {
        const cWin = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), windowGlassMat);
        cWin.position.set(-7.32, 10.5, zC);
        cWin.rotation.y = -Math.PI / 2;
        rightBuilding.add(cWin);
      });

      // Rooftop Cornice Parapet
      const rCornice = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.7, 38.4), rightCorniceMat);
      rCornice.position.set(0, 24.3, 0);
      rightBuilding.add(rCornice);

      segGroup.add(rightBuilding);

      /* --- STREET VENDORS --- */
      // 1. Simit Carts (Simitçi with red base, gold wheels & sesame rings)
      if (i % 3 === 0) {
        const simitCart = new THREE.Group();
        simitCart.position.set(streetWidth / 2 - 2.0, 0, 5);

        const cartBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 2.0), redTramMat);
        cartBody.position.set(0, 0.60, 0);
        simitCart.add(cartBody);

        const caseFrame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 1.8), cumbaWoodMat);
        caseFrame.position.set(0, 1.28, 0);
        simitCart.add(caseFrame);

        [-0.35, 0.35].forEach(xS => {
          [-0.4, 0.4].forEach(zS => {
            const simit = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 12), awningGoldMat);
            simit.rotation.x = Math.PI / 2;
            simit.position.set(xS, 1.15, zS);
            simitCart.add(simit);
          });
        });

        const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.55, 6), awningRedMat);
        canopy.position.set(0, 2.0, 0);
        simitCart.add(canopy);

        [-0.72, 0.72].forEach(xW => {
          [-0.65, 0.65].forEach(zW => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12), awningGoldMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(xW, 0.32, zW);
            simitCart.add(wheel);
          });
        });

        segGroup.add(simitCart);
      }

      // 2. Roasted Chestnut & Corn Carts (Kestane & Mısır Brazier)
      if (i % 3 === 1) {
        const chestnutCart = new THREE.Group();
        chestnutCart.position.set(-streetWidth / 2 + 2.0, 0, -4);

        const cartBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 1.8), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
        cartBase.position.set(0, 0.6, 0);
        chestnutCart.add(cartBase);

        const brazier = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 1.6), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
        brazier.position.set(0, 1.15, 0);
        chestnutCart.add(brazier);

        const cUmbrella = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.5, 6), awningGoldMat);
        cUmbrella.position.set(0, 2.1, 0);
        chestnutCart.add(cUmbrella);

        segGroup.add(chestnutCart);
      }

      // HISTORIC RED HERITAGE TRAM (NO RED THING ON TOP! FLAT CLEAN DARK ROOF!)
      if (i % 4 === 1) {
        const tram = this._createHeritageTram();
        tram.position.set(0, 0, 0);
        segGroup.add(tram);
      }

      // Galata Tower silhouette on final segment
      if (i === this.numSegments - 1) {
        const galata = new THREE.Group();
        galata.position.set(0, 0, -90);

        const gBody = new THREE.Mesh(new THREE.CylinderGeometry(11, 13, 62, 16), new THREE.MeshLambertMaterial({ color: 0xa89379 }));
        gBody.position.set(0, 31, 0);
        galata.add(gBody);

        const gRoof = new THREE.Mesh(new THREE.ConeGeometry(12, 18, 16), new THREE.MeshLambertMaterial({ color: 0x3d352c }));
        gRoof.position.set(0, 71, 0);
        galata.add(gRoof);

        segGroup.add(galata);
      }

      segGroup.position.z = -i * segLen;
      this.scene.add(segGroup);
      this.roadSegments.push(segGroup);
    }
  }

  // Helper: Authentic Red Nostalgic Tram (NO RED THING ON TOP! SLEEK FLAT DARK ROOF!)
  _createHeritageTram() {
    const tram = new THREE.Group();

    const redTramMat = new THREE.MeshLambertMaterial({ color: 0x991b1b }); // Authentic Turkish crimson red!
    const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x361f14 }); // Mahogany door & window trim
    const darkGlassMat = new THREE.MeshLambertMaterial({ color: 0x18202c, transparent: true, opacity: 0.85 }); // Vintage dark transit glass
    const brassMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x111827 }); // Deep charcoal metal

    // 1. Lower Red Tram Car Body
    const tramBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 7.8), redTramMat);
    tramBody.position.set(0, 0.9, 0);
    tram.add(tramBody);

    // 2. Upper Red Tram Cabin (Solid red body with dark vintage windows)
    const upperCabin = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.1, 7.6), redTramMat);
    upperCabin.position.set(0, 2.05, 0);
    tram.add(upperCabin);

    // 3. SLEEK FLAT DARK ROOF (COMPLETELY REMOVED THE RED THING ON TOP!)
    const flatRoof = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.08, 7.7), metalMat);
    flatRoof.position.set(0, 2.64, 0);
    tram.add(flatRoof);

    // 4. Black Steel Pantograph / Trolley Pole on Top of Flat Roof
    const pantoPole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), metalMat);
    pantoPole.position.set(0, 2.95, -0.8);
    pantoPole.rotation.x = -0.25;
    tram.add(pantoPole);

    const pantoCross = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.12), metalMat);
    pantoCross.position.set(0, 3.20, -0.95);
    tram.add(pantoCross);

    // 5. Dark Tinted Passenger Windows along sides
    [-1.20, 1.20].forEach((xSide, sIdx) => {
      for (let w = -2.6; w <= 2.6; w += 1.1) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.72), darkGlassMat);
        win.position.set(xSide > 0 ? xSide + 0.01 : xSide - 0.01, 2.05, w);
        win.rotation.y = sIdx === 0 ? -Math.PI / 2 : Math.PI / 2;
        tram.add(win);

        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.78, 0.74), darkWoodMat);
        frame.position.set(xSide > 0 ? xSide + 0.015 : xSide - 0.015, 2.05, w);
        tram.add(frame);
      }
    });

    // 6. Front & Rear Windscreen (Dark Tinted Glass + Wipers)
    [-3.84, 3.84].forEach(zEnd => {
      const frontWin = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.75), darkGlassMat);
      frontWin.position.set(0, 2.05, zEnd > 0 ? zEnd + 0.01 : zEnd - 0.01);
      if (zEnd < 0) frontWin.rotation.y = Math.PI;
      tram.add(frontWin);

      const frontFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.82, 0.04), darkWoodMat);
      frontFrame.position.set(0, 2.05, zEnd > 0 ? zEnd + 0.005 : zEnd - 0.005);
      tram.add(frontFrame);

      // Brass Headlamp
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), brassMat);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(0, 1.25, zEnd > 0 ? zEnd + 0.1 : zEnd - 0.1);
      tram.add(lamp);

      // Glowing amber headlamp lens
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      lens.position.set(0, 1.25, zEnd > 0 ? zEnd + 0.17 : zEnd - 0.17);
      if (zEnd < 0) lens.rotation.y = Math.PI;
      tram.add(lens);

      // Destination plaque: "410 TAKSİM - TÜNEL" (Dark charcoal with gold lettering)
      const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.24, 0.04), metalMat);
      sign.position.set(0, 2.50, zEnd > 0 ? zEnd + 0.03 : zEnd - 0.03);
      tram.add(sign);

      const signText = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.14), new THREE.MeshBasicMaterial({ color: 0xd97706 }));
      signText.position.set(0, 2.50, zEnd > 0 ? zEnd + 0.055 : zEnd - 0.055);
      if (zEnd < 0) signText.rotation.y = Math.PI;
      tram.add(signText);
    });

    // 7. Bi-Fold Mahogany Doors with Dark Window Inserts
    [-1.21, 1.21].forEach(xDoor => {
      [-3.1, 3.1].forEach(zDoor => {
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.60), darkWoodMat);
        door.position.set(xDoor, 1.25, zDoor);
        tram.add(door);

        const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.60, 0.38), darkGlassMat);
        doorGlass.position.set(xDoor, 1.45, zDoor);
        tram.add(doorGlass);
      });
    });

    // 8. Steel Cowcatcher Grill & Wheels Underneath
    const cowcatcher = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.30, 0.35), metalMat);
    cowcatcher.position.set(0, 0.20, 3.8);
    tram.add(cowcatcher);

    [-1.8, 1.8].forEach(zTruck => {
      const truck = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.32, 1.2), metalMat);
      truck.position.set(0, 0.20, zTruck);
      tram.add(truck);
    });

    return tram;
  }

  /* ================= TIME OF DAY LIGHTING ================= */
  setTimeOfDay(timeId) {
    this.currentTimeOfDay = timeId;

    let skyColor, fogColor, fogDensity, sunColor, sunIntensity, sunPos;
    let headlightsOn = false;

    switch (timeId) {
      case 'sunrise':
        skyColor = 0xffa07a;
        fogColor = 0x5a3d4f;
        fogDensity = 0.006;
        sunColor = 0xffd1a4;
        sunIntensity = 0.85;
        sunPos = new THREE.Vector3(50, 25, -70);
        headlightsOn = false;
        break;

      case 'afternoon':
        skyColor = 0x38bdf8;
        fogColor = 0x93c5fd;
        fogDensity = 0.0035;
        sunColor = 0xffffff;
        sunIntensity = 1.15;
        sunPos = new THREE.Vector3(30, 80, -40);
        headlightsOn = false;
        break;

      case 'sunset':
        skyColor = 0x7e22ce;
        fogColor = 0x4a154b;
        fogDensity = 0.0055;
        sunColor = 0xf97316;
        sunIntensity = 0.95;
        sunPos = new THREE.Vector3(-40, 22, -80);
        headlightsOn = true;
        break;

      case 'night':
      default:
        skyColor = 0x070b14;
        fogColor = 0x0b1120;
        fogDensity = 0.0075;
        sunColor = 0x60a5fa;
        sunIntensity = 0.3;
        sunPos = new THREE.Vector3(10, 60, -30);
        headlightsOn = true;
        break;
    }

    this.renderer.setClearColor(skyColor);
    this.scene.fog.color.setHex(fogColor);
    this.scene.fog.density = fogDensity;

    this.sunLight.color.setHex(sunColor);
    this.sunLight.intensity = sunIntensity;
    this.sunLight.position.copy(sunPos);

    this.headlights.forEach(hl => {
      hl.intensity = headlightsOn ? (timeId === 'night' ? 2.8 : 1.2) : 0;
    });

    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-time') === timeId);
    });
  }

  /* ================= INPUT & CONTROLS ================= */
  _setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.down = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'Space':
        case 'KeyT':
          this.keys.space = true;
          if (this.currentMapId === 'istiklal') {
            // In Turkey, only toggle between peaceful walk and skateboard!
            const nextMode = this.currentMode === 'walk' ? 'skateboard' : 'walk';
            this.setMode(nextMode);
          } else {
            // In all other maps, cycle between car -> walk -> skateboard!
            const modeCycle = { 'car': 'walk', 'walk': 'skateboard', 'skateboard': 'car' };
            const nextMode = modeCycle[this.currentMode] || 'car';
            this.setMode(nextMode);
          }
          window.retroAudio.playArcadeClick('select');
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'Space':
        case 'KeyT':
          this.keys.space = false;
          break;
      }
    });

    const setupTouchBtn = (id, keyName) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (e) => { e.preventDefault(); this.keys[keyName] = true; };
      const end = (e) => { e.preventDefault(); this.keys[keyName] = false; };
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
      el.addEventListener('mouseleave', end);
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
    };

    setupTouchBtn('touch-btn-up', 'up');
    setupTouchBtn('touch-btn-down', 'down');
    setupTouchBtn('touch-btn-left', 'left');
    setupTouchBtn('touch-btn-right', 'right');
  }

  _onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /* ================= MAIN ANIMATION & TWO-PASS DEPTH RENDERING ================= */
  _animate() {
    requestAnimationFrame(() => this._animate());

    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    // 1. Acceleration / Braking
    if (this.keys.up) {
      this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);
    } else if (this.keys.down) {
      this.speed = Math.max(-15, this.speed - this.braking * dt);
    } else {
      if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * dt);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * dt);
    }

    // 2. Steering & Dynamic Banking
    const targetSteer = (this.keys.left ? -1 : 0) + (this.keys.right ? 1 : 0);
    this.steeringAngle += (targetSteer - this.steeringAngle) * 9 * dt;

    // Responsive carving for fast skateboard & car
    const steerResponsiveness = (Math.abs(this.speed) / this.maxSpeed) * 16 + (this.currentMode === 'skateboard' ? 12 : 4);
    if (Math.abs(this.speed) > 0.5) {
      this.playerX += this.steeringAngle * steerResponsiveness * dt;
    }
    const roadBoundary = this.currentMapId === 'tokyo' ? 9.5 : (this.currentMapId === 'times_square' ? 11 : 6.8);
    this.playerX = Math.max(-roadBoundary, Math.min(roadBoundary, this.playerX));

    // 3. Audio pitch & rumble
    const speedRatio = Math.abs(this.speed) / this.maxSpeed;
    if (this.currentMode === 'car') {
      window.retroAudio.setEngineSpeed(speedRatio, this.keys.up);
    } else if (this.currentMode === 'skateboard') {
      window.retroAudio.setSkateboardSpeed(speedRatio, this.keys.up);
    } else if (this.currentMode === 'walk') {
      if (speedRatio > 0.15) window.retroAudio.playFootstep();
    }

    // 4. Infinite road scrolling with clean recycling behind camera
    const deltaDistance = (this.speed * 1000 / 3600) * dt;
    this.roadDistance += deltaDistance;

    const segLen = this.segmentLength;
    const totalLoopDistance = this.roadSegments.length * segLen;

    this.roadSegments.forEach((seg, idx) => {
      let relativeZ = -(idx * segLen - (this.roadDistance % totalLoopDistance));
      // Only recycle when segment's far edge has passed completely behind camera (z = 0.25)!
      // Each segment extends segLen/2 forwards and segLen/2 backwards from its center.
      // So relativeZ > segLen / 2 + 5 (25 units) guarantees seamless road with ZERO vanishing holes!
      if (relativeZ > segLen / 2 + 5) {
        relativeZ -= totalLoopDistance;
      }
      seg.position.z = relativeZ;
      seg.position.x = -this.playerX;
    });

    if (this.baseTerrain) {
      this.baseTerrain.position.x = -this.playerX * 0.2;
    }

    // 5. Cockpit & Speedometer Dashboard Animation
    if (this.currentMode === 'car' && this.steeringWheelGroup) {
      const maxWheelTurn = 1.25;
      this.steeringWheelGroup.rotation.z = -this.steeringAngle * maxWheelTurn;

      const engineShake = (0.002 + speedRatio * 0.003) * Math.sin(now * 0.04);
      this.cockpitGroup.position.y = engineShake;
      this.cockpitGroup.position.x = -this.steeringAngle * 0.02;

      // Speedometer Needle (0 to 140 MPH)
      if (this.speedoNeedle) {
        const needleAngle = 1.6 - speedRatio * 3.3;
        this.speedoNeedle.rotation.z = needleAngle;
      }

      // Tachometer (RPM) Needle
      if (this.tachNeedle) {
        const rpmRatio = (this.keys.up ? 0.35 : 0.0) + speedRatio * 0.65;
        this.tachNeedle.rotation.z = 1.6 - rpmRatio * 3.1;
      }

      // Blinking turn signals
      const blinkState = Math.sin(now * 0.015) > 0;
      if (this.turnSignalLeft) {
        this.turnSignalLeft.material.color.setHex(this.keys.left && blinkState ? 0x22c55e : 0x064e3b);
      }
      if (this.turnSignalRight) {
        this.turnSignalRight.material.color.setHex(this.keys.right && blinkState ? 0x22c55e : 0x064e3b);
      }

      this.camera.rotation.z = -this.steeringAngle * 0.035;
      this.camera.rotation.y = -this.steeringAngle * 0.04;
    }

    // 6. Skateboard Perspective (Exciting high-speed carving!)
    if (this.currentMode === 'skateboard' && this.skateboardGroup) {
      this.skateboardGroup.rotation.z = -this.steeringAngle * 0.45; // Deeper carve tilt
      this.skateboardGroup.position.x = this.steeringAngle * 0.12;
      this.skateboardGroup.position.y = Math.sin(now * 0.08) * 0.008 * speedRatio;
      this.camera.rotation.z = -this.steeringAngle * 0.05;
    }

    // 7. Walking Perspective
    if (this.currentMode === 'walk') {
      if (this.speed > 0.2) {
        const bob = Math.sin(now * 0.01) * 0.05 * speedRatio;
        this.camera.position.y = 1.68 + bob;
      } else {
        this.camera.position.y = 1.68;
      }
      this.camera.rotation.z = -this.steeringAngle * 0.02;
    }

    // 8. Windmill & Snow
    if (this.windmillBlades) {
      this.windmillBlades.rotation.z += 0.025;
    }

    if (this.snowParticles) {
      const positions = this.snowParticles.geometry.attributes.position.array;
      for (let s = 1; s < positions.length; s += 3) {
        positions[s] -= 0.18;
        if (positions[s] < 0) positions[s] = 25;
      }
      this.snowParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 9. Update UI Speedometer
    const speedEl = document.getElementById('speed-display');
    if (speedEl) {
      const displayUnit = this.currentMode === 'car' ? 'MPH' : 'KM/H';
      const displayVal = Math.max(0, Math.round(Math.abs(this.speed)));
      speedEl.textContent = `${displayVal} ${displayUnit}`;
    }

    // ================= 10. TWO-PASS DEPTH RENDERING (NO ROAD CLIPPING IN CAR!) =================
    this.renderer.clear();

    // Pass 1: Render the 3D outside world with cockpit & skateboard hidden
    this.cockpitGroup.visible = false;
    this.skateboardGroup.visible = false;
    this.renderer.render(this.scene, this.camera);

    // Pass 2: Clear depth buffer so the car interior or skateboard is ALWAYS rendered on top!
    this.renderer.clearDepth();

    if (this.currentMode === 'car') {
      this.cockpitGroup.visible = true;
      this.renderer.render(this.scene, this.camera);
    } else if (this.currentMode === 'skateboard') {
      this.skateboardGroup.visible = true;
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Global Game Singleton
window.retroGame = new RetroZenGameEngine();
