
const S={models:[],options:[],page:{blocks:[]},activeModelId:null,selectedOptions:new Set(),selectedWoodColor:null,woodDescription:'',lastWoodKey:null,lastWoodIdx:-1};
const $=id=>document.getElementById(id);
const api=(u,o)=>fetch(u,o).then(r=>r.json());
const esc=s=>(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const normalizeUrl=u=>(u&&u.indexOf('./uploads/')===0)?('/uploads/'+u.slice('./uploads/'.length)):(u||'');
const optionMeta=o=>Object.fromEntries((Array.isArray(o.features)?o.features:[]).map(x=>String(x).split(':')).filter(x=>x.length>=2).map(([k,...v])=>[k.trim().toLowerCase(),v.join(':').trim()]));
const isWoodColor=o=>(o.group_name==='Цвет бани')||optionMeta(o).type==='wood_color';
const WOOD_DESCRIPTIONS={
  iceberg:['Светлый тон делает баню визуально легче и чище.','Айсберг подчеркивает современный характер фасада.','Холодный светлый оттенок хорошо смотрится рядом с графитовой кровлей.','Цвет добавляет ощущение свежести и аккуратности.','Фасад выглядит спокойно и дорого без лишней яркости.','Айсберг хорошо раскрывает горизонтальный профиль стены.','Оттенок подходит для минималистичных участков.','Светлая баня визуально расширяет пространство вокруг.','Цвет красиво работает с зеленью и камнем.','Айсберг делает форму бани особенно чистой.'],
  alpineMorning:['Мягкий теплый светлый оттенок для спокойного фасада.','Альпийское утро добавляет бане домашнее тепло.','Цвет выглядит натурально и не спорит с ландшафтом.','Оттенок хорошо подходит для семейного участка.','Фасад получается светлым, но не холодным.','Цвет деликатно показывает фактуру дерева.','Альпийское утро создает ощущение свежего утра.','Оттенок хорошо сочетается с темной кровлей.','Баня выглядит уютной уже на первом взгляде.','Цвет делает архитектуру мягче и теплее.'],
  fjord:['Сдержанный серо-зеленый тон для спокойной архитектуры.','Фьорд хорошо вписывается в природный участок.','Цвет выглядит современно и неброско.','Оттенок подчеркивает объем горизонтального профиля.','Фасад получает северный, уверенный характер.','Фьорд красиво сочетается с деревянными террасами.','Цвет не выгорает визуально на ярком солнце.','Баня выглядит цельно рядом с хвойными деревьями.','Оттенок добавляет фасаду глубину.','Фьорд выбирают для спокойного премиального образа.'],
  northsea:['Глубокий серо-синий тон делает баню выразительной.','Северное море добавляет фасаду строгий характер.','Цвет хорошо смотрится в современной застройке.','Темный оттенок подчеркивает геометрию бани.','Фасад выглядит собранным и уверенным.','Северное море контрастирует со светлыми наличниками.','Цвет подходит для участков с камнем и металлом.','Оттенок делает баню визуально солиднее.','Горизонтальный профиль получает красивую тень.','Северное море выглядит дорого без яркости.'],
  bakedmilk:['Теплый молочный оттенок создает мягкий уютный фасад.','Топленое молоко делает баню визуально теплой.','Цвет хорошо сочетается с коричневой кровлей.','Оттенок напоминает натуральное обработанное дерево.','Фасад выглядит дружелюбно и спокойно.','Цвет хорошо подходит для классического участка.','Топленое молоко не перегружает архитектуру.','Оттенок красиво раскрывает древесные волокна.','Баня выглядит светлой и обжитой.','Цвет добавляет ощущение тепла даже зимой.'],
  ivory:['Слоновая кость дает чистый теплый светлый фасад.','Оттенок выглядит мягче обычного белого.','Цвет хорошо сочетается с темными окнами и кровлей.','Фасад получается легким и благородным.','Слоновая кость подчеркивает аккуратность линий.','Цвет подходит для спокойного премиального образа.','Оттенок красиво работает в вечернем свете.','Баня выглядит светлой, но не стерильной.','Цвет делает участок визуально просторнее.','Слоновая кость добавляет фасаду мягкую элегантность.'],
  caramel:['Карамельный тон делает фасад теплым и насыщенным.','Цвет напоминает натуральную древесину после масла.','Карамель хорошо смотрится с зеленым участком.','Оттенок добавляет бане традиционный уют.','Фасад выглядит живым и солнечным.','Цвет раскрывает фактуру профиля особенно объемно.','Карамель подходит для классической бани.','Оттенок легко сочетается с коричневой кровлей.','Баня выглядит теплой и гостеприимной.','Цвет добавляет фасаду природную глубину.'],
  ginger:['Имбирь дает фасаду насыщенный древесный характер.','Теплый рыжеватый оттенок делает баню заметнее.','Цвет хорошо подходит для выразительного участка.','Имбирь подчеркивает натуральность дерева.','Фасад выглядит живо и энергично.','Оттенок красиво играет на солнце.','Цвет сочетается с темной кровлей и террасой.','Баня получает теплый загородный образ.','Имбирь делает профиль стены рельефнее.','Оттенок подходит для любителей натуральных тонов.'],
  licorice:['Лакрица делает баню графичной и современной.','Почти черный оттенок добавляет архитектуре силу.','Цвет эффектно контрастирует со светлым окружением.','Фасад выглядит лаконично и дорого.','Лакрица подчеркивает форму без лишних деталей.','Темный профиль получает глубокие тени.','Цвет подходит для современного минимализма.','Баня выглядит компактно и выразительно.','Лакрица хорошо сочетается с деревом террасы.','Оттенок создает премиальный северный образ.'],
  graphite:['Графит дает строгий универсальный фасад.','Цвет выглядит современно и практично.','Оттенок хорошо скрывает бытовую пыль.','Графит подчеркивает горизонтальный профиль.','Фасад получается спокойным и уверенным.','Цвет сочетается почти с любой кровлей.','Баня выглядит современно без излишней темноты.','Графит добавляет объема и глубины.','Оттенок хорошо работает рядом с камнем.','Цвет делает баню визуально собранной.']
};
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
    const tint=S.selectedWoodColor?` wood-tint`:'';
    const woodStyle=S.selectedWoodColor?`;--selected-wood:${S.selectedWoodColor.hex}`:'';
    return `<div class="photo${tint}" style="height:${e.height||420}px${woodStyle}">${src?`<img src="${src}" style="opacity:${(e.opacity||100)/100};filter:contrast(${e.contrast||100}%) brightness(${e.brightness||100}%)">`:''}${(e.texts||[]).map(t=>`<div class="photo-text" style="${textStyle(t,true)}">${esc(t.text||'')}</div>`).join('')}</div>`;
  }
  if(e.type==='options'){
    const ids=new Set((e.optionIds||[]).map(x=>parseInt(x,10)));
    const list=ids.size ? S.options.filter(o=>ids.has(parseInt(o.id,10))) : S.options;
    const cols=clamp(parseInt(e.columns||3,10),1,6);
    const gap=e.cardGap||10, radius=e.cardRadius||8, border=e.cardBorder??1, shadow=e.cardShadow||0;
    const html=list.map(o=>{const meta=optionMeta(o);const selected=S.selectedOptions.has(String(o.id));return `<article class="card ${selected?'selected':''} ${isWoodColor(o)?'wood-card':''}" style="border:${border}px solid var(--line);border-radius:${radius}px;box-shadow:0 ${shadow}px ${shadow*3}px rgba(15,23,42,.12)" onclick="toggleOption(${parseInt(o.id,10)})">${isWoodColor(o)?`<div class="wood-sample" style="--wood:${meta.hex||'#ddd'};height:${e.cardSize||130}px"></div>`:(o.image_url?`<img src="${normalizeUrl(o.image_url)}" style="height:${e.imageHeight||160}px">`:'')}${selected?'<span class="check">✓</span>':''}<div class="card-body" style="font-size:${e.textSize||14}px"><b>${esc(o.name)}</b><div class="muted">${esc(o.group_name||'')}</div>${isWoodColor(o)?'':`<div class="price">${Number(o.price||0).toLocaleString('ru-RU')} ₽</div>`}</div></article>`}).join('');
    return `<div class="cards" style="grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px">${html}</div>${S.woodDescription&&list.some(isWoodColor)?`<div class="wood-desc">${esc(S.woodDescription)}</div>`:''}`;
  }
  if(e.type==='form'){
    return `<form class="form-box"><b>${esc(e.title||'Заявка')}</b><input placeholder="Имя"><input placeholder="Телефон"><textarea rows="3" placeholder="Комментарий"></textarea><button class="btn" type="button">Отправить</button></form>`;
  }
  return '';
}
function renderPage(){
  const blocks=S.page.blocks||[];
  $('paper').innerHTML=blocks.length?blocks.map(b=>`<section class="block" style="--block-bg:${b.backgroundColor||'#fff'}"><h2 class="block-title">${esc(b.title||'')}</h2>${(b.elements||[]).map(renderElement).join('')}</section>`).join(''):'<div class="block muted">Для этой модели пока нет блоков.</div>';
  renderSummary();
}
function renderSummary(){
  const sum=S.options.filter(o=>S.selectedOptions.has(String(o.id))).reduce((a,o)=>a+Number(o.price||0),0);
  const old=document.getElementById('summary'); if(old) old.remove();
  const el=document.createElement('div'); el.id='summary'; el.className='summary';
  el.innerHTML=`<div><b>Выбрано опций:</b> ${S.selectedOptions.size}<div class="muted">Сумма: ${sum.toLocaleString('ru-RU')} ₽</div></div><button class="btn">Получить предложение</button>`;
  $('paper').appendChild(el);
}
function pickWoodDescription(key){
  const arr=WOOD_DESCRIPTIONS[key]||[];
  if(!arr.length) return '';
  let idx=Math.floor(Math.random()*arr.length);
  if(key===S.lastWoodKey && arr.length>1 && idx===S.lastWoodIdx) idx=(idx+1)%arr.length;
  S.lastWoodKey=key; S.lastWoodIdx=idx;
  return arr[idx];
}
window.toggleOption=id=>{
  const o=S.options.find(x=>parseInt(x.id,10)===parseInt(id,10));
  if(o&&isWoodColor(o)){
    for(const item of S.options.filter(isWoodColor)) S.selectedOptions.delete(String(item.id));
    S.selectedOptions.add(String(id));
    const meta=optionMeta(o);
    S.selectedWoodColor={id:String(id),key:meta.key||String(id),hex:meta.hex||'#ddd',name:o.name};
    S.woodDescription=pickWoodDescription(S.selectedWoodColor.key);
  } else {
    const k=String(id); S.selectedOptions.has(k)?S.selectedOptions.delete(k):S.selectedOptions.add(k);
  }
  renderPage();
};
window.loadModel=async id=>{
  S.activeModelId=id; S.selectedOptions.clear(); S.selectedWoodColor=null; S.woodDescription=''; renderModels();
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
  