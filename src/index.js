import _ from 'lodash';
import parseHLSL from './hlslParser';
import optimizeGLSL from './glslOptimizer';
import mdparser from '../lib/mdparser.min';

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

function getLineWithPrefix (text, prefix) {
  const regex = new RegExp(`${prefix}_\\d+=\`*`);
  const lines = _.filter(_.split(text, '\n'), (line) => regex.test(line));
  return _.join(_.map(lines, (line) => _.last(_.split(line, regex))), '\n');
}

function getWarpShader (text) {
  return getLineWithPrefix(text, 'warp');
}

function getCompShader (text) {
  return getLineWithPrefix(text, 'comp');
}

function getPresetInit (text) {
  return getLineWithPrefix(text, 'per_frame_init');
}

function getPerFrame (text) {
  return getLineWithPrefix(text, 'per_frame');
}

function getPerVetex (text) {
  return getLineWithPrefix(text, 'per_frame_pixel');
}

// eslint-disable-next-line import/prefer-default-export
function convertShader (shader) {
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

   uniform sampler2D sampler_blur1;
   uniform sampler2D sampler_blur2;
   uniform sampler2D sampler_blur3;

   float4 texsize_noise_lq;
   float4 texsize_noise_mq;
   float4 texsize_noise_hq;
   float4 texsize_noise_lq_lite;

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

  const optimizedShader = optimizeGLSL(convertedShader, 1, false);

  return optimizedShader;
}

function createBasePresetFuns (presetInit, perFrame, perVertex) {
  const parsedPreset = mdparser.convert_preset_wave_and_shape(presetInit, perFrame, perVertex);

  const parsedInitEQs = parsedPreset.perFrameInitEQs ? parsedPreset.perFrameInitEQs.trim() : '';
  const parsedFrameEQs = parsedPreset.perFrameEQs ? parsedPreset.perFrameEQs.trim() : '';
  const parsedPixelEQs = parsedPreset.perPixelEQs ? parsedPreset.perPixelEQs.trim() : '';

  /* eslint-disable no-new-func */
  const presetMap = {};
  presetMap.init_eqs = new Function('m', `${parsedInitEQs} \n\t\treturn m;`);
  presetMap.frame_eqs = new Function('m', `${parsedFrameEQs} \n\t\treturn m;`);
  if (parsedPixelEQs === '') {
    presetMap.pixel_eqs = '';
  } else {
    presetMap.pixel_eqs = new Function('m', `${parsedPixelEQs} \n\t\treturn m;`);
  }
  /* eslint-enable no-new-func */

  return presetMap;
}


const varMap = {
  frating: 'rating',
  fgammaadj: 'gammaadj',
  fdecay: 'decay',
  fvideoechozoom: 'echo_zoom',
  fvideoechoalpha: 'echo_alpha',
  nvideoechoorientation: 'echo_orient',
  nwavemode: 'wave_mode',
  badditivewaves: 'additivewave',
  bwavedots: 'wave_dots',
  bwavethick: 'wave_thick',
  bmodwavealphabyvolume: 'modwavealphabyvolume',
  bmaximizewavecolor: 'wave_brighten',
  btexwrap: 'wrap',
  bdarkencenter: 'darken_center',
  bredbluestereo: 'red_blue',
  bbrighten: 'brighten',
  bdarken: 'darken',
  bsolarize: 'solarize',
  binvert: 'invert',
  fwavealpha: 'wave_a',
  fwavescale: 'wave_scale',
  fwavesmoothing: 'wave_smoothing',
  fwaveparam: 'wave_mystery', // this var is different in base vals vs per frame eqs
  wave_mystery: 'wave_mystery',
  fmodwavealphastart: 'modwavealphastart',
  fmodwavealphaend: 'modwavealphaend',
  fwarpanimspeed: 'warpanimspeed',
  fwarpscale: 'warpscale',
  fzoomexponent: 'zoomexp',
  fshader: 'fshader',
  zoom: 'zoom',
  rot: 'rot',
  cx: 'cx',
  cy: 'cy',
  dx: 'dx',
  dy: 'dy',
  warp: 'warp',
  sx: 'sx',
  sy: 'sy',
  wave_r: 'wave_r',
  wave_g: 'wave_g',
  wave_b: 'wave_b',
  wave_x: 'wave_x',
  wave_y: 'wave_y',
  ob_size: 'ob_size',
  ob_r: 'ob_r',
  ob_g: 'ob_g',
  ob_b: 'ob_b',
  ob_a: 'ob_a',
  ib_size: 'ib_size',
  ib_r: 'ib_r',
  ib_g: 'ib_g',
  ib_b: 'ib_b',
  ib_a: 'ib_a',
  nmotionvectorsx: 'mv_x', // this var is different in base vals vs per frame eqs
  mv_x: 'mv_x',
  nmotionvectorsy: 'mv_y',
  mv_y: 'mv_y',
  mv_dx: 'mv_dx',
  mv_dy: 'mv_dy',
  mv_l: 'mv_l',
  mv_r: 'mv_r',
  mv_g: 'mv_g',
  mv_b: 'mv_b',
  mv_a: 'mv_a',
  r: 'r',
  g: 'g',
  b: 'b',
  a: 'a',
  r2: 'r2',
  g2: 'g2',
  b2: 'b2',
  a2: 'a2',
  border_r: 'border_r',
  border_g: 'border_g',
  border_b: 'border_b',
  border_a: 'border_a',
  thick: 'thickoutline',
  thickoutline: 'thickoutline',
  textured: 'textured',
  tex_zoom: 'tex_zoom',
  tex_ang: 'tex_ang',
  additive: 'additive',
  sides: 'sides',
  instance: 'instance',
  instances: 'num_inst',
  num_instances: 'num_inst',
  num_inst: 'num_inst',
  scaling: 'scaling',
  samples: 'samples',
  badditive: 'additive',
  busedots: 'usedots',
  bspectrum: 'spectrum',
  smoothing: 'smoothing',
  bdrawthick: 'thick',
  sample: 'sample',
  value1: 'value1',
  value2: 'value2',
  sep: 'sep',
  b1n: 'b1n',
  b2n: 'b2n',
  b3n: 'b3n',
  b1x: 'b1x',
  b2x: 'b2x',
  b3x: 'b3x',
  b1ed: 'b1ed',
  monitor: 'monitor',
};

function getBaseVals (text) {
  const lines = _.split(text, '\n');
  const baseVals = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const splitLine = _.split(line, '=');
    if (splitLine.length > 1) {
      baseVals[varMap[splitLine[0].toLowerCase()]] = parseFloat(splitLine[1]);
    }
  }
  return baseVals;
}

function isNonBaseVal (line) {
  return _.startsWith(line, 'per_frame_init') ||
         _.startsWith(line, 'per_frame') ||
         _.startsWith(line, 'per_frame_pixel') ||
         _.startsWith(line, 'wavecode') ||
         _.startsWith(line, 'shapecode') ||
         _.startsWith(line, 'warp_1') ||
         _.startsWith(line, 'comp_1');
}

function splitOutBaseVals (text) {
  const lines = _.split(text, '\n');
  return [
    _.join(_.takeWhile(lines, (line) => !isNonBaseVal(line)), '\n'),
    _.join(_.dropWhile(lines, (line) => !isNonBaseVal(line)), '\n')
  ];
}

function splitPreset (text) {
  const presetParts = splitOutBaseVals(text);
  const baseValsText = presetParts[0];
  const presetText = presetParts[1];

  const baseVals = getBaseVals(baseValsText);
  const warp = getWarpShader(presetText);
  const comp = getCompShader(presetText);
  const presetInit = getPresetInit(presetText);
  const perFrame = getPerFrame(presetText);
  const perVertex = getPerVetex(presetText);

  return {
    baseVals,
    presetInit,
    perFrame,
    perVertex,
    warp,
    comp
  };
}

// eslint-disable-next-line import/prefer-default-export
export function convertPreset (text) {
  const mainPresetText = _.split(text, '[preset00]')[1];
  const presetParts = splitPreset(mainPresetText);

  console.log(presetParts);

  const presetMap = createBasePresetFuns(presetParts.presetInit,
                                         presetParts.perFrame,
                                         presetParts.perVertex);
  const warpShader = convertShader(presetParts.warp);
  const compShader = convertShader(presetParts.comp);

  return _.assign({}, presetMap, {
    warp: warpShader,
    comp: compShader,
  });
}
