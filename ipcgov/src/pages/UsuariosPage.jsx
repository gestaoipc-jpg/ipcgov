import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";

const MODULES = [
  { id: "tceduc", name: "TCEduc", icon: "🎓" },
  { id: "designer", name: "IPC Designer", icon: "🎨" },
  { id: "processos", name: "IPC Processos", icon: "📋" },
  { id: "almoxarifado", name: "Almoxarifado", icon: "📦" },
  { id: "indicadores", name: "Indicadores", icon: "📊" },
  { id: "pessoas", name: "IPC Pessoas", icon: "👥" },
];

const PERFIS = ["admin", "coordenador", "equipe", "instrutor", "motorista"];

const inputStyle = {
  width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2",
  borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1B3F7A",
  outline: "none", fontFamily: "'Montserrat', sans-serif",
};
const labelStyle = {
  display: "block", color: "#888", fontSize: 11, letterSpacing: 1,
  textTransform: "uppercase", marginBottom: 6, fontWeight: 600,
};

export default function UsuariosPage({ onBack }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => { loadUsuarios(); }, []);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "usuarios"));
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const saveUsuario = async () => {
    setErro(""); setSucesso("");
    try {
      if (selected) {
        await updateDoc(doc(db, "usuarios", selected.id), {
          nome: form.nome,
          perfil: form.perfil,
          telefone: form.telefone,
          modulos: form.modulos || [],
          atualizadoEm: new Date().toISOString(),
        });
        setUsuarios(u => u.map(us => us.id === selected.id ? { ...us, ...form } : us));
        setSucesso("Usuário atualizado com sucesso!");
      } else {
        // Criar no Firebase Auth
        const cred = await createUserWithEmailAndPassword(auth, form.email, "TCE1234567890!@#");
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          email: form.email,
          nome: form.nome,
          perfil: form.perfil || "usuario",
          telefone: form.telefone || "",
          modulos: form.modulos || [],
          criadoEm: new Date().toISOString(),
          primeiroAcesso: true,
        });
        setUsuarios(u => [...u, { id: cred.user.uid, ...form, primeiroAcesso: true }]);
        setSucesso(`Usuário criado! Senha padrão: TCE1234567890!@#`);
      }
      setTimeout(() => { setModal(null); setSelected(null); setForm({}); setSucesso(""); }, 2000);
    } catch (e) {
      if (e.code === "auth/email-already-in-use") setErro("Este e-mail já está cadastrado.");
      else setErro("Erro ao salvar usuário. Tente novamente.");
    }
  };

  const deleteUsuario = async (id) => {
    await deleteDoc(doc(db, "usuarios", id));
    setUsuarios(u => u.filter(us => us.id !== id));
    setModal(null); setSelected(null);
  };

  const toggleModulo = (modId) => {
    const atual = form.modulos || [];
    setForm(f => ({
      ...f,
      modulos: atual.includes(modId) ? atual.filter(m => m !== modId) : [...atual, modId],
    }));
  };

  const filtered = usuarios.filter(u =>
    u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase())
  );

  const perfilCor = { admin: "#E8730A", coordenador: "#1B3F7A", equipe: "#059669", instrutor: "#7c3aed", motorista: "#0891b2" };
  const perfilIcon = { admin: "👑", coordenador: "🎯", equipe: "👥", instrutor: "👨‍🏫", motorista: "🚗" };

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "24px 32px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div onClick={onBack} style={{
              width: 40, height: 40, background: "rgba(255,255,255,0.15)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff", fontSize: 20,
            }}>←</div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3 }}>SISTEMA</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>Gestão de Usuários</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div onClick={() => { setSelected(null); setForm({ perfil: "equipe", modulos: [] }); setModal("form"); }} style={{
                background: "#E8730A", borderRadius: 14, padding: "10px 20px",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>+ Novo Usuário</div>
            </div>
          </div>
          {/* Stats */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "Total", value: usuarios.length },
              { label: "Admins", value: usuarios.filter(u => u.perfil === "admin").length },
              { label: "Equipe", value: usuarios.filter(u => u.perfil === "equipe").length },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "10px 20px" }}>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 100px" }}>
        {/* BUSCA */}
        <input
          placeholder="🔍 Buscar por nome ou e-mail..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{ ...inputStyle, marginBottom: 20, fontSize: 15 }}
        />

        {/* LISTA */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>Carregando usuários...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {filtered.map(u => (
              <div key={u.id} style={{
                background: "#fff", borderRadius: 20, padding: "20px 22px",
                boxShadow: "0 2px 12px rgba(27,63,122,0.08)",
                border: `2px solid ${(perfilCor[u.perfil] || "#1B3F7A")}18`,
                cursor: "pointer", transition: "transform .15s",
              }}
                onClick={() => { setSelected(u); setModal("detalhe"); }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 16,
                    background: `${perfilCor[u.perfil] || "#1B3F7A"}20`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                  }}>{perfilIcon[u.perfil] || "👤"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A" }}>{u.nome || "—"}</div>
                    <div style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>{u.email}</div>
                  </div>
                  <div style={{
                    background: `${perfilCor[u.perfil] || "#1B3F7A"}15`,
                    border: `1px solid ${perfilCor[u.perfil] || "#1B3F7A"}30`,
                    borderRadius: 10, padding: "3px 10px",
                    fontSize: 10, fontWeight: 700,
                    color: perfilCor[u.perfil] || "#1B3F7A",
                    textTransform: "uppercase",
                  }}>{u.perfil}</div>
                </div>
                {/* Módulos */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(u.modulos || []).map(m => {
                    const mod = MODULES.find(mo => mo.id === m);
                    return mod ? (
                      <div key={m} style={{
                        background: "#f0f4ff", borderRadius: 8, padding: "3px 10px",
                        fontSize: 11, color: "#1B3F7A", fontWeight: 600,
                      }}>{mod.icon} {mod.name}</div>
                    ) : null;
                  })}
                  {u.perfil === "admin" && (
                    <div style={{ background: "#fff3e0", borderRadius: 8, padding: "3px 10px", fontSize: 11, color: "#E8730A", fontWeight: 600 }}>
                      👑 Todos os módulos
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DETALHE */}
      {modal === "detalhe" && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 500, padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>{perfilIcon[selected.perfil] || "👤"}</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: "#1B3F7A" }}>{selected.nome}</div>
              <div style={{ color: "#aaa", fontSize: 14, marginTop: 4 }}>{selected.email}</div>
              <div style={{
                display: "inline-block", marginTop: 10,
                background: `${perfilCor[selected.perfil] || "#1B3F7A"}15`,
                border: `1px solid ${perfilCor[selected.perfil] || "#1B3F7A"}30`,
                borderRadius: 12, padding: "5px 16px",
                color: perfilCor[selected.perfil] || "#1B3F7A", fontWeight: 700, fontSize: 12,
              }}>{selected.perfil?.toUpperCase()}</div>
            </div>
            {selected.telefone && (
              <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#555" }}>
                📱 {selected.telefone}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setForm({ ...selected }); setModal("form"); }} style={{
                flex: 1, background: "#1B3F7A", border: "none", borderRadius: 14,
                padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                fontFamily: "'Montserrat', sans-serif",
              }}>✏️ Editar</button>
              <button onClick={() => deleteUsuario(selected.id)} style={{
                width: 52, background: "#fee2e2", border: "none", borderRadius: 14,
                color: "#dc2626", fontSize: 20, cursor: "pointer",
              }}>🗑</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {modal === "form" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 580, padding: 32, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1B3F7A" }}>{selected ? "✏️ Editar Usuário" : "➕ Novo Usuário"}</div>
              <div onClick={() => setModal(null)} style={{ width: 36, height: 36, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#1B3F7A" }}>✕</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Nome completo</label>
                <input value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do servidor" style={inputStyle} />
              </div>
              {!selected && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>E-mail</label>
                  <input type="email" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@tce.ce.gov.br" style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Telefone/WhatsApp</label>
                <input value={form.telefone || ""} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(85) 99999-9999" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Perfil</label>
                <select value={form.perfil || "equipe"} onChange={e => setForm(f => ({ ...f, perfil: e.target.value }))} style={inputStyle}>
                  {PERFIS.map(p => <option key={p} value={p}>{perfilIcon[p]} {p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Módulos com acesso</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {MODULES.map(m => {
                    const ativo = (form.modulos || []).includes(m.id);
                    return (
                      <div key={m.id} onClick={() => toggleModulo(m.id)} style={{
                        background: ativo ? "#1B3F7A" : "#f0f4ff",
                        border: `2px solid ${ativo ? "#1B3F7A" : "#e8edf2"}`,
                        borderRadius: 12, padding: "8px 16px",
                        fontSize: 13, color: ativo ? "#fff" : "#1B3F7A",
                        fontWeight: 700, cursor: "pointer", transition: "all .15s",
                      }}>{m.icon} {m.name}</div>
                    );
                  })}
                </div>
              </div>
            </div>

            {erro && <div style={{ background: "#fee2e2", borderRadius: 10, padding: "12px 14px", color: "#dc2626", fontSize: 13, marginTop: 16 }}>{erro}</div>}
            {sucesso && <div style={{ background: "#e8f5e9", borderRadius: 10, padding: "12px 14px", color: "#059669", fontSize: 13, marginTop: 16 }}>✅ {sucesso}</div>}

            {!selected && (
              <div style={{ background: "#f0f4ff", borderRadius: 12, padding: "12px 16px", marginTop: 16, fontSize: 12, color: "#1B3F7A" }}>
                🔑 Senha padrão: <strong>TCE1234567890!@#</strong> — o usuário deverá trocar no primeiro acesso.
              </div>
            )}

            <button onClick={saveUsuario} style={{
              width: "100%", marginTop: 20,
              background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)",
              border: "none", borderRadius: 14, padding: 16,
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif",
            }}>💾 Salvar Usuário</button>
          </div>
        </div>
      )}
    </div>
  );
}
