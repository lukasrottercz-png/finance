// Živý read-only Gantt viewer pro externí spolupracovníky (např. pana Nohela).
// Nasazení: script.google.com → nový projekt → vlož tento kód místo výchozího Code.gs →
// Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
// Přístup řídí výhradně tajný klíč v URL (?key=...) uložený appkou ukoly.html (tlačítko
// "🔗 Odkaz") — Google přihlášení navíc není potřeba, appka identitu návštěvníka stejně
// nevyužívá (u osobních Gmail účtů mimo doménu vlastníka scriptu ji Google neposkytne).

var DATA_FILE_NAME = 'ukoly_data.json';

function doGet(e) {
  var key = (e && e.parameter && e.parameter.key) || '';
  var data = loadUkolyData_();

  if (!data) {
    return HtmlService.createHtmlOutput(
      messageHtml_('🔒 Data nenalezena', 'Soubor ' + DATA_FILE_NAME + ' se na Drive nepodařilo najít nebo přečíst.')
    );
  }

  if (!data.ganttShareKey || key !== data.ganttShareKey) {
    return HtmlService.createHtmlOutput(
      messageHtml_('🔒 Přístup odepřen', 'Odkaz je neplatný nebo byl zneplatněn. Vyžádej si aktuální odkaz.')
    );
  }

  var html = buildGanttHtml_(data.ukoly || []);
  return HtmlService.createHtmlOutput(html).setTitle('Gantt — projekty (živě)');
}

function loadUkolyData_() {
  var files = DriveApp.getFilesByName(DATA_FILE_NAME);
  if (!files.hasNext()) return null;
  var file = files.next();
  try {
    return JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  } catch (err) {
    return null;
  }
}

function escHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function messageHtml_(title, msg) {
  return '<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' + escHtml_(title) + '</title>' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f2f2f7;color:#000;' +
    'display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px}' +
    '.box{max-width:420px}h1{font-size:20px;margin:0 0 8px}p{color:#8e8e93;font-size:14px;line-height:1.4}</style></head>' +
    '<body><div class="box"><h1>' + escHtml_(title) + '</h1><p>' + escHtml_(msg) + '</p></div></body></html>';
}

function buildGanttHtml_(ukoly) {
  var items = ukoly.filter(function (u) { return (u.agenda || 'osobni') === 'prace' && u.projekt && u.start && u.date; })
    .sort(function (a, b) {
      var ak = !!a.naKonci, bk = !!b.naKonci;
      if (ak !== bk) return ak ? 1 : -1;
      return a.start < b.start ? -1 : (a.start > b.start ? 1 : 0);
    })
    .map(function (u) {
      return {
        id: u.id, name: u.name, start: u.start, date: u.date, nahradniTermin: u.nahradniTermin || '', note: u.note || '', done: !!u.done, completedAt: u.completedAt || null,
        zodpovida: u.zodpovida || '', predecessorId: u.predecessorId || '', kriticky: !!u.kriticky,
        kids: ukoly.filter(function (k) { return k.projektId === u.id && (k.agenda||'osobni')==='prace'; }).map(function (k) {
          return { id: k.id, name: k.name, start: k.start || '', date: k.date, nahradniTermin: k.nahradniTermin || '', done: !!k.done, completedAt: k.completedAt || null, zodpovida: k.zodpovida || '', predecessorId: k.predecessorId || '', kriticky: !!k.kriticky };
        })
      };
    });
  var evidovane = ukoly.filter(function (u) { return (u.agenda || 'osobni') === 'prace' && u.projekt && u.evidovany; });

  var evidHtmlStatic = evidovane.length ? (
    '<div class="evid-box"><div class="evid-box-title">📋 Evidované projekty (' + evidovane.length + ') — zatím bez termínu</div>' +
    evidovane.map(function (u) {
      return '<div class="evid-row"><span class="evid-badge">nezahájeno</span><div class="evid-row-body"><span class="evid-row-name">' + escHtml_(u.name) + '</span>' +
        (u.note ? '<div class="evid-row-desc">' + escHtml_(u.note) + '</div>' : '') +
        (u.zodpovida ? '<span class="resp-badge">👤 ' + escHtml_(u.zodpovida) + '</span>' : '') + '</div></div>';
    }).join('') + '</div>'
  ) : '';

  var generatedAt = new Date().toLocaleString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  var dataJson = JSON.stringify(items).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gantt — projekty (živě)</title>
<style>
:root { --bg:#f2f2f7; --surface:#fff; --surface2:#e9e9ef; --border:#e5e5ea; --text:#000; --muted:#8e8e93; --accent:#7c3aed; --green:#34c759; --red:#ff3b30; --gray:#aeaeb2; --gray-light:#d1d1d6; --weekend-tint:rgba(0,0,0,0.045); }
@media (prefers-color-scheme: dark) {
  :root { --bg:#000; --surface:#1c1c1e; --surface2:#2c2c2e; --border:#38383a; --text:#fff; --muted:#8e8e93; }
}
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
.hd { padding:16px 20px 8px; }
.hd h1 { font-size:20px; margin:0 0 4px; }
.hd .meta { font-size:12px; color:var(--muted); }
.gantt-wrap { box-sizing:border-box; padding:30px 16px 24px; background:var(--surface); }
.gantt-body { display:flex; }
.gantt-labels { flex-shrink:0; width:clamp(320px,42vw,500px); padding-right:12px; box-sizing:border-box; }
.gantt-label-header { height:28px; display:flex; align-items:flex-end; gap:6px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); border-bottom:1px solid var(--border); box-sizing:border-box; padding-bottom:4px; }
.gantt-label-header .col-name { flex:1; min-width:0; }
.gantt-label-header .col-date { width:44px; flex-shrink:0; overflow:hidden; white-space:nowrap; }
.gantt-label-header .col-resp { width:62px; flex-shrink:0; overflow:hidden; white-space:nowrap; }
.gantt-row-label { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; border-bottom:0.5px solid var(--border); box-sizing:border-box; background:var(--surface2); }
.gantt-row-label .col-name { flex:1; min-width:0; white-space:normal; line-height:1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.gantt-row-label .col-date { width:44px; flex-shrink:0; font-size:11px; font-weight:400; color:var(--muted); }
.gantt-row-label .col-resp { width:62px; flex-shrink:0; font-size:11px; font-weight:400; color:var(--muted); white-space:normal; line-height:1.2; overflow:hidden; }
.gantt-row-label.sub { font-size:11.5px; font-weight:500; background:transparent; }
.gantt-row-label.sub .col-name { padding-left:14px; }
.gantt-timeline { flex:1; overflow-x:auto; min-width:0; }
.gantt-month-header { position:relative; height:28px; border-bottom:1px solid var(--border); }
.gantt-month-header .gm { position:absolute; top:0; height:100%; box-sizing:border-box; border-left:0.5px solid var(--border); font-size:11px; color:var(--muted); padding:4px 0 0 5px; white-space:nowrap; }
.gantt-month-header .gm.year-start { border-left:1.5px solid var(--text); font-weight:700; color:var(--text); }
.gantt-timeline-rows { position:relative; }
.gantt-grid-line { position:absolute; top:0; bottom:0; width:0; border-left:0.5px solid var(--border); z-index:0; }
.gantt-grid-line.year-start { border-left:1.5px solid var(--border); opacity:.6; }
.gantt-minor-line { position:absolute; top:0; bottom:0; width:0; border-left:0.5px dotted var(--border); opacity:.55; z-index:0; }
.gantt-weekend { position:absolute; top:0; bottom:0; background:var(--weekend-tint); z-index:0; pointer-events:none; }
.gantt-week-ticks { position:relative; height:14px; border-bottom:0.5px dotted var(--border); }
.gantt-week-ticks .wt { position:absolute; top:1px; font-size:9px; font-weight:700; color:var(--accent); opacity:.75; white-space:nowrap; }
.gantt-day-ticks { position:relative; height:16px; border-bottom:0.5px solid var(--border); }
.gantt-day-ticks .dt { position:absolute; top:2px; font-size:9px; color:var(--muted); transform:translateX(-50%); white-space:nowrap; }
.gantt-today-line { position:absolute; top:0; bottom:0; width:0; border-left:1.5px solid var(--red); z-index:5; }
.gantt-today-label { position:absolute; top:50%; transform:translate(-50%,-50%); background:var(--red); color:#fff; font-size:9px; font-weight:700; padding:1px 5px; border-radius:7px; white-space:nowrap; z-index:6; pointer-events:none; }
.gantt-track-row { position:relative; border-bottom:0.5px solid var(--border); box-sizing:border-box; }
.gantt-marker { position:absolute; top:50%; width:11px; height:11px; margin-top:-6px; margin-left:-6px; border-radius:2px; transform:rotate(45deg); background:var(--accent); opacity:.85; z-index:3; }
.gantt-marker.gantt-done { background:var(--green); }
.gantt-marker.gantt-late { background:var(--red); }
.gantt-marker.gantt-marker-moved { box-shadow: 0 0 0 2px #ff9500; }
.gantt-marker.gantt-critical { box-shadow: 0 0 0 2px var(--red); }
.gantt-marker-ghost { background: transparent !important; border: 1.5px dashed var(--muted); opacity: 0.7; }
.gantt-move-line { position: absolute; top: 50%; height: 0; border-top: 1.5px dashed #ff9500; z-index: 2; }
.gantt-bar { position:absolute; top:50%; margin-top:-10px; height:20px; min-width:6px; border-radius:6px; background:var(--gray); opacity:.9; z-index:2; }
.gantt-bar.gantt-bar-moved { box-shadow: 0 0 0 2px #ff9500; }
.gantt-bar.gantt-critical { box-shadow: 0 0 0 2px var(--red); }
.gantt-bar-label { position: absolute; inset: 0; display: flex; align-items: center; padding: 0 8px; font-size: 11px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 1px rgba(0,0,0,0.3); pointer-events: none; }
.gantt-critical-marker { position: absolute; top: 50%; margin-top: -10px; height: 20px; min-width: 4px; background: var(--red); border-radius: 3px; box-shadow: 0 0 0 1.5px var(--surface); z-index: 3; }
.gantt-track-row.sub .gantt-bar { height: 14px; margin-top: -7px; background: var(--gray-light); }
.gantt-track-row.sub .gantt-bar.gantt-done { background: var(--green); }
.gantt-track-row.sub .gantt-bar.gantt-late { background: var(--red); }
.gantt-bar-ghost { position: absolute; top: 50%; margin-top: -10px; height: 20px; min-width: 6px; border-radius: 6px; border: 1.5px dashed var(--muted); background: transparent; opacity: 0.6; z-index: 1; }
.gantt-track-row.sub .gantt-bar-ghost { height: 14px; margin-top: -7px; }
.col-date.moved { color: #ff9500; font-weight: 700; }
.empty { text-align:center; padding:40px 20px; color:var(--muted); }
.scale-row { display:flex; gap:6px; padding:0 20px 12px; align-items:center; }
.scale-row span { font-size:11px; color:var(--muted); margin-right:2px; }
.scale-row button { padding:5px 14px; border-radius:20px; border:0.5px solid var(--border); background:transparent; color:var(--muted); font-size:12px; font-family:inherit; cursor:pointer; }
.scale-row button.active { background:rgba(124,58,237,0.1); color:var(--accent); border-color:rgba(124,58,237,0.3); font-weight:600; }
.collapse-row { display:flex; gap:6px; padding:0 20px 12px; }
.collapse-row button { padding:6px 16px; border-radius:20px; border:0.5px solid rgba(124,58,237,0.35); background:rgba(124,58,237,0.1); color:var(--accent); font-size:12px; font-weight:700; font-family:inherit; cursor:pointer; }
.legend-row { display:flex; flex-wrap:wrap; gap:14px; padding:0 20px 12px; font-size:11px; color:var(--muted); }
.legend-item { display:flex; align-items:center; gap:5px; }
.legend-dot { width:9px; height:9px; margin-top:-1px; border-radius:2px; transform:rotate(45deg); flex-shrink:0; background:var(--accent); }
.legend-dot.legend-done { background:var(--green); }
.legend-dot.legend-late { background:var(--red); }
.legend-dot.legend-moved { background:var(--accent); box-shadow:0 0 0 2px #ff9500; }
.legend-dot.legend-critical { background:var(--accent); box-shadow:0 0 0 2px var(--red); }
.evid-box { margin:14px 20px 0; padding-top:14px; border-top:0.5px solid var(--border); }
.evid-box-title { font-size:12px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.03em; margin-bottom:6px; }
.evid-row { display:flex; align-items:flex-start; gap:8px; padding:8px 0; border-bottom:0.5px solid var(--border); }
.evid-row:last-child { border-bottom:none; }
.evid-row-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.evid-row-name { font-size:14px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.evid-row-desc { font-size:12px; font-weight:400; color:var(--muted); line-height:1.35; }
.evid-badge { font-size:11px; font-weight:600; padding:2px 7px; border-radius:8px; background:rgba(142,142,147,0.15); color:var(--muted); white-space:nowrap; flex-shrink:0; }
.resp-badge { font-size:11px; color:var(--muted); white-space:nowrap; }
.evid-row-body .resp-badge { align-self: flex-start; }
</style>
</head>
<body>
<div class="hd">
  <h1>📊 Gantt — projekty</h1>
  <div class="meta">Živě k ${escHtml_(generatedAt)} · data se načítají znovu při každém otevření</div>
</div>
<div class="legend-row">
  <span class="legend-item"><span class="legend-dot"></span>Naplánováno</span>
  <span class="legend-item"><span class="legend-dot legend-done"></span>Splněno</span>
  <span class="legend-item"><span class="legend-dot legend-late"></span>Po termínu</span>
  <span class="legend-item"><span class="legend-dot legend-moved"></span>Termín posunut</span>
  <span class="legend-item"><span class="legend-dot legend-critical"></span>Kritické</span>
</div>
<div class="collapse-row">
  <button onclick="collapseAll()">▸ Sbalit vše</button>
  <button onclick="expandAll()">▾ Rozbalit vše</button>
</div>
<div class="scale-row" id="scaleRow">
  <span>Měřítko:</span>
  <button data-scale="week" onclick="setScale('week')">Týdny</button>
  <button data-scale="month" class="active" onclick="setScale('month')">Měsíce</button>
  <button data-scale="quarter" onclick="setScale('quarter')">Kvartály</button>
</div>
<div id="ganttWrap"></div>
${evidHtmlStatic}
<script>
let ITEMS = ${dataJson};
const collapsed = new Set(ITEMS.map(u => u.id));
function toggleCollapse(id) { if (collapsed.has(id)) collapsed.delete(id); else collapsed.add(id); render(); }
function collapseAll() { ITEMS.forEach(u => collapsed.add(u.id)); render(); }
function expandAll() { collapsed.clear(); render(); }
const GANTT_SCALES = { week: 20, month: 6, quarter: 2.2 };
let SCALE = 'month';
function setScale(s) {
  SCALE = s;
  document.querySelectorAll('#scaleRow button').forEach(b => b.classList.toggle('active', b.dataset.scale===s));
  render();
}
function esc(s){ const d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }
function fmtDate(d){ return new Date(d).toLocaleDateString('cs-CZ',{day:'numeric',month:'long',year:'numeric'}); }
function fmtDateShort(d){ return new Date(d).toLocaleDateString('cs-CZ',{day:'numeric',month:'numeric'}); }
function effDate(u){ return u.nahradniTermin || u.date; }
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((date - firstThursday) / 604800000);
}
function orderByChain(arr){
  const byId={}; arr.forEach(u=>{byId[u.id]=u;});
  const succMap={};
  arr.forEach(u=>{ if(u.predecessorId && byId[u.predecessorId]) (succMap[u.predecessorId]=succMap[u.predecessorId]||[]).push(u); });
  const rendered=new Set(); const out=[];
  function place(u){ if(rendered.has(u.id))return; out.push(u); rendered.add(u.id); (succMap[u.id]||[]).forEach(place); }
  arr.forEach(u=>{ if(!(u.predecessorId && byId[u.predecessorId])) place(u); });
  arr.forEach(u=>{ if(!rendered.has(u.id)) place(u); });
  return out;
}

function render() {
  const el = document.getElementById('ganttWrap');
  if (!ITEMS.length) { el.innerHTML = '<div class="empty">Žádné projekty.</div>'; return; }
  const DAY = 86400000, PX_PER_DAY = GANTT_SCALES[SCALE] || GANTT_SCALES.month;
  const todayStr = new Date().toISOString().slice(0,10);
  const todayD = new Date(); todayD.setHours(0,0,0,0);
  ITEMS = orderByChain(ITEMS);
  const dates = ITEMS.flatMap(i => [new Date(i.start+'T00:00:00'), new Date(i.date+'T00:00:00'), new Date(effDate(i)+'T00:00:00')]);
  ITEMS.forEach(i => i.kids.forEach(k => { if (k.start) dates.push(new Date(k.start+'T00:00:00')); dates.push(new Date(k.date+'T00:00:00')); dates.push(new Date(effDate(k)+'T00:00:00')); }));
  dates.push(todayD);
  const minD = new Date(Math.min(...dates)), maxD = new Date(Math.max(...dates));
  const rangeStart = new Date(minD.getFullYear(), minD.getMonth(), 1);
  const rangeEnd = new Date(maxD.getFullYear(), maxD.getMonth()+1, 0);
  const dayOffset = d => Math.round((d - rangeStart) / DAY);
  const totalDays = dayOffset(rangeEnd) + 1;
  const totalPx = totalDays * PX_PER_DAY;

  let months = [], cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const monthDays = new Date(cur.getFullYear(), cur.getMonth()+1, 0).getDate();
    months.push({ start: monthStart, days: monthDays, isYearStart: monthStart.getMonth()===0 });
    cur.setMonth(cur.getMonth()+1);
  }
  let monthHtml = '', gridHtml = '';
  months.forEach(m => {
    const left = dayOffset(m.start) * PX_PER_DAY, width = m.days * PX_PER_DAY;
    const label = m.start.toLocaleDateString('cs-CZ', m.isYearStart ? {month:'short',year:'numeric'} : {month:'short'});
    monthHtml += '<div class="gm'+(m.isYearStart?' year-start':'')+'" style="left:'+left+'px;width:'+width+'px">'+esc(label)+'</div>';
    gridHtml += '<div class="gantt-grid-line'+(m.isYearStart?' year-start':'')+'" style="left:'+left+'px"></div>';
  });
  const todayLeft = dayOffset(todayD) * PX_PER_DAY;
  const todayLabel = todayD.toLocaleDateString('cs-CZ', {day:'numeric', month:'numeric'});

  const minorStepDays = SCALE === 'week' ? 1 : (SCALE === 'month' ? 7 : 15);
  let dayTicksHtml = '', minorGridHtml = '';
  for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + minorStepDays)) {
    const dLeft = dayOffset(d) * PX_PER_DAY;
    dayTicksHtml += '<span class="dt" style="left:'+dLeft+'px">'+d.getDate()+'</span>';
    minorGridHtml += '<div class="gantt-minor-line" style="left:'+dLeft+'px"></div>';
  }

  let weekTicksHtml = '', weekendHtml = '';
  for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    const wLeft = dayOffset(d) * PX_PER_DAY;
    if (dow === 1 || d.getTime() === rangeStart.getTime()) {
      weekTicksHtml += '<span class="wt" style="left:'+wLeft+'px">T'+isoWeek(d)+'</span>';
    }
    if (dow === 0 || dow === 6) {
      weekendHtml += '<div class="gantt-weekend" style="left:'+wLeft+'px;width:'+PX_PER_DAY+'px"></div>';
    }
  }

  const labelsColPx = Math.min(500, Math.max(320, window.innerWidth * 0.42));
  const nameColPx = labelsColPx - 12 - 44*2 - 62 - 18;
  const rowH1=34, rowH2=50, subH1=28, subH2=42;
  const estLines = (text, extraPad) => {
    const perLine = Math.max(10, Math.floor((nameColPx - (extraPad||0)) / 6.3));
    return text.length > perLine ? 2 : 1;
  };
  const estDescLines = (text) => {
    if (!text) return 0;
    const perLine = Math.max(10, Math.floor(labelsColPx / 6.2));
    return Math.max(1, Math.ceil(text.length / perLine));
  };

  let labelsHtml = '', rowsHtml = '';
  let yCursor = 0;
  const posMap = {};
  const depList = [];
  ITEMS.forEach(u => {
    const left = dayOffset(new Date(u.start+'T00:00:00')) * PX_PER_DAY;
    const uEff = effDate(u);
    const uMoved = !!u.nahradniTermin && u.nahradniTermin !== u.date;
    const width = Math.max(dayOffset(new Date(uEff+'T00:00:00')) * PX_PER_DAY - left, PX_PER_DAY);
    const isCollapsed = collapsed.has(u.id);
    const showDesc = !isCollapsed && !!u.note;
    const baseRowH = estLines(u.name) === 2 ? rowH2 : rowH1;
    const descH = showDesc ? (estDescLines(u.note) * 17 + 22) : 0;
    const rowH = baseRowH + descH;
    posMap[u.id] = { top: yCursor, height: rowH, x1: left, x2: left+width };
    depList.push({ id: u.id, predecessorId: u.predecessorId||'' });
    yCursor += rowH;
    const hasKids = u.kids.length > 0;
    const collapseBtn = hasKids ? '<span onclick="event.stopPropagation();toggleCollapse(\\''+u.id+'\\')" style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin-right:2px;color:var(--accent);background:rgba(124,58,237,0.12);border-radius:50%;font-size:13px;font-weight:900;vertical-align:middle">'+(isCollapsed?'▸':'▾')+'</span>' : '';
    const descHtml = showDesc ? '<div class="evid-row-desc" style="padding:4px 12px 12px 18px">'+esc(u.note)+'</div>' : '';
    labelsHtml += '<div class="gantt-row-label" style="height:'+rowH+'px;flex-direction:column;align-items:stretch;gap:0"><div style="display:flex;align-items:center;gap:6px;height:'+baseRowH+'px;flex-shrink:0"><div class="col-name" title="'+esc(u.name)+'">'+collapseBtn+esc(u.name)+(isCollapsed?' <span style="font-size:10px;color:var(--muted)">('+u.kids.length+')</span>':'')+'</div><div class="col-date">'+fmtDateShort(u.start)+'</div><div class="col-date'+(uMoved?' moved':'')+'" title="'+(uMoved?'Původně: '+fmtDate(u.date):'')+'">'+fmtDateShort(uEff)+'</div><div class="col-resp">'+(u.zodpovida?esc(u.zodpovida):'–')+'</div></div>'+descHtml+'</div>';
    const barTitle = uMoved ? (esc(u.name)+': '+fmtDate(u.start)+' – '+fmtDate(uEff)+' (původně do '+fmtDate(u.date)+')') : (esc(u.name)+': '+fmtDate(u.start)+' – '+fmtDate(u.date));
    const origWidth = Math.max(dayOffset(new Date(u.date+'T00:00:00')) * PX_PER_DAY - left, PX_PER_DAY);
    const ghostBar = uMoved ? ('<div class="gantt-bar-ghost" style="left:'+left+'px;width:'+origWidth+'px" title="Původní termín: '+fmtDate(u.date)+'"></div>') : '';
    const criticalOverlayHtml = u.kids.filter(k => k.kriticky).map(k => {
      const kEff2 = effDate(k);
      const kHasRange2 = !!k.start;
      const kLeft2 = dayOffset(new Date((kHasRange2 ? k.start : kEff2)+'T00:00:00')) * PX_PER_DAY;
      const kWidth2 = kHasRange2 ? Math.max(dayOffset(new Date(kEff2+'T00:00:00')) * PX_PER_DAY - kLeft2, PX_PER_DAY) : Math.max(PX_PER_DAY, 4);
      return '<div class="gantt-critical-marker" style="left:'+kLeft2+'px;width:'+kWidth2+'px" title="🔴 Kritické: '+esc(k.name)+'"></div>';
    }).join('');
    rowsHtml += '<div class="gantt-track-row" style="height:'+rowH+'px">'+ghostBar+'<div class="gantt-bar'+(uMoved?' gantt-bar-moved':'')+(u.kriticky?' gantt-critical':'')+'" style="left:'+left+'px;width:'+width+'px" title="'+barTitle+'"><span class="gantt-bar-label">'+esc(u.name)+'</span></div>'+criticalOverlayHtml+'</div>';
    if (isCollapsed) return;
    u.kids = orderByChain(u.kids.slice().sort((a,b)=>effDate(a).localeCompare(effDate(b))));
    u.kids.forEach(k => {
      const kEff = effDate(k);
      const kMoved = !!k.nahradniTermin && k.nahradniTermin !== k.date;
      const kHasRange = !!k.start;
      const kLeft = dayOffset(new Date((kHasRange ? k.start : kEff)+'T00:00:00')) * PX_PER_DAY;
      const kWidth = kHasRange ? Math.max(dayOffset(new Date(kEff+'T00:00:00')) * PX_PER_DAY - kLeft, PX_PER_DAY) : 0;
      const kCls = (k.done ? 'gantt-done' : (kEff < todayStr ? 'gantt-late':'')) + (k.kriticky ? ' gantt-critical' : '');
      const kRowH = estLines(k.name, 14) === 2 ? subH2 : subH1;
      posMap[k.id] = { top: yCursor, height: kRowH, x1: kLeft, x2: kHasRange ? kLeft+kWidth : kLeft };
      depList.push({ id: k.id, predecessorId: k.predecessorId||'' });
      yCursor += kRowH;
      labelsHtml += '<div class="gantt-row-label sub" style="height:'+kRowH+'px"><div class="col-name" title="'+esc(k.name)+'">↳ '+esc(k.name)+'</div><div class="col-date">'+(kHasRange?fmtDateShort(k.start):'–')+'</div><div class="col-date'+(kMoved?' moved':'')+'" title="'+(kMoved?'Původně: '+fmtDate(k.date):'')+'">'+fmtDateShort(kEff)+'</div><div class="col-resp">'+(k.zodpovida?esc(k.zodpovida):'–')+'</div></div>';
      let kGhost = '';
      if (kHasRange) {
        const kTitle = kMoved
          ? (esc(k.name)+': '+fmtDate(k.start)+' – '+fmtDate(kEff)+' (původně do '+fmtDate(k.date)+')')
          : (esc(k.name)+': '+fmtDate(k.start)+' – '+fmtDate(k.date));
        if (kMoved) {
          const origWidth = Math.max(dayOffset(new Date(k.date+'T00:00:00')) * PX_PER_DAY - kLeft, PX_PER_DAY);
          kGhost = '<div class="gantt-bar-ghost" style="left:'+kLeft+'px;width:'+origWidth+'px" title="Původní termín: '+fmtDate(k.date)+'"></div>';
        }
        rowsHtml += '<div class="gantt-track-row sub" style="height:'+kRowH+'px">'+kGhost+'<div class="gantt-bar '+kCls+(kMoved?' gantt-bar-moved':'')+'" style="left:'+kLeft+'px;width:'+kWidth+'px" title="'+kTitle+'"></div></div>';
      } else {
        const kTitle = kMoved ? (esc(k.name)+': '+fmtDate(kEff)+' (původně '+fmtDate(k.date)+')') : (esc(k.name)+': '+fmtDate(kEff));
        if (kMoved) {
          const kOrigLeft = dayOffset(new Date(k.date+'T00:00:00')) * PX_PER_DAY;
          const lineLeft = Math.min(kOrigLeft, kLeft), lineWidth = Math.abs(kLeft - kOrigLeft);
          kGhost = '<div class="gantt-move-line" style="left:'+lineLeft+'px;width:'+lineWidth+'px"></div><div class="gantt-marker gantt-marker-ghost" style="left:'+kOrigLeft+'px" title="Původní termín: '+fmtDate(k.date)+'"></div>';
        }
        rowsHtml += '<div class="gantt-track-row sub" style="height:'+kRowH+'px">'+kGhost+'<div class="gantt-marker '+kCls+(kMoved?' gantt-marker-moved':'')+'" style="left:'+kLeft+'px" title="'+kTitle+'"></div></div>';
      }
    });
  });

  let connectorsHtml = '';
  depList.forEach(d => {
    if (!d.predecessorId || !posMap[d.predecessorId] || !posMap[d.id]) return;
    const p = posMap[d.predecessorId], s = posMap[d.id];
    const x1 = p.x2, y1 = p.top + p.height/2, x2 = s.x1, y2 = s.top + s.height/2;
    const gap = 10, x1o = x1 + gap, x2o = x2 - gap, yMid = Math.round((y1+y2)/2);
    connectorsHtml += '<path d="M '+x1+' '+y1+' H '+x1o+' V '+yMid+' H '+x2o+' V '+y2+' H '+x2+'" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#ganttArrow)" />';
  });
  const connectorsSvg = connectorsHtml
    ? '<svg style="position:absolute;top:0;left:0;width:'+totalPx+'px;height:'+yCursor+'px;pointer-events:none;z-index:4" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ganttArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="var(--accent)"/></marker></defs>'+connectorsHtml+'</svg>'
    : '';

  el.innerHTML = '<div class="gantt-wrap"><div class="gantt-body">'+
    '<div class="gantt-labels"><div class="gantt-label-header"><div class="col-name">Úkol</div><div class="col-date">Od</div><div class="col-date">Do</div><div class="col-resp">Zodp.</div></div><div style="height:30px"></div>'+labelsHtml+'</div>'+
    '<div class="gantt-timeline" id="ganttTimeline"><div style="width:'+totalPx+'px;position:relative">'+
      '<div class="gantt-month-header" style="width:'+totalPx+'px">'+monthHtml+'</div>'+
      '<div class="gantt-week-ticks" style="width:'+totalPx+'px">'+weekTicksHtml+'</div>'+
      '<div class="gantt-day-ticks" style="width:'+totalPx+'px">'+dayTicksHtml+'<div class="gantt-today-label" style="left:'+todayLeft+'px">'+todayLabel+'</div></div>'+
      '<div class="gantt-timeline-rows" style="width:'+totalPx+'px">'+weekendHtml+gridHtml+minorGridHtml+'<div class="gantt-today-line" style="left:'+todayLeft+'px" title="Dnes '+todayLabel+'"></div>'+rowsHtml+connectorsSvg+'</div>'+
    '</div></div>'+
  '</div></div>';

  const tl = document.getElementById('ganttTimeline');
  if (tl) tl.scrollLeft = Math.max(todayLeft - 160, 0);
}
render();
</script>
</body>
</html>`;
}
