<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Соберите свою баню</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Manrope:wght@400;600;700;800&family=Montserrat:wght@500;700&family=Playfair+Display:ital,wght@0,600;1,600&family=Rubik:wght@400;600;700&display=swap');
    :root{--bg:#e8ece6;--paper:#fff;--text:#111827;--muted:#667085;--line:#d9e1ea;--accent:#0f766e;--accent-2:#b87524;--shadow:0 22px 70px rgba(42,55,45,.16)}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 Inter,Arial,sans-serif;position:relative;min-height:100vh}
    body::before{content:"";position:fixed;inset:0;z-index:-2;background:linear-gradient(180deg,rgba(246,248,241,.92),rgba(226,232,218,.86)),radial-gradient(circle at 18% 12%,rgba(184,117,36,.14),transparent 28%),radial-gradient(circle at 85% 18%,rgba(15,118,110,.12),transparent 30%),linear-gradient(120deg,rgba(255,255,255,.35),transparent 52%)}
    body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.42;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='520' height='360' viewBox='0 0 520 360'%3E%3Cg fill='none' stroke='%2364775f' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M42 248c42-18 76-18 122 0s78 17 122 0 70-17 116 0' opacity='.45'/%3E%3Cpath d='M54 98h108l38 36v84H54z'/%3E%3Cpath d='M54 98l54-44 92 80'/%3E%3Cpath d='M72 122h118M72 144h118M72 166h118M72 188h118M72 210h118' opacity='.55'/%3E%3Cpath d='M322 86c18-24 46-24 64 0s46 24 64 0' opacity='.5'/%3E%3Cpath d='M344 128c14-16 34-16 48 0s34 16 48 0' opacity='.45'/%3E%3Cpath d='M330 206c18-28 42-46 74-56 30 12 54 31 76 56' opacity='.45'/%3E%3Cpath d='M332 206h146' opacity='.45'/%3E%3Cpath d='M272 290c18-12 34-12 52 0s34 12 52 0 34-12 52 0' opacity='.42'/%3E%3C/g%3E%3C/svg%3E");background-size:520px 360px;background-repeat:repeat}
    .top{position:sticky;top:0;z-index:5;background:rgba(248,250,245,.78);backdrop-filter:blur(16px);border-bottom:1px solid rgba(100,116,139,.18);box-shadow:0 10px 30px rgba(31,41,35,.06)}
    .top-inner{max-width:980px;margin:0 auto;padding:14px 18px;display:flex;gap:12px;align-items:center;justify-content:center;flex-direction:column}
    .brand{font-weight:800;letter-spacing:0;text-align:center;font-size:20px;color:#17231d}
    .models{display:flex;gap:8px;overflow:auto;max-width:100%;padding:2px 0 4px;justify-content:center}
    .model-btn{border:1px solid rgba(15,118,110,.22);background:rgba(255,255,255,.74);border-radius:999px;padding:8px 13px;white-space:nowrap;cursor:pointer;box-shadow:0 6px 18px rgba(31,41,35,.06);transition:.18s ease}
    .model-btn:hover{transform:translateY(-1px);border-color:rgba(15,118,110,.48)}
    .model-btn.active{background:linear-gradient(135deg,#0f766e,#167f68);border-color:#0f766e;color:#fff;box-shadow:0 10px 24px rgba(15,118,110,.22)}
    .paper{width:min(100% - 28px,820px);margin:24px auto 56px;background:rgba(255,255,255,.96);box-shadow:var(--shadow);border:1px solid rgba(100,116,139,.22);border-radius:16px;min-height:1120px;overflow:visible}
    .block{position:relative;z-index:2;border-bottom:1px solid #edf1f5;padding:22px;background:var(--block-bg,#fff);overflow:hidden}
    .block.visual-block{min-height:var(--block-min-height,420px)}
    .block.sticky-block,.block.sticky-top{position:sticky;top:104px;z-index:4;box-shadow:0 18px 45px rgba(31,41,35,.12)}
    .block.sticky-bottom{position:sticky;bottom:0;z-index:4;box-shadow:0 -18px 45px rgba(31,41,35,.12)}
    .block::before{content:"";position:absolute;inset:0;z-index:0;background-image:var(--block-bg-image,none);background-position:var(--block-bg-position,center center);background-size:var(--block-bg-size,cover);background-repeat:var(--block-bg-repeat,no-repeat);background-attachment:var(--block-bg-attachment,scroll);opacity:var(--block-bg-opacity,1);filter:brightness(var(--block-bg-brightness,100%)) contrast(var(--block-bg-contrast,100%)) saturate(var(--block-bg-saturation,100%)) blur(var(--block-bg-blur,0px));transform:scale(var(--block-bg-scale,1));pointer-events:none}
    .block::after{content:"";position:absolute;inset:0;z-index:0;background:rgba(0,0,0,var(--block-bg-darken,0));pointer-events:none}
    .block>*{position:relative;z-index:1}
    .block:last-child{border-bottom:0}
    .block-title{margin:0 0 14px;font-size:20px;font-weight:800;color:#17231d}
    .text-el{position:relative;min-height:160px;overflow:hidden}
    .text-box{position:absolute;white-space:pre-wrap;word-break:break-word;transform-origin:center;line-height:1.2}
    .photo{position:relative;overflow:hidden;border-radius:12px;background:#d9dde3;box-shadow:0 12px 34px rgba(31,41,35,.10);max-width:100%;margin:0 auto}
    .photo img{display:block;width:100%;height:100%;object-fit:cover}
    .photo.wood-tint::after{content:"";position:absolute;inset:0;background:var(--selected-wood);mix-blend-mode:multiply;opacity:.22;pointer-events:none}
    .photo-text{position:absolute;white-space:pre-wrap;word-break:break-word;transform-origin:center;line-height:1.2}
    .options-wrap{transition:background-color .25s ease}
    .options-title{margin:0 0 12px}
    .cards{display:grid;gap:10px;transition:all .4s ease;justify-content:center}
    .card{min-width:0;border:0!important;border-radius:8px;overflow:visible;background:transparent;cursor:pointer;box-shadow:none!important;transition:opacity .42s ease,transform .42s ease,max-height .42s ease,padding .42s ease,margin .42s ease}
    .card:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(15,23,42,.14)}
    .card.selected{outline:0;transform:none}
    .card.selected .card-media{outline:3px solid var(--accent);outline-offset:0}
    .card.hiding{opacity:0;transform:scale(.94) translateY(6px);pointer-events:none;max-height:0;padding-top:0;padding-bottom:0;margin:0;border-width:0}
    .card.picked{width:100%;margin-left:0}
    .check{position:absolute;right:12px;top:12px;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#fff;font-size:22px;font-weight:900;box-shadow:0 10px 22px rgba(15,23,42,.24)}
    .card img{display:block;width:100%;height:100%;object-fit:cover;background:#eef1f5}
    .wood-card{position:relative}
    .wood-sample{position:relative;height:130px;background:
      linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.04) 18%,rgba(0,0,0,.04) 58%,rgba(0,0,0,.14)),
      linear-gradient(0deg,var(--wood),var(--wood));overflow:hidden;box-shadow:inset 0 14px 24px rgba(255,255,255,.16),inset 0 -14px 20px rgba(0,0,0,.16);filter:saturate(1.12) contrast(1.08)}
    .wood-sample::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 41px,rgba(88,56,31,.20) 41px 44px,rgba(255,255,255,.10) 44px 45px),linear-gradient(90deg,rgba(255,255,255,.16),transparent 16%,rgba(0,0,0,.08) 42%,transparent 68%,rgba(255,255,255,.08)),radial-gradient(ellipse at 22% 34%,rgba(60,35,18,.22) 0 6px,transparent 17px),radial-gradient(ellipse at 72% 66%,rgba(60,35,18,.18) 0 5px,transparent 15px),radial-gradient(circle at 48% 52%,rgba(255,255,255,.08) 0 26%,transparent 52%);mix-blend-mode:multiply;opacity:.95}
    .wood-picked{grid-column:1/-1;display:grid;grid-template-columns:minmax(240px, 320px) minmax(0, 1fr);gap:16px;align-items:start}
    .wood-picked .card.picked{width:100%;max-width:320px}
    .wood-desc{padding:16px;border:1px solid rgba(15,118,110,.16);border-radius:12px;background:rgba(248,250,245,.9);color:#334155;box-shadow:0 10px 24px rgba(31,41,35,.06)}
    .wood-desc-side{min-height:100%;display:flex;align-items:flex-start}
    .card-media{position:relative;flex:1 1 auto;min-height:0;aspect-ratio:25/18;overflow:hidden;background:transparent;border:1px solid var(--line)}
    .card-body{padding:10px 12px 12px;background:rgba(255,255,255,.95);border-top:0}
    .price{color:var(--accent);font-weight:800;margin-top:4px}
    .form-box{display:grid;gap:8px;padding:14px;border:1px solid var(--line);border-radius:8px;background:#f8fafc}
    .form-box input,.form-box textarea{width:100%;border:1px solid var(--line);border-radius:8px;padding:10px;font:inherit}
    .muted{color:var(--muted);font-size:13px}
    .price-overlay{position:fixed;top:14px;right:14px;z-index:9999;width:max-content;min-width:112px;max-width:min(260px,calc(100vw - 28px));padding:8px 11px;border:1px solid rgba(15,118,110,.18);border-radius:12px;background:rgba(255,255,255,.92);backdrop-filter:blur(14px);box-shadow:0 12px 30px rgba(31,41,35,.16);pointer-events:auto;cursor:pointer}
    .price-overlay .label{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;perspective:120px}
    .price-overlay .label::before{content:"₽";flex:0 0 22px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 30% 24%,#fff7c4 0 18%,#f6c744 36%,#d59a12 72%,#a76a08 100%);color:#4b2b00;font-size:16px;font-weight:900;line-height:22px;text-align:center;text-shadow:0 1px 0 rgba(255,255,255,.45);box-shadow:0 6px 14px rgba(181,122,0,.26),inset 0 0 0 1px rgba(255,255,255,.42),inset 0 -3px 7px rgba(89,47,0,.22);transform:translateZ(0) rotateY(0);transform-origin:50% 50%;transform-style:preserve-3d;backface-visibility:hidden;will-change:transform}
    .price-overlay.coin-spin .label::before{animation:coinSpin .78s cubic-bezier(.18,.78,.24,1)}
    @keyframes coinSpin{0%{transform:rotateY(0) scale(1)}42%{transform:rotateY(180deg) scale(1.22)}78%{transform:rotateY(340deg) scale(1.08)}100%{transform:rotateY(360deg) scale(1)}}
    .price-overlay .amount{font-size:24px;line-height:1.05;font-weight:800;letter-spacing:0;color:#17231d;white-space:nowrap}
    .price-overlay .amount small{font-size:13px;font-weight:700}
    .price-fly{position:fixed;z-index:10000;padding:7px 10px;border-radius:999px;background:var(--accent);color:#fff;font-weight:900;box-shadow:0 12px 28px rgba(15,118,110,.28);pointer-events:none;will-change:transform,opacity}
    .receipt-backdrop{position:fixed;inset:0;z-index:10010;background:rgba(15,23,42,.42);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:18px}
    .receipt-backdrop.open{display:flex}
    .receipt{width:min(100%,420px);background:#fff;border-radius:16px;box-shadow:0 30px 80px rgba(15,23,42,.28);border:1px solid rgba(100,116,139,.18);overflow:hidden}
    .receipt-head{padding:16px 18px 10px;border-bottom:1px dashed #d9e1ea}
    .receipt-title{margin:0;font-size:18px;font-weight:900;color:#17231d}
    .receipt-sub{margin-top:4px;font-size:12px;color:var(--muted)}
    .receipt-body{padding:14px 18px 16px}
    .receipt-row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px dotted #e5eaf0;font-size:14px}
    .receipt-row:last-child{border-bottom:0}
    .receipt-row strong{font-weight:800}
    .receipt-total{display:flex;justify-content:space-between;gap:12px;margin-top:12px;padding-top:12px;border-top:2px solid #17231d;font-size:18px;font-weight:900}
    .receipt-actions{display:flex;gap:10px;justify-content:flex-end;padding:0 18px 18px}
    .btn-secondary{background:#fff;color:#17231d;border:1px solid rgba(100,116,139,.24)}
    .btn{border:0;background:var(--accent);color:#fff;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
    .slider-btn{position:absolute;top:50%;transform:translateY(-50%);z-index:3;background:rgba(255,255,255,.85);border:0;border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:26px;line-height:1;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.2);transition:.15s;padding:0}
    .slider-btn:hover{background:#fff;transform:translateY(-50%) scale(1.08)}
    .slider-prev{left:8px}
    .slider-next{right:8px}
    .slider-dots{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:3;pointer-events:auto}
    .slider-dot{width:9px;height:9px;border-radius:50%;border:2px solid rgba(255,255,255,.7);background:transparent;cursor:pointer;padding:0;transition:.15s}
    .slider-dot.active{background:#fff;border-color:#fff}
    @keyframes photoFadeIn{from{opacity:0}to{opacity:1}}
    .photo.slide-in{animation:photoFadeIn .35s ease}
    @media(max-width:720px){.models{max-width:100%}.paper{width:100%;margin:0;min-height:100vh;border-left:0;border-right:0}.block{padding:14px}.block.visual-block{min-height:min(var(--block-min-height,320px),320px)}.block.sticky-block{top:112px}.wood-picked{grid-template-columns:1fr}.cards{grid-template-columns:repeat(2,minmax(0,1fr))!important;justify-content:stretch}.card{width:100%!important}.card:hover{transform:none}.card-media{height:auto!important;aspect-ratio:25/18}.price-overlay{top:68px;right:8px;max-width:calc(100vw - 16px)}.price-overlay .amount{font-size:22px}.photo{min-height:260px;aspect-ratio:4/5;height:auto}.photo img{height:100%}.receipt{width:100%}.receipt-backdrop{padding:10px}}
  </style>
</head>
<body>
  <header class="top">
    <div class="top-inner">
      <div class="brand">Соберите свою баню</div>
      <nav id="models" class="models"></nav>
    </div>
  </header>
  <main id="paper" class="paper"><div class="block muted">Загрузка...</div></main>
  <div id="receiptBackdrop" class="receipt-backdrop" onclick="closeReceipt(event)">
    <div class="receipt" role="dialog" aria-modal="true" aria-labelledby="receiptTitle" onclick="event.stopPropagation()">
      <div class="receipt-head">
        <h3 id="receiptTitle" class="receipt-title">Расчет</h3>
        <div class="receipt-sub" id="receiptSub"></div>
      </div>
      <div class="receipt-body" id="receiptBody"></div>
      <div class="receipt-actions">
        <button class="btn btn-secondary" type="button" onclick="downloadReceipt()">Скачать</button>
        <button class="btn" type="button" onclick="closeReceipt()">Закрыть</button>
      </div>
    </div>
  </div>
  <script>
const S={models:[],options:[],page:{blocks:[]},activeModelId:null,basePrice:0,selectedOptions:new Set(),revealedOptions:new Set(),selectedWoodColor:null,woodDescription:'',lastWoodKey:null,lastWoodIdx:-1};
const $=id=>document.getElementById(id);
const api=(u,o)=>fetch(u,o).then(r=>r.json());
const esc=s=>(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const normalizeUrl=u=>(u&&u.indexOf('./uploads/')===0)?('/uploads/'+u.slice('./uploads/'.length)):(u||'');
const optionMeta=o=>Object.fromEntries((Array.isArray(o.features)?o.features:[]).map(x=>String(x).split(':')).filter(x=>x.length>=2).map(([k,...v])=>[k.trim().toLowerCase(),v.join(':').trim()]));
const isWoodColor=o=>(o.group_name==='Цвет бани')||optionMeta(o).type==='wood_color';
const isMultiOption=o=>optionMeta(o).multi==='true'||optionMeta(o).type==='paid_extra';
const activeImgState={};
const topZoneBlocks=new Set();
let _optBlockCache=null;
function _getOptBlockMap(){
  if(_optBlockCache) return _optBlockCache;
  const m={};
  (S.page.blocks||[]).forEach((b,bi)=>{
    (b.elements||[]).forEach(e=>{
      if(e.type==='options')(e.optionIds||[]).forEach(oid=>{ m[String(oid)]=bi; });
    });
  });
  return (_optBlockCache=m);
}
function getActiveImage(e){
  const imgs=Array.isArray(e.images)&&e.images.length?e.images:(e.url||e.imageUrl?[{url:e.url||e.imageUrl}]:[]);
  if(!imgs.length) return null;
  const optMap=_getOptBlockMap();
  for(const img of imgs){
    if(!img.optionId&&!img.scrollTrigger) continue;
    const optSel=img.optionId?S.selectedOptions.has(String(img.optionId)):null;
    const bi=img.optionId!=null?optMap[String(img.optionId)]:null;
    const inZone=img.scrollTrigger?(bi!=null?topZoneBlocks.has(bi):false):null;
    let match=false;
    if(img.optionId&&img.scrollTrigger) match=!!optSel||!!inZone;
    else if(img.optionId) match=!!optSel;
    else if(img.scrollTrigger) match=!!inZone;
    if(match) return img;
  }
  return imgs.find(img=>!img.optionId&&!img.scrollTrigger)||imgs[0]||null;
}
function updateSliderByScroll(){
  const sections=[...(document.querySelectorAll('#paper>.block'))];
  if(!sections.length) return;
  const TOP=300;
  let changed=false;
  const newZone=new Set();
  sections.forEach((s,i)=>{const r=s.getBoundingClientRect();if(r.top<=TOP&&r.bottom>80)newZone.add(i);});
  if(newZone.size!==topZoneBlocks.size) changed=true;
  else for(const x of newZone) if(!topZoneBlocks.has(x)){changed=true;break;}
  topZoneBlocks.clear();
  newZone.forEach(x=>topZoneBlocks.add(x));
  if(!changed) return;
  _optBlockCache=null;
  (S.page.blocks||[]).forEach(b=>{
    (b.elements||[]).forEach(e=>{
      if(e.type!=='image'||!Array.isArray(e.images)) return;
      if(!e.images.some(img=>img.scrollTrigger)) return;
      const activeImg=getActiveImage(e);
      const newKey=activeImg?(activeImg.id||activeImg.url||''):'';
      if(activeImgState[e.id]===newKey) return;
      activeImgState[e.id]=newKey;
      const node=document.querySelector('[data-img-el="'+e.id+'"]');
      if(!node) return;
      const tmp=document.createElement('div');
      tmp.innerHTML=renderElement(e);
      const nn=tmp.firstChild;
      if(nn){nn.classList.add('slide-in');node.replaceWith(nn);}
    });
  });
}
const WOOD_CARD_IMAGE='/color_cart/178094209304ee.png';
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
function rgba(hex,opacity){
  const v=String(hex||'#ffffff').trim();
  const o=clamp(parseInt(opacity??100,10),0,100)/100;
  if(/^#[0-9a-f]{6}$/i.test(v)){
    const n=parseInt(v.slice(1),16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${o})`;
  }
  return v;
}
const cssUrl = v => v ? `url('${String(normalizeUrl(v)).replace(/'/g,'%27')}')` : 'none';
const blockBgStyle = b => `--block-bg:${b.backgroundColor||'#ffffff'};--block-bg-image:${cssUrl(b.backgroundImage||'')};--block-bg-opacity:${(b.backgroundOpacity??100)/100};--block-bg-darken:${(b.backgroundDarken??0)/100};--block-bg-brightness:${b.backgroundBrightness??100}%;--block-bg-contrast:${b.backgroundContrast??100}%;--block-bg-saturation:${b.backgroundSaturation??100}%;--block-bg-blur:${b.backgroundBlur??0}px;--block-bg-position:${b.backgroundPosition||'center center'};--block-bg-size:${b.backgroundSize||'cover'};--block-bg-repeat:${b.backgroundRepeat||'no-repeat'};--block-bg-attachment:${b.backgroundFixed?'fixed':'scroll'};--block-bg-scale:${(b.backgroundBlur??0)>0?'1.03':'1'}${b.blockHeight?';--block-min-height:'+b.blockHeight+'px':''}`;
function titleStyle(e){
  return `font-size:${e.titleSize||18}px;font-weight:${e.titleWeight||800};letter-spacing:${e.titleLetter||0}px;line-height:${(e.titleLine||120)/100};color:${e.titleColor||'#111827'};text-align:${e.titleAlign||'left'};padding:${e.titlePadding||0}px`;
}
function textStyle(t, light){
  return `left:${t.x||8}%;top:${t.y||8}%;width:${t.width||55}%;color:${t.color||(light?'#fff':'#111')};font-size:${t.size||34}px;${fontCss(t.fontKey||'inter')};opacity:${(t.opacity||100)/100};filter:contrast(${t.textContrast||100}%) brightness(${t.textBrightness||100}%) saturate(${t.textSaturation||100}%);text-shadow:0 2px 12px rgba(0,0,0,${(t.shadow||0)/100});transform:rotate(${t.rotate||0}deg)`;
}
function renderElement(e){
  if(e.type==='text'){
    return `<div class="text-el"><div class="text-box" style="${textStyle(e,false)}">${esc(e.text||'')}</div></div>`;
  }
  if(e.type==='image'){
    const activeImg=getActiveImage(e);
    const newKey=activeImg?(activeImg.id||activeImg.url||''):'';
    activeImgState[e.id]=newKey;
    const tint=S.selectedWoodColor?` wood-tint`:'';
    const woodStyle=S.selectedWoodColor?`;--selected-wood:${S.selectedWoodColor.hex}`:'';
    const hasFixedH=e.height&&parseInt(e.height,10)>0;
    const photoH=hasFixedH?`height:${parseInt(e.height,10)}px`:'height:auto';
    const imgH=hasFixedH?'height:100%;object-fit:cover':'height:auto;object-fit:initial';
    const src=activeImg?normalizeUrl(activeImg.url||''):'';
    return `<div class="photo${tint}" data-img-el="${e.id}" style="width:100%;${photoH}${woodStyle}">${src?`<img src="${src}" style="display:block;width:100%;${imgH};opacity:${(e.opacity||100)/100};filter:contrast(${e.contrast||100}%) brightness(${e.brightness||100}%)">`:''}${(e.texts||[]).map(t=>`<div class="photo-text" style="${textStyle(t,true)}">${esc(t.text||'')}</div>`).join('')}</div>`;
  }
  if(e.type==='options'){
    const ids=new Set((e.optionIds||[]).map(x=>parseInt(x,10)));
    const fullList=ids.size ? S.options.filter(o=>ids.has(parseInt(o.id,10))) : S.options;
    const multiGroup=!!e.multiSelect;
    const selected=multiGroup ? null : fullList.find(o=>S.selectedOptions.has(String(o.id)));
    const list=fullList;
    const gap=e.cardGap||10, radius=e.cardRadius||8, border=e.cardBorder??1, shadow=e.cardShadow||0, cardSize=parseInt(e.cardSize||180,10);
    const cardTemplate=o=>{const img=o.image_url?normalizeUrl(o.image_url):WOOD_CARD_IMAGE;const priceValue=Number(o.price||0);const price=priceValue.toLocaleString('ru-RU');return `<article class="card ${S.selectedOptions.has(String(o.id))?'selected':''} ${isWoodColor(o)?'wood-card':''}" style="width:100%;border-radius:${radius}px" onclick="toggleOption(${parseInt(o.id,10)},'${e.id}',event)"><div class="card-media" style="border:${border}px solid var(--line);border-radius:${radius}px">${img?`<img src="${img}" style="filter:${isWoodColor(o)?'none':`contrast(${e.imageContrast||100}%) brightness(${e.imageBrightness||100}%)`}">`:''}${S.selectedOptions.has(String(o.id))?'<span class="check">✓</span>':''}</div><div class="card-body" style="font-size:${e.textSize||14}px"><b>${esc(o.name)}</b>${!isWoodColor(o)&&priceValue>0?`<div class="price">Цена: ${price} ₽</div>`:''}</div></article>`};
    const html=list.map(cardTemplate).join('');
    const desc=selected ? (isWoodColor(selected)?S.woodDescription:(selected.description||'')) : '';
    const descHtml = desc ? `<div class="wood-desc">${esc(desc)}</div>` : '';
    return `<div class="options-wrap" style="background:${rgba(e.optionsBgColor||'#ffffff',e.optionsBgOpacity??100)}">${e.optionTitle?`<h3 class="options-title" style="${titleStyle(e)}">${esc(e.optionTitle)}</h3>`:''}<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,${cardSize}px),${cardSize}px));gap:${gap}px">${html}</div>${descHtml}</div>`;
  }
  if(e.type==='form'){
    return `<form class="form-box"><b>${esc(e.title||'Заявка')}</b><input placeholder="Имя"><input placeholder="Телефон"><textarea rows="3" placeholder="Комментарий"></textarea><button class="btn" type="button">Отправить</button></form>`;
  }
  return '';
}
function renderPage(){
  _optBlockCache=null;
  const blocks=S.page.blocks||[];
  $('paper').innerHTML=blocks.length?blocks.map(b=>{const title=(b.title||'').trim()==='Новый блок'?'':(b.title||'');const visual=b.backgroundImage?' visual-block':'';const stickyClass=b.stickyPosition==='top'?' sticky-top':b.stickyPosition==='bottom'?' sticky-bottom':b.stickyBlock?' sticky-block':'';return `<section class="block${visual}${stickyClass}" style="${blockBgStyle(b)}">${title?`<h2 class="block-title">${esc(title)}</h2>`:''}${(b.elements||[]).map(renderElement).join('')}</section>`}).join(''):'<div class="block muted">Для этой модели пока нет блоков.</div>';
  renderSummary();
  requestAnimationFrame(updateSliderByScroll);
}
function renderSummary(){
  const optionsSum=S.options.filter(o=>S.selectedOptions.has(String(o.id))).reduce((a,o)=>a+Number(o.price||0),0);
  const sum=Number(S.basePrice||0)+optionsSum;
  let el=document.getElementById('priceOverlay');
  if(!el){
    el=document.createElement('div'); el.id='priceOverlay'; el.className='price-overlay';
    el.innerHTML=`<div class="label" aria-hidden="true"></div><div class="amount"><span data-price-amount></span> <small>₽</small></div>`;
    el.onclick=openReceipt;
    document.body.appendChild(el);
  }
  const amount=el.querySelector('[data-price-amount]');
  if(amount) amount.textContent=sum.toLocaleString('ru-RU');
}
function animatePriceIcon(){
  const el=document.getElementById('priceOverlay');
  if(!el) return;
  el.classList.remove('coin-spin');
  const coin=el.querySelector('.label');
  if(coin) void coin.offsetWidth;
  requestAnimationFrame(()=>el.classList.add('coin-spin'));
  setTimeout(()=>el.classList.remove('coin-spin'),900);
}
function receiptData(){
  const items=S.options.filter(o=>S.selectedOptions.has(String(o.id))).map(o=>({name:o.name,group:o.group_name||'Опция',price:Number(o.price||0)}));
  const optionsSum=items.reduce((a,o)=>a+o.price,0);
  const sum=Number(S.basePrice||0)+optionsSum;
  return {items, optionsSum, sum, model:(S.models.find(m=>parseInt(m.id,10)===parseInt(S.activeModelId,10))||{}).name||'Проект'};
}
function renderReceipt(){
  const d=receiptData();
  $('receiptSub').textContent=d.model;
  const rows=d.items.length ? d.items.map(o=>`<div class="receipt-row"><span>${esc(o.group)}: ${esc(o.name)}</span><strong>${o.price?o.price.toLocaleString('ru-RU')+' ₽':'включено'}</strong></div>`).join('') : '<div class="muted">Пока ничего не выбрано.</div>';
  const baseRow=Number(S.basePrice||0)?`<div class="receipt-row"><span>Базовая стоимость</span><strong>${Number(S.basePrice||0).toLocaleString('ru-RU')} ₽</strong></div>`:'';
  $('receiptBody').innerHTML=`${rows}${baseRow}<div class="receipt-total"><span>Итого</span><span>${d.sum.toLocaleString('ru-RU')} ₽</span></div>`;
}
function openReceipt(){
  renderReceipt();
  $('receiptBackdrop').classList.add('open');
}
function closeReceipt(ev){
  if(ev&&ev.target&&ev.target!==$('receiptBackdrop')) return;
  $('receiptBackdrop').classList.remove('open');
}
function receiptHtml(){
  const d=receiptData();
  const rows=d.items.length ? d.items.map(o=>`<div class="row"><span>${esc(o.group)}: ${esc(o.name)}</span><strong>${o.price?o.price.toLocaleString('ru-RU')+' ₽':'включено'}</strong></div>`).join('') : '<div class="muted">Пока ничего не выбрано.</div>';
  const baseRow=Number(S.basePrice||0)?`<div class="row"><span>Базовая стоимость</span><strong>${Number(S.basePrice||0).toLocaleString('ru-RU')} ₽</strong></div>`:'';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Расчет</title><style>body{margin:0;font:15px/1.5 Arial,sans-serif;background:#eef2f0;color:#111827;padding:18px}.receipt{max-width:420px;margin:0 auto;background:#fff;border:1px solid #d9e1ea;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(15,23,42,.12)}.head{padding:16px 18px 10px;border-bottom:1px dashed #d9e1ea}.title{margin:0;font-size:20px;font-weight:800}.sub{margin-top:4px;color:#667085;font-size:12px}.body{padding:14px 18px 16px}.row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px dotted #e5eaf0}.row:last-child{border-bottom:0}.total{display:flex;justify-content:space-between;gap:12px;margin-top:12px;padding-top:12px;border-top:2px solid #17231d;font-size:18px;font-weight:800}.muted{color:#667085}.foot{padding:0 18px 18px;color:#667085;font-size:12px}</style></head><body><div class="receipt"><div class="head"><h1 class="title">Расчет</h1><div class="sub">${esc(d.model)}</div></div><div class="body">${rows}${baseRow}<div class="total"><span>Итого</span><span>${d.sum.toLocaleString('ru-RU')} ₽</span></div></div><div class="foot">Сформировано автоматически</div></div></body></html>`;
}
function downloadReceipt(){
  const blob=new Blob([receiptHtml()],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`smeta-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function pickWoodDescription(key){
  const arr=WOOD_DESCRIPTIONS[key]||[];
  if(!arr.length) return '';
  let idx=Math.floor(Math.random()*arr.length);
  if(key===S.lastWoodKey && arr.length>1 && idx===S.lastWoodIdx) idx=(idx+1)%arr.length;
  S.lastWoodKey=key; S.lastWoodIdx=idx;
  return arr[idx];
}
const findOptionsElement=id=>{
  for(const b of (S.page.blocks||[])){
    for(const e of (b.elements||[])){
      if(e.type==='options' && String(e.id)===String(id)) return e;
    }
  }
  return null;
};
function flyPriceFrom(sourceNode, amount, done){
  const target=document.getElementById('priceOverlay');
  if(!sourceNode || !target || !amount){ done(); return; }
  const from=(sourceNode.closest&&sourceNode.closest('.card')||sourceNode).getBoundingClientRect();
  const to=target.getBoundingClientRect();
  const chip=document.createElement('div');
  chip.className='price-fly';
  chip.textContent='+' + Number(amount||0).toLocaleString('ru-RU') + ' ₽';
  const x=from.left+from.width/2, y=from.top+Math.min(from.height*.72,from.height-18);
  chip.style.left=x+'px';
  chip.style.top=y+'px';
  chip.style.transform='translate(-50%,-50%) scale(.9)';
  document.body.appendChild(chip);
  requestAnimationFrame(()=>{
    chip.style.transition='transform 620ms cubic-bezier(.18,.84,.22,1), opacity 620ms ease';
    chip.style.transform=`translate(${to.left+to.width/2-x}px,${to.top+to.height/2-y}px) translate(-50%,-50%) scale(.55)`;
    chip.style.opacity='.15';
  });
  setTimeout(()=>{ chip.remove(); done(); setTimeout(animatePriceIcon,40); },640);
}
function applyOptionToggle(id, elementId){
  const o=S.options.find(x=>parseInt(x.id,10)===parseInt(id,10));
  const sourceEl=findOptionsElement(elementId);
  const k=String(id);
  if(S.selectedOptions.has(k)){
    S.selectedOptions.delete(k);
    S.revealedOptions.delete(k);
    renderPage();
    return;
  }
  if(o&&isWoodColor(o)){
    for(const item of S.options.filter(isWoodColor)) S.selectedOptions.delete(String(item.id));
    S.selectedOptions.add(k);
    const meta=optionMeta(o);
    S.selectedWoodColor={id:k,key:meta.key||k,hex:meta.hex||'#ddd',name:o.name};
    S.woodDescription=pickWoodDescription(S.selectedWoodColor.key);
  } else {
    if(sourceEl&&sourceEl.multiSelect){
      if(S.selectedOptions.has(k)) S.selectedOptions.delete(k); else S.selectedOptions.add(k);
      renderPage();
      return;
    }
    const allowedIds=new Set(((sourceEl&&sourceEl.optionIds)||[]).map(x=>String(parseInt(x,10))));
    if(allowedIds.size) for(const item of S.options.filter(x=>allowedIds.has(String(parseInt(x.id,10))))) S.selectedOptions.delete(String(item.id));
    else {
      const groupId=String(o?.group_id||'');
      if(groupId) for(const item of S.options.filter(x=>String(x.group_id||'')===groupId)) S.selectedOptions.delete(String(item.id));
    }
    S.selectedOptions.add(k);
  }
  renderPage();
}
window.toggleOption=(id, elementId, ev)=>{
  const o=S.options.find(x=>parseInt(x.id,10)===parseInt(id,10));
  const k=String(id);
  const isAdding=!!o && !S.selectedOptions.has(k) && Number(o.price||0)>0;
  if(isAdding) flyPriceFrom(ev&&ev.currentTarget, Number(o.price||0), ()=>applyOptionToggle(id, elementId));
  else applyOptionToggle(id, elementId);
};
window.loadModel=async id=>{
  S.activeModelId=id; S.selectedOptions.clear(); S.revealedOptions.clear(); S.selectedWoodColor=null; S.woodDescription=''; S.basePrice=Number((S.models.find(m=>parseInt(m.id,10)===parseInt(id,10))||{}).base_price||0); renderModels();
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
let resizeTimer=null;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(renderPage,120);});
window.addEventListener('scroll',updateSliderByScroll,{passive:true});
  </script>
</body>
</html>
