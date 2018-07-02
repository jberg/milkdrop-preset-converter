import _ from 'lodash';
import { convertHLSLString } from 'milkdrop-shader-converter';
import optimizeEquations from './optimize';
import { getShaderParts, prepareShader } from '../shared/shaders';
import {
  splitPreset, convertPresetEquations, convertWaveEquations, convertShapeEquations,
  createBasePresetFuns
} from '../shared/preset';

function processShader (shader) {
  if (_.isEmpty(shader)) {
    return '';
  }

  const processedShader = _.replace(shader, 'shader_body', 'xlat_main');
  return processedShader;
}

function isUserSampler (line) {
  if (!_.startsWith(line, 'uniform sampler')) {
    return false;
  }

  const builtinSamplers = [
    'sampler_main',
    'sampler_fw_main',
    'sampler_pw_main',
    'sampler_fc_main',
    'sampler_pc_main',
    'sampler_noise_lq',
    'sampler_noise_lq_lite',
    'sampler_noise_mq',
    'sampler_noise_hq',
    'sampler_pw_noise_lq',
    'sampler_noisevol_lq',
    'sampler_noisevol_hq',
    'sampler_blur1',
    'sampler_blur2',
    'sampler_blur3'
  ];

  const re = /uniform sampler2D sampler_(.+);$/;
  const matches = line.match(re);
  if (matches && matches.length > 1) {
    return !_.includes(builtinSamplers, `sampler_${matches[1]}`);
  }

  return false;
}

function optimizePresetEquations (preset) {
  const presetMap = Object.assign({}, preset);
  /* eslint-disable max-len */
  presetMap.init_eqs_str = presetMap.init_eqs_str ? optimizeEquations(presetMap.init_eqs_str) : '';
  presetMap.frame_eqs_str = presetMap.frame_eqs_str ? optimizeEquations(presetMap.frame_eqs_str) : '';
  presetMap.pixel_eqs_str = presetMap.pixel_eqs_str ? optimizeEquations(presetMap.pixel_eqs_str) : '';

  for (let i = 0; i < presetMap.shapes.length; i++) {
    if (presetMap.shapes[i].baseVals.enabled !== 0) {
      presetMap.shapes[i].init_eqs_str = presetMap.shapes[i].init_eqs_str ? optimizeEquations(presetMap.shapes[i].init_eqs_str) : '';
      presetMap.shapes[i].frame_eqs_str = presetMap.shapes[i].frame_eqs_str ? optimizeEquations(presetMap.shapes[i].frame_eqs_str) : '';
    }
  }

  for (let i = 0; i < presetMap.waves.length; i++) {
    if (presetMap.waves[i].baseVals.enabled !== 0) {
      presetMap.waves[i].init_eqs_str = presetMap.waves[i].init_eqs_str ? optimizeEquations(presetMap.waves[i].init_eqs_str) : '';
      presetMap.waves[i].frame_eqs_str = presetMap.waves[i].frame_eqs_str ? optimizeEquations(presetMap.waves[i].frame_eqs_str) : '';
      presetMap.waves[i].point_eqs_str = presetMap.waves[i].point_eqs_str ? optimizeEquations(presetMap.waves[i].point_eqs_str) : '';
    }
  }
  /* eslint-enable max-len */

  return presetMap;
}

function processConvertedShader (shader) {
  if (_.isEmpty(shader)) {
    return '';
  }

  let processedShader = _.replace(shader, '#version 300 es\n', '');
  processedShader = _.replace(processedShader, 'void main ()', 'shader_body');
  processedShader = _.replace(processedShader, /highp\s*/g, '');
  processedShader = _.replace(processedShader, /medp\s*/g, '');
  processedShader = _.replace(processedShader, /lowp\s*/g, '');
  processedShader = _.replace(processedShader, /xlv_TEXCOORD0/g, 'uv');
  processedShader = _.replace(processedShader,
                              /_glesFragData\[0\] = (.+);\n\}/,
                              (match, varName) => `ret = ${varName}.xyz;\n}`);
  processedShader = _.replace(processedShader, 'out vec4 _glesFragData[4];\n', '');

  const shaderParts = getShaderParts(processedShader);
  let fragShaderHeaderText = shaderParts[0];
  let fragShaderText = shaderParts[1];

  const shaderHeaderLines = _.split(fragShaderHeaderText, '\n');
  const fileredHeaderLines = _.filter(shaderHeaderLines,
                                      (line) => !(_.startsWith(line, 'in') ||
                                                 (_.startsWith(line, 'uniform') &&
                                                  !isUserSampler(line))));
  fragShaderHeaderText = _.join(fileredHeaderLines, '\n');

  let shaderBodyLines = _.split(fragShaderText, ';');
  shaderBodyLines = _.dropWhile(shaderBodyLines, (line) => {
    const trimmedLine = _.trim(line);
    if (_.startsWith(trimmedLine, 'xlat_mutable')) {
      const matches = trimmedLine.match(/xlat_mutable(.+)\s*=\s*(.+)/);
      if (matches && matches.length === 3 && _.trim(matches[1]) === _.trim(matches[2])) {
        return true;
      }
    }
    return false;
  });
  fragShaderText = _.join(shaderBodyLines, ';');

  return `${fragShaderHeaderText} shader_body { ${fragShaderText} }`;
}

export function convertPreset (preset, optimize = true) {
  let mainPresetText = _.split(preset, '[preset00]')[1];
  mainPresetText = _.replace(mainPresetText, /\r\n/g, '\n');
  const presetParts = splitPreset(mainPresetText);
  let presetMap = createBasePresetFuns(presetParts.presetVersion,
                                       presetParts.presetInit,
                                       presetParts.perFrame,
                                       presetParts.perVertex,
                                       presetParts.shapes,
                                       presetParts.waves);
  if (optimize) {
    presetMap = optimizePresetEquations(presetMap);
  }

  const warpShader = processShader(prepareShader(presetParts.warp));
  const compShader = processShader(prepareShader(presetParts.comp));

  let hlslconvWarp;
  if (!_.isEmpty(warpShader)) {
    hlslconvWarp = convertHLSLString(warpShader) || '';
  } else {
    hlslconvWarp = '';
  }

  let hlslconvComp;
  if (!_.isEmpty(compShader)) {
    hlslconvComp = convertHLSLString(compShader) || '';
  } else {
    hlslconvComp = '';
  }

  const presetOutput = Object.assign({ baseVals: presetParts.baseVals }, presetMap, {
    warp: processConvertedShader(hlslconvWarp.toString()),
    comp: processConvertedShader(hlslconvComp.toString()),
  });

  if ((_.isEmpty(presetOutput.warp) && !_.isEmpty(warpShader)) ||
      (_.isEmpty(presetOutput.comp) && !_.isEmpty(compShader))) {
    throw new Error('error translating shaders');
  }

  return presetOutput;
}

export function convertPresetShader (shader) {
  const processedShader = processShader(prepareShader(shader));
  if (!_.isEmpty(processedShader)) {
    return convertHLSLString(processedShader) || '';
  }

  return '';
}

export { convertPresetEquations, convertWaveEquations, convertShapeEquations };
