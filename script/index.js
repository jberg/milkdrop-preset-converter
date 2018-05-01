import { spawn } from 'child_process';
import fs from 'fs';
import _ from 'lodash';
import { prepareShader } from '../src/shaders';
import { splitPreset } from '../src/preset';

const args = process.argv.slice(2);

if (args.length < 2) {
  // eslint-disable-next-line no-throw-literal
  throw 'Not enough arguments';
}

const preset = fs.readFileSync(args[1], 'utf8');

const mainPresetText = _.split(preset, '[preset00]')[1];
const presetParts = splitPreset(mainPresetText);
let warpShader = prepareShader(presetParts.comp);

warpShader = _.replace(warpShader, 'shader_body', 'xlat_main');

const hlslconv = spawn(args[0]);
hlslconv.stdout.on('data', (data) => {
  console.log(data.toString());
});
hlslconv.stdin.write(Buffer.from(warpShader));
hlslconv.stdin.end();
