/**
 * 摄影：WebGL 1 后期链，顺序固定（contract.md 第 5 节）：柔焦 → 高光光晕 → 四角色差 → 暗角 → 抬黑位、压高光 → 按亮度加颗粒。
 * 镜头只给 Post 参数（从 defaultPost 覆盖数值），不自己加后期。半分辨率做柔焦模糊和亮部提取，光晕在 1/2、1/4、1/8 三档分辨率各模糊一次
 * （约合全分辨率 6.5、24、72 px），最后一遍在全分辨率合成；色差在合成函数上按三个偏移位置各取一次。颗粒每帧换种子，只由帧号决定。
 */
import { darkest } from "../tokens.ts";
import type { Post } from "./post-settings.ts";

export type { Post } from "./post-settings.ts";
export { defaultPost } from "./post-settings.ts";

const vertex = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = (position + 1.0) * 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const downFragment = `
precision highp float;
uniform sampler2D image;
uniform vec2 texel;
varying vec2 uv;
void main() {
  vec4 c = texture2D(image, uv + texel * vec2(-0.5, -0.5));
  c += texture2D(image, uv + texel * vec2(0.5, -0.5));
  c += texture2D(image, uv + texel * vec2(-0.5, 0.5));
  c += texture2D(image, uv + texel * vec2(0.5, 0.5));
  gl_FragColor = c * 0.25;
}`;

const blurFragment = `
precision highp float;
uniform sampler2D image;
uniform vec2 stepDir;
uniform float sigma;
varying vec2 uv;
void main() {
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int i = -7; i <= 7; i++) {
    float x = float(i);
    float w = exp(-0.5 * x * x / (sigma * sigma));
    sum += texture2D(image, uv + stepDir * x) * w;
    total += w;
  }
  gl_FragColor = sum / total;
}`;

const brightFragment = `
precision highp float;
uniform sampler2D image;
uniform float threshold;
varying vec2 uv;
void main() {
  vec3 c = texture2D(image, uv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(threshold, threshold + 0.18, l);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const hex = (value: string) =>
  [1, 3, 5].map((i) => (parseInt(value.slice(i, i + 2), 16) / 255).toFixed(4)).join(", ");

const finalFragment = `
precision highp float;
uniform sampler2D base;
uniform sampler2D soft;
uniform sampler2D glowA;
uniform sampler2D glowB;
uniform sampler2D glowC;
uniform vec2 size;
uniform float frame;
uniform float softFocus;
uniform float glow;
uniform float aberration;
uniform float vignette;
uniform float vignetteInner;
uniform float lift;
uniform float knee;
uniform float ceiling;
uniform float grain;
uniform float grainHighlight;
uniform float seed;
varying vec2 uv;
const vec3 darkest = vec3(${hex(darkest)});
vec3 graded(vec2 p) {
  vec3 c = texture2D(base, p).rgb;
  vec3 b = texture2D(soft, p).rgb;
  c = mix(c, max(c, b), softFocus);
  c = mix(c, b, softFocus * 0.12);
  vec3 g = texture2D(glowA, p).rgb * 0.5 + texture2D(glowB, p).rgb * 0.35 + texture2D(glowC, p).rgb * 0.3;
  g *= glow;
  return 1.0 - (1.0 - c) * (1.0 - g);
}
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031 + seed * 0.013);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
vec3 shoulder(vec3 x) {
  vec3 over = max(x - knee, 0.0);
  float span = ceiling - knee;
  vec3 e = exp(-2.0 * over / span);
  vec3 t = (1.0 - e) / (1.0 + e);
  return min(x, vec3(knee)) + span * t;
}
void main() {
  vec2 centered = (uv - 0.5) * vec2(size.x / size.y, 1.0);
  float r = length(centered) / length(vec2(size.x / size.y, 1.0) * 0.5);
  vec2 dir = normalize(centered + 1e-6);
  vec2 shift = dir * aberration * r * r / size;
  vec3 c;
  c.r = graded(uv - shift).r;
  c.g = graded(uv).g;
  c.b = graded(uv + shift).b;
  c *= 1.0 - vignette * smoothstep(vignetteInner, 1.15, r);
  c = mix(c, darkest + c * (1.0 - darkest), lift);
  c = shoulder(c);
  vec2 px = gl_FragCoord.xy;
  float f = floor(frame);
  float n = hash(px + f * 37.0) * 0.6 + hash(floor(px * 0.5) + f * 53.0 + 11.0) * 0.4 - 0.5;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float amount = mix(grain, grainHighlight, smoothstep(0.15, 0.8, l));
  c += n * amount * vec3(1.0, 0.97, 1.04);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

type Target = { texture: WebGLTexture; buffer: WebGLFramebuffer | null; width: number; height: number };

export const createPost = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error("WebGL 不可用，请用 --gl=swangle 渲染。");
  const compile = (type: number, text: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`着色器编译失败：${gl.getShaderInfoLog(shader)}`);
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex);
  const shaders: WebGLShader[] = [vs];
  const program = (fragment: string) => {
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    shaders.push(fs);
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, "position");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`着色器链接失败：${gl.getProgramInfoLog(p)}`);
    return p;
  };
  const programs = {
    down: program(downFragment),
    blur: program(blurFragment),
    bright: program(brightFragment),
    final: program(finalFragment),
  };
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const textures: WebGLTexture[] = [];
  const buffers: WebGLFramebuffer[] = [];
  const makeTexture = () => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textures.push(t);
    return t;
  };
  const target = (width: number, height: number): Target => {
    const texture = makeTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const buffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    buffers.push(buffer);
    return { texture, buffer, width, height };
  };
  const W = canvas.width;
  const H = canvas.height;
  const size = (d: number) => [Math.max(1, Math.round(W / d)), Math.max(1, Math.round(H / d))] as const;
  const [hw, hh] = size(2);
  const [qw, qh] = size(4);
  const [ew, eh] = size(8);
  const t = {
    half: target(hw, hh),
    halfTmp: target(hw, hh),
    soft: target(hw, hh),
    bright: target(hw, hh),
    glowA: target(hw, hh),
    quarter: target(qw, qh),
    quarterTmp: target(qw, qh),
    glowB: target(qw, qh),
    eighth: target(ew, eh),
    eighthTmp: target(ew, eh),
    glowC: target(ew, eh),
  };
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const source = makeTexture();
  const run = (p: WebGLProgram, out: Target | null, inputs: [string, WebGLTexture][], uniforms: (loc: (name: string) => WebGLUniformLocation | null) => void) => {
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.buffer : null);
    gl.viewport(0, 0, out ? out.width : W, out ? out.height : H);
    inputs.forEach(([name, tex], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(gl.getUniformLocation(p, name), i);
    });
    uniforms((name) => gl.getUniformLocation(p, name));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const down = (input: WebGLTexture, inW: number, inH: number, out: Target) =>
    run(programs.down, out, [["image", input]], (u) => gl.uniform2f(u("texel"), 1 / inW, 1 / inH));
  const blur = (input: Target, tmp: Target, out: Target, sigma: number, spacing: number) => {
    run(programs.blur, tmp, [["image", input.texture]], (u) => {
      gl.uniform2f(u("stepDir"), spacing / input.width, 0);
      gl.uniform1f(u("sigma"), sigma);
    });
    run(programs.blur, out, [["image", tmp.texture]], (u) => {
      gl.uniform2f(u("stepDir"), 0, spacing / input.height);
      gl.uniform1f(u("sigma"), sigma);
    });
  };
  return {
    draw: (image: HTMLCanvasElement, frame: number, post: Post) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      down(source, W, H, t.half);
      blur(t.half, t.halfTmp, t.soft, Math.max(0.5, post.softRadius / 4), 1);
      run(programs.bright, t.bright, [["image", t.half.texture]], (u) => gl.uniform1f(u("threshold"), post.glowThreshold));
      blur(t.bright, t.halfTmp, t.glowA, 3.25 / 2, 1);
      down(t.bright.texture, hw, hh, t.quarter);
      blur(t.quarter, t.quarterTmp, t.glowB, 3, 1);
      down(t.quarter.texture, qw, qh, t.eighth);
      blur(t.eighth, t.eighthTmp, t.glowC, 3, 1.5);
      run(
        programs.final,
        null,
        [
          ["base", source],
          ["soft", t.soft.texture],
          ["glowA", t.glowA.texture],
          ["glowB", t.glowB.texture],
          ["glowC", t.glowC.texture],
        ],
        (u) => {
          gl.uniform2f(u("size"), W, H);
          gl.uniform1f(u("frame"), frame);
          gl.uniform1f(u("softFocus"), post.softFocus);
          gl.uniform1f(u("glow"), post.glow);
          gl.uniform1f(u("aberration"), post.aberration);
          gl.uniform1f(u("vignette"), post.vignette);
          gl.uniform1f(u("vignetteInner"), post.vignetteInner);
          gl.uniform1f(u("lift"), post.lift);
          gl.uniform1f(u("knee"), post.knee);
          gl.uniform1f(u("ceiling"), post.ceiling);
          gl.uniform1f(u("grain"), post.grain);
          gl.uniform1f(u("grainHighlight"), post.grainHighlight);
          gl.uniform1f(u("seed"), post.seed);
        },
      );
      gl.finish();
      if (gl.getError() !== gl.NO_ERROR) throw new Error("WebGL 绘制失败。");
    },
    renderer: () => {
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      return debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    },
    dispose: () => {
      textures.forEach((tex) => gl.deleteTexture(tex));
      buffers.forEach((b) => gl.deleteFramebuffer(b));
      gl.deleteBuffer(quad);
      shaders.forEach((s) => gl.deleteShader(s));
      Object.keys(programs).forEach((k) => gl.deleteProgram(programs[k as keyof typeof programs]));
    },
  };
};
