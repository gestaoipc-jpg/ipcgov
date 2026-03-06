import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

function buildCargoTree(cargos) {
  const map = {};
  cargos.forEach(c => { map[c.id] = { ...c, filhos: [] }; });
  const raizes = [];
  cargos.forEach(c => {
    if (c.cargoPaiId && map[c.cargoPaiId]) map[c.cargoPaiId].filhos.push(map[c.id]);
    else raizes.push(map[c.id]);
  });
  return raizes;
}

function CargoTreeNode({ node, nivel = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const cores = ["#1B3F7A","#2a5ba8","#0891b2","#059669","#7c3aed","#E8730A"];
  const cor = cores[Math.min(nivel, cores.length-1)];
  return (
    <div style={{ marginLeft: nivel > 0 ? 28 : 0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:6, background:"#fff", borderRadius:12, border:`1.5px solid ${cor}33`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:cor, flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:13, color:cor }}>{node.nome}</div>
          {node.setorNome && <div style={{ fontSize:11, color:"#aaa", marginTop:1 }}>📂 {node.setorNome}</div>}
          {node.descricao && <div style={{ fontSize:11, color:"#888", marginTop:1 }}>{node.descricao}</div>}
        </div>
        <div style={{ background:`${cor}15`, borderRadius:8, padding:"2px 8px", fontSize:10, fontWeight:700, color:cor }}>Nível {node.nivel||1}</div>
        {node.filhos.length > 0 && (
          <div onClick={() => setExpanded(!expanded)} style={{ fontSize:12, color:"#aaa", cursor:"pointer", padding:"2px 8px", background:"#f0f4ff", borderRadius:6 }}>{expanded?"▲":"▼"} {node.filhos.length}</div>
        )}
      </div>
      {expanded && node.filhos.map(f => <CargoTreeNode key={f.id} node={f} nivel={nivel+1}/>)}
    </div>
  );
}

export default function EstruturaPessoasPage({ onBack }) {
  const [aba, setAba] = useState("setores");
  const [setores, setSetores] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [viewCargos, setViewCargos] = useState("lista");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sSnap, cSnap, gSnap] = await Promise.all([
        getDocs(collection(db,"ipc_setores")),
        getDocs(collection(db,"ipc_cargos")),
        getDocs(collection(db,"ipc_grupos_trabalho")),
      ]);
      setSetores(sSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setCargos(cSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setGrupos(gSnap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const salvarSetor = async () => {
    if (!form.nome) return;
    setSalvando(true);
    try {
      const dados = { nome:form.nome, descricao:form.descricao||"", setorPaiId:form.setorPaiId||"", atualizadoEm:new Date().toISOString() };
      if (selected) {
        await updateDoc(doc(db,"ipc_setores",selected.id), dados);
        setSetores(s => s.map(x => x.id===selected.id ? {...x,...dados} : x));
      } else {
        dados.criadoEm = new Date().toISOString();
        const ref = await addDoc(collection(db,"ipc_setores"), dados);
        setSetores(s => [...s, {id:ref.id,...dados}]);
      }
      setModal(null); setForm({}); setSelected(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const salvarCargo = async () => {
    if (!form.nome) return;
    setSalvando(true);
    try {
      let nivel = 1;
      if (form.cargoPaiId) {
        const pai = cargos.find(c => c.id === form.cargoPaiId);
        nivel = (pai?.nivel || 1) + 1;
      }
      const dados = { nome:form.nome, descricao:form.descricao||"", cargoPaiId:form.cargoPaiId||"", setorId:form.setorId||"", nivel, atualizadoEm:new Date().toISOString() };
      if (selected) {
        await updateDoc(doc(db,"ipc_cargos",selected.id), dados);
        setCargos(c => c.map(x => x.id===selected.id ? {...x,...dados} : x));
      } else {
        dados.criadoEm = new Date().toISOString();
        const ref = await addDoc(collection(db,"ipc_cargos"), dados);
        setCargos(c => [...c, {id:ref.id,...dados}]);
      }
      setModal(null); setForm({}); setSelected(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const deletarSetor = async (id) => {
    if (!window.confirm("Excluir setor? Os cargos vinculados perderão o setor.")) return;
    await deleteDoc(doc(db,"ipc_setores",id));
    setSetores(s => s.filter(x => x.id!==id));
    setModal(null); setSelected(null);
  };

  const deletarCargo = async (id) => {
    if (!window.confirm("Excluir cargo? Os subordinados ficarão sem superior neste cargo.")) return;
    await deleteDoc(doc(db,"ipc_cargos",id));
    setCargos(c => c.filter(x => x.id!==id));
    setModal(null); setSelected(null);
  };

  const salvarGrupo = async () => {
    if (!form.nome) return;
    setSalvando(true);
    try {
      const dados = { nome:form.nome, observacao:form.observacao||"", atualizadoEm:new Date().toISOString() };
      if (selected) {
        await updateDoc(doc(db,"ipc_grupos_trabalho",selected.id), dados);
        setGrupos(g => g.map(x => x.id===selected.id ? {...x,...dados} : x));
      } else {
        dados.criadoEm = new Date().toISOString();
        const ref = await addDoc(collection(db,"ipc_grupos_trabalho"), dados);
        setGrupos(g => [...g, {id:ref.id,...dados}]);
      }
      setModal(null); setForm({}); setSelected(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const excluirGrupo = async (id) => {
    if (!window.confirm("Excluir este grupo de trabalho?")) return;
    await deleteDoc(doc(db,"ipc_grupos_trabalho",id));
    setGrupos(g => g.filter(x => x.id!==id));
    setModal(null); setSelected(null);
  };

  const nomeSetor = (id) => setores.find(s => s.id===id)?.nome || "—";
  const nomeCargo = (id) => cargos.find(c => c.id===id)?.nome || "—";

  const arvore = buildCargoTree(cargos.map(c => ({
    ...c,
    setorNome: c.setorId ? nomeSetor(c.setorId) : "",
  })));

  // Cargos ordenados por nível para o select
  const cargosOrdenados = [...cargos].sort((a,b) => (a.nivel||1)-(b.nivel||1));

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px} select,input,textarea{font-family:'Montserrat',sans-serif}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 32px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC PESSOAS</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>🏗️ Estrutura Organizacional</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              {aba==="setores" && <div onClick={()=>{ setForm({}); setSelected(null); setModal("form_setor"); }} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Novo Setor</div>}
              {aba==="cargos" && <div onClick={()=>{ setForm({}); setSelected(null); setModal("form_cargo"); }} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Novo Cargo</div>}
              {aba==="grupos" && <div onClick={()=>{ setForm({}); setSelected(null); setModal("form_grupo"); }} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Novo Grupo</div>}
            </div>
          </div>
          <div style={{ display:"flex", gap:12, marginBottom:18 }}>
            {[{label:"Setores",value:setores.length},{label:"Cargos",value:cargos.length},{label:"Grupos de Trabalho",value:grupos.length},{label:"Níveis hierárquicos",value:cargos.length>0?Math.max(...cargos.map(c=>c.nivel||1)):0}].map((s,i)=>(
              <div key={i} style={{ background:"rgba(255,255,255,0.12)", borderRadius:14, padding:"10px 18px" }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>{s.value}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {[{id:"setores",label:"🏢 Setores"},{id:"cargos",label:"👔 Cargos & Hierarquia"},{id:"grupos",label:"👥 Grupos de Trabalho"}].map(a=>(
              <div key={a.id} onClick={()=>setAba(a.id)} style={{ background:aba===a.id?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${aba===a.id?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>{a.label}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 32px 80px" }}>
        {loading ? <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando...</div> : (
          <>
            {/* SETORES */}
            {aba==="setores" && (
              setores.length===0 ? (
                <div style={{ textAlign:"center", padding:60 }}>
                  <div style={{ fontSize:56, marginBottom:16 }}>🏢</div>
                  <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum setor cadastrado</div>
                  <div onClick={()=>{ setForm({}); setSelected(null); setModal("form_setor"); }} style={{ display:"inline-block", background:"#1B3F7A", borderRadius:14, padding:"12px 24px", color:"#fff", fontWeight:700, cursor:"pointer", marginTop:12 }}>+ Cadastrar Setor</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
                  {setores.map(s => (
                    <div key={s.id} style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)", cursor:"pointer" }}
                      onClick={()=>{ setSelected(s); setModal("detalhe_setor"); }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                        <div style={{ width:44, height:44, borderRadius:14, background:"#f0f4ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🏢</div>
                        {s.setorPaiId && <div style={{ background:"#f0f4ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>↑ {nomeSetor(s.setorPaiId)}</div>}
                      </div>
                      <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A", marginBottom:4 }}>{s.nome}</div>
                      {s.descricao && <div style={{ fontSize:12, color:"#888" }}>{s.descricao}</div>}
                      <div style={{ marginTop:10, fontSize:11, color:"#aaa" }}>
                        {cargos.filter(c=>c.setorId===s.id).length} cargo(s) vinculado(s)
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* CARGOS */}
            {aba==="cargos" && (
              <>
                {cargos.length > 0 && (
                  <div style={{ display:"flex", gap:8, marginBottom:20 }}>
                    {[{id:"lista",label:"☰ Lista"},{id:"arvore",label:"🌳 Hierarquia"}].map(v=>(
                      <div key={v.id} onClick={()=>setViewCargos(v.id)} style={{ background:viewCargos===v.id?"#1B3F7A":"#fff", borderRadius:10, padding:"7px 16px", fontSize:12, fontWeight:700, color:viewCargos===v.id?"#fff":"#1B3F7A", cursor:"pointer", boxShadow:"0 1px 4px rgba(27,63,122,0.1)" }}>{v.label}</div>
                    ))}
                  </div>
                )}

                {cargos.length===0 ? (
                  <div style={{ textAlign:"center", padding:60 }}>
                    <div style={{ fontSize:56, marginBottom:16 }}>👔</div>
                    <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum cargo cadastrado</div>
                    <div onClick={()=>{ setForm({}); setSelected(null); setModal("form_cargo"); }} style={{ display:"inline-block", background:"#1B3F7A", borderRadius:14, padding:"12px 24px", color:"#fff", fontWeight:700, cursor:"pointer", marginTop:12 }}>+ Cadastrar Cargo</div>
                  </div>
                ) : viewCargos==="arvore" ? (
                  <div style={{ background:"#fff", borderRadius:20, padding:"24px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
                    <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:18 }}>🌳 Hierarquia de Cargos</div>
                    {arvore.map(no => <CargoTreeNode key={no.id} node={no} nivel={0}/>)}
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
                    {cargosOrdenados.map(c => {
                      const cores = ["#1B3F7A","#2a5ba8","#0891b2","#059669","#7c3aed","#E8730A"];
                      const cor = cores[Math.min((c.nivel||1)-1, cores.length-1)];
                      return (
                        <div key={c.id} style={{ background:"#fff", borderRadius:18, padding:"20px 22px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)", cursor:"pointer", borderLeft:`4px solid ${cor}` }}
                          onClick={()=>{ setSelected(c); setModal("detalhe_cargo"); }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                            <div style={{ background:`${cor}15`, borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:cor }}>Nível {c.nivel||1}</div>
                            {c.cargoPaiId && <div style={{ fontSize:11, color:"#aaa" }}>↑ {nomeCargo(c.cargoPaiId)}</div>}
                          </div>
                          <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A", marginBottom:4 }}>{c.nome}</div>
                          {c.descricao && <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>{c.descricao}</div>}
                          {c.setorId && <div style={{ fontSize:11, color:"#aaa" }}>📂 {nomeSetor(c.setorId)}</div>}
                          <div style={{ marginTop:8, fontSize:11, color:"#aaa" }}>
                            {cargos.filter(x=>x.cargoPaiId===c.id).length} subordinado(s) direto(s)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* MODAL DETALHE SETOR */}
      {modal==="detalhe_setor" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>🏢 {selected.nome}</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            {selected.setorPaiId && <div style={{ background:"#f0f4ff", borderRadius:10, padding:"8px 14px", marginBottom:12, fontSize:13, color:"#1B3F7A" }}>↑ Setor superior: <strong>{nomeSetor(selected.setorPaiId)}</strong></div>}
            {selected.descricao && <div style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px", marginBottom:16, fontSize:13, color:"#555" }}>{selected.descricao}</div>}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, color:"#aaa", marginBottom:8 }}>Cargos vinculados a este setor:</div>
              {cargos.filter(c=>c.setorId===selected.id).length===0 ? (
                <div style={{ fontSize:12, color:"#ccc" }}>Nenhum cargo</div>
              ) : cargos.filter(c=>c.setorId===selected.id).map(c=>(
                <div key={c.id} style={{ background:"#f0f4ff", borderRadius:8, padding:"6px 12px", marginBottom:6, fontSize:13, color:"#1B3F7A", fontWeight:600 }}>👔 {c.nome}</div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{ setForm({...selected}); setModal("form_setor"); }} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✏️ Editar</button>
              <button onClick={()=>deletarSetor(selected.id)} style={{ background:"#fee2e2", border:"none", borderRadius:14, padding:"14px 18px", color:"#dc2626", fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>🗑️</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHE CARGO */}
      {modal==="detalhe_cargo" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>👔 {selected.nome}</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              {[
                {label:"Nível hierárquico", value:`Nível ${selected.nivel||1}`},
                {label:"Setor", value:selected.setorId?nomeSetor(selected.setorId):"—"},
                {label:"Cargo superior (chefia)", value:selected.cargoPaiId?nomeCargo(selected.cargoPaiId):"Topo da hierarquia"},
                {label:"Subordinados diretos", value:`${cargos.filter(c=>c.cargoPaiId===selected.id).length} cargo(s)`},
              ].map((f,i)=>(
                <div key={i} style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{f.label}</div>
                  <div style={{ color:"#1B3F7A", fontWeight:600, fontSize:13 }}>{f.value}</div>
                </div>
              ))}
            </div>
            {selected.descricao && <div style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px", marginBottom:16, fontSize:13, color:"#555" }}>{selected.descricao}</div>}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{ setForm({...selected}); setModal("form_cargo"); }} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✏️ Editar</button>
              <button onClick={()=>deletarCargo(selected.id)} style={{ background:"#fee2e2", border:"none", borderRadius:14, padding:"14px 18px", color:"#dc2626", fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>🗑️</button>
            </div>
          </div>
        </div>
      )}

      {/* GRUPOS DE TRABALHO */}
      {aba==="grupos" && (
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 32px 60px" }}>
          {grupos.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#aaa" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>👥</div>
              <div style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Nenhum grupo cadastrado</div>
              <div style={{ fontSize:13 }}>Crie grupos de trabalho para organizar equipes</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
              {grupos.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")).map(g => (
                <div key={g.id} style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px rgba(27,63,122,0.07)", border:"2px solid transparent", transition:"all 0.15s" }}
                  onMouseEnter={e=>{e.currentTarget.style.border="2px solid #1B3F7A22";e.currentTarget.style.boxShadow="0 6px 20px rgba(27,63,122,0.12)";}}
                  onMouseLeave={e=>{e.currentTarget.style.border="2px solid transparent";e.currentTarget.style.boxShadow="0 2px 12px rgba(27,63,122,0.07)";}}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:"#1B3F7A18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>👥</div>
                    <div style={{ display:"flex", gap:6 }}>
                      <div onClick={()=>{ setForm({...g}); setSelected(g); setModal("form_grupo"); }} style={{ background:"#f0f4ff", borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>✏️</div>
                      <div onClick={()=>excluirGrupo(g.id)} style={{ background:"#fee2e2", borderRadius:8, padding:"5px 10px", fontSize:11, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>🗑️</div>
                    </div>
                  </div>
                  <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:6 }}>{g.nome}</div>
                  {g.observacao && <div style={{ fontSize:12, color:"#888", lineHeight:1.5 }}>{g.observacao}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL FORM GRUPO */}
      {modal==="form_grupo" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>{ setModal(null); setForm({}); setSelected(null); }}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar Grupo":"➕ Novo Grupo de Trabalho"}</div>
              <div onClick={()=>{ setModal(null); setForm({}); setSelected(null); }} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={labelStyle}>Nome do Grupo *</label>
                <input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: IPCeduc, Disciplina Eletiva, Comissão..." style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Observação</label>
                <textarea value={form.observacao||""} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))} placeholder="Descrição, objetivo ou informações adicionais sobre o grupo..." style={{ ...inputStyle, minHeight:100, resize:"vertical" }}/>
              </div>
            </div>
            <button onClick={salvarGrupo} disabled={salvando||!form.nome} style={{ width:"100%", marginTop:20, background:salvando||!form.nome?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.nome?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando?"Salvando...":"💾 Salvar Grupo"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL FORM SETOR */}
      {modal==="form_setor" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:520, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar Setor":"➕ Novo Setor"}</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={labelStyle}>Nome do Setor *</label>
                <input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Diretoria, TCEduc, IPC Designer..." style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Setor Superior (opcional)</label>
                <select value={form.setorPaiId||""} onChange={e=>setForm(f=>({...f,setorPaiId:e.target.value}))} style={inputStyle}>
                  <option value="">Setor raiz (sem superior)</option>
                  {setores.filter(s=>s.id!==selected?.id).map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea value={form.descricao||""} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descreva as responsabilidades do setor..." style={{ ...inputStyle, minHeight:80, resize:"vertical" }}/>
              </div>
            </div>
            <button onClick={salvarSetor} disabled={salvando||!form.nome} style={{ width:"100%", marginTop:20, background:salvando||!form.nome?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.nome?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando?"Salvando...":"💾 Salvar Setor"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL FORM CARGO */}
      {modal==="form_cargo" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:560, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar Cargo":"➕ Novo Cargo"}</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>

            {/* Preview hierarquia */}
            {form.cargoPaiId && (
              <div style={{ background:"#f0f4ff", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#1B3F7A" }}>
                📊 <strong>{nomeCargo(form.cargoPaiId)}</strong> → <strong>{form.nome||"novo cargo"}</strong>
                <span style={{ color:"#888", marginLeft:8, fontSize:11 }}>Nível {(cargos.find(c=>c.id===form.cargoPaiId)?.nivel||1)+1}</span>
              </div>
            )}
            {!form.cargoPaiId && form.nome && (
              <div style={{ background:"#f0fdf4", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#059669" }}>
                👑 <strong>{form.nome}</strong> será o topo da hierarquia (Nível 1)
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Nome do Cargo *</label>
                <input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Diretor, Coordenador, Gerente..." style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Cargo Superior (chefia imediata)</label>
                <select value={form.cargoPaiId||""} onChange={e=>setForm(f=>({...f,cargoPaiId:e.target.value}))} style={inputStyle}>
                  <option value="">Topo da hierarquia</option>
                  {cargosOrdenados.filter(c=>c.id!==selected?.id).map(c=><option key={c.id} value={c.id}>{'  '.repeat((c.nivel||1)-1)}{c.nome} (Nível {c.nivel||1})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Setor</label>
                <select value={form.setorId||""} onChange={e=>setForm(f=>({...f,setorId:e.target.value}))} style={inputStyle}>
                  <option value="">Selecione o setor...</option>
                  {setores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Descrição / Atribuições</label>
                <textarea value={form.descricao||""} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descreva as atribuições do cargo..." style={{ ...inputStyle, minHeight:80, resize:"vertical" }}/>
              </div>
            </div>
            <button onClick={salvarCargo} disabled={salvando||!form.nome} style={{ width:"100%", marginTop:20, background:salvando||!form.nome?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.nome?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando?"Salvando...":"💾 Salvar Cargo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
