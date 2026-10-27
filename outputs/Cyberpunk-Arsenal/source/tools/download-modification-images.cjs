/* Optional maintenance only. Downloads source-linked public artwork with a normal
   isolated headless browser. Never solves or bypasses an access challenge. */
const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),destination=path.resolve(process.argv[2]||'work/modification-image-cache');
(async()=>{fs.mkdirSync(destination,{recursive:true});const manifest=JSON.parse(fs.readFileSync(path.join(root,'modification-images.json')));
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'msedge'}),args:['--disable-gpu','--disable-gpu-compositing']});
 try{const page=await browser.newPage();for(const [id,asset] of Object.entries(manifest.images)){
  const url=new URL(asset.sourceUrl);if(url.protocol!=='https:'||url.hostname!=='cdn.gamestegy.com')throw Error('Unreviewed asset host: '+id);
  const file=path.join(destination,id+'.bin');if(fs.existsSync(file))continue;
  const response=await page.goto(url.href,{waitUntil:'load',timeout:30000});
  if(!response.ok()||!response.headers()['content-type']?.startsWith('image/'))throw Error('Source refused image '+id+'; stop rather than bypass access checks.');
  fs.writeFileSync(file,await response.body());console.log('Downloaded',id);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
