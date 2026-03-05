import { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

function initials(nome) { if(!nome)return"?"; return nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase(); }
function corAvatar(nome) { const cores=["#1B3F7A","#7c3aed","#059669","#E8730A","#0891b2","#dc2626"]; let h=0; for(let c of (nome||""))h+=c.charCodeAt(0); return cores[h%cores.length]; }

function buildTree(servidores) {
  const map = {};
  servidores.forEach(s => { map[s.nome] = { ...s, filhos: [] }; });
  const raizes = [];
  servidores.forEach(s => {
    if (s.chefia && map[s.chefia]) {
      map[s.chefia].filhos.push(map[s.nome]);
    } else {
      raizes.push(map[s.nome]);
    }
  });
  return raizes;
}

function NodeCard({ node, nivel = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const temFilhos = node.filhos && node.filhos.length > 0;
  const cores = ["#1B3F7A","#2a5ba8","#0891b2","#059669","#7c3aed"];
  const cor = cores[Math.min(nivel, cores.length-1)];

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      {/* CARD */}
      <div style={{ position:"relative" }}>
        <div style={{
          background:"#fff", borderRadius:16, padding:"14px 18px", minWidth:180, maxWidth:220,
          boxShadow:`0 4px 16px ${cor}22`, border:`2px solid ${cor}30`,
          textAlign:"center", cursor:temFilhos?"pointer":"default",
          transition:"transform 0.15s, box-shadow 0.15s",
        }} onClick={()=>temFilhos&&setExpanded(!expanded)}
          onMouseEnter={e=>{if(temFilhos){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 20px ${cor}33`;}}}
          onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=`0 4px 16px ${cor}22`;}}>
          <div style={{ width:48, height:48, borderRadius:14, background:corAvatar(node.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:18, margin:"0 auto 10px" }}>{initials(node.nome)}</div>
          <div style={{ fontWeight:700, fontSize:13, color:cor, lineHeight:1.3, marginBottom:4 }}>{node.nome}</div>
          <div style={{ fontSize:11, color:"#888", marginBottom:3 }}>{node.cargo}</div>
          {node.setor && <div style={{ background:cor+"18", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700, color:cor, display:"inline-block" }}>{node.setor}</div>}
          {node.criarAcesso && <div style={{ marginTop:4, fontSize:9, color:"#059669", fontWeight:700 }}>🔑 {node.nivelAcesso||"colaborador"}</div>}
          {temFilhos && <div style={{ marginTop:6, fontSize:11, color:"#aaa" }}>{expanded?"▲":"▼"} {node.filhos.length} subordinado{node.filhos.length!==1?"s":""}</div>}
        </div>
      </div>

      {/* FILHOS */}
      {temFilhos && expanded && (
        <div style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", marginTop:0 }}>
          {/* linha vertical */}
          <div style={{ width:2, height:24, background:cor+"40" }}/>
          {/* linha horizontal */}
          {node.filhos.length > 1 && (
            <div style={{ position:"relative", display:"flex", gap:24, justifyContent:"center" }}>
              <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", height:2, background:cor+"40", width:`calc(100% - 80px)` }}/>
              {node.filhos.map((filho,i)=>(
                <div key={filho.id} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <div style={{ width:2, height:20, background:cor+"40" }}/>
                  <NodeCard node={filho} nivel={nivel+1}/>
                </div>
              ))}
            </div>
          )}
          {node.filhos.length === 1 && (
            <NodeCard node={node.filhos[0]} nivel={nivel+1}/>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrganogramaPage({ onBack }) {
  const [servidores, setServidores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [filtroSetor, setFiltroSetor] = useState("todos");

  useEffect(() => { loadServidores(); }, []);

  const loadServidores = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db,"ipc_servidores"));
      setServidores(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const filtrados = filtroSetor==="todos" ? servidores : servidores.filter(s=>s.setor===filtroSetor);
  const arvore = buildTree(filtrados);
  const setores = [...new Set(servidores.map(s=>s.setor).filter(Boolean))];

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
          <div>
            <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC PESSOAS</div>
            <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>🌳 Organograma</div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center" }}>
            <select value={filtroSetor} onChange={e=>setFiltroSetor(e.target.value)} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, padding:"7px 14px", color:"#fff", fontSize:12, fontWeight:600, outline:"none" }}>
              <option value="todos" style={{ color:"#1B3F7A", background:"#fff" }}>Todos os setores</option>
              {setores.map(s=><option key={s} value={s} style={{ color:"#1B3F7A", background:"#fff" }}>{s}</option>)}
            </select>
            <div style={{ display:"flex", gap:6 }}>
              <div onClick={()=>setZoom(z=>Math.min(z+0.1,1.5))} style={{ width:32, height:32, background:"rgba(255,255,255,0.15)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:18, fontWeight:700 }}>+</div>
              <div onClick={()=>setZoom(1)} style={{ height:32, background:"rgba(255,255,255,0.15)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:11, fontWeight:700, padding:"0 10px" }}>{Math.round(zoom*100)}%</div>
              <div onClick={()=>setZoom(z=>Math.max(z-0.1,0.4))} style={{ width:32, height:32, background:"rgba(255,255,255,0.15)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:18, fontWeight:700 }}>−</div>
            </div>
          </div>
        </div>
      </div>

      {/* ORGANOGRAMA */}
      {loading ? (
        <div style={{ textAlign:"center", padding:80, color:"#aaa" }}>Carregando organograma...</div>
      ) : servidores.length === 0 ? (
        <div style={{ textAlign:"center", padding:80 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🌳</div>
          <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum servidor cadastrado</div>
          <div style={{ color:"#aaa" }}>Cadastre servidores no IPC Pessoas para construir o organograma</div>
        </div>
      ) : (
        <div style={{ overflow:"auto", padding:"40px 40px 80px" }}>
          <div style={{ transform:`scale(${zoom})`, transformOrigin:"top center", transition:"transform 0.2s" }}>
            {arvore.length === 0 ? (
              <div style={{ textAlign:"center", color:"#aaa", padding:60, fontSize:14 }}>Sem servidores no filtro selecionado</div>
            ) : (
              <div style={{ display:"flex", gap:40, justifyContent:"center", flexWrap:"wrap" }}>
                {arvore.map(no=>(
                  <NodeCard key={no.id} node={no} nivel={0}/>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEGENDA */}
      <div style={{ position:"fixed", bottom:24, right:24, background:"#fff", borderRadius:16, padding:"14px 18px", boxShadow:"0 4px 20px rgba(27,63,122,0.12)", fontSize:11 }}>
        <div style={{ fontWeight:700, color:"#1B3F7A", marginBottom:8 }}>Hierarquia</div>
        {[["#1B3F7A","Nível 1 (Diretoria)"],["#2a5ba8","Nível 2"],["#0891b2","Nível 3"],["#059669","Nível 4+"]].map(([cor,label])=>(
          <div key={cor} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
            <div style={{ width:14, height:14, borderRadius:4, background:cor }}/>
            <span style={{ color:"#666" }}>{label}</span>
          </div>
        ))}
        <div style={{ color:"#aaa", marginTop:8, fontSize:10 }}>Clique para expandir/recolher</div>
      </div>
    </div>
  );
}
