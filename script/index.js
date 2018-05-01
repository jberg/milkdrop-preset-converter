import { spawn } from 'child-process-promise';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';
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

const hlslconvWarp = spawn(args[0], [], { capture: ['stdout', 'stderr'] });
hlslconvWarp.childProcess.stdin.write(Buffer.from(warpShader));
hlslconvWarp.childProcess.stdin.end();

const hlslconvComp = spawn(args[0], [], { capture: ['stdout', 'stderr'] });
hlslconvComp.childProcess.stdin.write(Buffer.from(compShader));
hlslconvComp.childProcess.stdin.end();

Promise.all([hlslconvWarp, hlslconvComp])
.then((shaders) => {
  const presetOutput = _.assign({}, presetMap, {
    baseVals: presetParts.baseVals,
    warp: shaders[0].stdout.toString(),
    comp: shaders[1].stdout.toString(),
  });
  fs.writeFileSync(`${args[2]}/${presetOutputName}`, JSON.stringify(presetOutput));
})
.catch((err) => {
  console.error('[spawn] stderr: ', err.stderr);
});
