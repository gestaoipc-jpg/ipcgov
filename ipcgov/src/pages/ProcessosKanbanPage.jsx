import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const STATUS_COLUNAS = [
  { id:"Aguardando", cor:"#aaa", bg:"#f5f5f5" },
  { id:"Em Análise", cor:"#1B3F7A", bg:"#f0f4ff" },
  { id:"Em Tramitação", cor:"#0891b2", bg:"#f0f9ff" },
  { id:"Aguardando Documentos", cor:"#E8730A", bg:"#fff8f0" },
  { id:"Aguardando Outra Área", cor:"#7c3aed", bg:"#f5f3ff" },
  { id:"Aguardando Assinatura", cor:"#d97706", bg:"#fffbeb" },
  { id:"Concluído", cor:"#059669", bg:"#f0fdf4" },
];
const COR_PRIORIDADE = { "Alta":"#dc2626","Média":"#E8730A","Baixa":"#059669" };

function formatDate(d) { if(!d)return null; const[y,m,day]=d.split("-"); return `${day}/${m}`; }
function diasRestantes(d) { if(!d)return null; return Math.ceil((new Date(d)-new Date())/86400000); }

export default function ProcessosKanbanPage({ onBack }) {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [filtroPrioridade, setFiltroPrioridade] = useState("todas");

  useEffect(() => { loadProcessos(); }, []);

  const loadProcessos = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "processos"));
      setProcessos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const filtrados = processos.filter(p => filtroPrioridade === "todas" || p.prioridade === filtroPrioridade);

  const onDragStart = (e, p) => { setDragging(p); e.dataTransfer.effectAllowed = "move"; };
  const onDragEnd = () => { setDragging(null); setDragOver(null); };
  const onDrop = async (e, colId) => {
    e.preventDefault();
    if (!dragging || dragging.status === colId) { setDragOver(null); return; }
    await updateDoc(doc(db, "processos", dragging.id), { status: colId, atualizadoEm: new Date().toISOString() });
    setProcessos(p => p.map(x => x.id === dragging.id ? { ...x, status: colId } : x));
    setDragging(null); setDragOver(null);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{height:6px;width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}`}</style>
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
          <div>
            <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC PROCESSOS</div>
            <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📋 Kanban</div>
          </div>
          <div style={{ marginLeft:"auto" }}>
            <select value={filtroPrioridade} onChange={e=>setFiltroPrioridade(e.target.value)} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, padding:"7px 14px", color:"#fff", fontSize:12, fontWeight:600, outline:"none" }}>
              <option value="todas" style={{ color:"#1B3F7A", background:"#fff" }}>Todas prioridades</option>
              {["Alta","Média","Baixa"].map(p=><option key={p} value={p} style={{ color:"#1B3F7A", background:"#fff" }}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign:"center", padding:80, color:"#aaa" }}>Carregando...</div>
      ) : (
        <div style={{ overflowX:"auto", padding:"24px 24px 60px" }}>
          <div style={{ display:"flex", gap:16, minWidth:"max-content" }}>
            {STATUS_COLUNAS.map(col => {
              const cards = filtrados.filter(p => p.status === col.id);
              const isDragOver = dragOver === col.id;
              return (
                <div key={col.id} onDragOver={e=>{e.preventDefault();setDragOver(col.id)}} onDrop={e=>onDrop(e,col.id)}
                  style={{ width:280, flexShrink:0, background:isDragOver?col.bg:"#f0f2f5", borderRadius:20, border:`2px solid ${isDragOver?col.cor:"transparent"}`, transition:"border 0.15s, background 0.15s", minHeight:500 }}>
                  <div style={{ padding:"16px 16px 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontWeight:800, fontSize:13, color:col.cor }}>{col.id}</div>
                    <div style={{ background:col.cor+"18", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700, color:col.cor }}>{cards.length}</div>
                  </div>
                  <div style={{ padding:"0 10px 10px", display:"flex", flexDirection:"column", gap:10 }}>
                    {cards.map(p => {
                      const dias = diasRestantes(p.dataSaida);
                      const atrasado = dias!==null&&dias<0;
                      const urgente = dias!==null&&dias>=0&&dias<=5;
                      return (
                        <div key={p.id} draggable onDragStart={e=>onDragStart(e,p)} onDragEnd={onDragEnd}
                          style={{ background:"#fff", borderRadius:14, padding:"14px", boxShadow:dragging?.id===p.id?"0 8px 24px rgba(27,63,122,0.2)":"0 2px 8px rgba(27,63,122,0.07)", cursor:"grab", opacity:dragging?.id===p.id?0.5:1, borderLeft:`3px solid ${COR_PRIORIDADE[p.prioridade]||"#aaa"}` }}>
                          <div style={{ display:"flex", gap:6, marginBottom:6, flexWrap:"wrap" }}>
                            {p.numero&&<div style={{ background:"#f0f4ff", borderRadius:6, padding:"1px 7px", fontSize:10, fontWeight:700, color:"#1B3F7A" }}>Nº {p.numero}</div>}
                            {p.protocolo&&<div style={{ background:"#f5f3ff", borderRadius:6, padding:"1px 7px", fontSize:10, fontWeight:700, color:"#7c3aed" }}>Prot. {p.protocolo}</div>}
                          </div>
                          <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:4, lineHeight:1.3 }}>{p.titulo}</div>
                          {p.objetivo&&<div style={{ fontSize:11, color:"#888", marginBottom:6, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{p.objetivo}</div>}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <div style={{ background:(COR_PRIORIDADE[p.prioridade]||"#aaa")+"18", borderRadius:6, padding:"2px 7px", fontSize:10, fontWeight:700, color:COR_PRIORIDADE[p.prioridade]||"#aaa" }}>⚡ {p.prioridade}</div>
                            {p.dataSaida&&<div style={{ fontSize:10, fontWeight:700, color:atrasado?"#dc2626":urgente?"#E8730A":"#888" }}>{atrasado?`⚠️ ${Math.abs(dias)}d atraso`:`📤 ${formatDate(p.dataSaida)}`}</div>}
                          </div>
                          {p.responsavel&&<div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #f0f0f0", fontSize:11, color:"#aaa" }}>👤 {p.responsavel}</div>}
                        </div>
                      );
                    })}
                    {cards.length===0&&<div style={{ height:80, borderRadius:12, border:`2px dashed ${isDragOver?col.cor:"#ddd"}`, display:"flex", alignItems:"center", justifyContent:"center", color:isDragOver?col.cor:"#ccc", fontSize:12, fontWeight:600 }}>{isDragOver?"Soltar aqui":"Sem processos"}</div>}
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
