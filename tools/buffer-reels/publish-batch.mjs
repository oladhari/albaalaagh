import {readFileSync,writeFileSync,renameSync,existsSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {setDefaultAutoSelectFamily} from 'node:net';
setDefaultAutoSelectFamily(false);
import {setTimeout as delay} from 'node:timers/promises';
import {createClient} from '@supabase/supabase-js';
import {BufferClient,duplicate} from '../buffer-tiktok/client.mjs';
import {submit,readLedger,syncStatus} from '../buffer-tiktok/workflow.mjs';
import {markSent} from '../buffer-tiktok/site-tracking.mjs';
const manifestPath=resolve(process.argv[2]||'');
if(!process.argv.includes('--publish')&&!process.argv.includes('--plan'))throw Error('Explicit --publish or local-only --plan required');
const root=dirname(manifestPath), manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
if(!manifest.publication_authorized||!manifest.authorization.includes('TikTok X LinkedIn'))throw Error('Missing multi-network publication authorization');
if(process.argv.includes('--plan')){for(const row of manifest.clips){if(createHash('sha256').update(readFileSync(row.ready)).digest('hex')!==row.ready_sha256)throw Error('Approved file hash mismatch');const meta=JSON.parse(readFileSync(join(dirname(row.ready),'metadata.json'),'utf8'));const x=[meta.title,'من برنامج «نبض الشباب» — الحلقة كاملة:',meta.source_episode_url,'#تونس #البلاغ'].join('\n\n');if([...x].length>280||[...meta.description].length>2200)throw Error('Caption too long');}console.log(JSON.stringify({mode:'local_plan_only',clips:manifest.clips.length,destinations:['tiktok','twitter','linkedin'],media_hashes_and_captions_valid:true}));process.exit(0);}
const schedule=JSON.parse(readFileSync(join(root,'buffer-schedule.json'),'utf8'));
if(Date.now()<Date.parse(schedule.not_before))throw Error('Buffer submission deferred until the saved quota window');
const lock=join(root,'buffer-worker.lock'),fd=openSync(lock,'wx',0o600);
const globalLedger=process.env.BUFFER_REELS_LEDGER_PATH||'/mnt/linuxdata/albaalaagh-buffer-tiktok/ledger.json';
let remaining=Infinity, shortRemaining=Infinity, shortReset=0;
const fetcher=async(...args)=>{
 if(shortRemaining<6&&shortReset>Date.now()){
  console.log('Pausing Buffer requests until the 15-minute allowance renews');
  await delay(shortReset-Date.now()+1000);
 }
 const r=await fetch(...args);const h=r.headers.get('ratelimit')||'';
 const daily=h.match(/"250-in-1day";\s*r=(\d+)/);if(daily)remaining=Number(daily[1]);
 const short=h.match(/"100-in-15min";\s*r=(\d+);\s*t=(\d+)/);
 if(short){shortRemaining=Number(short[1]);shortReset=Date.now()+Number(short[2])*1000;}
 return r;
};
const client=new BufferClient(process.env.BUFFER_TIKTOK_API,fetcher);
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
const save=(path,obj)=>{writeFileSync(path+'.tmp',JSON.stringify(obj,null,2));renameSync(path+'.tmp',path);};
const report={started_at:new Date().toISOString(),state:'preflight',clips:[]};
const reportPath=join(root,'buffer-worker-result.json');
try{
 const input={organizationId:'6adf1193b62116a833e2733c'};
 const data=await client.request('query($input:ChannelsInput!){channels(input:$input){id name service isDisconnected isLocked isQueuePaused}}',{input});
 const targets={};for(const service of ['tiktok','twitter','linkedin']){const matches=data.channels.filter(c=>c.service===service&&c.name==='albaalaagh');if(matches.length!==1||matches[0].isDisconnected||matches[0].isLocked||matches[0].isQueuePaused)throw Error('Connection not ready: '+service);targets[service]={...matches[0],organizationId:input.organizationId};}
 const daily=await client.request('query($input:DailyPostingLimitsInput!){dailyPostingLimits(input:$input){channelId isAtLimit limit sent scheduled}}',{input:{channelIds:Object.values(targets).map(c=>c.id)}});
 if(remaining<90)throw Error('Insufficient Buffer API headroom; no batch publication started');
 for(const limit of daily.dailyPostingLimits)if(limit.isAtLimit||(limit.limit!==null&&limit.sent+limit.scheduled+manifest.clips.length>limit.limit))throw Error('Insufficient daily channel capacity: '+limit.channelId);
 const histories={};for(const service of ['tiktok','twitter','linkedin'])histories[service]=await client.posts(targets[service]);
 const rows=manifest.clips.map(row=>{const p=join(dirname(row.ready),'publication-state.json'),s=JSON.parse(readFileSync(p,'utf8'));if(s.youtube?.state!=='verified'||!s.youtube.id||!s.r2?.url||!s.website?.id||s.facebook?.state!=='verified'||s.instagram?.state!=='verified')throw Error('YouTube/Meta/R2 prerequisites incomplete for clip '+row.clip_number);if(createHash('sha256').update(readFileSync(row.ready)).digest('hex')!==row.ready_sha256)throw Error('Approved media hash mismatch');return{row,path:p,state:s};});
 report.state='publishing';save(reportPath,report);
 for(const {row,path,state} of rows){
  const meta=JSON.parse(readFileSync(join(dirname(row.ready),'metadata.json'),'utf8'));
  for(const service of ['tiktok','twitter','linkedin']){
   const known=state[service];if(known?.buffer_post_id){if(['unknown','submitting'].includes(known.state))throw Error('Known ambiguous submission requires review');continue;}
   if(known&&['unknown','submitting'].includes(known.state))throw Error('Unknown earlier attempt; no resubmission');
   if(remaining<6)throw Error('Reserved Buffer API headroom reached; no more submissions');
   const caption=service==='twitter'?[meta.title,'من برنامج «نبض الشباب» — الحلقة كاملة:',meta.source_episode_url,'#تونس #البلاغ'].join('\n\n'):meta.description;
   if([...caption].length>(service==='twitter'?280:service==='tiktok'?2200:3000))throw Error('Caption limit exceeded for '+service);
   if(service==='tiktok'){
    const result=await submit({client,target:targets.tiktok,item:{source_id:'site:'+state.website.id,video_url:state.r2.url,caption,ai_generated:false},ledgerPath:globalLedger,now:true});
    const post=result.post||result.entry?.post;const id=post?.id||result.entry?.post_id;if(!id)throw Error('TikTok receipt missing; inspect global ledger');
    state.tiktok={state:post?.status||result.entry.state,buffer_post_id:id,url:post?.externalLink};save(path,state);
   }else{
    const match=duplicate(histories[service],{video_url:state.r2.url,caption});
    if(match){state[service]={state:match.status,buffer_post_id:match.id,url:match.externalLink};save(path,state);continue;}
    state[service]={state:'submitting',started_at:new Date().toISOString()};save(path,state);
    try{const post=await client.create({channelId:targets[service].id,text:caption,schedulingType:'automatic',mode:'shareNow',needsApproval:false,assets:[{video:{url:state.r2.url}}]});state[service]={state:post.status,buffer_post_id:post.id,url:post.externalLink};save(path,state);histories[service].push(post);}catch(e){state[service].state='unknown';save(path,state);throw e;}
   }
   console.log(JSON.stringify({clip:row.clip_number,service,...state[service]}));
  }
 }
 for(let attempt=0;attempt<8;attempt++){
  let pending=0;
  for(const entry of rows){const state=JSON.parse(readFileSync(entry.path,'utf8'));
   for(const service of ['tiktok','twitter','linkedin']){
    const stage=state[service];if(stage.state==='verified')continue;
    if(remaining<6)throw Error('Status check paused to preserve API reserve');
    let post;
    if(service==='tiktok'){await syncStatus(client,globalLedger,stage.buffer_post_id);const e=Object.values(readLedger(globalLedger).items).find(x=>x.post_id===stage.buffer_post_id);post=e?.post;if(post?.status==='sent'&&post.externalLink)await markSent(db,e);}
    else post=await client.post(stage.buffer_post_id);
    if(!post||post.channelId!==targets[service].id)throw Error('Unexpected delivery receipt');
    if(post.status==='error'){state[service]={...stage,state:'failed',error:post.error?.message};save(entry.path,state);throw Error('Delivery failed '+service+' clip '+entry.row.clip_number+': '+post.error?.message);}
    if(post.status==='sent'&&post.externalLink){state[service]={...stage,state:'verified',url:post.externalLink,verified_at:new Date().toISOString(),...(service==='tiktok'?{done_mark_verified:true}:{})};}else{state[service]={...stage,state:post.status};pending++;}
    save(entry.path,state);console.log(JSON.stringify({clip:entry.row.clip_number,service,...state[service]}));
   }
  }
  if(!pending){report.state='complete';break;}
  if(attempt===7)throw Error('Delivery still pending; retain IDs and inspect without creating duplicates');
  await delay(60000);
 }
 report.clips=rows.map(e=>{const s=JSON.parse(readFileSync(e.path,'utf8'));return{clip:e.row.clip_number,tiktok:s.tiktok,twitter:s.twitter,linkedin:s.linkedin};});
 report.completed_at=new Date().toISOString();save(reportPath,report);
}catch(e){report.state='stopped_for_review';report.error=e.message;save(reportPath,report);throw e;}
finally{spawnSync('python3',[join(root,'make_report.py')],{stdio:'inherit'});closeSync(fd);unlinkSync(lock);}
