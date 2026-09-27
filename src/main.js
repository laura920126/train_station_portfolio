import * as THREE from "three";
import { createAudio } from "./audio.js";
import { paintField } from "./paint.js";
import { projects, slidesPassword } from "./projects.js";
import { createStation } from "./station.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(pointer: coarse)").matches;

const canvas = document.querySelector("#view");
const sentenceEl = document.querySelector("#sentence");
const cursorEl = document.querySelector("#cursor");
const projectEl = document.querySelector("#project");
const fieldEl = document.querySelector("#field");
const nameEl = document.querySelector("#p-name");
const sentenceCopyEl = document.querySelector("#p-sentence");
const indexEl = document.querySelector("#p-index");
const backBtn = document.querySelector("#back");
const slidesBtn = document.querySelector("#slides");
const gateEl = document.querySelector("#gate");
const gateForm = document.querySelector("#gate-form");
const gatePassword = document.querySelector("#gate-password");
const gateReveal = document.querySelector("#gate-reveal");
const gateError = document.querySelector("#gate-error");
const gateCancel = document.querySelector("#gate-cancel");
const toneBtn = document.querySelector("#tone");
const copyEl = document.querySelector(".project-copy");

if (!coarse) document.body.classList.add("fine");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const { scene, camera, posters, update, refreshText } = createStation();
const screens = posters.map((poster) => poster.screen);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const audio = createAudio();

const look = { yaw: 0, pitch: 0, fov: 46 };
const key = { yaw: 0, pitch: 0 };
const held = new Set();
const cam = {
  from: blankCam(),
  to: blankCam(),
  current: blankCam(),
};
const target = new THREE.Vector3();

let mode = "platform";
let modeStarted = 0;
let activeProject = null;
let hoveredIndex = -1;
let cover = 0;
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let touchLock = -1;
let lastFov = 0;

paintGrain();
resize();
window.addEventListener("resize", resize);

canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", (event) => held.delete(event.key.toLowerCase()));
backBtn.addEventListener("click", () => beginExit());
slidesBtn.addEventListener("click", onSlidesClick);
gateCancel.addEventListener("click", closeGate);
gateReveal.addEventListener("click", () => {
  const showing = gatePassword.type === "text";
  gatePassword.type = showing ? "password" : "text";
  gateReveal.setAttribute("aria-pressed", showing ? "false" : "true");
  gateReveal.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  gatePassword.focus();
});
gateEl.addEventListener("click", (event) => {
  if (event.target === gateEl) closeGate();
});
gateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const entered = gatePassword.value.trim();
  if (entered !== slidesPassword) {
    gateError.textContent = "That password doesn't open the slides.";
    gatePassword.select();
    return;
  }
  const url = activeProject?.project.slides;
  if (!url) {
    gateError.textContent = "This deck isn't linked yet.";
    return;
  }
  closeGate();
  window.open(url, "_blank", "noopener");
});
toneBtn.addEventListener("click", async () => {
  const on = await audio.toggle();
  toneBtn.textContent = on ? "Tone on" : "Tone off";
  toneBtn.setAttribute("aria-pressed", on ? "true" : "false");
});
window.addEventListener("popstate", () => {
  const id = location.hash.replace("#", "");
  if (!id) {
    if (mode === "inside" || mode === "enter") beginExit(true);
    return;
  }
  const found = posters.find((poster) => poster.project.id === id);
  if (found) beginEnter(found, true);
});

document.fonts.ready.then(() => {
  refreshText();
  posters.forEach((poster) => {
    poster.painter.paint(0, poster.hover, reduced);
    poster.texture.needsUpdate = true;
  });
});

if (location.hash) {
  const found = posters.find((poster) => poster.project.id === location.hash.slice(1));
  if (found) openImmediate(found);
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(frame);

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  update(time);

  const desired = desiredLook();
  const glide = 1 - Math.exp(-4.2 * dt);
  look.yaw += (desired.yaw - look.yaw) * glide;
  look.pitch += (desired.pitch - look.pitch) * glide;
  look.fov += (desired.fov - look.fov) * glide;

  if (mode === "platform") {
    const breathe = reduced ? 0 : Math.sin(time * 0.65) * 0.006;
    applyLook(look.yaw, look.pitch + breathe, look.fov);
    readCam(cam.current);
    cover += (0 - cover) * (1 - Math.exp(-6 * dt));
  } else if (mode === "enter" || mode === "exit") {
    const duration = mode === "enter" ? 1.05 : 0.85;
    const u = ease(Math.min(1, (performance.now() - modeStarted) / (duration * 1000)));
    const blended = lerpCam(cam.from, cam.to, u);
    writeCam(blended);
    const nextCover = mode === "enter" ? smoothstep(0.42, 0.92, u) : 1 - smoothstep(0.05, 0.55, u);
    cover = nextCover;
    if (u >= 1) {
      if (mode === "enter") {
        mode = "inside";
        document.body.classList.add("inside");
        if (slidesBtn.disabled) backBtn.focus();
        else slidesBtn.focus();
      } else {
        mode = "platform";
        document.body.classList.remove("inside");
        activeProject = null;
      }
    }
  }

  projectEl.style.opacity = String(cover);
  projectEl.classList.toggle("open", cover > 0.04);
  copyEl.style.transform = `translateY(${(1 - cover) * 28}px)`;

  let nextHover = -1;
  if (mode === "platform" && !coarse) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(screens, false);
    if (hits.length) nextHover = hits[0].object.userData.posterIndex;
  } else if (mode === "platform" && coarse) {
    nextHover = touchLock;
  }

  if (nextHover !== hoveredIndex) {
    if (nextHover >= 0) audio.hover(nextHover);
    hoveredIndex = nextHover;
  }
  document.body.classList.toggle("hot", hoveredIndex >= 0 && mode === "platform");

  posters.forEach((poster, index) => {
    const targetHover = index === hoveredIndex ? 1 : 0;
    poster.hover += (targetHover - poster.hover) * (1 - Math.exp(-8 * dt));
    poster.glow.material.opacity = 0.14 + poster.hover * 0.28;
    const scale = 1 + poster.hover * 0.028;
    poster.group.scale.setScalar(scale);
    const dirty = poster.painter.paint(time, poster.hover, reduced);
    if (dirty) poster.texture.needsUpdate = true;
  });

  placeSentence();
  renderer.render(scene, camera);
}

function desiredLook() {
  const x = coarse ? 0 : edge(pointer.x, 0.58);
  const y = coarse ? 0 : edge(pointer.y, 0.42);
  const yawTarget =
    (held.has("a") || held.has("arrowleft") ? -0.55 : 0) +
    (held.has("d") || held.has("arrowright") ? 0.55 : 0);
  const pitchTarget =
    (held.has("w") || held.has("arrowup") ? 0.38 : 0) +
    (held.has("s") || held.has("arrowdown") ? -0.28 : 0);
  const follow = 1 - Math.exp(-3 * 0.016);
  key.yaw += (yawTarget - key.yaw) * follow;
  key.pitch += (pitchTarget - key.pitch) * follow;

  const yaw = clamp(x * 1.02 + key.yaw, -1.12, 1.12);
  const pitch = clamp(y * 0.5 + key.pitch, -0.34, 0.52);
  const stretch = Math.min(1, Math.abs(x) * 0.75 + Math.abs(y) * 0.45 + Math.abs(key.yaw) + Math.abs(key.pitch));
  return { yaw, pitch, fov: 44 + stretch * 6 };
}

function applyLook(yaw, pitch, fov) {
  const z = 5.15 + Math.abs(yaw) * 0.35 + Math.abs(pitch) * 0.15;
  const x = Math.sin(yaw) * 0.28;
  const y = 1.62 + pitch * 0.12;
  camera.position.set(x, y, z);
  if (Math.abs(fov - lastFov) > 0.05) {
    lastFov = fov;
    camera.fov = fov;
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
  }
  target.set(
    x + Math.sin(yaw) * 6,
    y + pitch * 6.6,
    z - Math.cos(yaw) * 6
  );
  camera.lookAt(target);
}

function placeSentence() {
  if (hoveredIndex < 0 || mode !== "platform") {
    sentenceEl.style.opacity = "0";
    return;
  }
  const poster = posters[hoveredIndex];
  target.set(
    poster.group.position.x,
    poster.group.position.y - 0.62,
    poster.group.position.z + 0.04
  );
  target.project(camera);
  const x = (target.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-target.y * 0.5 + 0.5) * window.innerHeight;
  sentenceEl.textContent = poster.project.description;
  sentenceEl.style.left = `${x}px`;
  sentenceEl.style.top = `${y}px`;
  sentenceEl.style.opacity = String(Math.min(1, poster.hover * 1.15));
}

function onPointerMove(event) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  if (!coarse && mode === "platform") {
    cursorEl.style.left = `${event.clientX}px`;
    cursorEl.style.top = `${event.clientY}px`;
  }
}

let down = null;

function onPointerDown(event) {
  down = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
}

function onPointerUp(event) {
  if (!down || event.pointerId !== down.pointerId) return;
  const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
  down = null;
  if (moved > 12 || mode !== "platform") return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(screens, false);
  if (!hits.length) {
    touchLock = -1;
    return;
  }
  const index = hits[0].object.userData.posterIndex;
  if (coarse && touchLock !== index) {
    touchLock = index;
    return;
  }
  beginEnter(posters[index]);
}

function onKeyDown(event) {
  if (event.key === "Escape" && !gateEl.hidden) {
    closeGate();
    return;
  }
  if (event.key === "Escape" && (mode === "inside" || mode === "enter")) {
    beginExit();
    return;
  }
  if (mode === "platform" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
  }
  held.add(event.key.toLowerCase());
}

function beginEnter(poster, fromHistory = false) {
  if (mode === "enter" || mode === "inside") return;
  activeProject = poster;
  nameEl.textContent = poster.project.name;
  sentenceCopyEl.textContent = poster.project.description;
  indexEl.textContent = String(poster.index + 1).padStart(2, "0");
  syncSlidesButton(poster.project);
  paintField(fieldEl, poster.project);
  if (!fromHistory) {
    history.pushState({ id: poster.project.id }, "", `#${poster.project.id}`);
  }
  readCam(cam.from);
  const position = poster.group.position;
  cam.to = {
    px: position.x * 0.08,
    py: position.y,
    pz: position.z + 1.15,
    tx: position.x,
    ty: position.y,
    tz: position.z,
    fov: 26,
  };
  mode = "enter";
  modeStarted = performance.now();
  audio.enter();
  sentenceEl.style.opacity = "0";
}

function openImmediate(poster) {
  activeProject = poster;
  nameEl.textContent = poster.project.name;
  sentenceCopyEl.textContent = poster.project.description;
  indexEl.textContent = String(poster.index + 1).padStart(2, "0");
  syncSlidesButton(poster.project);
  paintField(fieldEl, poster.project);
  const position = poster.group.position;
  writeCam({
    px: position.x * 0.08,
    py: position.y,
    pz: position.z + 1.15,
    tx: position.x,
    ty: position.y,
    tz: position.z,
    fov: 26,
  });
  cover = 1;
  mode = "inside";
  document.body.classList.add("inside");
  projectEl.style.opacity = "1";
  projectEl.classList.add("open");
}

function syncSlidesButton(project) {
  const comingSoon = !project.slides;
  slidesBtn.textContent = comingSoon ? "Coming soon" : "See project slides";
  slidesBtn.disabled = comingSoon;
}

function onSlidesClick() {
  const project = activeProject?.project;
  if (!project?.slides) return;
  if (project.password === false) {
    window.open(project.slides, "_blank", "noopener");
    return;
  }
  openGate();
}

function openGate() {
  if (!activeProject) return;
  gateError.textContent = "";
  gatePassword.value = "";
  hidePassword();
  gateEl.hidden = false;
  gatePassword.focus();
}

function closeGate(restoreFocus = true) {
  gateEl.hidden = true;
  gateError.textContent = "";
  gatePassword.value = "";
  hidePassword();
  if (restoreFocus && mode === "inside") slidesBtn.focus();
}

function hidePassword() {
  gatePassword.type = "password";
  gateReveal.setAttribute("aria-pressed", "false");
  gateReveal.setAttribute("aria-label", "Show password");
}

function beginExit(fromHistory = false) {
  if (mode === "exit" || mode === "platform") return;
  closeGate(false);
  if (!fromHistory && location.hash) {
    if (history.state?.id) {
      history.back();
      return;
    }
    history.replaceState({}, "", `${location.pathname}${location.search}`);
  }
  readCam(cam.from);
  applyLook(look.yaw, look.pitch, look.fov);
  readCam(cam.to);
  mode = "exit";
  modeStarted = performance.now();
  audio.exit();
}

function readCam(slot) {
  slot.px = camera.position.x;
  slot.py = camera.position.y;
  slot.pz = camera.position.z;
  slot.tx = target.x;
  slot.ty = target.y;
  slot.tz = target.z;
  slot.fov = camera.fov;
  return slot;
}

function writeCam(slot) {
  camera.position.set(slot.px, slot.py, slot.pz);
  camera.fov = slot.fov;
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();
  target.set(slot.tx, slot.ty, slot.tz);
  camera.lookAt(target);
}

function lerpCam(a, b, u) {
  return {
    px: a.px + (b.px - a.px) * u,
    py: a.py + (b.py - a.py) * u,
    pz: a.pz + (b.pz - a.pz) * u,
    tx: a.tx + (b.tx - a.tx) * u,
    ty: a.ty + (b.ty - a.ty) * u,
    tz: a.tz + (b.tz - a.tz) * u,
    fov: a.fov + (b.fov - a.fov) * u,
  };
}

function blankCam() {
  return { px: 0, py: 1.6, pz: 5.2, tx: 0, ty: 1.6, tz: 0, fov: 44 };
}

function edge(value, dead) {
  const amount = Math.abs(value);
  const sign = Math.sign(value);
  if (amount <= dead) return (value / Math.max(dead, 0.0001)) * 0.07;
  const t = (amount - dead) / (1 - dead);
  return sign * (0.07 + t * 0.93);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ease(u) {
  return u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();
  if (activeProject && cover > 0.2) paintField(fieldEl, activeProject.project);
}

function paintGrain() {
  const grain = document.querySelector("#grain");
  const noise = document.createElement("canvas");
  noise.width = 160;
  noise.height = 160;
  const ctx = noise.getContext("2d");
  const image = ctx.createImageData(160, 160);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 90 + Math.random() * 140;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 55;
  }
  ctx.putImageData(image, 0, 0);
  grain.style.backgroundImage = `url(${noise.toDataURL()})`;
}
