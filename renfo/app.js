/* app.js — Renfo Trail : génération de séances, fiches animées, lecteur de séance. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const byId = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
  const LS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };

  const TYPES = [
    { id: 'complet', icon: '⚡', name: 'Séance complète', desc: 'Lourd + pliométrie + prévention. Le format de référence, 2 fois par semaine.' },
    { id: 'force', icon: '🏋️', name: 'Force maximale', desc: 'Charges lourdes, peu de répétitions, longues récupérations. Économie de course.' },
    { id: 'plyo', icon: '🦘', name: 'Pliométrie', desc: 'Sauts et rebonds à faible volume. Raideur et réactivité du pied.' },
    { id: 'trail', icon: '⛰️', name: 'Spécial trail', desc: 'Montée sur un appui, freinage excentrique pour la descente, dévers.' },
    { id: 'prevention', icon: '🛡️', name: 'Prévention blessures', desc: 'Hanche, tronc, mollets, tendon d\'Achille et pied. Programme type Run RCT.' },
    { id: 'core', icon: '🧘', name: 'Gainage', desc: 'Tronc et bassin stables quand la fatigue arrive.' },
  ];
  const SLOTS = {
    complet: [['back-squat', 'leg-press', 'goblet-squat', 'pistol-box', 'squat'], ['pogo'], ['deadlift', 'rdl', 'leg-curl', 'nordic', 'sl-rdl'], ['bulgarian', 'step-up', 'lunge'], ['drop-jump', 'box-jump', 'jump-squat', 'bounding'], ['calf-raise-machine', 'calf-raise'], ['side-lying-abduction', 'band-walk', 'cable-abduction', 'sl-bridge'], ['side-plank', 'dead-bug']],
    force: [['back-squat', 'leg-press', 'goblet-squat', 'pistol-box', 'squat'], ['deadlift', 'rdl', 'leg-curl', 'nordic', 'sl-rdl'], ['bulgarian', 'step-up', 'lunge'], ['calf-raise-machine', 'calf-raise', 'soleus-seated'], ['hip-thrust', 'cable-abduction', 'sl-bridge'], ['suitcase-carry', 'side-plank', 'dead-bug']],
    plyo: [['pogo'], ['drop-jump', 'box-jump', 'jump-squat'], ['bounding', 'skater'], ['lateral-hops', 'skater'], ['calf-raise', 'calf-raise-machine'], ['nordic', 'sl-rdl']],
    trail: [['step-up', 'bulgarian'], ['step-down', 'leg-extension'], ['spanish-squat', 'wall-sit'], ['lateral-hops', 'skater'], ['calf-raise', 'calf-raise-machine'], ['nordic', 'leg-curl', 'sl-rdl'], ['side-plank', 'suitcase-carry'], ['tibialis-raise']],
    prevention: [['sl-bridge', 'hip-thrust'], ['band-walk', 'side-lying-abduction', 'cable-abduction'], ['sl-rdl'], ['copenhagen', 'side-plank'], ['calf-raise', 'heel-drop'], ['soleus-seated'], ['side-plank', 'plank'], ['short-foot'], ['tibialis-raise'], ['bird-dog', 'dead-bug'], ['nordic', 'leg-curl']],
    core: [['plank'], ['side-plank'], ['dead-bug'], ['bird-dog'], ['suitcase-carry', 'copenhagen'], ['sl-bridge'], ['band-walk', 'side-lying-abduction']],
  };
  const WARMUP = {
    base: ['2 min de marche rapide ou de trot sur place', '10 cercles de hanches et 10 de chevilles par côté', '10 squats lents, 10 fentes arrière', '15 montées sur pointes, 10 pogo doux'],
    plyo: ['3 min de trot léger', '10 cercles de chevilles par côté, 10 squats', '2 x 20 m de montées de genoux et de talons-fesses', '10 pogo doux puis 10 pogo normaux'],
  };
  const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'];
  const DURS = [15, 20, 30, 45, 60];

  const DEF = { type: 'complet', dur: 30, level: 2, weight: false, machine: false, band: false };
  const S = { cfg: Object.assign({}, DEF, LS('renfo.cfg') || {}), variant: 0, session: null, player: null };
  const saveCfg = () => LS('renfo.cfg', S.cfg);

  // ---------- Génération ----------
  function repsInfo(reps) {
    const m = /^(\d+)\s*(?:x\s*(\d+)\s*s)?/.exec(reps);
    const n = m ? +m[1] : 10;
    const timed = /\d\s*s(\b|\/)/.test(reps) && !/x/.test(reps);
    return { n, timed, secs: timed ? n : 0 };
  }
  function instantiate(e, cfg) {
    const useW = cfg.weight && e.weighted;
    const dose = Object.assign({}, e.dose, useW ? e.weighted.dose : {});
    const L = cfg.level - 1;
    const it = { ex: e, id: e.id, name: useW ? e.weighted.name : e.name, hold: useW ? e.weighted.hold : e.hold,
      sets: dose.sets[L], reps: dose.reps[L], rest: dose.rest, repSec: dose.repSec, tempo: dose.tempo, load: useW ? (dose.load || e.weighted.dose.load) : (e.needs.length ? dose.load : null), uni: !!e.uni };
    it.minutes = minutes(it);
    return it;
  }
  function minutes(it) {
    const r = repsInfo(it.reps);
    const work = (r.timed ? r.secs : r.n * it.repSec) * (it.uni ? 2 : 1) + (it.uni ? 10 : 0);
    return Math.round((it.sets * (work + it.rest) - it.rest) / 6) / 10;
  }
  const EXTRA = {
    complet: [['side-lying-abduction', 'band-walk', 'cable-abduction'], ['copenhagen', 'sl-bridge'], ['soleus-seated'], ['nordic', 'sl-rdl'], ['bird-dog', 'plank']],
    force: [['pistol-box', 'lunge'], ['sl-rdl'], ['soleus-seated'], ['copenhagen', 'side-plank'], ['step-up']],
    plyo: [['step-up'], ['side-plank'], ['sl-bridge'], ['soleus-seated'], ['pistol-box', 'squat']],
    trail: [['sl-bridge', 'hip-thrust'], ['copenhagen'], ['band-walk', 'side-lying-abduction'], ['soleus-seated'], ['pogo'], ['dead-bug']],
    prevention: [['wall-sit', 'spanish-squat'], ['step-down'], ['lunge'], ['heel-drop'], ['pistol-box', 'squat']],
    core: [['copenhagen'], ['wall-sit'], ['sl-rdl'], ['step-down'], ['calf-raise']],
  };
  function generate(cfg, variant) {
    const have = new Set(['weight', 'machine', 'band'].filter(k => cfg[k]));
    const ok = e => (!e.needs.length || e.needs.some(n => have.has(n))) && e.level <= cfg.level;
    const warm = cfg.dur >= 20 ? 5 : 3;
    const budget0 = cfg.dur - warm;
    let budget = budget0;
    const maxPer = Math.max(6, budget0 * 0.45);
    const items = [], used = new Set();
    function fill(slots) {
      for (const slot of slots) {
        const cands = slot.map(id => byId[id]).filter(e => ok(e) && !used.has(e.id));
        if (!cands.length) continue;
        const it = instantiate(cands[variant % cands.length], cfg);
        it.maxSets = Math.min(5, it.sets + 1);
        const cap = Math.min(budget, maxPer);
        while (it.sets > 2 && it.minutes > cap) { it.sets--; it.minutes = minutes(it); }
        if (it.minutes > cap && it.rest > 45) { it.rest = Math.max(45, Math.round(it.rest * 0.6)); it.minutes = minutes(it); }
        if (it.minutes > budget + 1) continue;
        items.push(it); used.add(it.id); budget -= it.minutes;
        if (budget < 2) return;
      }
    }
    fill(SLOTS[cfg.type]);
    if (budget >= 5) fill(EXTRA[cfg.type] || []);
    if (budget >= 5) fill(SLOTS[cfg.type]);
    for (let guard = 0; budget >= 1.5 && guard < 10; guard++) {
      let added = false;
      for (const it of items) {
        if (it.sets >= it.maxSets) continue;
        const m0 = it.minutes; it.sets++; it.minutes = minutes(it);
        if (it.minutes - m0 <= budget) { budget -= it.minutes - m0; added = true; } else { it.sets--; it.minutes = m0; }
      }
      if (!added) break;
    }
    return { cfg: Object.assign({}, cfg), items, warm, warmList: cfg.type === 'plyo' ? WARMUP.plyo : WARMUP.base, total: Math.round(cfg.dur - budget) };
  }

  // ---------- Rendu ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const animOf = it => it.hold !== it.ex.hold ? Object.assign({}, it.ex.anim, { hold: it.hold }) : it.ex.anim;
  const app = $('#app');
  let stopAnim = null;
  function view(html) { if (stopAnim) { stopAnim(); stopAnim = null; } app.innerHTML = html; window.scrollTo(0, 0); }

  function weekStats() {
    const h = LS('renfo.history') || [];
    const now = new Date(), day = (now.getDay() + 6) % 7, monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(now.getDate() - day);
    return { week: h.filter(x => new Date(x.date) >= monday).length, last: h.slice(-4).reverse() };
  }
  function renderHome() {
    const c = S.cfg, st = weekStats();
    const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    view(`
      <header class="top"><h1>Renfo <span>Trail</span></h1><p class="sub">Renforcement pour la course à pied et le trail, d'après les études récentes.</p></header>
      ${standalone ? '' : `<div class="hint">Sur iPhone : <b>Partager</b> → <b>Sur l'écran d'accueil</b> pour l'installer (fonctionne hors ligne).</div>`}
      <section class="card stat"><div><b>${st.week}</b>/2 séances cette semaine</div><div class="muted">${st.last.length ? 'Dernière : ' + fmtDate(st.last[0].date) + ' · ' + esc(TYPES.find(t => t.id === st.last[0].type)?.name || '') : 'Objectif : 2 séances par semaine, 1 en saison.'}</div></section>
      <h2>Type de séance</h2>
      <div class="types">${TYPES.map(t => `<button class="type ${c.type === t.id ? 'on' : ''}" data-type="${t.id}"><span class="ic">${t.icon}</span><span class="tn">${t.name}</span><span class="td">${t.desc}</span></button>`).join('')}</div>
      <h2>Durée</h2>
      <div class="seg">${DURS.map(d => `<button class="${c.dur === d ? 'on' : ''}" data-dur="${d}">${d} min</button>`).join('')}</div>
      <h2>Matériel</h2>
      <div class="card toggles">
        ${tog('weight', 'Poids', 'haltères, kettlebell, barre')}${tog('machine', 'Machines', 'presse, leg curl, poulie')}${tog('band', 'Élastique', 'bande de résistance')}
      </div>
      <h2>Niveau</h2>
      <div class="seg">${LEVELS.map((l, i) => `<button class="${c.level === i + 1 ? 'on' : ''}" data-level="${i + 1}">${l}</button>`).join('')}</div>
      <p class="muted small">Débutant : moins de 6 mois de renforcement. Avancé : squat et soulevé de terre maîtrisés, pliométrie régulière.</p>
      <button class="primary big" id="go">Générer la séance</button>
      <nav class="links"><a href="#/sources">Sources scientifiques</a> · <a href="#/exos">Tous les exercices</a></nav>`);
    function tog(k, n, d) { return `<label class="tog"><span><b>${n}</b><br><small>${d}</small></span><input type="checkbox" data-tog="${k}" ${c[k] ? 'checked' : ''}><i></i></label>`; }
    app.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { c.type = b.dataset.type; saveCfg(); renderHome(); });
    app.querySelectorAll('[data-dur]').forEach(b => b.onclick = () => { c.dur = +b.dataset.dur; saveCfg(); renderHome(); });
    app.querySelectorAll('[data-level]').forEach(b => b.onclick = () => { c.level = +b.dataset.level; saveCfg(); renderHome(); });
    app.querySelectorAll('[data-tog]').forEach(i => i.onchange = () => { c[i.dataset.tog] = i.checked; saveCfg(); });
    $('#go').onclick = () => { S.variant = 0; S.session = generate(S.cfg, 0); location.hash = '#/seance'; };
  }
  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  function doseLine(it) { return `${it.sets} × ${esc(it.reps)} · repos ${it.rest} s`; }
  function renderSession() {
    if (!S.session) { S.session = generate(S.cfg, S.variant); }
    const s = S.session, t = TYPES.find(x => x.id === s.cfg.type);
    view(`
      <header class="top row"><a class="back" href="#/">‹</a><div><h1>${t.icon} ${t.name}</h1><p class="sub">${s.total} min environ · ${s.items.length} exercices · ${LEVELS[s.cfg.level - 1].toLowerCase()}${s.cfg.weight ? ' · poids' : ''}${s.cfg.machine ? ' · machines' : ''}${s.cfg.band ? ' · élastique' : ''}</p></div></header>
      <section class="card warm"><h3>Échauffement · ${s.warm} min</h3><ul>${s.warmList.map(w => `<li>${w}</li>`).join('')}</ul></section>
      <ol class="exos">${s.items.map((it, i) => `<li class="exo" data-i="${i}"><div class="th">${RIG.thumb(animOf(it))}</div><div class="tx"><b>${esc(it.name)}</b><span>${doseLine(it)}</span><small>${esc(it.ex.group)} · ${it.minutes} min${it.uni ? ' · chaque côté' : ''}</small></div><span class="chev">›</span></li>`).join('')}</ol>
      <section class="card tips"><h3>À savoir</h3><ul>
        <li>Charge ou difficulté : termine chaque série avec 2 à 3 répétitions en réserve ; augmente quand c'est facile (max +10 %/semaine).</li>
        <li>Place cette séance à au moins 6 h d'une sortie clé, idéalement un jour de course facile.</li>
        <li>Pliométrie et force lourde : jamais fatigué, qualité avant volume.</li>
        <li>Une gêne ≤ 3/10 qui disparaît en 24 h est acceptable ; au-delà, réduis la charge.</li></ul></section>
      <div class="actions"><button class="primary big" id="start">Démarrer la séance</button><button class="ghost" id="vary">Varier les exercices</button></div>`);
    app.querySelectorAll('.exo').forEach(li => li.onclick = () => { location.hash = '#/exo/' + s.items[li.dataset.i].id; });
    $('#vary').onclick = () => { S.variant++; S.session = generate(S.cfg, S.variant); renderSession(); };
    $('#start').onclick = () => { unlockAudio(); S.player = { i: -1, set: 1, phase: 'warm', t: s.warm * 60 }; location.hash = '#/player'; };
  }

  function renderExo(id, fromList) {
    const e = byId[id]; if (!e) { location.hash = '#/'; return; }
    const it = S.session && S.session.items.find(x => x.id === id) || instantiate(e, S.cfg);
    const backHref = fromList ? '#/exos' : (S.session ? '#/seance' : '#/');
    view(`
      <header class="top row"><a class="back" href="${backHref}">‹</a><div><h1>${esc(it.name)}</h1><p class="sub">${esc(e.group)} · ${esc(e.muscles)}</p></div></header>
      <div class="anim card" id="anim"></div>
      <section class="card"><h3>Dosage ${LEVELS[S.cfg.level - 1].toLowerCase()}</h3><p class="dose">${doseLine(it)}</p>${it.tempo ? `<p><b>Tempo :</b> ${esc(it.tempo)}</p>` : ''}${it.load ? `<p><b>Charge :</b> ${esc(it.load)}</p>` : ''}</section>
      <section class="card"><h3>Comment faire</h3><ol class="cues">${e.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol></section>
      <section class="card err"><h3>Erreurs fréquentes</h3><ul>${e.errors.map(c => `<li>${esc(c)}</li>`).join('')}</ul></section>
      <section class="card why"><h3>Pourquoi</h3><p>${esc(e.why)}</p><ul class="refs">${e.refs.map(r => `<li><a href="${REF_URL(r)}" target="_blank" rel="noopener">${esc(REFS[r].t.split('. ')[0])} ${esc(REFS[r].t.match(/\d{4}/)?.[0] || '')}</a> — ${esc(REFS[r].k)}</li>`).join('')}</ul></section>`);
    stopAnim = RIG.animate($('#anim'), animOf(it));
  }

  function renderList() {
    const groups = [...new Set(EXERCISES.map(e => e.group))];
    view(`<header class="top row"><a class="back" href="#/">‹</a><div><h1>Exercices</h1><p class="sub">${EXERCISES.length} exercices, du poids du corps aux machines.</p></div></header>
      ${groups.map(g => `<h2>${esc(g)}</h2><ol class="exos">${EXERCISES.filter(e => e.group === g).map(e => `<li class="exo" data-id="${e.id}"><div class="th">${RIG.thumb(e.anim)}</div><div class="tx"><b>${esc(e.name)}</b><span>${esc(e.muscles)}</span><small>${e.needs.length ? e.needs.map(n => ({ weight: 'poids', machine: 'machine', band: 'élastique' })[n]).join(' ou ') : 'sans matériel'} · ${LEVELS[e.level - 1].toLowerCase()}</small></div><span class="chev">›</span></li>`).join('')}</ol>`).join('')}`);
    app.querySelectorAll('.exo').forEach(li => li.onclick = () => { location.hash = '#/exo/' + li.dataset.id + '/liste'; });
  }

  function renderSources() {
    view(`<header class="top row"><a class="back" href="#/">‹</a><div><h1>Sources</h1><p class="sub">Méta-analyses, essais randomisés et recommandations utilisées pour les séances.</p></div></header>
      <section class="card"><h3>Ce qu'en retient l'app</h3><ul class="tips">
        <li><b>Force lourde</b> (≥ 80 % du max, 3-6 répétitions) et <b>pliométrie</b> à faible volume améliorent l'économie de course ; les combiner donne le meilleur résultat (Llanos-Lagos 2024, Blagrove 2018).</li>
        <li><b>2 séances par semaine</b> pendant 6 à 14 semaines, puis <b>1 séance</b> de maintien en saison (Rønnestad 2014).</li>
        <li>Le renforcement réduit d'environ <b>un tiers</b> les blessures et de <b>moitié</b> les blessures de surutilisation ; un programme <b>hanche + tronc</b> de 20-35 min a réduit de 39 % les blessures chez des coureurs débutants (Lauersen 2014, Leppänen 2024).</li>
        <li>En trail, la <b>descente</b> impose un freinage excentrique des quadriceps : s'y exposer progressivement (descentes de marche, excentrique lent, isométrie) protège (Vernillo 2017, Bontemps 2022).</li>
        <li><b>Mollets et tendon d'Achille</b> : travail lent et lourd, descentes excentriques ; <b>pied</b> : muscles intrinsèques (Beyer 2015, Alfredson 1998, Taddei 2020).</li></ul></section>
      <ol class="srcs">${Object.keys(REFS).map(r => `<li><a href="${REF_URL(r)}" target="_blank" rel="noopener">${esc(REFS[r].t)}</a><p>${esc(REFS[r].k)}</p></li>`).join('')}</ol>
      <p class="muted small">Cette application ne remplace pas un avis médical. En cas de douleur persistante, consulte un médecin du sport ou un kinésithérapeute.</p>`);
  }

  // ---------- Lecteur ----------
  let audio = null;
  function unlockAudio() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch (e) { } }
  function beep(n = 1) { if (!audio) return; for (let i = 0; i < n; i++) { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = i === n - 1 && n > 1 ? 1100 : 880; g.gain.value = 0.15; o.connect(g); g.connect(audio.destination); const t = audio.currentTime + i * 0.25; o.start(t); o.stop(t + 0.15); } }
  let wake = null;
  async function keepAwake() { try { if ('wakeLock' in navigator) wake = await navigator.wakeLock.request('screen'); } catch (e) { } }
  let timer = null;
  function clearTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function renderPlayer() {
    const s = S.session, p = S.player;
    if (!s || !p) { location.hash = '#/'; return; }
    keepAwake();
    clearTimer();
    const total = s.items.length;
    const fmt = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    if (p.phase === 'warm') {
      view(`<header class="top row"><a class="back" href="#/seance">‹</a><div><h1>Échauffement</h1><p class="sub">${s.warm} min avant le premier exercice</p></div></header>
        <div class="clock" id="clock">${fmt(p.t)}</div>
        <section class="card"><ul class="tips">${s.warmList.map(w => `<li>${w}</li>`).join('')}</ul></section>
        <div class="actions"><button class="primary big" id="next">C'est chaud, on commence</button></div>`);
      timer = setInterval(() => { p.t--; $('#clock').textContent = fmt(Math.max(0, p.t)); if (p.t === 0) { beep(2); clearTimer(); } }, 1000);
      $('#next').onclick = () => { p.phase = 'work'; p.i = 0; p.set = 1; renderPlayer(); };
      return;
    }
    if (p.phase === 'done') {
      clearTimer();
      view(`<header class="top"><h1>Séance terminée 🎉</h1><p class="sub">${total} exercices · ${s.total} min</p></header>
        <section class="card"><ul class="tips"><li>Note la charge utilisée pour augmenter la prochaine fois si c'était facile.</li><li>Courbatures 24-48 h après : normal les deux premières semaines, surtout après l'excentrique.</li><li>Prochaine séance de renfo dans 2 à 4 jours.</li></ul></section>
        <div class="actions"><button class="primary big" id="home">Retour à l'accueil</button></div>`);
      $('#home').onclick = () => { S.session = null; location.hash = '#/'; };
      return;
    }
    const it = s.items[p.i], r = repsInfo(it.reps);
    const side = it.uni ? (p.side || 1) : 0;
    const head = `<header class="top row"><a class="back" href="#/seance">‹</a><div><h1>${esc(it.name)}</h1><p class="sub">Exercice ${p.i + 1}/${total} · série ${p.set}/${it.sets}${side ? ' · côté ' + (side === 1 ? 'droit' : 'gauche') : ''}</p></div></header>
      <div class="prog"><i style="width:${Math.round(100 * (p.i + (p.set - 1) / it.sets) / total)}%"></i></div>`;
    if (p.phase === 'rest') {
      view(`${head}<div class="clock rest" id="clock">${fmt(p.t)}</div><p class="center muted">Repos · prochain : ${p.nextLabel}</p>
        <div class="anim card small" id="anim"></div>
        <div class="actions"><button class="primary big" id="skip">Passer le repos</button><button class="ghost" id="more">+ 30 s</button></div>`);
      stopAnim = RIG.animate($('#anim'), animOf(s.items[p.nextI]));
      timer = setInterval(() => { p.t--; if (p.t <= 0) { clearTimer(); beep(2); advance(); } else { $('#clock').textContent = fmt(p.t); if (p.t === 3) beep(1); } }, 1000);
      $('#skip').onclick = () => { clearTimer(); advance(); };
      $('#more').onclick = () => { p.t += 30; $('#clock').textContent = fmt(p.t); };
      return;
    }
    // phase work
    view(`${head}<div class="anim card" id="anim"></div>
      <p class="dose center">${esc(it.reps)}${it.tempo ? ' · ' + esc(it.tempo) : ''}</p>
      ${r.timed ? `<div class="clock" id="clock">${fmt(p.t || r.secs)}</div>` : ''}
      <section class="card cues-mini"><ol class="cues">${it.ex.cues.slice(0, 3).map(c => `<li>${esc(c)}</li>`).join('')}</ol></section>
      <div class="actions">${r.timed ? `<button class="primary big" id="go">${p.running ? 'En cours…' : 'Lancer le chrono'}</button>` : `<button class="primary big" id="done">Série faite</button>`}<a class="ghost btn" href="#/exo/${it.id}">Voir la fiche complète</a></div>`);
    stopAnim = RIG.animate($('#anim'), animOf(it));
    if (r.timed) {
      p.t = p.t || r.secs;
      $('#go').onclick = () => { if (p.running) return; p.running = true; $('#go').textContent = 'En cours…'; timer = setInterval(() => { p.t--; $('#clock').textContent = fmt(Math.max(0, p.t)); if (p.t <= 0) { clearTimer(); beep(2); p.running = false; p.t = 0; finishSet(); } }, 1000); };
    } else $('#done').onclick = finishSet;

    function finishSet() {
      p.t = 0; p.running = false;
      if (it.uni && (p.side || 1) === 1) { p.side = 2; p.nextI = p.i; p.nextLabel = 'même exercice, autre côté'; p.phase = 'rest'; p.t = 15; renderPlayer(); return; }
      p.side = 1;
      if (p.set < it.sets) { p.set++; p.nextI = p.i; p.nextLabel = `${esc(it.name)} · série ${p.set}`; p.phase = 'rest'; p.t = it.rest; renderPlayer(); return; }
      if (p.i + 1 < total) { p.i++; p.set = 1; p.nextI = p.i; p.nextLabel = esc(s.items[p.i].name); p.phase = 'rest'; p.t = Math.min(it.rest, 90); renderPlayer(); return; }
      finish();
    }
    function advance() { p.phase = 'work'; p.t = 0; renderPlayer(); }
    function finish() {
      const h = LS('renfo.history') || []; h.push({ date: new Date().toISOString(), type: s.cfg.type, dur: s.total, n: total }); LS('renfo.history', h.slice(-100));
      p.phase = 'done'; renderPlayer();
    }
  }

  // ---------- Routeur ----------
  function route() {
    const h = location.hash || '#/';
    const m = h.match(/^#\/exo\/([\w-]+)(\/liste)?/);
    clearTimer();
    if (m) return renderExo(m[1], !!m[2]);
    if (h.startsWith('#/seance')) return renderSession();
    if (h.startsWith('#/player')) return renderPlayer();
    if (h.startsWith('#/sources')) return renderSources();
    if (h.startsWith('#/exos')) return renderList();
    renderHome();
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.player) keepAwake(); });
  window.RENFO = { generate, instantiate, TYPES, SLOTS };
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => { });
})();
