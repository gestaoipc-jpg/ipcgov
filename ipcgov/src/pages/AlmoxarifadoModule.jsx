import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const CATEGORIAS = ["Material de Escritório","Material Didático","Uniforme/Vestuário","Equipamento","Limpeza","Informática","Outros"];
const SETORES = ["TCEduc","IPC Designer","IPC Processos","Almoxarifado","Administração","Financeiro","Jurídico","Comunicação","Todos"];

function formatDate(d) { if(!d)return"—"; const[y,m,day]=d.split("-"); return`${day}/${m}/${y}`; }
function formatDateTime(iso) { if(!iso)return"—"; return new Date(iso).toLocaleString("pt-BR"); }

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

export default function AlmoxarifadoModule({ user, onBack, onDashboard, onRelatorio, onSolicitacoes }) {
  const [materiais, setMateriais] = useState([]);
  const [servidores, setServidores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [formEntrada, setFormEntrada] = useState({});
  const [formSaida, setFormSaida] = useState({});
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState("materiais");

  useEffect(() => { loadMateriais(); loadServidores(); }, []);

  const loadServidores = async () => {
    try {
      const snap = await getDocs(collection(db, "ipc_servidores"));
      setServidores(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.nome||"").localeCompare(b.nome||"")));
    } catch(e) { console.error(e); }
  };

  const loadMateriais = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "almox_materiais"));
      setMateriais(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const salvarMaterial = async () => {
    if (!form.nome) return;
    setSalvando(true);
    try {
      const dados = { ...form, atualizadoEm: new Date().toISOString() };
      if (selected) {
        await updateDoc(doc(db, "almox_materiais", selected.id), dados);
        setMateriais(m => m.map(x => x.id===selected.id ? { ...x, ...dados } : x));
      } else {
        dados.criadoEm = new Date().toISOString();
        dados.estoqueAtual = 0;
        dados.criadoPor = user?.email || "sistema";
        const ref = await addDoc(collection(db, "almox_materiais"), dados);
        setMateriais(m => [...m, { id: ref.id, ...dados }]);
      }
      setModal(null); setForm({});
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const deletarMaterial = async (id) => {
    if (!window.confirm("Excluir este material?")) return;
    await deleteDoc(doc(db, "almox_materiais", id));
    setMateriais(m => m.filter(x => x.id !== id));
    setModal(null);
  };

  const registrarEntrada = async () => {
    if (!formEntrada.materialId || !formEntrada.quantidade) return;
    setSalvando(true);
    try {
      const mat = materiais.find(m => m.id === formEntrada.materialId);
      if (!mat) return;
      const novoEstoque = (mat.estoqueAtual || 0) + parseInt(formEntrada.quantidade);
      const entrada = {
        materialId: formEntrada.materialId,
        materialNome: mat.nome,
        quantidade: parseInt(formEntrada.quantidade),
        fornecedor: formEntrada.fornecedor || "",
        notaFiscal: formEntrada.notaFiscal || "",
        observacao: formEntrada.observacao || "",
        data: formEntrada.data || new Date().toISOString().split("T")[0],
        registradoPor: user?.email || "sistema",
        criadoEm: new Date().toISOString(),
        tipo: "entrada",
      };
      await addDoc(collection(db, "almox_movimentacoes"), entrada);
      await updateDoc(doc(db, "almox_materiais", mat.id), { estoqueAtual: novoEstoque, atualizadoEm: new Date().toISOString() });
      setMateriais(m => m.map(x => x.id===mat.id ? { ...x, estoqueAtual: novoEstoque } : x));
      // Verificar alerta de estoque
      if (novoEstoque <= (mat.estoqueMinimo || 0)) {
        await addDoc(collection(db, "almox_alertas"), {
          materialId: mat.id, materialNome: mat.nome,
          tipo: "estoque_minimo", lido: false,
          mensagem: `Estoque de "${mat.nome}" está em ${novoEstoque} unidade${novoEstoque!==1?"s":""} (mínimo: ${mat.estoqueMinimo || 0})`,
          criadoEm: new Date().toISOString(),
        });
      }
      setModal(null); setFormEntrada({});
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const registrarSaida = async () => {
    if (!formSaida.materialId || !formSaida.quantidade) return;
    setSalvando(true);
    try {
      const mat = materiais.find(m => m.id === formSaida.materialId);
      if (!mat) return;
      const qtd = parseInt(formSaida.quantidade);
      if (qtd > (mat.estoqueAtual||0)) {
        alert(`Estoque insuficiente! Disponível: ${mat.estoqueAtual||0} ${mat.unidade||"un."}`);
        setSalvando(false); return;
      }
      const novoEstoque = (mat.estoqueAtual||0) - qtd;
      const saida = {
        materialId: formSaida.materialId,
        materialNome: mat.nome,
        quantidade: qtd,
        solicitanteId: formSaida.solicitanteId || "",
        solicitanteNome: formSaida.solicitanteNome || "",
        observacao: formSaida.observacao || "",
        data: formSaida.data || new Date().toISOString().split("T")[0],
        registradoPor: user?.email || "sistema",
        criadoEm: new Date().toISOString(),
        tipo: "saida",
      };
      await addDoc(collection(db, "almox_movimentacoes"), saida);
      await updateDoc(doc(db, "almox_materiais", mat.id), { estoqueAtual: novoEstoque, atualizadoEm: new Date().toISOString() });
      setMateriais(m => m.map(x => x.id===mat.id ? { ...x, estoqueAtual: novoEstoque } : x));
      if (novoEstoque <= (mat.estoqueMinimo||0) && mat.estoqueMinimo > 0) {
        await addDoc(collection(db, "almox_alertas"), {
          materialId: mat.id, materialNome: mat.nome,
          tipo: "estoque_minimo", lido: false,
          mensagem: `Estoque de "${mat.nome}" está em ${novoEstoque} unidade${novoEstoque!==1?"s":""} (mínimo: ${mat.estoqueMinimo||0})`,
          criadoEm: new Date().toISOString(),
        });
      }
      setModal(null); setFormSaida({});
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const filtrados = materiais.filter(m => {
    if (filtroCategoria !== "todas" && m.categoria !== filtroCategoria) return false;
    if (busca) {
      const b = busca.toLowerCase();
      if (!((m.nome||"").toLowerCase().includes(b) || (m.descricao||"").toLowerCase().includes(b))) return false;
    }
    return true;
  });

  const emBaixoEstoque = materiais.filter(m => (m.estoqueAtual||0) <= (m.estoqueMinimo||0) && m.estoqueMinimo > 0);
  const totalItens = materiais.length;
  const valorTotalUnidades = materiais.reduce((s,m) => s+(m.estoqueAtual||0), 0);

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
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>🗃️ Almoxarifado</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
              <div onClick={onDashboard} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>📊 Dashboard</div>
              <div onClick={onSolicitacoes} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>📤 Solicitações</div>
              <div onClick={onRelatorio} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>📄 Relatórios</div>
              <div onClick={() => { setFormEntrada({}); setModal("entrada"); }} style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>📥 Registrar Entrada</div>
              <div onClick={() => { setFormSaida({}); setModal("saida"); }} style={{ background:"rgba(220,38,38,0.3)", border:"1px solid rgba(220,38,38,0.4)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>📤 Registrar Saída</div>
              <div onClick={() => { setForm({ setoresAutorizados:[] }); setSelected(null); setModal("form"); }} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(232,115,10,0.4)" }}>+ Novo Material</div>
            </div>
          </div>
          {/* STATS */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {[
              { label:"Materiais cadastrados", value:totalItens, cor:"rgba(255,255,255,0.12)" },
              { label:"Total em estoque", value:`${valorTotalUnidades} un.`, cor:"rgba(255,255,255,0.12)" },
              { label:"Estoque baixo", value:emBaixoEstoque.length, cor:emBaixoEstoque.length>0?"rgba(220,38,38,0.4)":"rgba(255,255,255,0.12)" },
            ].map((s,i) => (
              <div key={i} style={{ background:s.cor, borderRadius:14, padding:"10px 18px" }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>{s.value}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"24px 32px 80px" }}>
        {/* ALERTA ESTOQUE BAIXO */}
        {emBaixoEstoque.length > 0 && (
          <div style={{ background:"#fee2e2", borderRadius:16, padding:"14px 20px", marginBottom:20, border:"1px solid #fecaca", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ fontSize:24 }}>⚠️</div>
            <div>
              <div style={{ fontWeight:700, color:"#dc2626", fontSize:14, marginBottom:4 }}>Estoque baixo em {emBaixoEstoque.length} material{emBaixoEstoque.length!==1?"is":""}!</div>
              <div style={{ fontSize:12, color:"#dc2626" }}>{emBaixoEstoque.map(m=>`${m.nome} (${m.estoqueAtual||0} un.)`).join(" · ")}</div>
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar material..." style={{ ...inputStyle, maxWidth:280, padding:"9px 14px" }}/>
          <select value={filtroCategoria} onChange={e=>setFiltroCategoria(e.target.value)} style={{ background:"#fff", border:"none", borderRadius:20, padding:"8px 16px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer", outline:"none", boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
            <option value="todas">Todas as categorias</option>
            {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          {(filtroCategoria!=="todas"||busca) && <div onClick={()=>{setFiltroCategoria("todas");setBusca("");}} style={{ background:"#fee2e2", borderRadius:20, padding:"8px 14px", fontSize:12, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>✕ Limpar</div>}
          <span style={{ marginLeft:"auto", fontSize:12, color:"#aaa" }}>{filtrados.length} material{filtrados.length!==1?"is":""}</span>
        </div>

        {/* GRID DE MATERIAIS */}
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando materiais...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ textAlign:"center", padding:60 }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🗃️</div>
            <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum material cadastrado</div>
            <div onClick={()=>{ setForm({ setoresAutorizados:[] }); setSelected(null); setModal("form"); }} style={{ display:"inline-block", background:"#1B3F7A", borderRadius:14, padding:"12px 24px", color:"#fff", fontWeight:700, cursor:"pointer", marginTop:12 }}>+ Novo Material</div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
            {filtrados.map(mat => {
              const baixo = (mat.estoqueAtual||0) <= (mat.estoqueMinimo||0) && mat.estoqueMinimo > 0;
              const zerado = (mat.estoqueAtual||0) === 0;
              return (
                <div key={mat.id} onClick={()=>{ setSelected(mat); setModal("detalhe"); }} style={{
                  background:"#fff", borderRadius:18, padding:"20px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)",
                  cursor:"pointer", border:zerado?"2px solid #dc262630":baixo?"2px solid #E8730A30":"2px solid transparent",
                  transition:"transform 0.15s, box-shadow 0.15s",
                }} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(27,63,122,0.13)"}}
                   onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 12px rgba(27,63,122,0.07)"}}>

                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A", marginBottom:4 }}>{mat.nome}</div>
                      {mat.categoria && <div style={{ background:"#f0f4ff", borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:700, color:"#1B3F7A", display:"inline-block" }}>{mat.categoria}</div>}
                    </div>
                    <div style={{ textAlign:"center", background:zerado?"#fee2e2":baixo?"#fff3e0":"#f0fdf4", borderRadius:12, padding:"8px 14px", minWidth:60, flexShrink:0, marginLeft:10 }}>
                      <div style={{ fontWeight:900, fontSize:22, color:zerado?"#dc2626":baixo?"#E8730A":"#059669", lineHeight:1 }}>{mat.estoqueAtual||0}</div>
                      <div style={{ fontSize:10, color:zerado?"#dc2626":baixo?"#E8730A":"#059669", fontWeight:600 }}>{mat.unidade||"un."}</div>
                    </div>
                  </div>

                  {mat.descricao && <div style={{ fontSize:12, color:"#888", marginBottom:10, lineHeight:1.5 }}>{mat.descricao}</div>}

                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #f0f0f0", paddingTop:10, marginTop:4 }}>
                    <div style={{ fontSize:11, color:"#aaa" }}>Mín: {mat.estoqueMinimo||0} {mat.unidade||"un."}</div>
                    {zerado && <div style={{ fontSize:11, fontWeight:700, color:"#dc2626" }}>⚠️ SEM ESTOQUE</div>}
                    {!zerado && baixo && <div style={{ fontSize:11, fontWeight:700, color:"#E8730A" }}>⚠️ ESTOQUE BAIXO</div>}
                    {!zerado && !baixo && <div style={{ fontSize:11, color:"#059669", fontWeight:600 }}>✓ OK</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETALHE */}
      {modal==="detalhe" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:560, maxHeight:"90vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 28px", borderRadius:"24px 24px 0 0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:2, marginBottom:4 }}>MATERIAL</div>
                  <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>{selected.nome}</div>
                  {selected.categoria && <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, marginTop:4 }}>{selected.categoria}</div>}
                </div>
                <div style={{ textAlign:"center", background:"rgba(255,255,255,0.2)", borderRadius:14, padding:"10px 18px" }}>
                  <div style={{ fontWeight:900, fontSize:28, color:"#fff", lineHeight:1 }}>{selected.estoqueAtual||0}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>{selected.unidade||"unidades"}</div>
                </div>
              </div>
            </div>
            <div style={{ padding:"24px 28px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
                {[
                  { label:"Estoque Mínimo", value:`${selected.estoqueMinimo||0} ${selected.unidade||"un."}` },
                  { label:"Unidade", value:selected.unidade||"—" },
                  { label:"Setores Autorizados", value:(selected.setoresAutorizados||[]).join(", ")||"Todos" },
                  { label:"Criado por", value:selected.criadoPor||"—" },
                ].map((f,i)=>(
                  <div key={i} style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px" }}>
                    <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{f.label}</div>
                    <div style={{ color:"#1B3F7A", fontWeight:600, fontSize:13 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              {selected.descricao && (
                <div style={{ background:"#f8f9fb", borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
                  <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>Descrição</div>
                  <div style={{ color:"#333", fontSize:14, lineHeight:1.6 }}>{selected.descricao}</div>
                </div>
              )}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>{ setForm({...selected}); setModal("form"); }} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✏️ Editar</button>
                <button onClick={()=>{ setFormEntrada({ materialId:selected.id }); setModal("entrada"); }} style={{ flex:1, background:"#e8f5e9", border:"none", borderRadius:14, padding:14, color:"#059669", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>📥 Entrada</button>
                <button onClick={()=>deletarMaterial(selected.id)} style={{ background:"#fee2e2", border:"none", borderRadius:14, padding:"14px 18px", color:"#dc2626", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>🗑️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM MATERIAL */}
      {modal==="form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:640, maxHeight:"92vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"28px 32px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar Material":"➕ Novo Material"}</div>
                <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Nome do Material *</label>
                  <input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Caneta azul, Bloco de notas..." style={inputStyle}/>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Descrição</label>
                  <textarea value={form.descricao||""} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descrição detalhada do material..." style={{ ...inputStyle, minHeight:70, resize:"vertical" }}/>
                </div>
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <select value={form.categoria||""} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} style={inputStyle}>
                    <option value="">Selecione...</option>
                    {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Unidade de Medida</label>
                  <input value={form.unidade||""} onChange={e=>setForm(f=>({...f,unidade:e.target.value}))} placeholder="Ex: un., caixa, resma, kg..." style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Estoque Mínimo (alerta)</label>
                  <input type="number" min="0" value={form.estoqueMinimo||""} onChange={e=>setForm(f=>({...f,estoqueMinimo:parseInt(e.target.value)||0}))} placeholder="Ex: 10" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Localização no Almox.</label>
                  <input value={form.localizacao||""} onChange={e=>setForm(f=>({...f,localizacao:e.target.value}))} placeholder="Ex: Prateleira A, Gaveta 3..." style={inputStyle}/>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Setores Autorizados a Solicitar</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:4 }}>
                    {SETORES.map(s=>{
                      const sel = (form.setoresAutorizados||[]).includes(s);
                      return (
                        <div key={s} onClick={()=>{
                          const atual = form.setoresAutorizados||[];
                          if(s==="Todos"){ setForm(f=>({...f,setoresAutorizados:["Todos"]})); return; }
                          const novo = sel ? atual.filter(x=>x!==s) : [...atual.filter(x=>x!=="Todos"),s];
                          setForm(f=>({...f,setoresAutorizados:novo}));
                        }} style={{ background:sel?"#1B3F7A":"#f0f4ff", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:700, color:sel?"#fff":"#1B3F7A", cursor:"pointer", border:`1px solid ${sel?"#1B3F7A":"#dce8f5"}` }}>{s}</div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button onClick={salvarMaterial} disabled={salvando||!form.nome} style={{ width:"100%", marginTop:20, background:salvando||!form.nome?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.nome?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                {salvando?"Salvando...":"💾 Salvar Material"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENTRADA */}
      {modal==="entrada" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:560, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#059669" }}>📥 Registrar Entrada de Estoque</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0fdf4", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#059669" }}>✕</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Material *</label>
                <select value={formEntrada.materialId||""} onChange={e=>setFormEntrada(f=>({...f,materialId:e.target.value}))} style={inputStyle}>
                  <option value="">Selecione o material...</option>
                  {materiais.map(m=><option key={m.id} value={m.id}>{m.nome} (estoque atual: {m.estoqueAtual||0} {m.unidade||"un."})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantidade *</label>
                <input type="number" min="1" value={formEntrada.quantidade||""} onChange={e=>setFormEntrada(f=>({...f,quantidade:e.target.value}))} placeholder="Ex: 50" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Data de Entrada</label>
                <input type="date" value={formEntrada.data||""} onChange={e=>setFormEntrada(f=>({...f,data:e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Fornecedor</label>
                <input value={formEntrada.fornecedor||""} onChange={e=>setFormEntrada(f=>({...f,fornecedor:e.target.value}))} placeholder="Nome do fornecedor" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Nota Fiscal</label>
                <input value={formEntrada.notaFiscal||""} onChange={e=>setFormEntrada(f=>({...f,notaFiscal:e.target.value}))} placeholder="Nº da NF" style={inputStyle}/>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Observação</label>
                <textarea value={formEntrada.observacao||""} onChange={e=>setFormEntrada(f=>({...f,observacao:e.target.value}))} placeholder="Observações sobre esta entrada..." style={{ ...inputStyle, minHeight:60, resize:"vertical" }}/>
              </div>
            </div>
            <button onClick={registrarEntrada} disabled={salvando||!formEntrada.materialId||!formEntrada.quantidade} style={{ width:"100%", marginTop:20, background:salvando||!formEntrada.materialId||!formEntrada.quantidade?"#ccc":"linear-gradient(135deg,#059669,#10b981)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!formEntrada.materialId||!formEntrada.quantidade?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando?"Registrando...":"📥 Confirmar Entrada"}
            </button>
          </div>
        </div>
      )}
      {modal==="saida" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:560, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#dc2626" }}>📤 Registrar Saída de Estoque</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#fff0f0", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#dc2626" }}>✕</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Material *</label>
                <select value={formSaida.materialId||""} onChange={e=>setFormSaida(f=>({...f,materialId:e.target.value}))} style={inputStyle}>
                  <option value="">Selecione o material...</option>
                  {materiais.map(m=><option key={m.id} value={m.id}>{m.nome} (disponível: {m.estoqueAtual||0} {m.unidade||"un."})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantidade *</label>
                <input type="number" min="1" value={formSaida.quantidade||""} onChange={e=>setFormSaida(f=>({...f,quantidade:e.target.value}))} placeholder="Ex: 5" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Data de Saída</label>
                <input type="date" value={formSaida.data||""} onChange={e=>setFormSaida(f=>({...f,data:e.target.value}))} style={inputStyle}/>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Usuário Solicitante</label>
                <select value={formSaida.solicitanteId||""} onChange={e=>{
                  const srv = servidores.find(s=>s.id===e.target.value);
                  setFormSaida(f=>({...f, solicitanteId:e.target.value, solicitanteNome:srv?.nome||""}));
                }} style={inputStyle}>
                  <option value="">Selecione o solicitante...</option>
                  {servidores.map(s=><option key={s.id} value={s.id}>{s.nome}{s.setor?` — ${s.setor}`:""}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={labelStyle}>Observação</label>
                <textarea value={formSaida.observacao||""} onChange={e=>setFormSaida(f=>({...f,observacao:e.target.value}))} placeholder="Motivo da saída, destino, informações adicionais..." style={{ ...inputStyle, minHeight:80, resize:"vertical" }}/>
              </div>
            </div>
            {formSaida.materialId && formSaida.quantidade && parseInt(formSaida.quantidade) > (materiais.find(m=>m.id===formSaida.materialId)?.estoqueAtual||0) && (
              <div style={{ background:"#fff0f0", border:"1px solid #dc262630", borderRadius:12, padding:"10px 14px", marginTop:12, fontSize:13, color:"#dc2626", fontWeight:600 }}>
                ⚠️ Quantidade maior que o estoque disponível ({materiais.find(m=>m.id===formSaida.materialId)?.estoqueAtual||0} {materiais.find(m=>m.id===formSaida.materialId)?.unidade||"un."})
              </div>
            )}
            <button onClick={registrarSaida} disabled={salvando||!formSaida.materialId||!formSaida.quantidade} style={{ width:"100%", marginTop:20, background:salvando||!formSaida.materialId||!formSaida.quantidade?"#ccc":"linear-gradient(135deg,#dc2626,#ef4444)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!formSaida.materialId||!formSaida.quantidade?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando?"Registrando...":"📤 Confirmar Saída"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
