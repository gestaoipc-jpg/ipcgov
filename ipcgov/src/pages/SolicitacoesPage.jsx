import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

const STATUS_CORES = {
  "Aguardando": "#E8730A",
  "Aceita": "#059669",
  "Recusada": "#dc2626",
  "Data Alterada": "#7c3aed",
  "Concluída": "#1B3F7A",
};

const inputStyle = {
  width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2",
  borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A",
  outline: "none", fontFamily: "'Montserrat', sans-serif",
};
const labelStyle = {
  display: "block", color: "#888", fontSize: 11, letterSpacing: 1,
  textTransform: "uppercase", marginBottom: 6, fontWeight: 600,
};

export default function SolicitacoesPage({ onBack, user }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "nova" | "detalhe" | "responder"
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [resposta, setResposta] = useState({ tipo: "aceitar", novaData: "", justificativa: "" });
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState("recebidas"); // recebidas | enviadas

  useEffect(() => { loadSolicitacoes(); }, []);

  const loadSolicitacoes = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "designer_solicitacoes"));
      setSolicitacoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const criarSolicitacao = async () => {
    if (!form.titulo || !form.modulo) return;
    setSalvando(true);
    try {
      const dados = {
        ...form,
        status: "Aguardando",
        criadoEm: new Date().toISOString(),
        criadoPor: user?.email || "sistema",
        modulo: form.modulo || "TCEduc",
        historico: [{
          data: new Date().toISOString(),
          autor: user?.email || "sistema",
          tipo: "criacao",
          texto: `Solicitação criada por ${user?.email || "sistema"}`,
        }],
      };
      const ref = await addDoc(collection(db, "designer_solicitacoes"), dados);
      setSolicitacoes(s => [{ id: ref.id, ...dados }, ...s]);
      setModal(null); setForm({});
    } catch (e) { console.error(e); }
    setSalvando(false);
  };

  const responderSolicitacao = async () => {
    if (!selected) return;
    setSalvando(true);
    try {
      let novoStatus, textoHistorico;
      if (resposta.tipo === "aceitar") {
        novoStatus = "Aceita";
        textoHistorico = `✅ Solicitação aceita pelo Designer.${resposta.novaData ? ` Data de entrega confirmada: ${formatDate(resposta.novaData)}` : ""}`;
      } else if (resposta.tipo === "recusar") {
        novoStatus = "Recusada";
        textoHistorico = `❌ Solicitação recusada. Motivo: ${resposta.justificativa}`;
      } else {
        novoStatus = "Data Alterada";
        textoHistorico = `🔄 Data alterada para ${formatDate(resposta.novaData)}. Justificativa: ${resposta.justificativa}`;
      }

      const novoHistorico = [...(selected.historico || []), {
        data: new Date().toISOString(),
        autor: user?.email || "designer",
        tipo: resposta.tipo,
        texto: textoHistorico,
        novaData: resposta.novaData || null,
        justificativa: resposta.justificativa || null,
      }];

      const dados = {
        status: novoStatus,
        atualizadoEm: new Date().toISOString(),
        historico: novoHistorico,
        dataEntregaConfirmada: resposta.novaData || selected.dataDesejada || null,
        respostaDesigner: resposta.justificativa || null,
      };

      await updateDoc(doc(db, "designer_solicitacoes", selected.id), dados);

      // If accepted, create activity automatically
      if (resposta.tipo === "aceitar") {
        await addDoc(collection(db, "designer_atividades"), {
          titulo: selected.titulo,
          descricao: selected.descricao || "",
          status: "Aguardando",
          prioridade: selected.prioridade || "Média",
          dataEntrega: resposta.novaData || selected.dataDesejada || "",
          solicitante: selected.modulo,
          solicitacaoExterna: true,
          solicitacaoId: selected.id,
          criadoEm: new Date().toISOString(),
          criadoPor: "sistema",
          ocorrencias: [],
        });
      }

      const atualizada = { ...selected, ...dados };
      setSolicitacoes(s => s.map(x => x.id === selected.id ? atualizada : x));
      setSelected(atualizada);
      setModal("detalhe");
      setResposta({ tipo: "aceitar", novaData: "", justificativa: "" });
    } catch (e) { console.error(e); }
    setSalvando(false);
  };

  const recebidas = solicitacoes.filter(s => true); // designer vê todas
  const pendentes = recebidas.filter(s => s.status === "Aguardando");

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "20px 32px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div onClick={onBack} style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 20 }}>←</div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3 }}>IPC DESIGNER</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>📥 Solicitações Externas</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              {pendentes.length > 0 && (
                <div style={{ background: "rgba(232,115,10,0.3)", border: "1px solid rgba(232,115,10,0.5)", borderRadius: 14, padding: "10px 18px" }}>
                  <div style={{ color: "#E8730A", fontWeight: 900, fontSize: 18 }}>{pendentes.length}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>Pendentes</div>
                </div>
              )}
              <div onClick={() => { setForm({ modulo: "TCEduc", prioridade: "Média" }); setModal("nova"); }} style={{ background: "#E8730A", borderRadius: 14, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Nova Solicitação</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>Carregando solicitações...</div>
        ) : solicitacoes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📥</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#333", marginBottom: 8 }}>Nenhuma solicitação ainda</div>
            <div style={{ color: "#aaa", marginBottom: 20 }}>Solicitações de outros módulos aparecerão aqui</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {solicitacoes.map(sol => {
              const cor = STATUS_CORES[sol.status] || "#aaa";
              return (
                <div key={sol.id} onClick={() => { setSelected(sol); setModal("detalhe"); }} style={{
                  background: "#fff", borderRadius: 18, padding: "20px 24px",
                  boxShadow: "0 2px 12px rgba(27,63,122,0.08)", cursor: "pointer",
                  border: sol.status === "Aguardando" ? "2px solid #E8730A30" : "2px solid transparent",
                  display: "flex", alignItems: "center", gap: 16,
                  transition: "transform 0.15s",
                }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                   onMouseLeave={e => e.currentTarget.style.transform = ""}>

                  <div style={{ width: 48, height: 48, borderRadius: 14, background: cor + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                    {sol.status === "Aguardando" ? "⏳" : sol.status === "Aceita" ? "✅" : sol.status === "Recusada" ? "❌" : sol.status === "Data Alterada" ? "🔄" : "🏁"}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A" }}>{sol.titulo}</div>
                      <div style={{ background: "#f0f4ff", borderRadius: 6, padding: "1px 8px", fontSize: 10, fontWeight: 700, color: "#1B3F7A" }}>{sol.modulo}</div>
                    </div>
                    {sol.descricao && <div style={{ color: "#888", fontSize: 13, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sol.descricao}</div>}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 11, color: "#aaa" }}>📅 Solicitado: {formatDate(sol.dataDesejada)}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>⚡ {sol.prioridade}</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>📨 {sol.criadoPor}</div>
                      {sol.dataEntregaConfirmada && sol.dataEntregaConfirmada !== sol.dataDesejada && (
                        <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>🔄 Nova data: {formatDate(sol.dataEntregaConfirmada)}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ background: cor + "18", border: `1px solid ${cor}40`, borderRadius: 10, padding: "6px 14px", color: cor, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{sol.status}</div>
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
            <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "24px 28px", borderRadius: "24px 24px 0 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>{selected.modulo} → IPC DESIGNER</div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>{selected.titulo}</div>
                </div>
                <div onClick={() => setModal(null)} style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18 }}>✕</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ background: (STATUS_CORES[selected.status] || "#aaa") + "30", border: `1px solid ${(STATUS_CORES[selected.status] || "#aaa")}50`, borderRadius: 8, padding: "4px 14px", color: "#fff", fontSize: 12, fontWeight: 700, display: "inline-block" }}>{selected.status}</div>
              </div>
            </div>

            <div style={{ padding: "24px 28px" }}>
              {/* INFO */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Módulo solicitante", value: selected.modulo },
                  { label: "Prioridade", value: selected.prioridade },
                  { label: "Data desejada", value: formatDate(selected.dataDesejada) },
                  { label: "Data confirmada", value: formatDate(selected.dataEntregaConfirmada) },
                  { label: "Criado por", value: selected.criadoPor },
                  { label: "Criado em", value: formatDateTime(selected.criadoEm) },
                ].filter(f => f.value && f.value !== "—").map((f, i) => (
                  <div key={i} style={{ background: "#f8f9fb", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ color: "#aaa", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{f.label}</div>
                    <div style={{ color: "#1B3F7A", fontWeight: 600, fontSize: 13 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {selected.descricao && (
                <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                  <div style={{ color: "#aaa", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>📝 Descrição</div>
                  <div style={{ color: "#333", fontSize: 14, lineHeight: 1.6 }}>{selected.descricao}</div>
                </div>
              )}

              {/* HISTÓRICO */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A", marginBottom: 12 }}>📋 Histórico</div>
                {(selected.historico || []).map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: h.tipo === "aceitar" ? "#e8f5e9" : h.tipo === "recusar" ? "#fee2e2" : h.tipo === "alterar_data" ? "#f5f3ff" : "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                      {h.tipo === "aceitar" ? "✅" : h.tipo === "recusar" ? "❌" : h.tipo === "alterar_data" ? "🔄" : "📝"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{h.texto}</div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>{formatDateTime(h.data)} · {h.autor}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* AÇÕES */}
              {selected.status === "Aguardando" && (
                <div onClick={() => { setResposta({ tipo: "aceitar", novaData: selected.dataDesejada || "", justificativa: "" }); setModal("responder"); }} style={{ width: "100%", background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 14, padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "center" }}>
                  📬 Responder Solicitação
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESPONDER */}
      {modal === "responder" && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal("detalhe")}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1B3F7A" }}>📬 Responder Solicitação</div>
              <div onClick={() => setModal("detalhe")} style={{ width: 36, height: 36, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#1B3F7A" }}>✕</div>
            </div>

            {/* TIPO RESPOSTA */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[
                { id: "aceitar", label: "✅ Aceitar", cor: "#059669" },
                { id: "alterar_data", label: "🔄 Alterar Data", cor: "#7c3aed" },
                { id: "recusar", label: "❌ Recusar", cor: "#dc2626" },
              ].map(t => (
                <div key={t.id} onClick={() => setResposta(r => ({ ...r, tipo: t.id }))} style={{
                  flex: 1, textAlign: "center", padding: "10px 6px", borderRadius: 12,
                  border: `2px solid ${resposta.tipo === t.id ? t.cor : "#e8edf2"}`,
                  background: resposta.tipo === t.id ? t.cor + "12" : "#f8f9fb",
                  color: resposta.tipo === t.id ? t.cor : "#888",
                  fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}>{t.label}</div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Data de Entrega {resposta.tipo === "recusar" ? "(opcional)" : "*"}</label>
                <input type="date" value={resposta.novaData || ""} onChange={e => setResposta(r => ({ ...r, novaData: e.target.value }))} style={inputStyle} />
                {selected.dataDesejada && <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Cliente pediu: {formatDate(selected.dataDesejada)}</div>}
              </div>

              {(resposta.tipo === "recusar" || resposta.tipo === "alterar_data") && (
                <div>
                  <label style={labelStyle}>Justificativa *</label>
                  <textarea value={resposta.justificativa || ""} onChange={e => setResposta(r => ({ ...r, justificativa: e.target.value }))} placeholder={resposta.tipo === "recusar" ? "Ex: Agenda cheia, muitos projetos em andamento..." : "Ex: Preciso de mais tempo para este projeto..."} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
                </div>
              )}
            </div>

            <button onClick={responderSolicitacao} disabled={salvando || ((resposta.tipo === "recusar" || resposta.tipo === "alterar_data") && !resposta.justificativa)} style={{
              width: "100%", marginTop: 20,
              background: salvando ? "#ccc" : resposta.tipo === "aceitar" ? "linear-gradient(135deg, #059669, #10b981)" : resposta.tipo === "recusar" ? "linear-gradient(135deg, #dc2626, #ef4444)" : "linear-gradient(135deg, #7c3aed, #8b5cf6)",
              border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 700, fontSize: 15, cursor: salvando ? "not-allowed" : "pointer", fontFamily: "'Montserrat', sans-serif",
            }}>
              {salvando ? "Salvando..." : resposta.tipo === "aceitar" ? "✅ Confirmar e Criar Atividade" : resposta.tipo === "recusar" ? "❌ Recusar Solicitação" : "🔄 Alterar Data e Notificar"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL NOVA SOLICITAÇÃO */}
      {modal === "nova" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 560, padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1B3F7A" }}>📤 Nova Solicitação ao Designer</div>
              <div onClick={() => setModal(null)} style={{ width: 36, height: 36, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Título *</label>
                <input value={form.titulo || ""} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Arte para divulgação TCEduc Sobral" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o que precisa ser feito..." style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Módulo Solicitante</label>
                  <select value={form.modulo || "TCEduc"} onChange={e => setForm(f => ({ ...f, modulo: e.target.value }))} style={inputStyle}>
                    <option>TCEduc</option>
                    <option>IPC Processos</option>
                    <option>Almoxarifado</option>
                    <option>Administração</option>
                    <option>Outro</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Prioridade</label>
                  <select value={form.prioridade || "Média"} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))} style={inputStyle}>
                    <option>Alta</option>
                    <option>Média</option>
                    <option>Baixa</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Data Desejada de Entrega</label>
                <input type="date" value={form.dataDesejada || ""} onChange={e => setForm(f => ({ ...f, dataDesejada: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <button onClick={criarSolicitacao} disabled={salvando || !form.titulo} style={{ width: "100%", marginTop: 20, background: salvando || !form.titulo ? "#ccc" : "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 700, fontSize: 15, cursor: salvando || !form.titulo ? "not-allowed" : "pointer", fontFamily: "'Montserrat', sans-serif" }}>
              {salvando ? "Enviando..." : "📤 Enviar Solicitação"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
