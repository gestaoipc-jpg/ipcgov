import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const inputStyle = {
  width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2",
  borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A",
  outline: "none", fontFamily: "'Montserrat', sans-serif",
};
const labelStyle = {
  display: "block", color: "#888", fontSize: 11, letterSpacing: 1,
  textTransform: "uppercase", marginBottom: 6, fontWeight: 600,
};

export default function CadastrosPage({ onBack }) {
  const [aba, setAba] = useState("instrutores");
  const [instrutores, setInstrutores] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [iSnap, mSnap, eSnap] = await Promise.all([
        getDocs(collection(db, "tceduc_instrutores")),
        getDocs(collection(db, "tceduc_motoristas")),
        getDocs(collection(db, "tceduc_equipe")),
      ]);
      setInstrutores(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMotoristas(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEquipe(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const colecao = () => {
    if (aba === "instrutores") return "tceduc_instrutores";
    if (aba === "motoristas") return "tceduc_motoristas";
    return "tceduc_equipe";
  };
  const lista = () => {
    if (aba === "instrutores") return instrutores;
    if (aba === "motoristas") return motoristas;
    return equipe;
  };
  const setLista = (data) => {
    if (aba === "instrutores") setInstrutores(data);
    else if (aba === "motoristas") setMotoristas(data);
    else setEquipe(data);
  };

  const save = async () => {
    if (selected) {
      await updateDoc(doc(db, colecao(), selected.id), form);
      setLista(lista().map(i => i.id === selected.id ? { ...i, ...form } : i));
    } else {
      const ref = await addDoc(collection(db, colecao()), { ...form, criadoEm: new Date().toISOString() });
      setLista([...lista(), { id: ref.id, ...form }]);
    }
    setModal(null); setSelected(null); setForm({});
  };

  const del = async (id) => {
    await deleteDoc(doc(db, colecao(), id));
    setLista(lista().filter(i => i.id !== id));
    setModal(null); setSelected(null);
  };

  const abas = [
    { id: "instrutores", icon: "👨‍🏫", label: "Instrutores", cor: "#1B3F7A" },
    { id: "motoristas", icon: "🚗", label: "Motoristas", cor: "#059669" },
    { id: "equipe", icon: "👥", label: "Equipe IPC", cor: "#7c3aed" },
  ];

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
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>Cadastros</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div onClick={() => { setSelected(null); setForm({}); setModal("form"); }} style={{ background: "#E8730A", borderRadius: 14, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Novo</div>
            </div>
          </div>
          {/* Abas */}
          <div style={{ display: "flex", gap: 10 }}>
            {abas.map(a => (
              <div key={a.id} onClick={() => setAba(a.id)} style={{
                background: aba === a.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
                border: `1px solid ${aba === a.id ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 12, padding: "8px 16px",
                color: "#fff", fontSize: 13, fontWeight: aba === a.id ? 700 : 500,
                cursor: "pointer",
              }}>{a.icon} {a.label} <span style={{ opacity: 0.6, fontSize: 11 }}>({aba === a.id ? lista().length : aba === "instrutores" ? instrutores.length : aba === "motoristas" ? motoristas.length : equipe.length})</span></div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>Carregando...</div>
        ) : lista().length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>👤</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#333", marginBottom: 8 }}>Nenhum cadastro ainda</div>
            <div style={{ color: "#aaa", marginBottom: 24 }}>Clique em "+ Novo" para adicionar</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {lista().map(item => (
              <div key={item.id} onClick={() => { setSelected(item); setModal("detalhe"); }} style={{
                background: "#fff", borderRadius: 20, padding: "20px 22px",
                boxShadow: "0 2px 12px rgba(27,63,122,0.08)", cursor: "pointer",
                transition: "transform .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: "#1B3F7A18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
                    {aba === "instrutores" ? "👨‍🏫" : aba === "motoristas" ? "🚗" : "👥"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A" }}>{item.nome}</div>
                    {item.email && <div style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>{item.email}</div>}
                    {item.telefone && <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>📱 {item.telefone}</div>}
                  </div>
                </div>
                {item.especialidade && (
                  <div style={{ marginTop: 12, background: "#f0f4ff", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#1B3F7A" }}>
                    🎓 {item.especialidade}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DETALHE */}
      {modal === "detalhe" && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 480, padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>{aba === "instrutores" ? "👨‍🏫" : aba === "motoristas" ? "🚗" : "👥"}</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: "#1B3F7A" }}>{selected.nome}</div>
              {selected.email && <div style={{ color: "#aaa", fontSize: 14, marginTop: 4 }}>{selected.email}</div>}
              {selected.telefone && <div style={{ color: "#888", fontSize: 14, marginTop: 4 }}>📱 {selected.telefone}</div>}
              {selected.especialidade && <div style={{ background: "#f0f4ff", borderRadius: 10, padding: "6px 16px", display: "inline-block", marginTop: 10, fontSize: 13, color: "#1B3F7A" }}>🎓 {selected.especialidade}</div>}
              {selected.observacoes && <div style={{ background: "#f8f9fb", borderRadius: 12, padding: 14, marginTop: 14, fontSize: 13, color: "#555", textAlign: "left" }}>{selected.observacoes}</div>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setForm({ ...selected }); setModal("form"); }} style={{ flex: 1, background: "#1B3F7A", border: "none", borderRadius: 14, padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>✏️ Editar</button>
              <button onClick={() => del(selected.id)} style={{ width: 52, background: "#fee2e2", border: "none", borderRadius: 14, color: "#dc2626", fontSize: 20, cursor: "pointer" }}>🗑</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {modal === "form" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, padding: 32, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1B3F7A" }}>{selected ? "✏️ Editar" : "➕ Novo"} {aba === "instrutores" ? "Instrutor" : aba === "motoristas" ? "Motorista" : "Membro da Equipe"}</div>
              <div onClick={() => setModal(null)} style={{ width: 36, height: 36, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div><label style={labelStyle}>Nome completo *</label><input value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" style={inputStyle} /></div>
              <div><label style={labelStyle}>E-mail</label><input type="email" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@tce.ce.gov.br" style={inputStyle} /></div>
              <div><label style={labelStyle}>Telefone / WhatsApp</label><input value={form.telefone || ""} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(85) 99999-9999" style={inputStyle} /></div>
              {aba === "instrutores" && (
                <div><label style={labelStyle}>Especialidade / Curso</label><input value={form.especialidade || ""} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))} placeholder="Ex: Lei de Licitações, Saneamento..." style={inputStyle} /></div>
              )}
              <div><label style={labelStyle}>Observações</label><textarea value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} /></div>
            </div>
            <button onClick={save} style={{ width: "100%", marginTop: 20, background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>💾 Salvar</button>
          </div>
        </div>
      )}
    </div>
  );
}
