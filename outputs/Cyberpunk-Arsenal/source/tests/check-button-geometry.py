"""Development-only pixel audit of actual rendered button families; needs Pillow."""
from pathlib import Path
from PIL import Image
import json,re,math
root=Path(__file__).resolve().parents[2]/'validation'/'performance-refinement'
cases=json.loads((root/'button-geometry.json').read_text())
checks=[]
for case in cases:
 im=Image.open(root/case['file']).convert('RGB');w,h=im.size;cut=case['cut']*case['dpr']*case['zoom'];opacity=case['opacity']
 rgb=lambda x:tuple(map(float,re.findall(r'[\d.]+',x)[:3]))
 outside=im.getpixel((w-1,h-1));edge=tuple(a*opacity+b*(1-opacity) for a,b in zip(rgb(case['edge']),outside));fill=tuple(a*opacity+b*(1-opacity) for a,b in zip(rgb(case['fill']),outside))
 dist=lambda x,y:sum((a-b)**2 for a,b in zip(x,y))
 points=[]
 for y in range(max(1,int(h-cut-3)),h-2):
  for x in range(max(1,int(w-cut-3)),w-2):
   color=im.getpixel((x,y))
   if dist(color,edge)<(dist(color,outside) if dist(fill,edge)<2 else min(dist(color,fill),dist(color,outside))) and max(abs(a-b) for a,b in zip(color,edge))<70:points.append((x,y))
 passed=len(set(y for x,y in points))>=2 and len(set(x for x,y in points))>=2
 checks.append({'file':case['file'],'diagonalPixels':len(points),'passed':passed})
assert len(checks)>=14,len(checks)
(root/'button-pixels.json').write_text(json.dumps(checks,indent=2))
assert all(x['passed'] for x in checks),checks
print('PASS: continuous diagonal pixels in all '+str(len(checks))+' actual button families')
