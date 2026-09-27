import * as THREE from "three";
import { projects } from "./projects.js";
import {
  createClockCanvas,
  createPosterPainter,
  makeCapTile,
  makeFloorTexture,
  makeMapTexture,
  makePlaqueTexture,
  makeSignTexture,
  makeTileTexture,
  paintClock,
} from "./paint.js";

export const POSTER_H = 2.05;
export const POSTER_W = POSTER_H * (1000 / 1500);

function canvasTexture(canvas, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const repeating = repeatX !== 1 || repeatY !== 1;
  texture.wrapS = repeating ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = repeating ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  return texture;
}

function tiledPlane(width, height, source, tileWorld) {
  const material = new THREE.MeshBasicMaterial({
    map: canvasTexture(source, width / tileWorld, height / tileWorld),
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

export function createStation() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#070808");
  scene.fog = new THREE.Fog("#070808", 28, 56);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.08, 80);

  const tileCanvas = makeTileTexture();
  const floorCanvas = makeFloorTexture();

  const backWall = tiledPlane(12.8, 5.15, tileCanvas, 0.78);
  backWall.position.set(1.7, 2.55, 0);
  scene.add(backWall);

  const cap = tiledPlane(12.8, 0.46, makeCapTile(), 0.23);
  cap.position.set(1.7, 3.34, 0.025);
  scene.add(cap);

  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(12.8, 0.028),
    new THREE.MeshBasicMaterial({ color: 0xff4d3a })
  );
  stripe.position.set(1.7, 3.09, 0.03);
  scene.add(stripe);

  const baseboard = new THREE.Mesh(
    new THREE.PlaneGeometry(12.8, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x161716 })
  );
  baseboard.position.set(1.7, 0.08, 0.03);
  scene.add(baseboard);

  const floor = tiledPlane(11.5, 16.5, floorCanvas, 0.9);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(2.05, 0, 7.4);
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 36),
    new THREE.MeshBasicMaterial({ color: 0x1c211f })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(-1.2, 5.72, 6);
  scene.add(ceiling);

  addSideWalls(scene, tileCanvas);
  addTunnel(scene);
  addStairs(scene);
  const labels = addIdentity(scene);
  addPlatformDetails(scene, labels);

  addLights(scene);
  const train = addTrain(scene);
  addDust(scene);
  const posters = addPosters(scene);

  const clockCanvas = createClockCanvas();
  const clockTexture = canvasTexture(clockCanvas);
  const clock = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.46),
    new THREE.MeshBasicMaterial({ map: clockTexture })
  );
  clock.position.set(7.4, 3.55, 1.35);
  clock.rotation.y = -Math.PI / 2;
  scene.add(clock);

  const clockFrame = new THREE.Mesh(
    new THREE.PlaneGeometry(1.82, 0.58),
    new THREE.MeshBasicMaterial({ color: 0x0c0e0d })
  );
  clockFrame.position.set(7.48, 3.55, 1.35);
  clockFrame.rotation.y = -Math.PI / 2;
  scene.add(clockFrame);

  let lastSecond = -1;

  function update(time) {
    const tailZ = -20 + ((time * 5.4) % 48);
    train.cars[0].position.z = tailZ;
    train.cars[1].position.z = tailZ + train.pitch;

    const second = new Date().getSeconds();
    if (second !== lastSecond) {
      lastSecond = second;
      paintClock(clockCanvas, new Date());
      clockTexture.needsUpdate = true;
    }
  }

  function refreshText() {
    makeSignTexture(labels.signCanvas);
    makePlaqueTexture(labels.plaqueCanvas);
    makeMapTexture(labels.mapCanvas);
    labels.signTexture.needsUpdate = true;
    labels.plaqueTexture.needsUpdate = true;
    labels.mapTexture.needsUpdate = true;
  }

  return { scene, camera, posters, update, refreshText };
}

function addSideWalls(scene, tileCanvas) {
  const right = tiledPlane(18.4, 5.72, tileCanvas, 0.78);
  right.position.set(7.7, 2.86, 7.1);
  right.rotation.y = -Math.PI / 2;
  scene.add(right);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.18, 18.4),
    new THREE.MeshBasicMaterial({ color: 0x161716 })
  );
  board.position.set(7.64, 0.09, 7.1);
  scene.add(board);

  const end = new THREE.Mesh(
    new THREE.PlaneGeometry(11.6, 5.72),
    new THREE.MeshBasicMaterial({ color: 0x121615 })
  );
  end.position.set(2.4, 2.86, 16.3);
  end.rotation.y = Math.PI;
  scene.add(end);
}

function addTunnel(scene) {
  const shell = new THREE.MeshBasicMaterial({ color: 0x242a27 });
  const ballast = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 32),
    new THREE.MeshBasicMaterial({ color: 0x1a1612 })
  );
  ballast.rotation.x = -Math.PI / 2;
  ballast.position.set(-7.05, -1.05, 8);
  scene.add(ballast);

  const farWall = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 7.05),
    new THREE.MeshBasicMaterial({ color: 0x1b211e })
  );
  farWall.position.set(-10.15, 2.35, 8);
  farWall.rotation.y = Math.PI / 2;
  scene.add(farWall);

  const seamMat = new THREE.MeshBasicMaterial({ color: 0x101412 });
  for (let i = 0; i < 13; i += 1) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6.4, 0.06), seamMat);
    seam.position.set(-10.08, 2.15, -6.2 + i * 2.35);
    scene.add(seam);
  }
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.16, 30),
    new THREE.MeshBasicMaterial({ color: 0x3c4640 })
  );
  belt.position.set(-10.06, 1.55, 8);
  scene.add(belt);

  const soffit = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 32), shell);
  soffit.rotation.x = Math.PI / 2;
  soffit.position.set(-7.05, 3.62, 8);
  scene.add(soffit);

  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.08, 16.4),
    new THREE.MeshBasicMaterial({ color: 0xd9d3c8 })
  );
  lip.position.set(-4.05, 3.5, 8);
  scene.add(lip);

  const fascia = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 2.2, 32),
    new THREE.MeshBasicMaterial({ color: 0x1c211f })
  );
  fascia.position.set(-3.95, 4.62, 8);
  scene.add(fascia);

  const portal = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.8), shell);
  portal.position.set(-7.05, 1.25, -7.7);
  scene.add(portal);
  const boreEnd = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.8), shell);
  boreEnd.position.set(-7.05, 1.25, 23.5);
  scene.add(boreEnd);

  const nosing = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 1.12, 16.2),
    new THREE.MeshBasicMaterial({ color: 0x2c2e2c })
  );
  nosing.position.set(-3.78, -0.5, 8);
  scene.add(nosing);

  const tactile = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 15.6),
    new THREE.MeshBasicMaterial({ map: canvasTexture(makeTactile(), 1, 8) })
  );
  tactile.rotation.x = -Math.PI / 2;
  tactile.position.set(-3.42, 0.015, 7.6);
  scene.add(tactile);

  const edgeLine = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 15.6),
    new THREE.MeshBasicMaterial({ color: 0xf0c423 })
  );
  edgeLine.rotation.x = -Math.PI / 2;
  edgeLine.position.set(-3.72, 0.02, 7.6);
  scene.add(edgeLine);

  const railMat = new THREE.MeshBasicMaterial({ color: 0x8a8174 });
  for (const x of [-5.935, -4.615]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 32), railMat);
    rail.position.set(x, -0.86, 8);
    scene.add(rail);
  }

  const sleeperGeo = new THREE.BoxGeometry(1.85, 0.08, 0.18);
  const sleeperCount = 48;
  const sleepers = new THREE.InstancedMesh(
    sleeperGeo,
    new THREE.MeshBasicMaterial({ color: 0x5a4636 }),
    sleeperCount
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < sleeperCount; i += 1) {
    dummy.position.set(-5.275, -0.96, -7.2 + i * 0.64);
    dummy.updateMatrix();
    sleepers.setMatrixAt(i, dummy.matrix);
  }
  scene.add(sleepers);

  const conduit = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 15.5),
    new THREE.MeshBasicMaterial({ color: 0x1d4e86 })
  );
  conduit.position.set(-8.85, -0.55, 8);
  scene.add(conduit);
  const conduit2 = conduit.clone();
  conduit2.position.y = -0.28;
  scene.add(conduit2);

  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0 });
  const housing = new THREE.MeshBasicMaterial({ color: 0x2a2e2c });
  for (let i = 0; i < 7; i += 1) {
    const z = 1.6 + i * 2.15;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 1.05), lampMat);
    lamp.position.set(-6.55, 3.52, z);
    scene.add(lamp);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 1.2), housing);
    hood.position.set(-6.55, 3.58, z);
    scene.add(hood);
  }

  const signal = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x3dff8a })
  );
  signal.position.set(-9.95, 2.15, 1.1);
  scene.add(signal);

  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 1.05, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x1a1c1b })
  );
  post.position.set(-3.28, 0.52, 3.55);
  scene.add(post);
  const stepSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.42),
    new THREE.MeshBasicMaterial({ map: canvasTexture(makeStepSign()) })
  );
  stepSign.position.set(-3.22, 1.08, 3.55);
  stepSign.rotation.y = 0.35;
  scene.add(stepSign);
}

function addStairs(scene) {
  const steps = 9;
  const rise = 0.19;
  const run = 0.3;
  const width = 2.15;
  const z = 3.2;
  const xStart = 4.62;
  const wallX = 7.66;
  const massMat = new THREE.MeshBasicMaterial({ color: 0xc8c2b8 });
  const treadMat = new THREE.MeshBasicMaterial({ color: 0xe4ded4 });
  const skirtMat = new THREE.MeshBasicMaterial({ color: 0x2a2c2a });
  const capH = 0.022;
  const skirtT = 0.04;
  const bodyDepth = width - skirtT * 2 - 0.01;

  for (let i = 0; i < steps; i += 1) {
    const h = (i + 1) * rise;
    const x = xStart + i * run + run * 0.5;
    const bodyW = run - 0.008;
    const block = new THREE.Mesh(new THREE.BoxGeometry(bodyW, h, bodyDepth), massMat);
    block.position.set(x, h / 2, z);
    scene.add(block);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(bodyW, capH, width), treadMat);
    cap.position.set(x, h + capH / 2, z);
    scene.add(cap);
    for (const side of [-1, 1]) {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(bodyW, h, skirtT), skirtMat);
      skirt.position.set(x, h / 2, z + side * (bodyDepth / 2 + skirtT / 2 + 0.004));
      scene.add(skirt);
    }
  }

  const topX = xStart + steps * run;
  const topY = steps * rise;
  const landGap = 0.008;
  const landDepth = wallX - topX - landGap;
  const landing = new THREE.Mesh(new THREE.BoxGeometry(landDepth, topY, bodyDepth), massMat);
  landing.position.set(topX + landGap + landDepth / 2, topY / 2, z);
  scene.add(landing);
  const landTop = new THREE.Mesh(new THREE.BoxGeometry(landDepth, capH, width), treadMat);
  landTop.position.set(topX + landGap + landDepth / 2, topY + capH / 2, z);
  scene.add(landTop);
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(landDepth, topY, skirtT), skirtMat);
    skirt.position.set(
      topX + landGap + landDepth / 2,
      topY / 2,
      z + side * (bodyDepth / 2 + skirtT / 2 + 0.004)
    );
    scene.add(skirt);
  }

  const metal = new THREE.MeshBasicMaterial({ color: 0xb7c0c4 });
  const railLen = Math.hypot(steps * run, topY);
  const railLift = 0.86;
  for (const side of [-1, 1]) {
    const railZ = z + side * (width / 2 + 0.02);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.035, 0.035), metal);
    rail.position.set(xStart + (steps * run) / 2, topY * 0.5 + railLift, railZ);
    rail.rotation.z = Math.atan2(topY, steps * run);
    scene.add(rail);
    for (let i = 0; i < steps; i += 2) {
      const postH = railLift;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, postH, 0.03), metal);
      post.position.set(xStart + i * run + run * 0.5, (i + 1) * rise + capH + postH / 2, railZ);
      scene.add(post);
    }
    const topPost = new THREE.Mesh(new THREE.BoxGeometry(0.03, railLift, 0.03), metal);
    topPost.position.set(topX - run * 0.2, topY + capH + railLift / 2, railZ);
    scene.add(topPost);
  }

  const doorW = 1.28;
  const doorH = 2.02;
  const doorX = 7.58;
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x161716 });
  const opening = new THREE.Mesh(
    new THREE.PlaneGeometry(doorW, doorH),
    new THREE.MeshBasicMaterial({ color: 0x070808 })
  );
  opening.position.set(doorX, topY + doorH / 2, z);
  opening.rotation.y = -Math.PI / 2;
  scene.add(opening);
  const header = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, doorW + 0.22), frameMat);
  header.position.set(doorX - 0.02, topY + doorH + 0.05, z);
  scene.add(header);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, doorW + 0.12), treadMat);
  sill.position.set(doorX + 0.04, topY + capH + 0.03, z);
  scene.add(sill);
  for (const side of [-1, 1]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.1, doorH + 0.05, 0.08), frameMat);
    jamb.position.set(doorX - 0.02, topY + doorH / 2, z + side * (doorW / 2 + 0.05));
    scene.add(jamb);
  }

  const column = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 4.6, 0.55),
    new THREE.MeshBasicMaterial({ color: 0xe7e2da })
  );
  column.position.set(xStart - 0.55, 2.3, z - width / 2 - 0.5);
  scene.add(column);
  const columnBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.16, 0.68),
    new THREE.MeshBasicMaterial({ color: 0x161716 })
  );
  columnBase.position.set(xStart - 0.55, 0.08, z - width / 2 - 0.5);
  scene.add(columnBase);

  const exitSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.32),
    new THREE.MeshBasicMaterial({ map: canvasTexture(makeExitSign()) })
  );
  exitSign.position.set(7.55, topY + doorH + 0.38, z);
  exitSign.rotation.y = -Math.PI / 2;
  scene.add(exitSign);
}

function makeTactile() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c9a24a";
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = "#e2c36a";
  for (let y = 16; y < 256; y += 32) {
    for (let x = 16; x < 128; x += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return canvas;
}

function makeStepSign() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#141816";
  ctx.fillRect(0, 0, 640, 360);
  ctx.strokeStyle = "#f0c423";
  ctx.lineWidth = 14;
  ctx.strokeRect(16, 16, 608, 328);
  ctx.fillStyle = "#f4f1ea";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '500 54px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText("WATCH", 320, 130);
  ctx.fillText("THE STEP", 320, 210);
  return canvas;
}

function makeExitSign() {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 220;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#123226";
  ctx.fillRect(0, 0, 720, 220);
  ctx.fillStyle = "#d7ffe8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '500 48px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText("TO THE STREET", 360, 110);
  return canvas;
}

function addIdentity(scene) {
  const signCanvas = makeSignTexture();
  const signTexture = canvasTexture(signCanvas);
  const bladeW = 2.05;
  const bladeH = 0.62;
  const blade = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(bladeW, bladeH),
    new THREE.MeshBasicMaterial({ map: signTexture })
  );
  face.position.z = 0.07;
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(bladeW, bladeH, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x101412 })
  );
  blade.add(slab, face);
  const tilt = 0.2;
  blade.position.set(0, 4.78, 1.72);
  blade.rotation.x = tilt;
  scene.add(blade);

  const halfH = bladeH / 2;
  const topY = blade.position.y + halfH * Math.cos(tilt);
  const topZ = blade.position.z + halfH * Math.sin(tilt);
  const hangerMat = new THREE.MeshBasicMaterial({ color: 0xd7d1c6 });
  const drop = 5.72 - topY;
  for (const x of [-0.68, 0.68]) {
    const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.035, drop, 0.035), hangerMat);
    hanger.position.set(x, topY + drop / 2, topZ);
    scene.add(hanger);
  }

  const plaqueCanvas = makePlaqueTexture();
  const plaqueTexture = canvasTexture(plaqueCanvas);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 0.78),
    new THREE.MeshBasicMaterial({ map: plaqueTexture })
  );
  plaque.position.set(0, 4.42, 0.05);
  scene.add(plaque);

  return { signCanvas, signTexture, plaqueCanvas, plaqueTexture };
}

function addPlatformDetails(scene, labels) {
  const mapCanvas = makeMapTexture();
  const mapTexture = canvasTexture(mapCanvas);
  labels.mapCanvas = mapCanvas;
  labels.mapTexture = mapTexture;
  const map = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 2.15),
    new THREE.MeshBasicMaterial({ map: mapTexture })
  );
  map.position.set(7.58, 1.85, 0.85);
  map.rotation.y = -Math.PI / 2;
  scene.add(map);

  const mapBack = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 2.3),
    new THREE.MeshBasicMaterial({ color: 0x0e100f })
  );
  mapBack.position.set(7.66, 1.85, 0.85);
  mapBack.rotation.y = -Math.PI / 2;
  scene.add(mapBack);

  const bench = new THREE.Group();
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.08, 0.46),
    new THREE.MeshBasicMaterial({ color: 0x6a4630 })
  );
  seat.position.y = 0.46;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.4, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x232625 })
  );
  frame.position.y = 0.24;
  bench.add(seat, frame);
  bench.position.set(6.85, 0, 5.55);
  bench.rotation.y = -Math.PI / 2;
  scene.add(bench);

  for (const x of [-3.55, 3.55]) {
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 3.05, 0.22),
      new THREE.MeshBasicMaterial({ color: 0xe7e2da })
    );
    pier.position.set(x, 1.62, 0.1);
    scene.add(pier);
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.2, 0.34),
      new THREE.MeshBasicMaterial({ color: 0x161716 })
    );
    shoe.position.set(x, 0.1, 0.14);
    scene.add(shoe);
  }
}

function addLights(scene) {
  const tubes = [];
  for (const z of [1.4, 3.5, 5.7]) {
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.07, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xf7f3e8 })
    );
    tube.position.set(0, 5.62, z);
    scene.add(tube);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 0.7),
      new THREE.MeshBasicMaterial({
        color: 0xfff6e4,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.set(0, 5.68, z);
    scene.add(glow);
    tubes.push(tube);
  }
  return tubes;
}

const CAR_W = 2.25;
const CAR_H = 2.55;
const CAR_L = 8.8;
const CAR_COUPLE = 0.42;
const CAR_X = -5.275;
const CAR_Y = 1.02;

function makeCarSide() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d5dbdf";
  ctx.fillRect(0, 0, 1024, 384);
  ctx.fillStyle = "#b7bec4";
  ctx.fillRect(0, 0, 1024, 26);

  const bandY = 72;
  const bandH = 138;
  ctx.fillStyle = "#12171c";
  ctx.fillRect(14, bandY, 996, bandH);

  const doors = [
    [168, 248],
    [472, 552],
    [776, 856],
  ];
  const glass = ["#1d2b38", "#243444", "#182430", "#2a3a4a"];
  const warm = ["#f2c48a", "#e8b56c", "#f6d7aa"];
  let pane = 0;
  for (let x = 26; x < 996; x += 58) {
    const blocked = doors.some(([a, b]) => x + 16 > a && x < b);
    if (blocked) continue;
    ctx.fillStyle = glass[pane % glass.length];
    ctx.fillRect(x, bandY + 12, 48, bandH - 24);
    if (pane % 3 !== 1) {
      ctx.fillStyle = warm[pane % warm.length];
      ctx.globalAlpha = 0.62;
      ctx.fillRect(x + 5, bandY + bandH - 52, 38, 24);
      ctx.globalAlpha = 1;
    }
    pane += 1;
  }

  doors.forEach(([a, b]) => {
    ctx.fillStyle = "#c8ced2";
    ctx.fillRect(a, bandY - 6, b - a, bandH + 78);
    ctx.strokeStyle = "#8e979c";
    ctx.lineWidth = 3;
    ctx.strokeRect(a + 3, bandY, b - a - 6, bandH + 66);
    ctx.fillStyle = "#1a2834";
    ctx.fillRect(a + 12, bandY + 10, b - a - 24, 72);
    ctx.fillStyle = "#7e878c";
    ctx.fillRect((a + b) / 2 - 1.5, bandY, 3, bandH + 66);
  });

  ctx.fillStyle = "#e25a34";
  ctx.fillRect(0, bandY + bandH + 10, 1024, 14);
  ctx.fillStyle = "#2a3034";
  ctx.fillRect(0, 332, 1024, 52);
  ctx.strokeStyle = "rgba(70, 78, 84, 0.55)";
  ctx.lineWidth = 2;
  for (const x of [360, 664]) {
    ctx.beginPath();
    ctx.moveTo(x, 236);
    ctx.lineTo(x, 324);
    ctx.stroke();
  }
  return canvas;
}

function makeCarEnd(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d0d6db";
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "#b7bec4";
  ctx.fillRect(0, 0, 512, 34);
  ctx.fillStyle = "#10161c";
  ctx.fillRect(64, 78, 384, 156);
  ctx.fillStyle = "#0c1014";
  ctx.fillRect(108, 96, 296, 40);
  ctx.fillStyle = "#f3efe6";
  ctx.font = '500 22px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("LOCAL", 256, 116);
  const lamp = kind === "nose" ? "#fff4d0" : "#e23b3b";
  for (const x of [128, 384]) {
    ctx.fillStyle = "#14181c";
    ctx.beginPath();
    ctx.arc(x, 372, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.arc(x, 372, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#2a3034";
  ctx.fillRect(0, 448, 512, 64);
  ctx.fillStyle = "#14181c";
  ctx.fillRect(214, 408, 84, 32);
  return canvas;
}

function addTrain(scene) {
  const sideMat = new THREE.MeshBasicMaterial({ map: canvasTexture(makeCarSide()) });
  const noseMat = new THREE.MeshBasicMaterial({ map: canvasTexture(makeCarEnd("nose")) });
  const tailMat = new THREE.MeshBasicMaterial({ map: canvasTexture(makeCarEnd("tail")) });
  const shellMat = new THREE.MeshBasicMaterial({ color: 0xd5dbdf });
  const roofMat = new THREE.MeshBasicMaterial({ color: 0xb4babf });
  const skirtMat = new THREE.MeshBasicMaterial({ color: 0x23282c });
  const bogieMat = new THREE.MeshBasicMaterial({ color: 0x1a1e22 });
  const wheelMat = new THREE.MeshBasicMaterial({ color: 0x3c444c });
  const bodyGeo = new THREE.BoxGeometry(CAR_W, CAR_H, CAR_L);
  const sideGeo = new THREE.PlaneGeometry(CAR_L * 0.985, CAR_H * 0.97);
  const wheelCenter = -0.81 + 0.17 - CAR_Y;

  function makeCar(endMat, endSign) {
    const car = new THREE.Group();
    car.add(new THREE.Mesh(bodyGeo, shellMat));

    const roof = new THREE.Mesh(new THREE.BoxGeometry(CAR_W * 0.9, 0.14, CAR_L * 0.94), roofMat);
    roof.position.y = CAR_H / 2 + 0.05;
    car.add(roof);
    const unit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 1.4), bogieMat);
    unit.position.set(0, CAR_H / 2 + 0.16, 1.2);
    car.add(unit);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(CAR_W * 0.94, 0.22, CAR_L * 0.92), skirtMat);
    skirt.position.y = -CAR_H / 2 - 0.08;
    car.add(skirt);

    const side = new THREE.Mesh(sideGeo, sideMat);
    side.position.set(CAR_W / 2 + 0.012, 0, 0);
    side.rotation.y = Math.PI / 2;
    car.add(side);
    const far = new THREE.Mesh(sideGeo, sideMat);
    far.position.set(-CAR_W / 2 - 0.012, 0, 0);
    far.rotation.y = -Math.PI / 2;
    car.add(far);

    const end = new THREE.Mesh(new THREE.PlaneGeometry(CAR_W * 0.94, CAR_H * 0.94), endMat);
    end.position.set(0, 0, endSign * (CAR_L / 2 + 0.012));
    if (endSign < 0) end.rotation.y = Math.PI;
    car.add(end);

    const inner = new THREE.Mesh(
      new THREE.PlaneGeometry(CAR_W * 0.72, CAR_H * 0.7),
      new THREE.MeshBasicMaterial({ color: 0x16191c })
    );
    inner.position.set(0, 0.08, -endSign * (CAR_L / 2 + 0.014));
    if (endSign > 0) inner.rotation.y = Math.PI;
    car.add(inner);

    const glowMat = new THREE.MeshBasicMaterial({
      color: endSign > 0 ? 0xfff1c4 : 0xff3a3a,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (const x of [-0.52, 0.52]) {
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), glowMat);
      glow.position.set(x, -0.42, endSign * (CAR_L / 2 + 0.02));
      if (endSign < 0) glow.rotation.y = Math.PI;
      car.add(glow);
    }

    for (const z of [-2.7, 2.7]) {
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.26, 1.2), bogieMat);
      bogie.position.set(0, -CAR_H / 2 - 0.2, z);
      car.add(bogie);
      for (const x of [-0.66, 0.66]) {
        const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.7), wheelMat);
        wheel.position.set(x, wheelCenter, z);
        car.add(wheel);
      }
    }

    car.position.set(CAR_X, CAR_Y, 0);
    scene.add(car);
    return car;
  }

  const tail = makeCar(tailMat, -1);
  const lead = makeCar(noseMat, 1);
  const bellowsMat = new THREE.MeshBasicMaterial({ color: 0x141618 });
  const ribMat = new THREE.MeshBasicMaterial({ color: 0x2a2e32 });
  for (let i = 0; i < 3; i += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(1.42 - i * 0.08, 1.95, 0.07), i === 1 ? ribMat : bellowsMat);
    rib.position.set(0, 0.1, CAR_L / 2 + 0.08 + i * 0.13);
    tail.add(rib);
  }

  return { cars: [tail, lead], pitch: CAR_L + CAR_COUPLE };
}

function addDust(scene) {
  const count = 70;
  const array = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    array[i * 3] = (Math.random() - 0.5) * 8;
    array[i * 3 + 1] = 0.5 + Math.random() * 3.4;
    array[i * 3 + 2] = 0.4 + Math.random() * 5.5;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(array, 3));
  const dust = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.018,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  scene.add(dust);
  return dust;
}

function addPosters(scene) {
  const pitch = POSTER_W + 0.2;
  const origin = -((projects.length - 1) * pitch) / 2;

  return projects.map((project, index) => {
    const painter = createPosterPainter(project, index);
    const texture = canvasTexture(painter.canvas);
    const group = new THREE.Group();

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(POSTER_W + 0.28, POSTER_H + 0.22),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(project.colors[0]),
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.position.z = -0.04;
    glow.raycast = () => {};

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(POSTER_W, POSTER_H),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    screen.userData.posterIndex = index;

    group.add(glow, screen);
    group.position.set(origin + index * pitch, 1.78, 0.08);
    scene.add(group);

    return {
      project,
      index,
      painter,
      texture,
      group,
      glow,
      screen,
      hover: 0,
    };
  });
}
