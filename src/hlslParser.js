import HLSLParserModule from '../lib/hlslparser';

export default function parseHLSL () {}

let Module;
function postRun () {
  // eslint-disable-next-line no-func-assign
  parseHLSL = Module.cwrap('parseHLSL', 'string', ['string', 'string', 'string']);
}

Module = HLSLParserModule({
  postRun: [postRun]
});
