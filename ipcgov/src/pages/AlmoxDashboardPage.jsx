import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

function formatDate(d) { if(!d)return"—"; const[y,m,day]=d.split("-"); return`${day}/${m}/${y}`; }
function formatDateTime(iso) { if(!iso)return"—"; return new Date(iso).toLocaleString("pt-BR"); }

export default function AlmoxDashboardPage({ onBack }) {
  const [materiais, setMateriais] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mSnap, mvSnap, sSnap, aSnap] = await Promise.all([
        getDocs(collection(db,"almox_materiais")),
        getDocs(collection(db,"almox_movimentacoes")),
        getDocs(collection(db,"almox_solicitacoes")),
        getDocs(collection(db,"almox_alertas")),
      ]);
      setMateriais(mSnap.docs.map(d=>({id:d.id,...d.data()})));
      setMovimentacoes(mvSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.criadoEm)-new Date(a.criadoEm)));
      setSolicitacoes(sSnap.docs.map(d=>({id:d.id,...d.data()})));
      setAlertas(aSnap.docs.map(d=>({id:d.id,...d.data()})).filter(a=>!a.lido));
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const totalEntradas = movimentacoes.filter(m=>m.tipo==="entrada").reduce((s,m)=>s+(m.quantidade||0),0);
  const totalSaidas = movimentacoes.filter(m=>m.tipo==="saida").reduce((s,m)=>s+(m.quantidade||0),0);
  const emBaixoEstoque = materiais.filter(m=>(m.estoqueAtual||0)<=(m.estoqueMinimo||0)&&m.estoqueMinimo>0);
  const solPendentes = solicitacoes.filter(s=>s.status==="Aguardando");

  // Material mais solicitado
  const consumoPorMaterial = {};
  movimentacoes.filter(m=>m.tipo==="saida").forEach(m=>{
    if(!consumoPorMaterial[m.materialNome]) consumoPorMaterial[m.materialNome]=0;
    consumoPorMaterial[m.materialNome]+=m.quantidade||0;
  });
  const topMateriais = Object.entries(consumoPorMaterial).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxConsumo = topMateriais[0]?.[1]||1;

  // Consumo por setor
  const consumoPorSetor = {};
  solicitacoes.filter(s=>s.status!=="Recusada").forEach(s=>{
    if(!consumoPorSetor[s.setor]) consumoPorSetor[s.setor]=0;
    consumoPorSetor[s.setor]+=(s.itens||[]).reduce((acc,it)=>acc+(parseInt(it.quantidade)||0),0);
  });
  const topSetores = Object.entries(consumoPorSetor).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxSetor = topSetores[0]?.[1]||1;

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}`}</style>

      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 32px" }}>
        <div style={{ maxWidth:1300, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>ALMOXARIFADO</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📊 Dashboard</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {[
              { label:"Materiais cadastrados", value:materiais.length, cor:"rgba(255,255,255,0.12)" },
              { label:"Total entradas", value:`${totalEntradas} un.`, cor:"rgba(5,150,105,0.35)" },
              { label:"Total saídas", value:`${totalSaidas} un.`, cor:"rgba(232,115,10,0.35)" },
              { label:"Sol. pendentes", value:solPendentes.length, cor:solPendentes.length>0?"rgba(220,38,38,0.35)":"rgba(255,255,255,0.12)" },
              { label:"Alertas ativos", value:alertas.length, cor:alertas.length>0?"rgba(220,38,38,0.4)":"rgba(255,255,255,0.12)" },
            ].map((s,i)=>(
              <div key={i} style={{ background:s.cor, borderRadius:14, padding:"10px 18px" }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>{s.value}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? <div style={{ textAlign:"center", padding:80, color:"#aaa" }}>Carregando dashboard...</div> : (
        <div style={{ maxWidth:1300, margin:"0 auto", padding:"24px 32px 60px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginBottom:20 }}>

            {/* ALERTAS */}
            <div style={{ background:"#fff", borderRadius:20, padding:22, boxShadow:"0 2px 12px rgba(27,63,122,0.08)", gridColumn:alertas.length>0?"1/-1":"auto" }}>
              {alertas.length>0 ? (
                <>
                  <div style={{ fontWeight:800, fontSize:15, color:"#dc2626", marginBottom:14 }}>⚠️ Alertas de Estoque ({alertas.length})</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10 }}>
                    {alertas.map(a=>(
                      <div key={a.id} style={{ background:"#fee2e2", borderRadius:12, padding:"12px 14px", border:"1px solid #fecaca" }}>
                        <div style={{ fontWeight:700, fontSize:13, color:"#dc2626", marginBottom:3 }}>{a.materialNome}</div>
                        <div style={{ fontSize:12, color:"#dc2626" }}>{a.mensagem}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign:"center", color:"#059669", fontWeight:700, fontSize:14 }}>✅ Nenhum alerta de estoque</div>
              )}
            </div>

            {/* MATERIAIS EM BAIXO ESTOQUE */}
            {emBaixoEstoque.length>0 && (
              <div style={{ background:"#fff", borderRadius:20, padding:22, boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>📉 Estoque Baixo</div>
                {emBaixoEstoque.map(m=>(
                  <div key={m.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #f0f0f0" }}>
                    <div style={{ fontWeight:600, fontSize:13, color:"#333" }}>{m.nome}</div>
                    <div style={{ fontWeight:700, fontSize:14, color:(m.estoqueAtual||0)===0?"#dc2626":"#E8730A" }}>{m.estoqueAtual||0}/{m.estoqueMinimo} {m.unidade||"un."}</div>
                  </div>
                ))}
              </div>
            )}

            {/* TOP MATERIAIS */}
            {topMateriais.length>0 && (
              <div style={{ background:"#fff", borderRadius:20, padding:22, boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:16 }}>📦 Mais Consumidos</div>
                {topMateriais.map(([nome,total],i)=>(
                  <div key={nome} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"#333" }}>{nome}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#1B3F7A" }}>{total} un.</div>
                    </div>
                    <div style={{ height:6, background:"#e8edf2", borderRadius:6 }}>
                      <div style={{ height:6, borderRadius:6, background:i===0?"#1B3F7A":i===1?"#E8730A":"#059669", width:`${(total/maxConsumo)*100}%` }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CONSUMO POR SETOR */}
            {topSetores.length>0 && (
              <div style={{ background:"#fff", borderRadius:20, padding:22, boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:16 }}>🏢 Consumo por Setor</div>
                {topSetores.map(([setor,total],i)=>(
                  <div key={setor} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:"#333" }}>{setor}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#1B3F7A" }}>{total} un.</div>
                    </div>
                    <div style={{ height:6, background:"#e8edf2", borderRadius:6 }}>
                      <div style={{ height:6, borderRadius:6, background:"#7c3aed", width:`${(total/maxSetor)*100}%` }}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ÚLTIMAS MOVIMENTAÇÕES */}
          <div style={{ background:"#fff", borderRadius:20, padding:22, boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
            <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:16 }}>🔄 Últimas Movimentações</div>
            {movimentacoes.length===0 ? (
              <div style={{ textAlign:"center", color:"#aaa", padding:30 }}>Nenhuma movimentação registrada</div>
            ) : movimentacoes.slice(0,10).map((mv,i)=>(
              <div key={mv.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:i<9?"1px solid #f0f0f0":"none" }}>
                <div style={{ width:40, height:40, borderRadius:12, background:mv.tipo==="entrada"?"#e8f5e9":"#fff3e0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                  {mv.tipo==="entrada"?"📥":"📤"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:"#333" }}>{mv.materialNome}</div>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>
                    {mv.tipo==="entrada"?`Entrada por ${mv.registradoPor}`:`Saída — ${mv.setor||mv.solicitante}`}
                    {mv.fornecedor?` · ${mv.fornecedor}`:""} · {formatDate(mv.data)}
                  </div>
                </div>
                <div style={{ fontWeight:700, fontSize:16, color:mv.tipo==="entrada"?"#059669":"#E8730A" }}>
                  {mv.tipo==="entrada"?"+":"-"}{mv.quantidade}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
