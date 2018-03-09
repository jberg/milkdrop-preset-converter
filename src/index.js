import _ from 'lodash';
import { convertShader } from './shaders';
import { varMap } from './constants';
import mdparser from '../lib/mdparser.min';

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

function getBaseVals (text) {
  const lines = _.split(text, '\n');
  const baseVals = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const splitLine = _.split(line, '=');
    if (splitLine.length > 1) {
      const varName = splitLine[0].toLowerCase();
      const convertedVarName = varMap[varName];
      baseVals[convertedVarName || varName] = parseFloat(splitLine[1]);
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

function getWaveOrShapeBaseVals (text, prefix) {
  const lines = _.filter(_.split(text, '\n'), (line) => _.startsWith(line, prefix));
  const trimmedLines = _.map(lines, (line) => _.replace(line, prefix, ''));
  return getBaseVals(_.join(trimmedLines, '\n'));
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

  const shapes = [];
  for (let i = 0; i < 4; i++) {
    const shapeBaseValsPrefix = `shapecode_${i}_`;
    const shapeInitPrefix = `shape_${i}_init`;
    const shapePerFramePrefix = `shape_${i}_per_frame`;

    shapes.push({
      baseVals: getWaveOrShapeBaseVals(presetText, shapeBaseValsPrefix),
    });
  }

  const waves = [];
  for (let i = 0; i < 4; i++) {
    const waveBaseValsPrefix = `wavecode_${i}_`;
    const waveInitPrefix = `wave_${i}_init`;
    const wavePerFramePrefix = `wave_${i}_per_frame`;
    const wavePerPointPrefix = `wave_${i}_per_point`;

    waves.push({
      baseVals: getWaveOrShapeBaseVals(presetText, waveBaseValsPrefix),
    });
  }

  return {
    baseVals,
    presetInit,
    perFrame,
    perVertex,
    waves,
    shapes,
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
