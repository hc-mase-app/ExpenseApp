import './env.mjs';import fs from 'node:fs';import path from 'node:path';import {arg} from './env.mjs';import {inspectDatabase,compareManifest} from './snapshot.mjs';
const source=path.resolve(arg('source',path.join(process.env.ABT_DATA_ROOT||process.cwd(),process.env.ABT_TEST_MODE==='1'?'data-test':'data','trial.sqlite'))),manifestFile=arg('manifest');
const result=manifestFile?compareManifest(source,JSON.parse(fs.readFileSync(manifestFile,'utf8'))):inspectDatabase(source);
console.log(JSON.stringify({integrity:'ok',comparedWithSnapshot:!!manifestFile,...result.summary},null,2));
