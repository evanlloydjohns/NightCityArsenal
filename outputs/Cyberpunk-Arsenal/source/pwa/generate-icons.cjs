/* Development only: render the exact masthead SVG without changing its geometry. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=__dirname,template=fs.readFileSync(path.join(root,'../template.html'),'utf8');
const logo=template.match(/<svg class="brand-mark"[\s\S]*?<\/svg>/)[0];
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--disable-gpu']});
 try {
  fs.mkdirSync(path.join(root,'icons'),{recursive:true});
  const page=await browser.newPage({deviceScaleFactor:1});
  for(const [size,maskable] of [[16,false],[32,false],[48,false],[192,false],[512,false],[192,true],[512,true]]) {
   await page.setViewportSize({width:size,height:size});
   // The full original 4:3 mark fits inside a 70% square on maskable icons (safe circle).
   await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:#fcee0a}body{display:grid;place-items:center}svg{display:block;width:${maskable?70:94}%;height:auto}</style>${logo}`);
   await page.screenshot({path:path.join(root,'icons',`nc-${maskable?'maskable-':''}${size}.png`)});
  }
  fs.writeFileSync(path.join(root,'icons/nc.svg'),logo.replace('class="brand-mark"','xmlns="http://www.w3.org/2000/svg"'));
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
