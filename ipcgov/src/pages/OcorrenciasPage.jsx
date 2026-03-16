import { useState, useEffect, useRef } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };
const STATUS_COR = { Pendente:"#E8730A", Ciente:"#0891b2", Resolvido:"#059669" };
const TIPO_LABEL = { inscricao:"Inscrição/Frequência", equipamento:"Equipamentos/Material", logistica:"Logística/Local/Transporte" };
const BASE_URL = "https://ipcgov.vercel.app/ocorrencia";

function QRImg({ url, size }) {
  const encoded = encodeURIComponent(url);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=ffffff&color=1B3F7A&margin=2`;
  return <img src={src} alt="QR Code" style={{ width:size, height:size, borderRadius:8 }} crossOrigin="anonymous" />;
}

function QRModal({ eventos, viagens, onClose }) {
  const [aba, setAba] = useState("eventos"); // "eventos" | "viagens"
  const [selecionados, setSelecionados] = useState([]);
  const [selecionadosViagem, setSelecionadosViagem] = useState([]);
  const [etapa, setEtapa] = useState("selecionar");
  const printRef = useRef();

  const toggleViagem = (id) =>
    setSelecionadosViagem(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const toggleEvento = (id) =>
    setSelecionados(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const eventosSelecionados = eventos.filter(e => selecionados.includes(e.id));

  const paginas = [];
  if (aba === "eventos") {
    eventosSelecionados.forEach(ev => {
      const acoes = ev.acoesEducacionais || [];
      if (acoes.length === 0) {
        paginas.push({ tipo:"evento", ev, acao: null, url: `${BASE_URL}?evento=${ev.id}` });
      } else {
        acoes.forEach((acao, idx) => {
          const acaoId = acao.acaoId || acao.id || String(idx);
          paginas.push({ tipo:"evento", ev, acao, url: `${BASE_URL}?evento=${ev.id}&acao=${acaoId}` });
        });
      }
    });
  } else {
    selecionadosViagem.forEach(vId => {
      const v = viagens.find(x => x.id === vId);
      if (v) paginas.push({ tipo:"viagem", viagem: v, url: `${BASE_URL}?viagem=${v.id}` });
    });
  }

  const imprimir = () => {
    const win = window.open("", "_blank");
    const paginasHTML = paginas.map((p, i) => {
      const isViagem = p.tipo === "viagem";
      const nome    = isViagem ? (p.viagem.titulo||"Viagem") : (p.ev.municipio || p.ev.regiao || "Evento");
      const data    = isViagem
        ? (p.viagem.dataInicio ? new Date(p.viagem.dataInicio+"T12:00:00").toLocaleDateString("pt-BR") : "")
        : (p.ev.data ? new Date(p.ev.data+"T12:00:00").toLocaleDateString("pt-BR") : "");
      const nomeAcao = isViagem ? "Registro Geral de Ocorrência" : (p.acao?.acaoNome || p.acao?.nome || "Geral");
      const encoded  = encodeURIComponent(p.url);
      const qrSrc    = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}&bgcolor=ffffff&color=1B3F7A&margin=2`;
      return `
        <div class="page">
          <div class="marca">IPC<span>educ</span></div>
          <div class="subtitulo">REGISTRO DE OCORRÊNCIA</div>
          <div class="qr-wrap"><img src="${qrSrc}" alt="QR Code" class="qr" /></div>
          <div class="municipio-box">
            <div class="label-sm">MUNICÍPIO</div>
            <div class="municipio">📍 ${nome}</div>
            <div class="data-ev">📅 ${data}</div>
          </div>
          <div class="curso-box">
            <div class="label-sm">CURSO</div>
            <div class="curso">📚 ${nomeAcao}</div>
          </div>
          <div class="instrucao">Aponte a câmera do celular para o QR Code acima<br/>para registrar sua ocorrência sobre este curso.</div>
          ${p.ev.local ? `<div class="local">🏛️ ${p.ev.local}</div>` : ""}
          <div class="numeracao">${i+1} / ${paginas.length}</div>
        </div>`;
    }).join("");

    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>QR Codes — Ocorrências IPCeduc</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Montserrat',sans-serif; background:#fff; }
        .page { width:210mm; min-height:297mm; display:flex; flex-direction:column; align-items:center;
                justify-content:center; padding:20mm; page-break-after:always; break-after:page; position:relative; }
        .page:last-child { page-break-after:auto; }
        @page { size:A4 portrait; margin:0; }
        @media print { .page { page-break-after:always; } }
        .marca { font-size:34px; font-weight:900; color:#1B3F7A; letter-spacing:-1px; margin-bottom:4px; }
        .marca span { color:#E8730A; }
        .subtitulo { color:#1B3F7A; font-size:16px; font-weight:900; letter-spacing:2px; margin-bottom:28px; text-transform:uppercase; }
        .qr-wrap { background:#f0f4ff; border-radius:20px; padding:20px; margin-bottom:24px; }
        .qr { width:220px; height:220px; border-radius:8px; display:block; }
        .municipio-box { background:#1B3F7A; border-radius:16px; padding:16px 32px; margin-bottom:12px; min-width:320px; text-align:center; }
        .label-sm { color:rgba(255,255,255,0.55); font-size:10px; letter-spacing:2px; margin-bottom:6px; }
        .municipio { color:#fff; font-weight:900; font-size:22px; }
        .data-ev { color:rgba(255,255,255,0.6); font-size:13px; margin-top:4px; }
        .curso-box { background:#E8730A; border-radius:16px; padding:14px 32px; min-width:320px; text-align:center; margin-bottom:24px; }
        .curso { color:#fff; font-weight:900; font-size:16px; line-height:1.4; }
        .instrucao { color:#aaa; font-size:12px; line-height:1.8; text-align:center; }
        .local { color:#bbb; font-size:11px; margin-top:10px; text-align:center; }
        .numeracao { position:absolute; bottom:16px; right:20px; font-size:10px; color:#ddd; }
      </style>
      </head><body>${paginasHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 1000);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:680, maxHeight:"90vh", overflowY:"auto", padding:32 }} onClick={e=>e.stopPropagation()}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>🔲 Gerar QR Codes</div>
            <div style={{ color:"#aaa", fontSize:13, marginTop:4 }}>1 QR Code por curso por município</div>
          </div>
          <div onClick={onClose} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
        </div>

        {etapa === "selecionar" && (<>
          {/* ABAS */}
          <div style={{ display:"flex", gap:8, marginBottom:18 }}>
            {[["eventos","📍 Eventos"],["viagens","🗺️ Viagens"]].map(([id,label]) => (
              <div key={id} onClick={() => { setAba(id); setSelecionados([]); setSelecionadosViagem([]); }}
                style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:12, cursor:"pointer", fontWeight:700, fontSize:13,
                  background: aba===id ? "#1B3F7A" : "#f0f4ff",
                  color: aba===id ? "#fff" : "#1B3F7A",
                  border: `1px solid ${aba===id ? "#1B3F7A" : "#e8edf2"}` }}>{label}</div>
            ))}
          </div>

          {aba === "eventos" && <div style={{ fontWeight:700, fontSize:14, color:"#555", marginBottom:12 }}>Selecione os eventos:</div>}
          {aba === "viagens" && <div style={{ fontWeight:700, fontSize:14, color:"#555", marginBottom:12 }}>Selecione as viagens:</div>}
          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            <div onClick={() => aba==="eventos" ? setSelecionados(eventos.map(e=>e.id)) : setSelecionadosViagem(viagens.map(v=>v.id))} style={{ background:"#f0f4ff", borderRadius:10, padding:"6px 14px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>Selecionar todos</div>
            <div onClick={() => aba==="eventos" ? setSelecionados([]) : setSelecionadosViagem([])} style={{ background:"#f8f9fb", borderRadius:10, padding:"6px 14px", fontSize:12, fontWeight:700, color:"#888", cursor:"pointer" }}>Limpar</div>
          </div>

          <div style={{ maxHeight:340, overflowY:"auto", marginBottom:20 }}>
            {aba === "eventos" && [...eventos].sort((a,b)=>(a.data||"").localeCompare(b.data||"")).map(ev => {
              const sel    = selecionados.includes(ev.id);
              const nome   = ev.municipio || ev.regiao || "Evento";
              const data   = ev.data ? new Date(ev.data+"T12:00:00").toLocaleDateString("pt-BR") : "";
              const nAcoes = (ev.acoesEducacionais||[]).length;
              return (
                <div key={ev.id} onClick={() => toggleEvento(ev.id)}
                  style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", borderRadius:14, marginBottom:8, cursor:"pointer",
                    background:sel ? "#eff6ff" : "#f8f9fb", border:`2px solid ${sel ? "#1B3F7A" : "#e8edf2"}` }}>
                  <div style={{ width:22, height:22, borderRadius:7, background:sel?"#1B3F7A":"#fff", border:`2px solid ${sel?"#1B3F7A":"#ddd"}`,
                    display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, flexShrink:0 }}>
                    {sel ? "✓" : ""}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{nome}</div>
                    <div style={{ fontSize:12, color:"#aaa" }}>{data} · {nAcoes} curso{nAcoes!==1?"s":""} → {nAcoes} QR Code{nAcoes!==1?"s":""}</div>
                  </div>
                  <div style={{ background:"#E8730A22", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#E8730A" }}>
                    {nAcoes} QR
                  </div>
                </div>
              );
            })}
            {aba === "viagens" && [...viagens].sort((a,b)=>(a.dataInicio||"").localeCompare(b.dataInicio||"")).map(v => {
              const sel  = selecionadosViagem.includes(v.id);
              const data = v.dataInicio ? new Date(v.dataInicio+"T12:00:00").toLocaleDateString("pt-BR") : "";
              return (
                <div key={v.id} onClick={() => toggleViagem(v.id)}
                  style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", borderRadius:14, marginBottom:8, cursor:"pointer",
                    background:sel ? "#f0fdf4" : "#f8f9fb", border:`2px solid ${sel ? "#059669" : "#e8edf2"}` }}>
                  <div style={{ width:22, height:22, borderRadius:7, background:sel?"#059669":"#fff", border:`2px solid ${sel?"#059669":"#ddd"}`,
                    display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, flexShrink:0 }}>
                    {sel ? "✓" : ""}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{v.titulo || "Viagem"}</div>
                    <div style={{ fontSize:12, color:"#aaa" }}>{data} · Registro geral → 1 QR Code</div>
                  </div>
                  <div style={{ background:"#05996922", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#059669" }}>
                    1 QR
                  </div>
                </div>
              );
            })}
          </div>

          {(selecionados.length > 0 || selecionadosViagem.length > 0) && (
            <div style={{ background:"#f0fdf4", borderRadius:12, padding:"10px 16px", marginBottom:16, fontSize:13, color:"#059669", fontWeight:700 }}>
              ✅ {paginas.length} QR Code{paginas.length!==1?"s":""} serão gerados ({selecionados.length} evento{selecionados.length!==1?"s":""})
            </div>
          )}

          <button onClick={() => { if(selecionados.length>0) setEtapa("visualizar"); }}
            disabled={aba==="eventos" ? selecionados.length===0 : selecionadosViagem.length===0}
            style={{ width:"100%", background:selecionados.length===0?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:selecionados.length===0?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
            Visualizar {paginas.length} QR Code{paginas.length!==1?"s":""}
          </button>
        </>)}

        {etapa === "visualizar" && (<>
          <div style={{ display:"flex", gap:10, marginBottom:20 }}>
            <div onClick={() => setEtapa("selecionar")} style={{ background:"#f0f4ff", borderRadius:12, padding:"10px 18px", fontSize:13, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>← Voltar</div>
            <div onClick={imprimir} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", borderRadius:12, padding:"10px 18px", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer", textAlign:"center" }}>
              🖨️ Imprimir PDF — {paginas.length} página{paginas.length!==1?"s":""}
            </div>
          </div>

          {/* Preview */}
          <div ref={printRef} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {paginas.map((p, i) => {
              const nome     = p.ev.municipio || p.ev.regiao || "Evento";
              const data     = p.ev.data ? new Date(p.ev.data+"T12:00:00").toLocaleDateString("pt-BR") : "";
              const nomeAcao = p.acao?.acaoNome || p.acao?.nome || "Geral";
              return (
                <div key={i} style={{ border:"2px solid #e8edf2", borderRadius:16, padding:24, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", background:"#fff", position:"relative" }}>
                  <div style={{ fontFamily:"'Montserrat',sans-serif", color:"#1B3F7A", fontWeight:900, fontSize:26, letterSpacing:-1, marginBottom:2 }}>
                    IPC<span style={{ color:"#E8730A" }}>educ</span>
                  </div>
                  <div style={{ color:"#1B3F7A", fontSize:14, fontWeight:900, letterSpacing:2, marginBottom:20 }}>REGISTRO DE OCORRÊNCIA</div>

                  <div style={{ background:"#f0f4ff", borderRadius:16, padding:16, marginBottom:20, display:"inline-block" }}>
                    <QRImg url={p.url} size={180} />
                  </div>

                  <div style={{ background:"#1B3F7A", borderRadius:14, padding:"14px 28px", marginBottom:10, minWidth:280 }}>
                    <div style={{ color:"rgba(255,255,255,0.55)", fontSize:10, letterSpacing:2, marginBottom:4 }}>{p.tipo==="viagem" ? "VIAGEM" : "MUNICÍPIO"}</div>
                    <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>{p.tipo==="viagem" ? "🗺️" : "📍"} {nome}</div>
                    <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12, marginTop:4 }}>📅 {data}</div>
                  </div>

                  <div style={{ background:"#E8730A", borderRadius:14, padding:"12px 28px", minWidth:280, marginBottom:20 }}>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:10, letterSpacing:2, marginBottom:4 }}>{p.tipo==="viagem" ? "TIPO" : "CURSO"}</div>
                    <div style={{ color:"#fff", fontWeight:900, fontSize:15, lineHeight:1.4 }}>📋 {nomeAcao}</div>
                  </div>

                  <div style={{ color:"#aaa", fontSize:12, lineHeight:1.8 }}>
                    Aponte a câmera do celular para o QR Code acima<br/>para registrar sua ocorrência.
                  </div>
                  {p.ev.local && <div style={{ marginTop:8, color:"#bbb", fontSize:11 }}>🏛️ {p.ev.local}</div>}
                  <div style={{ position:"absolute", bottom:10, right:14, fontSize:10, color:"#ddd" }}>{i+1}/{paginas.length}</div>
                </div>
              );
            })}
          </div>
        </>)}
      </div>
    </div>
  );
}

export default function OcorrenciasPage({ onBack, user }) {
  const [eventos, setEventos]       = useState([]);
  const [usuarios, setUsuarios]     = useState([]);
  const [grupos, setGrupos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("Pendente");
  const [respostas, setRespostas]   = useState({});
  const [statusEdit, setStatusEdit] = useState({});
  const [salvando, setSalvando]     = useState(null);
  const [showQR, setShowQR]         = useState(false);
  const [viagens, setViagens]       = useState([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [evSnap, srvSnap, grSnap, vSnap] = await Promise.all([
        getDocs(collection(db,"tceduc_eventos")),
        getDocs(collection(db,"ipc_servidores")),
        getDocs(collection(db,"ipc_grupos_trabalho")),
        getDocs(collection(db,"tceduc_viagens")),
      ]);
      setEventos(evSnap.docs.map(d=>({id:d.id,...d.data()})));
      setUsuarios(srvSnap.docs.map(d=>({id:d.id,...d.data()})));
      setGrupos(grSnap.docs.map(d=>({id:d.id,...d.data()})));
      setViagens(vSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const uid   = user?.uid   || "";
  const email = user?.email || "";
  const meuServidor  = usuarios.find(u => u.id===uid || u.email===email);
  const meusGrupoIds = meuServidor?.grupos || [];
  const isAdmin = ["gestaoipc@tce.ce.gov.br", "fabricio@tce.ce.gov.br"].includes(email);

  const minhasOcs = [];
  eventos.forEach(ev => {
    (ev.ocorrencias||[]).forEach(oc => {
      let paraMim = false;
      if (oc.destinoTipo==="usuario") paraMim = oc.destinoId===uid || oc.destinoId===email;
      else if (oc.destinoTipo==="grupo") paraMim = meusGrupoIds.includes(oc.destinoId);
      if (paraMim) minhasOcs.push({ ...oc, eventoId:ev.id, eventoNome:ev.municipio||ev.regiao||"Evento", eventoData:ev.data, acoesEducacionais:ev.acoesEducacionais||[] });
    });
  });

  const pendentes = minhasOcs.filter(o => !o.status || o.status==="Pendente");
  const cientes   = minhasOcs.filter(o => o.status==="Ciente" || o.status==="Resolvido");
  const listaAtual = filtroStatus==="Pendente" ? pendentes : cientes;

  const salvarResposta = async (oc) => {
    const novoStatus    = statusEdit[oc.id] || oc.status || "Pendente";
    const novaResposta  = respostas[oc.id]  ?? oc.resposta ?? "";
    setSalvando(oc.id);
    try {
      const ev = eventos.find(e=>e.id===oc.eventoId);
      if (!ev) return;
      const primeiroNome = (meuServidor?.nome||email||"Usuário").split(" ")[0];
      const novasOcs = (ev.ocorrencias||[]).map(o =>
        o.id===oc.id ? { ...o, resposta:novaResposta, status:novoStatus, respondidoPor:primeiroNome, respondidoEm:new Date().toISOString() } : o
      );
      await updateDoc(doc(db,"tceduc_eventos",oc.eventoId), { ocorrencias:novasOcs, atualizadoEm:new Date().toISOString() });
      setEventos(evs => evs.map(e => e.id===oc.eventoId ? {...e, ocorrencias:novasOcs} : e));
      setRespostas(r  => { const n={...r}; delete n[oc.id]; return n; });
      setStatusEdit(s => { const n={...s}; delete n[oc.id]; return n; });
    } catch(e){ console.error(e); }
    setSalvando(null);
  };

  const nomeAcaoFn = (eventoId, acaoId) => {
    const ev   = eventos.find(e=>e.id===eventoId);
    const acao = (ev?.acoesEducacionais||[]).find(a=>a.acaoId===acaoId||a.id===acaoId);
    return acao?.acaoNome || acao?.nome || "—";
  };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}`}</style>

      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 32px 40px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div style={{ flex:1 }}>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>TCEDUC</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>⚠️ Ocorrências</div>
            </div>
            {isAdmin && (
              <div onClick={() => setShowQR(true)} style={{ background:"#E8730A", borderRadius:14, padding:"10px 18px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", boxShadow:"0 4px 14px rgba(232,115,10,0.4)", display:"flex", alignItems:"center", gap:8 }}>
                🔲 Gerar QR Codes
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {[{ label:"Pendentes", count:pendentes.length },{ label:"Cientes/Resolvidas", count:cientes.length }].map(p=>(
              <div key={p.label} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 16px", color:"#fff" }}>
                <span style={{ fontWeight:900, fontSize:18 }}>{p.count}</span>
                <span style={{ fontSize:12, opacity:0.7, marginLeft:6 }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"28px 32px 80px" }}>
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {["Pendente","Resolvido"].map(s=>(
            <div key={s} onClick={()=>setFiltroStatus(s)} style={{ borderRadius:12, padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer",
              background:filtroStatus===s ? STATUS_COR[s==="Resolvido"?"Resolvido":"Pendente"] : "#fff",
              color:filtroStatus===s ? "#fff" : "#888", boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
              {s==="Pendente" ? `⚠️ Pendentes (${pendentes.length})` : `✅ Resolvidas/Cientes (${cientes.length})`}
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign:"center", padding:"60px 0", color:"#aaa" }}>Carregando...</div>}

        {!loading && listaAtual.length===0 && (
          <div style={{ background:"#fff", borderRadius:20, padding:"60px 20px", textAlign:"center", color:"#aaa" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{filtroStatus==="Pendente"?"✅":"📋"}</div>
            <div style={{ fontWeight:700, fontSize:16 }}>{filtroStatus==="Pendente" ? "Nenhuma ocorrência pendente!" : "Nenhuma ocorrência resolvida ainda"}</div>
          </div>
        )}

        {!loading && listaAtual.map((oc,i) => {
          const statusAtual   = statusEdit[oc.id] ?? oc.status ?? "Pendente";
          const respostaAtual = respostas[oc.id]  ?? oc.resposta ?? "";
          const isPendente    = !oc.status || oc.status==="Pendente";
          const nomeAcaoOc    = oc.acaoNome || (oc.acaoId ? nomeAcaoFn(oc.eventoId, oc.acaoId) : null);

          return (
            <div key={i} style={{ background:"#fff", borderRadius:20, padding:22, marginBottom:16, border:`2px solid ${STATUS_COR[statusAtual]||"#E8730A"}22`, boxShadow:"0 4px 16px rgba(27,63,122,0.07)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A" }}>
                    📅 {oc.eventoNome}
                    {oc.origem==="qrcode" && <span style={{ marginLeft:8, background:"#f0fdf4", borderRadius:6, padding:"2px 8px", fontSize:10, color:"#059669", fontWeight:700 }}>via QR</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>
                    {oc.eventoData ? new Date(oc.eventoData+"T12:00:00").toLocaleDateString("pt-BR") : ""}{" · "}Registrado em {oc.data ? new Date(oc.data).toLocaleString("pt-BR") : ""}
                  </div>
                </div>
                <div style={{ background:STATUS_COR[statusAtual]+"22", borderRadius:10, padding:"4px 12px", fontSize:12, fontWeight:700, color:STATUS_COR[statusAtual]||"#E8730A" }}>{statusAtual}</div>
              </div>

              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                <span style={{ background:"#fff3e0", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#E8730A" }}>{TIPO_LABEL[oc.tipo]||oc.tipo}</span>
                {nomeAcaoOc && <span style={{ background:"#eff6ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>📚 {nomeAcaoOc}</span>}
                {oc.destinoNome && <span style={{ background:"#f0fdf4", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:600, color:"#059669" }}>{oc.destinoTipo==="grupo"?"👥":"👤"} {oc.destinoNome}</span>}
              </div>

              {(oc.nome||oc.cpf) && <div style={{ fontSize:12, color:"#888", marginBottom:8 }}>👤 {oc.nome}{oc.cpf ? ` · CPF: ${oc.cpf}` : ""}</div>}

              <div style={{ fontSize:14, color:"#333", lineHeight:1.6, marginBottom:12, background:"#f8f9fb", borderRadius:10, padding:"10px 14px" }}>{oc.descricao}</div>

              {oc.resposta && (
                <div style={{ background:"#e8f5e9", borderRadius:12, padding:"10px 14px", marginBottom:12, borderLeft:"3px solid #059669" }}>
                  <div style={{ fontSize:10, color:"#059669", fontWeight:700, marginBottom:4 }}>Resposta de {oc.respondidoPor} {oc.respondidoEm ? `· ${new Date(oc.respondidoEm).toLocaleString("pt-BR")}` : ""}</div>
                  <div style={{ fontSize:13, color:"#333" }}>{oc.resposta}</div>
                </div>
              )}

              {isPendente && (
                <div style={{ marginTop:8 }}>
                  <label style={labelStyle}>Sua resposta</label>
                  <textarea value={respostaAtual} onChange={e=>setRespostas(r=>({...r,[oc.id]:e.target.value}))} placeholder="Escreva sua resposta ou observação..." style={{ ...inputStyle, minHeight:72, resize:"vertical", marginBottom:10 }} />
                  <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                    {["Pendente","Ciente","Resolvido"].map(s=>(
                      <div key={s} onClick={()=>setStatusEdit(st=>({...st,[oc.id]:s}))} style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:12, cursor:"pointer", fontSize:12, fontWeight:700,
                        background:statusAtual===s ? STATUS_COR[s] : STATUS_COR[s]+"18", color:statusAtual===s ? "#fff" : STATUS_COR[s], border:`1px solid ${STATUS_COR[s]}44` }}>
                        {s}
                      </div>
                    ))}
                  </div>
                  <div onClick={()=>salvarResposta(oc)} style={{ background:salvando===oc.id?"#aaa":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", borderRadius:14, padding:"12px", textAlign:"center", color:"#fff", fontWeight:700, fontSize:14, cursor:salvando===oc.id?"not-allowed":"pointer" }}>
                    {salvando===oc.id ? "Salvando..." : "💾 Salvar Resposta"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showQR && <QRModal eventos={eventos} viagens={viagens} onClose={() => setShowQR(false)} />}
    </div>
  );
}
