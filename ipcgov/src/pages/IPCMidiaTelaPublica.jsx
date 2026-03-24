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
    return diff >= 0 && diff <= 14;
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

function SlideAgendaManual({ evento }) {
  return (
    <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#0891b2,#1B3F7A)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:60, textAlign:"center" }}>
      <div style={{ fontSize:60, marginBottom:24 }}>📋</div>
      <div style={{ color:"#fff", fontWeight:900, fontSize:48, lineHeight:1.2, marginBottom:16 }}>{evento.nome}</div>
      {evento.dataInicio && (
        <div style={{ color:"rgba(255,255,255,0.7)", fontSize:22, marginBottom:12 }}>
          {new Date(evento.dataInicio+"T00:00:00").toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" })}
        </div>
      )}
      {evento.descricao && <div style={{ color:"rgba(255,255,255,0.6)", fontSize:18, maxWidth:700 }}>{evento.descricao}</div>}
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

  useEffect(() => {
    if (itens.length === 0) return;
    const item = itens[currentIdx] || itens[0];
    const tempo = (item?.tempo || 10) * 1000;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCurrentIdx(prev => (prev + 1) % itens.length);
    }, tempo);
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

    // Eventos TCEduc
    if (item.tipo === "eventos_tc") {
      return <SlideEventos eventosTC={eventosTC}/>;
    }

    // Evento manual da agenda
    if (item.tipo === "evento_manual") {
      const ev = conteudos.find(c => c.id === item.id) || item;
      return <SlideAgendaManual evento={ev}/>;
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
