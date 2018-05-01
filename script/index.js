import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import spawnPromiseWithInput from './spawnPromise';
import { prepareShader } from '../src/shaders';
import { splitPreset, createBasePresetFuns } from '../src/preset';

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

let warpShader = prepareShader(presetParts.warp);
warpShader = _.replace(warpShader, 'shader_body', 'xlat_main');

let compShader = prepareShader(presetParts.comp);
compShader = _.replace(compShader, 'shader_body', 'xlat_main');

const hlslconvWarp = spawnPromiseWithInput(warpShader, args[0]);
const hlslconvComp = spawnPromiseWithInput(compShader, args[0]);

Promise.all([hlslconvWarp, hlslconvComp])
.then((shaders) => {
  const presetOutput = _.assign({}, presetMap, {
    baseVals: presetParts.baseVals,
    warp: shaders[0].toString(),
    comp: shaders[1].toString(),
  });
  fs.writeFileSync(`${args[2]}/${presetOutputName}`, JSON.stringify(presetOutput));
})
.catch((err) => {
  console.error('[spawn] stderr: ', err.stderr);
});
