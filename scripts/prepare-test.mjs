import './env.mjs';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';
// Run from the main service; only non-personal master/settings are copied to test.
if(process.env.ABT_TEST_MODE==='1')throw Error('Jalankan persiapan Mode Uji dari layanan utama.');
const {prepareTestDatabase}=await import('../lib/test-mode.js');
const db=new DatabaseSync(path.join(process.env.ABT_DATA_ROOT||process.cwd(),'data','trial.sqlite'),{readOnly:true});try{prepareTestDatabase(db);}finally{db.close();}
console.log('Database Mode Uji siap; data karyawan dan klaim asli tidak disalin.');
