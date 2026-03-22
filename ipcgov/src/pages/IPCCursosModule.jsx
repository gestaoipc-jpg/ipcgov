import { useState, useEffect } from "react";
import { collection, getDocs, getDoc, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE   = "service_m6wjek9";
const EMAILJS_TEMPLATE  = "template_lglpt37";
const EMAILJS_PUBLIC_KEY = "j--nV6wNKs8Pqyxlo";

const IPCURSOS_ICON = (<svg width="20" height="20" viewBox="0 0 42 42" fill="none"><rect x="8" y="6" width="18" height="24" rx="2.5" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.8"/><line x1="12" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><line x1="12" y1="16" x2="22" y2="16" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><line x1="12" y1="20" x2="18" y2="20" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><circle cx="30" cy="28" r="8" fill="rgba(255,255,255,0.35)" stroke="white" strokeWidth="1.8"/><line x1="30" y1="24" x2="30" y2="28" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><circle cx="30" cy="31" r="1.2" fill="white"/></svg>);

const STATUS_COR = {
  "Rascunho":      { cor:"#888",    bg:"#f5f5f5"  },
  "Em elaboração": { cor:"#0891b2", bg:"#f0f9ff"  },
  "Tramitado":     { cor:"#7c3aed", bg:"#f5f3ff"  },
  "Aprovado":      { cor:"#059669", bg:"#f0fdf4"  },
  "Cancelado":     { cor:"#dc2626", bg:"#fff0f0"  },
  "Arquivado":     { cor:"#555",    bg:"#f5f5f5"  },
};

const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };
const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"11px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };

export default function IPCCursosModule({ user, userInfo, onBack, onInstrutores, onFormProjeto, onDashboard }) {
  const [projetos, setProjetos]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo]     = useState("todos");
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [grupos, setGrupos]       = useState([]);
  const [servidores, setServidores] = useState([]);
  const [salvando, setSalvando]   = useState(false);
  const [justCancelamento, setJustCancelamento] = useState("");
  const [motivoReabertura, setMotivoReabertura] = useState("");
  const [motivoExclusao, setMotivoExclusao] = useState("");

  const ADMINS = ["gestaoipc@tce.ce.gov.br", "fabricio@tce.ce.gov.br"];
  const isAdminGlobal = ADMINS.includes(user?.email);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pSnap, gSnap, sSnap] = await Promise.all([
        getDocs(collection(db, "ipc_cursos_projetos")),
        getDocs(collection(db, "ipc_grupos_trabalho")),
        getDocs(collection(db, "ipc_servidores")),
      ]);
      setProjetos(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGrupos(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setServidores(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const grupoCoordEduc = grupos.find(g =>
    g.nome?.toLowerCase().includes("coordena") && g.nome?.toLowerCase().includes("educa")
  );
  const grupoCoordGestao = grupos.find(g =>
    g.nome?.toLowerCase().includes("coordena") && (g.nome?.toLowerCase().includes("infraestrutura") || g.nome?.toLowerCase().includes("gestao") || g.nome?.toLowerCase().includes("gestão"))
  );
  const grupoGerenteGestao = grupos.find(g =>
    g.nome?.toLowerCase().includes("gerên") || g.nome?.toLowerCase().includes("gerencia") && g.nome?.toLowerCase().includes("infraestrutura")
  );
  const grupoCursosAdm = grupos.find(g =>
    g.nome?.toLowerCase().includes("curso") && g.nome?.toLowerCase().includes("admin")
  );

  const isCoordEduc = isAdminGlobal || !!(grupoCoordEduc && (userInfo?.grupos||[]).includes(grupoCoordEduc.id));
  const isCoordGestao = isAdminGlobal || !!(grupoCoordGestao && (userInfo?.grupos||[]).includes(grupoCoordGestao.id));
  const isCursosAdm = !!(grupoCursosAdm && (userInfo?.grupos||[]).includes(grupoCursosAdm.id));
  const podeCriar = isAdminGlobal || isCoordEduc || isCursosAdm;

  // Emails por cargo (dinâmico — muda quando servidor mudar)
  const coordGestaoEmail = (() => {
    if (!grupoCoordGestao) return "";
    const membro = servidores.find(s => (s.grupos||[]).includes(grupoCoordGestao.id));
    return membro?.email || "";
  })();
  const coordEducEmail = (() => {
    if (!grupoCoordEduc) return "";
    const membro = servidores.find(s => (s.grupos||[]).includes(grupoCoordEduc.id) && s.email !== user?.email);
    return membro?.email || "";
  })();

  // Helper: envia email para Coord.Gestão + cópia Coord.Educação
  const enviarEmailGestao = async ({ assunto, corpo }) => {
    if (!coordGestaoEmail) return;
    await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
      to_name: "Coordenação de Gestão, Infraestrutura e Logística",
      to_email: coordGestaoEmail,
      subject: assunto,
      corpo_completo: corpo + (coordEducEmail ? "\n\n[Cópia enviada à Coordenação de Educação]" : ""),
    }, EMAILJS_PUBLIC_KEY).catch(e => console.warn("Email não enviado:", e));
    // cópia para Coord. Educação
    if (coordEducEmail && coordEducEmail !== coordGestaoEmail) {
      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        to_name: "Coordenação de Educação",
        to_email: coordEducEmail,
        subject: "[CÓPIA] " + assunto,
        corpo_completo: corpo,
      }, EMAILJS_PUBLIC_KEY).catch(e => console.warn("Cópia não enviada:", e));
    }
  };

  // Helper: registra LOG no projeto
  const registrarLog = async (projetoId, acao, detalhes) => {
    const entrada = { acao, detalhes: detalhes || "", por: user?.email || "sistema", em: new Date().toISOString() };
    try {
      const snap = await getDoc(doc(db, "ipc_cursos_projetos", projetoId));
      const logAtual = snap.data()?.log || [];
      await updateDoc(doc(db, "ipc_cursos_projetos", projetoId), { log: [...logAtual, entrada] });
    } catch(e) { console.warn("Log:", e); }
  };

  const tramitar = async (projeto) => {
    if (!window.confirm("Tramitar este projeto para o IPC Processos? Após a tramitação, o projeto ficará bloqueado para edição.")) return;
    setSalvando(true);
    try {
      await updateDoc(doc(db, "ipc_cursos_projetos", projeto.id), {
        status: "Tramitado",
        tramitadoEm: new Date().toISOString(),
        tramitadoPor: user?.email,
        atualizadoEm: new Date().toISOString(),
      });

      // Criar processo futuro
      const objetivo = "Projeto de Curso: " + projeto.nomeCurso + "\nModalidade: " + (projeto.modalidade||"") + "\nInstrutor(es): " + (projeto.instrutores||[]).map(i=>i.nome).join(", ") + "\nCarga Horária: " + (projeto.cargaHoraria||"") + "h" + (projeto.valorProposta ? "\nValor estimado: R$ " + projeto.valorProposta : "");
      await addDoc(collection(db, "processos_futuros"), {
        titulo: projeto.nomeCurso || "Projeto de Curso",
        objetivo,
        status: "Aguardando",
        tipo_processo: "IPC Cursos",
        responsavel: "",
        projetoId: projeto.id,
        distribuido: false,
        criadoEm: new Date().toISOString(),
        criadoPor: user?.email || "sistema",
        dataEvento: projeto.data || "",
      });

      // Enviar email
      if (coordGestaoEmail) {
        const corpo = "Olá!\n\nUm novo Projeto de Curso foi dado entrada no sistema IPCgov e aguarda distribuição.\n\n📚 Curso: " + (projeto.nomeCurso||"") + "\n📋 Modalidade: " + (projeto.modalidade||"") + "\n👤 Elaborado por: " + (projeto.elaboracaoProjeto||user?.email||"") + "\n📅 Data: " + (projeto.data||"A definir") + "\n\nAcesse o módulo IPC Processos → Processos Futuros para distribuir.\n\n---\nEquipe IPCgov — Instituto Plácido Castelo\nhttps://ipcgov.vercel.app";
        await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
          to_name: "Coordenação de Gestão",
          to_email: coordGestaoEmail,
          subject: "📚 Novo Projeto de Curso — " + (projeto.nomeCurso||""),
          corpo_completo: corpo,
        }, EMAILJS_PUBLIC_KEY).catch(e => console.warn("Email não enviado:", e));
      }

      setProjetos(ps => ps.map(p => p.id === projeto.id ? { ...p, status: "Tramitado", tramitadoEm: new Date().toISOString() } : p));
      setModal(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const cancelarTramitacao = async (projeto) => {
    if (!justCancelamento.trim()) { alert("Informe a justificativa do cancelamento."); return; }
    setSalvando(true);
    try {
      await updateDoc(doc(db, "ipc_cursos_projetos", projeto.id), {
        status: "Em elaboração",
        canceladoEm: new Date().toISOString(),
        canceladoPor: user?.email,
        justCancelamento: justCancelamento.trim(),
        atualizadoEm: new Date().toISOString(),
      });
      // Notify processos about cancellation
      const pfSnap = await getDocs(collection(db, "processos_futuros"));
      await Promise.all(pfSnap.docs
        .filter(d => d.data().projetoId === projeto.id && !d.data().distribuido)
        .map(d => updateDoc(doc(db, "processos_futuros", d.id), { distribuido: true, cancelado: true, justCancelamento: justCancelamento.trim() }))
      );
      setProjetos(ps => ps.map(p => p.id === projeto.id ? { ...p, status: "Em elaboração" } : p));
      setJustCancelamento("");
      setModal(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const excluir = async (projeto) => {
    const tramitado = projeto.status === "Tramitado" || projeto.status === "Aprovado";
    if (tramitado && !isAdminGlobal) { alert("Apenas administradores podem excluir projetos tramitados."); return; }
    if (!motivoExclusao.trim()) { alert("Informe o motivo da exclusão."); return; }
    if (!window.confirm("Confirmar exclusão do projeto "" + projeto.nomeCurso + ""?")) return;
    setSalvando(true);
    try {
      // LOG antes de excluir
      await registrarLog(projeto.id, "EXCLUSÃO", "Projeto excluído. Motivo: " + motivoExclusao.trim() + (tramitado ? " [PROJETO TRAMITADO]" : ""));

      if (tramitado) {
        // Arquiva processos futuros vinculados
        const pfSnap = await getDocs(collection(db, "processos_futuros"));
        await Promise.all(pfSnap.docs
          .filter(d => d.data().projetoId === projeto.id)
          .map(d => updateDoc(doc(db, "processos_futuros", d.id), { cancelado: true, arquivado: true, arquivadoPor: user?.email, arquivadoEm: new Date().toISOString(), motivoArquivamento: "Projeto de curso excluído. " + motivoExclusao.trim() }))
        );
        // Email para Coord. Gestão + cópia Coord. Educação
        const corpo = "Olá,\n\nO Projeto de Curso abaixo foi EXCLUÍDO do sistema IPCgov por um administrador.\n\n📚 Curso: " + (projeto.nomeCurso||"") + "\n📋 Modalidade: " + (projeto.modalidade||"") + "\n📅 Tramitado em: " + (projeto.tramitadoEm ? new Date(projeto.tramitadoEm).toLocaleDateString("pt-BR") : "—") + "\n🗑️ Excluído por: " + (user?.email||"") + "\n📝 Motivo: " + motivoExclusao.trim() + "\n\n⚠️ O processo de pagamento vinculado deve ser ARQUIVADO, pois o projeto foi excluído.\n\n---\nEquipe IPCgov — https://ipcgov.vercel.app";
        await enviarEmailGestao({ assunto: "🗑️ Projeto Excluído — " + (projeto.nomeCurso||""), corpo });
        // Criar aviso na caixa do IPC Processos para aceite da Coord. Gestão
        await addDoc(collection(db, "processos_futuros"), {
          titulo: "⚠️ Arquivar processo — " + (projeto.nomeCurso||""),
          objetivo: "O Projeto de Curso \"" + (projeto.nomeCurso||"") + "\" foi excluído por um administrador.\n\nMotivo: " + motivoExclusao.trim() + "\n\nO processo de pagamento vinculado deve ser arquivado.\n\nProjeto excluído por: " + (user?.email||""),
          status: "Aguardando aceite",
          tipo_processo: "Arquivamento — IPC Cursos",
          responsavel: coordGestaoEmail || "",
          projetoId: projeto.id,
          distribuido: false,
          requerAceite: true,
          criadoEm: new Date().toISOString(),
          criadoPor: user?.email || "sistema",
        });
      }
      await deleteDoc(doc(db, "ipc_cursos_projetos", projeto.id));
      setProjetos(ps => ps.filter(p => p.id !== projeto.id));
      setMotivoExclusao("");
      setModal(null);
      alert("Projeto excluído com sucesso.");
    } catch(e) { console.error(e); alert("Erro ao excluir: " + e.message); }
    setSalvando(false);
  };

  const reabrirParaEdicao = async (projeto) => {
    if (!isAdminGlobal) { alert("Apenas administradores podem reabrir projetos tramitados."); return; }
    if (!motivoReabertura.trim()) { alert("Informe o motivo da reabertura."); return; }
    setSalvando(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "ipc_cursos_projetos", projeto.id), {
        status: "Em elaboração",
        reabertoPor: user?.email,
        reabertoEm: now,
        motivoReabertura: motivoReabertura.trim(),
        tramitadoEm: null,
        atualizadoEm: now,
      });
      // Arquiva processo futuro atual
      const pfSnap = await getDocs(collection(db, "processos_futuros"));
      await Promise.all(pfSnap.docs
        .filter(d => d.data().projetoId === projeto.id && !d.data().cancelado)
        .map(d => updateDoc(doc(db, "processos_futuros", d.id), { cancelado: true, arquivado: true, arquivadoPor: user?.email, arquivadoEm: now, motivoArquivamento: "Projeto reaberto para edição. Motivo: " + motivoReabertura.trim() }))
      );
      // LOG
      await registrarLog(projeto.id, "REABERTURA PARA EDIÇÃO", "Motivo: " + motivoReabertura.trim());
      // Email
      const corpo = "Olá,\n\nO Projeto de Curso abaixo foi REABERTO para edição por um administrador.\n\n📚 Curso: " + (projeto.nomeCurso||"") + "\n📋 Modalidade: " + (projeto.modalidade||"") + "\n🔓 Reaberto por: " + (user?.email||"") + "\n📝 Motivo: " + motivoReabertura.trim() + "\n\n⚠️ O processo de pagamento atual deve ser ARQUIVADO. Um novo processo será gerado após a re-tramitação do projeto.\n\n---\nEquipe IPCgov — https://ipcgov.vercel.app";
      await enviarEmailGestao({ assunto: "🔓 Projeto Reaberto para Edição — " + (projeto.nomeCurso||""), corpo });
      // Aviso na caixa IPC Processos para aceite
      await addDoc(collection(db, "processos_futuros"), {
        titulo: "⚠️ Arquivar processo — Projeto reaberto: " + (projeto.nomeCurso||""),
        objetivo: "O Projeto de Curso \"" + (projeto.nomeCurso||"") + "\" foi reaberto para edição por um administrador.\n\nMotivo: " + motivoReabertura.trim() + "\n\nO processo de pagamento atual deve ser arquivado. Um novo processo será gerado após a re-tramitação.\n\nReaberto por: " + (user?.email||""),
        status: "Aguardando aceite",
        tipo_processo: "Arquivamento — IPC Cursos",
        responsavel: coordGestaoEmail || "",
        projetoId: projeto.id,
        distribuido: false,
        requerAceite: true,
        criadoEm: now,
        criadoPor: user?.email || "sistema",
      });
      setProjetos(ps => ps.map(p => p.id === projeto.id ? { ...p, status: "Em elaboração", reabertoEm: now } : p));
      setMotivoReabertura("");
      setModal(null);
      alert("Projeto reaberto para edição. Um novo processo será gerado após re-tramitação.");
    } catch(e) { console.error(e); alert("Erro: " + e.message); }
    setSalvando(false);
  };

  const filtrados = projetos.filter(p => {
    if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
    if (filtroTipo !== "todos" && p.modalidade !== filtroTipo) return false;
    if (busca) {
      const b = busca.toLowerCase();
      if (!((p.nomeCurso||"").toLowerCase().includes(b) || (p.modalidade||"").toLowerCase().includes(b))) return false;
    }
    return true;
  });

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 36px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20, flexShrink:0 }}>←</div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(145deg,#0891b2,#38BDF8)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 3px 10px rgba(8,145,178,0.4)" }}>{IPCURSOS_ICON}</div>
              <div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>MÓDULO</div>
                <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>IPC Cursos</div>
              </div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
              <div onClick={onInstrutores} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>👨‍🏫 Instrutores</div>
              <div onClick={onDashboard} style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>📊 Dashboard</div>
              {podeCriar && <div onClick={() => onFormProjeto(null)} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(232,115,10,0.4)" }}>+ Novo Projeto</div>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 32px 80px" }}>
        {/* STATS */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
          {[
            { label:"Total", value:projetos.length, cor:"#1B3F7A" },
            { label:"Em elaboração", value:projetos.filter(p=>p.status==="Em elaboração"||p.status==="Rascunho").length, cor:"#0891b2" },
            { label:"Tramitados", value:projetos.filter(p=>p.status==="Tramitado").length, cor:"#7c3aed" },
            { label:"Aprovados", value:projetos.filter(p=>p.status==="Aprovado").length, cor:"#059669" },
          ].map((s,i) => (
            <div key={i} style={{ background:"#fff", borderRadius:14, padding:"12px 20px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)", borderLeft:"4px solid "+s.cor }}>
              <div style={{ color:s.cor, fontWeight:900, fontSize:22 }}>{s.value}</div>
              <div style={{ color:"#888", fontSize:11, marginTop:2, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar por nome..." style={{ ...inputStyle, maxWidth:280, padding:"9px 14px" }}/>
          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} style={{ background:"#fff", border:"none", borderRadius:20, padding:"8px 16px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer", outline:"none", boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
            <option value="todos">Todos os status</option>
            {Object.keys(STATUS_COR).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} style={{ background:"#fff", border:"none", borderRadius:20, padding:"8px 16px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer", outline:"none", boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
            <option value="todos">Todos os tipos</option>
            <option value="Presencial">Presencial/Evento</option>
            <option value="EaD">EaD</option>
          </select>
          <span style={{ marginLeft:"auto", fontSize:12, color:"#aaa" }}>{filtrados.length} projeto{filtrados.length!==1?"s":""}</span>
        </div>

        {/* LISTA */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#aaa" }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📚</div>
            <div style={{ fontWeight:700, fontSize:18, color:"#1B3F7A", marginBottom:8 }}>Nenhum projeto encontrado</div>
            {podeCriar && <div style={{ color:"#aaa", fontSize:14 }}>Clique em "+ Novo Projeto" para começar.</div>}
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {filtrados.map(p => {
              const st = STATUS_COR[p.status] || { cor:"#888", bg:"#f5f5f5" };
              const tramitado = p.status === "Tramitado" || p.status === "Aprovado";
              return (
                <div key={p.id} style={{ background:"#fff", borderRadius:18, padding:"18px 22px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)", border:"1px solid #e8edf2", cursor:"pointer" }}
                  onClick={() => { setSelected(p); setModal("detalhe"); }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                        <span style={{ background:st.bg, borderRadius:8, padding:"2px 10px", fontSize:11, fontWeight:700, color:st.cor }}>{p.status||"Rascunho"}</span>
                        <span style={{ background:"#f0f4ff", borderRadius:8, padding:"2px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>{p.modalidade||"Presencial"}</span>
                        {tramitado && <span style={{ background:"#f5f3ff", borderRadius:8, padding:"2px 10px", fontSize:11, fontWeight:700, color:"#7c3aed" }}>🔒 Bloqueado</span>}
                      </div>
                      <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:4 }}>{p.nomeCurso||"Sem título"}</div>
                      <div style={{ fontSize:12, color:"#888" }}>
                        {p.cargaHoraria && <span style={{ marginRight:12 }}>⏱️ {p.cargaHoraria}h</span>}
                        {p.data && <span style={{ marginRight:12 }}>📅 {new Date(p.data+"T12:00:00").toLocaleDateString("pt-BR")}</span>}
                        {(p.instrutores||[]).length > 0 && <span>👨‍🏫 {p.instrutores.map(i=>i.nome).join(", ")}</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap" }}>
                      {/* PDF — sempre visível */}
                      <div onClick={e=>{e.stopPropagation(); setSelected(p); setModal("pdf");}} style={{ background:"#f0fdf4", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:700, color:"#059669", cursor:"pointer" }}>📄 PDF</div>
                      {!tramitado && podeCriar && (
                        <div onClick={e=>{e.stopPropagation(); onFormProjeto(p);}} style={{ background:"#f0f4ff", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>✏️ Editar</div>
                      )}
                      {!tramitado && podeCriar && (
                        <div onClick={e=>{e.stopPropagation(); setSelected(p); setModal("tramitar");}} style={{ background:"#7c3aed", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer" }}>📤 Tramitar</div>
                      )}
                      {tramitado && isAdminGlobal && (
                        <div onClick={e=>{e.stopPropagation(); setSelected(p); setMotivoReabertura(""); setModal("reabrir");}} style={{ background:"#fff3e0", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:700, color:"#E8730A", cursor:"pointer" }}>🔓 Reabrir</div>
                      )}
                      {tramitado && (isAdminGlobal || isCoordEduc) && (
                        <div onClick={e=>{e.stopPropagation(); setSelected(p); setModal("cancelar");}} style={{ background:"#fee2e2", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>↩ Cancelar Tramitação</div>
                      )}
                      {(isAdminGlobal || isCursosAdm) && (
                        <div onClick={e=>{e.stopPropagation(); setSelected(p); setMotivoExclusao(""); setModal("excluir");}} style={{ background:"#fff0f0", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>🗑️</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETALHE */}
      {modal === "detalhe" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:700, maxHeight:"90vh", overflowY:"auto", padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
              <div>
                <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A", marginBottom:4 }}>{selected.nomeCurso}</div>
                <div style={{ display:"flex", gap:8 }}>
                  <span style={{ background:(STATUS_COR[selected.status]||{bg:"#f5f5f5"}).bg, borderRadius:8, padding:"2px 10px", fontSize:11, fontWeight:700, color:(STATUS_COR[selected.status]||{cor:"#888"}).cor }}>{selected.status}</span>
                  <span style={{ background:"#f0f4ff", borderRadius:8, padding:"2px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>{selected.modalidade}</span>
                </div>
              </div>
              <div onClick={() => setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            {[
              { label:"Justificativa e Objetivo", value:selected.justificativaObjetivo },
              { label:"Eixos Temáticos", value:(selected.eixosTematicos||[]).join(", ") },
              { label:"Competências", value:(selected.competencias||[]).join(", ") },
              { label:"Programa", value:selected.programa },
              { label:"Público Alvo", value:selected.publicoAlvo },
              { label:"Carga Horária", value:selected.cargaHoraria ? selected.cargaHoraria+"h" : null },
              { label:"Data", value:selected.data ? new Date(selected.data+"T12:00:00").toLocaleDateString("pt-BR") : null },
              { label:"Horário", value:selected.horario },
              { label:"Local", value:selected.local },
              { label:"Nº Participantes", value:selected.numParticipantes },
              { label:"Conteúdo Programático", value:selected.conteudoProgramatico },
              { label:"Metas de Entrega", value:selected.metasEntrega },
              { label:"Avaliação", value:selected.avaliacao },
              { label:"Metodologia", value:selected.metodologia },
              { label:"Bibliografia", value:selected.bibliografia },
              { label:"Proposta de Valor", value:selected.valorProposta },
              { label:"Elaboração do Projeto", value:selected.elaboracaoProjeto },
            ].filter(f => f.value).map((f,i) => (
              <div key={i} style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#aaa", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>{f.label}</div>
                <div style={{ fontSize:14, color:"#333", lineHeight:1.6 }}>{f.value}</div>
              </div>
            ))}
            {(selected.instrutores||[]).length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#aaa", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Instrutores</div>
                {selected.instrutores.map((inst, i) => (
                  <div key={i} style={{ background:"#f8f9fb", borderRadius:10, padding:"10px 14px", marginBottom:6 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>{inst.nome}</div>
                    {inst.miniCurriculo && <div style={{ fontSize:12, color:"#666", marginTop:3 }}>{inst.miniCurriculo}</div>}
                    {inst.pagamento && <div style={{ fontSize:11, color:"#059669", fontWeight:700, marginTop:4 }}>💰 {inst.valorPagamento ? "R$ "+inst.valorPagamento : "Com pagamento"}</div>}
                  </div>
                ))}
              </div>
            )}
            {selected.tramitadoEm && (
              <div style={{ background:"#f5f3ff", borderRadius:12, padding:"10px 14px", marginTop:8, fontSize:12, color:"#7c3aed" }}>
                📤 Tramitado em {new Date(selected.tramitadoEm).toLocaleDateString("pt-BR")} por {selected.tramitadoPor}
              </div>
            )}
            {selected.justCancelamento && (
              <div style={{ background:"#fff0f0", borderRadius:12, padding:"10px 14px", marginTop:8, fontSize:12, color:"#dc2626" }}>
                ↩ Cancelamento: {selected.justCancelamento}
              </div>
            )}
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              {isAdminGlobal && selected.status !== "Tramitado" && (
                <div onClick={() => excluir(selected.id)} style={{ background:"#fee2e2", borderRadius:12, padding:"10px 16px", fontSize:13, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>🗑️ Excluir</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRAMITAR */}
      {modal === "tramitar" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:500, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A", marginBottom:8 }}>📤 Tramitar Projeto</div>
            <div style={{ color:"#555", fontSize:14, lineHeight:1.7, marginBottom:24 }}>
              O projeto <strong>{selected.nomeCurso}</strong> será tramitado para o IPC Processos e ficará <strong>bloqueado para edição</strong>. Um email será enviado à Coordenação de Gestão.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <div onClick={() => setModal(null)} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
              <div onClick={() => tramitar(selected)} style={{ flex:1, background: salvando?"#ccc":"linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#fff", cursor: salvando?"not-allowed":"pointer" }}>
                {salvando ? "Tramitando..." : "✅ Confirmar Tramitação"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CANCELAR TRAMITAÇÃO */}
      {modal === "cancelar" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:500, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:900, fontSize:20, color:"#dc2626", marginBottom:8 }}>↩ Cancelar Tramitação</div>
            <div style={{ color:"#555", fontSize:14, marginBottom:16 }}>Informe a justificativa para cancelar a tramitação de <strong>{selected.nomeCurso}</strong>:</div>
            <textarea
              value={justCancelamento}
              onChange={e => setJustCancelamento(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              style={{ ...inputStyle, minHeight:100, resize:"vertical", marginBottom:16 }}
            />
            <div style={{ display:"flex", gap:10 }}>
              <div onClick={() => { setModal(null); setJustCancelamento(""); }} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
              <div onClick={() => cancelarTramitacao(selected)} style={{ flex:1, background:salvando?"#ccc":"#dc2626", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:14, color:"#fff", cursor:salvando?"not-allowed":"pointer" }}>
                {salvando ? "Salvando..." : "↩ Confirmar Cancelamento"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}
      {modal === "excluir" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:900, fontSize:18, color:"#dc2626", marginBottom:8 }}>🗑️ Excluir Projeto</div>
            <div style={{ fontSize:13, color:"#555", marginBottom:12 }}>Projeto: <strong>{selected.nomeCurso}</strong></div>
            {(selected.status === "Tramitado" || selected.status === "Aprovado") && (
              <div style={{ background:"#fff0f0", border:"1px solid #fca5a5", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#dc2626", fontWeight:600, marginBottom:12 }}>
                ⚠️ Este projeto está tramitado. Ao excluir, o processo de pagamento será arquivado e a Coordenação de Gestão será notificada.
              </div>
            )}
            <div style={{ fontSize:13, color:"#888", marginBottom:8 }}>Informe o motivo da exclusão:</div>
            <textarea value={motivoExclusao} onChange={e=>setMotivoExclusao(e.target.value)} placeholder="Motivo obrigatório..." rows={3}
              style={{ ...inputStyle, minHeight:80, resize:"vertical", marginBottom:4 }}/>
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <div onClick={() => { setModal(null); setMotivoExclusao(""); }} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
              <div onClick={() => excluir(selected)} style={{ flex:1, background:salvando?"#ccc":"#dc2626", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:salvando?"not-allowed":"pointer" }}>{salvando?"Excluindo...":"🗑️ Confirmar"}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REABRIR PARA EDIÇÃO */}
      {modal === "reabrir" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:500, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:900, fontSize:18, color:"#E8730A", marginBottom:8 }}>🔓 Reabrir para Edição</div>
            <div style={{ fontSize:13, color:"#555", marginBottom:12 }}>Projeto: <strong>{selected.nomeCurso}</strong></div>
            <div style={{ background:"#fff3e0", border:"1px solid #fcd34d", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#92400e", fontWeight:600, marginBottom:12 }}>
              ⚠️ O processo de pagamento atual será arquivado. Um novo processo será gerado após re-tramitação. A Coordenação de Gestão será notificada.
            </div>
            <div style={{ fontSize:13, color:"#888", marginBottom:8 }}>Informe o motivo da reabertura:</div>
            <textarea value={motivoReabertura} onChange={e=>setMotivoReabertura(e.target.value)} placeholder="Motivo obrigatório..." rows={3}
              style={{ ...inputStyle, minHeight:80, resize:"vertical", marginBottom:4 }}/>
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <div onClick={() => { setModal(null); setMotivoReabertura(""); }} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
              <div onClick={() => reabrirParaEdicao(selected)} style={{ flex:1, background:salvando?"#ccc":"#E8730A", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:salvando?"not-allowed":"pointer" }}>{salvando?"Processando...":"🔓 Confirmar Reabertura"}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PDF DA LISTA */}
      {modal === "pdf" && selected && (() => {
        const p = selected;
        const gerarPDFLista = () => {
          const eixosTodos = ["Gestão Pública","Licitações e Contratos","Controle Interno","Cidadania e Participação Social","Tecnologia e Inovação","Gestão de Pessoas","Planejamento Estratégico","Transparência e Acesso à Informação","Controle Social","Meio Ambiente e Sustentabilidade","Saúde Pública","Educação","Assistência Social","Finanças Públicas","Obras e Serviços","Segurança Pública","Legislação Municipal","Outros"];
          const eixos = p.eixosTematicos||[];
          const insts = p.instrutores||[];
          const html = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Projeto de Curso</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#222;font-size:13px} h1{font-size:16px;text-align:center;text-transform:uppercase;border-bottom:2px solid #1B3F7A;padding-bottom:8px;margin-bottom:20px} .section{margin-bottom:16px} .label{font-weight:700;font-size:11px;text-transform:uppercase;color:#1B3F7A;letter-spacing:1px;margin-bottom:4px} .value{border:1px solid #ddd;border-radius:4px;padding:8px;min-height:36px;background:#fafafa} .checkbox-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:4px} .cb{display:flex;align-items:center;gap:6px;padding:3px 0} @page{margin:20mm}</style></head><body>" +
            "<h1>Projeto de Curso — " + (p.nomeCurso||"") + "</h1>" +
            "<div class='section'><div class='label'>Modalidade</div><div class='value'>" + (p.modalidade||"") + "</div></div>" +
            "<div class='section'><div class='label'>Carga Horária</div><div class='value'>" + (p.cargaHoraria||"") + "h</div></div>" +
            "<div class='section'><div class='label'>Data / Horário / Local</div><div class='value'>" + [p.data?new Date(p.data+"T12:00:00").toLocaleDateString("pt-BR"):"",p.horario||"",p.local||""].filter(Boolean).join(" · ") + "</div></div>" +
            "<div class='section'><div class='label'>Número de Participantes</div><div class='value'>" + (p.numParticipantes||"") + "</div></div>" +
            "<div class='section'><div class='label'>Eixos Temáticos</div><div class='value checkbox-grid'>" + eixosTodos.map(e => "<div class='cb'><span>" + (eixos.includes(e)?"☑":"☐") + "</span><span>" + e + "</span></div>").join("") + "</div></div>" +
            "<div class='section'><div class='label'>Competências</div><div class='value'>" + (p.competencias||[]).join(", ") + "</div></div>" +
            "<div class='section'><div class='label'>Instrutores</div><div class='value'>" + insts.map(i => i.nome + (i.pagamento?" — R$ "+i.pagamento:"")).join("<br/>") + "</div></div>" +
            (p.conteudoProgramatico?"<div class='section'><div class='label'>Conteúdo Programático</div><div class='value'>" + p.conteudoProgramatico + "</div></div>":"") +
            (p.metasEntrega?"<div class='section'><div class='label'>Metas de Entrega</div><div class='value'>" + p.metasEntrega + "</div></div>":"") +
            "<div class='section'><div class='label'>Status</div><div class='value'>" + (p.status||"") + (p.tramitadoEm?" · Tramitado em "+new Date(p.tramitadoEm).toLocaleDateString("pt-BR"):"") + "</div></div>" +
            "</body></html>";
          const win = window.open("","_blank");
          if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 600); }
          setModal(null);
        };
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setModal(null)}>
            <div style={{ background:"#fff", borderRadius:24, padding:32, maxWidth:380, width:"100%" }} onClick={e=>e.stopPropagation()}>
              <div style={{ fontWeight:900, fontSize:18, color:"#059669", marginBottom:8 }}>📄 Gerar PDF</div>
              <div style={{ fontSize:14, color:"#555", marginBottom:6 }}><strong>{p.nomeCurso}</strong></div>
              <div style={{ fontSize:12, color:"#888", marginBottom:20 }}>{p.modalidade} · {p.cargaHoraria}h · {p.status}</div>
              <div style={{ display:"flex", gap:10 }}>
                <div onClick={() => setModal(null)} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:12, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
                <div onClick={gerarPDFLista} style={{ flex:2, background:"#059669", borderRadius:14, padding:12, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:"pointer" }}>📄 Gerar PDF</div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
