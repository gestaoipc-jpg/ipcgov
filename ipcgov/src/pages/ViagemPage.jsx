import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function calcStatus(dataInicio, dataFim) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const ini = dataInicio ? new Date(dataInicio) : null;
  const fim = dataFim ? new Date(dataFim) : null;
  if (!ini) return "Programada";
  if (hoje < ini) return "Programada";
  if (fim && hoje > fim) return "Concluída";
  return "Em Execução";
}

const CHECKLIST_VIAGEM_ITENS = [
  "Solicitar viagem",
  "Solicitar diária terceirizados",
  "Solicitar divulgação site/redes sociais",
  "Organizar material e equipamentos",
  "Reunião de alinhamento",
];

const STATUS_COR = { Programada: "#7c3aed", "Em Execução": "#E8730A", Concluída: "#059669" };

const inputStyle = {
  width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2",
  borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A",
  outline: "none", fontFamily: "'Montserrat', sans-serif",
};
const labelStyle = {
  display: "block", color: "#888", fontSize: 11, letterSpacing: 1,
  textTransform: "uppercase", marginBottom: 6, fontWeight: 600,
};

export default function ViagemPage({ user, viagem, onBack, onSaved, onRelatorio, onVerEvento, eventos, usuarios, servidores, podeEditar }) {
  const [form, setForm] = useState({ titulo: "", dataInicio: "", dataFim: "", municipiosIds: [], equipe: [] });
  const [checklist, setChecklist] = useState({});
  const [itensCustom, setItensCustom] = useState([]);
  const [novoItem, setNovoItem] = useState("");
  const [ocorrencias, setOcorrencias] = useState([]);
  const [novaOc, setNovaOc] = useState({ tipo: "transporte", descricao: "" });
  const [itemAberto, setItemAberto] = useState(null);
  const [novaOcItem, setNovaOcItem] = useState("");
  const [blocoAtivo, setBlocoAtivo] = useState(null); // null | "checklist" | "ocorrencias" | "municipios"
  const [salvando, setSalvando] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(!viagem);
  const [menuEvento, setMenuEvento] = useState(null); // id do evento com menu aberto

  const isAdmin = ["gestaoipc@tce.ce.gov.br", "fabricio@tce.ce.gov.br"].includes(user?.email);
  const isAdmTCEduc = (() => {
    // verificado no pai, mas redundância
    return isAdmin;
  })();

  // Membros selecionáveis: servidores + usuários do sistema (deduplica por email)
  const todosOsMembros = (() => {
    const mapa = {};
    (servidores || []).forEach(s => { if (s.email) mapa[s.email] = { id: s.id, nome: s.nome || s.email, email: s.email, fonte: "servidor" }; });
    (usuarios || []).forEach(u => { if (u.email && !mapa[u.email]) mapa[u.email] = { id: u.id, nome: u.nome || u.email, email: u.email, fonte: "usuario" }; });
    return Object.values(mapa).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  })();

  // Eventos disponíveis para vincular (municipais e regionais)
  const eventosDisponiveis = (eventos || []).filter(e => e.tipo === "Municipal" || e.tipo === "Regional");

  useEffect(() => {
    if (viagem) {
      setForm({
        titulo: viagem.titulo || "",
        dataInicio: viagem.dataInicio || "",
        dataFim: viagem.dataFim || "",
        municipiosIds: viagem.municipiosIds || [],
        equipe: viagem.equipe || [],
      });
      setChecklist(viagem.checklist || {});
      setItensCustom(viagem.itensCustom || []);
      setOcorrencias(viagem.ocorrencias || []);
    }
  }, [viagem]);

  const status = calcStatus(form.dataInicio, form.dataFim);

  // ---- CHECKLIST ----
  const todosItens = [...CHECKLIST_VIAGEM_ITENS, ...itensCustom];

  const toggleCheck = (item) => {
    setChecklist(c => ({ ...c, [item]: { ...c[item], feito: !c[item]?.feito } }));
  };
  const setItemResponsavel = (item, val) => setChecklist(c => ({ ...c, [item]: { ...c[item], responsavel: val } }));
  const setItemDataLimite = (item, val) => setChecklist(c => ({ ...c, [item]: { ...c[item], dataLimite: val } }));

  const adicionarOcItem = (item) => {
    if (!novaOcItem.trim()) return;
    const ocs = checklist[item]?.ocorrencias || [];
    setChecklist(c => ({ ...c, [item]: { ...c[item], ocorrencias: [...ocs, { texto: novaOcItem.trim(), data: new Date().toISOString(), autor: user?.email || "sistema" }] } }));
    setNovaOcItem("");
  };

  const adicionarItemCustom = () => {
    if (!novoItem.trim()) return;
    setItensCustom(prev => [...prev, novoItem.trim()]);
    setChecklist(c => ({ ...c, [novoItem.trim()]: {} }));
    setNovoItem("");
  };

  const removerItemCustom = (item) => {
    setItensCustom(prev => prev.filter(i => i !== item));
    setChecklist(c => { const n = { ...c }; delete n[item]; return n; });
  };

  // ---- OCORRÊNCIAS DE VIAGEM ----
  const adicionarOcorrencia = () => {
    if (!novaOc.descricao.trim()) return;
    const oc = {
      id: Date.now().toString(),
      tipo: novaOc.tipo,
      descricao: novaOc.descricao.trim(),
      autorEmail: user?.email || "sistema",
      autorNome: user?.displayName || user?.email || "sistema",
      data: new Date().toISOString(),
    };
    setOcorrencias(prev => [...prev, oc]);
    setNovaOc({ tipo: "transporte", descricao: "" });
  };

  const excluirOcorrencia = (id) => {
    const oc = ocorrencias.find(o => o.id === id);
    if (!oc) return;
    const isCriador = oc.autorEmail === user?.email;
    if (!isAdmin && !isCriador) { alert("Apenas o criador ou administrador pode excluir."); return; }
    if (!window.confirm("Excluir esta ocorrência?")) return;
    setOcorrencias(prev => prev.filter(o => o.id !== id));
  };

  // ---- SALVAR ----
  const salvar = async () => {
    if (!form.titulo.trim()) { alert("Informe o título da viagem."); return; }
    setSalvando(true);
    const dados = {
      titulo: form.titulo.trim(),
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      municipiosIds: form.municipiosIds,
      equipe: form.equipe,
      checklist,
      itensCustom,
      ocorrencias,
      status,
      atualizadoEm: new Date().toISOString(),
    };
    try {
      if (viagem?.id) {
        await updateDoc(doc(db, "tceduc_viagens", viagem.id), dados);
        onSaved({ ...viagem, ...dados });
      } else {
        dados.criadoEm = new Date().toISOString();
        dados.criadoPor = user?.email || "";
        const ref = await addDoc(collection(db, "tceduc_viagens"), dados);
        onSaved({ id: ref.id, ...dados });
      }
      setModoEdicao(false);
    } catch (e) { console.error(e); alert("Erro ao salvar."); }
    setSalvando(false);
  };

  // ---- TOGGLE MUNICÍPIO ----
  const toggleMunicipio = (id) => {
    setForm(f => ({
      ...f,
      municipiosIds: f.municipiosIds.includes(id)
        ? f.municipiosIds.filter(x => x !== id)
        : [...f.municipiosIds, id],
    }));
  };

  // ---- TOGGLE MEMBRO EQUIPE ----
  const toggleMembro = (email) => {
    setForm(f => ({
      ...f,
      equipe: f.equipe.includes(email)
        ? f.equipe.filter(x => x !== email)
        : [...f.equipe, email],
    }));
  };

  const progChecklist = () => {
    const total = todosItens.length;
    if (!total) return { done: 0, total: 0, pct: 0 };
    const done = todosItens.filter(i => checklist[i]?.feito).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  };
  const prog = progChecklist();

  // Eventos vinculados
  const eventosVinculados = eventosDisponiveis.filter(e => form.municipiosIds.includes(e.id));

  const TIPO_OC = { transporte: "🚌 Transporte", hotel: "🏨 Hotel/Hospedagem", alimentacao: "🍽️ Alimentação", outro: "📌 Outro" };

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }} onClick={() => menuEvento && setMenuEvento(null)}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "20px 24px 28px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div onClick={onBack} style={{ width: 38, height: 38, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18 }}>←</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>TCEduc</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>
                {viagem ? (form.titulo || "Viagem") : "Nova Viagem"}
              </div>
            </div>
            {viagem && (
              <div style={{ background: STATUS_COR[status], borderRadius: 10, padding: "5px 14px", color: "#fff", fontWeight: 700, fontSize: 12 }}>
                {status}
              </div>
            )}
          </div>

          {/* Datas e municípios summary */}
          {viagem && !modoEdicao && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {form.dataInicio && <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>📅 {formatDate(form.dataInicio)}{form.dataFim ? ` → ${formatDate(form.dataFim)}` : ""}</div>}
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>📍 {form.municipiosIds.length} município{form.municipiosIds.length !== 1 ? "s" : ""}</div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>👥 {form.equipe.length} membro{form.equipe.length !== 1 ? "s" : ""}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* MODO EDIÇÃO - FORM */}
        {modoEdicao && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 20 }}>✏️ {viagem ? "Editar Viagem" : "Criar Viagem"}</div>

            {/* Título + Datas */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Título da Viagem *</label>
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: TCEduc Municipal 1" style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Data de Início</label>
                <input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Data de Fim</label>
                <input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            {/* Preview status */}
            {form.dataInicio && (
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ background: STATUS_COR[status] + "20", border: `1px solid ${STATUS_COR[status]}`, borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: STATUS_COR[status] }}>
                  Status previsto: {status}
                </div>
              </div>
            )}

            {/* Equipe */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Equipe da Viagem ({form.equipe.length} selecionados)</label>
              <div style={{ background: "#f8f9fb", borderRadius: 12, padding: 12, maxHeight: 200, overflowY: "auto", border: "1px solid #e8edf2" }}>
                {todosOsMembros.map(m => (
                  <div key={m.email} onClick={() => toggleMembro(m.email)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: form.equipe.includes(m.email) ? "#eff6ff" : "transparent", marginBottom: 2 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: form.equipe.includes(m.email) ? "#1B3F7A" : "#fff", border: `2px solid ${form.equipe.includes(m.email) ? "#1B3F7A" : "#ddd"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, flexShrink: 0 }}>
                      {form.equipe.includes(m.email) ? "✓" : ""}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{m.nome}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{m.email}</div>
                    </div>
                  </div>
                ))}
                {todosOsMembros.length === 0 && <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 12 }}>Nenhum membro disponível</div>}
              </div>
            </div>

            {/* Municípios / Eventos */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Eventos / Municípios da Viagem ({form.municipiosIds.length} selecionados)</label>
              <div style={{ background: "#f8f9fb", borderRadius: 12, padding: 12, maxHeight: 220, overflowY: "auto", border: "1px solid #e8edf2" }}>
                {eventosDisponiveis.length === 0 && <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 12 }}>Nenhum evento cadastrado</div>}
                {eventosDisponiveis.map(ev => (
                  <div key={ev.id} onClick={() => toggleMunicipio(ev.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: form.municipiosIds.includes(ev.id) ? "#eff6ff" : "transparent", marginBottom: 2 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: form.municipiosIds.includes(ev.id) ? "#1B3F7A" : "#fff", border: `2px solid ${form.municipiosIds.includes(ev.id) ? "#1B3F7A" : "#ddd"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, flexShrink: 0 }}>
                      {form.municipiosIds.includes(ev.id) ? "✓" : ""}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{ev.tipo === "Municipal" ? ev.municipio : ev.regiao}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{ev.tipo} · {formatDate(ev.data)} · {ev.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={salvar} disabled={salvando || !form.titulo.trim()} style={{ flex: 1, background: salvando || !form.titulo.trim() ? "#ccc" : "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 12, padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: salvando || !form.titulo.trim() ? "not-allowed" : "pointer", fontFamily: "'Montserrat', sans-serif" }}>
                {salvando ? "Salvando..." : "💾 Salvar Viagem"}
              </button>
              {viagem && <button onClick={() => setModoEdicao(false)} style={{ background: "#f0f4ff", border: "none", borderRadius: 12, padding: "14px 20px", color: "#1B3F7A", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>Cancelar</button>}
            </div>
          </div>
        )}

        {/* MODO VISUALIZAÇÃO */}
        {!modoEdicao && viagem && (
          <>
            {/* CARDS DE BLOCOS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { id: "checklist", icon: "📋", label: "Logística Antes da Viagem", sub: `${prog.done}/${prog.total} — ${prog.pct}%`, color: "#1B3F7A" },
                { id: "ocorrencias", icon: "⚠️", label: "Ocorrências de Viagem", sub: `${ocorrencias.length} registradas`, color: "#E8730A" },
                { id: "municipios", icon: "📍", label: "Municípios / Eventos", sub: `${eventosVinculados.length} vinculados`, color: "#059669" },
              ].map(b => (
                <div key={b.id} onClick={() => setBlocoAtivo(blocoAtivo === b.id ? null : b.id)}
                  style={{ background: blocoAtivo === b.id ? "#fff" : "#f8f9fb", borderRadius: 16, padding: 16, cursor: "pointer", border: `2px solid ${blocoAtivo === b.id ? b.color : "transparent"}`, transition: "all .15s" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: b.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 8 }}>{b.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 2 }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{b.sub}</div>
                  {b.id === "checklist" && (
                    <div style={{ marginTop: 8, height: 3, background: "#e8edf2", borderRadius: 3 }}>
                      <div style={{ height: 3, background: prog.pct === 100 ? "#059669" : "#1B3F7A", borderRadius: 3, width: `${prog.pct}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ---- BLOCO CHECKLIST ---- */}
            {blocoAtivo === "checklist" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16 }}>📋 Logística Antes da Viagem</div>
                {todosItens.map((item, i) => {
                  const val = checklist[item] || {};
                  const venceEm = val.dataLimite ? Math.ceil((new Date(val.dataLimite) - new Date()) / 86400000) : null;
                  const atrasado = venceEm !== null && venceEm < 0 && !val.feito;
                  const urgente = venceEm !== null && venceEm <= 2 && venceEm >= 0 && !val.feito;
                  const isCustom = itensCustom.includes(item);
                  return (
                    <div key={i} style={{ background: val.feito ? "#e8f5e9" : atrasado ? "#fee2e2" : urgente ? "#fff3e0" : "#f8f9fb", borderRadius: 14, marginBottom: 10, border: `1px solid ${val.feito ? "#c8e6c9" : atrasado ? "#fecaca" : urgente ? "#fed7aa" : "#e8edf2"}`, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={() => toggleCheck(item)}>
                        <div style={{ width: 24, height: 24, borderRadius: 8, background: val.feito ? "#059669" : "#fff", border: `2px solid ${val.feito ? "#059669" : "#ddd"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>{val.feito ? "✓" : ""}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ fontSize: 14, color: val.feito ? "#059669" : "#333", fontWeight: val.feito ? 600 : 400, textDecoration: val.feito ? "line-through" : "none" }}>{item}</div>
                            {isCustom && <span style={{ background: "#eff6ff", borderRadius: 5, padding: "1px 6px", fontSize: 10, color: "#1B3F7A", fontWeight: 700 }}>custom</span>}
                          </div>
                          <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                            {val.responsavel && <div style={{ fontSize: 11, color: "#888" }}>👤 {val.responsavel}</div>}
                            {val.dataLimite && <div style={{ fontSize: 11, color: atrasado ? "#dc2626" : urgente ? "#E8730A" : "#888", fontWeight: atrasado || urgente ? 700 : 400 }}>📅 {formatDate(val.dataLimite)}{atrasado ? " ⚠️ ATRASADO" : urgente ? ` ⏰ ${venceEm === 0 ? "HOJE" : `${venceEm}d`}` : ""}</div>}
                            {(val.ocorrencias || []).length > 0 && <div style={{ fontSize: 11, color: "#E8730A", fontWeight: 700 }}>⚠️ {val.ocorrencias.length} ocorrência{val.ocorrencias.length !== 1 ? "s" : ""}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {isCustom && <div onClick={e => { e.stopPropagation(); removerItemCustom(item); }} style={{ fontSize: 14, color: "#dc2626", cursor: "pointer", padding: "4px 6px" }}>🗑</div>}
                          <div onClick={e => { e.stopPropagation(); setItemAberto(itemAberto === item ? null : item); }} style={{ fontSize: 16, color: "#aaa", cursor: "pointer", padding: "4px 8px" }}>⋮</div>
                        </div>
                      </div>
                      {itemAberto === item && (
                        <div style={{ padding: "0 16px 14px", borderTop: "1px solid #e8edf2" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, marginBottom: 12 }}>
                            <div>
                              <label style={labelStyle}>Responsável</label>
                              <select value={val.responsavel || ""} onChange={e => setItemResponsavel(item, e.target.value)} style={{ ...inputStyle, padding: "8px 12px" }}>
                                <option value="">Selecione...</option>
                                {todosOsMembros.map(m => <option key={m.email} value={m.email}>{m.nome}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>Data Limite</label>
                              <input type="date" value={val.dataLimite || ""} onChange={e => setItemDataLimite(item, e.target.value)} style={{ ...inputStyle, padding: "8px 12px" }} />
                            </div>
                          </div>
                          <label style={labelStyle}>Ocorrências do item</label>
                          {(val.ocorrencias || []).map((oc, j) => (
                            <div key={j} style={{ background: "#fff3e0", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12, color: "#333", borderLeft: "3px solid #E8730A" }}>
                              <div style={{ color: "#aaa", fontSize: 10, marginBottom: 2 }}>{new Date(oc.data).toLocaleString("pt-BR")} · {oc.autor}</div>
                              {oc.texto}
                            </div>
                          ))}
                          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                            <input value={novaOcItem} onChange={e => setNovaOcItem(e.target.value)} placeholder="Registrar ocorrência neste item..." style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} />
                            <div onClick={() => adicionarOcItem(item)} style={{ background: "#E8730A", borderRadius: 10, padding: "8px 14px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Adicionar item customizado */}
                <div style={{ marginTop: 16, background: "#f0f4ff", borderRadius: 12, padding: 14, border: "2px dashed #1B3F7A33" }}>
                  <label style={labelStyle}>Adicionar item personalizado</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={novoItem} onChange={e => setNovoItem(e.target.value)} onKeyDown={e => e.key === "Enter" && adicionarItemCustom()} placeholder="Nome do novo item..." style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} />
                    <button onClick={adicionarItemCustom} disabled={!novoItem.trim()} style={{ background: novoItem.trim() ? "#1B3F7A" : "#ccc", border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: novoItem.trim() ? "pointer" : "not-allowed", fontFamily: "'Montserrat', sans-serif" }}>+ Adicionar</button>
                  </div>
                </div>

                <button onClick={async () => {
                  setSalvando(true);
                  try {
                    await updateDoc(doc(db, "tceduc_viagens", viagem.id), { checklist, itensCustom, atualizadoEm: new Date().toISOString() });
                    onSaved({ ...viagem, checklist, itensCustom });
                  } catch (e) { console.error(e); }
                  setSalvando(false);
                }} style={{ width: "100%", marginTop: 16, background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 12, padding: 13, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>
                  {salvando ? "Salvando..." : "💾 Salvar Checklist"}
                </button>
              </div>
            )}

            {/* ---- BLOCO OCORRÊNCIAS ---- */}
            {blocoAtivo === "ocorrencias" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16 }}>⚠️ Ocorrências de Viagem</div>

                {/* Form nova ocorrência */}
                <div style={{ background: "#f8f9fb", borderRadius: 14, padding: 16, marginBottom: 20, border: "1px solid #e8edf2" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Tipo</label>
                      <select value={novaOc.tipo} onChange={e => setNovaOc(o => ({ ...o, tipo: e.target.value }))} style={inputStyle}>
                        <option value="transporte">🚌 Transporte</option>
                        <option value="hotel">🏨 Hotel/Hospedagem</option>
                        <option value="alimentacao">🍽️ Alimentação</option>
                        <option value="outro">📌 Outro</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Descrição *</label>
                      <textarea value={novaOc.descricao} onChange={e => setNovaOc(o => ({ ...o, descricao: e.target.value }))} placeholder="Descreva a ocorrência..." style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
                    </div>
                  </div>
                  <button onClick={adicionarOcorrencia} disabled={!novaOc.descricao.trim()} style={{ marginTop: 12, background: !novaOc.descricao.trim() ? "#ccc" : "#E8730A", border: "none", borderRadius: 12, padding: "10px 20px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: !novaOc.descricao.trim() ? "not-allowed" : "pointer", fontFamily: "'Montserrat', sans-serif" }}>
                    + Registrar Ocorrência
                  </button>
                </div>

                {/* Lista */}
                {ocorrencias.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#aaa", padding: 24, fontSize: 13 }}>✅ Nenhuma ocorrência registrada</div>
                ) : ocorrencias.map(oc => (
                  <div key={oc.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: "1px solid #fee2e2" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{ background: "#fff3e0", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#E8730A" }}>{TIPO_OC[oc.tipo] || oc.tipo}</span>
                      {(isAdmin || oc.autorEmail === user?.email) && (
                        <div onClick={() => excluirOcorrencia(oc.id)} style={{ cursor: "pointer", color: "#dc2626", fontSize: 18, padding: "0 4px" }}>×</div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "#333", background: "#f8f9fb", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>{oc.descricao}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>Registrado por: {oc.autorEmail} · {oc.data ? new Date(oc.data).toLocaleString("pt-BR") : ""}</div>
                  </div>
                ))}

                <button onClick={async () => {
                  setSalvando(true);
                  try {
                    await updateDoc(doc(db, "tceduc_viagens", viagem.id), { ocorrencias, atualizadoEm: new Date().toISOString() });
                    onSaved({ ...viagem, ocorrencias });
                  } catch (e) { console.error(e); }
                  setSalvando(false);
                }} style={{ width: "100%", marginTop: 8, background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 12, padding: 13, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>
                  {salvando ? "Salvando..." : "💾 Salvar Ocorrências"}
                </button>
              </div>
            )}

            {/* ---- BLOCO MUNICÍPIOS ---- */}
            {blocoAtivo === "municipios" && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16 }}>📍 Municípios / Eventos da Viagem</div>
                {eventosVinculados.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#aaa", padding: 24, fontSize: 13 }}>Nenhum evento vinculado a esta viagem</div>
                ) : eventosVinculados.map((ev, i) => {
                  const cap = (ev.acoesEducacionais || []).reduce((s, a) => s + (parseInt(a.participantes) || 0), 0);
                  return (
                    <div key={ev.id} style={{ background: "#f8f9fb", borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: "1px solid #e8edf2" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A" }}>{ev.tipo === "Municipal" ? ev.municipio : ev.regiao}</div>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>📅 {formatDate(ev.data)}{ev.local ? ` · 📍 ${ev.local}` : ""}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 900, fontSize: 18, color: "#059669" }}>{cap}</div>
                          <div style={{ fontSize: 10, color: "#aaa" }}>participantes</div>
                        </div>
                      </div>
                      {(ev.acoesEducacionais || []).length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {ev.acoesEducacionais.map((a, j) => (
                            <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555", padding: "3px 0", borderBottom: j < ev.acoesEducacionais.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                              <span>{a.acaoNome || a.nome || "—"}</span>
                              <span style={{ fontWeight: 700, color: "#1B3F7A" }}>{a.participantes || 0}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {(ev.ocorrencias || []).length > 0 && (
                        <div style={{ marginTop: 8, background: "#fff3e0", borderRadius: 8, padding: "5px 10px", fontSize: 11, color: "#E8730A", fontWeight: 700 }}>
                          ⚠️ {ev.ocorrencias.length} ocorrência{ev.ocorrencias.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* MUNICÍPIOS CARDS */}
            <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16 }}>📍 Municípios da Viagem</div>
              {eventosVinculados.length === 0 ? (
                <div style={{ textAlign: "center", color: "#aaa", padding: 16, fontSize: 13 }}>Nenhum município vinculado</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {eventosVinculados.map(ev => {
                    const cap = (ev.acoesEducacionais || []).reduce((s, a) => s + (parseInt(a.participantes) || 0), 0);
                    const nOcs = (ev.ocorrencias || []).length;
                    const statusCores = { Pendente: "#E8730A", Realizado: "#059669", Cancelado: "#dc2626" };
                    const cor = statusCores[ev.status] || "#888";
                    const aberto = menuEvento === ev.id;
                    return (
                      <div key={ev.id} style={{ position: "relative" }}>
                        {/* CARD */}
                        <div
                          onClick={() => setMenuEvento(aberto ? null : ev.id)}
                          style={{ background: aberto ? "#f0f4ff" : "#f8f9fb", borderRadius: 14, padding: "14px 16px", cursor: "pointer", border: `2px solid ${aberto ? "#1B3F7A" : cor + "33"}`, transition: "all .15s" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A", flex: 1, paddingRight: 4 }}>
                              {ev.tipo === "Municipal" ? ev.municipio : ev.regiao}
                            </div>
                            <div style={{ background: cor, borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{ev.status}</div>
                          </div>
                          <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>📅 {formatDate(ev.data)}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 900, fontSize: 18, color: "#059669" }}>{cap}</div>
                            <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600 }}>participantes</div>
                          </div>
                          {nOcs > 0 && (
                            <div style={{ marginTop: 6, background: "#fff3e0", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#E8730A", fontWeight: 700, display: "inline-block" }}>
                              ⚠️ {nOcs} ocorr.
                            </div>
                          )}
                        </div>

                        {/* MENU DROPDOWN */}
                        {aberto && (
                          <div
                            style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(27,63,122,0.18)", border: "1px solid #e8edf2", zIndex: 50, overflow: "hidden" }}
                            onClick={e => e.stopPropagation()}
                          >
                            {/* Ver detalhes */}
                            <div
                              onClick={() => { setMenuEvento(null); onVerEvento && onVerEvento(ev); }}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f8f9fb"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                              <div style={{ width: 32, height: 32, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👁️</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#1B3F7A" }}>Ver Evento</div>
                                <div style={{ fontSize: 11, color: "#888" }}>Detalhes completos</div>
                              </div>
                            </div>

                            {/* Gerenciar (apenas TCEduc Administrativo) */}
                            {podeEditar !== false && (
                              <div
                                onClick={() => { setMenuEvento(null); onVerEvento && onVerEvento(ev, "editar"); }}
                                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8f9fb"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >
                                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fff0e0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✏️</div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E8730A" }}>Gerenciar</div>
                                  <div style={{ fontSize: 11, color: "#888" }}>Editar evento</div>
                                </div>
                              </div>
                            )}

                            {/* Ocorrências (TCEduc + TCEduc Administrativo) */}
                            <div
                              onClick={() => { setMenuEvento(null); onVerEvento && onVerEvento(ev, "ocorrencias"); }}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f8f9fb"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                              <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fff3e0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚠️</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8730A" }}>Ocorrências</div>
                                <div style={{ fontSize: 11, color: "#888" }}>{nOcs > 0 ? `${nOcs} registradas` : "Sem ocorrências"}</div>
                              </div>
                            </div>

                            {/* Relatório */}
                            <div
                              onClick={() => { setMenuEvento(null); onVerEvento && onVerEvento(ev, "relatorio"); }}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f8f9fb"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                              <div style={{ width: 32, height: 32, borderRadius: 10, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📄</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>Relatório</div>
                                <div style={{ fontSize: 11, color: "#888" }}>Gerar PDF do evento</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* EQUIPE */}
            {form.equipe.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 16px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 14 }}>👥 Equipe da Viagem</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {form.equipe.map(email => {
                    const m = todosOsMembros.find(x => x.email === email);
                    return (
                      <div key={email} style={{ background: "#eff6ff", borderRadius: 10, padding: "6px 14px", fontSize: 13, color: "#1B3F7A", fontWeight: 600 }}>
                        👤 {m?.nome || email}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BOTÕES */}
            <div style={{ display: "flex", gap: 10 }}>
              {(podeEditar !== false) && <button onClick={() => setModoEdicao(true)} style={{ flex: 1, background: "#1B3F7A", border: "none", borderRadius: 14, padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>✏️ Editar Viagem</button>}
              <button onClick={() => onRelatorio && onRelatorio(viagem.id)} style={{ flex: 1, background: "#f0f4ff", border: "none", borderRadius: 14, padding: 14, color: "#1B3F7A", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>📄 Relatório</button>
            </div>
          </>
        )}

        {/* MODO NOVO (sem viagem) */}
        {!viagem && !modoEdicao && (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Viagem salva com sucesso!</div>
          </div>
        )}
      </div>
    </div>
  );
}
