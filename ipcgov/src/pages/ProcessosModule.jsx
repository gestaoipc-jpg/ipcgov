import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const STATUS_PADRAO = ["Aguardando","Em Análise","Em Tramitação","Aguardando Documentos","Aguardando Assinatura","Aguardando Outra Área","Concluído","Arquivado","Cancelado"];
const PRIORIDADE_PADRAO = ["Alta","Média","Baixa"];
const COR_STATUS = {
  "Aguardando": "#aaa", "Em Análise": "#1B3F7A", "Em Tramitação": "#0891b2",
  "Aguardando Documentos": "#E8730A", "Aguardando Assinatura": "#d97706",
  "Aguardando Outra Área": "#7c3aed", "Concluído": "#059669",
  "Arquivado": "#555", "Cancelado": "#dc2626",
};
const COR_PRIORIDADE = { "Alta": "#dc2626", "Média": "#E8730A", "Baixa": "#059669" };

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}
function diasRestantes(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

const PROC_ICON = (<svg width="20" height="20" viewBox="0 0 42 42" fill="none"><rect x="10" y="9" width="13" height="17" rx="2.5" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.8"/><rect x="19" y="16" width="13" height="17" rx="2.5" fill="rgba(255,255,255,0.35)" stroke="white" strokeWidth="1.8"/><line x1="13" y1="15" x2="19" y2="15" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><line x1="13" y1="18.5" x2="19" y2="18.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><line x1="22" y1="22" x2="28" y2="22" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><line x1="22" y1="25.5" x2="28" y2="25.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>);

export default function ProcessosModule({ user, userInfo, onBack, onFiltros, onKanban, onRelatorio, onAdminAlertas, onDashboard }) {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [novaOcorrencia, setNovaOcorrencia] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todas");
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [statusCustom, setStatusCustom] = useState([]);
  const [filtrosCustom, setFiltrosCustom] = useState([]); // todos os filtros tipo custom
  const [grupoProcessos, setGrupoProcessos] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pSnap, fSnap] = await Promise.all([
        getDocs(collection(db, "processos")),
        getDocs(collection(db, "processos_filtros")),
      ]);
      setProcessos(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const filtros = fSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const statusF = filtros.find(f => f.tipo === "status");
      if (statusF?.opcoes) setStatusCustom(statusF.opcoes);
      setFiltrosCustom(filtros.filter(f => f.tipo === "custom"));
      // Carregar grupo Processo Administrativo
      const gSnap = await getDocs(collection(db, "ipc_grupos_trabalho"));
      const gPA = gSnap.docs.map(d=>({id:d.id,...d.data()})).find(g => g.nome?.toLowerCase().replace(/\s+/g," ").includes("processo") && g.nome?.toLowerCase().includes("admin"));
      setGrupoProcessos(gPA || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const statusOpcoes = statusCustom.length > 0 ? statusCustom : STATUS_PADRAO;

  // Permissão: admin global OU membro do grupo Processo Administrativo
  const podeEditar = userInfo?.isAdminGlobal || (grupoProcessos && (userInfo?.grupos||[]).includes(grupoProcessos.id));

  const registrarLog = async (acao, processoId, detalhes) => {
    try {
      await addDoc(collection(db, "processos_log"), {
        acao,
        processoId: processoId || null,
        detalhes: detalhes || {},
        usuario: user?.email || "—",
        usuarioNome: userInfo?.servidorNome || user?.displayName || user?.email || "—",
        ip: null,
        timestamp: new Date().toISOString(),
      });
    } catch(e) { console.warn("Log não registrado:", e); }
  };

  const abrirNovo = () => { setForm({ status: "Aguardando", prioridade: "Média", ocorrencias: [] }); setSelected(null); setModal("form"); };
  const abrirEditar = (p) => { setForm({ ...p }); setSelected(p); setModal("form"); };
  const abrirDetalhe = (p) => { setSelected(p); setModal("detalhe"); };

  const salvar = async () => {
    if (!form.numero && !form.titulo) return;
    setSalvando(true);
    try {
      const dados = { ...form, atualizadoEm: new Date().toISOString(), ocorrencias: form.ocorrencias || [] };
      if (selected) {
        await updateDoc(doc(db, "processos", selected.id), dados);
        setProcessos(p => p.map(x => x.id === selected.id ? { ...x, ...dados } : x));
        await registrarLog("editar", selected.id, { titulo: dados.titulo, status: dados.status });
      } else {
        dados.criadoEm = new Date().toISOString();
        dados.criadoPor = user?.email || "sistema";
        const ref = await addDoc(collection(db, "processos"), dados);
        setProcessos(p => [{ id: ref.id, ...dados }, ...p]);
        await registrarLog("criar", ref.id, { titulo: dados.titulo });
      }
      setModal(null); setForm({});
    } catch (e) { console.error(e); }
    setSalvando(false);
  };

  const deletar = async (id) => {
    if (!window.confirm("Excluir processo? Esta ação será registrada em log.")) return;
    const proc = processos.find(x => x.id === id);
    await deleteDoc(doc(db, "processos", id));
    await registrarLog("excluir", id, { titulo: proc?.titulo, numero: proc?.numero });
    setProcessos(p => p.filter(x => x.id !== id));
    setModal(null);
  };

  const adicionarOcorrencia = async () => {
    if (!novaOcorrencia.trim() || !selected) return;
    const oc = { texto: novaOcorrencia.trim(), data: new Date().toISOString(), autor: user?.email || "sistema" };
    const novas = [...(selected.ocorrencias || []), oc];
    await updateDoc(doc(db, "processos", selected.id), { ocorrencias: novas });
    const atualizado = { ...selected, ocorrencias: novas };
    setProcessos(p => p.map(x => x.id === selected.id ? atualizado : x));
    setSelected(atualizado);
    setNovaOcorrencia("");
  };

  const mudarStatus = async (p, novoStatus) => {
    await updateDoc(doc(db, "processos", p.id), { status: novoStatus, atualizadoEm: new Date().toISOString() });
    setProcessos(ps => ps.map(x => x.id === p.id ? { ...x, status: novoStatus } : x));
    if (selected?.id === p.id) setSelected(s => ({ ...s, status: novoStatus }));
  };

  const filtrados = processos.filter(p => {
    if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
    if (filtroPrioridade !== "todas" && p.prioridade !== filtroPrioridade) return false;
    if (busca) {
      const b = busca.toLowerCase();
      if (!( (p.numero||"").toLowerCase().includes(b) || (p.protocolo||"").toLowerCase().includes(b) || (p.titulo||"").toLowerCase().includes(b) || (p.objetivo||"").toLowerCase().includes(b) )) return false;
    }
    return true;
  });

  const contadores = {};
  statusOpcoes.forEach(s => { contadores[s] = processos.filter(p => p.status === s).length; });
  const atrasados = processos.filter(p => { const d = diasRestantes(p.dataSaida); return d !== null && d < 0 && p.status !== "Concluído" && p.status !== "Arquivado"; });
  const urgentes = processos.filter(p => { const d = diasRestantes(p.dataSaida); return d !== null && d >= 0 && d <= 5 && p.status !== "Concluído" && p.status !== "Arquivado"; });

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px} select,input,textarea{font-family:'Montserrat',sans-serif}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px" }}>
        <div style={{ maxWidth:1300, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20, flexShrink:0 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>MÓDULO</div>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(145deg,#047857,#34D399)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 3px 10px rgba(4,120,87,0.4)" }}>{PROC_ICON}</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>MÓDULO</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>IPC Processos</div>
            </div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
              <div onClick={onAdminAlertas} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>🔔 Alertas</div>
              <div onClick={onFiltros} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>⚙️ Filtros</div>
              <div onClick={onKanban} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>📋 Kanban</div>
              <div onClick={onRelatorio} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>📄 Relatório</div>
              <div onClick={onDashboard} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>📊 Dashboard</div>
              {podeEditar && <div onClick={abrirNovo} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(232,115,10,0.4)" }}>+ Novo Processo</div>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"24px 32px 80px" }}>
        {/* STATS */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
          {[
            { label:"Total", value:processos.length, cor:"#1B3F7A" },
            { label:"Em Andamento", value:processos.filter(p=>!["Concluído","Arquivado","Cancelado"].includes(p.status)).length, cor:"#0891b2" },
            { label:"Concluídos", value:contadores["Concluído"]||0, cor:"#059669" },
            { label:"Atrasados", value:atrasados.length, cor:atrasados.length>0?"#dc2626":"#aaa" },
            { label:"Urgentes (≤5d)", value:urgentes.length, cor:urgentes.length>0?"#E8730A":"#aaa" },
          ].map((s,i) => (
            <div key={i} style={{ background:"#fff", borderRadius:14, padding:"12px 20px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)", borderLeft:`4px solid ${s.cor}` }}>
              <div style={{ color:s.cor, fontWeight:900, fontSize:22 }}>{s.value}</div>
              <div style={{ color:"#888", fontSize:11, marginTop:2, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* FILTROS + BUSCA */}
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar por número, protocolo, título..." style={{ ...inputStyle, maxWidth:320, padding:"9px 14px" }} />
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ background:"#fff", border:"none", borderRadius:20, padding:"8px 16px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer", outline:"none", boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
            <option value="todos">Todos os status</option>
            {statusOpcoes.map(s => <option key={s} value={s}>{s} ({contadores[s]||0})</option>)}
          </select>
          <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)} style={{ background:"#fff", border:"none", borderRadius:20, padding:"8px 16px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer", outline:"none", boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
            <option value="todas">Todas as prioridades</option>
            {PRIORIDADE_PADRAO.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(filtroStatus !== "todos" || filtroPrioridade !== "todas" || busca) && (
            <div onClick={() => { setFiltroStatus("todos"); setFiltroPrioridade("todas"); setBusca(""); }} style={{ background:"#fee2e2", borderRadius:20, padding:"8px 14px", fontSize:12, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>✕ Limpar</div>
          )}
          <span style={{ marginLeft:"auto", fontSize:12, color:"#aaa" }}>{filtrados.length} processo{filtrados.length!==1?"s":""}</span>
        </div>

        {/* LISTA */}
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando processos...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign:"center", padding:60 }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📁</div>
            <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum processo encontrado</div>
            <div onClick={abrirNovo} style={{ display:"inline-block", background:"#1B3F7A", borderRadius:14, padding:"12px 24px", color:"#fff", fontWeight:700, cursor:"pointer", marginTop:12 }}>+ Novo Processo</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {filtrados.sort((a,b) => {
              const ord = {"Alta":0,"Média":1,"Baixa":2};
              return (ord[a.prioridade]??1)-(ord[b.prioridade]??1);
            }).map(p => {
              const dias = diasRestantes(p.dataSaida);
              const atrasado = dias !== null && dias < 0 && !["Concluído","Arquivado"].includes(p.status);
              const urgente = dias !== null && dias >= 0 && dias <= 5 && !["Concluído","Arquivado"].includes(p.status);
              return (
                <div key={p.id} onClick={() => abrirDetalhe(p)} style={{
                  background:"#fff", borderRadius:18, padding:"18px 22px",
                  boxShadow:"0 2px 12px rgba(27,63,122,0.07)", cursor:"pointer",
                  border: atrasado?"2px solid #dc262630":urgente?"2px solid #E8730A30":"2px solid transparent",
                  display:"flex", alignItems:"center", gap:16, transition:"transform 0.15s, box-shadow 0.15s",
                }} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(27,63,122,0.13)"}}
                   onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 12px rgba(27,63,122,0.07)"}}>

                  <div style={{ width:4, alignSelf:"stretch", borderRadius:4, background:COR_PRIORIDADE[p.prioridade]||"#aaa", flexShrink:0 }}/>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
                      {p.numero && <div style={{ background:"#f0f4ff", borderRadius:8, padding:"2px 10px", fontSize:12, fontWeight:700, color:"#1B3F7A" }}>Nº {p.numero}</div>}
                      {p.protocolo && <div style={{ background:"#f5f3ff", borderRadius:8, padding:"2px 10px", fontSize:12, fontWeight:700, color:"#7c3aed" }}>Prot. {p.protocolo}</div>}
                      <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{p.titulo}</div>
                    </div>
                    {p.objetivo && <div style={{ color:"#888", fontSize:13, marginBottom:7, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.objetivo}</div>}
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                      <div style={{ background:(COR_STATUS[p.status]||"#aaa")+"18", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:COR_STATUS[p.status]||"#aaa" }}>{p.status}</div>
                      <div style={{ background:(COR_PRIORIDADE[p.prioridade]||"#aaa")+"18", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:COR_PRIORIDADE[p.prioridade]||"#aaa" }}>⚡ {p.prioridade}</div>
                      {p.responsavel && <div style={{ fontSize:11, color:"#888" }}>👤 {p.responsavel}</div>}
                      {p.dataEntrada && <div style={{ fontSize:11, color:"#888" }}>📥 {formatDate(p.dataEntrada)}</div>}
                      {p.dataSaida && <div style={{ fontSize:11, color:atrasado?"#dc2626":urgente?"#E8730A":"#888", fontWeight:atrasado||urgente?700:400 }}>
                        📤 {formatDate(p.dataSaida)}{dias!==null?` (${atrasado?`${Math.abs(dias)}d atraso`:dias===0?"hoje":`${dias}d`})`:""}</div>}
                      {(p.ocorrencias||[]).length>0 && <div style={{ fontSize:11, color:"#E8730A" }}>⚠️ {p.ocorrencias.length} ocorrência{p.ocorrencias.length>1?"s":""}</div>}
                    </div>
                  </div>

                  <select value={p.status} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();mudarStatus(p,e.target.value);}} style={{ background:(COR_STATUS[p.status]||"#aaa")+"18", border:`1px solid ${(COR_STATUS[p.status]||"#aaa")}40`, borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:700, color:COR_STATUS[p.status]||"#aaa", cursor:"pointer", outline:"none", flexShrink:0 }}>
                    {statusOpcoes.map(s => <option key={s} value={s} style={{ color:"#1B3F7A", background:"#fff" }}>{s}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETALHE */}
      {modal==="detalhe" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:700, maxHeight:"90vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 28px", borderRadius:"24px 24px 0 0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:2, marginBottom:4 }}>PROCESSO</div>
                  <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>{selected.titulo}</div>
                  <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                    {selected.numero && <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:8, padding:"3px 10px", color:"#fff", fontSize:12, fontWeight:700 }}>Nº {selected.numero}</div>}
                    {selected.protocolo && <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:8, padding:"3px 10px", color:"#fff", fontSize:12, fontWeight:700 }}>Prot. {selected.protocolo}</div>}
                    <div style={{ background:(COR_STATUS[selected.status]||"#aaa")+"40", border:`1px solid ${(COR_STATUS[selected.status]||"#aaa")}60`, borderRadius:8, padding:"3px 10px", color:"#fff", fontSize:12, fontWeight:700 }}>{selected.status}</div>
                    <div style={{ background:(COR_PRIORIDADE[selected.prioridade]||"#aaa")+"40", borderRadius:8, padding:"3px 10px", color:"#fff", fontSize:12, fontWeight:700 }}>⚡ {selected.prioridade}</div>
                  </div>
                </div>
                <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"rgba(255,255,255,0.15)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:18, flexShrink:0 }}>✕</div>
              </div>
            </div>

            <div style={{ padding:"24px 28px" }}>
              {/* INFO GRID */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
                {[
                  { label:"Responsável", value:selected.responsavel, icon:"👤" },
                  { label:"Data de Entrada", value:formatDate(selected.dataEntrada), icon:"📥" },
                  { label:"Prazo/Saída", value:formatDate(selected.dataSaida), icon:"📤" },
                  { label:"Área Destino", value:selected.areaDestino, icon:"🏢" },
                  { label:"Valor", value:selected.valor ? `R$ ${selected.valor}` : null, icon:"💰" },
                  { label:"Protocolo eTCE", value:formatDate(selected.dataProtocoloEtce), icon:"📋" },
                  { label:"Criado por", value:selected.criadoPor, icon:"✍️" },
                  { label:"Atualizado em", value:formatDateTime(selected.atualizadoEm), icon:"🔄" },
                ].filter(f=>f.value&&f.value!=="—").map((f,i)=>(
                  <div key={i} style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px" }}>
                    <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{f.icon} {f.label}</div>
                    <div style={{ color:"#1B3F7A", fontWeight:600, fontSize:13 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {selected.objetivo && (
                <div style={{ marginBottom:20, background:"#f8f9fb", borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>🎯 Objetivo</div>
                  <div style={{ color:"#333", fontSize:14, lineHeight:1.6 }}>{selected.objetivo}</div>
                </div>
              )}

              {selected.observacoes && (
                <div style={{ marginBottom:20, background:"#f5f3ff", borderRadius:12, padding:"14px 16px", borderLeft:"3px solid #7c3aed" }}>
                  <div style={{ color:"#7c3aed", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>💬 Observações</div>
                  <div style={{ color:"#333", fontSize:14, lineHeight:1.6 }}>{selected.observacoes}</div>
                </div>
              )}

              {/* CAMPOS DINÂMICOS — filtros custom */}
              {filtrosCustom.filter(f => selected[f.nome.toLowerCase().replace(/\s+/g,"_")]).length > 0 && (
                <div style={{ marginBottom:20, background:"#f0f4ff", borderRadius:12, padding:"14px 16px", borderLeft:"3px solid #1B3F7A" }}>
                  <div style={{ color:"#1B3F7A", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>📋 Informações Adicionais</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {filtrosCustom.map(f => {
                      const chave = f.nome.toLowerCase().replace(/\s+/g,"_");
                      if (!selected[chave]) return null;
                      return (
                        <div key={f.id} style={{ background:"#fff", borderRadius:8, padding:"6px 12px", border:"1px solid #e8edf2" }}>
                          <div style={{ fontSize:9, color:"#888", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>{f.nome}</div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#1B3F7A" }}>{selected[chave]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OCORRÊNCIAS */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A", marginBottom:12 }}>⚠️ Ocorrências ({(selected.ocorrencias||[]).length})</div>
                {(selected.ocorrencias||[]).length===0?(
                  <div style={{ background:"#f8f9fb", borderRadius:12, padding:16, textAlign:"center", color:"#aaa", fontSize:13 }}>Nenhuma ocorrência registrada</div>
                ):(selected.ocorrencias||[]).map((oc,i)=>(
                  <div key={i} style={{ background:"#fff3e0", borderRadius:12, padding:"12px 14px", marginBottom:8, border:"1px solid #ffe0b2" }}>
                    <div style={{ fontSize:12, color:"#E8730A", fontWeight:700, marginBottom:4 }}>{new Date(oc.data).toLocaleDateString("pt-BR")} · {oc.autor}</div>
                    <div style={{ fontSize:13, color:"#333" }}>{oc.texto}</div>
                  </div>
                ))}
                <div style={{ display:"flex", gap:10, marginTop:10 }}>
                  <input value={novaOcorrencia} onChange={e=>setNovaOcorrencia(e.target.value)} placeholder="Registrar ocorrência..." style={{ ...inputStyle, flex:1 }} onKeyDown={e=>e.key==="Enter"&&adicionarOcorrencia()} />
                  <div onClick={adicionarOcorrencia} style={{ background:"#E8730A", borderRadius:12, padding:"0 16px", display:"flex", alignItems:"center", color:"#fff", fontWeight:700, fontSize:20, cursor:"pointer", flexShrink:0 }}>+</div>
                </div>
              </div>

              {/* AÇÕES */}
              <div style={{ display:"flex", gap:10 }}>
                {podeEditar && <button onClick={()=>abrirEditar(selected)} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✏️ Editar</button>}
                <button onClick={()=>onRelatorio&&onRelatorio(selected.id)} style={{ flex:1, background:"#f0f4ff", border:"none", borderRadius:14, padding:14, color:"#1B3F7A", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>📄 Relatório</button>
                {podeEditar && <button onClick={()=>deletar(selected.id)} style={{ background:"#fee2e2", border:"none", borderRadius:14, padding:"14px 18px", color:"#dc2626", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>🗑️</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {modal==="form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:680, maxHeight:"92vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"28px 32px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar Processo":"➕ Novo Processo"}</div>
                <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div>
                  <label style={labelStyle}>Número do Processo</label>
                  <input value={form.numero||""} onChange={e=>setForm(f=>({...f,numero:e.target.value}))} placeholder="Ex: 001/2026" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Número do Protocolo</label>
                  <input value={form.protocolo||""} onChange={e=>setForm(f=>({...f,protocolo:e.target.value}))} placeholder="Ex: PROT-2026-001" style={inputStyle}/>
                </div>
                {(() => {
                  const tipoFiltro = filtrosCustom.find(f => f.nome.toLowerCase().includes("tipo") && f.nome.toLowerCase().includes("processo"));
                  if (!tipoFiltro) return null;
                  const chave = tipoFiltro.nome.toLowerCase().replace(/\s+/g,"_");
                  return (
                    <div style={{ gridColumn:"1 / -1" }} key={tipoFiltro.id}>
                      <label style={labelStyle}>{tipoFiltro.nome}</label>
                      <select value={form[chave]||""} onChange={e=>setForm(f=>({...f,[chave]:e.target.value}))} style={inputStyle}>
                        <option value="">Selecione...</option>
                        {(tipoFiltro.opcoes||[]).map(op=><option key={op} value={op}>{op}</option>)}
                      </select>
                    </div>
                  );
                })()}
                <div style={{ gridColumn:"1 / -1" }}>
                  <label style={labelStyle}>Título / Assunto *</label>
                  <input value={form.titulo||""} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Ex: Renovação de contrato fornecedor X" style={inputStyle}/>
                </div>
                <div style={{ gridColumn:"1 / -1" }}>
                  <label style={labelStyle}>Objetivo</label>
                  <textarea value={form.objetivo||""} onChange={e=>setForm(f=>({...f,objetivo:e.target.value}))} placeholder="Descreva o objetivo do processo..." style={{ ...inputStyle, minHeight:80, resize:"vertical" }}/>
                </div>
                <div>
                  <label style={labelStyle}>Valor (R$)</label>
                  <input value={form.valor||""} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} placeholder="Ex: 15.000,00" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Data Protocolo no eTCE</label>
                  <input type="date" value={form.dataProtocoloEtce||""} onChange={e=>setForm(f=>({...f,dataProtocoloEtce:e.target.value}))} style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status||"Aguardando"} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={inputStyle}>
                    {statusOpcoes.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Prioridade</label>
                  <select value={form.prioridade||"Média"} onChange={e=>setForm(f=>({...f,prioridade:e.target.value}))} style={inputStyle}>
                    {PRIORIDADE_PADRAO.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Responsável</label>
                  <input value={form.responsavel||""} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} placeholder="Nome do responsável" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Área Destino</label>
                  <input value={form.areaDestino||""} onChange={e=>setForm(f=>({...f,areaDestino:e.target.value}))} placeholder="Ex: Jurídico, Financeiro..." style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Data de Entrada</label>
                  <input type="date" value={form.dataEntrada||""} onChange={e=>setForm(f=>({...f,dataEntrada:e.target.value}))} style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Prazo / Data de Saída</label>
                  <input type="date" value={form.dataSaida||""} onChange={e=>setForm(f=>({...f,dataSaida:e.target.value}))} style={inputStyle}/>
                </div>
                <div style={{ gridColumn:"1 / -1" }}>
                  <label style={labelStyle}>Observações</label>
                  <textarea value={form.observacoes||""} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} placeholder="Observações gerais..." style={{ ...inputStyle, minHeight:70, resize:"vertical" }}/>
                </div>
                {filtrosCustom.filter(f => !(f.nome.toLowerCase().includes("tipo") && f.nome.toLowerCase().includes("processo"))).map(filtro => {
                  const chave = filtro.nome.toLowerCase().replace(/\s+/g,"_");
                  return (
                    <div key={filtro.id}>
                      <label style={labelStyle}>{filtro.nome}</label>
                      {filtro.opcoes?.length > 0 ? (
                        <select value={form[chave]||""} onChange={e=>setForm(f=>({...f,[chave]:e.target.value}))} style={inputStyle}>
                          <option value="">Selecione...</option>
                          {filtro.opcoes.map(op=><option key={op} value={op}>{op}</option>)}
                        </select>
                      ) : (
                        <input value={form[chave]||""} onChange={e=>setForm(f=>({...f,[chave]:e.target.value}))} placeholder={filtro.descricao||filtro.nome} style={inputStyle}/>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={salvar} disabled={salvando||!form.titulo} style={{ width:"100%", marginTop:20, background:salvando||!form.titulo?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.titulo?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                {salvando?"Salvando...":"💾 Salvar Processo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
