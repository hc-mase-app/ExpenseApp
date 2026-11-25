// The payer is a per-claim snapshot; it never changes the employee's employer.
export const hasExpenseCompany=c=>c?.category==='expense'&&!!c.expenseCompany?.code;
export const expenseCompanyCode=(c,e)=>hasExpenseCompany(c)?c.expenseCompany.code:e.code;
export const expenseCompanyName=(c,e)=>hasExpenseCompany(c)?c.expenseCompany.name:e.company;
export function selectExpenseCompany(companies,id,existing){
 if(existing?.id===id&&existing.name&&existing.code)return {...existing};
 const selected=companies.find(c=>c.id===id&&c.name&&c.code);
 if(!selected)throw Object.assign(new Error('Pilih PT yang menanggung biaya dari daftar perusahaan aktif.'),{status:400});
 return {id:selected.id,name:selected.name,code:selected.code};
}
