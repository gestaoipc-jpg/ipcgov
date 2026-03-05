import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
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

const FILTROS_PADRAO = [
  { id: "status_padrao", nome: "Status", tipo: "status", bloqueado: false, opcoes: ["Aguardando","Em Andamento","Aguardando Gravação","Em Edição","Enviado para Libras","Revisão","Concluído","Cancelado"] },
  { id: "prioridade_padrao", nome: "Prioridade", tipo: "prioridade", bloqueado: false, opcoes: ["Alta","Média","Baixa"] },
];

export default function FiltrosAdminPage({ onBack }) {
  const [filtros, setFiltros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "filtro" | "opcao"
  const [filtroSel, setFiltroSel] = useState(null);
  const [form, setForm] = useState({});
  const [novaOpcao, setNovaOpcao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { loadFiltros(); }, []);

  const loadFiltros = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "designer_filtros"));
      const salvos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Merge padrão com salvos
      const ids = salvos.map(f => f.id);
      const padrao = FILTROS_PADRAO.filter(f => !ids.includes(f.id));
      // Save padrão if not exists
      for (const f of padrao) {
        await addDoc(collection(db, "designer_filtros"), f);
      }
      const snap2 = await getDocs(collection(db, "designer_filtros"));
      setFiltros(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const salvarFiltro = async () => {
    if (!form.nome) return;
    setSalvando(true);
    try {
      const dados = { nome: form.nome, descricao: form.descricao || "", opcoes: form.opcoes || [], tipo: "custom" };
      if (filtroSel && filtroSel.id) {
        await updateDoc(doc(db, "designer_filtros", filtroSel.id), dados);
        setFiltros(f => f.map(x => x.id === filtroSel.id ? { ...x, ...dados } : x));
      } else {
        const ref = await addDoc(collection(db, "designer_filtros"), dados);
        setFiltros(f => [...f, { id: ref.id, ...dados }]);
      }
      setModal(null); setForm({});
    } catch (e) { console.error(e); }
    setSalvando(false);
  };

  const deletarFiltro = async (id) => {
    if (!window.confirm("Excluir este filtro?")) return;
    await deleteDoc(doc(db, "designer_filtros", id));
    setFiltros(f => f.filter(x => x.id !== id));
  };

  const adicionarOpcao = async (filtro) => {
    if (!novaOpcao.trim()) return;
    const novas = [...(filtro.opcoes || []), novaOpcao.trim()];
    await updateDoc(doc(db, "designer_filtros", filtro.id), { opcoes: novas });
    setFiltros(f => f.map(x => x.id === filtro.id ? { ...x, opcoes: novas } : x));
    if (filtroSel?.id === filtro.id) setFiltroSel(s => ({ ...s, opcoes: novas }));
    setNovaOpcao("");
  };

  const removerOpcao = async (filtro, opcao) => {
    const novas = (filtro.opcoes || []).filter(o => o !== opcao);
    await updateDoc(doc(db, "designer_filtros", filtro.id), { opcoes: novas });
    setFiltros(f => f.map(x => x.id === filtro.id ? { ...x, opcoes: novas } : x));
    if (filtroSel?.id === filtro.id) setFiltroSel(s => ({ ...s, opcoes: novas }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "20px 32px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div onClick={onBack} style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 20 }}>←</div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3 }}>IPC DESIGNER · ADMIN</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>⚙️ Filtros Customizáveis</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div onClick={() => { setForm({ opcoes: [] }); setFiltroSel(null); setModal("filtro"); }} style={{ background: "#E8730A", borderRadius: 14, padding: "10px 22px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Novo Filtro</div>
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 12 }}>Gerencie os filtros e status disponíveis para as atividades do IPC Designer</div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#aaa" }}>Carregando filtros...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {filtros.map(filtro => (
              <div key={filtro.id} style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 2px 12px rgba(27,63,122,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A" }}>{filtro.nome}</div>
                    {filtro.descricao && <div style={{ fontSize: 12, color: "#aaa", marginTop: 3 }}>{filtro.descricao}</div>}
                    <div style={{ fontSize: 10, color: filtro.tipo === "custom" ? "#7c3aed" : "#1B3F7A", fontWeight: 700, marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>
                      {filtro.tipo === "custom" ? "✦ Customizado" : "● Padrão"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div onClick={() => { setFiltroSel(filtro); setForm({ nome: filtro.nome, descricao: filtro.descricao, opcoes: [...(filtro.opcoes||[])] }); setModal("filtro"); }} style={{ width: 34, height: 34, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>✏️</div>
                    {filtro.tipo === "custom" && (
                      <div onClick={() => deletarFiltro(filtro.id)} style={{ width: 34, height: 34, background: "#fee2e2", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>🗑️</div>
                    )}
                  </div>
                </div>

                {/* OPÇÕES */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {(filtro.opcoes || []).map(opcao => (
                    <div key={opcao} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0f4ff", borderRadius: 10, padding: "5px 10px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1B3F7A" }}>{opcao}</span>
                      <span onClick={() => removerOpcao(filtro, opcao)} style={{ fontSize: 14, color: "#dc2626", cursor: "pointer", lineHeight: 1, fontWeight: 700 }}>×</span>
                    </div>
                  ))}
                </div>

                {/* ADICIONAR OPÇÃO */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="+ Nova opção..."
                    style={{ ...inputStyle, flex: 1, padding: "8px 12px", fontSize: 12 }}
                    onKeyDown={e => { if (e.key === "Enter") { adicionarOpcao(filtro); setNovaOpcao(""); } }}
                    onChange={e => setNovaOpcao(e.target.value)}
                    onBlur={() => setNovaOpcao("")}
                  />
                  <div onClick={() => adicionarOpcao(filtro)} style={{ background: "#1B3F7A", borderRadius: 10, width: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 20, flexShrink: 0 }}>+</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL NOVO/EDITAR FILTRO */}
      {modal === "filtro" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 480, padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: "#1B3F7A" }}>{filtroSel ? "✏️ Editar Filtro" : "➕ Novo Filtro"}</div>
              <div onClick={() => setModal(null)} style={{ width: 36, height: 36, background: "#f0f4ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: "#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Nome do Filtro *</label>
                <input value={form.nome || ""} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Tipo de Material, Canal, Formato..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <input value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Para que serve este filtro?" style={inputStyle} />
              </div>
            </div>
            <button onClick={salvarFiltro} disabled={salvando || !form.nome} style={{ width: "100%", marginTop: 20, background: salvando || !form.nome ? "#ccc" : "linear-gradient(135deg, #1B3F7A, #2a5ba8)", border: "none", borderRadius: 14, padding: 16, color: "#fff", fontWeight: 700, fontSize: 15, cursor: salvando || !form.nome ? "not-allowed" : "pointer", fontFamily: "'Montserrat', sans-serif" }}>
              {salvando ? "Salvando..." : "💾 Salvar Filtro"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
