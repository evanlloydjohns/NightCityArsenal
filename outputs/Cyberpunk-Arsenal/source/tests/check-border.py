"""Optional development pixel check; requires Pillow, never used by the application."""
from PIL import Image
from pathlib import Path
import json
root=Path(__file__).resolve().parents[2]/'validation'/'sidebar-refinement'
checks=[]
for file in root.glob('border-dpr-*-zoom-*.png'):
 parts=file.stem.split('-');dpr=float(parts[2]);zoom=float(parts[4]);scale=dpr*zoom
 im=Image.open(file).convert('RGB');w,h=im.size;cut=10*scale
 # Look for the actual selected outline along the middle of the diagonal, safely
 # away from the horizontal/vertical edges. Antialiased pixels are accepted.
 hits=[]
 for y in range(max(1,int(h-cut-3*scale)),h-2):
  for x in range(max(1,int(w-cut-3*scale)),w-2):
   r,g,b=im.getpixel((x,y))
   if r>110 and g>110 and b<min(r,g)*.75:hits.append((x,y))
 # A rectangular outline clipped to a polygon has no colored pixels inside
 # this interior corner region. Require several rows along the new diagonal.
 assert len(set(y for x,y in hits))>=max(2,int(cut*.3)),file.name
 checks.append({'file':file.name,'diagonalBorderPixels':len(hits),'passed':len(hits)>0})
assert len(checks)==12,len(checks)
(root/'border-pixels.json').write_text(json.dumps(checks,indent=2))
assert all(x['passed'] for x in checks),checks
print('PASS: visible diagonal outline pixels in all 12 DPR/zoom combinations')
