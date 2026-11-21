/* Lava lamp background — WebGL metaballs, reduced to a quiet ink texture.
   No glow, no hue contrast: it moves, it does not perform.
   Unslop direction by Damir Sokolovsky (@heydamir), CC BY 4.0. */
(() => {
  const canvas = document.getElementById('lava-canvas');
  if (!canvas) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const area = innerWidth * innerHeight;
  const REFERENCE = 1440 * 900;
  const scale = Math.sqrt(area / REFERENCE);
  // Keep coverage roughly constant: a phone needs fewer, smaller blobs than a desktop.
  const COUNT = Math.max(10, Math.min(34, Math.round(22 * area / REFERENCE)));
  const COLOR_A = new Float32Array([0.20, 0.17, 0.30]);  // ink violet
  const COLOR_B = new Float32Array([0.13, 0.16, 0.25]);  // ink blue
  const COLOR_BG = new Float32Array([0.043, 0.051, 0.078]); // #0b0d14

  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power', preserveDrawingBuffer: false,
  });
  if (!gl) { document.documentElement.classList.add('no-webgl'); return; }

  const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;
  const FRAG = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec3 u_blobs[${COUNT}];
    uniform vec3 u_a, u_b, u_bg;
    uniform vec2 u_res;

    void main() {
      vec2 p = gl_FragCoord.xy;
      float field = 0.0;
      for (int i = 0; i < ${COUNT}; i++) {
        vec2 d = p - u_blobs[i].xy;
        float q = max(0.0, 1.0 - dot(d, d) / (u_blobs[i].z * u_blobs[i].z * 8.0));
        field += 1.35 * q * q * q;
      }

      float shape = smoothstep(0.95, 1.30, field);
      float mixv  = clamp(p.y / u_res.y, 0.0, 1.0);
      vec3 ink = mix(u_a, u_b, mixv);
      vec3 col = mix(u_bg, ink, shape * 0.42);

      vec2 uv = p / u_res;
      float vignette = smoothstep(1.05, 0.28, length(uv - 0.5));
      col *= mix(0.78, 1.0, vignette);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  let program = null, buffer = null;
  const loc = {};
  let blobs = [];
  let w = 0, h = 0, dpr = 1, raf = 0, last = 0, resizing = false;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Lava shader:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function setup() {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { document.documentElement.classList.add('no-webgl'); return false; }

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Lava program:', gl.getProgramInfoLog(program));
      document.documentElement.classList.add('no-webgl');
      return false;
    }

    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    loc.blobs = gl.getUniformLocation(program, 'u_blobs[0]');
    loc.a = gl.getUniformLocation(program, 'u_a');
    loc.b = gl.getUniformLocation(program, 'u_b');
    loc.bg = gl.getUniformLocation(program, 'u_bg');
    loc.res = gl.getUniformLocation(program, 'u_res');
    return true;
  }

  function newBlob() {
    const r = (38 + Math.random() * 82) * Math.max(0.5, scale) * dpr;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.075 * dpr,
      vy: (Math.random() - 0.5) * 0.075 * dpr,
      r, phase: Math.random() * Math.PI * 2,
    };
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, coarse ? 1 : 1.25);
    w = Math.max(1, Math.round(innerWidth * dpr));
    h = Math.max(1, Math.round(innerHeight * dpr));
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    if (!blobs.length) blobs = Array.from({ length: COUNT }, newBlob);
  }

  function frame(t) {
    const dt = Math.min(t - (last || t), 40);
    last = t;
    const data = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      const b = blobs[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.phase += dt * 0.0007;
      if (b.x < -b.r) b.x = w + b.r; else if (b.x > w + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = h + b.r; else if (b.y > h + b.r) b.y = -b.r;
      data[i * 3] = b.x;
      data[i * 3 + 1] = h - b.y; // WebGL's origin is bottom-left
      data[i * 3 + 2] = b.r * (0.9 + 0.1 * Math.sin(b.phase));
    }

    gl.useProgram(program);
    gl.uniform3fv(loc.blobs, data);
    gl.uniform3fv(loc.a, COLOR_A);
    gl.uniform3fv(loc.b, COLOR_B);
    gl.uniform3fv(loc.bg, COLOR_BG);
    gl.uniform2f(loc.res, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    raf = reducedMotion ? 0 : requestAnimationFrame(frame);
  }

  function start() {
    cancelAnimationFrame(raf);
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  if (!setup()) return;
  resize();
  start();

  addEventListener('resize', () => {
    if (resizing) return;
    resizing = true;
    requestAnimationFrame(() => { resize(); resizing = false; });
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!reducedMotion && !raf) start();
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    blobs = [];
    if (setup()) { resize(); start(); }
  });
})();
