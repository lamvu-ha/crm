const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),ts=require('typescript');
const base=path.resolve(__dirname,'..');
function load(root,name,cache=new Map()){
 const file=path.join(root,name.endsWith('.ts')?name:name+'.ts');
 if(cache.has(file)) return cache.get(file);
 const exports={};cache.set(file,exports);
 new Function('exports','require',ts.transpile(fs.readFileSync(file,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022})) (exports, id=>{
   if(id.endsWith('/types')||id==='../types')return {isDemoLead:()=>false};
   if(id==='./firebaseDb')return {};
   return load(path.dirname(file),id,cache);
 });return exports;
}
(async()=>{
 for(const tree of ['src','demo-isolated/src']){
  const root=path.join(base,tree),cache=new Map();
  const w=load(root,'utils/customerWorkflow',cache);
  const now=Date.parse('2026-10-03T10:00:00+07:00');
  const lead={id:'a',fullName:'An',phone:'0901234567',email:'an@example.com',project:'Dự án',budget:'2 tỷ',notes:'Mua ở',status:'Quan tâm',assignee:'Sale A',assignedAt:new Date(now-4*86400000).toISOString()};
  assert.deepEqual(w.profileIssues(lead),[]);
  assert(w.profileIssues({...lead,phone:'123'}).includes('SĐT không hợp lệ'));
  assert(w.profileIssues({...lead,email:'wrong'}).includes('Email không hợp lệ'));
  assert(w.neglectedCustomer(lead,now));
  assert(!w.neglectedCustomer({...lead,status:'Đã chốt'},now));
  assert(!w.neglectedCustomer({...lead,callbackReminder:{status:'pending'}},now));
  assert(!w.neglectedCustomer({...lead,history:[{type:'Cuộc gọi',date:new Date(now-3600000).toISOString()}]},now));
  const app={date:'2026-10-03',time:'09:00',assignee:'Sale A',status:'Chờ đi xem'};
  assert.equal(w.appointmentConflicts({...app,time:'09:59'},[app]).length,1);
  assert.equal(w.appointmentConflicts({...app,time:'10:00'},[app]).length,0);
  assert.equal(w.appointmentConflicts({...app,assignee:'Sale B'},[app]).length,0);
  assert.equal(w.appointmentConflicts(app,[{...app,status:'Đã huỷ'}]).length,0);
  assert.equal(w.appointmentConflicts({...app,date:'2026-10-04',time:'00:10'},[{...app,time:'23:45'}]).length,1);
  assert.deepEqual(w.describeLeadChanges(lead,{...lead,phone:'0909999999'}),['SĐT: “0901234567” → “0909999999”']);
  const csv=load(root,'utils/csvHelper',cache);
  const parsed=csv.parseCSVToLeads('Tên,SĐT,Email\nAn,0901234567,an@example.com\n,0909999999,bad',0);
  assert.equal(parsed[0].email,'an@example.com');
  assert(w.profileIssues(parsed[1]).includes('Thiếu tên'));
  const tracker=load(root,'services/saveTracker',cache);
  let attempt=0;
  await tracker.trackSave('test',async()=>false,async()=>{attempt++;return true;});
  assert.equal(tracker.getSaveState().failed,1);
  await tracker.retryFailedSaves();assert.equal(attempt,1);assert.equal(tracker.getSaveState().failed,0);
  let resolveOld;const old=tracker.trackSave('same',()=>new Promise(resolve=>{resolveOld=resolve;}));
  await tracker.trackSave('same',async()=>true);resolveOld(false);await old;
  assert.equal(tracker.getSaveState().failed,0,'old failure must not replace newer success');
  global.localStorage={getItem:key=>key==='salepro_token'?'synthetic-token':JSON.stringify([{...lead,status:'Tiềm năng'}])};
  let sent;global.fetch=async()=>({ok:true,json:async()=>[lead]});
  const service=load(root,'services/crmBackendService',cache).crmBackend;
  await service.getLeads();
  global.fetch=async(url,options)=>{sent=JSON.parse(options.body);return {ok:false};};
  await service.updateLead({...lead,status:'Quan tâm cao'});assert.equal(tracker.getSaveState().failed,1);
  global.fetch=async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({lead:{...lead,...sent}})};};
  await tracker.retryFailedSaves();assert.equal(sent.status,'Tiềm năng','retry must use latest data');
  assert.equal(tracker.getSaveState().failed,0);assert.equal(tracker.getSaveState().pending,0);
  console.log('PASS '+tree+': profile validation, neglected customers, appointment conflicts, audit differences, CSV contacts, save failure/retry and stale-response protection');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
