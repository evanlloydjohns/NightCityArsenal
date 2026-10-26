"""Normalize source slot IDs and published tier counts without inferring capacity."""
TIER_NAMES={'Common':'1','Uncommon':'2','Rare':'3','Epic':'4','Legendary':'5','Legendary+':'5+','Legendary++':'5++'}
def normalize_slots(equipment):
    groups=[]
    for source in equipment.get('modSlots') or []:
        ids=source.get('slots',[])
        if ids and all(i=='Scope' for i in ids):kind,label='scope','Scope'
        elif ids and all(i=='PowerModule' for i in ids):kind,label='muzzle','Muzzle'
        elif ids and all('WeaponMod' in i for i in ids):
            prefix=ids[0].split('_')[0]
            kind={'Tech':'tech-mod','Smart':'smart-mod','Power':'normal-mod','Blade':'melee-mod','Blunt':'melee-mod','Throwable':'throwable-mod'}.get(prefix,'normal-mod')
            label='Weapon mod'
        else:raise ValueError('Unrecognized slot IDs: '+repr(ids))
        group={'type':label,'kind':kind,'count':source.get('count',len(ids)),'sourceSlots':ids,'conditions':source.get('conditions',[])}
        if 'countByTier' in source:group['countByTier']={TIER_NAMES[k]:v for k,v in source['countByTier'].items() if k in TIER_NAMES}
        groups.append(group)
    return groups
