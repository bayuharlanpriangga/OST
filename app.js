'use strict';

'use strict';
// ══════════════════════════════
// CONSTANTS
// ══════════════════════════════
const COLORS=['#4A9EFF','#FF6B6B','#51CF66','#CC5DE8','#FF922B','#20C997',
  '#F06595','#74C0FC','#A9E34B','#DA77F2','#FFA94D','#38D9A9',
  '#FFD43B','#F783AC','#63E6BE','#FF8787','#748FFC','#66D9E8',
  '#8CE99A','#E599F7','#FFC078','#3BC9DB'];
const BGM_OPTS=[
  {id:'none', name:'None',         desc:'No music'},
  {id:'lofi', name:'Lo-fi Chill',  desc:'Soft warm beats'},
  {id:'jazz', name:'Light Jazz',   desc:'Upbeat mellow groove'},
  {id:'tense',name:'Tense Build',  desc:'Rising suspense loop'},
  {id:'retro',name:'Retro Arcade', desc:'8-bit energetic loop'},
  {id:'zen',  name:'Zen Ambient',  desc:'Calm meditation tone'},
];
const RES_OPTS=[
  {id:'fanfare', name:'Fanfare',   desc:'Classic win trumpet'},
  {id:'chime',   name:'Chime',     desc:'Bright bell melody'},
  {id:'drumroll',name:'Drum Roll', desc:'Snare + cymbal crash'},
  {id:'pop',     name:'Pop!',      desc:'Playful balloon pop'},
  {id:'ding',    name:'Ding Ding', desc:'Ping-pong ding'},
  {id:'epic',    name:'Epic Rise', desc:'Cinematic swell'},
];
const SK='ost_v2';

// ══════════════════════════════
// STATE
// ══════════════════════════════
let wheels=[], activeWheelId=null, spinCount=0, spinning=false;
let currentAngle=0, historyLog=[], iC=1, wC=1;
let editingId=null, editItems=[], openCtxId=null;
let AC=null, bgmNode=null, bgmGain=null;
let prevTimer=null, modalMode=null;
let deletedWheel=null, undoTimer=null;
let stopSpinReq=false, dragSrcIdx=null;
let deleteTargetId=null;
let ES={duration:5,speed:'normal',fontSize:20,stopOnClick:false,remove:false,bgm:'lofi',result:'fanfare',winners:1};

// ══════════════════════════════
// STORAGE
// ══════════════════════════════
function persist(){
  try{localStorage.setItem(SK,JSON.stringify({wheels,activeWheelId,spinCount,historyLog,iC,wC}));}catch(e){}
}
function hydrate(){
  try{
    const d=JSON.parse(localStorage.getItem(SK)||'null');
    if(!d||!d.wheels?.length) return false;
    ({wheels,activeWheelId,spinCount,historyLog,iC,wC}=d);
    historyLog=historyLog||[];
    return true;
  }catch(e){return false;}
}

// ══════════════════════════════
// AUDIO
// ══════════════════════════════
function getAC(){
  if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)();
  if(AC.state==='suspended') AC.resume();
  return AC;
}
function playTick(){
  try{
    const ac=getAC(),o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);
    o.frequency.value=1100;g.gain.setValueAtTime(.05,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+.035);
    o.start();o.stop(ac.currentTime+.04);
  }catch(e){}
}
function playResult(type){
  if(type==='none') return;
  try{
    const ac=getAC(),m=ac.createGain();m.gain.value=.7;m.connect(ac.destination);
    if(type==='fanfare'){[[523,.0],[659,.12],[784,.24],[880,.36],[1047,.48]].forEach(([f,t])=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(m);o.type='square';o.frequency.value=f;const n=ac.currentTime+t;g.gain.setValueAtTime(0,n);g.gain.linearRampToValueAtTime(.3,n+.03);g.gain.exponentialRampToValueAtTime(.001,n+.25);o.start(n);o.stop(n+.28);});}
    else if(type==='chime'){[[1047,.0],[1319,.1],[1568,.2],[2093,.3],[1568,.45],[2093,.6]].forEach(([f,t])=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(m);o.type='sine';o.frequency.value=f;const n=ac.currentTime+t;g.gain.setValueAtTime(0,n);g.gain.linearRampToValueAtTime(.25,n+.01);g.gain.exponentialRampToValueAtTime(.001,n+.5);o.start(n);o.stop(n+.55);});}
    else if(type==='drumroll'){for(let i=0;i<16;i++){const b=ac.createBuffer(1,ac.sampleRate*.05,ac.sampleRate),d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.exp(-j/800);const s=ac.createBufferSource(),g=ac.createGain();s.buffer=b;s.connect(g);g.connect(m);g.gain.setValueAtTime(.12+i*.014,ac.currentTime+i*.04);s.start(ac.currentTime+i*.04);}const cb=ac.createBuffer(1,ac.sampleRate*.8,ac.sampleRate),cd=cb.getChannelData(0);for(let j=0;j<cd.length;j++)cd[j]=(Math.random()*2-1)*Math.exp(-j/6000);const cs=ac.createBufferSource(),cg=ac.createGain();cs.buffer=cb;cs.connect(cg);cg.connect(m);cg.gain.setValueAtTime(.6,ac.currentTime+.64);cs.start(ac.currentTime+.64);}
    else if(type==='pop'){for(let i=0;i<3;i++){const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(m);o.type='sine';const t=ac.currentTime+i*.15;o.frequency.setValueAtTime(300+i*80,t);o.frequency.exponentialRampToValueAtTime(80,t+.12);g.gain.setValueAtTime(.4,t);g.gain.exponentialRampToValueAtTime(.001,t+.15);o.start(t);o.stop(t+.18);}}
    else if(type==='ding'){[2637,2637*1.5].forEach((f,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(m);o.type='sine';o.frequency.value=f;const t=ac.currentTime+i*.18;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.35,t+.005);g.gain.exponentialRampToValueAtTime(.001,t+.7);o.start(t);o.stop(t+.75);});}
    else if(type==='epic'){[130,164,196,246].forEach(f=>{const o=ac.createOscillator(),g=ac.createGain();o.type='sawtooth';o.frequency.value=f;o.connect(g);g.connect(m);g.gain.setValueAtTime(0,ac.currentTime);g.gain.linearRampToValueAtTime(.12,ac.currentTime+.4);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+1.8);o.start();o.stop(ac.currentTime+1.85);});}
  }catch(e){}
}
function stopBGM(){
  if(!bgmNode) return;
  try{const arr=Array.isArray(bgmNode)?bgmNode.flat():[bgmNode];arr.forEach(n=>{if(typeof n==='number')clearInterval(n);else try{n.stop&&n.stop();}catch(e){}});}catch(e){}
  if(bgmGain){try{bgmGain.gain.linearRampToValueAtTime(0,getAC().currentTime+.5);}catch(e){}}
  bgmNode=null;bgmGain=null;
  document.getElementById('bgm-dot').classList.remove('active');
}
function startBGM(type){
  stopBGM();if(!type||type==='none') return;
  const ac=getAC();bgmGain=ac.createGain();bgmGain.gain.value=0;bgmGain.connect(ac.destination);
  bgmGain.gain.linearRampToValueAtTime(.18,ac.currentTime+1.5);
  document.getElementById('bgm-dot').classList.add('active');
  try{
    if(type==='lofi'){const go=()=>{[130.81,164.81,196,246.94].forEach(f=>{const o=ac.createOscillator(),g=ac.createGain(),fl=ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=400;o.connect(fl);fl.connect(g);g.connect(bgmGain);o.type='sine';o.frequency.value=f;const t=ac.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.2);g.gain.setValueAtTime(.06,t+1.6);g.gain.linearRampToValueAtTime(0,t+2);o.start(t);o.stop(t+2.1);});const b=ac.createOscillator(),bg=ac.createGain();b.connect(bg);bg.connect(bgmGain);b.type='sine';b.frequency.value=65.41;const t=ac.currentTime;bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(.12,t+.05);bg.gain.setValueAtTime(.12,t+.3);bg.gain.linearRampToValueAtTime(0,t+.5);b.start(t);b.stop(t+.6);};go();bgmNode=setInterval(go,2000);}
    else if(type==='jazz'){const n=[261.63,293.66,329.63,392,440,349.23];let ni=0;const go=()=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(bgmGain);o.type='triangle';o.frequency.value=n[ni%n.length];const t=ac.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.1,t+.04);g.gain.setValueAtTime(.1,t+.2);g.gain.linearRampToValueAtTime(0,t+.4);o.start(t);o.stop(t+.45);ni++;};go();bgmNode=setInterval(go,380);}
    else if(type==='tense'){const dr=ac.createOscillator(),dg=ac.createGain();dr.connect(dg);dg.connect(bgmGain);dr.type='sawtooth';dr.frequency.value=80;dg.gain.value=.05;dr.start();let s=0;const iv=setInterval(()=>{s++;dr.frequency.setTargetAtTime(80+s*1.5,ac.currentTime,.5);if(s>24){s=0;dr.frequency.setValueAtTime(80,ac.currentTime);}},500);bgmNode=[dr,iv];}
    else if(type==='retro'){const m=[659,523,587,698,659,523,587,784];let mi=0;const go=()=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(bgmGain);o.type='square';o.frequency.value=m[mi%m.length];const t=ac.currentTime;g.gain.setValueAtTime(.07,t);g.gain.setValueAtTime(.07,t+.1);g.gain.linearRampToValueAtTime(0,t+.15);o.start(t);o.stop(t+.16);mi++;};go();bgmNode=setInterval(go,160);}
    else if(type==='zen'){const nodes=[174.61,220,261.63].map(f=>{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(bgmGain);o.type='sine';o.frequency.value=f;g.gain.value=.04;o.start();const lfo=ac.createOscillator(),lg=ac.createGain();lfo.type='sine';lfo.frequency.value=.15;lg.gain.value=1;lfo.connect(lg);lg.connect(o.frequency);lfo.start();return[o,lfo];});bgmNode=nodes;}
  }catch(e){}
}
function previewSound(id,isResult){
  clearTimeout(prevTimer);
  if(isResult){playResult(id);return;}
  const ac=getAC(),g=ac.createGain();g.gain.value=.2;g.connect(ac.destination);
  const map={lofi:[261,329,392],jazz:[440,392,349],tense:[110,116,123],retro:[659,523,587],zen:[174,220,261]};
  const ns=map[id]||[440];let c=0;
  const iv=setInterval(()=>{if(c>=5){clearInterval(iv);return;}const o=ac.createOscillator(),og=ac.createGain();o.connect(og);og.connect(g);o.type='sine';o.frequency.value=ns[c%ns.length];og.gain.setValueAtTime(.15,ac.currentTime);og.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.35);o.start();o.stop(ac.currentTime+.38);c++;},300);
  prevTimer=setTimeout(()=>clearInterval(iv),1800);
}

// ══════════════════════════════
// PANEL NAV with slide animation
// ══════════════════════════════
let currentPV='list';
function showPV(name,direction='right'){
  const prev=document.getElementById('pv-'+currentPV);
  const next=document.getElementById('pv-'+name);
  if(!next||prev===next) return;
  // set initial position of incoming view
  next.classList.remove('slide-left','slide-right','active');
  next.classList.add(direction==='right'?'slide-right':'slide-left');
  next.style.position='absolute';
  // force reflow
  next.offsetHeight;
  // activate next
  next.classList.remove('slide-right','slide-left');
  next.classList.add('active');
  next.style.position='';
  // deactivate prev
  prev.classList.remove('active');
  prev.classList.add(direction==='right'?'slide-left':'slide-right');
  prev.style.position='absolute';
  setTimeout(()=>{prev.style.position='';},320);
  currentPV=name;
  // manage tabindex
  document.querySelectorAll('.ph-back').forEach(b=>b.tabIndex=(name!=='list')?0:-1);
}
function togglePanel(){
  const p=document.getElementById('panel'),ov=document.getElementById('overlay'),btn=document.getElementById('menu-btn');
  if(p.classList.contains('open')){closePanel();}
  else{showPV('list');renderWheelList();p.classList.add('open');ov.classList.add('show');btn.classList.add('open');}
}
function closePanel(){
  document.getElementById('panel').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('menu-btn').classList.remove('open');
}
function backToList(){showPV('list','left');renderWheelList();}
function backToEdit(){showPV('edit','left');}

// ══════════════════════════════
// SETTINGS
// ══════════════════════════════
function openSettingsView(){
  document.getElementById('s-duration').value=ES.duration;
  document.getElementById('s-fontsize').textContent=ES.fontSize;
  const speedEl=document.getElementById('speed-label');if(speedEl) speedEl.textContent=SPEED_LABELS[ES.speed]||ES.speed;
  const effectEl=document.getElementById('effect-label');if(effectEl) effectEl.textContent=(ANIM_MODES[ES.animMode||'normal']||ANIM_MODES.normal).label;
  const riggedEl=document.getElementById('s-rigged-val');
  if(riggedEl) riggedEl.textContent=riggedItemId?(getActiveWheel()?.items.find(x=>x.id===riggedItemId)?.name||'Set'):'Off';
  const autoEl=document.getElementById('s-autospin-toggle');
  if(autoEl) autoEl.classList.toggle('on',!!timerInterval);
  const winnersEl=document.getElementById('winners-label');if(winnersEl) winnersEl.textContent=ES.winners;
  document.getElementById('s-stoponclick').classList.toggle('on',ES.stopOnClick);
  document.getElementById('s-stoponclick').setAttribute('aria-checked',ES.stopOnClick);
  document.getElementById('s-remove').classList.toggle('on',ES.remove);
  document.getElementById('s-remove').setAttribute('aria-checked',ES.remove);
  updateSoundLabels();
  showPV('settings','right');
}
function updateSoundLabels(){
  document.getElementById('bgm-val').textContent=(BGM_OPTS.find(o=>o.id===ES.bgm)||BGM_OPTS[0]).name;
  document.getElementById('result-val').textContent=(RES_OPTS.find(o=>o.id===ES.result)||RES_OPTS[0]).name;
}
function readSettings(){
  ES.duration=parseFloat(document.getElementById('s-duration').value)||5;
  ES.stopOnClick=document.getElementById('s-stoponclick').classList.contains('on');
  ES.remove=document.getElementById('s-remove').classList.contains('on');
}
const SPEEDS=['slow','normal','fast'];
const SPEED_LABELS={'slow':'Slow','normal':'Normal','fast':'Fast'};
function setSpeed(s){ES.speed=s;const el=document.getElementById('speed-label');if(el) el.textContent=SPEED_LABELS[s]||s;}
function setWinners(n){ES.winners=n;const el=document.getElementById('winners-label');if(el) el.textContent=n;}
function changeFontSize(d){ES.fontSize=Math.max(10,Math.min(36,ES.fontSize+d));document.getElementById('s-fontsize').textContent=ES.fontSize;}

function joltToggle(el){
  const isOn=el.classList.contains('on');
  el.classList.remove('jolton','joltoff');
  el.offsetHeight; // reflow
  if(isOn){el.classList.remove('on');el.classList.add('joltoff');el.setAttribute('aria-checked','false');}
  else{el.classList.add('on','jolton');el.setAttribute('aria-checked','true');}
  setTimeout(()=>el.classList.remove('jolton','joltoff'),400);
}

// ══════════════════════════════
// SOUND MODAL
// ══════════════════════════════
function openModal(mode){
  modalMode=mode;
  const opts=mode==='bgm'?BGM_OPTS:RES_OPTS,cur=mode==='bgm'?ES.bgm:ES.result;
  document.getElementById('modal-title').textContent=mode==='bgm'?'Background Music':'Result Sound';
  const cont=document.getElementById('modal-options');cont.innerHTML='';
  opts.forEach(o=>{
    const div=document.createElement('div');div.className='modal-opt'+(o.id===cur?' sel':'');
    div.innerHTML=`<div class="mo-radio"></div><div class="mo-info"><div class="mo-name">${o.name}</div><div class="mo-desc">${o.desc}</div></div>${o.id!=='none'?`<button class="mo-preview" data-id="${o.id}">▶</button>`:''}`;
    div.addEventListener('click',e=>{
      if(e.target.closest('.mo-preview')) return;
      if(mode==='bgm') ES.bgm=o.id; else ES.result=o.id;
      updateSoundLabels();
      cont.querySelectorAll('.modal-opt').forEach(el=>el.classList.remove('sel'));
      div.classList.add('sel');
    });
    cont.appendChild(div);
  });
  cont.querySelectorAll('.mo-preview').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();const was=btn.classList.contains('playing');
      cont.querySelectorAll('.mo-preview').forEach(b=>b.classList.remove('playing'));
      if(!was){btn.classList.add('playing');previewSound(btn.dataset.id,mode==='result');setTimeout(()=>btn.classList.remove('playing'),2000);}
    });
  });
  document.getElementById('sound-modal').classList.add('show');
}
function closeModal(){document.getElementById('sound-modal').classList.remove('show');}

// ══════════════════════════════
// HISTORY MODAL
// ══════════════════════════════
function openHistoryModal(){
  const body=document.getElementById('hist-modal-body');body.innerHTML='';
  if(!historyLog.length){body.innerHTML='<div class="hist-empty">No spins yet</div>';document.getElementById('history-modal').classList.add('show');return;}
  historyLog.forEach(h=>{
    const div=document.createElement('div');div.className='hist-row';
    div.innerHTML=`<div class="h-dot" style="background:${h.item.color}"></div><div class="h-name">${h.item.name}</div><div class="h-from">${h.wName}</div><div class="h-spin">#${h.spin}</div>`;
    body.appendChild(div);
  });
  document.getElementById('history-modal').classList.add('show');
}
function closeHistoryModal(){document.getElementById('history-modal').classList.remove('show');}

// ══════════════════════════════
// CONFIRM DELETE MODAL
// ══════════════════════════════
function openConfirmDelete(id){
  const w=wheels.find(x=>x.id===id);if(!w) return;
  deleteTargetId=id;
  document.getElementById('confirm-wheel-name').textContent=w.name;
  document.getElementById('confirm-modal').classList.add('show');
}
function closeConfirmModal(){document.getElementById('confirm-modal').classList.remove('show');deleteTargetId=null;}
function confirmDelete(){
  if(!deleteTargetId) return;
  const id=deleteTargetId;closeConfirmModal();
  if(wheels.length<=1) return;
  deletedWheel={wheel:JSON.parse(JSON.stringify(wheels.find(w=>w.id===id))),idx:wheels.findIndex(w=>w.id===id)};
  wheels=wheels.filter(w=>w.id!==id);
  if(activeWheelId===id){activeWheelId=wheels[0].id;currentAngle=0;drawMainWheel();updateMeta();}
  renderWheelList();persist();
  document.getElementById('undo-name').textContent=deletedWheel.wheel.name;
  document.getElementById('undo-bar').classList.add('show');
  clearTimeout(undoTimer);
  undoTimer=setTimeout(()=>{document.getElementById('undo-bar').classList.remove('show');deletedWheel=null;},5000);
}
function undoDelete(){
  if(!deletedWheel) return;
  clearTimeout(undoTimer);
  wheels.splice(deletedWheel.idx,0,deletedWheel.wheel);
  deletedWheel=null;
  document.getElementById('undo-bar').classList.remove('show');
  renderWheelList();persist();
}

// ══════════════════════════════
// WHEEL LIST
// ══════════════════════════════
function mkWheel(name,items,settings){
  return{id:wC++,name,items:items.map((n,i)=>({id:iC++,name:n,color:COLORS[i%COLORS.length],weight:1})),settings:settings||{duration:5,speed:'normal',fontSize:20,stopOnClick:false,remove:false,bgm:'lofi',result:'fanfare',winners:1}};
}
function initDefaults(){
  wheels=[
    mkWheel('Yes / No',['Yes','Yes','Yes','No','No','No','Maybe','Maybe']),
    mkWheel('Food',['Pizza','Sushi','Burger','Pasta','Ramen','Tacos','Salad','Soup','Steak','Fried Rice']),
    mkWheel('Date Ideas',['Movie night','Cooking together','Hiking','Board game','Beach walk','Museum','Café hop','Picnic','Road trip','Stargazing']),
    mkWheel('Days of Week',['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']),
    mkWheel('Dice 6',['1','2','3','4','5','6']),
  ];
  activeWheelId=wheels[0].id;
}

function renderWheelList(){
  const body=document.getElementById('wl-body');body.innerHTML='';
  if(!wheels.length){
    body.innerHTML=`<div class="wl-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg><p>No wheels yet.<br>Create one to start spinning.</p><div class="wl-empty-cta" id="empty-cta">Create a wheel →</div></div>`;
    document.getElementById('empty-cta')?.addEventListener('click',()=>openEditView(null));
    return;
  }
  wheels.forEach(w=>{
    const card=document.createElement('div');
    card.className='wl-card'+(w.id===activeWheelId?' active-card':'');
    card.dataset.wid=w.id;
    card.innerHTML=`
      <div class="wl-mini"><canvas id="mini-${w.id}" width="84" height="84"></canvas></div>
      <div class="wl-info">
        <div class="wl-name">${w.name}</div>
        <div class="wl-count">${w.items.length} item${w.items.length!==1?'s':''} · ${historyLog.filter(h=>h.wName===w.name).length} spins</div>
      </div>
      <button class="wl-3dot" data-wid="${w.id}" aria-label="Options">⋮</button>
      <div class="ctx" id="ctx-${w.id}" role="menu">
        <div class="ctx-item" data-a="edit" data-wid="${w.id}" role="menuitem"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>Edit</div>
        <div class="ctx-item" data-a="dup" data-wid="${w.id}" role="menuitem"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" stroke-width="1.5"/></svg>Duplicate</div>
        <div class="ctx-item danger" data-a="del" data-wid="${w.id}" role="menuitem"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M6 5V3h4v2M7 8v4M9 8v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="3" y="5" width="10" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>Delete</div>
      </div>`;
    body.appendChild(card);
    requestAnimationFrame(()=>drawMini(w));
  });
}

function drawMini(w){
  const c=document.getElementById('mini-'+w.id);if(!c) return;
  const ctx=c.getContext('2d'),cx=42,cy=42,r=40;
  ctx.clearRect(0,0,84,84);
  if(!w.items.length) return;
  const tot=w.items.reduce((s,i)=>s+i.weight,0);let st=-Math.PI/2;
  w.items.forEach(item=>{
    const sw=(item.weight/tot)*Math.PI*2;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,st,st+sw);ctx.closePath();
    ctx.fillStyle=item.color;ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=.8;ctx.stroke();st+=sw;
  });
  ctx.beginPath();ctx.arc(cx,cy,13,0,Math.PI*2);ctx.fillStyle='#111';ctx.fill();
  ctx.strokeStyle='rgba(200,169,110,.4)';ctx.lineWidth=1.5;ctx.stroke();
}

function selectWheel(id){
  if(activeWheelId!==id) stopBGM();
  activeWheelId=id;currentAngle=0;drawMainWheel();updateMeta();closePanel();persist();
  const w=getActiveWheel();if(w) startBGM(w.settings.bgm||'none');
  loadTheme();
  // Loading screen
  runLoadingScreen();
}

function toggleCtx(e,id){
  e.stopPropagation();
  if(openCtxId&&openCtxId!==id){const p=document.getElementById('ctx-'+openCtxId);if(p) p.classList.remove('show');}
  const m=document.getElementById('ctx-'+id);if(!m) return;
  m.classList.toggle('show');openCtxId=m.classList.contains('show')?id:null;
}

// ══════════════════════════════
// EDIT VIEW
// ══════════════════════════════
function openEditView(wheel){
  editingId=wheel?wheel.id:null;
  document.getElementById('edit-title').textContent=wheel?'Edit Wheel':'New Wheel';
  document.getElementById('edit-name').value=wheel?wheel.name:'';
  const s=wheel?wheel.settings:{duration:5,speed:'normal',fontSize:20,stopOnClick:false,remove:false,bgm:'lofi',result:'fanfare',winners:1};
  ES={...s};
  editItems=wheel?JSON.parse(JSON.stringify(wheel.items)):[
    {id:iC++,name:'Option A',color:COLORS[0],weight:1},
    {id:iC++,name:'Option B',color:COLORS[1],weight:1},
  ];
  renderEditItems();
  drawPreview();
  document.getElementById('edit-body').scrollTop=0;
  showPV('edit','right');
}

function renderEditItems(){
  const list=document.getElementById('ei-list');list.innerHTML='';
  editItems.forEach((item,idx)=>{
    const row=document.createElement('div');row.className='ei-row';row.dataset.idx=idx;row.draggable=true;
    row.innerHTML=`
      <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
      <div class="cswatch" style="background:${item.color}" data-idx="${idx}" role="button" tabindex="0" aria-label="Change color"></div>
      <input class="ei-name" type="text" value="${item.name}" placeholder="Item name" maxlength="32" data-idx="${idx}" aria-label="Item name">
      <div class="ei-w-wrap">
        <input class="ei-w" type="number" min="1" max="10" value="${item.weight}" data-idx="${idx}" title="Weight 1-10" aria-label="Weight">
        <div class="ei-w-hint">wt</div>
      </div>
      <button class="ei-del" data-idx="${idx}" aria-label="Remove item">✕</button>`;
    row.addEventListener('dragstart',e=>{dragSrcIdx=idx;row.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
    row.addEventListener('dragend',()=>{row.classList.remove('dragging');document.querySelectorAll('.ei-row').forEach(r=>r.classList.remove('drag-over'));});
    row.addEventListener('dragover',e=>{e.preventDefault();row.classList.add('drag-over');});
    row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));
    row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('drag-over');if(dragSrcIdx===null||dragSrcIdx===idx) return;const m=editItems.splice(dragSrcIdx,1)[0];editItems.splice(idx,0,m);dragSrcIdx=null;renderEditItems();drawPreview();});
    list.appendChild(row);
  });
}

function addEditItem(){
  editItems.push({id:iC++,name:'Option '+(editItems.length+1),color:COLORS[editItems.length%COLORS.length],weight:1});
  renderEditItems();drawPreview();
  setTimeout(()=>{const b=document.getElementById('edit-body');b.scrollTop=b.scrollHeight;},60);
}

function removeEditItemByIdx(idx){
  if(editItems.length<=1) return;
  editItems.splice(idx,1);renderEditItems();drawPreview();
}

function saveWheel(){
  document.querySelectorAll('#ei-list .ei-name').forEach((inp,i)=>{if(editItems[i]) editItems[i].name=inp.value.trim()||'Item';});
  document.querySelectorAll('#ei-list .ei-w').forEach((inp,i)=>{if(editItems[i]) editItems[i].weight=Math.max(1,Math.min(10,parseInt(inp.value)||1));});
  readSettings();
  const name=document.getElementById('edit-name').value.trim()||'My Wheel';
  if(editingId!==null){
    const w=wheels.find(x=>x.id===editingId);
    if(w){w.name=name;w.items=editItems;w.settings={...ES};}
  } else {
    const nw={id:wC++,name,items:editItems,settings:{...ES}};
    wheels.push(nw);activeWheelId=nw.id;currentAngle=0;
  }
  drawMainWheel();updateMeta();backToList();persist();
  const w=getActiveWheel();if(w) startBGM(w.settings.bgm||'none');
}

// ══════════════════════════════
// LIVE PREVIEW
// ══════════════════════════════
function drawPreview(){
  const c=document.getElementById('preview-canvas');
  if(!c) return;
  const ctx=c.getContext('2d'),cx=80,cy=80,r=76;
  ctx.clearRect(0,0,160,160);
  if(!editItems.length) return;
  const tot=editItems.reduce((s,i)=>s+i.weight,0);let st=-Math.PI/2;
  editItems.forEach(item=>{
    const sw=(item.weight/tot)*Math.PI*2;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,st,st+sw);ctx.closePath();
    ctx.fillStyle=item.color;ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=1;ctx.stroke();
    if(sw>0.3){
      ctx.save();ctx.translate(cx,cy);ctx.rotate(st+sw/2);ctx.translate(r*.6,0);
      const label=item.name.length>6?item.name.slice(0,5)+'…':item.name;
      ctx.font='bold 10px Plus Jakarta Sans,sans-serif';
      ctx.fillStyle='rgba(255,255,255,.9)';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=3;ctx.fillText(label,0,0);ctx.restore();
    }
    st+=sw;
  });
  ctx.beginPath();ctx.arc(cx,cy,14,0,Math.PI*2);ctx.fillStyle='#0d0d0d';ctx.fill();
  ctx.strokeStyle='rgba(200,169,110,.95)';ctx.lineWidth=2.5;ctx.stroke();
}

// ════════════════════════════════════
// CONFETTI — from pointer position
// ════════════════════════════════════
function launchConfetti(base){
  const canvas=document.getElementById('confetti-canvas');
  const stage=document.getElementById('stage');
  canvas.width=stage.offsetWidth;canvas.height=stage.offsetHeight;
  const ctx=canvas.getContext('2d');

  // find pointer position relative to stage
  const ww=document.getElementById('wheel-wrap');
  const sr=stage.getBoundingClientRect();
  const wr=ww.getBoundingClientRect();
  const px=(wr.left+wr.width/2-sr.left);
  const py=(wr.top-sr.top+10); // slightly above wheel

  function h2r(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
  const[r,g,b]=h2r(base);
  const tones=[base,`rgb(${Math.min(255,r+70)},${Math.min(255,g+70)},${Math.min(255,b+70)})`,
    `rgb(${Math.max(0,r-50)},${Math.max(0,g-50)},${Math.max(0,b-50)})`,'#C8A96E','#fff'];

  const P=Array.from({length:100},()=>({
    x:px,y:py,
    vx:(Math.random()-.5)*18,vy:(Math.random()-.5)*12-4,
    size:Math.random()*7+3,color:tones[Math.floor(Math.random()*tones.length)],
    rot:Math.random()*Math.PI*2,rotV:(Math.random()-.5)*.35,
    life:1,decay:Math.random()*.013+.008,shape:Math.random()>.5?'rect':'circle',
  }));

  function frame(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=false;
    P.forEach(p=>{
      if(p.life<=0) return;alive=true;
      p.x+=p.vx;p.y+=p.vy;p.vy+=.3;p.vx*=.98;p.rot+=p.rotV;p.life-=p.decay;
      ctx.save();ctx.globalAlpha=p.life;ctx.translate(p.x,p.y);ctx.rotate(p.rot);
      ctx.fillStyle=p.color;
      if(p.shape==='rect') ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
      else{ctx.beginPath();ctx.arc(0,0,p.size/2,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    });
    if(alive) requestAnimationFrame(frame);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  requestAnimationFrame(frame);
}

// ════════════════════════════════════
// HISTORY
// ════════════════════════════════════
function addHistoryItem(item,wName){
  historyLog.unshift({item,wName,spin:spinCount});
  if(historyLog.length>50) historyLog.pop();
}
function renderHistoryUI(){
  const list=document.getElementById('hist-rows');list.innerHTML='';
  if(!historyLog.length){list.innerHTML='<div style="font-size:10px;color:#3a3a3a;font-family:DM Mono,monospace">No spins yet</div>';return;}
  historyLog.slice(0,10).forEach(h=>{
    const div=document.createElement('div');div.className='hist-row';
    div.innerHTML=`<div class="h-dot" style="background:${h.item.color}"></div><div class="h-name">${h.item.name}</div><div class="h-from">${h.wName}</div><div class="h-spin">#${h.spin}</div>`;
    list.appendChild(div);
  });
}
function clearHistory(){historyLog=[];persist();}

// ════════════════════════════════════
// DOM READY
// ════════════════════════════════════

// COLOR PICKER
function openCP(e,idx){
  e.stopPropagation();
  const pop=document.getElementById('cpop');pop.innerHTML='';
  COLORS.forEach(c=>{
    const sw=document.createElement('div');sw.className='cp-sw'+(editItems[idx].color===c?' sel':'');sw.style.background=c;
    sw.addEventListener('click',ev=>{ev.stopPropagation();editItems[idx].color=c;renderEditItems();drawPreview();hideCP();});
    pop.appendChild(sw);
  });
  const rect=e.target.getBoundingClientRect();
  pop.style.left=(rect.left-8)+'px';pop.style.top=(rect.bottom+6)+'px';
  pop.classList.add('show');
}
function hideCP(){document.getElementById('cpop').classList.remove('show');}

// MAIN WHEEL
function getActiveWheel(){return wheels.find(w=>w.id===activeWheelId);}
function getSegs(w){
  if(!w||!w.items.length) return [];
  const tot=w.items.reduce((s,i)=>s+i.weight,0);let start=0;
  return w.items.map(item=>{const sweep=(item.weight/tot)*Math.PI*2;const seg={item,start,sweep};start+=sweep;return seg;});
}
function drawMainWheel(angle,winnerIndices){
  const canvas=document.getElementById('wheel'),ctx=canvas.getContext('2d');
  const cx=420,cy=420,r=410;ctx.clearRect(0,0,840,840);
  const w=getActiveWheel();
  if(!w||!w.items.length){
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#1a1a1a';ctx.fill();
    ctx.strokeStyle='#2e2e2e';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#444';ctx.font='700 20px Plus Jakarta Sans,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Select a wheel',cx,cy);
    return;
  }
  const segs=getSegs(w),rot=(angle!==undefined)?angle:currentAngle,fs=w.settings.fontSize||20;
  // clean fill — no shadow vignette
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#0d0d0d';ctx.fill();
  segs.forEach((seg,i)=>{
    const sa=seg.start+rot-Math.PI/2,ea=sa+seg.sweep,ma=sa+seg.sweep/2;
    const isW=winnerIndices&&winnerIndices.includes(i);
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,sa,ea);ctx.closePath();
    const gx1=cx+Math.cos(ma)*r*.3,gy1=cy+Math.sin(ma)*r*.3,gx2=cx+Math.cos(ma)*r,gy2=cy+Math.sin(ma)*r;
    // Guard: skip gradient if coords are non-finite or degenerate
    const grDist=Math.hypot(gx2-gx1,gy2-gy1);
    if(isFinite(gx1)&&isFinite(gy1)&&isFinite(gx2)&&isFinite(gy2)&&grDist>0.5){
      const gr=ctx.createLinearGradient(gx1,gy1,gx2,gy2);
      gr.addColorStop(0,seg.item.color+(isW?'FF':'EE'));
      gr.addColorStop(1,seg.item.color+(isW?'EE':'EE'));
      ctx.fillStyle=gr;
    } else {
      ctx.fillStyle=seg.item.color;
    }
    ctx.fill();
    if(isW){ctx.save();ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,sa,ea);ctx.closePath();ctx.strokeStyle=seg.item.color;ctx.lineWidth=4;ctx.globalAlpha=.7;ctx.stroke();ctx.restore();}
    // Gold separator — visible thick line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(sa)*16, cy + Math.sin(sa)*16);
    ctx.lineTo(cx + Math.cos(sa)*(r-10), cy + Math.sin(sa)*(r-10));
    ctx.strokeStyle='rgba(200,169,110,.85)';ctx.lineWidth=2.5;
    ctx.lineCap='round';ctx.stroke();
    ctx.restore();
    if(seg.sweep>0.08){
      ctx.save();ctx.translate(cx,cy);ctx.rotate(ma);ctx.translate(r*.63,0);
      const maxC=Math.max(4,Math.floor(seg.sweep*18));
      const label=seg.item.name.length>maxC?seg.item.name.slice(0,maxC-1)+'…':seg.item.name;
      ctx.font='700 '+fs+'px Plus Jakarta Sans,sans-serif';
      ctx.fillStyle=isW?'#fff':'rgba(255,255,255,.93)';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(label,0,0);ctx.restore();
    }
  });
  // Gold outer border — thick, inside canvas boundary
  ctx.beginPath();ctx.arc(cx,cy,r-4,0,Math.PI*2);
  ctx.strokeStyle='#C8A96E';ctx.lineWidth=10;ctx.stroke();
  // Bright edge highlight
  ctx.beginPath();ctx.arc(cx,cy,r-1,0,Math.PI*2);
  ctx.strokeStyle='rgba(232,201,142,.4)';ctx.lineWidth=2;ctx.stroke();
  // Inner edge
  ctx.beginPath();ctx.arc(cx,cy,r-9,0,Math.PI*2);
  ctx.strokeStyle='rgba(200,169,110,.2)';ctx.lineWidth=1;ctx.stroke();
}
function updateMeta(){
  const w=getActiveWheel();
  document.getElementById('header-meta').textContent=w?'— '+w.name:'';
  document.getElementById('wheel-name-label').textContent=w?w.name:'—';
  const btn=document.getElementById('spin-btn');
  if(!w||w.items.length<2){btn.classList.add('need-items');document.getElementById('spin-btn-text').textContent=w&&w.items.length===1?'Need 2+ items':'Select wheel';}
  else{btn.classList.remove('need-items');document.getElementById('spin-btn-text').textContent='SPIN';}
}

// SPIN
function easeOutN(t,n){return 1-Math.pow(1-t,n);}
let winnerQueue=[];
function startSpin(){
  const w=getActiveWheel();if(!w||spinning||w.items.length<2) return;
  spinning=true;stopSpinReq=false;winnerQueue=[];resetFX();
  document.getElementById('spin-btn').disabled=true;
  document.getElementById('stage').classList.add('spinning');
  const hub=document.getElementById('hub');if(w.settings.stopOnClick) hub.classList.add('stop-mode');
  const s=w.settings,winners=Math.min(s.winners||1,w.items.length-1);
  doSpin(w,s,winners,0,()=>{
    spinning=false;
    document.getElementById('spin-btn').disabled=false;
    document.getElementById('stage').classList.remove('spinning');
    hub.classList.remove('stop-mode');
  });
}
function doSpin(w,s,totalWinners,round,onDone){
  const dur=((s.speed==='slow'?1.6:s.speed==='fast'?.55:1)*(s.duration||5))*1000;
  const animEase = getEaseFn(s.animMode||'normal');
  const rots=(s.speed==='slow'?3.5:s.speed==='fast'?9:5.5)+(Math.random()*1.5);
  const startAngle=currentAngle%(Math.PI*2),endAngle=startAngle+rots*Math.PI*2;
  const startTime=performance.now(),easeN=s.speed==='slow'?3:s.speed==='fast'?6:4;
  const segs=getSegs(w);
  const availableSegs=segs.filter(sg=>!winnerQueue.some(wq=>wq.item.id===sg.item.id));
  if(!availableSegs.length){onDone();return;}
  const finalAngle=endAngle%(Math.PI*2);
  const pPos=((Math.PI*4)-(finalAngle%(Math.PI*2)))%(Math.PI*2);
  // rigged mode override
  const riggedOverride = getRiggedWinnerIdx ? getRiggedWinnerIdx(segs) : null;
  let winnerSeg, winnerIdx;
  if(riggedOverride !== null && riggedOverride !== undefined && round===0) {
    winnerIdx = riggedOverride; winnerSeg = segs[winnerIdx];
    setRigged(null); // use once then clear
  } else {
    winnerSeg=availableSegs[0];winnerIdx=segs.indexOf(availableSegs[0]);let cum=0;
    for(const sg of availableSegs){cum+=sg.sweep;if(pPos<cum){winnerSeg=sg;winnerIdx=segs.indexOf(sg);break;}}
  }
  let lastSeg=-1;
  function getSegAt(a){const p=((Math.PI*4)-(a%(Math.PI*2)))%(Math.PI*2);let c=0;for(let i=0;i<segs.length;i++){c+=segs[i].sweep;if(p<c) return i;}return segs.length-1;}
  function frame(now){
    const el=now-startTime;let t=Math.min(el/dur,1);
    if(stopSpinReq) t=Math.min(t+.1,1);
    const _a=startAngle+animEase(t)*(endAngle-startAngle);
    currentAngle=isFinite(_a)?_a:currentAngle;
    // speed: derivative of ease (0=stopped, 1=max)
    const _speed = t < 0.98 ? Math.max(0, 1 - t) : 0;
    const ci=getSegAt(currentAngle);if(ci!==lastSeg){playTick();lastSeg=ci;}
    drawMainWheel(currentAngle);
    // Apply spin visual FX on top of wheel
    if(_speed > 0.01 && s.animMode && s.animMode !== 'normal') {
      const fxCanvas = document.getElementById('wheel');
      const fxCtx = fxCanvas.getContext('2d');
      applySpinFX(fxCtx, 420, 420, 410, s.animMode, _speed);
    }
    if(t<1){requestAnimationFrame(frame);}
    else{
      currentAngle=((endAngle%(Math.PI*2))+(Math.PI*2))%(Math.PI*2);
      if(!isFinite(currentAngle)) currentAngle=0;
      winnerQueue.push({item:winnerSeg.item,idx:winnerIdx});
      drawMainWheel(currentAngle,winnerQueue.map(wq=>wq.idx));
      const pw=document.getElementById('pointer-wrap');pw.classList.add('settling');setTimeout(()=>pw.classList.remove('settling'),600);
      const glow=document.getElementById('wheel-glow');glow.style.setProperty('--glow-color',winnerSeg.item.color+'88');glow.classList.add('show');setTimeout(()=>glow.classList.remove('show'),3800);
      playResult(s.result||'fanfare');
      historyLog.unshift({item:winnerSeg.item,wName:w.name,spin:spinCount+1,round:round+1});
      if(historyLog.length>50) historyLog.pop();
      launchConfetti(winnerSeg.item.color);
      const allItems=winnerQueue.map(wq=>wq.item);
      // celebration fullscreen
      showCelebration(allItems, w);
      // haptic
      triggerHaptic([80,40,160]);
      if(round+1<totalWinners){
        setTimeout(()=>{
          if(s.remove) w.items=w.items.filter(i=>i.id!==winnerSeg.item.id);
          doSpin(w,s,totalWinners,round+1,onDone);
        },1600);
      } else {
        spinCount++;document.getElementById('spin-counter').textContent=spinCount;
        if(s.remove) setTimeout(()=>{winnerQueue.forEach(wq=>{w.items=w.items.filter(i=>i.id!==wq.item.id);});currentAngle=0;drawMainWheel();updateMeta();persist();},1800);
        persist();onDone();
      }
    }
  }
  requestAnimationFrame(frame);
}

// HISTORY



function drawTicks(){
  // tick ring removed per design — no-op kept for compatibility
}

function toggleFullscreen(){
  if(!document.fullscreenElement) document.getElementById('app').requestFullscreen?.();
  else document.exitFullscreen?.();
}


function runLoadingScreen() {
  const screen = document.getElementById('loading-screen');
  const bar    = document.getElementById('loading-bar');
  const pct    = document.getElementById('loading-pct');
  if (!screen) return;

  let progress = 0;
  const steps = [
    { to: 30,  delay: 40  },
    { to: 60,  delay: 60  },
    { to: 80,  delay: 80  },
    { to: 92,  delay: 100 },
    { to: 100, delay: 60  },
  ];

  function animateStep(stepIdx) {
    if (stepIdx >= steps.length) {
      // Done — fade out
      screen.classList.add('loading-done');
      setTimeout(() => { screen.style.display = 'none'; }, 500);
      return;
    }
    const { to, delay } = steps[stepIdx];
    const from = progress;
    const diff = to - from;
    const totalMs = delay * diff;
    const startT = performance.now();

    function tick(now) {
      const elapsed = now - startT;
      const t = Math.min(elapsed / totalMs, 1);
      progress = from + diff * t;
      const p = Math.round(progress);
      if (bar) bar.style.width = p + '%';
      if (pct) pct.textContent = p + '%';
      if (t < 1) requestAnimationFrame(tick);
      else animateStep(stepIdx + 1);
    }
    requestAnimationFrame(tick);
  }

  animateStep(0);
}

document.addEventListener('DOMContentLoaded',()=>{
  // theme — sync saved theme immediately on load
  loadTheme();

  // header
  document.getElementById('menu-btn')?.addEventListener('click',togglePanel);
  document.getElementById('overlay')?.addEventListener('click',closePanel);

  // spin
  document.getElementById('spin-btn')?.addEventListener('click',startSpin);
  document.getElementById('hub')?.addEventListener('click',()=>{
    if(spinning&&getActiveWheel()?.settings.stopOnClick){stopSpinRequested=true;}
    else if(!spinning) startSpin();
  });

  // winner dismiss
  // winner-toast removed — celebration handles dismiss

  // FABs
  document.getElementById('fab-history')?.addEventListener('click', openHistoryModal);
  document.getElementById('fab-fs')?.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange',()=>{
    const isFs=!!document.fullscreenElement;
    const expand=document.querySelector('.icon-expand');
    const compress=document.querySelector('.icon-compress');
    if(expand) expand.style.display=isFs?'none':'block';
    if(compress) compress.style.display=isFs?'block':'none';
  });

  // list panel
  document.getElementById('btn-new')?.addEventListener('click',()=>openEditView(null));
  document.getElementById('btn-wl-add')?.addEventListener('click',()=>openEditView(null));
  document.getElementById('btn-clrhist')?.addEventListener('click',()=>{historyLog=[];persist();closeHistoryModal();});
  document.getElementById('hist-modal-close')?.addEventListener('click', closeHistoryModal);
  document.getElementById('history-modal')?.addEventListener('click', e=>{if(e.target===document.getElementById('history-modal')) closeHistoryModal();});
  document.getElementById('undo-btn')?.addEventListener('click',undoDelete);

  // wheel list delegation
  document.getElementById('wl-body')?.addEventListener('click',e=>{
    const ctxItem=e.target.closest('.ctx-item');
    const dot=e.target.closest('.wl-3dot');
    const info=e.target.closest('.wl-info');
    const card=e.target.closest('.wl-card');
    if(ctxItem){
      const wid=parseInt(ctxItem.dataset.wid),a=ctxItem.dataset.a;
      const m=document.getElementById('ctx-'+wid);if(m) m.classList.remove('show');openCtxId=null;
      if(a==='edit') openEditView(wheels.find(x=>x.id===wid));
      else if(a==='dup'){
        const w=wheels.find(x=>x.id===wid);if(!w) return;
        const c=JSON.parse(JSON.stringify(w));c.id=wheelIdC++;c.name=w.name+' copy';
        c.items=c.items.map(i=>({...i,id:itemIdC++}));wheels.push(c);renderWheelList();persist();
      }
      else if(a==='del') deleteWheel(wid);
      return;
    }
    if(dot){toggleCtx(e,parseInt(dot.dataset.wid));return;}
    if(info||card){
      const wid=parseInt((info||card).closest('[data-wid]')?.dataset.wid||(card?.dataset.wid));
      if(wid&&!e.target.closest('.wl-3dot')&&!e.target.closest('.ctx')) selectWheel(wid);
    }
  });

  // edit
  document.getElementById('btn-edit-back')?.addEventListener('click',backToList);
  document.getElementById('btn-edit-cancel')?.addEventListener('click',backToList);
  document.getElementById('btn-save')?.addEventListener('click',saveWheel);
  document.getElementById('btn-open-settings')?.addEventListener('click',openSettingsView);
  document.getElementById('btn-add-item')?.addEventListener('click',addEditItem);

  document.getElementById('ei-list')?.addEventListener('click',e=>{
    const sw=e.target.closest('.cswatch'),del=e.target.closest('.ei-del');
    if(sw) openCP(e,parseInt(sw.dataset.idx));
    if(del) removeEditItemByIdx(parseInt(del.dataset.idx));
  });
  document.getElementById('ei-list')?.addEventListener('input',e=>{
    const inp=e.target,idx=parseInt(inp.dataset.idx);
    if(isNaN(idx)) return;
    if(inp.classList.contains('ei-name')) editItems[idx].name=inp.value;
    if(inp.classList.contains('ei-w')) editItems[idx].weight=Math.max(1,Math.min(10,parseInt(inp.value)||1));
  });

  // settings
  document.getElementById('btn-set-back')?.addEventListener('click',backToEdit);
  document.getElementById('btn-set-done')?.addEventListener('click',()=>{readSettings();backToEdit();});
  document.getElementById('s-stoponclick')?.addEventListener('click',function(){this.classList.toggle('on');});
  document.getElementById('s-remove')?.addEventListener('click',function(){this.classList.toggle('on');});
  document.getElementById('fs-minus')?.addEventListener('click',()=>changeFontSize(-2));
  document.getElementById('fs-plus')?.addEventListener('click',()=>changeFontSize(2));
  // speed stepper
  document.getElementById('speed-prev')?.addEventListener('click',()=>{const i=SPEEDS.indexOf(ES.speed);setSpeed(SPEEDS[Math.max(0,i-1)]);});
  document.getElementById('speed-next')?.addEventListener('click',()=>{const i=SPEEDS.indexOf(ES.speed);setSpeed(SPEEDS[Math.min(SPEEDS.length-1,i+1)]);});
  // winners stepper
  document.getElementById('winners-prev')?.addEventListener('click',()=>setWinners(Math.max(1,ES.winners-1)));
  document.getElementById('winners-next')?.addEventListener('click',()=>setWinners(Math.min(5,ES.winners+1)));

  // sound rows
  document.getElementById('bgm-row')?.addEventListener('click',e=>{if(!e.target.closest('#bgm-prev-btn')) openModal('bgm');});
  document.getElementById('result-row')?.addEventListener('click',e=>{if(!e.target.closest('#result-prev-btn')) openModal('result');});
  document.getElementById('bgm-prev-btn')?.addEventListener('click',e=>{
    e.stopPropagation();const b=e.currentTarget;
    const was=b.classList.contains('playing');b.classList.toggle('playing',!was);
    if(!was){previewSound(ES.bgm,false);setTimeout(()=>b.classList.remove('playing'),2000);}
  });
  document.getElementById('result-prev-btn')?.addEventListener('click',e=>{
    e.stopPropagation();const b=e.currentTarget;
    const was=b.classList.contains('playing');b.classList.toggle('playing',!was);
    if(!was){previewSound(ES.result,true);setTimeout(()=>b.classList.remove('playing'),2000);}
  });

  // modal
  document.getElementById('modal-close')?.addEventListener('click',closeModal);
  document.getElementById('sound-modal')?.addEventListener('click',e=>{if(e.target===document.getElementById('sound-modal')) closeModal();});

  // global dismiss
  document.addEventListener('click',()=>{
    if(openCtxId){const m=document.getElementById('ctx-'+openCtxId);if(m) m.classList.remove('show');openCtxId=null;}
    hideCP();
  });
  document.addEventListener('keydown',e=>{
    if(e.code==='Space'&&e.target.tagName!=='INPUT'){e.preventDefault();startSpin();}
    if(e.key==='Escape'){closePanel();closeModal();}
  });
  window.addEventListener('resize',()=>{
    const c=document.getElementById('confetti-canvas'),s=document.getElementById('stage');
    c.width=s.offsetWidth;c.height=s.offsetHeight;
    drawTicks();
  });


  // theme
  document.getElementById('theme-btn')?.addEventListener('click', toggleTheme);

  // share
  document.getElementById('btn-share-wheel')?.addEventListener('click', openShareModal);
  document.getElementById('share-modal-close')?.addEventListener('click', closeShareModal);
  document.getElementById('share-modal')?.addEventListener('click', e=>{if(e.target===document.getElementById('share-modal')) closeShareModal();});
  document.getElementById('share-copy-btn')?.addEventListener('click', copyShareURL);
  document.getElementById('embed-copy-btn')?.addEventListener('click', ()=>{
    navigator.clipboard?.writeText(getEmbedCode()).then(()=>showShareToast());
  });

  // bulk paste
  document.getElementById('btn-bulk-paste')?.addEventListener('click', openBulkModal);
  document.getElementById('bulk-modal-close')?.addEventListener('click', closeBulkModal);
  document.getElementById('bulk-modal')?.addEventListener('click', e=>{if(e.target===document.getElementById('bulk-modal')) closeBulkModal();});
  document.getElementById('bulk-cancel-btn')?.addEventListener('click', closeBulkModal);
  document.getElementById('bulk-textarea')?.addEventListener('input', e=>{
    const names = parseBulkText(e.target.value);
    document.getElementById('bulk-count').textContent = names.length;
  });
  document.getElementById('bulk-apply-btn')?.addEventListener('click', ()=>{
    const names = parseBulkText(document.getElementById('bulk-textarea').value);
    if(names.length){ applyBulkItems(names); closeBulkModal(); }
  });

  // celebration
  document.getElementById('celebration-close')?.addEventListener('click', hideCelebration);
  document.getElementById('celebration-spin-again')?.addEventListener('click', ()=>{ hideCelebration(); setTimeout(startSpin, 300); });

  // animation mode
  // Effect stepper in settings
  const EFFECT_KEYS = Object.keys(ANIM_MODES);
  document.getElementById('effect-prev')?.addEventListener('click',()=>{
    const i=EFFECT_KEYS.indexOf(ES.animMode||'normal');
    ES.animMode=EFFECT_KEYS[Math.max(0,i-1)];
    const el=document.getElementById('effect-label');
    if(el) el.textContent=ANIM_MODES[ES.animMode].label;
  });
  document.getElementById('effect-next')?.addEventListener('click',()=>{
    const i=EFFECT_KEYS.indexOf(ES.animMode||'normal');
    ES.animMode=EFFECT_KEYS[Math.min(EFFECT_KEYS.length-1,i+1)];
    const el=document.getElementById('effect-label');
    if(el) el.textContent=ANIM_MODES[ES.animMode].label;
  });
  // Auto-spin toggle in settings
  document.getElementById('s-autospin-toggle')?.addEventListener('click',function(){
    joltToggle(this);
    const active=this.classList.contains('on');
    const interval=parseFloat(document.getElementById('s-autospin-interval')?.value||5);
    if(active) startAutoTimer(interval); else stopAutoTimer();
  });
  document.getElementById('s-autospin-interval')?.addEventListener('change',function(){
    const toggle=document.getElementById('s-autospin-toggle');
    if(toggle?.classList.contains('on')) startAutoTimer(parseFloat(this.value));
  });
  // Rigged btn in settings
  document.getElementById('s-rigged-btn')?.addEventListener('click', openRiggedModal);
  document.getElementById('anim-modal-close')?.addEventListener('click', closeAnimModal);
  document.getElementById('anim-modal')?.addEventListener('click', e=>{if(e.target===document.getElementById('anim-modal')) closeAnimModal();});

  // timer
  let timerSeconds = 5;
  // btn-timer-mode removed from DOM — auto-spin toggle in settings
  document.getElementById('timer-modal-close')?.addEventListener('click', closeTimerModal);
  document.getElementById('timer-modal')?.addEventListener('click', e=>{if(e.target===document.getElementById('timer-modal')) closeTimerModal();});
  document.getElementById('timer-dec')?.addEventListener('click', ()=>{ timerSeconds=Math.max(3,timerSeconds-1); document.getElementById('timer-val').textContent=timerSeconds+'s'; });
  document.getElementById('timer-inc')?.addEventListener('click', ()=>{ timerSeconds=Math.min(60,timerSeconds+1); document.getElementById('timer-val').textContent=timerSeconds+'s'; });
  document.getElementById('timer-start-btn')?.addEventListener('click', ()=>{ startAutoTimer(timerSeconds); closeTimerModal(); });
  document.getElementById('timer-stop-btn')?.addEventListener('click', ()=>{ stopAutoTimer(); closeTimerModal(); });
  document.getElementById('timer-cancel-btn')?.addEventListener('click', stopAutoTimer);

  // rigged
  // btn-rigged-mode removed from DOM — rigged in settings
  document.getElementById('rigged-modal-close')?.addEventListener('click', closeRiggedModal);
  document.getElementById('rigged-modal')?.addEventListener('click', e=>{if(e.target===document.getElementById('rigged-modal')) closeRiggedModal();});

  // export
  document.getElementById('btn-export-csv')?.addEventListener('click', ()=>{
    openExportImportModal();
  });
  document.getElementById('ei-modal-close')?.addEventListener('click', closeExportImportModal);
  document.getElementById('export-import-modal')?.addEventListener('click', e=>{if(e.target===document.getElementById('export-import-modal')) closeExportImportModal();});
  document.getElementById('btn-export-wheels')?.addEventListener('click', ()=>{ exportWheels(); closeExportImportModal(); });
  document.getElementById('btn-export-hist')?.addEventListener('click', ()=>{ exportHistoryCSV(); closeExportImportModal(); });
  document.getElementById('btn-import-file')?.addEventListener('click', ()=>{ importWheels(); closeExportImportModal(); });

  // load wheel from URL if present
  const urlLoaded = loadWheelFromURL();
  if(urlLoaded) { drawMainWheel(); updateMeta(); }

  // INIT
  const loaded=hydrate();
  if(!loaded) initDefaults();
  document.getElementById('spin-counter').textContent=spinCount;
  drawTicks();
  drawMainWheel();
  updateMeta();
  // start bgm for active wheel
  const w=getActiveWheel();if(w) startBGM(w.settings.bgm||'none');
  // run the loading screen intro on initial page load
  runLoadingScreen();
});


// ═══════════════════════════════════════════════
// NEW FEATURES JS
// ═══════════════════════════════════════════════

// ── SHARE VIA URL ────────────────────────────
function generateShareURL() {
  const w = getActiveWheel();
  if (!w) return null;
  const data = {
    n: w.name,
    i: w.items.map(item => ({ n: item.name, c: item.color, w: item.weight }))
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  const url = window.location.href.split('?')[0] + '?wheel=' + encoded;
  return url;
}

function copyShareURL() {
  const url = generateShareURL();
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    showShareToast();
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showShareToast();
  });
}

function showShareToast() {
  const t = document.getElementById('share-toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function getEmbedCode() {
  const url = generateShareURL();
  if (!url) return '';
  return `<iframe src="${url}&embed=1" width="500" height="600" frameborder="0" style="border-radius:12px;border:1px solid #2e2e2e" allow="autoplay" title="OST Spin Wheel"></iframe>`;
}

function loadWheelFromURL() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('wheel');
  if (!encoded) return false;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (!data.n || !data.i) return false;
    const newWheel = {
      id: wC++, name: data.n,
      items: data.i.map(it => ({
        id: iC++,
        name: it.n || 'Item',
        color: it.c || COLORS[iC % COLORS.length],
        weight: it.w || 1
      })),
      settings: { duration:5, speed:'normal', fontSize:20, stopOnClick:false, remove:false, bgm:'lofi', result:'fanfare', winners:1, animMode:'normal' }
    };
    wheels.unshift(newWheel);
    activeWheelId = newWheel.id;
    return true;
  } catch(e) { return false; }
}

// ── BULK PASTE ────────────────────────────────
function parseBulkText(text) {
  return text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l.length <= 32)
    .slice(0, 100);
}

function applyBulkItems(names) {
  if (!names.length) return;
  editItems = names.map((name, i) => ({
    id: iC++,
    name,
    color: COLORS[(editItems.length + i) % COLORS.length],
    weight: 1
  }));
  renderEditItems();
  drawPreview();
}

// ── CELEBRATION SCREEN ────────────────────────
function showCelebration(winners, wheel) {
  const cel = document.getElementById('celebration');
  if (!cel) return;

  // Reset state
  cel.classList.remove('show');

  // Build content fresh each time
  cel.innerHTML = '';

  // Confetti canvas (bottom layer)
  const confCanvas = document.createElement('canvas');
  confCanvas.id = 'celebration-canvas';
  confCanvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;';
  cel.appendChild(confCanvas);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'celebration-close';
  closeBtn.innerHTML = '<span>✕</span>';
  closeBtn.addEventListener('click', hideCelebration);
  cel.appendChild(closeBtn);

  // Content wrapper
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:18px;padding:20px;';
  cel.appendChild(wrap);

  // Label
  const label = document.createElement('div');
  label.className = 'celebration-label';
  label.textContent = winners.length > 1 ? 'WINNERS' : 'WINNER';
  wrap.appendChild(label);

  // Mini wheel canvas
  const wheelSize = Math.min(160, window.innerWidth * 0.32);
  const wCanvas = document.createElement('canvas');
  wCanvas.width = 360; wCanvas.height = 360;
  wCanvas.style.cssText = 'width:' + wheelSize + 'px;height:' + wheelSize + 'px;border-radius:50%;border:3px solid #C8A96E;box-shadow:0 0 30px rgba(200,169,110,.35);';
  wrap.appendChild(wCanvas);
  drawMiniOnCanvas(wCanvas, wheel);

  // Winner name(s)
  if (winners.length === 1) {
    const nameEl = document.createElement('div');
    nameEl.className = 'celebration-name';
    nameEl.textContent = winners[0].name;
    // Tint with winner color
    nameEl.style.color = winners[0].color;
    wrap.appendChild(nameEl);
  } else {
    winners.forEach(w => {
      const row = document.createElement('div');
      row.className = 'celebration-multi-item';
      const dot = document.createElement('span');
      dot.className = 'celebration-dot';
      dot.style.background = w.color;
      dot.style.display = 'inline-block';
      const name = document.createTextNode(w.name);
      row.appendChild(dot); row.appendChild(name);
      wrap.appendChild(row);
    });
  }

  // From wheel name
  const fromEl = document.createElement('div');
  fromEl.className = 'celebration-from';
  fromEl.textContent = wheel.name;
  wrap.appendChild(fromEl);

  // Spin again button
  const btnRow = document.createElement('div');
  btnRow.className = 'celebration-btn-row';
  const spinAgainBtn = document.createElement('button');
  spinAgainBtn.className = 'celebration-spinagain';
  spinAgainBtn.innerHTML = '<span>SPIN AGAIN</span>';
  spinAgainBtn.addEventListener('click', () => { hideCelebration(); setTimeout(startSpin, 300); });
  btnRow.appendChild(spinAgainBtn);
  wrap.appendChild(btnRow);

  // Show
  cel.classList.add('show');

  // Confetti
  confCanvas.width = window.innerWidth;
  confCanvas.height = window.innerHeight;
  launchCelebrationConfettiOnCanvas(confCanvas, winners[0].color);

  // Haptic
  triggerHaptic([100, 50, 200]);
}

function hideCelebration() {
  const cel = document.getElementById('celebration');
  if (cel) cel.classList.remove('show');
}

function drawMiniOnCanvas(canvas, wheel) {
  if (!wheel || !wheel.items.length) return;
  const ctx = canvas.getContext('2d');
  const cx = 180, cy = 180, r = 174;
  ctx.clearRect(0, 0, 360, 360);
  const tot = wheel.items.reduce((s,i) => s+i.weight, 0);
  let st = -Math.PI/2;
  wheel.items.forEach(item => {
    const sw = (item.weight/tot)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,st,st+sw); ctx.closePath();
    ctx.fillStyle = item.color; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    st += sw;
  });
  ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2);
  ctx.fillStyle = '#111'; ctx.fill();
  ctx.strokeStyle = 'rgba(200,169,110,.5)'; ctx.lineWidth = 3; ctx.stroke();
}

function launchCelebrationConfettiOnCanvas(canvas, base) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function h2r(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
  const [r,g,b] = h2r(base.startsWith('#') ? base : '#C8A96E');
  const tones = [base,`rgb(${Math.min(255,r+80)},${Math.min(255,g+80)},${Math.min(255,b+80)})`,
    `rgb(${Math.max(0,r-60)},${Math.max(0,g-60)},${Math.max(0,b-60)})`,'#C8A96E','#fff','#f0f0f0'];
  const P = Array.from({length:160}, (_, i) => ({
    x: Math.random()*canvas.width, y: -20 - Math.random()*100,
    vx: (Math.random()-.5)*5, vy: Math.random()*4+2,
    size: Math.random()*9+4, color: tones[Math.floor(Math.random()*tones.length)],
    rot: Math.random()*Math.PI*2, rotV: (Math.random()-.5)*.2,
    life: 1, decay: Math.random()*.008+.005,
    shape: Math.random()>.5?'rect':'circle', swing: Math.random()*2-1, t:0
  }));
  function frame() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive = false;
    P.forEach(p => {
      if(p.life<=0) return; alive=true;
      p.t+=0.05; p.x+=p.vx+Math.sin(p.t)*p.swing;
      p.y+=p.vy; p.vy+=.12; p.rot+=p.rotV; p.life-=p.decay;
      ctx.save(); ctx.globalAlpha=p.life; ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.color;
      if(p.shape==='rect') ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
      else{ctx.beginPath();ctx.arc(0,0,p.size/2,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    });
    if(alive) requestAnimationFrame(frame);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  requestAnimationFrame(frame);
}

// ── HAPTIC FEEDBACK ───────────────────────────
function triggerHaptic(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch(e) {}
}

// ── TIMER AUTO-SPIN ───────────────────────────
let timerInterval = null;
let timerRemaining = 0;
let timerTotal = 0;

function startAutoTimer(seconds) {
  stopAutoTimer();
  timerTotal = seconds;
  timerRemaining = seconds;
  const bar = document.getElementById('timer-bar');
  const fill = document.getElementById('timer-bar-fill');
  const badge = document.getElementById('timer-badge');
  const countdown = document.getElementById('timer-countdown');
  bar.style.display = 'block';
  badge.classList.add('show');
  fill.style.transition = 'none';
  fill.style.width = '100%';

  const tick = () => {
    timerRemaining -= 0.1;
    const pct = Math.max(0, (timerRemaining / timerTotal) * 100);
    fill.style.transition = 'width 0.1s linear';
    fill.style.width = pct + '%';
    countdown.textContent = Math.ceil(timerRemaining) + 's';
    if (timerRemaining <= 0) {
      startSpin();
      timerRemaining = timerTotal;
      fill.style.transition = 'none';
      fill.style.width = '100%';
    }
  };
  timerInterval = setInterval(tick, 100);
}

function stopAutoTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  document.getElementById('timer-bar').style.display = 'none';
  document.getElementById('timer-badge').classList.remove('show');
}

// ── RIGGED MODE ───────────────────────────────
let riggedItemId = null;

function setRigged(itemId) {
  riggedItemId = itemId;
  const ind = document.getElementById('rigged-indicator');
  if(ind) ind.style.display = itemId ? 'block' : 'none';
  const lbl = document.getElementById('s-rigged-val');
  if(lbl) lbl.textContent = itemId?(getActiveWheel()?.items.find(x=>x.id===itemId)?.name||'Set'):'Off';
}

function getRiggedWinnerIdx(segs) {
  if (!riggedItemId) return null;
  const idx = segs.findIndex(s => s.item.id === riggedItemId);
  return idx >= 0 ? idx : null;
}

// ── SPIN ANIMATION MODES ─────────────────────
// Spin visual effect modes — all use same ease, differ in visual FX during spin
const ANIM_MODES = {
  normal: {
    label:'Normal',   desc:'Clean spin, no extra effects',
    ease:(t)=>1-Math.pow(1-t,4),
    fx: null
  },
  blur: {
    label:'Blur',     desc:'Motion blur trail while spinning',
    ease:(t)=>1-Math.pow(1-t,4),
    fx: 'blur'
  },
  pulse: {
    label:'Pulse',    desc:'Segments pulse brightness while spinning',
    ease:(t)=>1-Math.pow(1-t,4),
    fx: 'pulse'
  },
  glow: {
    label:'Glow',     desc:'Gold glow intensifies as wheel spins',
    ease:(t)=>1-Math.pow(1-t,4),
    fx: 'glow'
  },
};

// Active FX state
let _fxGlowAlpha = 0;
let _fxPulseT = 0;

function applySpinFX(ctx, cx, cy, r, mode, speed) {
  if (!mode || mode === 'normal') return;
  if (mode === 'blur') {
    // Draw motion blur: several ghost copies at slightly behind angles
    if (speed > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.18, speed * 0.6);
      ctx.filter = 'blur(3px)';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();
      ctx.restore();
    }
  } else if (mode === 'pulse') {
    _fxPulseT += 0.18;
    const brightness = 0.08 + Math.abs(Math.sin(_fxPulseT)) * 0.12 * speed;
    ctx.save();
    ctx.globalAlpha = brightness;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.restore();
  } else if (mode === 'glow') {
    const glowA = Math.min(0.5, speed * 1.2);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r+2, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(200,169,110,' + glowA.toFixed(3) + ')';
    ctx.lineWidth = 8 + speed * 12;
    ctx.stroke();
    ctx.restore();
  }
}

function getEaseFn(mode) {
  return (ANIM_MODES[mode] || ANIM_MODES.normal).ease;
}
// Reset FX state on spin start
function resetFX() { _fxGlowAlpha=0; _fxPulseT=0; }

// ── DARK/LIGHT THEME ─────────────────────────
let isDark = false;
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('light', !isDark);
  localStorage.setItem('ost_theme', isDark ? 'dark' : 'light');
  loadTheme(); // sync icon
}

function loadTheme() {
  const saved = localStorage.getItem('ost_theme');
  if (saved === 'dark') {
    isDark = true;
    document.body.classList.remove('light');
  } else {
    // default = light, or explicit 'light'
    isDark = false;
    document.body.classList.add('light');
  }
  // Update theme icon
  const btn = document.getElementById('theme-btn');
  if (btn) {
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.innerHTML = isDark
      ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v1M8 14v1M1 8h1M14 8h1M3.05 3.05l.7.7M12.25 12.25l.7.7M3.05 12.95l.7-.7M12.25 3.75l.7-.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.4"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
}

// ── ITEM WIN STATS ────────────────────────────
function getItemWins(itemId) {
  return historyLog.filter(h => h.item.id === itemId).length;
}

// ── TEAM MODE ─────────────────────────────────
let teamMode = false;
let teams = [];
let teamAssignments = [];

function initTeamMode(teamNames, participants) {
  teams = teamNames.map((name, i) => ({ name, color: COLORS[i % COLORS.length], members: [] }));
  teamAssignments = [];
  // Add participants as wheel items
  editItems = participants.map((name, i) => ({
    id: iC++, name, color: COLORS[i % COLORS.length], weight: 1
  }));
  teamMode = true;
}

function assignToTeam(winnerItem) {
  if (!teamMode || !teams.length) return;
  const teamIdx = teamAssignments.length % teams.length;
  teams[teamIdx].members.push(winnerItem.name);
  teamAssignments.push({ member: winnerItem.name, team: teams[teamIdx].name });
}

// ── EXPORT HISTORY ────────────────────────────
function exportHistoryCSV() {
  if (!historyLog.length) return;
  const rows = ['Spin,Winner,Wheel,Color'];
  historyLog.forEach(h => {
    rows.push(`${h.spin},"${h.item.name}","${h.wName}","${h.item.color}"`);
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ost-history.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportWheels() {
  const data = JSON.stringify({ version:1, wheels, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ost-wheels.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importWheels() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.csv';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        if (file.name.endsWith('.csv')) {
          // Import history CSV
          const lines = ev.target.result.split('\n').slice(1).filter(l=>l.trim());
          lines.forEach(line => {
            const parts = line.match(/(".*?"|[^,]+)/g);
            if (!parts || parts.length < 4) return;
            const spin = parseInt(parts[0]);
            const name = parts[1].replace(/"/g,'');
            const wName = parts[2].replace(/"/g,'');
            const color = parts[3].replace(/"/g,'');
            historyLog.push({ spin, item:{ name, color, id:iC++ }, wName });
          });
          spinCount = Math.max(spinCount, ...historyLog.map(h=>h.spin));
          document.getElementById('spin-counter').textContent = spinCount;
          showImportToast(`Imported ${lines.length} history entries`);
        } else {
          // Import wheels JSON
          const data = JSON.parse(ev.target.result);
          const imported = data.wheels || [];
          let count = 0;
          imported.forEach(w => {
            // Avoid duplicates by name
            if (!wheels.find(x => x.name === w.name)) {
              w.id = wC++;
              w.items = (w.items||[]).map(it => ({...it, id:iC++}));
              if (!w.settings) w.settings = {duration:5,speed:'normal',fontSize:20,stopOnClick:false,remove:false,bgm:'lofi',result:'fanfare',winners:1,animMode:'normal'};
              wheels.push(w);
              count++;
            }
          });
          persist();
          renderWheelList();
          showImportToast(`Imported ${count} wheel${count!==1?'s':''}`);
        }
        persist();
      } catch(err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function showImportToast(msg) {
  const t = document.getElementById('share-toast');
  t.querySelector('span') ? t.querySelector('span').textContent = msg : null;
  // reuse share toast with different message
  const orig = t.innerHTML;
  t.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> ${msg}`;
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); setTimeout(()=>t.innerHTML=orig,300); }, 2500);
}

// ── OPEN MODALS ───────────────────────────────
function openShareModal() {
  const url = generateShareURL();
  document.getElementById('share-url-text').textContent = url || '—';
  document.getElementById('embed-code-text').textContent = getEmbedCode();
  document.getElementById('share-modal').classList.add('show');
}
function closeShareModal() { document.getElementById('share-modal').classList.remove('show'); }

function openExportImportModal() {
  document.getElementById('export-import-modal').classList.add('show');
}
function closeExportImportModal() {
  document.getElementById('export-import-modal').classList.remove('show');
}

function openBulkModal() { document.getElementById('bulk-modal').classList.add('show'); }
function closeBulkModal() { document.getElementById('bulk-modal').classList.remove('show'); }

function openAnimModal() {
  const w = getActiveWheel();
  const cur = w?.settings?.animMode || 'normal';
  renderAnimOptions(cur);
  document.getElementById('anim-modal').classList.add('show');
}
function closeAnimModal() { document.getElementById('anim-modal').classList.remove('show'); }

function renderAnimOptions(selected) {
  const cont = document.getElementById('anim-options');
  cont.innerHTML = '';
  Object.entries(ANIM_MODES).forEach(([key, val]) => {
    const div = document.createElement('div');
    div.className = 'anim-opt' + (key===selected?' sel':'');
    const icons = {normal:'🎡',bounce:'🏀',suspense:'😬',lightning:'⚡'};
    div.innerHTML = `<div class="anim-opt-icon">${icons[key]||'🎡'}</div>
      <div><div class="anim-opt-name">${val.label}</div><div class="anim-opt-desc">${val.desc}</div></div>`;
    div.addEventListener('click', () => {
      const w = getActiveWheel(); if(w) { w.settings.animMode = key; persist(); }
      cont.querySelectorAll('.anim-opt').forEach(el=>el.classList.remove('sel'));
      div.classList.add('sel');
      closeAnimModal();
    });
    cont.appendChild(div);
  });
}

function openTimerModal() { document.getElementById('timer-modal').classList.add('show'); }
function closeTimerModal() { document.getElementById('timer-modal').classList.remove('show'); }

function openRiggedModal() {
  const w = getActiveWheel(); if(!w) return;
  const cont = document.getElementById('rigged-options');
  cont.innerHTML = '';
  // None option
  const none = document.createElement('div');
  none.className = 'modal-opt' + (!riggedItemId?' sel':'');
  none.innerHTML = `<div class="mo-radio"></div><div class="mo-info"><div class="mo-name">No rigging</div><div class="mo-desc">Fair random selection</div></div>`;
  none.addEventListener('click', () => { setRigged(null); closeRiggedModal(); renderWheelList(); });
  cont.appendChild(none);
  w.items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'modal-opt' + (riggedItemId===item.id?' sel':'');
    div.innerHTML = `<div class="mo-radio"></div>
      <div class="mo-info"><div class="mo-name" style="display:flex;align-items:center;gap:8px">
        <span style="width:10px;height:10px;border-radius:50%;background:${item.color};display:inline-block;flex-shrink:0"></span>
        ${item.name}
      </div><div class="mo-desc">Force this item to win next spin</div></div>`;
    div.addEventListener('click', () => { setRigged(item.id); closeRiggedModal(); renderWheelList(); });
    cont.appendChild(div);
  });
  document.getElementById('rigged-modal').classList.add('show');
}
function closeRiggedModal() { document.getElementById('rigged-modal').classList.remove('show'); }
