import _ from 'lodash';
import { prepareShader } from './shaders';
import { splitPreset, createBasePresetFuns } from './preset';
import parseHLSL from './hlslParser';
import optimizeGLSL from './glslOptimizer';

function convertShader (shader) {
  if (shader.length === 0) {
    return '';
  }

  const fullShader = prepareShader(shader);
  let convertedShader = parseHLSL(fullShader, 'shader_body', 'fs');
  convertedShader = _.replace(convertedShader, /#version 100\sprecision highp float;/, '');
  convertedShader = _.join(_.filter(_.split(convertedShader, '\n'), (line) => !_.startsWith(line, '#line')), '\n');
  convertedShader = _.replace(convertedShader, /vec2 uv;\s+uv = frag_TEXCOORD0;/, '');
  convertedShader = _.replace(convertedShader, 'varying vec2 frag_TEXCOORD0;', 'varying vec2 uv;');
  convertedShader = _.replace(convertedShader, 'gl_FragData[0]', 'gl_FragColor');
  convertedShader = _.replace(convertedShader, 'uniform float M_INV_PI_2', 'const float M_INV_PI_2');
  convertedShader = _.replace(convertedShader, 'uniform float M_PI_2', 'const float M_PI_2');
  convertedShader = _.replace(convertedShader, 'uniform float M_PI', 'const float M_PI');

  let optimizedShader = optimizeGLSL(convertedShader, 1, false);
  optimizedShader = _.replace(optimizedShader, /void main \(\)\s*\{/, 'shader_body {');
  optimizedShader = _.replace(optimizedShader, /gl_FragColor = (.+);/, (match, p1) => `ret = ${p1}.xyz;`);

  let shaderLines = _.split(optimizedShader, '\n');
  shaderLines = _.filter(shaderLines, (line) => !_.startsWith(line, 'varying') &&
                                                !_.startsWith(line, 'uniform'));

  return _.join(shaderLines, '\n');
}

// eslint-disable-next-line import/prefer-default-export
export function convertPreset (text) {
  const mainPresetText = _.split(text, '[preset00]')[1];
  const presetParts = splitPreset(mainPresetText);

  const presetMap = createBasePresetFuns(presetParts.presetVersion,
                                         presetParts.presetInit,
                                         presetParts.perFrame,
                                         presetParts.perVertex,
                                         presetParts.shapes,
                                         presetParts.waves);
  const warpShader = convertShader(presetParts.warp);
  const compShader = convertShader(presetParts.comp);

  return _.assign({}, presetMap, {
    baseVals: presetParts.baseVals,
    warp: warpShader,
    comp: compShader,
  });
}
