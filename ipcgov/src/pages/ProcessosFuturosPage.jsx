import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const PROC_FUTURO_ICON = (<svg width="20" height="20" viewBox="0 0 42 42" fill="none"><rect x="10" y="9" width="13" height="17" rx="2.5" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.8"/><rect x="19" y="16" width="13" height="17" rx="2.5" fill="rgba(255,255,255,0.35)" stroke="white" strokeWidth="1.8"/></svg>);

export default function ProcessosFuturosPage({ onBack, user, userInfo }) {
  const [futuros, setFuturos]       = useState([]);
  const [liberados, setLiberados]   = useState([]); // processos_futuros não distribuídos com liberadoPagamento
  const [loading, setLoading]       = useState(true);
  const [membros, setMembros]       = useState([]);
  const [responsaveis, setResponsaveis] = useState({});
  const [distribuindo, setDistribuindo] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [fSnap, gSnap, sSnap] = await Promise.all([
        getDocs(collection(db, "processos_futuros")),
        getDocs(collection(db, "ipc_grupos_trabalho")),
        getDocs(collection(db, "ipc_servidores")),
      ]);
      const todos = fSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.distribuido);
      const lista = todos.sort((a, b) => (a.dataEvento || "").localeCompare(b.dataEvento || ""));
      setFuturos(lista);
      setLiberados(lista.filter(p => p.liberadoPagamento));

      // Membros do grupo Processo Administrativo para selecionar responsável
      const todos = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const gPA = todos.find(g => g.nome?.toLowerCase().includes("processo") && g.nome?.toLowerCase().includes("admin"));
      const servidores = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (gPA) {
        setMembros(servidores.filter(s => (s.grupos || []).includes(gPA.id)).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const distribuir = async (futuro) => {
    const responsavel = responsaveis[futuro.id] || "";
    if (!responsavel) { alert("Selecione um responsável antes de distribuir."); return; }
    setDistribuindo(futuro.id);
    try {
      const dados = {
        titulo:        futuro.titulo,
        objetivo:      futuro.objetivo,
        status:        "Aguardando",
        responsavel:   responsavel,
        tipo_processo: "TCEduc",
        origem:        "tceduc_viagem",
        viagemId:      futuro.viagemId || "",
        criadoEm:      new Date().toISOString(),
        criadoPor:     user?.email || "sistema",
        atualizadoEm:  new Date().toISOString(),
        ocorrencias:   [],
      };
      await addDoc(collection(db, "processos"), dados);
      await updateDoc(doc(db, "processos_futuros", futuro.id), { distribuido: true, distribuidoEm: new Date().toISOString(), responsavel });
      setFuturos(f => f.filter(x => x.id !== futuro.id));
    } catch (e) { console.error(e); alert("Erro ao distribuir."); }
    setDistribuindo(null);
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este processo futuro?")) return;
    await deleteDoc(doc(db, "processos_futuros", id));
    setFuturos(f => f.filter(x => x.id !== id));
  };

  const inputStyle = { width: "100%", background: "#f8f9fb", border: "1px solid #e8edf2", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#1B3F7A", outline: "none", fontFamily: "'Montserrat',sans-serif" };

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding: "20px 32px 36px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div onClick={onBack} style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 20, flexShrink: 0 }}>←</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(145deg,#047857,#34D399)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 10px rgba(4,120,87,0.4)" }}>
                {PROC_FUTURO_ICON}
              </div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3 }}>IPC PROCESSOS</div>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>Processos Futuros</div>
              </div>
            </div>
            <div style={{ marginLeft: "auto", background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 700 }}>
              🔒 Acesso restrito
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px 60px" }}>

        {/* LIBERADOS PARA PAGAMENTO — destaque */}
        {liberados.length > 0 && (
          <div style={{ background: "#dcfce7", border: "2px solid #059669", borderRadius: 16, padding: "16px 20px", marginBottom: 24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <span style={{ fontSize:22 }}>💰</span>
              <div style={{ fontWeight:800, fontSize:15, color:"#166534" }}>
                {liberados.length} processo{liberados.length!==1?"s":""} liberado{liberados.length!==1?"s":""} para pagamento
              </div>
            </div>
            <div style={{ fontSize:13, color:"#166534", marginLeft:32 }}>
              A coordenação do TCEduc autorizou o pagamento de instrutoria. Distribua o processo para que a ordem de pagamento seja emitida.
            </div>
          </div>
        )}

        {/* INFO */}
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
            Estes processos foram pré-criados automaticamente a partir de viagens TCEduc com ações educacionais que possuem pagamento de instrutoria.
            Selecione o responsável e clique em <strong>Distribuir</strong> para mover o processo para a lista principal do IPC Processos.
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>Carregando...</div>
        ) : futuros.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1B3F7A", marginBottom: 8 }}>Nenhum processo futuro pendente</div>
            <div style={{ color: "#aaa", fontSize: 14 }}>Todos os processos pré-criados foram distribuídos.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {futuros.map(futuro => {
              const diasRestantes = futuro.dataEvento
                ? Math.ceil((new Date(futuro.dataEvento + "T12:00:00") - new Date()) / (1000 * 60 * 60 * 24))
                : null;
              const urgente = diasRestantes !== null && diasRestantes <= 7;
              return (
                <div key={futuro.id} style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 12px rgba(27,63,122,0.08)", border: urgente ? "2px solid #dc2626" : "1px solid #e8edf2" }}>

                  {/* TOPO */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        <span style={{ background: "#eff6ff", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#1B3F7A" }}>TCEduc</span>
                        <span style={{ background: "#f0fdf4", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#059669" }}>Aguardando distribuição</span>
                      {futuro.liberadoPagamento && <span style={{ background: "#dcfce7", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#166534" }}>💰 Liberado para pagamento</span>}
                        {urgente && <span style={{ background: "#fee2e2", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#dc2626" }}>⚡ {diasRestantes}d para o evento</span>}
                        {diasRestantes !== null && !urgente && <span style={{ background: "#f8f9fb", borderRadius: 8, padding: "3px 10px", fontSize: 11, color: "#888" }}>📅 {diasRestantes}d para o evento</span>}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 17, color: "#1B3F7A", marginBottom: 4 }}>{futuro.titulo}</div>
                      {futuro.criadoEm && <div style={{ fontSize: 11, color: "#aaa" }}>Gerado em {new Date(futuro.criadoEm).toLocaleDateString("pt-BR")}</div>}
                    </div>
                    <div onClick={() => excluir(futuro.id)} style={{ color: "#dc2626", cursor: "pointer", fontSize: 18, padding: "0 4px", flexShrink: 0 }}>×</div>
                  </div>

                  {/* OBJETIVO */}
                  <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: "1px solid #e8edf2" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Objetivo</div>
                    <div style={{ fontSize: 13, color: "#333", whiteSpace: "pre-line", lineHeight: 1.7 }}>{futuro.objetivo}</div>
                  </div>

                  {/* DISTRIBUIR */}
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Responsável</div>
                      <select
                        value={responsaveis[futuro.id] || ""}
                        onChange={e => setResponsaveis(r => ({ ...r, [futuro.id]: e.target.value }))}
                        style={inputStyle}
                      >
                        <option value="">Selecione o responsável...</option>
                        {membros.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                      </select>
                    </div>
                    <div
                      onClick={() => !distribuindo && distribuir(futuro)}
                      style={{
                        background: distribuindo === futuro.id ? "#ccc" : "linear-gradient(135deg,#059669,#34D399)",
                        borderRadius: 12, padding: "12px 24px",
                        color: "#fff", fontWeight: 700, fontSize: 14,
                        cursor: distribuindo === futuro.id ? "not-allowed" : "pointer",
                        whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(5,150,105,0.3)",
                        flexShrink: 0,
                      }}
                    >
                      {distribuindo === futuro.id ? "Distribuindo..." : "✅ Distribuir Processo"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
