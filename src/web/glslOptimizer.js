import GLSLOptimizerModule from '../../lib/glsl-optimizer';

export default function optimizeGLSL () {}

let Module;
function postRun () {
  // eslint-disable-next-line no-func-assign
  optimizeGLSL = Module.cwrap('optimize_glsl', 'string', ['string', 'number', 'number']);
}

Module = GLSLOptimizerModule({
  postRun: [postRun]
});
