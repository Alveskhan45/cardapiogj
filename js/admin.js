/* ==================== ADMIN PRINCIPAL ==================== */
function renderAdmin() {
  renderDashboard();
  renderAdminProducts();
  renderAdminOrders();
  renderReport();
  renderConfig();
  renderCoupons();
  renderBairros();
  renderCategories();
  renderEstoque();
  renderAdminLog();
  renderStockLogList();
  renderStatus();
  populateCategoryFilter();
}

function renderStatus() {
  const el = $('statusBar');
  if (el) {
    const open = isStoreOpen();
    const hours = state.config.hours ? ' • ' + state.config.hours : '';
    el.textContent = open ? ('Aberto' + hours) : ('Fechado no momento' + hours);
    el.classList.toggle('closed', !open);
  }
  const sb = $('sbStoreName'); if (sb) sb.textContent = state.config.storeName;
}

/* ==================== PRODUTOS ==================== */
let selectedProducts = new Set();

function renderAdminProducts() {
  const tb = $('tblProd');
  if (!tb) return;

  const q = ($('prodFilter')?.value || '').toLowerCase();
  const catF = $('prodCatFilter')?.value || '';
  const stockF = $('prodStockFilter')?.value || '';
  const statusF = $('prodStatusFilter')?.value || '';

  let list = state.products.slice();
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
  if (catF) list = list.filter(p => p.category === catF);
  if (stockF === 'low') list = list.filter(p => p.stock <= state.config.minStock && p.stock > 0);
  if (stockF === 'out') list = list.filter(p => p.stock <= 0);
  if (statusF === 'active') list = list.filter(p => p.active !== false);
  if (statusF === 'inactive') list = list.filter(p => p.active === false);
  if (statusF === 'highlight') list = list.filter(p => p.highlight);
  if (statusF === 'promo') list = list.filter(p => p.promo);

  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="7" class="empty">Nenhum produto encontrado</td></tr>';
    updateBulkProd();
    return;
  }

  tb.innerHTML = list.map(p => {
    const price = p.promo && p.promoPrice ? p.promoPrice : p.price;
    const low = p.stock <= state.config.minStock;
    const imgContent = p.image && (p.image.startsWith('http')||p.image.startsWith('assets/')||p.image.startsWith('data:'))
      ? `<img src="${p.image}">` : (p.image || '🥤');
    const flags = [];
    if (p.highlight) flags.push('⭐');
    if (p.promo) flags.push('🔥');
    if (p.ageRestricted) flags.push('🍺');
    if (p.active === false) flags.push('🚫');
    const checked = selectedProducts.has(p.id) ? 'checked' : '';
    return `<tr>
      <td><input type="checkbox" data-check="${p.id}" ${checked}></td>
      <td>
        <div class="prod-cell">
          <div class="prod-thumb">${imgContent}</div>
          <div>
            <div class="prod-name">${p.name}</div>
            <div class="prod-flags">${flags.join(' ') || '—'}</div>
          </div>
        </div>
      </td>
      <td>${p.category || '-'}</td>
      <td><b>${brl(price)}</b>${p.promo && p.promoPrice ? `<br><small style="color:var(--muted);text-decoration:line-through">${brl(p.price)}</small>` : ''}</td>
      <td>${low ? `<span class="badge ${p.stock===0?'danger':'warn'}">${p.stock} ⚠️</span>` : `<span class="badge success">${p.stock}</span>`}</td>
      <td>${p.active !== false ? '<span class="badge success">Ativo</span>' : '<span class="badge gray">Inativo</span>'}</td>
      <td>
        <button class="btn sm primary" data-edit="${p.id}" title="Editar">✏️</button>
        <button class="btn sm danger" data-delp="${p.id}" title="Excluir">🗑</button>
      </td>
    </tr>`;
  }).join('');

  tb.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openProductModal(b.dataset.edit));
  tb.querySelectorAll('[data-delp]').forEach(b => b.onclick = () => {
    const p = state.products.find(x => x.id === b.dataset.delp);
    if (!p) return;
    if (confirm(`Excluir "${p.name}"?`)) {
      state.products = state.products.filter(x => x.id !== p.id);
      selectedProducts.delete(p.id);
      save();
      logActivity('🗑', `Produto excluído: ${p.name}`);
      renderAdminProducts(); renderMenu(); renderDashboard();
      toast('✅ Produto excluído');
    }
  });
  tb.querySelectorAll('[data-check]').forEach(c => c.onchange = () => {
    if (c.checked) selectedProducts.add(c.dataset.check);
    else selectedProducts.delete(c.dataset.check);
    updateBulkProd();
  });

  updateBulkProd();
  populateCategoryFilter();
}

function updateBulkProd() {
  const bar = $('bulkProd');
  const cnt = $('bulkProdCount');
  if (!bar) return;
  if (selectedProducts.size === 0) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  cnt.textContent = selectedProducts.size + ' selecionado' + (selectedProducts.size===1?'':'s');
}

document.addEventListener('DOMContentLoaded', () => {
  const checkAll = $('checkAllProd');
  if (checkAll) checkAll.onchange = () => {
    const boxes = document.querySelectorAll('[data-check]');
    boxes.forEach(b => {
      b.checked = checkAll.checked;
      if (checkAll.checked) selectedProducts.add(b.dataset.check);
      else selectedProducts.delete(b.dataset.check);
    });
    updateBulkProd();
  };

  const bulkDel = $('bulkDeleteProd');
  if (bulkDel) bulkDel.onclick = () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(`Excluir ${selectedProducts.size} produto(s)?`)) return;
    state.products = state.products.filter(p => !selectedProducts.has(p.id));
    logActivity('🗑', `${selectedProducts.size} produto(s) excluído(s) em massa`);
    selectedProducts.clear();
    save(); renderAdminProducts(); renderMenu(); renderDashboard();
    toast('✅ Produtos excluídos');
  };
  const bulkDeact = $('bulkDeactivateProd');
  if (bulkDeact) bulkDeact.onclick = () => {
    state.products.forEach(p => { if (selectedProducts.has(p.id)) p.active = false; });
    logActivity('🚫', `${selectedProducts.size} produto(s) desativado(s)`);
    selectedProducts.clear(); save();
    renderAdminProducts(); renderMenu();
    toast('✅ Produtos desativados');
  };
  const bulkAct = $('bulkActivateProd');
  if (bulkAct) bulkAct.onclick = () => {
    state.products.forEach(p => { if (selectedProducts.has(p.id)) p.active = true; });
    logActivity('✅', `${selectedProducts.size} produto(s) ativado(s)`);
    selectedProducts.clear(); save();
    renderAdminProducts(); renderMenu();
    toast('✅ Produtos ativados');
  };
  const bulkClear = $('bulkClearProd');
  if (bulkClear) bulkClear.onclick = () => {
    selectedProducts.clear();
    document.querySelectorAll('[data-check]').forEach(c => c.checked = false);
    updateBulkProd();
  };
});

function populateCategoryFilter() {
  const sel = $('prodCatFilter');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todas categorias</option>' +
    state.categories.map(c => `<option value="${c}">${c}</option>`).join('');
  sel.value = cur;
}

function exportProductsCSV() {
  const rows = [['Nome','Categoria','Preço','Promo','Custo','Estoque','Ativo','Destaque','Promoção']];
  state.products.forEach(p => {
    rows.push([p.name, p.category, p.price, p.promoPrice||'', p.cost||'', p.stock, p.active?'Sim':'Não', p.highlight?'Sim':'Não', p.promo?'Sim':'Não']);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `produtos-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  toast('📤 CSV exportado');
}

/* ==================== CATEGORIAS ==================== */
function renderCategories() {
  const tb = $('tblCat');
  if (!tb) return;
  if (!state.categories.length) { tb.innerHTML = '<tr><td colspan="5" class="empty">Sem categorias</td></tr>'; return; }
  tb.innerHTML = state.categories.map((c, i) => {
    const count = state.products.filter(p => p.category === c).length;
    return `<tr>
      <td><b>${c}</b></td>
      <td>${categoryEmoji(c)}</td>
      <td>${count} produto${count===1?'':'s'}</td>
      <td>
        <button class="btn sm ghost" data-up="${i}" ${i===0?'disabled':''}>↑</button>
        <button class="btn sm ghost" data-down="${i}" ${i===state.categories.length-1?'disabled':''}>↓</button>
      </td>
      <td>
        <button class="btn sm primary" data-rencat="${c}" title="Renomear">✏️</button>
        <button class="btn sm danger" data-delcat="${c}" title="Excluir">🗑</button>
      </td>
    </tr>`;
  }).join('');

  tb.querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
    const i = +b.dataset.up;
    [state.categories[i-1], state.categories[i]] = [state.categories[i], state.categories[i-1]];
    save(); renderCategories(); renderCats();
  });
  tb.querySelectorAll('[data-down]').forEach(b => b.onclick = () => {
    const i = +b.dataset.down;
    [state.categories[i+1], state.categories[i]] = [state.categories[i], state.categories[i+1]];
    save(); renderCategories(); renderCats();
  });
  tb.querySelectorAll('[data-rencat]').forEach(b => b.onclick = () => {
    const old = b.dataset.rencat;
    const nv = prompt('Novo nome para a categoria:', old);
    if (!nv || nv.trim() === old) return;
    const idx = state.categories.indexOf(old);
    state.categories[idx] = nv.trim();
    state.products.forEach(p => { if (p.category === old) p.category = nv.trim(); });
    save(); logActivity('✏️', `Categoria renomeada: ${old} → ${nv.trim()}`);
    renderCategories(); renderAdminProducts(); renderCats();
    toast('✅ Categoria renomeada');
  });
  tb.querySelectorAll('[data-delcat]').forEach(b => b.onclick = () => {
    const cat = b.dataset.delcat;
    const used = state.products.filter(p => p.category === cat).length;
    if (used > 0) { toast(`Existem ${used} produtos nesta categoria`); return; }
    if (!confirm(`Excluir categoria "${cat}"?`)) return;
    state.categories = state.categories.filter(c => c !== cat);
    save(); logActivity('🗑', `Categoria excluída: ${cat}`);
    renderCategories(); renderCats();
  });
}

function addCategory() {
  const name = prompt('Nome da nova categoria:');
  if (!name || !name.trim()) return;
  if (state.categories.includes(name.trim())) { toast('Já existe'); return; }
  state.categories.push(name.trim());
  save(); logActivity('➕', `Categoria criada: ${name.trim()}`);
  renderCategories(); populateCategoryFilter(); renderCats();
  toast('✅ Categoria criada');
}

/* ==================== PEDIDOS ==================== */
function renderAdminOrders() {
  const tb = $('tblPed');
  if (!tb) return;

  const q = ($('pedFilter')?.value || '').toLowerCase();
  const st = $('pedStatusFilter')?.value || '';
  const period = $('pedPeriodFilter')?.value || '';

  let list = state.orders.slice();

  // Filtro período
  if (period) {
    const now = Date.now();
    const limits = { today: 86400000, '7d': 7*86400000, '30d': 30*86400000 };
    const lim = limits[period] || 0;
    if (period === 'today') {
      const today = new Date().toISOString().slice(0,10);
      list = list.filter(o => (o.createdAt||'').slice(0,10) === today);
    } else if (lim) {
      list = list.filter(o => now - new Date(o.createdAt).getTime() <= lim);
    }
  }

  if (q) list = list.filter(o =>
    String(o.id).includes(q) || (o.customer||'').toLowerCase().includes(q) || (o.phone||'').includes(q));
  if (st) list = list.filter(o => o.status === st);

  // Contadores
  const counts = { pendente:0, preparando:0, entregando:0, entregue:0 };
  state.orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
  const cp = $('cntPend'); if (cp) cp.textContent = counts.pendente;
  const cpr = $('cntPrep'); if (cpr) cpr.textContent = counts.preparando;
  const ce = $('cntEntr'); if (ce) ce.textContent = counts.entregando;
  const cf = $('cntFim'); if (cf) cf.textContent = counts.entregue;

  if (!list.length) { tb.innerHTML = '<tr><td colspan="7" class="empty">Nenhum pedido</td></tr>'; return; }

  tb.innerHTML = list.map(o => `
    <tr>
      <td><b>#${o.id}</b><br><small style="color:var(--muted)">${timeAgo(o.createdAt)}</small></td>
      <td>${o.customer}${o.phone?`<br><small style="color:var(--muted)">${o.phone}</small>`:''}</td>
      <td>${o.items.length} item${o.items.length===1?'':'s'}<br><small style="color:var(--muted)">${o.items.map(i=>`${i.qty}x ${i.name}`).slice(0,2).join(', ')}${o.items.length>2?'...':''}</small></td>
      <td><b>${brl(o.total)}</b><br><small>${o.payment}</small></td>
      <td>${o.delivery ? brl(o.delivery) : '—'}</td>
      <td><span class="status-pill s-${o.status}">${o.status}</span></td>
      <td>
        <button class="btn sm primary" data-vieworder="${o.id}">👁 Ver</button>
        <button class="btn sm info" data-reorder="${o.id}" title="WhatsApp">📱</button>
      </td>
    </tr>`).join('');

  tb.querySelectorAll('[data-vieworder]').forEach(b => b.onclick = () => openOrderDetail(b.dataset.vieworder));
  tb.querySelectorAll('[data-reorder]').forEach(b => b.onclick = () => {
    const o = state.orders.find(x => String(x.id) === b.dataset.reorder);
    if (!o) return;
    let m = `Olá ${o.customer}, seu pedido #${o.id} está com status: *${o.status}*.\nTotal: ${brl(o.total)}`;
    window.open(`https://wa.me/${o.phone ? o.phone.replace(/\D/g,'') : state.config.whatsapp}?text=${encodeURIComponent(m)}`, '_blank');
  });
}

/* ==================== RELATÓRIOS ==================== */
function renderReport() {
  const period = $('relPeriod')?.value || '7d';
  let list = state.orders.filter(o => o.status !== 'cancelado');

  if (period === '7d' || period === '30d') {
    const lim = period === '7d' ? 7*86400000 : 30*86400000;
    const now = Date.now();
    list = list.filter(o => now - new Date(o.createdAt).getTime() <= lim);
  }

  const total = list.reduce((s,o) => s + o.total, 0);
  const costById = {};
  state.products.forEach(p => costById[p.name] = p.cost || 0);
  const lucro = list.reduce((s,o) => s + o.items.reduce((s2,i) => s2 + (i.total - (costById[i.name]||0) * i.qty), 0), 0);
  $('relVendas').textContent = brl(total);
  $('relPedidos').textContent = list.length;
  $('relTicket').textContent = list.length ? brl(total/list.length) : 'R$ 0';
  $('relFrete').textContent = brl(list.reduce((s,o) => s + (o.delivery||0), 0));
  const elLucro = $('relLucro'); if (elLucro) { elLucro.textContent = brl(lucro); elLucro.style.color = lucro >= 0 ? 'var(--success)' : 'var(--danger)'; }

  // Top produtos (quantidade + receita)
  const counts = {}, revs = {};
  list.forEach(o => o.items.forEach(i => {
    counts[i.name] = (counts[i.name]||0) + i.qty;
    revs[i.name] = (revs[i.name]||0) + (i.total||0);
  }));
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const topMax = Math.max(...top.map(([,q]) => q), 1);
  $('relTop').innerHTML = top.length
    ? top.map(([n,q]) => `<div class="dash-item"><span><b>${q} un</b> • ${n}<br><small style="color:var(--muted)">${brl(revs[n]||0)}</small></span></div>`).join('')
    : '<div class="dash-empty">Sem dados</div>';

  // Pagamentos
  const pays = {};
  list.forEach(o => pays[o.payment] = (pays[o.payment]||0) + 1);
  const payArr = Object.entries(pays).sort((a,b)=>b[1]-a[1]);
  const totP = list.length || 1;
  $('relPag').innerHTML = payArr.length
    ? payArr.map(([p,c]) => `<div class="dash-item"><span>${p}</span><div style="display:flex;align-items:center;gap:8px"><b>${c}</b><small style="color:var(--muted);width:34px;text-align:right">${Math.round(c/totP*100)}%</small></div></div>`).join('')
    : '<div class="dash-empty">Sem dados</div>';

  // Tipo
  const tipos = {};
  list.forEach(o => tipos[o.type] = (tipos[o.type]||0) + 1);
  const tpArr = Object.entries(tipos);
  $('relTipo').innerHTML = tpArr.length
    ? tpArr.map(([t,c]) => `<div class="dash-item"><span>${t}</span><b>${c}</b></div>`).join('')
    : '<div class="dash-empty">Sem dados</div>';

  // Cupons
  const cups = {};
  list.filter(o => o.coupon).forEach(o => cups[o.coupon] = (cups[o.coupon]||0) + 1);
  const cArr = Object.entries(cups);
  $('relCupons').innerHTML = cArr.length
    ? cArr.map(([c,q]) => `<div class="dash-item"><span>${c}</span><b>${q}x</b></div>`).join('')
    : '<div class="dash-empty">Sem dados</div>';

  // Curva ABC (por receita de produto, A=80%, B=15%, C=5%)
  const abcRev = {}, abcp = {};
  list.forEach(o => o.items.forEach(i => {
    abcRev[i.name] = (abcRev[i.name]||0) + (i.total||0);
    abcp[i.name] = (abcp[i.name]||0) + (i.total - (costById[i.name]||0)*i.qty);
  }));
  const abcSorted = Object.entries(abcRev).sort((a,b) => b[1]-a[1]);
  const abcTotal = abcRev && (Object.values(abcRev).reduce((s,v) => s+v, 0) || 0);
  let acc = 0;
  const elABC = $('relABC');
  if (elABC) {
    if (!abcSorted.length) elABC.innerHTML = '<div class="dash-empty">Sem dados</div>';
    else elABC.innerHTML = abcSorted.map(([n, rv]) => {
      acc += rv / abcTotal;
      const cls = acc <= 0.80 ? 'A' : (acc <= 0.95 ? 'B' : 'C');
      return `<div class="dash-item"><span class="abc-enc">${cls}</span><span><b>${n}</b><br><small style="color:var(--muted)">${brl(rv)} • lucro ${brl(abcp[n]||0)}</small></span></div>`;
    }).join('');
  }

  // Vendas por dia (período)
  const days = {};
  list.forEach(o => {
    const d = (o.createdAt||'').slice(0,10);
    days[d] = days[d] || { rev:0, n:0 };
    days[d].rev += o.total;
    days[d].n++;
  });
  const dArr = Object.entries(days).sort((a,b) => a[0] < b[0] ? 1 : -1);
  const dMax = Math.max(...dArr.map(([,v]) => v.rev), 1);
  const elDias = $('relDias');
  if (elDias) {
    elDias.innerHTML = dArr.length
      ? dArr.map(([d,v]) => {
          const dt = new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit' });
          const pct = Math.round(v.rev/dMax*100);
          return `<div class="day-row"><div class="dw"><b>${dt}</b><small>${v.n} pedido${v.n===1?'':'s'}</small></div><div class="dbar"><i style="width:${pct}%"></i></div><div class="dv">${brl(v.rev)}</div></div>`;
        }).join('')
      : '<div class="dash-empty">Sem vendas no período</div>';
  }

  // Ligar export
  const be = $('btnExportRel'); if (be) be.onclick = () => exportReportCSV(list);
}

function exportReportCSV(list) {
  const rows = [['#','Data','Cliente','Telefone','Tipo','Pagamento','Total','Frete','Status']];
  list.forEach(o => {
    rows.push([o.id, fmtDateTime(o.createdAt), o.customer, o.phone||'', o.type, o.payment, o.total.toFixed(2), (o.delivery||0).toFixed(2), o.status]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `relatorio-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  toast('📤 Relatório exportado');
}

/* ==================== CUPONS ==================== */
function renderCoupons() {
  const tb = $('tblCup');
  if (!tb) return;
  if (!state.coupons.length) { tb.innerHTML = '<tr><td colspan="6" class="empty">Nenhum cupom</td></tr>'; return; }
  tb.innerHTML = state.coupons.map(c => {
    const valueText = c.type === 'percent' ? c.value + '%' : (c.type === 'frete' ? '🛵 Frete grátis' : brl(c.value));
    const badges = [];
    if (c.first) badges.push('<span class="badge warn">1ª compra</span>');
    if (c.per > 0) badges.push(`<span class="badge gray">${c.per}x/cliente</span>`);
    return `
    <tr>
      <td><b>${c.code}</b><br>${badges.join(' ')}</td>
      <td>${valueText}</td>
      <td>${brl(c.min)}</td>
      <td>${c.uses||0}${c.limit?' / '+c.limit:''}</td>
      <td>${c.active?'<span class="badge success">Ativo</span>':'<span class="badge gray">Inativo</span>'}</td>
      <td>
        <button class="btn sm ${c.active?'warning':'success'}" data-toggle="${c.id}">${c.active?'Desativar':'Ativar'}</button>
        <button class="btn sm danger" data-delc="${c.id}">🗑</button>
      </td>
    </tr>`;
  }).join('');
  tb.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => {
    const c = state.coupons.find(x => x.id === b.dataset.toggle);
    if (c) { c.active = !c.active; save(); renderCoupons(); }
  });
  tb.querySelectorAll('[data-delc]').forEach(b => b.onclick = () => {
    if (confirm('Excluir cupom?')) {
      state.coupons = state.coupons.filter(x => x.id !== b.dataset.delc);
      save(); renderCoupons();
    }
  });
}

function saveCoupon() {
  const code = $('cupCode').value.trim().toUpperCase();
  const type = $('cupType').value;
  if (!code) { toast('Informe o código'); return; }
  const value = type === 'frete' ? 0 : (parseFloat($('cupValue').value) || 0);
  if (type !== 'frete' && value <= 0) { toast('Informe o valor do desconto'); return; }
  state.coupons.push({
    id:uid(), code, type, value,
    min:parseFloat($('cupMin').value)||0,
    limit:parseInt($('cupLimit').value)||0,
    per:parseInt($('cupPer').value)||0,
    first:$('cupFirst').checked,
    uses:0, active:true
  });
  save(); logActivity('🎟️', `Cupom criado: ${code}`);
  closeAll(); renderCoupons();
  toast('✅ Cupom criado');
}

/* ==================== BAIRROS ==================== */
function renderBairros() {
  const tb = $('tblBairros');
  if (!tb) return;

  // Info cards
  const mode = state.config.freteMode;
  const labels = { fixo: 'Fixo (R$)', km: 'Por KM', bairro: 'Por Bairro', gratis: 'Grátis' };
  const fl = $('freteModeLabel'); if (fl) fl.textContent = labels[mode] || '—';
  const fv = $('freteValLabel');
  if (fv) {
    if (mode === 'km') fv.textContent = brl(state.config.freteKmVal) + ' / km';
    else if (mode === 'bairro') fv.textContent = 'por bairro';
    else fv.textContent = brl(state.config.freteFixo);
  }
  const fg = $('freteGratisLabel');
  if (fg) fg.textContent = state.config.freteGratisAcima > 0 ? brl(state.config.freteGratisAcima) : '—';

  if (!state.bairros.length) { tb.innerHTML = '<tr><td colspan="4" class="empty">Sem bairros cadastrados</td></tr>'; return; }
  tb.innerHTML = state.bairros.map(b => `
    <tr>
      <td><b>${b.name}</b></td>
      <td>${brl(b.tax)}</td>
      <td>${b.km} km</td>
      <td>
        <button class="btn sm primary" data-editb="${b.id}">✏️</button>
        <button class="btn sm danger" data-delb="${b.id}">🗑</button>
      </td>
    </tr>`).join('');
  tb.querySelectorAll('[data-editb]').forEach(x => x.onclick = () => openBairroModal(x.dataset.editb));
  tb.querySelectorAll('[data-delb]').forEach(x => x.onclick = () => {
    if (confirm('Excluir bairro?')) {
      state.bairros = state.bairros.filter(b => b.id !== x.dataset.delb);
      save(); renderBairros();
    }
  });
}

function openBairroModal(id) {
  const b = id ? state.bairros.find(x => x.id === id) : null;
  $('bairroTitle').textContent = b ? '✏️ Editar Bairro' : '➕ Novo Bairro';
  $('bId').value = b ? b.id : '';
  $('bName').value = b ? b.name : '';
  $('bTax').value = b ? b.tax : 0;
  $('bKm').value = b ? b.km : 0;
  $('overlayBairro').classList.add('open');
  setTimeout(() => $('bName').focus(), 100);
}

function saveBairro() {
  const id = $('bId').value;
  const name = $('bName').value.trim();
  if (!name) { toast('Informe o nome'); return; }
  const data = { name, tax: parseFloat($('bTax').value)||0, km: parseFloat($('bKm').value)||0 };
  if (id) {
    const i = state.bairros.findIndex(x => x.id === id);
    state.bairros[i] = { ...state.bairros[i], ...data };
  } else {
    state.bairros.push({ id:uid(), ...data });
  }
  save(); closeAll(); renderBairros();
  toast('✅ Bairro salvo');
}

/* ==================== ESTOQUE ==================== */
function renderEstoque() {
  const tb = $('tblEstoque');
  if (!tb) return;

  const q = ($('estoqueFilter')?.value || '').toLowerCase();
  const st = $('estoqueStatusFilter')?.value || 'all';

  let list = state.products.slice();
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
  if (st === 'low') list = list.filter(p => p.stock <= state.config.minStock && p.stock > 0);
  if (st === 'out') list = list.filter(p => p.stock <= 0);
  if (st === 'ok') list = list.filter(p => p.stock > state.config.minStock);

  if (!list.length) { tb.innerHTML = '<tr><td colspan="4" class="empty">Nenhum produto</td></tr>'; }
  else {
    tb.innerHTML = list.map(p => {
      const low = p.stock <= state.config.minStock;
      const badge = p.stock <= 0 ? 'danger' : (low ? 'warn' : 'success');
      return `<tr>
        <td><b>${p.name}</b></td>
        <td><span class="badge ${badge}">${p.stock} un</span></td>
        <td>
          <button class="btn sm ghost" data-stkadd="${p.id}" data-qty="1">+1</button>
          <button class="btn sm ghost" data-stkadd="${p.id}" data-qty="5">+5</button>
          <button class="btn sm ghost" data-stksub="${p.id}" data-qty="1">-1</button>
        </td>
        <td>
          <button class="btn sm primary" data-stkedit="${p.id}">📦 Ajustar</button>
        </td>
      </tr>`;
    }).join('');
  }

  tb.querySelectorAll('[data-stkadd]').forEach(b => b.onclick = () => quickStock(b.dataset.stkadd, +b.dataset.qty));
  tb.querySelectorAll('[data-stksub]').forEach(b => b.onclick = () => quickStock(b.dataset.stksub, -b.dataset.qty));
  tb.querySelectorAll('[data-stkedit]').forEach(b => b.onclick = () => openStockModal(b.dataset.stkedit));

  renderStockLogList();
}

function quickStock(id, delta) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  p.stock = Math.max(0, p.stock + delta);
  save();
  logStock(delta > 0 ? '➕' : '➖', `${p.name}: ${delta>0?'+':''}${delta} (agora ${p.stock})`);
  renderEstoque();
  renderDashboard();
  renderMenu();
}

function openStockModal(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  $('stkId').value = p.id;
  $('stkName').textContent = p.name;
  $('stkCurrent').value = p.stock;
  $('stkType').value = 'set';
  $('stkQty').value = 0;
  $('stkReason').value = '';
  $('overlayStock').classList.add('open');
}

function saveStockAdjust() {
  const id = $('stkId').value;
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  const type = $('stkType').value;
  const qty = parseInt($('stkQty').value) || 0;
  const reason = $('stkReason').value.trim();
  const old = p.stock;
  let newQ = old;
  if (type === 'set') newQ = Math.max(0, qty);
  else if (type === 'add') newQ = old + qty;
  else if (type === 'sub') newQ = Math.max(0, old - qty);
  p.stock = newQ;
  save();
  const diff = newQ - old;
  logStock('📦', `${p.name}: ${old} → ${newQ}${reason ? ' ('+reason+')' : ''}`);
  logActivity('📦', `Estoque ajustado: ${p.name} = ${newQ}`);
  closeAll();
  renderEstoque();
  renderDashboard();
  renderMenu();
  toast(`✅ Estoque atualizado: ${old} → ${newQ}`);
}

/* ==================== CONFIG ==================== */
function renderConfig() {
  const c = state.config;
  $('cName').value = c.storeName;
  $('cSlogan').value = c.slogan;
  $('cWpp').value = c.whatsapp;
  $('cPhone').value = c.phone || '';
  $('cAddress').value = c.address || '';
  $('cOpenTime').value = c.openTime || '18:00';
  $('cCloseTime').value = c.closeTime || '23:00';
  $('cDays').value = c.days || '';
  $('cMin').value = c.minOrder;
  $('cTime').value = c.deliveryTime;
  $('cFreteMode').value = c.freteMode || 'fixo';
  $('cFreteFixo').value = c.freteFixo || 0;
  $('cFreteKmVal').value = c.freteKmVal || 0;
  $('cFreteKmGratis').value = c.freteKmGratis || 0;
  $('cFreteGratisAcima').value = c.freteGratisAcima || 0;
  $('cCoords').value = c.storeCoords || '';
  $('cPay').value = c.payments.join(', ');
  $('cPix').value = c.pix||'';
  $('cPixName').value = c.pixName||'';
  $('cPixCity').value = c.pixCity||'';
  $('cRequireAge').checked = !!c.requireAge;
  $('cBlockClosed').checked = !!c.blockWhenClosed;
  $('cMinStock').value = c.minStock;
  $('cBlockOutOfStock').checked = !!c.blockOutOfStock;
  $('cColor1').value = c.colorPrimary || '#d90429';
  $('cColor2').value = c.colorPrimaryDark || '#a50320';
  $('cShowBanner').checked = c.showBanner !== false;
  renderPresets();

  // Hero
  $('heroName').textContent = '🥤 ' + c.storeName;
  $('heroSlogan').textContent = c.slogan;
  $('heroMin').textContent = 'Pedido mínimo: ' + brl(c.minOrder);
  $('heroTime').textContent = 'Entrega: ' + c.deliveryTime;
  $('heroOpen').textContent = '🕒 ' + c.hours;
  $('ftName').textContent = '🥤 ' + c.storeName;
  $('ftAddress').textContent = c.address || '';
  $('ftPhone').textContent = 'Telefone: ' + (c.phone || '');
}

function renderPresets() {
  const wrap = $('themePresets');
  if (!wrap) return;
  const c = state.config;
  wrap.innerHTML = THEMES.map(t => `
    <button type="button" class="preset ${c.themeId === t.id ? 'active' : ''}" data-preset="${t.id}">
      <span class="swatch"><i style="background:${t.primary}"></i><i style="background:${t.dark}"></i><i style="background:${t.accent}"></i></span>
      ${t.name}
    </button>`).join('');
  wrap.querySelectorAll('[data-preset]').forEach(b => {
    b.onclick = () => {
      applyThemePreset(b.dataset.preset);
      $('cColor1').value = state.config.colorPrimary;
      $('cColor2').value = state.config.colorPrimaryDark;
      renderPresets();
      toast('🎨 Tema aplicado — clique em 💾 Salvar para guardar');
    };
  });
}

function getStoreLocation() {
  if (!navigator.geolocation) { toast('Localização não suportada neste aparelho'); return; }
  toast('📍 Buscando sua localização...');
  navigator.geolocation.getCurrentPosition(
    pos => {
      const v = pos.coords.latitude.toFixed(6) + ',' + pos.coords.longitude.toFixed(6);
      const el = $('cCoords'); if (el) el.value = v;
      toast('✅ Localização da loja preenchida — clique em 💾 Salvar');
    },
    () => toast('Permita o acesso à localização para este site no navegador'),
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

function saveConfig() {
  const c = state.config;
  c.storeName = $('cName').value.trim() || 'Minha Loja';
  c.slogan = $('cSlogan').value.trim();
  c.whatsapp = $('cWpp').value.trim().replace(/\D/g,'');
  c.phone = $('cPhone').value.trim();
  c.address = $('cAddress').value.trim();
  c.openTime = $('cOpenTime').value;
  c.closeTime = $('cCloseTime').value;
  c.days = $('cDays').value.trim();
  c.minOrder = parseFloat($('cMin').value) || 0;
  c.deliveryTime = $('cTime').value.trim();
  c.freteMode = $('cFreteMode').value;
  c.freteFixo = parseFloat($('cFreteFixo').value) || 0;
  c.freteKmVal = parseFloat($('cFreteKmVal').value) || 0;
  c.freteKmGratis = parseFloat($('cFreteKmGratis').value) || 0;
  c.freteGratisAcima = parseFloat($('cFreteGratisAcima').value) || 0;
  c.storeCoords = $('cCoords').value.trim();
  c.payments = $('cPay').value.split(',').map(s=>s.trim()).filter(Boolean);
  c.minStock = parseInt($('cMinStock').value) || 5;
  c.pix = $('cPix').value.trim();
  c.pixName = $('cPixName').value.trim();
  c.pixCity = $('cPixCity').value.trim();
  c.requireAge = $('cRequireAge').checked;
  c.blockWhenClosed = $('cBlockClosed').checked;
  c.blockOutOfStock = $('cBlockOutOfStock').checked;
  c.colorPrimary = $('cColor1').value;
  c.colorPrimaryDark = $('cColor2').value;
  c.themeId = THEMES.find(t => t.primary === c.colorPrimary && t.dark === c.colorPrimaryDark)?.id || 'custom';
  c.themeAccent = c.themeAccent || '#ffb703';
  c.showBanner = $('cShowBanner').checked;

  // Atualiza horas legível
  if (c.openTime && c.closeTime) {
    c.hours = `${c.days || 'Todos os dias'} ${c.openTime.replace(':00','h')}-${c.closeTime.replace(':00','h')}`;
  }

  save(); applyTheme();
  logActivity('🔧', 'Configurações atualizadas');
  renderCart(); renderConfig(); renderMenu(); renderStatus(); renderDashboard();
  toast('✅ Configurações salvas!');
}

/* ==================== SEGURANÇA ==================== */
function renderSecPage() {
  $('secOldPass').value = '';
  $('secNewPass').value = '';
  $('secConfirmPass').value = '';
  renderAutoBackupsList();
}

async function changePassword() {
  const old = $('secOldPass').value;
  const p1 = $('secNewPass').value;
  const p2 = $('secConfirmPass').value;
  if (p1.length < 4) { toast('Senha muito curta (mín. 4)'); return; }
  if (p1 !== p2) { toast('Senhas não conferem'); return; }

  const res = SERVER_OK ? await api('/api/admin/password', { method: 'POST', body: { old, new: p1 } }) : null;
  if (res && res.ok) {
    state.config.adminPassword = await hashPass(p1);
    save();
  } else if (res && !res.ok) {
    toast('❌ ' + (res.error || 'Não foi possível alterar a senha'));
    renderSecPage();
    return;
  } else {
    const ok = await verifyPass(old, state.config.adminPassword);
    if (!ok) { toast('❌ Senha atual incorreta'); return; }
    state.config.adminPassword = await hashPass(p1);
    save();
  }
  logActivity('🔐', 'Senha do admin alterada');
  renderSecPage();
  toast('🔐 Senha alterada com sucesso');
}

/* ==================== MODAL PRODUTO ==================== */
function renderAutoBackupsList() {
  const el = $('autoBackupsList');
  if (!el) return;
  const backups = listAutoBackups();
  if (!backups.length) {
    el.innerHTML = '<div class="empty" style="font-size:.85rem">Nenhum backup automático ainda. Salvos a cada 6 horas.</div>';
    return;
  }
  el.innerHTML = backups.map(b => {
    const dt = b.at ? new Date(b.at).toLocaleString('pt-BR') : 'Data desconhecida';
    return `<div class="dash-item" style="flex-wrap:wrap;gap:6px">
      <span>${dt}</span>
      <div style="display:flex;gap:4px;margin-left:auto">
        <button class="btn sm success" data-bkrestore="${b.key}">♻️ Restaurar</button>
        <button class="btn sm ghost" data-bkdownload="${b.key}">📥</button>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('[data-bkrestore]').forEach(btn => {
    btn.onclick = () => restoreAutoBackup(btn.dataset.bkrestore, true);
  });
  el.querySelectorAll('[data-bkdownload]').forEach(btn => {
    btn.onclick = () => {
      const raw = localStorage.getItem(btn.dataset.bkdownload);
      if (!raw) { toast('Backup não encontrado'); return; }
      try {
        const snap = JSON.parse(raw);
        downloadAutoBackup(snap.data || snap);
      } catch (e) { toast('Erro ao baixar'); }
    };
  });
}
/* ==================== MODAL PRODUTO ==================== */
let tmpVariations = [];
let tmpExtras = [];

function updateImgPreview() {
  const el = $('pImgPreview');
  const v = $('pImg').value.trim();
  if (!el) return;
  if (v && (v.startsWith('http') || v.startsWith('assets/') || v.startsWith('data:'))) {
    el.innerHTML = `<img src="${v}" onerror="this.parentElement.innerHTML='<span>🥤</span>'">`;
  } else {
    el.innerHTML = `<span>${v || '🥤'}</span>`;
  }
}

function renderVariationsEditor() {
  $('variationList').innerHTML = tmpVariations.map((v,i) => `
    <div class="form-row" style="margin-bottom:6px">
      <input placeholder="Nome (ex: 500ml)" value="${v.name||''}" data-vi="${i}" data-k="name">
      <div style="display:flex;gap:6px">
        <input type="number" step="0.01" placeholder="+R$" value="${v.price||0}" data-vi="${i}" data-k="price" style="flex:1">
        <button class="btn danger sm" data-rvi="${i}">✕</button>
      </div>
    </div>`).join('');
  $('variationList').querySelectorAll('input').forEach(inp => inp.oninput = () => {
    tmpVariations[+inp.dataset.vi][inp.dataset.k] = inp.dataset.k==='price' ? parseFloat(inp.value)||0 : inp.value;
  });
  $('variationList').querySelectorAll('[data-rvi]').forEach(b => b.onclick = () => {
    tmpVariations.splice(+b.dataset.rvi, 1); renderVariationsEditor();
  });
}

function renderExtrasEditor() {
  $('extrasList').innerHTML = tmpExtras.map((e,i) => `
    <div class="form-row" style="margin-bottom:6px">
      <input placeholder="Nome (ex: Copo com gelo)" value="${e.name||''}" data-ei="${i}" data-k="name">
      <div style="display:flex;gap:6px">
        <input type="number" step="0.01" placeholder="+R$" value="${e.price||0}" data-ei="${i}" data-k="price" style="flex:1">
        <button class="btn danger sm" data-rei="${i}">✕</button>
      </div>
    </div>`).join('');
  $('extrasList').querySelectorAll('input').forEach(inp => inp.oninput = () => {
    tmpExtras[+inp.dataset.ei][inp.dataset.k] = inp.dataset.k==='price' ? parseFloat(inp.value)||0 : inp.value;
  });
  $('extrasList').querySelectorAll('[data-rei]').forEach(b => b.onclick = () => {
    tmpExtras.splice(+b.dataset.rei, 1); renderExtrasEditor();
  });
}

function openProductModal(id) {
  const p = id ? state.products.find(x => x.id === id) : null;
  $('pModalTitle').textContent = p ? '✏️ Editar Bebida' : '➕ Nova Bebida';
  $('pId').value = p ? p.id : '';
  $('pName').value = p ? p.name : '';
  $('pDesc').value = p ? p.desc || '' : '';
  $('pPrice').value = p ? p.price : '';
  $('pPromo').value = p && p.promoPrice ? p.promoPrice : '';
  $('pCat').value = p ? p.category || '' : '';
  $('pStock').value = p ? p.stock : 0;
  $('pCost').value = p ? (p.cost || '') : '';
  $('pImg').value = p ? p.image || '' : '';
  $('pFlag').checked = p ? !!p.highlight : false;
  $('pPromoFlag').checked = p ? !!p.promo : false;
  $('pActiveFlag').checked = p ? p.active !== false : true;
  $('pAge').checked = p ? !!p.ageRestricted : false;
  updateImgPreview();
  tmpVariations = p && p.variations ? JSON.parse(JSON.stringify(p.variations)) : [];
  tmpExtras = p && p.extras ? JSON.parse(JSON.stringify(p.extras)) : [];
  renderVariationsEditor(); renderExtrasEditor();

  const cats = state.categories.length ? state.categories : [...new Set(state.products.map(x => x.category).filter(Boolean))];
  $('catList').innerHTML = cats.map(c => `<option value="${c}">`).join('');
  $('overlayProduct').classList.add('open');
  setTimeout(() => $('pName').focus(), 100);
}

function saveProduct() {
  const id = $('pId').value;
  const name = $('pName').value.trim();
  const price = parseFloat($('pPrice').value);
  if (!name || isNaN(price)) { toast('Preencha nome e preço'); return; }
  const isNew = !id;
  const data = {
    name,
    desc: $('pDesc').value.trim(),
    price,
    promoPrice: parseFloat($('pPromo').value) || null,
    cost: parseFloat($('pCost').value) || 0,
    category: $('pCat').value.trim() || 'Outros',
    stock: parseInt($('pStock').value) || 0,
    image: $('pImg').value.trim() || '🥤',
    highlight: $('pFlag').checked,
    promo: $('pPromoFlag').checked,
    ageRestricted: $('pAge').checked,
    active: $('pActiveFlag').checked,
    variations: tmpVariations.filter(v => v.name.trim()),
    extras: tmpExtras.filter(e => e.name.trim())
  };
  if (id) {
    const i = state.products.findIndex(x => x.id === id);
    state.products[i] = { ...state.products[i], ...data };
  } else state.products.push({ id: uid(), ...data });

  if (!state.categories.includes(data.category)) state.categories.push(data.category);

  save(); closeAll();
  logActivity(isNew?'➕':'✏️', `${isNew?'Produto criado':'Produto atualizado'}: ${name}`);
  renderAdminProducts(); renderCategories(); populateCategoryFilter(); renderMenu(); renderDashboard();
  toast(isNew ? '✅ Produto criado' : '✅ Produto atualizado');
}

/* ==================== LIGAÇÃO DE EVENTOS ==================== */
document.addEventListener('DOMContentLoaded', () => {
  // Filtros
  const pf = $('prodFilter'); if (pf) pf.oninput = renderAdminProducts;
  const pcf = $('prodCatFilter'); if (pcf) pcf.onchange = renderAdminProducts;
  const psf = $('prodStockFilter'); if (psf) psf.onchange = renderAdminProducts;
  const pstf = $('prodStatusFilter'); if (pstf) pstf.onchange = renderAdminProducts;
  const pef = $('pedFilter'); if (pef) pef.oninput = renderAdminOrders;
  const pesf = $('pedStatusFilter'); if (pesf) pesf.onchange = renderAdminOrders;
  const pepf = $('pedPeriodFilter'); if (pepf) pepf.onchange = renderAdminOrders;
  const estf = $('estoqueFilter'); if (estf) estf.oninput = renderEstoque;
  const esstf = $('estoqueStatusFilter'); if (esstf) esstf.onchange = renderEstoque;
  const relp = $('relPeriod'); if (relp) relp.onchange = renderReport;

  // Produtos
  const btnNew = $('btnNew'); if (btnNew) btnNew.onclick = () => openProductModal();
  const btnSaveP = $('btnSaveP'); if (btnSaveP) btnSaveP.onclick = saveProduct;
  const btnAddVar = $('btnAddVariation'); if (btnAddVar) btnAddVar.onclick = () => { tmpVariations.push({name:'',price:0}); renderVariationsEditor(); };
  const btnAddExt = $('btnAddExtra'); if (btnAddExt) btnAddExt.onclick = () => { tmpExtras.push({name:'',price:0}); renderExtrasEditor(); };
  const pImg = $('pImg'); if (pImg) pImg.oninput = updateImgPreview;
  const btnExp = $('btnExportCsv'); if (btnExp) btnExp.onclick = exportProductsCSV;

  // Import CSV
  const btnImp = $('btnImportCsv'); if (btnImp) btnImp.onclick = () => $('fileImportCsv').click();
  const fileImp = $('fileImportCsv');
  if (fileImp) fileImp.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        let added = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
          if (cols.length < 2) continue;
          const [name, category, price] = cols;
          if (!name || !price) continue;
          state.products.push({
            id: uid(), name, category: category || 'Outros',
            price: parseFloat(price) || 0, promoPrice: null, cost: 0,
            stock: 0, image: '🥤', highlight: false, promo: false, active: true,
            variations: [], extras: []
          });
          added++;
        }
        save();
        logActivity('📥', `${added} produto(s) importado(s) via CSV`);
        renderAdminProducts(); renderMenu(); renderDashboard();
        toast(`✅ ${added} produtos importados`);
      } catch(err) { toast('Erro ao importar: ' + err.message); }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Categorias
  const btnNewCat = $('btnNewCat'); if (btnNewCat) btnNewCat.onclick = addCategory;

  // Cupons
  const btnNewCoupon = $('btnNewCoupon');
  if (btnNewCoupon) btnNewCoupon.onclick = () => {
    $('cupCode').value = ''; $('cupValue').value = ''; $('cupMin').value = 0; $('cupLimit').value = 0;
    $('cupPer').value = 0; $('cupFirst').checked = false; $('cupType').value = 'percent';
    $('overlayCoupon').classList.add('open');
  };
  const btnSaveCoupon = $('btnSaveCoupon'); if (btnSaveCoupon) btnSaveCoupon.onclick = saveCoupon;

  // Bairros
  const btnNewBairro = $('btnNewBairro'); if (btnNewBairro) btnNewBairro.onclick = () => openBairroModal();
  const btnSaveBairro = $('btnSaveBairro'); if (btnSaveBairro) btnSaveBairro.onclick = saveBairro;

  // Estoque
  const btnSaveStock = $('btnSaveStock'); if (btnSaveStock) btnSaveStock.onclick = saveStockAdjust;

  // Config
  const btnSaveCfg = $('btnSaveCfg'); if (btnSaveCfg) btnSaveCfg.onclick = saveConfig;
  const btnLocAdmin = $('btnLocAdmin'); if (btnLocAdmin) btnLocAdmin.onclick = getStoreLocation;

  // Segurança
  const btnSavePass = $('btnSavePass'); if (btnSavePass) btnSavePass.onclick = changePassword;

  const cbAutoBk = $('cAutoBackup');
  if (cbAutoBk) {
    cbAutoBk.checked = state.config.autoBackup !== false;
    cbAutoBk.onchange = () => {
      state.config.autoBackup = cbAutoBk.checked;
      save();
      renderAutoBackupsList();
      toast(cbAutoBk.checked ? '✅ Backup automático ativado' : '⚠️ Backup automático desativado');
    };
  }
  const btnBkNow = $('btnBackupNow');
  if (btnBkNow) btnBkNow.onclick = () => {
    maybeAutoBackup();
    renderAutoBackupsList();
    toast('💾 Backup automático criado');
  };
  const btnClearBk = $('btnClearBackups');
  if (btnClearBk) btnClearBk.onclick = () => {
    if (!confirm('Apagar todos os backups automáticos?')) return;
    for (let i = 1; i <= BACKUP_MAX; i++) localStorage.removeItem(bkKey(i));
    renderAutoBackupsList();
    toast('🗑 Backups apagados');
  };

  const btnClearOrders = $('btnClearOrders');
  if (btnClearOrders) btnClearOrders.onclick = () => {
    if (!confirm('Apagar TODOS os pedidos? Não dá para desfazer.')) return;
    state.orders = []; save();
    logActivity('🗑', 'Todos os pedidos apagados');
    renderAdminOrders(); renderReport(); renderDashboard();
    toast('🗑 Pedidos apagados');
  };
  const btnClearCart = $('btnClearCart');
  if (btnClearCart) btnClearCart.onclick = () => {
    if (!confirm('Limpar carrinhos abertos (em memória)?')) return;
    state.cart = []; save(); renderCart();
    toast('🧹 Carrinho limpo');
  };
  const btnResetAll = $('btnResetAll');
  if (btnResetAll) btnResetAll.onclick = () => {
    if (!confirm('Resetar TUDO? Essa ação não pode ser desfeita.')) return;
    if (!confirm('Tem certeza absoluta?')) return;
    localStorage.removeItem(KEY);
    location.reload();
  };

  // Clock
  const clock = $('adminClock');
  if (clock) {
    const tick = () => {
      clock.textContent = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    };
    tick();
    setInterval(tick, 30000);
  }
});