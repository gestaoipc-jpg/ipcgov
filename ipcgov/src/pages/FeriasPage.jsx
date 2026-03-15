import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const inp = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif", boxSizing:"border-box" };
const lbl = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

const NIVEL_LABEL = { 1:"Direção", 2:"Coordenação", 3:"Gerência", 4:"Equipe" };
const NIVEL_COR   = { 1:"#1B3F7A", 2:"#7c3aed", 3:"#059669", 4:"#0891b2" };

function formatDate(d) { if(!d)return"—"; const[y,m,day]=d.split("-"); return`${day}/${m}/${y}`; }
function diffDays(a, b) {
  const da = new Date(a+"T12:00:00"), db2 = new Date(b+"T12:00:00");
  return Math.ceil((db2-da)/86400000)+1;
}
function rangesOverlap(s1,e1,s2,e2) { return s1<=e2 && s2<=e1; }

export default function FeriasPage({ onBack, user }) {
  const [servidores, setServidores] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [ferias, setFerias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // "novo" | "editar"
  const [form, setForm] = useState({ servidorId:"", inicio:"", fim:"", ano: new Date().getFullYear(), observacao:"" });
  const [selected, setSelected] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
  const [busca, setBusca] = useState("");
  const [viewMode, setViewMode] = useState("lista"); // "lista" | "timeline"

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [srvSnap, crgSnap, ferSnap] = await Promise.all([
        getDocs(collection(db, "ipc_servidores")),
        getDocs(collection(db, "ipc_cargos")),
        getDocs(collection(db, "ipc_ferias_servidores")),
      ]);
      setServidores(srvSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setCargos(crgSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setFerias(ferSnap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const getNivel = (s) => {
    const cargo = cargos.find(c => c.id === s.cargoId);
    return cargo?.nivel || 4;
  };

  const getSetorLabel = (s) => {
    const cargo = cargos.find(c => c.id === s.cargoId);
    return cargo?.nome || "—";
  };

  const salvar = async () => {
    if (!form.servidorId || !form.inicio || !form.fim) return;
    if (form.fim < form.inicio) return;
    setSalvando(true);
    try {
      const srv = servidores.find(s => s.id === form.servidorId);
      const dados = {
        servidorId: form.servidorId,
        servidorNome: srv?.nome || "",
        cargoId: srv?.cargoId || "",
        nivel: getNivel(srv || {}),
        inicio: form.inicio,
        fim: form.fim,
        ano: parseInt(form.inicio.split("-")[0]),
        dias: diffDays(form.inicio, form.fim),
        observacao: form.observacao || "",
        atualizadoEm: new Date().toISOString(),
        criadoPor: user?.email || "",
      };
      if (selected?.id) {
        await updateDoc(doc(db, "ipc_ferias_servidores", selected.id), dados);
        setFerias(f => f.map(x => x.id === selected.id ? { ...x, ...dados } : x));
      } else {
        dados.criadoEm = new Date().toISOString();
        const ref = await addDoc(collection(db, "ipc_ferias_servidores"), dados);
        setFerias(f => [...f, { id:ref.id, ...dados }]);
      }
      setModal(null); setForm({ servidorId:"", inicio:"", fim:"", observacao:"" }); setSelected(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este período de férias?")) return;
    await deleteDoc(doc(db, "ipc_ferias_servidores", id));
    setFerias(f => f.filter(x => x.id !== id));
  };

  const abrirEditar = (f) => {
    setSelected(f);
    setForm({ servidorId:f.servidorId, inicio:f.inicio, fim:f.fim, observacao:f.observacao||"" });
    setModal("editar");
  };

  // Detectar choques: férias do mesmo cargo pai (setor) com sobreposição
  const detectarChoques = (lista) => {
    const choques = new Set();
    for (let i = 0; i < lista.length; i++) {
      for (let j = i+1; j < lista.length; j++) {
        const a = lista[i], b = lista[j];
        // mesmo cargo pai ou mesmo nível de cargo
        const cargA = cargos.find(c => c.id === a.cargoId);
        const cargB = cargos.find(c => c.id === b.cargoId);
        const mesmoPai = cargA?.cargoPaiId && cargA.cargoPaiId === cargB?.cargoPaiId;
        const mesmoCargo = a.cargoId && a.cargoId === b.cargoId;
        if ((mesmoPai || mesmoCargo) && rangesOverlap(a.inicio, a.fim, b.inicio, b.fim)) {
          choques.add(a.id); choques.add(b.id);
        }
      }
    }
    return choques;
  };

  const feriasFiltradas = ferias
    .filter(f => f.ano === filtroAno)
    .filter(f => filtroNivel === "todos" || String(f.nivel) === String(filtroNivel))
    .filter(f => !busca || f.servidorNome?.toLowerCase().includes(busca.toLowerCase()));

  const choques = detectarChoques(feriasFiltradas);

  // Agrupar por nível para lista
  const porNivel = {};
  feriasFiltradas.forEach(f => {
    const n = f.nivel || 4;
    if (!porNivel[n]) porNivel[n] = [];
    porNivel[n].push(f);
  });

  // Timeline: meses do ano filtrado
  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const diasMes = (m) => new Date(filtroAno, m+1, 0).getDate();
  const totalDias = Array.from({length:12}, (_,i) => diasMes(i)).reduce((a,b)=>a+b,0);
  const offsetDia = (dateStr) => {
    const [y,m,d] = dateStr.split("-").map(Number);
    let off = 0;
    for (let i=0; i<m-1; i++) off += diasMes(i);
    return off + d - 1;
  };
  const pct = (dateStr) => (offsetDia(dateStr)/totalDias)*100;

  const anos = [...new Set([new Date().getFullYear()-1, new Date().getFullYear(), new Date().getFullYear()+1, ...ferias.map(f=>f.ano)])].sort();

  const isAdm = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"].includes(user?.email);

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4ff", fontFamily:"'Montserrat',sans-serif" }}>
      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 24px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
          <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:18, flexShrink:0 }}>←</div>
          <div style={{ flex:1 }}>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:2 }}>IPC Pessoas</div>
            <div style={{ color:"#fff", fontWeight:900, fontSize:18 }}>🏖️ Gestão de Férias</div>
          </div>
          {isAdm && (
            <div onClick={() => { setSelected(null); setForm({ servidorId:"", inicio:"", fim:"", observacao:"" }); setModal("novo"); }}
              style={{ background:"#E8730A", borderRadius:12, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
              + Cadastrar Férias
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 16px" }}>
        {/* ALERTAS DE CHOQUE */}
        {choques.size > 0 && (
          <div style={{ background:"#fff3e0", borderRadius:16, padding:"14px 20px", marginBottom:20, border:"2px solid #E8730A", display:"flex", gap:12, alignItems:"flex-start" }}>
            <div style={{ fontSize:24 }}>⚠️</div>
            <div>
              <div style={{ fontWeight:800, color:"#E8730A", fontSize:14, marginBottom:4 }}>Choque de férias detectado!</div>
              <div style={{ fontSize:13, color:"#555" }}>
                {choques.size} período{choques.size!==1?"s":""} com sobreposição em servidores do mesmo setor. Os registros estão marcados em laranja abaixo.
              </div>
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div style={{ background:"#fff", borderRadius:16, padding:"16px 20px", marginBottom:20, boxShadow:"0 2px 8px rgba(27,63,122,0.06)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
            <div>
              <label style={lbl}>Ano</label>
              <select value={filtroAno} onChange={e=>setFiltroAno(parseInt(e.target.value))} style={inp}>
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Nível Hierárquico</label>
              <select value={filtroNivel} onChange={e=>setFiltroNivel(e.target.value)} style={inp}>
                <option value="todos">Todos os níveis</option>
                {Object.entries(NIVEL_LABEL).map(([n,l]) => <option key={n} value={n}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Buscar servidor</label>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Nome..." style={inp} />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {[["lista","☰"],["timeline","▬"]].map(([m,icon]) => (
                <div key={m} onClick={()=>setViewMode(m)} style={{ width:42, height:42, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, fontWeight:700, background: viewMode===m ? "#1B3F7A" : "#f0f4ff", color: viewMode===m ? "#fff" : "#1B3F7A" }}>{icon}</div>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando...</div>
        ) : feriasFiltradas.length === 0 ? (
          <div style={{ background:"#fff", borderRadius:20, padding:40, textAlign:"center", boxShadow:"0 2px 8px rgba(27,63,122,0.06)" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏖️</div>
            <div style={{ fontWeight:700, color:"#1B3F7A", fontSize:16 }}>Nenhum período de férias cadastrado</div>
            <div style={{ color:"#aaa", fontSize:13, marginTop:6 }}>Cadastre os períodos de férias dos servidores para acompanhar e evitar choques.</div>
          </div>
        ) : viewMode === "lista" ? (
          /* ====== LISTA AGRUPADA POR NÍVEL ====== */
          [1,2,3,4].filter(n => porNivel[n]).map(nivel => (
            <div key={nivel} style={{ marginBottom:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:4, height:20, background:NIVEL_COR[nivel], borderRadius:2 }} />
                <div style={{ fontWeight:800, fontSize:15, color:NIVEL_COR[nivel] }}>{NIVEL_LABEL[nivel]}</div>
                <span style={{ fontSize:12, color:"#aaa", fontWeight:600 }}>{porNivel[nivel].length} registro{porNivel[nivel].length!==1?"s":""}</span>
              </div>
              <div style={{ border:"1px solid #e8edf2", borderRadius:16, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr auto", background:NIVEL_COR[nivel], padding:"10px 18px" }}>
                  {["Servidor","Cargo","Início","Fim","Dias",""].map(h=>(
                    <div key={h} style={{ color:"#fff", fontSize:10, fontWeight:800, textTransform:"uppercase" }}>{h}</div>
                  ))}
                </div>
                {porNivel[nivel].sort((a,b)=>a.inicio.localeCompare(b.inicio)).map((f,i) => {
                  const choque = choques.has(f.id);
                  return (
                    <div key={f.id} style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr auto", padding:"12px 18px", borderBottom: i < porNivel[nivel].length-1 ? "1px solid #f0f0f0":"none", background: choque ? "#fff7ed" : i%2===0?"#fff":"#f8f9fb", alignItems:"center", borderLeft: choque ? "3px solid #E8730A" : "3px solid transparent" }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>{f.servidorNome}</div>
                        {choque && <div style={{ fontSize:10, color:"#E8730A", fontWeight:700 }}>⚠️ Choque de férias</div>}
                      </div>
                      <div style={{ fontSize:12, color:"#555" }}>{getSetorLabel(servidores.find(s=>s.id===f.servidorId)||{})}</div>
                      <div style={{ fontSize:13, color:"#333", fontWeight:600 }}>{formatDate(f.inicio)}</div>
                      <div style={{ fontSize:13, color:"#333", fontWeight:600 }}>{formatDate(f.fim)}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:NIVEL_COR[nivel] }}>{f.dias}d</div>
                      <div style={{ display:"flex", gap:6 }}>
                        {isAdm && <div onClick={()=>abrirEditar(f)} style={{ cursor:"pointer", color:"#1B3F7A", fontSize:14 }}>✏️</div>}
                        {isAdm && <div onClick={()=>excluir(f.id)} style={{ cursor:"pointer", color:"#dc2626", fontSize:14 }}>🗑️</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          /* ====== TIMELINE ====== */
          <div style={{ background:"#fff", borderRadius:20, padding:24, boxShadow:"0 2px 8px rgba(27,63,122,0.06)", overflowX:"auto" }}>
            <div style={{ minWidth:700 }}>
              {/* Cabeçalho meses */}
              <div style={{ display:"flex", marginBottom:8, paddingLeft:200 }}>
                {MESES.map((m,i) => (
                  <div key={m} style={{ flex:diasMes(i), textAlign:"center", fontSize:10, fontWeight:700, color:"#888", textTransform:"uppercase", borderLeft:"1px solid #f0f0f0", paddingTop:4 }}>{m}</div>
                ))}
              </div>
              {/* Linhas por servidor */}
              {[1,2,3,4].filter(n=>porNivel[n]).flatMap(nivel =>
                porNivel[nivel].sort((a,b)=>a.servidorNome.localeCompare(b.servidorNome)).map(f => {
                  const choque = choques.has(f.id);
                  const cor = choque ? "#E8730A" : NIVEL_COR[nivel];
                  const startPct = pct(f.inicio);
                  const endPct = pct(f.fim);
                  const widthPct = endPct - startPct + (1/totalDias*100);
                  return (
                    <div key={f.id} style={{ display:"flex", alignItems:"center", marginBottom:6 }}>
                      <div style={{ width:200, flexShrink:0, paddingRight:12 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:NIVEL_COR[nivel], whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.servidorNome}</div>
                        <div style={{ fontSize:10, color:"#aaa" }}>{NIVEL_LABEL[nivel]}</div>
                      </div>
                      <div style={{ flex:1, height:28, position:"relative", background:"#f8f9fb", borderRadius:6 }}>
                        {/* Grade de meses */}
                        {MESES.map((_,i) => {
                          const off = Array.from({length:i},(_,j)=>diasMes(j)).reduce((a,b)=>a+b,0);
                          return <div key={i} style={{ position:"absolute", left:`${(off/totalDias)*100}%`, top:0, bottom:0, borderLeft:"1px solid #e8edf2" }} />;
                        })}
                        <div title={`${formatDate(f.inicio)} → ${formatDate(f.fim)} (${f.dias} dias)`}
                          style={{ position:"absolute", left:`${startPct}%`, width:`${widthPct}%`, top:4, bottom:4, background:cor, borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", fontWeight:700, cursor:"default", minWidth:4, overflow:"hidden", whiteSpace:"nowrap" }}>
                          {widthPct > 5 ? `${f.dias}d` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL CADASTRO/EDIÇÃO */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>{setModal(null);setSelected(null);}}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:500, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:18, color:"#1B3F7A" }}>{modal==="editar"?"✏️ Editar Período":"🏖️ Cadastrar Férias"}</div>
              <div onClick={()=>{setModal(null);setSelected(null);}} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Servidor *</label>
              <select value={form.servidorId} onChange={e=>setForm(f=>({...f,servidorId:e.target.value}))} style={inp}>
                <option value="">Selecione...</option>
                {[...servidores].sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")).map(s=>(
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            {form.servidorId && (() => {
              const srv = servidores.find(s=>s.id===form.servidorId);
              const cargo = cargos.find(c=>c.id===srv?.cargoId);
              const nivel = getNivel(srv||{});
              return (
                <div style={{ background:NIVEL_COR[nivel]+"18", borderRadius:10, padding:"8px 14px", marginBottom:16, fontSize:12, color:NIVEL_COR[nivel], fontWeight:600 }}>
                  {NIVEL_LABEL[nivel]} · {cargo?.nome||"—"}
                </div>
              );
            })()}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <label style={lbl}>Início *</label>
                <input type="date" value={form.inicio} onChange={e=>setForm(f=>({...f,inicio:e.target.value}))} style={inp} />
              </div>
              <div>
                <label style={lbl}>Fim *</label>
                <input type="date" value={form.fim} min={form.inicio} onChange={e=>setForm(f=>({...f,fim:e.target.value}))} style={inp} />
              </div>
            </div>
            {form.inicio && form.fim && form.fim >= form.inicio && (
              <div style={{ background:"#e0f2fe", borderRadius:10, padding:"8px 14px", marginBottom:16, fontSize:13, color:"#0891b2", fontWeight:700 }}>
                📅 {diffDays(form.inicio,form.fim)} dias de férias
              </div>
            )}
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Observação</label>
              <textarea value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))} placeholder="Ex: Férias parceladas, retorno antecipado..." style={{ ...inp, minHeight:60, resize:"vertical" }} />
            </div>
            <button onClick={salvar} disabled={salvando||!form.servidorId||!form.inicio||!form.fim||form.fim<form.inicio} style={{
              width:"100%", background: salvando||!form.servidorId||!form.inicio||!form.fim ? "#ccc":"#1B3F7A",
              border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14,
              cursor: salvando ? "not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif",
            }}>{salvando?"Salvando...":"💾 Salvar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
