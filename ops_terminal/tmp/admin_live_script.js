
const S={tab:'m',models:[],options:[],groups:[],media:[],folders:[],activeFolderId:0,activeModelId:null,page:{blocks:[]},selectedBlockId:null,selectedElId:null,selectedImgTextIdx:0,imageTextOpen:true,insertAt:0,dirty:false,timer:null,saving:false,uploading:false,lastHash:''};
const $=id=>document.getElementById(id), api=(u,o)=>fetch(u,o).then(r=>r.json()), uid=p=>p+Math.random().toString(36).slice(2,8), clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=s=>(s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]));
const ROTATE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4.55a8 8 0 0 0 -6 14.9m0 -4.45v5h-5" /><path d="M18.37 7.16l0 .01" /><path d="M13 19.94l0 .01" /><path d="M16.84 18.37l0 .01" /><path d="M19.37 15.1l0 .01" /><path d="M19.94 11l0 .01" /></svg>';
const COLOR_SWATCHES = ['#ffffff','#f8fafc','#e2e8f0','#94a3b8','#334155','#0f172a','#111827','#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6','#6366f1','#a855f7','#ec4899'];
const FONT_PRESETS = {
  inter: "font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:0",
  manrope: "font-family:Manrope,Inter,Arial,sans-serif;letter-spacing:0",
  montserrat: "font-family:Montserrat,Inter,Arial,sans-serif;letter-spacing:0",
  rubik: "font-family:Rubik,Inter,Arial,sans-serif;letter-spacing:0",
  playfair: "font-family:'Playfair Display',Georgia,serif;letter-spacing:0",
  siberia_sans: "font-family:Manrope,Inter,Arial,sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:0",
  taiga_soft: "font-family:Rubik,Inter,Arial,sans-serif;font-weight:600;letter-spacing:0",
  steam_serif: "font-family:'Playfair Display',Georgia,serif;font-style:italic;letter-spacing:0"
};
const fontCss = key => FONT_PRESETS[key] || FONT_PRESETS.inter;
const fontSelect = (current, onChange) => `<select onchange="${onChange}"><option value="inter" ${current==='inter'?'selected':''}>Inter (free)</option><option value="manrope" ${current==='manrope'?'selected':''}>Manrope (free)</option><option value="montserrat" ${current==='montserrat'?'selected':''}>Montserrat (free)</option><option value="rubik" ${current==='rubik'?'selected':''}>Rubik (free)</option><option value="playfair" ${current==='playfair'?'selected':''}>Playfair Display (free)</option><option value="siberia_sans" ${current==='siberia_sans'?'selected':''}>Siberia Sans (Р°РІС‚РѕСЂСЃРєРёР№)</option><option value="taiga_soft" ${current==='taiga_soft'?'selected':''}>Taiga Soft (Р°РІС‚РѕСЂСЃРєРёР№)</option><option value="steam_serif" ${current==='steam_serif'?'selected':''}>Steam Serif (Р°РІС‚РѕСЂСЃРєРёР№)</option></select>`;
const colorPickerHtml = (value, setExpr) => `<div class="color-ui"><div class="color-row"><span class="color-chip" style="background:${value||'#ffffff'}"></span><input type="color" value="${value||'#ffffff'}" onchange="${setExpr.replace('{v}','this.value')}"><input value="${value||'#ffffff'}" maxlength="7" onchange="${setExpr.replace('{v}','this.value')}" style="width:110px"></div><div class="swatches">${COLOR_SWATCHES.map(c=>`<button type="button" class="swatch" style="background:${c}" onclick="${setExpr.replace('{v}',`'${c}'`)}" title="${c}"></button>`).join('')}</div></div>`;
const normalizeUrl = u => (u && u.indexOf('./uploads/')===0) ? ('/uploads/' + u.slice('./uploads/'.length)) : (u||'');
const hash=()=>JSON.stringify(S.page||{blocks:[]});
const block=()=>S.page.blocks.find(x=>x.id===S.selectedBlockId)||null;
const el=()=>{const b=block(); return b?(b.elements||[]).find(x=>x.id===S.selectedElId)||null:null;};
const findImageElementById=(elementId)=>{
  for(const b of (S.page.blocks||[])){
    for(const item of (b.elements||[])){
      if(item.id===elementId && item.type==='image') return item;
    }
  }
  return null;
};
const setState=t=>$('saveState').textContent=t;
const persistViewState=()=>{
  try{
    localStorage.setItem('bath_admin_state', JSON.stringify({
      tab:S.tab,
      modelId:S.activeModelId||0,
      folderId:S.activeFolderId||0,
      scrollY: window.scrollY||0
    }));
  }catch(_e){}
};
const touch=()=>{S.dirty=true;setState('Р•СЃС‚СЊ РЅРµСЃРѕС…СЂР°РЅРµРЅРЅС‹Рµ РёР·РјРµРЅРµРЅРёСЏ');clearTimeout(S.timer);S.timer=setTimeout(()=>save(false),1000);};
const mkBlock=()=>({id:uid('b'),title:'РќРѕРІС‹Р№ Р±Р»РѕРє',elements:[]});

function renderTabs(){
  $('tabM').classList.toggle('on',S.tab==='m');$('tabO').classList.toggle('on',S.tab==='o');$('tabD').classList.toggle('on',S.tab==='d');
  $('panelM').classList.toggle('hidden',S.tab!=='m');$('panelO').classList.toggle('hidden',S.tab!=='o');$('panelD').classList.toggle('hidden',S.tab!=='d');
  $('workspace').classList.toggle('hidden',S.tab!=='m');
  $('optPreview').classList.toggle('hidden',S.tab!=='o');
  $('mediaWorkspace').classList.toggle('hidden',S.tab!=='d');
  const mainPanel = document.querySelector('main.p');
  const settingsPanel = document.querySelector('aside.p.r');
  if(mainPanel) mainPanel.classList.toggle('hidden', false);
  if(settingsPanel) settingsPanel.classList.toggle('hidden', S.tab==='d');
  try{ localStorage.setItem('bath_admin_tab', S.tab); }catch(_e){}
  persistViewState();
  try{
    const h = S.tab==='d' ? 'media' : (S.tab==='o' ? 'options' : 'models');
    const url = new URL(location.href);
    url.hash = h;
    url.searchParams.set('tab', h);
    history.replaceState(null, '', url.toString());
  }catch(_e){}
}
function renderModels(){
  $('models').innerHTML=''; 
  S.models.forEach(m=>{
    const d=document.createElement('div');
    d.className='item';
    d.innerHTML=`<a href="#" class="model-link" data-act="open">${esc(m.name)}</a><div style="display:flex;gap:4px;align-items:center;flex-shrink:0"><button class="icon-btn" data-act="edit" title="Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ" aria-label="Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ">вњЋ</button><button class="icon-btn" data-act="copy" title="РљРѕРїРёСЂРѕРІР°С‚СЊ" aria-label="РљРѕРїРёСЂРѕРІР°С‚СЊ"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><rect x="2" y="2" width="13" height="13" rx="2"></rect></svg></button><button class="icon-btn" data-act="del" title="РЈРґР°Р»РёС‚СЊ" aria-label="РЈРґР°Р»РёС‚СЊ">рџ—‘</button></div>`;
    d.querySelector('[data-act="open"]').onclick=(ev)=>{ev.preventDefault(); loadPage(m.id);};
    d.querySelector('[data-act="edit"]').onclick=()=>editModel(m);
    d.querySelector('[data-act="copy"]').onclick=()=>copyModelById(m.id);
    d.querySelector('[data-act="del"]').onclick=()=>deleteModel(m);
    $('models').appendChild(d);
  });
}
function renderOptions(){
  $('options').innerHTML='';$('optPreview').innerHTML='';
  const groups = [];
  const byGroup = new Map();
  (S.options||[]).forEach(o=>{
    const key = String(o.group_id || 0);
    if(!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(o);
  });
  (S.groups||[]).forEach(g=>groups.push({id:g.id,name:g.name,key:String(g.id)}));
  if(byGroup.has('0') && byGroup.get('0').length) groups.push({id:0,name:'Р‘РµР· РіСЂСѓРїРїС‹',key:'0'});
  groups.forEach(g=>{
    const list = byGroup.get(g.key) || [];
    const head = document.createElement('div');
    head.className = 'tiny';
    head.style.cssText = 'margin:10px 0 6px;font-weight:700;color:#334155';
    head.textContent = g.name;
    $('options').appendChild(head);
    list.forEach(o=>{
      const d=document.createElement('div');
      d.className='item';
      d.innerHTML=`<div style="min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(o.name)}</b><div class="tiny">${esc(o.group_name||g.name)} В· ${Number(o.price).toLocaleString('ru-RU')} в‚Ѕ</div></div><div style="display:flex;gap:4px;align-items:center;flex-shrink:0"><button class="icon-btn" data-edit-opt="${o.id}" title="Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ">вњЋ</button><button class="icon-btn" data-del-opt="${o.id}" title="РЈРґР°Р»РёС‚СЊ">рџ—‘</button></div>`;
      $('options').appendChild(d);
      d.querySelector('[data-edit-opt]').onclick=()=>editOption(o);
      d.querySelector('[data-del-opt]').onclick=()=>deleteOption(o);
      const c=document.createElement('article');
      c.className='card';
      c.innerHTML=`${o.image_url?`<img src="${o.image_url}" style="height:130px">`:''}<div style="padding:8px"><b>${esc(o.name)}</b><div class="tiny">${esc(o.group_name||g.name)} В· ${Number(o.price).toLocaleString('ru-RU')} в‚Ѕ</div></div>`;
      $('optPreview').appendChild(c);
    });
  });
}
function renderMedia(){
  const root=$('mediaWorkspace'); if(!root) return;
  const folders = S.folders.length ? S.folders : [{id:1,name:'РќРµСЂР°СЃРїСЂРµРґРµР»РµРЅРЅС‹Рµ С„РѕС‚Рѕ'}];
  const folderHtml = folders.map(f=>`<button type="button" class="folder-item ${parseInt(f.id,10)===parseInt(S.activeFolderId,10)?'active':''}" onclick="selectFolder(${parseInt(f.id,10)})">${esc(f.name)}</button>`).join('');
  const files = S.media.filter(m=>parseInt(m.folder_id||1,10)===parseInt(S.activeFolderId,10));
  const fileHtml = files.length
    ? files.map(m=>`<article class="media-card"><img src="${normalizeUrl(m.file_url)}"><div class="media-body"><div class="tiny" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.file_name)}</div><div style="display:flex;gap:6px;margin-top:6px"><button class="icon-btn" title="РЈРґР°Р»РёС‚СЊ С„Р°Р№Р»" onclick="deleteMedia(${parseInt(m.id,10)})">рџ—‘</button></div></div></article>`).join('')
    : '<div class="tiny">Р’ СЌС‚РѕР№ РїР°РїРєРµ РїРѕРєР° РЅРµС‚ С„Р°Р№Р»РѕРІ.</div>';
  root.innerHTML = `<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><button class="btn" onclick="createFolder()">+ РџР°РїРєР°</button><input id="mediaUploadInput" type="file" accept="image/*"><button class="btn" onclick="uploadToMedia()">Р—Р°РіСЂСѓР·РёС‚СЊ РІ РїР°РїРєСѓ</button></div><div class="media-layout"><div>${folderHtml}</div><div class="media-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${fileHtml}</div></div>`;
}
function addStrip(i){const d=document.createElement('div');d.className='strip';d.textContent='Р”РѕР±Р°РІРёС‚СЊ Р±Р»РѕРє';d.onclick=()=>{const b=mkBlock(); S.page.blocks.splice(i,0,b); S.selectedBlockId=b.id; S.selectedElId=null; renderWorkspace(); renderSettings(); touch();};return d;}
function renderWorkspace(){
  const w=$('workspace'); w.innerHTML=''; if(!S.activeModelId){w.innerHTML='<div class="tiny">Р’С‹Р±РµСЂРёС‚Рµ РјРѕРґРµР»СЊ СЃР»РµРІР°.</div>'; return;}
  w.appendChild(addStrip(0));
  S.page.blocks.forEach((b,i)=>{const box=document.createElement('div');box.className='block'+(S.selectedBlockId===b.id?' sel':'');box.dataset.blockId=b.id;box.onclick=()=>{S.selectedBlockId=b.id;S.selectedElId=null;renderWorkspace();renderSettings();};
    let html=`<div><b>${esc(b.title||'Р‘Р»РѕРє')}</b></div>`;
    (b.elements||[]).forEach(e=>{
      if(e.type==='text'){
        html+=`<div class="el" data-e="${e.id}">
          <div class="text-canvas">
            <div class="text-box" data-text-box="${e.id}" style="left:${e.x||8}%;top:${e.y||8}%;width:${e.width||55}%;font-size:${e.size||36}px;color:${e.color||'#111'};${fontCss(e.fontKey||'inter')};transform:rotate(${e.rotate||0}deg)">
              <div>${esc(e.text||'')}</div>
              <i class="rotate" data-action="rotate" data-e="${e.id}">${ROTATE_ICON}</i>
              <i class="resize" data-action="resize" data-e="${e.id}"></i>
              ${(Math.abs(parseFloat(e.rotate||0))<0.01)?'<span class="angle-zero">0В°</span>':''}
            </div>
          </div>
        </div>`;
      }
      if(e.type==='image'){const imgSrc=normalizeUrl(e.url||e.imageUrl||'');html+=`<div class="el" data-e="${e.id}"><div class="photo" data-image-drop="${e.id}" style="height:${e.height||320}px">${imgSrc?`<img src="${imgSrc}" style="opacity:${(e.opacity||100)/100};filter:contrast(${e.contrast||100}%) brightness(${e.brightness||100}%)">`:'<div class="tiny" style="padding:12px">РџРµСЂРµС‚Р°С‰РёС‚Рµ С„РѕС‚Рѕ СЃСЋРґР°</div>'}${(e.texts||[]).map((t,ti)=>`<div class="text-box" data-img-text-box="${e.id}" data-ti="${ti}" style="left:${t.x||8}%;top:${t.y||8}%;width:${t.width||55}%;color:${t.color||'#fff'};font-size:${t.size||34}px;${fontCss(t.fontKey||'inter')};opacity:${(t.opacity||100)/100};filter:contrast(${t.textContrast||100}%) brightness(${t.textBrightness||100}%) saturate(${t.textSaturation||100}%);text-shadow:0 2px 12px rgba(0,0,0,${(t.shadow||35)/100});transform:rotate(${t.rotate||0}deg)"><div>${esc(t.text||'')}</div><i class="rotate" data-action="rotate" data-e="imgtxt:${e.id}:${ti}">${ROTATE_ICON}</i><i class="resize" data-action="resize" data-e="imgtxt:${e.id}:${ti}"></i>${(Math.abs(parseFloat(t.rotate||0))<0.01)?'<span class="angle-zero">0В°</span>':''}</div>`).join('')}</div></div>`;}
      if(e.type==='form'){html+=`<div class="el" data-e="${e.id}"><div class="tiny">Р¤РѕСЂРјР°: ${esc(e.title||'Р—Р°СЏРІРєР°')}</div></div>`;}
      if(e.type==='options'){const cols=clamp(parseInt(e.columns||3,10),1,5);const arr=S.options.filter(o=>(e.optionIds||[]).includes(parseInt(o.id,10)));html+=`<div class="el" data-e="${e.id}"><div class="cards" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${arr.map(o=>`<article class="card">${o.image_url?`<img src="${o.image_url}" style="height:${e.imageHeight||160}px">`:''}<div style="padding:8px;font-size:${e.textSize||14}px"><b>${esc(o.name)}</b><div class="tiny">${Number(o.price).toLocaleString('ru-RU')} в‚Ѕ</div></div></article>`).join('')}</div></div>`;}
    });
    box.innerHTML=html;
    box.querySelectorAll('[data-e]').forEach(n=>n.onclick=(ev)=>{ev.stopPropagation();S.selectedBlockId=b.id;S.selectedElId=n.getAttribute('data-e');renderWorkspace();renderSettings();});
    w.appendChild(box); w.appendChild(addStrip(i+1));
  });
}
function renderSettings(){
  const p=$('settings'), b=block(), it=el();
  if(!b){p.innerHTML='Р’С‹Р±РµСЂРёС‚Рµ Р±Р»РѕРє РЅР° С…РѕР»СЃС‚Рµ.';return;}
  const byType = t => {
    if(t==='text'){
      const standalone = (b.elements||[]).find(x=>x.type==='text');
      if(standalone) return standalone;
      const img = (b.elements||[]).find(x=>x.type==='image');
      if(img && Array.isArray(img.texts)){
        const hasText = img.texts.some(tt => tt && tt.text && String(tt.text).trim());
        if(hasText) return img;
      }
      return null;
    }
    return (b.elements||[]).find(x=>x.type===t) || null;
  };
  const menuBtn = (t, add, title) => {
    const ex = byType(t);
    return `<button class="btn" style="width:100%" onclick="pickOrAdd('${t}')">${ex ? title : add}</button>`;
  };
  const quickMenu = `<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:10px">
    ${menuBtn('text','Р”РѕР±Р°РІРёС‚СЊ С‚РµРєСЃС‚','РўРµРєСЃС‚')}
    ${menuBtn('image','Р”РѕР±Р°РІРёС‚СЊ С„РѕС‚Рѕ','Р¤РѕС‚Рѕ')}
    ${menuBtn('form','Р”РѕР±Р°РІРёС‚СЊ С„РѕСЂРјСѓ','Р¤РѕСЂРјР°')}
    ${menuBtn('options','Р”РѕР±Р°РІРёС‚СЊ РѕРїС†РёРё','РћРїС†РёРё')}
  </div>`;
  if(!it){
    const elementsList = (b.elements||[]).map(x=>`<div class="item" style="margin-bottom:6px"><span>${x.type==='text'?'РўРµРєСЃС‚':x.type==='image'?'Р¤РѕС‚Рѕ':x.type==='form'?'Р¤РѕСЂРјР°':'РћРїС†РёРё'}</span><button class="btn" onclick="selectEl('${x.id}')">РќР°СЃС‚СЂРѕРёС‚СЊ</button></div>`).join('');
    p.innerHTML=`${quickMenu}
    <div class="field"><label>РќР°Р·РІР°РЅРёРµ Р±Р»РѕРєР°</label><input value="${esc(b.title||'')}" onchange="setBlockTitle(this.value)"></div>
    <div style="margin-bottom:8px"><button class="btn" style="width:100%" onclick="clearBlockContent()">РћС‡РёСЃС‚РёС‚СЊ СЃРѕРґРµСЂР¶РёРјРѕРµ Р±Р»РѕРєР°</button></div>
    <div style="margin-bottom:8px"><button class="btn" style="width:100%;border-color:#ef9a9a;color:#a11" onclick="removeBlock()">РЈРґР°Р»РёС‚СЊ Р±Р»РѕРє</button></div>
    <div style="margin-top:10px"><b style="font-size:13px">Р­Р»РµРјРµРЅС‚С‹ Р±Р»РѕРєР°</b><div style="margin-top:6px">${elementsList || '<span class="tiny">Р­Р»РµРјРµРЅС‚РѕРІ РїРѕРєР° РЅРµС‚.</span>'}</div></div>
    <div class="tiny" style="margin-top:8px">Р§С‚Рѕ РґРѕР±Р°РІРёР»Рё РІ Р±Р»РѕРє вЂ” СЃСЂР°Р·Сѓ РїРѕСЏРІР»СЏРµС‚СЃСЏ Р·РґРµСЃСЊ.</div>`;
    return;
  }
  if(it.type==='text'){
    p.innerHTML=`${quickMenu}<div style="margin-bottom:8px"><button class="btn" style="width:100%;border-color:#ef9a9a;color:#a11" onclick="removeBlock()">РЈРґР°Р»РёС‚СЊ Р±Р»РѕРє</button></div><details open><summary><b>РўРµРєСЃС‚</b></summary>
      <div style="margin-top:8px">
        <div class="field"><label>РўРµРєСЃС‚</label><textarea rows="4" oninput="setEl('text',this.value)">${esc(it.text||'')}</textarea></div>
        <div class="field"><label>Р Р°Р·РјРµСЂ</label><input type="range" min="12" max="96" value="${it.size||28}" oninput="setEl('size',parseInt(this.value,10))"></div>
        <div class="field"><label>РЁСЂРёС„С‚</label>${fontSelect(it.fontKey||'inter',"setEl('fontKey',this.value)")}</div>
        <div class="field"><label>Р¦РІРµС‚</label>${colorPickerHtml(it.color||'#111111',"setEl('color',{v})")}</div>
        <div class="field"><label>РџРѕРІРѕСЂРѕС‚</label><input type="range" min="-180" max="180" value="${it.rotate||0}" oninput="setEl('rotate',parseInt(this.value,10))"></div>
      </div>
    </details>
    <div class="tiny" style="margin-top:8px">РњРѕР¶РЅРѕ РјРµРЅСЏС‚СЊ РјС‹С€СЊСЋ РїСЂСЏРјРѕ РІ Р±Р»РѕРєРµ: РґРІРёРіР°С‚СЊ, РєСЂСѓС‚РёС‚СЊ, СЂР°СЃС‚СЏРіРёРІР°С‚СЊ.</div>`;
    return;
  }
  if(it.type==='image'){
    const texts = Array.isArray(it.texts) ? it.texts : [];
    const idx = Math.min(S.selectedImgTextIdx||0, Math.max(0, texts.length-1));
    const t=texts[idx]||{text:'',x:8,y:8,width:55,size:34,color:'#ffffff',rotate:0};
    const textTabs = texts.map((_,i)=>`<button class="btn" type="button" onclick="selectImgText(${i})" style="padding:4px 8px;${i===idx?'border-color:#16a34a;color:#16a34a':''}">РўРµРєСЃС‚ ${i+1}</button>`).join(' ');
    p.innerHTML=`${quickMenu}<div style="margin-bottom:8px"><button class="btn" style="width:100%;border-color:#ef9a9a;color:#a11" onclick="removeBlock()">РЈРґР°Р»РёС‚СЊ Р±Р»РѕРє</button></div><details open><summary><b>Р¤РѕРЅ</b></summary>
      <div style="margin-top:8px">
        <div class="drop" id="dropZone">РџРµСЂРµС‚Р°СЃРєРёРІР°РЅРёРµ РІСЂРµРјРµРЅРЅРѕ РѕС‚РєР»СЋС‡РµРЅРѕ. Р’С‹Р±РµСЂРёС‚Рµ С„Р°Р№Р» РЅРёР¶Рµ.</div>
        <div style="display:flex;gap:8px;align-items:center;margin:8px 0">
          <input id="fileInput" type="file" accept="image/*">
          <button class="btn" id="uploadBtn" type="button">Р—Р°РіСЂСѓР·РёС‚СЊ С„Р°Р№Р»</button>
        </div>
        <div class="field"><label>Р’С‹Р±СЂР°С‚СЊ РёР· РјРµРґРёР°С‚РµРєРё</label>
          <div class="media-grid">
            ${S.media.map(m=>`<button type="button" class="media-thumb ${((it.url||it.imageUrl||'')===m.file_url)?'active':''}" onclick="applyMediaUrl('${m.file_url.replace(/'/g,"\\'")}')" title="${esc(m.file_name)}"><img src="${m.file_url}" alt="${esc(m.file_name)}"></button>`).join('')}
          </div>
        </div>
        <div class="field"><label>URL С„РѕС‚Рѕ</label><input value="${esc(it.url||it.imageUrl||'')}" onchange="setEl('url',this.value)"></div>
        <div class="field"><label>Р’С‹СЃРѕС‚Р° Р±Р»РѕРєР° С„РѕС‚Рѕ</label><input type="range" min="180" max="800" value="${it.height||320}" oninput="setEl('height',parseInt(this.value,10))"></div>
        <div class="field"><label>РџСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊ С„РѕС‚Рѕ</label><input type="range" min="0" max="100" value="${it.opacity||100}" oninput="setEl('opacity',parseInt(this.value,10))"></div>
        <div class="field"><label>РљРѕРЅС‚СЂР°СЃС‚ С„РѕС‚Рѕ</label><input type="range" min="50" max="180" value="${it.contrast||100}" oninput="setEl('contrast',parseInt(this.value,10))"></div>
      </div>
    </details>
    <details ${S.imageTextOpen?'open':''}><summary><b>РўРµРєСЃС‚</b></summary>
      <div style="margin-top:8px">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${textTabs || '<span class="tiny">РўРµРєСЃС‚РѕРІ РїРѕРєР° РЅРµС‚.</span>'}</div>
        <div style="display:flex;gap:6px;margin-bottom:8px">
          <button class="btn" type="button" onclick="addImgText()">Р”РѕР±Р°РІРёС‚СЊ РµС‰Рµ С‚РµРєСЃС‚</button>
          ${texts.length?'<button class="btn" type="button" onclick="removeImgText()">РЈРґР°Р»РёС‚СЊ С‚РµРєСЃС‚</button>':''}
        </div>
        <div class="field"><label>РўРµРєСЃС‚ РЅР° С„РѕС‚Рѕ</label><textarea rows="3" oninput="setImgText('text',this.value)">${esc(t.text||'')}</textarea></div>
        <div class="field"><label>X (%)</label><input type="range" min="0" max="90" step="0.5" value="${t.x||8}" oninput="setImgText('x',parseFloat(this.value))"></div>
        <div class="field"><label>Y (%)</label><input type="range" min="0" max="90" step="0.5" value="${t.y||8}" oninput="setImgText('y',parseFloat(this.value))"></div>
        <div class="field"><label>РЁРёСЂРёРЅР° С‚РµРєСЃС‚Р° (%)</label><input type="range" min="8" max="95" step="0.5" value="${t.width||55}" oninput="setImgText('width',parseFloat(this.value))"></div>
        <div class="field"><label>Р Р°Р·РјРµСЂ С‚РµРєСЃС‚Р°</label><input type="range" min="12" max="96" step="0.5" value="${t.size||34}" oninput="setImgText('size',parseFloat(this.value))"></div>
        <div class="field"><label>РЁСЂРёС„С‚</label>${fontSelect(t.fontKey||'inter',"setImgText('fontKey',this.value)")}</div>
        <div class="field"><label>Р¦РІРµС‚ С‚РµРєСЃС‚Р°</label>${colorPickerHtml(t.color||'#ffffff',"setImgText('color',{v})")}</div>
        <div class="field"><label>РџСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊ С‚РµРєСЃС‚Р°</label><input type="range" min="0" max="100" value="${t.opacity||100}" oninput="setImgText('opacity',parseInt(this.value,10))"></div>
        <div class="field"><label>РљРѕРЅС‚СЂР°СЃС‚ С‚РµРєСЃС‚Р°</label><input type="range" min="50" max="180" value="${t.textContrast||100}" oninput="setImgText('textContrast',parseInt(this.value,10))"></div>
        <div class="field"><label>РЇСЂРєРѕСЃС‚СЊ С‚РµРєСЃС‚Р°</label><input type="range" min="50" max="180" value="${t.textBrightness||100}" oninput="setImgText('textBrightness',parseInt(this.value,10))"></div>
        <div class="field"><label>РќР°СЃС‹С‰РµРЅРЅРѕСЃС‚СЊ С‚РµРєСЃС‚Р°</label><input type="range" min="0" max="200" value="${t.textSaturation||100}" oninput="setImgText('textSaturation',parseInt(this.value,10))"></div>
        <div class="field"><label>РљРѕРЅС‚СЂР°СЃС‚РЅРѕСЃС‚СЊ (С‚РµРЅСЊ)</label><input type="range" min="0" max="100" value="${t.shadow||35}" oninput="setImgText('shadow',parseInt(this.value,10))"></div>
      </div>
    </details>`;
    bindUpload();
    return;
  }
  if(it.type==='form'){
    p.innerHTML=`${quickMenu}<div style="margin-bottom:8px"><button class="btn" style="width:100%;border-color:#ef9a9a;color:#a11" onclick="removeBlock()">РЈРґР°Р»РёС‚СЊ Р±Р»РѕРє</button></div><div class="field"><label>Р—Р°РіРѕР»РѕРІРѕРє С„РѕСЂРјС‹</label><input value="${esc(it.title||'Р—Р°СЏРІРєР°')}" oninput="setEl('title',this.value)"></div>`;
    return;
  }
  if(it.type==='options'){
    const checks=S.options.map(o=>`<label style="display:flex;gap:6px"><input type="checkbox" ${(it.optionIds||[]).includes(parseInt(o.id,10))?'checked':''} onchange="toggleOpt(${parseInt(o.id,10)},this.checked)">${esc(o.name)}</label>`).join('');
    p.innerHTML=`${quickMenu}<div style="margin-bottom:8px"><button class="btn" style="width:100%;border-color:#ef9a9a;color:#a11" onclick="removeBlock()">РЈРґР°Р»РёС‚СЊ Р±Р»РѕРє</button></div><div class="field"><label>РћРїС†РёР№ РІ СЂСЏРґ</label><input type="range" min="1" max="5" value="${it.columns||3}" oninput="setEl('columns',parseInt(this.value,10))"></div>
    <div class="field"><label>Р’С‹СЃРѕС‚Р° РєР°СЂС‚РёРЅРєРё</label><input type="range" min="100" max="320" value="${it.imageHeight||160}" oninput="setEl('imageHeight',parseInt(this.value,10))"></div>
    <div class="field"><label>Р Р°Р·РјРµСЂ С‚РµРєСЃС‚Р°</label><input type="range" min="12" max="24" value="${it.textSize||14}" oninput="setEl('textSize',parseInt(this.value,10))"></div>
    <div class="field"><label>Р’С‹Р±РѕСЂ РѕРїС†РёР№</label><div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;max-height:220px;overflow:auto">${checks||'<span class="tiny">РЎРЅР°С‡Р°Р»Р° РґРѕР±Р°РІСЊС‚Рµ РѕРїС†РёРё.</span>'}</div></div>`;
  }
}
function bindUpload(){
  const fi=$('fileInput'),dz=$('dropZone'),ub=$('uploadBtn'); if(!fi||!dz) return;
  fi.onchange=()=>{if(fi.files&&fi.files[0]) upload(fi.files[0]);};
  if(ub) ub.onclick=()=>{ if(fi.files&&fi.files[0]) upload(fi.files[0]); else alert('РЎРЅР°С‡Р°Р»Р° РІС‹Р±РµСЂРёС‚Рµ С„Р°Р№Р»'); };
  dz.ondragover=e=>{e.preventDefault();dz.style.borderColor='#b87524'}; dz.ondragleave=()=>dz.style.borderColor='#cfd4dc';
  dz.ondrop=e=>{e.preventDefault();dz.style.borderColor='#cfd4dc'; if(e.dataTransfer.files&&e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]);};
}
async function toJpegBlob(file){
  if(!file.type.startsWith('image/')) return file;
  if(typeof createImageBitmap !== 'function') return file;
  const bmp = await Promise.race([
    createImageBitmap(file),
    new Promise((_,rej)=>setTimeout(()=>rej(new Error('image prepare timeout')),5000))
  ]);
  const maxSide = 1920;
  let w=bmp.width, h=bmp.height;
  if(Math.max(w,h)>maxSide){
    const k=maxSide/Math.max(w,h); w=Math.round(w*k); h=Math.round(h*k);
  }
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d'); ctx.drawImage(bmp,0,0,w,h);
  return await new Promise(res=>c.toBlob(b=>res(b||file),'image/jpeg',0.86));
}

function findBlockByNode(node){
  const id = node && node.getAttribute && node.getAttribute('data-block-id');
  return id ? (S.page.blocks||[]).find(x=>x.id===id) : null;
}
function ensureImageElementForDrop(blockNode, imageId){
  let b = findBlockByNode(blockNode);
  if(!b && S.selectedBlockId) b = block();
  if(!b) return null;
  b.elements = b.elements || [];
  let imageEl = imageId ? b.elements.find(x=>x.id===imageId && x.type==='image') : null;
  if(!imageEl) imageEl = b.elements.find(x=>x.type==='image');
  if(!imageEl){
    imageEl = {id:uid('e'),type:'image',url:'',height:420,opacity:100,contrast:100,brightness:100,texts:[]};
    b.elements.push(imageEl);
  }
  S.selectedBlockId = b.id;
  S.selectedElId = imageEl.id;
  return imageEl;
}

async function upload(file, elementId){
  if(S.uploading) return;
  S.uploading = true;
  setState('РџРѕРґРіРѕС‚РѕРІРєР° С„РѕС‚Рѕ...');
  try{
    let blob = file;
    try{ blob = await toJpegBlob(file); }catch(_prepErr){ blob = file; }
    const outName = blob === file ? (file.name || 'upload.jpg') : 'upload.jpg';
    const fd=new FormData(); fd.append('file',blob,outName);
    setState('Р—Р°РіСЂСѓР·РєР° С„РѕС‚Рѕ...');
    const r=await fetch('./api/index.php?action=upload_image',{method:'POST',body:fd}).then(x=>x.json()).catch(()=>({ok:false,error:'РЎРµС‚СЊ РЅРµРґРѕСЃС‚СѓРїРЅР°'}));
    if(!r.ok){ alert(r.error||'РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё С„РѕС‚Рѕ'); return; }
    if(elementId){
      const imageEl=findImageElementById(elementId);
      if(imageEl){
        imageEl.url=r.url;
        S.selectedElId = elementId;
        renderWorkspace();
        renderSettings();
        touch();
        save(false);
      }
    } else {
      setEl('url',r.url);
      save(false);
    }
    setState('Р¤РѕС‚Рѕ Р·Р°РіСЂСѓР¶РµРЅРѕ');
    refreshMedia();
  } catch(_e) {
    setState('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё');
  } finally {
    S.uploading = false;
  }
}

window.setBlockTitle=v=>{const b=block(); if(!b)return; b.title=v; renderWorkspace(); touch();};
window.addEl=t=>{const b=block(); if(!b)return; let x={id:uid('e'),type:t};
  if(t==='text') x={...x,text:'РќРѕРІС‹Р№ С‚РµРєСЃС‚',size:36,color:'#111111',fontKey:'inter',x:8,y:8,width:55,rotate:0};
  if(t==='image') x={...x,url:'',height:420,opacity:100,contrast:100,brightness:100,texts:[]};
  if(t==='form') x={...x,title:'РћСЃС‚Р°РІСЊС‚Рµ Р·Р°СЏРІРєСѓ'};
  if(t==='options') x={...x,columns:3,imageHeight:160,textSize:14,optionIds:S.options.map(o=>parseInt(o.id,10))};
  b.elements=b.elements||[]; b.elements.push(x); S.selectedElId=x.id; renderWorkspace(); renderSettings(); touch();
};
window.setEl=(k,v)=>{const i=el(); if(!i)return; i[k]=v; renderWorkspace(); touch();};
window.setImgText=(k,v)=>{const i=el(); if(!i||i.type!=='image')return; i.texts=Array.isArray(i.texts)?i.texts:[]; if(!i.texts.length) i.texts.push({text:'РќРѕРІС‹Р№ С‚РµРєСЃС‚',x:8,y:8,width:55,size:38,fontKey:'inter',color:'#ffffff',rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:35}); const idx=Math.min(S.selectedImgTextIdx||0, i.texts.length-1); i.texts[idx][k]=v; renderWorkspace(); touch();};
window.selectImgText=(idx)=>{S.selectedImgTextIdx=idx; renderWorkspace(); renderSettings();};
window.addImgText=()=>{const i=el(); if(!i||i.type!=='image')return; i.texts=Array.isArray(i.texts)?i.texts:[]; i.texts.push({text:'РќРѕРІС‹Р№ С‚РµРєСЃС‚',x:8,y:8,width:55,size:38,fontKey:'inter',color:'#ffffff',rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:35}); S.selectedImgTextIdx=i.texts.length-1; renderWorkspace(); renderSettings(); touch();};
window.removeImgText=()=>{const i=el(); if(!i||i.type!=='image')return; i.texts=Array.isArray(i.texts)?i.texts:[]; if(!i.texts.length) return; i.texts.splice(Math.min(S.selectedImgTextIdx||0,i.texts.length-1),1); S.selectedImgTextIdx=Math.max(0,Math.min(S.selectedImgTextIdx||0,i.texts.length-1)); renderWorkspace(); renderSettings(); touch();};
window.applyMediaUrl=(url)=>{const i=el(); if(!i||i.type!=='image'||!url) return; i.url=url; renderWorkspace(); renderSettings(); touch(); save(false);};
window.toggleOpt=(id,on)=>{const i=el(); if(!i||i.type!=='options')return; const s=new Set(i.optionIds||[]); on?s.add(id):s.delete(id); i.optionIds=[...s]; renderWorkspace(); touch();};
window.selectEl=(id)=>{S.selectedElId=id; renderWorkspace(); renderSettings();};
window.pickOrAdd=(type)=>{
  const b=block(); if(!b) return;
  if(type==='text'){
    const img=(b.elements||[]).find(x=>x.type==='image');
    if(img){
      img.texts = Array.isArray(img.texts) ? img.texts : [];
      let changed = false;
      if(!img.texts.length){ img.texts.push({text:'РќРѕРІС‹Р№ С‚РµРєСЃС‚',x:8,y:8,width:55,size:38,fontKey:'inter',color:'#ffffff',rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:35}); S.selectedImgTextIdx=0; changed = true; }
      if(!img.texts[S.selectedImgTextIdx] || !String(img.texts[S.selectedImgTextIdx].text||'').trim()){ img.texts[S.selectedImgTextIdx].text='РќРѕРІС‹Р№ С‚РµРєСЃС‚'; changed = true; }
      S.selectedElId=img.id;
      if(!changed){ S.imageTextOpen = !S.imageTextOpen; } else { S.imageTextOpen = true; }
      renderWorkspace();
      renderSettings();
      if(changed) touch();
      return;
    }
  }
  const ex=(b.elements||[]).find(x=>x.type===type);
  if(ex){ S.selectedElId=ex.id; renderWorkspace(); renderSettings(); return; }
  addEl(type);
};
window.removeBlock=()=>{
  const b=block(); if(!b) return;
  if(!confirm('РЈРґР°Р»РёС‚СЊ С‚РµРєСѓС‰РёР№ Р±Р»РѕРє?')) return;
  S.page.blocks = (S.page.blocks||[]).filter(x=>x.id!==b.id);
  S.selectedBlockId = null;
  S.selectedElId = null;
  renderWorkspace();
  renderSettings();
  touch();
};
window.clearBlockContent=()=>{
  const b=block(); if(!b) return;
  if(!confirm('РћС‡РёСЃС‚РёС‚СЊ СЃРѕРґРµСЂР¶РёРјРѕРµ Р±Р»РѕРєР°?')) return;
  b.elements=[];
  S.selectedElId=null;
  S.selectedImgTextIdx=0;
  renderWorkspace(); renderSettings(); touch();
};
window.toggleModal=on=>$('addBlockModal').classList.toggle('on',!!on);
const dragState={mode:null,eid:null,isImgText:false,startX:0,startY:0,base:null};
function getTextMoveBounds(eid, isImgText){
  let node=null, container=null;
  if(isImgText || String(eid).indexOf('imgtxt:')===0){
    const parts=String(eid).split(':'); const imageId=parts[1]; const ti=parseInt(parts[2]||'0',10)||0;
    node=document.querySelector(`[data-img-text-box="${imageId}"][data-ti="${ti}"]`);
    if(node) container=node.closest('.photo');
  } else {
    node=document.querySelector(`[data-text-box="${eid}"]`);
    if(node) container=node.closest('.text-canvas');
  }
  if(!node || !container) return {maxX:100,maxY:100};
  const cw=container.clientWidth||1, ch=container.clientHeight||1;
  const bw=node.offsetWidth||1, bh=node.offsetHeight||1;
  return {
    maxX: Math.max(0, 100 - (bw/cw)*100),
    maxY: Math.max(0, 100 - (bh/ch)*100)
  };
}

async function save(manual){
  if(!S.activeModelId) return false; const h=hash();
  if(!manual && (!S.dirty || S.saving || h===S.lastHash)) return true;
  S.saving=true; setState('РЎРѕС…СЂР°РЅРµРЅРёРµ...');
  const fd=new URLSearchParams(); fd.append('model_id',S.activeModelId); fd.append('page_json',h);
  const r=await api('./api/index.php?action=save_page',{method:'POST',body:fd}).catch(()=>({ok:false}));
  S.saving=false; if(!r.ok){setState('РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ'); if(manual) alert('РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ'); return false;}
  S.lastHash=h; S.dirty=false; setState(manual?'РЎРѕС…СЂР°РЅРµРЅРѕ':'РЎРѕС…СЂР°РЅРµРЅРѕ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё'); return true;
}
async function loadPage(id){
  if(S.dirty) await save(false);
  S.activeModelId=parseInt(id,10); S.selectedBlockId=null; S.selectedElId=null;
  const r=await api('./api/index.php?action=get_page&model_id='+S.activeModelId); S.page={blocks:[]};
  if(r.ok&&r.page_json){try{S.page=JSON.parse(r.page_json)}catch(_e){}}
  if(!Array.isArray(S.page.blocks)) S.page.blocks=[];
  S.page.blocks.forEach(b=>{if(!Array.isArray(b.elements)) b.elements=[];});
  S.lastHash=hash(); S.dirty=false; setState('РќРµС‚ РёР·РјРµРЅРµРЅРёР№'); persistViewState(); renderWorkspace(); renderSettings();
}
async function boot(){
  const d=await api('./api/index.php?action=bootstrap');
  if(!d.ok){ document.body.classList.remove('preload'); return alert('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё'); }
  S.models=d.models||[]; S.options=d.options||[]; S.groups=d.groups||[]; S.media=d.media||[]; S.folders=d.folders||[]; if(S.activeFolderId===undefined || S.activeFolderId===null) S.activeFolderId=0; renderModels(); renderOptions(); renderMedia(); renderTabs(); renderWorkspace(); renderSettings();
  if(S.activeModelId && S.models.some(m=>parseInt(m.id,10)===parseInt(S.activeModelId,10))) await loadPage(S.activeModelId);
  document.body.classList.remove('preload');
}
async function refreshMedia(){
  const d=await api('./api/index.php?action=media_list').catch(()=>({ok:false}));
  if(!d.ok) return;
  S.media=d.media||[];
  S.folders=d.folders||S.folders;
  persistViewState();
  renderMedia();
  const it=el();
  if(it && it.type==='image') renderSettings();
}
window.deleteMedia=async(id)=>{
  if(!confirm('РЈРґР°Р»РёС‚СЊ С„Р°Р№Р» РёР· РјРµРґРёР°С‚РµРєРё?')) return;
  const fd=new URLSearchParams(); fd.append('id', id);
  const r=await api('./api/index.php?action=delete_media',{method:'POST',body:fd});
  if(!r.ok){ alert('РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ С„Р°Р№Р»Р°'); return; }
  S.media = S.media.filter(m => parseInt(m.id,10)!==parseInt(id,10));
  renderMedia();
};
window.selectFolder=(id)=>{ S.activeFolderId=parseInt(id,10)||0; renderMedia(); };
window.createFolder=async()=>{
  const name = prompt('РќР°Р·РІР°РЅРёРµ РїР°РїРєРё');
  if(!name || !name.trim()) return;
  const fd=new URLSearchParams(); fd.append('name', name.trim());
  const r=await api('./api/index.php?action=create_media_folder',{method:'POST',body:fd});
  if(r.ok) refreshMedia(); else alert('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ РїР°РїРєСѓ');
};
window.moveMedia=async(id)=>{
  const list=(S.folders||[]).map(f=>`${f.id}: ${f.name}`).join('\n');
  const raw=prompt(`Р’РІРµРґРёС‚Рµ ID РїР°РїРєРё:\n0: РљРѕСЂРµРЅСЊ\n${list}`, String(S.activeFolderId||0));
  if(raw===null) return;
  const folderId=parseInt(raw,10);
  if(!folderId) return;
  const fd=new URLSearchParams(); fd.append('id', id); fd.append('folder_id', folderId);
  const r=await api('./api/index.php?action=move_media',{method:'POST',body:fd});
  if(r.ok) refreshMedia(); else alert('РќРµ СѓРґР°Р»РѕСЃСЊ РїРµСЂРµРјРµСЃС‚РёС‚СЊ С„Р°Р№Р»');
};
window.uploadToMedia=async()=>{
  if(parseInt(S.activeFolderId||0,10)===0) return alert('РЎРЅР°С‡Р°Р»Р° РѕС‚РєСЂРѕР№С‚Рµ РїР°РїРєСѓ РёР»Рё СЃРѕР·РґР°Р№С‚Рµ РЅРѕРІСѓСЋ РїР°РїРєСѓ.');
  const input=$('mediaUploadInput');
  const file=input && input.files && input.files[0];
  if(!file) return alert('Р’С‹Р±РµСЂРёС‚Рµ С„Р°Р№Р»');
  if(S.uploading) return;
  S.uploading=true;
  try{
    const blob = await toJpegBlob(file);
    const fd=new FormData();
    fd.append('file', blob, 'upload.jpg');
    fd.append('folder_id', String(S.activeFolderId||0));
    const r=await fetch('./api/index.php?action=upload_image',{method:'POST',body:fd}).then(x=>x.json()).catch(()=>({ok:false,error:'РЎРµС‚СЊ РЅРµРґРѕСЃС‚СѓРїРЅР°'}));
    if(!r.ok){ alert(r.error||'РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё'); return; }
    await refreshMedia();
    setState('Р¤Р°Р№Р» Р·Р°РіСЂСѓР¶РµРЅ РІ РњРµРґРёР°');
    if(input) input.value='';
  } finally {
    S.uploading=false;
  }
};
window.openFolder=(id)=>{ S.activeFolderId=parseInt(id,10)||0; persistViewState(); renderMedia(); };
window.goRoot=()=>{ S.activeFolderId=0; persistViewState(); renderMedia(); };

// Final media explorer override: classic folders/files + context menu
renderMedia = function(){
  const root=$('mediaWorkspace'); if(!root) return;
  const folders=Array.isArray(S.folders)?S.folders:[];
  const activeId=parseInt(S.activeFolderId||0,10);
  const atRoot=activeId===0;
  const files=(S.media||[]).filter(m=>parseInt(m.folder_id||0,10)===activeId);
  const currentName=atRoot?'РљРѕСЂРµРЅСЊ':(folders.find(f=>parseInt(f.id,10)===activeId)?.name||'РџР°РїРєР°');
  const tree = folders.map(f=>`<div class="tree-item ${parseInt(f.id,10)===activeId?'active':''}" data-folder-id="${parseInt(f.id,10)}" onclick="openFolder(${parseInt(f.id,10)})">${esc(f.name)}</div>`).join('');
  const folderTiles = atRoot ? folders.map(f=>`<article class="tile" data-folder-id="${parseInt(f.id,10)}"><div class="label" onclick="openFolder(${parseInt(f.id,10)})">рџ“Ѓ ${esc(f.name)}</div></article>`).join('') : '';
  const fileTiles = files.length ? files.map(m=>`<article class="tile preview" data-file-id="${parseInt(m.id,10)}"><img src="${normalizeUrl(m.file_url)}"><div class="label">${esc(m.file_name)}</div></article>`).join('') : '<div class="tiny">Р’ СЌС‚РѕР№ РїР°РїРєРµ РїРѕРєР° РЅРµС‚ С„Р°Р№Р»РѕРІ.</div>';
  const backBtn = atRoot ? '' : '<button class="btn" onclick="goRoot()">в†ђ РќР°Р·Р°Рґ</button>';
  root.innerHTML = `<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">${backBtn}<button class="btn" onclick="createFolder()">+ РџР°РїРєР°</button><input id="mediaUploadInput" type="file" accept="image/*"><button class="btn" onclick="uploadToMedia()">Р—Р°РіСЂСѓР·РёС‚СЊ</button></div><div style="margin-bottom:8px;font-weight:700">РўРµРєСѓС‰Р°СЏ РїР°РїРєР°: ${esc(currentName)}</div><div class="explorer"><aside class="tree"><div class="tree-item ${atRoot?'active':''}" onclick="goRoot()">РљРѕСЂРµРЅСЊ</div>${tree}</aside><section class="canvas"><div class="tiles">${folderTiles}${fileTiles}</div></section></div>`;
};

window.openCtx=(ev,type,id)=>{
  ev.preventDefault();
  const menu=$('ctxMenu'); if(!menu) return;
  const actions = type==='folder'
    ? `<button onclick="ctxFolderEdit(${id})">Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ</button><button onclick="ctxFolderCopy(${id})">РљРѕРїРёСЂРѕРІР°С‚СЊ</button><button onclick="ctxFolderDelete(${id})">РЈРґР°Р»РёС‚СЊ</button>`
    : `<button onclick="ctxFileEdit(${id})">Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ</button><button onclick="ctxFileCopy(${id})">РљРѕРїРёСЂРѕРІР°С‚СЊ</button><button onclick="ctxFileDelete(${id})">РЈРґР°Р»РёС‚СЊ</button>`;
  menu.innerHTML=actions;
  menu.style.left=ev.clientX+'px';
  menu.style.top=ev.clientY+'px';
  menu.style.display='block';
};
window.addEventListener('click',()=>{ const m=$('ctxMenu'); if(m) m.style.display='none'; });
$('mediaWorkspace').addEventListener('contextmenu',(ev)=>{
  const folderNode = ev.target.closest('[data-folder-id]');
  if(folderNode){
    openCtx(ev,'folder',parseInt(folderNode.getAttribute('data-folder-id'),10));
    return;
  }
  const fileNode = ev.target.closest('[data-file-id]');
  if(fileNode){
    openCtx(ev,'file',parseInt(fileNode.getAttribute('data-file-id'),10));
  }
});
window.ctxFolderEdit=async(id)=>{ const f=S.folders.find(x=>parseInt(x.id,10)===parseInt(id,10)); if(!f) return; const name=prompt('РќРѕРІРѕРµ РёРјСЏ РїР°РїРєРё',f.name||''); if(!name||!name.trim()) return; const fd=new URLSearchParams(); fd.append('id',id); fd.append('name',name.trim()); const r=await api('./api/index.php?action=update_media_folder',{method:'POST',body:fd}); if(r.ok) refreshMedia(); else alert('РћС€РёР±РєР°'); };
window.ctxFolderCopy=async(id)=>{ const fd=new URLSearchParams(); fd.append('id',id); const r=await api('./api/index.php?action=copy_media_folder',{method:'POST',body:fd}); if(r.ok) refreshMedia(); else alert('РћС€РёР±РєР°'); };
window.ctxFolderDelete=async(id)=>{ if(!confirm('РЈРґР°Р»РёС‚СЊ РїР°РїРєСѓ?')) return; const fd=new URLSearchParams(); fd.append('id',id); const r=await api('./api/index.php?action=delete_media_folder',{method:'POST',body:fd}); if(r.ok){ if(parseInt(S.activeFolderId,10)===parseInt(id,10)) S.activeFolderId=0; refreshMedia(); } else alert(r.error||'РџР°РїРєР° РЅРµ РїСѓСЃС‚Р°'); };
window.ctxFileEdit=async(id)=>{ const f=S.media.find(x=>parseInt(x.id,10)===parseInt(id,10)); if(!f) return; const name=prompt('РќРѕРІРѕРµ РёРјСЏ С„Р°Р№Р»Р°',f.file_name||''); if(!name||!name.trim()) return; const fd=new URLSearchParams(); fd.append('id',id); fd.append('name',name.trim()); const r=await api('./api/index.php?action=update_media',{method:'POST',body:fd}); if(r.ok) refreshMedia(); else alert('РћС€РёР±РєР°'); };
window.ctxFileCopy=async(id)=>{ const fd=new URLSearchParams(); fd.append('id',id); const r=await api('./api/index.php?action=copy_media',{method:'POST',body:fd}); if(r.ok) refreshMedia(); else alert('РћС€РёР±РєР°'); };
window.ctxFileDelete=async(id)=>{ if(!confirm('РЈРґР°Р»РёС‚СЊ С„Р°Р№Р»?')) return; await deleteMedia(id); };

$('tabM').onclick=()=>{S.tab='m';renderTabs()}; $('tabO').onclick=()=>{S.tab='o';renderTabs()}; $('tabD').onclick=()=>{S.tab='d';renderTabs()};
$('newModel').onclick=async()=>{const name=prompt('РќР°Р·РІР°РЅРёРµ РјРѕРґРµР»Рё'); if(!name)return; const fd=new URLSearchParams(); fd.append('name',name); const r=await api('./api/index.php?action=create_model',{method:'POST',body:fd}); if(r.ok){await boot(); await loadPage(r.id)}};
async function copyModelById(modelId){
  const fd=new URLSearchParams();
  fd.append('source_id', modelId);
  const r=await api('./api/index.php?action=copy_model',{method:'POST',body:fd});
  if(r.ok) await boot();
}
async function editModel(model){
  const name = prompt('РќРѕРІРѕРµ РЅР°Р·РІР°РЅРёРµ РјРѕРґРµР»Рё', model.name || '');
  if(!name || !name.trim()) return;
  const fd=new URLSearchParams(); fd.append('id', model.id); fd.append('name', name.trim());
  const r=await api('./api/index.php?action=update_model',{method:'POST',body:fd});
  if(r.ok) await boot(); else alert('РћС€РёР±РєР° СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЏ РјРѕРґРµР»Рё');
}
async function deleteModel(model){
  if(!confirm(`РЈРґР°Р»РёС‚СЊ РјРѕРґРµР»СЊ "${model.name}"?`)) return;
  const fd=new URLSearchParams(); fd.append('id', model.id);
  const r=await api('./api/index.php?action=delete_model',{method:'POST',body:fd});
  if(r.ok){ if(S.activeModelId===parseInt(model.id,10)){ S.activeModelId=null; S.page={blocks:[]}; S.selectedBlockId=null; S.selectedElId=null; } await boot(); }
  else alert('РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ РјРѕРґРµР»Рё');
}
async function editOption(opt){
  const name = prompt('Название опции', opt.name || ''); if(!name || !name.trim()) return;
  const price = prompt('Цена', String(opt.price || 0)); if(price===null) return;
  const image = prompt('URL фото', opt.image_url || ''); if(image===null) return;
  const description = prompt('Описание', opt.description || ''); if(description===null) return;
  const featuresOld = Array.isArray(opt.features) ? opt.features.join(' | ') : '';
  const features = prompt('Характеристики через |', featuresOld); if(features===null) return;
  const groupId = prompt('ID группы', String(opt.group_id || ((S.groups&&S.groups[0]&&S.groups[0].id)||0))); if(groupId===null) return;
  const fd=new URLSearchParams();
  fd.append('id', opt.id);
  fd.append('group_id', groupId);
  fd.append('name', name.trim());
  fd.append('price', price);
  fd.append('image_url', image);
  fd.append('description', description);
  fd.append('features', JSON.stringify((features||'').split('|').map(x=>x.trim()).filter(Boolean)));
  const r=await api('./api/index.php?action=update_option',{method:'POST',body:fd});
  if(r.ok) await boot(); else alert('Ошибка редактирования опции');
}
async function deleteOption(opt){
  if(!confirm(`РЈРґР°Р»РёС‚СЊ РѕРїС†РёСЋ "${opt.name}"?`)) return;
  const fd=new URLSearchParams(); fd.append('id', opt.id);
  const r=await api('./api/index.php?action=delete_option',{method:'POST',body:fd});
  if(r.ok) await boot(); else alert('РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ РѕРїС†РёРё');
}
$('newOption').onclick=async()=>{const name=prompt('Название опции'); if(!name)return; const price=prompt('Цена','0')||'0'; const image=prompt('URL фото','')||''; const description=prompt('Описание','')||''; const features=prompt('Характеристики через |','')||''; const groupId=prompt('ID группы', String((S.groups&&S.groups[0]&&S.groups[0].id)||0))||'0';
  const fd=new URLSearchParams(); fd.append('group_id',groupId); fd.append('name',name); fd.append('price',price); fd.append('image_url',image); fd.append('description',description); fd.append('features',JSON.stringify(features.split('|').map(x=>x.trim()).filter(Boolean)));
  const r=await api('./api/index.php?action=create_option',{method:'POST',body:fd}); if(r.ok) await boot();
};
$('saveBtn').onclick=()=>save(true);
$('confirmAddBlock').onclick=()=>{const b=mkBlock(); S.page.blocks.splice(S.insertAt,0,b); S.selectedBlockId=b.id; S.selectedElId=null; toggleModal(false); renderWorkspace(); renderSettings(); touch();};
$('workspace').addEventListener('click',ev=>{const s=ev.target.closest('.strip'); if(!s)return;});
$('workspace').addEventListener('dragover',ev=>{
  const blockNode = ev.target.closest('.block');
  if(!blockNode) return;
  ev.preventDefault();
  ev.stopPropagation();
  blockNode.style.outline='2px dashed #22a447';
});
$('workspace').addEventListener('dragleave',ev=>{
  const blockNode = ev.target.closest('.block');
  if(!blockNode || blockNode.contains(ev.relatedTarget)) return;
  blockNode.style.outline='';
});
$('workspace').addEventListener('drop',ev=>{
  const blockNode = ev.target.closest('.block');
  const file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
  if(!blockNode || !file) return;
  ev.preventDefault();
  ev.stopPropagation();
  blockNode.style.outline='';
  const zone = ev.target.closest('[data-image-drop]');
  const imageEl = ensureImageElementForDrop(blockNode, zone ? zone.getAttribute('data-image-drop') : null);
  if(!imageEl) return;
  renderWorkspace();
  renderSettings();
  upload(file, imageEl.id);
});
$('workspace').addEventListener('mousedown',ev=>{
  const actionNode = ev.target.closest('[data-action]');
  const boxNode = ev.target.closest('[data-text-box]');
  const imgTextNode = ev.target.closest('[data-img-text-box]');
  const textId = (actionNode && actionNode.getAttribute('data-e')) || (boxNode && boxNode.getAttribute('data-text-box')) || (imgTextNode && ('imgtxt:' + imgTextNode.getAttribute('data-img-text-box') + ':' + (imgTextNode.getAttribute('data-ti')||0)));
  if(!textId) return;
  const b=block(); if(!b) return;
  let tx = null;
  let isImgText = false;
  if(String(textId).indexOf('imgtxt:')===0){
    const parts = String(textId).split(':');
    const imageId = parts[1];
    const ti = parseInt(parts[2]||'0',10) || 0;
    const img = (b.elements||[]).find(x=>x.id===imageId && x.type==='image');
    if(!img) return;
    img.texts = Array.isArray(img.texts) ? img.texts : [];
    if(!img.texts[ti]) img.texts[ti]={text:'РќРѕРІС‹Р№ С‚РµРєСЃС‚',x:8,y:8,width:55,size:38,fontKey:'inter',color:'#ffffff',rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:35};
    tx = img.texts[ti];
    isImgText = true;
    S.selectedImgTextIdx = ti;
    S.selectedElId=imageId;
  } else {
    tx=(b.elements||[]).find(x=>x.id===textId && x.type==='text');
    if(!tx) return;
    S.selectedElId=textId;
  }
  renderSettings();
  const action = actionNode ? actionNode.getAttribute('data-action') : 'move';
  dragState.mode = action;
  dragState.eid = textId;
  dragState.isImgText = isImgText;
  dragState.startX = ev.clientX; dragState.startY = ev.clientY;
  dragState.base = { x:tx.x||8, y:tx.y||8, width:tx.width||55, size:tx.size||36, rotate:tx.rotate||0 };
  ev.preventDefault();
});
window.addEventListener('mousemove',ev=>{
  if(!dragState.mode || !dragState.eid) return;
  const b=block(); if(!b) return;
  let tx = null;
  if(dragState.isImgText || String(dragState.eid).indexOf('imgtxt:')===0){
    const parts = String(dragState.eid).split(':');
    const imageId = parts[1];
    const ti = parseInt(parts[2]||'0',10) || 0;
    const img = (b.elements||[]).find(x=>x.id===imageId && x.type==='image');
    if(!img) return;
    img.texts = Array.isArray(img.texts) ? img.texts : [];
    if(!img.texts[ti]) img.texts[ti]={text:'РќРѕРІС‹Р№ С‚РµРєСЃС‚',x:8,y:8,width:55,size:38,fontKey:'inter',color:'#ffffff',rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:35};
    tx = img.texts[ti];
  } else {
    tx=(b.elements||[]).find(x=>x.id===dragState.eid && x.type==='text');
    if(!tx) return;
  }
  const dx=ev.clientX-dragState.startX, dy=ev.clientY-dragState.startY;
  if(dragState.mode==='move'){
    const bounds=getTextMoveBounds(dragState.eid, dragState.isImgText);
    tx.x = clamp(dragState.base.x + dx/6, 0, bounds.maxX);
    tx.y = clamp(dragState.base.y + dy/3, 0, bounds.maxY);
  } else if(dragState.mode==='resize'){
    const maxWidth = Math.max(8, 100 - (tx.x||0));
    tx.width = clamp(dragState.base.width + dx/5, 8, maxWidth);
    tx.size = clamp(dragState.base.size + dx/8, 12, 120);
  } else if(dragState.mode==='rotate'){
    let ang = clamp(dragState.base.rotate + dx/2, -180, 180);
    if(Math.abs(ang) < 2) ang = 0;
    tx.rotate = ang;
  }
  renderWorkspace(); touch();
});
window.addEventListener('mouseup',()=>{ dragState.mode=null; dragState.eid=null; dragState.isImgText=false; });
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&S.dirty) save(false)});
window.addEventListener('beforeunload',()=>{if(S.dirty) save(false)});
let persistTimer=null;
window.addEventListener('scroll',()=>{
  clearTimeout(persistTimer);
  persistTimer=setTimeout(()=>persistViewState(),120);
},{passive:true});
window.addEventListener('dragover',(ev)=>{ ev.preventDefault(); });
window.addEventListener('drop',(ev)=>{ ev.preventDefault(); });
try{
  const savedStateRaw = localStorage.getItem('bath_admin_state');
  if(savedStateRaw){
    const savedState = JSON.parse(savedStateRaw);
    if(savedState && (savedState.tab==='m' || savedState.tab==='o' || savedState.tab==='d')) S.tab=savedState.tab;
    if(savedState && savedState.modelId) S.activeModelId=parseInt(savedState.modelId,10)||null;
    if(savedState && savedState.folderId!==undefined) S.activeFolderId=parseInt(savedState.folderId,10)||0;
  }
  const qp = new URLSearchParams(location.search).get('tab');
  const h = (location.hash || '').toLowerCase();
  if(qp==='media') S.tab='d';
  else if(qp==='options') S.tab='o';
  else if(qp==='models') S.tab='m';
  else if(h==='#media') S.tab='d';
  else if(h==='#options') S.tab='o';
  else if(h==='#models') S.tab='m';
  else {
    const savedTab = localStorage.getItem('bath_admin_tab');
    if(savedTab==='m' || savedTab==='o' || savedTab==='d') S.tab = savedTab;
  }
}catch(_e){}
window.addEventListener('hashchange',()=>{
  const h=(location.hash||'').toLowerCase();
  const next = h==='#media' ? 'd' : (h==='#options' ? 'o' : (h==='#models' ? 'm' : null));
  if(next && next!==S.tab){ S.tab=next; renderTabs(); }
});
boot().then(()=>{
  try{
    const savedStateRaw = localStorage.getItem('bath_admin_state');
    if(!savedStateRaw) return;
    const savedState = JSON.parse(savedStateRaw);
    if(savedState && Number.isFinite(savedState.scrollY)) window.scrollTo(0, Math.max(0, parseInt(savedState.scrollY,10)||0));
  }catch(_e){}
});

