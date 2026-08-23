const canvas = document.getElementById('blob-canvas');
let width, height;
const gl = canvas.getContext('webgl');
const NUM_BLOBS = 30; const BLOB_SPEED = 0.5; const STICKINESS = 0.3;
const COLOR1 = [0.68, 1.0, 0.18]; const COLOR2 = [0.68, 1.0, 0.18]; const BG_COLOR = [0.02, 0.02, 0.02]; 
let blobs, blobsHandle, color1Handle, color2Handle, bgColorHandle, heightHandle, program;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    gl.viewport(0, 0, width, height); 
    if (!program) webglSetup();
    startAnimation();
}

function getBlob() {
    return { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, vx: (Math.random() - 0.5) * BLOB_SPEED, vy: (Math.random() - 0.5) * BLOB_SPEED, r: Math.random() * 30 + 25 };
}

function startAnimation() {
    if (window.frameId != null) cancelAnimationFrame(window.frameId);
    loop();
}

function loop() {
    blobs.forEach(b => {
        b.x += b.vx; b.y += b.vy;
        if (b.x < b.r || b.x > width - b.r) b.vx *= -1;
        if (b.y < b.r || b.y > height - b.r) b.vy *= -1;
    });
    const blobData = new Float32Array(blobs.flatMap(b => [b.x, b.y, b.r]));
    gl.useProgram(program);
    gl.uniform3fv(blobsHandle, blobData);
    gl.uniform3fv(color1Handle, COLOR1);
    gl.uniform3fv(color2Handle, COLOR2);
    gl.uniform3fv(bgColorHandle, BG_COLOR);
    gl.uniform1f(heightHandle, height); 
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    window.frameId = requestAnimationFrame(loop);
}

function webglSetup() {
    const vs = createShader(gl, gl.VERTEX_SHADER, `attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }`);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, `precision highp float; uniform vec3 blobs[${NUM_BLOBS}]; uniform vec3 color1; uniform vec3 color2; uniform vec3 bgColor; uniform float u_height; void main() { float sum = 0.0; for (int i = 0; i < ${NUM_BLOBS}; i++) { float dx = blobs[i].x - gl_FragCoord.x; float dy = blobs[i].y - gl_FragCoord.y; sum += (blobs[i].z * blobs[i].z) / (dx * dx + dy * dy); } if (sum >= 2.0 - ${STICKINESS.toFixed(1)}) { gl_FragColor = vec4(mix(color2, color1, gl_FragCoord.y / u_height), 1.0); } else { gl_FragColor = vec4(bgColor, 1.0); } }`);
    program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    const positionHandle = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionHandle); gl.vertexAttribPointer(positionHandle, 2, gl.FLOAT, false, 0, 0);
    blobsHandle = gl.getUniformLocation(program, 'blobs'); color1Handle = gl.getUniformLocation(program, 'color1'); color2Handle = gl.getUniformLocation(program, 'color2'); bgColorHandle = gl.getUniformLocation(program, 'bgColor'); heightHandle = gl.getUniformLocation(program, 'u_height');
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); return shader;
}

window.addEventListener('DOMContentLoaded', () => { blobs = Array.from(Array(NUM_BLOBS)).map(getBlob); window.addEventListener('resize', resize); resize(); });
