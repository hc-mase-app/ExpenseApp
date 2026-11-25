// Presentation helpers only. Existing inputs, actions, downloads and values stay in place.
export function prepareMobileUI(root,{signedIn=false}={}){
 root.classList.remove('mobile-menu-open');
 if(!root.dataset.mobileKeyboardBound){
  root.dataset.mobileKeyboardBound='true';
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.classList.contains('mobile-menu-open')){const button=root.querySelector('#mobile-menu-toggle');button?.click();button?.focus();}});
 }
 const header=root.querySelector(':scope > .top');
 if(signedIn&&header){
  const tools=header.querySelector('.hr-header-tools');
  const sidebar=root.querySelector('.hr-sidebar');
  if(tools||sidebar){
   if(tools)tools.id='mobile-account-tools';
   if(sidebar)sidebar.id='mobile-hr-navigation';
   const toggle=document.createElement('button');
   toggle.type='button';toggle.className='mobile-menu-toggle';toggle.id='mobile-menu-toggle';
   toggle.setAttribute('aria-label','Buka menu');toggle.setAttribute('aria-expanded','false');
   toggle.setAttribute('aria-controls',[sidebar?.id,tools?.id].filter(Boolean).join(' '));
   const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent='☰';
   const text=document.createElement('span');text.textContent='Menu';toggle.append(icon,text);
   toggle.onclick=()=>{
    const open=root.classList.toggle('mobile-menu-open');
    toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Tutup menu':'Buka menu');
    icon.textContent=open?'×':'☰';text.textContent=open?'Tutup':'Menu';
   };
   header.append(toggle);
  }
 }
 const selectors=['.history-table','#balance-table','.hr-main-pane > .body > .box > .scroll > table','.quota-level-table','.employee-id-history table'];
 root.querySelectorAll(selectors.join(',')).forEach(table=>{
  if(table.closest('.finance-ready-dialog')||table.classList.contains('sop-table'))return;
  const headers=[...table.querySelectorAll('thead tr:first-child > th')].map(th=>th.textContent.trim());
  if(!headers.length)return;
  table.classList.add('mobile-records');
  table.querySelectorAll('tbody > tr').forEach(row=>[...row.children].forEach((cell,i)=>{
   cell.dataset.mobileLabel=headers[i]||'Tindakan';
  }));
 });
}
export function prepareMobilePreview(dialog){
 const button=document.createElement('button');button.type='button';button.className='mobile-preview-close';button.textContent='Tutup pratinjau';
 button.onclick=()=>dialog.close();dialog.prepend(button);
}
