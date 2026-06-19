<?php ?><!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Конструктор коммерческих предложений</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Manrope:wght@400;600;700;800&family=Montserrat:wght@500;700&family=Playfair+Display:ital,wght@0,600;1,600&family=Rubik:wght@400;600;700&display=swap');
    :root{--bg:#eef1f5;--p:#fff;--t:#111827;--m:#6b7280;--l:#dde3ea;--a:#0f766e;--a2:#0b5f58;--shadow:0 10px 28px rgba(15,23,42,.08)}
    *{box-sizing:border-box} body{margin:0;font:14px/1.45 Inter,Arial,sans-serif;background:var(--bg);color:var(--t);position:relative}
    body.preload{visibility:hidden}
    body::before{
      content:"";
      position:fixed; inset:0; pointer-events:none; z-index:0; opacity:.25;
      background-image:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='260' viewBox='0 0 360 260'%3E%3Cg stroke='%2394a3b8' stroke-width='1.2' fill='none' stroke-linecap='round'%3E%3Cpath d='M20 40c30-18 60 20 90 0s55 18 85 0'/%3E%3Cpath d='M220 60c12-10 28-10 40 0s28 10 40 0'/%3E%3Crect x='30' y='90' width='70' height='38' rx='8'/%3E%3Cpath d='M36 103h58M36 113h45M36 123h50'/%3E%3Ccircle cx='165' cy='112' r='20'/%3E%3Cpath d='M150 112h30M165 97v30'/%3E%3Cpath d='M235 92l38 0l18 18l-18 18l-38 0l-18-18z'/%3E%3Cpath d='M42 170c18-8 32-8 50 0s34 8 52 0'/%3E%3Cpath d='M190 160c0 0 12-12 24 0s24 0 24 0s12-12 24 0'/%3E%3Cpath d='M300 170l20-8l18 8l-18 8z'/%3E%3Cpath d='M90 210l18-8l20 8l-20 8z'/%3E%3C/g%3E%3C/svg%3E");
      background-size: 420px 300px;
      background-repeat: repeat;
    }
    .top,.l{position:relative;z-index:1}
    .top{position:sticky;top:0;background:#eef1f5ea;backdrop-filter:blur(8px);border-bottom:1px solid var(--l);padding:12px 16px;display:flex;justify-content:space-between;align-items:center;z-index:10}
    .brand{font-size:15px;font-weight:700;color:#0f172a;margin-right:14px}
    .btn{border:1px solid var(--l);background:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;transition:.15s ease}
    .btn:hover{border-color:#c7d1dc}
    .btn.a{background:var(--a);border-color:var(--a);color:#fff}.btn.a:hover{background:var(--a2);border-color:var(--a2)}
    .btn.on{background:#111827;color:#fff;border-color:#111827}
    .menu-choice{width:100%;text-align:left;border:1px solid var(--l);background:#fff;padding:10px 12px;border-radius:10px;cursor:pointer;transition:transform .14s ease,background .14s ease,border-color .14s ease,box-shadow .14s ease;box-shadow:0 4px 12px rgba(15,23,42,.04)}
    .menu-choice:hover{background:#f8fbff;border-color:#9cc2ff;box-shadow:0 10px 24px rgba(37,99,235,.10);transform:translateY(-1px)}
    .menu-choice.active{background:#eef6ff;border-color:#60a5fa;box-shadow:0 0 0 2px rgba(96,165,250,.14)}
    .icon-btn{border:0;background:transparent;padding:4px;line-height:1;display:grid;place-items:center;color:#334155;cursor:pointer}
    .icon-btn:hover{color:#0f172a}
    .model-link{color:#1d4ed8;text-decoration:underline;font-weight:600;display:inline-block;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transform-origin:left center;transition:transform .12s ease,color .12s ease}
    .model-link:hover{color:#1e40af;transform:scale(1.03)}
    .l{display:grid;grid-template-columns:300px 1fr 360px;gap:12px;padding:12px}.p{background:var(--p);border:1px solid var(--l);border-radius:10px;box-shadow:var(--shadow)}
    .h{padding:12px 12px 10px;border-bottom:1px solid var(--l);font-weight:700}.b{padding:12px}.tiny{font-size:12px;color:var(--m)} .hidden{display:none!important}
    .item{border:1px solid var(--l);border-radius:8px;padding:9px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;overflow:hidden}
    .item.model-active{border-color:#16a34a;background:#f0fdf4;box-shadow:0 0 0 2px rgba(22,163,74,.14)}
    .item.model-active .model-link{color:#166534;font-weight:800}
    .item.model-active .model-link::after{content:" выбран";display:inline-flex;align-items:center;margin-left:6px;padding:2px 6px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;line-height:1;text-decoration:none;vertical-align:middle}
    .strip{border:1px dashed #c6d0dd;border-radius:8px;padding:12px;text-align:center;background:#f8fafc;cursor:pointer}
    #workspace{max-width:820px;margin:0 auto}
    .block{position:relative;z-index:2;border:1px solid var(--l);border-radius:10px;padding:18px;background:var(--block-bg,#fff);min-height:220px;overflow:hidden}.block.sel{border-color:#16a34a;box-shadow:0 0 0 2px #16a34a22}
    .block.sticky-block,.block.sticky-top{position:sticky;top:72px;z-index:4;box-shadow:0 18px 45px rgba(15,23,42,.12)}
    .block.sticky-bottom{position:sticky;bottom:0;z-index:4;box-shadow:0 -18px 45px rgba(15,23,42,.12)}
    .block::before{content:"";position:absolute;inset:0;z-index:0;background-image:var(--block-bg-image,none);background-position:var(--block-bg-position,center center);background-size:var(--block-bg-size,cover);background-repeat:var(--block-bg-repeat,no-repeat);background-attachment:var(--block-bg-attachment,scroll);opacity:var(--block-bg-opacity,1);filter:brightness(var(--block-bg-brightness,100%)) contrast(var(--block-bg-contrast,100%)) saturate(var(--block-bg-saturation,100%)) blur(var(--block-bg-blur,0px));transform:scale(var(--block-bg-scale,1));pointer-events:none}
    .block::after{content:"";position:absolute;inset:0;z-index:0;background:rgba(0,0,0,var(--block-bg-darken,0));pointer-events:none}
    .block>*{position:relative;z-index:1}
    .block-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:10px}
    .block-actions{display:flex;gap:2px;flex-shrink:0}
    .el{border:1px solid transparent;border-radius:8px;padding:0;background:transparent;margin-top:8px}
    .el:hover{outline:1px dashed #b8c2cf;outline-offset:2px}
    .el.sel{outline:2px solid #16a34a;outline-offset:3px}
    .text-canvas{position:relative;min-height:160px;border-radius:0;overflow:hidden;background:transparent}
    .text-box{position:absolute;border:0;outline:1px dashed #22a447;outline-offset:0;padding:0;cursor:move;user-select:none;background:transparent;transform-origin:center center;white-space:pre-wrap;word-break:break-word;line-height:1.2}
    .text-box.sel{outline:2px solid #16a34a;outline-offset:2px}
    .text-box [contenteditable]{outline:none;user-select:text;cursor:text;white-space:inherit;word-break:inherit}
    .text-box .move{position:absolute;left:-8px;top:-8px;width:14px;height:14px;border-radius:50%;background:#22a447;cursor:move}
    .text-box .resize{position:absolute;right:-7px;bottom:-7px;width:12px;height:12px;border-radius:50%;background:#22a447;cursor:nwse-resize}
    .text-box .rotate{position:absolute;left:50%;top:-24px;transform:translateX(-50%);width:18px;height:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;cursor:grab;color:#0f172a;user-select:none}
    .text-box .rotate svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .text-box .angle-zero{position:absolute;right:-6px;top:-18px;font-size:10px;line-height:1;padding:2px 4px;border-radius:8px;background:#16a34a;color:#fff}
    .field{display:grid;gap:4px;margin-bottom:8px}.field>label{font-size:12px;color:#555;font-weight:600}
    input,textarea,select{width:100%;padding:8px;border:1px solid #d8dde6;border-radius:8px}
    .color-ui{display:grid;gap:8px}
    .color-row{display:flex;gap:8px;align-items:center}
    .color-chip{width:30px;height:30px;border-radius:8px;border:1px solid #d8dde6}
    .swatches{display:flex;gap:6px;flex-wrap:wrap}
    .swatch{width:20px;height:20px;border-radius:6px;border:1px solid #d8dde6;cursor:pointer}
    .media-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
    .media-thumb{border:1px solid #d8dde6;border-radius:8px;overflow:hidden;cursor:pointer;background:#fff;padding:0}
    .media-thumb img{display:block;width:100%;height:64px;object-fit:cover}
    .media-thumb.active{outline:2px solid #16a34a}
    .img-item{display:flex;gap:6px;align-items:center;border:1px solid #d8dde6;border-radius:8px;padding:6px;background:#f9fafb;margin-bottom:6px}
    .img-thumb{width:54px;height:38px;object-fit:cover;border-radius:4px;background:#e5e7eb;flex-shrink:0;display:block}
    .img-thumb-empty{width:54px;height:38px;border-radius:4px;background:#e5e7eb;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8}
    .img-del{border:0;background:#ef4444;color:#fff;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;flex-shrink:0;white-space:nowrap}
    .img-meta{flex:1;min-width:0;font-size:11px;color:var(--m);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .img-opt-sel{width:auto!important;flex-shrink:0;font-size:11px;padding:4px 5px;min-width:70px}
    .media-layout{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
    .folder-item{padding:10px;border:1px solid #d8dde6;border-radius:10px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#fff;aspect-ratio:1/1;display:flex;align-items:flex-end}
    .folder-item.active{border-color:#16a34a;background:#f0fdf4}
    .media-card{border:1px solid #d8dde6;border-radius:10px;overflow:hidden;background:#fff;aspect-ratio:1/1;display:flex;flex-direction:column}
    .media-card img{display:block;width:100%;height:100%;object-fit:cover;flex:1}
    .media-body{padding:6px}
    .explorer{display:grid;grid-template-columns:260px 1fr;gap:12px}
    .tree{border:1px solid #d8dde6;border-radius:10px;padding:8px;min-height:420px;background:#fff}
    .tree-item{padding:8px;border-radius:8px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tree-item.active{background:#eef6ff;border:1px solid #bfdbfe}
    .canvas{border:1px solid #d8dde6;border-radius:10px;padding:10px;min-height:420px;background:#fff}
    .tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(116px,1fr));gap:8px}
    .tile{border:1px solid #d8dde6;border-radius:10px;overflow:hidden;background:#fff}
    .tile.preview img{width:100%;height:86px;object-fit:cover;display:block}
    .tile .label{padding:6px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ctx{position:fixed;z-index:1000;display:none;background:#fff;border:1px solid #d8dde6;border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.12);padding:6px;min-width:170px}
    .ctx button{width:100%;text-align:left;border:0;background:#fff;padding:8px;border-radius:8px;cursor:pointer}
    .ctx button:hover{background:#f3f4f6}
    .photo{position:relative;overflow:hidden;border-radius:8px;background:#d9dde3;max-width:100%;margin:0 auto}
    .photo img{display:block;width:100%;height:100%;object-fit:cover}
    .photo .txt{position:absolute;left:8%;top:8%;word-break:break-word}
    .cards{display:grid;gap:10px;transition:all .4s ease;justify-content:center}
    .card{min-width:0;border:0!important;border-radius:8px;overflow:visible;background:transparent;box-shadow:none!important}
    .card img{display:block;width:100%;height:100%;object-fit:cover;background:#eef1f5}
    .card-media{position:relative;min-height:0;aspect-ratio:25/18;overflow:hidden;background:transparent;border:1px solid var(--l)}
    .card-body{padding:10px 12px 12px;background:#fff;border-top:0}
    .price{color:var(--a);font-weight:800;margin-top:4px}
    .wood-sample{height:120px;border-radius:8px;position:relative;overflow:hidden;background:
      linear-gradient(180deg,rgba(255,255,255,.20),rgba(255,255,255,.03) 18%,rgba(0,0,0,.05) 58%,rgba(0,0,0,.16)),
      linear-gradient(0deg,var(--wood),var(--wood));box-shadow:inset 0 12px 18px rgba(255,255,255,.16), inset 0 -14px 18px rgba(0,0,0,.16);filter:saturate(1.12) contrast(1.08)}
    .wood-sample::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 41px,rgba(90,58,32,.18) 41px 44px,rgba(255,255,255,.10) 44px 45px),linear-gradient(90deg,rgba(255,255,255,.16),transparent 16%,rgba(0,0,0,.08) 42%,transparent 68%,rgba(255,255,255,.08)),radial-gradient(ellipse at 22% 34%,rgba(60,35,18,.24) 0 6px,transparent 17px),radial-gradient(ellipse at 72% 66%,rgba(60,35,18,.20) 0 5px,transparent 15px),radial-gradient(circle at 49% 50%,rgba(255,255,255,.08) 0 28%,transparent 54%);mix-blend-mode:multiply;opacity:.96}
    .drop{border:2px dashed #cfd4dc;border-radius:8px;padding:12px;text-align:center;background:#f8fafc}
    .modal{position:fixed;inset:0;background:#0005;display:none;align-items:center;justify-content:center;padding:12px}.modal.on{display:flex}.d{max-width:680px;width:100%;background:#fff;border:1px solid var(--l);border-radius:8px;padding:10px}
    @media (max-width:1200px){.l{grid-template-columns:280px 1fr}.r{grid-column:1/-1}} @media (max-width:860px){.l{grid-template-columns:1fr}.cards{grid-template-columns:repeat(2,minmax(0,1fr))!important;justify-content:stretch}.card{width:100%!important}.card-media{height:auto!important;aspect-ratio:25/18}}
  </style>
</head>
<body class="preload">
  <div class="top">
    <div style="display:flex;align-items:center;gap:8px">
      <div class="brand">Конструктор коммерческих предложений</div>
      <button id="tabM" class="btn on">Модели</button>
      <button id="tabO" class="btn">Опции</button>
      <button id="tabD" class="btn">Медиа</button>
    </div>
    <div style="display:flex;gap:8px;align-items:center"><span id="saveState" class="tiny">Нет изменений</span><button id="saveBtn" class="btn a">Сохранить</button></div>
  </div>
  <div class="l">
    <aside class="p"><div class="h">Структура</div><div class="b">
      <div id="panelM">
        <div style="display:flex;gap:8px;margin-bottom:8px"><button id="newModel" class="btn">+ Модель</button></div>
        <div id="models"></div>
        <div id="blockAddMenu" style="margin-top:14px"></div>
      </div>
    <div id="panelO" class="hidden"><button id="newOption" class="btn a">+ Добавить опцию</button><div class="tiny" style="margin:8px 0">Группы</div><div id="options"></div></div>
      <div id="panelD" class="hidden"><div class="tiny">Медиа-менеджер открыт в центральной области.</div></div>
    </div></aside>
    <main class="p"><div class="h">Холст</div><div class="b"><div id="workspace"></div><div id="optPreview" class="cards hidden" style="grid-template-columns:repeat(auto-fill,minmax(180px,200px));justify-content:flex-start"></div><div id="mediaWorkspace" class="hidden"></div></div></main>
    <aside class="p r" style="position:sticky;top:64px;max-height:calc(100vh - 74px);overflow:auto"><div class="h">Настройки</div><div class="b"><div id="settings" class="tiny">Выберите блок/элемент.</div></div></aside>
  </div>

  <div id="addBlockModal" class="modal"><div class="d"><b>Добавить универсальный блок</b><div style="margin-top:10px"><button id="confirmAddBlock" class="btn a">Добавить блок</button> <button class="btn" onclick="toggleModal(false)">Закрыть</button></div></div></div>
  <div id="optionModal" class="modal">
    <div class="d" style="max-width:920px">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div>
          <b id="optionModalTitle">Опция</b>
          <div class="tiny" style="margin-top:4px">Заполните поля и сохраните изменения.</div>
        </div>
        <button class="btn" onclick="toggleOptionModal(false)">Закрыть</button>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:12px;margin-top:12px">
        <div style="display:grid;gap:8px">
          <div class="field"><label>Название</label><input id="optName" oninput="updateOptionModalPreview()"></div>
          <div class="field"><label>Цена</label><input id="optPrice" type="number" min="0" step="1000" oninput="updateOptionModalPreview()"></div>
          <div class="field"><label>Фото</label><input id="optImageFile" type="file" accept="image/*"><button type="button" class="btn" onclick="uploadOptionImage()">Загрузить фото</button><input id="optImage" oninput="updateOptionModalPreview()" placeholder="/uploads/..."></div>
          <div class="field"><label>Описание</label><textarea id="optDescription" rows="4" oninput="updateOptionModalPreview()"></textarea></div>
          <div class="field"><label>Характеристики через |</label><textarea id="optFeatures" rows="4"></textarea></div>
        </div>
        <div style="display:grid;gap:8px">
          <div class="field"><label>Группа</label><select id="optGroup"></select></div>
          <div class="field"><label>Доступность в моделях</label><div id="optModels" style="display:grid;gap:4px;max-height:240px;overflow:auto"></div></div>
          <div class="field"><label>Предпросмотр</label><div style="border:1px solid var(--l);border-radius:8px;overflow:hidden;background:#fff"><div style="height:160px;background:#f8fafc"><img id="optImagePreview" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div><div style="padding:8px"><b id="optPreviewName"></b><div id="optPreviewPrice" class="tiny"></div><div id="optPreviewDesc" class="tiny" style="margin-top:6px"></div></div></div></div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
        <button id="optSaveBtn" class="btn a">Сохранить</button>
        <button class="btn" onclick="toggleOptionModal(false)">Отмена</button>
      </div>
    </div>
  </div>

  <div id="ctxMenu" class="ctx"></div>

  <!-- Layouts modal -->
  <div id="layoutsModal" class="modal">
    <div class="d" style="max-width:560px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <b id="layoutsModalTitle">Планировки</b>
          <div class="tiny" id="layoutsModelName" style="margin-top:2px"></div>
        </div>
        <button class="btn" onclick="closeLayoutsModal()">Закрыть</button>
      </div>
      <div id="layoutsList" style="margin-bottom:12px"></div>
      <div style="border-top:1px solid var(--l);padding-top:12px">
        <b style="font-size:13px">Добавить планировку</b>
        <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-top:8px;align-items:end">
          <div class="field" style="margin:0"><label>Название</label><input id="newLayoutName" placeholder="Например: 3×4 с мойкой и парной"></div>
          <div class="field" style="margin:0"><label>Надбавка, ₽</label><input id="newLayoutPrice" type="number" min="0" step="1000" value="0" style="width:110px"></div>
          <button class="btn a" onclick="addLayout()">+ Добавить</button>
        </div>
        <div id="layoutsError" class="tiny" style="color:#ef4444;margin-top:6px"></div>
      </div>
    </div>
  </div>
<script>
const S={tab:'m',models:[],options:[],groups:[],media:[],folders:[],activeFolderId:0,activeModelId:null,activeOptionGroupId:null,page:{blocks:[]},selectedBlockId:null,selectedElId:null,selectedPart:'element',selectedImgTextIdx:0,imageTextOpen:true,insertAt:0,dirty:false,timer:null,saving:false,uploading:false,lastHash:'',optionEditorId:null,editingImgUrl:null};
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
const fontSelect = (current, onChange) => `<select onchange="${onChange}"><option value="inter" ${current==='inter'?'selected':''}>Inter (free)</option><option value="manrope" ${current==='manrope'?'selected':''}>Manrope (free)</option><option value="montserrat" ${current==='montserrat'?'selected':''}>Montserrat (free)</option><option value="rubik" ${current==='rubik'?'selected':''}>Rubik (free)</option><option value="playfair" ${current==='playfair'?'selected':''}>Playfair Display (free)</option><option value="siberia_sans" ${current==='siberia_sans'?'selected':''}>Siberia Sans (авторский)</option><option value="taiga_soft" ${current==='taiga_soft'?'selected':''}>Taiga Soft (авторский)</option><option value="steam_serif" ${current==='steam_serif'?'selected':''}>Steam Serif (авторский)</option></select>`;
const colorInputValue = value => /^#[0-9a-f]{6}$/i.test(value||'') ? value : '#ffffff';
const colorPickerHtml = (value, setExpr) => `<div class="color-ui"><div class="color-row"><span class="color-chip" style="background:${value||'#ffffff'}"></span><input type="color" value="${colorInputValue(value)}" onchange="${setExpr.replace('{v}','this.value')}"><input value="${value||'#ffffff'}" placeholder="#ffffff / rgb(255,255,255)" onchange="${setExpr.replace('{v}','this.value')}" style="min-width:0;flex:1"></div><div class="swatches">${COLOR_SWATCHES.map(c=>`<button type="button" class="swatch" style="background:${c}" onclick="${setExpr.replace('{v}',`'${c}'`)}" title="${c}"></button>`).join('')}</div></div>`;
const rgba = (hex,opacity) => { const v=String(hex||'#ffffff').trim(), o=clamp(parseInt(opacity??100,10),0,100)/100; if(/^#[0-9a-f]{6}$/i.test(v)){const n=parseInt(v.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${o})`;} return v; };
const normalizeUrl = u => (u && u.indexOf('./uploads/')===0) ? ('/uploads/' + u.slice('./uploads/'.length)) : (u||'');
const optionMeta = o => Object.fromEntries((Array.isArray(o.features)?o.features:[]).map(x=>String(x).split(':')).filter(x=>x.length>=2).map(([k,...v])=>[k.trim().toLowerCase(),v.join(':').trim()]));
const isWoodColor = o => (o.group_name==='Цвет бани') || optionMeta(o).type==='wood_color';
const WOOD_CARD_IMAGE = '/color_cart/178094209304ee.png';
const optionGroupsForPick = () => (S.groups||[]).filter(g => (S.options||[]).some(o => String(o.group_id||'') === String(g.id)));
const optionsByGroupId = groupId => (S.options||[]).filter(o => String(o.group_id||'') === String(groupId));
const optionAvailableForModel = (o, modelId=S.activeModelId) => !Array.isArray(o.model_ids) || !o.model_ids.length || !modelId || o.model_ids.map(String).includes(String(modelId));
const optionsByGroupForActiveModel = groupId => optionsByGroupId(groupId).filter(o=>optionAvailableForModel(o));
const chooseOptionGroup = () => {
  const groups = optionGroupsForPick();
  if(!groups.length){ alert('Сначала создайте группу и опции.'); return null; }
  if(groups.length === 1) return groups[0];
  const text = groups.map((g,i)=>`${i+1}. ${g.name} (${optionsByGroupForActiveModel(g.id).length})`).join('\n');
  const n = prompt('Какую группу опций добавить?\n' + text, '1');
  if(n===null) return null;
  return groups[clamp(parseInt(n,10)||1,1,groups.length)-1] || null;
};
const setBlockBg = v => { const b=block(); if(!b)return; b.backgroundColor=v; renderWorkspace(); touch(); };
const cssUrl = v => v ? `url('${String(v).replace(/'/g,'%27')}')` : 'none';
const blockBgStyle = b => `--block-bg:${b.backgroundColor||'#ffffff'};--block-bg-image:${cssUrl(b.backgroundImage||'')};--block-bg-opacity:${(b.backgroundOpacity??100)/100};--block-bg-darken:${(b.backgroundDarken??0)/100};--block-bg-brightness:${b.backgroundBrightness??100}%;--block-bg-contrast:${b.backgroundContrast??100}%;--block-bg-saturation:${b.backgroundSaturation??100}%;--block-bg-blur:${b.backgroundBlur??0}px;--block-bg-position:${b.backgroundPosition||'center center'};--block-bg-size:${b.backgroundSize||'cover'};--block-bg-repeat:${b.backgroundRepeat||'no-repeat'};--block-bg-attachment:${b.backgroundFixed?'fixed':'scroll'};--block-bg-scale:${(b.backgroundBlur??0)>0?'1.03':'1'}${b.blockHeight?';min-height:'+b.blockHeight+'px':''}`;
const setBlockProp = (k,v) => { const b=block(); if(!b)return; b[k]=v; renderWorkspace(); touch(); };
const blockBackgroundSettingsHtml = b => `<details open><summary><b>Фон блока</b></summary><div style="margin-top:8px">
  <div class="field"><label>Высота блока (px) <span class="tiny">${b.blockHeight||'авто'}</span></label><input type="range" min="0" max="1200" step="20" value="${b.blockHeight||0}" oninput="setBlockProp('blockHeight',parseInt(this.value,10)||0);this.previousSibling.querySelector('span').textContent=this.value==0?'авто':this.value+'px'"></div>
  <div class="field"><label>Цвет</label>${colorPickerHtml(b.backgroundColor||'#ffffff',"setBlockProp('backgroundColor',{v})")}<input value="${esc(b.backgroundColor||'#ffffff')}" placeholder="#ffffff / rgb(255,255,255)" onchange="setBlockProp('backgroundColor',this.value)"></div>
  <div class="field"><label>Изображение</label><input id="blockBgFile" type="file" accept="image/*"><button type="button" class="btn" id="blockBgUploadBtn">Загрузить фон</button></div>
  ${b.backgroundImage?`<div class="field"><label>Предпросмотр</label><div class="media-thumb" style="cursor:default"><img src="${normalizeUrl(b.backgroundImage)}" alt=""></div><button type="button" class="btn" onclick="removeBlockBackgroundImage()">Удалить изображение</button></div>`:''}
  <div class="field"><label>Выбрать из медиатеки</label><div class="media-grid">${S.media.map(m=>`<button type="button" class="media-thumb ${b.backgroundImage===m.file_url?'active':''}" onclick="setBlockProp('backgroundImage','${m.file_url.replace(/'/g,"\\'")}')" title="${esc(m.file_name)}"><img src="${normalizeUrl(m.file_url)}" alt="${esc(m.file_name)}"></button>`).join('')}</div></div>
  <div class="field"><label>Прозрачность</label><input type="range" min="0" max="100" value="${b.backgroundOpacity??100}" oninput="setBlockProp('backgroundOpacity',parseInt(this.value,10))"></div>
  <div class="field"><label>Затемнение</label><input type="range" min="0" max="100" value="${b.backgroundDarken??0}" oninput="setBlockProp('backgroundDarken',parseInt(this.value,10))"></div>
  <div class="field"><label>Яркость</label><input type="range" min="20" max="180" value="${b.backgroundBrightness??100}" oninput="setBlockProp('backgroundBrightness',parseInt(this.value,10))"></div>
  <div class="field"><label>Контраст</label><input type="range" min="20" max="180" value="${b.backgroundContrast??100}" oninput="setBlockProp('backgroundContrast',parseInt(this.value,10))"></div>
  <div class="field"><label>Насыщенность</label><input type="range" min="0" max="220" value="${b.backgroundSaturation??100}" oninput="setBlockProp('backgroundSaturation',parseInt(this.value,10))"></div>
  <div class="field"><label>Размытие</label><input type="range" min="0" max="20" value="${b.backgroundBlur??0}" oninput="setBlockProp('backgroundBlur',parseInt(this.value,10))"></div>
  <div class="field"><label>Позиция</label><select onchange="setBlockProp('backgroundPosition',this.value)">${['center center','top center','bottom center','center left','center right'].map(x=>`<option value="${x}" ${(b.backgroundPosition||'center center')===x?'selected':''}>${x}</option>`).join('')}</select><input value="${esc(b.backgroundPosition||'center center')}" onchange="setBlockProp('backgroundPosition',this.value)"></div>
  <div class="field"><label>Размер</label><select onchange="setBlockProp('backgroundSize',this.value)">${['cover','contain','auto','100% auto','auto 100%'].map(x=>`<option value="${x}" ${(b.backgroundSize||'cover')===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Повторение</label><select onchange="setBlockProp('backgroundRepeat',this.value)">${['no-repeat','repeat','repeat-x','repeat-y'].map(x=>`<option value="${x}" ${(b.backgroundRepeat||'no-repeat')===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" ${b.backgroundFixed?'checked':''} onchange="setBlockProp('backgroundFixed',this.checked)" style="width:auto"> Фиксированный фон</label>
</div></details>`;
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
const touch=()=>{S.dirty=true;setState('Есть несохраненные изменения');clearTimeout(S.timer);S.timer=setTimeout(()=>save(false),1000);};
const mkBlock=()=>({id:uid('b'),title:'Новый блок',stickyBlock:false,backgroundColor:'#ffffff',backgroundImage:'',backgroundOpacity:100,backgroundDarken:0,backgroundBrightness:100,backgroundContrast:100,backgroundSaturation:100,backgroundBlur:0,backgroundPosition:'center center',backgroundSize:'cover',backgroundRepeat:'no-repeat',backgroundFixed:false,elements:[]});

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
  renderBlockAddMenu();
}
function renderModels(){
  $('models').innerHTML='';
  S.models.forEach(m=>{
    const d=document.createElement('div');
    d.className='item'+(parseInt(S.activeModelId||0,10)===parseInt(m.id,10)?' model-active':'');
    const basePrice = Number(m.base_price||0).toLocaleString('ru-RU');
    d.innerHTML=`${m.image_url?`<div style="width:64px;height:64px;flex-shrink:0;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0"><img src="${normalizeUrl(m.image_url)}" style="width:100%;height:100%;object-fit:cover"></div>`:''}<div style="min-width:0;display:grid;gap:8px;flex:1"><a href="#" class="model-link" data-act="open">${esc(m.name)}</a><label style="display:grid;gap:4px;font-size:12px;font-weight:700;color:#334155">Базовая стоимость<div style="display:flex;align-items:center;gap:6px"><input type="number" min="0" step="1000" value="${Number(m.base_price||0)}" data-act="base" style="width:100%;padding:7px 9px;border-radius:8px;font-weight:700;background:#f8fafc"><span style="font-weight:800;color:#0f766e">₽</span></div></label><button class="btn" data-act="layouts" style="font-size:11px;padding:5px 8px;color:#0f766e;border-color:#0f766e20;background:#f0fdf4" title="Управлять планировками конфигуратора">⊞ Планировки конфигуратора</button></div><div style="display:flex;gap:4px;align-items:center;flex-shrink:0"><button class="icon-btn" data-act="img" title="Фото модели" aria-label="Фото модели">🖼</button><button class="icon-btn" data-act="edit" title="Редактировать" aria-label="Редактировать">✎</button><button class="icon-btn" data-act="copy" title="Копировать" aria-label="Копировать"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><rect x="2" y="2" width="13" height="13" rx="2"></rect></svg></button><button class="icon-btn" data-act="del" title="Удалить" aria-label="Удалить">🗑</button></div>`;
    d.querySelector('[data-act="open"]').onclick=(ev)=>{ev.preventDefault(); loadPage(m.id);};
    if(parseInt(S.activeModelId||0,10)===parseInt(m.id,10)){ const a=d.querySelector('.model-link'); if(a) a.setAttribute('aria-current','page'); }
    d.querySelector('[data-act="base"]').onchange=(ev)=>updateModelBasePrice(m, ev.target.value);
    d.querySelector('[data-act="img"]').onclick=()=>setModelImage(m);
    d.querySelector('[data-act="edit"]').onclick=()=>editModel(m);
    d.querySelector('[data-act="copy"]').onclick=()=>copyModelById(m.id);
    d.querySelector('[data-act="del"]').onclick=()=>deleteModel(m);
    d.querySelector('[data-act="layouts"]').onclick=(ev)=>{ ev.stopPropagation(); openLayoutsModal(m.id, m.name); };
    $('models').appendChild(d);
  });
  renderBlockAddMenu();
}
function renderBlockAddMenu(){
  const root=$('blockAddMenu');
  if(!root) return;
  if(S.tab!=='m'){root.innerHTML='';return;}
  const b=block();
  if(!S.activeModelId){
    root.innerHTML='<div class="tiny">Выберите модель.</div>';
    return;
  }
  if(!b){
    root.innerHTML='<div class="tiny">Выберите блок на холсте, чтобы добавить текст, фото, форму или опции.</div>';
    return;
  }
  const byType = t => {
    if(t==='text'){
      const standalone = (b.elements||[]).find(x=>x.type==='text');
      if(standalone) return standalone;
      const img = (b.elements||[]).find(x=>x.type==='image');
      if(img && Array.isArray(img.texts) && img.texts.length) return img;
      return null;
    }
    return (b.elements||[]).find(x=>x.type===t) || null;
  };
  const hasText = (b.elements||[]).some(x=>x.type==='text' || (x.type==='image' && Array.isArray(x.texts) && x.texts.length));
  const menuBtn = (t, add, title) => {
    const ex=byType(t);
    return `<button class="menu-choice ${ex?'active':''}" onclick="pickOrAdd('${t}')">${ex ? title : add}</button>`;
  };
  root.innerHTML=`<div class="tiny" style="margin:0 0 8px">Добавить в блок</div>
  <div style="display:grid;grid-template-columns:1fr;gap:8px">
    <button class="menu-choice ${hasText?'active':''}" onclick="pickOrAdd('text')">${hasText?'Добавить еще текст':'Добавить текст'}</button>
    ${menuBtn('image','Добавить фото','Фото')}
    ${menuBtn('form','Добавить форму','Форма')}
    ${menuBtn('options','Добавить опции','Опции')}
  </div>`;
}
function renderOptions(){
  const groups = [];
  const byGroup = new Map();
  (S.options||[]).forEach(o=>{
    const key = String(o.group_id || 0);
    if(!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(o);
  });
  (S.groups||[]).forEach(g=>groups.push({id:g.id,name:g.name,key:String(g.id)}));
  if(byGroup.has('0') && byGroup.get('0').length) groups.push({id:0,name:'Без группы',key:'0'});
  if(!groups.length) groups.push({id:'0',name:'Все опции',key:'0'});
  const active = groups.some(g=>g.key===String(S.activeOptionGroupId)) ? String(S.activeOptionGroupId) : groups[0].key;
  S.activeOptionGroupId = active;
  const activeGroup = groups.find(g=>g.key===active) || groups[0];
  $('options').innerHTML = groups.map(g=>`<button type="button" class="item ${g.key===active?'sel':''}" style="width:100%;text-align:left;background:${g.key===active?'#f0fdf4':'#fff'}" onclick="selectOptionGroup('${g.key}')"><span style="min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(g.name)}</b><span class="tiny">${(byGroup.get(g.key)||[]).length} шт.</span></span></button>`).join('');
  const list = byGroup.get(active) || [];
  const head = `<div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:end;gap:8px;margin-bottom:2px"><div><b>${esc(activeGroup.name)}</b><div class="tiny">${list.length} опций</div></div></div>`;
  $('optPreview').innerHTML = head + (list.length ? list.map(o=>{const price=Number(o.price||0);const img=isWoodColor(o)?WOOD_CARD_IMAGE:o.image_url;const modelChecks=(S.models||[]).map(m=>`<label class="tiny" style="display:flex;gap:5px;align-items:center"><input type="checkbox" data-opt-model="${o.id}" value="${m.id}" ${optionAvailableForModel(o,m.id)?'checked':''}>${esc(m.name)}</label>`).join('');return `<article class="card" style="max-width:260px;border:1px solid var(--l);border-radius:8px;overflow:hidden;background:#fff;cursor:pointer" onclick="openOptionEditor(${parseInt(o.id,10)})"><div style="height:130px;overflow:hidden;background:#f8fafc">${img?`<img src="${normalizeUrl(img)}" style="width:100%;height:100%;object-fit:cover">`:'<div class="tiny" style="padding:12px">Без фото</div>'}</div><div style="padding:8px"><b>${esc(o.name)}</b>${price>0?`<div class="tiny">${price.toLocaleString('ru-RU')} ₽</div>`:''}<details style="margin-top:8px" onclick="event.stopPropagation()"><summary class="tiny" style="cursor:pointer">Доступность в моделях</summary><div style="display:grid;gap:3px;margin-top:6px">${modelChecks}</div></details><div style="display:flex;justify-content:flex-end;gap:4px;margin-top:6px"><button class="icon-btn" data-edit-opt="${o.id}" title="Редактировать" onclick="event.stopPropagation(); openOptionEditor(${parseInt(o.id,10)})">✎</button><button class="icon-btn" data-del-opt="${o.id}" title="Удалить" onclick="event.stopPropagation(); deleteOption(S.options.find(x=>String(x.id)===String(${parseInt(o.id,10)})))">🗑</button></div></div></article>`}).join('') : '<div class="tiny">В этой группе пока нет опций.</div>');
  $('optPreview').querySelectorAll('[data-opt-model]').forEach(ch=>ch.onchange=()=>updateOptionModelAvailability(parseInt(ch.getAttribute('data-opt-model'),10)));
}
function renderMedia(){
  const root=$('mediaWorkspace'); if(!root) return;
  const folders = S.folders.length ? S.folders : [{id:1,name:'Нераспределенные фото'}];
  const folderHtml = folders.map(f=>`<button type="button" class="folder-item ${parseInt(f.id,10)===parseInt(S.activeFolderId,10)?'active':''}" onclick="selectFolder(${parseInt(f.id,10)})">${esc(f.name)}</button>`).join('');
  const files = S.media.filter(m=>parseInt(m.folder_id||1,10)===parseInt(S.activeFolderId,10));
  const fileHtml = files.length
    ? files.map(m=>`<article class="media-card"><img src="${normalizeUrl(m.file_url)}"><div class="media-body"><div class="tiny" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.file_name)}</div><div style="display:flex;gap:6px;margin-top:6px"><button class="icon-btn" title="Удалить файл" onclick="deleteMedia(${parseInt(m.id,10)})">🗑</button></div></div></article>`).join('')
    : '<div class="tiny">В этой папке пока нет файлов.</div>';
  root.innerHTML = `<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px"><button class="btn" onclick="createFolder()">+ Папка</button><input id="mediaUploadInput" type="file" accept="image/*"><button class="btn" onclick="uploadToMedia()">Загрузить в папку</button></div><div class="media-layout"><div>${folderHtml}</div><div class="media-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${fileHtml}</div></div>`;
}
function addStrip(i){const d=document.createElement('div');d.className='strip';d.textContent='Добавить блок';d.onclick=()=>{const b=mkBlock(); S.page.blocks.splice(i,0,b); S.selectedBlockId=b.id; S.selectedElId=null; renderWorkspace(); renderSettings(); touch();};return d;}
function renderWorkspace(){
  const w=$('workspace'); w.innerHTML=''; if(!S.activeModelId){w.innerHTML='<div class="tiny">Выберите модель слева.</div>'; return;}
  w.appendChild(addStrip(0));
  S.page.blocks.forEach((b,i)=>{const box=document.createElement('div');const _sc=b.stickyPosition==='top'?' sticky-top':b.stickyPosition==='bottom'?' sticky-bottom':b.stickyBlock?' sticky-block':'';box.className='block'+_sc+(S.selectedBlockId===b.id?' sel':'');box.dataset.blockId=b.id;box.style.cssText=blockBgStyle(b);box.onclick=()=>{S.selectedBlockId=b.id;S.selectedElId=null;S.selectedPart='element';S.editingImgUrl=null;renderWorkspace();renderSettings();};
    const canUp = i>0;
    const canDown = i<S.page.blocks.length-1;
    const upBtn = canUp ? `<button type="button" class="icon-btn" title="Переместить вверх" aria-label="Вверх" onclick="moveBlock('${b.id}',-1)">↑</button>` : '';
    const downBtn = canDown ? `<button type="button" class="icon-btn" title="Переместить вниз" aria-label="Вниз" onclick="moveBlock('${b.id}',1)">↓</button>` : '';
    const _sp=b.stickyPosition||'none';const _sLabel=_sp==='top'?'↑ Сверху':_sp==='bottom'?'↓ Снизу':'Статично';const _sAct=_sp!=='none'||b.stickyBlock;
    const stickyBtn = `<button type="button" class="btn" style="padding:4px 8px;font-size:12px;${_sAct?'border-color:#16a34a;color:#16a34a;background:#f0fdf4':''}" title="Позиционирование: нажмите для смены режима" onclick="cycleBlockSticky('${b.id}',event)">${_sLabel}</button>`;
    let html=`<div class="block-head"><div><b>${esc(b.title||'Блок')}</b></div><div class="block-actions">${stickyBtn}${upBtn}${downBtn}</div></div>`;
    (b.elements||[]).forEach(e=>{
      if(e.type==='text'){
        html+=`<div class="el ${S.selectedBlockId===b.id&&S.selectedElId===e.id?'sel':''}" data-e="${e.id}">
          <div class="text-canvas">
            <div class="text-box" data-text-box="${e.id}" style="left:${e.x||8}%;top:${e.y||8}%;width:${e.width||55}%;font-size:${e.size||36}px;color:${e.color||'#111'};${fontCss(e.fontKey||'inter')};opacity:${(e.opacity||100)/100};filter:contrast(${e.textContrast||100}%) brightness(${e.textBrightness||100}%) saturate(${e.textSaturation||100}%);text-shadow:0 2px 12px rgba(0,0,0,${(e.shadow||0)/100});transform:rotate(${e.rotate||0}deg)">
              <i class="move" data-action="move" data-e="${e.id}"></i>
              <div contenteditable="true" data-edit-text="${e.id}" spellcheck="false">${esc(e.text||'')}</div>
              <i class="rotate" data-action="rotate" data-e="${e.id}">${ROTATE_ICON}</i>
              <i class="resize" data-action="resize" data-e="${e.id}"></i>
              ${(Math.abs(parseFloat(e.rotate||0))<0.01)?'<span class="angle-zero">0°</span>':''}
            </div>
          </div>
        </div>`;
      }
      if(e.type==='image'){
        const _imgs=Array.isArray(e.images)&&e.images.length?e.images:(e.url||e.imageUrl?[{id:'_0',url:e.url||e.imageUrl,optionId:null}]:[]);
        const imgSrc=normalizeUrl(_imgs[0]?_imgs[0].url||'':e.url||e.imageUrl||'');
        const _ph=e.height?'height:'+e.height+'px':'height:auto';
        html+=`<div class="el ${S.selectedBlockId===b.id&&S.selectedElId===e.id?'sel':''}" data-e="${e.id}"><div class="photo" data-image-drop="${e.id}" style="width:100%;${_ph}">${imgSrc?`<img src="${imgSrc}" style="opacity:${(e.opacity||100)/100};filter:contrast(${e.contrast||100}%) brightness(${e.brightness||100}%)">`:`<div class="tiny" style="padding:12px">Нет фото — добавьте в настройках</div>`}${(e.texts||[]).map((t,ti)=>`<div class="text-box ${S.selectedElId===e.id&&S.selectedPart==='imageText'&&S.selectedImgTextIdx===ti?'sel':''}" data-img-text-box="${e.id}" data-ti="${ti}" style="left:${t.x||8}%;top:${t.y||8}%;width:${t.width||55}%;color:${t.color||'#fff'};font-size:${t.size||34}px;${fontCss(t.fontKey||'inter')};opacity:${(t.opacity||100)/100};filter:contrast(${t.textContrast||100}%) brightness(${t.textBrightness||100}%) saturate(${t.textSaturation||100}%);text-shadow:0 2px 12px rgba(0,0,0,${(t.shadow||35)/100});transform:rotate(${t.rotate||0}deg)"><i class="move" data-action="move" data-e="imgtxt:${e.id}:${ti}"></i><div contenteditable="true" data-edit-img-text="${e.id}" data-ti="${ti}" spellcheck="false">${esc(t.text||'')}</div><i class="rotate" data-action="rotate" data-e="imgtxt:${e.id}:${ti}">${ROTATE_ICON}</i><i class="resize" data-action="resize" data-e="imgtxt:${e.id}:${ti}"></i>${(Math.abs(parseFloat(t.rotate||0))<0.01)?'<span class="angle-zero">0°</span>':''}</div>`).join('')}</div></div>`;
      }
      if(e.type==='form'){html+=`<div class="el ${S.selectedBlockId===b.id&&S.selectedElId===e.id?'sel':''}" data-e="${e.id}"><div class="tiny">Форма: ${esc(e.title||'Заявка')}</div></div>`;}
      if(e.type==='options'){const cardSize=parseInt(e.cardSize||180,10);const arr=S.options.filter(o=>(e.optionIds||[]).includes(parseInt(o.id,10)));const titleStyle=`font-size:${e.titleSize||18}px;font-weight:${e.titleWeight||800};letter-spacing:${e.titleLetter||0}px;line-height:${(e.titleLine||120)/100};color:${e.titleColor||'#111827'};text-align:${e.titleAlign||'left'};padding:${e.titlePadding||0}px`;html+=`<div class="el ${S.selectedBlockId===b.id&&S.selectedElId===e.id?'sel':''}" data-e="${e.id}" style="background:${rgba(e.optionsBgColor||'#ffffff',e.optionsBgOpacity??100)}">${e.optionTitle?`<h3 style="${titleStyle};margin:0 0 10px">${esc(e.optionTitle)}</h3>`:''}<div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,${cardSize}px),${cardSize}px));gap:${e.cardGap||10}px;align-items:start">${arr.map(o=>{const priceValue=Number(o.price||0);const price=priceValue.toLocaleString('ru-RU');const img=isWoodColor(o)?WOOD_CARD_IMAGE:normalizeUrl(o.image_url||'');return `<article class="card" style="width:100%;border-radius:${e.cardRadius||8}px"><div class="card-media" style="border:${e.cardBorder||1}px solid var(--l);border-radius:${e.cardRadius||8}px;box-shadow:0 ${e.cardShadow||0}px ${(e.cardShadow||0)*3}px rgba(15,23,42,.12)">${img?`<img src="${img}">`:''}</div><div class="card-body" style="font-size:${e.textSize||14}px"><b>${esc(o.name)}</b>${priceValue>0?`<div class="price">Цена: ${price} ₽</div>`:''}</div></article>`}).join('')}</div></div>`;}
    });
    box.innerHTML=html;
    box.querySelectorAll('[data-e]').forEach(n=>n.onclick=(ev)=>{
      ev.stopPropagation();
      S.selectedBlockId=b.id;
      S.selectedElId=n.getAttribute('data-e');
      S.editingImgUrl=null;
      const imgText=ev.target.closest('[data-img-text-box]');
      if(imgText){
        S.selectedPart='imageText';
        S.selectedImgTextIdx=parseInt(imgText.getAttribute('data-ti')||'0',10)||0;
      } else {
        S.selectedPart='element';
      }
      if(ev.target.closest('[contenteditable="true"]')){renderSettings();return;}
      renderWorkspace();renderSettings();
    });
    w.appendChild(box); w.appendChild(addStrip(i+1));
  });
}
function renderSettings(){
  const p=$('settings'), b=block(), it=el();
  renderBlockAddMenu();
  if(!b){p.innerHTML='Выберите блок на холсте.';return;}
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
  const hasText = (b.elements||[]).some(x=>x.type==='text' || (x.type==='image' && Array.isArray(x.texts) && x.texts.length));
  const quickMenu = `<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:10px">
    <button class="btn" style="width:100%" onclick="pickOrAdd('text')">${hasText?'Добавить еще текст':'Добавить текст'}</button>
    ${menuBtn('image','Добавить фото','Фото')}
    ${menuBtn('form','Добавить форму','Форма')}
    ${menuBtn('options','Добавить опции','Опции')}
  </div>`;
  const _curSPos=b.stickyPosition||(b.stickyBlock?'top':'none');
  const stickyBlockControl = `<div class="field" style="margin:0 0 10px"><label>Позиционирование блока</label><select onchange="setBlockStickyPos(this.value)"><option value="none" ${_curSPos==='none'?'selected':''}>Статично</option><option value="top" ${_curSPos==='top'?'selected':''}>Фиксировать над контентом</option><option value="bottom" ${_curSPos==='bottom'?'selected':''}>Фиксировать под контентом</option></select></div>`;
  const blockTools = `${blockBackgroundSettingsHtml(b)}<div style="margin:8px 0"><button class="btn" style="width:100%;border-color:#ef9a9a;color:#a11" onclick="removeBlock()">Удалить блок</button></div>`;
  const elementTools = `<div style="margin:0 0 10px"><button class="btn" style="width:100%;border-color:#ef9a9a;color:#a11" onclick="removeSelectedElement()">Удалить элемент</button></div>`;
  setTimeout(bindBlockBgUpload,0);
  if(!it){
    const elementsList = (b.elements||[]).map(x=>`<div class="item" style="margin-bottom:6px"><span>${x.type==='text'?'Текст':x.type==='image'?'Фото':x.type==='form'?'Форма':'Опции'}</span><button class="btn" onclick="selectEl('${x.id}')">Настроить</button></div>`).join('');
    p.innerHTML=`${stickyBlockControl}<div class="field"><label>Название блока</label><input value="${esc(b.title||'')}" onchange="setBlockTitle(this.value)"></div>
    ${blockTools}
    <div style="margin-bottom:8px"><button class="btn" style="width:100%" onclick="clearBlockContent()">Очистить содержимое блока</button></div>
    <div style="margin-top:10px"><b style="font-size:13px">Элементы блока</b><div style="margin-top:6px">${elementsList || '<span class="tiny">Элементов пока нет.</span>'}</div></div>
    <div class="tiny" style="margin-top:8px">Что добавили в блок — сразу появляется здесь.</div>`;
    return;
  }
  if(it.type==='text'){
    p.innerHTML=`${stickyBlockControl}${elementTools}<details open><summary><b>Текст</b></summary>
      <div style="margin-top:8px">
        <div class="field"><label>Размер</label><input type="range" min="12" max="96" value="${it.size||28}" oninput="setEl('size',parseInt(this.value,10))"></div>
        <div class="field"><label>Шрифт</label>${fontSelect(it.fontKey||'inter',"setEl('fontKey',this.value)")}</div>
        <div class="field"><label>Цвет</label>${colorPickerHtml(it.color||'#111111',"setEl('color',{v})")}</div>
        <div class="field"><label>Прозрачность</label><input type="range" min="0" max="100" value="${it.opacity||100}" oninput="setEl('opacity',parseInt(this.value,10))"></div>
        <div class="field"><label>Контраст</label><input type="range" min="50" max="180" value="${it.textContrast||100}" oninput="setEl('textContrast',parseInt(this.value,10))"></div>
        <div class="field"><label>Яркость</label><input type="range" min="50" max="180" value="${it.textBrightness||100}" oninput="setEl('textBrightness',parseInt(this.value,10))"></div>
        <div class="field"><label>Насыщенность</label><input type="range" min="0" max="200" value="${it.textSaturation||100}" oninput="setEl('textSaturation',parseInt(this.value,10))"></div>
        <div class="field"><label>Тень</label><input type="range" min="0" max="100" value="${it.shadow||0}" oninput="setEl('shadow',parseInt(this.value,10))"></div>
        <div class="field"><label>Поворот</label><input type="range" min="-180" max="180" value="${it.rotate||0}" oninput="setEl('rotate',parseInt(this.value,10))"></div>
      </div>
    </details>
    <div class="tiny" style="margin-top:8px">Можно менять мышью прямо в блоке: двигать, крутить, растягивать.</div>`;
    return;
  }
  if(it.type==='image'){
    const texts = Array.isArray(it.texts) ? it.texts : [];
    const idx = Math.min(S.selectedImgTextIdx||0, Math.max(0, texts.length-1));
    const t=texts[idx]||{text:'',x:8,y:8,width:55,size:34,color:'#ffffff',rotate:0};
    const textTabs = texts.map((_,i)=>`<button class="btn" type="button" onclick="selectImgText(${i})" style="padding:4px 8px;${i===idx?'border-color:#16a34a;color:#16a34a':''}">Текст ${i+1}</button>`).join(' ');
    if(S.selectedPart==='imageText' && texts.length){
      p.innerHTML=`${stickyBlockControl}<div style="margin:0 0 10px"><button class="btn" style="width:100%;border-color:#ef9a9a;color:#a11" onclick="removeImgText()">Удалить текст</button></div>
      <details open><summary><b>Текст</b></summary>
        <div style="margin-top:8px">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${textTabs}</div>
          <div class="field"><label>Ширина текста (%)</label><input type="range" min="8" max="95" step="0.5" value="${t.width||55}" oninput="setImgText('width',parseFloat(this.value))"></div>
          <div class="field"><label>Размер текста</label><input type="range" min="12" max="96" step="0.5" value="${t.size||34}" oninput="setImgText('size',parseFloat(this.value))"></div>
          <div class="field"><label>Шрифт</label>${fontSelect(t.fontKey||'inter',"setImgText('fontKey',this.value)")}</div>
          <div class="field"><label>Цвет текста</label>${colorPickerHtml(t.color||'#ffffff',"setImgText('color',{v})")}</div>
          <div class="field"><label>Прозрачность текста</label><input type="range" min="0" max="100" value="${t.opacity||100}" oninput="setImgText('opacity',parseInt(this.value,10))"></div>
          <div class="field"><label>Контраст текста</label><input type="range" min="50" max="180" value="${t.textContrast||100}" oninput="setImgText('textContrast',parseInt(this.value,10))"></div>
          <div class="field"><label>Яркость текста</label><input type="range" min="50" max="180" value="${t.textBrightness||100}" oninput="setImgText('textBrightness',parseInt(this.value,10))"></div>
          <div class="field"><label>Насыщенность текста</label><input type="range" min="0" max="200" value="${t.textSaturation||100}" oninput="setImgText('textSaturation',parseInt(this.value,10))"></div>
          <div class="field"><label>Контрастность (тень)</label><input type="range" min="0" max="100" value="${t.shadow||35}" oninput="setImgText('shadow',parseInt(this.value,10))"></div>
        </div>
      </details>`;
      return;
    }
    _normalizeElImages(it);
    const _condSection=_imgGalleryStripHtml(it);
    const _sizeControls=`<details><summary><b>Размер и вид</b></summary>
      <div style="margin-top:8px">
        <div class="field"><label>Высота фото (px) <span class="tiny">${it.height||'авто'}</span></label><input type="range" min="0" max="900" step="10" value="${it.height||0}" oninput="setEl('height',parseInt(this.value,10)||0);this.previousSibling.querySelector('span').textContent=this.value==0?'авто':this.value+'px'"></div>
        <div class="field"><label>Прозрачность</label><input type="range" min="0" max="100" value="${it.opacity||100}" oninput="setEl('opacity',parseInt(this.value,10))"></div>
        <div class="field"><label>Контраст</label><input type="range" min="50" max="180" value="${it.contrast||100}" oninput="setEl('contrast',parseInt(this.value,10))"></div>
      </div>
    </details>`;
    p.innerHTML=`${stickyBlockControl}${elementTools}<div style="margin-bottom:10px">${_condSection}</div>${_sizeControls}
    <details ${S.imageTextOpen?'open':''}><summary><b>Текст на фото</b></summary>
      <div style="margin-top:8px">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${textTabs||'<span class="tiny">Текстов пока нет.</span>'}</div>
        <div style="display:flex;gap:6px;margin-bottom:8px">
          <button class="btn" type="button" onclick="addImgText()">Добавить текст</button>
          ${texts.length?'<button class="btn" type="button" onclick="removeImgText()">Удалить</button>':''}
        </div>
        <div class="field"><label>Ширина (%)</label><input type="range" min="8" max="95" step="0.5" value="${t.width||55}" oninput="setImgText('width',parseFloat(this.value))"></div>
        <div class="field"><label>Размер</label><input type="range" min="12" max="96" step="0.5" value="${t.size||34}" oninput="setImgText('size',parseFloat(this.value))"></div>
        <div class="field"><label>Шрифт</label>${fontSelect(t.fontKey||'inter',"setImgText('fontKey',this.value)")}</div>
        <div class="field"><label>Цвет</label>${colorPickerHtml(t.color||'#ffffff',"setImgText('color',{v})")}</div>
        <div class="field"><label>Прозрачность</label><input type="range" min="0" max="100" value="${t.opacity||100}" oninput="setImgText('opacity',parseInt(this.value,10))"></div>
        <div class="field"><label>Контраст</label><input type="range" min="50" max="180" value="${t.textContrast||100}" oninput="setImgText('textContrast',parseInt(this.value,10))"></div>
        <div class="field"><label>Яркость</label><input type="range" min="50" max="180" value="${t.textBrightness||100}" oninput="setImgText('textBrightness',parseInt(this.value,10))"></div>
        <div class="field"><label>Насыщенность</label><input type="range" min="0" max="200" value="${t.textSaturation||100}" oninput="setImgText('textSaturation',parseInt(this.value,10))"></div>
        <div class="field"><label>Тень</label><input type="range" min="0" max="100" value="${t.shadow||35}" oninput="setImgText('shadow',parseInt(this.value,10))"></div>
      </div>
    </details>`;
    return;
  }
  if(it.type==='form'){
    p.innerHTML=`${stickyBlockControl}${elementTools}<div class="field"><label>Заголовок формы</label><input value="${esc(it.title||'Заявка')}" oninput="setEl('title',this.value)"></div>`;
    return;
  }
  if(it.type==='options'){
    const groups=optionGroupsForPick();
    const currentGroup=it.optionGroupId || (groups[0]&&groups[0].id) || '';
    const groupOptions=currentGroup ? optionsByGroupForActiveModel(currentGroup) : [];
    const checks=groupOptions.map(o=>`<label style="display:flex;gap:6px"><input type="checkbox" ${(it.optionIds||[]).includes(parseInt(o.id,10))?'checked':''} onchange="toggleOpt(${parseInt(o.id,10)},this.checked)">${esc(o.name)}</label>`).join('');
    p.innerHTML=`${stickyBlockControl}${elementTools}<div class="field"><label>Группа опций</label><select onchange="setOptionsGroup(this.value)">${groups.map(g=>`<option value="${g.id}" ${String(currentGroup)===String(g.id)?'selected':''}>${esc(g.name)}</option>`).join('')}</select></div>
    <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" ${it.multiSelect?'checked':''} onchange="setEl('multiSelect',this.checked)" style="width:auto"> Можно выбрать несколько</label>
    <div class="field"><label>Размер карточки</label><input type="range" min="120" max="420" value="${it.cardSize||180}" oninput="setEl('cardSize',parseInt(this.value,10))"></div>
    <div class="field"><label>Расстояние между карточками</label><input type="range" min="4" max="40" value="${it.cardGap||10}" oninput="setEl('cardGap',parseInt(this.value,10))"></div>
    <div class="field"><label>Радиус скругления карточки</label><input type="range" min="0" max="32" value="${it.cardRadius||8}" oninput="setEl('cardRadius',parseInt(this.value,10))"></div>
    <div class="field"><label>Рамка</label><input type="range" min="0" max="4" value="${it.cardBorder||1}" oninput="setEl('cardBorder',parseInt(this.value,10))"></div>
    <div class="field"><label>Тень</label><input type="range" min="0" max="18" value="${it.cardShadow||0}" oninput="setEl('cardShadow',parseInt(this.value,10))"></div>
    <div class="field"><label>Фон блока опций</label>${colorPickerHtml(it.optionsBgColor||'#ffffff',"setEl('optionsBgColor',{v})")}</div>
    <div class="field"><label>Прозрачность фона</label><input type="range" min="0" max="100" value="${it.optionsBgOpacity??100}" oninput="setEl('optionsBgOpacity',parseInt(this.value,10))"></div>
    <hr>
    <div class="field"><label>Заголовок</label><input value="${esc(it.optionTitle||'')}" placeholder="Например: Выберите опцию" oninput="setEl('optionTitle',this.value)"></div>
    <div class="field"><label>Размер заголовка</label><input type="range" min="12" max="44" value="${it.titleSize||18}" oninput="setEl('titleSize',parseInt(this.value,10))"></div>
    <div class="field"><label>Жирность заголовка</label><input type="range" min="300" max="900" step="100" value="${it.titleWeight||800}" oninput="setEl('titleWeight',parseInt(this.value,10))"></div>
    <div class="field"><label>Межбуквенный интервал</label><input type="range" min="0" max="6" step="0.1" value="${it.titleLetter||0}" oninput="setEl('titleLetter',parseFloat(this.value))"></div>
    <div class="field"><label>Межстрочный интервал</label><input type="range" min="90" max="180" value="${it.titleLine||120}" oninput="setEl('titleLine',parseInt(this.value,10))"></div>
    <div class="field"><label>Цвет заголовка</label>${colorPickerHtml(it.titleColor||'#111827',"setEl('titleColor',{v})")}</div>
    <div class="field"><label>Выравнивание заголовка</label><select onchange="setEl('titleAlign',this.value)"><option value="left" ${(it.titleAlign||'left')==='left'?'selected':''}>Слева</option><option value="center" ${it.titleAlign==='center'?'selected':''}>По центру</option><option value="right" ${it.titleAlign==='right'?'selected':''}>Справа</option></select></div>
    <div class="field"><label>Отступы заголовка</label><input type="range" min="0" max="40" value="${it.titlePadding||0}" oninput="setEl('titlePadding',parseInt(this.value,10))"></div>
    <div class="field"><label>Размер текста карточки</label><input type="range" min="12" max="24" value="${it.textSize||14}" oninput="setEl('textSize',parseInt(this.value,10))"></div>
    <div class="field"><label>Выбор опций</label><div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;max-height:220px;overflow:auto">${checks||'<span class="tiny">В выбранной группе пока нет опций.</span>'}</div></div>`;
  }
}
function bindBlockBgUpload(){
  const fi=$('blockBgFile'), btn=$('blockBgUploadBtn');
  if(!fi||!btn) return;
  btn.onclick=()=>{ if(fi.files&&fi.files[0]) uploadBlockBackground(fi.files[0]); else alert('Сначала выберите файл'); };
  fi.onchange=()=>{ if(fi.files&&fi.files[0]) uploadBlockBackground(fi.files[0]); };
}
function bindUpload(){
  const fi=$('fileInput'),dz=$('dropZone'),ub=$('uploadBtn'); if(!fi||!dz) return;
  fi.onchange=()=>{if(fi.files&&fi.files[0]) upload(fi.files[0]);};
  if(ub) ub.onclick=()=>{ if(fi.files&&fi.files[0]) upload(fi.files[0]); else alert('Сначала выберите файл'); };
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
    imageEl = {id:uid('e'),type:'image',url:'',width:100,height:420,opacity:100,contrast:100,brightness:100,texts:[]};
    b.elements.push(imageEl);
  }
  S.selectedBlockId = b.id;
  S.selectedElId = imageEl.id;
  return imageEl;
}

async function upload(file, elementId){
  if(S.uploading) return;
  S.uploading = true;
  setState('Подготовка фото...');
  try{
    let blob = file;
    try{ blob = await toJpegBlob(file); }catch(_prepErr){ blob = file; }
    const outName = blob === file ? (file.name || 'upload.jpg') : 'upload.jpg';
    const fd=new FormData(); fd.append('file',blob,outName);
    setState('Загрузка фото...');
    const r=await fetch('./api/index.php?action=upload_image',{method:'POST',body:fd}).then(x=>x.json()).catch(()=>({ok:false,error:'Сеть недоступна'}));
    if(!r.ok){ alert(r.error||'Ошибка загрузки фото'); return; }
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
      const i=el();
      if(i&&i.type==='image'){
        _normalizeElImages(i);
        const empty=i.images.find(x=>!x.url);
        if(empty){ empty.url=r.url; }
        else{ i.images.push({id:uid('img'),url:r.url,optionId:null}); }
        i.url=i.images[0]?i.images[0].url||'':'';
      } else {
        setEl('url',r.url);
      }
      renderWorkspace(); renderSettings(); touch();
      save(false);
    }
    setState('Фото загружено');
    refreshMedia();
  } catch(_e) {
    setState('Ошибка загрузки');
  } finally {
    S.uploading = false;
  }
}
async function uploadToSlot(file, imgId){
  const i=el(); if(!i||i.type!=='image'||S.uploading) return;
  S.uploading=true; setState('Подготовка фото...');
  try{
    let blob=file; try{ blob=await toJpegBlob(file); }catch(_){ blob=file; }
    const outName=blob===file?(file.name||'upload.jpg'):'upload.jpg';
    const fd=new FormData(); fd.append('file',blob,outName);
    setState('Загрузка фото...');
    const r=await fetch('./api/index.php?action=upload_image',{method:'POST',body:fd}).then(x=>x.json()).catch(()=>({ok:false}));
    if(!r.ok){ alert(r.error||'Ошибка загрузки'); return; }
    _normalizeElImages(i);
    if(imgId){
      const img=i.images.find(x=>x.id===imgId);
      if(img){ img.url=r.url; }
      else{ i.images.push({id:uid('img'),url:r.url,optionId:null}); }
    } else {
      const empty=i.images.find(x=>!x.url);
      if(empty){ empty.url=r.url; } else { i.images.push({id:uid('img'),url:r.url,optionId:null}); }
    }
    i.url=i.images[0]?i.images[0].url||'':'';
    renderWorkspace(); renderSettings(); touch(); save(false);
    setState('Фото загружено'); refreshMedia();
  }catch(_){ setState('Ошибка загрузки'); } finally{ S.uploading=false; }
}
async function uploadBlockBackground(file){
  const b=block(); if(!b||S.uploading) return;
  S.uploading=true;
  setState('Подготовка фона...');
  try{
    let blob=file;
    try{ blob=await toJpegBlob(file); }catch(_prepErr){ blob=file; }
    const outName=blob===file ? (file.name||'background.jpg') : 'background.jpg';
    const fd=new FormData(); fd.append('file',blob,outName);
    setState('Загрузка фона...');
    const r=await fetch('./api/index.php?action=upload_image',{method:'POST',body:fd}).then(x=>x.json()).catch(()=>({ok:false,error:'Сеть недоступна'}));
    if(!r.ok){ alert(r.error||'Ошибка загрузки фона'); return; }
    b.backgroundImage=r.url;
    renderWorkspace(); renderSettings(); touch(); save(false);
    setState('Фон загружен');
    refreshMedia();
  }catch(_e){
    setState('Ошибка загрузки фона');
  }finally{
    S.uploading=false;
  }
}

window.setBlockTitle=v=>{const b=block(); if(!b)return; b.title=v; renderWorkspace(); touch();};
window.removeBlockBackgroundImage=()=>{const b=block(); if(!b)return; b.backgroundImage=''; renderWorkspace(); renderSettings(); touch();};
window.addEl=t=>{const b=block(); if(!b)return; let x={id:uid('e'),type:t};
  if(t==='text') x={...x,text:'Новый текст',size:36,color:'#111111',fontKey:'inter',x:8,y:8,width:55,rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:0};
  if(t==='image') x={...x,url:'',images:[],width:100,height:0,opacity:100,contrast:100,brightness:100,texts:[]};
  if(t==='form') x={...x,title:'Оставьте заявку'};
  if(t==='options'){
    const group=chooseOptionGroup();
    if(!group) return;
    const ids=optionsByGroupForActiveModel(group.id).map(o=>parseInt(o.id,10));
    x={...x,cardGap:10,cardRadius:8,cardBorder:1,cardShadow:0,cardSize:180,textSize:14,multiSelect:false,optionsBgColor:'#ffffff',optionsBgOpacity:100,optionTitle:group.name||'Выберите опцию',titleSize:18,titleWeight:800,titleLetter:0,titleLine:120,titleColor:'#111827',titleAlign:'left',titlePadding:0,optionGroupId:group.id,optionIds:ids};
  }
  b.elements=b.elements||[]; b.elements.push(x); S.selectedElId=x.id; S.selectedPart='element'; renderWorkspace(); renderSettings(); touch();
};
window.setEl=(k,v)=>{const i=el(); if(!i)return; i[k]=v; renderWorkspace(); touch();};
window.setImgText=(k,v)=>{const i=el(); if(!i||i.type!=='image')return; i.texts=Array.isArray(i.texts)?i.texts:[]; if(!i.texts.length) i.texts.push({text:'Новый текст',x:8,y:8,width:55,size:38,fontKey:'inter',color:'#ffffff',rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:35}); const idx=Math.min(S.selectedImgTextIdx||0, i.texts.length-1); i.texts[idx][k]=v; renderWorkspace(); touch();};
window.selectImgText=(idx)=>{S.selectedImgTextIdx=idx; S.selectedPart='imageText'; renderWorkspace(); renderSettings();};
window.addImgText=()=>{const i=el(); if(!i||i.type!=='image')return; i.texts=Array.isArray(i.texts)?i.texts:[]; i.texts.push({text:'Новый текст',x:8,y:8,width:55,size:38,fontKey:'inter',color:'#ffffff',rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:35}); S.selectedImgTextIdx=i.texts.length-1; renderWorkspace(); renderSettings(); touch();};
window.removeImgText=()=>{const i=el(); if(!i||i.type!=='image')return; i.texts=Array.isArray(i.texts)?i.texts:[]; if(!i.texts.length) return; i.texts.splice(Math.min(S.selectedImgTextIdx||0,i.texts.length-1),1); S.selectedImgTextIdx=Math.max(0,Math.min(S.selectedImgTextIdx||0,i.texts.length-1)); if(!i.texts.length) S.selectedPart='element'; renderWorkspace(); renderSettings(); touch();};
window.applyMediaUrl=(url)=>{
  const i=el(); if(!i||i.type!=='image'||!url) return;
  _normalizeElImages(i);
  const empty=i.images.find(x=>!x.url);
  if(empty){ empty.url=url; }
  else{ i.images.push({id:uid('img'),url,optionId:null}); }
  i.url=i.images[0]?i.images[0].url||'':'';
  renderWorkspace(); renderSettings(); touch(); save(false);
};
window.toggleOpt=(id,on)=>{const i=el(); if(!i||i.type!=='options')return; const s=new Set(i.optionIds||[]); on?s.add(id):s.delete(id); i.optionIds=[...s]; renderWorkspace(); touch();};
window.setOptionsGroup=(groupId)=>{const i=el(); if(!i||i.type!=='options')return; const g=(S.groups||[]).find(x=>String(x.id)===String(groupId)); i.optionGroupId=groupId; i.optionIds=optionsByGroupForActiveModel(groupId).map(o=>parseInt(o.id,10)); if(g&&(!i.optionTitle||i.optionTitle==='Выберите опцию')) i.optionTitle=g.name; renderWorkspace(); renderSettings(); touch();};
window.selectEl=(id)=>{S.selectedElId=id; S.selectedPart='element'; renderWorkspace(); renderSettings();};
window.removeSelectedElement=()=>{
  const b=block(), i=el(); if(!b||!i) return;
  if(!confirm('Удалить выбранный элемент?')) return;
  b.elements=(b.elements||[]).filter(x=>x.id!==i.id);
  S.selectedElId=null;
  renderWorkspace(); renderSettings(); touch();
};
window.pickOrAdd=(type)=>{
  const b=block(); if(!b) return;
  if(type==='text'){
    const img=(b.elements||[]).find(x=>x.type==='image');
    if(img){
      img.texts = Array.isArray(img.texts) ? img.texts : [];
      img.texts.push({text:'Новый текст',x:8,y:8,width:55,size:38,fontKey:'inter',color:'#ffffff',rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:35});
      S.selectedImgTextIdx=img.texts.length-1;
      S.selectedElId=img.id;
      S.selectedPart='imageText';
      S.imageTextOpen = true;
      renderWorkspace();
      renderSettings();
      touch();
      return;
    }
    addEl('text');
    return;
  }
  const ex=(b.elements||[]).find(x=>x.type===type);
  if(ex){ S.selectedElId=ex.id; renderWorkspace(); renderSettings(); return; }
  addEl(type);
};
window.removeBlock=()=>{
  const b=block(); if(!b) return;
  if(!confirm('Удалить текущий блок?')) return;
  S.page.blocks = (S.page.blocks||[]).filter(x=>x.id!==b.id);
  S.selectedBlockId = null;
  S.selectedElId = null;
  renderWorkspace();
  renderSettings();
  touch();
};
window.clearBlockContent=()=>{
  const b=block(); if(!b) return;
  if(!confirm('Очистить содержимое блока?')) return;
  b.elements=[];
  S.selectedElId=null;
  S.selectedImgTextIdx=0;
  renderWorkspace(); renderSettings(); touch();
};
window.toggleModal=on=>$('addBlockModal').classList.toggle('on',!!on);
window.selectOptionGroup=key=>{S.activeOptionGroupId=String(key); renderOptions();};
window.moveBlock=(id,dir)=>{
  const list=S.page.blocks||[];
  const idx=list.findIndex(x=>x.id===id);
  const next=idx+dir;
  if(idx<0||next<0||next>=list.length) return;
  [list[idx],list[next]]=[list[next],list[idx]];
  S.page.blocks=list;
  renderWorkspace();
  touch();
};
window.toggleBlockSticky=(id,ev)=>{
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }
  const target=(S.page.blocks||[]).find(x=>x.id===id);
  if(!target) return;
  target.stickyBlock=!target.stickyBlock;
  S.selectedBlockId=id;
  S.selectedElId=null;
  renderWorkspace();
  renderSettings();
  touch();
};
window.cycleBlockSticky=(id,ev)=>{
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }
  const target=(S.page.blocks||[]).find(x=>x.id===id);
  if(!target) return;
  const cur=target.stickyPosition||(target.stickyBlock?'top':'none');
  const next=cur==='none'?'top':cur==='top'?'bottom':'none';
  target.stickyPosition=next;
  target.stickyBlock=(next==='top');
  S.selectedBlockId=id; S.selectedElId=null;
  renderWorkspace(); renderSettings(); touch();
};
window.setBlockStickyPos=(pos)=>{
  const b=block(); if(!b) return;
  b.stickyPosition=pos;
  b.stickyBlock=(pos==='top');
  renderWorkspace(); renderSettings(); touch();
};
function _normalizeElImages(e){
  if(!Array.isArray(e.images)||!e.images.length){
    if(e.url||e.imageUrl) e.images=[{id:uid('img'),url:e.url||e.imageUrl,optionId:null}];
    else e.images=[];
  }
  e.url=e.images[0]?e.images[0].url||'':'';
}
window.addImageSlot=()=>{
  const i=el(); if(!i||i.type!=='image') return;
  _normalizeElImages(i);
  i.images.push({id:uid('img'),url:'',optionId:null});
  renderWorkspace(); renderSettings(); touch();
};
window.removeImageSlot=(imgId)=>{
  const i=el(); if(!i||i.type!=='image') return;
  _normalizeElImages(i);
  i.images=i.images.filter(x=>x.id!==imgId);
  i.url=(i.images[0]?i.images[0].url:'')||'';
  renderWorkspace(); renderSettings(); touch();
};
window.setImgSlotOption=(imgId,optId)=>{
  const i=el(); if(!i||i.type!=='image') return;
  _normalizeElImages(i);
  const img=i.images.find(x=>x.id===imgId);
  if(img){ img.optionId=optId||null; renderWorkspace(); touch(); }
};
function _imgCondEditorHtml(it,url){
  const img=it.images.find(x=>x.url===url); if(!img) return '';
  const defaultImg=it.images.find(i=>!i.optionId&&!i.scrollTrigger);
  const isDefault=img===defaultImg;
  const isConflict=!isDefault&&!img.optionId&&!img.scrollTrigger;
  const optId=img.optionId||'';
  const scrollT=!!img.scrollTrigger;
  const logic=img.condLogic||'AND';
  const showLogic=!!optId&&scrollT;
  const opts=S.options.map(o=>`<option value="${o.id}" ${String(optId)===String(o.id)?'selected':''}>${esc(o.name)}</option>`).join('');
  return `<div style="border:2px solid #0f766e;border-radius:8px;padding:10px;margin-top:8px;background:#f0fdfa">
    <div style="font-weight:700;font-size:11px;color:#0f766e;margin-bottom:8px">${isDefault?'● Фото по умолчанию':'Условия показа'}</div>
    ${isDefault?`<div class="tiny" style="color:#166534;margin-bottom:8px">Показывается когда ни одно условие не сработало.</div>`:''}
    ${isConflict?`<div class="tiny" style="color:#b45309;margin-bottom:8px;border:1px solid #fbbf24;border-radius:6px;padding:4px 6px">⚠ Уже есть фото по умолчанию. Задайте хотя бы одно условие для этого фото.</div>`:''}
    <div class="field" style="margin-bottom:8px">
      <label>Показывать при выборе опции:</label>
      <select onchange="updateEditingImgCond('optionId',this.value||null)">
        <option value="">— Без условия —</option>
        ${opts}
      </select>
    </div>
    <label style="display:flex;gap:8px;align-items:center;margin-bottom:8px;cursor:pointer;font-size:12px">
      <input type="checkbox" ${scrollT?'checked':''} style="width:auto" onchange="updateEditingImgCond('scrollTrigger',this.checked)">
      Срабатывать при прокрутке блока к верху экрана
    </label>
    ${showLogic?`<div style="margin:8px 0;font-size:12px"><span style="font-weight:600;margin-right:8px">Логика:</span><label style="cursor:pointer;margin-right:10px"><input type="radio" name="imgCndL" value="AND" ${logic==='AND'?'checked':''} onchange="updateEditingImgCond('condLogic','AND')" style="width:auto"> И (оба)</label><label style="cursor:pointer"><input type="radio" name="imgCndL" value="OR" ${logic==='OR'?'checked':''} onchange="updateEditingImgCond('condLogic','OR')" style="width:auto"> ИЛИ (любое)</label></div>`:''}
    <div style="display:flex;gap:6px;margin-top:8px">
      <button class="btn" style="border-color:#ef4444;color:#a11;font-size:11px;padding:5px 8px" onclick="removeImgByUrl()">Убрать</button>
      <button class="btn" style="font-size:11px;padding:5px 8px" onclick="S.editingImgUrl=null;renderSettings()">Закрыть</button>
    </div>
  </div>`;
}
function _imgGalleryStripHtml(it){
  if(!S.media.length) return '<div class="tiny" style="color:#94a3b8;padding:8px 0">Медиатека пуста. Загрузите фото через вкладку «Медиа».</div>';
  const imgs=it.images||[];
  const defaultImg=imgs.find(i=>!i.optionId&&!i.scrollTrigger);
  const strip=S.media.map(m=>{
    const murl=m.file_url;
    const existing=imgs.find(x=>x.url===murl);
    const isEditing=S.editingImgUrl===murl;
    const isDefault=existing&&existing===defaultImg;
    const border=isEditing?'#0f766e':isDefault?'#16a34a':existing?'#f59e0b':'#d8dde6';
    let badge='';
    if(existing){
      if(isDefault) badge=`<div style="position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:8px;background:rgba(22,163,74,.9);color:#fff;padding:1px 0;line-height:1.6">дефолт</div>`;
      else{const p=[];if(existing.optionId)p.push('опц');if(existing.scrollTrigger)p.push('↓');badge=`<div style="position:absolute;bottom:0;left:0;right:0;text-align:center;font-size:8px;background:rgba(245,158,11,.9);color:#fff;padding:1px 0;line-height:1.6">${p.length?p.join('+'):'?'}</div>`;}
    }
    return `<div onclick="openImgCondEditor('${murl.replace(/'/g,"\\'")}',event)" style="flex-shrink:0;cursor:pointer;border:2px solid ${border};border-radius:6px;overflow:hidden;position:relative;transition:.15s;transform:${isEditing?'scale(1.08)':'scale(1)'}" title="${esc(m.file_name)}"><img src="${normalizeUrl(murl)}" style="width:64px;height:48px;object-fit:cover;display:block">${badge}</div>`;
  }).join('');
  return `<div style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;margin-bottom:6px">Галерея</div><div class="tiny" style="margin-bottom:6px;color:#94a3b8">Нажмите фото чтобы добавить и настроить условия показа</div><div style="overflow-x:auto;padding-bottom:4px"><div style="display:flex;gap:6px;min-width:max-content;padding:2px">${strip}</div></div>${S.editingImgUrl?_imgCondEditorHtml(it,S.editingImgUrl):`<div class="tiny" style="margin-top:6px;color:#94a3b8">Зелёная рамка = фото по умолчанию &nbsp;·&nbsp; Оранжевая = с условием</div>`}`;
}
window.openImgCondEditor=(url,ev)=>{
  if(ev){ev.preventDefault();ev.stopPropagation();}
  const i=el(); if(!i||i.type!=='image') return;
  _normalizeElImages(i);
  if(S.editingImgUrl===url){S.editingImgUrl=null;renderSettings();return;}
  if(!i.images.find(x=>x.url===url)){
    i.images.push({id:uid('img'),url,optionId:null,scrollTrigger:false,condLogic:'OR'});
    i.url=i.images[0]?i.images[0].url||'':'';
    touch();
  }
  S.editingImgUrl=url;
  renderSettings();
};
window.updateEditingImgCond=(key,value)=>{
  const url=S.editingImgUrl; const i=el();
  if(!i||i.type!=='image'||!url) return;
  _normalizeElImages(i);
  const img=i.images.find(x=>x.url===url);
  if(!img) return;
  img[key]=value;
  touch(); renderSettings();
};
window.removeImgByUrl=()=>{
  const url=S.editingImgUrl; const i=el();
  if(!i||i.type!=='image'||!url) return;
  _normalizeElImages(i);
  const idx=i.images.findIndex(x=>x.url===url);
  if(idx<0) return;
  if(idx===0&&i.images.length===1){alert('Нельзя удалить единственное фото');return;}
  i.images.splice(idx,1);
  i.url=i.images[0]?i.images[0].url||'':'';
  S.editingImgUrl=null;
  renderWorkspace(); renderSettings(); touch();
};
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
  S.saving=true; setState('Сохранение...');
  const fd=new URLSearchParams(); fd.append('model_id',S.activeModelId); fd.append('page_json',h);
  const r=await api('./api/index.php?action=save_page',{method:'POST',body:fd}).catch(()=>({ok:false}));
  S.saving=false; if(!r.ok){setState('Ошибка сохранения'); if(manual) alert('Ошибка сохранения'); return false;}
  S.lastHash=h; S.dirty=false; setState(manual?'Сохранено':'Сохранено автоматически'); return true;
}
async function loadPage(id){
  if(S.dirty) await save(false);
  S.activeModelId=parseInt(id,10); S.selectedBlockId=null; S.selectedElId=null;
  renderModels();
  const r=await api('./api/index.php?action=get_page&model_id='+S.activeModelId); S.page={blocks:[]};
  if(r.ok&&r.page_json){try{S.page=JSON.parse(r.page_json)}catch(_e){}}
  if(!Array.isArray(S.page.blocks)) S.page.blocks=[];
  S.page.blocks.forEach(b=>{if(!Array.isArray(b.elements)) b.elements=[];});
  S.lastHash=hash(); S.dirty=false; setState('Нет изменений'); persistViewState(); renderWorkspace(); renderSettings();
}
async function boot(){
  const d=await api('./api/index.php?action=bootstrap');
  if(!d.ok){ document.body.classList.remove('preload'); return alert('Ошибка загрузки'); }
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
  if(!confirm('Удалить файл из медиатеки?')) return;
  const fd=new URLSearchParams(); fd.append('id', id);
  const r=await api('./api/index.php?action=delete_media',{method:'POST',body:fd});
  if(!r.ok){ alert('Ошибка удаления файла'); return; }
  S.media = S.media.filter(m => parseInt(m.id,10)!==parseInt(id,10));
  renderMedia();
};
window.selectFolder=(id)=>{ S.activeFolderId=parseInt(id,10)||0; renderMedia(); };
window.createFolder=async()=>{
  const name = prompt('Название папки');
  if(!name || !name.trim()) return;
  const fd=new URLSearchParams(); fd.append('name', name.trim());
  const r=await api('./api/index.php?action=create_media_folder',{method:'POST',body:fd});
  if(r.ok) refreshMedia(); else alert('Не удалось создать папку');
};
window.moveMedia=async(id)=>{
  const list=(S.folders||[]).map(f=>`${f.id}: ${f.name}`).join('\n');
  const raw=prompt(`Введите ID папки:\n0: Корень\n${list}`, String(S.activeFolderId||0));
  if(raw===null) return;
  const folderId=parseInt(raw,10);
  if(!folderId) return;
  const fd=new URLSearchParams(); fd.append('id', id); fd.append('folder_id', folderId);
  const r=await api('./api/index.php?action=move_media',{method:'POST',body:fd});
  if(r.ok) refreshMedia(); else alert('Не удалось переместить файл');
};
window.uploadToMedia=async()=>{
  if(parseInt(S.activeFolderId||0,10)===0) return alert('Сначала откройте папку или создайте новую папку.');
  const input=$('mediaUploadInput');
  const file=input && input.files && input.files[0];
  if(!file) return alert('Выберите файл');
  if(S.uploading) return;
  S.uploading=true;
  try{
    const blob = await toJpegBlob(file);
    const fd=new FormData();
    fd.append('file', blob, 'upload.jpg');
    fd.append('folder_id', String(S.activeFolderId||0));
    const r=await fetch('./api/index.php?action=upload_image',{method:'POST',body:fd}).then(x=>x.json()).catch(()=>({ok:false,error:'Сеть недоступна'}));
    if(!r.ok){ alert(r.error||'Ошибка загрузки'); return; }
    await refreshMedia();
    setState('Файл загружен в Медиа');
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
  const currentName=atRoot?'Корень':(folders.find(f=>parseInt(f.id,10)===activeId)?.name||'Папка');
  const tree = folders.map(f=>`<div class="tree-item ${parseInt(f.id,10)===activeId?'active':''}" data-folder-id="${parseInt(f.id,10)}" onclick="openFolder(${parseInt(f.id,10)})">${esc(f.name)}</div>`).join('');
  const folderTiles = atRoot ? folders.map(f=>`<article class="tile" data-folder-id="${parseInt(f.id,10)}"><div class="label" onclick="openFolder(${parseInt(f.id,10)})">📁 ${esc(f.name)}</div></article>`).join('') : '';
  const fileTiles = files.length ? files.map(m=>`<article class="tile preview" data-file-id="${parseInt(m.id,10)}"><img src="${normalizeUrl(m.file_url)}"><div class="label">${esc(m.file_name)}</div></article>`).join('') : '<div class="tiny">В этой папке пока нет файлов.</div>';
  const backBtn = atRoot ? '' : '<button class="btn" onclick="goRoot()">← Назад</button>';
  root.innerHTML = `<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">${backBtn}<button class="btn" onclick="createFolder()">+ Папка</button><input id="mediaUploadInput" type="file" accept="image/*"><button class="btn" onclick="uploadToMedia()">Загрузить</button></div><div style="margin-bottom:8px;font-weight:700">Текущая папка: ${esc(currentName)}</div><div class="explorer"><aside class="tree"><div class="tree-item ${atRoot?'active':''}" onclick="goRoot()">Корень</div>${tree}</aside><section class="canvas"><div class="tiles">${folderTiles}${fileTiles}</div></section></div>`;
};

window.openCtx=(ev,type,id)=>{
  ev.preventDefault();
  const menu=$('ctxMenu'); if(!menu) return;
  const actions = type==='folder'
    ? `<button onclick="ctxFolderEdit(${id})">Редактировать</button><button onclick="ctxFolderCopy(${id})">Копировать</button><button onclick="ctxFolderDelete(${id})">Удалить</button>`
    : `<button onclick="ctxFileEdit(${id})">Редактировать</button><button onclick="ctxFileCopy(${id})">Копировать</button><button onclick="ctxFileDelete(${id})">Удалить</button>`;
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
window.ctxFolderEdit=async(id)=>{ const f=S.folders.find(x=>parseInt(x.id,10)===parseInt(id,10)); if(!f) return; const name=prompt('Новое имя папки',f.name||''); if(!name||!name.trim()) return; const fd=new URLSearchParams(); fd.append('id',id); fd.append('name',name.trim()); const r=await api('./api/index.php?action=update_media_folder',{method:'POST',body:fd}); if(r.ok) refreshMedia(); else alert('Ошибка'); };
window.ctxFolderCopy=async(id)=>{ const fd=new URLSearchParams(); fd.append('id',id); const r=await api('./api/index.php?action=copy_media_folder',{method:'POST',body:fd}); if(r.ok) refreshMedia(); else alert('Ошибка'); };
window.ctxFolderDelete=async(id)=>{ if(!confirm('Удалить папку?')) return; const fd=new URLSearchParams(); fd.append('id',id); const r=await api('./api/index.php?action=delete_media_folder',{method:'POST',body:fd}); if(r.ok){ if(parseInt(S.activeFolderId,10)===parseInt(id,10)) S.activeFolderId=0; refreshMedia(); } else alert(r.error||'Папка не пуста'); };
window.ctxFileEdit=async(id)=>{ const f=S.media.find(x=>parseInt(x.id,10)===parseInt(id,10)); if(!f) return; const name=prompt('Новое имя файла',f.file_name||''); if(!name||!name.trim()) return; const fd=new URLSearchParams(); fd.append('id',id); fd.append('name',name.trim()); const r=await api('./api/index.php?action=update_media',{method:'POST',body:fd}); if(r.ok) refreshMedia(); else alert('Ошибка'); };
window.ctxFileCopy=async(id)=>{ const fd=new URLSearchParams(); fd.append('id',id); const r=await api('./api/index.php?action=copy_media',{method:'POST',body:fd}); if(r.ok) refreshMedia(); else alert('Ошибка'); };
window.ctxFileDelete=async(id)=>{ if(!confirm('Удалить файл?')) return; await deleteMedia(id); };

$('tabM').onclick=()=>{S.tab='m';renderTabs()}; $('tabO').onclick=()=>{S.tab='o';renderTabs()}; $('tabD').onclick=()=>{S.tab='d';renderTabs()};
$('newModel').onclick=async()=>{const name=prompt('Название модели'); if(!name)return; const base=prompt('Базовая стоимость','300000'); if(base===null)return; const fd=new URLSearchParams(); fd.append('name',name); fd.append('base_price',base||'300000'); fd.append('image_url',''); const r=await api('./api/index.php?action=create_model',{method:'POST',body:fd}); if(r.ok){await boot(); await loadPage(r.id)}};
async function setModelImage(model){
  const mediaItems=(S.media||[]).filter(x=>x.mime_type&&x.mime_type.startsWith('image'));
  let picked=null;
  if(mediaItems.length){
    const names=mediaItems.map((m,i)=>`${i+1}. ${m.file_name}`).join('\n');
    const choice=prompt('Введите номер фото из медиатеки или URL:\n\n'+names+'\n\nТекущее: '+(model.image_url||'нет'),'');
    if(choice===null) return;
    const num=parseInt(choice,10);
    if(!isNaN(num)&&num>=1&&num<=mediaItems.length){picked=mediaItems[num-1].file_url;}
    else{picked=choice.trim();}
  } else {
    picked=prompt('URL фото модели',model.image_url||'');
    if(picked===null) return;
  }
  const fd=new URLSearchParams(); fd.append('id',model.id); fd.append('name',model.name||''); fd.append('image_url',picked||''); fd.append('base_price',String(model.base_price||300000));
  const r=await api('./api/index.php?action=update_model',{method:'POST',body:fd});
  if(r.ok){model.image_url=picked||''; renderModels();} else alert('Ошибка');
}
async function copyModelById(modelId){
  const fd=new URLSearchParams();
  fd.append('source_id', modelId);
  const r=await api('./api/index.php?action=copy_model',{method:'POST',body:fd});
  if(r.ok) await boot();
}
async function editModel(model){
  const name = prompt('Новое название модели', model.name || '');
  if(!name || !name.trim()) return;
  const base = prompt('Базовая стоимость', String(model.base_price ?? 300000));
  if(base===null) return;
  const fd=new URLSearchParams(); fd.append('id', model.id); fd.append('name', name.trim()); fd.append('base_price', base || '300000'); fd.append('image_url', model.image_url||'');
  const r=await api('./api/index.php?action=update_model',{method:'POST',body:fd});
  if(r.ok) await boot(); else alert('Ошибка редактирования модели');
}
async function updateModelBasePrice(model, value){
  const base = Math.max(0, Number(value || 0));
  const fd=new URLSearchParams();
  fd.append('id', model.id);
  fd.append('name', model.name || '');
  fd.append('image_url', model.image_url || '');
  fd.append('base_price', String(base));
  const r=await api('./api/index.php?action=update_model',{method:'POST',body:fd});
  if(r.ok){
    model.base_price=base;
    setState('Базовая стоимость сохранена');
    if(S.activeModelId===parseInt(model.id,10)) renderWorkspace();
  } else {
    alert('Ошибка сохранения базовой стоимости');
    renderModels();
  }
}
async function deleteModel(model){
  if(!confirm(`Удалить модель "${model.name}"?`)) return;
  const fd=new URLSearchParams(); fd.append('id', model.id);
  const r=await api('./api/index.php?action=delete_model',{method:'POST',body:fd});
  if(r.ok){ if(S.activeModelId===parseInt(model.id,10)){ S.activeModelId=null; S.page={blocks:[]}; S.selectedBlockId=null; S.selectedElId=null; } await boot(); }
  else alert('Ошибка удаления модели');
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
  fd.append('model_ids', JSON.stringify(Array.isArray(opt.model_ids)?opt.model_ids:[]));
  const r=await api('./api/index.php?action=update_option',{method:'POST',body:fd});
  if(r.ok) await boot(); else alert('Ошибка редактирования опции');
}

function fillOptionModal(opt){
  const groupSelect=$('optGroup');
  const modelList=$('optModels');
  const models=Array.isArray(S.models)?S.models:[];
  const groups=Array.isArray(S.groups)?S.groups:[];
  if(groupSelect){
    groupSelect.innerHTML = groups.map(g=>`<option value="${parseInt(g.id,10)}" ${String(opt.group_id||0)===String(g.id)?'selected':''}>${esc(g.name)}</option>`).join('') || '<option value="0">Без группы</option>';
  }
  if(modelList){
    const rawIds = (Array.isArray(opt.model_ids)?opt.model_ids:[]).map(v=>parseInt(v,10)).filter(Boolean);
    const currentIds = new Set(rawIds);
    const allModels = !rawIds.length;
    modelList.innerHTML = models.length ? models.map(m=>`<label class="tiny" style="display:flex;gap:6px;align-items:center"><input type="checkbox" value="${parseInt(m.id,10)}" ${(allModels || currentIds.has(parseInt(m.id,10)))?'checked':''}>${esc(m.name)}</label>`).join('') : '<div class="tiny">Нет моделей</div>';
  }
  $('optName').value = opt.name || '';
  $('optPrice').value = String(opt.price ?? 0);
  $('optImage').value = opt.image_url || '';
  $('optDescription').value = opt.description || '';
  $('optFeatures').value = Array.isArray(opt.features) ? opt.features.join(' | ') : '';
  updateOptionModalPreview();
}
function updateOptionModalPreview(){
  const img = $('optImage') ? $('optImage').value.trim() : '';
  const name = $('optName') ? $('optName').value.trim() : '';
  const price = parseInt(($('optPrice') && $('optPrice').value) || '0', 10) || 0;
  const desc = $('optDescription') ? $('optDescription').value.trim() : '';
  if($('optImagePreview')) $('optImagePreview').src = normalizeUrl(img || WOOD_CARD_IMAGE);
  if($('optPreviewName')) $('optPreviewName').textContent = name || 'Название опции';
  if($('optPreviewPrice')) $('optPreviewPrice').textContent = price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : 'Без цены';
  if($('optPreviewDesc')) $('optPreviewDesc').textContent = desc || 'Описание опции';
}
async function uploadOptionImage(){
  const input=$('optImageFile');
  const file=input && input.files && input.files[0];
  if(!file) return alert('Выберите файл');
  if(S.uploading) return;
  S.uploading=true;
  try{
    const blob=await toJpegBlob(file);
    const fd=new FormData();
    fd.append('file', blob, 'option.jpg');
    fd.append('folder_id', String(S.activeFolderId||1));
    const r=await fetch('./api/index.php?action=upload_image',{method:'POST',body:fd}).then(x=>x.json()).catch(()=>({ok:false,error:'Сеть недоступна'}));
    if(!r.ok) return alert(r.error||'Ошибка загрузки');
    $('optImage').value=r.url||'';
    updateOptionModalPreview();
    await refreshMedia();
    if(input) input.value='';
  } finally {
    S.uploading=false;
  }
}
function toggleOptionModal(on){
  $('optionModal').classList.toggle('on', !!on);
  if(!on) S.optionEditorId=null;
}
function openOptionEditor(idOrOpt){
  const opt = typeof idOrOpt==='object' && idOrOpt ? idOrOpt : (S.options||[]).find(o=>parseInt(o.id,10)===parseInt(idOrOpt,10));
  const base = opt || {
    id:null,
    group_id: S.activeOptionGroupId || (S.groups && S.groups[0] && S.groups[0].id) || 0,
    name:'',
    price:0,
    image_url:'',
    description:'',
    features:[],
    model_ids:(S.models||[]).map(m=>parseInt(m.id,10)).filter(Boolean)
  };
  S.optionEditorId = base.id ? parseInt(base.id,10) : null;
  $('optionModalTitle').textContent = base.id ? 'Редактировать опцию' : 'Новая опция';
  fillOptionModal(base);
  toggleOptionModal(true);
}
async function saveOptionEditor(){
  const opt = S.optionEditorId ? (S.options||[]).find(o=>parseInt(o.id,10)===parseInt(S.optionEditorId,10)) : null;
  const groupId = parseInt(($('optGroup') && $('optGroup').value) || '0', 10) || 0;
  const name = ($('optName') && $('optName').value || '').trim();
  if(!name) return alert('Укажите название');
  const price = (($('optPrice') && $('optPrice').value) || '0').trim();
  const image = ($('optImage') && $('optImage').value || '').trim();
  const description = $('optDescription') ? $('optDescription').value.trim() : '';
  const features = ($('optFeatures') && $('optFeatures').value || '').split('|').map(x=>x.trim()).filter(Boolean);
  const modelIds = [...document.querySelectorAll('#optModels input[type="checkbox"]:checked')].map(x=>parseInt(x.value,10)).filter(Boolean);
  const fd=new URLSearchParams();
  if(opt) fd.append('id', opt.id);
  fd.append('group_id', String(groupId));
  fd.append('name', name);
  fd.append('price', price);
  fd.append('image_url', image);
  fd.append('description', description);
  fd.append('features', JSON.stringify(features));
  fd.append('model_ids', JSON.stringify(modelIds));
  const r=await api('./api/index.php?action='+(opt?'update_option':'create_option'),{method:'POST',body:fd});
  if(r.ok){ toggleOptionModal(false); await boot(); }
  else alert('Не удалось сохранить опцию');
}
editOption = opt => openOptionEditor(opt);

async function updateOptionModelAvailability(optionId){
  const opt=(S.options||[]).find(o=>parseInt(o.id,10)===parseInt(optionId,10));
  if(!opt) return;
  const ids=[...document.querySelectorAll(`[data-opt-model="${optionId}"]:checked`)].map(x=>parseInt(x.value,10)).filter(Boolean);
  const fd=new URLSearchParams();
  fd.append('id', opt.id);
  fd.append('group_id', opt.group_id||0);
  fd.append('name', opt.name||'');
  fd.append('price', opt.price||0);
  fd.append('image_url', opt.image_url||'');
  fd.append('description', opt.description||'');
  fd.append('features', JSON.stringify(Array.isArray(opt.features)?opt.features:[]));
  fd.append('model_ids', JSON.stringify(ids));
  const r=await api('./api/index.php?action=update_option',{method:'POST',body:fd});
  if(r.ok){ opt.model_ids=ids; renderOptions(); } else alert('Не удалось сохранить доступность');
}
async function deleteOption(opt){
  if(!confirm(`Удалить опцию "${opt.name}"?`)) return;
  const fd=new URLSearchParams(); fd.append('id', opt.id);
  const r=await api('./api/index.php?action=delete_option',{method:'POST',body:fd});
  if(r.ok) await boot(); else alert('Ошибка удаления опции');
}
$('newOption').onclick=async()=>{const name=prompt('Название опции'); if(!name)return; const price=prompt('Цена','0')||'0'; const image=prompt('URL фото','')||''; const description=prompt('Описание','')||''; const features=prompt('Характеристики через |','')||''; const groupId=prompt('ID группы', String(S.activeOptionGroupId ?? ((S.groups&&S.groups[0]&&S.groups[0].id)||0)))||'0';
  const fd=new URLSearchParams(); fd.append('group_id',groupId); fd.append('name',name); fd.append('price',price); fd.append('image_url',image); fd.append('description',description); fd.append('features',JSON.stringify(features.split('|').map(x=>x.trim()).filter(Boolean))); fd.append('model_ids',JSON.stringify((S.models||[]).map(m=>parseInt(m.id,10)).filter(Boolean)));
  const r=await api('./api/index.php?action=create_option',{method:'POST',body:fd}); if(r.ok) await boot();
};
$('newOption').onclick=()=>openOptionEditor(null);
$('optSaveBtn').onclick=saveOptionEditor;
$('saveBtn').onclick=()=>save(true);
$('confirmAddBlock').onclick=()=>{const b=mkBlock(); S.page.blocks.splice(S.insertAt,0,b); S.selectedBlockId=b.id; S.selectedElId=null; toggleModal(false); renderWorkspace(); renderSettings(); touch();};
$('workspace').addEventListener('click',ev=>{const s=ev.target.closest('.strip'); if(!s)return;});
$('workspace').addEventListener('input',ev=>{
  const standalone = ev.target.closest('[data-edit-text]');
  const imgText = ev.target.closest('[data-edit-img-text]');
  if(standalone){
    const b=block(); if(!b) return;
    const tx=(b.elements||[]).find(x=>x.id===standalone.getAttribute('data-edit-text') && x.type==='text');
    if(!tx) return;
    tx.text=standalone.textContent||'';
    touch();
    return;
  }
  if(imgText){
    const b=block(); if(!b) return;
    const img=(b.elements||[]).find(x=>x.id===imgText.getAttribute('data-edit-img-text') && x.type==='image');
    const idx=parseInt(imgText.getAttribute('data-ti')||'0',10)||0;
    if(!img || !Array.isArray(img.texts) || !img.texts[idx]) return;
    img.texts[idx].text=imgText.textContent||'';
    touch();
  }
});
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
  if(!actionNode && ev.target.closest('[contenteditable="true"]')) return;
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
    if(!img.texts[ti]) img.texts[ti]={text:'Новый текст',x:8,y:8,width:55,size:38,fontKey:'inter',color:'#ffffff',rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:35};
    tx = img.texts[ti];
    isImgText = true;
    S.selectedImgTextIdx = ti;
    S.selectedElId=imageId;
    S.selectedPart='imageText';
  } else {
    tx=(b.elements||[]).find(x=>x.id===textId && x.type==='text');
    if(!tx) return;
    S.selectedElId=textId;
    S.selectedPart='element';
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
    if(!img.texts[ti]) img.texts[ti]={text:'Новый текст',x:8,y:8,width:55,size:38,fontKey:'inter',color:'#ffffff',rotate:0,opacity:100,textContrast:100,textBrightness:100,textSaturation:100,shadow:35};
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
// ── Layouts management ────────────────────────────────────────────────────────
let layoutsModelId = null;
const layoutsApi = (action, data={}) => {
  if(Object.keys(data).length){
    return fetch('/api/index.php?action='+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json());
  }
  const sp = new URLSearchParams({action,...data});
  return fetch('/api/index.php?'+sp).then(r=>r.json());
};
function openLayoutsModal(modelId, modelName){
  layoutsModelId = modelId;
  $('layoutsModelName').textContent = modelName || '';
  $('layoutsError').textContent = '';
  $('layoutsModal').classList.add('on');
  loadLayoutsList();
}
function closeLayoutsModal(){ $('layoutsModal').classList.remove('on'); layoutsModelId=null; }
function loadLayoutsList(){
  if(!layoutsModelId) return;
  fetch('/api/index.php?action=get_layouts&model_id='+layoutsModelId).then(r=>r.json()).then(data=>{
    const list = $('layoutsList');
    if(!data.layouts || !data.layouts.length){ list.innerHTML='<div class="tiny" style="padding:8px 0">Нет планировок. Добавьте первую.</div>'; return; }
    list.innerHTML = data.layouts.map(l=>`
      <div id="layout-row-${l.id}" style="display:flex;gap:8px;align-items:center;border:1px solid var(--l);border-radius:8px;padding:8px;margin-bottom:6px;background:#fff">
        <input value="${esc(l.name)}" data-lid="${l.id}" data-field="name" style="flex:1;padding:6px 8px;border:1px solid var(--l);border-radius:6px" onchange="updateLayoutField(${l.id},this)">
        <input type="number" value="${Number(l.price_modifier||0)}" data-lid="${l.id}" data-field="price" style="width:110px;padding:6px 8px;border:1px solid var(--l);border-radius:6px" onchange="updateLayoutField(${l.id},this)">
        <span style="font-size:11px;color:var(--m)">₽</span>
        <button class="btn" style="padding:4px 8px;font-size:12px;color:#ef4444;border-color:#fecaca" onclick="deleteLayout(${l.id})">Удалить</button>
      </div>`).join('');
  });
}
function updateLayoutField(id, input){
  const row = document.getElementById('layout-row-'+id);
  if(!row) return;
  const name = row.querySelector('[data-field="name"]').value.trim();
  const price = parseFloat(row.querySelector('[data-field="price"]').value)||0;
  if(!name){ $('layoutsError').textContent='Название не может быть пустым'; return; }
  layoutsApi('update_layout',{id,name,price_modifier:price}).then(d=>{
    if(!d.ok) $('layoutsError').textContent = d.error||'Ошибка сохранения';
    else $('layoutsError').textContent='';
  });
}
function deleteLayout(id){
  if(!confirm('Удалить эту планировку?')) return;
  layoutsApi('delete_layout',{id}).then(d=>{ if(d.ok) loadLayoutsList(); else $('layoutsError').textContent=d.error||'Ошибка удаления'; });
}
function addLayout(){
  const name = $('newLayoutName').value.trim();
  const price = parseFloat($('newLayoutPrice').value)||0;
  if(!name||!layoutsModelId){ $('layoutsError').textContent='Введите название'; return; }
  layoutsApi('create_layout',{model_id:layoutsModelId,name,price_modifier:price}).then(d=>{
    if(d.ok){ $('newLayoutName').value=''; $('newLayoutPrice').value='0'; loadLayoutsList(); $('layoutsError').textContent=''; }
    else $('layoutsError').textContent = d.error||'Ошибка создания';
  });
}

boot().then(()=>{
  try{
    const savedStateRaw = localStorage.getItem('bath_admin_state');
    if(!savedStateRaw) return;
    const savedState = JSON.parse(savedStateRaw);
    if(savedState && Number.isFinite(savedState.scrollY)) window.scrollTo(0, Math.max(0, parseInt(savedState.scrollY,10)||0));
  }catch(_e){}
});
</script>
</body>
</html>
