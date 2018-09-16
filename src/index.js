import _ from 'lodash';
import {
  splitPreset,
  prepareShader,
  processUnOptimizedShader,
  createBasePresetFuns
} from 'milkdrop-preset-utils';
import milkdropParser from 'milkdrop-eel-parser';
import { convertHLSLShader } from 'hlslparser-js';

export async function convertShader (shader) {
  if (shader.length === 0) {
    return '';
  }

  const shaderBodyName = 'main_shader_sentinel';
  let fullShader = prepareShader(shader);
  fullShader = fullShader.replace('float4 shader_body (', `float4 ${shaderBodyName} (`);
  let convertedShader = await convertHLSLShader(fullShader, shaderBodyName, 'fs');
  convertedShader = processUnOptimizedShader(convertedShader);

  return convertedShader;
}

export async function convertPreset (text) {
  const mainPresetText = _.split(text, '[preset00]')[1];
  const presetParts = splitPreset(mainPresetText);

  const parsedPreset = milkdropParser.convert_preset_wave_and_shape(presetParts.presetVersion,
                                                                    presetParts.presetInit,
                                                                    presetParts.perFrame,
                                                                    presetParts.perVertex,
                                                                    presetParts.shapes,
                                                                    presetParts.waves);

  const [presetMap, warpShader, compShader] = Promise.all([
    createBasePresetFuns(parsedPreset,
                         presetParts.shapes,
                         presetParts.waves),
    await convertShader(presetParts.warp),
    await convertShader(presetParts.comp)
  ]);

  return _.assign({}, presetMap, {
    baseVals: presetParts.baseVals,
    warp: warpShader,
    comp: compShader,
  });
}
