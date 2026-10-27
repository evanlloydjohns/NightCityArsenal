/* Paired information-formatting profile; development only, no visible browser. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{pathToFileURL}=require('url');
const files=process.argv.slice(2,4).map(p=>path.resolve(p)),out=path.resolve(process.argv[4]),runs=[],median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const metrics=x=>Object.fromEntries(x.metrics.map(v=>[v.name,v.value]));
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--disable-gpu','--disable-gpu-compositing']});
for(let pair=0;pair<3;pair++)for(const version of pair%2?[1,0]:[0,1]){const c=await b.newContext({offline:true,viewport:{width:1920,height:1080},reducedMotion:'reduce'}),p=await c.newPage(),cdp=await c.newCDPSession(p),actions=[];await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');await p.goto(pathToFileURL(files[version]).href);
async function action(name,code){const before=metrics(await cdp.send('Performance.getMetrics'));const responseMs=await p.evaluate(async code=>{const t=performance.now();await(0,eval)(code);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-t;},code);const after=metrics(await cdp.send('Performance.getMetrics'));actions.push({name,responseMs,taskMs:(after.TaskDuration-before.TaskDuration)*1000});}
await action('open-mods',`Arsenal.navigate('mods')`);
await action('search-recoil',`(()=>{const n=document.getElementById('mods-search');n.value='recoil';n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
await action('clear-search',`(()=>{const n=document.getElementById('mods-search');n.value='';n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
await action('inspect-add-vantage',`document.querySelector('[data-open-mod="mod.add-vantage"] .equipment-name').click()`);
await action('change-reference-tier',`(()=>{const n=document.getElementById('mod-detail-tier');n.value='1';n.dispatchEvent(new Event('change',{bubbles:true}));})()`);
await action('compatible-weapon-search',`(()=>{const n=document.getElementById('compatible-search');n.value='lexington';n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
await action('open-raw-fields',`[...document.querySelectorAll('#equipment-content summary')].find(n=>/published structured fields/i.test(n.textContent)).click()`);
await action('close-detail',`document.querySelector('[data-plan-action=close-equipment]').click()`);
runs.push({pair,version:version?'refined':'before',actions});await c.close();console.log('Completed detail pair',pair+1,version?'refined':'before');}
await b.close();const summary=Object.fromEntries(['before','refined'].map(version=>{const rs=runs.filter(r=>r.version===version);return [version,Object.fromEntries(rs[0].actions.map(a=>[a.name,Object.fromEntries(['responseMs','taskMs'].map(k=>[k,median(rs.map(r=>r.actions.find(x=>x.name===a.name)[k]))]))]))];}));
fs.writeFileSync(out,JSON.stringify({method:'Three alternating pairs; offline isolated headless Edge; GPU/compositing disabled; 4x CPU; 1920x1080; response includes scripted activation and two animation frames.',files:files.map(f=>({file:path.basename(f),sha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')})),summary,runs},null,2));console.log(JSON.stringify(summary,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
