import './env.mjs';import path from 'node:path';import {arg} from './env.mjs';import {captureSnapshot} from './snapshot.mjs';
const source=arg('source',path.join(process.env.ABT_DATA_ROOT||process.cwd(),'data','trial.sqlite')),output=arg('output');
if(!output)throw Error('Gunakan --output FOLDER_BARU. Opsional --source PATH_DATABASE.');
const manifest=await captureSnapshot(path.resolve(source),output);console.log(JSON.stringify({capturedAtWIB:manifest.capturedAtWIB,...manifest.summary},null,2));
