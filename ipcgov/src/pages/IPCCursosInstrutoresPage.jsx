import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const lbl = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };
const inp = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"11px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };

const TIPOS = ["Curso Presencial","Curso EaD","Ambos"];

export default function IPCCursosInstrutoresPage({ user, onBack }) {
  const [instrutores, setInstrutores] = useState([]);
  const [servidores, setServidores]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [selected, setSelected]       = useState(null);
  const [salvando, setSalvando]       = useState(false);
  const [busca, setBusca]             = useState("");
  const [form, setForm]               = useState({
    nome:"", email:"", cpf:"", telefone:"", miniCurriculo:"",
    tipo:"Ambos", servidorId:"", ehServidor:false,
    banco:"", agencia:"", conta:"", pix:"",
  });

  const ADMINS = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"];
  const isAdmin = ADMINS.includes(user?.email);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [iSnap, sSnap, tcSnap] = await Promise.all([
        getDocs(collection(db,"ipc_cursos_instrutores")),
        getDocs(collection(db,"ipc_servidores")),
        getDocs(collection(db,"tceduc_instrutores")),
      ]);
      setInstrutores(iSnap.docs.map(d=>({id:d.id,...d.data()})));
      setServidores(sSnap.docs.map(d=>({id:d.id,...d.data()})));
      // Store TCEduc instrutores for import
      window._tcInstrutores = tcSnap.docs.map(d=>({id:d.id,...d.data()}));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const abrirNovo = () => {
    setSelected(null);
    setForm({ nome:"", email:"", cpf:"", telefone:"", miniCurriculo:"", tipo:"Ambos", servidorId:"", ehServidor:false, banco:"", agencia:"", conta:"", pix:"" });
    setModal("form");
  };

  const abrirEditar = (inst) => {
    setSelected(inst);
    setForm({ ...inst });
    setModal("form");
  };

  const salvar = async () => {
    if (!form.nome.trim()) { alert("Informe o nome do instrutor."); return; }
    setSalvando(true);
    try {
      const dados = { ...form, atualizadoEm: new Date().toISOString() };
      if (selected) {
        await updateDoc(doc(db,"ipc_cursos_instrutores",selected.id), dados);
        setInstrutores(is => is.map(x => x.id===selected.id ? {...x,...dados} : x));
      } else {
        dados.criadoEm = new Date().toISOString();
        dados.criadoPor = user?.email||"sistema";
        const ref = await addDoc(collection(db,"ipc_cursos_instrutores"), dados);
        setInstrutores(is => [...is, {id:ref.id,...dados}]);
      }
      setModal(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este instrutor?")) return;
    await deleteDoc(doc(db,"ipc_cursos_instrutores",id));
    setInstrutores(is => is.filter(x => x.id!==id));
  };

  const importarDoTCEduc = async () => {
    const tc = window._tcInstrutores || [];
    if (!tc.length) { alert("Nenhum instrutor encontrado no TCEduc."); return; }
    const existentes = instrutores.map(i => i.nome?.toLowerCase().trim());
    const novos = tc.filter(i => !existentes.includes((i.nome||"").toLowerCase().trim()));
    if (!novos.length) { alert("Todos os instrutores do TCEduc já estão cadastrados."); return; }
    if (!window.confirm("Importar " + novos.length + " instrutor(es) do TCEduc?")) return;
    setSalvando(true);
    try {
      await Promise.all(novos.map(inst => addDoc(collection(db,"ipc_cursos_instrutores"), {
        nome: inst.nome||"", email: inst.email||"", cpf: inst.cpf||"",
        miniCurriculo: inst.miniCurriculo||"", tipo:"Ambos",
        ehServidor: false, importadoDoTCEduc: true,
        criadoEm: new Date().toISOString(), criadoPor: user?.email||"sistema",
      })));
      await loadAll();
      alert(novos.length + " instrutor(es) importado(s) com sucesso!");
    } catch(e) { console.error(e); alert("Erro ao importar."); }
    setSalvando(false);
  };

  const selecionarServidor = (servidorId) => {
    const srv = servidores.find(s => s.id === servidorId);
    if (srv) {
      setForm(f => ({ ...f, servidorId, nome: srv.nome||"", email: srv.email||"", ehServidor: true }));
    } else {
      setForm(f => ({ ...f, servidorId:"", ehServidor: false }));
    }
  };

  const filtrados = instrutores.filter(i =>
    !busca || (i.nome||"").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 36px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20, flexShrink:0 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC CURSOS</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>👨‍🏫 Cadastro de Instrutores</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              <div onClick={importarDoTCEduc} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                ↙ Importar do TCEduc
              </div>
              <div onClick={abrirNovo} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(232,115,10,0.4)" }}>
                + Novo Instrutor
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"24px 32px 80px" }}>
        <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"center" }}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar instrutor..." style={{ ...inp, maxWidth:300, padding:"9px 14px" }}/>
          <span style={{ marginLeft:"auto", fontSize:12, color:"#aaa" }}>{filtrados.length} instrutor{filtrados.length!==1?"es":""}</span>
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#aaa" }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>👨‍🏫</div>
            <div style={{ fontWeight:700, fontSize:18, color:"#1B3F7A", marginBottom:8 }}>Nenhum instrutor cadastrado</div>
            <div style={{ color:"#aaa", fontSize:14 }}>Clique em "+ Novo Instrutor" ou importe do TCEduc.</div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:14 }}>
            {filtrados.map(inst => (
              <div key={inst.id} style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 2px 10px rgba(27,63,122,0.07)", border:"1px solid #e8edf2" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A" }}>{inst.nome}</div>
                  <div style={{ display:"flex", gap:6 }}>
                    <div onClick={() => abrirEditar(inst)} style={{ background:"#f0f4ff", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>✏️</div>
                    {isAdmin && <div onClick={() => excluir(inst.id)} style={{ background:"#fee2e2", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>🗑️</div>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                  <span style={{ background:"#eff6ff", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700, color:"#1B3F7A" }}>{inst.tipo||"Ambos"}</span>
                  {inst.ehServidor && <span style={{ background:"#f0fdf4", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700, color:"#059669" }}>Servidor IPC</span>}
                  {inst.importadoDoTCEduc && <span style={{ background:"#f5f3ff", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700, color:"#7c3aed" }}>TCEduc</span>}
                </div>
                {inst.email && <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>✉️ {inst.email}</div>}
                {inst.miniCurriculo && <div style={{ fontSize:12, color:"#555", lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{inst.miniCurriculo}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL FORM */}
      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:600, maxHeight:"90vh", overflowY:"auto", padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected ? "Editar Instrutor" : "Novo Instrutor"}</div>
              <div onClick={() => setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>

            {/* Servidor IPC */}
            <div style={{ background:"#f0fdf4", borderRadius:12, padding:"14px 16px", marginBottom:20, border:"1px solid #c8e6c9" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#059669", marginBottom:10 }}>👤 É servidor do IPC?</div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:form.ehServidor?10:0 }}
                onClick={() => setForm(f => ({ ...f, ehServidor:!f.ehServidor, servidorId:"" }))}>
                <div style={{ width:20, height:20, borderRadius:6, border:"2px solid "+(form.ehServidor?"#059669":"#ccc"), background:form.ehServidor?"#059669":"#fff", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, cursor:"pointer" }}>
                  {form.ehServidor && "✓"}
                </div>
                <span style={{ fontSize:13, color:"#333" }}>Sim, é servidor do IPC</span>
              </div>
              {form.ehServidor && (
                <select value={form.servidorId||""} onChange={e=>selecionarServidor(e.target.value)} style={inp}>
                  <option value="">Selecione o servidor...</option>
                  {servidores.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")).map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Nome Completo *</label>
                <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={lbl}>E-mail</label>
                <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={lbl}>CPF</label>
                <input value={form.cpf} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))} placeholder="000.000.000-00" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Telefone/WhatsApp</label>
                <input value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Tipo de Atuação</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Mini Currículo</label>
                <textarea value={form.miniCurriculo} onChange={e=>setForm(f=>({...f,miniCurriculo:e.target.value}))} style={{ ...inp, minHeight:80, resize:"vertical" }}/>
              </div>

              {/* Dados bancários */}
              <div style={{ gridColumn:"1/-1", marginTop:8 }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:12 }}>🏦 Dados para Pagamento</div>
              </div>
              <div>
                <label style={lbl}>Banco</label>
                <input value={form.banco||""} onChange={e=>setForm(f=>({...f,banco:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Agência</label>
                <input value={form.agencia||""} onChange={e=>setForm(f=>({...f,agencia:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={lbl}>Conta</label>
                <input value={form.conta||""} onChange={e=>setForm(f=>({...f,conta:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={lbl}>PIX</label>
                <input value={form.pix||""} onChange={e=>setForm(f=>({...f,pix:e.target.value}))} style={inp}/>
              </div>
            </div>

            <button onClick={salvar} disabled={salvando} style={{ width:"100%", marginTop:24, background:salvando?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando ? "Salvando..." : "💾 Salvar Instrutor"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
