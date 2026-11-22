(() => {
"use strict";
const $ = (id) => document.getElementById(id);

window.addEventListener("DOMContentLoaded", () => {
  const e = {
    splash:$("splash"),start:$("startBtn"),reset:$("resetBtn"),slow:$("slowBtn"),speed:$("speedSelect"),
    tension:$("tensionSlider"),mass:$("massSlider"),length:$("lengthSlider"),
    tensionOut:$("tensionOut"),massOut:$("massOut"),lengthOut:$("lengthOut"),
    muOut:$("muOut"),velocityOut:$("velocityOut"),modeCalcOut:$("modeCalcOut"),
    harmonicOut:$("harmonicOut"),nodesOut:$("nodesOut"),antinodesOut:$("antinodesOut"),
    wavelengthOut:$("wavelengthOut"),naturalFrequencyOut:$("naturalFrequencyOut"),
    errorOut:$("errorOut"),resonanceFill:$("resonanceFill"),
    questionText:$("questionText"),questionAnswers:$("questionAnswers"),
    questionFeedback:$("questionFeedback"),modeBadge:$("modeBadge"),
    wave:$("waveCanvas"),summaryMode:$("summaryMode"),summaryNodes:$("summaryNodes"),
    summaryAntinodes:$("summaryAntinodes"),summaryResonance:$("summaryResonance"),
    calculationText:$("calculationText"),practiceBody:$("practiceBody"),
    record:$("recordBtn"),clearPractice:$("clearPracticeBtn"),csv:$("csvBtn"),capture:$("captureBtn")
  };

  const required = Object.entries(e).filter(([,value]) => !value);
  if (required.length) {
    document.body.innerHTML = "<p style='padding:20px;color:white'>Error de carga: faltan elementos de la interfaz.</p>";
    console.error("Elementos faltantes:", required.map(([key]) => key));
    return;
  }

  const ctx = e.wave.getContext("2d");
  const generatorFrequency = 50;
  const maxMode = 8;
  const baseAmplitude = 0.115;

  const state = {
    run:false, phase:0, last:performance.now(), speed:1,
    shownN:2, targetN:2, fade:1, fadeDirection:0,
    displayed:{T:+e.tension.value,m:+e.mass.value,L:+e.length.value},
    targets:{T:+e.tension.value,m:+e.mass.value,L:+e.length.value},
    lastValues:{T:+e.tension.value,m:+e.mass.value,L:+e.length.value},
    trials:[]
  };

  function physical(values=state.displayed) {
    const T=values.T, m=values.m, L=values.L;
    const mu=m/L;
    const v=Math.sqrt(T/mu);
    const nCalc=2*L*generatorFrequency/v;
    const nearest=Math.max(1,Math.min(maxMode,Math.round(nCalc)));
    const wavelength=2*L/nearest;
    const fn=nearest*v/(2*L);
    const error=Math.abs(generatorFrequency-fn)/generatorFrequency*100;
    const resonance=Math.max(0,1-error/35);
    return {T,m,L,mu,v,nCalc,nearest,wavelength,fn,error,resonance};
  }

  function smooth(a,b,rate,dt){return a+(b-a)*(1-Math.exp(-rate*dt));}
  function updateDisplayed(dt){
    state.displayed.T=smooth(state.displayed.T,state.targets.T,6,dt);
    state.displayed.m=smooth(state.displayed.m,state.targets.m,6,dt);
    state.displayed.L=smooth(state.displayed.L,state.targets.L,6,dt);
  }
  function requestModeChange(n){
    if(n===state.targetN) return;
    state.targetN=n;
    state.fadeDirection=-1;
  }
  function updateModeTransition(dt){
    if(state.fadeDirection===-1){
      state.fade-=dt*4.5;
      if(state.fade<=0){state.fade=0;state.shownN=state.targetN;state.phase=0;state.fadeDirection=1;}
    } else if(state.fadeDirection===1){
      state.fade+=dt*4.5;
      if(state.fade>=1){state.fade=1;state.fadeDirection=0;}
    }
  }
  function displacement(x){
    const q=physical();
    const amp=baseAmplitude*(0.35+0.65*q.resonance)*state.fade;
    return amp*Math.sin(state.shownN*Math.PI*x/q.L)*Math.cos(state.phase);
  }
 
function fit() {
  const r = e.wave.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // Usar las dimensiones visibles o las definidas para captura.
  const w = r.width || parseFloat(e.wave.style.width) || 2;
  const h = r.height || parseFloat(e.wave.style.height) || 2;

  e.wave.width = Math.max(2, Math.floor(w * dpr));
  e.wave.height = Math.max(2, Math.floor(h * dpr));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return {w, h};
}

  function ordinal(n){return n===1?"1.er":n===2?"2.º":n===3?"3.er":`${n}.º`;}

  function updateText(){
    const q=physical();
    requestModeChange(q.nearest);

    e.tensionOut.textContent=(+e.tension.value).toFixed(0)+" N";
    e.massOut.textContent=(+e.mass.value).toFixed(3)+" kg";
    e.lengthOut.textContent=(+e.length.value).toFixed(2)+" m";
    e.muOut.textContent=q.mu.toFixed(3)+" kg/m";
    e.velocityOut.textContent=q.v.toFixed(2)+" m/s";
    e.modeCalcOut.textContent=q.nCalc.toFixed(2);
    e.harmonicOut.textContent=String(state.targetN);
    e.nodesOut.textContent=String(state.targetN+1);
    e.antinodesOut.textContent=String(state.targetN);

    const lambda=2*q.L/state.targetN;
    const fn=state.targetN*q.v/(2*q.L);
    const err=Math.abs(generatorFrequency-fn)/generatorFrequency*100;
    const quality=Math.max(0,100-err*2.8);

    e.wavelengthOut.textContent=lambda.toFixed(2)+" m";
    e.naturalFrequencyOut.textContent=fn.toFixed(2)+" Hz";
    e.errorOut.textContent=err.toFixed(1)+" %";
    e.resonanceFill.style.width=quality.toFixed(0)+"%";
    e.resonanceFill.style.background=quality>70?"#27d48a":quality>35?"#ffda57":"#ff8a5b";

    e.modeBadge.textContent=`${ordinal(state.targetN)} armónico`;
    e.summaryMode.textContent=`n=${state.targetN}`;
    e.summaryNodes.textContent=String(state.targetN+1);
    e.summaryAntinodes.textContent=String(state.targetN);
    e.summaryResonance.textContent=quality>70?"Alta":quality>35?"Media":"Baja";

    e.calculationText.innerHTML=
      `μ = ${q.m.toFixed(3)} / ${q.L.toFixed(2)} = <b>${q.mu.toFixed(3)} kg/m</b><br>`+
      `v = √(${q.T.toFixed(0)} / ${q.mu.toFixed(3)}) = <b>${q.v.toFixed(2)} m/s</b><br>`+
      `n* = 2(${q.L.toFixed(2)})(${generatorFrequency}) / ${q.v.toFixed(2)} = <b>${q.nCalc.toFixed(2)}</b><br>`+
      `Armónico cercano: <b>n=${state.targetN}</b> → nodos=<b>${state.targetN+1}</b>, vientres=<b>${state.targetN}</b>`;
  }

  function arrow(x1,y1,x2,y2,color){
    const a=Math.atan2(y2-y1,x2-x1),h=8;
    ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2,y2);
    ctx.lineTo(x2-h*Math.cos(a-Math.PI/6),y2-h*Math.sin(a-Math.PI/6));
    ctx.lineTo(x2-h*Math.cos(a+Math.PI/6),y2-h*Math.sin(a+Math.PI/6));
    ctx.closePath(); ctx.fill();
  }

  function draw(){
    const {w,h}=fit();
    const q=physical();
    ctx.clearRect(0,0,w,h);

    const mid=h*0.41;
    const left=Math.max(44,w*0.06);
    const pulleyX=w-Math.max(116,w*0.13);
    const radius=22;
    const right=pulleyX-radius;
    const plot=right-left;
    const scale=(h*0.28)/baseAmplitude;

    ctx.strokeStyle="rgba(255,255,255,.18)";
    ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(left,mid); ctx.lineTo(right,mid); ctx.stroke();

    ctx.strokeStyle="#ff4fd8";
    ctx.shadowColor="rgba(255,79,216,.55)";
    ctx.shadowBlur=7;
    ctx.lineWidth=4;
    ctx.beginPath();
    for(let i=0;i<=500;i++){
      const x=q.L*i/500;
      const px=left+plot*i/500;
      const py=mid-displacement(x)*scale;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();
    ctx.shadowBlur=0;

    ctx.fillStyle="#27d48a";
    ctx.fillRect(left-4,mid-44,7,88);

    ctx.fillStyle="#26384c";
    ctx.strokeStyle="#dff4ff";
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(pulleyX,mid,radius,0,Math.PI*2); ctx.fill(); ctx.stroke();

    ctx.strokeStyle="#ffda57";
    ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(right,mid); ctx.lineTo(pulleyX,mid); ctx.stroke();

    const verticalX=pulleyX;
    const massY=Math.min(mid+150,h-72);
    ctx.beginPath(); ctx.moveTo(verticalX,mid+radius); ctx.lineTo(verticalX,massY-22); ctx.stroke();

    const massEq=q.T/9.81;
    const massW=Math.min(64,36+massEq*0.38);
    const massH=42;
    ctx.fillStyle="#ff8a5b";
    ctx.fillRect(verticalX-massW/2,massY-massH/2,massW,massH);

    ctx.fillStyle="#fff";
    ctx.font="11px system-ui";
    ctx.textAlign="center";
    ctx.fillText("masa tensora",verticalX,massY+4);
    ctx.fillText("m≈"+massEq.toFixed(1)+" kg",verticalX,massY+massH/2+18);

    ctx.textAlign="left";
    ctx.fillStyle="#ffda57";
    ctx.font="12px system-ui";
    ctx.fillText("T="+q.T.toFixed(0)+" N",pulleyX-34,mid-34);
    arrow(pulleyX-74,mid-20,pulleyX-29,mid-20,"#ffda57");

    ctx.font="11px system-ui";
    for(let j=0;j<=state.shownN;j++){
      const x=left+plot*j/state.shownN;
      ctx.fillStyle="#ffda57";
      ctx.beginPath(); ctx.arc(x,mid,5,0,Math.PI*2); ctx.fill();
      ctx.textAlign="center";
      ctx.fillText("Nodo",x,mid+22);
    }

    for(let j=0;j<state.shownN;j++){
      const xx=q.L*(j+0.5)/state.shownN;
      const x=left+plot*(j+0.5)/state.shownN;
      const yy=mid-displacement(xx)*scale;
      ctx.fillStyle="#00f5ff";
      ctx.beginPath(); ctx.arc(x,yy,5,0,Math.PI*2); ctx.fill();
      ctx.fillText("Vientre",x,yy-12);
    }

    ctx.textAlign="left";
    ctx.fillStyle="#dff4ff";
    ctx.fillText("Generador 50 Hz",left-8,24);
    ctx.fillText(`Modo mostrado: n=${state.shownN}`,left,h-22);
  }

  function ask(key,oldV,newV){
    const temp={T:state.targets.T,m:state.targets.m,L:state.targets.L};
    temp[key]=newV;
    const after=physical(temp);

    const qs={
      T:{
        text:`La tensión cambió de ${oldV.toFixed(0)} N a ${newV.toFixed(0)} N. El nuevo n* es ${after.nCalc.toFixed(2)}. ¿Qué tendencia tendrá el número de vientres?`,
        answers:[["Puede disminuir","down"],["Puede aumentar","up"],["Nunca cambia","same"]],
        correct:newV>oldV?"down":"up",
        explanation:"Al aumentar T aumenta v; como n*=2Lf/v, el modo compatible tiende a disminuir."
      },
      m:{
        text:`La masa cambió de ${oldV.toFixed(3)} kg a ${newV.toFixed(3)} kg. ¿Qué tendencia tendrá el número de vientres?`,
        answers:[["Puede aumentar","up"],["Puede disminuir","down"]],
        correct:newV>oldV?"up":"down",
        explanation:"Al aumentar m aumenta μ, disminuye v y n* tiende a aumentar."
      },
      L:{
        text:`La longitud cambió de ${oldV.toFixed(1)} m a ${newV.toFixed(1)} m. ¿Puede cambiar el número de nodos y vientres?`,
        answers:[["Sí","yes"],["No","no"]],
        correct:"yes",
        explanation:"Sí. El modo depende de n*=2Lf/v y μ=m/L también cambia."
      }
    };

    const q=qs[key];
    e.questionText.textContent=q.text;
    e.questionAnswers.innerHTML=q.answers.map(([label,value])=>`<button type="button" data-value="${value}">${label}</button>`).join("");
    e.questionFeedback.className="feedback hidden";
    e.questionFeedback.textContent="";

    e.questionAnswers.querySelectorAll("button").forEach((button)=>{
      button.addEventListener("click",()=>{
        const good=button.dataset.value===q.correct;
        e.questionFeedback.className="feedback "+(good?"ok":"bad");
        e.questionFeedback.textContent=(good?"Correcto. ":"Revisa los cálculos. ")+q.explanation;
      });
    });
  }

  function renderTrials(){
    e.practiceBody.innerHTML=state.trials.map((r,i)=>`<tr><td>${i+1}</td><td>${r.T.toFixed(0)}</td><td>${r.m.toFixed(3)}</td><td>${r.L.toFixed(2)}</td><td>${r.v.toFixed(2)}</td><td>${r.n}</td><td>${r.n+1}</td><td>${r.n}</td></tr>`).join("");
  }

  function download(name,blob){
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }

  function exportCsv(){
    if(!state.trials.length){alert("Registra al menos un ensayo.");return;}
    const rows=[
      ["ensayo","T_N","masa_kg","L_m","velocidad_m_s","armonico","nodos","vientres"],
      ...state.trials.map((r,i)=>[i+1,r.T,r.m,r.L,r.v,r.n,r.n+1,r.n])
    ];
    download("ondas_cuerda_ensayos.csv",new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv;charset=utf-8"}));
  }

 

function capture() {
  const canvas = e.wave;
  const width = 1200;
  const height = 700;
  const oldStyle = canvas.getAttribute("style");

  try {
    // Mostrar temporalmente el lienzo fuera de pantalla.
    canvas.style.setProperty("display", "block", "important");
    canvas.style.setProperty("position", "fixed", "important");
    canvas.style.setProperty("left", "-10000px", "important");
    canvas.style.setProperty("top", "0", "important");
    canvas.style.setProperty("width", width + "px", "important");
    canvas.style.setProperty("height", height + "px", "important");

    // Dibujar la simulacion con dimensiones reales.
    draw();

    if (canvas.width < 100 || canvas.height < 100) {
      throw new Error("El lienzo no tiene dimensiones validas.");
    }

    // Capturar antes de restaurar el lienzo.
    const png = canvas.toDataURL("image/png");

    // Descargar la imagen.
    const enlace = document.createElement("a");
    enlace.href = png;
    enlace.download = "ondas_cuerda_simulacion.png";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

  } catch (error) {
    console.error("Error al capturar PNG:", error);
    alert("No se pudo generar la imagen PNG.");
  } finally {
    // Restaurar la apariencia original.
    if (oldStyle === null) {
      canvas.removeAttribute("style");
    } else {
      canvas.setAttribute("style", oldStyle);
    }
    draw();
  }
}


  document.querySelectorAll(".tab").forEach((tab)=>{
    tab.addEventListener("click",()=>{
      document.querySelectorAll(".tab").forEach((t)=>t.classList.remove("active"));
      document.querySelectorAll(".view").forEach((v)=>v.classList.remove("active"));
      tab.classList.add("active");
      $(tab.dataset.view).classList.add("active");
      setTimeout(draw,50);
    });
  });

  e.start.addEventListener("click",()=>{state.run=!state.run;e.start.textContent=state.run?"Pausar":"Iniciar";});
  e.reset.addEventListener("click",()=>{
    state.run=false;state.phase=0;
    state.displayed={T:+e.tension.value,m:+e.mass.value,L:+e.length.value};
    state.targets={...state.displayed};
    const q=physical(state.displayed);
    state.shownN=q.nearest;state.targetN=q.nearest;state.fade=1;state.fadeDirection=0;
    e.start.textContent="Iniciar";
    updateText();draw();
  });
  e.speed.addEventListener("change",()=>{state.speed=+e.speed.value;});
  e.slow.addEventListener("click",()=>{
    state.speed=state.speed===0.20?1:0.20;
    e.speed.value=String(state.speed);
    e.slow.textContent=state.speed===0.20?"Velocidad normal":"Cámara lenta";
  });

  [
    [e.tension,"T"],
    [e.mass,"m"],
    [e.length,"L"]
  ].forEach(([control,key])=>{
    control.addEventListener("input",()=>{
      const old=state.lastValues[key];
      const value=+control.value;
      if(value!==old){ask(key,old,value);state.lastValues[key]=value;}
      state.targets[key]=value;
      updateText();
    });
  });

  e.record.addEventListener("click",()=>{
    const q=physical();
    state.trials.push({T:+e.tension.value,m:+e.mass.value,L:+e.length.value,v:q.v,n:q.nearest});
    renderTrials();
  });
  e.clearPractice.addEventListener("click",()=>{state.trials=[];renderTrials();});
  e.csv.addEventListener("click",exportCsv);
  e.capture.addEventListener("click",capture);
  window.addEventListener("resize",draw);

  const initial=physical(state.displayed);
  state.shownN=initial.nearest;
  state.targetN=initial.nearest;
  updateText();
  draw();

  requestAnimationFrame(function loop(now){
    const dt=Math.min((now-state.last)/1000,0.05);
    state.last=now;
    updateDisplayed(dt);
    updateModeTransition(dt);

    if(state.run){
      const q=physical();
      const visualFrequency=Math.min(1.25,Math.max(0.22,q.fn/70));
      state.phase=(state.phase+2*Math.PI*visualFrequency*dt*state.speed)%(2*Math.PI);
    }

    updateText();
    draw();
    requestAnimationFrame(loop);
  });

  setTimeout(()=>e.splash.classList.add("hide"),600);
});
})();
