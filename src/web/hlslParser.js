import HLSLParser from 'hlslparser-js';

export default function parseHLSL () {}

HLSLParser().then((Module) => {
  // eslint-disable-next-line no-func-assign
  parseHLSL = Module.cwrap('parseHLSL', 'string', ['string', 'string', 'string']);
});
