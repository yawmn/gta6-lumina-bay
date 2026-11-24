// textures3d: every texture in the game is drawn on a canvas at load time —
// no image files, no network. Building facades get lit windows, roads get their
// yellow centre dashes, and the sky is one tall gradient with a low sun.

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A building side: dark facade with a grid of windows, some lit warm. */
export function buildingTexture(baseColor, random) {
  return canvasTexture(128, 256, (ctx, w, h) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, w, 10);
    const cols = 5;
    const rows = 9;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const lit = random() < 0.42;
        ctx.fillStyle = lit ? '#ffca6a' : (random() < 0.5 ? '#20283a' : '#31405c');
        if (lit && random() < 0.3) ctx.fillStyle = '#7fd4ff';
        ctx.fillRect(10 + c * 22, 18 + r * 26, 14, 16);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, 0, 6, h);
  });
}

/** Roof top: dark with vents, AC boxes and a cylinder tank (Gemini fix #5). */
export function roofTexture(baseColor, random) {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5a6068';
    ctx.fillRect(18, 20, 26, 18);
    ctx.fillRect(78, 66, 30, 20);
    ctx.fillStyle = '#8a8f96';
    ctx.beginPath();
    ctx.arc(96, 26, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3f46';
    ctx.fillRect(30, 84, 40, 8);
    ctx.fillRect(44, 96, 12, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.strokeRect(4, 4, w - 8, h - 8);
  });
}

/** One road segment: asphalt with a dashed yellow centre line and white edges. */
export function roadTexture(horizontal) {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#22262e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 40; i += 1) ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    ctx.fillStyle = '#c8ccd4';
    if (horizontal) {
      ctx.fillRect(0, 6, w, 4);
      ctx.fillRect(0, h - 10, w, 4);
      ctx.fillStyle = '#f5b700';
      for (let x = 0; x < w; x += 42) ctx.fillRect(x, h / 2 - 3, 24, 6);
    } else {
      ctx.fillRect(6, 0, 4, h);
      ctx.fillRect(w - 10, 0, 4, h);
      ctx.fillStyle = '#f5b700';
      for (let y = 0; y < h; y += 42) ctx.fillRect(w / 2 - 3, y, 6, 24);
    }
  });
}

/** Sidewalk: pale concrete slabs. */
export function sidewalkTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4a4f58';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i += 1) {
      ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(w, i * 32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, h); ctx.stroke();
    }
  });
}

/** Water: deep blue with lighter streaks. */
export function waterTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#16324a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(140,200,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i += 1) {
      const y = 8 + i * 10;
      ctx.beginPath();
      ctx.moveTo(6, y);
      ctx.bezierCurveTo(40, y - 4, 80, y + 4, 122, y);
      ctx.stroke();
    }
  });
}

/** Sunset sky: violet overhead, orange at the horizon, sun disc low west. */
export function skyTexture() {
  return canvasTexture(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#160b31');
    g.addColorStop(0.45, '#4a2350');
    g.addColorStop(0.72, '#c94b2a');
    g.addColorStop(0.88, '#ff7a2a');
    g.addColorStop(1, '#ffb36b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const sg = ctx.createRadialGradient(300, 400, 8, 300, 400, 130);
    sg.addColorStop(0, 'rgba(255,230,160,1)');
    sg.addColorStop(0.35, 'rgba(255,180,90,0.85)');
    sg.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(120, 220, 360, 360);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 26; i += 1) ctx.fillRect((i * 97) % w, (i * 53) % 150, 2, 2);
  });
}

/** Muzzle flash: radial yellow-white starburst on a transparent tile. */
export function flashTexture() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,220,1)');
    g.addColorStop(0.4, 'rgba(255,214,10,0.9)');
    g.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** White "POLICE" lettering for the side of a police car (one label only). */
export function policeLabelTexture() {
  return canvasTexture(256, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POLICE', w / 2, h / 2 + 2);
  });
}
