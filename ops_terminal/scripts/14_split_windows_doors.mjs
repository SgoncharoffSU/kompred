const api = 'http://159.194.225.55:8080/api/index.php';

const names = {
  doors: '\u0414\u0432\u0435\u0440\u0438',
  windows: '\u041e\u043a\u043d\u0430',
  chooseDoors: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0432\u0435\u0440\u0438',
  chooseWindows: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043e\u043a\u043d\u0430',
};

const apiDb = async (sql) => {
  const escaped = sql.replace(/'/g, "'\\''");
  const { execFileSync } = await import('node:child_process');
  return execFileSync('ssh', [
    '-i', `${process.env.USERPROFILE}\\.ssh\\codex_vps_beget`,
    '-o', 'StrictHostKeyChecking=accept-new',
    'root@159.194.225.55',
    `mysql -uroot sgoncharof_base -e '${escaped}'`,
  ], { encoding: 'utf8' });
};

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

function asciiJson(value) {
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, ch =>
    `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

await apiDb(`
INSERT INTO option_groups (id,name,sort_order) VALUES (3,'${names.doors}',3)
  ON DUPLICATE KEY UPDATE name='${names.doors}', sort_order=3;
INSERT INTO option_groups (id,name,sort_order) VALUES (4,'${names.windows}',4)
  ON DUPLICATE KEY UPDATE name='${names.windows}', sort_order=4;
UPDATE options_catalog SET group_id=4
  WHERE name LIKE '%Окно%' OR name LIKE '%форточка%' OR name LIKE '%Форточка%';
UPDATE options_catalog SET group_id=3
  WHERE name LIKE '%Дверь%' OR name LIKE '%дверь%';
`);

const boot = await fetch(`${api}?action=bootstrap`).then(r => r.json());
const doors = boot.options.filter(o => String(o.group_id) === '3').map(o => parseInt(o.id, 10)).sort((a, b) => a - b);
const windows = boot.options.filter(o => String(o.group_id) === '4').map(o => parseInt(o.id, 10)).sort((a, b) => a - b);

for (const model of boot.models) {
  const pageRes = await fetch(`${api}?action=get_page&model_id=${model.id}`).then(r => r.json());
  const page = pageRes.page_json ? JSON.parse(pageRes.page_json) : {blocks: []};
  page.blocks = Array.isArray(page.blocks) ? page.blocks : [];

  page.blocks = page.blocks.filter(block => {
    const hasOld = (block.elements || []).some(e =>
      e.type === 'options' && String(e.optionGroupId || '') === '3' &&
      (e.optionIds || []).some(id => windows.includes(parseInt(id, 10))));
    return !hasOld;
  });

  const hasDoors = page.blocks.some(block => (block.elements || []).some(e => e.type === 'options' && String(e.optionGroupId || '') === '3'));
  const hasWindows = page.blocks.some(block => (block.elements || []).some(e => e.type === 'options' && String(e.optionGroupId || '') === '4'));

  if (!hasDoors && doors.length) {
    page.blocks.push({
      id: `b_doors_${Date.now()}_${model.id}`,
      title: names.doors,
      backgroundColor: '#ffffff',
      elements: [{
        id: `e_doors_${Date.now()}_${model.id}`,
        type: 'options',
        cardGap: 12,
        cardRadius: 10,
        cardBorder: 1,
        cardShadow: 8,
        cardSize: 180,
        textSize: 14,
        multiSelect: false,
        optionsBgColor: '#ffffff',
        optionsBgOpacity: 100,
        optionTitle: names.chooseDoors,
        titleSize: 22,
        titleWeight: 800,
        titleLetter: 0,
        titleLine: 120,
        titleColor: '#111827',
        titleAlign: 'left',
        titlePadding: 0,
        optionGroupId: 3,
        optionIds: doors,
      }],
    });
  }

  if (!hasWindows && windows.length) {
    page.blocks.push({
      id: `b_windows_${Date.now()}_${model.id}`,
      title: names.windows,
      backgroundColor: '#ffffff',
      elements: [{
        id: `e_windows_${Date.now()}_${model.id}`,
        type: 'options',
        cardGap: 12,
        cardRadius: 10,
        cardBorder: 1,
        cardShadow: 8,
        cardSize: 180,
        textSize: 14,
        multiSelect: true,
        optionsBgColor: '#ffffff',
        optionsBgOpacity: 100,
        optionTitle: names.chooseWindows,
        titleSize: 22,
        titleWeight: 800,
        titleLetter: 0,
        titleLine: 120,
        titleColor: '#111827',
        titleAlign: 'left',
        titlePadding: 0,
        optionGroupId: 4,
        optionIds: windows,
      }],
    });
  }

  await post('save_page', {model_id: model.id, page_json: asciiJson(page)});
}

console.log(JSON.stringify({doors, windows, models: boot.models.length}, null, 2));
