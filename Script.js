(function(){
  document.documentElement.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const yr = document.getElementById('yr'); if(yr) yr.textContent = new Date().getFullYear();

  // nav background on scroll
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} }), {threshold:.05});
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('in'));
  // safety net: never leave content hidden
  setTimeout(() => reveals.forEach(el => el.classList.add('in')), 3500);

  // card glow follows cursor
  document.querySelectorAll('.card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));

  // count-up stats (starts when they scroll into view)
  const counter = new IntersectionObserver(es => es.forEach(e => {
    if(!e.isIntersecting) return; counter.unobserve(e.target);
    const el = e.target, end = +el.dataset.count; let n = 0;
    const step = () => { n += Math.max(1, end/40); if(n >= end){ el.textContent = end; return; } el.textContent = Math.floor(n); requestAnimationFrame(step); };
    reduce ? el.textContent = end : step();
  }), {threshold:.6});
  document.querySelectorAll('[data-count]').forEach(el => counter.observe(el));

  // hero: grid + glow follow the cursor
  const hero = document.querySelector('.hero');
  if(hero && !reduce) hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--hx', (e.clientX - r.left) + 'px');
    hero.style.setProperty('--hy', (e.clientY - r.top) + 'px');
  });

  // RESEARCH BANNER: two throwers tossing a ball back and forth along physics arcs
  const cv = document.getElementById('throw-canvas'), cx = cv.getContext('2d');
  let W, H, dpr, t0 = performance.now(), trail = [];
  function size(){
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W*dpr; cv.height = H*dpr; cx.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener('resize', size); size();

  const g = 1; // normalized
  function draw(now){
    const t = (now - t0)/1000;
    cx.clearRect(0,0,W,H);
    const ground = H*0.84, ax = W*0.27, bx = W*0.73, y0 = ground - 70;
    const Tflight = 2.2; // seconds per throw
    const phase = (t % (Tflight*2)); const dir = phase < Tflight ? 1 : -1;
    const u = (dir === 1 ? phase : phase - Tflight)/Tflight; // 0..1
    const sx = dir === 1 ? ax : bx, ex = dir === 1 ? bx : ax;
    const peak = Math.min(H*0.46, 260);
    const x = sx + (ex - sx)*u;
    const y = y0 - 4*peak*u*(1-u);

    // ghost of ideal arcs
    cx.lineWidth = 1.2; cx.setLineDash([4,8]);
    cx.strokeStyle = 'rgba(76,201,240,.22)';
    cx.beginPath();
    for(let i=0;i<=60;i++){ const k=i/60; const px = ax+(bx-ax)*k, py = y0-4*peak*k*(1-k); i?cx.lineTo(px,py):cx.moveTo(px,py); }
    cx.stroke(); cx.setLineDash([]);

    // stick-figure throwers
    function figure(fx, facing, active){
      cx.strokeStyle = active ? '#4cc9f0' : 'rgba(231,236,246,.55)';
      cx.lineWidth = 3; cx.lineCap = 'round';
      const hy = ground - 100;
      cx.beginPath(); cx.arc(fx, hy-28, 12, 0, 7); cx.stroke();
      cx.beginPath(); cx.moveTo(fx,hy-16); cx.lineTo(fx,hy+30); // torso
      cx.moveTo(fx,hy+30); cx.lineTo(fx-14,ground); cx.moveTo(fx,hy+30); cx.lineTo(fx+14,ground); // legs
      const swing = active ? Math.sin(u*Math.PI)*0.9 : 0;
      const ang = -0.9 + (active ? -swing : 0.5);
      cx.moveTo(fx,hy-6); cx.lineTo(fx + facing*34*Math.cos(ang+0.6), hy-6 + 34*Math.sin(ang+0.6)); // arm toward partner
      cx.moveTo(fx,hy-6); cx.lineTo(fx - facing*20, hy+16);
      cx.stroke();
    }
    figure(ax-6, 1, dir===1 && u<0.15);
    figure(bx+6, -1, dir===-1 && u<0.15);

    // ground
    cx.strokeStyle = 'rgba(147,160,186,.25)'; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(W*0.06, ground); cx.lineTo(W*0.94, ground); cx.stroke();

    // ball + trail
    trail.push({x,y}); if(trail.length > 26) trail.shift();
    trail.forEach((p,i) => { cx.fillStyle = `rgba(255,122,89,${i/trail.length*0.5})`; cx.beginPath(); cx.arc(p.x,p.y,2+i*0.12,0,7); cx.fill(); });
    const grd = cx.createRadialGradient(x,y,0,x,y,26); grd.addColorStop(0,'rgba(255,122,89,.6)'); grd.addColorStop(1,'rgba(255,122,89,0)');
    cx.fillStyle = grd; cx.beginPath(); cx.arc(x,y,26,0,7); cx.fill();
    cx.fillStyle = '#ff7a59'; cx.beginPath(); cx.arc(x,y,7,0,7); cx.fill();

    if(!reduce) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // SIM: projectile playground
  const sc = document.getElementById('sim-canvas'), sx = sc.getContext('2d');
  const v = document.getElementById('v'), a = document.getElementById('a');
  const G = 9.81, h0 = 1.6; // release height (m)
  function sim(){
    const V = +v.value, A = +a.value*Math.PI/180;
    document.getElementById('v-out').textContent = V.toFixed(1);
    document.getElementById('a-out').textContent = a.value;
    const vx = V*Math.cos(A), vy = V*Math.sin(A);
    const T = (vy + Math.sqrt(vy*vy + 2*G*h0))/G;
    const R = vx*T, P = h0 + vy*vy/(2*G);
    document.getElementById('range-out').textContent = R.toFixed(1);
    document.getElementById('peak-out').textContent = P.toFixed(1);
    document.getElementById('t-out').textContent = T.toFixed(2);

    const w = sc.width, h = sc.height, pad = 36;
    const scale = Math.min((w-pad*2)/Math.max(R,12), (h-pad*2)/Math.max(P,4));
    const X = m => pad + m*scale, Y = m => h - pad - m*scale;
    sx.clearRect(0,0,w,h);
    sx.strokeStyle = 'rgba(147,160,186,.18)'; sx.lineWidth = 1; sx.font = '11px JetBrains Mono, monospace'; sx.fillStyle = 'rgba(147,160,186,.7)';
    for(let m=0; m<=Math.max(R,12); m+=2){ sx.beginPath(); sx.moveTo(X(m),pad/2); sx.lineTo(X(m),h-pad); sx.stroke(); if(m%4===0) sx.fillText(m+'m', X(m)-8, h-pad+16); }
    sx.strokeStyle = 'rgba(147,160,186,.5)'; sx.beginPath(); sx.moveTo(pad,h-pad); sx.lineTo(w-pad/2,h-pad); sx.stroke();
    sx.strokeStyle = '#4cc9f0'; sx.lineWidth = 2.5; sx.beginPath();
    for(let i=0;i<=80;i++){ const t = T*i/80; const px = vx*t, py = h0 + vy*t - 0.5*G*t*t; i?sx.lineTo(X(px),Y(py)):sx.moveTo(X(px),Y(py)); }
    sx.stroke();
    sx.fillStyle = '#ff7a59'; sx.beginPath(); sx.arc(X(0),Y(h0),6,0,7); sx.fill();
    sx.fillStyle = '#4cc9f0'; sx.beginPath(); sx.arc(X(R),Y(0),6,0,7); sx.fill();
  }
  v.addEventListener('input', sim); a.addEventListener('input', sim); sim();
})();
