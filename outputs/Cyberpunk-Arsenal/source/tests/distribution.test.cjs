/* Verify the exact files friends receive. Development dependencies only. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const ROOT=path.resolve(__dirname,'../..');
const SHARED=path.resolve(ROOT,'../Share-with-friends');
const SCRATCH=path.resolve(ROOT,'../../work/distribution-tests');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const report={method:'Unchanged production HTML, isolated headless Edge, file:// and network offline',checks:[]};
let browser;
(async()=>{
 fs.mkdirSync(SCRATCH,{recursive:true});
 const release=JSON.parse(fs.readFileSync(path.join(SHARED,'release.json'),'utf8'));
 const original=fs.readFileSync(path.join(ROOT,'index.html'));
 const html=path.join(SHARED,'Night-City-Arsenal.html'),zip=path.join(SHARED,'Night-City-Arsenal.zip');
 assert.equal(hash(fs.readFileSync(html)),hash(original));
 for(const [name,info] of Object.entries(release.files)){
  const value=fs.readFileSync(path.join(SHARED,name));assert.equal(hash(value),info.sha256);assert.equal(value.length,info.bytes);
 }
 const raw=original.toString('utf8');assert.ok(!raw.includes('C:/Users/evanl'));assert.ok(!raw.includes('C:\\Users\\evanl'));assert.ok(!raw.includes('/*__DATA__*/'));
 report.checks.push('Shared HTML is byte-for-byte identical to production; hashes, sizes and release manifest match','No original installation path or unbuilt template is embedded');
 const extractScript=`import json,pathlib,sys,tempfile,zipfile
archive=pathlib.Path(sys.argv[1]);destination=pathlib.Path(tempfile.mkdtemp(prefix='friend-',dir=sys.argv[2])).resolve()
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for member in z.namelist(): (destination/member).resolve().relative_to(destination)
 assert not any('/source/' in n or 'template.html' in n for n in z.namelist())
 z.extractall(destination)
print(destination/'Night-City-Arsenal'/'Night-City-Arsenal.html')`;
 const extracted=execFileSync(process.env.PYTHON_EXECUTABLE||'python',['-c',extractScript,zip,SCRATCH],{encoding:'utf8'}).trim();
 assert.equal(hash(fs.readFileSync(extracted)),hash(original));
 report.checks.push('ZIP integrity passes; fresh extraction contains the identical app and no development template');
 browser=await chromium.launch({headless:true,args:['--disable-gpu','--disable-gpu-compositing'],...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'msedge'})});
 for(const file of [html,extracted]){
  const context=await browser.newContext({offline:true,viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(pathToFileURL(file).href);
  assert.equal(await page.locator('.weapon-card').count(),115);
  const initial=await page.evaluate(()=>Arsenal.getState());assert.deepEqual(initial.favorites,[]);assert.deepEqual(initial.compare,[]);assert.equal(initial.query,'');
  const loaded=await page.evaluate(async()=>{
   await Promise.all(Arsenal.data.weapons.map(async w=>{const img=new Image();img.src=w.image.src;await img.decode();if(!img.naturalWidth)throw Error(w.name);}));return Arsenal.data.weapons.length;
  });assert.equal(loaded,190);
  await page.locator('#filter-class summary').click();await page.locator('#filter-class').getByRole('checkbox',{name:'Pistol',exact:true}).check();await page.locator('#filter-class').getByRole('checkbox',{name:'Revolver',exact:true}).check();assert.equal(await page.locator('.weapon-card').count(),38);await page.locator('#reset').click();
  await page.getByRole('button',{name:'Favorite Her Majesty',exact:true}).click();await page.reload();assert.equal(await page.locator('#favorite-count').textContent(),'1');
  assert.deepEqual(errors,[]);assert.ok(requests.every(u=>u.startsWith('file:')||u.startsWith('blob:')));
  await context.close();report.checks.push(`${path.basename(path.dirname(file))}: offline catalog, 190 image decodes, multi-select, local favorites, no sender preferences and no page errors passed`);
 }
 await browser.close();browser=null;
 report.applicationFingerprint=release.applicationFingerprint;report.productionSHA256=hash(original);report.passed=true;
 fs.writeFileSync(path.join(ROOT,'validation/distribution-test.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
