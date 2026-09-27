const W = 640;
const H = 960;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#+*";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpHex(a, b, t) {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  const mix = from.map((channel, i) => Math.round(channel + (to[i] - channel) * t));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function hitsTextZone(rect, zone) {
  return !(
    rect.x + rect.w < zone.x ||
    rect.x > zone.x + zone.w ||
    rect.y + rect.h < zone.y ||
    rect.y > zone.y + zone.h
  );
}

function drawBlocks(ctx, bounds, rng, colors, corner) {
  const size = Math.round(Math.min(bounds.w, bounds.h) / 12);
  const textZone = {
    x: bounds.x + bounds.w * 0.18,
    y: bounds.y + bounds.h * 0.36,
    w: bounds.w * 0.64,
    h: bounds.h * 0.3,
  };
  const steps = 9;

  for (let col = 0; col < steps; col += 1) {
    const rows = steps - Math.floor(col * 0.72);
    for (let row = 0; row < rows; row += 1) {
      if (rng() > 0.9) continue;
      const wide = rng() > 0.78;
      const tall = rng() > 0.8;
      const bw = size * (wide ? 1.7 : 1);
      const bh = size * (tall ? 1.7 : 1);
      let x = bounds.x + col * size * 0.92;
      let y = bounds.y + bounds.h - (row + 1) * size * 0.92 - (tall ? size * 0.3 : 0);
      if (corner === 1) {
        x = bounds.x + bounds.w - col * size * 0.92 - bw;
        y = bounds.y + row * size * 0.92;
      } else if (corner === 2) {
        x = bounds.x + (col % 4) * size * 0.95;
        y = bounds.y + (row + col * 0.2) * size * 0.7;
      } else if (corner === 3) {
        x = bounds.x + bounds.w - col * size * 0.92 - bw;
        y = bounds.y + bounds.h - (row + 1) * size * 0.92;
      }

      const rect = { x, y, w: bw, h: bh };
      if (hitsTextZone(rect, textZone)) continue;
      const clippedX = Math.max(bounds.x, rect.x);
      const clippedY = Math.max(bounds.y, rect.y);
      const clippedW = Math.min(bounds.x + bounds.w, rect.x + rect.w) - clippedX;
      const clippedH = Math.min(bounds.y + bounds.h, rect.y + rect.h) - clippedY;
      if (clippedW < 4 || clippedH < 4) continue;
      ctx.fillStyle = lerpHex(colors[0], colors[1], col / (steps - 1));
      ctx.fillRect(clippedX | 0, clippedY | 0, clippedW | 0, clippedH | 0);
    }
  }

  for (let i = 0; i < 5; i += 1) {
    const bw = size * 0.7;
    const bh = size * 0.7;
    const x = bounds.x + rng() * bounds.w * 0.45 + (corner % 2) * bounds.w * 0.4;
    const y = bounds.y + rng() * bounds.h * 0.3 + (corner < 2 ? bounds.h * 0.62 : 0);
    const rect = { x, y, w: bw, h: bh };
    if (hitsTextZone(rect, textZone)) continue;
    ctx.fillStyle = lerpHex(colors[1], colors[0], rng());
    ctx.fillRect(x | 0, y | 0, bw | 0, bh | 0);
  }
}

function paintPosterBase(ctx, project, index) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#050605";
  roundRect(ctx, 18, 18, W - 36, H - 36, 42);
  ctx.fill();

  const inner = { x: 48, y: 48, w: W - 96, h: H - 96 };
  ctx.save();
  roundRect(ctx, inner.x, inner.y, inner.w, inner.h, 28);
  ctx.clip();
  ctx.fillStyle = "#070708";
  ctx.fillRect(inner.x, inner.y, inner.w, inner.h);

  const rng = mulberry32(hashString(project.id));
  drawBlocks(ctx, inner, rng, project.colors, index % 4);

  const gloss = ctx.createLinearGradient(inner.x, inner.y, inner.x + inner.w, inner.y + inner.h * 0.45);
  gloss.addColorStop(0, "rgba(255,255,255,0.16)");
  gloss.addColorStop(0.4, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(inner.x, inner.y, inner.w, inner.h * 0.45);

  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = '400 28px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(String(index + 1).padStart(2, "0"), inner.x + 36, inner.y + 52);
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  roundRect(ctx, 48, 48, W - 96, H - 96, 28);
  ctx.stroke();
}

export function namePhase(time, offset) {
  const cycle = 6.6;
  const u = (((time + offset) % cycle) + cycle) % cycle;
  if (u < 0.75) return { mode: "in", p: u / 0.75 };
  if (u < 3.15) return { mode: "hold", p: 1 };
  if (u < 3.9) return { mode: "out", p: (u - 3.15) / 0.75 };
  return { mode: "blank", p: 0 };
}

function glyphName(name, mode, p) {
  if (mode === "hold") return name;
  if (mode === "blank") return "";
  const leaving = mode === "out";
  let out = "";
  const count = name.length || 1;
  for (let i = 0; i < name.length; i += 1) {
    const ch = name[i];
    if (ch === " ") {
      out += " ";
      continue;
    }
    const start = i / count;
    const end = (i + 1) / count;
    if (!leaving) {
      if (p >= end) out += ch;
      else if (p >= start) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      else out += " ";
    } else if (p >= end) out += " ";
    else if (p >= start) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
    else out += ch;
  }
  return out;
}

function fitFont(ctx, text, targetWidth) {
  let size = 168;
  do {
    ctx.font = `500 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
    if (ctx.measureText(text).width <= targetWidth || size <= 64) break;
    size -= 4;
  } while (size > 64);
  return size;
}

export function createPosterPainter(project, index) {
  const base = document.createElement("canvas");
  base.width = W;
  base.height = H;
  const baseCtx = base.getContext("2d");
  paintPosterBase(baseCtx, project, index);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  let lastKey = "";
  let lastBucket = -1;

  function paint(time, hover, reduced) {
    const phase = namePhase(time, index * 1.37);
    const live = !reduced && (phase.mode === "in" || phase.mode === "out") && hover < 0.08;
    const hoverBucket = Math.round(hover * 12);
    const bucket = (time * 8) | 0;
    if (live && bucket === lastBucket && hoverBucket === 0) return false;
    const key = `${phase.mode}:${phase.p.toFixed(2)}:${hoverBucket}:${reduced ? 1 : 0}`;
    if (!live && key === lastKey) return false;
    lastKey = live ? "" : key;
    lastBucket = bucket;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0);

    const [r, g, b] = hexToRgb(project.colors[0]);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.35 + hover * 0.65})`;
    ctx.lineWidth = 8;
    roundRect(ctx, 56, 56, W - 112, H - 112, 24);
    ctx.stroke();

    const showName = hover > 0.08 ? project.name : glyphName(project.name, phase.mode, phase.p);
    let alpha = 1;
    if (hover > 0.08) alpha = Math.max(hover, phase.mode === "blank" ? 0 : 1);
    else if (reduced) {
      if (phase.mode === "blank") alpha = 0;
      else if (phase.mode === "in") alpha = phase.p;
      else if (phase.mode === "out") alpha = 1 - phase.p;
    }
    if (phase.mode === "blank" && hover <= 0.08) alpha = 0;

    if (showName && alpha > 0.02) {
      const space = project.name.indexOf(" ");
      const lines =
        space > 0 ? [showName.slice(0, space), showName.slice(space + 1)] : [showName];
      const longest =
        space > 0
          ? [project.name.slice(0, space), project.name.slice(space + 1)].sort(
              (a, b) => b.length - a.length
            )[0]
          : project.name;
      const size = fitFont(ctx, longest, (W - 180) * 0.92);
      ctx.font = `500 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      const lineH = size * 1.08;
      const nameY = H * 0.5 - hover * 36 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((line, i) => ctx.fillText(line, W / 2, nameY + i * lineH));
    }

    return true;
  }

  paint(0, 0, false);
  return { canvas, paint };
}

export function paintField(canvas, project) {
  const width = Math.max(2, canvas.clientWidth || window.innerWidth);
  const height = Math.max(2, canvas.clientHeight || window.innerHeight);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = "#070708";
  ctx.fillRect(0, 0, width, height);
  const rng = mulberry32(hashString(project.id) ^ 0x9e3779b9);
  drawBlocks(ctx, { x: 0, y: 0, w: width, h: height }, rng, project.colors, projectsCorner(project.id));

  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, "rgba(0,0,0,0.15)");
  wash.addColorStop(0.55, "rgba(0,0,0,0.45)");
  wash.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
}

function projectsCorner(id) {
  return hashString(id) % 4;
}

export function makeTileTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const tileW = 64;
  const tileH = 128;
  const grout = 5;
  ctx.fillStyle = "#b9b3a8";
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += tileH) {
    for (let x = 0; x < 512; x += tileW) {
      const shade = 244 + Math.floor(Math.random() * 10);
      ctx.fillStyle = `rgb(${shade}, ${shade - 1}, ${shade - 4})`;
      ctx.fillRect(x + grout, y + grout, tileW - grout * 2, tileH - grout * 2);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x + grout, y + grout, tileW - grout * 2, 3);
      if (Math.random() > 0.92) {
        ctx.fillStyle = "rgba(120,110,98,0.18)";
        ctx.fillRect(x + 14, y + 30, tileW * 0.4, 8);
      }
    }
  }
  return canvas;
}

export function makeFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const size = 128;
  const grout = 6;
  ctx.fillStyle = "#b7b1a6";
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += size) {
    for (let x = 0; x < 512; x += size) {
      const shade = 198 + Math.floor(Math.random() * 18);
      ctx.fillStyle = `rgb(${shade}, ${shade - 6}, ${shade - 16})`;
      ctx.fillRect(x + grout, y + grout, size - grout * 2, size - grout * 2);
    }
  }
  return canvas;
}

export function makeCapTile() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const tile = 64;
  ctx.fillStyle = "#93aaa2";
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const g = 20 + Math.floor(Math.random() * 14);
      ctx.fillStyle = `rgb(${g}, ${g + 26}, ${g + 22})`;
      ctx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
    }
  }
  return canvas;
}

export function makeCapTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#8ea39a";
  ctx.fillRect(0, 0, 1024, 128);
  const tileW = 64;
  const tileH = 64;
  for (let y = 0; y < 128; y += tileH) {
    for (let x = 0; x < 1024; x += tileW) {
      const g = 28 + Math.floor(Math.random() * 18);
      ctx.fillStyle = `rgb(${g}, ${g + 28}, ${g + 24})`;
      ctx.fillRect(x + 3, y + 3, tileW - 6, tileH - 6);
    }
  }
  ctx.fillStyle = "#ff4d3a";
  ctx.fillRect(0, 120, 1024, 8);
  return canvas;
}

export function makeSignTexture(canvas = document.createElement("canvas")) {
  canvas.width = 1400;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f6f1e7";
  ctx.fillRect(0, 0, 1400, 360);
  ctx.fillStyle = "#141816";
  ctx.fillRect(28, 28, 1344, 304);
  ctx.fillStyle = "#ff4d3a";
  ctx.fillRect(28, 28, 1344, 16);
  ctx.fillRect(28, 316, 1344, 16);
  ctx.fillStyle = "#f6f1e7";
  ctx.font = '500 168px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const word = "MIAMI";
  const gap = 36;
  let total = -gap;
  for (const ch of word) total += ctx.measureText(ch).width + gap;
  let x = (1400 - total) / 2;
  for (const ch of word) {
    ctx.fillText(ch, x, 186);
    x += ctx.measureText(ch).width + gap;
  }
  return canvas;
}

export function makePlaqueTexture(canvas = document.createElement("canvas")) {
  canvas.width = 1200;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f3efe6";
  ctx.fillRect(0, 0, 1200, 360);
  ctx.strokeStyle = "#1c1f1e";
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, 1164, 324);
  ctx.fillStyle = "#1c1f1e";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '500 64px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText("LAURA ACOSTA", 600, 140);
  ctx.font = '400 32px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillStyle = "#3c403e";
  ctx.fillText("PRINCIPAL DESIGNER  &  BUILDER", 600, 220);
  return canvas;
}

export function makeMapTexture(canvas = document.createElement("canvas")) {
  canvas.width = 720;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#e7e2d8";
  ctx.fillRect(0, 0, 720, 1000);
  ctx.fillStyle = "#121816";
  ctx.fillRect(28, 28, 664, 944);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = '500 34px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("MIAMI", 72, 110);
  ctx.font = '400 22px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillStyle = "rgba(244,241,234,0.62)";
  ctx.fillText("ART WALL", 72, 152);

  const stops = ["Airport", "Wynwood", "Miami", "Brickell", "Coconut Grove"];
  stops.forEach((stop, i) => {
    const y = 250 + i * 130;
    const here = stop === "Miami";
    if (i < stops.length - 1) {
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(104, y + 16, 6, 108);
    }
    ctx.beginPath();
    ctx.fillStyle = here ? "#ff4d3a" : "#f4f1ea";
    ctx.arc(107, y, here ? 16 : 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.font = `${here ? 500 : 400} ${here ? 32 : 26}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.fillText(stop.toUpperCase(), 160, y + 2);
  });
  return canvas;
}

export function paintClock(canvas, date) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#101614";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff4d3a";
  ctx.fillRect(0, 0, canvas.width, 8);
  ctx.fillStyle = "rgba(244,241,234,0.7)";
  ctx.font = '400 28px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("LOCAL", 36, 48);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  ctx.fillStyle = "#f4f1ea";
  ctx.font = '500 92px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText(`${hh}:${mm}:${ss}`, 36, 128);
}

export function createClockCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 760;
  canvas.height = 200;
  paintClock(canvas, new Date());
  return canvas;
}
