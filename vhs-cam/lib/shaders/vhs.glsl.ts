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
uniform float u_bloom;
uniform int u_mode;

float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
float rand1(float v){ return fract(sin(v * 127.1) * 43758.5453); }

vec3 analogBlur(vec2 uv, float amount){
  float h = amount * 0.003;
  vec3 c = vec3(0.0);
  c += texture2D(u_video, uv + vec2(-h*2.0, 0.0)).rgb * 0.10;
  c += texture2D(u_video, uv + vec2(-h,     0.0)).rgb * 0.20;
  c += texture2D(u_video, uv                    ).rgb * 0.40;
  c += texture2D(u_video, uv + vec2( h,     0.0)).rgb * 0.20;
  c += texture2D(u_video, uv + vec2( h*2.0, 0.0)).rgb * 0.10;
  return c;
}

vec3 gaussBlur(vec2 uv, float radius){
  vec3 c = vec3(0.0);
  float total = 0.0;
  for(int x = -3; x <= 3; x++){
    for(int y = -3; y <= 3; y++){
      float w = exp(-float(x*x + y*y) / (2.0 * radius * radius));
      c += texture2D(u_video, uv + vec2(float(x), float(y)) * 0.004).rgb * w;
      total += w;
    }
  }
  return c / total;
}

vec3 vhsGrade(vec3 col, float warmth, float contrast){
  col = col * 0.92 + 0.04;
  col.r *= 1.0 + warmth * 0.12;
  col.g *= 1.0 - warmth * 0.03;
  col.b *= 1.0 - warmth * 0.10;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 0.78);
  float c = 1.0 + contrast * 0.3;
  col = (col - 0.5) * c + 0.5;
  return col;
}

vec3 applyVHS(vec2 uv, float t){
  float glitch   = u_glitch   / 100.0;
  float noise    = u_noise    / 100.0;
  float blur     = u_blur     / 100.0;
  float warmth   = u_warmth   / 100.0;
  float contrast = u_contrast / 100.0;
  float vignette = u_vignette / 100.0;

  float hScan = floor(uv.y * 240.0) / 240.0;
  float jitter = (rand(vec2(hScan, floor(t * 30.0))) - 0.5) * glitch * 0.009;

  float tSeed  = floor(t * 8.0);
  float tZoneY = rand(vec2(tSeed, 5.7));
  float tZone  = step(abs(uv.y - tZoneY), 0.035);
  float tFire  = step(0.984, rand(vec2(tSeed, 2.3)));
  jitter += tZone * tFire * glitch * 0.035;

  float wave   = sin(uv.y * 14.0 + t * 3.2) * glitch * 0.0018;
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

  float sl = 1.0 - smoothstep(0.0, 0.35, mod(uv.y * 240.0, 1.0)) * 0.09;
  col *= sl;

  float vig = uv.x*(1.0-uv.x)*uv.y*(1.0-uv.y)*14.0;
  col *= mix(1.0, pow(vig,0.35)*0.38+0.62, vignette);

  vec2 gUV = uv*1.8 + vec2(rand1(t*0.31)*0.4, rand1(t*0.73+1.0)*0.4);
  col += (texture2D(u_grain, fract(gUV)).r - 0.5) * noise * 0.20;

  col *= 1.0 + (rand1(floor(t*24.0)) - 0.5) * glitch * 0.04;
  return clamp(col, 0.0, 1.0);
}

vec3 applyVHSC(vec2 uv, float t){
  vec3 col = applyVHS(uv, t);
  float lum = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(lum), col, 1.1);
  col.b *= 1.04;
  return clamp(col, 0.0, 1.0);
}

vec3 applyGlitch(vec2 uv, float t){
  float glitch = u_glitch / 100.0;
  float noise  = u_noise  / 100.0;

  float sliceY  = floor(uv.y * 48.0) / 48.0;
  float bigFire = step(0.91, rand(vec2(floor(t*14.0), 9.1)));
  float shift   = (rand(vec2(sliceY, floor(t*22.0))) - 0.5) * glitch * 0.09 * bigFire;
  shift        += (rand(vec2(sliceY, floor(t*60.0))) - 0.5) * glitch * 0.012;

  vec2 uvS  = vec2(fract(uv.x + shift), uv.y);
  vec2 uvR2 = vec2(fract(uv.x + shift + glitch*0.014), uv.y);
  vec2 uvB2 = vec2(fract(uv.x + shift - glitch*0.009), uv.y);

  vec3 col = vec3(
    texture2D(u_video, uvR2).r,
    texture2D(u_video, uvS ).g,
    texture2D(u_video, uvB2).b
  );

  float bFire = step(0.94, rand(vec2(floor(uv.y*22.0), floor(t*11.0))));
  col.r = mix(col.r, rand(vec2(floor(uv.x*18.0), floor(t*11.0))), bFire * glitch * 0.45);

  col *= 1.0 - mod(uv.y*360.0, 1.0) * 0.06;
  col += (texture2D(u_grain, uv + vec2(fract(t*0.51), fract(t*0.83))).r - 0.5) * noise * 0.22;
  col.r *= 1.1; col.b *= 0.88;
  return clamp(col, 0.0, 1.0);
}

vec3 applyNightVision(vec2 uv, float t){
  float noise    = u_noise    / 100.0;
  float contrast = u_contrast / 100.0;
  float vignette = u_vignette / 100.0;
  float bloom    = u_bloom    / 100.0;
  float glitch   = u_glitch   / 100.0;

  float smear = 0.003 + glitch * 0.003;
  vec3 smeared = vec3(0.0);
  smeared += texture2D(u_video, uv + vec2(-smear*2.0, 0.0)).rgb * 0.15;
  smeared += texture2D(u_video, uv + vec2(-smear,     0.0)).rgb * 0.25;
  smeared += texture2D(u_video,                        uv ).rgb * 0.40;
  smeared += texture2D(u_video, uv + vec2( smear,     0.0)).rgb * 0.15;
  smeared += texture2D(u_video, uv + vec2( smear*2.0, 0.0)).rgb * 0.05;

  float luma = dot(smeared, vec3(0.299, 0.587, 0.114));

  float gain = 1.8 + contrast * 1.2;
  luma = pow(luma, 0.7) * gain;

  float lumaBlurred = dot(gaussBlur(uv, 1.8), vec3(0.299,0.587,0.114));
  float bloomGlow   = pow(clamp(lumaBlurred, 0.0, 1.0), 1.5) * bloom * 1.4;
  luma = luma + bloomGlow;

  luma = luma / (1.0 + luma);
  luma = pow(luma, 0.85);
  luma = clamp(luma, 0.0, 1.0);

  float shotScale = (1.0 - luma) * noise * 0.35 + noise * 0.08;
  vec2  noiseUV   = uv * 2.3 + vec2(rand1(t * 1.7) * 0.5, rand1(t * 2.3 + 0.5) * 0.5);
  float shot      = (texture2D(u_grain, fract(noiseUV)).r - 0.5) * shotScale * 2.0;
  luma += shot;

  float sparkle = step(0.997, rand(uv * 500.0 + vec2(floor(t*30.0))));
  luma += sparkle * 0.8;

  float scan      = sin(uv.y * 180.0 + t * 1.8) * 0.018 + 0.018;
  luma -= scan;

  float brite    = step(0.998, rand(vec2(floor(t * 4.0), 3.7)));
  vec2  britePos = vec2(rand(vec2(floor(t*4.0), 1.1)), rand(vec2(floor(t*4.0), 2.2)));
  float briteDist = length(uv - britePos);
  luma += brite * smoothstep(0.06, 0.0, briteDist) * glitch;

  luma = clamp(luma, 0.0, 1.0);

  vec3 phosphor = vec3(0.18, 1.0, 0.22);
  vec3 col = luma * phosphor;

  vec2  centered = (uv - 0.5);
  float tubeDist = length(centered);
  float tubeVig  = smoothstep(0.52, 0.38, tubeDist);
  float tubeMask = smoothstep(0.505, 0.48, tubeDist);
  col *= tubeVig * tubeMask * (0.4 + vignette * 0.6);

  float sl = 1.0 - mod(uv.y * 480.0, 1.0) * 0.04;
  col *= sl;

  return clamp(col, 0.0, 1.0);
}

void main(){
  vec3 col;
  if      (u_mode == 0) col = applyVHS(v_uv, u_time);
  else if (u_mode == 1) col = applyVHSC(v_uv, u_time);
  else if (u_mode == 2) col = applyGlitch(v_uv, u_time);
  else if (u_mode == 3) col = applyNightVision(v_uv, u_time);
  else                  col = applyVHS(v_uv, u_time);
  gl_FragColor = vec4(col, 1.0);
}
`