import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const script=resolve('tools/buffer-reels/publish-batch.mjs');
function fixture(mode){
 const root=mkdtempSync(join(tmpdir(),'buffer-reels-test-'));const clips=[];
 for(let i=1;i<=8;i++){const folder=join(root,''+i);mkdirSync(folder);const ready=join(folder,'ready.mp4');writeFileSync(ready,'approved fixture');const sha=createHash('sha256').update('approved fixture').digest('hex');writeFileSync(join(folder,'metadata.json'),JSON.stringify({title:'اختبار '+i,description:'وصف '+i,source_episode_url:'https://www.youtube.com/watch?v=Wt0eYW4T9yc'}));writeFileSync(join(folder,'publication-state.json'),JSON.stringify({youtube:{state:'verified',id:'youtube-'+i},facebook:{state:'verified'},instagram:{state:'verified'},r2:{url:'https://media.albaalaagh.com/shorts/test-'+i+'.mp4'},website:{id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0')}}));clips.push({clip_number:i,ready,ready_sha256:sha});}
 const manifest=join(root,'publication-manifest.json');writeFileSync(manifest,JSON.stringify({publication_authorized:true,authorization:'TikTok X LinkedIn',clips}));writeFileSync(join(root,'buffer-schedule.json'),JSON.stringify({not_before:'2000-01-01T00:00:00Z'}));writeFileSync(join(root,'make_report.py'),'print("fixture report")');
 const hook=join(root,'mock.mjs');writeFileSync(hook,`
 import {writeFileSync} from 'node:fs';
 const posts=new Map();let creations=0;let done=0;
 process.on('exit',()=>writeFileSync(process.env.TEST_ROOT+'/calls.json',JSON.stringify({creations,done})));
 const channels=['tiktok','twitter','linkedin'].map(service=>({id:'c-'+service,name:'albaalaagh',service,isDisconnected:false,isLocked:false,isQueuePaused:false}));
 globalThis.fetch=async(url,init={})=>{
  if(String(url).includes('test.supabase.co')){done++;return new Response(null,{status:201});}
  if(init.method==='HEAD')return new Response(null,{status:200,headers:{'content-type':'video/mp4','content-length':'16'}});
  if(String(url)!=='https://api.buffer.com')throw Error('Unexpected external request blocked');
  const b=JSON.parse(init.body);let data;
  if(b.query.includes('dailyPostingLimits'))data={dailyPostingLimits:channels.map(c=>({channelId:c.id,isAtLimit:false,limit:25,sent:0,scheduled:0}))};
  else if(b.query.includes('channels('))data={channels};
  else if(b.query.includes('posts('))data={posts:{edges:[],pageInfo:{hasNextPage:false,endCursor:null}}};
  else if(b.query.includes('createPost(')){creations++;if(process.env.TEST_MODE==='unknown'&&b.variables.input.channelId==='c-twitter')return new Response('{}',{status:500});const p={id:'post-'+creations,text:b.variables.input.text,channelId:b.variables.input.channelId,status:'sent',externalLink:b.variables.input.channelId==='c-tiktok'?'https://tiktok.com/@albaalaagh/video/'+creations:'https://example.com/post/'+creations,assets:[{source:b.variables.input.assets[0].video.url}]};posts.set(p.id,p);data={createPost:{__typename:'PostActionSuccess',post:p}};}
  else if(b.query.includes('post('))data={post:posts.get(b.variables.input.id)};
  else throw Error('Unexpected operation blocked');
  return new Response(JSON.stringify({data}),{status:200,headers:{'content-type':'application/json','ratelimit':'"250-in-1day"; r='+ (process.env.TEST_MODE==='quota'?14:200)+'; t=600'}});
 };
 `);
 const env={...process.env,TEST_ROOT:root,TEST_MODE:mode,BUFFER_TIKTOK_API:'fixture-key',NEXT_PUBLIC_SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture-key',BUFFER_REELS_LEDGER_PATH:join(root,'ledger.json')};
 return{root,clips,run:()=>spawnSync(process.execPath,['--import',hook,script,manifest,'--publish'],{env,encoding:'utf8',timeout:30000}),calls:()=>JSON.parse(readFileSync(join(root,'calls.json'),'utf8'))};
}
test('publishes all three networks and marks TikTok done only after delivery',()=>{const f=fixture('success');try{const r=f.run();assert.equal(r.status,0,r.stderr);assert.deepEqual(f.calls(),{creations:24,done:8});for(const row of f.clips){const s=JSON.parse(readFileSync(join(f.root,''+row.clip_number,'publication-state.json')));for(const key of ['tiktok','twitter','linkedin'])assert.equal(s[key].state,'verified');}}finally{rmSync(f.root,{recursive:true,force:true});}});
test('insufficient quota stops before any create mutation',()=>{const f=fixture('quota');try{assert.notEqual(f.run().status,0);assert.equal(f.calls().creations,0);}finally{rmSync(f.root,{recursive:true,force:true});}});
test('unknown create outcome stops and is not resubmitted on a second run',()=>{const f=fixture('unknown');try{assert.notEqual(f.run().status,0);assert.equal(f.calls().creations,2);assert.notEqual(f.run().status,0);assert.equal(f.calls().creations,0);}finally{rmSync(f.root,{recursive:true,force:true});}});
