import _ from 'lodash';
import { convertShader } from './shaders';
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
  bass: 'bass',
  mid: 'mid',
  treb: 'treb',
  bass_att: 'bass_att',
  mid_att: 'mid_att',
  treb_att: 'treb_att',
};

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
