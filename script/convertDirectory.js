const fork = require('child_process').fork;
const fs = require('fs');

const args = process.argv.slice(2);

function convertPreset (item) {
  return new Promise((resolve, reject) => {
    const cp = fork(args[0], [args[1], `${args[2]}/${item}`, args[3]]);
    cp.on('error', reject)
      .on('close', (code) => (code === 0) ? resolve() : reject());
  });
}

fs.readdir(args[2], async (err, items) => {
  for (var i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.endsWith('.milk')) {
      console.log('converting %O', item);
      console.log('converting %O: %O', i, item);
      await convertPreset(item);
    }
  }
});