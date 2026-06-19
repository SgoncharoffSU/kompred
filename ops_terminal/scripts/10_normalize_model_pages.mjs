const api = 'http://159.194.225.55:8080/api/index.php';

async function post(action, body) {
  const res = await fetch(`${api}?action=${action}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    body: new URLSearchParams(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${action} failed`);
  return json;
}

function arr(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

const boot = await fetch(`${api}?action=bootstrap`).then(r => r.json());
for (const model of boot.models) {
  const res = await fetch(`${api}?action=get_page&model_id=${model.id}`).then(r => r.json());
  if (!res.ok || !res.page_json) continue;
  const page = JSON.parse(res.page_json);
  page.blocks = arr(page.blocks).map(block => {
    block.elements = arr(block.elements).map(el => {
      if (el.type === 'image') el.texts = arr(el.texts);
      return el;
    });
    return block;
  });
  await post('save_page', {model_id: model.id, page_json: JSON.stringify(page)});
}

const check = await fetch(`${api}?action=get_page&model_id=3`).then(r => r.json());
const page = JSON.parse(check.page_json);
console.log(JSON.stringify({blocksArray:Array.isArray(page.blocks), elementsArray:Array.isArray(page.blocks[0]?.elements), textsArray:Array.isArray(page.blocks[0]?.elements?.[0]?.texts)}));
