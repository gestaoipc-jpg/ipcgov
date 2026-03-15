import { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

function formatDate(d) { if(!d)return"—"; const[y,m,day]=d.split("-"); return `${day}/${m}/${y}`; }
function formatDateTime(iso) { if(!iso)return"—"; return new Date(iso).toLocaleString("pt-BR"); }
function diasRestantes(d) { if(!d)return null; return Math.ceil((new Date(d)-new Date())/86400000); }

const COR_STATUS = { "Aguardando":"#aaa","Em Análise":"#1B3F7A","Em Tramitação":"#0891b2","Aguardando Documentos":"#E8730A","Aguardando Assinatura":"#d97706","Aguardando Outra Área":"#7c3aed","Concluído":"#059669","Arquivado":"#555","Cancelado":"#dc2626" };
const COR_PRIORIDADE = { "Alta":"#dc2626","Média":"#E8730A","Baixa":"#059669" };

export default function ProcessosRelatorioPage({ onBack, processoId }) {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState(processoId ? "processo" : "geral");
  const [selecionado, setSelecionado] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [filtrosCustom, setFiltrosCustom] = useState([]);

  useEffect(() => { loadProcessos(); }, []);
  useEffect(() => {
    if (processoId && processos.length > 0) {
      const p = processos.find(x => x.id === processoId);
      if (p) setSelecionado(p);
    }
  }, [processoId, processos]);

  const loadProcessos = async () => {
    setLoading(true);
    try {
      const [snap, fSnap] = await Promise.all([
        getDocs(collection(db, "processos")),
        getDocs(collection(db, "processos_filtros")),
      ]);
      setProcessos(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.criadoEm||0)-new Date(a.criadoEm||0)));
      setFiltrosCustom(fSnap.docs.map(d=>({id:d.id,...d.data()})).filter(f=>f.tipo==="custom"));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const gerarPDF = () => { setGerando(true); setTimeout(() => { window.print(); setGerando(false); }, 300); };

  const emAndamento = processos.filter(p => !["Concluído","Arquivado","Cancelado"].includes(p.status));
  const concluidos = processos.filter(p => p.status === "Concluído");
  const atrasados = processos.filter(p => { const d=diasRestantes(p.dataSaida); return d!==null&&d<0&&!["Concluído","Arquivado","Cancelado"].includes(p.status); });
  const urgentes = processos.filter(p => { const d=diasRestantes(p.dataSaida); return d!==null&&d>=0&&d<=5&&!["Concluído","Arquivado","Cancelado"].includes(p.status); });

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @media print { .no-print{display:none!important} body{background:#fff!important} }
      `}</style>

      {/* HEADER */}
      <div className="no-print" style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 28px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC PROCESSOS</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📄 Relatórios</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
              {["processo","geral"].map(m => (
                <div key={m} onClick={()=>setModo(m)} style={{ background:modo===m?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${modo===m?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  {m==="processo"?"Por Processo":"Geral"}
                </div>
              ))}
            </div>
          </div>
          {modo==="processo" && (
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <select value={selecionado?.id||""} onChange={e=>setSelecionado(processos.find(p=>p.id===e.target.value)||null)} style={{ flex:1, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:12, padding:"10px 16px", color:"#fff", fontSize:14, fontWeight:600, outline:"none" }}>
                <option value="">Selecione um processo...</option>
                {processos.map(p=><option key={p.id} value={p.id} style={{ color:"#1B3F7A", background:"#fff" }}>{p.numero?`Nº ${p.numero} — `:""}{p.titulo} [{p.status}]</option>)}
              </select>
              {selecionado && <div onClick={gerarPDF} style={{ background:"#E8730A", borderRadius:12, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{gerando?"Gerando...":"🖨️ Gerar PDF"}</div>}
            </div>
          )}
          {modo==="geral" && <div style={{ display:"flex", justifyContent:"flex-end" }}><div onClick={gerarPDF} style={{ background:"#E8730A", borderRadius:12, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>{gerando?"Gerando...":"🖨️ Gerar PDF"}</div></div>}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ maxWidth:900, margin:"32px auto", padding:"0 32px 80px" }}>

        {/* RELATÓRIO POR PROCESSO */}
        {modo==="processo" && !selecionado && (
          <div style={{ textAlign:"center", padding:80 }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📁</div>
            <div style={{ fontWeight:700, fontSize:18, color:"#1B3F7A", marginBottom:8 }}>Selecione um processo</div>
            <div style={{ color:"#aaa" }}>Escolha o processo acima para gerar o relatório</div>
          </div>
        )}

        {modo==="processo" && selecionado && (() => {
          const p = selecionado;
          const dias = diasRestantes(p.dataSaida);
          const atrasado = dias!==null&&dias<0&&!["Concluído","Arquivado"].includes(p.status);
          return (
            <div style={{ background:"#fff", borderRadius:24, overflow:"hidden", boxShadow:"0 4px 24px rgba(27,63,122,0.1)" }}>
              <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"32px 40px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3, marginBottom:6 }}>INSTITUTO PLÁCIDO CASTELO — IPC PROCESSOS</div>
                    <div style={{ color:"#fff", fontWeight:900, fontSize:28, letterSpacing:-1 }}>IPC<span style={{ color:"#E8730A" }}>gov</span></div>
                    <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, marginTop:4 }}>Relatório de Processo</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ background:(COR_STATUS[p.status]||"#aaa")+"30", border:`2px solid ${(COR_STATUS[p.status]||"#aaa")}60`, borderRadius:12, padding:"6px 18px", color:"#fff", fontWeight:700, fontSize:14, marginBottom:8 }}>{p.status}</div>
                    <div style={{ color:"rgba(255,255,255,0.5)", fontSize:11 }}>Gerado em {new Date().toLocaleString("pt-BR")}</div>
                  </div>
                </div>
                <div style={{ marginTop:24, borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:18 }}>
                  <div style={{ display:"flex", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                    {p.numero && <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:8, padding:"3px 12px", color:"#fff", fontSize:12, fontWeight:700 }}>Nº {p.numero}</div>}
                    {p.protocolo && <div style={{ background:"rgba(255,255,255,0.2)", borderRadius:8, padding:"3px 12px", color:"#fff", fontSize:12, fontWeight:700 }}>Prot. {p.protocolo}</div>}
                    <div style={{ background:(COR_PRIORIDADE[p.prioridade]||"#aaa")+"40", borderRadius:8, padding:"3px 12px", color:"#fff", fontSize:12, fontWeight:700 }}>⚡ {p.prioridade}</div>
                  </div>
                  <div style={{ color:"#fff", fontWeight:900, fontSize:28, letterSpacing:-0.5 }}>{p.titulo}</div>
                </div>
              </div>
              <div style={{ padding:"32px 40px" }}>
                {/* INFO GRID */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:28 }}>
                  {[
                    { label:"Responsável", value:p.responsavel, icon:"👤" },
                    { label:"Área Destino", value:p.areaDestino, icon:"🏢" },
                    { label:"Criado por", value:p.criadoPor, icon:"✍️" },
                    { label:"Data de Entrada", value:formatDate(p.dataEntrada), icon:"📥" },
                    { label:"Prazo / Saída", value:formatDate(p.dataSaida), icon:"📤" },
                    { label:"Última atualização", value:formatDateTime(p.atualizadoEm), icon:"🔄" },
                  ].filter(f=>f.value&&f.value!=="—").map((f,i)=>(
                    <div key={i} style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px" }}>
                      <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{f.icon} {f.label}</div>
                      <div style={{ color:"#1B3F7A", fontWeight:600, fontSize:13 }}>{f.value}</div>
                    </div>
                  ))}
                </div>

                {atrasado && (
                  <div style={{ background:"#fee2e2", borderRadius:14, padding:"14px 18px", marginBottom:24, border:"1px solid #fecaca", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ fontSize:24 }}>⚠️</div>
                    <div>
                      <div style={{ fontWeight:700, color:"#dc2626", fontSize:14 }}>Processo em Atraso</div>
                      <div style={{ color:"#dc2626", fontSize:12 }}>Prazo vencido há {Math.abs(dias)} dia{Math.abs(dias)!==1?"s":""}</div>
                    </div>
                  </div>
                )}

                {p.objetivo && (
                  <div style={{ marginBottom:24, background:"#f8f9fb", borderRadius:14, padding:"16px 18px" }}>
                    <div style={{ color:"#aaa", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>🎯 Objetivo</div>
                    <div style={{ color:"#333", fontSize:14, lineHeight:1.7 }}>{p.objetivo}</div>
                  </div>
                )}

                {/* OCORRÊNCIAS */}
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:4, height:20, background:"#E8730A", borderRadius:2 }}/>
                    Ocorrências ({(p.ocorrencias||[]).length})
                  </div>
                  {(p.ocorrencias||[]).length===0 ? (
                    <div style={{ background:"#f8f9fb", borderRadius:12, padding:20, textAlign:"center", color:"#aaa", fontSize:13 }}>✅ Nenhuma ocorrência registrada</div>
                  ) : (p.ocorrencias||[]).map((oc,i)=>(
                    <div key={i} style={{ background:"#fff3e0", borderRadius:12, padding:"12px 16px", marginBottom:8, border:"1px solid #ffe0b2" }}>
                      <div style={{ fontSize:11, color:"#E8730A", fontWeight:700, marginBottom:4 }}>{new Date(oc.data).toLocaleDateString("pt-BR")} · {oc.autor}</div>
                      <div style={{ fontSize:13, color:"#333" }}>{oc.texto}</div>
                    </div>
                  ))}
                </div>

                {p.observacoes && (
                  <div style={{ marginBottom:24, background:"#f5f3ff", borderRadius:14, padding:"16px 18px", borderLeft:"4px solid #7c3aed" }}>
                    <div style={{ color:"#7c3aed", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>💬 Observações</div>
                    <div style={{ color:"#333", fontSize:14, lineHeight:1.7 }}>{p.observacoes}</div>
                  </div>
                )}
                {filtrosCustom.filter(f => p[f.nome.toLowerCase().replace(/\s+/g,"_")]).length > 0 && (
                  <div style={{ marginBottom:24, background:"#f0f4ff", borderRadius:14, padding:"16px 18px", borderLeft:"4px solid #1B3F7A" }}>
                    <div style={{ color:"#1B3F7A", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:10, fontWeight:700 }}>📋 Informações Adicionais</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                      {filtrosCustom.map(f => {
                        const chave = f.nome.toLowerCase().replace(/\s+/g,"_");
                        if (!p[chave]) return null;
                        return (
                          <div key={f.id} style={{ background:"#fff", borderRadius:8, padding:"8px 14px", border:"1px solid #e8edf2" }}>
                            <div style={{ fontSize:9, color:"#888", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>{f.nome}</div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#1B3F7A" }}>{p[chave]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ borderTop:"1px solid #e8edf2", paddingTop:18, display:"flex", justifyContent:"space-between" }}>
                  <div style={{ fontSize:11, color:"#aaa" }}>IPCgov — Instituto Plácido Castelo · IPC Processos</div>
                  <div style={{ fontSize:11, color:"#aaa" }}>Gerado em {new Date().toLocaleString("pt-BR")}</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* RELATÓRIO GERAL */}
        {modo==="geral" && (
          <div style={{ background:"#fff", borderRadius:24, overflow:"hidden", boxShadow:"0 4px 24px rgba(27,63,122,0.1)" }}>
            <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"32px 40px" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div>
                  <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3, marginBottom:6 }}>INSTITUTO PLÁCIDO CASTELO — IPC PROCESSOS</div>
                  <div style={{ color:"#fff", fontWeight:900, fontSize:28, letterSpacing:-1 }}>IPC<span style={{ color:"#E8730A" }}>gov</span></div>
                  <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, marginTop:4 }}>Relatório Geral de Processos</div>
                </div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Gerado em {new Date().toLocaleString("pt-BR")}</div>
              </div>
              <div style={{ display:"flex", gap:14, marginTop:22, flexWrap:"wrap" }}>
                {[
                  { label:"Total de processos", value:processos.length },
                  { label:"Em andamento", value:emAndamento.length },
                  { label:"Concluídos", value:concluidos.length },
                  { label:"Atrasados", value:atrasados.length },
                  { label:"Urgentes (≤5d)", value:urgentes.length },
                ].map((s,i)=>(
                  <div key={i} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"10px 18px" }}>
                    <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>{s.value}</div>
                    <div style={{ color:"rgba(255,255,255,0.45)", fontSize:10, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding:"32px 40px" }}>
              {/* EM ANDAMENTO */}
              {emAndamento.length > 0 && (
                <div style={{ marginBottom:32 }}>
                  <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:4, height:20, background:"#1B3F7A", borderRadius:2 }}/>
                    Em Andamento ({emAndamento.length})
                  </div>
                  <div style={{ border:"1px solid #e8edf2", borderRadius:16, overflow:"hidden" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"auto 2fr 1fr 1fr 1fr", background:"#1B3F7A", padding:"12px 20px", gap:12 }}>
                      {["Nº","Título","Responsável","Entrada","Prazo"].map(h=><div key={h} style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{h}</div>)}
                    </div>
                    {emAndamento.map((p,i)=>{
                      const dias=diasRestantes(p.dataSaida);
                      const atrasado=dias!==null&&dias<0;
                      return (
                        <div key={p.id} style={{ display:"grid", gridTemplateColumns:"auto 2fr 1fr 1fr 1fr", padding:"11px 20px", gap:12, borderBottom:i<emAndamento.length-1?"1px solid #f0f0f0":"none", background:i%2===0?"#fff":"#f8f9fb" }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#7c3aed" }}>{p.numero||"—"}</div>
                          <div style={{ fontSize:13, fontWeight:600, color:"#333" }}>{p.titulo}</div>
                          <div style={{ fontSize:12, color:"#666" }}>{p.responsavel||"—"}</div>
                          <div style={{ fontSize:12, color:"#666" }}>{formatDate(p.dataEntrada)}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:atrasado?"#dc2626":"#666" }}>{formatDate(p.dataSaida)}{atrasado?` (${Math.abs(dias)}d atraso)`:""}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ATRASADOS */}
              {atrasados.length > 0 && (
                <div style={{ marginBottom:32 }}>
                  <div style={{ fontWeight:800, fontSize:16, color:"#dc2626", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:4, height:20, background:"#dc2626", borderRadius:2 }}/>
                    ⚠️ Processos Atrasados ({atrasados.length})
                  </div>
                  <div style={{ border:"1px solid #fecaca", borderRadius:16, overflow:"hidden" }}>
                    {atrasados.map((p,i)=>{
                      const dias=Math.abs(diasRestantes(p.dataSaida));
                      return (
                        <div key={p.id} style={{ padding:"14px 20px", borderBottom:i<atrasados.length-1?"1px solid #fee2e2":"none", background:i%2===0?"#fff":"#fff5f5", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{p.titulo}</div>
                            <div style={{ fontSize:12, color:"#888", marginTop:2 }}>👤 {p.responsavel||"—"} · Prazo: {formatDate(p.dataSaida)}</div>
                          </div>
                          <div style={{ background:"#fee2e2", borderRadius:10, padding:"5px 12px", fontSize:13, fontWeight:700, color:"#dc2626", flexShrink:0 }}>{dias}d de atraso</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CONCLUÍDOS */}
              {concluidos.length > 0 && (
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontWeight:800, fontSize:16, color:"#059669", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:4, height:20, background:"#059669", borderRadius:2 }}/>
                    Concluídos ({concluidos.length})
                  </div>
                  <div style={{ border:"1px solid #c8e6c9", borderRadius:16, overflow:"hidden" }}>
                    {concluidos.map((p,i)=>(
                      <div key={p.id} style={{ padding:"12px 20px", borderBottom:i<concluidos.length-1?"1px solid #e8f5e9":"none", background:i%2===0?"#fff":"#f8fdf8", display:"flex", justifyContent:"space-between" }}>
                        <div style={{ fontWeight:600, fontSize:13, color:"#333" }}>{p.titulo}</div>
                        <div style={{ fontSize:12, color:"#888" }}>{p.responsavel||"—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ borderTop:"1px solid #e8edf2", paddingTop:18, display:"flex", justifyContent:"space-between" }}>
                <div style={{ fontSize:11, color:"#aaa" }}>IPCgov — Instituto Plácido Castelo · IPC Processos</div>
                <div style={{ fontSize:11, color:"#aaa" }}>Gerado em {new Date().toLocaleString("pt-BR")}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
