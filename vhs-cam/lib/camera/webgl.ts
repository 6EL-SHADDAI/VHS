import { VHS_VERT, VHS_FRAG } from '@/lib/shaders/vhs.glsl'

export type GLState = {
  gl: WebGLRenderingContext
  program: WebGLProgram
  videoTexture: WebGLTexture
  grainTexture: WebGLTexture
}

function compileShader(gl: WebGLRenderingContext, src: string, type: number): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('Shader compile error: ' + gl.getShaderInfoLog(shader))
  }
  return shader
}

export function initGL(canvas: HTMLCanvasElement): GLState {
  const gl = canvas.getContext('webgl', {
    preserveDrawingBuffer: true,
    antialias: false,
    alpha: false,
  }) as WebGLRenderingContext
  if (!gl) throw new Error('WebGL not supported')

  const program = gl.createProgram()!
  gl.attachShader(program, compileShader(gl, VHS_VERT, gl.VERTEX_SHADER))
  gl.attachShader(program, compileShader(gl, VHS_FRAG, gl.FRAGMENT_SHADER))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Program link error: ' + gl.getProgramInfoLog(program))
  }
  gl.useProgram(program)

  const buf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
  const posLoc = gl.getAttribLocation(program, 'a_pos')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

  return {
    gl,
    program,
    videoTexture: createVideoTexture(gl),
    grainTexture: createGrainTexture(gl),
  }
}

function createVideoTexture(gl: WebGLRenderingContext): WebGLTexture {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

function createGrainTexture(gl: WebGLRenderingContext): WebGLTexture {
  const size = 256
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size * 4; i += 4) {
    const v = (Math.random() * 255) | 0
    data[i] = data[i+1] = data[i+2] = v
    data[i+3] = 255
  }
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  return tex
}

export function resizeGL(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
  canvas.width  = canvas.offsetWidth  * dpr
  canvas.height = canvas.offsetHeight * dpr
  gl.viewport(0, 0, canvas.width, canvas.height)
}

export function renderFrame(
  state: GLState,
  video: HTMLVideoElement,
  uniforms: {
    time: number; glitch: number; noise: number; blur: number
    warmth: number; contrast: number; vignette: number; bloom: number; mode: number
  }
) {
  const { gl, program, videoTexture, grainTexture } = state

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, videoTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, grainTexture)

  const u = (name: string) => gl.getUniformLocation(program, name)
  gl.uniform1i(u('u_video'),    0)
  gl.uniform1i(u('u_grain'),    1)
  gl.uniform1f(u('u_time'),     uniforms.time)
  gl.uniform1f(u('u_glitch'),   uniforms.glitch)
  gl.uniform1f(u('u_noise'),    uniforms.noise)
  gl.uniform1f(u('u_blur'),     uniforms.blur)
  gl.uniform1f(u('u_warmth'),   uniforms.warmth)
  gl.uniform1f(u('u_contrast'), uniforms.contrast)
  gl.uniform1f(u('u_vignette'), uniforms.vignette)
  gl.uniform1f(u('u_bloom'),    uniforms.bloom)
  gl.uniform1i(u('u_mode'),     uniforms.mode)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}