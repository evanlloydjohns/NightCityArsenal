"""Normalize cached public source extracts. Development only; no game stat simulation.
Usage: python source/tools/normalize-modifications.py path/to/mods-research
The cache is produced by public-page research; blocked sites are not bypassed.
"""
from pathlib import Path
import json,re,sys,hashlib
ROOT=Path(__file__).resolve().parents[1]
CACHE=Path(sys.argv[1]).resolve()
WEAPONS=json.loads((ROOT/'weapons.json').read_text(encoding='utf-8'))['weapons']
norm=lambda s:re.sub('[^a-z0-9]','',s.lower())
groups=json.loads((CACHE/'index.json').read_text())
aliases={'clearvue-mk-8':'clear-vue-mk-8','e255-percipient':'e-255-percipient','e305-prospecta':'e-305-prospecta','grandstand-mk-2x':'grandstand-mk-2-x','os-1-gimleteye':'os-1-gimlet-eye'}
pages={}
for file in [*CACHE.glob('single-*.txt'),*CACHE.glob('corrected-*.txt')]:
 s=file.read_text(encoding='utf-8');url=re.search(r'\((https://nukesdragons.com/cyberpunk-2077/db/mods/[^)]+)\)',s)
 lines=[re.sub(r'^L\d+:\s?','',x)for x in s.splitlines()if re.match(r'^L\d+:',x)]
 if url and any(x.startswith('# ')for x in lines):pages[url.group(1).split('/')[-1]]='\n'.join(lines)
grand=(CACHE/'grandstand-research.txt').read_text(encoding='utf-8');grand=grand[grand.index('# Grandstand Mk.2x'):];pages['grandstand-mk-2-x']=grand
wiki={}
for file in CACHE.glob('acquisition-*.txt'):
 s=file.read_text(encoding='utf-8');heads=list(re.finditer(r'^([^\n]+) \((https://cyberpunk.fandom.com/wiki/[^)]+)\)\n',s,re.M))
 for i,h in enumerate(heads):
  part=s[h.end():heads[i+1].start()if i+1<len(heads)else len(s)];title=re.search(r'^# ([^\n]+)',part,re.M)
  if title:wiki[norm(title.group(1))]={'text':part,'url':h.group(2)}
ndindex=ROOT.parents[2]/'work/nd-index.json';ndrows=json.loads(ndindex.read_text())if ndindex.exists()else[]
byname={}
for w in WEAPONS:
 for name in [w['name'],*w.get('aliases',[])]:byname[norm(name)]=w['id']
 for source in w['sources']:
  if 'nukesdragons.com'in source['url']:
   slug=source['url'].rstrip('/').split('/')[-1]
   for n in ndrows:
    if n['slug']==slug:byname[norm(n['name'])]=w['id']
known=sorted({w['id']for w in WEAPONS if any('nukesdragons.com'in s['url']for s in w['sources'])})
lookup={w['id']:w for w in WEAPONS}
out=[];problems=[]
for category,slugs in groups.items():
 for original in slugs:
  slug=aliases.get(original,original);text=pages.get(slug)
  if not text:raise ValueError('No source page: '+slug)
  name=re.search(r'^# (.+)',text,re.M).group(1).strip()
  tb=re.split(r'## (?:Used by|Fits)',text.split('## Tiers',1)[-1])[0]
  tier_effects={};table=[];table_tiers=[]
  for line in tb.splitlines():
   if '|'not in line:continue
   cells=[x.strip()for x in line.split('|')]
   if cells[0]=='Tier':table_tiers=cells[1:]
   elif cells[0]and not cells[0].startswith('---'):table.append(cells)
  for i,tier in enumerate(table_tiers):
   if tier not in '12345' or len(tier)!=1:continue
   fields=[{'label':row[0],'value':row[i+1]}for row in table if len(row)>i+1 and row[i+1]not in ['–','—','-','']]
   tier_effects[tier]={'summary':'','fields':fields}
  markers=list(re.finditer(r'^Tier ([1-5])\s*$',tb,re.M))
  for i,m in enumerate(markers):
   raw=tb[m.end():markers[i+1].start()if i+1<len(markers)else len(tb)].strip();raw=re.split(r'^## ',raw,flags=re.M)[0]
   tier=m.group(1);tier_effects.setdefault(tier,{'summary':'','fields':[]})
   # Older scope pages expose compact label/value lines rather than a table.
   if category in ['scopes','muzzles']and not tier_effects[tier]['fields']:
    for line in raw.splitlines():
     mm=re.match(r'^([A-Za-z][A-Za-z /]+?)([-+]\d+(?:\.\d+)?%?)$',line.strip())
     if mm:tier_effects[tier]['fields'].append({'label':mm.group(1).strip(),'value':mm.group(2)})
   else:
    summary=' '.join(x.strip()for x in raw.splitlines()if x.strip())
    summary=summary.replace('Neutralizing an enemy via headshot with a thrown weapon grants a','A thrown-weapon headshot kill grants a').replace('Performing a Sprint Attack allows you to perform','After a Sprint Attack, you can perform').replace('Each successful attack during this effect\'s duration gives','While active, each hit grants').replace('When an enemy is below','Against enemies below').replace('Makes the weapon non-lethal.','Non-lethal weapon behavior.').replace('Gives bonuses for headshot kills.','Successive headshot kills grant these bonuses.').replace('It won\'t guarantee a shot on target, but it will certainly help.','')
    tier_effects[tier]['summary']=summary
  if not tier_effects:raise ValueError('No published tier data: '+name)
  for tier,effect in tier_effects.items():
   if not effect['summary']:effect['summary']='; '.join(f"{x['label']}: {x['value']}"for x in effect['fields'])
  fitsblock=re.split(r'## (?:Used by|Fits)',text)[-1];fitsblock=re.split(r'\n(?:C77|Explore|more on)',fitsblock)[0]
  rawfits=re.findall(r'【\d+†([^】]+)】',fitsblock);mapped=[];outside=[]
  for fit in rawfits:
   # Remove classification and displayed weapon stats; only identity is imported.
   title=re.split(r' (?:Power|Tech|Smart|Blade|Blunt|Throwable|Melee|Throwing) ',fit)[0]
   if norm(title)in byname:mapped.append(byname[norm(title)])
   else:outside.append(title)
  if slug=='grandstand-mk-2-x':
   # The mod page's cached search text loses anchors. Use explicit inverse weapon-page links.
   for row in ndrows:
    file=ROOT.parents[2]/'work/cache'/('nd-'+row['slug']+'.html')
    if file.exists()and '/db/mods/'+slug+'"'in file.read_text(encoding='utf-8'):
     if norm(row['name'])in byname:mapped.append(byname[norm(row['name'])])
     else:outside.append(row['name'])
  mapped=sorted(set(mapped));outside=sorted(set(outside));declared=re.search(r'It fits .*?(\d+) weapons',text)
  complete=bool(mapped)and(not declared or len(mapped)+len(outside)==int(declared.group(1)))
  if not complete:problems.append({'mod':name,'declaredCount':int(declared.group(1))if declared else None,'mapped':len(mapped),'outside':outside})
  wk=wiki.get(norm(name))or wiki.get(norm('Mk.2x Grandstand')if'grandstand'in slug else '')
  primary='https://nukesdragons.com/cyberpunk-2077/db/mods/'+slug
  sources=[{'name':'Nukes & Dragons — tiers and individual compatibility','url':primary}]
  acq=[];gameids=[];content='Not verified';notes=['Community source values; individual behavior has not been tested in patch 2.5.','Raw structured fields can use internal conventions or conflict with prose (notably reload speed/time); effects remain separate and are never applied to weapon stats.']
  if wk:
   sources.append({'name':'Cyberpunk Wiki — acquisition and cross-check','url':wk['url']})
   match=re.search(r'^## Acquisition\[\]\s*$(.*?)(?:\n## |\nv · d · e|\Z)',wk['text'],re.S|re.M)
   if match:
    for line in match.group(1).splitlines():
     line=line.strip().lstrip('*').strip()
     if not line:continue
     line=line.replace('Can be purchased from','Sold by').replace('Can sometimes be purchased from','May appear in stock at').replace('Can be contained in Airdrops.','Random airdrop loot; not guaranteed.').replace('can sometimes be present at Weapon Vendors','may appear in randomized weapon-vendor stock').replace('can be contained in Airdrops','can appear in randomized airdrop loot')
     if len(line)<700:
      methods=[k for k,pattern in [('Vendor','vendor|sold|purchas'),('Random','airdrop|random|loot|enemies'),('Crafting','craft|identical'),('Guaranteed','reward|quest|found in|obtained during')]if re.search(pattern,line,re.I)]or['Unknown']
      if 'cannot be purchased or looted'in line.lower():methods=['Pre-installed']
      if 'Random'in methods and 'Guaranteed'in methods:methods.remove('Guaranteed')
      acq.append({'methods':methods,'text':line})
   content='Phantom Liberty'if re.search(r'is a [^.]+Cyberpunk 2077: Phantom Liberty',wk['text'])else'Base game'
   base=re.search(r'BaseID\n---\n(.*?)(?:\n[^`\n]* is |\n## )',wk['text'],re.S)
   if base:gameids=[line.strip()for block in re.findall(r'`([^`]+)`',base.group(1))for line in block.splitlines()if re.fullmatch(r'[A-Za-z0-9_]+',line.strip())]
  iconic=slug in ['firecracker','wallpuncher','hackatomy','severance']
  if iconic:
   content='Phantom Liberty';acq=[{'methods':['Crafting','Guaranteed'],'text':'Craft one of the four iconic mods with the single Active Chimera Core taken after the Chimera fight during Lucretia My Reflection. Consumes the core; this is a choice, not four guaranteed mods.'}]
   sources.append({'name':'Cyberpunk Wiki — Active Chimera Core','url':'https://cyberpunk.fandom.com/wiki/Active_Chimera_Core'})
   notes.append('This iconic modification can be removed; its core is a one-per-playthrough resource under normal acquisition.')
  if not acq:acq=[{'methods':['Unknown'],'text':'A reliable item-specific acquisition route was not verified. Consult the linked sources; no vendor stock or drop is guaranteed here.'}]
  if category in ['ranged','melee']and not iconic and len(tier_effects)>1:
   acq.append({'methods':['Crafting'],'text':'The general modification recipe combines two identical mods of the same tier into the next tier, where that higher tier exists. Specific components and stock are not simulated.'})
  if any('airdrop'in a['text'].lower()or 'Just Another Story'in a['text']for a in acq):notes.append('Dogtown airdrops and Just Another Story acquisition routes require Phantom Liberty; this does not imply every tier of the item is expansion-exclusive.')
  if slug=='e-305-prospecta':
   tier_effects['5']={'summary':'Wiki Tier 5 reference: +3.25 additional zoom, -35% weapon sway and 25% lower charge requirement for a fully charged shot. This tier is absent from the N&D table.','fields':[{'label':'Additional zoom','value':'+3.25'},{'label':'Weapon sway','value':'-35%'},{'label':'Full-charge requirement','value':'-25%'}]}
   notes.append('Tier 5 is separately sourced from the Wiki; N&D publishes only tiers 1-4. No interpolation or internal-field conversion was used.')
  if slug=='gaki'and'5'in tier_effects:
   tier_effects['5']['summary']+='; Wiki additionally describes 50% reduced full-shot charge time. This is preserved as a cross-source statement, not a conversion of the structured +25 field.'
   notes.append('Charge behavior has different descriptions across sources; neither is independently certified for 2.5.')
  if slug=='xc-10-cetus'and'5'in tier_effects:
   tier_effects['5']['summary']+='; while undetected, headshots have guaranteed critical hits (Wiki cross-check; omitted from the structured table).'
  if category=='scopes':cat='Scope';kind='scope'
  elif category=='muzzles':cat='Silencer'if not slug.startswith('rc-7')else'Muzzle brake';kind='muzzle'
  elif original in ['boomerang','javelin','zero-g']:cat='Throwable mod';kind='mod'
  else:cat='Ranged mod'if category=='ranged'else'Melee mod';kind='mod'
  effect_text=' '.join(e['summary']for e in tier_effects.values()).lower()
  effects=[k for k,pat in [('Damage',r'damage|explosive'),('Critical',r'crit'),('Handling',r'handling|sway|stamina|aim|swap'),('Recoil',r'recoil'),('Accuracy',r'spread|reticle|homing|target'),('Magazine',r'magazine|ammo capacity'),('Reload',r'reload|refill'),('Stealth',r'stealth|undetected|non-lethal'),('Ricochet',r'ricochet'),('Armor penetration',r'armor|cover'),('Status effects',r'burn|bleed|emp|quickhack|knock|stun'),('Conditional',r'when|while|after|against|chance|headshot|charged')]if re.search(pat,effect_text)]
  out.append({'id':'mod.'+original,'name':name,'gameIds':gameids,'category':cat,'slotKind':kind,'iconic':iconic,'uniqueGroup':'chimera-core'if iconic else None,'content':content,'tiers':sorted(tier_effects,key=int),'tierEffects':tier_effects,'compatibleWeaponIds':mapped,'outsideCatalogWeapons':outside,'compatibilityComplete':complete,'classes':sorted({lookup[i]['class']for i in mapped}),'technologies':sorted({lookup[i]['technology']for i in mapped}),'effectCategories':effects or['Special'],'acquisition':acq,'sources':sources,'verificationNotes':notes,'image':None,'imageStatus':'Original category glyph; no item-specific image was available from the accessible primary pages.'})
assert len(out)==71 and len({x['id']for x in out})==71
meta={'schemaVersion':1,'dataVersion':'2026.10.26-mods-r1','targetPatch':'2.5','researchedAt':'2026-10-26','recordCount':len(out),'advertisedSourceCount':74,'sourceInventoryCount':71,'status':'Community-reference coverage; no individual 2.5 in-game certification.','inventoryNote':'Nukes & Dragons advertises 74 but lists 31 ranged (including three throwable), 10 melee, 16 scopes and 14 muzzles: 71 distinct names. The Wiki navigation independently contains the same 71. Three additional named records could not be identified; no invented records are included.','rulesSource':'https://cyberpunk.fandom.com/wiki/Cyberpunk_2077_Attachments_and_Modifications','patchSource':'https://www.cyberpunk.net/en/news/52120/check-out-whats-coming-to-night-city-in-the-edgerunners-2-update-for-cyberpunk-2077/'}
meta['knownWeaponIds']=known
meta['fixedAttachments']={
 'Items.Preset_Lexington_Shooting_Competition':{'scope':{'name':'ClearVue Mk.8 factory scope','status':'fixed','source':'https://cyberpunk.fandom.com/wiki/Lexington_x-MOD2'}},
 'Items.Preset_Overture_Dante':{'scope':{'name':'Type 2067 factory scope','status':'fixed','source':'https://cyberpunk.fandom.com/wiki/Ol%27_Reliable'}},
 'Items.Preset_Kenshin_Spy':{'scope':{'name':'Unique Zetatech factory scope','status':'fixed','source':'https://cyberpunk.fandom.com/wiki/Ambition'}},
 'Items.Preset_Lexington_Rook':{'scope':{'name':'Grandstand factory scope','status':'fixed','source':'https://cyberpunk.fandom.com/wiki/Rook'},'muzzle':{'name':'XC-10 Strix factory silencer','status':'fixed','source':'https://cyberpunk.fandom.com/wiki/Rook'}},
 'Items.Preset_Tactician_Headsman':{'scope':{'name':'Dedicated factory scope','status':'unverified','source':'https://nukesdragons.com/cyberpunk-2077/db/weapons/the-headsman'}}
}
(ROOT/'modifications.json').write_text(json.dumps({'meta':meta,'modifications':sorted(out,key=lambda m:m['name'].lower())},indent=2,ensure_ascii=False),encoding='utf-8')
(CACHE/'normalization-report.json').write_text(json.dumps({'count':len(out),'compatibilityGaps':problems,'unknownAcquisition':[m['name']for m in out if m['acquisition'][0]['methods']==['Unknown']],'wikiMatches':sum(len(m['sources'])>1 for m in out),'categories':{c:sum(m['category']==c for m in out)for c in sorted({m['category']for m in out})}},indent=2),encoding='utf-8')
print((CACHE/'normalization-report.json').read_text())
