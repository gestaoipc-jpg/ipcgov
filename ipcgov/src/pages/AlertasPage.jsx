import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

const TIPOS_ALERTA = [
  { id: "prazo", icon: "⏰", label: "Prazo próximo", cor: "#E8730A" },
  { id: "checklist", icon: "📋", label: "Checklist incompleto", cor: "#dc2626" },
  { id: "geral", icon: "📢", label: "Aviso geral", cor: "#1B3F7A" },
  { id: "evento", icon: "📅", label: "Evento próximo", cor: "#059669" },
];

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function daysUntil(d) {
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

export default function AlertasPage({ onBack }) {
  const [alertas, setAlertas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [aSnap, eSnap] = await Promise.all([
        getDocs(collection(db, "alertas")),
        getDocs(collection(db, "tceduc_eventos")),
      ]);
      const evs = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEventos(evs);

      // Gerar alertas automáticos de eventos próximos
      const alertasExistentes = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const alertasAutomaticos = [];

      for (const ev of evs) {
        if (!ev.data || ev.status === "Realizado" || ev.status === "Cancelado") continue;
        const days = daysUntil(ev.data);
        const nome = ev.tipo === "Municipal" ? ev.municipio : ev.regiao;

        // Alerta 7 dias antes
        if (days > 0 && days <= 7) {
          const jaExiste = alertasExistentes.find(a => a.eventoId === ev.id && a.tipo === "prazo");
          if (!jaExiste) {
            alertasAutomaticos.push({
              tipo: "prazo",
              modulo: "tceduc",
              titulo: `Evento em ${days} dia${days > 1 ? "s" : ""}!`,
              mensagem: `${ev.tipo} ${nome} — ${formatDate(ev.data)}`,
              eventoId: ev.id,
              lido: false,
              automatico: true,
              criadoEm: new Date().toISOString(),
            });
          }
        }

        // Alerta checklist incompleto (5+ dias antes)
        if (days > 0 && days <= 10) {
          const checklist = ev.checklist || {};
          const itens = ["Solicitar viagem", "Cadastrar evento no IPCeduc e liberar inscrição", "Solicitar divulgação site/redes sociais"];
          const pendentes = itens.filter(i => !checklist[i]);
          if (pendentes.length > 0) {
            const jaExiste = alertasExistentes.find(a => a.eventoId === ev.id && a.tipo === "checklist");
            if (!jaExiste) {
              alertasAutomaticos.push({
                tipo: "checklist",
                modulo: "tceduc",
                titulo: `Checklist incompleto — ${nome}`,
                mensagem: `${pendentes.length} item${pendentes.length > 1 ? "s" : ""} pendente${pendentes.length > 1 ? "s" : ""}: ${pendentes.slice(0, 2).join(", ")}${pendentes.length > 2 ? "..." : ""}`,
                eventoId: ev.id,
                lido: false,
                automatico: true,
                criadoEm: new Date().toISOString(),
              });
            }
          }
        }
      }

      // Salvar alertas automáticos novos
      const novos = [];
      for (const al of alertasAutomaticos) {
        const ref = await addDoc(collection(db, "alertas"), al);
        novos.push({ id: ref.id, ...al });
      }

      setAlertas([...alertasExistentes, ...novos].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const marcarLido = async (id) => {
    await updateDoc(doc(db, "alertas", id), { lido: true });
    setAlertas(a => a.map(al => al.id === id ? { ...al, lido: true } : al));
  };

  const marcarTodosLidos = async () => {
    const pendentes = alertas.filter(a => !a.lido);
    for (const al of pendentes) {
      await updateDoc(doc(db, "alertas", al.id), { lido: true });
    }
    setAlertas(a => a.map(al => ({ ...al, lido: true })));
  };

  const criarAlerta = async () => {
    const novo = {
      ...form,
      modulo: "tceduc",
      lido: false,
      automatico: false,
      criadoEm: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, "alertas"), novo);
    setAlertas(a => [{ id: ref.id, ...novo }, ...a]);
    setModal(null); setForm({});
  };

  const filtrados = alertas.filter(a => {
    if (filtro === "pendentes") return !a.lido;
    if (filtro === "lidos") return a.lido;
    return true;
  });

  const pendentesCount = alertas.filter(a => !a.lido).length;
  const tipoInfo = (tipo) => TIPOS_ALERTA.find(t => t.id === tipo) || TIPOS_ALERTA[2];

  const inputStyle = {
    width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2",
    borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A",
    outline: "none", fontFamily: "'Montserrat', sans-serif",
  };
  const labelStyle = {
    display: "block", color: "#888", fontSize: 11, letterSpacing: 1,
    textTransform: "uppercase", marginBottom: 6, fontWeight: 600,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "24px 32px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div onClick={onBack} style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 20 }}>←</div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3 }}>TCEDUC</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>🔔 Alertas</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              {pendentesCount > 0 && (
                <div onClick={marcarTodosLidos} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: "10px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Marcar todos lidos</div>
              )}
              <div onClick={() => { setForm({ tipo: "geral" }); setModal("form"); }} style={{ background: "#E8730A", borderRadius: 14, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Novo Alerta</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "Total", value: alertas.length, cor: "rgba(255,255,255,0.12)" },
              { label: "Pendentes", value: pendentesCount, cor: pendentesCount > 0 ? "rgba(232,115,10,0.4)" : "rgba(255,255,255,0.12)" },
              { label: "Lidos", value: alertas.filter(a => a.lido).length, cor: "rgba(255,255,255,0.12)" },
            ].map((s, i) => (
              <div key={i} style={{ background: s.cor, borderRadius: 14, padding: "10px 20px" }}>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 80px" }}>
        {/* FILTROS */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {[
            { id: "todos", label: "Todos" },
            { id: "pendentes", label: `Pendentes (${pendentesCount})` },
            { id: "lidos", label: "Lidos" },
          ].map(f => (
            <div key={f.id} onClick={() => setFiltro(f.id)} style={{
              background: filtro === f.id ? "#1B3F7A" : "#fff",
              color: filtro === f.id ? "#fff" : "#555",
              borderRadius: 20, padding: "8px 20px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(27,63,122,0.08)",
            }}>{f.label}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>Verificando alertas...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#333", marginBottom: 8 }}>Tudo em dia!</div>
            <div style={{ color: "#aaa" }}>Nenhum alerta {filtro === "pendentes" ? "pendente" : ""} no momento.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtrados.map(al => {
              const tipo = tipoInfo(al.tipo);
              return (
                <div key={al.id} style={{
                  background: al.lido ? "#fff" : "#fff",
                  borderRadius: 18, padding: "18px 22px",
                  boxShadow: "0 2px 12px rgba(27,63,122,0.08)",
                  display: "flex", alignItems: "center", gap: 16,
                  border: al.lido ? "2px solid #f0f0f0" : `2px solid ${tipo.cor}30`,
                  opacity: al.lido ? 0.6 : 1,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: al.lido ? "#f0f0f0" : tipo.cor + "18",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                  }}>{tipo.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A" }}>{al.titulo}</div>
                      {al.automatico && <div style={{ background: "#f0f4ff", borderRadius: 6, padding: "1px 8px", fontSize: 10, color: "#1B3F7A", fontWeight: 600 }}>AUTO</div>}
                    </div>
                    {al.mensagem && <div style={{ color: "#888", fontSize: 13 }}>{al.mensagem}</div>}
                    <div style={{ color: "#bbb", fontSize: 11, marginTop: 4 }}>
                      {new Date(al.criadoEm).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  {!al.lido && (
                    <div onClick={() => marcarLido(al.id)} style={{
                      background: "#e8f5e9", border: "1px solid #c8e6c9",
                      borderRadius: 12, padding: "8px 16px",
                      color: "#059669", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    }}>✓ Lido</div>
                  )}
                  {al.lido && <div style={{ color: "#bbb", fontSize: 20 }}>✓</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL FORM */}
      {modal === "form" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 500, padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1B3F7A" }}>➕ Novo Alerta</div>
              <div onClick={() => setModal(null)} style={{ width: 36, height: 36, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo || "geral"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inputStyle}>
                  {TIPOS_ALERTA.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Título *</label>
                <input value={form.titulo || ""} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título do alerta" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mensagem</label>
                <textarea value={form.mensagem || ""} onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))} placeholder="Detalhes do alerta..." style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
              </div>
            </div>
            <button onClick={criarAlerta} style={{ width: "100%", marginTop: 20, background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>💾 Criar Alerta</button>
          </div>
        </div>
      )}
    </div>
  );
}
