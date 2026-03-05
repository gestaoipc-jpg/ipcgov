import { useState, useEffect, useRef } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const STATUS_COLUNAS = [
  { id: "Aguardando", label: "Aguardando", cor: "#aaa", bg: "#f5f5f5" },
  { id: "Em Andamento", label: "Em Andamento", cor: "#1B3F7A", bg: "#f0f4ff" },
  { id: "Aguardando Gravação", label: "Aguardando Gravação", cor: "#7c3aed", bg: "#f5f3ff" },
  { id: "Em Edição", label: "Em Edição", cor: "#E8730A", bg: "#fff8f0" },
  { id: "Revisão", label: "Revisão", cor: "#d97706", bg: "#fffbeb" },
  { id: "Enviado para Libras", label: "Para Libras", cor: "#0891b2", bg: "#f0f9ff" },
  { id: "Concluído", label: "Concluído", cor: "#059669", bg: "#f0fdf4" },
];

const COR_PRIORIDADE = { "Alta": "#dc2626", "Média": "#E8730A", "Baixa": "#059669" };

function formatDate(d) {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return `${day}/${m}`;
}
function diasRestantes(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

export default function KanbanPage({ onBack, onAbrirAtividade }) {
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [filtroPrioridade, setFiltroPrioridade] = useState("todas");
  const [filtroDesigner, setFiltroDesigner] = useState("todos");

  useEffect(() => { loadAtividades(); }, []);

  const loadAtividades = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "designer_atividades"));
      setAtividades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filtradas = atividades.filter(a => {
    if (filtroPrioridade !== "todas" && a.prioridade !== filtroPrioridade) return false;
    if (filtroDesigner !== "todos" && a.designer !== filtroDesigner) return false;
    return true;
  });

  const designers = [...new Set(atividades.map(a => a.designer).filter(Boolean))];

  // Drag handlers
  const onDragStart = (e, at) => {
    setDragging(at);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnd = () => { setDragging(null); setDragOver(null); };
  const onDragOverCol = (e, colId) => { e.preventDefault(); setDragOver(colId); };
  const onDropCol = async (e, colId) => {
    e.preventDefault();
    if (!dragging || dragging.status === colId) { setDragOver(null); return; }
    await updateDoc(doc(db, "designer_atividades", dragging.id), { status: colId, atualizadoEm: new Date().toISOString() });
    setAtividades(a => a.map(x => x.id === dragging.id ? { ...x, status: colId } : x));
    setDragging(null); setDragOver(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{height:6px;width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}`}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "20px 32px 24px" }}>
        <div style={{ maxWidth: "100%", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div onClick={onBack} style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 20, flexShrink: 0 }}>←</div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3 }}>IPC DESIGNER</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>📋 Kanban</div>
            </div>

            {/* FILTROS */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 600, outline: "none" }}>
                <option value="todas" style={{ color: "#1B3F7A", background: "#fff" }}>Todas prioridades</option>
                {["Alta","Média","Baixa"].map(p => <option key={p} value={p} style={{ color: "#1B3F7A", background: "#fff" }}>{p}</option>)}
              </select>
              <select value={filtroDesigner} onChange={e => setFiltroDesigner(e.target.value)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 600, outline: "none" }}>
                <option value="todos" style={{ color: "#1B3F7A", background: "#fff" }}>Todos designers</option>
                {designers.map(d => <option key={d} value={d} style={{ color: "#1B3F7A", background: "#fff" }}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* BOARD */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "#aaa" }}>Carregando kanban...</div>
      ) : (
        <div style={{ overflowX: "auto", padding: "24px 24px 60px" }}>
          <div style={{ display: "flex", gap: 16, minWidth: "max-content" }}>
            {STATUS_COLUNAS.map(col => {
              const cards = filtradas.filter(a => a.status === col.id);
              const isDragOver = dragOver === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={e => onDragOverCol(e, col.id)}
                  onDrop={e => onDropCol(e, col.id)}
                  style={{
                    width: 280, flexShrink: 0,
                    background: isDragOver ? col.bg : "#f0f2f5",
                    borderRadius: 20,
                    border: `2px solid ${isDragOver ? col.cor : "transparent"}`,
                    transition: "border 0.15s, background 0.15s",
                    minHeight: 500,
                  }}
                >
                  {/* COLUNA HEADER */}
                  <div style={{ padding: "16px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: col.cor }}>{col.label}</div>
                    </div>
                    <div style={{ background: col.cor + "18", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700, color: col.cor }}>{cards.length}</div>
                  </div>

                  {/* CARDS */}
                  <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {cards.sort((a, b) => {
                      const ord = { "Alta": 0, "Média": 1, "Baixa": 2 };
                      return (ord[a.prioridade] ?? 1) - (ord[b.prioridade] ?? 1);
                    }).map(at => {
                      const dias = diasRestantes(at.dataEntrega);
                      const atrasado = dias !== null && dias < 0;
                      const urgente = dias !== null && dias >= 0 && dias <= 3;
                      const isDragging = dragging?.id === at.id;

                      return (
                        <div
                          key={at.id}
                          draggable
                          onDragStart={e => onDragStart(e, at)}
                          onDragEnd={onDragEnd}
                          onClick={() => onAbrirAtividade && onAbrirAtividade(at)}
                          style={{
                            background: "#fff", borderRadius: 14, padding: "14px 14px",
                            boxShadow: isDragging ? "0 8px 24px rgba(27,63,122,0.2)" : "0 2px 8px rgba(27,63,122,0.07)",
                            cursor: "grab", opacity: isDragging ? 0.5 : 1,
                            borderLeft: `3px solid ${COR_PRIORIDADE[at.prioridade] || "#aaa"}`,
                            transition: "box-shadow 0.15s",
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 6, lineHeight: 1.3 }}>{at.titulo}</div>

                          {at.descricao && (
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{at.descricao}</div>
                          )}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <div style={{ background: (COR_PRIORIDADE[at.prioridade] || "#aaa") + "18", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700, color: COR_PRIORIDADE[at.prioridade] || "#aaa" }}>⚡ {at.prioridade}</div>
                              {at.solicitacaoExterna && <div style={{ background: "#f0f4ff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700, color: "#1B3F7A" }}>EXT</div>}
                            </div>
                            {at.dataEntrega && (
                              <div style={{ fontSize: 10, fontWeight: 700, color: atrasado ? "#dc2626" : urgente ? "#E8730A" : "#888" }}>
                                {atrasado ? `⚠️ ${Math.abs(dias)}d atraso` : `📅 ${formatDate(at.dataEntrega)}`}
                              </div>
                            )}
                          </div>

                          {at.designer && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f0f0f0", fontSize: 11, color: "#aaa" }}>👤 {at.designer}</div>
                          )}

                          {(at.ocorrencias || []).length > 0 && (
                            <div style={{ marginTop: 4, fontSize: 10, color: "#E8730A", fontWeight: 700 }}>⚠️ {at.ocorrencias.length} ocorrência{at.ocorrencias.length > 1 ? "s" : ""}</div>
                          )}
                        </div>
                      );
                    })}

                    {/* Drop zone vazio */}
                    {cards.length === 0 && (
                      <div style={{ height: 80, borderRadius: 12, border: `2px dashed ${isDragOver ? col.cor : "#ddd"}`, display: "flex", alignItems: "center", justifyContent: "center", color: isDragOver ? col.cor : "#ccc", fontSize: 12, fontWeight: 600 }}>
                        {isDragOver ? "Soltar aqui" : "Sem atividades"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
