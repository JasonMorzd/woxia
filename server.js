const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { URL } = require('url');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const ROLE_LABELS = {
  admin: '管理员',
  manager: '负责人',
  sales: '业务员',
  viewer: '只读用户',
};

const IMAGE_LIBRARY = [
  {
    url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1200&q=85',
    label: '正面',
    angle: 'front',
  },
  {
    url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1200&q=85',
    label: '细节',
    angle: 'detail',
  },
  {
    url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85',
    label: '上身',
    angle: 'model',
  },
  {
    url: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85',
    label: '侧面',
    angle: 'side',
  },
];

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

function hashText(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeAsset(styleId, libraryIndex, overrides = {}) {
  const image = IMAGE_LIBRARY[libraryIndex % IMAGE_LIBRARY.length];
  return {
    id: id('asset'),
    styleId,
    url: overrides.url || overrides.imageData || image.url,
    label: overrides.label || image.label,
    angle: overrides.angle || image.angle,
    kind: overrides.kind || 'reference',
    source: overrides.source || '历史资料',
    imageName: overrides.imageName || '',
    imageHash: overrides.imageHash || (overrides.imageData ? hashText(overrides.imageData) : hashText(`${styleId}:${image.url}`)),
    createdAt: now(),
  };
}

function makeQuote(styleId, input) {
  return {
    id: id('quote'),
    styleId,
    customer: input.customer || '',
    minQty: Number(input.minQty || 0),
    maxQty: Number(input.maxQty || 0),
    currency: input.currency || 'USD',
    unitPrice: Number(input.unitPrice || 0),
    terms: input.terms || 'FOB Ningbo',
    validUntil: input.validUntil || '',
    quotedAt: input.quotedAt || now().slice(0, 10),
    notes: input.notes || '',
  };
}

function seedDatabase() {
  const styles = [
    {
      id: 'style_aurora',
      styleNo: 'W-2407-018',
      name: 'Aurora 半高领绞花毛衣',
      category: '女式毛衣',
      season: '2024 AW',
      customer: 'Northline',
      owner: '林晓',
      status: '已量产',
      yarnComposition: '70% 羊毛 / 30% 尼龙',
      yarnCount: '2/30 NM',
      needleType: '7GG',
      weight: '520g',
      dimensions: 'S-XL',
      craftNotes: '前片立体绞花，袖口双层罗纹，领口做防变形加固。',
      tags: ['绞花', '半高领', '厚针', '女装'],
      customFields: { priority: '重点复购', origin: '宁波工厂' },
      variants: [
        { id: id('variant'), color: '燕麦色', colorCode: 'OAT-01', sizes: 'S / M / L / XL', version: 'V2' },
        { id: id('variant'), color: '深海蓝', colorCode: 'NAV-07', sizes: 'S / M / L / XL', version: 'V2' },
      ],
      assets: [],
      quotes: [],
      createdAt: '2024-03-08T09:30:00.000Z',
      updatedAt: '2024-10-18T08:10:00.000Z',
    },
    {
      id: 'style_cloud',
      styleNo: 'W-2411-026',
      name: 'Cloud 柔软羊驼套头衫',
      category: '女式毛衣',
      season: '2024 AW',
      customer: 'Morrow & Co.',
      owner: '周宁',
      status: '打样中',
      yarnComposition: '45% 羊驼毛 / 35% 羊毛 / 20% 腈纶',
      yarnCount: '1/15 NM',
      needleType: '5GG',
      weight: '430g',
      dimensions: 'XS-L',
      craftNotes: '轻起毛手感，落肩版型，袖长需按客户版型再放量。',
      tags: ['羊驼毛', '落肩', '柔软', '女装'],
      customFields: { priority: '新品观察', origin: '嘉兴工厂' },
      variants: [
        { id: id('variant'), color: '奶油白', colorCode: 'CRM-02', sizes: 'XS / S / M / L', version: 'V1' },
        { id: id('variant'), color: '灰紫', colorCode: 'MVE-05', sizes: 'XS / S / M / L', version: 'V1' },
      ],
      assets: [],
      quotes: [],
      createdAt: '2024-08-14T05:10:00.000Z',
      updatedAt: '2024-10-21T11:22:00.000Z',
    },
    {
      id: 'style_ridge',
      styleNo: 'M-2309-044',
      name: 'Ridge 男式半拉链粗针衫',
      category: '男式毛衣',
      season: '2023 AW',
      customer: 'Field & Form',
      owner: '林晓',
      status: '已量产',
      yarnComposition: '80% 羊毛 / 20% 再生尼龙',
      yarnCount: '2/12 NM',
      needleType: '3GG',
      weight: '690g',
      dimensions: 'M-XXL',
      craftNotes: '半拉链领，肩部横机拼接，适合秋冬户外系列。',
      tags: ['半拉链', '粗针', '户外', '男装'],
      customFields: { priority: '常规款', origin: '桐乡工厂' },
      variants: [
        { id: id('variant'), color: '炭灰', colorCode: 'CHA-09', sizes: 'M / L / XL / XXL', version: 'V3' },
        { id: id('variant'), color: '松针绿', colorCode: 'PIN-04', sizes: 'M / L / XL / XXL', version: 'V3' },
      ],
      assets: [],
      quotes: [],
      createdAt: '2023-06-20T02:30:00.000Z',
      updatedAt: '2024-09-01T10:40:00.000Z',
    },
    {
      id: 'style_moss',
      styleNo: 'W-2403-007',
      name: 'Moss 细针圆领基础款',
      category: '女式毛衣',
      season: '2024 SS',
      customer: 'Oak Studio',
      owner: '赵岚',
      status: '已量产',
      yarnComposition: '100% 精梳棉',
      yarnCount: '2/48 NM',
      needleType: '12GG',
      weight: '285g',
      dimensions: 'S-XL',
      craftNotes: '轻薄平针组织，领口细罗纹，适合春季基础系列。',
      tags: ['基础款', '棉', '细针', '春季'],
      customFields: { priority: '常规款', origin: '东莞工厂' },
      variants: [
        { id: id('variant'), color: '苔藓绿', colorCode: 'MOS-03', sizes: 'S / M / L / XL', version: 'V1' },
        { id: id('variant'), color: '雾霾蓝', colorCode: 'BLU-06', sizes: 'S / M / L / XL', version: 'V1' },
      ],
      assets: [],
      quotes: [],
      createdAt: '2024-01-15T03:20:00.000Z',
      updatedAt: '2024-08-30T08:15:00.000Z',
    },
    {
      id: 'style_sierra',
      styleNo: 'M-2410-013',
      name: 'Sierra 提花条纹开衫',
      category: '中性毛衣',
      season: '2024 AW',
      customer: 'Hearth Market',
      owner: '周宁',
      status: '待报价',
      yarnComposition: '50% 羊毛 / 50% 腈纶',
      yarnCount: '2/24 NM',
      needleType: '7GG',
      weight: '610g',
      dimensions: 'S-XXL',
      craftNotes: '多色提花条纹，木质纽扣，需关注深色掉色测试。',
      tags: ['提花', '条纹', '开衫', '中性'],
      customFields: { priority: '待确认', origin: '湖州工厂' },
      variants: [
        { id: id('variant'), color: '红棕条纹', colorCode: 'BRK-08', sizes: 'S / M / L / XL / XXL', version: 'V1' },
      ],
      assets: [],
      quotes: [],
      createdAt: '2024-09-06T01:00:00.000Z',
      updatedAt: '2024-10-22T07:20:00.000Z',
    },
  ];

  styles.forEach((style, styleIndex) => {
    style.assets = [
      makeAsset(style.id, styleIndex),
      makeAsset(style.id, styleIndex + 1),
    ];
    style.quotes = [
      makeQuote(style.id, {
        customer: style.customer,
        minQty: 300,
        maxQty: 999,
        currency: 'USD',
        unitPrice: styleIndex === 3 ? 11.8 : 18.5 + styleIndex * 1.4,
        terms: 'FOB Ningbo',
        validUntil: '2024-12-31',
        quotedAt: '2024-10-18',
        notes: '根据最终颜色和洗水测试确认。',
      }),
      makeQuote(style.id, {
        customer: '内部参考',
        minQty: 1000,
        maxQty: 3000,
        currency: 'USD',
        unitPrice: styleIndex === 3 ? 10.6 : 16.9 + styleIndex * 1.2,
        terms: 'FOB Ningbo',
        validUntil: '2025-01-31',
        quotedAt: '2024-10-05',
        notes: '大货区间参考价。',
      }),
    ];
  });

  return {
    version: 1,
    users: [
      { id: 'user_admin', name: '王总', role: 'admin', team: '管理层' },
      { id: 'user_manager', name: '林晓', role: 'manager', team: '业务一组' },
      { id: 'user_sales', name: '周宁', role: 'sales', team: '业务二组' },
      { id: 'user_viewer', name: '陈列组', role: 'viewer', team: '设计支持' },
    ],
    styles,
    customFields: [
      { id: 'field_priority', key: 'priority', label: '内部优先级', type: 'select', options: ['重点复购', '新品观察', '常规款', '待确认'], required: false },
      { id: 'field_origin', key: 'origin', label: '生产工厂', type: 'text', options: [], required: false },
    ],
    reviewQueue: [
      {
        id: 'review_demo_1',
        type: 'new_style',
        title: '来自飞书群的秋冬新款资料',
        content: '客户 Morrow & Co. 想找一款类似半高领绞花，颜色倾向深咖和奶油白。',
        imageUrl: IMAGE_LIBRARY[0].url,
        confidence: 0.68,
        suggestion: '可能接近 W-2407-018',
        source: '飞书群 · 秋冬开发',
        status: 'pending',
        createdAt: '2024-10-22T09:12:00.000Z',
        createdBy: '周宁',
      },
    ],
    logs: [
      { id: id('log'), action: '系统初始化', target: '数据库', actor: '系统', createdAt: now() },
      { id: id('log'), action: '导入演示款式', target: '5 个款号', actor: '系统', createdAt: now() },
    ],
    processedEvents: [],
  };
}

function ensureDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seedDatabase(), null, 2));
  }
}

function readDatabase() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDatabase(db) {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function currentUser(req, db) {
  const role = String(req.headers['x-demo-role'] || 'admin');
  return db.users.find((user) => user.role === role) || db.users[0];
}

function canViewQuotes(user) {
  return ['admin', 'manager'].includes(user.role);
}

function canManage(user) {
  return ['admin', 'manager'].includes(user.role);
}

function publicStyle(style, user) {
  const result = clone(style);
  if (!canViewQuotes(user)) {
    result.quotes = [];
  }
  return result;
}

function addLog(db, action, target, actor) {
  db.logs.unshift({ id: id('log'), action, target, actor, createdAt: now() });
  db.logs = db.logs.slice(0, 100);
}

function tokenize(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return [];
  const words = normalized.split(/[\s,，。；;、/|]+/).filter(Boolean);
  const cjk = [...normalized.replace(/[^\u4e00-\u9fff]/g, '')];
  return [...new Set([...words, ...cjk])];
}

function styleHaystack(style) {
  return [
    style.styleNo,
    style.name,
    style.category,
    style.season,
    style.customer,
    style.owner,
    style.status,
    style.yarnComposition,
    style.yarnCount,
    style.needleType,
    style.weight,
    style.dimensions,
    style.craftNotes,
    ...(style.tags || []),
    ...(style.variants || []).flatMap((variant) => [variant.color, variant.colorCode, variant.sizes, variant.version]),
    ...Object.values(style.customFields || {}),
  ].join(' ').toLowerCase();
}

function scoreStyle(style, query, filters, imageHash) {
  let score = query || imageHash ? 0 : 40;
  const haystack = styleHaystack(style);
  const tokens = tokenize(query);
  tokens.forEach((token) => {
    if (style.styleNo.toLowerCase() === token) score += 100;
    else if (haystack.includes(token)) score += token.length > 1 ? 22 : 10;
  });

  if (filters.category && filters.category !== '全部品类' && style.category !== filters.category) return -1;
  if (filters.season && filters.season !== '全部季节' && style.season !== filters.season) return -1;
  if (filters.customer && filters.customer !== '全部客户' && style.customer !== filters.customer) return -1;
  if (filters.status && filters.status !== '全部状态' && style.status !== filters.status) return -1;
  if (filters.composition && !haystack.includes(filters.composition.toLowerCase())) return -1;

  if (imageHash) {
    const exact = (style.assets || []).some((asset) => asset.imageHash === imageHash);
    if (exact) score += 150;
    else score += 8;
  }
  if (tokens.length === 0 && imageHash) score += 10;
  return score;
}

function searchStyles(db, params, user) {
  const query = params.query || '';
  const filters = params.filters || {};
  const imageHash = params.imageHash || '';
  return db.styles
    .map((style) => ({ style, score: scoreStyle(style, query, filters, imageHash) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || b.style.updatedAt.localeCompare(a.style.updatedAt))
    .slice(0, Math.min(Number(params.limit || 20), 50))
    .map(({ style, score }) => ({
      ...publicStyle(style, user),
      score: Math.min(99, Math.max(54, Math.round(score))),
      matchReason: imageHash && (style.assets || []).some((asset) => asset.imageHash === imageHash)
        ? '图片指纹高度匹配'
        : query
          ? '关键词与结构化字段匹配'
          : '近期更新款式',
    }));
}

function parseCsv(text) {
  const delimiter = text.includes('\t') && !text.includes(',') ? '\t' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === delimiter && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((item) => item.trim())) rows.push(row.map((item) => item.trim()));
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((item) => item.trim())) rows.push(row.map((item) => item.trim()));
  }
  if (rows.length === 0) return [];
  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, '').trim());
  return rows.map((values, rowIndex) => ({
    ...Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])),
    __row: rowIndex + 2,
  }));
}

function importPreview(db, text) {
  const rows = parseCsv(text);
  const known = new Set(db.styles.map((style) => style.styleNo));
  const seen = new Set();
  const errors = [];
  const valid = [];
  rows.forEach((row) => {
    const styleNo = row.styleNo || row['款号'] || row['款号*'];
    if (!styleNo) {
      errors.push({ row: row.__row, message: '缺少款号' });
      return;
    }
    if (known.has(styleNo)) {
      errors.push({ row: row.__row, message: `款号 ${styleNo} 已存在，不会覆盖` });
      return;
    }
    if (seen.has(styleNo)) {
      errors.push({ row: row.__row, message: `款号 ${styleNo} 在本文件中重复` });
      return;
    }
    seen.add(styleNo);
    valid.push(row);
  });
  return { rows, valid, errors };
}

function importTextFromPayload(payload) {
  if (payload.fileData) {
    const encoded = String(payload.fileData).replace(/^data:.*?;base64,/, '');
    const workbook = XLSX.read(Buffer.from(encoded, 'base64'), { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) return '';
    return XLSX.utils.sheet_to_csv(firstSheet);
  }
  return String(payload.text || '');
}

function styleFromImport(row) {
  const styleNo = row.styleNo || row['款号'] || row['款号*'];
  const style = {
    id: id('style'),
    styleNo,
    name: row.styleName || row['款名'] || '未命名款式',
    category: row.category || row['品类'] || '未分类',
    season: row.season || row['季节'] || '未设定',
    customer: row.customer || row['客户'] || '未指定',
    owner: row.owner || row['负责人'] || '待分配',
    status: row.status || row['状态'] || '待审核',
    yarnComposition: row.yarnComposition || row['纱线成分'] || '',
    yarnCount: row.yarnCount || row['纱支'] || '',
    needleType: row.needleType || row['针型'] || '',
    weight: row.weight || row['克重'] || '',
    dimensions: row.dimensions || row['尺码'] || '',
    craftNotes: row.craftNotes || row['工艺备注'] || '',
    tags: (row.tags || row['标签'] || '').split(/[|/、，,]/).map((tag) => tag.trim()).filter(Boolean),
    customFields: {},
    variants: [],
    assets: [],
    quotes: [],
    createdAt: now(),
    updatedAt: now(),
  };
  const colors = (row.colors || row['颜色'] || '').split(/[|/、，,]/).map((color) => color.trim()).filter(Boolean);
  colors.forEach((color) => style.variants.push({ id: id('variant'), color, colorCode: '', sizes: style.dimensions, version: 'V1' }));
  return style;
}

function rawBodyFromRequest(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

async function bodyFromRequest(req) {
  const raw = await rawBodyFromRequest(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('请求内容必须是 JSON');
  }
}

function verifyFeishuSignature(req, rawBody) {
  const encryptKey = process.env.FEISHU_ENCRYPT_KEY;
  if (!encryptKey) return true;
  const timestamp = String(req.headers['x-lark-request-timestamp'] || '');
  const nonce = String(req.headers['x-lark-request-nonce'] || '');
  const signature = String(req.headers['x-lark-signature'] || '');
  if (!timestamp || !nonce || !signature) return false;
  const expected = crypto.createHash('sha256').update(`${timestamp}${nonce}${encryptKey}${rawBody}`).digest('base64');
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function sendJson(res, status, payload) {
  const output = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(output);
}

function sendText(res, status, payload, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(payload);
}

function safeStaticPath(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const resolved = path.normalize(path.join(PUBLIC_DIR, decoded === '/' ? 'index.html' : decoded));
  return resolved.startsWith(PUBLIC_DIR) ? resolved : null;
}

function serveStatic(req, res) {
  const filePath = safeStaticPath(req.url.split('?')[0]);
  if (!filePath) return sendText(res, 403, 'Forbidden');
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      return sendText(res, 404, 'Not found');
    }
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
    };
    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function handleApi(req, res, pathname, url) {
  const db = readDatabase();
  const user = currentUser(req, db);
  const method = req.method || 'GET';
  const parts = pathname.split('/').filter(Boolean);

  if (pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, timestamp: now(), aiProvider: process.env.AI_PROVIDER || 'local-demo-adapter' });
  }

  if (pathname === '/api/me' && method === 'GET') {
    return sendJson(res, 200, { user, roleLabels: ROLE_LABELS, canViewQuotes: canViewQuotes(user), canManage: canManage(user) });
  }

  if (pathname === '/api/dashboard' && method === 'GET') {
    const recentStyles = db.styles.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
    const quoteCount = db.styles.reduce((sum, style) => sum + style.quotes.length, 0);
    return sendJson(res, 200, {
      metrics: [
        { key: 'styles', label: '正式款号', value: db.styles.length, delta: '+12%', note: '较上月' },
        { key: 'assets', label: '参考图片', value: db.styles.reduce((sum, style) => sum + style.assets.length, 0), delta: '+28', note: '本月新增' },
        { key: 'quotes', label: '历史报价', value: quoteCount, delta: '可追溯', note: '含版本记录' },
        { key: 'review', label: '待审核', value: db.reviewQueue.filter((item) => item.status === 'pending').length, delta: '需处理', note: '来自群聊与导入' },
      ],
      recentStyles: recentStyles.map((style) => publicStyle(style, user)),
      reviewQueue: db.reviewQueue.filter((item) => item.status === 'pending').slice(0, 4),
      logs: db.logs.slice(0, 6),
    });
  }

  if (pathname === '/api/styles' && method === 'GET') {
    const results = searchStyles(db, {
      query: url.searchParams.get('q') || '',
      filters: {
        category: url.searchParams.get('category') || '',
        season: url.searchParams.get('season') || '',
        customer: url.searchParams.get('customer') || '',
        status: url.searchParams.get('status') || '',
      },
    }, user);
    return sendJson(res, 200, { items: results, total: results.length });
  }

  if (pathname === '/api/quotes' && method === 'GET') {
    if (!canViewQuotes(user)) return sendJson(res, 403, { error: '当前角色没有报价查看权限' });
    const styleId = url.searchParams.get('styleId') || '';
    const customer = (url.searchParams.get('customer') || '').toLowerCase();
    const items = db.styles
      .filter((style) => !styleId || style.id === styleId)
      .flatMap((style) => style.quotes.map((quote) => ({ ...quote, styleNo: style.styleNo, styleName: style.name })))
      .filter((quote) => !customer || quote.customer.toLowerCase().includes(customer))
      .sort((a, b) => `${b.quotedAt}`.localeCompare(`${a.quotedAt}`));
    return sendJson(res, 200, { items, total: items.length });
  }

  if (pathname === '/api/styles' && method === 'POST') {
    const payload = await bodyFromRequest(req);
    if (!payload.styleNo || !payload.name) return sendJson(res, 400, { error: '款号和款名为必填项' });
    if (db.styles.some((style) => style.styleNo.toLowerCase() === String(payload.styleNo).toLowerCase())) {
      return sendJson(res, 409, { error: '款号已存在，不能覆盖已有记录' });
    }
    const style = {
      id: id('style'),
      styleNo: String(payload.styleNo).trim(),
      name: String(payload.name).trim(),
      category: payload.category || '未分类',
      season: payload.season || '未设定',
      customer: payload.customer || '未指定',
      owner: payload.owner || user.name,
      status: payload.status || '待审核',
      yarnComposition: payload.yarnComposition || '',
      yarnCount: payload.yarnCount || '',
      needleType: payload.needleType || '',
      weight: payload.weight || '',
      dimensions: payload.dimensions || '',
      craftNotes: payload.craftNotes || '',
      tags: Array.isArray(payload.tags) ? payload.tags : String(payload.tags || '').split(/[|/、，,]/).map((tag) => tag.trim()).filter(Boolean),
      customFields: payload.customFields || {},
      variants: Array.isArray(payload.variants) ? payload.variants.map((variant) => ({ id: variant.id || id('variant'), ...variant })) : [],
      assets: Array.isArray(payload.assets) ? payload.assets.map((asset) => makeAsset('', 0, asset)) : [],
      quotes: [],
      createdAt: now(),
      updatedAt: now(),
    };
    style.assets.forEach((asset) => { asset.styleId = style.id; });
    db.styles.unshift(style);
    addLog(db, '新建款号', style.styleNo, user.name);
    writeDatabase(db);
    return sendJson(res, 201, { item: publicStyle(style, user) });
  }

  if (parts[1] === 'styles' && parts.length === 3 && method === 'GET') {
    const style = db.styles.find((item) => item.id === parts[2] || item.styleNo === parts[2]);
    if (!style) return sendJson(res, 404, { error: '款号不存在' });
    return sendJson(res, 200, { item: publicStyle(style, user) });
  }

  if (parts[1] === 'styles' && parts.length === 3 && method === 'PATCH') {
    const payload = await bodyFromRequest(req);
    const style = db.styles.find((item) => item.id === parts[2] || item.styleNo === parts[2]);
    if (!style) return sendJson(res, 404, { error: '款号不存在' });
    if (payload.styleNo && payload.styleNo !== style.styleNo && db.styles.some((item) => item.styleNo === payload.styleNo)) {
      return sendJson(res, 409, { error: '款号已存在' });
    }
    Object.assign(style, payload, { updatedAt: now() });
    addLog(db, '更新款号', style.styleNo, user.name);
    writeDatabase(db);
    return sendJson(res, 200, { item: publicStyle(style, user) });
  }

  if (parts[1] === 'styles' && parts[3] === 'quotes' && parts.length === 4 && method === 'POST') {
    if (!canViewQuotes(user)) return sendJson(res, 403, { error: '当前角色没有报价写入权限' });
    const payload = await bodyFromRequest(req);
    const style = db.styles.find((item) => item.id === parts[2]);
    if (!style) return sendJson(res, 404, { error: '款号不存在' });
    const quote = makeQuote(style.id, payload);
    style.quotes.unshift(quote);
    style.updatedAt = now();
    addLog(db, '新增历史报价', style.styleNo, user.name);
    writeDatabase(db);
    return sendJson(res, 201, { item: quote });
  }

  if (pathname === '/api/search' && method === 'POST') {
    const payload = await bodyFromRequest(req);
    const imageHash = payload.imageData ? hashText(payload.imageData) : payload.imageHash || '';
    const results = searchStyles(db, { ...payload, imageHash }, user);
    return sendJson(res, 200, {
      items: results,
      total: results.length,
      searchMeta: {
        mode: payload.imageData && payload.query ? '图片 + 文字联合检索' : payload.imageData ? '图片相似检索' : '文字与字段检索',
        aiProvider: process.env.AI_PROVIDER || 'local-demo-adapter',
        note: '当前默认使用本地可替换图像适配器；接入云端模型后可生成语义描述与向量。',
      },
    });
  }

  if (pathname === '/api/assets' && method === 'POST') {
    const payload = await bodyFromRequest(req);
    const style = payload.styleId ? db.styles.find((item) => item.id === payload.styleId) : null;
    if (payload.styleId && !style) return sendJson(res, 404, { error: '款号不存在' });
    const asset = makeAsset(payload.styleId || '', 0, {
      ...payload,
      imageHash: payload.imageData ? hashText(payload.imageData) : payload.imageHash,
      url: payload.imageData || payload.url,
    });
    if (style) {
      style.assets.unshift(asset);
      style.updatedAt = now();
      addLog(db, '新增款式图片', style.styleNo, user.name);
    }
    writeDatabase(db);
    return sendJson(res, 201, { item: asset });
  }

  if (pathname === '/api/imports/preview' && method === 'POST') {
    const payload = await bodyFromRequest(req);
    const preview = importPreview(db, importTextFromPayload(payload));
    return sendJson(res, 200, {
      filename: payload.filename || '未命名文件',
      total: preview.rows.length,
      valid: preview.valid.length,
      errorCount: preview.errors.length,
      errors: preview.errors,
      sample: preview.valid.slice(0, 5).map(styleFromImport),
    });
  }

  if (pathname === '/api/imports/commit' && method === 'POST') {
    if (!canManage(user)) return sendJson(res, 403, { error: '只有管理员或负责人可以执行导入' });
    const payload = await bodyFromRequest(req);
    const preview = importPreview(db, importTextFromPayload(payload));
    const imported = preview.valid.map(styleFromImport);
    db.styles.unshift(...imported);
    addLog(db, '批量导入款号', `${imported.length} 个款号`, user.name);
    writeDatabase(db);
    return sendJson(res, 201, { imported: imported.length, skipped: preview.errors.length, errors: preview.errors });
  }

  if (pathname === '/api/review-queue' && method === 'GET') {
    return sendJson(res, 200, { items: db.reviewQueue.filter((item) => item.status === 'pending') });
  }

  if (parts[1] === 'review-queue' && parts.length === 3 && method === 'POST') {
    if (!canManage(user)) return sendJson(res, 403, { error: '只有管理员或负责人可以审核' });
    const payload = await bodyFromRequest(req);
    const item = db.reviewQueue.find((review) => review.id === parts[2]);
    if (!item) return sendJson(res, 404, { error: '审核项不存在' });
    if (payload.action === 'approve') {
      item.status = 'approved';
      item.reviewedAt = now();
      item.reviewedBy = user.name;
      addLog(db, '通过资料审核', item.title, user.name);
    } else {
      item.status = 'rejected';
      item.reviewedAt = now();
      item.reviewedBy = user.name;
      addLog(db, '驳回资料审核', item.title, user.name);
    }
    writeDatabase(db);
    return sendJson(res, 200, { item });
  }

  if (pathname === '/api/custom-fields' && method === 'GET') {
    return sendJson(res, 200, { items: db.customFields });
  }

  if (pathname === '/api/custom-fields' && method === 'POST') {
    if (!canManage(user)) return sendJson(res, 403, { error: '只有管理员或负责人可以管理自定义字段' });
    const payload = await bodyFromRequest(req);
    if (!payload.key || !payload.label) return sendJson(res, 400, { error: '字段标识和名称为必填项' });
    if (db.customFields.some((field) => field.key === payload.key)) return sendJson(res, 409, { error: '字段标识已存在' });
    const field = {
      id: id('field'),
      key: String(payload.key).replace(/[^\w\u4e00-\u9fff-]/g, '_'),
      label: String(payload.label),
      type: payload.type || 'text',
      options: Array.isArray(payload.options) ? payload.options : [],
      required: Boolean(payload.required),
    };
    db.customFields.push(field);
    addLog(db, '新增自定义字段', field.label, user.name);
    writeDatabase(db);
    return sendJson(res, 201, { item: field });
  }

  if (pathname === '/api/feishu/events' && method === 'POST') {
    const rawBody = await rawBodyFromRequest(req);
    if (!verifyFeishuSignature(req, rawBody)) {
      return sendJson(res, 401, { error: '飞书事件签名校验失败' });
    }
    let payload;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return sendJson(res, 400, { error: '飞书事件内容不是有效 JSON' });
    }
    if (process.env.FEISHU_VERIFICATION_TOKEN && payload.token !== process.env.FEISHU_VERIFICATION_TOKEN && (payload.type === 'url_verification' || payload.challenge)) {
      return sendJson(res, 401, { error: '飞书 verification token 校验失败' });
    }
    if (payload.type === 'url_verification' || payload.challenge) {
      return sendJson(res, 200, { challenge: payload.challenge });
    }
    const eventId = payload.header?.event_id || payload.event_id || hashText(JSON.stringify(payload));
    if (db.processedEvents.includes(eventId)) return sendJson(res, 200, { ok: true, duplicate: true });
    db.processedEvents.push(eventId);
    const message = payload.event?.message || payload.message || {};
    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content || payload.event || payload);
    db.reviewQueue.unshift({
      id: id('review'),
      type: message.message_type === 'image' ? 'image_search' : 'chat_capture',
      title: '来自飞书群的新资料',
      content,
      imageUrl: payload.imageUrl || '',
      confidence: 0.5,
      suggestion: '等待 AI 解析与人工确认',
      source: `飞书事件 ${eventId.slice(0, 8)}`,
      status: 'pending',
      createdAt: now(),
      createdBy: user.name,
    });
    addLog(db, '接收飞书群资料', eventId.slice(0, 12), user.name);
    writeDatabase(db);
    return sendJson(res, 200, { ok: true, accepted: true, reviewQueue: true });
  }

  return sendJson(res, 404, { error: 'API 不存在' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url.pathname, url);
    } else {
      serveStatic(req, res);
    }
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message || '服务器内部错误' });
  }
});

if (require.main === module) {
  ensureDatabase();
  server.listen(PORT, HOST, () => {
    console.log(`Woxia Knitwear Library running at http://${HOST}:${PORT}`);
  });
}

module.exports = { server, seedDatabase, parseCsv, searchStyles, verifyFeishuSignature };
