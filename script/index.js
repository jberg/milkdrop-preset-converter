import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import spawnPromiseWithInput from './spawnPromise';
import { prepareShader } from '../src/shaders';
import { splitPreset, createBasePresetFuns } from '../src/preset';

function processShader (shader) {
  if (_.isEmpty(shader)) {
    return '';
  }

  let processedShader = _.replace(shader, 'shader_body', 'xlat_main');
  return processedShader;
}

function processConvertedShader (shader) {
  if (_.isEmpty(shader)) {
    return '';
  }

  let processedShader = _.replace(shader, '#version 300 es\n', '');
  processedShader = _.replace(processedShader, 'void main ()', 'shader_body');
  processedShader = _.replace(processedShader, /xlv_TEXCOORD0/g, 'uv');
  processedShader = _.replace(processedShader, '_glesFragData[0]', 'ret');
  processedShader = _.replace(processedShader, 'out lowp vec4 _glesFragData[4];\n', '');
  processedShader = _.replace(processedShader, /highp\s*/g, '');
  processedShader = _.replace(processedShader, /medp\s*/g, '');
  processedShader = _.replace(processedShader, /lowp\s*/g, '');
  processedShader = _.join(_.filter(_.split(processedShader, '\n'), (line) => {
    return !(_.startsWith(line, 'in') || _.startsWith(line, 'uniform'));
  }), '\n');
  return processedShader;
}

const args = process.argv.slice(2);

if (args.length < 3) {
  // eslint-disable-next-line no-throw-literal
  throw 'Not enough arguments (HLSLConverter, path to preset, path to output foler)';
}

const preset = fs.readFileSync(args[1], 'utf8');
const presetName = path.basename(args[1]);
const presetOutputName = _.replace(presetName, '.milk', '.json');

const mainPresetText = _.split(preset, '[preset00]')[1];
const presetParts = splitPreset(mainPresetText);
const presetMap = createBasePresetFuns(presetParts.presetInit,
                                       presetParts.perFrame,
                                       presetParts.perVertex,
                                       presetParts.shapes,
                                       presetParts.waves);

const warpShader = processShader(prepareShader(presetParts.warp));
const compShader = processShader(prepareShader(presetParts.comp));
const hlslconvWarp = spawnPromiseWithInput(warpShader, args[0]);
const hlslconvComp = spawnPromiseWithInput(compShader, args[0]);

Promise.all([hlslconvWarp, hlslconvComp])
.then((shaders) => {
  const presetOutput = _.assign({ baseVals: presetParts.baseVals }, presetMap, {
    warp: processConvertedShader(shaders[0].toString()),
    comp: processConvertedShader(shaders[1].toString()),
  });

  fs.writeFileSync(`${args[2]}/${presetOutputName}`, JSON.stringify(presetOutput));
})
.catch((err) => {
  console.error('[spawn] stderr: ', err.stderr);
});
