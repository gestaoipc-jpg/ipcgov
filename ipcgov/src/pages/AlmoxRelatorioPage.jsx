import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

function formatDate(d) { if(!d)return"—"; const[y,m,day]=d.split("-"); return`${day}/${m}/${y}`; }
function formatDateTime(iso) { if(!iso)return"—"; return new Date(iso).toLocaleString("pt-BR"); }

export default function AlmoxRelatorioPage({ onBack }) {
  const [materiais, setMateriais] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState("geral"); // geral | material | setor | usuario
  const [filtroMaterial, setFiltroMaterial] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [gerando, setGerando] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mSnap, mvSnap, sSnap] = await Promise.all([
        getDocs(collection(db,"almox_materiais")),
        getDocs(collection(db,"almox_movimentacoes")),
        getDocs(collection(db,"almox_solicitacoes")),
      ]);
      setMateriais(mSnap.docs.map(d=>({id:d.id,...d.data()})));
      setMovimentacoes(mvSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.criadoEm)-new Date(a.criadoEm)));
      setSolicitacoes(sSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.criadoEm)-new Date(a.criadoEm)));
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const gerarPDF = () => { setGerando(true); setTimeout(()=>{ window.print(); setGerando(false); },300); };

  const setores = [...new Set(solicitacoes.map(s=>s.setor).filter(Boolean))];
  const usuarios = [...new Set(solicitacoes.map(s=>s.solicitante).filter(Boolean))];

  // DADOS POR MODO
  const movMaterial = filtroMaterial ? movimentacoes.filter(m=>m.materialId===filtroMaterial) : [];
  const solSetor = filtroSetor ? solicitacoes.filter(s=>s.setor===filtroSetor) : [];
  const solUsuario = filtroUsuario ? solicitacoes.filter(s=>s.solicitante===filtroUsuario) : [];

  // Stats gerais
  const totalEntradas = movimentacoes.filter(m=>m.tipo==="entrada").reduce((s,m)=>s+(m.quantidade||0),0);
  const totalSaidas = movimentacoes.filter(m=>m.tipo==="saida").reduce((s,m)=>s+(m.quantidade||0),0);
  const emBaixoEstoque = materiais.filter(m=>(m.estoqueAtual||0)<=(m.estoqueMinimo||0)&&m.estoqueMinimo>0);

  // Consumo por material
  const consumoPorMat = {};
  movimentacoes.filter(m=>m.tipo==="saida").forEach(m=>{ if(!consumoPorMat[m.materialNome])consumoPorMat[m.materialNome]=0; consumoPorMat[m.materialNome]+=m.quantidade||0; });
  const rankMateriais = Object.entries(consumoPorMat).sort((a,b)=>b[1]-a[1]);

  // Consumo por setor
  const consumoPorSetor = {};
  solicitacoes.filter(s=>s.status!=="Recusada").forEach(s=>{ if(!consumoPorSetor[s.setor])consumoPorSetor[s.setor]={total:0,solicitacoes:0}; consumoPorSetor[s.setor].total+=(s.itens||[]).reduce((acc,it)=>acc+(parseInt(it.quantidade)||0),0); consumoPorSetor[s.setor].solicitacoes++; });
  const rankSetores = Object.entries(consumoPorSetor).sort((a,b)=>b[1].total-a[1].total);

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} @media print{.no-print{display:none!important} body{background:#fff!important}}`}</style>

      {/* HEADER */}
      <div className="no-print" style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 28px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>ALMOXARIFADO</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📄 Relatórios</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            {[{id:"geral",label:"Geral"},{id:"material",label:"Por Material"},{id:"setor",label:"Por Setor"},{id:"usuario",label:"Por Usuário"}].map(m=>(
              <div key={m.id} onClick={()=>setModo(m.id)} style={{ background:modo===m.id?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${modo===m.id?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>{m.label}</div>
            ))}
            <div style={{ marginLeft:"auto" }}>
              <div onClick={gerarPDF} style={{ background:"#E8730A", borderRadius:12, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>{gerando?"Gerando...":"🖨️ Gerar PDF"}</div>
            </div>
          </div>
          {modo==="material" && (
            <div style={{ marginTop:12 }}>
              <select value={filtroMaterial} onChange={e=>setFiltroMaterial(e.target.value)} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:12, padding:"10px 16px", color:"#fff", fontSize:14, outline:"none", minWidth:300 }}>
                <option value="">Selecione um material...</option>
                {materiais.map(m=><option key={m.id} value={m.id} style={{ color:"#1B3F7A", background:"#fff" }}>{m.nome}</option>)}
              </select>
            </div>
          )}
          {modo==="setor" && (
            <div style={{ marginTop:12 }}>
              <select value={filtroSetor} onChange={e=>setFiltroSetor(e.target.value)} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:12, padding:"10px 16px", color:"#fff", fontSize:14, outline:"none", minWidth:300 }}>
                <option value="">Selecione um setor...</option>
                {setores.map(s=><option key={s} value={s} style={{ color:"#1B3F7A", background:"#fff" }}>{s}</option>)}
              </select>
            </div>
          )}
          {modo==="usuario" && (
            <div style={{ marginTop:12 }}>
              <select value={filtroUsuario} onChange={e=>setFiltroUsuario(e.target.value)} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:12, padding:"10px 16px", color:"#fff", fontSize:14, outline:"none", minWidth:300 }}>
                <option value="">Selecione um usuário...</option>
                {usuarios.map(u=><option key={u} value={u} style={{ color:"#1B3F7A", background:"#fff" }}>{u}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"32px auto", padding:"0 32px 80px" }}>
        {loading ? <div style={{ textAlign:"center", padding:80, color:"#aaa" }}>Carregando...</div> : (
          <div style={{ background:"#fff", borderRadius:24, overflow:"hidden", boxShadow:"0 4px 24px rgba(27,63,122,0.1)" }}>
            {/* CABEÇALHO DO RELATÓRIO */}
            <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"32px 40px" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div>
                  <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3, marginBottom:6 }}>INSTITUTO PLÁCIDO CASTELO — ALMOXARIFADO</div>
                  <div style={{ color:"#fff", fontWeight:900, fontSize:28, letterSpacing:-1 }}>IPC<span style={{ color:"#E8730A" }}>gov</span></div>
                  <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, marginTop:4 }}>
                    {modo==="geral"?"Relatório Geral de Almoxarifado":modo==="material"&&filtroMaterial?`Relatório: ${materiais.find(m=>m.id===filtroMaterial)?.nome||"Material"}`:modo==="setor"&&filtroSetor?`Relatório do Setor: ${filtroSetor}`:modo==="usuario"&&filtroUsuario?`Relatório do Usuário: ${filtroUsuario}`:"Selecione um filtro acima"}
                  </div>
                </div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", textAlign:"right" }}>Gerado em<br/>{new Date().toLocaleString("pt-BR")}</div>
              </div>
            </div>

            <div style={{ padding:"32px 40px" }}>

              {/* RELATÓRIO GERAL */}
              {modo==="geral" && (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
                    {[
                      { label:"Materiais cadastrados", value:materiais.length, cor:"#1B3F7A" },
                      { label:"Total entradas", value:`${totalEntradas} un.`, cor:"#059669" },
                      { label:"Total saídas", value:`${totalSaidas} un.`, cor:"#E8730A" },
                      { label:"Estoque baixo", value:emBaixoEstoque.length, cor:emBaixoEstoque.length>0?"#dc2626":"#059669" },
                    ].map((s,i)=>(
                      <div key={i} style={{ background:"#f8f9fb", borderRadius:14, padding:"16px", textAlign:"center" }}>
                        <div style={{ fontWeight:900, fontSize:24, color:s.cor }}>{s.value}</div>
                        <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Estoque atual */}
                  <div style={{ marginBottom:28 }}>
                    <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}><div style={{ width:4, height:20, background:"#1B3F7A", borderRadius:2 }}/>Estoque Atual</div>
                    <div style={{ border:"1px solid #e8edf2", borderRadius:16, overflow:"hidden" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", background:"#1B3F7A", padding:"12px 20px", gap:12 }}>
                        {["Material","Categoria","Estoque Atual","Estoque Mín.","Status"].map(h=><div key={h} style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{h}</div>)}
                      </div>
                      {materiais.map((m,i)=>{
                        const baixo=(m.estoqueAtual||0)<=(m.estoqueMinimo||0)&&m.estoqueMinimo>0;
                        const zerado=(m.estoqueAtual||0)===0;
                        return (
                          <div key={m.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", padding:"11px 20px", gap:12, borderBottom:i<materiais.length-1?"1px solid #f0f0f0":"none", background:i%2===0?"#fff":"#f8f9fb" }}>
                            <div style={{ fontSize:13, fontWeight:600, color:"#333" }}>{m.nome}</div>
                            <div style={{ fontSize:12, color:"#666" }}>{m.categoria||"—"}</div>
                            <div style={{ fontSize:13, fontWeight:700, color:zerado?"#dc2626":baixo?"#E8730A":"#059669" }}>{m.estoqueAtual||0} {m.unidade||"un."}</div>
                            <div style={{ fontSize:12, color:"#666" }}>{m.estoqueMinimo||0} {m.unidade||"un."}</div>
                            <div style={{ fontSize:11, fontWeight:700, color:zerado?"#dc2626":baixo?"#E8730A":"#059669" }}>{zerado?"SEM ESTOQUE":baixo?"BAIXO":"OK"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Rank materiais */}
                  {rankMateriais.length>0 && (
                    <div style={{ marginBottom:28 }}>
                      <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}><div style={{ width:4, height:20, background:"#E8730A", borderRadius:2 }}/>Materiais Mais Consumidos</div>
                      {rankMateriais.slice(0,10).map(([nome,total],i)=>(
                        <div key={nome} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #f0f0f0" }}>
                          <div style={{ fontSize:13, color:"#333" }}><span style={{ fontWeight:700, color:"#1B3F7A", marginRight:10 }}>#{i+1}</span>{nome}</div>
                          <div style={{ fontWeight:700, fontSize:14, color:"#E8730A" }}>{total} un.</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Rank setores */}
                  {rankSetores.length>0 && (
                    <div style={{ marginBottom:20 }}>
                      <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}><div style={{ width:4, height:20, background:"#7c3aed", borderRadius:2 }}/>Consumo por Setor</div>
                      <div style={{ border:"1px solid #e8edf2", borderRadius:16, overflow:"hidden" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", background:"#1B3F7A", padding:"12px 20px", gap:12 }}>
                          {["Setor","Unidades","Solicitações"].map(h=><div key={h} style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{h}</div>)}
                        </div>
                        {rankSetores.map(([setor,dados],i)=>(
                          <div key={setor} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", padding:"11px 20px", gap:12, borderBottom:i<rankSetores.length-1?"1px solid #f0f0f0":"none", background:i%2===0?"#fff":"#f8f9fb" }}>
                            <div style={{ fontSize:13, fontWeight:600, color:"#333" }}>{setor}</div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#7c3aed" }}>{dados.total} un.</div>
                            <div style={{ fontSize:12, color:"#666" }}>{dados.solicitacoes}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* RELATÓRIO POR MATERIAL */}
              {modo==="material" && filtroMaterial && (() => {
                const mat = materiais.find(m=>m.id===filtroMaterial);
                if(!mat) return null;
                const entradas = movMaterial.filter(m=>m.tipo==="entrada");
                const saidas = movMaterial.filter(m=>m.tipo==="saida");
                return (
                  <>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
                      {[
                        { label:"Estoque atual", value:`${mat.estoqueAtual||0} ${mat.unidade||"un."}`, cor:"#1B3F7A" },
                        { label:"Total entradas", value:`${entradas.reduce((s,m)=>s+(m.quantidade||0),0)} ${mat.unidade||"un."}`, cor:"#059669" },
                        { label:"Total saídas", value:`${saidas.reduce((s,m)=>s+(m.quantidade||0),0)} ${mat.unidade||"un."}`, cor:"#E8730A" },
                      ].map((s,i)=>(
                        <div key={i} style={{ background:"#f8f9fb", borderRadius:14, padding:"16px", textAlign:"center" }}>
                          <div style={{ fontWeight:900, fontSize:24, color:s.cor }}>{s.value}</div>
                          <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom:20 }}>
                      <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>📋 Histórico de Movimentações</div>
                      {movMaterial.length===0 ? <div style={{ textAlign:"center", color:"#aaa", padding:30 }}>Nenhuma movimentação</div> : (
                        <div style={{ border:"1px solid #e8edf2", borderRadius:16, overflow:"hidden" }}>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", background:"#1B3F7A", padding:"12px 20px", gap:12 }}>
                            {["Tipo","Qtd","Data","Responsável","Observação"].map(h=><div key={h} style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{h}</div>)}
                          </div>
                          {movMaterial.map((mv,i)=>(
                            <div key={mv.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", padding:"10px 20px", gap:12, borderBottom:i<movMaterial.length-1?"1px solid #f0f0f0":"none", background:i%2===0?"#fff":"#f8f9fb" }}>
                              <div style={{ fontSize:12, fontWeight:700, color:mv.tipo==="entrada"?"#059669":"#E8730A" }}>{mv.tipo==="entrada"?"📥 Entrada":"📤 Saída"}</div>
                              <div style={{ fontSize:13, fontWeight:700, color:mv.tipo==="entrada"?"#059669":"#E8730A" }}>{mv.tipo==="entrada"?"+":"-"}{mv.quantidade}</div>
                              <div style={{ fontSize:12, color:"#666" }}>{formatDate(mv.data)}</div>
                              <div style={{ fontSize:12, color:"#666" }}>{mv.registradoPor||mv.aprovadoPor||"—"}</div>
                              <div style={{ fontSize:12, color:"#888" }}>{mv.fornecedor||mv.setor||mv.observacao||"—"}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* RELATÓRIO POR SETOR */}
              {modo==="setor" && filtroSetor && (() => {
                const totalUnids = solSetor.filter(s=>s.status!=="Recusada").reduce((acc,s)=>acc+(s.itens||[]).reduce((a,it)=>a+(parseInt(it.quantidade)||0),0),0);
                return (
                  <>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
                      {[
                        { label:"Total solicitações", value:solSetor.length, cor:"#1B3F7A" },
                        { label:"Aprovadas", value:solSetor.filter(s=>["Aprovada","Entregue"].includes(s.status)).length, cor:"#059669" },
                        { label:"Unidades retiradas", value:`${totalUnids} un.`, cor:"#E8730A" },
                      ].map((s,i)=>(
                        <div key={i} style={{ background:"#f8f9fb", borderRadius:14, padding:"16px", textAlign:"center" }}>
                          <div style={{ fontWeight:900, fontSize:24, color:s.cor }}>{s.value}</div>
                          <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A", marginBottom:12 }}>📋 Solicitações do Setor</div>
                    {solSetor.map((sol,i)=>(
                      <div key={sol.id} style={{ padding:"12px 16px", background:i%2===0?"#f8f9fb":"#fff", borderRadius:12, marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <div style={{ fontSize:12, color:"#aaa" }}>{formatDateTime(sol.criadoEm)} · {sol.solicitante}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:sol.status==="Aprovada"||sol.status==="Entregue"?"#059669":sol.status==="Recusada"?"#dc2626":"#E8730A" }}>{sol.status}</div>
                        </div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {(sol.itens||[]).map((it,j)=>{ const mat=materiais.find(m=>m.id===it.materialId); return <div key={j} style={{ background:"#f0f4ff", borderRadius:8, padding:"3px 10px", fontSize:12, color:"#1B3F7A", fontWeight:600 }}>{mat?.nome||it.materialNome}: {it.quantidade}</div>; })}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}

              {/* RELATÓRIO POR USUÁRIO */}
              {modo==="usuario" && filtroUsuario && (() => {
                const totalUnids = solUsuario.filter(s=>s.status!=="Recusada").reduce((acc,s)=>acc+(s.itens||[]).reduce((a,it)=>a+(parseInt(it.quantidade)||0),0),0);
                return (
                  <>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
                      {[
                        { label:"Total solicitações", value:solUsuario.length, cor:"#1B3F7A" },
                        { label:"Aprovadas", value:solUsuario.filter(s=>["Aprovada","Entregue"].includes(s.status)).length, cor:"#059669" },
                        { label:"Unidades retiradas", value:`${totalUnids} un.`, cor:"#E8730A" },
                      ].map((s,i)=>(
                        <div key={i} style={{ background:"#f8f9fb", borderRadius:14, padding:"16px", textAlign:"center" }}>
                          <div style={{ fontWeight:900, fontSize:24, color:s.cor }}>{s.value}</div>
                          <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A", marginBottom:12 }}>📋 Histórico do Usuário</div>
                    {solUsuario.map((sol,i)=>(
                      <div key={sol.id} style={{ padding:"12px 16px", background:i%2===0?"#f8f9fb":"#fff", borderRadius:12, marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <div style={{ fontSize:12, color:"#aaa" }}>{formatDateTime(sol.criadoEm)} · Setor: {sol.setor}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:sol.status==="Aprovada"||sol.status==="Entregue"?"#059669":sol.status==="Recusada"?"#dc2626":"#E8730A" }}>{sol.status}</div>
                        </div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {(sol.itens||[]).map((it,j)=>{ const mat=materiais.find(m=>m.id===it.materialId); return <div key={j} style={{ background:"#f0f4ff", borderRadius:8, padding:"3px 10px", fontSize:12, color:"#1B3F7A", fontWeight:600 }}>{mat?.nome||it.materialNome}: {it.quantidade}</div>; })}
                        </div>
                        {sol.justificativa && <div style={{ fontSize:12, color:"#888", marginTop:6 }}>"{sol.justificativa}"</div>}
                      </div>
                    ))}
                  </>
                );
              })()}

              {/* Rodapé */}
              <div style={{ borderTop:"1px solid #e8edf2", paddingTop:18, marginTop:28, display:"flex", justifyContent:"space-between" }}>
                <div style={{ fontSize:11, color:"#aaa" }}>IPCgov — Instituto Plácido Castelo · Almoxarifado</div>
                <div style={{ fontSize:11, color:"#aaa" }}>Gerado em {new Date().toLocaleString("pt-BR")}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
