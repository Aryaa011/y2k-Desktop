(function () {
  "use strict";
  const DESKTOP_PAD_BOTTOM = 48;
  const songs = [
    { name: "Sample Track 1", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { name: "Sample Track 2", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  ];
  const CHAOS_MESSAGES = [
    { title: "System Warning", text: "An unidentified error wants to be friends.", icon: "⚠" },
    { title: "Error detected", text: "Memory corrupted with good vibes only.", icon: "✖" },
    { title: "Critical Update", text: "Installing nostalgia… 327% complete.", icon: "↓" },
    { title: "Security Alert", text: "Your desktop is too aesthetic. Proceed anyway?", icon: "🔒" },
    { title: "System Warning", text: "The year 2000 called. It wants its pixels back.", icon: "📞" },
    { title: "YOU'VE GOT MAIL!", text: "From: CoolDude2000@aol.com — hey r u there?? a/s/l??", icon: "📧" },
    { title: "Virus Detected!", text: "NOSTALGIA.EXE is consuming 100% of your feelings.", icon: "🦠" },
    { title: "MSN Messenger", text: "xXDragonSlayer99Xx has just signed in.", icon: "💬" },
    { title: "WinAmp Alert", text: "It really whips the llama's ass.", icon: "🎵" },
  ];
  const MSN_BOT_REPLIES = [
    "omg heyyyy!! a/s/l??","lolz u r so funny xD","brb my mom is calling me for dinner",
    "did u see what happened on TRL today???","ugh my internet is SO slow rn dial-up sux",
    "omg i <3 this song on my winamp right now","have u heard of this new site called google dot com",
    "bbs gotta update my away message","lol jk jk rofl rofl","ur so random hahaha ^_^",
    "i gtg my mom said only 1 more hour on the computer","omg that is SO fetch",
  ];
  let audioCtx=null,zTop=100,chaosTimer=null,chaosMode=false;
  const windowsByType=new Map(),windowCleanups=new Map();
  const els={
    windowsRoot:document.getElementById("windows-root"),
    taskbarTabs:document.getElementById("taskbar-tabs"),
    btnStart:document.getElementById("btn-start"),
    startMenu:document.getElementById("start-menu"),
    submenuPrograms:document.getElementById("submenu-programs"),
    popupLayer:document.getElementById("popup-layer"),
    chaosLayer:document.getElementById("chaos-layer"),
    clock:document.getElementById("clock"),
    desktop:document.getElementById("desktop"),
    ctxMenu:document.getElementById("ctx-menu"),
    stickyLayer:document.getElementById("sticky-layer"),
    crtOverlay:document.getElementById("crt-overlay")
  };
  let songIndex=0,musicUiRoot=null,audioHooksInstalled=false;

  /* ── AUDIO ── */
  function getAudioPlayer(){return document.getElementById("audioPlayer");}
  function loadSong(i){const a=getAudioPlayer();if(!a||!songs.length)return;songIndex=(i+songs.length)%songs.length;a.src=songs[songIndex].src;a.load();syncMusicUiLabels();}
  function playSong(){const a=getAudioPlayer();return a?a.play().catch(()=>{}):Promise.resolve();}
  function pauseSong(){const a=getAudioPlayer();if(a)a.pause();}
  function nextSong(){loadSong(songIndex+1);return playSong();}
  function prevSong(){loadSong(songIndex-1);return playSong();}
  function fmt(t){if(!isFinite(t))return"0:00";return`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}`;}
  function syncMusicUiLabels(){
    if(!musicUiRoot)return;
    const a=getAudioPlayer(),n=musicUiRoot.querySelector("[data-mp-name]"),pb=musicUiRoot.querySelector("[data-mp-play]"),ps=musicUiRoot.querySelector("[data-mp-pause]");
    if(n)n.textContent=songs[songIndex]?songs[songIndex].name:"—";
    const playing=a&&!a.paused;if(pb)pb.disabled=playing;if(ps)ps.disabled=!playing;
  }
  function installAudioHooksOnce(){
    if(audioHooksInstalled)return;const a=getAudioPlayer();if(!a)return;audioHooksInstalled=true;
    a.addEventListener("timeupdate",()=>{if(!musicUiRoot||!a.duration)return;const sk=musicUiRoot.querySelector("[data-mp-seek]"),cu=musicUiRoot.querySelector("[data-mp-cur]");if(sk)sk.value=String(Math.round(a.currentTime/a.duration*1000));if(cu)cu.textContent=fmt(a.currentTime);});
    a.addEventListener("loadedmetadata",()=>{if(!musicUiRoot)return;const du=musicUiRoot.querySelector("[data-mp-dur]");if(du)du.textContent=fmt(a.duration);});
    a.addEventListener("play",syncMusicUiLabels);a.addEventListener("pause",syncMusicUiLabels);
    a.addEventListener("ended",()=>{loadSong(songIndex+1);playSong();});
  }
  function getACtx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx;}
  function playClick(){try{const c=getACtx();if(c.state==="suspended")c.resume();const o=c.createOscillator(),g=c.createGain();o.type="square";o.frequency.value=1400;g.gain.setValueAtTime(0.055,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.04);o.connect(g);g.connect(c.destination);o.start(c.currentTime);o.stop(c.currentTime+0.05);}catch(_){}}
  function playStartup(){try{const c=getACtx();if(c.state==="suspended")c.resume();[523.25,659.25,783.99,1046.5].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.value=f;const t=c.currentTime+i*0.07;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.12,t+0.02);g.gain.exponentialRampToValueAtTime(0.001,t+0.35);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+0.4);});}catch(_){}}
  let startupPlayed=false;function tryStartup(){if(!startupPlayed){startupPlayed=true;playStartup();}}
  document.addEventListener("pointerdown",()=>{const c=getACtx();if(c.state==="suspended")c.resume();},{passive:true});

  /* ── WINDOW HELPERS ── */
  function bringToFront(w){zTop+=1;w.style.zIndex=String(zTop);syncTabActive(w.dataset.winType);}
  function syncTabActive(t){els.taskbarTabs.querySelectorAll(".taskbar__tab").forEach(tab=>tab.classList.toggle("taskbar__tab--active",tab.dataset.winType===t));}

  /* ── CLOCK ── */
  function updateClock(){const n=new Date();els.clock.textContent=`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}:${String(n.getSeconds()).padStart(2,"0")}`;els.clock.setAttribute("datetime",n.toISOString());const tip=document.querySelector(".taskbar__date-tooltip");if(tip)tip.textContent=n.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});}
  const cw=document.createElement("div");cw.className="taskbar__clock-wrap";const dt=document.createElement("div");dt.className="taskbar__date-tooltip";els.clock.parentNode.insertBefore(cw,els.clock);cw.appendChild(els.clock);cw.appendChild(dt);
  setInterval(updateClock,1000);updateClock();

  function esc(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML;}

  /* ── MSGBOX ── */
  function showMsgbox(title,msg,icon,btns){
    return new Promise(res=>{
      const w=document.createElement("div");w.className="msgbox";w.setAttribute("role","dialog");
      w.innerHTML=`<div class="msgbox__title">${esc(title)}</div><div class="msgbox__body"><span class="msgbox__icon">${icon}</span><p class="msgbox__text">${msg}</p></div><div class="msgbox__actions"></div>`;
      const ac=w.querySelector(".msgbox__actions");
      btns.forEach(b=>{const btn=document.createElement("button");btn.type="button";btn.className="msgbox__btn";btn.textContent=b.label;btn.addEventListener("click",()=>{playClick();w.remove();res(b.value);});ac.appendChild(btn);});
      els.popupLayer.appendChild(w);
    });
  }

  /* ── CHAOS ── */
  function spawnPopup(){const p=CHAOS_MESSAGES[Math.floor(Math.random()*CHAOS_MESSAGES.length)];const w=document.createElement("div");w.className="msgbox msgbox--floating";w.style.left=`${8+Math.random()*(window.innerWidth-300)}px`;w.style.top=`${8+Math.random()*(window.innerHeight-DESKTOP_PAD_BOTTOM-200)}px`;w.style.zIndex=String(14000+Math.floor(Math.random()*500));w.innerHTML=`<div class="msgbox__title">${esc(p.title)}</div><div class="msgbox__body"><span class="msgbox__icon">${p.icon}</span><p class="msgbox__text">${esc(p.text)}</p></div><div class="msgbox__actions"><button type="button" class="msgbox__btn" data-ok>OK</button></div>`;w.querySelector("[data-ok]").addEventListener("click",()=>{playClick();w.remove();});els.chaosLayer.appendChild(w);}
  function chaosBurst(n){for(let i=0;i<(n||4+Math.floor(Math.random()*4));i++)spawnPopup();}
  function setChaos(on){chaosMode=on;const b=document.getElementById("btn-chaos-toggle");if(b)b.setAttribute("aria-pressed",on?"true":"false");if(chaosTimer){clearInterval(chaosTimer);chaosTimer=null;}if(on)chaosTimer=setInterval(()=>{if(Math.random()<0.55)spawnPopup();},3200);}
  document.getElementById("btn-chaos").addEventListener("click",()=>{playClick();chaosBurst();});
  document.getElementById("btn-chaos-toggle").addEventListener("click",()=>{playClick();setChaos(!chaosMode);});

  /* ── CRT ── */
  let crtOn=false;
  document.getElementById("btn-crt").addEventListener("click",()=>{playClick();crtOn=!crtOn;els.crtOverlay.hidden=!crtOn;});


  /* ── WALLPAPER ── */
  function setWallpaper(url){els.desktop.style.backgroundImage=`url("${url}")`;playClick();}
  document.querySelectorAll("[data-wallpaper]").forEach(b=>b.addEventListener("click",()=>setWallpaper(b.dataset.wallpaper)));

  /* ── CONTEXT MENU ── */
  function hideCtx(){els.ctxMenu.hidden=true;}
  function showCtx(x,y){
    els.ctxMenu.hidden=false;
    const mw=els.ctxMenu.offsetWidth||180,mh=els.ctxMenu.offsetHeight||160;
    els.ctxMenu.style.left=`${Math.min(x,window.innerWidth-mw-4)}px`;
    els.ctxMenu.style.top=`${Math.min(y,window.innerHeight-mh-4)}px`;
  }
  els.desktop.addEventListener("contextmenu",e=>{if(e.target.closest(".window,.taskbar,.start-menu,.ctx-menu,.desk-icon"))return;e.preventDefault();showCtx(e.clientX,e.clientY);});
  document.addEventListener("click",e=>{if(!e.target.closest(".ctx-menu"))hideCtx();});
  els.ctxMenu.addEventListener("click",e=>{
    const b=e.target.closest("[data-ctx]");if(!b)return;hideCtx();
    const a=b.dataset.ctx;
    if(a==="refresh"){playClick();showMsgbox("AryaOS","Desktop refreshed successfully.","🔄",[{label:"OK",value:true}]);}
    if(a==="notepad"){playClick();openOrFocusWindow("notepad");}
    if(a==="sticky"){playClick();spawnSticky();}
    if(a==="about")openOrFocusWindow("about");
  });

  /* ── STICKY NOTES ── */
  let stickyN=0;
  function spawnSticky(x,y){
    stickyN++;
    const note=document.createElement("div");note.className="sticky-note";
    note.style.left=`${x||120+stickyN*24}px`;note.style.top=`${y||80+stickyN*24}px`;note.style.zIndex=String(zTop+1);
    note.innerHTML=`<div class="sticky-note__bar" data-sdrag>📌 Note ${stickyN}<button class="sticky-note__close" title="Close">×</button></div><textarea class="sticky-note__text" placeholder="Type your note here..."></textarea>`;
    note.querySelector(".sticky-note__close").addEventListener("click",()=>{playClick();note.remove();});
    const h=note.querySelector("[data-sdrag]");
    h.addEventListener("pointerdown",e=>{if(e.target.closest(".sticky-note__close"))return;e.preventDefault();h.setPointerCapture(e.pointerId);const sx=e.clientX,sy=e.clientY,ol=parseFloat(note.style.left)||0,ot=parseFloat(note.style.top)||0;const mv=ev=>{note.style.left=`${ol+ev.clientX-sx}px`;note.style.top=`${ot+ev.clientY-sy}px`;};const up=ev=>{h.releasePointerCapture(ev.pointerId);h.removeEventListener("pointermove",mv);h.removeEventListener("pointerup",up);};h.addEventListener("pointermove",mv);h.addEventListener("pointerup",up);});
    els.stickyLayer.appendChild(note);note.querySelector("textarea").focus();
  }

  /* ── WINDOW CLOSE DELEGATION ── */
  els.windowsRoot.addEventListener("click",e=>{const b=e.target.closest(".close-btn");if(!b)return;const w=b.closest(".window");if(!w||!els.windowsRoot.contains(w))return;e.preventDefault();e.stopPropagation();const t=w.dataset.winType;if(t)closeWindow(t);});

  const titles={computer:"My Computer",documents:"My Documents",music:"Song — Music Player",camera:"Webcam Studio",recycle:"Recycle Bin",about:"About AryaOS",internet:"Internet Explorer",paint:"untitled - Paint",solitaire:"Solitaire",notepad:"Untitled - Notepad",calc:"Calculator",msn:"MSN Messenger",snake:"Snake"};

  function clamp(w){const ml=window.innerWidth-80,mt=window.innerHeight-DESKTOP_PAD_BOTTOM-40;w.style.left=`${Math.max(0,Math.min(parseFloat(w.style.left)||0,ml))}px`;w.style.top=`${Math.max(0,Math.min(parseFloat(w.style.top)||0,mt))}px`;}
  function defSize(t){return{internet:[440,320],paint:[600,490],solitaire:[720,520],camera:[400,460],music:[420,300],notepad:[480,380],calc:[240,360],msn:[360,440],snake:[380,430]}[t]||[360,280];}

  /* ── CONTENT BUILDERS ── */
  function buildExplorer(html){const d=document.createElement("div");d.className="window__body--padded window__body--tan";d.innerHTML=html;return d;}
  function buildAbout(){const d=document.createElement("div");d.className="about-panel window__body--padded";d.innerHTML=`<p><strong>AryaOS v2</strong></p><p>Retro XP-style desktop in the browser.</p><div class="sys-line">Windows XP Home Edition (simulated)<br>Version 5.1 — Build 2600<br>Computer: Virtual Pentium III<br>Memory: 128 MB RAM<br><br>v2 adds: Notepad · Calculator · MSN · Snake<br>Right-click menu · Sticky Notes · CRT Filter<br>Wallpaper Changer · Clock Tooltip<br>Paint: undo, save, fill, shapes, brush size</div>`;return d;}
  function buildIE(){const d=document.createElement("div");d.className="window__body--padded";d.innerHTML=`<div class="browser-chrome"><span>Address</span><input type="text" readonly value="http://www.arya.local/glitch.htm"/></div><div class="browser-view browser-view--glitch">Connecting…<br><br>ERR_NOSTALGIA_OVERFLOW<br>▓▒░ SIGNAL LOST ░▒▓</div>`;return d;}
  function buildMusic(){const r=document.createElement("div");r.className="music-player";r.setAttribute("data-music-panel","true");r.innerHTML=`<div class="music-player__row"><div class="music-player__album"></div><div class="music-player__controls"><button type="button" class="music-player__btn" data-mp-prev title="Prev">|◀</button><button type="button" class="music-player__btn music-player__btn--primary" data-mp-play>Play</button><button type="button" class="music-player__btn" data-mp-pause>Pause</button><button type="button" class="music-player__btn" data-mp-next title="Next">▶|</button></div></div><div class="music-player__track" data-mp-name>—</div><div class="music-player__progress"><span class="music-player__time" data-mp-cur>0:00</span><div class="music-player__bar-wrap"><input type="range" class="music-player__seek" data-mp-seek min="0" max="1000" value="0"/></div><span class="music-player__time" data-mp-dur>0:00</span></div>`;return r;}
  function initMusic(w){const r=w.querySelector("[data-music-panel]");if(!r)return;musicUiRoot=r;installAudioHooksOnce();r.querySelector("[data-mp-prev]").addEventListener("click",()=>{playClick();prevSong();});r.querySelector("[data-mp-next]").addEventListener("click",()=>{playClick();nextSong();});r.querySelector("[data-mp-play]").addEventListener("click",()=>{playClick();playSong().then(syncMusicUiLabels);});r.querySelector("[data-mp-pause]").addEventListener("click",()=>{playClick();pauseSong();});const sk=r.querySelector("[data-mp-seek]");sk.addEventListener("input",()=>{const a=getAudioPlayer();if(!a||!a.duration)return;a.currentTime=(Number(sk.value)/1000)*a.duration;});loadSong(songIndex);syncMusicUiLabels();windowCleanups.set("music",()=>{pauseSong();musicUiRoot=null;});}
  function buildCamera(){const d=document.createElement("div");d.className="camera-wrap";d.innerHTML=`<video class="camera-preview" playsinline muted autoplay data-cam-video></video><div class="camera-wrap__actions"><button type="button" class="camera-wrap__btn" data-cam-cap>Capture</button></div><div data-cam-snap></div><div class="camera-error" data-cam-err hidden></div>`;return d;}
  function initCamera(w){const v=w.querySelector("[data-cam-video]"),er=w.querySelector("[data-cam-err]"),sn=w.querySelector("[data-cam-snap]");let stream=null;er.hidden=true;navigator.mediaDevices.getUserMedia({video:true,audio:false}).then(s=>{stream=s;v.srcObject=stream;}).catch(()=>{er.hidden=false;er.textContent="Camera unavailable.";});w.querySelector("[data-cam-cap]").addEventListener("click",()=>{playClick();if(!v.videoWidth)return;const c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);sn.replaceChildren();const img=document.createElement("img");img.className="camera-capture-preview";img.src=c.toDataURL("image/png");img.alt="Capture";sn.appendChild(img);});windowCleanups.set("camera",()=>{if(stream)stream.getTracks().forEach(t=>t.stop());v.srcObject=null;});}

  /* ── PAINT ── */
  function buildPaint(){const d=document.createElement("div");d.className="paint-app";d.innerHTML=`<div class="paint-menu"><span class="notepad-menu-btn" style="cursor:pointer" data-paint-file>File</span><span>Edit</span><span>Image</span><span>Help</span></div><div class="paint-body"><div class="paint-tools"><button type="button" class="paint-tool paint-tool--active" data-tool="pen" title="Pencil">✎</button><button type="button" class="paint-tool" data-tool="eraser" title="Eraser">⌫</button><button type="button" class="paint-tool" data-tool="fill" title="Fill Bucket">🪣</button><button type="button" class="paint-tool" data-tool="rect" title="Rectangle">▭</button><button type="button" class="paint-tool" data-tool="line" title="Line">╱</button></div><div class="paint-canvas-wrap"><canvas class="paint-canvas" width="480" height="300"></canvas></div></div><div class="paint-brush-row"><label>Size:</label><input type="range" min="1" max="24" value="2" data-brush-size/><div class="paint-brush-preview" data-brush-prev></div><button class="paint-undo-btn" data-p-undo>↩ Undo</button><button class="paint-save-btn" data-p-save>💾 Save</button></div><div class="paint-colors" data-palette></div>`;const pal=d.querySelector("[data-palette]");["#000","#808080","#800000","#f00","#ff8000","#ff0","#0f0","#008080","#00ffff","#00f","#8000ff","#f0f","#fff","#c0c0c0","#ffc0cb","#a52a2a"].forEach((c,i)=>{const s=document.createElement("button");s.type="button";s.className="paint-swatch"+(i===0?" paint-swatch--active":"");s.style.background=c;s.dataset.color=c;pal.appendChild(s);});return d;}
  function initPaint(w){
    const cv=w.querySelector(".paint-canvas"),ctx=cv.getContext("2d");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,cv.width,cv.height);
    let tool="pen",color="#000000",bs=2,drawing=false,hist=[],hidx=-1,rs=null;
    const prev=w.querySelector("[data-brush-prev]");
    function saveH(){hist=hist.slice(0,hidx+1);hist.push(ctx.getImageData(0,0,cv.width,cv.height));if(hist.length>20)hist.shift();hidx=hist.length-1;}
    saveH();
    function updPrev(){prev.style.width=prev.style.height=`${Math.max(6,bs)+4}px`;prev.style.background=tool==="eraser"?"#fff":color;prev.style.borderRadius="50%";prev.style.border="1px solid #808080";}
    updPrev();
    w.querySelectorAll(".paint-tool").forEach(b=>{b.addEventListener("click",()=>{playClick();w.querySelectorAll(".paint-tool").forEach(x=>x.classList.remove("paint-tool--active"));b.classList.add("paint-tool--active");tool=b.dataset.tool;updPrev();});});
    w.querySelectorAll(".paint-swatch").forEach(s=>{s.addEventListener("click",()=>{playClick();w.querySelectorAll(".paint-swatch").forEach(x=>x.classList.remove("paint-swatch--active"));s.classList.add("paint-swatch--active");color=s.dataset.color;updPrev();});});
    const si=w.querySelector("[data-brush-size]");si.addEventListener("input",()=>{bs=Number(si.value);updPrev();});
    w.querySelector("[data-p-undo]").addEventListener("click",()=>{if(hidx>0){hidx--;ctx.putImageData(hist[hidx],0,0);}});
    w.querySelector("[data-p-save]").addEventListener("click",()=>{playClick();const a=document.createElement("a");a.download="painting.png";a.href=cv.toDataURL("image/png");a.click();});
    function pos(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*(cv.width/r.width),y:(e.clientY-r.top)*(cv.height/r.height)};}
    function hexRgb(h){return{r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)};}
    function flood(sx,sy,fc){const im=ctx.getImageData(0,0,cv.width,cv.height),d=im.data,f=hexRgb(fc);const tx=Math.round(sx),ty=Math.round(sy),i=(ty*cv.width+tx)*4;const[tr,tg,tb]=[d[i],d[i+1],d[i+2]];if(tr===f.r&&tg===f.g&&tb===f.b)return;const st=[[tx,ty]];while(st.length){const[x,y]=st.pop();if(x<0||x>=cv.width||y<0||y>=cv.height)continue;const j=(y*cv.width+x)*4;if(d[j]!==tr||d[j+1]!==tg||d[j+2]!==tb)continue;d[j]=f.r;d[j+1]=f.g;d[j+2]=f.b;d[j+3]=255;st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);}ctx.putImageData(im,0,0);}
    cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);const p=pos(e);if(tool==="fill"){saveH();try{flood(p.x,p.y,color);}catch(_){}return;}drawing=true;if(tool==="rect"||tool==="line"){rs=p;saveH();return;}ctx.beginPath();ctx.moveTo(p.x,p.y);});
    cv.addEventListener("pointermove",e=>{if(!drawing)return;const p=pos(e);if((tool==="rect"||tool==="line")&&rs){ctx.putImageData(hist[hidx],0,0);ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=bs;if(tool==="rect")ctx.strokeRect(rs.x,rs.y,p.x-rs.x,p.y-rs.y);else{ctx.moveTo(rs.x,rs.y);ctx.lineTo(p.x,p.y);ctx.stroke();}return;}ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=tool==="eraser"?bs*3:bs;ctx.strokeStyle=tool==="eraser"?"#ffffff":color;ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);});
    cv.addEventListener("pointerup",()=>{if(drawing&&tool!=="fill")saveH();drawing=false;rs=null;ctx.beginPath();});
    cv.addEventListener("pointercancel",()=>{drawing=false;ctx.beginPath();});
    windowCleanups.set("paint",()=>{});
  }

  /* ── NOTEPAD ── */
  function buildNotepad(){const d=document.createElement("div");d.className="notepad-app";d.innerHTML=`<div class="notepad-menu"><button class="notepad-menu-btn" data-np-file>File</button><button class="notepad-menu-btn" data-np-save>Save</button><button class="notepad-menu-btn" data-np-help>Help</button></div><textarea class="notepad-textarea" data-np-text spellcheck="false" placeholder="Type here..."></textarea><div class="notepad-statusbar" data-np-status>Ln 1, Col 1 | 0 chars</div>`;return d;}
  function initNotepad(w){
    const ta=w.querySelector("[data-np-text]"),st=w.querySelector("[data-np-status]");
    function upd(){const l=ta.value.split("\n"),ln=ta.value.substring(0,ta.selectionStart).split("\n").length,col=ta.selectionStart-(ta.value.lastIndexOf("\n",ta.selectionStart-1)+1)+1;st.textContent=`Ln ${ln}, Col ${col} | ${ta.value.length} chars`;}
    ta.addEventListener("input",upd);ta.addEventListener("keyup",upd);ta.addEventListener("click",upd);
    function dl(txt){const a=document.createElement("a");a.download="document.txt";a.href="data:text/plain;charset=utf-8,"+encodeURIComponent(txt);a.click();}
    w.querySelector("[data-np-file]").addEventListener("click",()=>{showMsgbox("Notepad","Save changes?","📝",[{label:"Save",value:"s"},{label:"Don't Save",value:"n"},{label:"Cancel",value:"c"}]).then(v=>{if(v==="s")dl(ta.value);if(v!=="c"){ta.value="";upd();}});});
    w.querySelector("[data-np-save]").addEventListener("click",()=>{playClick();dl(ta.value);});
    w.querySelector("[data-np-help]").addEventListener("click",()=>showMsgbox("Notepad","AryaOS Notepad — type text, save as .txt","📝",[{label:"OK",value:true}]));
    windowCleanups.set("notepad",()=>{});
  }

  /* ── CALCULATOR ── */
  function buildCalc(){const d=document.createElement("div");d.className="calc-app";d.innerHTML=`<div class="calc-display--sub" data-c-expr>&nbsp;</div><div class="calc-display" data-c-scr>0</div><div class="calc-grid"><button class="calc-btn calc-btn--clear calc-btn--wide" data-c="C">C</button><button class="calc-btn calc-btn--op" data-c="±">±</button><button class="calc-btn calc-btn--op" data-c="÷">÷</button><button class="calc-btn" data-c="7">7</button><button class="calc-btn" data-c="8">8</button><button class="calc-btn" data-c="9">9</button><button class="calc-btn calc-btn--op" data-c="×">×</button><button class="calc-btn" data-c="4">4</button><button class="calc-btn" data-c="5">5</button><button class="calc-btn" data-c="6">6</button><button class="calc-btn calc-btn--op" data-c="−">−</button><button class="calc-btn" data-c="1">1</button><button class="calc-btn" data-c="2">2</button><button class="calc-btn" data-c="3">3</button><button class="calc-btn calc-btn--op" data-c="+">+</button><button class="calc-btn calc-btn--wide" data-c="0">0</button><button class="calc-btn" data-c=".">.</button><button class="calc-btn calc-btn--eq" data-c="=">=</button></div>`;return d;}
  function initCalc(w){
    const scr=w.querySelector("[data-c-scr]"),expr=w.querySelector("[data-c-expr]");
    let cur="0",prev="",op=null,fresh=false;
    function upd(){scr.textContent=cur.length>12?parseFloat(cur).toExponential(5):cur;}
    function calc(a,b,o){const fa=parseFloat(a),fb=parseFloat(b);if(o==="÷")return fb===0?"Error":String(fa/fb);if(o==="×")return String(fa*fb);if(o==="−")return String(fa-fb);if(o==="+")return String(fa+fb);return b;}
    w.querySelectorAll("[data-c]").forEach(b=>{b.addEventListener("click",()=>{playClick();const v=b.dataset.c;if(v==="C"){cur="0";prev="";op=null;fresh=false;expr.innerHTML="&nbsp;";}else if(v==="±"){cur=String(-parseFloat(cur)||0);}else if(["÷","×","−","+"].includes(v)){if(op&&!fresh){cur=calc(prev,cur,op);}prev=cur;op=v;fresh=true;expr.textContent=`${prev} ${v}`;}else if(v==="="){if(op){const r=calc(prev,cur,op);expr.textContent=`${prev} ${op} ${cur} =`;cur=r;op=null;prev="";fresh=false;}}else if(v==="."){if(fresh){cur="0.";fresh=false;}else if(!cur.includes("."))cur+=".";}else{if(cur==="0"||fresh){cur=v;fresh=false;}else if(cur.length<12)cur+=v;}upd();});});
    windowCleanups.set("calc",()=>{});
  }

  /* ── MSN ── */
  function buildMsn(){const d=document.createElement("div");d.className="msn-app";d.innerHTML=`<div class="msn-header"><div class="msn-avatar">😊</div><div><div>xXDragonSlayer99Xx</div><div style="font-weight:400;font-size:10px;opacity:.8">Online — AryaOS MSN 6.0</div></div></div><div class="msn-chat" data-msn-chat></div><div class="msn-input-row"><input type="text" class="msn-input" data-msn-in placeholder="Type a message… (Enter to send)" maxlength="200"/><button class="msn-send" data-msn-send>Send</button></div>`;return d;}
  function initMsn(w){
    const chat=w.querySelector("[data-msn-chat]"),inp=w.querySelector("[data-msn-in]");
    function addMsg(t,isMe){const m=document.createElement("div");m.className="msn-msg "+(isMe?"msn-msg--me":"msn-msg--them");m.innerHTML=`<div class="msn-msg__name">${isMe?"You":"xXDragonSlayer99Xx"}</div>${esc(t)}`;chat.appendChild(m);chat.scrollTop=chat.scrollHeight;}
    function send(){const t=inp.value.trim();if(!t)return;playClick();addMsg(t,true);inp.value="";setTimeout(()=>addMsg(MSN_BOT_REPLIES[Math.floor(Math.random()*MSN_BOT_REPLIES.length)],false),800+Math.random()*1200);}
    w.querySelector("[data-msn-send]").addEventListener("click",send);
    inp.addEventListener("keydown",e=>{if(e.key==="Enter")send();});
    setTimeout(()=>addMsg("heyyyy!! omg ur finally online!!! ^_^",false),600);
    windowCleanups.set("msn",()=>{});
  }

  /* ── SNAKE ── */
  function buildSnake(){const d=document.createElement("div");d.className="snake-app";d.innerHTML=`<div class="snake-score">Score: <span data-sk-sc>0</span> &nbsp;|&nbsp; Hi: <span data-sk-hi>0</span></div><canvas class="snake-canvas" data-sk-cv width="280" height="280"></canvas><div class="snake-msg" data-sk-msg>Press arrow key or tap button to start!</div><div class="snake-controls"><div></div><button class="snake-ctrl-btn" data-dir="up">▲</button><div></div><button class="snake-ctrl-btn" data-dir="left">◀</button><button class="snake-ctrl-btn" data-dir="down">▼</button><button class="snake-ctrl-btn" data-dir="right">▶</button></div>`;return d;}
  function initSnake(w){
    const cv=w.querySelector("[data-sk-cv]"),ctx=cv.getContext("2d"),scEl=w.querySelector("[data-sk-sc]"),hiEl=w.querySelector("[data-sk-hi]"),msg=w.querySelector("[data-sk-msg]");
    const CELL=14,C=20,R=20;cv.width=C*CELL;cv.height=R*CELL;
    let snake,dir,ndir,food,score,hi=0,loop=null,on=false;
    function start(){snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];dir={x:1,y:0};ndir={x:1,y:0};food=mkFood();score=0;on=true;msg.textContent="";scEl.textContent="0";if(loop)clearInterval(loop);loop=setInterval(tick,130);}
    function mkFood(){let f;do{f={x:Math.floor(Math.random()*C),y:Math.floor(Math.random()*R)};}while(snake.some(s=>s.x===f.x&&s.y===f.y));return f;}
    function tick(){dir=ndir;const h={x:(snake[0].x+dir.x+C)%C,y:(snake[0].y+dir.y+R)%R};if(snake.some(s=>s.x===h.x&&s.y===h.y)){clearInterval(loop);on=false;if(score>hi){hi=score;hiEl.textContent=hi;}msg.textContent=`Game Over! Score: ${score} — press button to restart`;return;}snake.unshift(h);if(h.x===food.x&&h.y===food.y){score++;scEl.textContent=score;food=mkFood();}else snake.pop();draw();}
    function draw(){ctx.fillStyle="#001100";ctx.fillRect(0,0,cv.width,cv.height);ctx.strokeStyle="#002200";ctx.lineWidth=0.5;for(let x=0;x<=C;x++){ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,cv.height);ctx.stroke();}for(let y=0;y<=R;y++){ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(cv.width,y*CELL);ctx.stroke();}snake.forEach((s,i)=>{ctx.fillStyle=i===0?"#00ff44":"#00cc22";ctx.fillRect(s.x*CELL+1,s.y*CELL+1,CELL-2,CELL-2);if(i===0){ctx.fillStyle="#fff";ctx.fillRect(s.x*CELL+3,s.y*CELL+3,3,3);}});ctx.fillStyle="#ff2020";ctx.fillRect(food.x*CELL+2,food.y*CELL+2,CELL-4,CELL-4);ctx.fillStyle="#ff8080";ctx.fillRect(food.x*CELL+3,food.y*CELL+3,3,3);}
    const dm={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
    const db={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
    function go(d){if(!on){start();return;}if(d.x!==0&&dir.x!==0)return;if(d.y!==0&&dir.y!==0)return;ndir=d;}
    document.addEventListener("keydown",function kh(e){if(!w.isConnected){document.removeEventListener("keydown",kh);return;}const d=dm[e.key];if(d){e.preventDefault();go(d);}});
    w.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",()=>{const d=db[b.dataset.dir];if(d)go(d);}));
    draw();windowCleanups.set("snake",()=>{if(loop)clearInterval(loop);});
  }

  /* ── SOLITAIRE ── */
  const SUITS=["♥","♦","♣","♠"],RANKS=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  function cCol(s){return s<=1?"red":"black";}
  function buildSol(){const d=document.createElement("div");d.className="solitaire-app";d.innerHTML=`<div class="solitaire-toolbar"><button type="button" data-sol-restart>Restart</button></div><div class="solitaire-board" data-sol-board></div>`;return d;}
  function initSol(winEl){
    const board=winEl.querySelector("[data-sol-board]");
    function mkDeck(){const d=[];for(let s=0;s<4;s++)for(let r=1;r<=13;r++)d.push({suit:s,rank:r,faceUp:false});return d;}
    function shuf(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
    let st=null,drag=null,ws=false;
    function ng(){ws=false;const d=shuf(mkDeck());const tab=[[],[],[],[],[],[],[]];let ix=0;for(let c=0;c<7;c++)for(let r=0;r<=c;r++){const card=d[ix++];card.faceUp=r===c;tab[c].push(card);}st={stock:d.slice(ix),waste:[],foundations:[[],[],[],[]],tableau:tab};drag=null;render();}
    function top(a){return a.length?a[a.length-1]:null;}
    function vs(c){for(let i=0;i<c.length-1;i++){if(cCol(c[i].suit)===cCol(c[i+1].suit))return false;if(c[i+1].rank!==c[i].rank+1)return false;}return true;}
    function cmt(c,dc){if(!c.length)return false;const a=c[c.length-1];if(dc.length===0)return a.rank===13;const d=top(dc);return cCol(a.suit)!==cCol(d.suit)&&a.rank===d.rank-1;}
    function cmf(card,fi){const p=st.foundations[fi];if(p.length===0)return card.rank===1&&fi===card.suit;const t=top(p);return card.suit===t.suit&&card.rank===t.rank+1;}
    function apm(fr,to,n){let mv;if(fr.type==="waste"){mv=st.waste.splice(-1,1);}else if(fr.type==="tableau"){mv=st.tableau[fr.ci].splice(-n,n);const col=st.tableau[fr.ci];const t=top(col);if(t&&!t.faceUp)t.faceUp=true;}if(to.type==="tableau")st.tableau[to.ci].push(...mv);else if(to.type==="foundation")st.foundations[to.fi].push(...mv);}
    function taf(card,fr){for(let fi=0;fi<4;fi++){if(cmf(card,fi)){apm(fr,{type:"foundation",fi},1);return true;}}return false;}
    function cel(card,sf,ia){const el=document.createElement("div");el.className="sol-card "+(sf?(cCol(card.suit)==="red"?"sol-card--red":"sol-card--black"):"sol-card--back");if(sf)el.innerHTML=`<span>${RANKS[card.rank-1]}${SUITS[card.suit]}</span>`;if(ia&&sf)el.style.cursor="grab";return el;}
    function onTPD(e,ci,idx){if(!st.tableau[ci][idx].faceUp)return;const col=st.tableau[ci];const sl=col.slice(idx);if(!vs(sl))return;e.preventDefault();playClick();drag={from:{type:"tableau",ci},count:sl.length,cards:sl.slice()};const g=document.createElement("div");g.className="sol-card sol-card--dragging";g.style.cssText=`position:fixed;left:${e.clientX-24}px;top:${e.clientY-33}px;z-index:30000;`;g.innerHTML=sl.map(c=>`${RANKS[c.rank-1]}${SUITS[c.suit]}`).join(" ");document.body.appendChild(g);function mv(ev){g.style.left=`${ev.clientX-24}px`;g.style.top=`${ev.clientY-33}px`;}function up(ev){document.removeEventListener("pointermove",mv);document.removeEventListener("pointerup",up);g.remove();const el=document.elementFromPoint(ev.clientX,ev.clientY);const pile=el&&el.closest(".solitaire-pile");if(pile&&pile.dataset.col!==undefined){const dc=+pile.dataset.col;if(cmt(drag.cards,st.tableau[dc])){apm(drag.from,{type:"tableau",ci:dc},drag.count);drag=null;render();return;}}const fnd=el&&el.closest("[data-foundation]");if(fnd){const fi=+fnd.dataset.foundation;const bt=drag.cards[drag.cards.length-1];if(drag.count===1&&cmf(bt,fi)){apm(drag.from,{type:"foundation",fi},1);drag=null;render();return;}}drag=null;render();}document.addEventListener("pointermove",mv);document.addEventListener("pointerup",up,{once:true});}
    function render(){board.replaceChildren();const rf=document.createElement("div");rf.className="solitaire-row solitaire-row--found";const se=document.createElement("div");se.className="solitaire-pile solitaire-pile--stock";if(st.stock.length)se.appendChild(cel(st.stock[st.stock.length-1],true,false));se.addEventListener("click",()=>{playClick();if(st.stock.length){const c=st.stock.pop();c.faceUp=true;st.waste.push(c);}else if(st.waste.length){while(st.waste.length){const c=st.waste.pop();c.faceUp=false;st.stock.push(c);}}render();});rf.appendChild(se);const we=document.createElement("div");we.className="solitaire-pile";if(st.waste.length){const w2=top(st.waste);const we2=cel(w2,true,true);we2.addEventListener("dblclick",e2=>{e2.preventDefault();if(taf(w2,{type:"waste"}))render();});we.appendChild(we2);}rf.appendChild(we);for(let fi=0;fi<4;fi++){const p=document.createElement("div");p.className="solitaire-pile";p.dataset.foundation=String(fi);if(st.foundations[fi].length)p.appendChild(cel(top(st.foundations[fi]),true,true));rf.appendChild(p);}board.appendChild(rf);const rt=document.createElement("div");rt.className="solitaire-row";for(let ci=0;ci<7;ci++){const col=document.createElement("div");col.className="solitaire-pile";col.dataset.col=String(ci);st.tableau[ci].forEach((card,idx)=>{const fc=card.faceUp;const ce=cel(card,fc,fc);ce.style.top=`${4+idx*16}px`;if(fc)ce.addEventListener("pointerdown",e=>onTPD(e,ci,idx));if(fc)ce.addEventListener("dblclick",e2=>{e2.preventDefault();if(idx!==st.tableau[ci].length-1)return;if(taf(card,{type:"tableau",ci}))render();});col.appendChild(ce);});rt.appendChild(col);}board.appendChild(rt);if(!ws&&st.foundations.every(f=>f.length===13)){ws=true;showMsgbox("Solitaire","You win! 🎉"," 🂡",[{label:"OK",value:true}]);}}
    winEl.querySelector("[data-sol-restart]").addEventListener("click",()=>{playClick();ng();});ng();windowCleanups.set("solitaire",()=>{});
  }

  /* ── OPEN/FOCUS ── */
  function buildContent(type){
    switch(type){
      case"music":return buildMusic();case"camera":return buildCamera();case"paint":return buildPaint();
      case"solitaire":return buildSol();case"about":return buildAbout();case"internet":return buildIE();
      case"notepad":return buildNotepad();case"calc":return buildCalc();case"msn":return buildMsn();case"snake":return buildSnake();
      case"computer":return buildExplorer(`<ul class="explorer-list"><li>Local Disk (C:)</li><li>CD Drive (D:)</li><li>Shared Documents</li><li>My Network Places</li></ul>`);
      case"documents":return buildExplorer(`<ul class="explorer-list"><li>Resume_1999.doc</li><li>vacation.bmp</li><li>readme.txt</li><li>mixtape.wma</li></ul>`);
      case"recycle":{const d=document.createElement("div");d.className="window__body--padded";d.innerHTML=`<p>The Recycle Bin is empty.</p><p style="font-size:11px;color:#555">Deleted items would appear here.</p>`;return d;}
      default:return document.createElement("div");
    }
  }

  function openOrFocusWindow(type){
    playClick();tryStartup();
    if(windowsByType.has(type)){const ex=windowsByType.get(type);if(ex.classList.contains("window--minimized")){ex.classList.remove("window--minimized");const t=els.taskbarTabs.querySelector(`[data-win-type="${type}"]`);if(t)t.classList.remove("taskbar__tab--min");}bringToFront(ex);return ex;}
    const we=document.createElement("div");we.className="window";we.dataset.winType=type;
    const[w,h]=defSize(type);const off=windowsByType.size*22;
    we.style.cssText=`width:${w}px;height:${h}px;left:${40+off}px;top:${28+off}px;`;
    const bc="window__body"+(["computer","documents","recycle","about","internet"].includes(type)?" window__body--padded":"")+(["computer","documents"].includes(type)?" window__body--tan":"");
    we.innerHTML=`<div class="window__titlebar" data-drag-handle><span class="window__title">${esc(titles[type]||"Window")}</span><div class="window__controls"><button type="button" class="window__btn" data-win-min title="Minimize">_</button><button type="button" class="window__btn" data-win-max title="Maximize">□</button><button type="button" class="window__btn window__btn--close close-btn" data-win-close title="Close">×</button></div></div><div class="${bc}"></div>`;
    const body=we.querySelector(".window__body");const content=buildContent(type);
    if(content.classList&&content.classList.contains("window__body--padded")){body.replaceWith(content);content.classList.add("window__body");if(["computer","documents"].includes(type))content.classList.add("window__body--tan");}
    else body.appendChild(content);
    els.windowsRoot.appendChild(we);windowsByType.set(type,we);
    if(type==="music")initMusic(we);if(type==="camera")initCamera(we);if(type==="paint")initPaint(we);
    if(type==="solitaire")initSol(we);if(type==="notepad")initNotepad(we);if(type==="calc")initCalc(we);
    if(type==="msn")initMsn(we);if(type==="snake")initSnake(we);
    bringToFront(we);attachDrag(we);attachWinCtrl(we);addTab(type,titles[type]||type);
    return we;
  }

  function addTab(type,title){const t=document.createElement("button");t.type="button";t.className="taskbar__tab";t.dataset.winType=type;t.textContent=title;t.addEventListener("click",()=>{playClick();const w=windowsByType.get(type);if(!w)return;if(w.classList.contains("window--minimized")){w.classList.remove("window--minimized");t.classList.remove("taskbar__tab--min");}bringToFront(w);});els.taskbarTabs.appendChild(t);syncTabActive(type);}
  function rmTab(type){const t=els.taskbarTabs.querySelector(`[data-win-type="${type}"]`);if(t)t.remove();}
  function closeWindow(type){playClick();const fn=windowCleanups.get(type);if(fn)fn();windowCleanups.delete(type);const w=windowsByType.get(type);if(!w)return;w.remove();windowsByType.delete(type);rmTab(type);const rem=Array.from(windowsByType.values());if(rem.length)bringToFront(rem[rem.length-1]);else els.taskbarTabs.querySelectorAll(".taskbar__tab").forEach(t=>t.classList.remove("taskbar__tab--active"));}
  function attachWinCtrl(we){const type=we.dataset.winType;we.querySelector("[data-win-min]").addEventListener("click",e=>{e.stopPropagation();playClick();we.classList.add("window--minimized");const t=els.taskbarTabs.querySelector(`[data-win-type="${type}"]`);if(t)t.classList.add("taskbar__tab--min");});let pm=null;we.querySelector("[data-win-max]").addEventListener("click",e=>{e.stopPropagation();playClick();if(we.classList.contains("window--maximized")){we.classList.remove("window--maximized");if(pm){we.style.left=pm.left;we.style.top=pm.top;we.style.width=pm.width;we.style.height=pm.height;}}else{pm={left:we.style.left,top:we.style.top,width:we.style.width,height:we.style.height};we.classList.add("window--maximized");}});}
  function attachDrag(we){const h=we.querySelector("[data-drag-handle]");h.addEventListener("pointerdown",e=>{if(e.target.closest(".window__btn,.close-btn"))return;if(we.classList.contains("window--maximized"))return;e.preventDefault();bringToFront(we);h.setPointerCapture(e.pointerId);const sx=e.clientX,sy=e.clientY,ol=parseFloat(we.style.left)||0,ot=parseFloat(we.style.top)||0;function mv(ev){we.style.left=`${ol+ev.clientX-sx}px`;we.style.top=`${ot+ev.clientY-sy}px`;clamp(we);}function up(ev){h.releasePointerCapture(ev.pointerId);h.removeEventListener("pointermove",mv);h.removeEventListener("pointerup",up);}h.addEventListener("pointermove",mv);h.addEventListener("pointerup",up);});}

  /* ── START MENU ── */
  function setStart(open){els.startMenu.hidden=!open;els.btnStart.setAttribute("aria-expanded",open?"true":"false");if(!open){els.submenuPrograms.hidden=true;const sw=document.getElementById("submenu-wallpapers");if(sw)sw.hidden=true;}}
  els.btnStart.addEventListener("click",e=>{e.stopPropagation();playClick();setStart(els.startMenu.hidden);});
  document.addEventListener("click",()=>setStart(false));
  els.startMenu.addEventListener("click",e=>e.stopPropagation());
  const pr=els.startMenu.querySelector("[data-submenu='programs']");
  pr.addEventListener("mouseenter",()=>{els.submenuPrograms.hidden=false;});
  pr.addEventListener("mouseleave",e=>{if(!pr.contains(e.relatedTarget))els.submenuPrograms.hidden=true;});
  if(window.matchMedia("(hover: none) and (pointer: coarse)").matches)pr.addEventListener("click",e=>{e.stopPropagation();els.submenuPrograms.hidden=!els.submenuPrograms.hidden;});
  const wr=els.startMenu.querySelector("[data-submenu='wallpapers']");
  if(wr){const sw=document.getElementById("submenu-wallpapers");wr.addEventListener("mouseenter",()=>{if(sw)sw.hidden=false;});wr.addEventListener("mouseleave",e=>{if(!wr.contains(e.relatedTarget)&&sw)sw.hidden=true;});}
  els.startMenu.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>{setStart(false);openOrFocusWindow(b.dataset.open);}));
  els.startMenu.querySelector("[data-action='shutdown']").addEventListener("click",async()=>{playClick();setStart(false);const ok=await showMsgbox("Shut Down AryaOS","Shut down the computer?","⚠",[{label:"Yes",value:true},{label:"No",value:false}]);if(ok)await showMsgbox("Shut Down","It is now safe to turn off your computer.","🖥",[{label:"OK",value:true}]);});

  /* ── DESKTOP ICONS ── */
  document.querySelectorAll(".desk-icon").forEach(b=>{b.addEventListener("click",()=>{const map={computer:"computer",documents:"documents",music:"music",paint:"paint",camera:"camera",recycle:"recycle",solitaire:"solitaire",notepad:"notepad",calc:"calc",msn:"msn",snake:"snake"};const t=map[b.dataset.action];if(t)openOrFocusWindow(t);});});
  window.addEventListener("resize",()=>windowsByType.forEach(w=>{if(!w.classList.contains("window--maximized"))clamp(w);}));
  setTimeout(()=>showMsgbox("Welcome to AryaOS v2","✨ New in v2: Notepad · Calculator · MSN Messenger · Snake\nRight-click desktop for context menu · Sticky Notes · CRT filter · Wallpaper changer · Clock tooltip · Paint upgrades!","💬",[{label:"Let's go! 🚀",value:true}]),500);
})();
