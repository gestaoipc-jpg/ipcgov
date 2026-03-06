import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const STATUS_PADRAO = ["Aguardando","Em Análise","Em Tramitação","Aguardando Documentos","Aguardando Assinatura","Aguardando Outra Área","Concluído","Arquivado","Cancelado"];
const COR_STATUS = {
  "Aguardando":"#aaa","Em Análise":"#1B3F7A","Em Tramitação":"#0891b2",
  "Aguardando Documentos":"#E8730A","Aguardando Assinatura":"#d97706",
  "Aguardando Outra Área":"#7c3aed","Concluído":"#059669","Arquivado":"#555","Cancelado":"#dc2626",
};
const COR_PRIORIDADE = { "Alta":"#dc2626","Média":"#E8730A","Baixa":"#059669" };
const STATUS_ATIVOS = ["Aguardando","Em Análise","Em Tramitação","Aguardando Documentos","Aguardando Assinatura","Aguardando Outra Área"];

function diasRestantes(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}
function formatDate(d) {
  if (!d) return "—";
  const [y,m,day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function ProcessosDashboardPage({ onBack }) {
  const [processos, setProcessos] = useState([]);
  const [statusCustom, setStatusCustom] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todas");
  const [filtroMes, setFiltroMes] = useState("todos");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [pSnap, fSnap] = await Promise.all([
        getDocs(collection(db,"processos")),
        getDocs(collection(db,"processos_filtros")),
      ]);
      setProcessos(pSnap.docs.map(d=>({id:d.id,...d.data()})));
      const filtros = fSnap.docs.map(d=>({id:d.id,...d.data()}));
      const statusF = filtros.find(f=>f.tipo==="status");
      if (statusF?.opcoes) setStatusCustom(statusF.opcoes);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const statusOpcoes = statusCustom.length>0 ? statusCustom : STATUS_PADRAO;

  const mesesDisponiveis = ["todos",...[...new Set(processos.map(p=>p.criadoEm?.slice(0,7)).filter(Boolean))].sort().reverse()];

  const filtrados = processos.filter(p => {
    if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
    if (filtroPrioridade !== "todas" && p.prioridade !== filtroPrioridade) return false;
    if (filtroMes !== "todos" && !(p.criadoEm?.startsWith(filtroMes))) return false;
    return true;
  });

  const contadores = {};
  statusOpcoes.forEach(s=>{ contadores[s] = filtrados.filter(p=>p.status===s).length; });
  const total = filtrados.length;
  const ativos = filtrados.filter(p=>STATUS_ATIVOS.includes(p.status)).length;
  const concluidos = filtrados.filter(p=>p.status==="Concluído").length;
  const atrasados = filtrados.filter(p=>{ const d=diasRestantes(p.dataSaida); return d!==null&&d<0&&!["Concluído","Arquivado","Cancelado"].includes(p.status); });
  const foraDoPrazo = atrasados.length;
  const urgentes = filtrados.filter(p=>{ const d=diasRestantes(p.dataSaida); return d!==null&&d>=0&&d<=5&&!["Concluído","Arquivado","Cancelado"].includes(p.status); });

  const s = { fontFamily:"'Montserrat',sans-serif" };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", ...s }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} select,input{font-family:'Montserrat',sans-serif}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#0891b2,#0ea5c9)", padding:"28px 32px 44px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC PROCESSOS</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📊 Dashboard</div>
            </div>
            {/* FILTROS */}
            <div style={{ marginLeft:"auto", display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
              {/* Status */}
              {["todos",...statusOpcoes].map(st=>(
                <div key={st} onClick={()=>setFiltroStatus(st)} style={{ background:filtroStatus===st?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${filtroStatus===st?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  {st==="todos"?"Todos":st}
                </div>
              ))}
              <div style={{ width:1, background:"rgba(255,255,255,0.2)", margin:"0 4px" }}/>
              {/* Prioridade */}
              {["todas","Alta","Média","Baixa"].map(p=>(
                <div key={p} onClick={()=>setFiltroPrioridade(p)} style={{ background:filtroPrioridade===p?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${filtroPrioridade===p?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  {p==="todas"?"Todas prioridades":p}
                </div>
              ))}
            </div>
          </div>

          {/* FILTRO MÊS */}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ color:"rgba(255,255,255,0.6)", fontSize:12 }}>Mês:</span>
            {mesesDisponiveis.slice(0,9).map(m=>(
              <div key={m} onClick={()=>setFiltroMes(m)} style={{ background:filtroMes===m?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.08)", border:`1px solid ${filtroMes===m?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.1)"}`, borderRadius:10, padding:"5px 12px", color:"#fff", fontSize:11, fontWeight:filtroMes===m?700:500, cursor:"pointer" }}>
                {m==="todos"?"Todos":m.replace("-","/")}
              </div>
            ))}
          </div>

          {/* PILLS */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:18 }}>
            {[
              { label:"Total", value:total },
              { label:"Ativos", value:ativos },
              { label:"Concluídos", value:concluidos },
              { label:"Fora do prazo", value:foraDoPrazo, alert:foraDoPrazo>0 },
              { label:"Urgentes (≤5d)", value:urgentes.length, alert:urgentes.length>0 },
            ].map((p,i)=>(
              <div key={i} style={{ background:p.alert?"rgba(220,38,38,0.3)":"rgba(255,255,255,0.12)", border:p.alert?"1px solid rgba(220,38,38,0.5)":"none", borderRadius:14, padding:"10px 20px" }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>{p.value}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, marginTop:2 }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 32px 60px" }}>
        {loading ? <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando...</div> : (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

            {/* BARRAS POR STATUS */}
            <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(8,145,178,0.08)", gridColumn:"1/-1" }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:20 }}>📊 Processos por Status</div>
              {statusOpcoes.map(st=>{
                const qt = contadores[st]||0;
                const pct = total>0?(qt/total)*100:0;
                return (
                  <div key={st} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:COR_STATUS[st]||"#aaa" }}/>
                        <span style={{ fontSize:13, fontWeight:600, color:"#333" }}>{st}</span>
                      </div>
                      <span style={{ fontWeight:700, fontSize:13, color:COR_STATUS[st]||"#aaa" }}>{qt}</span>
                    </div>
                    <div style={{ background:"#f0f8ff", borderRadius:8, height:10, overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:COR_STATUS[st]||"#aaa", borderRadius:8, transition:"width 0.5s" }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FORA DO PRAZO */}
            <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(8,145,178,0.08)" }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#dc2626", marginBottom:16 }}>⚠️ Fora do Prazo ({atrasados.length})</div>
              {atrasados.length===0 ? (
                <div style={{ textAlign:"center", padding:20, color:"#aaa" }}>✅ Nenhum processo atrasado</div>
              ) : atrasados.slice(0,6).map(p=>{
                const dias = Math.abs(diasRestantes(p.dataSaida)||0);
                return (
                  <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #fff0f0" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>{p.numero||p.titulo||"Sem número"}</div>
                      <div style={{ fontSize:11, color:"#888" }}>Prazo: {formatDate(p.dataSaida)}</div>
                    </div>
                    <div style={{ background:"#fee2e2", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:700, color:"#dc2626" }}>{dias}d atraso</div>
                  </div>
                );
              })}
            </div>

            {/* PROGRESSO */}
            <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(8,145,178,0.08)" }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:20 }}>📈 Progresso</div>
              {[
                { label:"Taxa de conclusão", atual:concluidos, total, cor:"#059669" },
                { label:"Processos ativos", atual:ativos, total, cor:"#0891b2" },
                { label:"Fora do prazo", atual:foraDoPrazo, total, cor:"#dc2626" },
                { label:"Alta prioridade", atual:filtrados.filter(p=>p.prioridade==="Alta").length, total, cor:"#E8730A" },
              ].map((item,i)=>{
                const pct = item.total>0?Math.round((item.atual/item.total)*100):0;
                return (
                  <div key={i} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ fontSize:13, color:"#555" }}>{item.label}</span>
                      <span style={{ fontWeight:700, fontSize:13, color:item.cor }}>{pct}% <span style={{ color:"#aaa", fontWeight:400 }}>({item.atual}/{item.total})</span></span>
                    </div>
                    <div style={{ background:"#f0f8ff", borderRadius:8, height:10 }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:item.cor, borderRadius:8, transition:"width 0.5s" }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LISTA */}
            <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(8,145,178,0.08)", gridColumn:"1/-1", maxHeight:400, overflowY:"auto" }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:16 }}>📋 Processos ({filtrados.length})</div>
              {filtrados.length===0 ? (
                <div style={{ textAlign:"center", padding:30, color:"#aaa" }}>Nenhum processo com os filtros selecionados</div>
              ) : filtrados.map(p=>{
                const dias = diasRestantes(p.dataSaida);
                const atrasado = dias!==null&&dias<0&&!["Concluído","Arquivado","Cancelado"].includes(p.status);
                return (
                  <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #f0f8ff" }}>
                    <div style={{ width:4, height:40, borderRadius:4, background:atrasado?"#dc2626":COR_STATUS[p.status]||"#aaa", flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{p.numero||p.titulo||"Sem número"}</div>
                      <div style={{ fontSize:11, color:"#888", marginTop:2 }}>
                        {p.dataEntrada&&`Entrada: ${formatDate(p.dataEntrada)}`}
                        {p.dataSaida&&` · Prazo: ${formatDate(p.dataSaida)}`}
                        {atrasado&&<span style={{ color:"#dc2626", fontWeight:700 }}> · {Math.abs(dias)}d atraso</span>}
                      </div>
                    </div>
                    <div style={{ background:(COR_STATUS[p.status]||"#aaa")+"18", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:COR_STATUS[p.status]||"#aaa" }}>{p.status}</div>
                    {p.prioridade&&<div style={{ background:(COR_PRIORIDADE[p.prioridade]||"#aaa")+"18", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:COR_PRIORIDADE[p.prioridade]||"#aaa" }}>⚡{p.prioridade}</div>}
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
