/** 占位镜头：Canvas 2D 读取烘焙底图并画触地圆块；沿用现有令牌，TODO(design)：后续工单替换占位画面。 */
import {
  color,
  finish,
  hud,
  motion,
  proposal,
} from "../../src/styles/nasa-punk/tokens";
import { placeholder, width, height, seed } from "./model";
import type { Shot } from "./model";

type Surface = {
  context: CanvasRenderingContext2D;
  background: HTMLImageElement;
};

export const placeholderShot: Shot<Surface> = {
  ...placeholder,
  post: {
    grain: finish.grainOpacity,
    vignetteInner: finish.vignetteInner,
    vignette: finish.vignetteStrength,
  },
  draw: ({ context, background }, frame) => {
    context.clearRect(0, 0, width, height);
    context.drawImage(background, 0, 0, width, height);
    const impact = placeholder.events[0].frame;
    const progress = Math.min(1, frame / impact);
    const radius = proposal.paper.registrationRadius;
    const floor = height - hud.edgeInset;
    const y =
      hud.edgeInset + (floor - radius - hud.edgeInset) * progress * progress;
    context.fillStyle = color.accentRed;
    context.beginPath();
    context.arc(width / 2, y, radius, 0, Math.PI * 2);
    context.fill();
    if (frame >= impact && frame < impact + motion.lineDrawFrames) {
      context.strokeStyle = color.ink;
      context.lineWidth = hud.bracketStroke;
      context.beginPath();
      context.arc(
        width / 2,
        floor,
        radius * (1 + (frame - impact) / motion.lineDrawFrames),
        Math.PI,
        Math.PI * 2,
      );
      context.stroke();
    }
  },
};

const vertex = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = (position + 1.0) * 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;
const fragment = `
precision highp float;
uniform sampler2D image;
uniform float frame;
uniform float grain;
uniform float vignetteInner;
uniform float vignette;
varying vec2 uv;
float noise(vec2 point) {
  vec3 cell = fract(vec3(point.xyx + frame * 17.0 + ${seed}.0) * 0.1031);
  cell += dot(cell, cell.yzx + 33.33);
  return fract((cell.x + cell.y) * cell.z) - 0.5;
}
void main() {
  vec3 rgb = texture2D(image, vec2(uv.x, 1.0 - uv.y)).rgb;
  float edge = smoothstep(vignetteInner, 1.0, length((uv - 0.5) * 2.0) / sqrt(2.0));
  rgb = rgb * (1.0 - edge * vignette) + noise(gl_FragCoord.xy) * grain;
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}`;

export const createPost = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) {
    console.log(
      "WebGL 实测：",
      JSON.stringify({
        renderer: null,
        vendor: null,
        context: "webgl 不可用",
        width: canvas.width,
        height: canvas.height,
      }),
    );
    throw new Error("WebGL 不可用，请用 --gl=swangle 渲染。");
  }
  const shader = (type: number, text: string) => {
    const value = gl.createShader(type)!;
    gl.shaderSource(value, text);
    gl.compileShader(value);
    if (!gl.getShaderParameter(value, gl.COMPILE_STATUS))
      throw new Error(`着色器编译失败：${gl.getShaderInfoLog(value)}`);
    return value;
  };
  const shaders = [
    shader(gl.VERTEX_SHADER, vertex),
    shader(gl.FRAGMENT_SHADER, fragment),
  ];
  const program = gl.createProgram()!;
  shaders.forEach((value) => gl.attachShader(program, value));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(`着色器链接失败：${gl.getProgramInfoLog(program)}`);
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program, "image"), 0);
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  console.log(
    "WebGL 实测：",
    JSON.stringify({
      renderer: debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      vendor: debug
        ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)
        : gl.getParameter(gl.VENDOR),
      version: gl.getParameter(gl.VERSION),
      width: canvas.width,
      height: canvas.height,
    }),
  );
  return {
    draw: (
      source: HTMLCanvasElement,
      frame: number,
      post: Shot<Surface>["post"],
    ) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
      gl.uniform1f(gl.getUniformLocation(program, "frame"), frame);
      gl.uniform1f(gl.getUniformLocation(program, "grain"), post.grain ?? 0);
      gl.uniform1f(
        gl.getUniformLocation(program, "vignetteInner"),
        post.vignetteInner ?? 0,
      );
      gl.uniform1f(gl.getUniformLocation(program, "vignette"), post.vignette ?? 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.finish();
      if (gl.getError() !== gl.NO_ERROR) throw new Error("WebGL 绘制失败。");
    },
    dispose: () => {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      shaders.forEach((value) => gl.deleteShader(value));
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
};
