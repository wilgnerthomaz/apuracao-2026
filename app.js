const BASE = 'https://resultados.tse.jus.br/oficial/ele2026/6257';
const REFRESH = 30;
const UFS = ['ac','al','ap','am','ba','ce','df','es','go','ma','mt','ms','mg','pa','pb','pr','pe','pi','rj','rn','rs','ro','rr','sc','sp','se','to'];
// Cores por número de urna
const CORES = {'13':'#C8102E','22':'#1351B4','70':'#F08C00','55':'#2E9E5B','14':'#7B3FBF','30':'#E2640F','80':'#8A1C1C','27':'#0E8C8C','16':'#B03A5B','21':'#6B4E16','35':'#4A6FA5','29':'#5A5A5A'};
const cor = n => CORES[n] || '#888';
// Estados pequenos ganham "bolha" lateral, como no mapa dos EUA
const BOLHAS = {rn:215, pb:280, pe:345, al:410, se:475, df:545, es:615, rj:685};
const BX = 1030, BW = 150, BH = 56;
// Ajuste de tamanho do rótulo para estados menores
const ESCALA = {sc:.75, ac:.85, ap:.85, rr:.9, ro:.9, pr:.9, ce:.9, rs:.95};

const state = { data:{}, sel:'br', next:REFRESH };
const $ = id => document.getElementById(id);
const num = s => Number(String(s).replace(/\./g,'').replace(',','.')) || 0;
const fmt = n => n.toLocaleString('pt-BR');
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const digitos = s => String(s ?? '').replace(/\D/g, '');
const foto = sq => `${BASE}/fotos/br/${sq}.jpeg`;

function decodeJWS(txt){
  const b64 = txt.trim().split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  const bin = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
}

function parse(d){
  const cands = [];
  for (const a of d.carg[0].agr) for (const p of a.par) for (const c of p.cand)
    cands.push({ n:digitos(c.n), sq:digitos(c.sqcand), nome:esc(c.nmu), partido:esc(p.sg), votos:num(c.vap), pct:num(c.pvapn), eleito:c.e==='s', st:c.st });
  cands.sort((a,b) => b.votos - a.votos);
  return {
    cands,
    pctSecoes: num(d.s.pstn), secoesTot: num(d.s.st), secoes: num(d.s.ts),
    validos: num(d.v.vv), brancos: num(d.v.vb), nulos: num(d.v.tvn),
    comp: num(d.e.pcn), abst: num(d.e.pan), eleitorado: num(d.e.te),
    hora: String(d.ht), data: String(d.dt),
  };
}

async function load(uf){
  const r = await fetch(`${BASE}/dados/${uf}/${uf}-c0001-e006257-u.jws?nocache=${Date.now()}`, {cache:'no-store'});
  if (!r.ok) throw new Error(`${uf.toUpperCase()}: HTTP ${r.status}`);
  return parse(decodeJWS(await r.text()));
}

async function refresh(){
  state.next = REFRESH;
  const res = await Promise.allSettled(['br', ...UFS].map(async uf => [uf, await load(uf)]));
  const fails = [];
  res.forEach(r => r.status === 'fulfilled' ? state.data[r.value[0]] = r.value[1] : fails.push(r.reason.message));
  $('err').textContent = fails.length ? `Falha ao atualizar: ${fails.join(', ')}` : '';
  render();
}

/* ---------- MAPA ---------- */
function buildMap(){
  const M = window.MAPA_BRASIL, svg = $('mapa');
  svg.setAttribute('viewBox', `0 0 ${BX + BW + 4} ${M.h}`);
  let html = '';
  for (const [uf, g] of Object.entries(M.uf)) {
    html += `<g class="uf" data-uf="${uf}"><path d="${g.d}"/></g>`;
  }
  // Rótulo dentro do estado: sigla, % do líder e % apurado
  for (const [uf, g] of Object.entries(M.uf)) {
    if (BOLHAS[uf]) continue;
    const k = ESCALA[uf] || 1, [x, y] = g.c;
    html += `<text class="lbl" data-lbl="${uf}" x="${x}" y="${y}">
      <tspan x="${x}" dy="${-20*k}" font-size="${26*k}">${uf.toUpperCase()}</tspan>
      <tspan class="v" x="${x}" dy="${24*k}" font-size="${21*k}">—</tspan>
      <tspan class="a" x="${x}" dy="${20*k}" font-size="${15*k}"></tspan></text>`;
  }
  // Estados pequenos: cartão lateral com linha até o estado
  for (const [uf, y] of Object.entries(BOLHAS)) {
    const [cx, cy] = M.uf[uf].c;
    html += `<g class="bub" data-uf="${uf}"><line x1="${cx}" y1="${cy}" x2="${BX}" y2="${y}"/>
      <rect x="${BX}" y="${y - BH/2}" width="${BW}" height="${BH}" rx="12"/>
      <text x="${BX + 12}" y="${y}" font-size="22" font-weight="800">${uf.toUpperCase()}</text>
      <text data-lbl="${uf}" x="${BX + BW - 12}" y="${y}" text-anchor="end">
        <tspan class="v" x="${BX + BW - 12}" dy="-9" font-size="20" font-weight="800">—</tspan>
        <tspan class="a" x="${BX + BW - 12}" dy="21" font-size="14" font-weight="600" opacity=".85"></tspan></text></g>`;
  }
  svg.innerHTML = `<g id="vp">${html}</g>`;
  svg.querySelectorAll('[data-uf]').forEach(el => {
    const uf = el.dataset.uf;
    el.addEventListener('mousemove', e => showTip(uf, e));
    el.addEventListener('mouseleave', () => $('tip').style.display = 'none');
    el.addEventListener('click', () => select(state.sel === uf ? 'br' : uf));
  });
  initZoom();
  const sel = $('sel');
  Object.entries(M.uf).sort((a,b) => a[1].nome.localeCompare(b[1].nome))
    .forEach(([uf, g]) => sel.add(new Option(g.nome, uf)));
  sel.addEventListener('change', () => select(sel.value));
}

/* ---------- ZOOM ---------- */
// Zoom guardado em coordenadas do viewBox e salvo no navegador: sobrevive às atualizações e ao recarregar
const ZOOM_KEY = 'apuracao2026-zoom', ZMAX = 8;
const view = { k:1, x:0, y:0 };
try { Object.assign(view, JSON.parse(localStorage.getItem(ZOOM_KEY)) || {}); } catch {}

function initZoom(){
  const svg = $('mapa'), vp = $('vp');
  const [, , W, H] = svg.getAttribute('viewBox').split(' ').map(Number);
  const pts = new Map();
  let last = null, moved = 0;

  const toSvg = (cx, cy) => { const m = svg.getScreenCTM(); return { x:(cx - m.e) / m.a, y:(cy - m.f) / m.d }; };
  const apply = () => {
    view.k = Math.min(ZMAX, Math.max(1, view.k));
    view.x = Math.min(0, Math.max(W * (1 - view.k), view.x));
    view.y = Math.min(0, Math.max(H * (1 - view.k), view.y));
    vp.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`);
    svg.classList.toggle('zoomed', view.k > 1.001);
    try { localStorage.setItem(ZOOM_KEY, JSON.stringify(view)); } catch {}
  };
  const zoomAt = (f, p) => { const k2 = Math.min(ZMAX, Math.max(1, view.k * f)), r = k2 / view.k;
    view.x = p.x - (p.x - view.x) * r; view.y = p.y - (p.y - view.y) * r; view.k = k2; apply(); };

  svg.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x:e.clientX, y:e.clientY });
    if (pts.size === 1) moved = 0;
    last = null;
  });
  window.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x:e.clientX, y:e.clientY });
    const p = [...pts.values()];
    const cur = p.length >= 2
      ? { cx:(p[0].x + p[1].x) / 2, cy:(p[0].y + p[1].y) / 2, d:Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) }
      : { cx:p[0].x, cy:p[0].y, d:0 };
    if (last && last.n === p.length) {
      const s = svg.getScreenCTM().a;
      if (p.length >= 2 && last.d) zoomAt(cur.d / last.d, toSvg(cur.cx, cur.cy));
      if (view.k > 1.001 || p.length >= 2) {
        view.x += (cur.cx - last.cx) / s; view.y += (cur.cy - last.cy) / s; apply();
        moved += Math.abs(cur.cx - last.cx) + Math.abs(cur.cy - last.cy);
        svg.classList.add('dragging');
      }
    }
    last = { ...cur, n:p.length };
  });
  const up = e => { pts.delete(e.pointerId); last = null; if (!pts.size) svg.classList.remove('dragging'); };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  // Depois de arrastar, não seleciona o estado ao soltar
  svg.addEventListener('click', e => { if (moved > 6) { e.stopPropagation(); moved = 0; } }, true);
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, toSvg(e.clientX, e.clientY)); }, { passive:false });

  document.querySelectorAll('.zoom button').forEach(b => b.addEventListener('click', () => {
    const centro = { x:W / 2, y:H / 2 };
    if (b.dataset.z === 'in') zoomAt(1.5, centro);
    else if (b.dataset.z === 'out') zoomAt(1 / 1.5, centro);
    else { view.k = 1; view.x = 0; view.y = 0; apply(); }
  }));
  apply();
}

function select(uf){ state.sel = uf; $('sel').value = uf; render(); }

function showTip(uf, e){
  const d = state.data[uf], tip = $('tip');
  if (!d) return;
  tip.innerHTML = `<h4>${MAPA_BRASIL.uf[uf].nome}</h4>` +
    d.cands.slice(0,4).map(c => `<div class="row"><span class="dot" style="background:${cor(c.n)}"></span><span class="n">${c.nome}</span><span class="p">${c.pct.toFixed(2).replace('.',',')}%</span></div>`).join('') +
    `<div class="sub" style="margin-top:6px">${d.pctSecoes.toFixed(2).replace('.',',')}% das seções totalizadas</div>`;
  tip.style.display = 'block';
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.min(e.clientX + 16, innerWidth - w - 8) + 'px';
  tip.style.top = Math.min(e.clientY + 16, innerHeight - h - 8) + 'px';
}

/* ---------- RENDER ---------- */
const pctTxt = v => v.toFixed(2).replace('.',',') + '%';
const pctTxt1 = v => v.toFixed(1).replace('.',',') + '%';

function render(){
  const br = state.data.br;
  if (!br) return;
  $('st-pct').textContent = pctTxt(br.pctSecoes);
  $('st-hora').textContent = br.hora;

  // Estados liderados por candidato
  const lider = {};
  for (const uf of UFS) {
    const d = state.data[uf];
    if (d && d.cands[0].votos > 0) lider[d.cands[0].n] = (lider[d.cands[0].n] || 0) + 1;
  }

  // Placar: dois primeiros no país
  const [A, B] = br.cands;
  const side = (c, el) => {
    el.style.color = cor(c.n);
    el.innerHTML = `<img class="photo" src="${foto(c.sq)}" alt="">
      <div><div class="big">${pctTxt(c.pct)}</div><div class="nm" style="color:var(--ink)">${c.nome}</div>
      <div class="pt">${c.partido} · ${c.n} · lidera em ${lider[c.n] || 0} UFs</div></div>`;
  };
  side(A, $('sideA')); side(B, $('sideB'));
  const resto = Math.max(0, 100 - A.pct - B.pct);
  $('bar').innerHTML = `<span style="width:${A.pct}%;background:${cor(A.n)}"></span><span style="width:${resto}%;background:var(--empty);border-radius:0"></span><span style="width:${B.pct}%;background:${cor(B.n)}"></span><div class="half"></div>`;
  $('vA').innerHTML = `<span style="color:${cor(A.n)}">${fmt(A.votos)} votos</span>`;
  $('vB').innerHTML = `<span style="color:${cor(B.n)}">${fmt(B.votos)} votos</span>`;
  $('others').innerHTML = 'Demais candidatos: ' + br.cands.slice(2).map(c => `${c.nome} ${pctTxt(c.pct)}`).join(' · ');

  // Mapa
  document.querySelectorAll('#mapa .uf, #mapa .bub').forEach(g => {
    const uf = g.dataset.uf, d = state.data[uf];
    const fill = d && d.cands[0].votos > 0 ? cor(d.cands[0].n) : 'var(--empty)';
    g.querySelector('path, rect').style.fill = fill;
    g.classList.toggle('sel', state.sel === uf);
    g.classList.toggle('dim', state.sel !== 'br' && state.sel !== uf);
  });
  document.querySelectorAll('#mapa [data-lbl]').forEach(t => {
    const d = state.data[t.dataset.lbl];
    if (!d) return;
    t.querySelector('.v').textContent = d.cands[0].votos > 0 ? pctTxt1(d.cands[0].pct) : '—';
    t.querySelector('.a').textContent = `${pctTxt1(d.pctSecoes)} apur.`;
  });

  // Apuração geral
  $('ap-val').textContent = pctTxt(br.pctSecoes);
  $('ap-bar').style.width = br.pctSecoes + '%';
  $('ap-cnt').textContent = `${fmt(br.secoesTot)} de ${fmt(br.secoes)} seções`;

  // Legenda
  $('legend').innerHTML = Object.entries(lider).sort((a,b)=>b[1]-a[1]).map(([n,q]) => {
    const c = br.cands.find(x => x.n === n);
    return `<span><i style="background:${cor(n)}"></i>${c ? c.nome : n} (${q})</span>`;
  }).join('') + `<span><i style="background:var(--empty)"></i>Sem votos apurados</span>`;

  renderPanel();
}

function renderPanel(){
  const uf = state.sel, d = state.data[uf];
  if (!d) return;
  const nome = uf === 'br' ? 'Brasil' : MAPA_BRASIL.uf[uf].nome;
  const max = d.cands[0].pct || 1;
  $('panel').innerHTML = `
    <div class="eyebrow">${uf === 'br' ? 'Total nacional' : 'Estado selecionado'}</div>
    <h3>${nome}</h3>
    <div class="prog"><span style="width:${d.pctSecoes}%"></span></div>
    <div class="sub">${pctTxt(d.pctSecoes)} das seções totalizadas (${fmt(d.secoesTot)} de ${fmt(d.secoes)})</div>
    <div class="clist">${d.cands.map(c => `
      <div class="cand">
        <img src="${foto(c.sq)}" alt="" loading="lazy">
        <div><div style="font-weight:700;font-size:13px">${c.nome} <span class="sub">${c.partido}</span></div>
          <div class="meter"><span style="width:${c.pct / max * 100}%;background:${cor(c.n)}"></span></div></div>
        <div class="pc">${pctTxt(c.pct)}<small>${fmt(c.votos)}</small></div>
      </div>`).join('')}</div>
    <div class="stats">
      <div>Comparecimento<b>${pctTxt(d.comp)}</b></div>
      <div>Brancos<b>${fmt(d.brancos)}</b></div>
      <div>Nulos<b>${fmt(d.nulos)}</b></div>
    </div>
    ${uf !== 'br' ? '<button class="ghost" style="margin-top:14px" data-voltar>Ver total nacional</button>' : ''}`;
  $('panel').querySelector('[data-voltar]')?.addEventListener('click', () => select('br'));
}

/* ---------- INIT ---------- */
buildMap();
refresh();
$('btn-refresh').addEventListener('click', refresh);
setInterval(() => {
  state.next--;
  $('st-next').textContent = Math.max(0, state.next);
  if (state.next <= 0) refresh();
}, 1000);
