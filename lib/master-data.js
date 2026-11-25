import seed from '../config/employee-form-options.json' with {type:'json'};
import {randomBytes} from 'node:crypto';
export const masterTypes=['companies','departments','positions','levels','grades','banks'];
const key=v=>String(v||'').trim().replace(/\s+/g,' ').toLowerCase();
const companyKey=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const profiles=db=>db.prepare('SELECT data FROM employees').all().map(r=>JSON.parse(r.data));
const all=db=>db.prepare('SELECT * FROM master_items ORDER BY type,name COLLATE NOCASE').all();
const version=()=>randomBytes(12).toString('hex');
function transaction(db,fn){db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}
export function initializeMasterData(db){
 db.exec(`CREATE TABLE IF NOT EXISTS master_items(id TEXT PRIMARY KEY,type TEXT NOT NULL,name TEXT NOT NULL,name_key TEXT NOT NULL,parent TEXT NOT NULL DEFAULT '',code TEXT NOT NULL DEFAULT '',benefit_group TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1,version TEXT NOT NULL,UNIQUE(type,parent,name_key));
 CREATE TABLE IF NOT EXISTS master_meta(key TEXT PRIMARY KEY,value TEXT);
 CREATE TABLE IF NOT EXISTS master_events(id INTEGER PRIMARY KEY,item TEXT,actor TEXT,action TEXT,created TEXT,data TEXT);`);
 if(db.prepare("SELECT 1 FROM master_meta WHERE key='seed-v1'").get())return;
 transaction(db,()=>{if(db.prepare("SELECT 1 FROM master_meta WHERE key='seed-v1'").get())return;
  const add=(type,name,extra={})=>{const old=db.prepare('SELECT id FROM master_items WHERE type=? AND parent=? AND name_key=?').get(type,extra.parent||'',key(name));if(old)return old.id;const id=randomBytes(12).toString('hex');db.prepare('INSERT INTO master_items VALUES(?,?,?,?,?,?,?,?,?)').run(id,type,String(name).trim(),key(name),extra.parent||'',extra.code||'',extra.group||'',1,version());return id};
  for(const c of seed.companies)add('companies',c.name,{code:c.code});
  const deps=new Map();for(const name of seed.departments)deps.set(name,add('departments',name));
  for(const [department,positions] of Object.entries(seed.positionsByDepartment))for(const name of positions)add('positions',name,{parent:deps.get(department)});
  for(const name of seed.levels)add('levels',name,{group:['Support','Officer','Associate','Staff'].includes(name)?'staff':'supervisor'});
  for(const e of profiles(db)){if(e.bank)add('banks',e.bank);if(e.grade)add('grades',e.grade);}
  db.prepare('INSERT INTO master_meta VALUES(?,?)').run('seed-v1',JSON.stringify({date:new Date().toISOString(),source:seed.source}));
 });
}
export function formOptions(db){const items=all(db),active=items.filter(r=>r.active),departments=active.filter(r=>r.type==='departments');return{source:seed.source,companies:active.filter(r=>r.type==='companies').map(r=>({name:r.name,code:r.code,codePending:!r.code})),departments:departments.map(r=>r.name),positionsByDepartment:Object.fromEntries(departments.map(d=>[d.name,active.filter(r=>r.type==='positions'&&r.parent===d.id).map(r=>r.name)])),levels:active.filter(r=>r.type==='levels').map(r=>r.name),contracts:seed.contracts,grades:active.filter(r=>r.type==='grades').map(r=>r.name),banks:active.filter(r=>r.type==='banks').map(r=>r.name)};}
function matches(item,e,items){const equal=(a,b)=>key(a)===key(b);if(item.type==='companies')return companyKey(e.company)===companyKey(item.name);if(item.type==='departments')return equal(e.department,item.name);if(item.type==='positions')return equal(e.position,item.name)&&equal(e.department,items.find(d=>d.id===item.parent)?.name);return equal(e[{levels:'level',grades:'grade',banks:'bank'}[item.type]],item.name);}
export function masterList(db){const items=all(db),people=profiles(db);return items.map(r=>({...r,active:!!r.active,usedBy:people.filter(e=>matches(r,e,items)).length,parentName:items.find(d=>d.id===r.parent)?.name||''}));}
export function benefitGroup(db,level){const row=db.prepare("SELECT benefit_group FROM master_items WHERE type='levels' AND name_key=?").get(key(level));return row?.benefit_group||(['Staff','Support','Officer','Associate'].includes(level)?'staff':'supervisor');}
export function applyReferences(db,e,existing,reject){const opts=formOptions(db),unchanged=k=>existing&&String(e[k]||'')===String(existing[k]||'');const company=opts.companies.find(c=>companyKey(c.name)===companyKey(e.company));
 if(company){e.company=company.name;e.code=company.code;}else if(unchanged('company'))e.code=String(existing.code||'');else reject('Pilih perusahaan aktif pada Data Master.');
 const pair=opts.departments.includes(e.department)&&(opts.positionsByDepartment[e.department]||[]).includes(e.position);if(!pair&&!(unchanged('department')&&unchanged('position')))reject('Pilih departemen dan jabatan aktif yang saling sesuai.');
 for(const [field,values,optional] of [['level',opts.levels,false],['contract',opts.contracts,false],['grade',opts.grades,true],['bank',opts.banks,true]]){if(optional&&!e[field])continue;if(!values.includes(e[field])&&!unchanged(field))reject('Pilih '+field+' aktif pada Data Master.');}
}
export function saveMaster(db,u,id,input){if(u.role!=='hr')fail('Pengaturan hanya untuk HR.',403);return transaction(db,()=>{
 const items=all(db),existing=id?items.find(r=>r.id===id):null;if(id&&!existing)fail('Data master tidak ditemukan.',404);if(existing&&input.version!==existing.version)fail('Data sudah diperbarui. Buka ulang form.',409);
 const type=existing?.type||String(input.type||'');if(!masterTypes.includes(type))fail('Jenis data master tidak valid.');if(existing&&input.type!==existing.type)fail('Jenis data tidak dapat diubah.');
 const name=String(input.name||'').trim().replace(/\s+/g,' ');if(!name||name.length>160||/[\x00-\x1f]/.test(name))fail('Isi nama yang valid (maksimal 160 karakter).');
 if(![true,false,1,0,'1','0'].includes(input.active))fail('Pilih status aktif/nonaktif.');const active=[true,1,'1'].includes(input.active)?1:0;
 let parent='',code='',group='';
 if(type==='positions'){parent=String(input.parent||'');const dep=items.find(d=>d.id===parent&&d.type==='departments');if(!dep||(!dep.active&&parent!==existing?.parent))fail('Pilih departemen aktif untuk jabatan.');}
 if(type==='companies'){code=String(input.code||'').trim().toUpperCase();if(!/^[A-Z0-9_-]{1,20}$/.test(code))fail('Isi kode Finance perusahaan (huruf/angka, maksimal 20 karakter).');}
 if(type==='levels'){group=String(input.benefit_group||'');if(!['staff','supervisor'].includes(group))fail('Pilih kelompok benefit untuk level ini.');}
 const duplicate=items.find(r=>r.id!==id&&r.type===type&&r.parent===parent&&(r.name_key===key(name)||type==='companies'&&companyKey(r.name)===companyKey(name)));if(duplicate)fail('Nama tersebut sudah ada, termasuk yang nonaktif.',409);
 const people=profiles(db),affected=existing?people.filter(e=>matches(existing,e,items)):[];
 if(existing&&type==='levels'&&affected.length&&group!==existing.benefit_group)fail('Kelompok benefit level yang sudah dipakai tidak dapat diubah. Buat level baru untuk kelompok lain.');
 const item={id:existing?.id||randomBytes(12).toString('hex'),type,name,name_key:key(name),parent,code,benefit_group:group,active,version:version()};
 db.prepare('INSERT INTO master_items VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_key=excluded.name_key,parent=excluded.parent,code=excluded.code,benefit_group=excluded.benefit_group,active=excluded.active,version=excluded.version').run(item.id,type,name,item.name_key,parent,code,group,active,item.version);
 const changed=[];
 for(const e of affected){let edited=false;const set=(field,value)=>{if(String(e[field]||'')!==value){e[field]=value;edited=true}};
  if(type==='companies'){set('company',name);set('code',code);}else if(type==='departments')set('department',name);else if(type==='positions'){set('position',name);set('department',items.find(d=>d.id===parent).name);}else set({levels:'level',grades:'grade',banks:'bank'}[type],name);
  if(edited){e.profileVersion=version();e.updatedAt=new Date().toISOString();db.prepare('UPDATE employees SET data=? WHERE id=?').run(JSON.stringify(e),e.id);changed.push(e.id);}
 }
 db.prepare('INSERT INTO master_events(item,actor,action,created,data) VALUES(?,?,?,?,?)').run(item.id,u.username,existing?'updated':'created',new Date().toISOString(),JSON.stringify({before:existing,after:item,affectedEmployees:changed}));
 return{item:{...item,active:!!active},affectedCount:changed.length};
 });}
