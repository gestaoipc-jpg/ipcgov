import { useState, useEffect } from "react";
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const INDICADORES_ICON = (<svg width="20" height="20" viewBox="0 0 42 42" fill="none"><rect x="6" y="28" width="6" height="8" rx="1.5" fill="rgba(255,255,255,0.9)"/><rect x="15" y="20" width="6" height="16" rx="1.5" fill="rgba(255,255,255,0.9)"/><rect x="24" y="13" width="6" height="23" rx="1.5" fill="rgba(255,255,255,0.9)"/><rect x="33" y="7" width="6" height="29" rx="1.5" fill="rgba(255,255,255,0.9)"/><line x1="6" y1="8" x2="38" y2="8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/></svg>);

const PERIODICIDADES = ["Mensal","Bimestral","Trimestral","Quadrimestral","Semestral","Anual","Bianual"];
const TIPOS = ["Finalístico","Condutor","De Cobertura","De Maturidade"];
const ORIGENS = ["SEPLAG / PPA","TCE / Governança","Interno IPC"];

const COR_PERF = (pct) => {
  if (pct === null || pct === undefined) return "#aaa";
  if (pct >= 100) return "#059669";
  if (pct >= 70) return "#E8730A";
  return "#dc2626";
};

const lbl = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };
const inp = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"11px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };

// Generate periods for a given year and periodicity
function gerarPeriodos(ano, periodicidade) {
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  switch(periodicidade) {
    case "Mensal": return meses.map((m,i) => ({ id: ano+"-M"+(i+1), label: m+"/"+ano, mes_inicio: i+1, mes_fim: i+1 }));
    case "Bimestral": return [1,3,5,7,9,11].map((m,i) => ({ id: ano+"-B"+(i+1), label: (i+1)+"º Bim/"+ano, mes_inicio:m, mes_fim:m+1 }));
    case "Trimestral": return [1,4,7,10].map((m,i) => ({ id: ano+"-T"+(i+1), label: (i+1)+"º Tri/"+ano, mes_inicio:m, mes_fim:m+2 }));
    case "Quadrimestral": return [1,5,9].map((m,i) => ({ id: ano+"-Q"+(i+1), label: (i+1)+"º Quad/"+ano, mes_inicio:m, mes_fim:m+3 }));
    case "Semestral": return [1,7].map((m,i) => ({ id: ano+"-S"+(i+1), label: (i+1)+"º Sem/"+ano, mes_inicio:m, mes_fim:m+5 }));
    case "Anual": return [{ id: ano+"-A1", label: "Ano "+ano, mes_inicio:1, mes_fim:12 }];
    case "Bianual": return [{ id: ano+"-BI1", label: "Bianual "+ano, mes_inicio:1, mes_fim:12 }];
    default: return [];
  }
}

function calcPctMeta(valorApurado, meta, unidade) {
  if (!valorApurado || !meta) return null;
  const v = parseFloat(String(valorApurado).replace(",",".").replace("%",""));
  const m = parseFloat(String(meta).replace(",",".").replace("%",""));
  if (isNaN(v) || isNaN(m) || m === 0) return null;
  return Math.round((v / m) * 100);
}

export default function IPCIndicadoresModule({ user, userInfo, onBack, onDashboard }) {
  const [indicadores, setIndicadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState([]);
  const [modal, setModal] = useState(null); // "novo" | "editar" | "acompanhamento" | "detalhe"
  const [selected, setSelected] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()));
  const [form, setForm] = useState({
    numero:"", titulo:"", detalhamento:"", tipo:"Finalístico", origem:"SEPLAG / PPA",
    formula:"", unidade:"Número", polaridade:"Quanto maior, melhor",
    abrangencia:"Institucional", periodicidade:"Quadrimestral",
    fonte:"SIGED", setor:"IPC", periodoReferencia:"", valorReferencia:"",
    pressupostos:"", alertaDias:7,
    metas:{}, // { "2024": "5500", "2025": "7500", ... }
  });

  const ADMINS = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"];
  const isAdmin = ADMINS.includes(user?.email);
  const grupoIndicadores = grupos.find(g =>
    g.nome?.toLowerCase().includes("indicador") && g.nome?.toLowerCase().includes("admin")
  );
  const isIndicadoresAdm = !!(grupoIndicadores && (userInfo?.grupos||[]).includes(grupoIndicadores.id));
  const podeLancar = isAdmin || isIndicadoresAdm;
  const podeCadastrar = isAdmin;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [iSnap, gSnap] = await Promise.all([
        getDocs(collection(db,"ipc_indicadores")),
        getDocs(collection(db,"ipc_grupos_trabalho")),
      ]);
      setIndicadores(iSnap.docs.map(d=>({id:d.id,...d.data()})));
      setGrupos(gSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const salvarIndicador = async () => {
    if (!form.titulo.trim()) { alert("Informe o título do indicador."); return; }
    setSalvando(true);
    try {
      const dados = { ...form, atualizadoEm: new Date().toISOString() };
      if (selected) {
        await updateDoc(doc(db,"ipc_indicadores",selected.id), dados);
        setIndicadores(is => is.map(x => x.id===selected.id ? {...x,...dados} : x));
      } else {
        dados.criadoEm = new Date().toISOString();
        dados.criadoPor = user?.email||"sistema";
        dados.medicoes = {};
        const ref = await addDoc(collection(db,"ipc_indicadores"), dados);
        setIndicadores(is => [...is, {id:ref.id,...dados}]);
      }
      setModal(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este indicador?")) return;
    await deleteDoc(doc(db,"ipc_indicadores",id));
    setIndicadores(is => is.filter(x=>x.id!==id));
    setModal(null);
  };

  const abrirNovo = () => {
    setSelected(null);
    setForm({ numero:"", titulo:"", detalhamento:"", tipo:"Finalístico", origem:"SEPLAG / PPA", formula:"", unidade:"Número", polaridade:"Quanto maior, melhor", abrangencia:"Institucional", periodicidade:"Quadrimestral", fonte:"SIGED", setor:"IPC", periodoReferencia:"", valorReferencia:"", pressupostos:"", alertaDias:7, metas:{} });
    setModal("form");
  };

  const abrirEditar = (ind) => {
    setSelected(ind);
    setForm({ ...ind });
    setModal("form");
  };

  const abrirAcompanhamento = (ind) => {
    setSelected(ind);
    setModal("acompanhamento");
  };

  const anos = [];
  for (let y = 2022; y <= 2027; y++) anos.push(String(y));

  // Check which periods are pending alerts
  const hoje = new Date();
  const alertasPendentes = indicadores.filter(ind => {
    const periodos = gerarPeriodos(parseInt(anoFiltro), ind.periodicidade);
    const dias = parseInt(ind.alertaDias) || 15;
    return periodos.some(p => {
      const fimPeriodo = new Date(parseInt(anoFiltro), p.mes_fim, 0); // last day of mes_fim
      const diasAte = Math.ceil((fimPeriodo - hoje) / 86400000);
      const jaEntregue = ind.medicoes && ind.medicoes[p.id];
      return diasAte >= 0 && diasAte <= dias && !jaEntregue;
    });
  });

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 36px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20, flexShrink:0 }}>←</div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(145deg,#B45309,#FCD34D)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 3px 10px rgba(180,83,9,0.4)" }}>{INDICADORES_ICON}</div>
              <div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>MÓDULO</div>
                <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>IPC Indicadores</div>
              </div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              {alertasPendentes.length > 0 && (
                <div style={{ background:"#dc2626", borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
                  ⚠️ {alertasPendentes.length} período{alertasPendentes.length!==1?"s":""} pendente{alertasPendentes.length!==1?"s":""}
                </div>
              )}
              <div onClick={onDashboard} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>📊 Dashboard</div>
              {podeCadastrar && <div onClick={abrirNovo} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(232,115,10,0.4)" }}>+ Novo Indicador</div>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 32px 80px" }}>
        {/* FILTRO ANO */}
        <div style={{ display:"flex", gap:8, marginBottom:20, alignItems:"center" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#555" }}>Ano:</span>
          {anos.map(a => (
            <div key={a} onClick={() => setAnoFiltro(a)}
              style={{ borderRadius:10, padding:"6px 16px", fontWeight:700, fontSize:13, cursor:"pointer",
                background: anoFiltro===a ? "#1B3F7A" : "#fff",
                color: anoFiltro===a ? "#fff" : "#1B3F7A",
                boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
              {a}
            </div>
          ))}
        </div>

        {/* STATS */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24 }}>
          {[
            { label:"Total de Indicadores", value:indicadores.length, cor:"#1B3F7A" },
            { label:"Com alerta pendente", value:alertasPendentes.length, cor:alertasPendentes.length>0?"#dc2626":"#aaa" },
            { label:"SEPLAG/PPA", value:indicadores.filter(i=>i.origem==="SEPLAG / PPA").length, cor:"#059669" },
            { label:"TCE/Governança", value:indicadores.filter(i=>i.origem==="TCE / Governança").length, cor:"#7c3aed" },
          ].map((s,i) => (
            <div key={i} style={{ background:"#fff", borderRadius:14, padding:"12px 20px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)", borderLeft:"4px solid "+s.cor }}>
              <div style={{ color:s.cor, fontWeight:900, fontSize:22 }}>{s.value}</div>
              <div style={{ color:"#888", fontSize:11, marginTop:2, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* LISTA */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#aaa" }}>Carregando...</div>
        ) : indicadores.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📊</div>
            <div style={{ fontWeight:700, fontSize:18, color:"#1B3F7A" }}>Nenhum indicador cadastrado</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {indicadores.map(ind => {
              const periodos = gerarPeriodos(parseInt(anoFiltro), ind.periodicidade);
              const metaAno = ind.metas?.[anoFiltro];
              const dias = parseInt(ind.alertaDias) || 15;
              const temAlerta = periodos.some(p => {
                const fimPeriodo = new Date(parseInt(anoFiltro), p.mes_fim, 0);
                const diasAte = Math.ceil((fimPeriodo - hoje) / 86400000);
                return diasAte >= 0 && diasAte <= dias && !(ind.medicoes?.[p.id]);
              });
              const entregues = periodos.filter(p => ind.medicoes?.[p.id]).length;

              return (
                <div key={ind.id} style={{ background:"#fff", borderRadius:18, padding:"20px 24px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)", border: temAlerta ? "2px solid #dc262644" : "1px solid #e8edf2" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                        {ind.numero && <span style={{ background:"#f0f4ff", borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>Nº {ind.numero}</span>}
                        <span style={{ background:"#f5f3ff", borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:700, color:"#7c3aed" }}>{ind.periodicidade}</span>
                        <span style={{ background:"#f0fdf4", borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:700, color:"#059669" }}>{ind.origem}</span>
                        {temAlerta && <span style={{ background:"#fee2e2", borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:700, color:"#dc2626" }}>⚠️ Período pendente</span>}
                      </div>
                      <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:6 }}>{ind.titulo}</div>
                      <div style={{ fontSize:12, color:"#888", marginBottom:10 }}>
                        {ind.unidade && <span style={{ marginRight:12 }}>📏 {ind.unidade}</span>}
                        {metaAno && <span style={{ marginRight:12 }}>🎯 Meta {anoFiltro}: {metaAno}</span>}
                        <span>📅 {entregues}/{periodos.length} períodos entregues</span>
                      </div>

                      {/* Progress bar de períodos */}
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {periodos.map(p => {
                          const med = ind.medicoes?.[p.id];
                          const pct = med ? calcPctMeta(med.valorApurado, metaAno, ind.unidade) : null;
                          const fimP = new Date(parseInt(anoFiltro), p.mes_fim, 0);
                          const diasAte = Math.ceil((fimP - hoje) / 86400000);
                          const alerta = !med && diasAte >= 0 && diasAte <= dias;
                          return (
                            <div key={p.id} title={p.label + (med ? " — " + med.valorApurado : " — Pendente")}
                              style={{ background: med ? COR_PERF(pct)+"22" : alerta ? "#fee2e2" : "#f0f4ff",
                                border:"1px solid "+(med ? COR_PERF(pct) : alerta ? "#dc2626" : "#e8edf2"),
                                borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700,
                                color: med ? COR_PERF(pct) : alerta ? "#dc2626" : "#aaa", cursor:"pointer" }}
                              onClick={() => { setSelected(ind); setModal("acompanhamento"); }}>
                              {p.label}
                              {med && <span style={{ marginLeft:4 }}>{pct!==null ? pct+"%" : "✓"}</span>}
                              {!med && alerta && <span style={{ marginLeft:4 }}>⚠️</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap" }}>
                      {podeLancar && (
                        <div onClick={() => abrirAcompanhamento(ind)} style={{ background:"#1B3F7A", borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer" }}>
                          📝 Lançar
                        </div>
                      )}
                      {podeCadastrar && (
                        <div onClick={() => abrirEditar(ind)} style={{ background:"#f0f4ff", borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>
                          ✏️ Editar
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL FORM INDICADOR */}
      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:720, maxHeight:"92vh", overflowY:"auto", padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected ? "Editar Indicador" : "Novo Indicador"}</div>
              <div onClick={() => setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <label style={lbl}>Número</label>
                <input value={form.numero} onChange={e=>setForm(f=>({...f,numero:e.target.value}))} placeholder="Ex: 14" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Origem</label>
                <select value={form.origem} onChange={e=>setForm(f=>({...f,origem:e.target.value}))} style={inp}>
                  {ORIGENS.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Título *</label>
                <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Nome do indicador" style={inp}/>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Detalhamento</label>
                <textarea value={form.detalhamento} onChange={e=>setForm(f=>({...f,detalhamento:e.target.value}))} style={{ ...inp, minHeight:70, resize:"vertical" }}/>
              </div>
              <div>
                <label style={lbl}>Tipo</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp}>
                  {TIPOS.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Unidade de Medida</label>
                <input value={form.unidade} onChange={e=>setForm(f=>({...f,unidade:e.target.value}))} placeholder="Ex: Número, Percentual (%)" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Periodicidade</label>
                <select value={form.periodicidade} onChange={e=>setForm(f=>({...f,periodicidade:e.target.value}))} style={inp}>
                  {PERIODICIDADES.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Alertar (dias antes do fim)</label>
                <input type="number" value={form.alertaDias} onChange={e=>setForm(f=>({...f,alertaDias:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Polaridade</label>
                <select value={form.polaridade} onChange={e=>setForm(f=>({...f,polaridade:e.target.value}))} style={inp}>
                  <option>Quanto maior, melhor</option>
                  <option>Quanto menor, melhor</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Abrangência</label>
                <select value={form.abrangencia} onChange={e=>setForm(f=>({...f,abrangencia:e.target.value}))} style={inp}>
                  <option>Institucional</option>
                  <option>Setorial</option>
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Metodologia / Fórmula de Cálculo</label>
                <textarea value={form.formula} onChange={e=>setForm(f=>({...f,formula:e.target.value}))} style={{ ...inp, minHeight:60, resize:"vertical" }}/>
              </div>
              <div>
                <label style={lbl}>Fonte do Dado</label>
                <input value={form.fonte} onChange={e=>setForm(f=>({...f,fonte:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Setor Responsável</label>
                <input value={form.setor} onChange={e=>setForm(f=>({...f,setor:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Período de Referência</label>
                <input value={form.periodoReferencia} onChange={e=>setForm(f=>({...f,periodoReferencia:e.target.value}))} placeholder="Ex: Ano 2022" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Valor de Referência</label>
                <input value={form.valorReferencia} onChange={e=>setForm(f=>({...f,valorReferencia:e.target.value}))} placeholder="Ex: 17.371" style={inp}/>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Pressupostos</label>
                <textarea value={form.pressupostos} onChange={e=>setForm(f=>({...f,pressupostos:e.target.value}))} style={{ ...inp, minHeight:70, resize:"vertical" }}/>
              </div>

              {/* METAS ANUAIS */}
              <div style={{ gridColumn:"1/-1", marginTop:8 }}>
                <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A", marginBottom:12 }}>🎯 Metas Anuais</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:10 }}>
                  {anos.map(ano => (
                    <div key={ano}>
                      <label style={lbl}>{ano}</label>
                      <input value={form.metas?.[ano]||""} onChange={e=>setForm(f=>({...f,metas:{...f.metas,[ano]:e.target.value}}))} placeholder="Ex: 5.500" style={inp}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:24 }}>
              {selected && isAdmin && (
                <div onClick={() => excluir(selected.id)} style={{ background:"#fee2e2", borderRadius:12, padding:"12px 16px", fontSize:13, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>🗑️</div>
              )}
              <button onClick={salvarIndicador} disabled={salvando} style={{ flex:1, background:salvando?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                {salvando ? "Salvando..." : "💾 Salvar Indicador"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACOMPANHAMENTO */}
      {modal === "acompanhamento" && selected && (
        <AcompanhamentoModal
          indicador={selected}
          anoFiltro={anoFiltro}
          user={user}
          podeLancar={podeLancar}
          onClose={() => setModal(null)}
          onSaved={(updated) => {
            setIndicadores(is => is.map(x => x.id===updated.id ? updated : x));
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}

function AcompanhamentoModal({ indicador, anoFiltro, user, podeLancar, onClose, onSaved }) {
  const periodos = gerarPeriodos(parseInt(anoFiltro), indicador.periodicidade);
  const metaAno = indicador.metas?.[anoFiltro];
  const [medicoes, setMedicoes] = useState(indicador.medicoes || {});
  const [form, setForm] = useState({});
  const [periodoAtivo, setPeriodoAtivo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  const inp2 = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
  const lbl2 = { display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:600 };

  const salvarMedicao = async () => {
    if (!form.valorApurado) { alert("Informe o valor apurado."); return; }
    setSalvando(true);
    try {
      const pct = calcPctMeta(form.valorApurado, metaAno, indicador.unidade);
      const novasMedicoes = {
        ...medicoes,
        [periodoAtivo]: {
          ...form,
          percentualMeta: pct,
          lancadoPor: user?.email || "sistema",
          lancadoEm: new Date().toISOString(),
          arquivo: uploadFile?.name || medicoes[periodoAtivo]?.arquivo || null,
        }
      };
      await updateDoc(doc(db,"ipc_indicadores",indicador.id), { medicoes: novasMedicoes, atualizadoEm: new Date().toISOString() });
      setMedicoes(novasMedicoes);
      onSaved({ ...indicador, medicoes: novasMedicoes });
      setPeriodoAtivo(null);
      setForm({});
      setUploadFile(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:760, maxHeight:"92vh", overflowY:"auto", padding:32 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:900, fontSize:18, color:"#1B3F7A" }}>{indicador.titulo}</div>
            <div style={{ fontSize:12, color:"#888", marginTop:4 }}>
              {indicador.periodicidade} · {anoFiltro}
              {metaAno && <span style={{ marginLeft:10, fontWeight:700, color:"#1B3F7A" }}>🎯 Meta: {metaAno}</span>}
            </div>
          </div>
          <div onClick={onClose} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
        </div>

        {/* LISTA DE PERÍODOS */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
          {periodos.map(p => {
            const med = medicoes[p.id];
            const pct = med ? calcPctMeta(med.valorApurado, metaAno, indicador.unidade) : null;
            const cor = COR_PERF(pct);
            const ativo = periodoAtivo === p.id;
            return (
              <div key={p.id}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px",
                  background: ativo ? "#eff6ff" : med ? cor+"0d" : "#f8f9fb",
                  borderRadius: ativo ? "14px 14px 0 0" : 14,
                  border:"1px solid "+(ativo ? "#1B3F7A" : med ? cor+"44" : "#e8edf2"),
                  borderBottom: ativo ? "none" : undefined,
                  cursor:"pointer" }}
                  onClick={() => {
                    if (!podeLancar) return;
                    if (ativo) { setPeriodoAtivo(null); return; }
                    setPeriodoAtivo(p.id);
                    setForm(med ? { ...med } : {});
                  }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{p.label}</div>
                    {med && (
                      <div style={{ fontSize:12, color:"#555", marginTop:2 }}>
                        Valor: {med.valorApurado} {indicador.unidade}
                        {pct !== null && <span style={{ marginLeft:8, fontWeight:700, color:cor }}>{pct}% da meta</span>}
                        {med.arquivo && <span style={{ marginLeft:8, color:"#7c3aed" }}>📎 {med.arquivo}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    {med ? <span style={{ background:cor+"22", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:cor }}>✓ Entregue</span>
                          : <span style={{ background:"#f0f4ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>Pendente</span>}
                    {podeLancar && <span style={{ color:"#1B3F7A", fontSize:12 }}>{ativo ? "▲" : "▼"}</span>}
                  </div>
                </div>

                {ativo && (
                  <div style={{ border:"1px solid #1B3F7A", borderTop:"none", borderRadius:"0 0 14px 14px", padding:16, background:"#fff" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div>
                        <label style={lbl2}>Data da Aferição *</label>
                        <input type="date" value={form.dataAfericao||""} onChange={e=>setForm(f=>({...f,dataAfericao:e.target.value}))} style={inp2}/>
                      </div>
                      <div>
                        <label style={lbl2}>Período Aferido</label>
                        <input value={form.periodoAferido||p.label} onChange={e=>setForm(f=>({...f,periodoAferido:e.target.value}))} style={inp2}/>
                      </div>
                      <div>
                        <label style={lbl2}>Valor Apurado * ({indicador.unidade})</label>
                        <input value={form.valorApurado||""} onChange={e=>setForm(f=>({...f,valorApurado:e.target.value}))} placeholder="Ex: 3.145 ou 50%" style={inp2}/>
                      </div>
                      <div>
                        <label style={lbl2}>% da Meta (auto)</label>
                        <input value={calcPctMeta(form.valorApurado, metaAno, indicador.unidade) !== null ? calcPctMeta(form.valorApurado, metaAno, indicador.unidade)+"%" : "—"} readOnly style={{ ...inp2, background:"#f0f4ff", color:"#1B3F7A", fontWeight:700 }}/>
                      </div>
                      <div style={{ gridColumn:"1/-1" }}>
                        <label style={lbl2}>Informações de Medição / Observações</label>
                        <textarea value={form.observacoes||""} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} style={{ ...inp2, minHeight:60, resize:"vertical" }}/>
                      </div>
                      <div>
                        <label style={lbl2}>Status</label>
                        <select value={form.status||"Em execução no prazo"} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={inp2}>
                          <option>Não Iniciado</option>
                          <option>Em atividades Preparatórias</option>
                          <option>Em execução no prazo</option>
                          <option>Em execução fora do prazo</option>
                          <option>Paralisado</option>
                          <option>Cancelado</option>
                          <option>Concluído</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl2}>Situação e Tendências</label>
                        <select value={form.situacaoTendencia||""} onChange={e=>setForm(f=>({...f,situacaoTendencia:e.target.value}))} style={inp2}>
                          <option value="">Selecione...</option>
                          <option>Favorável, tende a melhorar</option>
                          <option>Favorável, tende a se manter</option>
                          <option>Favorável, tende a piorar</option>
                          <option>Neutra, tende a melhorar</option>
                          <option>Neutra, tende a se manter</option>
                          <option>Neutra, tende a piorar</option>
                          <option>Desfavorável, tende a melhorar</option>
                          <option>Desfavorável, tende a se manter</option>
                          <option>Desfavorável, tende a piorar</option>
                        </select>
                      </div>
                      <div style={{ gridColumn:"1/-1" }}>
                        <label style={lbl2}>Upload do Relatório (PDF)</label>
                        <input type="file" accept=".pdf" onChange={e=>setUploadFile(e.target.files[0])}
                          style={{ ...inp2, padding:"8px 14px" }}/>
                        {(uploadFile || form.arquivo) && (
                          <div style={{ marginTop:4, fontSize:11, color:"#7c3aed" }}>
                            📎 {uploadFile?.name || form.arquivo}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:10, marginTop:14 }}>
                      <div onClick={() => { setPeriodoAtivo(null); setForm({}); }} style={{ flex:1, background:"#f0f4ff", borderRadius:12, padding:12, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
                      <div onClick={salvarMedicao} style={{ flex:2, background:salvando?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", borderRadius:12, padding:12, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:salvando?"not-allowed":"pointer" }}>
                        {salvando ? "Salvando..." : "💾 Salvar Medição"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* HISTÓRICO COMPLETO */}
        {Object.keys(medicoes).filter(k => !k.startsWith(anoFiltro)).length > 0 && (
          <div style={{ marginTop:20 }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#888", marginBottom:10, letterSpacing:1 }}>HISTÓRICO DE OUTROS ANOS</div>
            {Object.entries(medicoes)
              .filter(([k]) => !k.startsWith(anoFiltro))
              .sort(([a],[b]) => a.localeCompare(b))
              .map(([periodId, med]) => {
                const anoHist = periodId.split("-")[0];
                const metaHist = indicador.metas?.[anoHist];
                const pct = calcPctMeta(med.valorApurado, metaHist, indicador.unidade);
                return (
                  <div key={periodId} style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:"#f8f9fb", borderRadius:8, marginBottom:4, fontSize:12 }}>
                    <span style={{ color:"#555" }}>{periodId}</span>
                    <span style={{ fontWeight:700, color:"#1B3F7A" }}>{med.valorApurado}</span>
                    {pct !== null && <span style={{ color:COR_PERF(pct), fontWeight:700 }}>{pct}%</span>}
                    <span style={{ color:"#aaa" }}>{med.lancadoEm ? new Date(med.lancadoEm).toLocaleDateString("pt-BR") : ""}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
