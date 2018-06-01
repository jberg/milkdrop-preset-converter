const fork = require('child_process').fork;
const fs = require('fs');
const rxjs = require('../lib/rxjs.umd.min');
const { from } = rxjs;
const { filter, mergeMap } = rxjs.operators;

const args = process.argv.slice(2);

function convertPreset (item) {
  return new Promise((resolve, reject) => {
    const cp = fork(args[0], [args[1], `${args[2]}/${item}`, args[3]]);
    cp.on('error', reject)
      .on('close', (code) => (code === 0) ? resolve() : reject());
  });
}

fs.readdir(args[2], (err, items) => {
  from(items)
    .pipe(
      filter((item) => item.endsWith('.milk')),
      mergeMap(
        async (item) => {
          try {
            await convertPreset(item);
          } catch (e) {
            console.log('err %O: %O', item, e);
          }
        },
        (item) => item,
        7
      ))
    .subscribe((item) => console.log('finished: %O', item));
});
