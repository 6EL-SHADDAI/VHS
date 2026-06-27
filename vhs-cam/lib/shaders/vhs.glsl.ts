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

vec3 lumaBlur(vec2 uv, float amount){
  float h = amount * 0.0025;
  vec3 c = vec3(0.0);
  c += texture2D(u_video, uv + vec2(-h*3.0, 0.0)).rgb * 0.06;
  c += texture2D(u_video, uv + vec2(-h*2.0, 0.0)).rgb * 0.12;
  c += texture2D(u_video, uv + vec2(-h,     0.0)).rgb * 0.22;
  c += texture2D(u_video,                    uv ).rgb * 0.20;
  c += texture2D(u_video, uv + vec2( h,     0.0)).rgb * 0.22;
  c += texture2D(u_video, uv + vec2( h*2.0, 0.0)).rgb * 0.12;
  c += texture2D(u_video, uv + vec2( h*3.0, 0.0)).rgb * 0.06;
  return c;
}

vec3 chromaBleed(vec2 uv, float amount){
  float h = amount * 0.012;
  vec3 c = vec3(0.0);
  c += texture2D(u_video, uv + vec2(-h*3.0, 0.0)).rgb * 0.05;
  c += texture2D(u_video, uv + vec2(-h*2.0, 0.0)).rgb * 0.10;
  c += texture2D(u_video, uv + vec2(-h,     0.0)).rgb * 0.20;
  c += texture2D(u_video,                    uv ).rgb * 0.30;
  c += texture2D(u_video, uv + vec2( h,     0.0)).rgb * 0.20;
  c += texture2D(u_video, uv + vec2( h*2.0, 0.0)).rgb * 0.10;
  c += texture2D(u_video, uv + vec2( h*3.0, 0.0)).rgb * 0.05;
  return c;
}

vec3 gaussBlur7(vec2 uv, float radius){
  vec3 c = vec3(0.0);
  float total = 0.0;
  float weights[7];
  weights[0]=0.0625; weights[1]=0.125; weights[2]=0.1875; weights[3]=0.25;
  weights[4]=0.1875; weights[5]=0.125; weights[6]=0.0625;
  for(int i=0;i<7;i++){
    float off = (float(i)-3.0)*radius*0.006;
    vec2 uvX = uv + vec2(off, 0.0);
    vec2 uvY = uv + vec2(0.0, off);
    c += texture2D(u_video, clamp(uvX,0.0,1.0)).rgb * weights[i] * 0.5;
    c += texture2D(u_video, clamp(uvY,0.0,1.0)).rgb * weights[i] * 0.5;
    total += weights[i];
  }
  return c / total;
}

vec3 rgb2yuv(vec3 c){
  return vec3(
    dot(c, vec3(0.299, 0.587, 0.114)),
    dot(c, vec3(-0.147, -0.289, 0.436)),
    dot(c, vec3(0.615, -0.515, -0.100))
  );
}
vec3 yuv2rgb(vec3 yuv){
  return vec3(
    yuv.x + 1.14 * yuv.z,
    yuv.x - 0.395 * yuv.y - 0.581 * yuv.z,
    yuv.x + 2.032 * yuv.y
  );
}

vec3 applyVHS(vec2 uv, float t){
  float glitch   = u_glitch   / 100.0;
  float noise    = u_noise    / 100.0;
  float blur     = u_blur     / 100.0;
  float warmth   = u_warmth   / 100.0;
  float contrast = u_contrast / 100.0;
  float vignette = u_vignette / 100.0;

  float scanRow = floor(uv.y * 240.0);
  float jitter  = (rand(vec2(scanRow, floor(t * 24.0))) - 0.5) * glitch * 0.006;

  float tSeed = floor(t * 6.0);
  float tY    = rand(vec2(tSeed, 7.3));
  float tZone = smoothstep(0.04, 0.0, abs(uv.y - tY));
  float tFire = step(0.96, rand(vec2(tSeed, 2.1)));
  jitter += tZone * tFire * glitch * 0.04;

  float wave = sin(uv.y * 8.0 + t * 2.1) * glitch * 0.0015
             + sin(uv.y * 31.0 + t * 5.7) * glitch * 0.0005;

  vec2 uvShifted = clamp(vec2(uv.x + jitter + wave, uv.y), 0.0, 1.0);

  vec3 lumaSource = lumaBlur(uvShifted, blur * 0.5 + 0.5);
  float luma = dot(lumaSource, vec3(0.299, 0.587, 0.114));

  float chromaDroopY = 2.0 / 240.0;
  vec2 uvChroma = clamp(vec2(uvShifted.x, uvShifted.y + chromaDroopY), 0.0, 1.0);
  vec3 chromaSource = chromaBleed(uvChroma, blur * 0.5 + 0.8);
  vec3 chromaYUV = rgb2yuv(chromaSource);

  float rShift = glitch * 0.008 + 0.003;
  float bShift = glitch * 0.003 + 0.001;
  vec3 rSample = chromaBleed(clamp(vec2(uvShifted.x + rShift, uvChroma.y), 0.0, 1.0), blur * 0.5 + 0.8);
  vec3 bSample = chromaBleed(clamp(vec2(uvShifted.x - bShift, uvChroma.y), 0.0, 1.0), blur * 0.5 + 0.8);

  vec3 col;
  col.r = luma + (rSample.r - dot(rSample, vec3(0.299,0.587,0.114))) * 1.4;
  col.g = luma + (chromaSource.g - chromaYUV.x) * 1.0;
  col.b = luma + (bSample.b - dot(bSample, vec3(0.299,0.587,0.114))) * 1.2;

  col = col * 0.88 + 0.06;
  col.r = col.r * (1.0 + warmth * 0.15);
  col.g = col.g * (1.0 - warmth * 0.02);
  col.b = col.b * (1.0 - warmth * 0.10);
  vec3 yuv = rgb2yuv(col);
  yuv.y *= 1.0 + warmth * 0.12;
  yuv.z *= 1.0 + warmth * 0.08;
  col = yuv2rgb(yuv);
  col = (col - 0.5) * (1.0 + contrast * 0.25) + 0.5;

  float sl = 1.0 - smoothstep(0.3, 0.7, mod(uv.y * 240.0, 1.0)) * 0.07;
  col *= sl;

  float crawlFreq  = 160.0;
  float crawlSpeed = t * 8.0;
  float crawl      = sin(uv.x * crawlFreq + uv.y * 90.0 - crawlSpeed) * 0.5 + 0.5;
  crawl            = step(0.92, crawl) * 0.04 * noise;
  float lumaEdge   = abs(luma - dot(lumaBlur(uvShifted + vec2(0.003,0.0), blur*0.5+0.5), vec3(0.299,0.587,0.114)));
  lumaEdge         = smoothstep(0.03, 0.12, lumaEdge);
  col.gb          += crawl * lumaEdge;

  float chromaNoise  = texture2D(u_grain, uv * 1.4 + vec2(rand1(t * 0.41) * 0.5, rand1(t * 0.83 + 1.7) * 0.5)).r - 0.5;
  float chromaNoise2 = texture2D(u_grain, uv * 2.1 + vec2(rand1(t * 0.67 + 0.3) * 0.4, rand1(t * 0.29) * 0.4)).r - 0.5;
  col.r += chromaNoise  * noise * 0.14;
  col.g += chromaNoise2 * noise * 0.09;
  col.b += chromaNoise  * noise * 0.16;

  float headSwitch  = smoothstep(0.96, 1.0, uv.y);
  float switchNoise = (rand(vec2(uv.x * 200.0, floor(t * 30.0))) - 0.5) * 2.0;
  col = mix(col, col + vec3(switchNoise * 0.3), headSwitch * glitch * 0.6);

  float vig = uv.x * (1.0-uv.x) * uv.y * (1.0-uv.y) * 16.0;
  col *= mix(1.0, pow(max(vig, 0.0), 0.3) * 0.4 + 0.6, vignette);

  float flicker = 1.0 + (rand1(floor(t * 20.0)) - 0.5) * glitch * 0.025;
  col *= flicker;

  return clamp(col, 0.0, 1.0);
}

vec3 applyVHSC(vec2 uv, float t){
  vec3 col = applyVHS(uv, t);
  vec3 yuv = rgb2yuv(col);
  yuv.y *= 1.08;
  col = yuv2rgb(yuv);
  col.b *= 1.03;
  return clamp(col, 0.0, 1.0);
}

vec3 applyGlitch(vec2 uv, float t){
  float glitch = u_glitch / 100.0;
  float noise  = u_noise  / 100.0;

  float sliceY  = floor(uv.y * 48.0) / 48.0;
  float bigFire = step(0.88, rand(vec2(floor(t * 14.0), 9.1)));
  float shift   = (rand(vec2(sliceY, floor(t * 22.0))) - 0.5) * glitch * 0.10 * bigFire;
  shift        += (rand(vec2(sliceY, floor(t * 60.0))) - 0.5) * glitch * 0.012;

  vec2 uvS  = vec2(fract(uv.x + shift), uv.y);
  vec2 uvR2 = vec2(fract(uv.x + shift + glitch * 0.016), uv.y);
  vec2 uvB2 = vec2(fract(uv.x + shift - glitch * 0.010), uv.y);

  vec3 col = vec3(
    texture2D(u_video, uvR2).r,
    texture2D(u_video, uvS ).g,
    texture2D(u_video, uvB2).b
  );

  float bFire = step(0.94, rand(vec2(floor(uv.y * 22.0), floor(t * 11.0))));
  col.r = mix(col.r, rand(vec2(floor(uv.x * 18.0), floor(t * 11.0))), bFire * glitch * 0.5);
  col *= 1.0 - mod(uv.y * 360.0, 1.0) * 0.06;

  vec3 grainSamp = texture2D(u_grain, uv + vec2(fract(t * 0.51), fract(t * 0.83))).rgb;
  col.r += (grainSamp.r - 0.5) * noise * 0.20;
  col.g += (grainSamp.g - 0.5) * noise * 0.12;
  col.b += (grainSamp.b - 0.5) * noise * 0.22;

  col.r *= 1.08; col.b *= 0.90;
  return clamp(col, 0.0, 1.0);
}

vec3 applyNightVision(vec2 uv, float t){
  float noise    = u_noise    / 100.0;
  float contrast = u_contrast / 100.0;
  float vignette = u_vignette / 100.0;
  float bloom    = u_bloom    / 100.0;
  float glitch   = u_glitch   / 100.0;

  float smear = 0.002;
  vec3 raw;
  raw  = texture2D(u_video, clamp(uv + vec2(-smear*2.0, 0.0), 0.0, 1.0)).rgb * 0.10;
  raw += texture2D(u_video, clamp(uv + vec2(-smear,     0.0), 0.0, 1.0)).rgb * 0.20;
  raw += texture2D(u_video,                               uv             ).rgb * 0.40;
  raw += texture2D(u_video, clamp(uv + vec2( smear,     0.0), 0.0, 1.0)).rgb * 0.20;
  raw += texture2D(u_video, clamp(uv + vec2( smear*2.0, 0.0), 0.0, 1.0)).rgb * 0.10;

  float luma = dot(raw, vec3(0.299, 0.587, 0.114));

  float gain = 1.4 + contrast * 0.8;
  luma = pow(max(luma, 0.0), 0.65) * gain;
  luma = luma / (1.0 + luma * 0.6);

  vec3 blurredRaw = gaussBlur7(uv, 1.5);
  float lumaBlur2  = dot(blurredRaw, vec3(0.299,0.587,0.114));
  float lumaBlurB  = pow(max(lumaBlur2, 0.0), 0.65) * gain / (1.0 + lumaBlur2 * gain * 0.6);

  float bloomMask = smoothstep(0.4, 0.9, lumaBlurB);
  float bloomGlow = bloomMask * bloom * 0.6;
  luma = luma + bloomGlow;

  luma = pow(clamp(luma, 0.0, 1.0), 0.9);

  float noiseAmt = (1.0 - luma) * noise * 0.18 + noise * 0.04;
  vec2 scintUV   = uv * 3.1 + vec2(rand1(floor(t * 30.0) * 0.37), rand1(floor(t * 30.0) * 0.71 + 1.0));
  float scint    = (texture2D(u_grain, fract(scintUV)).r - 0.5) * noiseAmt * 2.0;
  luma           = clamp(luma + scint, 0.0, 1.0);

  float hotPixel = step(0.9985, rand(uv * 800.0 + vec2(floor(t * 30.0))));
  luma += hotPixel * 0.7;

  float scanPattern = 1.0 - mod(uv.y * 600.0, 1.0) * 0.025;
  luma *= scanPattern;

  vec3 phosphorColor = vec3(0.22, 1.0, 0.26);
  vec3 col = luma * phosphorColor;
  col += bloomGlow * vec3(0.15, 0.3, 0.08) * bloom;

  vec2  centred  = uv - 0.5;
  float dist     = length(centred);
  float innerVig = smoothstep(0.50, 0.30, dist);
  float tubeMask = smoothstep(0.50, 0.47, dist);
  float edgeGlow = smoothstep(0.52, 0.50, dist) * smoothstep(0.46, 0.49, dist) * 0.3;

  col *= mix(0.5, 1.0, vignette * 0.5 + 0.5) * innerVig * tubeMask;
  col += edgeGlow * phosphorColor * 0.2 * luma;
  col *= 1.15;

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