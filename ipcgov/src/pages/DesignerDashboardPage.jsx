import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const STATUS_PADRAO = ["Aguardando","Em Andamento","Aguardando Gravação","Em Edição","Enviado para Libras","Revisão","Concluído","Cancelado"];
const COR_STATUS = {
  "Aguardando":"#aaa","Em Andamento":"#1B3F7A","Aguardando Gravação":"#7c3aed",
  "Em Edição":"#E8730A","Enviado para Libras":"#0891b2","Revisão":"#d97706",
  "Concluído":"#059669","Cancelado":"#dc2626",
};
const COR_PRIORIDADE = { "Alta":"#dc2626","Média":"#E8730A","Baixa":"#059669" };

function semanaDoAno(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  const yearStart = new Date(d.getFullYear(),0,1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function labelSemana(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const ini = new Date(d);
  ini.setDate(d.getDate() - d.getDay() + 1);
  const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
  const fmt = (x) => `${String(x.getDate()).padStart(2,"0")}/${String(x.getMonth()+1).padStart(2,"0")}`;
  return `${fmt(ini)}–${fmt(fim)}`;
}

export default function DesignerDashboardPage({ onBack }) {
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState("mes");
  const [filtroRef, setFiltroRef] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db,"designer_atividades"));
      setAtividades(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // Opções de meses e semanas disponíveis
  const mesesDisponiveis = [...new Set(atividades.map(a => a.criadoEm?.slice(0,7)).filter(Boolean))].sort().reverse();
  const semanasDisponiveis = [...new Set(atividades.map(a => {
    if (!a.criadoEm) return null;
    const d = new Date(a.criadoEm);
    return `${d.getFullYear()}-W${String(semanaDoAno(a.criadoEm)).padStart(2,"0")}`;
  }).filter(Boolean))].sort().reverse();

  const filtradas = atividades.filter(a => {
    if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
    if (filtroPrioridade !== "todas" && a.prioridade !== filtroPrioridade) return false;
    if (filtroRef && a.criadoEm) {
      if (filtroPeriodo === "mes") {
        if (!a.criadoEm.startsWith(filtroRef)) return false;
      } else {
        const d = new Date(a.criadoEm);
        const w = `${d.getFullYear()}-W${String(semanaDoAno(a.criadoEm)).padStart(2,"0")}`;
        if (w !== filtroRef) return false;
      }
    }
    return true;
  });

  const contadores = {};
  STATUS_PADRAO.forEach(s => { contadores[s] = filtradas.filter(a=>a.status===s).length; });
  const total = filtradas.length;
  const concluidas = filtradas.filter(a=>a.status==="Concluído").length;
  const emAndamento = filtradas.filter(a=>!["Concluído","Cancelado"].includes(a.status)).length;
  const altaPrioridade = filtradas.filter(a=>a.prioridade==="Alta"&&a.status!=="Concluído").length;
  const atrasadas = filtradas.filter(a=>{
    if (!a.prazo || ["Concluído","Cancelado"].includes(a.status)) return false;
    return new Date(a.prazo) < new Date();
  }).length;

  const s = { fontFamily:"'Montserrat',sans-serif" };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", ...s }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} select,input{font-family:'Montserrat',sans-serif}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#7c3aed,#9d5cf5)", padding:"28px 32px 44px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC DESIGNER</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📊 Dashboard</div>
            </div>
            {/* FILTROS NO HEADER */}
            <div style={{ marginLeft:"auto", display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
              {/* Período */}
              {["mes","semana"].map(p=>(
                <div key={p} onClick={()=>{ setFiltroPeriodo(p); setFiltroRef(p==="mes"?mesesDisponiveis[0]||"":semanasDisponiveis[0]||""); }} style={{ background:filtroPeriodo===p?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${filtroPeriodo===p?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  {p==="mes"?"📅 Mês":"📆 Semana"}
                </div>
              ))}
              <div style={{ width:1, background:"rgba(255,255,255,0.2)", margin:"0 4px" }}/>
              {/* Status */}
              {["todos",...STATUS_PADRAO].map(s=>(
                <div key={s} onClick={()=>setFiltroStatus(s)} style={{ background:filtroStatus===s?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${filtroStatus===s?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  {s==="todos"?"Todos":s}
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

          {/* SELETOR DE MÊS/SEMANA */}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ color:"rgba(255,255,255,0.6)", fontSize:12 }}>{filtroPeriodo==="mes"?"Mês:":"Semana:"}</span>
            {(filtroPeriodo==="mes"?mesesDisponiveis:semanasDisponiveis).slice(0,8).map(ref=>(
              <div key={ref} onClick={()=>setFiltroRef(ref)} style={{ background:filtroRef===ref?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.08)", border:`1px solid ${filtroRef===ref?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.1)"}`, borderRadius:10, padding:"5px 12px", color:"#fff", fontSize:11, fontWeight:filtroRef===ref?700:500, cursor:"pointer" }}>
                {filtroPeriodo==="mes"?ref.replace("-","/"):ref}
              </div>
            ))}
            {(filtroPeriodo==="mes"?mesesDisponiveis:semanasDisponiveis).length===0&&(
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:12 }}>Sem dados ainda</div>
            )}
          </div>

          {/* PILLS */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:18 }}>
            {[
              { label:"Total", value:total, accent:false },
              { label:"Em andamento", value:emAndamento, accent:false },
              { label:"Concluídas", value:concluidas, accent:false },
              { label:"Alta prioridade", value:altaPrioridade, accent:true },
              { label:"Atrasadas", value:atrasadas, accent:atrasadas>0 },
            ].map((p,i)=>(
              <div key={i} style={{ background:p.accent?"rgba(220,38,38,0.3)":"rgba(255,255,255,0.12)", border:p.accent?"1px solid rgba(220,38,38,0.5)":"none", borderRadius:14, padding:"10px 20px" }}>
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
            <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(124,58,237,0.08)", gridColumn:"1/-1" }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:20 }}>📊 Atividades por Status</div>
              {STATUS_PADRAO.map(s=>{
                const qt = contadores[s]||0;
                const pct = total>0?(qt/total)*100:0;
                return (
                  <div key={s} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:COR_STATUS[s]||"#aaa" }}/>
                        <span style={{ fontSize:13, fontWeight:600, color:"#333" }}>{s}</span>
                      </div>
                      <span style={{ fontWeight:700, fontSize:13, color:COR_STATUS[s]||"#aaa" }}>{qt}</span>
                    </div>
                    <div style={{ background:"#f0f4ff", borderRadius:8, height:10, overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:COR_STATUS[s]||"#aaa", borderRadius:8, transition:"width 0.5s" }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BARRAS POR PRIORIDADE */}
            <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(124,58,237,0.08)" }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:20 }}>⚡ Por Prioridade</div>
              {["Alta","Média","Baixa"].map(p=>{
                const qt = filtradas.filter(a=>a.prioridade===p).length;
                const pct = total>0?(qt/total)*100:0;
                return (
                  <div key={p} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#333" }}>{p}</span>
                      <span style={{ fontWeight:700, fontSize:13, color:COR_PRIORIDADE[p] }}>{qt}</span>
                    </div>
                    <div style={{ background:"#f0f4ff", borderRadius:8, height:12, overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:COR_PRIORIDADE[p], borderRadius:8, transition:"width 0.5s" }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PROGRESSO GERAL */}
            <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(124,58,237,0.08)" }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:20 }}>✅ Progresso Geral</div>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {[
                  { label:"Taxa de conclusão", atual:concluidas, total, cor:"#059669" },
                  { label:"Em andamento", atual:emAndamento, total, cor:"#1B3F7A" },
                  { label:"Alta prioridade pendente", atual:altaPrioridade, total, cor:"#dc2626" },
                ].map((item,i)=>{
                  const pct = item.total>0?Math.round((item.atual/item.total)*100):0;
                  return (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:13, color:"#555" }}>{item.label}</span>
                        <span style={{ fontWeight:700, fontSize:13, color:item.cor }}>{pct}% <span style={{ color:"#aaa", fontWeight:400 }}>({item.atual}/{item.total})</span></span>
                      </div>
                      <div style={{ background:"#f0f4ff", borderRadius:8, height:10 }}>
                        <div style={{ width:`${pct}%`, height:"100%", background:item.cor, borderRadius:8, transition:"width 0.5s" }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LISTA DE ATIVIDADES FILTRADAS */}
            <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(124,58,237,0.08)", gridColumn:"1/-1", maxHeight:400, overflowY:"auto" }}>
              <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:16 }}>📋 Atividades ({filtradas.length})</div>
              {filtradas.length===0 ? (
                <div style={{ textAlign:"center", padding:30, color:"#aaa" }}>Nenhuma atividade com os filtros selecionados</div>
              ) : filtradas.map(at=>(
                <div key={at.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #f0f4ff" }}>
                  <div style={{ width:4, height:40, borderRadius:4, background:COR_STATUS[at.status]||"#aaa", flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{at.titulo||at.nome||"Sem título"}</div>
                    <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{at.designer||"Sem designer"}{at.prazo?` · Prazo: ${at.prazo.split("-").reverse().join("/")}`:""}</div>
                  </div>
                  <div style={{ background:(COR_STATUS[at.status]||"#aaa")+"18", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:COR_STATUS[at.status]||"#aaa" }}>{at.status}</div>
                  {at.prioridade&&<div style={{ background:(COR_PRIORIDADE[at.prioridade]||"#aaa")+"18", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:COR_PRIORIDADE[at.prioridade]||"#aaa" }}>⚡{at.prioridade}</div>}
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
