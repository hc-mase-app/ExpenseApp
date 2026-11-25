export const claimScopeLabels={all:'Seluruh status',pending:'Pengajuan',history:'Riwayat',balances:'Saldo Karyawan'};
export const claimWorkflowStatus=c=>c.status==='approved'?(c.financeDispatch?.resendRequired?'finance_resend':c.financeDispatch?.sentAt?'finance_sent':'finance_unsent'):c.status;
// A revised request stays in the work queue, under the same unsent filter.
export const matchesWorkflowFilter=(c,status='all')=>status==='all'||(status==='approved'?c.status==='approved':status==='finance_unsent'?['finance_unsent','finance_resend'].includes(claimWorkflowStatus(c)):claimWorkflowStatus(c)===status);
export function matchesClaimScope(claim,scope='all'){
 const status=claimWorkflowStatus(claim);
 if(scope==='pending')return ['submitted','returned','finance_unsent','finance_resend'].includes(status);
 if(scope==='history')return ['finance_sent','paid','rejected','cancelled','historical'].includes(status);
 return true;
}
export function compareClaimRows(a,b,scope='all'){
 const priority=c=>scope==='pending'?({submitted:0,returned:1,finance_unsent:2,finance_resend:2}[claimWorkflowStatus(c)]??3):scope==='history'&&claimWorkflowStatus(c)==='finance_sent'?0:1;
 return priority(a)-priority(b)||b.date.localeCompare(a.date)||b.id.localeCompare(a.id);
}
export function paginate(rows,page=1,size=10){
 const pageSize=[10,25,50].includes(Number(size))?Number(size):10,total=rows.length,pages=Math.max(1,Math.ceil(total/pageSize)),current=Math.min(pages,Math.max(1,Math.trunc(Number(page)||1))),offset=(current-1)*pageSize;
 return {rows:rows.slice(offset,offset+pageSize),page:current,pageSize,pages,total,start:total?offset+1:0,end:Math.min(offset+pageSize,total)};
}
export const matchesEmployeeSearch=(e,query='')=>[e.id,e.name,e.company,e.department,e.level].join(' ').toLocaleLowerCase('id-ID').includes(String(query).toLocaleLowerCase('id-ID'));
