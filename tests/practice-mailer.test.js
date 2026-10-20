import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { onRequest } from '../functions/api/[[path]].js';
import { mailSchema, recordVerifiedSubscriber } from '../functions/_lib/practice-mailer.js';
import { practicePapers } from '../assets/practice-papers.js';
const secret = 'test-only-secret-'.repeat(4);
function envDB() {
  const sqlite = new DatabaseSync(':memory:');
  return { sqlite, PRACTICE_MAILER_SECRET: secret, DB: { prepare(sql) {
    const statement = sqlite.prepare(sql);
    return { args: [], bind(...args) { this.args = args; return this; }, async run() { const result = statement.run(...this.args); return { meta: { changes: Number(result.changes) } }; }, async first() { return statement.get(...this.args) || null; }, async all() { return { results: statement.all(...this.args) }; } };
  } } };
}
function request(action, key = secret, extras = {}) { return new Request('https://store.test/api/practice-mailer', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify({action,...extras}) }); }
const api = (request, env) => onRequest({request,env});
const now = () => Math.floor(Date.now()/1000);
async function subscriber(env, uid, email, enabled = 1, verified = true, at = now()-100) {
  await mailSchema(env);
  env.sqlite.prepare('INSERT INTO practice_email_preferences VALUES (?,?,?,?)').run(uid,email,enabled,at);
  await recordVerifiedSubscriber(env,{uid,email,emailVerified:verified});
  env.sqlite.prepare('UPDATE practice_mail_subscribers SET verified_at=? WHERE uid=?').run(at,uid);
}
test('mailer export is unavailable without a strong configured secret; Firebase/public tokens cannot export addresses', async () => {
  for (const env of [{},{PRACTICE_MAILER_SECRET:'short'},{PRACTICE_MAILER_SECRET:secret}]) {
    const response = await api(request('next','wrong'),env); assert.equal(response.status,401); assert.ok(!(await response.text()).includes('@'));
  }
  const env=envDB(); assert.equal((await api(request('status'),env)).status,200);
  assert.equal((await api(new Request('https://store.test/api/practice-mailer'),env)).status,405);
  env.sqlite.close();
});
test('real SQLite queue selects only pre-publication verified opted-in emails and claims each paper/email once', async () => {
  const env=envDB();
  await subscriber(env,'a','a@example.test'); await subscriber(env,'b','b@example.test',0); await subscriber(env,'c','c@example.test',1,false);
  await subscriber(env,'d','d@example.test'); env.sqlite.prepare('UPDATE practice_email_preferences SET email=? WHERE uid=?').run('changed@example.test','d');
  await subscriber(env,'e','e@example.test',1,true,now()); await subscriber(env,'f','a@example.test');
  practicePapers.push({id:'paper-1',title:'New Paper',path:'/practice.html',publishedAt:now()-10});
  try {
    const response = await api(request('next',secret,{limit:5}),env); const {jobs}=await response.json();
    assert.equal(jobs.length,1); assert.equal(jobs[0].email,'a@example.test'); assert.equal(jobs[0].url,'https://store.test/practice.html');
    assert.equal((await (await api(request('next'),env)).json()).jobs.length,0,'reserved jobs are not resent');
    assert.equal((await api(request('ack',secret,{id:jobs[0].id,status:'sent'}),env)).status,200);
    await api(request('ack',secret,{id:jobs[0].id,status:'failed'}),env);
    assert.equal(env.sqlite.prepare('SELECT status FROM practice_mail_deliveries WHERE id=?').get(jobs[0].id).status,'sent');
    assert.equal((await (await api(request('next'),env)).json()).jobs.length,0,'sent jobs are not resent');
  } finally { practicePapers.length=0;env.sqlite.close(); }
});
test('unsubscribe GET is a confirmation only; POST disables future claims without exposing the email', async () => {
  const env=envDB();await subscriber(env,'a','private@example.test');
  const token=env.sqlite.prepare('SELECT unsubscribe_token FROM practice_mail_subscribers').get().unsubscribe_token;
  const url='https://store.test/api/practice-unsubscribe?token='+token;
  const get=await api(new Request(url),env);assert.equal(get.status,200);assert.ok(!(await get.text()).includes('private@example.test'));
  assert.equal(env.sqlite.prepare('SELECT enabled FROM practice_email_preferences').get().enabled,1);
  const post=await api(new Request(url,{method:'POST',body:new URLSearchParams({token})}),env);assert.equal(post.status,200);
  assert.equal(env.sqlite.prepare('SELECT enabled FROM practice_email_preferences').get().enabled,0);
  practicePapers.push({id:'paper-2',title:'Paper Two',path:'/practice.html',publishedAt:now()});
  try { assert.equal((await (await api(request('next'),env)).json()).jobs.length,0); }
  finally {practicePapers.length=0;env.sqlite.close();}
});
test('no published papers means no retrospective email queue',async()=>{
  const env=envDB();await subscriber(env,'a','a@example.test');
  const result=await (await api(request('next'),env)).json();assert.deepEqual(result.jobs,[]);env.sqlite.close();
});
const script=await readFile(new URL('../assets/gmail-alerts.gs.txt',import.meta.url),'utf8');
function googleScript({quota=100,failSend=false}={}) {
  const props=new Map([['PRACTICE_MAILER_SECRET',secret]]),sent=[],calls=[],triggers=[],jobs=[{id:'a'.repeat(32),email:'reader@example.test',title:'Paper <One>',url:'https://toppers-book.pages.dev/practice.html',unsubscribe:'https://toppers-book.pages.dev/api/practice-unsubscribe?token='+'b'.repeat(64)}];
  const runtime={console:{log(){}},Session:{getEffectiveUser:()=>({getEmail:()=> 'codetoppers@gmail.com'})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty(k,v){props.set(k,v);}})},MailApp:{getRemainingDailyQuota:()=>quota,sendEmail(message){sent.push(message);if(failSend)throw Error('send uncertain');quota--; }},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},UrlFetchApp:{fetch(url,options){const body=JSON.parse(options.payload);calls.push(body);const data=body.action==='status'?{connected:true}:body.action==='next'?{jobs:jobs.length?[jobs.shift()]:[]}:{saved:true};return{getResponseCode:()=>200,getContentText:()=>JSON.stringify(data)};}},ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:()=>({timeBased(){return this;},everyMinutes(){return this;},create(){triggers.push({getHandlerFunction:()=> 'sendPracticeAlerts'});}})}};
  vm.createContext(runtime);vm.runInContext(script,runtime);return{runtime,props,sent,calls,triggers};
}
test('Apps Script quota exhaustion claims no jobs; sends are individual, escaped and acknowledged',()=>{
  const exhausted=googleScript({quota:5});exhausted.runtime.sendPracticeAlerts();assert.equal(exhausted.calls.length,0);
  const normal=googleScript();normal.runtime.sendPracticeAlerts();assert.equal(normal.sent.length,1);assert.equal(normal.sent[0].to,'reader@example.test');assert.ok(normal.sent[0].htmlBody.includes('Paper &lt;One&gt;'));assert.ok(normal.calls.some(x=>x.action==='ack'&&x.status==='sent'));
  normal.runtime.sendPracticeAlerts();assert.equal(normal.sent.length,1);
});
test('Apps Script caps its rolling budget, records uncertain failures and creates one trigger/test',()=>{
  const capped=googleScript();capped.props.set('ALERT_BUDGET',JSON.stringify({started:Date.now(),attempts:90}));capped.runtime.sendPracticeAlerts();assert.equal(capped.calls.length,0);
  const failed=googleScript({failSend:true});assert.throws(()=>failed.runtime.sendPracticeAlerts());assert.ok(failed.calls.some(x=>x.action==='ack'&&x.status==='failed'));
  const start=googleScript();start.runtime.startPracticeAlerts();start.runtime.startPracticeAlerts();assert.equal(start.sent.length,1);assert.equal(start.sent[0].to,'codetoppers@gmail.com');assert.equal(start.triggers.length,1);
});
