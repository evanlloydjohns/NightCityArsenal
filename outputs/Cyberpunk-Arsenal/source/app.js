'use strict';
(() => {
  const DB = JSON.parse(document.getElementById('weapon-data').textContent);
  const WEAPONS = DB.weapons, META = DB.meta;
  const BY_ID = new Map(WEAPONS.map(w => [w.id, w]));
  const KEY = 'night-city-arsenal.v1';
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalize = text => String(text ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const validNumber = value => typeof value === 'number' && Number.isFinite(value);
  const numberFormatter=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
  const formatNumber=n=>numberFormatter.format(n);
  const defaults = {query:'', iconic:'iconic', content:[], group:[], class:[], technology:[], manufacturer:[], damageType:[], missable:[], dual:false, new:false, sort:'name', direction:'asc', tier:'5++', profile:'records', view:'cards', sidebarCollapsed:false, openFilters:[], favorites:[], compare:[], differences:true};
  const filterKeys = ['iconic','content','group','class','technology','manufacturer','damageType','missable','dual','new'];
  const multiKeys=['content','group','class','technology','manufacturer','damageType','missable'];
  const filterNames={content:'Content source',group:'Weapon family',class:'Weapon class',technology:'Technology / action',manufacturer:'Manufacturer',damageType:'Base damage type',missable:'Availability'};
  const emptyFilterLabels={content:'All content',group:'All families',class:'All classes',technology:'All technologies',manufacturer:'All manufacturers',damageType:'All damage types',missable:'Any availability'};
  const riskOptions={missable:'Missable / limited',safe:'Safe to revisit',recoverable:'Recoverable',unavailable:'No longer available',unknown:'Unknown'};
  const freshDefaults=()=>JSON.parse(JSON.stringify(defaults));
  const valuesFor=(s,key)=>Array.isArray(s[key])?s[key]:s[key]?[s[key]]:[];
  let storageAvailable = true, currentView = 'arsenal', detailId = null, detailOpener = null, toastTimer;
  function sanitize(raw) {
    const s = freshDefaults();
    if (!raw || typeof raw !== 'object') return s;
    if(Array.isArray(raw.openFilters))s.openFilters=[...new Set(raw.openFilters.filter(k=>multiKeys.includes(k)))];
    if(typeof raw.query==='string')s.query=raw.query.slice(0,500);
    for(const key of multiKeys){const allowed=key==='missable'?Object.keys(riskOptions):WEAPONS.map(w=>w[key]);s[key]=[...new Set(valuesFor(raw,key).filter(v=>typeof v==='string'&&allowed.includes(v)))];}
    for (const key of ['dual','new','differences','sidebarCollapsed']) if (typeof raw[key] === 'boolean') s[key] = raw[key];
    for (const key of ['favorites','compare']) if (Array.isArray(raw[key])) s[key] = [...new Set(raw[key].filter(id => typeof id === 'string' && BY_ID.has(id)))].slice(0,key === 'compare' ? 4 : WEAPONS.length);
    for (const [key,allowed] of Object.entries({sort:['name','itemType','damage','dps','speed','magazine','reload','range','stamina','returnTime'],direction:['asc','desc'],tier:META.tiers,profile:['records','nd'],view:['cards','table'],iconic:['iconic','normal','all']})) if (allowed.includes(raw[key])) s[key] = raw[key];
    return s;
  }
  let state;
  try { state = sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { state = freshDefaults(); storageAvailable = false; }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageAvailable = false; }
  }
  function toast(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
    toastTimer = setTimeout(() => {$('toast').hidden = true;}, 4000);
  }
  function stats(w, s = state) { return w.profiles[s.profile]?.tiers[s.tier] || {}; }
  function applicable(w, key) {
    if (['magazine','reload','projectiles','charge','chargeMultiplier'].includes(key)) return w.group === 'Firearm' && (!['charge','chargeMultiplier'].includes(key) || w.technology === 'Tech');
    if (['stamina','blockStamina'].includes(key)) return w.group !== 'Firearm';
    if (key === 'returnTime') return w.group === 'Throwable';
    if (key === 'headshot') return w.group !== 'Melee';
    return true;
  }
  const statDefs = [
    ['damage','Damage', '',true], ['dps','DPS (source)','',true], ['speed','Attack speed','/s',true], ['magazine','Magazine','',true], ['reload','Reload time',' s',false], ['range','Effective range',' m',true], ['headshot','Headshot bonus','%',true], ['armor','Armor penetration','%',true], ['critChance','Critical-hit chance','%',true], ['critDamage','Critical damage','%',true], ['stamina','Attack stamina','',false], ['blockStamina','Block stamina','',false], ['returnTime','Throw return time',' s',false], ['projectiles','Projectiles / shot','',true], ['charge','Charge time',' s',false], ['chargeMultiplier','Charge multiplier','×',true], ['bleed','Bleed chance','%',true], ['poison','Poison chance','%',true], ['burn','Burn chance','%',true], ['shock','Shock chance','%',true]
  ];
  const statMap = new Map(statDefs.map(x=>[x[0],x]));
  function statLabel(key) {
    if (key === 'damage') return state.profile === 'records' ? 'Damage / projectile or hit' : 'Damage (source)';
    if (key === 'dps') return state.profile === 'records' ? 'DPS · game record' : 'DPS · published';
    return statMap.get(key)?.[1] || key;
  }
  function valueText(w,key,s=state) {
    if (!applicable(w,key)) return 'N/A';
    const n = stats(w,s)[key];
    if (!validNumber(n)) return 'Unknown';
    return (key==='headshot' && n>=0 ? '+' : '') + formatNumber(n) + (statMap.get(key)?.[2] || '');
  }
  const slotLabels={'normal-mod':'Weapon mod','tech-mod':'Tech mod','smart-mod':'Smart mod','melee-mod':'Melee mod','throwable-mod':'Throwable mod',scope:'Scope attachment',muzzle:'Muzzle attachment'};
  function slotGlyph(kind){
    const chip='<rect x="7" y="7" width="18" height="18" rx="2"/><path d="M11 3v4m5-4v4m5-4v4M11 25v4m5-4v4m5-4v4M3 11h4m-4 5h4m-4 5h4M25 11h4m-4 5h4m-4 5h4"/>';
    const paths={
      'normal-mod':chip+'<rect x="12" y="12" width="8" height="8"/>',
      'tech-mod':chip+'<path d="m18 10-7 8h5l-1 5 7-10h-5z" fill="currentColor" stroke="none"/>',
      'smart-mod':chip+'<circle cx="16" cy="16" r="4"/><path d="M16 9v3m0 8v3M9 16h3m8 0h3"/>',
      'melee-mod':chip+'<path d="m12 20 9-9-1 6-5 5m-4-6 6 6"/>',
      'throwable-mod':chip+'<path d="m11 21 9-11 1 6-8 7m-3-6 5 5"/>',
      scope:'<path d="M3 12h5V9h15v3h6v9h-6v3H8v-3H3zM8 12v9m15-9v9M12 24v4m8-4v4"/><path d="M12 16h8m-4-4v8"/>',
      muzzle:'<path d="M3 11h6V8h18v16H9v-3H3zM9 11v10m5-9v8m5-8v8m4-8v8M27 11h3m-3 10h3"/>'
    };
    return `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="round">${paths[kind]||paths['normal-mod']}</svg>`;
  }
  function slotGroups(w,tier=state.tier){
    if(!Array.isArray(w.slots))return null;
    return w.slots.map(group=>({...group,available:group.countByTier?group.countByTier[tier]??null:group.count}));
  }
  function slotIcons(w,tier=state.tier){
    const groups=slotGroups(w,tier);
    if(!groups)return '<span class="slot-empty">Slots unknown</span>';
    if(!groups.length)return '<span class="slot-empty">No slots listed</span>';
    const tokens=groups.map(group=>{
      if(group.available===null)return `<span class="slot-unknown" title="The slot reference has no published count at Tier ${escape(tier)}">${group.type==='Weapon mod'?'Mod':'Attachment'} slots unknown</span>`;
      const kind=group.kind,label=slotLabels[kind]||group.type;
      return Array.from({length:group.available},()=>`<span class="slot-token slot-${kind}" data-slot-kind="${kind}" title="${escape(label)} slot · Tier ${escape(tier)} capacity · Gamestegy reference" role="img" aria-label="${escape(label)} slot">${slotGlyph(kind)}</span>`).join('');
    }).join('');
    return tokens?`<span class="slot-icons" aria-label="Supported mod and attachment slots at Tier ${escape(tier)}">${tokens}</span>`:'<span class="slot-empty">No slots at this tier</span>';
  }
  function slotLegend(){return `<details class="slot-legend"><summary>Slot icon key</summary><div>${Object.entries(slotLabels).map(([kind,label])=>`<span><i class="slot-token slot-${kind}">${slotGlyph(kind)}</i>${label}</span>`).join('')}</div><p>One icon per supported slot at the shared tier. This shows capacity, not whether a found weapon’s slots are already occupied. Slot data uses the detailed reference in either stats mode; unknown tier counts are labeled.</p></details>`;}
  function syncMultiFilters(){
    for(const key of multiKeys){
      const node=$('filter-'+key);if(!node)continue;const selected=valuesFor(state,key),label=v=>key==='missable'?riskOptions[v]:v;
      node.querySelector('.multi-summary').textContent=selected.length?selected.map(label).join(' + '):emptyFilterLabels[key];
      node.querySelector('.multi-count').setAttribute('aria-label',selected.length+' selected options');node.querySelector('.multi-count').textContent=selected.length||'';node.querySelector('.multi-count').hidden=!selected.length;
      node.querySelectorAll('input[data-multi-filter]').forEach(input=>input.checked=selected.includes(input.value));
      node.querySelector('[data-action="clear-category"]').disabled=!selected.length;
    }
  }
  function initMultiFilters(){
    for(const key of multiKeys){
      const node=$('filter-'+key),values=key==='missable'?Object.keys(riskOptions):[...new Set(WEAPONS.map(w=>w[key]))].sort((a,b)=>a.localeCompare(b));
      node.innerHTML=`<summary><span class="filter-heading" id="label-${key}">${icon(key)}${escape(filterNames[key])}</span><span class="multi-count" aria-label="Selected options"></span><span class="accordion-chevron" aria-hidden="true">＋</span><span class="multi-summary sr-only"></span></summary><div class="multi-options">${values.length>7?`<input type="search" class="filter-search" aria-label="Search ${escape(filterNames[key])} options" placeholder="Find ${escape(filterNames[key].toLowerCase())}…">`:''}<button class="text-button" data-action="clear-category" data-key="${key}" aria-label="Clear ${escape(filterNames[key])} selections">Clear selection</button><div class="multi-list">${values.map((value,i)=>`<label class="filter-option" for="option-${key}-${i}"><input id="option-${key}-${i}" type="checkbox" data-multi-filter="${key}" value="${escape(value)}"><span>${escape(key==='missable'?riskOptions[value]:value)}</span></label>`).join('')}</div></div>`;
      node.open=state.openFilters.includes(key);
    }
    syncMultiFilters();
  }
  function availability(w) {
    const risk=w.acquisition.missRisk;
    return risk==='Safe'?'safe':risk==='Recoverable'?'recoverable':risk==='No longer available'?'unavailable':['Time window','Choice-locked'].includes(risk)?'missable':'unknown';
  }
  const searchText = new Map(WEAPONS.map(w=>[w.id,normalize([w.name,...w.aliases,w.class,w.subclass,w.technology,w.manufacturer,w.baseModel,w.effect,w.acquisition.quest,w.acquisition.district,w.content,w.damageType,w.dualWield].join(' '))]));
  function compareNumbers(a,b,direction='desc') {
    const av=validNumber(a),bv=validNumber(b);
    if (!av && !bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    return direction==='asc'?a-b:b-a;
  }
  function filtered(s = state, view = currentView) {
    const terms = normalize(s.query).trim().split(/\s+/).filter(Boolean);
    return WEAPONS.filter(w => {
      if (s.iconic==='iconic' && !w.iconic || s.iconic==='normal' && w.iconic) return false;
      if (view==='favorites' && !s.favorites.includes(w.id)) return false;
      if (['content','group','class','technology','manufacturer','damageType'].some(k=>valuesFor(s,k).length && !valuesFor(s,k).includes(w[k]))) return false;
      if (valuesFor(s,'missable').length && !valuesFor(s,'missable').includes(availability(w))) return false;
      if (s.dual && w.dualWield!=='Eligible class' || s.new && w.addedIn!=='2.5') return false;
      return terms.every(t=>searchText.get(w.id).includes(t));
    }).sort((a,b)=> {
      const cmp=s.sort==='name' ? a.name.localeCompare(b.name,'en')*(s.direction==='asc'?1:-1) : s.sort==='itemType' ? (a.class.localeCompare(b.class,'en')||a.technology.localeCompare(b.technology,'en'))*(s.direction==='asc'?1:-1) : compareNumbers(stats(a,s)[s.sort],stats(b,s)[s.sort],s.direction);
      return cmp || a.name.localeCompare(b.name,'en') || a.id.localeCompare(b.id);
    });
  }
  function hydrateArtwork(root){
    root.querySelectorAll('img[data-art-id]').forEach(img=>{const w=BY_ID.get(img.dataset.artId);if(w?.image)img.src=w.image.src;img.removeAttribute('data-art-id');});
  }
  function artwork(w) {
    if(/^data:image\/(png|webp);base64,/.test(w.image?.src||''))return `<img class="weapon-image" data-art-id="${escape(w.id)}" alt="${escape(w.name)} in-game inventory artwork" width="${w.image.width}" height="${w.image.height}" decoding="async" loading="lazy">`;
    return schematic(w);
  }
  function schematic(w) {
    let path;
    if (w.group==='Throwable') path = w.class==='Axe' ? '<path d="M42 56 124 15l10 8-81 44zM113 17l10-13 29 17-13 23-14-13"/>' : '<path d="M21 57 128 13l28 3-17 19-97 34zM47 49l10 21M22 58l8 8"/>';
    else if (w.group==='Melee') {
      if (['Katana','Sword','Machete','Cleaver','Chainsword'].includes(w.class)) path='<path d="m28 65 102-52 29-3-16 20L45 77zM47 55l10 21M21 65l12 13M36 62l10 13"/><path d="m65 53 78-32" fill="none"/>';
      else if (w.class==='Hammer') path='<path d="m47 69 56-42 10 10-55 44zM95 23l20-17 32 33-20 17z"/>';
      else path='<path d="M30 64c26-17 49-35 77-49 12-6 24-9 31 0s0 18-12 24C96 53 70 62 40 77zM46 56l10 13M53 51l10 13M61 46l10 13"/>';
    } else if (['Pistol','Revolver'].includes(w.class)) path=w.class==='Revolver'?'<path d="M25 30h28v-7h74l9 7h23v11h-35l-18 11H84l-6 26H52l8-31-29-2zM79 30h25v19H79zM116 31h35M90 51l8 11h15l7-17"/>':'<path d="M31 26h111l8 12-7 8H93l-9 31H58l8-34-30-1zM100 46l-4 17h18l8-17M42 32h83M62 53l19 6M60 61l19 6"/>';
    else if (w.class==='Sniper Rifle'||w.class==='Precision Rifle') path='<path d="m12 39 34-2 14-12h48l12 5h48v8h-45l-7 12H87l-5 21H65l2-21H44l-27 17zM65 25v-9h41v9M123 33v17M136 33v17M147 33v17"/>';
    else if (w.class==='Shotgun') path='<path d="m12 41 37-9h116v10H96l-9 12H69l-5 19H45l7-23-37 11zM104 35v15h33V35M23 49l22-5"/>';
    else path='<path d="m10 36 34-9 15 4h60l10-5h28v7h14v9h-46l-12 10H92l5 24H74l-5-24H56l-7 21H30l8-25-25 6zM83 29V19h23v10M125 32v15M135 32v15M145 32v15"/>';
    return `<svg viewBox="0 0 180 90" aria-hidden="true" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">${path}</svg>`;
  }
  function badges(w) {
    return `<span class="badge ${w.iconic?'':'normal'}">${w.iconic?'◆ ICONIC':'STANDARD'}</span>${w.content==='Phantom Liberty'?'<span class="badge pl">PHANTOM LIBERTY</span>':w.content==='Rewards'?'<span class="badge pl">REWARD</span>':''}${w.addedIn==='2.5'?'<span class="badge new">NEW / 2.5</span>':''}`;
  }
  function favoriteButton(w) { const on=state.favorites.includes(w.id); return `<button class="star" data-action="favorite" data-id="${escape(w.id)}" aria-label="${on?'Unfavorite':'Favorite'} ${escape(w.name)}" aria-pressed="${on}">${icon('favorite')}</button>`; }
  function compareButton(w) { const on=state.compare.includes(w.id); return `<button class="compare-add" data-action="compare" data-id="${escape(w.id)}" aria-pressed="${on}" aria-label="${on?'Remove':'Add'} ${escape(w.name)} ${on?'from':'to'} comparison">${icon(on?'check':'compare')} ${on?'Selected':'Compare'}</button>`; }
  function card(w) {
    return `<article class="weapon-card ${w.iconic?'iconic':''} ${state.compare.includes(w.id)?'selected':''}" data-weapon="${escape(w.id)}"><div class="card-top"><div class="badges">${badges(w)}</div>${favoriteButton(w)}</div><div class="schematic ${w.image?'has-art':''}">${artwork(w)}</div><div class="card-body"><button class="weapon-title" data-action="details" data-id="${escape(w.id)}">${escape(w.name)}</button><div class="classification"><span class="technology">${escape(w.technology)}</span> / ${escape(w.class)}</div><div class="card-stats">${['damage','dps','speed'].map((k,i)=>`<div><strong class="${validNumber(stats(w)[k])?'':'unknown-value'}">${escape(valueText(w,k))}</strong><small>${icon(k)}${escape(['DAMAGE'+(state.profile==='records'?' / HIT':''),'DPS / SOURCE','ATTACK SPEED'][i])}</small></div>`).join('')}</div><p class="card-effect">${escape(w.effect||'Standard weapon. Consult the detailed reference for base statistics and available modifications.')}</p><div class="card-slots"><span class="slot-caption">SLOTS</span>${slotIcons(w)}</div></div><div class="card-bottom">${compareButton(w)}<button class="details-small" data-action="details" data-id="${escape(w.id)}" aria-label="Details for ${escape(w.name)}">Inspect ↗</button></div></article>`;
  }
  function table(rows) {
    const heading=(key,label)=>`<th scope="col" aria-sort="${state.sort===key?(state.direction==='asc'?'ascending':'descending'):'none'}"><button class="table-sort" data-action="sort" data-sort="${key}">${escape(label)} ${state.sort===key?(state.direction==='asc'?'↑':'↓'):''}</button></th>`;
    return `<div class="catalog-table-wrapper"><table class="catalog-table"><thead><tr><th>FAV</th>${heading('name','WEAPON')}${heading('itemType','ITEM TYPE')}<th scope="col">MOD / ATTACHMENT SLOTS</th>${['damage','dps','speed','magazine','reload'].map(k=>heading(k,statLabel(k))).join('')}<th>COMPARE</th></tr></thead><tbody>${rows.map(w=>`<tr data-weapon="${escape(w.id)}" class="${state.compare.includes(w.id)?'selected':''}"><td>${favoriteButton(w)}</td><td><div class="table-identity">${w.image?`<span class="table-art">${artwork(w)}</span>`:''}<div><button class="weapon-title" data-action="details" data-id="${escape(w.id)}">${escape(w.name)}</button><div class="classification">${w.iconic?'◆ ICONIC':''}${w.addedIn==='2.5'?' · NEW 2.5':''}</div></div></div></td><td class="item-type">${escape(w.class)}<small>${escape(w.technology)}</small></td><td class="table-slots">${slotIcons(w)}</td>${['damage','dps','speed','magazine','reload'].map(k=>`<td class="num">${escape(valueText(w,k))}</td>`).join('')}<td>${compareButton(w)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function renderChips() {
    const chips=[];
    for(const key of filterKeys){
      if(multiKeys.includes(key)){
        for(const value of valuesFor(state,key))chips.push(`<button class="chip" data-action="clear-filter" data-key="${key}" data-value="${escape(value)}">${escape(key==='missable'?riskOptions[value]:value)} ×</button>`);
      }else if(state[key] && !(key==='iconic'&&state[key]==='iconic')){
        const label=key==='dual'?'Dual-wield class':key==='new'?'Added in 2.5':state[key]==='all'?'All weapons':'Non-iconic';
        chips.push(`<button class="chip" data-action="clear-filter" data-key="${key}">${label} ×</button>`);
      }
    }
    $('filter-count').textContent=chips.length;
    const html=chips.length?`<div class="chips">${chips.join('')}</div>`:'';if($('active-filters').innerHTML!==html){$('active-filters').innerHTML=html;decorateControls($('active-filters'));}
  }
  let catalogKey='',cardRoot=null,tableRoot=null,tableHeadKey='';
  const cardPool=new Map(),rowPool=new Map();
  function fragment(html){const template=document.createElement('template');template.innerHTML=html;return template.content;}
  function reconcile(parent,nodes){
    const wanted=new Set(nodes);for(const child of [...parent.children])if(!wanted.has(child))child.remove();
    let cursor=parent.firstElementChild;
    for(const node of nodes){if(node===cursor)cursor=cursor.nextElementSibling;else parent.insertBefore(node,cursor);}
  }
  function renderCatalog(){
    const rows=filtered(),key=state.profile+'|'+state.tier;
    if(key!==catalogKey){catalogKey=key;cardPool.clear();rowPool.clear();cardRoot=null;tableRoot=null;tableHeadKey='';}
    $('result-count').textContent=rows.length;
    $('catalog-heading').firstChild.textContent=currentView==='favorites'?'Your favorites ':state.iconic==='iconic'?'Iconic arsenal ':state.iconic==='normal'?'Standard arsenal ':'Full arsenal ';
    $('catalog-kicker').textContent=currentView==='favorites'?'NC / SAVED INVENTORY':'NC / INVENTORY';
    $('results-announcement').textContent=`${rows.length} weapon${rows.length===1?'':'s'} found`;renderChips();hideTooltip();
    if(!rows.length){$('catalog').innerHTML=`<div class="empty"><div class="empty-symbol">${currentView==='favorites'?'☆':'⌕'}</div><h3>${currentView==='favorites'&&!state.favorites.length?'Your collection starts here.':'No weapons match this search.'}</h3><p>${currentView==='favorites'&&!state.favorites.length?'Star weapons in the arsenal to save them on this browser.':'Try another keyword or clear your filters.'}</p><button class="primary" data-action="${currentView==='favorites'&&!state.favorites.length?'browse':'reset'}">${currentView==='favorites'&&!state.favorites.length?'Browse weapons':'Clear search & filters'}</button></div>`;decorateControls($('catalog'));return;}
    const cards=state.view==='cards',pool=cards?cardPool:rowPool,missing=rows.filter(w=>!pool.has(w.id));
    if(missing.length){const fresh=fragment(cards?missing.map(card).join(''):table(missing));hydrateArtwork(fresh);decorateControls(fresh);fresh.querySelectorAll(cards?'.weapon-card':'tbody>tr').forEach(node=>pool.set(node.dataset.weapon,node));}
    let root,parent;
    if(cards){if(!cardRoot){cardRoot=document.createElement('div');cardRoot.className='cards';}root=cardRoot;parent=root;}
    else{if(!tableRoot)tableRoot=fragment(table([])).firstElementChild;root=tableRoot;parent=root.querySelector('tbody');const headingKey=state.sort+'|'+state.direction;
      if(headingKey!==tableHeadKey){root.querySelector('thead').replaceWith(fragment(table([])).querySelector('thead'));tableHeadKey=headingKey;decorateControls(root.querySelector('thead'));}}
    const nodes=rows.map(w=>{const node=pool.get(w.id);patchWeaponNode(node,w);return node;});reconcile(parent,nodes);
    if($('catalog').firstElementChild!==root)$('catalog').replaceChildren(root);if(cards)scheduleCardContainment();
  }
  let containmentFrame=0;
  function scheduleCardContainment(){
    if(containmentFrame||!CSS.supports('content-visibility','auto'))return;
    containmentFrame=requestAnimationFrame(()=>{containmentFrame=0;if(!cardRoot?.isConnected||state.view!=='cards')return;
      const width=Math.round(cardRoot.getBoundingClientRect().width);if(cardRoot.dataset.measuredWidth===String(width))return;
      cardRoot.classList.remove('cv-ready');const first=cardRoot.firstElementChild;if(!first)return;
      const box=first.getBoundingClientRect(),css=getComputedStyle(first),height=box.height-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)-parseFloat(css.borderTopWidth)-parseFloat(css.borderBottomWidth);
      cardRoot.style.setProperty('--card-content-height',height+'px');cardRoot.dataset.measuredWidth=String(width);cardRoot.classList.add('cv-ready');
    });
  }
  window.addEventListener('resize',scheduleCardContainment);
  let sidebarFrame=0;
  function fitSidebarViewport(){
    if(sidebarFrame)return;sidebarFrame=requestAnimationFrame(()=>{sidebarFrame=0;
      if(innerWidth<=800||!['arsenal','favorites'].includes(currentView)||state.sidebarCollapsed)return;
      const sidebar=$('catalog-filters'),top=Math.max(0,sidebar.getBoundingClientRect().top)+'px',tray=($('tray').hidden?0:$('tray').getBoundingClientRect().height+12)+'px';
      if(sidebar.style.getPropertyValue('--sidebar-top-gap')!==top)sidebar.style.setProperty('--sidebar-top-gap',top);
      if(sidebar.style.getPropertyValue('--sidebar-tray-gap')!==tray)sidebar.style.setProperty('--sidebar-tray-gap',tray);
    });
  }
  window.addEventListener('scroll',fitSidebarViewport,{passive:true});window.addEventListener('resize',fitSidebarViewport);
  function renderTray(){
    const visible=state.compare.length&&['arsenal','favorites'].includes(currentView);
    $('tray').hidden=!visible;document.body.classList.toggle('has-tray',!!visible);
    $('tray').innerHTML=visible?`<div class="tray-label">COMPARISON<br>${state.compare.length} / 4 SELECTED</div><div class="tray-picks">${state.compare.map(id=>{const w=BY_ID.get(id);return `<span class="tray-pick">${escape(w.name)}<button data-action="compare" data-id="${escape(id)}" aria-label="Remove ${escape(w.name)} from comparison">×</button></span>`;}).join('')}</div><button class="text-button" data-action="clear-compare">Clear</button><button class="primary" data-nav="compare">Compare ${state.compare.length} →</button>`:'';
    decorateControls($('tray'));fitSidebarViewport();
  }

  function rankRow(weapons,key,s=state) {
    const values=weapons.map(w=>applicable(w,key)?stats(w,s)[key]:null);
    const nums=values.filter(validNumber);
    const mixed=new Set(weapons.map(w=>w.group)).size>1;
    const projectileMismatch=key==='damage' && s.profile==='records' && new Set(weapons.filter(w=>w.group==='Firearm').map(w=>stats(w,s).projectiles??'unknown')).size>1;
    const canRank=nums.length>=2&&!mixed&&!projectileMismatch;
    const best=canRank?(statMap.get(key)[3]?Math.max(...nums):Math.min(...nums)):null;
    return {values,canRank,best,reason:mixed?'Mixed weapon families':projectileMismatch?'Different projectile counts':nums.length<2?'Insufficient comparable data':''};
  }
  function difference(value,baseline,key) {
    if(!validNumber(value)||!validNumber(baseline))return '';
    const delta=value-baseline;
    const suffix=statMap.get(key)?.[2]||'';
    const signed=(delta>0?'+':'')+formatNumber(delta);
    const percent=baseline>0&&!['headshot','armor','critChance','critDamage','bleed','poison','burn','shock'].includes(key)?` (${delta>0?'+':''}${formatNumber(delta/baseline*100)}%)`:'';
    return `Δ ${signed}${suffix}${percent}`;
  }
  function acquisitionText(w) {
    const a=w.acquisition;
    return `${escape(a.hint)}<br><span class="muted">${escape(a.quest||'Unknown quest')} · ${escape(a.missRisk||'Unknown availability')}</span>`;
  }
  function renderComparison() {
    const picks=state.compare.map(id=>BY_ID.get(id));
    const intro=`<div class="section-intro"><div><div class="eyebrow cyan">NC / ANALYSIS CONSOLE</div><h1>Weapon comparison</h1><p>Compare up to four weapons at Tier ${escape(state.tier)}. Highlights identify the strongest reported number, with effects and availability kept in view.</p></div><button class="text-button" data-action="browse">← Back to arsenal</button></div>`;
    const actions=`<div class="comparison-actions"><button id="add-comparison" class="primary picker-trigger" data-action="open-picker" ${picks.length>=4?'disabled':''}>${icon('plus')} Add weapon <span>${picks.length} / 4</span></button><label><input id="show-differences" type="checkbox" ${state.differences?'checked':''}> Differences against first weapon</label>${picks.length?'<button class="text-button" data-action="clear-compare">Clear comparison</button>':''}</div>`;
    if(picks.length<2){$('compare-panel').innerHTML=intro+'<div id="compare-reference"></div>'+actions+`<div class="empty comparison-empty"><div class="empty-symbol">${icon('compare')}</div><h3>${picks.length?'Choose another weapon.':'Build your comparison.'}</h3><p>Match up to four weapons, row by row.</p><div class="empty-slots" role="group" aria-label="Comparison slots">${[0,1,2,3].map(i=>i<picks.length?`<div class="filled-slot"><span class="empty-slot-art">${artwork(picks[i])}</span><strong>${escape(picks[i].name)}</strong><button data-action="compare" data-id="${escape(picks[i].id)}" aria-label="Remove ${escape(picks[i].name)} from comparison">Remove</button></div>`:`<button class="empty-slot" data-action="open-picker" aria-label="Add weapon to slot ${i+1}">${icon('plus')}<span>Slot ${i+1}</span></button>`).join('')}</div></div>`;hydrateArtwork($('compare-panel'));return;}
    const mixed=new Set(picks.map(w=>w.group)).size>1;
    const classes=new Set(picks.map(w=>w.class)).size>1;
    const missing=picks.filter(w=>!w.profiles[state.profile]?.tiers[state.tier]);
    let warnings='';
    if(mixed)warnings+='<div class="notice">Different weapon families: firearm, melee and thrown performance are not directly comparable. Numerical winners and differences are disabled.</div>';
    else if(classes)warnings+='<div class="notice">Different weapon classes: reported numbers share units, but ranges, firing behavior and effects differ. A highlighted number is not an overall weapon ranking.</div>';
    if(missing.length)warnings+=`<div class="notice">${missing.map(w=>escape(w.name)).join(', ')}: no ${escape(state.tier)} data in this reference. No other tier or source has been substituted.</div>`;
    const header=`<tr><th class="row-label">${escape(state.profile==='records'?'DETAILED RECORDS':'PUBLISHED REFERENCE')}<small>TIER ${escape(state.tier)}<br>${escape(state.profile==='records'?'DPS is the base-DPS record; it does not include firing-cycle calculations.':'DPS is copied from the published reference.')}</small></th>${picks.map((w,i)=>`<th scope="col" class="weapon-col"><button class="col-remove" data-action="compare" data-id="${escape(w.id)}" aria-label="Remove ${escape(w.name)} from comparison">×</button><div class="compare-identity"><div class="schematic ${w.image?'has-art':''}">${artwork(w)}</div><div class="compare-identity-text"><div class="badges">${badges(w)}</div><h3><button class="weapon-title" data-action="details" data-id="${escape(w.id)}">${escape(w.name)}</button></h3><div class="classification">${escape(w.class)} / ${escape(w.technology)}</div></div></div><button class="replace-weapon" data-action="open-picker" data-replace="${i}" aria-label="Replace ${escape(w.name)}">${icon('replace')} Replace weapon</button></th>`).join('')}</tr>`;
    const band=label=>`<tr class="console-band"><th colspan="${picks.length+1}" scope="colgroup">${label}</th></tr>`;
    let body=`<tr><th scope="row" class="row-label">REFERENCE TIER</th>${picks.map(w=>`<td class="text-row">${w.profiles[state.profile]?.tiers[state.tier]?`Tier ${escape(state.tier)}`:'Unknown · no matching tier'}</td>`).join('')}</tr>`;
    const comparisonGroups=[['01 / DAMAGE & PERFORMANCE',['damage','dps','projectiles','headshot','armor','critChance','critDamage']],['02 / HANDLING',['speed','reload','magazine','range','stamina','blockStamina','returnTime','charge','chargeMultiplier']],['03 / STATUS EFFECTS',['bleed','poison','burn','shock']]];
    for(const [group,keys] of comparisonGroups){const definitions=keys.map(key=>statMap.get(key)).filter(([key])=>picks.some(w=>applicable(w,key))&&(['damage','dps','speed','magazine','reload','range','headshot','armor','stamina','returnTime'].includes(key)||picks.some(w=>validNumber(stats(w)[key]))));if(!definitions.length)continue;body+=band(group);
    for(const [key,label,unit,higher] of definitions){
      if(!picks.some(w=>applicable(w,key)))continue;
      if(!['damage','dps','speed','magazine','reload','range','headshot','armor','stamina','returnTime'].includes(key)&&!picks.some(w=>validNumber(stats(w)[key])))continue;
      const rank=rankRow(picks,key),nums=rank.values.filter(validNumber),max=Math.max(0,...nums);
      const ties=rank.canRank&&nums.filter(n=>Math.abs(n-rank.best)<1e-6).length>1;
      body+=`<tr><th scope="row" class="row-label">${escape(statLabel(key))}<small>${rank.canRank?(higher?'↑ Higher shown value':'↓ Lower shown value'):escape(rank.reason)}</small></th>${picks.map((w,i)=>{const v=rank.values[i],best=rank.canRank&&validNumber(v)&&Math.abs(v-rank.best)<1e-6;return `<td class="${best?'best':''}" data-stat="${key}" data-weapon="${escape(w.id)}"><div class="comparison-value"><span>${escape(valueText(w,key))}</span>${best?`<span class="winner">${ties?'TIE':'BEST VALUE'}</span>`:''}</div>${rank.canRank&&state.differences&&validNumber(v)&&validNumber(rank.values[0])?`<div class="delta">${i===0?'REFERENCE':escape(difference(v,rank.values[0],key))}</div>`:''}${rank.canRank&&max>0&&validNumber(v)&&v>=0?`<div class="bar" aria-hidden="true"><span style="width:${Math.max(0,Math.min(100,v/max*100))}%"></span></div>`:''}</td>`;}).join('')}</tr>`;
    }
    }
    const textRows=[['MOD / ATTACHMENT SLOTS',w=>slotIcons(w)],['ICONIC ABILITY',w=>escape(w.effect||'Standard weapon; no iconic effect.')],['BASE MODEL',w=>escape(w.baseModel)],['MANUFACTURER',w=>`${escape(w.manufacturer)}<br><small class="muted">${escape(w.manufacturerStatus)}</small>`],['CONTENT / AVAILABILITY',w=>`${escape(w.content)}<br>${escape(w.acquisition.missRisk||'Unknown')}`],['HOW TO OBTAIN',acquisitionText],['DUAL WIELD / 2.5',w=>`${escape(w.dualWield)}<br><small class="muted">Individual compatibility not game-tested.</small>`],['SOURCE / STATUS',w=>`${escape(w.profiles[state.profile]?.patch||'No data in this reference')}<br><a href="${escape(w.sources.find(s=>s.name.startsWith(state.profile==='records'?'Gamestegy':'Nukes'))?.url||w.sources[0].url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>`]];
    for(const [label,fn] of textRows){if(label==='MOD / ATTACHMENT SLOTS')body+=band('04 / SPECIAL PROPERTIES');if(label==='BASE MODEL')body+=band('05 / WEAPON INFORMATION');body+=`<tr class="${label==='ICONIC ABILITY'?'ability-row':''}"><th scope="row" class="row-label">${label}</th>${picks.map(w=>`<td class="text-row">${fn(w)}</td>`).join('')}</tr>`;}
    $('compare-panel').innerHTML=intro+'<div id="compare-reference"></div>'+actions+warnings+`<div class="comparison-scroll"><table class="compare-table cols-${picks.length}"><thead>${header}</thead><tbody>${body}</tbody></table></div><p class="comparison-foot">Unknown = no sourced value at this reference and tier. N/A = the field does not apply. Ties are highlighted together; missing values never win. Percent differences require a positive reference value. Damage rankings are disabled when projectile counts differ. DPS alone does not measure effectiveness.</p>`;
  }
  function facts(items) {return `<dl class="facts">${items.map(([label,value])=>`<div><dt>${escape(label)}</dt><dd>${escape(value||'Unknown')}</dd></div>`).join('')}</dl>`;}
  function sourceList(w) {return `<div class="source-list">${w.sources.map(s=>`<div class="source-item"><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.name)} ↗</a><small>${escape(s.role)}<br>Patch: ${escape(s.patch)}</small></div>`).join('')}</div>`;}
  function renderDetail() {
    const w=BY_ID.get(detailId);if(!w)return;
    const focusAction=$('details').contains(document.activeElement)?document.activeElement.dataset.action:null;
    const root=$('detail-content'),same=root.dataset.weapon===detailId,scroll=same?(root.querySelector('.detail-scroll')?.scrollTop||0):0;
    const expanded=same?[...root.querySelectorAll('details[open]')].map(n=>n.className):[];
    const a=w.acquisition,s=stats(w),known=statDefs.filter(([key])=>applicable(w,key) && (validNumber(s[key])||['damage','dps','speed','range','headshot','critChance','critDamage','armor','magazine','reload','stamina','returnTime'].includes(key)));
    const statTiles=known.map(([key])=>`<div class="detail-stat"><strong class="${validNumber(s[key])?'':'unknown-value'}">${escape(valueText(w,key))}</strong><span>${icon(key)}${escape(statLabel(key))}</span></div>`).join('');
    const noTier=!w.profiles[state.profile]?.tiers[state.tier];
    $('detail-content').innerHTML=`<div class="detail-head"><button class="detail-close" data-action="close-detail" aria-label="Close weapon details">×</button><div class="badges">${badges(w)}</div><h2 id="detail-title">${escape(w.name)}</h2><div class="classification"><span class="technology">${escape(w.technology)}</span> / ${escape(w.class)} / ${escape(w.baseModel)}</div>${w.image?`<div class="detail-art">${artwork(w)}</div>`:''}<div class="detail-actions">${compareButton(w)}${favoriteButton(w)}<button class="configure-weapon chamfer" data-plan-action="configure" data-weapon-id="${escape(w.id)}">Configure ↗</button></div></div><div class="detail-body">${w.iconic?`<section class="detail-ability"><h3>◆ ICONIC ABILITY</h3><p>${escape(w.effect)}</p><small>${escape(w.effectStatus)}. Separate numerical modifiers are included only when supported by the source.</small></section>`:''}<div class="detail-reference"><strong>${escape(state.profile==='records'?'Gamestegy detailed records':'Nukes & Dragons published stats')}</strong><label>Tier <select id="detail-tier" aria-label="Weapon detail tier" style="width:95px;display:inline-block;margin-left:5px">${META.tiers.map(t=>`<option ${t===state.tier?'selected':''}>${t}</option>`).join('')}</select></label></div>${noTier?`<div class="notice">No Tier ${escape(state.tier)} data in this reference. ${state.profile==='records'&&state.tier.endsWith('+')&&!['5+','5++'].includes(state.tier)?'Intermediate + tiers are not published by this source; the Nukes & Dragons reference has 11-tier tables for its covered weapons.':'Try the other reference if this weapon is covered.'} No fallback or interpolation is applied.</div>`:''}<div class="detail-stats">${statTiles}</div><p class="muted" style="font-size:11px">${escape(w.profiles[state.profile]?.damageBasis||'No data')}. ${escape(w.profiles[state.profile]?.dpsBasis||'')}. Values exclude player builds and conditional iconic effects. Headshot bonus retains the selected source's convention; source conventions differ.</p><section class="detail-slots"><h3>Mod & attachment slots</h3>${slotIcons(w)}<p>One icon per supported slot at Tier ${escape(state.tier)}. Capacity from the detailed source; fitted attachments and occupied slots are not simulated.</p></section><div class="detail-columns"><section><h3>Weapon identity</h3>${facts([['Class',w.class],['Subclass',w.subclass],['Technology / action',w.technology],['Manufacturer',w.manufacturer],['Manufacturer status',w.manufacturerStatus],['Base model',w.baseModel],['Content',w.content],['Base damage type',w.damageType],['Introduced',w.addedIn?`Patch ${w.addedIn}`:'Not verified'],['Dual wield',w.dualWield]])}<p class="muted" style="font-size:10px;margin-top:12px">${escape(w.dualWieldStatus)}. Eligibility never modifies the displayed base stats. Slot icons use published tier counts where available; unverified tier counts are labeled.</p></section><section><h3>Acquisition <span class="quality-tag">${escape(a.missRisk||'Unknown')}</span></h3><p class="acquisition-hint">${escape(a.hint)}</p>${facts([['Quest / activity',a.quest],['Location',a.district],['Method',a.sourceType],['Requires',a.needs],['Story phase',a.storyPhase],['Lifepath',a.lifepath],['Choices / exclusivity',a.eitherOr||'No branch restriction recorded'],['Ending route',a.endingRoute],['Deadline',a.pickUpBefore],['If missed',a.ifMissed],['Black Market fallback',a.blackMarketBackup||'Not verified']])}<p class="muted" style="font-size:10px;margin-top:12px">Acquisition leads are from published guides. Most existing routes target 2.31 and have not been walked in game for 2.5. Exact choices matter; consult the source for quest spoilers.</p></section></div><div class="detail-warnings"><strong>Verification notes</strong><ul>${w.warnings.map(x=>`<li>${escape(x)}</li>`).join('')}</ul></div><section class="detail-sources"><h3>Sources & provenance</h3>${w.image?`<div class="source-item"><a href="${escape(w.image.sourceUrl)}" target="_blank" rel="noopener noreferrer">Weapon inventory image ↗</a><small>${escape(w.image.attribution)}. Bundled locally; original image unchanged.${w.image.sharedWith?.length?`<br>Source inventory artwork is shared with ${escape(w.image.sharedWith.join(', '))}. Equipped models and skins may differ.`:''}</small></div>`:''}${sourceList(w)}</section><div class="detail-id">CANONICAL GAME RECORD / ${escape(w.id)}<br>SNAPSHOT / ${META.datasetVersion} · RETRIEVED / ${META.researchedOn}</div><div class="detail-bottom"><button data-action="detail-prev">← Previous weapon</button><button data-action="detail-next">Next weapon →</button></div></div>`;
    refineDetail();root.dataset.weapon=detailId;
    root.querySelectorAll('details').forEach(n=>{if(expanded.includes(n.className))n.open=true;});
    root.querySelector('.detail-scroll').scrollTop=scroll;
    if(focusAction)$('details').querySelector(`[data-action="${focusAction}"]`)?.focus({preventScroll:true});
  }
  function openDetail(id,opener) {
    if(!BY_ID.has(id))return;
    detailId=id;detailOpener=opener||document.activeElement;renderDetail();
    if(!$('details').open)$('details').showModal();
    $('detail-content').querySelector('.detail-scroll').scrollTop=0;$('details').querySelector('.detail-close').focus();
  }
  function closeDetail() { $('details').close();detailId=null;if(detailOpener?.isConnected)detailOpener.focus();else $('search').focus(); }
  function renderData() {
    const iconic=WEAPONS.filter(w=>w.iconic),missingMaker=WEAPONS.filter(w=>w.manufacturer==='Unknown'),profileCounts=profile=>iconic.filter(w=>w.profiles[profile]?.tiers[state.tier]?.damage!=null).length;
    $('data-panel').innerHTML=`<div class="section-intro"><div><div class="eyebrow cyan">PROVENANCE / COVERAGE / LIMITATIONS</div><h1>Archive / data notes</h1><p>Dataset ${META.datasetVersion}. Researched on October 25, 2026. The inventory targets the released PC Update 2.5; per-weapon game verification remains limited.</p></div></div><div class="data-overview"><div><strong>${META.iconicCount}</strong><span>Iconic weapons</span></div><div><strong id="all-total">${META.totalCount}</strong><span>Total records</span></div><div><strong>LOCAL</strong><span>All data & artwork bundled offline</span></div><div><strong>2.5</strong><span>Inventory target · community-sourced stats</span></div></div>${!storageAvailable?'<div class="inapp-storage">This browser blocked local storage. Changes last for this session; export your preferences below to keep a copy.</div>':''}<div class="data-grid"><article class="data-card"><h3>115 iconics, reconciled by identity.</h3><p>All 113 weapons in Vaexil’s 2.31 inventory match the canonical inventory. Nukes & Dragons covers 112 of those, omitting Gwynbleidd. Coronation and Sihil are new in 2.5; Gamestegy independently lists the resulting 115 iconics.</p><p>All x-MOD2 variants, melee weapons, throwables, Phantom Liberty weapons, account rewards and former promotional rewards are represented. Boar Carver is included among ${WEAPONS.length-115} optional non-iconics; it is not counted as iconic.</p><p>Alias changes such as “Rasetsu (Prototype),” “Crowbar (Bunker)” and capitalization differences are merged by record identity. Standard and iconic versions remain distinct records.</p></article><article class="data-card"><h3>Patch target is not a blanket certification.</h3><p>The official release announcement confirms 2.5 on October 22, 2026. New content references identify Coronation and Sihil. No newer released update was found in the official news check.</p><p>Older entries are not silently certified for 2.5. Vaexil declares 2.31; Games Lantern declares 2.3; Nukes & Dragons does not declare a per-record patch. Gamestegy has 2.5 additions but its older numerical records do not independently establish current in-game behavior.</p><p>No local game files or player-build measurements were used.</p></article><article class="data-card"><h3>Two references. No hidden mixing.</h3><p><b>Detailed game records:</b> Gamestegy’s published structured records. Damage is per projectile or melee hit. DPS is the source’s raw base-DPS record, not sustained DPS and not necessarily damage × firing speed. Other fields include range, armor penetration, stamina and return time where sourced.</p><p><b>Published stats:</b> Nukes & Dragons’ displayed damage and DPS tables. Damage can use a different projectile basis. The source’s DPS formula is not recreated. Source differences are preserved, not averaged.</p><p>The same reference and tier apply to every comparison column. Iconic ability summaries and acquisition remain separately attributed.</p></article><article class="data-card"><h3>Tier coverage & unknown values.</h3><p>Both references include Tier 1–5, 5+ and 5++ where published. Detailed records have no 1+, 2+, 3+ or 4+ samples; those tiers show Unknown. Nukes & Dragons publishes all 11 steps for 112 iconics. Gwynbleidd, Coronation and Sihil are absent there.</p><p>At selected Tier ${escape(state.tier)}: detailed damage exists for ${profileCounts('records')} / 115 iconics; published-reference damage exists for ${profileCounts('nd')} / 115.</p><p>No interpolation or guessed tier multipliers. A published upgrade table does not establish that every weapon naturally drops at every tier.</p></article><article class="data-card"><h3>Effects, comparisons & dual wield.</h3><p>Ability text is an original factual paraphrase of individually linked sources. Numeric conditions are retained when available; there is no invented effect name. Crowbar and Caretaker’s Spade have no separately verified combat ability.</p><p>Best-value highlights are a numeric aid. Lower reload, stamina and return times are favored; other rows favor higher values. Mixed families disable rankings. Different projectile counts disable damage ranking. Charge, bursts, target armor, headshots and ability activation can change actual performance.</p><p>Official 2.5 notes limit Double Trouble to Power pistols and revolvers. The eligibility label is a class-level inference, not an individual compatibility test. Dual-wield penalties and perks never alter these base values.</p></article><article class="data-card"><h3>Known conflicts & missing metadata.</h3><p>Widow Maker’s detailed record reports five projectiles and Physical base damage while its ability describes two chemical projectiles. Both facts are kept with a warning. La Chingona Dorada’s dual-wield effect and Yasha’s effect differ from the older reference; the newer detailed wording is summarized and marked untested.</p><p>Headshot conventions differ between sources. The detailed source’s value is normalized to a percentage bonus; the published reference retains its displayed bonus. They are never compared across references.</p><p>${missingMaker.length} / ${WEAPONS.length} manufacturers are Unknown. Generic “Street” or “Corporation” data labels were not converted into a guessed manufacturer. Unknown crit modifiers and other absent fields remain Unknown.</p></article><article class="data-card wide"><h3>Source ledger</h3><p>Each weapon has individual provenance links. Source links open online only when you click them. The application itself makes no network requests.</p><div class="source-list">${META.sources.map(s=>`<div class="source-item"><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.name)} ↗</a></div>`).join('')}</div><p style="margin-top:15px">Cyberpunk Wiki’s category could not be retrieved through the available access methods. Games Lantern’s public pages were cross-checked, but its declared 104-iconic total could not be reconciled record-by-record from an accessible complete export. It is an older count, not the canonical inventory. Access challenges were not bypassed.</p></article><article class="data-card wide"><h3>Your local data</h3><p>Favorites, comparison selections, search, filters, sort order, view and tier are saved in this browser at this file location when local storage is available. Moving the file or changing browser can create a separate preference store. Export a backup before moving it. No account, tracking or cloud storage.</p><div class="data-actions"><button id="export-preferences">Export preferences</button><button id="import-preferences">Import preferences</button><button id="export-dataset">Export bundled dataset</button></div><input type="file" id="preference-file" accept="application/json,.json" hidden><details><summary>View all 115 canonical iconic names</summary><ul class="coverage-list">${iconic.map(w=>`<li>${escape(w.name)}</li>`).join('')}</ul></details></article><article class="data-card wide"><h3>Attribution</h3><p>Cyberpunk 2077 and Phantom Liberty belong to CD PROJEKT RED and their respective rights holders. This is an independent, unofficial fan reference. Numerical facts and acquisition references are attributed to Gamestegy, Nukes & Dragons, Vaexil and Games Lantern. Their site designs, source prose and artwork are not licensed as this project’s code. All 190 weapons display weapon-specific in-game inventory artwork, sourced via Gamestegy and Games Atlas and embedded for offline use. Game artwork belongs to CD PROJEKT RED; see each weapon’s image source link. Source documentation and the validation report accompany this application.</p></article></div>`;
    refineData();
  }
  function renderReference() {
    $('reference-hint').textContent=state.profile==='records'?'Damage is per projectile / melee hit. DPS is the source base-DPS record. Four intermediate + tiers have no samples.':'Damage and DPS as published. All 11 tier steps for 112 iconics; the three absent iconics show Unknown.';
    $('tier').value=state.tier;$('profile').value=state.profile;
  }
  function render() {
    hideTooltip();
    document.querySelector('.frame').classList.toggle('rail-collapsed',state.sidebarCollapsed);$('sidebar-toggle').setAttribute('aria-expanded',!state.sidebarCollapsed);$('sidebar-toggle').setAttribute('aria-label',state.sidebarCollapsed?'Show filters':'Hide filters');
    const reference=document.querySelector('.reference-controls');$('reference-storage').append(reference);
    document.querySelectorAll('.masthead [data-nav]').forEach(b=>{const active=b.dataset.nav===(currentView==='planner'?'builds':currentView);b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');});
    $('compare-count').textContent=state.compare.length;$('favorite-count').textContent=state.favorites.length;
    const catalogView=['arsenal','favorites'].includes(currentView);
    $('arsenal-panel').hidden=!catalogView;$('compare-panel').hidden=currentView!=='compare';$('data-panel').hidden=currentView!=='data';for(const view of ['mods','builds','planner'])$(view+'-panel').hidden=currentView!==view;
    document.querySelector('.frame').classList.toggle('focused',!catalogView);
    document.querySelector('.reference-controls').hidden=!['arsenal','favorites','compare'].includes(currentView);
    renderReference();
    if(catalogView)renderCatalog();else if(currentView==='compare')renderComparison();else if(currentView==='data')renderData();else window.NCAExpansion?.render(currentView);
    if(catalogView||currentView==='compare')$(catalogView?'catalog-reference':'compare-reference').append(reference);
    if(currentView==='compare')hydrateArtwork($('compare-panel'));renderTray();if(['mods','builds','planner'].includes(currentView))$('tray').hidden=true;if(currentView==='compare'||currentView==='data')decorateControls($(currentView==='compare'?'compare-panel':'data-panel'));
  }
  function syncControls() {
    for(const key of ['iconic','dual','new']){const el=$('filter-'+key);if(el.type==='checkbox')el.checked=state[key];else el.value=state[key];}for(const key of multiKeys)$('filter-'+key).open=state.openFilters.includes(key);syncMultiFilters();
    $('search').value=state.query;$('sort').value=state.sort;$('direction').textContent=state.direction==='asc'?'↑':'↓';
    $('view-cards').setAttribute('aria-pressed',state.view==='cards');$('view-table').setAttribute('aria-pressed',state.view==='table');renderReference();
  }
  function resetFilters() { const fresh=freshDefaults();for(const key of [...filterKeys,'query'])state[key]=fresh[key];save();syncControls();render(); }
  function setSort(key,toggle){if(!['name','itemType',...statMap.keys()].includes(key))return;state.direction=toggle&&state.sort===key?(state.direction==='asc'?'desc':'asc'):['name','itemType','reload','stamina','returnTime'].includes(key)?'asc':'desc';state.sort=key;save();syncControls();renderCatalog();}
  function navigate(view) {if(!['arsenal','compare','favorites','data','mods','builds','planner'].includes(view))view='arsenal';currentView=view;history.replaceState(null,'','#'+view);render();}
  function updateWeaponSelection(id){
    const w=BY_ID.get(id);if(!w)return;
    for(const node of [cardPool.get(id),rowPool.get(id)])if(node)patchWeaponNode(node,w);
    document.querySelectorAll('#details [data-id]').forEach(button=>{if(button.dataset.id===id)patchSelectionButton(button,w);});
    $('compare-count').textContent=state.compare.length;$('favorite-count').textContent=state.favorites.length;
  }
  function patchSelectionButton(button,w){
    const on=button.dataset.action==='favorite'?state.favorites.includes(w.id):state.compare.includes(w.id);
    const favorite=button.dataset.action==='favorite';if(!favorite&&button.dataset.action!=='compare')return;
    if(button.getAttribute('aria-pressed')!==String(on)){button.setAttribute('aria-pressed',on);button.innerHTML=favorite?icon('favorite'):icon(on?'check':'compare')+' '+(on?'Selected':'Compare');}
    const label=favorite?`${on?'Unfavorite':'Favorite'} ${w.name}`:`${on?'Remove':'Add'} ${w.name} ${on?'from':'to'} comparison`;
    button.setAttribute('aria-label',label);if(favorite)button.dataset.tip=label;
  }
  function patchWeaponNode(node,w){node.classList.toggle('selected',state.compare.includes(w.id));node.querySelectorAll('[data-action="favorite"],[data-action="compare"]').forEach(button=>patchSelectionButton(button,w));}
  function toggleFavorite(id){
    if(!BY_ID.has(id))return;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];save();updateWeaponSelection(id);
    if(currentView==='favorites')renderCatalog();
  }
  function toggleCompare(id){
    if(!BY_ID.has(id))return;
    if(state.compare.includes(id))state.compare=state.compare.filter(x=>x!==id);
    else{if(state.compare.length>=4){toast('Four weapons selected. Remove or replace one to add another.');return;}state.compare.push(id);}
    save();updateWeaponSelection(id);if(currentView==='compare')render();else renderTray();
  }
  function download(name,value) {
    const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  // All event handlers are delegated so rerendered cards and dialogs stay functional.
  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-nav]');if(nav){event.preventDefault();navigate(nav.dataset.nav);return;}
    const b=event.target.closest('[data-action]');if(!b)return;
    const id=b.dataset.id,action=b.dataset.action;
    if(action==='open-picker')openPicker(b.dataset.replace===undefined?null:Number(b.dataset.replace),b);
    else if(action==='close-picker')closePicker();
    else if(action==='pick-weapon')pickWeapon(id);
    else if(action==='details')openDetail(id,b);
    else if(action==='favorite')toggleFavorite(id);
    else if(action==='compare')toggleCompare(id);
    else if(action==='close-detail')closeDetail();
    else if(action==='clear-compare'){const ids=[...state.compare];state.compare=[];save();ids.forEach(updateWeaponSelection);if(currentView==='compare')render();else renderTray();}
    else if(action==='browse')navigate('arsenal');
    else if(action==='reset')resetFilters();
    else if(action==='clear-filter'||action==='clear-category'){const key=b.dataset.key;if(filterKeys.includes(key)){state[key]=multiKeys.includes(key)?(action==='clear-filter'?valuesFor(state,key).filter(v=>v!==b.dataset.value):[]):defaults[key];save();syncControls();render();}}
    else if(action==='sort')setSort(b.dataset.sort,true);
    else if(action==='detail-prev'||action==='detail-next'){
      const rows=filtered();const list=rows.some(w=>w.id===detailId)?rows:WEAPONS;const i=list.findIndex(w=>w.id===detailId),next=list[(i+(action==='detail-next'?1:-1)+list.length)%list.length];if(next)openDetail(next.id,detailOpener);
    }
  });
  document.addEventListener('change',async event=>{
    const el=event.target;
    if(el.dataset.multiFilter){const key=el.dataset.multiFilter;if(multiKeys.includes(key)){state[key]=el.checked?[...new Set([...valuesFor(state,key),el.value])]:valuesFor(state,key).filter(v=>v!==el.value);save();syncMultiFilters();render();}}
    else if(el.id.startsWith('filter-')){const key=el.id.slice(7);if(['iconic','dual','new'].includes(key)){state[key]=el.type==='checkbox'?el.checked:el.value;save();render();}}
    else if(el.id==='tier'||el.id==='detail-tier'){state.tier=el.value;save();render();if(detailId){const scroll=$('detail-content').querySelector('.detail-scroll').scrollTop;renderDetail();$('detail-content').querySelector('.detail-scroll').scrollTop=scroll;}}
    else if(el.id==='profile'){state.profile=el.value;save();render();if(detailId)renderDetail();}
    else if(el.id==='sort')setSort(el.value,false);
    else if(el.id==='show-differences'){state.differences=el.checked;save();render();}
    else if(el.id==='preference-file'){
      const file=el.files[0];if(!file)return;
      try{if(file.size>1000000)throw new Error('File too large');const raw=JSON.parse(await file.text());if(raw.application!=='night-city-arsenal'||!raw.preferences)throw new Error('Not an Arsenal preference backup');state=sanitize(raw.preferences);save();syncControls();render();toast('Preferences imported.');}catch(e){toast('Could not import: '+e.message);}
    }
  });
  $('search').addEventListener('input',event=>{state.query=event.target.value;save();renderCatalog();});
  $('reset').addEventListener('click',resetFilters);
  $('sidebar-toggle').addEventListener('click',()=>{state.sidebarCollapsed=!state.sidebarCollapsed;save();render();});
  $('mobile-filters').addEventListener('click',()=>{const open=$('catalog-filters').classList.toggle('mobile-open');$('mobile-filters').setAttribute('aria-expanded',open);$('mobile-filters').querySelector('span').textContent=open?'−':'＋';});
  $('direction').addEventListener('click',()=>{state.direction=state.direction==='asc'?'desc':'asc';save();syncControls();renderCatalog();});
  for(const view of ['cards','table'])$('view-'+view).addEventListener('click',()=>{state.view=view;save();syncControls();renderCatalog();});
  $('details').addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
  $('details').addEventListener('click',event=>{if(event.target===$('details')){const r=$('details').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDetail();}});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!$('details').open&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('weapon-picker').open){event.preventDefault();if(!['arsenal','favorites'].includes(currentView))navigate('arsenal');$('search').focus();}});
  document.addEventListener('click',event=>{
    if(event.target.id==='export-dataset')download('night-city-arsenal-weapons.json',DB);
    else if(event.target.id==='export-preferences')download('night-city-arsenal-preferences.json',{application:'night-city-arsenal',version:1,preferences:state});
    else if(event.target.id==='import-preferences')$('preference-file').click();
  });
  // Persist the summary's pending native activation before its queued toggle
  // event. Do not cancel activation or handle option-row clicks here.
  document.addEventListener('click',event=>{
    const summary=event.target.closest('.multi-filter>summary');if(!summary)return;
    const section=summary.parentElement;
    state.openFilters=multiKeys.filter(key=>{const node=$('filter-'+key);return node===section?!node.open:node.open;});save();
  });
  document.addEventListener('toggle',event=>{
    if(!event.target.matches('.multi-filter'))return;
    state.openFilters=multiKeys.filter(key=>$('filter-'+key).open);save();
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!$('details').open&&!$('weapon-picker').open){const section=event.target.closest('.multi-filter[open]');if(section){event.preventDefault();section.open=false;section.querySelector('summary').focus();}}
  });
  window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
  // Original, consistent 24px line icons. No external library or runtime fetch.
  const iconCache=new Map();
  function icon(name) {
    if(iconCache.has(name))return iconCache.get(name);
    const paths={
      favorite:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
      compare:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      plus:'<path d="M12 4v16M4 12h16"/>', check:'<path d="m4 12 5 5L20 6"/>',
      damage:'<path d="m13 2-3 8H4l7 5-2 7 11-13h-7Z"/>',dps:'<path d="M4 18 9 11l4 3 7-10M15 4h5v5"/>',
      speed:'<circle cx="12" cy="13" r="8"/><path d="M9 2h6m-3 3v3m0 5 4-4"/>',reload:'<path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6"/>',
      magazine:'<path d="M7 3h10v17l-3 1H7ZM10 7h4m-4 4h4m-4 4h4"/>',
      range:'<path d="M3 12h18M7 8l-4 4 4 4m10-8 4 4-4 4"/>',armor:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6ZM12 7v10"/>',
      headshot:'<circle cx="12" cy="12" r="7"/><path d="M12 1v6m0 10v6M1 12h6m10 0h6"/>',
      critChance:'<path d="m12 2 2 6 6-2-3 6 5 4-7 1-3 5-3-5-7-1 5-4-3-6 6 2Z"/>',
      critDamage:'<path d="m12 2 2 6 6-2-3 6 5 4-7 1-3 5-3-5-7-1 5-4-3-6 6 2Z"/>',
      stamina:'<path d="M5 6h14v14H5ZM9 3h6m-3 7v6m-3-3h6"/>',returnTime:'<path d="M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14"/>',
      info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',warning:'<path d="m12 3 10 18H2ZM12 9v5m0 3v1"/>',
      reset:'<path d="M4 10a8 8 0 1 1 2 8M4 4v6h6"/>',replace:'<path d="M4 7h16l-4-4M20 17H4l4 4"/>',
      location:'<path d="M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="9" r="2"/>',
      class:'<path d="M3 6h15l3 3-3 3h-7l-2 7H5l2-7H3Z"/>',technology:'<path d="m13 2-3 8H4l7 5-2 7 11-13h-7Z"/>',
      content:'<path d="m12 3 9 5v9l-9 5-9-5V8ZM3 8l9 5 9-5m-9 5v9"/>',group:'<path d="M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z"/>',
      manufacturer:'<path d="M3 21V9l6 3V6l6 6V3h6v18ZM7 17h1m4 0h1m4 0h1"/>',damageType:'<path d="M12 3c-2 5-7 7-7 12a7 7 0 0 0 14 0c0-5-5-7-7-12Z"/>',
      missable:'<path d="m12 3 10 18H2ZM12 9v5m0 3v1"/>',data:'<path d="M4 4h16v16H4ZM8 8h8m-8 4h8m-8 4h5"/>'
    };
    const markup=`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.info}</svg>`;iconCache.set(name,markup);return markup;
  }
  function disclosure(node,label,open=false) {
    if(!node)return;
    const details=document.createElement('details');details.className=node.className+' disclosure';details.open=open;
    const summary=document.createElement('summary');summary.innerHTML=icon('info')+escape(label);
    details.append(summary);while(node.firstChild)details.append(node.firstChild);node.replaceWith(details);return details;
  }
  function refineDetail(){
    const root=$('detail-content');
    const identity=root.querySelector('.detail-columns>section');
    const identityDetails=identity?disclosure(identity,'Technical details & identity'):null;
    if(identityDetails){identityDetails.className='identity-details disclosure';identityDetails.querySelector('h3')?.remove();}
    const source=root.querySelector('.detail-sources');source?.querySelector('h3')?.remove();disclosure(source,'Sources & verification');
    const note=root.querySelector('.detail-ability small');
    if(note){const details=document.createElement('details');details.className='ability-provenance';details.innerHTML='<summary>Effect verification</summary>';note.before(details);details.append(note);}
    root.querySelectorAll('.detail-bottom button').forEach((b,i)=>{
      const rows=filtered(),list=rows.some(w=>w.id===detailId)?rows:WEAPONS,at=list.findIndex(w=>w.id===detailId);
      const adjacent=list[(at+(i?1:-1)+list.length)%list.length];b.dataset.tip=adjacent?.name||'';
    });
    const acquire=root.querySelector('.detail-columns>section');
    if(acquire){
      acquire.querySelector('h3').insertAdjacentHTML('afterbegin',icon('location'));
      const facts=acquire.querySelector('.facts'),extra=document.createElement('details');extra.className='acquisition-context';
      const summary=document.createElement('summary');summary.textContent='Route details & fallback';extra.append(summary);
      const extraFacts=document.createElement('dl');extraFacts.className='facts';
      const secondaryLabels=new Set(['Method','Story phase','Lifepath','If missed','Black Market fallback']);
      for(const row of [...facts.children])if(secondaryLabels.has(row.querySelector('dt').textContent))extraFacts.append(row);
      extra.append(extraFacts);facts.after(extra);
      const note=acquire.querySelector('p.muted');if(note)extra.append(note);
    }
    const body=root.querySelector('.detail-body'),secondary=root.querySelector('.detail-columns'),warnings=root.querySelector('.detail-warnings'),sources=root.querySelector('.detail-sources'),record=root.querySelector('.detail-id');
    disclosure(warnings,'Verification notes');
    const verification=root.querySelector('.detail-warnings'),advanced=document.createElement('div');advanced.className='inspection-advanced';if(identityDetails)advanced.append(identityDetails);advanced.append(verification,sources,record);
    const primary=document.createElement('div');primary.className='inspection-primary';while(body.firstChild)primary.append(body.firstChild);secondary.remove();
    const layout=document.createElement('div');layout.className='inspection-layout';layout.append(primary,secondary);body.append(layout,advanced);
    const footer=root.querySelector('.detail-bottom'),scroller=document.createElement('div');scroller.className='detail-scroll';scroller.setAttribute('aria-label','Weapon information');
    footer.remove();while(root.firstChild)scroller.append(root.firstChild);root.append(scroller,footer);
    hydrateArtwork(root);decorateControls(root);
  }
  function refineData(){
    const summaries=['Identity-reconciled inventory, including expansion weapons and rewards.','Patch target, source age and the limits of verification.','Damage and DPS definitions for each shared reference.','Published tiers, unsupported steps and absent measurements.','How effects and weapon families change comparisons.','Preserved discrepancies and fields that remain unknown.','Individual source links, access limits and attribution.','Back up your preferences or export the bundled database.','Fan project, game artwork and third-party sources.'];
    [...$('data-panel').querySelectorAll('.data-card')].forEach((node,i)=>{
      const h=node.querySelector('h3'),label=h.textContent;h.remove();
      const d=disclosure(node,label,i===0||i===7);d.querySelector('summary').insertAdjacentHTML('beforeend',`<span class="disclosure-hint">${summaries[i]}</span>`);
    });
  }
  function decorateControls(scope=document){
    if(scope===document){
      const icons={arsenal:'class',compare:'compare',favorites:'favorite',data:'data',mods:'settings',builds:'inventory'};
      document.querySelectorAll('.masthead nav button').forEach(b=>{if(!b.querySelector('svg'))b.insertAdjacentHTML('afterbegin',b.dataset.nav==='mods'?slotGlyph('normal-mod').replace('<svg','<svg class="ui-icon"'):b.dataset.nav==='builds'?icon('class'):icon(icons[b.dataset.nav]));});
      const search=document.querySelector('.search-box>span');if(!search.querySelector('svg'))search.innerHTML=icon('search');
    }
    const shapes='.primary,.compare-add,.details-small,.replace-weapon,.patch-indicator,.view-switch button,.toolbar .square,.chip,.detail-close,.detail-bottom button,.data-actions button,.picker-head .square,.masthead nav button,.sidebar-head #reset,.sidebar-toggle,.comparison-actions>[data-action="clear-compare"],.compare-tray>[data-action="clear-compare"]';
    scope.querySelectorAll(shapes).forEach(n=>n.classList.add('chamfer'));
    scope.querySelectorAll('.slot-token[title],button[title]').forEach(n=>n.dataset.tip=n.title);
    scope.querySelectorAll('.slot-icons').forEach(n=>{n.tabIndex=0;n.dataset.tip=[...new Set([...n.querySelectorAll('[title]')].map(x=>x.title))].join(' · ');});
    scope.querySelectorAll('.star').forEach(n=>n.dataset.tip=n.getAttribute('aria-label'));
    scope.querySelectorAll('.card-stats>div').forEach(n=>{n.tabIndex=0;n.dataset.tip=n.querySelector('small').textContent+' · '+(state.profile==='records'?'Gamestegy game record':'Nukes & Dragons published value');});
  }
  let pickerIndex=null,pickerOpener=null,pickerRows=[],pickerActive=-1;
  function openPicker(index,opener){
    pickerIndex=index;pickerOpener=opener;$('picker-title').textContent=index===null?'Add a weapon':'Replace '+BY_ID.get(state.compare[index]).name;
    $('picker-query').value='';renderPicker();$('weapon-picker').showModal();$('picker-query').focus();
  }
  function closePicker(){hideTooltip();$('weapon-picker').close();if(pickerOpener?.isConnected&&!pickerOpener.disabled)pickerOpener.focus();else {const add=$('add-comparison');(add&&!add.disabled?add:document.querySelector('.weapon-col:last-child .replace-weapon'))?.focus();}}
  function renderPicker(){
    const terms=normalize($('picker-query').value).split(/\s+/).filter(Boolean);
    pickerRows=WEAPONS.filter(w=>!state.compare.includes(w.id)&&terms.every(t=>normalize([w.name,w.class,w.technology,w.baseModel,w.effect].join(' ')).includes(t)));
    pickerActive=-1;$('picker-query').removeAttribute('aria-activedescendant');
    $('picker-status').textContent=pickerRows.length+' available weapons · selected weapons are excluded';
    $('picker-results').innerHTML=pickerRows.length?pickerRows.map((w,i)=>`<button role="option" aria-selected="false" tabindex="-1" id="pick-${i}" data-action="pick-weapon" data-id="${escape(w.id)}"><span class="picker-art">${artwork(w)}</span><span class="picker-identity"><strong>${escape(w.name)}</strong><small>${escape(w.class)} · ${escape(w.technology)}</small></span><span class="picker-badge">${w.iconic?'◆ Iconic':'Standard'}</span>${icon('plus')}</button>`).join(''):'<div class="picker-no-results">No matches. Try another weapon name or class.</div>';
    hydrateArtwork($('picker-results'));
  }
  function pickWeapon(id){
    if(!BY_ID.has(id)||state.compare.includes(id))return;
    if(pickerIndex===null){if(state.compare.length>=4)return;state.compare.push(id);}else state.compare[pickerIndex]=id;
    save();render();closePicker();toast(BY_ID.get(id).name+' added to comparison.');
  }
  $('picker-query').addEventListener('input',renderPicker);
  $('weapon-picker').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePicker();}},true);
  $('weapon-picker').addEventListener('cancel',e=>{e.preventDefault();closePicker();});
  $('picker-query').addEventListener('keydown',e=>{
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)&&pickerRows.length){
      e.preventDefault();pickerActive=e.key==='Home'?0:e.key==='End'?pickerRows.length-1:(pickerActive+(e.key==='ArrowDown'?1:-1)+pickerRows.length)%pickerRows.length;
      $('picker-results').querySelectorAll('[role=option]').forEach((n,i)=>n.setAttribute('aria-selected',i===pickerActive));
      const n=$('pick-'+pickerActive);$('picker-query').setAttribute('aria-activedescendant',n.id);n.scrollIntoView({block:'nearest'});
    }else if(e.key==='Enter'&&pickerActive>=0){e.preventDefault();pickWeapon(pickerRows[pickerActive].id);}
  });
  document.addEventListener('input',e=>{if(e.target.matches('.filter-search')){const q=normalize(e.target.value);e.target.closest('.multi-options').querySelectorAll('label').forEach(n=>n.hidden=!normalize(n.textContent).includes(q));}});
  let tooltipTarget=null;
  function hideTooltip(){const tip=$('ui-tooltip');if(!tip)return;tip.hidden=true;if(tooltipTarget)tooltipTarget.removeAttribute('aria-describedby');tooltipTarget=null;}
  function showTooltip(n){
    if(!n?.dataset.tip)return;hideTooltip();tooltipTarget=n;const tip=$('ui-tooltip');tip.textContent=n.dataset.tip;tip.hidden=false;n.setAttribute('aria-describedby','ui-tooltip');
    const dialog=document.querySelector('dialog[open]');(dialog||document.body).append(tip);
    const r=n.getBoundingClientRect(),box=tip.getBoundingClientRect(),bounds=dialog?.getBoundingClientRect()||{left:0,right:innerWidth,top:0,bottom:innerHeight};tip.style.left=Math.max(bounds.left+8,Math.min(bounds.right-box.width-8,r.left))+'px';tip.style.top=(r.top-bounds.top>box.height+12?r.top-box.height-8:Math.min(bounds.bottom-box.height-8,r.bottom+8))+'px';
  }
  document.addEventListener('focusin',e=>showTooltip(e.target.closest('[data-tip]')));
  document.addEventListener('focusout',hideTooltip);
  document.addEventListener('pointerover',e=>showTooltip(e.target.closest('[data-tip]')));
  document.addEventListener('pointerout',e=>{if(e.target.closest('[data-tip]'))hideTooltip();});
  document.addEventListener('scroll',hideTooltip,true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTooltip();});

  function init() {
    initMultiFilters();$('slot-legend').innerHTML=slotLegend();
    $('tier').innerHTML=META.tiers.map(t=>`<option value="${t}">${t}</option>`).join('');
    currentView=['arsenal','compare','favorites','data','mods','builds','planner'].includes(location.hash.slice(1))?location.hash.slice(1):'arsenal';
    decorateControls();syncControls();render();save();
    if(!storageAvailable)toast('Browser storage is unavailable. Export preferences from Data notes to keep them.');
  }
  // Read-only inspection helpers support repeatable tests of the delivered file.
  window.Arsenal=Object.freeze({data:DB,stats,filtered,compareNumbers,rankRow,difference,sanitize,slotGroups,getState:()=>JSON.parse(JSON.stringify(state)),getView:()=>currentView,navigate,openDetail,closeDetail,slotGlyph,artwork,hydrateArtwork,decorateControls,toast});
  init();
})();
