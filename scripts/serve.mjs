import './env.mjs';import {spawn} from 'node:child_process';import {inspectDatabase} from './snapshot.mjs';
const major=Number(process.versions.node.split('.')[0]);if(major!==24)throw Error('Gunakan Node.js 24 LTS; paket ini diuji dengan 24.22.3.');
process.env.ABT_DEPLOYMENT||='server';process.env.NEXT_TELEMETRY_DISABLED='1';
const runtime=await import('../lib/runtime-mode.js');const data=inspectDatabase(runtime.DB_PATH);if(!data.summary.employees||!data.summary.users)throw Error('Database kosong. Jalankan customer:init untuk instalasi baru atau pulihkan snapshot pelanggan yang sesuai.');
const port=String(process.env.PORT|| (runtime.TEST_MODE?'3101':'3100')),host=process.env.ABT_BIND_HOST||'127.0.0.1';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H',host,'-p',port],{cwd:process.cwd(),env:process.env,stdio:'inherit',windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('error',e=>{console.error(e.message);process.exitCode=1;});child.on('exit',code=>process.exit(code??1));
