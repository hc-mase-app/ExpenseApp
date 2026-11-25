export const normalizeProvider=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('id-ID');
export function matchingClaims(list,{employee,category,date,amount,provider,excludeId=''}){
 const name=normalizeProvider(provider);
 return list.filter(c=>c.id!==excludeId&&c.employee===employee&&c.category===category&&c.date===date&&!c.amountUnknown&&c.amount!==null&&Math.round(Number(c.amount)*100)===Math.round(Number(amount)*100)&&normalizeProvider(c.provider)===name&&!['cancelled','rejected'].includes(c.status)).sort((a,b)=>b.id.localeCompare(a.id));
}
