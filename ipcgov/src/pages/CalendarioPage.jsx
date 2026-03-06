import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const FERIADOS_NACIONAIS_2026 = [
  { nome:"Confraternização Universal", data:"2026-01-01", tipo:"feriado_nacional" },
  { nome:"Carnaval", data:"2026-02-16", tipo:"feriado_nacional" },
  { nome:"Carnaval", data:"2026-02-17", tipo:"feriado_nacional" },
  { nome:"Quarta-Feira de Cinzas (ponto facultativo)", data:"2026-02-18", tipo:"feriado_nacional" },
  { nome:"Sexta-Feira Santa", data:"2026-04-03", tipo:"feriado_nacional" },
  { nome:"Tiradentes", data:"2026-04-21", tipo:"feriado_nacional" },
  { nome:"Dia do Trabalho", data:"2026-05-01", tipo:"feriado_nacional" },
  { nome:"Corpus Christi", data:"2026-06-04", tipo:"feriado_nacional" },
  { nome:"Independência do Brasil", data:"2026-09-07", tipo:"feriado_nacional" },
  { nome:"Nossa Sra. Aparecida", data:"2026-10-12", tipo:"feriado_nacional" },
  { nome:"Finados", data:"2026-11-02", tipo:"feriado_nacional" },
  { nome:"Proclamação da República", data:"2026-11-15", tipo:"feriado_nacional" },
  { nome:"Natal", data:"2026-12-25", tipo:"feriado_nacional" },
];

const FERIADOS_ESTADUAIS_2026 = [
  { nome:"Aniversário de Fortaleza", data:"2026-04-13", tipo:"feriado_estadual" },
  { nome:"Abolição da Escravidão no Ceará", data:"2026-03-25", tipo:"feriado_estadual" },
  { nome:"São João", data:"2026-06-24", tipo:"feriado_estadual" },
  { nome:"Nossa Sra. da Assunção (padroeira do Ceará)", data:"2026-08-15", tipo:"feriado_estadual" },
  { nome:"Aniversário do Ceará", data:"2026-03-17", tipo:"feriado_estadual" },
];

const COR_TIPO = {
  aniversario:     { bg:"#fff7ed", border:"#E8730A", dot:"#E8730A",  icon:"🎂", label:"Aniversário" },
  tceduc:          { bg:"#eff6ff", border:"#1B3F7A", dot:"#1B3F7A",  icon:"🎓", label:"TCEduc" },
  feriado_nacional:{ bg:"#f0fdf4", border:"#059669", dot:"#059669",  icon:"🏛️", label:"Feriado Nacional" },
  feriado_estadual:{ bg:"#fdf4ff", border:"#7c3aed", dot:"#7c3aed",  icon:"🌵", label:"Feriado Estadual" },
  outro:           { bg:"#fff0f0", border:"#dc2626", dot:"#dc2626",  icon:"📌", label:"Outro" },
};

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateBR(dateStr) {
  if (!dateStr) return "—";
  const [y,m,d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function CalendarioPage({ onBack, user }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth());
  const [filtros, setFiltros] = useState({ aniversario:true, tceduc:true, feriado_nacional:true, feriado_estadual:true, outro:true });
  const [eventos, setEventos] = useState([]);      // tceduc_eventos
  const [servidores, setServidores] = useState([]); // ipc_servidores
  const [feriadosDB, setFeriadosDB] = useState([]); // ipc_datas_comemorativas
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [enviando, setEnviando] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [evSnap, srvSnap, ferSnap] = await Promise.all([
        getDocs(collection(db, "tceduc_eventos")),
        getDocs(collection(db, "ipc_servidores")),
        getDocs(collection(db, "ipc_datas_comemorativas")),
      ]);
      setEventos(evSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setServidores(srvSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setFeriadosDB(ferSnap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e) { console.error(e); }
  };

  const toggleFiltro = (tipo) => setFiltros(f => ({ ...f, [tipo]: !f[tipo] }));

  // Monta todos os itens do calendário
  const todosItens = [
    // Aniversários — normaliza para o ano atual
    ...servidores.filter(s => s.dataAniversario).map(s => {
      const [,m,d] = s.dataAniversario.split("-");
      return { id:`aniv-${s.id}`, tipo:"aniversario", nome:`🎂 ${s.nome}`, data:`${ano}-${m}-${d}`, original:s };
    }),
    // TCEduc
    ...eventos.map(e => ({ id:`ev-${e.id}`, tipo:"tceduc", nome:`🎓 ${e.municipio||e.regiao||"Evento"}`, data:e.data, status:e.status, original:e })),
    // Feriados nacionais pré-definidos + editáveis
    ...FERIADOS_NACIONAIS_2026.map(f => ({ ...f, id:`fn-${f.data}`, editavel:false })),
    // Feriados estaduais pré-definidos + editáveis
    ...FERIADOS_ESTADUAIS_2026.map(f => ({ ...f, id:`fe-${f.data}`, editavel:false })),
    // Do Firebase (editáveis/excluíveis)
    ...feriadosDB,
  ];

  const itensFiltrados = todosItens.filter(i => filtros[i.tipo]);

  // Itens do mês atual
  const itensMes = itensFiltrados.filter(i => {
    if (!i.data) return false;
    const [y,m] = i.data.split("-");
    return parseInt(y) === ano && parseInt(m) - 1 === mes;
  });

  // Itens por dia
  const itensPorDia = {};
  itensMes.forEach(i => {
    const dia = parseInt(i.data.split("-")[2]);
    if (!itensPorDia[dia]) itensPorDia[dia] = [];
    itensPorDia[dia].push(i);
  });

  // Grade do calendário
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const navMes = (dir) => {
    if (dir === -1 && mes === 0) { setMes(11); setAno(a => a-1); }
    else if (dir === 1 && mes === 11) { setMes(0); setAno(a => a+1); }
    else setMes(m => m + dir);
  };

  const salvarData = async () => {
    if (!form.nome || !form.data) return;
    setSalvando(true);
    try {
      const dados = { nome:form.nome, data:form.data, tipo:form.tipo||"outro", descricao:form.descricao||"", criadoEm:new Date().toISOString() };
      if (selected?.id && !selected.id.startsWith("fn-") && !selected.id.startsWith("fe-")) {
        await updateDoc(doc(db,"ipc_datas_comemorativas",selected.id), dados);
        setFeriadosDB(f => f.map(x => x.id===selected.id ? {...x,...dados} : x));
      } else {
        const ref = await addDoc(collection(db,"ipc_datas_comemorativas"), dados);
        setFeriadosDB(f => [...f, {id:ref.id,...dados}]);
      }
      setModal(null); setForm({}); setSelected(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const excluirData = async (id) => {
    if (!window.confirm("Excluir esta data?")) return;
    await deleteDoc(doc(db,"ipc_datas_comemorativas",id));
    setFeriadosDB(f => f.filter(x => x.id !== id));
    setModal(null); setSelected(null);
  };

  const solicitarArte = async (item) => {
    setEnviando(item.id);
    try {
      const prazo = addDays(item.data, -2);
      await addDoc(collection(db,"designer_atividades"), {
        titulo: `Arte — ${item.nome.replace(/^[^\w\s]/,"").trim()}`,
        descricao: `Solicitação de arte para: ${item.nome.replace(/^[^\w\s]/,"").trim()}\nData comemorativa: ${formatDateBR(item.data)}`,
        status: "Aguardando",
        prioridade: "Alta",
        prazo,
        designer: "",
        solicitanteId: user?.uid || "",
        solicitante: user?.email || "sistema",
        origem: "calendario",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        ocorrencias: [],
      });
      alert(`✅ Solicitação enviada ao IPC Designer!\nPrazo: ${formatDateBR(prazo)}`);
    } catch(e) { console.error(e); alert("Erro ao enviar solicitação."); }
    setEnviando(null);
  };

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split("T")[0];

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} select,input,textarea{font-family:'Montserrat',sans-serif} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 32px 40px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPCGOV</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📅 Calendário</div>
            </div>
            <div onClick={()=>{ setForm({ tipo:"outro", data:`${ano}-${String(mes+1).padStart(2,"0")}-01` }); setSelected(null); setModal("form"); }} style={{ marginLeft:"auto", background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Nova Data</div>
          </div>

          {/* FILTROS */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {Object.entries(COR_TIPO).map(([tipo, cfg]) => (
              <div key={tipo} onClick={()=>toggleFiltro(tipo)} style={{ display:"flex", alignItems:"center", gap:6, background:filtros[tipo]?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.08)", border:`1px solid ${filtros[tipo]?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.1)"}`, borderRadius:10, padding:"6px 14px", cursor:"pointer", transition:"all 0.15s" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:filtros[tipo]?cfg.dot:"rgba(255,255,255,0.3)" }}/>
                <span style={{ color:"#fff", fontSize:12, fontWeight:filtros[tipo]?700:500, opacity:filtros[tipo]?1:0.5 }}>{cfg.icon} {cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 32px 60px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:24 }}>

          {/* CALENDÁRIO */}
          <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(27,63,122,0.08)" }}>
            {/* Nav mês */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div onClick={()=>navMes(-1)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>‹</div>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{MESES[mes]} {ano}</div>
              <div onClick={()=>navMes(1)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>›</div>
            </div>

            {/* Dias da semana */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:8 }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#aaa", padding:"6px 0" }}>{d}</div>
              ))}
            </div>

            {/* Grade */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
              {Array(primeiroDia).fill(null).map((_,i) => <div key={`e${i}`}/>)}
              {Array(diasNoMes).fill(null).map((_,i) => {
                const dia = i + 1;
                const dataStr = `${ano}-${String(mes+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
                const itens = itensPorDia[dia] || [];
                const isHoje = dataStr === hojeStr;
                const isSel = diaSelecionado === dia;
                return (
                  <div key={dia} onClick={()=>setDiaSelecionado(isSel ? null : dia)} style={{ minHeight:72, background:isSel?"#f0f4ff":isHoje?"#eff6ff":"#fafbff", borderRadius:12, padding:"6px 8px", cursor:"pointer", border:`2px solid ${isSel?"#1B3F7A":isHoje?"#1B3F7A44":"transparent"}`, transition:"all 0.15s", position:"relative" }}>
                    <div style={{ fontWeight:isHoje?900:600, fontSize:13, color:isHoje?"#1B3F7A":"#333", marginBottom:4 }}>{dia}</div>
                    {itens.slice(0,3).map((item,idx) => (
                      <div key={idx} style={{ background:COR_TIPO[item.tipo]?.dot+"22"||"#eee", borderLeft:`3px solid ${COR_TIPO[item.tipo]?.dot||"#aaa"}`, borderRadius:4, padding:"2px 5px", fontSize:10, fontWeight:600, color:COR_TIPO[item.tipo]?.dot||"#333", marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {item.nome.replace(/^[\u{1F300}-\u{1FFFF}]\s*/u, "")}
                      </div>
                    ))}
                    {itens.length > 3 && <div style={{ fontSize:10, color:"#aaa", fontWeight:700 }}>+{itens.length-3} mais</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAINEL LATERAL */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Detalhe do dia selecionado */}
            {diaSelecionado && (() => {
              const itens = itensPorDia[diaSelecionado] || [];
              const dataStr = `${ano}-${String(mes+1).padStart(2,"0")}-${String(diaSelecionado).padStart(2,"0")}`;
              return (
                <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 4px 20px rgba(27,63,122,0.08)" }}>
                  <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>
                    📅 {String(diaSelecionado).padStart(2,"0")} de {MESES[mes]}
                    <span style={{ fontSize:11, color:"#aaa", fontWeight:500, marginLeft:8 }}>{itens.length} evento{itens.length!==1?"s":""}</span>
                  </div>
                  {itens.length === 0 && <div style={{ color:"#aaa", fontSize:13 }}>Nenhum evento neste dia.</div>}
                  {itens.map((item,i) => {
                    const cfg = COR_TIPO[item.tipo];
                    const podeArte = ["feriado_nacional","feriado_estadual","outro"].includes(item.tipo);
                    const podeExcluir = feriadosDB.some(x=>x.id===item.id);
                    const podeEditar = feriadosDB.some(x=>x.id===item.id);
                    return (
                      <div key={i} style={{ background:cfg.bg, border:`1px solid ${cfg.border}33`, borderRadius:14, padding:"12px 14px", marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:3 }}>{item.nome}</div>
                            {item.status && <div style={{ fontSize:11, color:"#888" }}>Status: {item.status}</div>}
                            {item.descricao && <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{item.descricao}</div>}
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
                              <div style={{ width:8, height:8, borderRadius:"50%", background:cfg.dot }}/>
                              <span style={{ fontSize:10, color:cfg.dot, fontWeight:700 }}>{cfg.label}</span>
                            </div>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            {podeArte && (
                              <div onClick={()=>solicitarArte(item)} style={{ background:"#1B3F7A", borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, color:"#fff", cursor:enviando===item.id?"not-allowed":"pointer", opacity:enviando===item.id?0.6:1, whiteSpace:"nowrap" }}>
                                {enviando===item.id?"...":"🎨 Solicitar Arte"}
                              </div>
                            )}
                            {podeEditar && (
                              <div onClick={()=>{ setForm({...item}); setSelected(item); setModal("form"); }} style={{ background:"#f0f4ff", borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>✏️ Editar</div>
                            )}
                            {podeExcluir && (
                              <div onClick={()=>excluirData(item.id)} style={{ background:"#fee2e2", borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>🗑️</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Próximos eventos */}
            <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 4px 20px rgba(27,63,122,0.08)" }}>
              <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>🗓️ Próximos 30 dias</div>
              {(() => {
                const hoje = new Date(); hoje.setHours(0,0,0,0);
                const limite = new Date(); limite.setDate(limite.getDate()+30);
                const proximos = itensFiltrados.filter(i => {
                  if (!i.data) return false;
                  const d = new Date(i.data + "T00:00:00");
                  return d >= hoje && d <= limite;
                }).sort((a,b) => a.data.localeCompare(b.data)).slice(0,8);
                if (proximos.length === 0) return <div style={{ color:"#aaa", fontSize:13 }}>Nenhum evento nos próximos 30 dias.</div>;
                return proximos.map((item,i) => {
                  const cfg = COR_TIPO[item.tipo];
                  const dias = Math.ceil((new Date(item.data+"T00:00:00") - hoje) / 86400000);
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:i<proximos.length-1?"1px solid #f0f4ff":"none" }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cfg.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>{item.nome.replace(/^[\u{1F300}-\u{1FFFF}]\s*/u,"")}</div>
                        <div style={{ fontSize:11, color:"#888" }}>{formatDateBR(item.data)}</div>
                      </div>
                      <div style={{ background:cfg.dot+"18", borderRadius:8, padding:"3px 8px", fontSize:11, fontWeight:700, color:cfg.dot, flexShrink:0 }}>
                        {dias===0?"Hoje":dias===1?"Amanhã":`${dias}d`}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL FORM DATA */}
      {modal==="form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar Data":"📌 Nova Data Comemorativa"}</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Aniversário do IPC, Dia do Servidor..." style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Data *</label>
                <input type="date" value={form.data||""} onChange={e=>setForm(f=>({...f,data:e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo||"outro"} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inputStyle}>
                  <option value="feriado_nacional">🏛️ Feriado Nacional</option>
                  <option value="feriado_estadual">🌵 Feriado Estadual (Ceará)</option>
                  <option value="outro">📌 Outro</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea value={form.descricao||""} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Informações adicionais..." style={{ ...inputStyle, minHeight:80, resize:"vertical" }}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={salvarData} disabled={salvando||!form.nome||!form.data} style={{ flex:1, background:salvando||!form.nome||!form.data?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:salvando||!form.nome||!form.data?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                {salvando?"Salvando...":"💾 Salvar"}
              </button>
              {form.data && form.nome && (
                <button onClick={()=>{ if(form.nome&&form.data) solicitarArte({...form, id:"temp"}); }} style={{ background:"#1B3F7A18", border:"1px solid #1B3F7A33", borderRadius:14, padding:"14px 16px", color:"#1B3F7A", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif", whiteSpace:"nowrap" }}>
                  🎨 Salvar e Solicitar Arte
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
