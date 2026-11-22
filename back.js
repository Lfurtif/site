const canvas = document.getElementById('blob-canvas');
let width, height, viewW, viewH;
const gl = canvas.getContext('webgl');
const RENDER_SCALE = 0.5;
const MAX_BLOBS = 40, BLOB_SPEED = 0.7, STICKINESS = 0.7;
const COLOR1 = [0.66, 0.45, 1.0], COLOR2 = [0.36, 0.20, 0.72], BG_COLOR = [0.02, 0.02, 0.02];
let blobs = [], numBlobs = 0;
const blobData = new Float32Array(MAX_BLOBS * 3);
let blobsHandle, color1Handle, color2Handle, bgColorHandle, heightHandle, countHandle, program;

// Change amount of blobs if screen is too tiny
function metrics() {
    const area = Math.max(1, viewW * viewH);
    const count = Math.max(10, Math.min(MAX_BLOBS, Math.round(area / 22000)));
    const density = Math.max(0.5, Math.min(1, Math.sqrt(area / (1440 * 900))));
    // Radii live in render pixels, so they shrink with the render scale while
    // keeping the same apparent size on screen.
    return { count, scale: density * RENDER_SCALE };
}

function getBlob() {
    return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * BLOB_SPEED,
        vy: (Math.random() - 0.5) * BLOB_SPEED,
        base: Math.random() * 30 + 25
    };
}

function syncBlobs() {
    const { count, scale } = metrics();
    while (blobs.length < count) blobs.push(getBlob());
    if (blobs.length > count) blobs.length = count;
    blobs.forEach(b => {
        b.r = b.base * scale;
        b.x = Math.max(b.r, Math.min(width - b.r, b.x));
        b.y = Math.max(b.r, Math.min(height - b.r, b.y));
    });
    numBlobs = count;
}

function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    width = canvas.width = Math.max(1, Math.round(viewW * RENDER_SCALE));
    height = canvas.height = Math.max(1, Math.round(viewH * RENDER_SCALE));
    canvas.style.width = viewW + 'px';
    canvas.style.height = viewH + 'px';
    gl.viewport(0, 0, width, height);
    if (!program) webglSetup();
    syncBlobs();
    startAnimation();
}

function startAnimation() {
    if (window.frameId != null) cancelAnimationFrame(window.frameId);
    window.frameId = document.hidden ? null : requestAnimationFrame(loop);
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (window.frameId != null) cancelAnimationFrame(window.frameId);
        window.frameId = null;
    } else {
        startAnimation();
    }
});

function loop() {
    blobs.forEach((b, i) => {
        b.x += b.vx; b.y += b.vy;
        if (b.x < b.r || b.x > width - b.r) { b.vx *= -1; b.x = Math.max(b.r, Math.min(width - b.r, b.x)); }
        if (b.y < b.r || b.y > height - b.r) { b.vy *= -1; b.y = Math.max(b.r, Math.min(height - b.r, b.y)); }
        blobData[i * 3] = b.x;
        blobData[i * 3 + 1] = b.y;
        blobData[i * 3 + 2] = b.r;
    });
    gl.useProgram(program);
    gl.uniform3fv(blobsHandle, blobData);
    gl.uniform1i(countHandle, numBlobs);
    gl.uniform3fv(color1Handle, COLOR1);
    gl.uniform3fv(color2Handle, COLOR2);
    gl.uniform3fv(bgColorHandle, BG_COLOR);
    gl.uniform1f(heightHandle, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    window.frameId = requestAnimationFrame(loop);
}

function webglSetup() {
    const vs = createShader(gl, gl.VERTEX_SHADER, `attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }`);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, `precision highp float;
        uniform vec3 blobs[${MAX_BLOBS}];
        uniform vec3 color1; uniform vec3 color2; uniform vec3 bgColor;
        uniform float u_height; uniform int u_count;
        void main() {
            float sum = 0.0;
            for (int i = 0; i < ${MAX_BLOBS}; i++) {
                if (i >= u_count) break;
                float dx = blobs[i].x - gl_FragCoord.x;
                float dy = blobs[i].y - gl_FragCoord.y;
                sum += (blobs[i].z * blobs[i].z) / (dx * dx + dy * dy);
            }
            if (sum >= 2.0 - ${STICKINESS.toFixed(1)}) {
                gl_FragColor = vec4(mix(color2, color1, gl_FragCoord.y / u_height), 1.0);
            } else {
                gl_FragColor = vec4(bgColor, 1.0);
            }
        }`);
    program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const positionHandle = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionHandle); gl.vertexAttribPointer(positionHandle, 2, gl.FLOAT, false, 0, 0);
    blobsHandle = gl.getUniformLocation(program, 'blobs');
    color1Handle = gl.getUniformLocation(program, 'color1');
    color2Handle = gl.getUniformLocation(program, 'color2');
    bgColorHandle = gl.getUniformLocation(program, 'bgColor');
    heightHandle = gl.getUniformLocation(program, 'u_height');
    countHandle = gl.getUniformLocation(program, 'u_count');
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); return shader;
}

window.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('resize', resize);
    resize();
});
