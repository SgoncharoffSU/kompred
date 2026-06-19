const api = 'http://159.194.225.55:8080/api/index.php';

const colors = [
  ['iceberg', 'Айсберг', '#F2F1EC'],
  ['alpineMorning', 'Альпийское утро', '#E7E1D8'],
  ['fjord', 'Фьорд', '#A7AAA5'],
  ['northSea', 'Северное море', '#6A747C'],
  ['bakedMilk', 'Топленое молоко', '#D8C3A5'],
  ['ivory', 'Слоновая кость', '#F4EBDD'],
  ['caramel', 'Карамель', '#B57A4B'],
  ['ginger', 'Имбирь', '#9A633E'],
  ['licorice', 'Лакрица', '#2D2D2D'],
  ['graphite', 'Графит', '#555B61'],
];

async function post(action, body) {
  const res = await fetch(`${api}?action=${action}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    body: new URLSearchParams(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${action} failed: ${JSON.stringify(json)}`);
  return json;
}

const boot = await fetch(`${api}?action=bootstrap`).then(r => r.json());
for (const option of boot.options.filter(o => o.group_name === 'Цвет бани')) {
  await post('delete_option', {id: option.id});
}

const created = [];
for (const [key, name, hex] of colors) {
  const features = JSON.stringify([
    'type: wood_color',
    `key: ${key}`,
    `hex: ${hex}`,
    'brand: Pinotex Extreme One',
  ]);
  const item = await post('create_option', {
    group_id: '2',
    name,
    price: '0',
    image_url: '',
    description: `Цвет Pinotex Extreme One: ${name}.`,
    features,
  });
  created.push(item.id);
}

const pageRes = await fetch(`${api}?action=get_page&model_id=3`).then(r => r.json());
const page = pageRes.page_json ? JSON.parse(pageRes.page_json) : {blocks: []};
page.blocks = Array.isArray(page.blocks) ? page.blocks : [];
const roofIds = boot.options.filter(o => o.group_name === 'Кровля').map(o => parseInt(o.id, 10));
for (const block of page.blocks) {
  for (const el of block.elements || []) {
    if (el.type === 'options' && /кров/i.test(block.title || '')) el.optionIds = roofIds;
  }
}
let colorBlock = page.blocks.find(b => /цвет бани/i.test(b.title || ''));
if (!colorBlock) {
  colorBlock = {
    id: 'b_wood_color',
    title: 'Выберите цвет бани',
    backgroundColor: '#ffffff',
    elements: [],
  };
  page.blocks.push(colorBlock);
}
let colorEl = (colorBlock.elements || []).find(e => e.type === 'options');
if (!colorEl) {
  colorEl = {id: 'e_wood_color', type: 'options'};
  colorBlock.elements = [colorEl];
}
Object.assign(colorEl, {
  columns: 5,
  imageHeight: 160,
  textSize: 14,
  cardSize: 130,
  cardGap: 12,
  cardRadius: 10,
  cardBorder: 1,
  cardShadow: 8,
  optionIds: created.map(Number),
});

await post('save_page', {model_id: '3', page_json: JSON.stringify(page)});
console.log(JSON.stringify({created: created.length, modelBlocks: page.blocks.length}));
