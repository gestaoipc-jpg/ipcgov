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
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // Busca externos do IPC Pessoas filtrando por tipo
      const eSnap = await getDocs(collection(db, "ipc_externos"));
      const externos = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInstrutores(externos.filter(e => e.tipo === "Instrutor(a)"));
      setMotoristas(externos.filter(e => e.tipo === "Motorista"));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const lista = () => aba === "instrutores" ? instrutores : motoristas;

  const abas = [
    { id: "instrutores", icon: "👨‍🏫", label: "Instrutores", cor: "#1B3F7A" },
    { id: "motoristas", icon: "🚗", label: "Motoristas", cor: "#059669" },
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
              <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 14px", color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600 }}>
                📝 Gerenciar em IPC Pessoas
              </div>
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
              }}>{a.icon} {a.label} <span style={{ opacity: 0.6, fontSize: 11 }}>({a.id === "instrutores" ? instrutores.length : motoristas.length})</span></div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 80px" }}>
        {/* Aviso */}
        <div style={{ background: "#f0f4ff", borderRadius: 14, padding: "12px 18px", marginBottom: 20, fontSize: 13, color: "#1B3F7A", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <span>Instrutores e motoristas são gerenciados no módulo <strong>IPC Pessoas → Colaboradores Externos</strong>.</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>Carregando...</div>
        ) : lista().length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{aba === "instrutores" ? "👨‍🏫" : "🚗"}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#333", marginBottom: 8 }}>Nenhum {aba === "instrutores" ? "instrutor" : "motorista"} cadastrado</div>
            <div style={{ color: "#aaa" }}>Cadastre em IPC Pessoas → Colaboradores Externos</div>
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
                    {aba === "instrutores" ? "👨‍🏫" : "🚗"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1B3F7A" }}>{item.nome}</div>
                    {item.email && <div style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>{item.email}</div>}
                    {item.contato && <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>📱 {item.contato}</div>}
                  </div>
                </div>
                {item.especialidade && (
                  <div style={{ marginTop: 12, background: "#f0f4ff", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#1B3F7A" }}>
                    🎓 {item.especialidade}
                  </div>
                )}
                {item.orgao && (
                  <div style={{ marginTop: 8, background: "#f8f9fb", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#888" }}>
                    🏛️ {item.orgao}
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
              <div style={{ fontSize: 56, marginBottom: 12 }}>{aba === "instrutores" ? "👨‍🏫" : "🚗"}</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: "#1B3F7A" }}>{selected.nome}</div>
              {selected.email && <div style={{ color: "#aaa", fontSize: 14, marginTop: 4 }}>{selected.email}</div>}
              {selected.contato && <div style={{ color: "#888", fontSize: 14, marginTop: 4 }}>📱 {selected.contato}</div>}
              {selected.orgao && <div style={{ background: "#f0f4ff", borderRadius: 10, padding: "6px 16px", display: "inline-block", marginTop: 10, fontSize: 13, color: "#1B3F7A" }}>🏛️ {selected.orgao}</div>}
              {selected.especialidade && <div style={{ background: "#f5f3ff", borderRadius: 10, padding: "6px 16px", display: "inline-block", marginTop: 8, fontSize: 13, color: "#7c3aed" }}>🎓 {selected.especialidade}</div>}
              {selected.observacoes && <div style={{ background: "#f8f9fb", borderRadius: 12, padding: 14, marginTop: 14, fontSize: 13, color: "#555", textAlign: "left" }}>{selected.observacoes}</div>}
            </div>
            <div style={{ background: "#f0f4ff", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "#1B3F7A", textAlign: "center" }}>
              ✏️ Para editar, acesse <strong>IPC Pessoas → Colaboradores Externos</strong>
            </div>
            <button onClick={() => setModal(null)} style={{ width: "100%", marginTop: 14, background: "#f8f9fb", border: "none", borderRadius: 14, padding: 14, color: "#1B3F7A", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
