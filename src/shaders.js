import _ from 'lodash';
import parseHLSL from './hlslParser';
import optimizeGLSL from './glslOptimizer';

function getShaderParts (t) {
  const sbIndex = t.indexOf('shader_body');
  if (t && sbIndex > -1) {
    const beforeShaderBody = t.substring(0, sbIndex);
    const afterShaderBody = t.substring(sbIndex);
    const firstCurly = afterShaderBody.indexOf('{');
    const lastCurly = afterShaderBody.lastIndexOf('}');
    const shaderBody = afterShaderBody.substring(firstCurly + 1, lastCurly);
    return [beforeShaderBody, shaderBody];
  }

  return ['', t];
}

// eslint-disable-next-line import/prefer-default-export
export function convertShader (shader) {
  if (shader.length === 0) {
    return '';
  }

  let shaderFixed = _.replace(shader, '#define sat saturate', '');
  shaderFixed = _.replace(shaderFixed, /sat\(/g, 'saturate(');
  shaderFixed = _.replace(shaderFixed, /float1/g, 'float');
  shaderFixed = _.replace(shaderFixed, /tex2d/g, 'tex2D');
  shaderFixed = _.replace(shaderFixed, /tex3d/g, 'tex3D');
  shaderFixed = _.replace(shaderFixed, /lerp\(ret,\s*1\s*,/g, 'lerp(ret, float3(1,1,1),');

  const shaderParts = getShaderParts(shaderFixed);
  // TODO: split vars (IN HEADER) that are like float3 a,x,el;
  const fullShader =
  `const float M_PI = 3.14159265359;
   const float M_PI_2 = 6.28318530718;
   const float M_INV_PI_2 = 0.159154943091895;

   uniform sampler2D sampler_main;
   uniform sampler2D sampler_fw_main;
   uniform sampler2D sampler_pw_main;
   uniform sampler2D sampler_fc_main;
   uniform sampler2D sampler_pc_main;

   uniform sampler2D sampler_noise_lq;
   uniform sampler2D sampler_noise_lq_lite;
   uniform sampler2D sampler_noise_mq;
   uniform sampler2D sampler_noise_hq;
   uniform sampler3D sampler_noisevol_lq;
   uniform sampler3D sampler_noisevol_hq;

   uniform sampler2D sampler_blur1;
   uniform sampler2D sampler_blur2;
   uniform sampler2D sampler_blur3;

   float4 texsize_noise_lq;
   float4 texsize_noise_mq;
   float4 texsize_noise_hq;
   float4 texsize_noise_lq_lite;
   float4 texsize_noisevol_lq;
   float4 texsize_noisevol_hq;

   float4 _qa;
   float4 _qb;
   float4 _qc;
   float4 _qd;
   float4 _qe;
   float4 _qf;
   float4 _qg;
   float4 _qh;

   float q1;
   float q2;
   float q3;
   float q4;
   float q5;
   float q6;
   float q7;
   float q8;
   float q9;
   float q10;
   float q11;
   float q12;
   float q13;
   float q14;
   float q15;
   float q16;
   float q17;
   float q18;
   float q19;
   float q20;
   float q21;
   float q22;
   float q23;
   float q24;
   float q25;
   float q26;
   float q27;
   float q28;
   float q29;
   float q30;
   float q31;
   float q32;

   float blur1_min;
   float blur1_max;
   float blur2_min;
   float blur2_max;
   float blur3_min;
   float blur3_max;

   float scale1;
   float scale2;
   float scale3;
   float bias1;
   float bias2;
   float bias3;

   float4 slow_roam_cos;
   float4 roam_cos;
   float4 slow_roam_sin;
   float4 roam_sin;

   float3 hue_shader;

   float time;
   float4 rand_preset;
   float4 rand_frame;
   float  progress;
   float  frame;
   float  fps;
   float  decay;
   float  bass;
   float  mid;
   float  treb;
   float  vol;
   float  bass_att;
   float  mid_att;
   float  treb_att;
   float  vol_att;
   float4 texsize;
   float4 aspect;

   float rad;
   float ang;
   float2 uv_orig;

   float3 lum(float3 v){
     return float3(dot(v, float3(0.32,0.49,0.29)));
   }

   float3 GetMain (float2 uv) {
     return tex2D(sampler_main,uv).xyz;
   }

   float3 GetPixel (float2 uv) {
     return tex2D(sampler_main,uv).xyz;
   }

   float3 GetBlur1 (float2 uv) {
     return tex2D(sampler_blur1,uv).xyz * scale1 + bias1;
   }

   float3 GetBlur2 (float2 uv) {
     return tex2D(sampler_blur2,uv).xyz * scale2 + bias2;
   }

   float3 GetBlur3 (float2 uv) {
     return tex2D(sampler_blur3,uv).xyz * scale3 + bias3;
   }

   ${shaderParts[0]}

   float4 shader_body (float2 uv : TEXCOORD0) : COLOR0
   {
       float3 ret;

       ${shaderParts[1]}

       return float4(ret, 1.0);
   }`;
  let convertedShader = parseHLSL(fullShader, 'shader_body', 'fs');
  convertedShader = _.replace(convertedShader, /#version 100\sprecision highp float;/, '');
  convertedShader = _.join(_.filter(_.split(convertedShader, '\n'), (line) => !_.startsWith(line, '#line')), '\n');
  convertedShader = _.replace(convertedShader, /vec2 uv;\s+uv = frag_TEXCOORD0;/, '');
  convertedShader = _.replace(convertedShader, 'varying vec2 frag_TEXCOORD0;', 'varying vec2 uv;');
  convertedShader = _.replace(convertedShader, 'gl_FragData[0]', 'gl_FragColor');
  convertedShader = _.replace(convertedShader, 'uniform float M_INV_PI_2', 'const float M_INV_PI_2');
  convertedShader = _.replace(convertedShader, 'uniform float M_PI_2', 'const float M_PI_2');
  convertedShader = _.replace(convertedShader, 'uniform float M_PI', 'const float M_PI');

  let optimizedShader = optimizeGLSL(convertedShader, 1, false);
  optimizedShader = _.replace(optimizedShader, /void main \(\)\s*\{/, 'shader_body {');
  optimizedShader = _.replace(optimizedShader, /gl_FragColor = (.+);/, (match, p1) => `ret = ${p1}.xyz;`);

  let shaderLines = _.split(optimizedShader, '\n');
  shaderLines = _.filter(shaderLines, (line) => !_.startsWith(line, 'varying') &&
                                                !_.startsWith(line, 'uniform'));

  return _.join(shaderLines, '\n');
}
