from slot_data import normalize_slots
import json,re,sys,os
from pathlib import Path
ROOT=Path(os.environ["ARSENAL_RESEARCH_CACHE"])
OUT=Path(os.environ["ARSENAL_STAGING_DIR"])
OUT.mkdir(parents=True,exist_ok=True)
def load(name):return json.loads((ROOT/name).read_text(encoding='utf-8'))
def norm(t):
    t=re.sub(r'\s*\((?:Prototype|Iconic|Bunker)\)','',t,flags=re.I)
    return re.sub('[^a-z0-9]','',t.lower())
def canonical(t):
    t=re.sub(r'\s*\((?:Prototype|Iconic|Bunker)\)','',t,flags=re.I)
    return {'Gold-plated baseball bat':'Gold-Plated Baseball Bat'}.get(t,t)
TIERS={'1':'Common','2':'Uncommon','3':'Rare','4':'Epic','5':'Legendary','5+':'Legendary+','5++':'Legendary++'}
v={norm(x['name']):x for x in load('vaexil.json')}
n={norm(x['name']):x for x in load('nd-records.json')}
gi={x['slug']:x for x in load('g-index.json')}
effects=load('effects.json')
# These manufacturer associations were checked on individual Games Lantern pages.
manufacturers={'liberty':('Constitutional Arms','liberty'),'unity':('Constitutional Arms','unity'),'nue':('Tsunami','nue'),'overture':('Malorian','overture'),'m10aflexington':('Militech','m-10af-lexington'),'ha4grit':('Hansen Armory','ha-4-grit'),'malorianarms3516':('Malorian','malorian-arms-3516')}
manufacturers.update({'ticon':('Militech','militech-ticon'),'m76eomaha':('Militech','militech-ticon'),'jkex2kenshin':('Arasaka','militech-ticon'),'a22bchao':('Kang Tao','kappa'),'hjke11yukimura':('Arasaka','kappa'),'carnage':('Budget Arms','carnage'),'crusher':('Militech','crusher'),'m2038tactician':('Constitutional Arms','carnage'),'vst37pozhar':('Techtronika','carnage'),'m251sajax':('Militech','kyubi'),'d5copperhead':('Nokota','kyubi'),'hjsh18masamune':('Arasaka','kyubi')})
manufacturers.update({'rt46burya':('Techtronika','burya'),'dr12quasar':('Darra Polytechnic','quasar'),'dr5nova':('Darra Polytechnic','nova'),'ds1pulsar':('Darra Polytechnic','pulsar'),'m221saratoga':('Militech','saratoga'),'g58dian':('Kang Tao','dian'),'tki20shingen':('Arasaka','shingen'),'spt32grad':('Techtronika','grad'),'m179achilles':('Militech','achilles'),'m179eachilles':('Militech','achilles'),'nekomata':('Tsunami','nekomata'),'ashura':('Tsunami','ashura'),'db4igla':('Rostović','igla'),'db2testera':('Rostović','testera'),'db4palica':('Rostović','palica'),'metel':('Techtronika','metel'),'senkohlx':('Arasaka','senkoh-lx')})
def choose(s,by,key,tier):
    if key in by:return by[key].get(TIERS.get(tier))
    return s.get(key)
def stats_for(d,tier):
    s=d.get('summary',{});by=d.get('summaryByTier',{});out={}
    fields={'damage':'damagePerProjectile','dps':'baseDps','speed':'attacksPerSecond','magazine':'magazine','reload':'reloadTime','range':'effectiveRange','stamina':'staminaCost','returnTime':'returnTime','projectiles':'projectilesPerShot','headshot':'headshotDamageBonus'}
    for field,key in fields.items():
        val=choose(s,by,key,tier)
        if isinstance(val,(int,float)) and not isinstance(val,bool):out[field]=round(val*(100 if field=='headshot' else 1),5)
    for group in d.get('stats',{}).values():
        if not isinstance(group,list):continue
        for rec in group:
            key={'Ignore armor':'armor','Crit chance':'critChance','Crit damage':'critDamage','Stamina cost to block':'blockStamina','Bleed chance':'bleed','Poison chance':'poison','Burn chance':'burn','Shock chance':'shock','Charge time':'charge','Full charge damage multiplier':'chargeMultiplier'}.get(rec.get('label'))
            if not key:continue
            val=rec.get('byTier',{}).get(TIERS.get(tier)) if 'byTier' in rec else rec.get('value')
            if isinstance(val,(int,float)) and not isinstance(val,bool):out[key]=round(val*(100 if key in ['armor','critChance','critDamage'] else 1),5)
    return out
def nd_profile(nd):
    out={}
    for tier,nums in nd['tiers'].items():
        vals={**nums}
        for src,key in [('Attack Speed','speed'),('Headshot Bonus','headshot'),('Magazine','magazine'),('Reload Time','reload'),('Projectiles','projectiles')]:
            if nd['stats'].get(src) is not None:vals[key]=nd['stats'][src]
        # Source's single stamina figure is only shown at its observed Tier 5.
        if tier=='5' and 'Stamina Cost' in nd['stats']:vals['stamina']=nd['stats']['Stamina Cost']
        out[tier]=vals
    return out
weapons=[]
for entry in load('g-records.json'):
    index=gi.get(entry['slug'])
    if index is None:
        index=next((x for x in gi.values() if x['id']==entry['id']),None)
    # One old DR12 Quasar URL redirects to a legacy article with no equipment payload.
    if index is None and entry['title']=='DR12 Quasar':index=next(x for x in gi.values() if 'quasar' in x['slug'])
    assert index is not None,entry['title']
    name=canonical(index['title']);d=entry.get('cp2077_equipment_data') or {};iconic=index['is_iconic']
    if name in ['Knuckles','AR Raygun Supreme 9000'] or not d:continue
    va=v.get(norm(name));nd=n.get(norm(name))
    base=va['baseModel'] if va else ('RT-46 Burya' if name=='Coronation' else 'Unique sword' if name=='Sihil' else name)
    gclass=d.get('weaponClass') or index['category_name']
    cls={'Pistols':'Pistol','Handgun':'Pistol','Submachine Guns':'Submachine Gun','Precision Rifles':'Precision Rifle','Sniper Rifles':'Sniper Rifle','SubmachineGun':'Submachine Gun','PrecisionRifle':'Precision Rifle','SniperRifle':'Sniper Rifle','Rifle':'Assault Rifle','ShotgunDual':'Shotgun','LightMachineGun':'Light Machine Gun','OneHandedClub':'One-Handed Club','TwoHandedClub':'Two-Handed Club','LongBlade':'Cleaver'}.get(gclass,gclass)
    tech=d.get('evolution') or index.get('evolution') or 'Unknown'
    group='Throwable' if tech=='Throwable' else 'Melee' if tech in ['Blade','Blunt'] else 'Firearm'
    maker='Unknown';makerSource=None;makerStatus='Not verified'
    for model,(man,slug) in manufacturers.items():
        if model in norm(base) or model==norm(name):maker=man;makerSource='https://cyberpunk.gameslantern.com/weapons/'+slug;makerStatus='Model-family attribution (Games Lantern 2.3)';break
    if maker=='Unknown':
        for brand in ['Arasaka','Militech','Tsunami','Techtronika','Kang Tao','Nokota','Darra Polytechnic','Constitutional Arms','Rostovic','Budget Arms','Midnight Arms','Malorian']:
            if brand.lower() in base.lower():maker=brand;makerSource='https://cyberpunk.vaexil.tv/weapons/'+va['slug'] if va else None;makerStatus='Named in model reference (2.31)';break
    content=va['content'] if va else 'Base Game' if name in ['Coronation','Sihil','Boar Carver'] else 'Unknown'
    if content=='Account Reward':content='Rewards'
    sources=[{'name':'Gamestegy · detailed records','url':'https://gamestegy.com/cyberpunk-2077/wiki/'+str(index['id'])+'/'+index['slug'],'role':'Identity, tier records, effects and attachment slots','patch':'2.5 additions; existing records not individually patch-certified'}]
    if nd:sources.append({'name':'Nukes & Dragons · numerical reference','url':nd['url'],'role':'Published damage, DPS and 11-tier grid','patch':'Unspecified by source'})
    if va:sources.append({'name':'Vaexil · acquisition reference','url':'https://cyberpunk.vaexil.tv/weapons/'+va['slug'],'role':'Inventory, base model, quest and availability','patch':'2.31; not walked in game by source author'})
    if makerSource:sources.append({'name':'Manufacturer reference','url':makerSource,'role':makerStatus,'patch':'Older source; identity reference'})
    warnings=['Community source records; not independently measured in an unmodified 2.5 game.']
    if name=='Widow Maker':warnings.append('Unresolved source conflict: the detailed record has 5 projectiles and Physical base damage, while the iconic text describes two Chemical projectiles. These are displayed separately without a guessed correction.')
    if name=='Skippy':warnings.append('AI mode, quest state and level scaling can change behavior; a tier-only comparison is incomplete.')
    if name in ['La Chingona Dorada','Yasha']:warnings.append('Effect differs from the 2.31 acquisition reference. The newer detailed source is used; the updated effect has not been tested in game.')
    if name in ['Crowbar',"Caretaker's Spade"]:warnings.append('No separate iconic combat ability verified. The source provides only flavor text.')
    if name in ['Coronation','Sihil']:warnings.append('Added in 2.5, independently cross-checked with recent guides; numerical data has one detailed source.')
    if not d:warnings.append('Detailed equipment payload unavailable; switch to Nukes & Dragons for the numerical reference where present.')
    acquisition={}
    if va:
        acquisition={k:va[k] for k in ['quest','district','sourceType','hint','missRisk','needs','eitherOr','blackMarketBackup','endingRoute','lifepath','pickUpBefore','ifMissed','storyPhase']}
    elif name=='Coronation':
        acquisition={'quest':'Clampdown','district':'Night City Prison','sourceType':'Quest pickup','hint':"Take King's smuggled package from the prison bathroom after leaving the cell; keep the revolver after the job.",'missRisk':'Choice-locked','needs':'Update 2.5; The Heist completed and two Wakako gigs','pickUpBefore':'Before failing or leaving Clampdown','ifMissed':'No alternate acquisition verified','storyPhase':'Act 2','endingRoute':'No','lifepath':'Any'}
        sources.append({'name':'The Click · 2.5 acquisition cross-check','url':'https://www.theclick.gg/cyberpunk-2077-coronation-revolver/','role':'Independent new-weapon confirmation','patch':'2.5'})
    elif name in ['Sihil','Boar Carver']:
        acquisition={'quest':"Ariadne's messages",'district':'Megabuilding H10','sourceType':'Message reward','hint':"Reply to Ariadne rather than sending her to spam. Her package arrives by the H10 apartment entrance roughly one game day later.",'missRisk':'Choice-locked','needs':'Update 2.5','pickUpBefore':'Do not end the message thread','ifMissed':'Recovery not verified','storyPhase':'Unknown','endingRoute':'No','lifepath':'Any'}
        if name=='Sihil':sources.append({'name':'GamingBolt · 2.5 content cross-check','url':'https://gamingbolt.com/cyberpunk-2077-update-2-5-adds-5-new-items-from-the-witcher-3-and-a-halo-2-inspired-pose','role':'Independent new-weapon confirmation','patch':'2.5'})
    else:acquisition={'hint':'See the linked source for acquisition. No route was normalized for this optional non-iconic record.','missRisk':'Unknown','quest':'Unknown','district':'Unknown','sourceType':'Unknown'}
    effect=effects.get(name)
    if iconic and 'x-MOD2' in name:effect='A mod-focused iconic variant with additional modification capacity and improved handling. Installed mods determine its additional combat effects; no separate triggered perk is assumed.'
    assert not iconic or effect, name
    profiles={'records':{'tiers':{tier:stats_for(d,tier) for tier in TIERS} if d else {},'source':'Gamestegy','patch':'2.5' if name in ['Coronation','Sihil'] else 'Not individually verified for 2.5','damageBasis':'Per projectile / melee hit','dpsBasis':'Source base-DPS record, not sustained or build-adjusted DPS'}}
    if nd:profiles['nd']={'tiers':nd_profile(nd),'source':'Nukes & Dragons','patch':'Unspecified; not individually verified for 2.5','damageBasis':'Damage as displayed by this source (may aggregate projectiles)','dpsBasis':'DPS published by this source; formula not reimplemented'}
    slots=normalize_slots(d)
    dual='Eligible class' if tech=='Power' and cls in ['Pistol','Revolver'] else 'Outside eligible classes'
    weapons.append({'id':entry.get('cp2077_equipment_game_entity_id') or index.get('tooltipId') or 'local:'+index['slug'],'slug':index['slug'],'name':name,'aliases':list(set([index['title'],va['name'] if va else name])), 'iconic':iconic,'class':cls,'subclass':index['category_name'],'technology':tech,'group':group,'manufacturer':maker,'manufacturerStatus':makerStatus,'baseModel':base,'content':content,'addedIn':d.get('addedIn'),'damageType':d.get('summary',{}).get('damageType','Unknown'),'effect':effect,'effectStatus':'No separate combat ability verified' if name in ['Crowbar',"Caretaker's Spade"] else 'Source-based paraphrase; 2.5 behavior not measured' if iconic else 'Not iconic','acquisition':acquisition,'slots':slots if d else None,'profiles':profiles,'dualWield':dual,'dualWieldStatus':'Class-level inference from official 2.5 restriction; individual exceptions untested','updatedAt':entry.get('updated'),'sources':sources,'warnings':warnings})
weapons.sort(key=lambda x:x['name'].lower())
meta={'title':'Night City Arsenal','datasetVersion':'2026.10.25-r2','researchedOn':'2026-10-25','targetPatch':'2.5','patchRelease':'2026-10-22','iconicCount':sum(x['iconic'] for x in weapons),'totalCount':len(weapons),'verification':'Inventory reconciled; existing per-weapon 2.5 statistics and effects not independently game-tested','tiers':['1','1+','2','2+','3','3+','4','4+','5','5+','5++'],'sources':[{'name':'Official 2.5 patch notes','url':'https://www.cyberpunk.net/en/news/52120/check-out-whats-coming-to-night-city-in-the-edgerunners-2-update-for-cyberpunk-2077/'},{'name':'Official release confirmation','url':'https://www.cyberpunk.net/index.php/en/news/52125/cyberpunk-2077s-edgerunners-2-update-2-5-is-out-now'},{'name':'Gamestegy 2.5 additions','url':'https://gamestegy.com/cyberpunk-2077/wiki/patch-2-5'},{'name':'Nukes & Dragons inventory','url':'https://nukesdragons.com/cyberpunk-2077/db/weapons'},{'name':'Vaexil 2.31 inventory','url':'https://cyberpunk.vaexil.tv/weapons'},{'name':'Games Lantern 2.3 reference','url':'https://cyberpunk.gameslantern.com/weapons'}]}
dataset={'meta':meta,'weapons':weapons}
(OUT/'weapons.json').write_text(json.dumps(dataset,ensure_ascii=False,indent=2),encoding='utf-8')
audit={'counts':meta,'canonicalIconics':[{'id':x['id'],'name':x['name'],'sources':[s['url'] for s in x['sources']]} for x in weapons if x['iconic']],'vaexilUnmatched':[x['name'] for k,x in v.items() if not any(norm(w['name'])==k for w in weapons)],'ndUnmatched':[x['name'] for k,x in n.items() if x['iconic'] and not any(norm(w['name'])==k for w in weapons)],'unknownManufacturers':[x['name'] for x in weapons if x['manufacturer']=='Unknown'],'separateAbilityUnverified':[x['name'] for x in weapons if x['effectStatus']=='No separate combat ability verified']}
(ROOT/'audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
print('Normalized',meta['totalCount'],'weapons;',meta['iconicCount'],'iconics; unmatched V/ND',audit['vaexilUnmatched'],audit['ndUnmatched']);print('unknown maker',len(audit['unknownManufacturers'])); print('classes',sorted(set(x['class'] for x in weapons)))
