import _ from 'lodash';
import mdparser from 'milkdrop-eel-parser';
import { varMap } from './constants';

const baseValsDefaults = {
  decay: 0.98,
  gammaadj: 2,
  echo_zoom: 2,
  echo_alpha: 0,
  echo_orient: 0,
  red_blue: 0,
  brighten: 0,
  darken: 0,
  wrap: 1,
  darken_center: 0,
  solarize: 0,
  invert: 0,
  fshader: 0,
  b1n: 0,
  b2n: 0,
  b3n: 0,
  b1x: 1,
  b2x: 1,
  b3x: 1,
  b1ed: 0.25,
  wave_mode: 0,
  additivewave: 0,
  wave_dots: 0,
  wave_thick: 0,
  wave_a: 0.8,
  wave_scale: 1,
  wave_smoothing: 0.75,
  wave_mystery: 0,
  modwavealphabyvolume: 0,
  modwavealphastart: 0.75,
  modwavealphaend: 0.95,
  wave_r: 1,
  wave_g: 1,
  wave_b: 1,
  wave_x: 0.5,
  wave_y: 0.5,
  wave_brighten: 1,
  mv_x: 12,
  mv_y: 9,
  mv_dx: 0,
  mv_dy: 0,
  mv_l: 0.9,
  mv_r: 1,
  mv_g: 1,
  mv_b: 1,
  mv_a: 1,
  warpanimspeed: 1,
  warpscale: 1,
  zoomexp: 1,
  zoom: 1,
  rot: 0,
  cx: 0.5,
  cy: 0.5,
  dx: 0,
  dy: 0,
  warp: 1,
  sx: 1,
  sy: 1,
  ob_size: 0.01,
  ob_r: 0,
  ob_g: 0,
  ob_b: 0,
  ob_a: 0,
  ib_size: 0.01,
  ib_r: 0.25,
  ib_g: 0.25,
  ib_b: 0.25,
  ib_a: 0,
};

const shapeBaseValsDefaults = {
  enabled: 0,
  sides: 4,
  additive: 0,
  thickoutline: 0,
  textured: 0,
  num_inst: 1,
  tex_zoom: 1,
  tex_ang: 0,
  x: 0.5,
  y: 0.5,
  rad: 0.1,
  ang: 0,
  r: 1,
  g: 0,
  b: 0,
  a: 1,
  r2: 0,
  g2: 1,
  b2: 0,
  a2: 0,
  border_r: 1,
  border_g: 1,
  border_b: 1,
  border_a: 0.1,
};

const waveBaseValsDefaults = {
  enabled: 0,
  samples: 512,
  sep: 0,
  scaling: 1,
  smoothing: 0.5,
  r: 1,
  g: 1,
  b: 1,
  a: 1,
  spectrum: 0,
  usedots: 0,
  thick: 0,
  additive: 0,
};

function removeBaseValDefaults (baseVals, defaultVals) {
  const baseValsNonDefault = {};
  _.forEach(baseVals, (v, k) => {
    if (v !== defaultVals[k]) {
      baseValsNonDefault[k] = v;
    }
  });
  baseValsNonDefault.enabled = baseVals.enabled;

  return baseValsNonDefault;
}

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

function getVersion (text) {
  return _.includes(text, 'MILKDROP_PRESET_VERSION=201') ? 2 : 1;
}

// eslint-disable-next-line import/prefer-default-export
export function splitPreset (text) {
  const presetVersion = getVersion(text);
  const presetParts = splitOutBaseVals(text);
  const baseValLines = _.split(presetParts[0], '\n');
  const presetLines = _.split(presetParts[1], '\n');

  const baseVals = removeBaseValDefaults(getBaseVals(baseValLines), baseValsDefaults);
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

    let shapeBaseVals = getWaveOrShapeBaseVals(presetLines, shapeBaseValsPrefix);
    shapeBaseVals = removeBaseValDefaults(shapeBaseVals, shapeBaseValsDefaults);

    if (shapeBaseVals.enabled) {
      shapes.push({
        baseVals: shapeBaseVals,
        init_eqs_str: getWaveOrShapeEQs(presetLines, shapeInitPrefix),
        frame_eqs_str: getWaveOrShapeEQs(presetLines, shapePerFramePrefix),
      });
    } else {
      shapes.push({ baseVals: { enabled: 0 } });
    }
  }

  const waves = [];
  for (let i = 0; i < 4; i++) {
    const waveBaseValsPrefix = `wavecode_${i}_`;
    const waveInitPrefix = `wave_${i}_init`;
    const wavePerFramePrefix = `wave_${i}_per_frame`;
    const wavePerPointPrefix = `wave_${i}_per_point`;

    let waveBaseVals = getWaveOrShapeBaseVals(presetLines, waveBaseValsPrefix);
    waveBaseVals = removeBaseValDefaults(waveBaseVals, waveBaseValsDefaults);

    if (waveBaseVals.enabled !== 0) {
      waves.push({
        baseVals: waveBaseVals,
        init_eqs_str: getWaveOrShapeEQs(presetLines, waveInitPrefix),
        frame_eqs_str: getWaveOrShapeEQs(presetLines, wavePerFramePrefix),
        point_eqs_str: getWaveOrShapeEQs(presetLines, wavePerPointPrefix),
      });
    } else {
      waves.push({ baseVals: { enabled: 0 } });
    }
  }

  return {
    presetVersion,
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

export function createBasePresetFuns (presetVersion, presetInit, perFrame, perVertex, shapes, waves) {
  const parsedPreset = mdparser.convert_preset_wave_and_shape(presetVersion, presetInit, perFrame,
                                                              perVertex, shapes, waves);

  const parsedInitEQs = parsedPreset.perFrameInitEQs ? parsedPreset.perFrameInitEQs.trim() : '';
  const parsedFrameEQs = parsedPreset.perFrameEQs ? parsedPreset.perFrameEQs.trim() : '';
  const parsedPixelEQs = parsedPreset.perPixelEQs ? parsedPreset.perPixelEQs.trim() : '';

  const presetMap = { shapes: [], waves: [] };
  presetMap.init_eqs_str = parsedInitEQs;
  presetMap.frame_eqs_str = parsedFrameEQs;
  presetMap.pixel_eqs_str = parsedPixelEQs;

  for (let i = 0; i < parsedPreset.shapes.length; i++) {
    if (shapes[i].baseVals.enabled !== 0) {
      presetMap.shapes.push(_.assign({}, shapes[i], {
        init_eqs_str: parsedPreset.shapes[i].perFrameInitEQs,
        frame_eqs_str: parsedPreset.shapes[i].perFrameEQs,
      }));
    } else {
      presetMap.shapes.push(shapes[i]);
    }
  }

  for (let i = 0; i < parsedPreset.waves.length; i++) {
    if (waves[i].baseVals.enabled !== 0) {
      presetMap.waves.push(_.assign({}, waves[i], {
        init_eqs_str: parsedPreset.waves[i].perFrameInitEQs,
        frame_eqs_str: parsedPreset.waves[i].perFrameEQs,
        point_eqs_str: parsedPreset.waves[i].perPointEQs,
      }));
    } else {
      presetMap.waves.push(waves[i]);
    }
  }

  return presetMap;
}
