import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import spawnPromiseWithInput from './spawnPromise';
import { getShaderParts, prepareShader } from '../src/shaders';
import { splitPreset, createBasePresetFuns } from '../src/preset';

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

const args = process.argv.slice(2);

if (args.length < 3) {
  // eslint-disable-next-line no-throw-literal
  throw 'Not enough arguments (HLSLConverter, path to preset, path to output foler)';
}

const preset = fs.readFileSync(args[1], 'utf8');
const presetName = path.basename(args[1]);
const presetOutputName = _.replace(presetName, '.milk', '.json');

let mainPresetText = _.split(preset, '[preset00]')[1];
mainPresetText = _.replace(mainPresetText, /\r\n/g, '\n');
const presetParts = splitPreset(mainPresetText);
const presetMap = createBasePresetFuns(presetParts.presetVersion,
                                       presetParts.presetInit,
                                       presetParts.perFrame,
                                       presetParts.perVertex,
                                       presetParts.shapes,
                                       presetParts.waves);

const warpShader = processShader(prepareShader(presetParts.warp));
const compShader = processShader(prepareShader(presetParts.comp));

let hlslconvWarp;
if (!_.isEmpty(warpShader)) {
  hlslconvWarp = spawnPromiseWithInput(warpShader, args[0]);
} else {
  hlslconvWarp = Promise.resolve('');
}

let hlslconvComp;
if (!_.isEmpty(compShader)) {
  hlslconvComp = spawnPromiseWithInput(compShader, args[0]);
} else {
  hlslconvComp = Promise.resolve('');
}

Promise.all([hlslconvWarp, hlslconvComp])
.then((shaders) => {
  const presetOutput = _.assign({ baseVals: presetParts.baseVals }, presetMap, {
    warp: processConvertedShader(shaders[0].toString()),
    comp: processConvertedShader(shaders[1].toString()),
  });

  if ((_.isEmpty(presetOutput.warp) && !_.isEmpty(warpShader)) ||
      (_.isEmpty(presetOutput.comp) && !_.isEmpty(compShader))) {
    throw new Error('error translating shaders');
  }

  fs.writeFileSync(`${args[2]}/${presetOutputName}`, JSON.stringify(presetOutput));
})
.catch((err) => {
  console.error('[spawn] stderr: %O', err);
});
