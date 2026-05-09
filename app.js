const STORAGE_KEY = 'victor-svensexa-bingo-v1';
const ACTIVE_PLAYER_KEY = 'victor-svensexa-active-player-v1';
const VICTOR_PIN = '2408';
const ADMIN_PIN = '1989';
const PRESET_PLAYERS = [
  { id: 'oscar-malmstrom', name: 'Oscar Malmström', avatar: 'OM', role: 'guest' },
  { id: 'joel-lettevall', name: 'Joel Lettevall', avatar: 'JL', role: 'guest' },
  { id: 'carl-ake-willberg', name: 'Carl-Åke Willberg', avatar: 'CW', role: 'guest' },
  { id: 'lucas-dingle', name: 'Lucas Dingle', avatar: 'LD', role: 'guest' },
  { id: 'mattias-qvarfordt', name: 'Mattias Qvarfordt', avatar: 'MQ', role: 'guest' },
  { id: 'anton-liljefors', name: 'Anton Liljefors', avatar: 'AL', role: 'guest' },
  { id: 'hampus-becktor-thun', name: 'Hampus BeCKtor Thun', avatar: 'HB', role: 'guest' },
  { id: 'david-svanholm', name: 'David Svanholm', avatar: 'DS', role: 'guest' }
];
const TASKS = [
  { id: 'danska', title: 'För ett samtal på danska', detail: 'JF är enväldig domare.', level: 'medium' },
  { id: 'sj-vagn', title: 'Förklara vagnordningen på SJ-tåget Malmö–Stockholm för en främling', detail: 'Extra plus om personen verkar köpa förklaringen.', level: 'kaos' },
  { id: 'cykel-selfie', title: 'Ta en selfie på en cykel', detail: 'Cykeln ska synas tydligt.', level: 'latt' },
  { id: 'komplimanger', title: 'Ge komplimanger till tre främlingar så att de ler', detail: 'Snällt, snyggt och utan att vara obekväm.', level: 'medium' },
  { id: 'annan-grupp', title: 'Hitta en annan svensexa eller möhippa och ta en bild med dem', detail: 'Gruppbild räknas.', level: 'medium' },
  { id: 'ny-ol', title: 'Prova en öl du aldrig har druckit tidigare', detail: 'Skriv gärna betyg 1–5.', level: 'latt' },
  { id: 'nynna', title: 'Nynna en låt och få en främling att gissa vilken det är', detail: 'Ingen sångtext, bara nynning.', level: 'kaos' },
  { id: 'portratt-tove', title: 'Rita ett porträtt av Tove', detail: 'Porträttet ska visas upp för gänget.', level: 'latt' },
  { id: 'tal', title: 'Håll ett tal för gänget', detail: 'Minst 45 sekunder. Bonus för känsla.', level: 'medium' },
  { id: 'shot-utan-hander', title: 'Ta en shot utan att använda händerna', detail: 'Gänget avgör om tekniken är godkänd.', level: 'kaos' },
  { id: 'brollopsnatten', title: 'Be någon om tips inför bröllopsnatten', detail: 'Skriv ner tipset i appen.', level: 'kaos' },
  { id: 'gratis-drink', title: 'Få en gratis drink av en främling', detail: 'Får inte vara någon i sällskapet.', level: 'kaos' },
  { id: 'armbrytning', title: 'Kör armbrytning med en främling', detail: 'Vinst krävs inte. Stilpoäng räknas.', level: 'medium' },
  { id: 'ny-drink', title: 'Prova en drink du aldrig har druckit tidigare', detail: 'Skriv gärna namnet på drinken.', level: 'latt' },
  { id: 'hitta-lek', title: 'Hitta på en lek som gänget ska leka under dagen', detail: 'Leken ska genomföras av minst tre personer.', level: 'medium' },
  { id: 'aktenskapsrad', title: 'Samla in fem äktenskapsråd från främlingar', detail: 'Spara råden i anteckningen.', level: 'medium' }
];
const LEVEL_LABELS = { latt: 'Lätt', medium: 'Medium', kaos: 'Kaos' };
let state = loadState();
let selectedTaskId = null;
let activeTab = 'bingo';
let pendingProfileId = loadActiveProfile()?.id || PRESET_PLAYERS[0].id;

function defaultState() {
  return {
    schemaVersion: 2,
    eventName: 'Victors Svensexa-bingo',
    user: null,
    players: [],
    completed: {},
    notes: {},
    proofs: {},
    predictions: {},
    votes: {},
    comments: [],
    bonusTasks: [],
    feed: [],
    createdAt: new Date().toISOString()
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const loaded = raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
    const normalized = normalizeState(loaded);
    const activeProfile = loadActiveProfile();
    if (activeProfile) {
      normalized.user = activeProfile;
      ensurePlayerIn(normalized, activeProfile);
    }
    return normalized;
  } catch { return defaultState(); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function byId(id) { return document.getElementById(id); }
function esc(str='') { return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function nowText(iso) { return new Date(iso).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }); }
function currentPlayerName() { return state.user?.name || 'Anonym'; }
function currentPlayerId() { return state.user?.id || profileIdFromName(currentPlayerName()); }
function isVictor() { return state.user?.role === 'victor'; }
function isAdmin() { return state.user?.role === 'admin' || isVictor(); }
function taskById(id) { return TASKS.find(t => t.id === id); }
function sameName(a='', b='') { return a.trim().toLowerCase() === b.trim().toLowerCase(); }
function slugifyName(name='') {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person';
}
function initials(name='') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return `${parts[0][0] || ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
}
function profileIdFromName(name='') {
  const preset = PRESET_PLAYERS.find(p => sameName(p.name, name));
  return preset?.id || `custom-${slugifyName(name)}`;
}
function normalizeProfile(profile) {
  if (!profile?.name) return null;
  const preset = PRESET_PLAYERS.find(p => p.id === profile.id || sameName(p.name, profile.name));
  if (preset) return { ...preset, role: profile.role || preset.role, at: profile.at };
  return {
    id: profile.id || profileIdFromName(profile.name),
    name: profile.name.trim(),
    avatar: profile.avatar || initials(profile.name),
    role: profile.role || 'guest',
    custom: profile.custom ?? true,
    at: profile.at
  };
}
function profileById(id) {
  return knownPlayers().find(p => p.id === id) || PRESET_PLAYERS.find(p => p.id === id);
}
function knownPlayers() {
  const map = new Map();
  PRESET_PLAYERS.forEach(p => map.set(p.id, p));
  (state.players || []).map(normalizeProfile).filter(Boolean).forEach(p => map.set(p.id, { ...map.get(p.id), ...p }));
  if (state.user) {
    const user = normalizeProfile(state.user);
    if (user) map.set(user.id, { ...map.get(user.id), ...user });
  }
  return [...map.values()];
}
function registeredPlayers() {
  return (state.players || []).map(normalizeProfile).filter(Boolean);
}
function ensurePlayer(profile) { ensurePlayerIn(state, profile); }
function ensurePlayerIn(targetState, profile) {
  const normalized = normalizeProfile(profile);
  if (!normalized) return;
  targetState.players = (targetState.players || []).map(normalizeProfile).filter(Boolean);
  const idx = targetState.players.findIndex(p => p.id === normalized.id);
  const saved = { ...normalized, at: normalized.at || new Date().toISOString() };
  if (idx >= 0) targetState.players[idx] = { ...targetState.players[idx], ...saved };
  else targetState.players.push(saved);
}
function loadActiveProfile() {
  try {
    const raw = localStorage.getItem(ACTIVE_PLAYER_KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : null;
  } catch { return null; }
}
function saveActiveProfile(profile) {
  localStorage.setItem(ACTIVE_PLAYER_KEY, JSON.stringify(normalizeProfile(profile)));
}
function clearActiveProfile() { localStorage.removeItem(ACTIVE_PLAYER_KEY); }
function normalizeState(input) {
  const next = { ...defaultState(), ...input, schemaVersion: 2 };
  next.players = (next.players || []).map(normalizeProfile).filter(Boolean);
  if (next.user) next.user = normalizeProfile(next.user);
  const ensureFromKey = key => {
    const profile = profileByLegacyKey(key, next.players);
    ensurePlayerIn(next, profile);
    return profile.id;
  };
  next.predictions = normalizePlayerMap(next.predictions, ensureFromKey);
  next.votes = normalizePlayerMap(next.votes, ensureFromKey);
  next.comments = Array.isArray(next.comments) ? next.comments.map(c => normalizeAttribution(c, next.players)).filter(Boolean) : [];
  next.bonusTasks = Array.isArray(next.bonusTasks) ? next.bonusTasks.map(b => normalizeAttribution(b, next.players)).filter(Boolean) : [];
  next.feed = Array.isArray(next.feed) ? next.feed.map(f => normalizeAttribution(f, next.players)).filter(Boolean) : [];
  return next;
}
function normalizePlayerMap(map={}, keyToId) {
  return Object.entries(map || {}).reduce((acc, [key, value]) => {
    const id = PRESET_PLAYERS.some(p => p.id === key) || String(key).startsWith('custom-') || ['victor', 'admin'].includes(key) ? key : keyToId(key);
    acc[id] = value;
    return acc;
  }, {});
}
function profileByLegacyKey(key, players=[]) {
  return normalizeProfile(players.find(p => p.id === key || sameName(p.name, key)))
    || PRESET_PLAYERS.find(p => p.id === key || sameName(p.name, key))
    || normalizeProfile({ id: profileIdFromName(key), name: key, role: 'guest', custom: true });
}
function normalizeAttribution(item, players=[]) {
  if (!item) return null;
  const byId = item.byId || (item.by ? profileByLegacyKey(item.by, players).id : null);
  const profile = byId ? profileByLegacyKey(byId, players) : null;
  return { ...item, byId, by: item.by || profile?.name || 'Anonym' };
}

function render() {
  const app = byId('app');
  app.innerHTML = `${renderHero()}${state.user ? renderMain() : renderLogin()}${renderDrawer()}`;
  attachHandlers();
}
function renderHero() {
  const done = Object.keys(state.completed).length;
  const rows = bingoLines().length;
  return `<section class="hero"><h1>${esc(state.eventName)}</h1><p>Digital bingobricka för dagen: Victor checkar av uppdrag, gänget tippar, röstar och samlar bevis. Allt körs gratis och open source direkt i webbläsaren.</p><div class="pillbar"><span class="pill">${done}/16 klara</span><span class="pill">${rows} bingo-rader</span><span class="pill">${registeredPlayers().length} aktiva deltagare</span><span class="pill">Offline-redo</span></div></section>`;
}
function renderLogin() {
  return `<section class="panel"><h2>Välj deltagare</h2><p class="small">Gäster väljer bara profil. Victor och JF/admin kräver PIN. All data sparas lokalt i webbläsaren; använd export/import om ni vill flytta status mellan mobiler.</p><div class="grid-2"><div><div class="field"><label>Läge</label><select id="roleInput"><option value="guest">Jag är med i gänget</option><option value="victor">Jag är Victor</option><option value="admin">Jag är JF/admin</option></select></div><div id="guestProfileWrap"><div class="profile-grid">${PRESET_PLAYERS.map(renderProfileChoice).join('')}<button class="profile-card ${pendingProfileId === 'custom' ? 'active' : ''}" type="button" data-profile="custom"><span class="avatar emoji">✍</span><span><strong>Annan person</strong><small>Skriv eget namn</small></span><span class="status-dot"></span></button></div><div class="field ${pendingProfileId === 'custom' ? '' : 'hidden'}" id="customNameWrap"><label>Eget namn</label><input id="customNameInput" placeholder="Skriv ditt namn" autocomplete="name"></div></div><div id="staffLoginWrap" class="hidden"><div class="field"><label>Namn</label><input id="nameInput" placeholder="Ex. Victor eller JF" autocomplete="name"></div><div class="field" id="pinWrap"><label>PIN</label><input id="pinInput" inputmode="numeric" placeholder="PIN"></div></div><button class="btn blue" id="loginBtn">Gå in</button></div><div>${renderParticipantList()}<div class="notice"><strong>Gratis-läge:</strong> Ingen server och ingen databas. Det gör appen billig, snabb och integritetsvänlig, men livesynk mellan olika mobiler kräver export/import eller att ni använder samma huvudtelefon.</div></div></div></section>`;
}
function renderProfileChoice(player) {
  const active = pendingProfileId === player.id || state.user?.id === player.id;
  return `<button class="profile-card ${active ? 'active' : ''}" type="button" data-profile="${player.id}"><span class="avatar">${esc(player.avatar)}</span><span><strong>${esc(player.name)}</strong><small>${registeredPlayers().some(p => p.id === player.id) ? 'Har deltagit' : 'Förvald profil'}</small></span><span class="status-dot"></span></button>`;
}
function renderParticipantList() {
  const players = knownPlayers();
  return `<div class="participant-list"><h3>Deltagarlista</h3>${players.map(p => `<div class="participant ${state.user?.id === p.id ? 'active' : ''}"><span class="avatar">${esc(p.avatar || initials(p.name))}</span><span><strong>${esc(p.name)}</strong><small>${state.user?.id === p.id ? 'Aktiv på denna enhet' : registeredPlayers().some(r => r.id === p.id) ? 'Aktiv i datan' : 'Ej aktiv ännu'}</small></span></div>`).join('')}</div>`;
}
function renderMain() {
  return `${renderActiveProfile()}<nav class="tabs">${tab('bingo','Bingo')}${tab('tips','Tippning')}${tab('feed','Liveflöde')}${tab('leader','Leaderboard')}${tab('admin', isAdmin() ? 'Admin' : 'Bonus')}</nav>${renderScores()}${activeTab === 'bingo' ? renderBingo() : ''}${activeTab === 'tips' ? renderTips() : ''}${activeTab === 'feed' ? renderFeed() : ''}${activeTab === 'leader' ? renderLeaderboard() : ''}${activeTab === 'admin' ? renderAdmin() : ''}`;
}
function tab(id, label) { return `<button class="tab ${activeTab===id?'active':''}" data-tab="${id}">${label}</button>`; }
function renderActiveProfile() {
  const player = normalizeProfile(state.user);
  return `<section class="profile-strip"><div class="participant active"><span class="avatar">${esc(player.avatar || initials(player.name))}</span><span><strong>${esc(player.name)}</strong><small>${player.role === 'victor' ? 'Victor-läge' : player.role === 'admin' ? 'JF/admin-läge' : 'Aktiv deltagare'}</small></span></div><button class="btn secondary" id="switchProfileBtn">Byt deltagare</button></section>`;
}
function renderScores() {
  return `<div class="scorebar"><div class="score"><strong>${Object.keys(state.completed).length}</strong><span>klara uppdrag</span></div><div class="score"><strong>${bingoLines().length}</strong><span>bingo-rader</span></div><div class="score"><strong>${Object.keys(state.predictions).length}</strong><span>tippare</span></div><div class="score"><strong>${popularNext()[0]?.count || 0}</strong><span>röster på toppvalet</span></div></div>`;
}
function renderBingo() {
  return `<section class="panel"><div class="row" style="justify-content:space-between"><div><h2>Bingobrickan</h2><p class="small">Tryck på en ruta för detaljer. Victor/admin kan markera som klar och lägga till bevis.</p></div>${isVictor()?'<button class="btn yellow" id="randomTaskBtn">Slumpa nästa</button>':''}</div><div class="bingo-grid">${TASKS.map(renderTask).join('')}</div></section>`;
}
function renderTask(t) {
  const done = !!state.completed[t.id];
  const votes = Object.values(state.votes).filter(v => v === t.id).length;
  const hasProof = !!state.proofs[t.id];
  return `<button class="task ${done?'completed':''}" data-task="${t.id}"><span class="title">${esc(t.title)}</span><span class="meta"><span class="badge">${LEVEL_LABELS[t.level]}</span>${votes?`<span class="badge">${votes} röster</span>`:''}${hasProof?'<span class="badge">Bild</span>':''}${done?'<span class="badge">Klar</span>':''}</span></button>`;
}
function renderTips() {
  const myPred = state.predictions[currentPlayerId()] || [];
  const popular = popularNext();
  return `<section class="panel"><h2>Tippa & påverka</h2><p class="small">Välj uppdrag du tror Victor kommer klara. Välj också vilket uppdrag du vill se härnäst.</p><div class="grid-2"><div><h3>Min tippning</h3><div class="feed">${TASKS.map(t => `<label class="feed-item check-row"><input type="checkbox" class="predCheck" value="${t.id}" ${myPred.includes(t.id)?'checked':''}> <span>${esc(t.title)}</span></label>`).join('')}</div></div><div><h3>Publikens val</h3><div class="field"><label>Vilket uppdrag ska Victor göra härnäst?</label><select id="voteSelect"><option value="">Välj uppdrag</option>${TASKS.filter(t=>!state.completed[t.id]).map(t=>`<option value="${t.id}" ${state.votes[currentPlayerId()]===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}</select></div><button class="btn blue" id="saveTipsBtn">Spara mina val</button><div class="subpanel"><h3>Topplista publikens val</h3>${popular.length ? popular.slice(0,5).map((p,i)=>`<div class="leader-row"><span class="avatar">${i+1}</span><span>${esc(taskById(p.id)?.title)}</span><strong>${p.count}</strong></div>`).join('') : '<p class="small">Inga röster ännu.</p>'}</div></div></div></section>`;
}
function renderFeed() {
  return `<section class="panel"><h2>Liveflöde</h2><div class="feed">${state.feed.length ? state.feed.slice().reverse().map(item => `<article class="feed-item"><strong>${esc(item.title)}</strong><p class="small">${esc(item.by)} · ${nowText(item.at)}</p>${item.text?`<p>${esc(item.text)}</p>`:''}${item.img?`<img src="${item.img}" alt="Bevisbild">`:''}</article>`).join('') : '<p class="small">Inget har hänt ännu.</p>'}</div></section>`;
}
function renderLeaderboard() {
  const rows = leaderboard();
  return `<section class="panel"><h2>Leaderboard</h2><p class="small">Poäng: 2 poäng per korrekt tippat uppdrag som Victor har klarat. 1 bonuspoäng om personens publikval också har klarats.</p><div class="leader">${rows.length ? rows.map(r=>`<div class="leader-row"><span class="avatar">${esc(r.avatar)}</span><span><strong>${esc(r.name)}</strong><br><span class="small">${r.correct} rätta tips · ${r.voteBonus} röstbonus</span></span><strong>${r.score} p</strong></div>`).join('') : '<p class="small">Inga deltagare ännu.</p>'}</div></section>`;
}
function renderAdmin() {
  return `<section class="panel"><h2>${isAdmin() ? 'Admin & delning' : 'Bonusuppdrag'}</h2><div class="grid-2">${isAdmin()?`<div><h3>Export/import</h3><p class="small">Exportera/importera all JSON-data för att samla deltagarnas tips, röster, kommentarer och bonusuppdrag mellan enheter.</p><div class="row"><button class="btn blue" id="exportBtn">Exportera JSON</button><button class="btn secondary" id="importBtn">Importera JSON</button><button class="btn secondary" id="shareBtn">Dela sammanfattning</button></div></div>`:`<div class="notice"><strong>Adminverktyg:</strong> Export och import visas bara i Victor- eller JF/admin-läge med PIN.</div>`}<div><h3>Bonusuppdrag</h3><div class="field"><label>Föreslå bonusuppdrag</label><textarea id="bonusInput" placeholder="Ex. Få en bartender att skriva ett äktenskapsråd på en servett"></textarea></div><button class="btn blue" id="bonusBtn">Lägg till</button></div></div><div class="subpanel"><h3>Bonuslista</h3>${state.bonusTasks.length ? state.bonusTasks.map(b=>`<div class="feed-item"><strong>${esc(b.text)}</strong><p class="small">Föreslaget av ${esc(b.by)} · ${nowText(b.at)}</p></div>`).join('') : '<p class="small">Inga bonusuppdrag ännu.</p>'}</div>${isAdmin()?'<button class="btn danger" id="resetBtn">Nollställ lokal data</button>':''}</section>`;
}
function renderDrawer() {
  if (!selectedTaskId) return '';
  const t = taskById(selectedTaskId); if (!t) return '';
  const done = !!state.completed[t.id];
  const comments = (state.comments || []).filter(c => c.taskId === t.id).slice().reverse();
  return `<div class="backdrop" id="closeDrawer"></div><section class="drawer"><h2>${esc(t.title)}</h2><p>${esc(t.detail)}</p><p><span class="badge">${LEVEL_LABELS[t.level]}</span> ${done?'<span class="badge">Klar</span>':''}</p>${state.proofs[t.id]?`<img class="proof" src="${state.proofs[t.id]}" alt="Bevisbild">`:''}${isAdmin()?`<div class="field"><label>Adminanteckning / citat / råd</label><textarea id="noteInput">${esc(state.notes[t.id] || '')}</textarea></div><div class="field"><label>Bevisbild</label><input id="proofInput" type="file" accept="image/*" capture="environment"></div><div class="row"><button class="btn ${done?'secondary':'blue'}" id="toggleDoneBtn">${done?'Markera som ej klar':'Markera som klar'}</button><button class="btn secondary" id="saveNoteBtn">Spara anteckning</button></div>`:`<button class="btn blue" id="voteThisBtn">Jag vill se detta härnäst</button>`}<div class="field"><label>Kommentar</label><textarea id="commentInput" placeholder="Skriv en kommentar till uppdraget"></textarea></div><button class="btn secondary" id="commentBtn">Kommentera</button><div class="comment-list">${comments.length ? comments.map(c => `<div class="feed-item"><strong>${esc(c.by)}</strong><p>${esc(c.text)}</p><p class="small">${nowText(c.at)}</p></div>`).join('') : '<p class="small">Inga kommentarer ännu.</p>'}</div><br><button class="btn secondary" id="closeDrawer2">Stäng</button></section>`;
}
function attachHandlers() {
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { activeTab = b.dataset.tab; render(); });
  document.querySelectorAll('[data-task]').forEach(b => b.onclick = () => { selectedTaskId = b.dataset.task; render(); });
  document.querySelectorAll('[data-profile]').forEach(b => b.onclick = () => setPendingProfile(b.dataset.profile));
  const roleInput = byId('roleInput'); if (roleInput) roleInput.onchange = syncLoginMode;
  const loginBtn = byId('loginBtn'); if (loginBtn) loginBtn.onclick = login;
  const switchProfileBtn = byId('switchProfileBtn'); if (switchProfileBtn) switchProfileBtn.onclick = switchProfile;
  const close = byId('closeDrawer'); if (close) close.onclick = () => { selectedTaskId = null; render(); };
  const close2 = byId('closeDrawer2'); if (close2) close2.onclick = () => { selectedTaskId = null; render(); };
  const saveTips = byId('saveTipsBtn'); if (saveTips) saveTips.onclick = saveTipsHandler;
  const voteSelect = byId('voteSelect'); if (voteSelect) voteSelect.onchange = () => { if (voteSelect.value) state.votes[currentPlayerId()] = voteSelect.value; else delete state.votes[currentPlayerId()]; saveState(); };
  const voteThis = byId('voteThisBtn'); if (voteThis) voteThis.onclick = () => { state.votes[currentPlayerId()] = selectedTaskId; saveState(); selectedTaskId = null; activeTab = 'tips'; render(); };
  const toggleDone = byId('toggleDoneBtn'); if (toggleDone) toggleDone.onclick = toggleDoneHandler;
  const saveNote = byId('saveNoteBtn'); if (saveNote) saveNote.onclick = saveNoteHandler;
  const commentBtn = byId('commentBtn'); if (commentBtn) commentBtn.onclick = addComment;
  const proof = byId('proofInput'); if (proof) proof.onchange = proofHandler;
  const exportBtn = byId('exportBtn'); if (exportBtn) exportBtn.onclick = exportState;
  const importBtn = byId('importBtn'); if (importBtn) importBtn.onclick = () => byId('importFile').click();
  const importFile = byId('importFile'); if (importFile) importFile.onchange = importState;
  const shareBtn = byId('shareBtn'); if (shareBtn) shareBtn.onclick = shareSummary;
  const bonusBtn = byId('bonusBtn'); if (bonusBtn) bonusBtn.onclick = addBonus;
  const resetBtn = byId('resetBtn'); if (resetBtn) resetBtn.onclick = resetAll;
  const randomTaskBtn = byId('randomTaskBtn'); if (randomTaskBtn) randomTaskBtn.onclick = randomTask;
}
function setPendingProfile(id) {
  pendingProfileId = id;
  document.querySelectorAll('[data-profile]').forEach(card => card.classList.toggle('active', card.dataset.profile === id));
  byId('customNameWrap')?.classList.toggle('hidden', id !== 'custom');
  if (id === 'custom') byId('customNameInput')?.focus();
}
function syncLoginMode() {
  const role = byId('roleInput')?.value || 'guest';
  byId('guestProfileWrap')?.classList.toggle('hidden', role !== 'guest');
  byId('staffLoginWrap')?.classList.toggle('hidden', role === 'guest');
  const nameInput = byId('nameInput');
  if (nameInput && role === 'victor' && !nameInput.value) nameInput.value = 'Victor';
  if (nameInput && role === 'admin' && !nameInput.value) nameInput.value = 'JF';
}
function login() {
  const role = byId('roleInput').value; const pin = byId('pinInput')?.value.trim();
  let profile;
  if (role === 'guest') {
    if (pendingProfileId === 'custom') {
      const name = byId('customNameInput').value.trim();
      if (!name) return alert('Skriv ditt namn först.');
      profile = normalizeProfile({ name, role: 'guest', custom: true });
    } else {
      profile = PRESET_PLAYERS.find(p => p.id === pendingProfileId) || PRESET_PLAYERS[0];
    }
  } else {
    const name = byId('nameInput').value.trim();
    if (!name) return alert('Skriv ditt namn först.');
    profile = normalizeProfile({ id: role, name, role, avatar: role === 'victor' ? 'V' : 'JF', custom: true });
  }
  const name = profile.name;
  if (!name) return alert('Skriv ditt namn först.');
  if (role === 'victor' && pin !== VICTOR_PIN) return alert('Fel Victor-PIN.');
  if (role === 'admin' && pin !== ADMIN_PIN && pin !== VICTOR_PIN) return alert('Fel admin-PIN.');
  state.user = { ...profile, role };
  ensurePlayer(state.user);
  saveActiveProfile(state.user);
  saveState(); render();
}
function switchProfile() {
  state.user = null;
  selectedTaskId = null;
  clearActiveProfile();
  saveState();
  render();
}
function saveTipsHandler() {
  const chosen = [...document.querySelectorAll('.predCheck:checked')].map(x => x.value);
  state.predictions[currentPlayerId()] = chosen;
  const vote = byId('voteSelect').value; if (vote) state.votes[currentPlayerId()] = vote; else delete state.votes[currentPlayerId()];
  saveState(); alert('Sparat.'); render();
}
function toggleDoneHandler() {
  if (!selectedTaskId) return;
  if (state.completed[selectedTaskId]) {
    delete state.completed[selectedTaskId];
    addFeed(`Backade: ${taskById(selectedTaskId).title}`, '', null);
  } else {
    state.completed[selectedTaskId] = new Date().toISOString();
    addFeed(`Klarade: ${taskById(selectedTaskId).title}`, state.notes[selectedTaskId] || '', state.proofs[selectedTaskId] || null);
    if (bingoLines().length) confetti();
  }
  saveState(); render();
}
function saveNoteHandler() {
  state.notes[selectedTaskId] = byId('noteInput').value.trim(); saveState(); render();
}
function addComment() {
  const text = byId('commentInput').value.trim();
  if (!text || !selectedTaskId) return;
  state.comments.push({ id: uid(), taskId: selectedTaskId, text, byId: currentPlayerId(), by: currentPlayerName(), at: new Date().toISOString() });
  addFeed(`Kommentar: ${taskById(selectedTaskId).title}`, text);
  saveState(); render();
}
async function proofHandler(e) {
  const file = e.target.files[0]; if (!file) return;
  const img = await compressImage(file, 1400, .78);
  state.proofs[selectedTaskId] = img; saveState(); render();
}
function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = reject;
    reader.onload = () => { const image = new Image(); image.onload = () => { const scale = Math.min(1, maxWidth / image.width); const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', quality)); }; image.onerror = reject; image.src = reader.result; };
    reader.readAsDataURL(file);
  });
}
function addFeed(title, text='', img=null) { state.feed.push({ id: uid(), title, text, img, byId: currentPlayerId(), by: currentPlayerName(), at: new Date().toISOString() }); }
function popularNext() {
  const counts = {};
  Object.values(state.votes).forEach(id => { if (id && !state.completed[id]) counts[id] = (counts[id] || 0) + 1; });
  return Object.entries(counts).map(([id,count]) => ({id,count})).sort((a,b)=>b.count-a.count);
}
function leaderboard() {
  const doneIds = new Set(Object.keys(state.completed));
  const ids = new Set([...registeredPlayers().map(p => p.id), ...Object.keys(state.predictions), ...Object.keys(state.votes)]);
  return [...ids].map(id => {
    const profile = profileById(id) || { id, name: id, avatar: initials(id) };
    const pred = state.predictions[id] || [];
    const correct = pred.filter(taskId => doneIds.has(taskId)).length;
    const voteBonus = doneIds.has(state.votes[id]) ? 1 : 0;
    return { id, name: profile.name, avatar: profile.avatar || initials(profile.name), correct, voteBonus, score: correct * 2 + voteBonus };
  }).sort((a,b)=>b.score-a.score || b.correct-a.correct || a.name.localeCompare(b.name, 'sv'));
}
function bingoLines() {
  const done = id => !!state.completed[TASKS[id].id];
  const lines = [];
  for (let r=0;r<4;r++) lines.push([0,1,2,3].map(c=>r*4+c));
  for (let c=0;c<4;c++) lines.push([0,1,2,3].map(r=>r*4+c));
  lines.push([0,5,10,15], [3,6,9,12]);
  return lines.filter(line => line.every(done));
}
function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'victor-svensexa-status.json'; a.click(); URL.revokeObjectURL(url);
}
function importState(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader(); reader.onload = () => { try { const incoming = normalizeState(JSON.parse(reader.result)); state = { ...defaultState(), ...incoming, user: state.user }; ensurePlayer(state.user); saveState(); render(); alert('Import klart.'); } catch { alert('Kunde inte läsa JSON-filen.'); } }; reader.readAsText(file);
}
async function shareSummary() {
  const text = `${state.eventName}\nKlara uppdrag: ${Object.keys(state.completed).length}/16\nBingo-rader: ${bingoLines().length}\nTopp i tippningen: ${leaderboard()[0]?.name || 'ingen ännu'}`;
  if (navigator.share) await navigator.share({ title: state.eventName, text }); else navigator.clipboard.writeText(text).then(()=>alert('Sammanfattning kopierad.'));
}
function addBonus() {
  const text = byId('bonusInput').value.trim(); if (!text) return;
  state.bonusTasks.push({ id: uid(), text, byId: currentPlayerId(), by: currentPlayerName(), at: new Date().toISOString() }); addFeed(`Bonusuppdrag föreslaget`, text); saveState(); render();
}
function resetAll() { if (confirm('Nollställa all lokal data på den här enheten?')) { state = defaultState(); clearActiveProfile(); saveState(); render(); } }
function randomTask() { const pool = TASKS.filter(t => !state.completed[t.id]); if (!pool.length) return; selectedTaskId = pool[Math.floor(Math.random()*pool.length)].id; render(); }
function confetti() {
  const box = document.createElement('div'); box.className = 'confetti';
  for (let i=0;i<90;i++) { const el = document.createElement('i'); el.style.left = Math.random()*100 + 'vw'; el.style.animationDelay = Math.random()*0.45 + 's'; el.style.background = Math.random() > .5 ? '#fff200' : '#0073bd'; box.appendChild(el); }
  document.body.appendChild(box); setTimeout(()=>box.remove(), 2200);
}
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
