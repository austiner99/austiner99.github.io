/* AE logo: a big orange dot shrinks into place, then a dart draws the A and the line
   while the A slides left and its right leg becomes the spine of the E.
   Plays on load and again whenever the mouse (or a tap/keyboard focus) lands on it. */
(function(){
  const slot = document.getElementById('logo');
  if(!slot) return;
  function init(){
  const NS='http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W='#f1f5fb', B='#4cc9f0', O='#ff7a59', BLUE=[76,201,240], WHITE=[241,245,251];
  const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
  const lerp=(a,b,k)=>a+(b-a)*k;
  const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  const mix=(a,b,k)=>`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*k)).join(',')})`;
  const mk=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e};

  // chosen settings
  const S={angle:.65, flat:4, width:54};             // spine lean (fraction of the A's lean), flat top (px), E arm length (px)
  const F={hold:24, fade:130};                        // blue trail behind the dart: solid, then fades to white
  const colorAt=d=>mix(BLUE,WHITE,d<=F.hold?0:Math.min(1,(d-F.hold)/F.fade));
  const T={tl:10,nx:-5,r:7,shape:`<polygon points="10,0 -9,-7 -5,-1.6 -5,1.6 -9,7" fill="${B}"/>`};
  const LEG='M48,12 Q20,56 6,100', CURL='M6,100 C14,88 20,58 40,58';
  const THETA_A=Math.atan(42/88);

  // geometry
  const Ta=48+S.flat, FRf=Ta+88*Math.tan(S.angle*THETA_A);
  const c={Ta,FRf,xTend:Ta+S.width,xBend:FRf+S.width};
  c.BX=(Ta+FRf)/2+S.width+10; c.shift=c.BX-91;
  c.rest=c.BX-T.r-3-T.tl; c.endXw=c.rest+T.nx;
  c.R0=(c.BX+12)/6; c.cx0=(c.BX+6)/2; c.ang=0;

  // path sampling (needs a hidden svg to measure in)
  const meas=mk('svg',{width:10,height:10,style:'position:absolute;left:-9999px;top:0;opacity:0;pointer-events:none','aria-hidden':'true'},document.body);
  const cache={};
  function sample(d){
    if(cache[d]) return cache[d];
    const p=mk('path',{d},meas), L=p.getTotalLength(); if(!(L>0)) throw new Error('path measure failed'); const n=Math.max(6,Math.round(L/1.5)), pts=[];
    for(let i=0;i<=n;i++){const q=p.getPointAtLength(L*i/n);pts.push([q.x,q.y])}
    p.remove(); return cache[d]={L,n,pts};
  }
  const segD=(sm,i)=>`M${sm.pts[i][0].toFixed(2)},${sm.pts[i][1].toFixed(2)} L${sm.pts[i+1][0].toFixed(2)},${sm.pts[i+1][1].toFixed(2)}`;
  const at=(sm,s)=>{const f=clamp(s/sm.L)*sm.n,i=Math.min(sm.n-1,Math.floor(f)),k=f-i,a=sm.pts[i],b=sm.pts[i+1];return[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k]};

  // svg
  const right=Math.max(c.BX+14,c.xBend+8);
  const svg=mk('svg',{viewBox:`-8 0 ${right+8} 112`,role:'img','aria-label':'Austin Erickson, AE logo'});
  svg.innerHTML=`<defs><radialGradient id="ae-glow"><stop offset="0" stop-color="${O}" stop-opacity=".65"/><stop offset="1" stop-color="${O}" stop-opacity="0"/></radialGradient></defs>
  <g class="dyn" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="6"></g>
  <circle class="glow" cx="${c.BX}" cy="58" r="18" fill="url(#ae-glow)" opacity="0"/>
  <circle class="ball" cx="${c.BX}" cy="58" r="${T.r}" fill="${O}" opacity="0"/>
  <g class="tri" opacity="0">${T.shape}</g>`;
  const dyn=svg.querySelector('.dyn'), tri=svg.querySelector('.tri'), glow=svg.querySelector('.glow'), ball=svg.querySelector('.ball');

  // pieces
  const legS=sample(LEG), curlS=sample(CURL), K=36, Nc=48;
  const gA=mk('g',{},dyn);
  const leg=[...Array(legS.n)].map((_,i)=>mk('path',{d:segD(legS,i),stroke:'transparent'},gA));
  const curl=[...Array(curlS.n)].map((_,i)=>mk('path',{d:segD(curlS,i),stroke:'transparent'},gA));
  const rl=[...Array(K)].map(()=>mk('path',{stroke:'transparent'},dyn));
  const rlp=mk('path',{stroke:W,opacity:0},dyn);       // seamless spine once it has faded to white
  const cross=[...Array(Nc)].map(()=>mk('path',{stroke:'transparent'},dyn));
  const top=mk('path',{stroke:W,opacity:0},dyn), bot=mk('path',{stroke:W,opacity:0},dyn);

  const TM={t0:1.35,dA:1.7,dL:1.5};
  const tFoot=TM.t0+TM.dA, tLeave=tFoot+.06, tLand=tLeave+TM.dL, tEnd=tLand+.9;
  const HID='transparent';

  function draw(t,smooth){
    const u=clamp((t-tFoot)/(tLand-tFoot)), e=ease(u);          // everything morphs together, starting as the dart hits the foot
    const s=c.shift*(1-e), Ta_=lerp(48,c.Ta,e), FR=lerp(90,c.FRf,e), Cx=lerp(76,(c.Ta+c.FRf)/2,e);
    const P=[], cum=[0];
    for(let i=0;i<=K;i++){const k=i/K,a=(1-k)*(1-k),b=2*(1-k)*k,d=k*k;
      P.push([a*(s+FR)+b*(s+Cx)+d*(s+Ta_), a*100+b*56+d*12]);
      if(i) cum.push(cum[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));}
    const LR=cum[K], Ll=legS.L, Lc=curlS.L, xs=s+40, xe=c.endXw, cl=xe-xs;
    const inA=t<tLeave;
    const h=inA?ease(clamp((t-TM.t0)/TM.dA))*(LR+Ll):ease(clamp((t-tLeave)/TM.dL))*(Lc+cl);
    const allWhite=!inA&&(h+Ll>=F.hold+F.fade);
    rlp.setAttribute('d',`M${s+FR},100 Q${s+Cx},56 ${s+Ta_},12`); rlp.setAttribute('opacity',allWhite?1:0);
    for(let i=0;i<K;i++){const r=(cum[i]+cum[i+1])/2,p=rl[i];
      p.setAttribute('d',`M${P[i][0].toFixed(2)},${P[i][1].toFixed(2)} L${P[i+1][0].toFixed(2)},${P[i+1][1].toFixed(2)}`);
      p.setAttribute('stroke',allWhite?HID:inA?(r<=h?colorAt(h-r):HID):colorAt(h+Ll+(LR-r)));}
    gA.setAttribute('transform',`translate(${s},0)`);
    leg.forEach((p,j)=>{const l=Ll*(j+.5)/legS.n;p.setAttribute('stroke',inA?(LR+l<=h?colorAt(h-LR-l):HID):colorAt(h+(Ll-l)))});
    curl.forEach((p,j)=>{const sc=Lc*(j+.5)/curlS.n;p.setAttribute('stroke',inA?HID:(sc<=h?colorAt(h-sc):HID))});
    cross.forEach((p,j)=>{const x0=xs+cl*j/Nc,x1=xs+cl*(j+1)/Nc,arc=Lc+((x0+x1)/2-xs);
      p.setAttribute('d',`M${x0.toFixed(2)},58 L${x1.toFixed(2)},58`);p.setAttribute('stroke',inA?HID:(arc<=h?colorAt(h-arc):HID))});
    const xT=lerp(s+Ta_,c.xTend,e), xB=lerp(s+FR,c.xBend,e);   // top and bottom arms grow with the dart
    top.setAttribute('d',`M${s+48},12 L${xT},12`); top.setAttribute('opacity',u>.001?1:0);
    bot.setAttribute('d',`M${s+FR},100 L${xB},100`); bot.setAttribute('opacity',u>.001?1:0);

    // dart position and heading
    let pos,target;
    const dir=(sm,a)=>{const p=at(sm,a-2),q=at(sm,a+2);return Math.atan2(q[1]-p[1],q[0]-p[0])};
    if(inA){
      if(h<=LR){let i=1;while(i<K&&cum[i]<h)i++;const k=(h-cum[i-1])/Math.max(.001,cum[i]-cum[i-1]);
        pos=[lerp(P[i-1][0],P[i][0],k),lerp(P[i-1][1],P[i][1],k)];
        const pa=P[Math.max(0,i-1)],pb=P[Math.min(K,i+1)];target=Math.atan2(pb[1]-pa[1],pb[0]-pa[0]);}
      else{const l=h-LR,q=at(legS,l);pos=[q[0]+s,q[1]];target=dir(legS,l)}
    } else if(h<=Lc){const q=at(curlS,h);pos=[q[0]+s,q[1]];target=dir(curlS,h)}
    else{pos=[xs+(h-Lc),58];target=0}
    if(!smooth) c.ang=(!inA&&h>Lc)?0:target;
    else{let dd=target-c.ang;dd=Math.atan2(Math.sin(dd),Math.cos(dd));c.ang+=dd*.28;c.ang=Math.atan2(Math.sin(c.ang),Math.cos(c.ang));}
    if(t>=tLand) c.ang*=.6;                                      // settles level, never spins
    tri.setAttribute('transform',`translate(${pos[0]-Math.cos(c.ang)*T.nx},${pos[1]-Math.sin(c.ang)*T.nx}) rotate(${c.ang*180/Math.PI})`);
    tri.setAttribute('opacity',t<TM.t0?0:1);

    // orange dot: pops in big, shrinks and glides to its place on the right
    const m=ease(clamp((t-.6)/.8)), grow=1-Math.pow(1-clamp(t/.4),3);
    const dr=t<.6?c.R0*grow:lerp(c.R0,T.r,m), dx=lerp(c.cx0,c.BX,m), op=clamp(t/.3);
    for(const el of [glow,ball]){el.setAttribute('cx',dx);el.setAttribute('cy',58);el.setAttribute('opacity',op)}
    ball.setAttribute('r',dr);
    glow.setAttribute('r',dr*2.57+(t>tLand?14*Math.sin(clamp((t-tLand)/.6)*Math.PI):0));
  }

  let raf=0, playing=false;
  function play(){
    cancelAnimationFrame(raf); playing=true; c.ang=0;
    const t0=performance.now();
    (function frame(now){
      const t=(now-t0)/1000; draw(t,true);
      if(t<tEnd) raf=requestAnimationFrame(frame);
      else{c.ang=0;draw(60,false);playing=false}
    })(t0);
  }
  draw(60,false);                                                // final state (also the no-motion version)
  const fallback=slot.querySelector('img'); slot.appendChild(svg); if(fallback) fallback.remove();
  if(!reduce){
    draw(0,false);                                               // start hidden, then play on load
    requestAnimationFrame(()=>setTimeout(play,150));
    const again=()=>{if(!playing) play()};
    slot.addEventListener('pointerenter',again);
    slot.addEventListener('focusin',again);
  }
  }
  try{ init(); }catch(err){ console.warn('logo animation unavailable, using static logo',err); }
})();
