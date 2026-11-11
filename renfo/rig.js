/* rig.js — bonhomme animé (vue de côté ou de face) pour illustrer les mouvements.
   Une pose = angles en degrés. Le sol est à y = 200 ; la figure est posée automatiquement
   sur son point le plus bas (sauf `lift` = hauteur au-dessus du sol).
   Vue de côté (rig:'side', le bonhomme regarde vers la droite) :
     hx  : x de la hanche          tor : inclinaison du tronc (+ = penché en avant)
     tn/tf : cuisse proche/éloignée depuis la verticale (+ = genou en avant)
     kn/kf : flexion du genou (le tibia part vers l'arrière)
     fn/ff : angle absolu du pied (0 = à plat, + = pointe vers le bas)
     un/uf : bras depuis la verticale (+ = en avant, 180 = en l'air)
     en/ef : flexion du coude (+ = l'avant-bras continue la rotation)
     lift  : hauteur au-dessus du sol      hd : inclinaison de la tête
   Vue de face (rig:'front') : rot = rotation globale (90 = allongé, tête à droite),
     tor = inclinaison latérale, ln/lf = écartement des jambes, kn/kf = flexion,
     an/af = écartement des bras, en/ef = flexion du coude. */
const RIG = (() => {
  const L = { torso: 58, thigh: 50, shin: 46, foot: 20, ua: 36, fa: 32, head: 11, neck: 7 };
  const GROUND = 200, D = Math.PI / 180;
  const v = (p, k, d = 0) => (p[k] === undefined ? d : p[k]);

  function sidePoints(p) {
    const hip = { x: v(p, 'hx', 100), y: 0 };
    const t = v(p, 'tor') * D;
    const sh = { x: hip.x + L.torso * Math.sin(t), y: hip.y - L.torso * Math.cos(t) };
    const hd = (v(p, 'tor') + v(p, 'hd')) * D;
    const head = { x: sh.x + (L.neck + L.head) * Math.sin(hd), y: sh.y - (L.neck + L.head) * Math.cos(hd) };
    const rot = (x, y, c) => ({ x: x * Math.cos(c) - y * Math.sin(c), y: x * Math.sin(c) + y * Math.cos(c) });
    function leg(th, k, f) {
      const a = th * D, b = (th - k) * D, c = f * D;
      const knee = { x: hip.x + L.thigh * Math.sin(a), y: hip.y + L.thigh * Math.cos(a) };
      const ank = { x: knee.x + L.shin * Math.sin(b), y: knee.y + L.shin * Math.cos(b) };
      const t1 = rot(L.foot, 5, c), h1 = rot(-6, 5, c);
      return { knee, ank, toe: { x: ank.x + t1.x, y: ank.y + t1.y }, heel: { x: ank.x + h1.x, y: ank.y + h1.y }, fa: b };
    }
    function arm(u, e) {
      const a = u * D, b = (u + e) * D;
      const el = { x: sh.x + L.ua * Math.sin(a), y: sh.y + L.ua * Math.cos(a) };
      const hand = { x: el.x + L.fa * Math.sin(b), y: el.y + L.fa * Math.cos(b) };
      return { el, hand, fa: b };
    }
    const n = leg(v(p, 'tn'), v(p, 'kn'), v(p, 'fn')), f = leg(v(p, 'tf'), v(p, 'kf'), v(p, 'ff'));
    const an = arm(v(p, 'un'), v(p, 'en')), af = arm(v(p, 'uf'), v(p, 'ef'));
    return {
      hip, sh, head, kneeN: n.knee, ankN: n.ank, toeN: n.toe, heelN: n.heel, kneeF: f.knee, ankF: f.ank, toeF: f.toe, heelF: f.heel,
      elN: an.el, handN: an.hand, elF: af.el, handF: af.hand, _faN: an.fa, _faF: af.fa, _rig: 'side'
    };
  }

  function frontPoints(p) {
    const r = v(p, 'rot') * D, hip = { x: v(p, 'hx', 100), y: 0 };
    const P = (x, y) => ({ x: hip.x + x * Math.cos(r) - y * Math.sin(r), y: hip.y + x * Math.sin(r) + y * Math.cos(r) });
    const t = v(p, 'tor') * D;
    const shx = L.torso * Math.sin(t), shy = -L.torso * Math.cos(t);
    const sh = P(shx, shy);
    const head = P((L.torso + L.neck + L.head) * Math.sin(t), -(L.torso + L.neck + L.head) * Math.cos(t));
    function leg(a, k, s) {
      const A = a * D * s, B = (a + k) * D * s;
      const kx = L.thigh * Math.sin(A), ky = L.thigh * Math.cos(A);
      const ax = kx + L.shin * Math.sin(B), ay = ky + L.shin * Math.cos(B);
      return { knee: P(kx, ky), ank: P(ax, ay), toe: P(ax + 7 * s, ay + 6), heel: P(ax - 4 * s, ay + 6) };
    }
    function arm(a, e, s) {
      const sx = shx + 11 * s, sy = shy + 2;
      const A = a * D * s, B = (a + e) * D * s;
      const ex = sx + L.ua * Math.sin(A), ey = sy + L.ua * Math.cos(A);
      const hx = ex + L.fa * Math.sin(B), hy = ey + L.fa * Math.cos(B);
      return { s: P(sx, sy), el: P(ex, ey), hand: P(hx, hy) };
    }
    const n = leg(v(p, 'ln'), v(p, 'kn'), 1), f = leg(v(p, 'lf'), v(p, 'kf'), -1);
    const an = arm(v(p, 'an'), v(p, 'en'), 1), af = arm(v(p, 'af'), v(p, 'ef'), -1);
    return {
      hip, sh, head, shN: an.s, shF: af.s, kneeN: n.knee, ankN: n.ank, toeN: n.toe, heelN: n.heel, kneeF: f.knee, ankF: f.ank, toeF: f.toe, heelF: f.heel,
      elN: an.el, handN: an.hand, elF: af.el, handF: af.hand, _rig: 'front'
    };
  }

  function points(rig, pose) {
    const pts = rig === 'front' ? frontPoints(pose) : sidePoints(pose);
    let maxY = -1e9;
    for (const k in pts) { if (k[0] === '_') continue; const q = pts[k]; const y = k === 'head' ? q.y + L.head : q.y; if (y > maxY) maxY = y; }
    const dy = GROUND - maxY - v(pose, 'lift');
    if (pose.hy !== undefined) { const d2 = pose.hy - pts.hip.y; for (const k in pts) if (k[0] !== '_') pts[k].y += d2; }
    else for (const k in pts) if (k[0] !== '_') pts[k].y += dy;
    return pts;
  }

  const ease = (x) => x * x * (3 - 2 * x);
  function interpolate(frames, time) {
    const total = frames.reduce((s, f) => s + f.d, 0);
    let t = ((time % total) + total) % total, i = 0;
    while (t > frames[i].d) { t -= frames[i].d; i = (i + 1) % frames.length; }
    const a = frames[(i - 1 + frames.length) % frames.length], b = frames[i], u = ease(t / b.d);
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (k === 'd' || typeof b[k] === 'string' || typeof a[k] === 'string') continue;
      const av = a[k] === undefined ? 0 : a[k], bv = b[k] === undefined ? 0 : b[k];
      out[k] = av + (bv - av) * u;
    }
    return out;
  }

  const ln = (a, b) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  function propsSvg(props, pts) {
    let s = '';
    for (const pr of props || []) {
      const anc = pr.anchor ? pts[pr.anchor] : { x: 0, y: 0 };
      const x = anc.x + (pr.x || 0), y = anc.y + (pr.y || 0);
      if (pr.type === 'rect') { const h = Math.max(0, pr.h === 'ground' ? GROUND - y : pr.h); s += `<rect class="prop" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${pr.w}" height="${h.toFixed(1)}" rx="2"/>`; }
      else if (pr.type === 'circle') s += `<circle class="prop" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${pr.r}"/>`;
      else if (pr.type === 'line' || pr.type === 'band') {
        const a = pr.from ? pts[pr.from] : { x: 0, y: 0 }, b = pr.to ? pts[pr.to] : { x: 0, y: 0 };
        s += `<path class="${pr.type}" d="${ln({ x: a.x + (pr.fx || 0), y: a.y + (pr.fy || 0) }, { x: b.x + (pr.tx || 0), y: b.y + (pr.ty || 0) })}"/>`;
      }
    }
    return s;
  }
  function holdSvg(hold, pts) {
    if (!hold) return '';
    const db = (h, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return `<path class="iron" d="${ln({ x: h.x - 9 * c, y: h.y - 9 * s }, { x: h.x + 9 * c, y: h.y + 9 * s })}"/><circle class="iron" cx="${h.x - 9 * c}" cy="${h.y - 9 * s}" r="3.5"/><circle class="iron" cx="${h.x + 9 * c}" cy="${h.y + 9 * s}" r="3.5"/>`; };
    if (hold === 'db') { const aN = (pts._faN === undefined ? 0 : pts._faN), aF = (pts._faF === undefined ? 0 : pts._faF); return db(pts.handF, aF) + db(pts.handN, aN); }
    if (hold === 'db1') return db(pts.handN, 0);
    if (hold === 'bb-back') return `<circle class="plate" cx="${pts.sh.x}" cy="${pts.sh.y - 2}" r="11"/>`;
    if (hold === 'bb-hands') return `<circle class="plate" cx="${pts.handN.x}" cy="${pts.handN.y}" r="13"/>`;
    if (hold === 'bb-hip') return `<circle class="plate" cx="${pts.hip.x}" cy="${pts.hip.y - 6}" r="11"/>`;
    if (hold === 'kb') { const h = pts.handN; return `<circle class="iron" cx="${h.x}" cy="${h.y + 9}" r="7"/><path class="iron" d="M${h.x - 5} ${h.y + 2}Q${h.x} ${h.y - 6} ${h.x + 5} ${h.y + 2}"/>`; }
    return '';
  }

  function figureSvg(anim, pose) {
    const pts = points(anim.rig, pose);
    let s = `<path class="ground" d="M8 ${GROUND}H192"/>` + propsSvg(anim.props, pts);
    // membres éloignés (plus clairs) d'abord
    s += `<path class="far" d="${ln(pts.hip, pts.kneeF)}${ln(pts.kneeF, pts.ankF)}${ln(pts.heelF, pts.toeF)}"/>`;
    s += `<path class="far" d="${ln(anim.rig === 'front' ? pts.shF : pts.sh, pts.elF)}${ln(pts.elF, pts.handF)}"/>`;
    s += `<path class="body" d="${ln(pts.hip, pts.sh)}"/>`;
    s += `<circle class="head" cx="${pts.head.x.toFixed(1)}" cy="${pts.head.y.toFixed(1)}" r="${L.head}"/>`;
    s += `<path class="near" d="${ln(pts.hip, pts.kneeN)}${ln(pts.kneeN, pts.ankN)}${ln(pts.heelN, pts.toeN)}"/>`;
    s += `<path class="near" d="${ln(anim.rig === 'front' ? pts.shN : pts.sh, pts.elN)}${ln(pts.elN, pts.handN)}"/>`;
    s += holdSvg(anim.hold, pts);
    return s;
  }

  function svg(anim, pose, cls = '') {
    return `<svg class="fig ${cls}" viewBox="0 -30 200 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${figureSvg(anim, pose)}</svg>`;
  }
  function thumb(anim) { const f = anim.frames; const t = f.length > 1 ? f[0].d + f[1].d * 0.999 : f[0].d * 0.999; return svg(anim, interpolate(f, t), 'thumb'); }

  // Animation continue dans un élément : renvoie une fonction d'arrêt.
  function animate(el, anim) {
    let raf, start = performance.now(), running = true;
    el.innerHTML = svg(anim, interpolate(anim.frames, 0));
    const g = el.querySelector('svg');
    function tick(now) {
      if (!running) return;
      g.innerHTML = figureSvg(anim, interpolate(anim.frames, (now - start) / 1000));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(raf); };
  }
  return { svg, thumb, animate, points, interpolate, GROUND };
})();
