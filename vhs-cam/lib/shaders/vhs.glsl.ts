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

float rand(vec2 co){ return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453); }
float rand1(float v){ return fract(sin(v*127.1)*43758.5453); }

vec3 rgb2yuv(vec3 c){
  return vec3(
     0.299*c.r + 0.587*c.g + 0.114*c.b,
    -0.147*c.r - 0.289*c.g + 0.436*c.b,
     0.615*c.r - 0.515*c.g - 0.100*c.b
  );
}
vec3 yuv2rgb(vec3 y){
  return clamp(vec3(
    y.x + 1.140*y.z,
    y.x - 0.395*y.y - 0.581*y.z,
    y.x + 2.032*y.y
  ),0.0,1.0);
}

vec3 lumaBlur(vec2 uv, float amt){
  float h = amt * 0.003;
  vec3 s = vec3(0.0);
  s += texture2D(u_video, uv+vec2(-h*3.,0.)).rgb * 0.07;
  s += texture2D(u_video, uv+vec2(-h*2.,0.)).rgb * 0.13;
  s += texture2D(u_video, uv+vec2(-h,   0.)).rgb * 0.22;
  s += texture2D(u_video, uv              ).rgb   * 0.16;
  s += texture2D(u_video, uv+vec2( h,   0.)).rgb * 0.22;
  s += texture2D(u_video, uv+vec2( h*2.,0.)).rgb * 0.13;
  s += texture2D(u_video, uv+vec2( h*3.,0.)).rgb * 0.07;
  return s;
}

vec3 chromaBlur(vec2 uv, float amt){
  float h = amt * 0.018;
  vec3 s = vec3(0.0);
  // x: clamp (no horizontal wrap), y: wrap via fract (droop pushes y out of [0,1])
  s += texture2D(u_video, vec2(clamp(uv.x-h*3.,0.,1.), fract(uv.y))).rgb * 0.05;
  s += texture2D(u_video, vec2(clamp(uv.x-h*2.,0.,1.), fract(uv.y))).rgb * 0.10;
  s += texture2D(u_video, vec2(clamp(uv.x-h,   0.,1.), fract(uv.y))).rgb * 0.20;
  s += texture2D(u_video, vec2(clamp(uv.x,     0.,1.), fract(uv.y))).rgb * 0.30;
  s += texture2D(u_video, vec2(clamp(uv.x+h,   0.,1.), fract(uv.y))).rgb * 0.20;
  s += texture2D(u_video, vec2(clamp(uv.x+h*2.,0.,1.), fract(uv.y))).rgb * 0.10;
  s += texture2D(u_video, vec2(clamp(uv.x+h*3.,0.,1.), fract(uv.y))).rgb * 0.05;
  return s;
}

vec3 gaussBlur(vec2 uv, float r){
  vec3 c = vec3(0.0);
  float w[5]; w[0]=0.06; w[1]=0.24; w[2]=0.40; w[3]=0.24; w[4]=0.06;
  for(int i=0;i<5;i++){
    float o = (float(i)-2.0)*r*0.008;
    c += texture2D(u_video,clamp(uv+vec2(o,0.),0.,1.)).rgb * w[i] * 0.5;
    c += texture2D(u_video,clamp(uv+vec2(0.,o),0.,1.)).rgb * w[i] * 0.5;
  }
  return c;
}

vec3 applyVHS(vec2 uv, float t){
  float glitch   = u_glitch   / 100.0;
  float noise    = u_noise    / 100.0;
  float blur     = u_blur     / 100.0;
  float warmth   = u_warmth   / 100.0;
  float contrast = u_contrast / 100.0;
  float vignette = u_vignette / 100.0;

  float row    = floor(uv.y * 240.0);
  float jitter = (rand(vec2(row, floor(t*24.0))) - 0.5) * glitch * 0.005;

  float tSeed  = floor(t * 5.0);
  float tBandY = rand(vec2(tSeed, 7.3));
  float tBand  = smoothstep(0.035, 0.0, abs(uv.y - tBandY));
  float tFire  = step(0.97, rand(vec2(tSeed, 2.1)));
  jitter += tBand * tFire * glitch * 0.05;
  jitter += sin(uv.y * 6.0 + t * 2.8) * glitch * 0.0012;

  vec2 uvJ = clamp(vec2(uv.x + jitter, uv.y), 0.0, 1.0);

  vec3  lumaRGB = lumaBlur(uvJ, blur * 0.6 + 0.5);
  float luma    = dot(lumaRGB, vec3(0.299, 0.587, 0.114));

  float droopY   = 2.5 / 240.0;
  // Wrap instead of clamp — clamping smears the bottom rows into a flat band
  vec2  uvChroma = vec2(uvJ.x, fract(uvJ.y + droopY));

  float rBleed = blur * 0.7 + 0.8;
  float bBleed = blur * 0.5 + 0.6;
  vec3 chromaR = chromaBlur(clamp(vec2(uvChroma.x + 0.004 + glitch*0.008, uvChroma.y), 0.,1.), rBleed);
  vec3 chromaG = chromaBlur(uvChroma, (rBleed+bBleed)*0.5);
  vec3 chromaB = chromaBlur(clamp(vec2(uvChroma.x - 0.002 - glitch*0.003, uvChroma.y), 0.,1.), bBleed);

  float cr = chromaR.r - dot(chromaR, vec3(0.299,0.587,0.114));
  float cg = chromaG.g - dot(chromaG, vec3(0.299,0.587,0.114));
  float cb = chromaB.b - dot(chromaB, vec3(0.299,0.587,0.114));

  vec3 col = vec3(
    luma + cr * 1.5,
    luma + cg * 1.1,
    luma + cb * 1.3
  );

  col = col * 0.90 + 0.05;

  float hiMask = smoothstep(0.4, 0.9, luma);
  col.r += hiMask * warmth * 0.08;
  col.g += hiMask * warmth * 0.03;

  col.r *= 1.0 + warmth * 0.12;
  col.g *= 1.0 + warmth * 0.01;
  col.b *= 1.0 - warmth * 0.08;

  vec3 yuv = rgb2yuv(col);
  yuv.y *= 1.0 + warmth * 0.15;
  yuv.z *= 1.0 + warmth * 0.18;
  col = yuv2rgb(yuv);

  col = (col - 0.5) * (1.0 + contrast * 0.22) + 0.5;

  float sl = 1.0 - smoothstep(0.25, 0.75, mod(uv.y * 240.0, 1.0)) * 0.06;
  col *= sl;

  float crawl  = sin(uv.x * 180.0 - t * 9.0) * sin(uv.y * 180.0) * 0.5 + 0.5;
  crawl        = step(0.88, crawl) * noise * 0.05;
  float rEdge  = abs(cr - dot(chromaBlur(uvChroma+vec2(0.004,0.),rBleed), vec3(0.,-1.,1.)));
  crawl       *= smoothstep(0.02, 0.08, rEdge);
  col.r       += crawl;
  col.g       -= crawl * 0.3;

  vec2  gUV1    = fract(uv * 1.5 + vec2(rand1(floor(t*25.0)*0.31), rand1(floor(t*25.0)*0.77+1.)));
  vec2  gUV2    = fract(uv * 2.8 + vec2(rand1(floor(t*25.0)*0.53+2.), rand1(floor(t*25.0)*0.19)));
  float gR      = texture2D(u_grain, gUV1).r - 0.5;
  float gG      = texture2D(u_grain, gUV2).r - 0.5;
  float gB      = texture2D(u_grain, fract(gUV1 + vec2(0.3, 0.7))).r - 0.5;
  float darkMask = 1.0 - smoothstep(0.0, 0.5, luma);
  float noiseAmt = noise * (0.10 + darkMask * 0.08);
  col.r += gR * noiseAmt * 1.2;
  col.g += gG * noiseAmt * 0.7;
  col.b += gB * noiseAmt * 1.1;

  float headZone  = smoothstep(0.94, 1.0, uv.y);
  float headNoise = (rand(vec2(uv.x * 300.0, floor(t*30.0)))-0.5) * 2.0;
  col = mix(col, col * 0.4 + vec3(headNoise * 0.25), headZone * glitch * 0.7);

  float vig = uv.x*(1.-uv.x)*uv.y*(1.-uv.y) * 18.0;
  col *= mix(1.0, pow(max(vig,0.0),0.28) * 0.38 + 0.62, vignette);

  col *= 1.0 + (rand1(floor(t * 18.0)) - 0.5) * glitch * 0.022;

  return clamp(col, 0.0, 1.0);
}

vec3 applyVHSC(vec2 uv, float t){
  vec3 col = applyVHS(uv, t);
  vec3 yuv = rgb2yuv(col);
  yuv.y *= 1.06;
  yuv.z *= 1.04;
  col = yuv2rgb(yuv);
  col.b *= 1.025;
  return clamp(col, 0.0, 1.0);
}

vec3 applyGlitch(vec2 uv, float t){
  float glitch = u_glitch / 100.0;
  float noise  = u_noise  / 100.0;

  float sliceY  = floor(uv.y * 48.0) / 48.0;
  float bigFire = step(0.88, rand(vec2(floor(t*14.0),9.1)));
  float shift   = (rand(vec2(sliceY,floor(t*22.0)))-0.5)*glitch*0.10*bigFire;
  shift        += (rand(vec2(sliceY,floor(t*60.0)))-0.5)*glitch*0.012;

  vec3 col = vec3(
    texture2D(u_video, vec2(fract(uv.x+shift+glitch*0.016),uv.y)).r,
    texture2D(u_video, vec2(fract(uv.x+shift            ),uv.y)).g,
    texture2D(u_video, vec2(fract(uv.x+shift-glitch*0.010),uv.y)).b
  );

  float bFire = step(0.94, rand(vec2(floor(uv.y*22.0),floor(t*11.0))));
  col.r = mix(col.r, rand(vec2(floor(uv.x*18.0),floor(t*11.0))), bFire*glitch*0.5);
  col *= 1.0 - mod(uv.y*360.0,1.0)*0.06;

  vec3 gn = texture2D(u_grain, uv+vec2(fract(t*.51),fract(t*.83))).rgb;
  col.r += (gn.r-0.5)*noise*0.20;
  col.g += (gn.g-0.5)*noise*0.12;
  col.b += (gn.b-0.5)*noise*0.22;
  col.r *= 1.08; col.b *= 0.90;
  return clamp(col, 0.0, 1.0);
}

vec3 applyNightShot(vec2 uv, float t){
  float noise    = u_noise    / 100.0;
  float contrast = u_contrast / 100.0;
  float vignette = u_vignette / 100.0;
  float bloom    = u_bloom    / 100.0;
  float glitch   = u_glitch   / 100.0;

  float ghostAmt = 0.15 + glitch * 0.1;
  vec3  current  = texture2D(u_video, uv).rgb;
  vec3  ghosted  = texture2D(u_video, clamp(uv + vec2(0.0015, 0.0), 0.0, 1.0)).rgb;
  vec3  raw      = mix(current, ghosted, ghostAmt);

  float luma = dot(raw, vec3(0.299, 0.587, 0.114));

  float gain = 1.6 + contrast * 1.0;
  luma = 1.0 - pow(1.0 - pow(luma, 0.55), 1.0/gain);

  vec2  centreOffset = vec2(0.0, 0.05);
  float hotDist      = length((uv - 0.5 + centreOffset) * vec2(1.0, 1.3));
  float hotspot      = exp(-hotDist * hotDist * 3.5) * bloom * 0.35;
  luma               = clamp(luma + hotspot, 0.0, 1.0);

  float clipThresh = 0.82 - contrast * 0.12;
  float blown      = smoothstep(clipThresh, clipThresh + 0.15, luma);
  luma             = mix(luma, 1.0, blown * 0.7);

  vec3  blurRaw    = gaussBlur(uv, 2.0);
  float lumaBlur2  = dot(blurRaw, vec3(0.299,0.587,0.114));
  float gainedBlur = 1.0 - pow(1.0 - pow(lumaBlur2, 0.55), 1.0/gain);
  float bloomAmt   = smoothstep(0.5, 0.9, gainedBlur) * bloom * 0.5;
  luma             = clamp(luma + bloomAmt, 0.0, 1.0);

  vec3 nightGreen = vec3(0.75, 1.0, 0.65);
  vec3 col        = luma * nightGreen;

  float gainNoise = (1.0 - luma) * noise * 0.12 + noise * 0.03;
  vec2  nUV       = fract(uv * 2.5 + vec2(rand1(floor(t*30.)*0.41), rand1(floor(t*30.)*0.73)));
  float nSamp     = (texture2D(u_grain, nUV).r - 0.5) * gainNoise * 2.0;
  col            += vec3(nSamp * 0.6, nSamp * 1.0, nSamp * 0.5);

  float sl = 1.0 - mod(uv.y * 480.0, 1.0) * 0.03;
  col *= sl;

  float vig = uv.x*(1.-uv.x)*uv.y*(1.-uv.y) * 14.0;
  col *= mix(1.0, pow(max(vig,0.),0.32)*0.45+0.55, vignette);

  col *= 1.10;

  return clamp(col, 0.0, 1.0);
}

vec3 applyDisposable(vec2 uv, float t){
  float glitch   = (u_glitch   / 100.0) * 0.5;
  float noise    = (u_noise    / 100.0) * 0.5;
  float blur     = (u_blur     / 100.0) * 0.5;
  float warmth   =  u_warmth   / 100.0;
  float contrast =  u_contrast / 100.0;
  float vignette = (u_vignette / 100.0) * 0.6;

  float row    = floor(uv.y * 240.0);
  float jitter = (rand(vec2(row, floor(t*24.0))) - 0.5) * glitch * 0.005;

  float tSeed  = floor(t * 5.0);
  float tBandY = rand(vec2(tSeed, 7.3));
  float tBand  = smoothstep(0.035, 0.0, abs(uv.y - tBandY));
  float tFire  = step(0.97, rand(vec2(tSeed, 2.1)));
  jitter += tBand * tFire * glitch * 0.05;
  jitter += sin(uv.y * 6.0 + t * 2.8) * glitch * 0.0012;

  vec2 uvJ = clamp(vec2(uv.x + jitter, uv.y), 0.0, 1.0);

  vec3  lumaRGB = lumaBlur(uvJ, blur * 0.6 + 0.5);
  float luma    = dot(lumaRGB, vec3(0.299, 0.587, 0.114));

  float droopY   = 1.2 / 240.0;
  // Wrap instead of clamp — clamping smears the bottom rows into a flat band
  vec2  uvChroma = vec2(uvJ.x, fract(uvJ.y + droopY));

  float rBleed = blur * 0.7 + 0.4;
  float bBleed = blur * 0.5 + 0.3;
  vec3 chromaR = chromaBlur(clamp(vec2(uvChroma.x + 0.002 + glitch*0.008, uvChroma.y), 0.,1.), rBleed);
  vec3 chromaG = chromaBlur(uvChroma, (rBleed+bBleed)*0.5);
  vec3 chromaB = chromaBlur(clamp(vec2(uvChroma.x - 0.001 - glitch*0.003, uvChroma.y), 0.,1.), bBleed);

  float cr = chromaR.r - dot(chromaR, vec3(0.299,0.587,0.114));
  float cg = chromaG.g - dot(chromaG, vec3(0.299,0.587,0.114));
  float cb = chromaB.b - dot(chromaB, vec3(0.299,0.587,0.114));

  vec3 col = vec3(
    luma + cr * 1.0,
    luma + cg * 0.7,
    luma + cb * 0.8
  );

  col = col * 0.94 + 0.03;

  float hiMask = smoothstep(0.4, 0.9, luma);
  col.r += hiMask * warmth * 0.08;
  col.g += hiMask * warmth * 0.03;

  col.r *= 1.0 + warmth * 0.12;
  col.g *= 1.0 + warmth * 0.01;
  col.b *= 1.0 - warmth * 0.08;

  vec3 yuv = rgb2yuv(col);
  yuv.y *= 1.0 + warmth * 0.15;
  yuv.z *= 1.0 + warmth * 0.18;
  col = yuv2rgb(yuv);

  col = (col - 0.5) * (1.0 + contrast * 0.22) + 0.5;

  float sl = 1.0 - smoothstep(0.25, 0.75, mod(uv.y * 240.0, 1.0)) * 0.03;
  col *= sl;

  float crawl  = sin(uv.x * 180.0 - t * 9.0) * sin(uv.y * 180.0) * 0.5 + 0.5;
  crawl        = step(0.88, crawl) * noise * 0.025;
  float rEdge  = abs(cr - dot(chromaBlur(uvChroma+vec2(0.004,0.),rBleed), vec3(0.,-1.,1.)));
  crawl       *= smoothstep(0.02, 0.08, rEdge);
  col.r       += crawl;
  col.g       -= crawl * 0.3;

  vec2  gUV1    = fract(uv * 1.5 + vec2(rand1(floor(t*25.0)*0.31), rand1(floor(t*25.0)*0.77+1.)));
  vec2  gUV2    = fract(uv * 2.8 + vec2(rand1(floor(t*25.0)*0.53+2.), rand1(floor(t*25.0)*0.19)));
  float gR      = texture2D(u_grain, gUV1).r - 0.5;
  float gG      = texture2D(u_grain, gUV2).r - 0.5;
  float gB      = texture2D(u_grain, fract(gUV1 + vec2(0.3, 0.7))).r - 0.5;
  float darkMask = 1.0 - smoothstep(0.0, 0.5, luma);
  float noiseAmt = noise * (0.10 + darkMask * 0.08);
  col.r += gR * noiseAmt * 1.2;
  col.g += gG * noiseAmt * 0.7;
  col.b += gB * noiseAmt * 1.1;

  float headZone  = smoothstep(0.96, 1.0, uv.y);
  float headNoise = (rand(vec2(uv.x * 300.0, floor(t*30.0)))-0.5) * 2.0;
  col = mix(col, col * 0.7 + vec3(headNoise * 0.12), headZone * glitch * 0.7);

  float vig = uv.x*(1.-uv.x)*uv.y*(1.-uv.y) * 18.0;
  col *= mix(1.0, pow(max(vig,0.0),0.28) * 0.5 + 0.5, vignette);

  col *= 1.0 + (rand1(floor(t * 18.0)) - 0.5) * glitch * 0.022;

  float leakDist = length(uv - vec2(0.92, 0.08));
  float leak = exp(-leakDist * leakDist * 8.0) * 0.06 * warmth;
  col += vec3(leak * 1.2, leak * 0.6, leak * 0.1);

  return clamp(col, 0.0, 1.0);
}

void main(){
  vec3 col;
  if      (u_mode == 0) col = applyVHS(v_uv, u_time);
  else if (u_mode == 1) col = applyVHSC(v_uv, u_time);
  else if (u_mode == 2) col = applyGlitch(v_uv, u_time);
  else if (u_mode == 3) col = applyNightShot(v_uv, u_time);
  else if (u_mode == 4) col = applyDisposable(v_uv, u_time);
  else                  col = applyVHS(v_uv, u_time);
  gl_FragColor = vec4(col, 1.0);
}
`