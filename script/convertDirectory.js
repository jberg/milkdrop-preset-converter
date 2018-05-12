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
  const par = 8;
  const iter = Math.ceil(items.length / par);
  for (var i = 0; i < iter; i++) {
    const start = i * par;
    const end = Math.min((i + 1) * par, items.length);
    const procs = [];
    for (var j = start; j < end; j ++) {
      const item = items[j];
      if (item.endsWith('.milk')) {
        console.log('converting %O: %O', j, item);
        try {
          procs.push(convertPreset(item));
        } catch (e) {
          console.log('err %O: %O', j, e);
        }
      }
    }

    try {
      await Promise.all(procs);
    } catch (e) {
      console.log('err: %O', e);
    }
  }
});
