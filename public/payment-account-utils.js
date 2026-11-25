export const accountFields=['bankName','accountNo','accountName'];
export const profileAccount=e=>({bankName:String(e.bank||'').trim(),accountNo:String(e.account||'').trim(),accountName:String(e.accountName||e.name||'').trim()});
export const savedAccount=c=>Object.fromEntries(accountFields.map(k=>[k,String(c.paymentRequest?.[k]||'').trim()]));
export const completeAccount=a=>!!(a.bankName&&a.accountName&&/^\d+$/.test(a.accountNo));
export const sameAccount=(a,b)=>accountFields.every(k=>a[k]===b[k]);
export const autoAccount=(c,e)=>c.status==='paid'||c.status==='cancelled'||c.financeDispatch?savedAccount(c):c.status==='approved'&&completeAccount(profileAccount(e))?profileAccount(e):{};
export const changedSentAccount=(c,e)=>c.status==='approved'&&!!c.financeDispatch&&completeAccount(profileAccount(e))&&!sameAccount(savedAccount(c),profileAccount(e));
