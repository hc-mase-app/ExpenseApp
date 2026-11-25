import fs from 'node:fs';
if(fs.existsSync('.env'))process.loadEnvFile('.env');
export function arg(name,fallback=''){const i=process.argv.indexOf('--'+name);return i>=0?process.argv[i+1]:fallback;}
