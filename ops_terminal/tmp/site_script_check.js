
const S={models:[],options:[],page:{blocks:[]},activeModelId:null,selectedOptions:new Set()};
const $=id=>document.getElementById(id);
const api=(u,o)=>fetch(u,o).then(r=>r.json());
const esc=s=>(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const normalizeUrl=u=>(u&&u.indexOf('./uploads/')===0)?('/uploads/'+u.slice('./uploads/'.length)):(u||'');
const fontCss=key=>({
  inter:"font-family:Inter,system-ui,Arial,sans-serif",
  manrope:"font-family:Manrope,Inter,Arial,sans-serif",
  montserrat:"font-family:Montserrat,Inter,Arial,sans-serif",
  rubik:"font-family:Rubik,Inter,Arial,sans-serif",
  playfair:"font-family:'Playfair Display',Georgia,serif",
  siberia_sans:"font-family:Manrope,Inter,Arial,sans-serif;font-weight:800;text-transform:uppercase",
  taiga_soft:"font-family:Rubik,Inter,Arial,sans-serif;font-weight:600",
  steam_serif:"font-family:'Playfair Display',Georgia,serif;font-style:italic"
}[key]||"font-family:Inter,Arial,sans-serif");

function renderModels(){
  $('models').innerHTML=S.models.map(m=>`<button class="model-btn ${parseInt(m.id,10)===parseInt(S.activeModelId,10)?'active':''}" onclick="loadModel(${parseInt(m.id,10)})">${esc(m.name)}</button>`).join('');
}
function textStyle(t, light){
  return `left:${t.x||8}%;top:${t.y||8}%;width:${t.width||55}%;color:${t.color||(light?'#fff':'#111')};font-size:${t.size||34}px;${fontCss(t.fontKey||'inter')};opacity:${(t.opacity||100)/100};filter:contrast(${t.textContrast||100}%) brightness(${t.textBrightness||100}%) saturate(${t.textSaturation||100}%);text-shadow:0 2px 12px rgba(0,0,0,${(t.shadow||0)/100});transform:rotate(${t.rotate||0}deg)`;
}
function renderElement(e){
  if(e.type==='text'){
    return `<div class="text-el"><div class="text-box" style="${textStyle(e,false)}">${esc(e.text||'')}</div></div>`;
  }
  if(e.type==='image'){
    const src=normalizeUrl(e.url||e.imageUrl||'');
    return `<div class="photo" style="height:${e.height||420}px">${src?`<img src="${src}" style="opacity:${(e.opacity||100)/100};filter:contrast(${e.contrast||100}%) brightness(${e.brightness||100}%)">`:''}${(e.texts||[]).map(t=>`<div class="photo-text" style="${textStyle(t,true)}">${esc(t.text||'')}</div>`).join('')}</div>`;
  }
  if(e.type==='options'){
    const ids=new Set((e.optionIds||[]).map(x=>parseInt(x,10)));
    const list=ids.size ? S.options.filter(o=>ids.has(parseInt(o.id,10))) : S.options;
    const cols=clamp(parseInt(e.columns||3,10),1,5);
    return `<div class="cards" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${list.map(o=>`<article class="card ${S.selectedOptions.has(String(o.id))?'selected':''}" onclick="toggleOption(${parseInt(o.id,10)})">${o.image_url?`<img src="${normalizeUrl(o.image_url)}" style="height:${e.imageHeight||160}px">`:''}<div class="card-body" style="font-size:${e.textSize||14}px"><b>${esc(o.name)}</b><div class="muted">${esc(o.group_name||'')}</div><div class="price">${Number(o.price||0).toLocaleString('ru-RU')} ₽</div></div></article>`).join('')}</div>`;
  }
  if(e.type==='form'){
    return `<form class="form-box"><b>${esc(e.title||'Заявка')}</b><input placeholder="Имя"><input placeholder="Телефон"><textarea rows="3" placeholder="Комментарий"></textarea><button class="btn" type="button">Отправить</button></form>`;
  }
  return '';
}
function renderPage(){
  const blocks=S.page.blocks||[];
  $('paper').innerHTML=blocks.length?blocks.map(b=>`<section class="block"><h2 class="block-title">${esc(b.title||'')}</h2>${(b.elements||[]).map(renderElement).join('')}</section>`).join(''):'<div class="block muted">Для этой модели пока нет блоков.</div>';
  renderSummary();
}
function renderSummary(){
  const sum=S.options.filter(o=>S.selectedOptions.has(String(o.id))).reduce((a,o)=>a+Number(o.price||0),0);
  const old=document.getElementById('summary'); if(old) old.remove();
  const el=document.createElement('div'); el.id='summary'; el.className='summary';
  el.innerHTML=`<div><b>Выбрано опций:</b> ${S.selectedOptions.size}<div class="muted">Сумма: ${sum.toLocaleString('ru-RU')} ₽</div></div><button class="btn">Получить предложение</button>`;
  $('paper').appendChild(el);
}
window.toggleOption=id=>{const k=String(id); S.selectedOptions.has(k)?S.selectedOptions.delete(k):S.selectedOptions.add(k); renderPage();};
window.loadModel=async id=>{
  S.activeModelId=id; S.selectedOptions.clear(); renderModels();
  const r=await api('../api/index.php?action=get_page&model_id='+id);
  S.page={blocks:[]};
  if(r.ok&&r.page_json){try{S.page=JSON.parse(r.page_json)}catch(e){}}
  if(!Array.isArray(S.page.blocks)) S.page.blocks=[];
  renderPage();
  history.replaceState(null,'','?model='+id);
};
async function boot(){
  const d=await api('../api/index.php?action=bootstrap');
  if(!d.ok){$('paper').innerHTML='<div class="block muted">Ошибка загрузки.</div>';return;}
  S.models=d.models||[]; S.options=d.options||[];
  const requested=parseInt(new URLSearchParams(location.search).get('model')||0,10);
  S.activeModelId=(requested&&S.models.some(m=>parseInt(m.id,10)===requested))?requested:(S.models[0]?parseInt(S.models[0].id,10):null);
  renderModels();
  if(S.activeModelId) await loadModel(S.activeModelId); else renderPage();
}
boot();
  