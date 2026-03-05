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
      const [eSnap, aSnap] = await Promise.all([
        getDocs(collection(db,"ipc_externos")),
        getDocs(collection(db,"tceduc_acoes_edu")),
      ]);
      const externos = eSnap.docs.map(d=>({id:d.id,...d.data()}));
      setInstrutores(externos.filter(e=>e.tipo==="Instrutor(a)"));
      setMotoristas(externos.filter(e=>e.tipo==="Motorista"));
      setAcoesEdu(aSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const salvarAcao = async () => {
    if (!form.nome) return;
    setSalvando(true);
    try {
      const dados = { nome:form.nome, conteudo:form.conteudo||"", atualizadoEm:new Date().toISOString() };
      if (selected) {
        await updateDoc(doc(db,"tceduc_acoes_edu",selected.id), dados);
        setAcoesEdu(a=>a.map(x=>x.id===selected.id?{...x,...dados}:x));
      } else {
        dados.criadoEm = new Date().toISOString();
        const ref = await addDoc(collection(db,"tceduc_acoes_edu"), dados);
        setAcoesEdu(a=>[...a,{id:ref.id,...dados}]);
      }
      setModal(null); setForm({}); setSelected(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const deletarAcao = async (id) => {
    if (!window.confirm("Excluir ação educacional?")) return;
    await deleteDoc(doc(db,"tceduc_acoes_edu",id));
    setAcoesEdu(a=>a.filter(x=>x.id!==id));
    setModal(null); setSelected(null);
  };

  const lista = () => aba==="instrutores" ? instrutores : aba==="motoristas" ? motoristas : acoesEdu;

  const abas = [
    { id:"instrutores", icon:"👨‍🏫", label:"Instrutores" },
    { id:"motoristas", icon:"🚗", label:"Motoristas" },
    { id:"acoes", icon:"📚", label:"Ações Educacionais" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} select,input,textarea{font-family:'Montserrat',sans-serif}`}</style>

      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 32px 40px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>TCEDUC</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:24 }}>Cadastros</div>
            </div>
            {aba==="acoes" && (
              <div onClick={()=>{ setForm({}); setSelected(null); setModal("form_acao"); }} style={{ marginLeft:"auto", background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Nova Ação</div>
            )}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {abas.map(a=>(
              <div key={a.id} onClick={()=>setAba(a.id)} style={{ background:aba===a.id?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.08)", border:`1px solid ${aba===a.id?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.1)"}`, borderRadius:12, padding:"8px 16px", color:"#fff", fontSize:13, fontWeight:aba===a.id?700:500, cursor:"pointer" }}>
                {a.icon} {a.label} <span style={{ opacity:0.6, fontSize:11 }}>({a.id==="instrutores"?instrutores.length:a.id==="motoristas"?motoristas.length:acoesEdu.length})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 32px 80px" }}>
        {(aba==="instrutores"||aba==="motoristas") && (
          <div style={{ background:"#f0f4ff", borderRadius:14, padding:"12px 18px", marginBottom:20, fontSize:13, color:"#1B3F7A", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>ℹ️</span>
            <span>Instrutores e motoristas são gerenciados no módulo <strong>IPC Pessoas → Colaboradores Externos</strong>.</span>
          </div>
        )}

        {loading ? <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando...</div> : (

          aba==="acoes" ? (
            acoesEdu.length===0 ? (
              <div style={{ textAlign:"center", padding:60 }}>
                <div style={{ fontSize:56, marginBottom:16 }}>📚</div>
                <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhuma ação educacional cadastrada</div>
                <div onClick={()=>{ setForm({}); setSelected(null); setModal("form_acao"); }} style={{ display:"inline-block", background:"#1B3F7A", borderRadius:14, padding:"12px 24px", color:"#fff", fontWeight:700, cursor:"pointer", marginTop:12 }}>+ Cadastrar Ação</div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                {acoesEdu.map(acao=>(
                  <div key={acao.id} onClick={()=>{ setSelected(acao); setModal("detalhe_acao"); }} style={{ background:"#fff", borderRadius:20, padding:"20px 22px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)", cursor:"pointer", borderLeft:"4px solid #1B3F7A" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                      <div style={{ fontSize:28, flexShrink:0 }}>📚</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A", marginBottom:6 }}>{acao.nome}</div>
                        {acao.conteudo && <div style={{ fontSize:12, color:"#888", lineHeight:1.5 }}>{acao.conteudo.slice(0,100)}{acao.conteudo.length>100?"...":""}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            lista().length===0 ? (
              <div style={{ textAlign:"center", padding:60 }}>
                <div style={{ fontSize:56, marginBottom:16 }}>{aba==="instrutores"?"👨‍🏫":"🚗"}</div>
                <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum {aba==="instrutores"?"instrutor":"motorista"} cadastrado</div>
                <div style={{ color:"#aaa" }}>Cadastre em IPC Pessoas → Colaboradores Externos</div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                {lista().map(item=>(
                  <div key={item.id} style={{ background:"#fff", borderRadius:20, padding:"20px 22px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:52, height:52, borderRadius:16, background:"#1B3F7A18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>{aba==="instrutores"?"👨‍🏫":"🚗"}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A" }}>{item.nome}</div>
                        {item.email && <div style={{ color:"#aaa", fontSize:12, marginTop:2 }}>{item.email}</div>}
                        {item.contato && <div style={{ color:"#888", fontSize:12, marginTop:2 }}>📱 {item.contato}</div>}
                      </div>
                    </div>
                    {item.especialidade && <div style={{ marginTop:12, background:"#f0f4ff", borderRadius:8, padding:"6px 12px", fontSize:12, color:"#1B3F7A" }}>🎓 {item.especialidade}</div>}
                  </div>
                ))}
              </div>
            )
          )
        )}
      </div>

      {/* MODAL FORM AÇÃO */}
      {modal==="form_acao" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:520, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar Ação":"➕ Nova Ação Educacional"}</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={labelStyle}>Nome da Ação *</label>
                <input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Palestra, Curso, Oficina, Seminário..." style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Conteúdo Programático</label>
                <textarea value={form.conteudo||""} onChange={e=>setForm(f=>({...f,conteudo:e.target.value}))} placeholder="Descreva os temas e conteúdos abordados..." style={{ ...inputStyle, minHeight:120, resize:"vertical", lineHeight:1.6 }}/>
              </div>
            </div>
            <button onClick={salvarAcao} disabled={salvando||!form.nome} style={{ width:"100%", marginTop:20, background:salvando||!form.nome?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.nome?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando?"Salvando...":"💾 Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DETALHE AÇÃO */}
      {modal==="detalhe_acao" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>📚 {selected.nome}</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            {selected.conteudo && (
              <div style={{ background:"#f8f9fb", borderRadius:14, padding:"16px", marginBottom:20, fontSize:13, color:"#555", lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>Conteúdo Programático</div>
                {selected.conteudo}
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{ setForm({...selected}); setModal("form_acao"); }} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✏️ Editar</button>
              <button onClick={()=>deletarAcao(selected.id)} style={{ background:"#fee2e2", border:"none", borderRadius:14, padding:"14px 18px", color:"#dc2626", fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>🗑️</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
