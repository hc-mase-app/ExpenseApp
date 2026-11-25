import './env.mjs';import fs from 'node:fs';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import {arg} from './env.mjs';
const store=await import('../lib/store.js'),file=path.join(process.env.ABT_DATA_ROOT||process.cwd(),'data','trial.sqlite'),db=new DatabaseSync(file,{readOnly:true});
const ids=db.prepare('SELECT id FROM employees ORDER BY id').all().map(r=>r.id),year=Number(store.today().slice(0,4));
const balances=Object.fromEntries(ids.map(id=>[id,Object.fromEntries([year-1,year].map(y=>[y,Object.fromEntries(['outpatient','optics'].map(c=>[c,store.balance(id,c,y)]))]))]));
const result={asOf:store.today(),employees:ids.length,balances},baseline=arg('baseline'),output=arg('output');
if(baseline){const b=JSON.parse(fs.readFileSync(baseline,'utf8'));if(b.asOf!==result.asOf)throw Error('Tanggal rekonsiliasi berbeda. Tinjau perubahan kelayakan/masa kerja sejak '+b.asOf+'; jangan menyatakan saldo identik tanpa pemeriksaan HR.');if(JSON.stringify(result.balances)!==JSON.stringify(b.balances)||result.employees!==b.employees)throw Error('Plafon/pemakaian/saldo tidak sama dengan baseline.');console.log('Saldo, plafon dan pemakaian '+ids.length+' karyawan cocok pada '+result.asOf+'.');}
if(output){fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log('Rekonsiliasi disimpan: '+ids.length+' karyawan.');}
if(!baseline&&!output)throw Error('Gunakan --output FILE_JSON atau --baseline FILE_JSON.');db.close();
