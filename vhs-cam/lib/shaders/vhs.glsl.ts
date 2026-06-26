// VHS fragment shader — full analog simulation
// Imported as a TS string to avoid webpack GLSL loader dependency

export const VHS_VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

export const VHS_FRAG = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_video;
uniform sampler2D u_grain;
uniform float u_time;
uniform float u_glitch;
uniform float u_noise;
uniform float u_blur;
uniform float u_warmth;
uniform float u_contrast;
uniform float u_vignette;
uniform int u_mode;

float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
float rand1(float v){ return fract(sin(v * 127.1) * 43758.5453); }

// Horizontal analog blur (simulates low-bandwidth tape)
vec3 analogBlur(vec2 uv, float amount) {
  float h = amount * 0.003;
  vec3 col = vec3(0.0);
  col += texture2D(u_video, uv + vec2(-h*2.0, 0.0)).rgb * 0.1;
  col += texture2D(u_video, uv + vec2(-h,     0.0)).rgb * 0.2;
  col += texture2D(u_video, uv                    ).rgb * 0.4;
  col += texture2D(u_video, uv + vec2( h,     0.0)).rgb * 0.2;
  col += texture2D(u_video, uv + vec2( h*2.0, 0.0)).rgb * 0.1;
  return col;
}

vec3 vhsGrade(vec3 col, float warmth, float contrast) {
  // Lift shadows, crush slightly
  col = col * 0.92 + 0.04;
  // Warm color shift (VHS tape had warm bias)
  col.r *= 1.0 + warmth * 0.12;
  col.g *= 1.0 - warmth * 0.03;
  col.b *= 1.0 - warmth * 0.10;
  // Desaturate toward luma (tape chroma loss)
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 0.78);
  // Contrast
  float c = 1.0 + contrast * 0.3;
  col = (col - 0.5) * c + 0.5;
  return col;
}

vec3 applyVHS(vec2 uv, float t) {
  float glitch  = u_glitch  / 100.0;
  float noise   = u_noise   / 100.0;
  float blur    = u_blur    / 100.0;
  float warmth  = u_warmth  / 100.0;
  float contrast= u_contrast/ 100.0;
  float vignette= u_vignette/ 100.0;

  float hScan = floor(uv.y * 240.0) / 240.0;

  // Tape jitter — per-scanline horizontal wobble
  float jitter = (rand(vec2(hScan, floor(t * 30.0))) - 0.5) * glitch * 0.009;

  // Tracking error — random horizontal band displacement
  float tSeed  = floor(t * 8.0);
  float tZoneY = rand(vec2(tSeed, 5.7));
  float tZone  = step(abs(uv.y - tZoneY), 0.035);
  float tFire  = step(0.984, rand(vec2(tSeed, 2.3)));
  jitter += tZone * tFire * glitch * 0.035;

  // Wave distortion
  float wave = sin(uv.y * 14.0 + t * 3.2) * glitch * 0.0018;

  // Chroma shift — R/B channels offset horizontally (VHS chroma lag)
  float chroma = glitch * 0.007 + 0.0018;
  vec2 uvR = clamp(vec2(uv.x + chroma + wave + jitter, uv.y), 0.0, 1.0);
  vec2 uvG = clamp(vec2(uv.x + jitter * 0.4,           uv.y), 0.0, 1.0);
  vec2 uvB = clamp(vec2(uv.x - chroma * 0.6 + jitter,  uv.y), 0.0, 1.0);

  vec3 blurred = analogBlur(uvG, blur * 0.6 + 0.4);
  float r = mix(texture2D(u_video, uvR).r, analogBlur(uvR, blur*0.6+0.4).r, 0.4);
  float g = blurred.g;
  float b = mix(texture2D(u_video, uvB).b, analogBlur(uvB, blur*0.6+0.4).b, 0.4);
  vec3 col = vec3(r, g, b);

  col = vhsGrade(col, warmth, contrast);

  // Scanlines — 240-line structure
  float sl = 1.0 - smoothstep(0.0, 0.35, mod(uv.y * 240.0, 1.0)) * 0.09;
  col *= sl;

  // Vignette
  float vig = uv.x * (1.0 - uv.x) * uv.y * (1.0 - uv.y) * 14.0;
  vig = pow(vig, 0.35);
  col *= mix(1.0, vig * 0.38 + 0.62, vignette);

  // Grain (animated via time offset into grain texture)
  vec2 grainUV = uv * 1.8 + vec2(rand1(t * 0.31) * 0.4, rand1(t * 0.73 + 1.0) * 0.4);
  float grain = texture2D(u_grain, fract(grainUV)).r;
  col += (grain - 0.5) * noise * 0.20;

  // Flicker
  float flicker = 1.0 + (rand1(floor(t * 24.0)) - 0.5) * glitch * 0.04;
  col *= flicker;

  return clamp(col, 0.0, 1.0);
}

vec3 applyVHSC(vec2 uv, float t) {
  // VHS-C: cleaner, slightly sharper, less chroma bleed
  float oldGlitch = u_glitch;
  vec3 col = applyVHS(uv, t);
  // Slightly more saturated, cooler
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.1);
  col.b *= 1.04;
  return clamp(col, 0.0, 1.0);
}

vec3 applyGlitch(vec2 uv, float t) {
  float glitch = u_glitch / 100.0;
  float noise  = u_noise  / 100.0;

  // Slice displacement
  float sliceY   = floor(uv.y * 48.0) / 48.0;
  float bigFire  = step(0.91, rand(vec2(floor(t * 14.0), 9.1)));
  float shift    = (rand(vec2(sliceY, floor(t * 22.0))) - 0.5) * glitch * 0.09 * bigFire;
  shift         += (rand(vec2(sliceY, floor(t * 60.0))) - 0.5) * glitch * 0.012;

  vec2 uvS  = vec2(fract(uv.x + shift), uv.y);
  vec2 uvR2 = vec2(fract(uv.x + shift + glitch * 0.014), uv.y);
  vec2 uvB2 = vec2(fract(uv.x + shift - glitch * 0.009), uv.y);

  float r = texture2D(u_video, uvR2).r;
  float g = texture2D(u_video, uvS ).g;
  float b = texture2D(u_video, uvB2).b;
  vec3 col = vec3(r, g, b);

  // Block corruption
  float bFire = step(0.94, rand(vec2(floor(uv.y * 22.0), floor(t * 11.0))));
  float bRand = rand(vec2(floor(uv.x * 18.0), floor(t * 11.0)));
  col.r = mix(col.r, bRand, bFire * glitch * 0.45);

  // Scanlines
  col *= 1.0 - mod(uv.y * 360.0, 1.0) * 0.06;

  // Grain
  vec2 gUV = uv + vec2(fract(t * 0.51), fract(t * 0.83));
  float grain = texture2D(u_grain, gUV).r;
  col += (grain - 0.5) * noise * 0.22;

  col.r *= 1.1;
  col.b *= 0.88;
  return clamp(col, 0.0, 1.0);
}

void main() {
  vec3 col;
  if      (u_mode == 0) col = applyVHS(v_uv, u_time);
  else if (u_mode == 1) col = applyVHSC(v_uv, u_time);
  else                  col = applyGlitch(v_uv, u_time);
  gl_FragColor = vec4(col, 1.0);
}
`
