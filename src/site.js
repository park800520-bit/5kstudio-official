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

  // dot field
  const dots=document.getElementById("dots");const D=[];
  for(let i=0;i<34;i++){const d=document.createElement("i");d.style.left=(8+Math.random()*84)+"%";d.style.top=(10+Math.random()*80)+"%";dots.appendChild(d);D.push(d)}
  dots.addEventListener("pointermove",e=>{D.forEach(d=>{const r=d.getBoundingClientRect(),dx=r.left-e.clientX,dy=r.top-e.clientY,dist=Math.hypot(dx,dy)||1,f=Math.max(0,1-dist/160)*60;d.style.transform=`translate(${dx/dist*f}px,${dy/dist*f}px)`})});
  dots.addEventListener("pointerleave",()=>D.forEach(d=>d.style.transform=""));

  // case filters + hover play
  const grid=document.getElementById("grid"),fl=document.getElementById("filters");
  fl.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;fl.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));
    grid.querySelectorAll(".c").forEach(c=>c.classList.toggle("hide",b.dataset.k!=="all"&&c.dataset.cat!==b.dataset.k))});
  grid.querySelectorAll(".c").forEach(el=>{const v=el.querySelector("video");if(!v)return;
    el._p=()=>{if(reduce)return;if(!v.src)v.src=v.dataset.src;v.play().then(()=>el.classList.add("playing")).catch(()=>{})};el._s=()=>{v.pause();el.classList.remove("playing")};
    el.addEventListener("mouseenter",el._p);el.addEventListener("mouseleave",el._s)});
  if(touch){const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting?e.target._p&&e.target._p():e.target._s&&e.target._s()),{threshold:.6});grid.querySelectorAll(".c").forEach(c=>io.observe(c))}
})();
