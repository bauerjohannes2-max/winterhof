// ============================================================================
// WINTERHOF v6 — Custom GLSL Alpine Glacial Brook & Pond Shader (PixiJS v8)
// Animated turquoise flow · Crystalline frosted ice banks · Dusk/Night shimmer
// ============================================================================
import { Container, Graphics, Mesh, MeshGeometry, Shader } from 'pixi.js';

const WATER_VERTEX = `
attribute vec2 aPosition;
attribute vec2 aUV;
varying vec2 vUV;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main() {
    vUV = aUV;
    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
}
`;

const WATER_FRAGMENT = `
precision mediump float;
varying vec2 vUV;

uniform float uTime;
uniform float uEvening;
uniform float uDusk;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    // Distance from stream centerline (0 = center, 1 = bank edge)
    float edgeDist = abs(vUV.y - 0.5) * 2.0;

    // Soft organic bank edge mask
    float bankNoise = noise(vec2(vUV.x * 16.0, vUV.y * 5.0)) * 0.14;
    float alpha = 1.0 - smoothstep(0.84 - bankNoise, 1.0, edgeDist);
    if (alpha < 0.01) discard;

    // Flowing water UV layers
    vec2 flow1 = vec2(vUV.x * 18.0 - uTime * 0.58, vUV.y * 4.5);
    vec2 flow2 = vec2(vUV.x * 26.0 - uTime * 0.92, vUV.y * 7.2 + 2.4);
    float n1 = noise(flow1);
    float n2 = noise(flow2);
    float ripple = n1 * 0.62 + n2 * 0.38;

    // Glacial alpine palette (Style C turquoise -> Style B warm dusk reflection -> deep night blue)
    vec3 deepDay   = vec3(0.11, 0.49, 0.74);
    vec3 midDay    = vec3(0.24, 0.73, 0.92);
    vec3 foamDay   = vec3(0.84, 0.96, 1.00);

    vec3 deepDusk  = vec3(0.18, 0.36, 0.58);
    vec3 midDusk   = vec3(0.45, 0.62, 0.80);
    vec3 warmRefl  = vec3(1.00, 0.73, 0.38);

    vec3 deepNight = vec3(0.07, 0.17, 0.36);
    vec3 midNight  = vec3(0.14, 0.34, 0.58);

    vec3 deepCol = mix(mix(deepDay, deepDusk, uDusk), deepNight, uEvening);
    vec3 midCol  = mix(mix(midDay, midDusk, uDusk), midNight, uEvening);

    // Depth shading (darker in channel center, brighter glacial turquoise towards shallow ice banks)
    float shallow = smoothstep(0.20, 0.85, edgeDist);
    vec3 col = mix(deepCol, midCol, shallow * 0.75 + ripple * 0.38);

    // Subtle flowing caustic ribbons along current
    float caustic = smoothstep(0.64, 0.86, ripple) * (1.0 - edgeDist * 0.65);
    col = mix(col, foamDay, caustic * (0.48 - uEvening * 0.22));

    // Crystalline frosted ice rim along banks
    float iceRim = smoothstep(0.66 - bankNoise * 0.6, 0.90, edgeDist);
    vec3 iceColor = mix(vec3(0.86, 0.95, 1.0), vec3(0.55, 0.70, 0.90), uEvening * 0.75);
    col = mix(col, iceColor, iceRim * 0.82);

    // Crisp sunlit / lantern-lit sparkle glints on ripples
    float glint = pow(smoothstep(0.74, 0.95, n1 * n2 * 1.45), 3.0);
    col += vec3(1.0, 0.98, 0.92) * glint * (0.75 - uEvening * 0.30);

    // Warm golden bridge lantern reflection (matches Style B Golden-Hour target!)
    float bridgeProx = exp(-pow((vUV.x - 0.42) * 7.5, 2.0));
    float reflShimmer = (0.55 + 0.45 * sin(vUV.x * 55.0 - uTime * 3.8 + n1 * 5.0));
    float warmAmount = bridgeProx * (uDusk * 0.72 + uEvening * 0.65) * reflShimmer * (1.0 - edgeDist * 0.5);
    col = mix(col, warmRefl, clamp(warmAmount, 0.0, 0.85));

    gl_FragColor = vec4(col * alpha, alpha);
}
`;

function sampleCatmullRom(pts, t) {
  const n = pts.length - 1;
  const scaled = Math.max(0, Math.min(n - 0.0001, t * n));
  const i = Math.floor(scaled);
  const f = scaled - i;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[Math.min(n, i + 1)];
  const p3 = pts[Math.min(n, i + 2)];
  const f2 = f * f;
  const f3 = f2 * f;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * f + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * f2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * f3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * f + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * f2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * f3),
    w: p1.w + (p2.w - p1.w) * f
  };
}

export function createAlpineWaterLayer(gridToWorld) {
  const container = new Container();

  // Brook winds naturally down the SE alpine valley, crossing under the wooden bridge near (13.9, 5.5)
  const controlGrid = [
    { gx: 15.2, gy: -5.5, w: 68 },
    { gx: 14.5, gy: -1.5, w: 78 },
    { gx: 14.0, gy: 2.2, w: 84 },
    { gx: 13.8, gy: 5.5, w: 88 }, // Bridge crossing!
    { gx: 13.9, gy: 8.8, w: 102 },
    { gx: 13.3, gy: 12.2, w: 142 }, // Widens into scenic alpine pond beside daily chest
    { gx: 11.4, gy: 14.8, w: 150 },
    { gx: 9.2, gy: 18.2, w: 112 },
    { gx: 7.4, gy: 23.0, w: 96 }
  ];

  const worldCtrl = controlGrid.map((p) => {
    const wp = gridToWorld(p.gx, p.gy);
    return { x: wp.x, y: wp.y, w: p.w };
  });

  const SEGMENTS = 72;
  const samples = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    samples.push(sampleCatmullRom(worldCtrl, i / SEGMENTS));
  }

  // Sculpted snowbank embankment rim recessed under water (warm earth-slate inner bank + bright snow lip)
  const bankGfx = new Graphics();
  const outerLeft = [];
  const outerRight = [];
  const innerLeft = [];
  const innerRight = [];

  const positions = new Float32Array((SEGMENTS + 1) * 2 * 2);
  const uvs = new Float32Array((SEGMENTS + 1) * 2 * 2);
  const indices = new Uint32Array(SEGMENTS * 6);

  for (let i = 0; i <= SEGMENTS; i++) {
    const curr = samples[i];
    const prev = samples[Math.max(0, i - 1)];
    const next = samples[Math.min(SEGMENTS, i + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    // Perpendicular normal
    const nx = -ty;
    const ny = tx;

    const halfW = curr.w * 0.5;
    const lx = curr.x + nx * halfW;
    const ly = curr.y + ny * halfW;
    const rx = curr.x - nx * halfW;
    const ry = curr.y - ny * halfW;

    const vIdx = i * 4;
    positions[vIdx] = lx;
    positions[vIdx + 1] = ly;
    positions[vIdx + 2] = rx;
    positions[vIdx + 3] = ry;

    const u = i / SEGMENTS;
    uvs[vIdx] = u;
    uvs[vIdx + 1] = 0;
    uvs[vIdx + 2] = u;
    uvs[vIdx + 3] = 1;

    outerLeft.push(curr.x + nx * (halfW + 17), curr.y + ny * (halfW + 17) - 3);
    outerRight.push(curr.x - nx * (halfW + 17), curr.y - ny * (halfW + 17) + 4);
    innerLeft.push(curr.x + nx * (halfW + 7), curr.y + ny * (halfW + 7) - 1);
    innerRight.push(curr.x - nx * (halfW + 7), curr.y - ny * (halfW + 7) + 2);

    if (i < SEGMENTS) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      const idx = i * 6;
      indices[idx] = a;
      indices[idx + 1] = b;
      indices[idx + 2] = c;
      indices[idx + 3] = b;
      indices[idx + 4] = d;
      indices[idx + 5] = c;
    }
  }

  // Draw soft sunlit outer snowbank lip
  const outerPoly = [...outerLeft];
  for (let i = outerRight.length - 2; i >= 0; i -= 2) {
    outerPoly.push(outerRight[i], outerRight[i + 1]);
  }
  bankGfx.poly(outerPoly).fill({ color: 0xf6fbff, alpha: 0.92 });

  // Draw recessed cool-slate alpine stone/shadow bank wall
  const innerPoly = [...innerLeft];
  for (let i = innerRight.length - 2; i >= 0; i -= 2) {
    innerPoly.push(innerRight[i], innerRight[i + 1]);
  }
  bankGfx.poly(innerPoly).fill({ color: 0x8ea9c4, alpha: 0.85 });
  container.addChild(bankGfx);

  const geometry = new MeshGeometry({ positions, uvs, indices });
  const shader = Shader.from({
    gl: {
      vertex: WATER_VERTEX,
      fragment: WATER_FRAGMENT
    },
    resources: {
      waterUniforms: {
        uTime: { value: 0, type: 'f32' },
        uEvening: { value: 0, type: 'f32' },
        uDusk: { value: 0, type: 'f32' }
      }
    }
  });

  const waterMesh = new Mesh({ geometry, shader });
  container.addChild(waterMesh);

  return {
    container,
    update(sec, ev, duskFactor) {
      const u = shader.resources.waterUniforms.uniforms;
      u.uTime = sec;
      u.uEvening = ev;
      u.uDusk = duskFactor;
    }
  };
}
