import options from '../config/employee-form-options.json' with {type:'json'};
export const employeeFormOptions=options;
const companyKey=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function applyEmployeeReferences(e,existing,fail){
 const company=options.companies.find(c=>companyKey(c.name)===companyKey(e.company));
 if(company){e.company=company.name;e.code=company.code;}
 else if(existing&&e.company===String(existing.company||'')){e.code=String(existing.code||'');}
 else fail('Pilih perusahaan dari daftar yang tersedia.');
 const validPair=options.departments.includes(e.department)&&(options.positionsByDepartment[e.department]||[]).includes(e.position);
 const unchangedLegacy=existing&&e.department===String(existing.department||'')&&e.position===String(existing.position||'');
 if(!validPair&&!unchangedLegacy)fail('Pilih departemen dan posisi yang sesuai dengan Rekap 50 Karyawan.');
 if(!options.levels.includes(e.level))fail('Pilih level jabatan dari Rekap 50 Karyawan.');
 if(!options.contracts.includes(e.contract))fail('Pilih status kontrak dari Rekap 50 Karyawan.');
}
