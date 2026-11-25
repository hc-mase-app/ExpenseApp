import path from 'node:path';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
export const SERVER_MODE=process.env.ABT_DEPLOYMENT==='server';
export const TEST_MODE=process.env.ABT_TEST_MODE==='1';
export const DATA_ROOT=path.resolve(process.env.ABT_DATA_ROOT||process.cwd());
if(SERVER_MODE){
 if(!process.env.ABT_DATA_ROOT||!path.isAbsolute(process.env.ABT_DATA_ROOT))throw Error('ABT_DATA_ROOT wajib berupa folder absolut di luar folder aplikasi.');
 const relative=path.relative(process.cwd(),DATA_ROOT);
 if(!relative||!relative.startsWith('..')&&!path.isAbsolute(relative))throw Error('Folder data server harus berada di luar folder aplikasi.');
 if(!process.env.ABT_INSTANCE_ID)throw Error('Isi ABT_INSTANCE_ID yang sama untuk aplikasi utama dan Mode Uji.');
}
export const DATA_DIR=path.join(DATA_ROOT,TEST_MODE?'data-test':'data');
export const DB_PATH=path.join(DATA_DIR,'trial.sqlite');
if(SERVER_MODE&&!existsSync(DB_PATH))throw Error('Database belum dipulihkan. Jalankan scripts/restore.mjs sebelum menyalakan server.');
export const SESSION_COOKIE=TEST_MODE?'abt_test_session':'abt_session';
export const COOKIE_SECURE=SERVER_MODE?process.env.ABT_COOKIE_SECURE!=='0':process.env.ABT_COOKIE_SECURE==='1';
export const MAIN_PUBLIC_URL=process.env.ABT_PUBLIC_URL||'http://127.0.0.1:3100/';
export const TEST_PUBLIC_URL=process.env.ABT_TEST_PUBLIC_URL||'http://127.0.0.1:3101/';
export const TEST_INTERNAL_URL=process.env.ABT_TEST_INTERNAL_URL||'http://127.0.0.1:3101/';
export const TEST_MODE_ENABLED=SERVER_MODE?process.env.ABT_ENABLE_TEST_MODE==='1':process.env.ABT_ENABLE_TEST_MODE!=='0';
export const MANAGED_TEST=SERVER_MODE||process.env.ABT_TEST_MANAGED==='1';
const publicUrl=value=>{const url=new URL(value);if(url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('Gunakan root hostname tanpa subfolder atau kredensial.');return url;};
if(SERVER_MODE){
 const url=publicUrl(MAIN_PUBLIC_URL),localHttp=process.env.ABT_ALLOW_HTTP==='1'&&url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(url.protocol!=='https:'&&!localHttp)throw Error('ABT_PUBLIC_URL server wajib HTTPS. HTTP hanya untuk validasi loopback lokal.');
 if(!COOKIE_SECURE&&!localHttp)throw Error('Cookie Secure wajib aktif untuk server HTTPS.');
 if(TEST_MODE_ENABLED){const test=publicUrl(TEST_PUBLIC_URL);if(test.protocol!=='https:'&&!localHttp)throw Error('ABT_TEST_PUBLIC_URL wajib HTTPS.');if(test.origin===url.origin)throw Error('Mode Uji memerlukan hostname terpisah.');}
}
export const APP_ID=createHash('sha256').update(process.env.ABT_INSTANCE_ID||path.resolve(process.cwd()).toLowerCase()).digest('hex').slice(0,24);
export const cookieHeader=token=>`${SESSION_COOKIE}=${token||''}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token?43200:0}${COOKIE_SECURE?'; Secure':''}`;
