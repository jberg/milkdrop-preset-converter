import _ from 'lodash';
import { varMap } from './constants';
import mdparser from '../lib/md-parser.min';

function getLinesWithPrefix (lines, prefix) {
  const regex = new RegExp(`${prefix}_\\d+=\`*`);
  const filteredLines = _.filter(lines, (line) => regex.test(line));
  return _.join(_.map(filteredLines, (line) => _.last(_.split(line, regex))), '\n');
}

function getWarpShader (lines) {
  return getLinesWithPrefix(lines, 'warp');
}

function getCompShader (lines) {
  return getLinesWithPrefix(lines, 'comp');
}

function getPresetInit (lines) {
  return getLinesWithPrefix(lines, 'per_frame_init');
}

function getPerFrame (lines) {
  return getLinesWithPrefix(lines, 'per_frame');
}

function getPerVetex (lines) {
  return getLinesWithPrefix(lines, 'per_pixel');
}

function getBaseVals (lines) {
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

function getWaveOrShapeEQs (lines, prefix) {
  const regex = new RegExp(`${prefix}\\d+=`);
  const filteredLines = _.filter(lines, (line) => regex.test(line));
  return _.join(_.map(filteredLines, (line) => _.last(_.split(line, regex))), '\n');
}

function getWaveOrShapeBaseVals (lines, prefix) {
  const filteredLines = _.filter(lines, (line) => _.startsWith(line, prefix));
  const trimmedLines = _.map(filteredLines, (line) => _.replace(line, prefix, ''));
  return getBaseVals(trimmedLines);
}

// eslint-disable-next-line import/prefer-default-export
export function splitPreset (text) {
  const presetParts = splitOutBaseVals(text);
  const baseValLines = _.split(presetParts[0], '\n');
  const presetLines = _.split(presetParts[1], '\n');

  const baseVals = getBaseVals(baseValLines);
  const warp = getWarpShader(presetLines);
  const comp = getCompShader(presetLines);
  const presetInit = getPresetInit(presetLines);
  const perFrame = getPerFrame(presetLines);
  const perVertex = getPerVetex(presetLines);

  const shapes = [];
  for (let i = 0; i < 4; i++) {
    const shapeBaseValsPrefix = `shapecode_${i}_`;
    const shapeInitPrefix = `shape_${i}_init`;
    const shapePerFramePrefix = `shape_${i}_per_frame`;

    shapes.push({
      baseVals: getWaveOrShapeBaseVals(presetLines, shapeBaseValsPrefix),
      init_eqs_str: getWaveOrShapeEQs(presetLines, shapeInitPrefix),
      frame_eqs_str: getWaveOrShapeEQs(presetLines, shapePerFramePrefix),
    });
  }

  const waves = [];
  for (let i = 0; i < 4; i++) {
    const waveBaseValsPrefix = `wavecode_${i}_`;
    const waveInitPrefix = `wave_${i}_init`;
    const wavePerFramePrefix = `wave_${i}_per_frame`;
    const wavePerPointPrefix = `wave_${i}_per_point`;

    waves.push({
      baseVals: getWaveOrShapeBaseVals(presetLines, waveBaseValsPrefix),
      init_eqs_str: getWaveOrShapeEQs(presetLines, waveInitPrefix),
      frame_eqs_str: getWaveOrShapeEQs(presetLines, wavePerFramePrefix),
      point_eqs_str: getWaveOrShapeEQs(presetLines, wavePerPointPrefix),
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

export function createBasePresetFuns (presetInit, perFrame, perVertex, shapes, waves) {
  const parsedPreset = mdparser.convert_preset_wave_and_shape(presetInit, perFrame, perVertex, shapes, waves);

  const parsedInitEQs = parsedPreset.perFrameInitEQs ? parsedPreset.perFrameInitEQs.trim() : '';
  const parsedFrameEQs = parsedPreset.perFrameEQs ? parsedPreset.perFrameEQs.trim() : '';
  const parsedPixelEQs = parsedPreset.perPixelEQs ? parsedPreset.perPixelEQs.trim() : '';

  /* eslint-disable no-new-func, max-len */
  const presetMap = { shapes: [], waves: [] };
  presetMap.init_eqs_str = parsedInitEQs;
  presetMap.frame_eqs_str = parsedFrameEQs;
  presetMap.pixel_eqs_str = parsedPixelEQs;
  presetMap.init_eqs = new Function('m', `${parsedInitEQs} \n\t\treturn m;`);
  presetMap.frame_eqs = new Function('m', `${parsedFrameEQs} \n\t\treturn m;`);
  if (parsedPixelEQs === '') {
    presetMap.pixel_eqs = '';
  } else {
    presetMap.pixel_eqs = new Function('m', `${parsedPixelEQs} \n\t\treturn m;`);
  }

  for (let i = 0; i < parsedPreset.shapes.length; i++) {
    const shapeInitEqs = parsedPreset.shapes[i].perFrameInitEQs ? parsedPreset.shapes[i].perFrameInitEQs.trim() : '';
    const shapeFrameEqs = parsedPreset.shapes[i].perFrameEQs ? parsedPreset.shapes[i].perFrameEQs.trim() : '';
    presetMap.shapes.push(_.assign({}, shapes[i], {
      init_eqs_str: shapeInitEqs,
      frame_eqs_str: shapeFrameEqs,
      init_eqs: new Function('m', `${shapeInitEqs} \n\t\treturn m;`),
      frame_eqs: new Function('m', `${shapeFrameEqs} \n\t\treturn m;`),
    }));
  }

  for (let i = 0; i < parsedPreset.waves.length; i++) {
    const waveInitEqs = parsedPreset.waves[i].perFrameInitEQs ? parsedPreset.waves[i].perFrameInitEQs.trim() : '';
    const waveFrameEqs = parsedPreset.waves[i].perFrameEQs ? parsedPreset.waves[i].perFrameEQs.trim() : '';
    const wavePointEqs = parsedPreset.waves[i].perPointEQs ? parsedPreset.waves[i].perPointEQs.trim() : '';
    presetMap.waves.push(_.assign({}, waves[i], {
      init_eqs_str: waveInitEqs,
      frame_eqs_str: waveFrameEqs,
      point_eqs_str: wavePointEqs,
      init_eqs: new Function('m', `${waveInitEqs} \n\t\treturn m;`),
      frame_eqs: new Function('m', `${waveFrameEqs} \n\t\treturn m;`),
      point_eqs: new Function('m', `${wavePointEqs} \n\t\treturn m;`),
    }));
  }
  /* eslint-enable no-new-func */

  return presetMap;
}