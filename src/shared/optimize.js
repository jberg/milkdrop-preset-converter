import _ from 'lodash';
import { compile } from 'google-closure-compiler-js';

const externs = `
  function rand(x){};
  function randint(x){};
  function sqr(x){};
  function sqrt(x){};
  function log10(x){};
  function bnot(x){};
  function sign(x){};
  function pow(x,y){};
  function div(x,y){};
  function mod(x,y){};
  function bitor(x,y){};
  function bitand(x,y){};
  function sigmoid(x,y){};
  function bor(x,y){};
  function band(x,y){};
  function equal(x,y){};
  function above(x,y){};
  function below(x,y){};
  function ifcond(x,y,z){};
`;

function makeEqsString (eqsStr) {
  return `
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

    console.log('failed to properly compile:');
    console.log(eqsStr);
    console.log(closureOutput);
  }

  return eqsStr;
}
