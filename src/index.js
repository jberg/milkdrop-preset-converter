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

export function convertPresetEquations (presetVersion, initEQs, frameEQs, pixelEQs) {
  const parsedPreset = milkdropParser.convert_basic_preset(presetVersion, initEQs, frameEQs, pixelEQs);
  return {
    init_eqs_str: parsedPreset.perFrameInitEQs ? parsedPreset.perFrameInitEQs.trim() : '',
    frame_eqs_str: parsedPreset.perFrameEQs ? parsedPreset.perFrameEQs.trim() : '',
    pixel_eqs_str: parsedPreset.perPixelEQs ? parsedPreset.perPixelEQs.trim() : ''
  };
}

export function convertWaveEquations (presetVersion, initEQs, frameEQs, pointEQs) {
  const parsedPreset = milkdropParser.make_wave_map(presetVersion, {
    init_eqs_str: initEQs,
    frame_eqs_str: frameEQs,
    point_eqs_str: pointEQs
  });
  return {
    init_eqs_str: parsedPreset.perFrameInitEQs ? parsedPreset.perFrameInitEQs.trim() : '',
    frame_eqs_str: parsedPreset.perFrameEQs ? parsedPreset.perFrameEQs.trim() : '',
    point_eqs_str: parsedPreset.perPointEQs ? parsedPreset.perPointEQs.trim() : ''
  };
}

export function convertShapeEquations (presetVersion, initEQs, frameEQs) {
  const parsedPreset = milkdropParser.make_shape_map(presetVersion, {
    init_eqs_str: initEQs,
    frame_eqs_str: frameEQs
  });
  return {
    init_eqs_str: parsedPreset.perFrameInitEQs ? parsedPreset.perFrameInitEQs.trim() : '',
    frame_eqs_str: parsedPreset.perFrameEQs ? parsedPreset.perFrameEQs.trim() : ''
  };
}
