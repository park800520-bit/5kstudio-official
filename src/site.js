(function(){
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches,touch=matchMedia("(hover: none)").matches;

  // hero rotation — order and texts come from content/site.json (hero.slides)
  const vids=[...document.querySelectorAll(".hero video")],bars=document.getElementById("bars");
  const nowC=document.getElementById("nowClient"),nowT=document.getElementById("nowTitle"),label=nowC.dataset.label;
  let cur=0;
  vids.forEach((v,i)=>{const b=document.createElement("button");b.type="button";b.setAttribute("aria-label",v.dataset.client);b.innerHTML="<i></i>";b.onclick=()=>show(i);bars.appendChild(b)});
  function show(i){vids.forEach((v,j)=>{if(j===i){v.currentTime=0;v.play().catch(()=>{});v.classList.add("on")}else{v.classList.remove("on");setTimeout(()=>{if(j!==cur)v.pause()},1200)}});
    cur=i;nowC.textContent=label+" — "+vids[i].dataset.client;nowT.textContent=vids[i].dataset.title;}
  vids.forEach((v,i)=>v.addEventListener("ended",()=>{if(i===cur)show((cur+1)%vids.length)}));
  if(vids.length===1)vids[0].loop=true;
  (function prog(){const v=vids[cur];if(v)[...bars.children].forEach((b,j)=>{b.firstChild.style.transform=`scaleX(${j<cur?1:j===cur&&v.duration?v.currentTime/v.duration:0})`});requestAnimationFrame(prog)})();
  if(vids[0])vids[0].play().catch(()=>{});

  // fit giant wordmarks to their container
  const fitTo=(el,frac)=>{if(!el)return;el.style.fontSize="100px";const w=el.getBoundingClientRect().width,P=el.parentElement,cs=getComputedStyle(P),avail=P.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);el.style.fontSize=(100*avail*frac/w)+"px"};
  const word=document.querySelector("#word span"),huge=document.getElementById("huge");
  const fitAll=()=>{fitTo(word,.94);fitTo(huge,.995)};
  (document.fonts?document.fonts.ready:Promise.resolve()).then(fitAll);fitAll();addEventListener("resize",fitAll);

  // header deck button after hero
  const hdr=document.getElementById("hdr");addEventListener("scroll",()=>hdr.classList.toggle("scrolled",scrollY>innerHeight*.7),{passive:true});

  // dot field — mini game: click the dots to pop them like fireworks
  (function(){
    const box=document.getElementById("dots");if(!box)return;
    const N=34,score=document.getElementById("score"),hint=box.querySelector(".hint"),cv=document.createElement("canvas");
    cv.className="fx";box.appendChild(cv);const cx=cv.getContext("2d");
    const COLORS=["#ff5000","#ffb300","#ff2d55","#00c2ff","#7c4dff","#00d084","#111"];
    let D=[],P=[],popped=0,mx=-1e4,my=-1e4,run=false,last=0,dpr=1,W=0,H=0;const PAD=90;
    function size(){const r=box.getBoundingClientRect();dpr=Math.min(2,devicePixelRatio||1);W=r.width+PAD*2;H=r.height+PAD*2;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px";cx.setTransform(dpr,0,0,dpr,0,0)}
    function spawn(){D.forEach(d=>d.el.remove());D=[];popped=0;
      for(let i=0;i<N;i++){const el=document.createElement("i");box.insertBefore(el,cv);const d={el,fx:.06+Math.random()*.88,fy:.1+Math.random()*.8,ph:Math.random()*6.28,sp:.5+Math.random()*.6,px:0,py:0,alive:true,s:0};
        el.addEventListener("pointerdown",e=>{e.preventDefault();pop(d)});D.push(d)}
      upd()}
    function upd(){if(score)score.textContent=popped?`${popped} / ${N}`:""}
    function burst(x,y,n,big){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=(big?3:1.6)+Math.random()*(big?5:3.4);P.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(big?1.5:.6),l:1,dl:.012+Math.random()*.016,c:COLORS[Math.random()*COLORS.length|0],r:1.8+Math.random()*2.6})}start()}
    function pop(d){if(!d.alive)return;d.alive=false;d.el.classList.add("pop");const r=box.getBoundingClientRect(),e=d.el.getBoundingClientRect();
      burst(e.left-r.left+PAD+3.5,e.top-r.top+PAD+3.5,reduce?14:42);popped++;upd();
      if(hint&&popped===1)hint.classList.add("dim");
      if(popped===N){if(score)score.textContent="완벽해요! 다시 채워드릴게요";
        for(let k=0;k<6;k++)setTimeout(()=>burst(PAD+Math.random()*(W-PAD*2),PAD+Math.random()*(H-PAD*2),70,true),k*220);
        setTimeout(()=>{spawn();hint&&hint.classList.remove("dim")},2600)}}
    box.addEventListener("pointermove",e=>{const r=box.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});
    box.addEventListener("pointerleave",()=>{mx=my=-1e4});
    function frame(t){if(!run)return;const r=box.getBoundingClientRect(),bw=r.width,bh=r.height,tt=t/1000;
      D.forEach(d=>{if(!d.alive)return;const dx=reduce?0:Math.sin(tt*d.sp*.6+d.ph)*6,dy=reduce?0:Math.cos(tt*d.sp*.5+d.ph*1.3)*5;
        const x=d.fx*bw+dx,y=d.fy*bh+dy;d.el.style.transform=`translate(${x}px,${y}px)`});
      cx.clearRect(0,0,W,H);
      for(let i=P.length-1;i>=0;i--){const p=P[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.07;p.vx*=.985;p.vy*=.985;p.l-=p.dl;
        if(p.l<=0){P.splice(i,1);continue}cx.globalAlpha=Math.max(0,p.l);cx.fillStyle=p.c;cx.beginPath();cx.arc(p.x,p.y,p.r*(.5+p.l*.5),0,6.283);cx.fill()}
      cx.globalAlpha=1;requestAnimationFrame(frame)}
    function start(){if(!run){run=true;requestAnimationFrame(frame)}}
    size();spawn();addEventListener("resize",size);
    new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)start();else run=false}),{rootMargin:"100px"}).observe(box);
  })();

  // case filters + hover play
  const grid=document.getElementById("grid"),fl=document.getElementById("filters");
  fl.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;fl.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));
    grid.querySelectorAll(".c").forEach(c=>c.classList.toggle("hide",b.dataset.k!=="all"&&c.dataset.cat!==b.dataset.k))});
  grid.querySelectorAll(".c").forEach(el=>{const v=el.querySelector("video");if(!v)return;
    el._p=()=>{if(reduce||!v.dataset.src)return;if(!v.src)v.src=v.dataset.src;v.play().then(()=>el.classList.add("playing")).catch(()=>{})};el._s=()=>{v.pause();el.classList.remove("playing")};
    el.addEventListener("mouseenter",el._p);el.addEventListener("mouseleave",el._s)});
  if(touch){const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?e.target._p&&e.target._p():e.target._s&&e.target._s()),{threshold:.6});grid.querySelectorAll(".c").forEach(c=>io.observe(c))}
  // text-block offsets (set with the mouse in edit mode) — PC only, phones keep the original layout
  window.__kblock=x=>{let e=x.parentElement;while(e&&e!==document.body){const d=getComputedStyle(e).display;if(d!=="inline"&&d!=="contents")return e;e=e.parentElement}return x.parentElement};
  window.__kfind=key=>{const m=key.match(/^(.*)@(\d+)$/),all=document.querySelectorAll(`x-t[data-k="${m?m[1]:key}"]`);return all[m?+m[2]:0]};
  window.__koff=(()=>{try{return JSON.parse(document.getElementById("k-off").textContent||"{}")}catch(e){return{}}})();
  window.__kapply=()=>{const on=matchMedia("(min-width:900px)").matches;for(const k in __koff){const x=__kfind(k);if(!x)continue;const o=__koff[k],b=__kblock(x);
    const z=on&&o.s&&o.s!==1&&!b.closest("#word")&&b.id!=="huge"?o.s:1;b.style.zoom=z!==1?z:"";
    b.style.translate=on&&(o.x||o.y)?`${(o.x||0)/z}vw ${(o.y||0)/z}vw`:"";
    const st=b.style;st.whiteSpace=st.width=st.maxWidth=st.marginLeft=st.marginRight="";
    if(on&&o.w&&!b.closest("#word")&&b.id!=="huge"){const ta=getComputedStyle(b).textAlign;st.whiteSpace="nowrap";st.width="max-content";st.maxWidth="none";if(ta==="center")st.marginLeft=st.marginRight="auto";else if(ta==="right"||ta==="end")st.marginLeft="auto"}}};
  __kapply();addEventListener("resize",__kapply);
  // edit mode: open the site with ?edit (or #edit)
  if(/[?&#]edit\b/.test(location.href)){const s=document.createElement("script");s.src="edit.js?"+Date.now();document.body.appendChild(s)}
  window.__hero={get cur(){return cur},show,vids};
})();
