import GLSLOptimizer from 'glsl-optimizer-js';

export default function optimizeGLSL () {}

GLSLOptimizer().then((Module) => {
  // eslint-disable-next-line no-func-assign
  optimizeGLSL = Module.cwrap('optimize_glsl', 'string', ['string', 'number', 'number']);
});
