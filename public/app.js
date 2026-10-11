const state = {
  route: 'dashboard',
  role: localStorage.getItem('woxia-role') || 'admin',
  user: null,
  dashboard: null,
  customFields: [],
  searchResults: [],
  searchMeta: null,
  searchImageData: '',
  searchImageName: '',
  selectedStyle: null,
  importText: `styleNo,styleName,category,season,customer,owner,status,yarnComposition,yarnCount,needleType,weight,dimensions,colors,tags,craftNotes
W-2412-001,示例提花圆领,女式毛衣,2024 AW,示例客户,林晓,待审核,80%羊毛/20%尼龙,2/24 NM,7GG,480g,S-XL,奶油白|深灰,提花|圆领,补充工艺备注`,
  importFilename: '',
  importFileData: '',
  importPreview: null,
  newStyleImages: [],
};

const NAV_ITEMS = [
  { key: 'dashboard', label: '工作台', icon: '⌂' },
  { key: 'search', label: '找款检索', icon: '⌕' },
  { key: 'new', label: '新建款号', icon: '+' },
  { key: 'review', label: '审核队列', icon: '✓' },
  { key: 'imports', label: '批量导入', icon: '⇧' },
  { key: 'settings', label: '系统设置', icon: '⚙' },
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date);
}

function formatMoney(quote) {
  if (!quote) return '—';
  return `${quote.currency || 'USD'} ${Number(quote.unitPrice || 0).toFixed(2)}`;
}

function initials(name) {
  return String(name || 'W').slice(0, 1);
}

function imageUrl(style) {
  return style?.assets?.[0]?.url || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80';
}

function statusTag(status) {
  const map = { '已量产': 'tag', '打样中': 'tag amber', '待报价': 'tag blue', '待审核': 'tag red' };
  return `<span class="${map[status] || 'tag'}">${escapeHtml(status || '未设定')}</span>`;
}

async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), 'X-Demo-Role': state.role, ...(options.headers || {}) };
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `请求失败 ${response.status}`);
  return data;
}

function toast(message, type = 'success') {
  const root = $('#toast-root');
  const item = document.createElement('div');
  item.className = `toast ${type === 'error' ? 'error' : ''}`;
  item.textContent = message;
  root.appendChild(item);
  setTimeout(() => item.remove(), 3200);
}

function navMarkup(mobile = false) {
  const items = mobile ? NAV_ITEMS.filter((item) => ['dashboard', 'search', 'new', 'review', 'imports'].includes(item.key)) : NAV_ITEMS;
  return items.map((item) => `
    <button class="nav-button ${state.route === item.key ? 'active' : ''}" data-route="${item.key}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </button>
  `).join('');
}

function shellMarkup(content) {
  const title = NAV_ITEMS.find((item) => item.key === state.route)?.label || '工作台';
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">W</div>
          <div class="brand-copy"><strong>Woxia</strong><span>KNITWEAR LIBRARY</span></div>
        </div>
        <nav class="nav">${navMarkup()}</nav>
        <div class="sidebar-footer">
          <div class="side-status"><span class="status-dot"></span> 本地服务已连接</div>
          <div class="side-footnote">图片适配器：可替换<br />当前模式：本地演示 + 可接云端模型</div>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="topbar-left">
            <button class="mobile-menu" data-action="toggle-mobile-menu" aria-label="打开菜单">☰</button>
            <div><div class="eyebrow">毛衣外贸款式库</div><h1 class="top-title">${title}</h1></div>
          </div>
          <div class="topbar-actions">
            <select class="role-select" id="role-select" aria-label="切换演示角色">
              ${Object.entries({ admin: '管理员', manager: '负责人', sales: '业务员', viewer: '只读用户' }).map(([key, label]) => `<option value="${key}" ${state.role === key ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
            <div class="user-chip"><span class="avatar">${initials(state.user?.name)}</span><span>${escapeHtml(state.user?.name || '加载中')}</span></div>
          </div>
        </header>
        <section class="content">${content}</section>
      </main>
    </div>
    <nav class="mobile-nav">${navMarkup(true)}</nav>
    ${state.selectedStyle ? detailModalMarkup(state.selectedStyle) : ''}
  `;
}

function pageHeading(title, description, actions = '') {
  return `
    <div class="page-heading">
      <div><h1>${title}</h1><p>${description}</p></div>
      ${actions ? `<div class="heading-actions">${actions}</div>` : ''}
    </div>
  `;
}

function metricMarkup(metric) {
  return `
    <div class="metric-card">
      <div class="metric-top"><span>${escapeHtml(metric.label)}</span><span>●</span></div>
      <div class="metric-value">${escapeHtml(metric.value)}</div>
      <div class="metric-foot"><span class="metric-delta">${escapeHtml(metric.delta)}</span><span>${escapeHtml(metric.note)}</span></div>
    </div>
  `;
}

function styleRowMarkup(style) {
  const quote = style.quotes?.[0];
  return `
    <button class="style-row" data-style-id="${style.id}">
      <span class="thumb"><img src="${escapeHtml(imageUrl(style))}" alt="${escapeHtml(style.name)}" onerror="this.style.display='none'"></span>
      <span class="style-row-main">
        <span class="style-row-title">${escapeHtml(style.styleNo)} · ${escapeHtml(style.name)}</span>
        <span class="style-row-sub">${escapeHtml(style.yarnComposition || '未填写成分')} · ${escapeHtml(style.customer || '未指定客户')}</span>
      </span>
      <span class="style-row-end"><strong>${quote ? formatMoney(quote) : '待报价'}</strong><span>${formatDate(style.updatedAt)}</span></span>
    </button>
  `;
}

function reviewItemMarkup(item, compact = false) {
  return `
    <div class="review-item" data-review-id="${item.id}">
      <div class="review-item-head"><div><div class="review-item-title">${escapeHtml(item.title)}</div><div class="review-item-source">${escapeHtml(item.source)} · ${formatDate(item.createdAt)}</div></div><span class="tag amber">${Math.round(Number(item.confidence || 0) * 100)}% 置信度</span></div>
      <div class="review-item-copy">${escapeHtml(item.content)}</div>
      <div class="review-item-foot"><span class="field-hint">推荐：${escapeHtml(item.suggestion || '等待确认')}</span>${compact ? '<button class="button ghost small" data-route="review">查看全部</button>' : `<div class="review-actions"><button class="button secondary small" data-review-action="approve" data-review-id="${item.id}">通过</button><button class="button danger small" data-review-action="reject" data-review-id="${item.id}">驳回</button></div>`}</div>
    </div>
  `;
}

function dashboardMarkup() {
  const dashboard = state.dashboard || { metrics: [], recentStyles: [], reviewQueue: [], logs: [] };
  return `
    ${pageHeading('工作台', '把历史款式、图片和报价集中在一个可搜索的工作台里。', `<button class="button" data-route="search">⌕ 快速找款</button><button class="button secondary" data-route="new">＋ 新建款号</button>`)}
    <div class="metric-grid">${dashboard.metrics.map(metricMarkup).join('')}</div>
    <div class="dashboard-grid">
      <section class="section-panel">
        <div class="panel-heading"><h2>最近更新的款式</h2><button class="button ghost small" data-route="search">查看全部</button></div>
        <div class="panel-body"><div class="style-list">${dashboard.recentStyles.length ? dashboard.recentStyles.map(styleRowMarkup).join('') : '<div class="empty">还没有款式记录</div>'}</div></div>
      </section>
      <section class="section-panel">
        <div class="panel-heading"><h2>待处理审核</h2><span>${dashboard.reviewQueue.length} 条待处理</span></div>
        <div class="panel-body"><div class="review-list">${dashboard.reviewQueue.length ? dashboard.reviewQueue.map((item) => reviewItemMarkup(item, true)).join('') : '<div class="empty">当前没有待处理资料</div>'}</div></div>
      </section>
    </div>
  `;
}

function searchMarkup() {
  const results = state.searchResults;
  const categories = ['全部品类', ...new Set(results.map((item) => item.category).filter(Boolean))];
  const seasons = ['全部季节', ...new Set(results.map((item) => item.season).filter(Boolean))];
  const customers = ['全部客户', ...new Set(results.map((item) => item.customer).filter(Boolean))];
  const statuses = ['全部状态', ...new Set(results.map((item) => item.status).filter(Boolean))];
  return `
    ${pageHeading('找款检索', '输入款号、客户、纱线成分，或上传一张不同角度的图片。结果会结合图片信号与结构化字段排序。', `<button class="button secondary" data-route="new">＋ 新建款号</button>`)}
    <form id="search-form">
      <div class="search-bar">
        <div class="search-input-wrap"><span class="search-symbol">⌕</span><input class="search-input" id="search-query" value="${escapeHtml(state.searchQuery || '')}" placeholder="例如：半高领 / 70% 羊毛 / W-2407-018 / Northline" /></div>
        <label class="upload-button">▧ 上传图片<input id="search-image-input" type="file" accept="image/*" /></label>
        <button class="button search-submit" type="submit">开始检索</button>
      </div>
      <div class="search-preview ${state.searchImageData ? 'visible' : ''}" id="search-preview">${state.searchImageData ? `<img src="${state.searchImageData}" alt="检索图片预览" /><span>已加入图片条件：${escapeHtml(state.searchImageName || '手机上传图片')}</span><button class="button ghost small" type="button" data-action="clear-search-image">移除</button>` : ''}</div>
      <div class="filter-row">
        <select class="filter-select" name="category"><option>全部品类</option>${categories.slice(1).map((item) => `<option ${state.filters?.category === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select>
        <select class="filter-select" name="season"><option>全部季节</option>${seasons.slice(1).map((item) => `<option ${state.filters?.season === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select>
        <select class="filter-select" name="customer"><option>全部客户</option>${customers.slice(1).map((item) => `<option ${state.filters?.customer === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select>
        <select class="filter-select" name="status"><option>全部状态</option>${statuses.slice(1).map((item) => `<option ${state.filters?.status === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select>
      </div>
    </form>
    <div class="search-meta"><span><strong>${results.length}</strong> 个候选款号${state.searchMeta ? ` · ${escapeHtml(state.searchMeta.mode)}` : ''}</span><span>${state.searchMeta ? escapeHtml(state.searchMeta.note) : '可使用图片 + 文字联合检索'}</span></div>
    <div class="result-grid">${results.length ? results.map(resultCardMarkup).join('') : '<div class="section-panel" style="grid-column:1/-1"><div class="empty">没有找到匹配款式。试试更短的关键词，或清空筛选条件。</div></div>'}</div>
  `;
}

function resultCardMarkup(style) {
  const quote = style.quotes?.[0];
  return `
    <article class="result-card" data-style-id="${style.id}">
      <div class="result-image"><img src="${escapeHtml(imageUrl(style))}" alt="${escapeHtml(style.name)}" onerror="this.style.display='none'"><span class="result-score">${style.score || 86}% 匹配</span></div>
      <div class="result-body">
        <div class="result-style-no">${escapeHtml(style.styleNo)}</div>
        <div class="result-name">${escapeHtml(style.name)}</div>
        <div class="tag-row" style="margin-top:10px">${(style.tags || []).slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="result-summary"><div><span>成分</span><strong>${escapeHtml(style.yarnComposition || '未填写')}</strong></div><div><span>客户</span><strong>${escapeHtml(style.customer || '未指定')}</strong></div></div>
        <div class="result-foot">${statusTag(style.status)}<span class="match-reason">${escapeHtml(style.matchReason || '结构化字段匹配')}</span></div>
      </div>
    </article>
  `;
}

function newStyleMarkup() {
  const customFields = state.customFields || [];
  return `
    ${pageHeading('新建款号', '把一款新资料先沉淀下来。图片、字段和报价都可以之后继续补充。', `<button class="button ghost" data-route="search">返回找款</button>`)}
    <form id="new-style-form" class="form-layout">
      <section class="form-panel">
        <h2>款号基础资料</h2><p>常用字段结构化保存，后续可以直接通过款号、成分、客户和季节检索。</p>
        <div class="form-grid">
          <div class="field"><label for="styleNo">款号 *</label><input id="styleNo" name="styleNo" required placeholder="例如 W-2412-001" /></div>
          <div class="field"><label for="name">款名 *</label><input id="name" name="name" required placeholder="例如 提花圆领套头衫" /></div>
          <div class="field"><label for="category">品类</label><input id="category" name="category" placeholder="女式毛衣 / 男式毛衣" /></div>
          <div class="field"><label for="season">季节</label><input id="season" name="season" placeholder="2025 AW" /></div>
          <div class="field"><label for="customer">客户</label><input id="customer" name="customer" placeholder="客户或品牌名称" /></div>
          <div class="field"><label for="owner">负责人</label><input id="owner" name="owner" value="${escapeHtml(state.user?.name || '')}" /></div>
          <div class="field"><label for="yarnComposition">纱线成分</label><input id="yarnComposition" name="yarnComposition" placeholder="70% 羊毛 / 30% 尼龙" /></div>
          <div class="field"><label for="yarnCount">纱支</label><input id="yarnCount" name="yarnCount" placeholder="2/30 NM" /></div>
          <div class="field"><label for="needleType">针型</label><input id="needleType" name="needleType" placeholder="7GG" /></div>
          <div class="field"><label for="weight">克重</label><input id="weight" name="weight" placeholder="520g" /></div>
          <div class="field"><label for="dimensions">尺码</label><input id="dimensions" name="dimensions" placeholder="S-XL" /></div>
          <div class="field"><label for="tags">标签</label><input id="tags" name="tags" placeholder="绞花, 半高领, 女装" /></div>
          <div class="field full"><label for="colors">颜色 / 变体</label><input id="colors" name="colors" placeholder="燕麦色 / 深海蓝 / 炭灰" /><span class="field-hint">多个颜色用逗号或斜杠分隔。</span></div>
          <div class="field full"><label for="craftNotes">工艺备注</label><textarea id="craftNotes" name="craftNotes" placeholder="记录版型、组织、工艺风险和客户特殊要求"></textarea></div>
          ${customFields.map((field) => `<div class="field"><label for="custom-${escapeHtml(field.key)}">${escapeHtml(field.label)}</label>${field.type === 'select' ? `<select id="custom-${escapeHtml(field.key)}" name="custom-${escapeHtml(field.key)}"><option value="">请选择</option>${(field.options || []).map((option) => `<option>${escapeHtml(option)}</option>`).join('')}</select>` : `<input id="custom-${escapeHtml(field.key)}" name="custom-${escapeHtml(field.key)}" placeholder="填写${escapeHtml(field.label)}" />`}</div>`).join('')}
        </div>
        <div class="form-actions"><button class="button ghost" type="reset">清空</button><button class="button" type="submit">保存款号</button></div>
      </section>
      <aside class="form-panel">
        <h2>参考图片</h2><p>上传正面、侧面、细节图或聊天截图。多角度图片会共同参与后续找款。</p>
        <div class="asset-drop"><div class="asset-drop-icon">▧</div><strong>拖入图片或点击上传</strong><p>首版会保存原图，并生成可替换的本地图片指纹适配器。</p><label class="button secondary small">选择图片<input id="new-style-image-input" type="file" accept="image/*" multiple hidden /></label></div>
        <div class="asset-preview" id="new-style-asset-preview">${state.newStyleImages.map((image) => `<img src="${image.data}" alt="${escapeHtml(image.name)}" />`).join('')}</div>
      </aside>
    </form>
  `;
}

function reviewMarkup() {
  return `
    ${pageHeading('审核队列', '来自飞书群、图片识别和批量导入的资料，先在这里确认，再进入正式资料库。', `<button class="button ghost" data-route="settings">查看权限</button>`)}
    <section class="section-panel"><div class="panel-heading"><h2>待审核资料</h2><span>AI 只提供候选，不会自动覆盖正式记录</span></div><div class="panel-body"><div class="review-list" id="review-list"><div class="empty">正在加载...</div></div></div></section>
  `;
}

function importsMarkup() {
  return `
    ${pageHeading('批量导入', '支持从 Excel 另存的 CSV 或 TSV 模板导入款号。系统会先预览并标出重复、缺失和异常行。', `<button class="button secondary" data-action="download-template">⇩ 下载模板</button>`)}
    <div class="import-layout">
      <section class="form-panel">
        <h2>导入内容</h2><p>可以选择文件，也可以直接把表格内容粘贴进来。正式导入不会覆盖已有款号。</p>
        <label class="upload-button" style="margin-bottom:12px">▧ 选择 CSV / TSV 文件<input id="import-file-input" type="file" accept=".csv,.tsv,.txt,.xlsx" /></label>
        <textarea class="template-box" id="import-text" spellcheck="false">${escapeHtml(state.importText)}</textarea>
        <div class="form-actions"><button class="button ghost" data-action="clear-import">清空</button><button class="button secondary" data-action="preview-import">预览检查</button><button class="button" data-action="commit-import" ${state.importPreview?.valid ? '' : 'disabled'}>确认导入</button></div>
      </section>
      <aside class="form-panel">
        <h2>导入规则</h2><p>推荐使用下列字段名；中文字段名也支持。</p>
        <div class="tag-row"><span class="tag">款号*</span><span class="tag">款名</span><span class="tag">纱线成分</span><span class="tag">颜色</span><span class="tag">标签</span></div>
        <div class="import-summary">${state.importPreview ? `<div class="import-stat"><span>总行数</span><strong>${state.importPreview.total}</strong></div><div class="import-stat"><span>可导入</span><strong>${state.importPreview.valid}</strong></div><div class="import-stat"><span>需处理</span><strong>${state.importPreview.errorCount}</strong></div>` : '<div class="empty" style="grid-column:1/-1;padding:20px 0">预览后显示检查结果</div>'}</div>
        ${state.importPreview?.errors?.length ? `<div class="error-list">${state.importPreview.errors.slice(0, 8).map((error) => `<div class="error-item">第 ${error.row} 行：${escapeHtml(error.message)}</div>`).join('')}</div>` : ''}
        <div class="field-hint" style="margin-top:16px">当前 MVP 直接处理 CSV / TSV。来自 Excel 的工作簿可先“另存为 CSV UTF-8”，字段和导入流程保持一致。</div>
      </aside>
    </div>
  `;
}

function settingsMarkup() {
  return `
    ${pageHeading('系统设置', '配置团队可检索的字段和默认权限。报价权限独立于普通款式信息。', `<button class="button secondary" data-action="focus-custom-field">＋ 新增字段</button>`)}
    <div class="settings-grid">
      <section class="form-panel">
        <h2>自定义字段</h2><p>管理员和负责人可以增加业务字段，不需要改数据库结构。</p>
        <table class="field-table"><thead><tr><th>字段</th><th>类型</th><th>选项</th></tr></thead><tbody>${state.customFields.map((field) => `<tr><td><strong>${escapeHtml(field.label)}</strong><span>${escapeHtml(field.key)}</span></td><td>${escapeHtml(field.type)}</td><td>${escapeHtml((field.options || []).join(' / ') || '—')}</td></tr>`).join('')}</tbody></table>
        <form id="custom-field-form" style="margin-top:18px"><div class="form-grid"><div class="field"><label for="field-label">字段名称</label><input id="field-label" name="label" required placeholder="例如 洗水要求" /></div><div class="field"><label for="field-key">字段标识</label><input id="field-key" name="key" required placeholder="wash_note" /></div><div class="field"><label for="field-type">字段类型</label><select id="field-type" name="type"><option value="text">文本</option><option value="select">单选</option><option value="number">数字</option><option value="date">日期</option></select></div><div class="field"><label for="field-options">选项</label><input id="field-options" name="options" placeholder="仅单选字段填写，用逗号分隔" /></div></div><div class="form-actions"><button class="button" type="submit">保存字段</button></div></form>
      </section>
      <section class="form-panel">
        <h2>角色权限</h2><p>报价字段、批量导入和审核操作默认按角色保护。</p>
        <div class="role-list">
          <div class="role-item"><div class="role-badge">管</div><div><strong>管理员</strong><p>全部款号、报价、字段、用户和日志权限。</p></div></div>
          <div class="role-item"><div class="role-badge">责</div><div><strong>负责人 / 主管</strong><p>查看团队资料，审核资料，新增报价和管理字段。</p></div></div>
          <div class="role-item"><div class="role-badge">业</div><div><strong>业务员</strong><p>检索和新增款号；默认隐藏历史报价，等待授权后查看。</p></div></div>
          <div class="role-item"><div class="role-badge">只</div><div><strong>只读用户</strong><p>只可检索和查看被授权的基础款式信息。</p></div></div>
        </div>
        <div class="detail-section"><h3>飞书接入准备</h3><div class="quote-locked">⌁ 接收地址：<strong>/api/feishu/events</strong><br />在飞书自建应用中配置事件订阅后即可接收群资料。</div></div>
      </section>
    </div>
  `;
}

function detailModalMarkup(style) {
  const quoteVisible = state.user?.role === 'admin' || state.user?.role === 'manager';
  const quotes = style.quotes || [];
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(style.styleNo)}" data-modal-content>
        <div class="modal-head"><div><div class="eyebrow">${escapeHtml(style.styleNo)} · ${escapeHtml(style.category)}</div><h2>${escapeHtml(style.name)}</h2><p>${escapeHtml(style.customer)} · ${escapeHtml(style.owner)} · 最近更新 ${formatDate(style.updatedAt)}</p></div><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button></div>
        <div class="modal-body">
          <div class="detail-grid">
            <div><div class="gallery">${(style.assets || []).map((asset) => `<div><div class="gallery-image"><img src="${escapeHtml(asset.url)}" alt="${escapeHtml(asset.label)}" onerror="this.style.display='none'"></div><div class="gallery-label">${escapeHtml(asset.label)} · ${escapeHtml(asset.source || '资料')}</div></div>`).join('')}</div></div>
            <div>
              <div class="detail-section"><h3>核心参数</h3><div class="data-grid">${[['状态', statusTag(style.status)], ['纱线成分', style.yarnComposition], ['纱支', style.yarnCount], ['针型', style.needleType], ['克重', style.weight], ['尺码', style.dimensions], ['季节', style.season], ['客户', style.customer], ['生产工厂', style.customFields?.origin || '—']].map(([label, value]) => `<div class="data-item"><span>${label}</span><strong>${typeof value === 'string' && value.startsWith('<span') ? value : escapeHtml(value || '—')}</strong></div>`).join('')}</div></div>
              <div class="detail-section"><h3>标签与工艺</h3><div class="tag-row">${(style.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('') || '<span class="field-hint">暂无标签</span>'}</div><p class="field-hint" style="margin-top:12px;line-height:1.65">${escapeHtml(style.craftNotes || '暂无工艺备注')}</p></div>
              <div class="detail-section"><h3>颜色 / 版本</h3><div class="variant-list">${(style.variants || []).map((variant) => `<div class="variant"><strong>${escapeHtml(variant.color || '未命名')}</strong><span>${escapeHtml(variant.colorCode || '无色号')} · ${escapeHtml(variant.sizes || '未设尺码')} · ${escapeHtml(variant.version || 'V1')}</span></div>`).join('') || '<span class="field-hint">暂无变体</span>'}</div></div>
            </div>
          </div>
          <div class="detail-section"><h3>历史报价</h3>${quoteVisible ? `<div class="quote-table-wrap"><table class="quote-table"><thead><tr><th>客户</th><th>数量区间</th><th>报价</th><th>贸易条款</th><th>有效期</th><th>报价日期</th></tr></thead><tbody>${quotes.map((quote) => `<tr><td><strong>${escapeHtml(quote.customer)}</strong></td><td>${quote.minQty || 0} - ${quote.maxQty || '∞'}</td><td><strong>${formatMoney(quote)}</strong></td><td>${escapeHtml(quote.terms)}</td><td>${escapeHtml(quote.validUntil || '—')}</td><td>${escapeHtml(quote.quotedAt || '—')}</td></tr>`).join('') || '<tr><td colspan="6">暂无报价记录</td></tr>'}</tbody></table></div><form class="quote-form" id="quote-form"><div class="field"><label>客户</label><input name="customer" placeholder="客户名称" required /></div><div class="field"><label>起订量</label><input name="minQty" type="number" placeholder="300" /></div><div class="field"><label>单价 USD</label><input name="unitPrice" type="number" step="0.01" placeholder="18.50" required /></div><div class="field"><label>有效期</label><input name="validUntil" type="date" /></div><button class="button small" type="submit">新增报价</button></form>` : '<div class="quote-locked">▣ 当前角色暂不可见报价字段。请切换管理员或负责人查看历史报价。</div>'}</div>
        </div>
      </div>
    </div>
  `;
}

function render() {
  let content = '';
  if (state.route === 'dashboard') content = dashboardMarkup();
  if (state.route === 'search') content = searchMarkup();
  if (state.route === 'new') content = newStyleMarkup();
  if (state.route === 'review') content = reviewMarkup();
  if (state.route === 'imports') content = importsMarkup();
  if (state.route === 'settings') content = settingsMarkup();
  $('#app').innerHTML = shellMarkup(content);
  bindEvents();
  if (state.route === 'review') loadReviewQueue();
}

async function loadDashboard() {
  state.dashboard = await api('/api/dashboard');
  render();
}

async function loadSearch() {
  const result = await api('/api/search', { method: 'POST', body: JSON.stringify({ query: state.searchQuery || '', filters: state.filters || {}, imageData: state.searchImageData || '' }) });
  state.searchResults = result.items;
  state.searchMeta = result.searchMeta;
  render();
}

async function openStyle(id) {
  try {
    const result = await api(`/api/styles/${id}`);
    state.selectedStyle = result.item;
    render();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function loadReviewQueue() {
  try {
    const result = await api('/api/review-queue');
    const target = $('#review-list');
    if (target) target.innerHTML = result.items.length ? result.items.map((item) => reviewItemMarkup(item)).join('') : '<div class="empty">当前没有待处理资料</div>';
  } catch (error) {
    toast(error.message, 'error');
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}

function downloadTemplate() {
  const blob = new Blob([state.importText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'woxia-style-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function formDataObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function bindEvents() {
  $$('[data-route]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const route = button.dataset.route;
      if (route) {
        state.route = route;
        state.selectedStyle = null;
        render();
        if (route === 'search' && !state.searchResults.length) loadSearch().catch((error) => toast(error.message, 'error'));
      }
    });
  });
  $$('.style-row, .result-card').forEach((item) => item.addEventListener('click', () => openStyle(item.dataset.styleId)));
  $('#role-select')?.addEventListener('change', (event) => {
    state.role = event.target.value;
    localStorage.setItem('woxia-role', state.role);
    api('/api/me').then((result) => { state.user = result.user; toast(`已切换为${result.user.role === 'admin' ? '管理员' : result.user.role === 'manager' ? '负责人' : result.user.role === 'sales' ? '业务员' : '只读用户'}`); render(); }).catch((error) => toast(error.message, 'error'));
  });
  $('[data-action="close-modal"]')?.addEventListener('click', (event) => {
    if (event.target.dataset.action === 'close-modal' || event.target.closest('.modal-close')) {
      state.selectedStyle = null;
      render();
    }
  });
  $('[data-action="toggle-mobile-menu"]')?.addEventListener('click', () => toast('请使用底部导航切换功能'));
  $('[data-action="clear-search-image"]')?.addEventListener('click', () => { state.searchImageData = ''; state.searchImageName = ''; render(); });
  $('#search-image-input')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.searchImageData = await readFileAsDataUrl(file);
    state.searchImageName = file.name;
    render();
  });
  $('#search-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    state.searchQuery = form.get('query') || $('#search-query')?.value || '';
    state.filters = { category: form.get('category') || '', season: form.get('season') || '', customer: form.get('customer') || '', status: form.get('status') || '' };
    try { await loadSearch(); } catch (error) { toast(error.message, 'error'); }
  });
  $('#new-style-image-input')?.addEventListener('change', async (event) => {
    const files = [...(event.target.files || [])].slice(0, 6);
    state.newStyleImages = await Promise.all(files.map(async (file) => ({ name: file.name, data: await readFileAsDataUrl(file) })));
    render();
  });
  $('#new-style-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = formDataObject(event.target);
    const customFields = {};
    state.customFields.forEach((field) => { if (values[`custom-${field.key}`]) customFields[field.key] = values[`custom-${field.key}`]; });
    const colors = String(values.colors || '').split(/[|/、，,]/).map((color) => color.trim()).filter(Boolean);
    try {
      const result = await api('/api/styles', { method: 'POST', body: JSON.stringify({ ...values, customFields, colors, tags: values.tags, variants: colors.map((color) => ({ color, sizes: values.dimensions, version: 'V1' })), assets: state.newStyleImages.map((image) => ({ imageData: image.data, imageName: image.name, label: '手机上传', source: '手机录入' })) }) });
      toast(`已保存 ${result.item.styleNo}`);
      state.newStyleImages = [];
      state.route = 'search';
      state.searchQuery = result.item.styleNo;
      await loadSearch();
    } catch (error) { toast(error.message, 'error'); }
  });
  $('[data-action="download-template"]')?.addEventListener('click', downloadTemplate);
  $('[data-action="clear-import"]')?.addEventListener('click', () => { state.importText = ''; state.importPreview = null; render(); });
  $('#import-file-input')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.importFilename = file.name;
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      state.importFileData = await readFileAsDataUrl(file);
      state.importText = '已选择 Excel 工作簿，点击“预览检查”读取首个工作表。';
    } else {
      state.importFileData = '';
      state.importText = await readFileAsText(file);
    }
    render();
  });
  $('[data-action="preview-import"]')?.addEventListener('click', async () => {
    state.importText = $('#import-text')?.value || '';
    try { state.importPreview = await api('/api/imports/preview', { method: 'POST', body: JSON.stringify({ text: state.importText, fileData: state.importFileData, filename: state.importFilename }) }); render(); toast(`检查完成：${state.importPreview.valid} 行可导入`); } catch (error) { toast(error.message, 'error'); }
  });
  $('[data-action="commit-import"]')?.addEventListener('click', async () => {
    state.importText = $('#import-text')?.value || '';
    try { const result = await api('/api/imports/commit', { method: 'POST', body: JSON.stringify({ text: state.importText, fileData: state.importFileData, filename: state.importFilename }) }); toast(`已导入 ${result.imported} 个款号`); state.importPreview = null; state.importFileData = ''; state.route = 'search'; await loadSearch(); } catch (error) { toast(error.message, 'error'); }
  });
  $('[data-action="focus-custom-field"]')?.addEventListener('click', () => $('#field-label')?.focus());
  $('#custom-field-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = formDataObject(event.target);
    try {
      await api('/api/custom-fields', { method: 'POST', body: JSON.stringify({ ...values, options: String(values.options || '').split(/[|/、，,]/).map((item) => item.trim()).filter(Boolean) }) });
      state.customFields = (await api('/api/custom-fields')).items;
      toast('自定义字段已保存');
      render();
    } catch (error) { toast(error.message, 'error'); }
  });
  $$('[data-review-action]').forEach((button) => button.addEventListener('click', async () => {
    try {
      await api(`/api/review-queue/${button.dataset.reviewId}`, { method: 'POST', body: JSON.stringify({ action: button.dataset.reviewAction }) });
      toast(button.dataset.reviewAction === 'approve' ? '已通过审核' : '已驳回资料');
      if (state.route === 'review') await loadReviewQueue();
      else { state.dashboard = await api('/api/dashboard'); render(); }
    } catch (error) { toast(error.message, 'error'); }
  }));
  $('#quote-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = formDataObject(event.target);
    try { await api(`/api/styles/${state.selectedStyle.id}/quotes`, { method: 'POST', body: JSON.stringify(values) }); const result = await api(`/api/styles/${state.selectedStyle.id}`); state.selectedStyle = result.item; render(); toast('历史报价已保存'); } catch (error) { toast(error.message, 'error'); }
  });
}

async function boot() {
  try {
    const [me, dashboard, customFields] = await Promise.all([api('/api/me'), api('/api/dashboard'), api('/api/custom-fields')]);
    state.user = me.user;
    state.dashboard = dashboard;
    state.customFields = customFields.items;
    render();
  } catch (error) {
    $('#app').innerHTML = `<div class="empty" style="padding:80px 20px"><strong>系统启动失败</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

boot();
