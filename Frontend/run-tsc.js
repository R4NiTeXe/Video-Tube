const { spawn } = require('child_process');
const fs = require('fs');

const tsc = spawn('node', ['node_modules/typescript/bin/tsc', '--noEmit'], { stdio: 'pipe' });

let output = '';

tsc.stdout.on('data', (data) => {
  output += data.toString();
});

tsc.stderr.on('data', (data) => {
  output += data.toString();
});

tsc.on('close', (code) => {
  fs.writeFileSync('tsc-output.txt', `Exit code: ${code}\n${output}`);
  console.log('Done writing tsc-output.txt');
});
