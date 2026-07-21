import { readFileSync } from 'fs';
const schemas = await import('./src/validators/schemas.js');
const refs = readFileSync('route_refs.txt', 'utf8').split('\n').filter(Boolean);
let missing = [];
for (const ref of refs) {
  const [file, path] = ref.split(': ');
  const parts = path.split('.');
  let obj = schemas;
  for (const p of parts) {
    if (obj && typeof obj === 'object' && p in obj) obj = obj[p];
    else { missing.push(ref); break; }
  }
}
if (missing.length === 0) console.log('ALL ' + refs.length + ' SCHEMA REFERENCES RESOLVE OK');
else { console.log('MISSING:'); missing.forEach((m) => console.log('  ' + m)); }
