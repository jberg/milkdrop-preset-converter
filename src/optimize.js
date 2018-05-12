import _ from 'lodash';
import { compile } from 'google-closure-compiler-js';

const externs = `
  function pow(x,y){};
  function div(x,y){};
  function mod(x,y){};
  function rand(x){};
  function bnot(x){};
`;

function makeEqsString (eqsStr) {
  return `
    function sqr(x) {
      return x * x;
    }

    function sqrt(x) {
      return Math.sqrt(Math.abs(x));
    }

    function log10(val) {
      return Math.log(val) * Math.LOG10E;
    }

    function sign(x) {
      return x > 0 ? 1 : x < 0 ? -1 : 0;
    }

    function bitor(x, y) {
      return Math.floor(x) | Math.floor(y);
    }

    function bitand(x, y) {
      return Math.floor(x) & Math.floor(y);
    }

    function sigmoid(x, y) {
      var t = 1 + Math.exp(-x * y);
      return Math.abs(t) > 0.00001 ? 1.0 / t : 0;
    }

    function bor(x, y) {
      return x != 0 || y != 0 ? 1 : 0;
    }

    function band(x, y) {
      return x != 0 && y != 0 ? 1 : 0;
    }

    function equal(x, y) {
      return Math.abs(x - y) < 0.00001 ? 1 : 0;
    }

    function above(x, y) {
      return x > y ? 1 : 0;
    }

    function below(x, y) {
      return x < y ? 1 : 0;
    }

    function ifcond(x, y, z) {
      return x != 0 ? y : z;
    }

    function run(a) {
      ${eqsStr}

      return a;
    }

    window['run'] = run;`;
}

export default function optimizeEquations (eqsStr) {
  if (!_.isEmpty(eqsStr)) {
    const closureOutput = compile({
      jsCode: [{ src: makeEqsString(eqsStr) }],
      externs: [{ src: externs }],
      compilationLevel: 'ADVANCED',
    });

    const outputSrc = closureOutput.compiledCode;

    if (!_.isEmpty(outputSrc) &&
        _.startsWith(outputSrc, 'window.run=function(a){') &&
        _.endsWith(outputSrc, 'return a};')) {
      return outputSrc.substring(23, outputSrc.length - 10);
    }
  }

  return eqsStr;
}
