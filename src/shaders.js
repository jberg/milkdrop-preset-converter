import _ from 'lodash';

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
export function prepareShader (shader) {
  if (shader.length === 0) {
    return '';
  }

  let shaderFixed = _.replace(shader, 'sampler sampler_pw_noise_lq;\n', '');
  shaderFixed = _.replace(shaderFixed, 'sampler2D sampler_pw_noise_lq;\n', '');
  shaderFixed = _.replace(shaderFixed, 'sampler sampler_pw_noise_hq;\n', '');
  shaderFixed = _.replace(shaderFixed, 'sampler2D sampler_pw_noise_hq;\n', '');

  const shaderParts = getShaderParts(shaderFixed);
  const fullShader =
  `#define  M_PI   3.14159265359
   #define  M_PI_2 6.28318530718
   #define  M_INV_PI_2  0.159154943091895

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

   uniform sampler2D sampler_pw_noise_lq;

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

   #define GetMain(uv) (tex2D(sampler_main,uv).xyz)
   #define GetPixel(uv) (tex2D(sampler_main,uv).xyz)
   #define GetBlur1(uv) (tex2D(sampler_blur1,uv).xyz*scale1 + bias1)
   #define GetBlur2(uv) (tex2D(sampler_blur2,uv).xyz*scale2 + bias2)
   #define GetBlur3(uv) (tex2D(sampler_blur3,uv).xyz*scale3 + bias3)

   #define lum(x) (dot(x,float3(0.32,0.49,0.29)))
   #define tex2d tex2D
   #define tex3d tex3D

   ${_.replace(shaderParts[0], 'sampler sampler_', 'sampler2D sampler_')}

   float4 shader_body (float2 uv : TEXCOORD0) : COLOR0
   {
       float3 ret;

       ${shaderParts[1]}

       return float4(ret, 1.0);
   }`;

  return fullShader;
}
