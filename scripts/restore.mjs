import './env.mjs';import fs from 'node:fs';import path from 'node:path';import {arg} from './env.mjs';import {inspectDatabase,compareManifest,sha} from './snapshot.mjs';
const source=path.resolve(arg('source')),manifestFile=arg('manifest'),root=process.env.ABT_DATA_ROOT;
if(!arg('source')||!root||!path.isAbsolute(root))throw Error('Isi ABT_DATA_ROOT dan --source PATH_DATABASE. Opsional --manifest PATH_MANIFEST.');
const destination=path.join(root,'data','trial.sqlite');if(path.resolve(source)===path.resolve(destination))throw Error('Sumber dan tujuan harus berbeda.');
if(fs.existsSync(destination)||fs.existsSync(destination+'-wal')||fs.existsSync(destination+'-shm'))throw Error('Tujuan sudah berisi database. Pemulihan hanya ke folder/volume baru; data lama tidak ditimpa.');
const manifest=manifestFile?JSON.parse(fs.readFileSync(manifestFile,'utf8')):null;
if(manifest){if(sha(fs.readFileSync(source))!==manifest.databaseSha256)throw Error('Checksum file database tidak sesuai manifest.');compareManifest(source,manifest);}else inspectDatabase(source);
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination,fs.constants.COPYFILE_EXCL);fs.chmodSync(destination,0o600);
if(manifest)compareManifest(destination,manifest);console.log('Database dipulihkan dan diverifikasi. Akun, klaim, lampiran dan nomor tetap mengikuti snapshot.');
