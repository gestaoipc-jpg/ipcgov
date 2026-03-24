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
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  // Direct image from drive
  const driveImg = url.match(/drive\.google\.com\/uc\?/);
  if (driveImg) return url;
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

function SlideAniversario({ servidores }) {
  const hoje = new Date();
  const aniv = servidores.filter(s => {
    if (!s.dataAniversario) return false;
    const [,m,d] = s.dataAniversario.split("-");
    return parseInt(m)-1 === hoje.getMonth() && parseInt(d) === hoje.getDate();
  });

  if (aniv.length === 0) return null;

  function corAvatar(nome) {
    const cores = ["#1B3F7A","#7c3aed","#059669","#E8730A","#0891b2","#dc2626"];
    let h = 0;
    for (let c of (nome||"")) h += c.charCodeAt(0);
    return cores[h % cores.length];
  }
  function initials(nome) {
    if (!nome) return "?";
    return nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase();
  }

  return (
    <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#1B3F7A,#7c3aed)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:40 }}>
      <div style={{ fontSize:72, marginBottom:20 }}>🎂</div>
      <div style={{ color:"rgba(255,255,255,0.7)", fontSize:22, fontWeight:700, marginBottom:20, letterSpacing:4, textTransform:"uppercase" }}>Parabéns!</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:24, justifyContent:"center" }}>
        {aniv.map(s => (
          <div key={s.id} style={{ textAlign:"center" }}>
            {s.artAniversario ? (
              <img src={s.artAniversario} alt={s.nome} style={{ width:120, height:120, borderRadius:20, objectFit:"cover" }}/>
            ) : (
              <div style={{ width:120, height:120, borderRadius:20, background:corAvatar(s.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:40, margin:"0 auto" }}>{initials(s.nome)}</div>
            )}
            <div style={{ color:"#fff", fontWeight:800, fontSize:18, marginTop:12 }}>{s.nome.split(" ").slice(0,2).join(" ")}</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:14 }}>{s.cargo||s.setor||""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideEventos({ eventosTC }) {
  const hoje = new Date();
  const proximos = eventosTC.filter(e => {
    if (!e.data) return false;
    const d = new Date(e.data+"T00:00:00");
    const diff = Math.ceil((d - hoje) / 86400000);
    return diff >= 0 && diff <= 20;
  }).slice(0,6);

  const MESES = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

  return (
    <div style={{ width:"100%", height:"100%", background:"#0f172a", display:"flex", flexDirection:"column", padding:48 }}>
      <div style={{ color:"rgba(255,255,255,0.5)", fontSize:16, letterSpacing:4, textTransform:"uppercase", marginBottom:8 }}>Próximos Eventos</div>
      <div style={{ color:"#fff", fontWeight:900, fontSize:40, marginBottom:32 }}>📅 Agenda TCEduc</div>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {proximos.map(e => {
          const [y,m,d] = (e.data||"").split("-");
          return (
            <div key={e.id} style={{ display:"flex", alignItems:"center", gap:20, background:"rgba(255,255,255,0.05)", borderRadius:16, padding:"16px 24px" }}>
              <div style={{ background:"#1B3F7A", borderRadius:12, padding:"10px 14px", textAlign:"center", minWidth:60 }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:28, lineHeight:1 }}>{d}</div>
                <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12, textTransform:"uppercase" }}>{MESES[parseInt(m)-1]}</div>
              </div>
              <div>
                <div style={{ color:"#fff", fontWeight:700, fontSize:22 }}>{e.municipio||e.regiao||"Evento"}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:14, marginTop:2 }}>{e.tipo}</div>
              </div>
            </div>
          );
        })}
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
        ) : (
          <img src={evento.fotoUrl} alt={evento.nome}
            onError={() => setFotoError(true)}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
        )}
        {/* Overlay gradiente no rodapé da foto */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"35%", background:"linear-gradient(transparent,rgba(4,44,83,0.85))" }}/>
        {/* Tag TCE no canto */}
        <div style={{ position:"absolute", top:24, left:24, background:"rgba(4,44,83,0.8)", borderRadius:8, padding:"5px 14px", backdropFilter:"blur(4px)" }}>
          <span style={{ color:"#85B7EB", fontSize:11, letterSpacing:2, textTransform:"uppercase", fontWeight:700 }}>TCE-CE · IPC</span>
        </div>
      </div>

      {/* Top-right: título + data */}
      <div style={{ padding:"36px 40px", display:"flex", flexDirection:"column", justifyContent:"center", gap:16, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        {evento.categoria && (
          <span style={{ background:"#185FA5", color:"#E6F1FB", fontSize:11, padding:"4px 14px", borderRadius:20, width:"fit-content", letterSpacing:0.5, fontWeight:700 }}>
            {evento.categoria}
          </span>
        )}
        <div style={{ color:"#E6F1FB", fontWeight:700, fontSize:26, lineHeight:1.25 }}>{evento.nome}</div>
        {dataLabel && (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {diaInicio && mesIdx !== null && (
              <div style={{ background:"#185FA5", borderRadius:10, padding:"8px 14px", textAlign:"center", flexShrink:0 }}>
                <div style={{ color:"#E6F1FB", fontWeight:900, fontSize:28, lineHeight:1 }}>{diaInicio}</div>
                <div style={{ color:"#85B7EB", fontSize:10, textTransform:"uppercase", letterSpacing:1 }}>{MESES_CURTO[mesIdx]}</div>
              </div>
            )}
            <div style={{ color:"#85B7EB", fontSize:15, lineHeight:1.4 }}>{dataLabel}</div>
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
              <div style={{ color:"#85B7EB", fontSize:10, textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>Local</div>
              <div style={{ color:"#E6F1FB", fontSize:16, fontWeight:700 }}>{evento.local}</div>
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
              <div style={{ color:"#85B7EB", fontSize:10, textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>Horário</div>
              <div style={{ color:"#E6F1FB", fontSize:16, fontWeight:700 }}>{evento.horario}</div>
            </div>
          </div>
        )}
        {evento.descricao && (
          <div style={{ color:"#B5D4F4", fontSize:13, lineHeight:1.7, marginTop:4 }}>{evento.descricao}</div>
        )}
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

      const [cSnap, sSnap, eSnap] = await Promise.all([
        getDocs(collection(db, "midia_conteudos")),
        getDocs(collection(db, "ipc_servidores")),
        getDocs(collection(db, "tceduc_eventos")),
      ]);
      setConteudos(cSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setServidores(sSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setEventosTC(eSnap.docs.map(d => ({ id:d.id, ...d.data() })));

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

  useEffect(() => {
    if (itens.length === 0) return;
    const item = itens[currentIdx] || itens[0];
    clearTimeout(timerRef.current);
    capaShownRef.current = false;
    setShowingCapa(false);

    if (item?.tipo === "eventos_tc" && item?.capaUrl) {
      // Mostra capa por 4s, depois mostra agenda pelo tempo configurado
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

    // Aniversariantes
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
