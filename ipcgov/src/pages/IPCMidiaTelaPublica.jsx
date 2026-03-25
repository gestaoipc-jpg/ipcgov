import { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

function normYoutubeUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=0&showinfo=0`;
  return null;
}

function normDriveUrl(url) {
  if (!url) return null;
  // lh3.googleusercontent.com — link direto de Shared Drive, usa direto
  if (url.includes("lh3.googleusercontent.com")) return url;
  // drive.google.com/file/d/ID/view ou /preview
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}`;
  // drive.google.com/uc?export=view&id=ID — converte para lh3
  const driveUc = url.match(/[?&]id=([^&]+)/);
  if (url.includes("drive.google.com") && driveUc) return `https://lh3.googleusercontent.com/d/${driveUc[1]}`;
  return null;
}

function SlideImagem({ url }) {
  const ytUrl = normYoutubeUrl(url);
  const driveUrl = normDriveUrl(url);
  const finalUrl = ytUrl || driveUrl || url;
  const isEmbed = ytUrl || driveUrl;

  if (isEmbed) {
    return (
      <iframe src={finalUrl} style={{ width:"100%", height:"100%", border:"none" }}
        allow="autoplay; fullscreen" allowFullScreen title="media"/>
    );
  }
  return (
    <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
  );
}

function corAvatar(nome) {
  const cores = ["#1B3F7A","#7c3aed","#059669","#E8730A","#0891b2","#dc2626"];
  let h = 0;
  for (let ch of (nome||"")) h += ch.charCodeAt(0);
  return cores[h % cores.length];
}
function initials(nome) {
  if (!nome) return "?";
  return nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase();
}
function nomeExibir(s) {
  return s.nomePreferido || s.nome.split(" ")[0];
}

function FotoCircular({ servidor, tamanho }) {
  const sz = tamanho || 120;
  const url = servidor.foto && servidor.foto.startsWith("http") ? servidor.foto : null;
  return (
    <div style={{ width:sz, height:sz, borderRadius:"50%", overflow:"hidden", border:"4px solid rgba(255,255,255,0.3)", flexShrink:0,
      background:url?"transparent":corAvatar(servidor.nome), display:"flex", alignItems:"center", justifyContent:"center" }}>
      {url
        ? <img src={url} alt={servidor.nome} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        : <span style={{ color:"#fff", fontWeight:900, fontSize:sz*0.35 }}>{initials(servidor.nome)}</span>}
    </div>
  );
}

// Slide 1: Aniversariantes do Mês
function SlideAniversarioMes({ servidores }) {
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const doMes = servidores.filter(s => {
    if (!s.dataAniversario) return false;
    const [,m] = s.dataAniversario.split("-");
    return parseInt(m)-1 === mesAtual;
  }).sort((a,b) => {
    const [,,da] = a.dataAniversario.split("-");
    const [,,db] = b.dataAniversario.split("-");
    return parseInt(da) - parseInt(db);
  });

  if (doMes.length === 0) return null;

  return (
    <div style={{ width:"100%", height:"100%", background:"#1B3F7A", display:"grid", gridTemplateColumns:"1fr 1.5fr",
      fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>
      {/* Arte esquerda */}
      <div style={{ background:"#042C53", display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", padding:"32px 28px", gap:16, position:"relative", overflow:"hidden" }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.07 }} viewBox="0 0 300 450">
          <circle cx="150" cy="225" r="200" fill="none" stroke="#E8730A" strokeWidth="1"/>
          <circle cx="150" cy="225" r="140" fill="none" stroke="#E8730A" strokeWidth="0.5"/>
          <circle cx="150" cy="225" r="80" fill="none" stroke="#E8730A" strokeWidth="0.5"/>
        </svg>
        <div style={{ fontSize:72, position:"relative", zIndex:1 }}>🎂</div>
        <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:12, letterSpacing:3, textTransform:"uppercase", marginBottom:6 }}>IPC · TCE-CE</div>
          <div style={{ color:"#fff", fontWeight:900, fontSize:30, lineHeight:1.1 }}>Aniversariantes</div>
          <div style={{ color:"#E8730A", fontWeight:900, fontSize:30, lineHeight:1.1 }}>de {MESES[mesAtual]}</div>
        </div>
        <div style={{ position:"relative", zIndex:1, background:"rgba(232,115,10,0.2)", border:"1px solid rgba(232,115,10,0.4)",
          borderRadius:20, padding:"4px 18px" }}>
          <span style={{ color:"#E8730A", fontSize:13, fontWeight:700, letterSpacing:1 }}>{doMes.length} aniversariante{doMes.length>1?"s":""}</span>
        </div>
      </div>
      {/* Lista direita */}
      <div style={{ padding:"24px 28px", display:"flex", flexDirection:"column", gap:8, overflowY:"hidden" }}>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Este mês celebramos</div>
        {doMes.slice(0,7).map(s => {
          const [,,dia] = s.dataAniversario.split("-");
          const isHoje = parseInt(dia) === hoje.getDate();
          return (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, background:isHoje?"rgba(232,115,10,0.2)":"rgba(255,255,255,0.06)",
              borderRadius:12, padding:"10px 14px", border:isHoje?"1px solid rgba(232,115,10,0.4)":"none" }}>
              <FotoCircular servidor={s} tamanho={40}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:"#fff", fontWeight:700, fontSize:15, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {nomeExibir(s)}
                </div>
                <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>{s.cargo||s.setor||""}</div>
              </div>
              <div style={{ background:isHoje?"rgba(232,115,10,0.3)":"rgba(255,255,255,0.1)", borderRadius:10, padding:"4px 12px", flexShrink:0 }}>
                <span style={{ color:isHoje?"#E8730A":"rgba(255,255,255,0.6)", fontWeight:700, fontSize:13 }}>dia {parseInt(dia)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Slide 2: Aniversariante do Dia / Fim de Semana
function SlideAniversario({ servidores }) {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=dom, 6=sab

  // Verifica aniversariantes hoje
  const anivHoje = servidores.filter(s => {
    if (!s.dataAniversario) return false;
    const [,m,d] = s.dataAniversario.split("-");
    return parseInt(m)-1 === hoje.getMonth() && parseInt(d) === hoje.getDate();
  });

  // Verifica próximo dia útil se hoje é sexta (5)
  const anivFimDeSemana = diaSemana === 5 ? servidores.filter(s => {
    if (!s.dataAniversario) return false;
    const [,m,d] = s.dataAniversario.split("-");
    const sabado = new Date(hoje); sabado.setDate(hoje.getDate()+1);
    const domingo = new Date(hoje); domingo.setDate(hoje.getDate()+2);
    const isSab = parseInt(m)-1===sabado.getMonth() && parseInt(d)===sabado.getDate();
    const isDom = parseInt(m)-1===domingo.getMonth() && parseInt(d)===domingo.getDate();
    return isSab || isDom;
  }) : [];

  const lista = anivHoje.length > 0 ? anivHoje : anivFimDeSemana;
  if (lista.length === 0) return null;

  const isFimDeSemana = anivHoje.length === 0 && anivFimDeSemana.length > 0;
  const isSabado = isFimDeSemana && (() => {
    const sabado = new Date(hoje); sabado.setDate(hoje.getDate()+1);
    const [,m,d] = lista[0].dataAniversario.split("-");
    return parseInt(m)-1===sabado.getMonth() && parseInt(d)===sabado.getDate();
  })();

  const bgGrad = isFimDeSemana
    ? "linear-gradient(135deg,#1B3F7A 0%,#7c3aed 100%)"
    : "linear-gradient(135deg,#042C53 0%,#1B3F7A 60%,#0891b2 100%)";

  const tagTexto = isFimDeSemana
    ? `🗓️ ${isSabado?"Sábado":"Domingo"} é o aniversário de`
    : "🎉 Hoje é o aniversário de";

  const msgTexto = isFimDeSemana
    ? "Antecipamos os parabéns! 🎂"
    : `Parabéns${lista.length===1?" "+nomeExibir(lista[0]):""}! Que seu dia seja incrível ✨`;

  return (
    <div style={{ width:"100%", height:"100%", background:bgGrad, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:20, fontFamily:"'Montserrat',sans-serif",
      position:"relative", overflow:"hidden" }}>
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} viewBox="0 0 800 450">
        <circle cx="80" cy="60" r="8" fill="#E8730A" opacity="0.5"/>
        <circle cx="720" cy="80" r="6" fill="#fbbf24" opacity="0.4"/>
        <circle cx="150" cy="380" r="5" fill="#E8730A" opacity="0.3"/>
        <circle cx="650" cy="360" r="7" fill="#fbbf24" opacity="0.4"/>
        <circle cx="400" cy="30" r="4" fill="#E8730A" opacity="0.5"/>
        <rect x="700" y="200" width="8" height="8" rx="2" fill="#E8730A" opacity="0.3" transform="rotate(20 700 200)"/>
        <rect x="100" y="200" width="6" height="6" rx="1" fill="#fbbf24" opacity="0.3" transform="rotate(-15 100 200)"/>
      </svg>
      <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:24, padding:"6px 24px", zIndex:1 }}>
        <span style={{ color:"#fff", fontSize:16, fontWeight:700, letterSpacing:1 }}>{tagTexto}</span>
      </div>
      <div style={{ display:"flex", gap:32, justifyContent:"center", flexWrap:"wrap", zIndex:1 }}>
        {lista.map(s => (
          <div key={s.id} style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
            <FotoCircular servidor={s} tamanho={lista.length===1?140:100}/>
            <div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:lista.length===1?52:36, lineHeight:1, letterSpacing:-1 }}>
                {nomeExibir(s)}
              </div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:16, marginTop:4 }}>{s.cargo||s.setor||""}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ color:"#E8730A", fontSize:22, fontWeight:700, zIndex:1 }}>{msgTexto}</div>
    </div>
  );
}

function SlideEventos({ eventosTC }) {
  const hoje = new Date();
  const MESES_NOME = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const MESES_CURTO2 = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

  // Pega eventos dos próximos 45 dias + passados do mês atual
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const eventos = eventosTC.filter(e => {
    if (!e.data) return false;
    const d = new Date(e.data+"T00:00:00");
    return d >= inicioMes;
  }).sort((a,b) => a.data.localeCompare(b.data)).slice(0, 24);

  // Agrupa por semana (seg-sex)
  const getInicioSemana = (data) => {
    const d = new Date(data+"T00:00:00");
    const dia = d.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    const seg = new Date(d);
    seg.setDate(d.getDate() + diff);
    return seg;
  };

  const getFimSemana = (seg) => {
    const sex = new Date(seg);
    sex.setDate(seg.getDate() + 4);
    return sex;
  };

  const semanas = [];
  const vistas = new Set();
  eventos.forEach(e => {
    const seg = getInicioSemana(e.data);
    const chave = seg.toISOString().split("T")[0];
    if (!vistas.has(chave)) {
      vistas.add(chave);
      semanas.push({ seg, sex: getFimSemana(seg), eventos: [] });
    }
    semanas.find(s => s.seg.toISOString().split("T")[0] === chave).eventos.push(e);
  });

  const isEstaSemana = (seg) => {
    const hojeInicio = getInicioSemana(hoje.toISOString().split("T")[0]);
    return seg.toISOString().split("T")[0] === hojeInicio.toISOString().split("T")[0];
  };

  const isPassada = (sex) => sex < hoje;

  const fmtDia = (d) => d.getDate().toString().padStart(2,"0");
  const fmtMes = (d) => MESES_CURTO2[d.getMonth()];

  // Divide semanas em 2 colunas
  const metade = Math.ceil(semanas.length / 2);
  const col1 = semanas.slice(0, metade);
  const col2 = semanas.slice(metade);

  const mesAtual = MESES_NOME[hoje.getMonth()];
  const anoAtual = hoje.getFullYear();

  const renderSemana = (s) => {
    const passada = isPassada(s.sex);
    const atual = isEstaSemana(s.seg);
    const cor = passada ? "#0F6E56" : atual ? "#854F0B" : "#185FA5";
    const corBarra = passada ? "#1D9E75" : atual ? "#EF9F27" : "#378ADD";
    const corLabel = passada ? "#5DCAA5" : atual ? "#FAC775" : "#85B7EB";
    const corItem = passada ? "#9FE1CB" : atual ? "#FAC775" : "#B5D4F4";
    const corTipo = passada ? "#5DCAA5" : atual ? "#EF9F27" : "#85B7EB";
    const bgItem = passada ? "rgba(15,110,86,0.25)" : atual ? "rgba(133,79,11,0.3)" : "rgba(24,95,165,0.25)";
    const borderItem = atual ? "1px solid rgba(239,159,39,0.3)" : "none";

    return (
      <div key={s.seg.toISOString()} style={{ marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
          <div style={{ width:3, height:14, background:corBarra, borderRadius:2, flexShrink:0 }}/>
          <span style={{ color:corLabel, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>
            {fmtDia(s.seg)} – {fmtDia(s.sex)} {fmtMes(s.sex)}
          </span>
          {atual && (
            <span style={{ background:"#854F0B", color:"#FAC775", fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:10 }}>esta semana</span>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {s.eventos.map(e => (
            <div key={e.id} style={{ display:"flex", alignItems:"center", gap:8, background:bgItem, borderRadius:8, padding:"6px 10px", border:borderItem }}>
              <div style={{ width:16, height:16, borderRadius:4, background:cor, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {passada && (
                  <svg width="9" height="9" viewBox="0 0 10 10">
                    <polyline points="1,5 4,8 9,2" stroke="#9FE1CB" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <span style={{ color:corItem, fontSize:13, fontWeight:600, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {e.municipio||e.regiao||"Evento"}
              </span>
              {e.tipo && (
                <span style={{ color:corTipo, fontSize:10, flexShrink:0 }}>{e.tipo}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width:"100%", height:"100%", background:"#0f172a", display:"grid", gridTemplateColumns:"190px 1fr 1fr", fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>

      {/* Coluna esquerda */}
      <div style={{ background:"#042C53", display:"flex", flexDirection:"column", padding:"28px 20px", gap:16, borderRight:"1px solid rgba(255,255,255,0.08)" }}>
        <div>
          <div style={{ color:"#85B7EB", fontSize:10, letterSpacing:3, textTransform:"uppercase", marginBottom:6 }}>TCEduc</div>
          <div style={{ color:"#fff", fontWeight:700, fontSize:18, lineHeight:1.25 }}>Agenda TCEduc</div>
        </div>
        <div style={{ width:32, height:2, background:"#378ADD", borderRadius:1 }}/>
        <div style={{ background:"#185FA5", borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
          <div style={{ color:"#E6F1FB", fontSize:22, fontWeight:700, lineHeight:1 }}>{mesAtual.toUpperCase().slice(0,3)}</div>
          <div style={{ color:"#85B7EB", fontSize:11, letterSpacing:1, marginTop:3 }}>{anoAtual}</div>
        </div>
        <div style={{ marginTop:"auto", display:"flex", flexDirection:"column", gap:8 }}>
          {[
            { cor:"#0F6E56", label:"Realizado", check:true },
            { cor:"#854F0B", label:"Esta semana", check:false },
            { cor:"#185FA5", label:"Agendado", check:false },
          ].map(item => (
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:14, height:14, borderRadius:4, background:item.cor, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {item.check && (
                  <svg width="8" height="8" viewBox="0 0 10 10">
                    <polyline points="1,5 4,8 9,2" stroke="#9FE1CB" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <span style={{ color:"#85B7EB", fontSize:11 }}>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={{ color:"rgba(255,255,255,0.2)", fontSize:10, letterSpacing:1 }}>TCE-CE · IPC</div>
      </div>

      {/* Coluna central */}
      <div style={{ padding:"24px 18px", overflowY:"hidden", borderRight:"1px solid rgba(255,255,255,0.06)" }}>
        {col1.length === 0 ? (
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:14, marginTop:40, textAlign:"center" }}>Sem eventos</div>
        ) : col1.map(s => renderSemana(s))}
      </div>

      {/* Coluna direita */}
      <div style={{ padding:"24px 18px", overflowY:"hidden" }}>
        {col2.map(s => renderSemana(s))}
      </div>
    </div>
  );
}

// Artes fallback quando não há foto
const FALLBACK_ARTS = [
  {
    bg: "linear-gradient(135deg,#042C53 0%,#0C447C 50%,#185FA5 100%)",
    svgContent: (
      <svg viewBox="0 0 400 300" style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.12 }}>
        <circle cx="60" cy="60" r="120" fill="#E6F1FB"/>
        <circle cx="340" cy="240" r="100" fill="#378ADD"/>
        <circle cx="350" cy="50" r="60" fill="#B5D4F4"/>
        <rect x="100" y="120" width="200" height="3" rx="1.5" fill="#E6F1FB"/>
        <rect x="140" y="140" width="120" height="3" rx="1.5" fill="#E6F1FB"/>
        <rect x="120" y="160" width="160" height="3" rx="1.5" fill="#E6F1FB"/>
      </svg>
    ),
    accent: "#378ADD", textColor: "#E6F1FB", subColor: "#B5D4F4", tag: "#185FA5"
  },
  {
    bg: "linear-gradient(135deg,#0F6E56 0%,#1D9E75 50%,#5DCAA5 100%)",
    svgContent: (
      <svg viewBox="0 0 400 300" style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.12 }}>
        <polygon points="200,20 380,280 20,280" fill="#E1F5EE"/>
        <polygon points="200,60 340,260 60,260" fill="#9FE1CB"/>
        <circle cx="200" cy="200" r="50" fill="#5DCAA5"/>
      </svg>
    ),
    accent: "#5DCAA5", textColor: "#E1F5EE", subColor: "#9FE1CB", tag: "#0F6E56"
  },
  {
    bg: "linear-gradient(135deg,#3C3489 0%,#534AB7 50%,#7F77DD 100%)",
    svgContent: (
      <svg viewBox="0 0 400 300" style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.12 }}>
        <rect x="20" y="20" width="160" height="160" rx="8" fill="#EEEDFE"/>
        <rect x="220" y="120" width="160" height="160" rx="8" fill="#AFA9EC"/>
        <rect x="140" y="60" width="120" height="180" rx="8" fill="#CECBF6"/>
      </svg>
    ),
    accent: "#AFA9EC", textColor: "#EEEDFE", subColor: "#CECBF6", tag: "#3C3489"
  },
  {
    bg: "linear-gradient(135deg,#712B13 0%,#993C1D 50%,#D85A30 100%)",
    svgContent: (
      <svg viewBox="0 0 400 300" style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.12 }}>
        <circle cx="100" cy="150" r="120" fill="#FAECE7"/>
        <circle cx="300" cy="150" r="80" fill="#F09977"/>
        <circle cx="200" cy="80" r="60" fill="#F5C4B3"/>
      </svg>
    ),
    accent: "#F09977", textColor: "#FAECE7", subColor: "#F5C4B3", tag: "#712B13"
  },
];

function FallbackArt({ nome, idx }) {
  const art = FALLBACK_ARTS[idx % FALLBACK_ARTS.length];
  const sigla = (nome||"").split(" ").filter(w=>w.length>2).slice(0,2).map(w=>w[0]).join("").toUpperCase() || "IPC";
  return (
    <div style={{ width:"100%", height:"100%", background:art.bg, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
      {art.svgContent}
      <div style={{ position:"relative", textAlign:"center" }}>
        <div style={{ width:80, height:80, borderRadius:20, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", border:"2px solid rgba(255,255,255,0.25)" }}>
          <span style={{ color:"#fff", fontWeight:900, fontSize:28, fontFamily:"'Montserrat',sans-serif" }}>{sigla}</span>
        </div>
        <div style={{ color:"rgba(255,255,255,0.5)", fontSize:12, letterSpacing:3, textTransform:"uppercase", fontFamily:"'Montserrat',sans-serif" }}>TCE-CE · IPC</div>
      </div>
    </div>
  );
}

const MESES_EXT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const MESES_CURTO = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

function SlideAgendaManual({ evento, fallbackIdx }) {
  const temFoto = !!(evento.fotoUrl && evento.fotoUrl.trim());
  const [fotoError, setFotoError] = useState(false);
  const usarFallback = !temFoto || fotoError;

  const dataInicioObj = evento.dataInicio ? new Date(evento.dataInicio+"T00:00:00") : null;
  const dataFimObj = evento.dataFim && evento.dataFim !== evento.dataInicio ? new Date(evento.dataFim+"T00:00:00") : null;

  const diaInicio = dataInicioObj ? dataInicioObj.getDate() : null;
  const diaFim = dataFimObj ? dataFimObj.getDate() : null;
  const mesIdx = dataInicioObj ? dataInicioObj.getMonth() : null;
  const ano = dataInicioObj ? dataInicioObj.getFullYear() : null;

  const dataLabel = !dataInicioObj ? null
    : diaFim ? `${diaInicio} – ${diaFim} de ${MESES_EXT[mesIdx]} de ${ano}`
    : `${diaInicio} de ${MESES_EXT[mesIdx]} de ${ano}`;

  // Opção D: grade 2x2 — foto ocupa lado esquerdo inteiro
  return (
    <div style={{ width:"100%", height:"100%", background:"#042C53", display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr", fontFamily:"'Montserrat',sans-serif" }}>

      {/* Foto / arte — ocupa coluna esquerda inteira */}
      <div style={{ gridRow:"1 / 3", position:"relative", overflow:"hidden", borderRight:"1px solid rgba(255,255,255,0.08)" }}>
        {usarFallback ? (
          <FallbackArt nome={evento.nome} idx={fallbackIdx||0}/>
        ) : (() => {
          const ytUrl = normYoutubeUrl(evento.fotoUrl);
          const driveUrl = normDriveUrl(evento.fotoUrl);
          const finalUrl = ytUrl || driveUrl || evento.fotoUrl;
          const isEmbed = ytUrl || driveUrl;
          if (isEmbed) return <iframe src={finalUrl} style={{ width:"100%", height:"100%", border:"none" }} allow="autoplay; fullscreen" allowFullScreen title="foto"/>;
          return <img src={finalUrl} alt={evento.nome} onError={() => setFotoError(true)} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>;
        })()}
        {/* Overlay gradiente no rodapé da foto */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"35%", background:"linear-gradient(transparent,rgba(4,44,83,0.85))" }}/>
        {/* Tag TCE no canto */}
        <div style={{ position:"absolute", top:24, left:24, background:"rgba(4,44,83,0.8)", borderRadius:8, padding:"5px 14px", backdropFilter:"blur(4px)" }}>
          <span style={{ color:"#85B7EB", fontSize:14, letterSpacing:2, textTransform:"uppercase", fontWeight:700 }}>TCE-CE · IPC</span>
        </div>
      </div>

      {/* Top-right: título + data */}
      <div style={{ padding:"36px 40px", display:"flex", flexDirection:"column", justifyContent:"center", gap:16, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        {evento.categoria && (
          <span style={{ background:"#185FA5", color:"#E6F1FB", fontSize:14, padding:"6px 18px", borderRadius:20, width:"fit-content", letterSpacing:0.5, fontWeight:700 }}>
            {evento.categoria}
          </span>
        )}
        <div style={{ color:"#E6F1FB", fontWeight:700, fontSize:38, lineHeight:1.2 }}>{evento.nome}</div>
        {dataLabel && (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {diaInicio && mesIdx !== null && (
              <div style={{ background:"#185FA5", borderRadius:10, padding:"8px 14px", textAlign:"center", flexShrink:0 }}>
                <div style={{ color:"#E6F1FB", fontWeight:900, fontSize:42, lineHeight:1 }}>{diaInicio}</div>
                <div style={{ color:"#85B7EB", fontSize:13, textTransform:"uppercase", letterSpacing:1 }}>{MESES_CURTO[mesIdx]}</div>
              </div>
            )}
            <div style={{ color:"#85B7EB", fontSize:20, lineHeight:1.4 }}>{dataLabel}</div>
          </div>
        )}
      </div>

      {/* Bottom-right: local + horário + descrição */}
      <div style={{ padding:"28px 40px", display:"flex", flexDirection:"column", justifyContent:"center", gap:14 }}>
        {evento.local && (
          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, marginTop:1 }}>
              <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" stroke="#85B7EB" strokeWidth="1.3"/>
              <circle cx="8" cy="6" r="1.5" stroke="#85B7EB" strokeWidth="1.3"/>
            </svg>
            <div>
              <div style={{ color:"#85B7EB", fontSize:13, textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>Local</div>
              <div style={{ color:"#E6F1FB", fontSize:24, fontWeight:700 }}>{evento.local}</div>
            </div>
          </div>
        )}
        {evento.horario && (
          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, marginTop:1 }}>
              <circle cx="8" cy="8" r="5.5" stroke="#85B7EB" strokeWidth="1.3"/>
              <line x1="8" y1="4.5" x2="8" y2="8" stroke="#85B7EB" strokeWidth="1.3" strokeLinecap="round"/>
              <line x1="8" y1="8" x2="10.5" y2="9.5" stroke="#85B7EB" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={{ color:"#85B7EB", fontSize:13, textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>Horário</div>
              <div style={{ color:"#E6F1FB", fontSize:22, fontWeight:700 }}>{evento.horario}</div>
            </div>
          </div>
        )}
        {evento.descricao && (
          <div style={{ color:"#B5D4F4", fontSize:18, lineHeight:1.7, marginTop:4 }}>{evento.descricao}</div>
        )}
      </div>
    </div>
  );
}


function SlideInformeTCEduc({ eventosTC }) {
  const getCapacitados = (e) => {
    if (e.modoTotalManual) return parseInt(e.totalAprovadosManual) || 0;
    const porAcao = (e.acoesEducacionais || []).reduce((s, a) => s + (parseInt(a.participantes) || 0), 0);
    if (porAcao === 0 && e.totalAprovadosManual) return parseInt(e.totalAprovadosManual) || 0;
    return porAcao;
  };
  const getStatusEfetivo = (e) => {
    return getCapacitados(e) > 0 ? "Realizado" : (e.status || "Programado");
  };
  const ev2026 = (eventosTC||[]).filter(e => {
    const ano = e.data ? e.data.split("-")[0] : (e.ano ? String(e.ano) : "");
    return ano === "2026" && getStatusEfetivo(e) === "Realizado";
  });
  const municiRealizados = new Set(ev2026.filter(e=>e.tipo==="Municipal").map(e=>e.municipio||e.regiao)).size;
  const capMunicipal = ev2026.filter(e=>e.tipo==="Municipal").reduce((s,e) => s + getCapacitados(e), 0);
  const regionaisRealizadas = new Set(ev2026.filter(e=>e.tipo==="Regional").map(e=>e.municipio||e.regiao)).size;
  const capRegional = ev2026.filter(e=>e.tipo==="Regional").reduce((s,e) => s + getCapacitados(e), 0);
  const totalCap = capMunicipal + capRegional;
  const fmt = (n) => n.toLocaleString("pt-BR");

  return (
    <div style={{ width:"100%", height:"100%", background:"#042C53", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"40px 52px", fontFamily:"'Montserrat',sans-serif", position:"relative", overflow:"hidden" }}>
      {/* Fundo decorativo */}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.06, pointerEvents:"none" }} viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
        <circle cx="150" cy="120" r="80" fill="none" stroke="#378ADD" strokeWidth="1"/>
        <circle cx="150" cy="120" r="150" fill="none" stroke="#378ADD" strokeWidth="0.5"/>
        <circle cx="650" cy="320" r="100" fill="none" stroke="#378ADD" strokeWidth="1"/>
        <circle cx="650" cy="320" r="190" fill="none" stroke="#378ADD" strokeWidth="0.5"/>
        <circle cx="400" cy="220" r="60" fill="none" stroke="#378ADD" strokeWidth="1"/>
        <line x1="150" y1="120" x2="400" y2="220" stroke="#378ADD" strokeWidth="0.8" strokeDasharray="6,4"/>
        <line x1="400" y1="220" x2="650" y2="320" stroke="#378ADD" strokeWidth="0.8" strokeDasharray="6,4"/>
        <circle cx="150" cy="120" r="6" fill="#378ADD" opacity="0.8"/>
        <circle cx="400" cy="220" r="6" fill="#378ADD" opacity="0.8"/>
        <circle cx="650" cy="320" r="6" fill="#378ADD" opacity="0.8"/>
        <circle cx="280" cy="80" r="3" fill="#378ADD" opacity="0.5"/>
        <circle cx="500" cy="150" r="3" fill="#378ADD" opacity="0.5"/>
        <circle cx="600" cy="180" r="3" fill="#378ADD" opacity="0.5"/>
        <circle cx="220" cy="300" r="3" fill="#378ADD" opacity="0.5"/>
      </svg>
      {/* Header */}
      <div style={{ position:"relative" }}>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:18, letterSpacing:4, textTransform:"uppercase", marginBottom:8 }}>TCE-CE · IPC</div>
        <div style={{ color:"#fff", fontSize:73, fontWeight:900, lineHeight:1, letterSpacing:-1 }}>
          Informe <span style={{ color:"#E8730A" }}>TCEduc</span>
        </div>
      </div>
      {/* Números */}
      <div style={{ position:"relative", display:"grid", gridTemplateColumns:"1fr 1px 1fr 1px 1fr", alignItems:"center" }}>
        <div style={{ paddingRight:40 }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:16, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Modalidade Municipal</div>
          <div style={{ marginBottom:12 }}>
            <div style={{ color:"#E8730A", fontSize:83, fontWeight:900, lineHeight:1 }}>{fmt(municiRealizados)}</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:21, marginTop:4 }}>municípios visitados</div>
          </div>
          <div>
            <div style={{ color:"#E8730A", fontSize:57, fontWeight:900, lineHeight:1 }}>{fmt(capMunicipal)}</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:20, marginTop:4 }}>pessoas capacitadas</div>
          </div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.1)", height:140 }}/>
        <div style={{ padding:"0 40px" }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:16, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Modalidade Regional</div>
          <div style={{ marginBottom:12 }}>
            <div style={{ color:"#E8730A", fontSize:83, fontWeight:900, lineHeight:1 }}>{fmt(regionaisRealizadas)}</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:21, marginTop:4 }}>regiões visitadas</div>
          </div>
          <div>
            <div style={{ color:"#E8730A", fontSize:57, fontWeight:900, lineHeight:1 }}>{fmt(capRegional)}</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:20, marginTop:4 }}>pessoas capacitadas</div>
          </div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.1)", height:140 }}/>
        <div style={{ paddingLeft:40, textAlign:"center" }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:16, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Total geral</div>
          <div style={{ color:"#E8730A", fontSize:104, fontWeight:900, lineHeight:1 }}>{fmt(totalCap)}</div>
          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:23, marginTop:8 }}>pessoas capacitadas</div>
          <div style={{ display:"inline-block", background:"rgba(232,115,10,0.2)", border:"1px solid rgba(232,115,10,0.4)", borderRadius:24, padding:"5px 20px", marginTop:14, color:"#E8730A", fontSize:16, fontWeight:700, letterSpacing:1 }}>EM TODO O CEARÁ</div>
        </div>
      </div>
      {/* Rodapé */}
      <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ color:"rgba(255,255,255,0.2)", fontSize:14, letterSpacing:2 }}>Dados atualizados em tempo real · 2026</div>
        <div style={{ color:"rgba(255,255,255,0.2)", fontSize:14 }}>tce.ce.gov.br</div>
      </div>
    </div>
  );
}

function SlideInformeOlimpiada({ escolas }) {
  const ol2026 = (escolas||[]).filter(e => e.edicao === 2026);
  const totalEscolas = ol2026.length;
  const totalAlunos = ol2026.reduce((s,e) => s + (parseInt(e.alunosInscritos)||0), 0);
  const totalMunicipios = new Set(ol2026.map(e=>e.municipio).filter(Boolean)).size;
  const fmt = (n) => n.toLocaleString("pt-BR");

  return (
    <div style={{ width:"100%", height:"100%", background:"#0f172a", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"40px 52px", fontFamily:"'Montserrat',sans-serif", position:"relative", overflow:"hidden" }}>
      {/* Fundo decorativo */}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.06, pointerEvents:"none" }} viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
        <polygon points="400,20 430,110 520,110 450,165 476,255 400,203 324,255 350,165 280,110 370,110" fill="#E8730A"/>
        <polygon points="400,20 430,110 520,110 450,165 476,255 400,203 324,255 350,165 280,110 370,110" fill="none" stroke="#E8730A" strokeWidth="1" transform="translate(400,225) scale(1.6) translate(-400,-225)"/>
        <polygon points="400,20 430,110 520,110 450,165 476,255 400,203 324,255 350,165 280,110 370,110" fill="none" stroke="#E8730A" strokeWidth="0.5" transform="translate(400,225) scale(2.4) translate(-400,-225)"/>
        <circle cx="80" cy="60" r="4" fill="#E8730A" opacity="0.5"/>
        <circle cx="720" cy="60" r="4" fill="#E8730A" opacity="0.5"/>
        <circle cx="80" cy="390" r="4" fill="#E8730A" opacity="0.5"/>
        <circle cx="720" cy="390" r="4" fill="#E8730A" opacity="0.5"/>
        <circle cx="200" cy="220" r="2.5" fill="#E8730A" opacity="0.4"/>
        <circle cx="600" cy="240" r="2.5" fill="#E8730A" opacity="0.4"/>
      </svg>
      {/* Header */}
      <div style={{ position:"relative" }}>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:18, letterSpacing:4, textTransform:"uppercase", marginBottom:8 }}>TCE-CE · IPC</div>
        <div style={{ color:"#fff", fontSize:73, fontWeight:900, lineHeight:1, letterSpacing:-1 }}>
          Informe <span style={{ color:"#E8730A" }}>Olímpiada</span>
        </div>
      </div>
      {/* Números */}
      <div style={{ position:"relative", display:"grid", gridTemplateColumns:"1fr 1px 1fr 1px 1fr", alignItems:"center" }}>
        <div style={{ paddingRight:40, textAlign:"center" }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:16, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Escolas participantes</div>
          <div style={{ color:"#E8730A", fontSize:125, fontWeight:900, lineHeight:1 }}>{fmt(totalEscolas)}</div>
          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:23, marginTop:8 }}>escolas inscritas</div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.08)", height:140 }}/>
        <div style={{ padding:"0 40px", textAlign:"center" }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:16, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Alunos participantes</div>
          <div style={{ color:"#E8730A", fontSize:125, fontWeight:900, lineHeight:1 }}>{fmt(totalAlunos)}</div>
          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:23, marginTop:8 }}>alunos inscritos</div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.08)", height:140 }}/>
        <div style={{ paddingLeft:40, textAlign:"center" }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:16, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Municípios</div>
          <div style={{ color:"#E8730A", fontSize:125, fontWeight:900, lineHeight:1 }}>{fmt(totalMunicipios)}</div>
          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:23, marginTop:8 }}>municípios presentes</div>
          <div style={{ display:"inline-block", background:"rgba(232,115,10,0.2)", border:"1px solid rgba(232,115,10,0.4)", borderRadius:24, padding:"5px 20px", marginTop:14, color:"#E8730A", fontSize:16, fontWeight:700, letterSpacing:1 }}>EDIÇÃO 2026</div>
        </div>
      </div>
      {/* Rodapé */}
      <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ color:"rgba(255,255,255,0.2)", fontSize:14, letterSpacing:2 }}>Dados atualizados em tempo real · 2026</div>
        <div style={{ color:"rgba(255,255,255,0.2)", fontSize:14 }}>tce.ce.gov.br</div>
      </div>
    </div>
  );
}

function Relogio() {
  const [hora, setHora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ position:"absolute", bottom:20, right:24, textAlign:"right", zIndex:10 }}>
      <div style={{ color:"rgba(255,255,255,0.9)", fontWeight:900, fontSize:28, lineHeight:1, textShadow:"0 2px 8px rgba(0,0,0,0.5)" }}>
        {hora.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}
      </div>
      <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12, textTransform:"capitalize", textShadow:"0 1px 4px rgba(0,0,0,0.5)" }}>
        {hora.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" })}
      </div>
    </div>
  );
}

export default function IPCMidiaTelaPublica({ telaId }) {
  const [tela, setTela] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [conteudos, setConteudos] = useState([]);
  const [servidores, setServidores] = useState([]);
  const [eventosTC, setEventosTC] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showingCapa, setShowingCapa] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const timerRef = useRef(null);
  const pingRef = useRef(null);

  useEffect(() => {
    loadTela();
  }, [telaId]);

  const loadTela = async () => {
    setLoading(true);
    try {
      const telaDoc = await getDoc(doc(db, "midia_telas", telaId));
      if (!telaDoc.exists()) { setErro("Tela não encontrada"); setLoading(false); return; }
      const telaData = { id: telaDoc.id, ...telaDoc.data() };
      setTela(telaData);

      const [cSnap, sSnap, eSnap, oSnap] = await Promise.all([
        getDocs(collection(db, "midia_conteudos")),
        getDocs(collection(db, "ipc_servidores")),
        getDocs(collection(db, "tceduc_eventos")),
        getDocs(collection(db, "olimpiadas_escolas")),
      ]);
      setConteudos(cSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setServidores(sSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setEventosTC(eSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setEscolas(oSnap.docs.map(d => ({ id:d.id, ...d.data() })));

      if (telaData.playlistId) {
        const plDoc = await getDoc(doc(db, "midia_playlists", telaData.playlistId));
        if (plDoc.exists()) setPlaylist({ id: plDoc.id, ...plDoc.data() });
      }
    } catch(e) {
      setErro("Erro ao carregar tela: " + e.message);
    }
    setLoading(false);
  };

  // Ping a cada 30s
  useEffect(() => {
    if (!telaId) return;
    const doPing = () => updateDoc(doc(db,"midia_telas",telaId), { ultimoPing: new Date().toISOString() }).catch(()=>{});
    doPing();
    pingRef.current = setInterval(doPing, 30000);
    return () => clearInterval(pingRef.current);
  }, [telaId]);

  // Autoplay
  const itens = playlist?.itens?.filter(item => !item.oculto) || [];
  const capaShownRef = useRef(false); // controla se já exibiu a capa para o idx atual

  // Verifica se item tem conteúdo real para exibir
  const itemTemConteudo = (item) => {
    if (!item) return false;
    // Aniversariantes do mês — verifica antes do tipo genérico
    if (item.id === "aniv_mes") {
      const hoje = new Date();
      return servidores.some(s => {
        if (!s.dataAniversario) return false;
        const [,m] = s.dataAniversario.split("-");
        return parseInt(m)-1 === hoje.getMonth();
      });
    }
    // Aniversariante do dia / fim de semana
    if (item.tipo === "aniversario") {
      const hoje = new Date();
      const diaSemana = hoje.getDay();
      const temHoje = servidores.some(s => {
        if (!s.dataAniversario) return false;
        const [,m,d] = s.dataAniversario.split("-");
        return parseInt(m)-1 === hoje.getMonth() && parseInt(d) === hoje.getDate();
      });
      if (temHoje) return true;
      if (diaSemana === 5) {
        const sabado = new Date(hoje); sabado.setDate(hoje.getDate()+1);
        const domingo = new Date(hoje); domingo.setDate(hoje.getDate()+2);
        return servidores.some(s => {
          if (!s.dataAniversario) return false;
          const [,m,d] = s.dataAniversario.split("-");
          const isSab = parseInt(m)-1===sabado.getMonth() && parseInt(d)===sabado.getDate();
          const isDom = parseInt(m)-1===domingo.getMonth() && parseInt(d)===domingo.getDate();
          return isSab || isDom;
        });
      }
      return false;
    }
    if (item.tipo === "informe_tceduc" || item.tipo === "informe_olimpiada") {
      return true;
    }
    if (item.tipo === "data_comemorativa") {
      const c = conteudos.find(c => c.id === item.id);
      const hoje = new Date();
      if (!c?.dataFixa) return false;
      const [mm,dd] = c.dataFixa.split("-");
      return parseInt(mm)-1 === hoje.getMonth() && parseInt(dd) === hoje.getDate();
    }
    return true; // outros tipos sempre exibem
  };

  useEffect(() => {
    if (itens.length === 0) return;
    const item = itens[currentIdx] || itens[0];
    clearTimeout(timerRef.current);
    capaShownRef.current = false;
    setShowingCapa(false);

    // Pula imediatamente se não tem conteúdo
    if (!itemTemConteudo(item)) {
      timerRef.current = setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % itens.length);
      }, 100);
      return () => clearTimeout(timerRef.current);
    }

    if (item?.tipo === "eventos_tc" && item?.capaUrl) {
      setShowingCapa(true);
      timerRef.current = setTimeout(() => {
        setShowingCapa(false);
        const tempo = (item?.tempo || 10) * 1000;
        timerRef.current = setTimeout(() => {
          setCurrentIdx(prev => (prev + 1) % itens.length);
        }, tempo);
      }, 4000);
    } else {
      const tempo = (item?.tempo || 10) * 1000;
      timerRef.current = setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % itens.length);
      }, tempo);
    }
    return () => clearTimeout(timerRef.current);
  }, [currentIdx, itens.length]);

  if (loading) {
    return (
      <div style={{ width:"100vw", height:"100vh", background:"#0f172a", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:18, fontWeight:700 }}>Carregando...</div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ width:"100vw", height:"100vh", background:"#0f172a", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📺</div>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:18 }}>{erro}</div>
        </div>
      </div>
    );
  }

  if (!playlist || itens.length === 0) {
    return (
      <div style={{ width:"100vw", height:"100vh", background:"#0f172a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Montserrat',sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap')`}</style>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:64, marginBottom:20 }}>📺</div>
          <div style={{ color:"rgba(255,255,255,0.7)", fontWeight:900, fontSize:24, marginBottom:8 }}>{tela?.nome}</div>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:16 }}>Nenhuma playlist vinculada</div>
        </div>
        <Relogio/>
      </div>
    );
  }

  const item = itens[currentIdx] || itens[0];

  const renderSlide = () => {
    if (!item) return null;

    // Aniversariantes do mês
    if (item.id === "aniv_mes") {
      return <SlideAniversarioMes servidores={servidores}/>;
    }
    // Aniversariante do dia / fim de semana
    if (item.tipo === "aniversario") {
      return <SlideAniversario servidores={servidores}/>;
    }

    // Eventos TCEduc — mostra capa 4s antes se configurada
    if (item.tipo === "eventos_tc") {
      if (showingCapa && item.capaUrl) {
        return <SlideImagem url={item.capaUrl}/>;
      }
      return <SlideEventos eventosTC={eventosTC}/>;
    }

    // Evento manual da agenda
    if (item.tipo === "evento_manual") {
      const ev = conteudos.find(c => c.id === item.id) || item;
      return <SlideAgendaManual evento={ev} fallbackIdx={currentIdx}/>;
    }

    // Data comemorativa
    if (item.tipo === "data_comemorativa") {
      const c = conteudos.find(c => c.id === item.id);
      if (c?.url) return <SlideImagem url={c.url}/>;
      return (
        <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#E8730A,#dc2626)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <div style={{ fontSize:72, marginBottom:16 }}>🗓️</div>
          <div style={{ color:"#fff", fontWeight:900, fontSize:48 }}>{item.label || c?.nome}</div>
        </div>
      );
    }

    // Imagem ou vídeo
    if (item.tipo === "imagem" || item.tipo === "video") {
      const c = conteudos.find(c => c.id === item.id);
      const url = c?.url || item.thumb;
      if (url) return <SlideImagem url={url}/>;
    }

    // Informe TCEduc
    if (item.tipo === "informe_tceduc") {
      return <SlideInformeTCEduc eventosTC={eventosTC}/>;
    }

    // Informe Olímpiada
    if (item.tipo === "informe_olimpiada") {
      return <SlideInformeOlimpiada escolas={escolas}/>;
    }

    // Fallback
    return (
      <div style={{ width:"100%", height:"100%", background:"#1e293b", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:"rgba(255,255,255,0.3)", fontSize:18 }}>{item.label || item.tipo}</div>
      </div>
    );
  };

  const isVertical = tela?.orientacao === "vertical";

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "#0f172a",
      overflow: "hidden",
      position: "relative",
      fontFamily: "'Montserrat',sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{overflow:hidden}`}</style>

      {/* SLIDE ATUAL */}
      <div style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        inset: 0,
      }}>
        {renderSlide()}
      </div>

      {/* Barra inferior com logo + nome tela */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
        padding: "40px 24px 16px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        zIndex: 5,
        pointerEvents: "none",
      }}>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>
          TCE-CE · IPC · {tela?.nome}
        </div>
        {itens.length > 1 && (
          <div style={{ display:"flex", gap:4 }}>
            {itens.map((_,i) => (
              <div key={i} style={{ width: i===currentIdx?20:6, height:4, borderRadius:2, background: i===currentIdx?"#fff":"rgba(255,255,255,0.3)", transition:"width 0.3s" }}/>
            ))}
          </div>
        )}
      </div>

      <Relogio/>
    </div>
  );
}
