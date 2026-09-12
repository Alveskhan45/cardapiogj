/* ==================== ESTADO GLOBAL v6 ==================== */
const KEY = 'bebidas_cardapio_v6';

let state = {
  products: [],
  orders: [],
  cart: [],
  coupons: [],
  categories: [],
  bairros: [],
  adminLog: [],
  stockLog: [],
  config: {
    storeName: 'Bebidas Exemplo',
    slogan: 'Sua distribuidora de bebidas geladas',
    whatsapp: '5585985708628',
    phone: '(85) 98570-8628',
    address: 'Rua das estrelas, 1 - Jardim Paraíso',
    minOrder: 15,
    deliveryTime: '30-45 min',
    openTime: '18:00',
    closeTime: '23:00',
    days: 'Seg, Ter, Qua, Qui, Sex, Sáb, Dom',
    hours: 'Seg-Dom 18h-23h',
    freteMode: 'fixo',
    freteFixo: 5,
    freteKmVal: 2.5,
    freteKmGratis: 0,
    freteGratisAcima: 0,
    storeCoords: '',
    payments: ['Pix','Dinheiro','Cartão na entrega'],
    pix: '',
    minStock: 5,
    blockOutOfStock: false,
    showBanner: true,
    colorPrimary: '#d90429',
    colorPrimaryDark: '#a50320',
    themeAccent: '#ffb703',
    themeId: 'classic',
    pixName: '',
    pixCity: '',
    requireAge: false,
    blockWhenClosed: false,
    adminPassword: 'admin123',
    autoBackup: true,
    lastAutoBackup: 0
  }
};

const $ = id => document.getElementById(id);
const uid = () => '_' + Math.random().toString(36).slice(2,9);
const brl = v => 'R$ ' + (Number(v)||0).toFixed(2).replace('.',',');

function toast(msg, ms=2200) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

function closeAll() {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('open'));
}

/* ==================== AUTO-BACKUP (snapshots rotativos) ==================== */
const BACKUP_MAX = 4;
const BACKUP_INTERVAL = 6 * 60 * 60 * 1000;
const bkKey = n => KEY + '_auto_' + n;
let _saveCount = 0;

function save() {
  saveLocalOnly();
  _saveCount++;
  if (state.config.autoBackup !== false) maybeAutoBackup();
  scheduleServerPush();
}

function maybeAutoBackup() {
  const now = Date.now();
  const last = state.config.lastAutoBackup || 0;
  if (now - last < BACKUP_INTERVAL) return;
  state.config.lastAutoBackup = now;
  const snap = { at: new Date().toISOString(), data: state };
  try {
    localStorage.removeItem(bkKey(BACKUP_MAX));
    for (let i = BACKUP_MAX - 1; i >= 1; i--) {
      const v = localStorage.getItem(bkKey(i));
      if (v) localStorage.setItem(bkKey(i + 1), v);
    }
    localStorage.setItem(bkKey(1), JSON.stringify(snap));
  } catch (e) { console.warn('Auto-backup falhou:', e); }
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

/* ==================== SINCRONIZAÇÃO COM O SERVIDOR ==================== */
const TOKEN_KEY = KEY + '_admin_token';
let SERVER_OK = false;
let _pushTimer = null;

function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

async function api(path, opts = {}) {
  const o = Object.assign({}, opts);
  o.headers = Object.assign({}, opts.headers || {});
  if (o.body && !(o.body instanceof FormData)) o.headers['Content-Type'] = 'application/json';
  const t = getToken();
  if (t && !o.headers['x-token']) o.headers['x-token'] = t;
  try {
    const r = await fetch(path, o);
    return await r.json();
  } catch (e) {
    return null;
  }
}

function serverPayload() {
  const cfg = Object.assign({}, state.config);
  delete cfg.adminPassword;
  delete cfg.adminPasswordHash;
  return {
    products: state.products,
    orders: state.orders,
    coupons: state.coupons,
    categories: state.categories,
    bairros: state.bairros,
    adminLog: state.adminLog,
    stockLog: state.stockLog,
    config: cfg
  };
}

function applyServerState(data) {
  if (!data) return;
  if (Array.isArray(data.products)) state.products = data.products;
  if (Array.isArray(data.orders)) state.orders = data.orders;
  if (Array.isArray(data.coupons)) state.coupons = data.coupons;
  if (Array.isArray(data.categories)) state.categories = data.categories;
  if (Array.isArray(data.bairros)) state.bairros = data.bairros;
  if (Array.isArray(data.adminLog)) state.adminLog = data.adminLog;
  if (Array.isArray(data.stockLog)) state.stockLog = data.stockLog;
  if (data.config) {
    const localPass = state.config.adminPassword;
    state.config = Object.assign({}, state.config, data.config, { adminPassword: localPass });
  }
}

function saveLocalOnly() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function scheduleServerPush() {
  if (!isAdminUnlocked()) return;
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(pushState, 600);
}

async function pushState() {
  _pushTimer = null;
  const res = await api('/api/admin/state', { method: 'PUT', body: serverPayload() });
  if (res && res.ok === false && (res.error === 'Não autorizado' || res.status === 401)) {
    setToken('');
  }
}

async function pullPublic() {
  const res = await api('/api/public', { method: 'GET' });
  if (res && res.ok && res.state) {
    applyServerState(res.state);
    saveLocalOnly();
    SERVER_OK = true;
    return true;
  }
  return false;
}

async function pullAdmin() {
  const res = await api('/api/admin/state', { method: 'GET' });
  if (res && res.ok && res.state) {
    applyServerState(res.state);
    saveLocalOnly();
    SERVER_OK = true;
    return true;
  }
  return false;
}

async function refreshFromServer() {
  saveLocalOnly();
  return getToken() ? pullAdmin() : pullPublic();
}

function listAutoBackups() {
  const out = [];
  for (let i = 1; i <= BACKUP_MAX; i++) {
    const raw = localStorage.getItem(bkKey(i));
    if (!raw) continue;
    try {
      const snap = JSON.parse(raw);
      out.push({ key: bkKey(i), at: snap.at, data: snap.data });
    } catch (e) { /* ignora snapshot corrompido */ }
  }
  return out;
}

function downloadAutoBackup(data) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch (e) {
    toast('Erro ao baixar backup');
  }
}

function restoreAutoBackup(key, confirm) {
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  let snap;
  try { snap = JSON.parse(raw); } catch (e) { return false; }
  const data = snap.data || snap;
  if (confirm && !confirm(`Restaurar o backup de ${snap.at ? new Date(snap.at).toLocaleString('pt-BR') : 'data desconhecida'}?\nOs dados atuais serão substituídos.`)) return false;
  state = { ...state, ...data, adminLog: data.adminLog || [], stockLog: data.stockLog || [] };
  save();
  renderCats(); renderCart(); renderAdmin();
  toast('✅ Backup restaurado');
  return true;
}

/* ==================== HORÁRIO REAL (aberto/fechado) ==================== */
const DIAS_PT = ['dom','seg','ter','qua','qui','sex','sab'];
const normKey = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

function isStoreOpen() {
  const c = state.config;
  if (!c.openTime || !c.closeTime) return true;
  const now = new Date();
  const todayKey = DIAS_PT[now.getDay()];
  const days = (c.days || '').trim();
  if (days) {
    const inDays = days.split(',').map(d => normKey(d).slice(0,3)).includes(todayKey);
    if (!inDays) return false;
  }
  const [oh, om] = c.openTime.split(':').map(Number);
  const [ch, cm] = c.closeTime.split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  if (open === close) return true;
  return close > open ? (cur >= open && cur < close) : (cur >= open || cur < close);
}

/* ==================== SENHA (hash SHA-256) ==================== */
function hashPass(pass) {
  const input = 'bebidas::' + (pass || '');
  if (crypto && crypto.subtle) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
      .then(buf => 'sha256$' + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join(''));
  }
  return Promise.resolve('plain$' + input);
}

async function verifyPass(pass, stored) {
  const s = stored || 'admin123';
  if (s.startsWith('sha256$')) return (await hashPass(pass)) === s;
  if (s.startsWith('plain$')) return s === 'plain$' + 'bebidas::' + (pass || '');
  return s === pass;
}

function passwordNeedsMigration(stored) {
  const s = stored || 'admin123';
  return !s.startsWith('sha256$');
}

async function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch(e){ console.warn(e); }

  const online = await pullPublic();

  if (!online && (!state.products || !state.products.length)) seed();

  if (!state.categories || !state.categories.length) {
    state.categories = [...new Set(state.products.map(p=>p.category).filter(Boolean))];
  }
  if (!state.bairros) state.bairros = [];
  if (!state.adminLog) state.adminLog = [];
  if (!state.stockLog) state.stockLog = [];
  if (state.config.autoBackup === undefined) state.config.autoBackup = true;
  if (state.config.pollingMs === undefined) state.config.pollingMs = 15000;
  state.config.pixName = state.config.pixName || '';
  state.config.pixCity = state.config.pixCity || '';
  state.config.requireAge = !!state.config.requireAge;
  state.config.blockWhenClosed = !!state.config.blockWhenClosed;
}

function seed() {
  state.products = [
    { id:uid(), name:'Coca-Cola', desc:'Refrigerante gelado', price:6.00, promoPrice:null, cost:2.5, category:'Refrigerantes', stock:40, image:'🥤', highlight:true, promo:false, active:true,
      variations:[{name:'Lata 350ml',price:0},{name:'PET 600ml',price:2},{name:'2 Litros',price:6}],
      extras:[{name:'Copo com gelo',price:1},{name:'Limão extra',price:0.5}] },
    { id:uid(), name:'Guaraná Antarctica', desc:'Garrafa família', price:12.00, promoPrice:9.90, cost:6, category:'Refrigerantes', stock:25, image:'🥤', highlight:false, promo:true, active:true,
      variations:[{name:'1 Litro',price:0},{name:'2 Litros',price:3}], extras:[] },
    { id:uid(), name:'Suco de Laranja Natural', desc:'Espremido na hora', price:10.00, promoPrice:null, cost:4, category:'Sucos', stock:15, image:'🍊', highlight:true, promo:false, active:true,
      variations:[{name:'500ml',price:0},{name:'1 Litro',price:5}],
      extras:[{name:'Sem açúcar',price:0},{name:'Com gelo',price:0}] },
    { id:uid(), name:'Suco de Morango', desc:'Natural, sem conservantes', price:10.00, promoPrice:null, cost:4, category:'Sucos', stock:12, image:'🍓', highlight:false, promo:false, active:true, variations:[], extras:[] },
    { id:uid(), name:'Água Mineral', desc:'Sem gás, gelada', price:3.00, promoPrice:null, cost:1, category:'Águas', stock:50, image:'💧', highlight:false, promo:false, active:true,
      variations:[{name:'500ml',price:0},{name:'1,5 Litro',price:3}], extras:[] },
    { id:uid(), name:'Água com Gás', desc:'Com gás, gelada', price:4.00, promoPrice:null, cost:1.2, category:'Águas', stock:30, image:'💧', highlight:false, promo:false, active:true, variations:[], extras:[] },
    { id:uid(), name:'Heineken Long Neck', desc:'330ml, bem gelada', price:9.90, promoPrice:null, cost:5, category:'Cervejas', stock:24, image:'🍺', highlight:false, promo:false, active:true,
      variations:[{name:'Unidade',price:0},{name:'Pack 6',price:45}],
      extras:[{name:'Copo',price:1}] },
    { id:uid(), name:'Brahma Lata', desc:'350ml, gelada', price:5.00, promoPrice:4.50, cost:2.5, category:'Cervejas', stock:40, image:'🍺', highlight:false, promo:true, active:true, variations:[], extras:[] },
    { id:uid(), name:'Red Bull', desc:'Energético tradicional', price:12.00, promoPrice:null, cost:6, category:'Energéticos', stock:18, image:'⚡', highlight:true, promo:false, active:true, variations:[], extras:[] },
    { id:uid(), name:'Vinho Tinto Reservado', desc:'Cabernet Sauvignon', price:45.00, promoPrice:null, cost:22, category:'Vinhos', stock:8, image:'🍷', highlight:false, promo:false, active:true, variations:[], extras:[] }
  ];
  state.coupons = [
    { id:uid(), code:'BEMVINDO10', type:'percent', value:10, min:20, active:true, uses:0, limit:0 },
    { id:uid(), code:'FRETE5', type:'fixed', value:5, min:30, active:true, uses:0, limit:0 }
  ];
  state.bairros = [
    { id:uid(), name:'Centro', tax:5, km:2 },
    { id:uid(), name:'Jardim Gurilândia', tax:8, km:4 },
    { id:uid(), name:'Vila Nova', tax:12, km:7 }
  ];
  state.categories = ['Refrigerantes','Sucos','Águas','Cervejas','Energéticos','Vinhos'];
  state.adminLog = [];
  state.stockLog = [];
  save();
}

function applyTheme() {
  const c = state.config;
  document.documentElement.style.setProperty('--primary', c.colorPrimary || '#d90429');
  document.documentElement.style.setProperty('--primary-dark', c.colorPrimaryDark || '#a50320');
  document.documentElement.style.setProperty('--accent', c.themeAccent || '#ffb703');
  setTheme(currentTheme());
}

/* ==================== TEMA (claro/escuro + presets) ==================== */
const THEME_KEY = KEY + '_theme';
function currentTheme() { try { return localStorage.getItem(THEME_KEY) || 'light'; } catch(e) { return 'light'; } }
function setTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  try { localStorage.setItem(THEME_KEY, mode); } catch(e) {}
  const b = $('btnTheme');
  if (b) b.textContent = mode === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); }

const THEMES = [
  { id: 'classic',   name: 'Clássico', primary: '#d90429', dark: '#a50320', accent: '#ffb703' },
  { id: 'tropical',  name: 'Tropical', primary: '#0e9f6e', dark: '#0b7a54', accent: '#ffd166' },
  { id: 'cerveja',   name: 'Cerveja',  primary: '#f59e0b', dark: '#d97706', accent: '#ffedd5' },
  { id: 'refresco',  name: 'Refresco', primary: '#0e7490', dark: '#155e75', accent: '#7dd3fc' },
  { id: 'forro',     name: 'Forró',    primary: '#4f46e5', dark: '#4338ca', accent: '#f5d547' },
  { id: 'elegante',  name: 'Elegante', primary: '#b91c1c', dark: '#7f1d1d', accent: '#e2b93b' }
];

function applyThemePreset(pid) {
  const t = THEMES.find(x => x.id === pid) || THEMES[0];
  state.config.themeId = t.id;
  state.config.colorPrimary = t.primary;
  state.config.colorPrimaryDark = t.dark;
  state.config.themeAccent = t.accent;
  applyTheme();
}

/* ==================== FAVORITOS (no aparelho) ==================== */
const FAV_KEY = KEY + '_favs';
function getFavs() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) { return []; } }
function saveFavs(f) { try { localStorage.setItem(FAV_KEY, JSON.stringify(f)); } catch(e) {} }
function toggleFav(id) {
  const f = getFavs();
  const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  saveFavs(f);
  updateFavUI();
  return f.includes(id);
}
function isFav(id) { return getFavs().includes(id); }

/* ==================== MEUS PEDIDOS (no aparelho) ==================== */
const MY_ORDERS_KEY = KEY + '_my_orders';
function getMyOrders() { try { return JSON.parse(localStorage.getItem(MY_ORDERS_KEY) || '[]'); } catch(e) { return []; } }
function saveMyOrders(l) { try { localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(l)); } catch(e) {} }
function pushMyOrder(record) {
  const l = getMyOrders();
  l.unshift(record);
  saveMyOrders(l.slice(0, 20));
}

/* ==================== ENDEREÇOS SALVOS (neste aparelho) ==================== */
const ADDR_KEY = KEY + '_addresses';
function getSavedAddresses() { try { return JSON.parse(localStorage.getItem(ADDR_KEY) || '[]'); } catch(e) { return []; } }
function saveAddresses(l) { try { localStorage.setItem(ADDR_KEY, JSON.stringify(l)); } catch(e) {} }
function addSavedAddress(rec) {
  const l = getSavedAddresses().filter(a => !(a.name === rec.name && a.address === rec.address));
  l.unshift(rec);
  saveAddresses(l.slice(0, 5));
}

/* ==================== +18 (bebidas alcoólicas) ==================== */
const AGE_KEY = KEY + '_ageok';
function ageConfirmed() { try { return localStorage.getItem(AGE_KEY) === '1'; } catch(e) { return false; } }
function confirmAge() { try { localStorage.setItem(AGE_KEY, '1'); } catch(e) {} }
function isAlcoholic(p) {
  if (!p) return false;
  if (p.ageRestricted) return true;
  if (!state.config.requireAge) return false;
  return /álcool|alcool|cerveja|vinho|whisky|uísque|uisque|cachaça|cachaca|gin|vodka|tequila|licor|sidra|drink/i.test((p.category || '') + ' ' + (p.name || ''));
}

/* ==================== CUPONS NO APARELHO (limite/cliente) ==================== */
const CPN_KEY = KEY + '_coupon_uses';
function couponDeviceUses(code) {
  try { const m = JSON.parse(localStorage.getItem(CPN_KEY) || '{}') || {}; return m[String(code).toUpperCase()] || 0; } catch(e) { return 0; }
}
function couponDeviceUse(code) {
  try {
    const m = JSON.parse(localStorage.getItem(CPN_KEY) || '{}') || {};
    const k = String(code).toUpperCase();
    m[k] = (m[k] || 0) + 1;
    localStorage.setItem(CPN_KEY, JSON.stringify(m));
  } catch(e) {}
}

/* ==================== PIX (BR Code / copia-e-cola, 100% offline) ==================== */
function crc16CCITT(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
function pixFld(id, val, max) {
  const v = String(val || '').slice(0, max || 99);
  return id + String(v.length).padStart(2, '0') + v;
}
function pixPayload(amount, key, name, city, txid) {
  const merchant = '0014br.gov.bcb.pix' + pixFld('01', key, 77);
  let p = '';
  p += pixFld('00', '01');
  p += pixFld('26', merchant, 99);
  p += pixFld('52', '0000');
  p += pixFld('53', '986');
  p += pixFld('54', (Number(amount) || 0).toFixed(2), 13);
  p += pixFld('58', 'BR');
  p += pixFld('59', (name || key).toUpperCase(), 25);
  p += pixFld('60', (city || 'BRASIL').toUpperCase(), 15);
  p += pixFld('62', pixFld('05', txid || '*', 25), 99);
  p += '6304';
  return p + crc16CCITT(p);
}
function renderPixQR(container, payload, size) {
  if (!container) return;
  container.innerHTML = '';
  if (window.QRCode) {
    new QRCode(container, { text: payload, width: size || 180, height: size || 180, correctLevel: QRCode.CorrectLevel.M });
  } else {
    container.innerHTML = '<div style="font-size:.72rem;word-break:break-all;line-height:1.4">' + payload + '</div>';
  }
}

/* ==================== LOG DE ATIVIDADES ==================== */
function logActivity(icon, text) {
  state.adminLog.unshift({
    icon, text,
    date: new Date().toISOString()
  });
  if (state.adminLog.length > 100) state.adminLog = state.adminLog.slice(0, 100);
  save();
}

function logStock(icon, text) {
  state.stockLog.unshift({
    icon, text,
    date: new Date().toISOString()
  });
  if (state.stockLog.length > 200) state.stockLog = state.stockLog.slice(0, 200);
  save();
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return Math.floor(diff/60) + ' min atrás';
  if (diff < 86400) return Math.floor(diff/3600) + ' h atrás';
  return Math.floor(diff/86400) + ' d atrás';
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
}