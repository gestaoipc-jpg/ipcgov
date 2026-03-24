import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const ADMINS = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"];
const MUNICIPIOS_CE = ["Abaiara", "Acarape", "Acaraú", "Acopiara", "Aiuaba", "Alcântaras", "Altaneira", "Alto Santo", "Amontada", "Antonina do Norte", "Apuiarés", "Aquiraz", "Aracati", "Aracoiaba", "Ararendá", "Araripe", "Aratuba", "Arneiroz", "Assaré", "Aurora", "Baixio", "Banabuiú", "Barbalha", "Barreira", "Barro", "Barroquinha", "Baturité", "Beberibe", "Bela Cruz", "Boa Viagem", "Brejo Santo", "Camocim", "Campos Sales", "Canindé", "Capistrano", "Caridade", "Caririaçu", "Cariré", "Cariús", "Carnaubal", "Cascavel", "Catarina", "Catunda", "Caucaia", "Cedro", "Chaval", "Chorozinho", "Choró", "Coreaú", "Crateús", "Crato", "Croatá", "Cruz", "Dep. Irapuã Pinheiro", "Ereré", "Eusébio", "Farias Brito", "Forquilha", "Fortaleza", "Fortim", "Frecheirinha", "General Sampaio", "Granja", "Granjeiro", "Graça", "Groaíras", "Guaiúba", "Guaraciaba do Norte", "Guaramiranga", "Hidrolândia", "Horizonte", "Ibaretama", "Ibiapina", "Ibicuitinga", "Icapuí", "Icó", "Iguatu", "Independência", "Ipaporanga", "Ipaumirim", "Ipu", "Ipueiras", "Iracema", "Irauçuba", "Itaitinga", "Itaiçaba", "Itapajé", "Itapipoca", "Itapiúna", "Itarema", "Itatira", "Jaguaretama", "Jaguaribara", "Jaguaribe", "Jaguaruana", "Jardim", "Jati", "Jijoca de Jericoacoara", "Juazeiro do Norte", "Jucás", "Lavras da Mangabeira", "Limoeiro do Norte", "Madalena", "Maracanaú", "Maranguape", "Marco", "Martinópole", "Massapê", "Mauriti", "Meruoca", "Milagres", "Milhã", "Miraíma", "Missão Velha", "Mombaça", "Monsenhor Tabosa", "Morada Nova", "Moraújo", "Morrinhos", "Mucambo", "Mulungu", "Nova Olinda", "Nova Russas", "Novo Oriente", "Ocara", "Orós", "Pacajus", "Pacatuba", "Pacoti", "Pacujá", "Palhano", "Palmácia", "Paracuru", "Paraipaba", "Parambu", "Paramoti", "Pedra Branca", "Penaforte", "Pentecoste", "Pereiro", "Pindoretama", "Piquet Carneiro", "Pires Ferreira", "Poranga", "Porteiras", "Potengi", "Potiretama", "Quiterianópolis", "Quixadá", "Quixelô", "Quixeramobim", "Quixeré", "Redenção", "Reriutaba", "Russas", "Saboeiro", "Salitre", "Santa Quitéria", "Santana do Acaraú", "Santana do Cariri", "Senador Pompeu", "Senador Sá", "Sobral", "Solonópole", "São Benedito", "São Gonçalo do Amarante", "São João do Jaguaribe", "São Luís do Curu", "Tabuleiro do Norte", "Tamboril", "Tarrafas", "Tauá", "Tejuçuoca", "Tianguá", "Trairi", "Tururu", "Ubajara", "Umirim", "Uruburetama", "Uruoca", "Varjota", "Viçosa do Ceará", "Várzea Alegre"];
const CREDES_LIST = ["CREDE 1", "CREDE 2", "CREDE 3", "CREDE 4", "CREDE 5", "CREDE 6", "CREDE 7", "CREDE 8", "CREDE 9", "CREDE 10", "CREDE 11", "CREDE 12", "CREDE 13", "CREDE 14", "CREDE 15", "CREDE 16", "CREDE 17", "CREDE 18", "CREDE 19", "CREDE 20", "SEFOR 1", "SEFOR 2", "SEFOR 3", "SEFOR 4"];

function fmtNum(n) { return n ? Number(n).toLocaleString("pt-BR") : "0"; }

export default function OlimpiadasModule({ user, userInfo, onBack, onDashboard, onSeed }) {
  const [escolas, setEscolas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modoView, setModoView] = useState("planilha");
  const [filtroEdicao, setFiltroEdicao] = useState(2026);
  const [filtroCrede, setFiltroCrede] = useState("todas");
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos");
  const [busca, setBusca] = useState("");
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ edicao:2026, nomeEscola:"", crede:"", municipio:"", alunosInscritos:0, professoresResponsaveis:0 });
  const inputRef = useRef(null);

  const isAdmin = ADMINS.includes(user?.email);
  const grupoAdm = grupos.find(g => (g.nome||"").toLowerCase().includes("olimpiada") && (g.nome||"").toLowerCase().includes("admin"));
  const isOlimpAdm = isAdmin || !!(grupoAdm && (userInfo?.grupos||[]).includes(grupoAdm.id));

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [eSnap, gSnap] = await Promise.all([
        getDocs(collection(db, "olimpiadas_escolas")),
        getDocs(collection(db, "ipc_grupos_trabalho")),
      ]);
      setEscolas(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGrupos(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const escolasFiltradas = escolas.filter(e => {
    if (filtroEdicao && e.edicao !== filtroEdicao) return false;
    if (filtroCrede !== "todas" && e.crede !== filtroCrede) return false;
    if (filtroMunicipio !== "todos" && e.municipio !== filtroMunicipio) return false;
    if (busca && !(e.nomeEscola||"").toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const totalAlunos = escolasFiltradas.reduce((s,e) => s + (parseInt(e.alunosInscritos)||0), 0);
  const totalProfs = escolasFiltradas.reduce((s,e) => s + (parseInt(e.professoresResponsaveis)||0), 0);
  const totalMunicipios = new Set(escolasFiltradas.map(e=>e.municipio).filter(Boolean)).size;
  const totalCredes = new Set(escolasFiltradas.map(e=>e.crede).filter(Boolean)).size;

  const startEdit = (id, field, value) => {
    if (!isOlimpAdm) return;
    setEditingCell({ id, field });
    setEditingValue(String(value || ""));
    setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    setSalvando(true);
    try {
      const val = ["alunosInscritos","professoresResponsaveis"].includes(field)
        ? parseInt(editingValue)||0 : editingValue;
      await updateDoc(doc(db, "olimpiadas_escolas", id), { [field]: val });
      setEscolas(prev => prev.map(e => e.id === id ? Object.assign({}, e, { [field]: val }) : e));
    } catch(err) { console.error(err); }
    setEditingCell(null);
    setSalvando(false);
  };

  const salvarEscola = async () => {
    if (!form.nomeEscola.trim()) { alert("Informe o nome da escola."); return; }
    setSalvando(true);
    try {
      const dados = Object.assign({}, form, { criadoEm: new Date().toISOString(), criadoPor: user && user.email });
      const ref = await addDoc(collection(db, "olimpiadas_escolas"), dados);
      setEscolas(prev => [...prev, Object.assign({ id: ref.id }, dados)]);
      setModal(null);
      setForm({ edicao:2026, nomeEscola:"", crede:"", municipio:"", alunosInscritos:0, professoresResponsaveis:0 });
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const excluirEscola = async (id) => {
    if (!window.confirm("Excluir esta escola?")) return;
    await deleteDoc(doc(db, "olimpiadas_escolas", id));
    setEscolas(prev => prev.filter(e => e.id !== id));
  };

  const inp = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#1B3F7A", outline:"none" };
  const lbl = { display:"block", color:"#888", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4, fontWeight:700 };

  const EditCell = ({ escola, field, type }) => {
    const isEditing = editingCell && editingCell.id === escola.id && editingCell.field === field;
    const val = escola[field] != null ? escola[field] : "";
    if (isEditing) {
      if (field === "municipio") {
        return (
          <select ref={inputRef} value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={saveEdit}
            style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:6, padding:"3px 8px", fontSize:12, width:"100%", outline:"none" }}>
            <option value=""></option>
            {MUNICIPIOS_CE.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        );
      }
      if (field === "crede") {
        return (
          <select ref={inputRef} value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={saveEdit}
            style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:6, padding:"3px 8px", fontSize:12, width:"100%", outline:"none" }}>
            <option value=""></option>
            {CREDES_LIST.map(cr => <option key={cr} value={cr}>{cr}</option>)}
          </select>
        );
      }
      return (
        <input ref={inputRef} type={type||"text"} value={editingValue}
          onChange={e => setEditingValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingCell(null); }}
          style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:6, padding:"3px 8px", fontSize:12, width:"100%", outline:"none" }}/>
      );
    }
    return (
      <div onClick={() => startEdit(escola.id, field, val)}
        style={{ cursor: isOlimpAdm ? "pointer" : "default", minHeight:22, fontSize:12,
          color: val ? "#1B3F7A" : "#ccc",
          borderBottom: isOlimpAdm ? "1px dashed #e8edf2" : "none", padding:"2px 4px" }}>
        {String(val) || "—"}
      </div>
    );
  };

  const selStyle = { background:"#fff", border:"none", borderRadius:10, padding:"7px 14px", fontSize:12, color:"#555", fontWeight:600, cursor:"pointer", boxShadow:"0 2px 8px rgba(27,63,122,0.08)", outline:"none" };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>

      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 28px" }}>
        <div style={{ maxWidth:1300, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div onClick={onBack} style={{ width:40,height:40,background:"rgba(255,255,255,0.15)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.6)", fontSize:10, letterSpacing:3, textTransform:"uppercase" }}>IPC</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>🏆 Olímpiadas</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <div onClick={onDashboard} style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>📊 Dashboard</div>
              {isOlimpAdm && (
                <div onClick={() => setModal("form")} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Nova Escola</div>
              )}
              {isAdmin && escolas.length === 0 && onSeed && (
                <div onClick={onSeed} style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>🗄️ Seed</div>
              )}
            </div>
          </div>

          <div style={{ display:"flex", gap:16, marginTop:20, flexWrap:"wrap" }}>
            {[
              { label:"Escolas", value:fmtNum(escolasFiltradas.length) },
              { label:"Alunos Inscritos", value:fmtNum(totalAlunos) },
              { label:"Professores", value:fmtNum(totalProfs) },
              { label:"Municípios", value:fmtNum(totalMunicipios) },
              { label:"CREDEs", value:totalCredes > 0 ? totalCredes+"/24" : "—" },
            ].map((k,i) => (
              <div key={i} style={{ background:"rgba(255,255,255,0.12)", borderRadius:14, padding:"12px 20px", textAlign:"center", minWidth:110 }}>
                <div style={{ fontWeight:900, fontSize:22, color:"#fff" }}>{k.value}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", marginTop:2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"20px 32px 0" }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:16 }}>
          <div style={{ display:"flex", gap:4 }}>
            {[2024,2025,2026].map(ed => (
              <div key={ed} onClick={() => setFiltroEdicao(ed)}
                style={{ background:filtroEdicao===ed?"#1B3F7A":"#fff", color:filtroEdicao===ed?"#fff":"#555", borderRadius:10, padding:"7px 16px", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>{ed}</div>
            ))}
          </div>
          <select value={filtroCrede} onChange={e => setFiltroCrede(e.target.value)} style={selStyle}>
            <option value="todas">Todas as CREDEs</option>
            {CREDES_LIST.map(cr => <option key={cr} value={cr}>{cr}</option>)}
          </select>
          <select value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)} style={selStyle}>
            <option value="todos">Todos os municípios</option>
            {MUNICIPIOS_CE.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍 Buscar escola..."
            style={{ background:"#fff", border:"none", borderRadius:10, padding:"7px 14px", fontSize:13, color:"#555", fontWeight:600, boxShadow:"0 2px 8px rgba(27,63,122,0.08)", outline:"none", minWidth:220 }}/>
          <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
            {[{v:"planilha",l:"📋 Planilha"},{v:"formulario",l:"📝 Formulário"}].map(m => (
              <div key={m.v} onClick={() => setModoView(m.v)}
                style={{ background:modoView===m.v?"#1B3F7A":"#fff", color:modoView===m.v?"#fff":"#555", borderRadius:10, padding:"7px 16px", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>{m.l}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"0 32px 80px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando...</div>
        ) : modoView === "planilha" ? (
          <div style={{ background:"#fff", borderRadius:18, boxShadow:"0 2px 16px rgba(27,63,122,0.08)", overflow:"hidden" }}>
            {isOlimpAdm && <div style={{ background:"#fffbeb", padding:"8px 20px", fontSize:11, color:"#92400e", fontWeight:600 }}>✏️ Clique em qualquer célula para editar diretamente</div>}
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#1B3F7A" }}>
                    {["Nome da Escola","CREDE","Município","Alunos","Professores","Edição"].concat(isOlimpAdm?[""]:[]).map((h,i) => (
                      <th key={i} style={{ padding:"12px 14px", textAlign:"left", color:"#fff", fontWeight:800, fontSize:11, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {escolasFiltradas.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign:"center", padding:40, color:"#aaa" }}>Nenhuma escola encontrada</td></tr>
                  ) : escolasFiltradas.map((e,i) => (
                    <tr key={e.id} style={{ borderBottom:"1px solid #f0f0f0", background:i%2===0?"#fff":"#f8f9fb" }}>
                      <td style={{ padding:"8px 14px", minWidth:280 }}><EditCell escola={e} field="nomeEscola"/></td>
                      <td style={{ padding:"8px 14px", minWidth:120 }}><EditCell escola={e} field="crede"/></td>
                      <td style={{ padding:"8px 14px", minWidth:160 }}><EditCell escola={e} field="municipio"/></td>
                      <td style={{ padding:"8px 14px", textAlign:"right", minWidth:80 }}><EditCell escola={e} field="alunosInscritos" type="number"/></td>
                      <td style={{ padding:"8px 14px", textAlign:"right", minWidth:80 }}><EditCell escola={e} field="professoresResponsaveis" type="number"/></td>
                      <td style={{ padding:"8px 14px", textAlign:"center" }}>
                        <span style={{ background:"#f0f4ff", borderRadius:8, padding:"2px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>{e.edicao}</span>
                      </td>
                      {isOlimpAdm && (
                        <td style={{ padding:"8px 14px", textAlign:"center" }}>
                          <div onClick={() => excluirEscola(e.id)} style={{ cursor:"pointer", color:"#dc2626", fontSize:14 }}>🗑️</div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:"#1B3F7A" }}>
                    <td style={{ padding:"10px 14px", fontWeight:900, color:"#fff", fontSize:12 }}>TOTAL — {escolasFiltradas.length} escolas</td>
                    <td/><td/>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:900, color:"#fff", fontSize:13 }}>{fmtNum(totalAlunos)}</td>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:900, color:"#fff", fontSize:13 }}>{fmtNum(totalProfs)}</td>
                    <td/>{isOlimpAdm && <td/>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14 }}>
            {escolasFiltradas.length === 0 ? (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:60, color:"#aaa" }}>Nenhuma escola encontrada</div>
            ) : escolasFiltradas.map(e => (
              <div key={e.id} style={{ background:"#fff", borderRadius:18, padding:"18px 20px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:"#1B3F7A", flex:1 }}>{e.nomeEscola}</div>
                  <span style={{ background:"#f0f4ff", borderRadius:8, padding:"2px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A", flexShrink:0, marginLeft:8 }}>{e.edicao}</span>
                </div>
                <div style={{ display:"flex", gap:16, fontSize:12, color:"#888", marginBottom:8, flexWrap:"wrap" }}>
                  {e.crede && <span>📍 {e.crede}</span>}
                  {e.municipio && <span>🏙️ {e.municipio}</span>}
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  <div style={{ textAlign:"center", background:"#f0f9ff", borderRadius:10, padding:"8px 16px", flex:1 }}>
                    <div style={{ fontWeight:900, fontSize:20, color:"#0891b2" }}>{e.alunosInscritos||0}</div>
                    <div style={{ fontSize:10, color:"#888" }}>Alunos</div>
                  </div>
                  <div style={{ textAlign:"center", background:"#f0fdf4", borderRadius:10, padding:"8px 16px", flex:1 }}>
                    <div style={{ fontWeight:900, fontSize:20, color:"#059669" }}>{e.professoresResponsaveis||0}</div>
                    <div style={{ fontSize:10, color:"#888" }}>Professores</div>
                  </div>
                </div>
                {isOlimpAdm && (
                  <div onClick={() => excluirEscola(e.id)} style={{ marginTop:10, textAlign:"right", fontSize:11, color:"#dc2626", cursor:"pointer" }}>🗑️ Remover</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:520, padding:32 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:900, fontSize:18, color:"#1B3F7A", marginBottom:20 }}>➕ Nova Escola</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={lbl}>Edição *</label>
                <select value={form.edicao} onChange={e => setForm(Object.assign({}, form, {edicao:parseInt(e.target.value)}))} style={inp}>
                  {[2024,2025,2026].map(ed => <option key={ed} value={ed}>{ed}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Nome da Escola *</label>
                <input value={form.nomeEscola} onChange={e => setForm(Object.assign({}, form, {nomeEscola:e.target.value}))} placeholder="Ex: EEMTI Nome da Escola" style={inp}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>CREDE</label>
                  <select value={form.crede} onChange={e => setForm(Object.assign({}, form, {crede:e.target.value}))} style={inp}>
                    <option value=""></option>
                    {CREDES_LIST.map(cr => <option key={cr} value={cr}>{cr}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Município</label>
                  <select value={form.municipio} onChange={e => setForm(Object.assign({}, form, {municipio:e.target.value}))} style={inp}>
                    <option value=""></option>
                    {MUNICIPIOS_CE.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={lbl}>Alunos Inscritos</label>
                  <input type="number" min="0" value={form.alunosInscritos} onChange={e => setForm(Object.assign({}, form, {alunosInscritos:parseInt(e.target.value)||0}))} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Professores</label>
                  <input type="number" min="0" value={form.professoresResponsaveis} onChange={e => setForm(Object.assign({}, form, {professoresResponsaveis:parseInt(e.target.value)||0}))} style={inp}/>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <div onClick={() => setModal(null)} style={{ flex:1, background:"#f0f4ff", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
              <div onClick={salvarEscola} style={{ flex:2, background:salvando?"#ccc":"#1B3F7A", borderRadius:14, padding:14, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:salvando?"not-allowed":"pointer" }}>{salvando?"Salvando...":"✅ Salvar Escola"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
