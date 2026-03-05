import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

export default function CadastrosPage({ onBack }) {
  const [aba, setAba] = useState("instrutores");
  const [instrutores, setInstrutores] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [acoesEdu, setAcoesEdu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [iSnap, mSnap, aSnap] = await Promise.all([
        getDocs(collection(db,"tceduc_instrutores")),
        getDocs(collection(db,"tceduc_motoristas")),
        getDocs(collection(db,"tceduc_acoes_edu")),
      ]);
      setInstrutores(iSnap.docs.map(d=>({id:d.id,...d.data()})));
      setMotoristas(mSnap.docs.map(d=>({id:d.id,...d.data()})));
      setAcoesEdu(aSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const colecao = () => aba==="instrutores" ? "tceduc_instrutores" : aba==="motoristas" ? "tceduc_motoristas" : "tceduc_acoes_edu";
  const setter  = () => aba==="instrutores" ? setInstrutores : aba==="motoristas" ? setMotoristas : setAcoesEdu;
  const lista   = () => aba==="instrutores" ? instrutores : aba==="motoristas" ? motoristas : acoesEdu;

  const salvar = async () => {
    if (!form.nome) return;
    setSalvando(true);
    try {
      const dados = { ...form, atualizadoEm: new Date().toISOString() };
      const set = setter();
      if (selected) {
        await updateDoc(doc(db, colecao(), selected.id), dados);
        set(l => l.map(x => x.id===selected.id ? {...x,...dados} : x));
      } else {
        dados.criadoEm = new Date().toISOString();
        const ref = await addDoc(collection(db, colecao()), dados);
        set(l => [...l, {id:ref.id,...dados}]);
      }
      setModal(null); setForm({}); setSelected(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const deletar = async (id) => {
    if (!window.confirm("Excluir?")) return;
    await deleteDoc(doc(db, colecao(), id));
    setter()(l => l.filter(x => x.id!==id));
    setModal(null); setSelected(null);
  };

  const abas = [
    { id:"instrutores", icon:"👨‍🏫", label:"Instrutores" },
    { id:"motoristas",  icon:"🚗",   label:"Motoristas" },
    { id:"acoes",       icon:"📚",   label:"Ações Educacionais" },
  ];

  const count = (id) => id==="instrutores"?instrutores.length:id==="motoristas"?motoristas.length:acoesEdu.length;

  const campos = () => {
    if (aba==="instrutores") return [
      { key:"nome",         label:"Nome *",             type:"text",     placeholder:"Nome completo" },
      { key:"email",        label:"E-mail",             type:"email",    placeholder:"email@exemplo.com" },
      { key:"contato",      label:"Contato / Telefone", type:"text",     placeholder:"(00) 00000-0000" },
      { key:"orgao",        label:"Órgão / Instituição",type:"text",     placeholder:"Ex: TCE, SESA, Prefeitura..." },
      { key:"especialidade",label:"Especialidade",      type:"text",     placeholder:"Ex: Controle Social, Licitações..." },
      { key:"observacoes",  label:"Observações",        type:"textarea", placeholder:"Informações adicionais..." },
    ];
    if (aba==="motoristas") return [
      { key:"nome",     label:"Nome *",              type:"text",     placeholder:"Nome completo" },
      { key:"contato",  label:"Contato / Telefone",  type:"text",     placeholder:"(00) 00000-0000" },
      { key:"veiculo",  label:"Veículo",             type:"text",     placeholder:"Ex: Van Sprinter, Ônibus..." },
      { key:"placa",    label:"Placa",               type:"text",     placeholder:"Ex: ABC-1234" },
      { key:"observacoes",label:"Observações",       type:"textarea", placeholder:"Informações adicionais..." },
    ];
    return [
      { key:"nome",     label:"Nome da Ação *",         type:"text",     placeholder:"Ex: Palestra, Curso, Oficina..." },
      { key:"conteudo", label:"Conteúdo Programático",  type:"textarea", placeholder:"Descreva os temas abordados..." },
    ];
  };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} select,input,textarea{font-family:'Montserrat',sans-serif}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 32px 40px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>TCEDUC</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:24 }}>Cadastros</div>
            </div>
            <div onClick={()=>{ setForm({}); setSelected(null); setModal("form"); }} style={{ marginLeft:"auto", background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              + {aba==="instrutores"?"Novo Instrutor":aba==="motoristas"?"Novo Motorista":"Nova Ação"}
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {abas.map(a=>(
              <div key={a.id} onClick={()=>setAba(a.id)} style={{ background:aba===a.id?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.08)", border:`1px solid ${aba===a.id?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.1)"}`, borderRadius:12, padding:"8px 16px", color:"#fff", fontSize:13, fontWeight:aba===a.id?700:500, cursor:"pointer" }}>
                {a.icon} {a.label} <span style={{ opacity:0.6, fontSize:11 }}>({count(a.id)})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 32px 80px" }}>
        {loading ? <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando...</div> : (
          lista().length===0 ? (
            <div style={{ textAlign:"center", padding:60 }}>
              <div style={{ fontSize:56, marginBottom:16 }}>{aba==="instrutores"?"👨‍🏫":aba==="motoristas"?"🚗":"📚"}</div>
              <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum registro cadastrado</div>
              <div onClick={()=>{ setForm({}); setSelected(null); setModal("form"); }} style={{ display:"inline-block", background:"#1B3F7A", borderRadius:14, padding:"12px 24px", color:"#fff", fontWeight:700, cursor:"pointer", marginTop:12 }}>+ Novo Cadastro</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
              {lista().map(item=>(
                <div key={item.id} onClick={()=>{ setSelected(item); setModal("detalhe"); }} style={{ background:"#fff", borderRadius:20, padding:"20px 22px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)", cursor:"pointer", borderLeft:`4px solid ${aba==="instrutores"?"#1B3F7A":aba==="motoristas"?"#059669":"#7c3aed"}`, transition:"transform .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                    <div style={{ fontSize:28 }}>{aba==="instrutores"?"👨‍🏫":aba==="motoristas"?"🚗":"📚"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A" }}>{item.nome}</div>
                      {item.email && <div style={{ color:"#aaa", fontSize:12, marginTop:1 }}>{item.email}</div>}
                      {item.contato && <div style={{ color:"#888", fontSize:12, marginTop:1 }}>📱 {item.contato}</div>}
                    </div>
                  </div>
                  {item.especialidade && <div style={{ background:"#f0f4ff", borderRadius:8, padding:"5px 10px", fontSize:12, color:"#1B3F7A" }}>🎓 {item.especialidade}</div>}
                  {item.veiculo && <div style={{ background:"#f0fdf4", borderRadius:8, padding:"5px 10px", fontSize:12, color:"#059669" }}>🚗 {item.veiculo}{item.placa?` · ${item.placa}`:""}</div>}
                  {item.conteudo && <div style={{ fontSize:12, color:"#888", marginTop:6, lineHeight:1.5 }}>{item.conteudo.slice(0,80)}...</div>}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* MODAL FORM */}
      {modal==="form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:540, padding:32, maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar":"➕ Novo"} {aba==="instrutores"?"Instrutor":aba==="motoristas"?"Motorista":"Ação Educacional"}</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {campos().map(c=>(
                <div key={c.key}>
                  <label style={labelStyle}>{c.label}</label>
                  {c.type==="textarea" ? (
                    <textarea value={form[c.key]||""} onChange={e=>setForm(f=>({...f,[c.key]:e.target.value}))} placeholder={c.placeholder} style={{ ...inputStyle, minHeight:100, resize:"vertical", lineHeight:1.6 }}/>
                  ) : (
                    <input type={c.type} value={form[c.key]||""} onChange={e=>setForm(f=>({...f,[c.key]:e.target.value}))} placeholder={c.placeholder} style={inputStyle}/>
                  )}
                </div>
              ))}
            </div>
            <button onClick={salvar} disabled={salvando||!form.nome} style={{ width:"100%", marginTop:20, background:salvando||!form.nome?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.nome?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando?"Salvando...":"💾 Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DETALHE */}
      {modal==="detalhe" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{aba==="instrutores"?"👨‍🏫":aba==="motoristas"?"🚗":"📚"} {selected.nome}</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              {campos().filter(c=>selected[c.key]).map(c=>(
                <div key={c.key} style={{ background:"#f8f9fb", borderRadius:12, padding:"10px 14px", gridColumn:c.type==="textarea"?"1/-1":"auto" }}>
                  <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{c.label.replace(" *","")}</div>
                  <div style={{ color:"#1B3F7A", fontWeight:600, fontSize:13, whiteSpace:"pre-wrap" }}>{selected[c.key]}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{ setForm({...selected}); setModal("form"); }} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✏️ Editar</button>
              <button onClick={()=>deletar(selected.id)} style={{ background:"#fee2e2", border:"none", borderRadius:14, padding:"14px 18px", color:"#dc2626", fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>🗑️</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
