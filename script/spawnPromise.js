// From https://gist.github.com/Stuk/6226938
import { spawn } from 'child_process';

export default function spawnPromiseWithInput (input, ...args) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const cp = spawn(...args);
    cp.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    cp.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    cp.on('error', reject)
      .on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(stderr);
        }
      });

    cp.stdin.write(Buffer.from(input));
    cp.stdin.end();
  });
}
