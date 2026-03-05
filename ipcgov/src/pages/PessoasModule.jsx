import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";

const CARGOS = ["Diretor(a)","Coordenador(a)","Gerente","Supervisor(a)","Técnico(a)","Assistente","Analista","Assessor(a)","Estagiário(a)","Outro"];
const SETORES = ["Diretoria","TCEduc","IPC Designer","IPC Processos","Almoxarifado","Administração","Financeiro","Jurídico","Comunicação","TI","RH","Outro"];
const NIVEIS_ACESSO = ["admin","gestor","colaborador"];
const TIPOS_EXTERNO = ["Instrutor(a)","Motorista","Apoio de Outro Órgão","Consultor(a)","Voluntário(a)","Outro"];
const ORGAOS = ["SESA","SEDUC","SECULT","STDS","SSPDS","TCE","MPE","Prefeitura","Outro"];

function initials(nome) { if(!nome)return"?"; return nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase(); }
function corAvatar(nome) { const cores=["#1B3F7A","#7c3aed","#059669","#E8730A","#0891b2","#dc2626"]; let h=0; for(let c of (nome||""))h+=c.charCodeAt(0); return cores[h%cores.length]; }

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

export default function PessoasModule({ user, onBack, onOrganograma }) {
  const [servidores, setServidores] = useState([]);
  const [externos, setExternos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState("equipe"); // equipe | externos
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [formExterno, setFormExterno] = useState({});
  const [busca, setBusca] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("todos");
  const [salvando, setSalvando] = useState(false);
  const [erroLogin, setErroLogin] = useState("");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sSnap, eSnap] = await Promise.all([
        getDocs(collection(db, "ipc_servidores")),
        getDocs(collection(db, "ipc_externos")),
      ]);
      setServidores(sSnap.docs.map(d=>({id:d.id,...d.data()})));
      setExternos(eSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // SALVAR SERVIDOR
  const salvarServidor = async () => {
    if (!form.nome || !form.cargo) return;
    setSalvando(true); setErroLogin("");
    try {
      let uid = form.uid || null;
      // Criar login se solicitado
      if (form.criarAcesso && form.email && form.senhaTemp && !form.uid) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, form.email, form.senhaTemp);
          uid = cred.user.uid;
        } catch(e) {
          setErroLogin(e.code === "auth/email-already-in-use" ? "E-mail já cadastrado no sistema." : `Erro ao criar login: ${e.message}`);
          setSalvando(false); return;
        }
      }
      // Salvar no Firestore
      if (form.criarAcesso && form.email) {
        // Salvar também na coleção de usuários
        const usuarioData = { email: form.email, nome: form.nome, cargo: form.cargo, setor: form.setor||"", nivel: form.nivelAcesso||"colaborador", ativo: true, servidorId: selected?.id||null, criadoEm: new Date().toISOString() };
        const uExistente = (await getDocs(collection(db,"usuarios"))).docs.find(d=>d.data().email===form.email);
        if (!uExistente) await addDoc(collection(db,"usuarios"), usuarioData);
      }
      const dados = { nome:form.nome, cargo:form.cargo, setor:form.setor||"", chefia:form.chefia||"", contato:form.contato||"", email:form.email||"", cpf:form.cpf||"", matricula:form.matricula||"", dataIngresso:form.dataIngresso||"", observacoes:form.observacoes||"", criarAcesso:form.criarAcesso||false, nivelAcesso:form.nivelAcesso||"colaborador", uid:uid||"", atualizadoEm:new Date().toISOString() };
      if (selected) {
        await updateDoc(doc(db,"ipc_servidores",selected.id), dados);
        setServidores(s=>s.map(x=>x.id===selected.id?{...x,...dados}:x));
      } else {
        dados.criadoEm = new Date().toISOString();
        dados.solicitacoes = []; dados.registros = [];
        const ref = await addDoc(collection(db,"ipc_servidores"), dados);
        setServidores(s=>[...s,{id:ref.id,...dados}]);
      }
      setModal(null); setForm({});
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  // SALVAR EXTERNO
  const salvarExterno = async () => {
    if (!formExterno.nome || !formExterno.tipo) return;
    setSalvando(true);
    try {
      const dados = { ...formExterno, atualizadoEm: new Date().toISOString() };
      if (selected) {
        await updateDoc(doc(db,"ipc_externos",selected.id), dados);
        setExternos(e=>e.map(x=>x.id===selected.id?{...x,...dados}:x));
      } else {
        dados.criadoEm = new Date().toISOString();
        const ref = await addDoc(collection(db,"ipc_externos"), dados);
        setExternos(e=>[...e,{id:ref.id,...dados}]);
      }
      setModal(null); setFormExterno({});
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const deletarServidor = async (id) => {
    if (!window.confirm("Excluir servidor?")) return;
    await deleteDoc(doc(db,"ipc_servidores",id));
    setServidores(s=>s.filter(x=>x.id!==id));
    setModal(null);
  };

  const deletarExterno = async (id) => {
    if (!window.confirm("Excluir colaborador externo?")) return;
    await deleteDoc(doc(db,"ipc_externos",id));
    setExternos(e=>e.filter(x=>x.id!==id));
    setModal(null);
  };

  const adicionarRegistro = async (servidor, texto, tipo) => {
    if (!texto.trim()) return;
    const reg = { texto, tipo, data: new Date().toISOString(), autor: user?.email||"sistema" };
    const novos = [...(servidor.registros||[]), reg];
    await updateDoc(doc(db,"ipc_servidores",servidor.id), { registros: novos });
    const atualizado = { ...servidor, registros: novos };
    setServidores(s=>s.map(x=>x.id===servidor.id?atualizado:x));
    if(selected?.id===servidor.id) setSelected(atualizado);
  };

  // FILTROS
  const filtradosServidor = servidores.filter(s=>{
    if (filtroSetor!=="todos" && s.setor!==filtroSetor) return false;
    if (busca) { const b=busca.toLowerCase(); if(!((s.nome||"").toLowerCase().includes(b)||(s.cargo||"").toLowerCase().includes(b)||(s.setor||"").toLowerCase().includes(b))) return false; }
    return true;
  });
  const filtradosExterno = externos.filter(e=>{
    if (busca) { const b=busca.toLowerCase(); if(!((e.nome||"").toLowerCase().includes(b)||(e.tipo||"").toLowerCase().includes(b))) return false; }
    return true;
  });

  const setoresExistentes = [...new Set(servidores.map(s=>s.setor).filter(Boolean))];

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px} select,input,textarea{font-family:'Montserrat',sans-serif}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 32px" }}>
        <div style={{ maxWidth:1300, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>MÓDULO</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>👥 IPC Pessoas</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
              <div onClick={onOrganograma} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>🌳 Organograma</div>
              {aba==="equipe" && <div onClick={()=>{ setForm({}); setSelected(null); setModal("form_servidor"); }} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Novo Servidor</div>}
              {aba==="externos" && <div onClick={()=>{ setFormExterno({}); setSelected(null); setModal("form_externo"); }} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Novo Colaborador</div>}
            </div>
          </div>

          {/* STATS */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:18 }}>
            {[
              { label:"Servidores IPC", value:servidores.length },
              { label:"Com acesso ao sistema", value:servidores.filter(s=>s.criarAcesso).length },
              { label:"Colaboradores externos", value:externos.length },
              { label:"Instrutores", value:externos.filter(e=>e.tipo==="Instrutor(a)").length },
              { label:"Motoristas", value:externos.filter(e=>e.tipo==="Motorista").length },
            ].map((s,i)=>(
              <div key={i} style={{ background:"rgba(255,255,255,0.12)", borderRadius:14, padding:"10px 18px" }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>{s.value}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ABAS */}
          <div style={{ display:"flex", gap:10 }}>
            {[{id:"equipe",label:"👥 Equipe IPC"},{id:"externos",label:"🤝 Colaboradores Externos"}].map(a=>(
              <div key={a.id} onClick={()=>{ setAba(a.id); setBusca(""); setFiltroSetor("todos"); }} style={{ background:aba===a.id?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${aba===a.id?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>{a.label}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"24px 32px 80px" }}>
        {/* FILTROS */}
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder={`🔍 Buscar ${aba==="equipe"?"servidor":"colaborador"}...`} style={{ ...inputStyle, maxWidth:300, padding:"9px 14px" }}/>
          {aba==="equipe" && (
            <select value={filtroSetor} onChange={e=>setFiltroSetor(e.target.value)} style={{ background:"#fff", border:"none", borderRadius:20, padding:"8px 16px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer", outline:"none", boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
              <option value="todos">Todos os setores</option>
              {setoresExistentes.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {(busca||filtroSetor!=="todos") && <div onClick={()=>{ setBusca(""); setFiltroSetor("todos"); }} style={{ background:"#fee2e2", borderRadius:20, padding:"8px 14px", fontSize:12, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>✕ Limpar</div>}
          <span style={{ marginLeft:"auto", fontSize:12, color:"#aaa" }}>{aba==="equipe"?filtradosServidor.length:filtradosExterno.length} resultado{(aba==="equipe"?filtradosServidor.length:filtradosExterno.length)!==1?"s":""}</span>
        </div>

        {loading ? <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando...</div> : (
          <>
            {/* GRID EQUIPE IPC */}
            {aba==="equipe" && (
              filtradosServidor.length===0 ? (
                <div style={{ textAlign:"center", padding:60 }}>
                  <div style={{ fontSize:56, marginBottom:16 }}>👥</div>
                  <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum servidor cadastrado</div>
                  <div onClick={()=>{ setForm({}); setSelected(null); setModal("form_servidor"); }} style={{ display:"inline-block", background:"#1B3F7A", borderRadius:14, padding:"12px 24px", color:"#fff", fontWeight:700, cursor:"pointer", marginTop:12 }}>+ Cadastrar Servidor</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                  {filtradosServidor.map(s=>(
                    <div key={s.id} onClick={()=>{ setSelected(s); setModal("perfil"); }} style={{ background:"#fff", borderRadius:20, padding:"22px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)", cursor:"pointer", transition:"transform 0.15s, box-shadow 0.15s" }}
                      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(27,63,122,0.14)"}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 12px rgba(27,63,122,0.08)"}}>
                      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                        <div style={{ width:52, height:52, borderRadius:16, background:corAvatar(s.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:18, flexShrink:0 }}>{initials(s.nome)}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.nome}</div>
                          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{s.cargo}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {s.setor && <div style={{ background:"#f0f4ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>{s.setor}</div>}
                        {s.criarAcesso && <div style={{ background:"#e8f5e9", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#059669" }}>🔑 {s.nivelAcesso||"colaborador"}</div>}
                      </div>
                      {s.chefia && <div style={{ marginTop:10, fontSize:11, color:"#aaa" }}>👆 {s.chefia}</div>}
                      {(s.registros||[]).length>0 && <div style={{ marginTop:8, fontSize:11, color:"#E8730A" }}>📝 {s.registros.length} registro{s.registros.length!==1?"s":""}</div>}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* GRID EXTERNOS */}
            {aba==="externos" && (
              filtradosExterno.length===0 ? (
                <div style={{ textAlign:"center", padding:60 }}>
                  <div style={{ fontSize:56, marginBottom:16 }}>🤝</div>
                  <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum colaborador externo</div>
                  <div onClick={()=>{ setFormExterno({}); setSelected(null); setModal("form_externo"); }} style={{ display:"inline-block", background:"#1B3F7A", borderRadius:14, padding:"12px 24px", color:"#fff", fontWeight:700, cursor:"pointer", marginTop:12 }}>+ Cadastrar Colaborador</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                  {filtradosExterno.map(e=>(
                    <div key={e.id} onClick={()=>{ setSelected(e); setModal("perfil_externo"); }} style={{ background:"#fff", borderRadius:20, padding:"22px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)", cursor:"pointer", transition:"transform 0.15s" }}
                      onMouseEnter={ev=>ev.currentTarget.style.transform="translateY(-3px)"} onMouseLeave={ev=>ev.currentTarget.style.transform=""}>
                      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                        <div style={{ width:52, height:52, borderRadius:16, background:corAvatar(e.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:18, flexShrink:0 }}>{initials(e.nome)}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.nome}</div>
                          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{e.tipo}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        <div style={{ background:"#f5f3ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#7c3aed" }}>{e.tipo}</div>
                        {e.orgao && <div style={{ background:"#f0f4ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>{e.orgao}</div>}
                      </div>
                      {e.contato && <div style={{ marginTop:10, fontSize:11, color:"#aaa" }}>📞 {e.contato}</div>}
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* MODAL PERFIL SERVIDOR */}
      {modal==="perfil" && selected && <PerfilModal servidor={selected} onClose={()=>setModal(null)} onEditar={()=>{ setForm({...selected}); setModal("form_servidor"); }} onDeletar={()=>deletarServidor(selected.id)} onAddRegistro={adicionarRegistro} user={user} servidores={servidores} />}

      {/* MODAL PERFIL EXTERNO */}
      {modal==="perfil_externo" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:500, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:60, height:60, borderRadius:18, background:corAvatar(selected.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:22 }}>{initials(selected.nome)}</div>
                <div>
                  <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected.nome}</div>
                  <div style={{ fontSize:13, color:"#888" }}>{selected.tipo}</div>
                </div>
              </div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              {[{label:"Tipo",value:selected.tipo},{label:"Órgão/Origem",value:selected.orgao},{label:"Contato",value:selected.contato},{label:"Email",value:selected.email},{label:"Especialidade",value:selected.especialidade},{label:"Observações",value:selected.observacoes}].filter(f=>f.value).map((f,i)=>(
                <div key={i} style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px", gridColumn:f.label==="Observações"?"1/-1":"auto" }}>
                  <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{f.label}</div>
                  <div style={{ color:"#1B3F7A", fontWeight:600, fontSize:13 }}>{f.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{ setFormExterno({...selected}); setModal("form_externo"); }} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✏️ Editar</button>
              <button onClick={()=>deletarExterno(selected.id)} style={{ background:"#fee2e2", border:"none", borderRadius:14, padding:"14px 18px", color:"#dc2626", fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>🗑️</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM SERVIDOR */}
      {modal==="form_servidor" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:700, maxHeight:"93vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"28px 32px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar Servidor":"➕ Novo Servidor IPC"}</div>
                <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Nome Completo *</label>
                  <input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome completo do servidor" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Cargo *</label>
                  <select value={form.cargo||""} onChange={e=>setForm(f=>({...f,cargo:e.target.value}))} style={inputStyle}>
                    <option value="">Selecione...</option>
                    {CARGOS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Setor</label>
                  <select value={form.setor||""} onChange={e=>setForm(f=>({...f,setor:e.target.value}))} style={inputStyle}>
                    <option value="">Selecione...</option>
                    {SETORES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Chefia Direta</label>
                  <select value={form.chefia||""} onChange={e=>setForm(f=>({...f,chefia:e.target.value}))} style={inputStyle}>
                    <option value="">Sem chefia / Topo da hierarquia</option>
                    {servidores.filter(s=>s.id!==selected?.id).map(s=><option key={s.id} value={s.nome}>{s.nome} — {s.cargo}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Matrícula</label>
                  <input value={form.matricula||""} onChange={e=>setForm(f=>({...f,matricula:e.target.value}))} placeholder="Nº de matrícula" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>CPF</label>
                  <input value={form.cpf||""} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))} placeholder="000.000.000-00" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Contato / Telefone</label>
                  <input value={form.contato||""} onChange={e=>setForm(f=>({...f,contato:e.target.value}))} placeholder="(85) 99999-9999" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Data de Ingresso</label>
                  <input type="date" value={form.dataIngresso||""} onChange={e=>setForm(f=>({...f,dataIngresso:e.target.value}))} style={inputStyle}/>
                </div>

                {/* ACESSO AO SISTEMA */}
                <div style={{ gridColumn:"1/-1", background:"#f0f4ff", borderRadius:16, padding:"18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:form.criarAcesso?16:0 }}>
                    <div onClick={()=>setForm(f=>({...f,criarAcesso:!f.criarAcesso}))} style={{ width:44, height:24, borderRadius:12, background:form.criarAcesso?"#1B3F7A":"#ddd", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                      <div style={{ position:"absolute", top:3, left:form.criarAcesso?22:3, width:18, height:18, borderRadius:9, background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>🔑 Criar acesso ao sistema</div>
                      <div style={{ fontSize:11, color:"#888" }}>O servidor receberá login e senha para acessar o IPCgov</div>
                    </div>
                  </div>
                  {form.criarAcesso && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                      <div style={{ gridColumn:"1/3" }}>
                        <label style={labelStyle}>E-mail de acesso *</label>
                        <input type="email" value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@ipc.ce.gov.br" style={inputStyle}/>
                      </div>
                      {!selected?.uid && (
                        <div>
                          <label style={labelStyle}>Senha Temporária *</label>
                          <input type="password" value={form.senhaTemp||""} onChange={e=>setForm(f=>({...f,senhaTemp:e.target.value}))} placeholder="Mínimo 6 dígitos" style={inputStyle}/>
                        </div>
                      )}
                      <div style={{ gridColumn:"1/-1" }}>
                        <label style={labelStyle}>Nível de Acesso</label>
                        <div style={{ display:"flex", gap:10 }}>
                          {NIVEIS_ACESSO.map(n=>(
                            <div key={n} onClick={()=>setForm(f=>({...f,nivelAcesso:n}))} style={{ flex:1, textAlign:"center", padding:"10px", borderRadius:12, border:`2px solid ${form.nivelAcesso===n?"#1B3F7A":"#e8edf2"}`, background:form.nivelAcesso===n?"#f0f4ff":"#fff", color:form.nivelAcesso===n?"#1B3F7A":"#888", fontWeight:700, fontSize:12, cursor:"pointer" }}>
                              {n==="admin"?"👑 Admin":n==="gestor"?"👔 Gestor":"👤 Colaborador"}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {erroLogin && <div style={{ marginTop:10, color:"#dc2626", fontSize:12, fontWeight:600 }}>⚠️ {erroLogin}</div>}
                </div>

                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Observações Iniciais</label>
                  <textarea value={form.observacoes||""} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} placeholder="Observações gerais sobre o servidor..." style={{ ...inputStyle, minHeight:70, resize:"vertical" }}/>
                </div>
              </div>
              <button onClick={salvarServidor} disabled={salvando||!form.nome||!form.cargo} style={{ width:"100%", marginTop:20, background:salvando||!form.nome||!form.cargo?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.nome||!form.cargo?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                {salvando?"Salvando...":selected?"💾 Salvar Alterações":"💾 Cadastrar Servidor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM EXTERNO */}
      {modal==="form_externo" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:600, maxHeight:"90vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"28px 32px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div style={{ fontWeight:900, fontSize:20, color:"#7c3aed" }}>{selected?"✏️ Editar Colaborador":"➕ Novo Colaborador Externo"}</div>
                <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f5f3ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#7c3aed" }}>✕</div>
              </div>
              <div style={{ background:"#f5f3ff", borderRadius:12, padding:"10px 14px", marginBottom:20, fontSize:12, color:"#7c3aed", fontWeight:600 }}>
                🤝 Colaboradores externos não têm acesso ao sistema IPCgov
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Nome Completo *</label>
                  <input value={formExterno.nome||""} onChange={e=>setFormExterno(f=>({...f,nome:e.target.value}))} placeholder="Nome completo" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={formExterno.tipo||""} onChange={e=>setFormExterno(f=>({...f,tipo:e.target.value}))} style={inputStyle}>
                    <option value="">Selecione...</option>
                    {TIPOS_EXTERNO.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Órgão / Origem</label>
                  <select value={formExterno.orgao||""} onChange={e=>setFormExterno(f=>({...f,orgao:e.target.value}))} style={inputStyle}>
                    <option value="">Selecione...</option>
                    {ORGAOS.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Contato / Telefone</label>
                  <input value={formExterno.contato||""} onChange={e=>setFormExterno(f=>({...f,contato:e.target.value}))} placeholder="(85) 99999-9999" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input type="email" value={formExterno.email||""} onChange={e=>setFormExterno(f=>({...f,email:e.target.value}))} placeholder="email@exemplo.com" style={inputStyle}/>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Especialidade / Área</label>
                  <input value={formExterno.especialidade||""} onChange={e=>setFormExterno(f=>({...f,especialidade:e.target.value}))} placeholder="Ex: Gestão Fiscal, CNH categoria D..." style={inputStyle}/>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Observações</label>
                  <textarea value={formExterno.observacoes||""} onChange={e=>setFormExterno(f=>({...f,observacoes:e.target.value}))} placeholder="Observações gerais..." style={{ ...inputStyle, minHeight:70, resize:"vertical" }}/>
                </div>
              </div>
              <button onClick={salvarExterno} disabled={salvando||!formExterno.nome||!formExterno.tipo} style={{ width:"100%", marginTop:20, background:salvando||!formExterno.nome||!formExterno.tipo?"#ccc":"linear-gradient(135deg,#7c3aed,#8b5cf6)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!formExterno.nome||!formExterno.tipo?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                {salvando?"Salvando...":"💾 Salvar Colaborador"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PERFIL MODAL
function PerfilModal({ servidor, onClose, onEditar, onDeletar, onAddRegistro, user, servidores }) {
  const [novoRegistro, setNovoRegistro] = useState("");
  const [tipoRegistro, setTipoRegistro] = useState("observacao");
  const [novaSolicitacao, setNovaSolicitacao] = useState("");
  const [abaP, setAbaP] = useState("dados");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:680, maxHeight:"92vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 28px", borderRadius:"24px 24px 0 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:60, height:60, borderRadius:18, background:corAvatar(servidor.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:24, flexShrink:0 }}>{initials(servidor.nome)}</div>
              <div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:2 }}>SERVIDOR IPC</div>
                <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>{servidor.nome}</div>
                <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13, marginTop:2 }}>{servidor.cargo} · {servidor.setor}</div>
              </div>
            </div>
            <div onClick={onClose} style={{ width:36, height:36, background:"rgba(255,255,255,0.15)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:18 }}>✕</div>
          </div>
          {/* Mini abas */}
          <div style={{ display:"flex", gap:8, marginTop:18 }}>
            {[{id:"dados",label:"📋 Dados"},{id:"registros",label:`📝 Registros (${(servidor.registros||[]).length})`},{id:"solicitacoes",label:`📚 Solicitações`}].map(a=>(
              <div key={a.id} onClick={()=>setAbaP(a.id)} style={{ background:abaP===a.id?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${abaP===a.id?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{a.label}</div>
            ))}
          </div>
        </div>

        <div style={{ padding:"24px 28px" }}>
          {/* DADOS */}
          {abaP==="dados" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
                {[
                  { label:"Cargo", value:servidor.cargo },
                  { label:"Setor", value:servidor.setor },
                  { label:"Chefia", value:servidor.chefia||"Topo da hierarquia" },
                  { label:"Matrícula", value:servidor.matricula },
                  { label:"Contato", value:servidor.contato },
                  { label:"Data de Ingresso", value:servidor.dataIngresso?new Date(servidor.dataIngresso).toLocaleDateString("pt-BR"):"—" },
                  { label:"Acesso ao sistema", value:servidor.criarAcesso?`✅ ${servidor.nivelAcesso||"colaborador"}`:"❌ Sem acesso" },
                  { label:"E-mail", value:servidor.email },
                ].filter(f=>f.value&&f.value!=="—").map((f,i)=>(
                  <div key={i} style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px" }}>
                    <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{f.label}</div>
                    <div style={{ color:"#1B3F7A", fontWeight:600, fontSize:13 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              {servidor.observacoes && (
                <div style={{ background:"#f5f3ff", borderRadius:12, padding:"14px 16px", marginBottom:20, borderLeft:"3px solid #7c3aed" }}>
                  <div style={{ color:"#7c3aed", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>Observações</div>
                  <div style={{ color:"#333", fontSize:14, lineHeight:1.6 }}>{servidor.observacoes}</div>
                </div>
              )}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={onEditar} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✏️ Editar</button>
                <button onClick={onDeletar} style={{ background:"#fee2e2", border:"none", borderRadius:14, padding:"14px 18px", color:"#dc2626", fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>🗑️</button>
              </div>
            </>
          )}

          {/* REGISTROS */}
          {abaP==="registros" && (
            <>
              <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                {[{id:"observacao",label:"📝 Observação"},{id:"curso",label:"📚 Curso"},{id:"elogio",label:"⭐ Elogio"},{id:"ocorrencia",label:"⚠️ Ocorrência"}].map(t=>(
                  <div key={t.id} onClick={()=>setTipoRegistro(t.id)} style={{ flex:1, textAlign:"center", padding:"8px", borderRadius:10, border:`2px solid ${tipoRegistro===t.id?"#1B3F7A":"#e8edf2"}`, background:tipoRegistro===t.id?"#f0f4ff":"#fff", color:tipoRegistro===t.id?"#1B3F7A":"#888", fontWeight:700, fontSize:11, cursor:"pointer" }}>{t.label}</div>
                ))}
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                <textarea value={novoRegistro} onChange={e=>setNovoRegistro(e.target.value)} placeholder="Digite o registro..." style={{ flex:1, background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:13, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif", minHeight:70, resize:"vertical" }}/>
                <div onClick={()=>{ if(novoRegistro.trim()){ onAddRegistro(servidor,novoRegistro,tipoRegistro); setNovoRegistro(""); } }} style={{ width:44, background:"#1B3F7A", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:22, flexShrink:0 }}>+</div>
              </div>
              {(servidor.registros||[]).length===0 ? (
                <div style={{ textAlign:"center", color:"#aaa", padding:30, fontSize:13 }}>Nenhum registro ainda</div>
              ) : [...(servidor.registros||[])].reverse().map((r,i)=>(
                <div key={i} style={{ background:r.tipo==="ocorrencia"?"#fff3e0":r.tipo==="elogio"?"#f0fdf4":r.tipo==="curso"?"#f5f3ff":"#f8f9fb", borderRadius:12, padding:"12px 14px", marginBottom:8, borderLeft:`3px solid ${r.tipo==="ocorrencia"?"#E8730A":r.tipo==="elogio"?"#059669":r.tipo==="curso"?"#7c3aed":"#1B3F7A"}` }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>{new Date(r.data).toLocaleString("pt-BR")} · {r.autor} · {r.tipo}</div>
                  <div style={{ fontSize:13, color:"#333" }}>{r.texto}</div>
                </div>
              ))}
            </>
          )}

          {/* SOLICITAÇÕES */}
          {abaP==="solicitacoes" && (
            <>
              <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                <textarea value={novaSolicitacao} onChange={e=>setNovaSolicitacao(e.target.value)} placeholder="Ex: Solicito participação no curso de Gestão Pública..." style={{ flex:1, background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:13, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif", minHeight:70, resize:"vertical" }}/>
                <div onClick={()=>{ if(novaSolicitacao.trim()){ onAddRegistro(servidor,novaSolicitacao,"solicitacao"); setNovaSolicitacao(""); } }} style={{ width:44, background:"#E8730A", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:22, flexShrink:0 }}>+</div>
              </div>
              {(servidor.registros||[]).filter(r=>r.tipo==="solicitacao").length===0 ? (
                <div style={{ textAlign:"center", color:"#aaa", padding:30, fontSize:13 }}>Nenhuma solicitação ainda</div>
              ) : [...(servidor.registros||[])].filter(r=>r.tipo==="solicitacao").reverse().map((r,i)=>(
                <div key={i} style={{ background:"#fff8f0", borderRadius:12, padding:"12px 14px", marginBottom:8, borderLeft:"3px solid #E8730A" }}>
                  <div style={{ fontSize:11, color:"#aaa", marginBottom:4 }}>{new Date(r.data).toLocaleString("pt-BR")} · {r.autor}</div>
                  <div style={{ fontSize:13, color:"#333" }}>{r.texto}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
