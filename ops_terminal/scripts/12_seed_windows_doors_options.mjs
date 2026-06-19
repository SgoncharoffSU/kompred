const api = 'http://159.194.225.55:8080/api/index.php';

const groupId = '3';
const features = JSON.stringify(['type:paid_extra', 'multi:true']);
const options = [
  {
    name: 'Окно ПВХ в зоне отдыха 1200x800',
    price: 12000,
    image_url: '/infix/windows_doors/window_pvh_1200x800.jpg',
    description: 'Дополнительное ПВХ-окно для зоны отдыха: больше дневного света и визуально просторнее помещение.',
  },
  {
    name: 'Дверь входная ПВХ 1700x800 - белая',
    price: 15000,
    image_url: '/infix/windows_doors/door_pvh_1700x800.jpg',
    description: 'Белая входная ПВХ-дверь 1700x800 для аккуратного светлого фасада.',
  },
  {
    name: 'Дверь входная ПВХ 1700x800 - цвет дуб',
    price: 18000,
    image_url: '/infix/windows_doors/door_pvh_1700x800.jpg',
    description: 'Входная ПВХ-дверь в цвете дуб: теплая древесная отделка под классический вид бани.',
  },
  {
    name: 'Дверь входная ПВХ 1700x800 - цвет антрацит',
    price: 18000,
    image_url: '/infix/windows_doors/door_pvh_1700x800.jpg',
    description: 'Входная ПВХ-дверь цвета антрацит для современного контрастного фасада.',
  },
  {
    name: 'Дверь входная металлическая 1700x800',
    price: 18000,
    image_url: '/infix/windows_doors/door_pvh_1700x800.jpg',
    description: 'Металлическая входная дверь 1700x800 для более практичного и прочного решения.',
  },
  {
    name: 'Доп. форточка 300x400',
    price: 5000,
    image_url: '/infix/windows_doors/fortochka_300x400.jpg',
    description: 'Дополнительная форточка 300x400 для проветривания и мягкого естественного света.',
  },
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
if (!boot.ok) throw new Error(`bootstrap failed: ${JSON.stringify(boot)}`);

for (const option of (boot.options || []).filter(o => String(o.group_id || '') === groupId)) {
  await post('delete_option', {id: option.id});
}

for (const option of options) {
  await post('create_option', {
    group_id: groupId,
    name: option.name,
    price: String(option.price),
    image_url: option.image_url,
    description: option.description,
    features,
  });
}

const updated = await fetch(`${api}?action=bootstrap`).then(r => r.json());
const created = (updated.options || []).filter(o => String(o.group_id || '') === groupId);
console.log(JSON.stringify({group: 'Окна и двери', created: created.length}, null, 2));
