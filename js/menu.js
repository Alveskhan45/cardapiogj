/* ==================== MENU (vertical c/ submenu + busca inteligente) ==================== */
let openCategory = null;

/**
 * Remove acentos/tom e deixa minúsculo (busca sem depender de acentuação)
 */
function norm(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Verifica se um produto bate com o termo de busca (ignora acentos e sinais)
 */
function productMatches(p, q) {
  if (!p.active) return false;
  if (!q) return true;
  const h = norm(q);
  return norm(p.name).includes(h) ||
         norm(p.desc).includes(h) ||
         norm(p.category).includes(h);
}

/**
 * Destaca o termo buscado no texto (compara ignorando acentos)
 */
function highlight(text, q) {
  if (!q || !text) return text || '';
  const nq = norm(q);
  if (!nq) return text;
  let plain = '', off = [];
  for (let oi = 0; oi < text.length; oi++) {
    const clean = String(text[oi]).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (clean) { plain += clean; off.push(oi); }
  }
  const i = plain.indexOf(nq);
  if (i === -1) return text;
  const start = off[i];
  const end = off[i + nq.length - 1] + 1;
  return text.slice(0, start) + '<mark class="hl">' + text.slice(start, end) + '</mark>' + text.slice(end);
}

/* Preço efetivo (promoção) */
function priceNow(p) { return p.promo && p.promoPrice ? p.promoPrice : p.price; }

function renderCats() {
  const catNav = $('catNav');
  if (!catNav) return;
  catNav.innerHTML = '';

  const q = ($('searchInput')?.value || '').trim().toLowerCase();
  const searching = q.length > 0;

  // Pool de produtos visíveis (busca)
  const pool = state.products.filter(p =>
    p.active &&
    (!searching || productMatches(p, q))
  );

  const cats = [...new Set(pool.map(p => p.category).filter(Boolean))];

  // Busca sem resultado
  if (searching && cats.length === 0) {
    const div = document.createElement('div');
    div.className = 'search-empty';
    div.innerHTML = `😕 Nenhuma bebida encontrada para "<b>${q}</b>"<br><small style="font-size:.8rem">Tente outro termo</small>`;
    catNav.appendChild(div);
    return;
  }

  const frag = document.createDocumentFragment();

  cats.forEach(cat => {
    let items = pool.filter(p => p.category === cat);

    if (items.length === 0) return;

    const emoji = categoryEmoji(cat);
    // Durante a busca, todas abertas. Sem busca, respeita o toggle
    const isOpen = searching ? true : (openCategory === cat);

    // Botão da categoria
    const btn = document.createElement('button');
    btn.className = 'cat-toggle' + (isOpen ? ' active' : '') + (searching ? ' locked' : '');
    btn.dataset.cat = cat;
    btn.setAttribute('aria-expanded', isOpen);
    btn.innerHTML = `
      <span class="cat-info">
        <span class="cat-emoji">${emoji}</span>
        <span>${cat}</span>
      </span>
      <span style="display:flex;align-items:center;gap:8px">
        <span class="cat-count">${items.length}</span>
        <span class="arrow">▾</span>
      </span>`;

    if (searching) {
      // Durante a busca, clicar não faz nada (fica tudo aberto)
      btn.onclick = () => {};
    } else {
      btn.onclick = () => {
        openCategory = (openCategory === cat) ? null : cat;
        renderCats();
        if (openCategory) {
          setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
      };
    }
    frag.appendChild(btn);

    // Submenu
    const sub = document.createElement('div');
    sub.className = 'cat-submenu' + (isOpen ? ' open' : '');
    sub.dataset.submenu = cat;
    sub.innerHTML = items.map(p => renderItem(p, q)).join('');
    sub.querySelectorAll('.item').forEach((el, j) => {
      el.style.setProperty('--d', Math.min(0.05 * j, 0.25) + 's');
    });
    frag.appendChild(sub);
  });

  catNav.appendChild(frag);

  // Liga cliques nos itens
  catNav.querySelectorAll('[data-open]').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      openItemDetail(el.dataset.open);
    };
  });
  // Liga botões rápidos (+)
  catNav.querySelectorAll('[data-qadd]').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      el.disabled = true;
      const id = el.dataset.qadd;
      const p = state.products.find(x => x.id === id);
      if (p && (p.variations && p.variations.length)) { openItemDetail(id); el.disabled = false; return; }
      addToCart(id, 1);
      el.disabled = false;
    };
  });
}

function categoryEmoji(cat) {
  const c = (cat||'').toLowerCase();
  if (c.includes('refri')) return '🥤';
  if (c.includes('suco'))  return '🧃';
  if (c.includes('água') || c.includes('agua')) return '💧';
  if (c.includes('cerveja')) return '🍺';
  if (c.includes('energ'))  return '⚡';
  if (c.includes('vinho'))  return '🍷';
  if (c.includes('destilad') || c.includes('cachaça') || c.includes('cachaca')) return '🥃';
  if (c.includes('combo'))  return '🧺';
  if (c.includes('petisco') || c.includes('salgado') || c.includes('snack')) return '🍢';
  if (c.includes('drink') || c.includes('cocktail')) return '🍹';
  if (c.includes('café') || c.includes('cafe')) return '☕';
  if (c.includes('chá') || c.includes('cha')) return '🍵';
  if (c.includes('leite')) return '🥛';
  return '🥤';
}

/* Paleta de fundo pastel do thumbnail — varia por categoria */
const THUMB_BG = [
  'linear-gradient(135deg,#ffe0e6,#ffd0d9)',
  'linear-gradient(135deg,#e0f7ee,#c6efe2)',
  'linear-gradient(135deg,#e6f0ff,#cfe2ff)',
  'linear-gradient(135deg,#fff4e0,#ffe3b3)',
  'linear-gradient(135deg,#f5e6ff,#e6ccff)',
  'linear-gradient(135deg,#e0f7fa,#c2ecf0)',
  'linear-gradient(135deg,#fee2e2,#fec9c9)',
  'linear-gradient(135deg,#fef9c3,#fde68a)',
  'linear-gradient(135deg,#ffedd5,#fed7aa)',
  'linear-gradient(135deg,#e7e5e4,#d6d3d1)'
];
function thumbBg(cat) {
  const s = (cat||'#').split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  return THUMB_BG[s % THUMB_BG.length];
}

function renderBanner() {
  const bannerArea = $('bannerArea');
  if (!bannerArea) return;
  const banners = [];
  if (state.config.blockWhenClosed && !isStoreOpen()) {
    banners.push(`<div class="banner closed">🔒 <strong>Estamos fechados neste momento.</strong> Funcionamento: ${state.config.hours || '—'}. Você pode enviar seu pedido normalmente — a loja confirma quando abrir.</div>`);
  }
  if (state.config.minOrder > 0) {
    banners.push(`<div class="banner">🛒 <strong>Pedido mínimo: ${brl(state.config.minOrder)}</strong> — frete conforme região</div>`);
  }
  bannerArea.innerHTML = banners.join('');
  if ($('bannerArea').children.length === 0) bannerArea.style.display = 'none';
}

function renderMenu() {
  renderBanner();
  renderCats();
}

/**
 * Renderiza o card de um produto
 * @param {object} p Produto
 * @param {string} q Termo de busca para destacar (opcional)
 */
function renderItem(p, q = '') {
  const price = p.promo && p.promoPrice ? p.promoPrice : p.price;
  const hasVar = p.variations && p.variations.length;
  const out = p.stock <= 0;
  const imgContent = p.image && (p.image.startsWith('http') || p.image.startsWith('data:') || p.image.startsWith('assets/'))
    ? `<img src="${p.image}" alt="${p.name}" onerror="this.parentElement.innerHTML='🥤'">`
    : (p.image || '🥤');
  const flag = p.highlight ? '<span class="flag">⭐ Top</span>' : (p.promo ? '<span class="flag promo">🔥 Promo</span>' : '');
  const canQuick = !hasVar && !(p.extras && p.extras.length);
  const quickBtn = canQuick && !out
    ? `<button class="quick-add" data-qadd="${p.id}" title="Adicionar ao carrinho">+</button>`
    : (hasVar ? `<button class="quick-add orange" data-qadd="${p.id}" title="Escolher opções">＋</button>` : '');
  return `
    <div class="item ${out ? 'out' : ''}" data-open="${p.id}" tabindex="0">
      <div class="item-thumb" style="background:${thumbBg(p.category)}">${imgContent}</div>
      <div class="item-body">
        ${flag}
        <div class="item-name">${highlight(p.name, q)}${out ? ' <span style="color:#6b7280;font-size:.75rem">(esgotado)</span>' : ''}</div>
        <div class="item-desc">${highlight(p.desc || '', q)}</div>
        <div class="item-price">
          ${p.promo && p.promoPrice ? `<span class="old">${brl(p.price)}</span>` : `<span style="font-size:.8rem">${hasVar ? 'a partir de ' : 'por '}</span>`}
          <span class="value">${brl(price)}</span>
        </div>
      </div>
      ${quickBtn}
    </div>`;
}

function openItemDetail(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;

  // Gate +18: produtos alcoólicos pedem confirmação (se habilitado nas regras)
  if (state.config.requireAge && !ageConfirmed() && isAlcoholic(p)) {
    $('sheetItem').innerHTML = `
      <div class="close-row"><h2>🔞 Conteúdo para maiores de 18</h2><button class="btn ghost" data-close>✕</button></div>
      <p class="subtitle">Este item é uma <b>bebida alcoólica</b>. Você confirma que tem <b>18 anos ou mais</b>?</p>
      <div class="modal-actions">
        <button class="btn ghost danger-text" id="ageNo">✕ Voltar</button>
        <button class="btn success" id="ageYes">✅ Sim, tenho 18+</button>
      </div>`;
    $('ageNo').onclick = closeAll;
    $('ageYes').onclick = () => { confirmAge(); openItemDetail(id); };
    $('overlayItem').classList.add('open');
    document.querySelectorAll('#sheetItem [data-close]').forEach(b => b.onclick = closeAll);
    return;
  }

  const basePrice = p.promo && p.promoPrice ? p.promoPrice : p.price;
  const out = p.stock <= 0;
  const imgContent = p.image && (p.image.startsWith('http') || p.image.startsWith('data:') || p.image.startsWith('assets/'))
    ? `<img class="detail-img" src="${p.image}" alt="${p.name}" onerror="this.outerHTML='<div class=\\'detail-emoji\\'>🥤</div>'">`
    : `<div class="detail-emoji">${p.image||'🥤'}</div>`;

  let variationsHtml = '';
  if (p.variations && p.variations.length) {
    variationsHtml = `
      <div class="opt-group">
        <div class="gtitle">🧊 Escolha o tamanho <span class="req">Obrigatório</span></div>
        <div class="gsub">Selecione uma opção</div>
        ${p.variations.map((v,i) => `
          <label class="opt-item">
            <input type="radio" name="variation" value="${i}" ${i===0?'checked':''}>
            <span class="oname">${v.name}</span>
            <span class="oprice">${v.price ? '+ '+brl(v.price) : 'Grátis'}</span>
          </label>`).join('')}
      </div>`;
  }

  let extrasHtml = '';
  if (p.extras && p.extras.length) {
    extrasHtml = `
      <div class="opt-group">
        <div class="gtitle">➕ Adicionais</div>
        <div class="gsub">Opcional — escolha quantos quiser</div>
        ${p.extras.map((e,i) => `
          <label class="opt-item">
            <input type="checkbox" class="extra-cb" data-idx="${i}">
            <span class="oname">${e.name}</span>
            <span class="oprice">${e.price ? '+ '+brl(e.price) : 'Grátis'}</span>
          </label>`).join('')}
      </div>`;
  }

  const rel = state.products
    .filter(r => r.active && r.id !== p.id && r.category === p.category && r.stock > 0)
    .slice(0, 4);
  const relatedHtml = rel.length ? `
    <div class="related">
      <div class="gtitle">📌 Quem viu este, também levou</div>
      <div class="related-grid">
        ${rel.map(r => {
          const emoji = r.image && (r.image.startsWith('http') || r.image.startsWith('data:') || r.image.startsWith('assets/')) ? '<span class="rel-emoji">🥤</span>' : `<span class="rel-emoji">${r.image || '🥤'}</span>`;
          return `<button class="rel-card" data-rel="${r.id}">${emoji}<span class="rel-name">${r.name}</span><span class="rel-price">${brl(priceNow(r))}</span></button>`;
        }).join('')}
      </div>
    </div>` : '';

  $('sheetItem').innerHTML = `
    <div class="close-row"><h2>${p.name}</h2><button class="btn ghost" data-close>✕</button></div>
    ${imgContent}
    <p class="subtitle">${p.desc||''}</p>
    ${variationsHtml}
    ${extrasHtml}
    <div class="form-group">
      <label>Observação do item</label>
      <input type="text" id="itemObs" placeholder="Ex: sem gelo, bem gelada..." maxlength="100">
    </div>
    ${relatedHtml}
    <div class="qty" style="justify-content:center;padding:8px;margin:14px 0;position:relative">
      <button id="dQtyDec">−</button>
      <span id="dQty" style="font-size:1.1rem;min-width:40px">1</span>
      <button id="dQtyInc">+</button>
      <small style="position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:.75rem">${p.stock} em estoque</small>
    </div>
    <div class="modal-actions">
      <button class="btn ghost danger-text" id="dExit">✕ Sair</button>
      <button class="btn success" id="dAdd" ${out ? 'disabled' : ''}>
        ${out ? '❌ Esgotado' : '🛒 Adicionar'}
      </button>
    </div>`;

  let qty = 1;
  const calcPrice = () => {
    let total = basePrice;
    const varRadio = document.querySelector('input[name="variation"]:checked');
    if (varRadio) total += p.variations[parseInt(varRadio.value)].price || 0;
    document.querySelectorAll('.extra-cb:checked').forEach(cb => {
      total += p.extras[parseInt(cb.dataset.idx)].price || 0;
    });
    return total;
  };
  const updPrice = () => {
    $('dAdd').textContent = out ? '❌ Esgotado' : `🛒 Adicionar — ${brl(calcPrice()*qty)}`;
  };
  document.querySelectorAll('input[name="variation"], .extra-cb').forEach(el => el.onchange = updPrice);
  $('dQtyInc').onclick = () => { if (qty < p.stock) { qty++; $('dQty').textContent = qty; updPrice(); } };
  $('dQtyDec').onclick = () => { if (qty > 1) { qty--; $('dQty').textContent = qty; updPrice(); } };
  updPrice();

  $('dAdd').onclick = () => {
    if (out) return;
    const varRadio = document.querySelector('input[name="variation"]:checked');
    const variation = varRadio ? p.variations[parseInt(varRadio.value)] : null;
    const extras = [...document.querySelectorAll('.extra-cb:checked')].map(cb => p.extras[parseInt(cb.dataset.idx)]);
    const obs = $('itemObs').value.trim();
    addToCart(p.id, qty, variation, extras, obs);
    closeAll(); openCart();
  };
  const dExit = $('dExit');
  if (dExit) dExit.onclick = closeAll;

  $('overlayItem').classList.add('open');
  document.querySelectorAll('#sheetItem [data-close]').forEach(b => b.onclick = closeAll);
  document.querySelectorAll('#sheetItem [data-rel]').forEach(btn => {
    btn.onclick = () => openItemDetail(btn.dataset.rel);
  });
}