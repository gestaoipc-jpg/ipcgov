import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const STATUS_PADRAO = ["Aguardando","Em Andamento","Aguardando Gravação","Em Edição","Enviado para Libras","Revisão","Concluído","Cancelado"];
const PRIORIDADE_PADRAO = ["Alta","Média","Baixa"];
const COR_STATUS = {
  "Aguardando": "#aaa",
  "Em Andamento": "#1B3F7A",
  "Aguardando Gravação": "#7c3aed",
  "Em Edição": "#E8730A",
  "Enviado para Libras": "#0891b2",
  "Revisão": "#d97706",
  "Concluído": "#059669",
  "Cancelado": "#dc2626",
};
const COR_PRIORIDADE = { "Alta": "#dc2626", "Média": "#E8730A", "Baixa": "#059669" };

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function diasRestantes(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

const inputStyle = {
  width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2",
  borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A",
  outline: "none", fontFamily: "'Montserrat', sans-serif",
};
const labelStyle = {
  display: "block", color: "#888", fontSize: 11, letterSpacing: 1,
  textTransform: "uppercase", marginBottom: 6, fontWeight: 600,
};

const DESIGNER_ICON = ({DESIGNER_ICON});

export default function DesignerModule({ user, onBack, onFiltros, onKanban, onSolicitacoes, onDashboard }) {
  const [atividades, setAtividades] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "form" | "detalhe" | "ocorrencia"
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [novaOcorrencia, setNovaOcorrencia] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todas");
  const [filtroDesigner, setFiltroDesigner] = useState("todos");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ativSnap, equipeSnap] = await Promise.all([
        getDocs(collection(db, "designer_atividades")),
        getDocs(collection(db, "tceduc_equipe")),
      ]);
      setAtividades(ativSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEquipe(equipeSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const abrirNova = () => {
    setForm({ status: "Aguardando", prioridade: "Média", ocorrencias: [] });
    setSelected(null);
    setModal("form");
  };

  const abrirEditar = (at) => {
    setForm({ ...at });
    setSelected(at);
    setModal("form");
  };

  const abrirDetalhe = (at) => {
    setSelected(at);
    setModal("detalhe");
  };

  const salvar = async () => {
    if (!form.titulo) return;
    setSalvando(true);
    try {
      const dados = {
        ...form,
        atualizadoEm: new Date().toISOString(),
        ocorrencias: form.ocorrencias || [],
      };
      if (selected) {
        await updateDoc(doc(db, "designer_atividades", selected.id), dados);
        setAtividades(a => a.map(at => at.id === selected.id ? { ...at, ...dados } : at));
      } else {
        dados.criadoEm = new Date().toISOString();
        dados.criadoPor = user?.email || "sistema";
        const ref = await addDoc(collection(db, "designer_atividades"), dados);
        setAtividades(a => [{ id: ref.id, ...dados }, ...a]);
      }
      setModal(null); setForm({});
    } catch (e) { console.error(e); }
    setSalvando(false);
  };

  const deletar = async (id) => {
    if (!window.confirm("Excluir atividade?")) return;
    await deleteDoc(doc(db, "designer_atividades", id));
    setAtividades(a => a.filter(at => at.id !== id));
    setModal(null);
  };

  const adicionarOcorrencia = async () => {
    if (!novaOcorrencia.trim() || !selected) return;
    const oc = {
      texto: novaOcorrencia.trim(),
      data: new Date().toISOString(),
      autor: user?.email || "sistema",
    };
    const novas = [...(selected.ocorrencias || []), oc];
    await updateDoc(doc(db, "designer_atividades", selected.id), { ocorrencias: novas });
    const atualizada = { ...selected, ocorrencias: novas };
    setAtividades(a => a.map(at => at.id === selected.id ? atualizada : at));
    setSelected(atualizada);
    setNovaOcorrencia("");
  };

  const mudarStatus = async (at, novoStatus) => {
    await updateDoc(doc(db, "designer_atividades", at.id), { status: novoStatus, atualizadoEm: new Date().toISOString() });
    setAtividades(a => a.map(x => x.id === at.id ? { ...x, status: novoStatus } : x));
    if (selected?.id === at.id) setSelected(s => ({ ...s, status: novoStatus }));
  };

  // Filtros
  const filtradas = atividades.filter(a => {
    if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
    if (filtroPrioridade !== "todas" && a.prioridade !== filtroPrioridade) return false;
    if (filtroDesigner !== "todos" && a.designer !== filtroDesigner) return false;
    return true;
  });

  const designers = [...new Set(atividades.map(a => a.designer).filter(Boolean))];

  // Contadores por status
  const contadores = {};
  STATUS_PADRAO.forEach(s => { contadores[s] = atividades.filter(a => a.status === s).length; });

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "20px 32px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div onClick={onBack} style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 20, flexShrink: 0 }}>←</div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(145deg,#BE185D,#F472B6)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 3px 10px rgba(190,24,93,0.4)" }}>{DESIGNER_ICON}</div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3 }}>MÓDULO</div>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>IPC Designer</div>
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div onClick={onSolicitacoes} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📥 Solicitações</div>
              <div onClick={onKanban} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📋 Kanban</div>
              <div onClick={onFiltros} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⚙️ Filtros</div>
              <div onClick={onDashboard} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📊 Dashboard</div>
              <div onClick={abrirNova} style={{ background: "#E8730A", borderRadius: 14, padding: "10px 22px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(232,115,10,0.4)" }}>+ Nova Atividade</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 32px 80px" }}>
        {/* STATS */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            { label: "Total", value: atividades.length, cor: "#1B3F7A" },
            { label: "Em Andamento", value: contadores["Em Andamento"] || 0, cor: "#0891b2" },
            { label: "Concluídas", value: contadores["Concluído"] || 0, cor: "#059669" },
            { label: "Alta Prioridade", value: atividades.filter(a => a.prioridade === "Alta" && a.status !== "Concluído").length, cor: "#dc2626" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "12px 20px", boxShadow: "0 2px 12px rgba(27,63,122,0.07)", borderLeft: `4px solid ${s.cor}` }}>
              <div style={{ color: s.cor, fontWeight: 900, fontSize: 22 }}>{s.value}</div>
              <div style={{ color: "#888", fontSize: 11, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* FILTROS */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Filtrar:</span>

          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ background: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#1B3F7A", cursor: "pointer", outline: "none", boxShadow: "0 2px 8px rgba(27,63,122,0.08)" }}>
            <option value="todos">Todos os status</option>
            {STATUS_PADRAO.map(s => <option key={s} value={s}>{s} ({contadores[s] || 0})</option>)}
          </select>

          <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)} style={{ background: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#1B3F7A", cursor: "pointer", outline: "none", boxShadow: "0 2px 8px rgba(27,63,122,0.08)" }}>
            <option value="todas">Todas as prioridades</option>
            {PRIORIDADE_PADRAO.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={filtroDesigner} onChange={e => setFiltroDesigner(e.target.value)} style={{ background: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#1B3F7A", cursor: "pointer", outline: "none", boxShadow: "0 2px 8px rgba(27,63,122,0.08)" }}>
            <option value="todos">Todos os designers</option>
            {designers.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {(filtroStatus !== "todos" || filtroPrioridade !== "todas" || filtroDesigner !== "todos") && (
            <div onClick={() => { setFiltroStatus("todos"); setFiltroPrioridade("todas"); setFiltroDesigner("todos"); }} style={{ background: "#fee2e2", borderRadius: 20, padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#dc2626", cursor: "pointer" }}>✕ Limpar</div>
          )}

          <span style={{ marginLeft: "auto", fontSize: 12, color: "#aaa" }}>{filtradas.length} atividade{filtradas.length !== 1 ? "s" : ""}</span>
        </div>

        {/* LISTA */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>Carregando atividades...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎨</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#333", marginBottom: 8 }}>Nenhuma atividade</div>
            <div style={{ color: "#aaa", marginBottom: 20 }}>Crie a primeira atividade para a equipe de design</div>
            <div onClick={abrirNova} style={{ display: "inline-block", background: "#1B3F7A", borderRadius: 14, padding: "12px 24px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>+ Nova Atividade</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtradas.sort((a, b) => {
              const prioOrd = { "Alta": 0, "Média": 1, "Baixa": 2 };
              return (prioOrd[a.prioridade] ?? 1) - (prioOrd[b.prioridade] ?? 1);
            }).map(at => {
              const dias = diasRestantes(at.dataEntrega);
              const atrasado = dias !== null && dias < 0 && at.status !== "Concluído";
              const urgente = dias !== null && dias >= 0 && dias <= 3 && at.status !== "Concluído";

              return (
                <div key={at.id} onClick={() => abrirDetalhe(at)} style={{
                  background: "#fff", borderRadius: 18, padding: "18px 22px",
                  boxShadow: "0 2px 12px rgba(27,63,122,0.07)", cursor: "pointer",
                  border: atrasado ? "2px solid #dc262630" : urgente ? "2px solid #E8730A30" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 16,
                  transition: "transform 0.15s, box-shadow 0.15s",
                }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(27,63,122,0.13)"; }}
                   onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(27,63,122,0.07)"; }}>

                  {/* PRIORIDADE BAR */}
                  <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: COR_PRIORIDADE[at.prioridade] || "#aaa", flexShrink: 0 }} />

                  {/* CONTEÚDO */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A" }}>{at.titulo}</div>
                      {at.solicitacaoExterna && <div style={{ background: "#f0f4ff", borderRadius: 6, padding: "1px 8px", fontSize: 10, color: "#1B3F7A", fontWeight: 700 }}>EXTERNO</div>}
                    </div>
                    {at.descricao && <div style={{ color: "#888", fontSize: 13, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{at.descricao}</div>}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ background: (COR_STATUS[at.status] || "#aaa") + "18", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: COR_STATUS[at.status] || "#aaa" }}>{at.status}</div>
                      <div style={{ background: (COR_PRIORIDADE[at.prioridade] || "#aaa") + "18", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: COR_PRIORIDADE[at.prioridade] || "#aaa" }}>⚡ {at.prioridade}</div>
                      {at.designer && <div style={{ fontSize: 11, color: "#888" }}>👤 {at.designer}</div>}
                      {at.dataEntrega && <div style={{ fontSize: 11, color: atrasado ? "#dc2626" : urgente ? "#E8730A" : "#888", fontWeight: atrasado || urgente ? 700 : 400 }}>
                        📅 {formatDate(at.dataEntrega)}{dias !== null ? ` (${atrasado ? `${Math.abs(dias)}d atraso` : dias === 0 ? "hoje" : `${dias}d`})` : ""}
                      </div>}
                      {(at.ocorrencias || []).length > 0 && <div style={{ fontSize: 11, color: "#E8730A" }}>⚠️ {at.ocorrencias.length} ocorrência{at.ocorrencias.length > 1 ? "s" : ""}</div>}
                    </div>
                  </div>

                  {/* STATUS SELECTOR RÁPIDO */}
                  <select value={at.status} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); mudarStatus(at, e.target.value); }} style={{
                    background: (COR_STATUS[at.status] || "#aaa") + "18",
                    border: `1px solid ${(COR_STATUS[at.status] || "#aaa")}40`,
                    borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 700,
                    color: COR_STATUS[at.status] || "#aaa", cursor: "pointer", outline: "none", flexShrink: 0,
                  }}>
                    {STATUS_PADRAO.map(s => <option key={s} value={s} style={{ color: "#1B3F7A", background: "#fff" }}>{s}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETALHE */}
      {modal === "detalhe" && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 680, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            {/* Header detalhe */}
            <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "24px 28px", borderRadius: "24px 24px 0 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>ATIVIDADE</div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>{selected.titulo}</div>
                </div>
                <div onClick={() => setModal(null)} style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18, flexShrink: 0 }}>✕</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <div style={{ background: (COR_STATUS[selected.status] || "#aaa") + "30", border: `1px solid ${(COR_STATUS[selected.status] || "#aaa")}60`, borderRadius: 8, padding: "4px 12px", color: "#fff", fontSize: 12, fontWeight: 700 }}>{selected.status}</div>
                <div style={{ background: (COR_PRIORIDADE[selected.prioridade] || "#aaa") + "30", border: `1px solid ${(COR_PRIORIDADE[selected.prioridade] || "#aaa")}60`, borderRadius: 8, padding: "4px 12px", color: "#fff", fontSize: 12, fontWeight: 700 }}>⚡ {selected.prioridade}</div>
              </div>
            </div>

            <div style={{ padding: "24px 28px" }}>
              {/* INFO GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Designer", value: selected.designer, icon: "👤" },
                  { label: "Data de Início", value: formatDate(selected.dataInicio), icon: "📅" },
                  { label: "Data de Entrega", value: formatDate(selected.dataEntrega), icon: "🎯" },
                  { label: "Solicitante", value: selected.solicitante || "—", icon: "📨" },
                ].map((f, i) => f.value && f.value !== "—" ? (
                  <div key={i} style={{ background: "#f8f9fb", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ color: "#aaa", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{f.icon} {f.label}</div>
                    <div style={{ color: "#1B3F7A", fontWeight: 600, fontSize: 13 }}>{f.value}</div>
                  </div>
                ) : null)}
              </div>

              {selected.descricao && (
                <div style={{ marginBottom: 20, background: "#f8f9fb", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ color: "#aaa", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>📝 Descrição</div>
                  <div style={{ color: "#333", fontSize: 14, lineHeight: 1.6 }}>{selected.descricao}</div>
                </div>
              )}

              {selected.observacoes && (
                <div style={{ marginBottom: 20, background: "#f5f3ff", borderRadius: 12, padding: "14px 16px", borderLeft: "3px solid #7c3aed" }}>
                  <div style={{ color: "#7c3aed", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>💬 Observações</div>
                  <div style={{ color: "#333", fontSize: 14, lineHeight: 1.6 }}>{selected.observacoes}</div>
                </div>
              )}

              {/* OCORRÊNCIAS */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A", marginBottom: 12 }}>
                  ⚠️ Ocorrências ({(selected.ocorrencias || []).length})
                </div>
                {(selected.ocorrencias || []).length === 0 ? (
                  <div style={{ background: "#f8f9fb", borderRadius: 12, padding: 16, textAlign: "center", color: "#aaa", fontSize: 13 }}>Nenhuma ocorrência registrada</div>
                ) : (selected.ocorrencias || []).map((oc, i) => (
                  <div key={i} style={{ background: "#fff3e0", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid #ffe0b2" }}>
                    <div style={{ fontSize: 12, color: "#E8730A", fontWeight: 700, marginBottom: 4 }}>
                      {new Date(oc.data).toLocaleDateString("pt-BR")} · {oc.autor}
                    </div>
                    <div style={{ fontSize: 13, color: "#333" }}>{oc.texto}</div>
                  </div>
                ))}
                {/* Nova ocorrência */}
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <input value={novaOcorrencia} onChange={e => setNovaOcorrencia(e.target.value)} placeholder="Registrar ocorrência (dificuldade, problema...)" style={{ ...inputStyle, flex: 1 }} onKeyDown={e => e.key === "Enter" && adicionarOcorrencia()} />
                  <div onClick={adicionarOcorrencia} style={{ background: "#E8730A", borderRadius: 12, padding: "0 16px", display: "flex", alignItems: "center", color: "#fff", fontWeight: 700, fontSize: 20, cursor: "pointer", flexShrink: 0 }}>+</div>
                </div>
              </div>

              {/* AÇÕES */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => abrirEditar(selected)} style={{ flex: 1, background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 14, padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>✏️ Editar</button>
                <button onClick={() => deletar(selected.id)} style={{ background: "#fee2e2", border: "none", borderRadius: 14, padding: "14px 18px", color: "#dc2626", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>🗑️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {modal === "form" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "28px 32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div style={{ fontWeight: 900, fontSize: 20, color: "#1B3F7A" }}>{selected ? "✏️ Editar Atividade" : "➕ Nova Atividade"}</div>
                <div onClick={() => setModal(null)} style={{ width: 36, height: 36, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#1B3F7A" }}>✕</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Título *</label>
                  <input value={form.titulo || ""} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Arte para divulgação TCEduc" style={inputStyle} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Descrição</label>
                  <textarea value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o trabalho a ser feito..." style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status || "Aguardando"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                    {STATUS_PADRAO.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Prioridade</label>
                  <select value={form.prioridade || "Média"} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))} style={inputStyle}>
                    {PRIORIDADE_PADRAO.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Designer Responsável</label>
                  <input value={form.designer || ""} onChange={e => setForm(f => ({ ...f, designer: e.target.value }))} placeholder="Nome do designer" style={inputStyle} list="designers-list" />
                  <datalist id="designers-list">
                    {equipe.map(e => <option key={e.id} value={e.nome} />)}
                  </datalist>
                </div>
                <div>
                  <label style={labelStyle}>Solicitante</label>
                  <input value={form.solicitante || ""} onChange={e => setForm(f => ({ ...f, solicitante: e.target.value }))} placeholder="Quem solicitou" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Data de Início</label>
                  <input type="date" value={form.dataInicio || ""} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Data de Entrega</label>
                  <input type="date" value={form.dataEntrega || ""} onChange={e => setForm(f => ({ ...f, dataEntrega: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Observações</label>
                  <textarea value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações gerais..." style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
                </div>
              </div>

              <button onClick={salvar} disabled={salvando || !form.titulo} style={{ width: "100%", marginTop: 20, background: salvando || !form.titulo ? "#ccc" : "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 700, fontSize: 15, cursor: salvando || !form.titulo ? "not-allowed" : "pointer", fontFamily: "'Montserrat', sans-serif" }}>
                {salvando ? "Salvando..." : "💾 Salvar Atividade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
