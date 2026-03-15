import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// Feriados pré-definidos — agora todos editáveis/excluíveis via Firebase
const FERIADOS_PADRAO = [
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
  { nome:"Aniversário de Fortaleza", data:"2026-04-13", tipo:"feriado_estadual" },
  { nome:"Abolição da Escravidão no Ceará", data:"2026-03-25", tipo:"feriado_estadual" },
  { nome:"São João", data:"2026-06-24", tipo:"feriado_estadual" },
  { nome:"Nossa Sra. da Assunção (padroeira do Ceará)", data:"2026-08-15", tipo:"feriado_estadual" },
  { nome:"Aniversário do Ceará", data:"2026-03-17", tipo:"feriado_estadual" },
];

const COR_TIPO = {
  aniversario:      { bg:"#fff7ed", border:"#E8730A", dot:"#E8730A", icon:"🎂", label:"Aniversário" },
  tceduc:           { bg:"#eff6ff", border:"#1B3F7A", dot:"#1B3F7A", icon:"🎓", label:"TCEduc" },
  feriado_nacional: { bg:"#f0fdf4", border:"#059669", dot:"#059669", icon:"🏛️", label:"Feriado Nacional" },
  feriado_estadual: { bg:"#fdf4ff", border:"#7c3aed", dot:"#7c3aed", icon:"🌵", label:"Feriado Estadual" },
  outro:            { bg:"#fff0f0", border:"#dc2626", dot:"#dc2626", icon:"📌", label:"Outro" },
  ferias:           { bg:"#ecfdf5", border:"#059669", dot:"#059669", icon:"🏖️", label:"Férias" },
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
function getInicioSemana(ano, mes, dia) {
  const d = new Date(ano, mes, dia);
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return d;
}

export default function CalendarioPage({ onBack, user }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth());
  const [semanaRef, setSemanaRef] = useState(new Date()); // início da semana
  const [visualizacao, setVisualizacao] = useState("mes"); // "mes" | "semana"
  const [filtros, setFiltros] = useState({ aniversario:true, tceduc:true, feriado_nacional:true, feriado_estadual:true, outro:true, ferias:true });
  const [eventos, setEventos] = useState([]);
  const [servidores, setServidores] = useState([]);
  const [feriadosDB, setFeriadosDB] = useState([]);
  const [inicializado, setInicializado] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [enviando, setEnviando] = useState(null);
  const [feriasList, setFeriasList] = useState([]);

  useEffect(() => { loadAll(); }, []);

  // Inicializa feriados padrão no Firebase se ainda não existem
  const loadAll = async () => {
    try {
      const [evSnap, srvSnap, ferSnap, feriasSnap] = await Promise.all([
        getDocs(collection(db, "tceduc_eventos")),
        getDocs(collection(db, "ipc_servidores")),
        getDocs(collection(db, "ipc_datas_comemorativas")),
        getDocs(collection(db, "ipc_ferias_servidores")),
      ]);
      setEventos(evSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setServidores(srvSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      setFeriasList(feriasSnap.docs.map(d => ({ id:d.id, ...d.data() })));
      let fer = ferSnap.docs.map(d => ({ id:d.id, ...d.data() }));

      // Se não há feriados ainda, inicializa com os padrões
      if (fer.length === 0) {
        const refs = await Promise.all(
          FERIADOS_PADRAO.map(f => addDoc(collection(db,"ipc_datas_comemorativas"), { ...f, criadoEm: new Date().toISOString(), padrao: true }))
        );
        fer = FERIADOS_PADRAO.map((f,i) => ({ ...f, id:refs[i].id, padrao:true }));
      }
      setFeriadosDB(fer);
      setInicializado(true);
    } catch(e) { console.error(e); setInicializado(true); }
  };

  const toggleFiltro = (tipo) => setFiltros(f => ({ ...f, [tipo]: !f[tipo] }));

  // Todos os itens
  const todosItens = [
    ...servidores.filter(s => s.dataAniversario).map(s => {
      const [,m,d] = s.dataAniversario.split("-");
      return { id:`aniv-${s.id}`, tipo:"aniversario", nome:`${s.nome}`, data:`${ano}-${m}-${d}`, original:s };
    }),
    ...eventos.map(e => ({ id:`ev-${e.id}`, tipo:"tceduc", nome:`${e.municipio||e.regiao||"Evento TCEduc"}`, data:e.data, status:e.status, original:e })),
    ...feriadosDB,
    // Férias: gera um item por dia do período
    ...feriasList.flatMap(f => {
      if (!f.inicio || !f.fim) return [];
      const items = [];
      const start = new Date(f.inicio+"T12:00:00");
      const end   = new Date(f.fim+"T12:00:00");
      for (let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) {
        const ds = d.toISOString().split("T")[0];
        const [fy] = ds.split("-");
        if (parseInt(fy) === ano) {
          items.push({ id:`ferias-${f.id}-${ds}`, tipo:"ferias", nome:`🏖️ ${f.servidorNome}`, data:ds, original:f });
        }
      }
      return items;
    }),
  ];

  const itensFiltrados = todosItens.filter(i => filtros[i.tipo]);

  // --- LÓGICA MÊS ---
  const itensMes = itensFiltrados.filter(i => {
    if (!i.data) return false;
    const [y,m] = i.data.split("-");
    return parseInt(y) === ano && parseInt(m) - 1 === mes;
  });
  const itensPorDia = {};
  itensMes.forEach(i => {
    const dia = parseInt(i.data.split("-")[2]);
    if (!itensPorDia[dia]) itensPorDia[dia] = [];
    itensPorDia[dia].push(i);
  });
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  // --- LÓGICA SEMANA ---
  const inicioSemana = (() => {
    const d = new Date(semanaRef);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0,0,0,0);
    return d;
  })();
  const diasSemana = Array(7).fill(null).map((_,i) => {
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate() + i);
    return d;
  });
  const itensPorDiaSemana = diasSemana.map(d => {
    const ds = d.toISOString().split("T")[0];
    return itensFiltrados.filter(i => i.data === ds);
  });

  const navMes = (dir) => {
    if (dir === -1 && mes === 0) { setMes(11); setAno(a => a-1); }
    else if (dir === 1 && mes === 11) { setMes(0); setAno(a => a+1); }
    else setMes(m => m + dir);
    setDiaSelecionado(null);
  };
  const navSemana = (dir) => {
    const d = new Date(semanaRef);
    d.setDate(d.getDate() + dir * 7);
    setSemanaRef(d);
    setDiaSelecionado(null);
  };

  // Salvar data (criar ou editar — todos salvam no Firebase)
  const salvarData = async () => {
    if (!form.nome || !form.data) return;
    setSalvando(true);
    try {
      const dados = { nome:form.nome, data:form.data, tipo:form.tipo||"outro", descricao:form.descricao||"", atualizadoEm:new Date().toISOString() };
      if (selected?.id) {
        await updateDoc(doc(db,"ipc_datas_comemorativas",selected.id), dados);
        setFeriadosDB(f => f.map(x => x.id===selected.id ? {...x,...dados} : x));
      } else {
        dados.criadoEm = new Date().toISOString();
        const ref = await addDoc(collection(db,"ipc_datas_comemorativas"), dados);
        setFeriadosDB(f => [...f, {id:ref.id,...dados}]);
      }
      setModal(null); setForm({}); setSelected(null);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const excluirData = async (id) => {
    if (!window.confirm("Excluir esta data do calendário?")) return;
    await deleteDoc(doc(db,"ipc_datas_comemorativas",id));
    setFeriadosDB(f => f.filter(x => x.id !== id));
    setDiaSelecionado(null);
  };

  const solicitarArte = async (item) => {
    setEnviando(item.id||"temp");
    try {
      const prazo = addDays(item.data, -2);
      await addDoc(collection(db,"designer_atividades"), {
        titulo: `Arte — ${item.nome}`,
        descricao: `Solicitação de arte para: ${item.nome}\nData: ${formatDateBR(item.data)}`,
        status: "Aguardando", prioridade: "Alta", prazo,
        designer: "", solicitanteId: user?.uid||"", solicitante: user?.email||"sistema",
        origem: "calendario", criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(), ocorrencias: [],
      });
      alert(`✅ Arte solicitada ao IPC Designer!\nPrazo: ${formatDateBR(prazo)}`);
    } catch(e) { alert("Erro ao enviar solicitação."); }
    setEnviando(null);
  };

  // GERAR RELATÓRIO PDF (browser print)
  const gerarPDF = () => {
    const filtrosAtivos = Object.entries(filtros).filter(([,v])=>v).map(([k])=>COR_TIPO[k]?.label).join(", ");
    let titulo = "";
    let itensRelatorio = [];

    if (visualizacao === "mes") {
      titulo = `Calendário — ${MESES[mes]} ${ano}`;
      itensRelatorio = itensMes.sort((a,b) => a.data.localeCompare(b.data));
    } else {
      const ini = diasSemana[0];
      const fim = diasSemana[6];
      titulo = `Calendário — Semana ${formatDateBR(ini.toISOString().split("T")[0])} a ${formatDateBR(fim.toISOString().split("T")[0])}`;
      itensRelatorio = itensPorDiaSemana.flat().sort((a,b)=>a.data.localeCompare(b.data));
    }

    const linhas = itensRelatorio.map(i => {
      const cfg = COR_TIPO[i.tipo];
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#333;">${formatDateBR(i.data)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${cfg?.icon||""} ${i.nome}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;">
            <span style="background:${cfg?.dot||"#aaa"}18;color:${cfg?.dot||"#aaa"};border-radius:6px;padding:2px 8px;font-weight:700;">${cfg?.label||i.tipo}</span>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;color:#888;">${i.status||i.descricao||""}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${titulo}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm 15mm 15mm 15mm; }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family: Arial, sans-serif; color: #1B3F7A; }
    .header { background: linear-gradient(135deg,#1B3F7A,#2a5ba8); color:#fff; padding:20px 24px; border-radius:10px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; }
    .header h1 { font-size:20px; font-weight:900; }
    .header .sub { font-size:11px; opacity:0.7; margin-top:4px; }
    .header .meta { text-align:right; font-size:11px; opacity:0.8; }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:#1B3F7A; }
    thead th { padding:10px 12px; color:#fff; font-size:11px; text-align:left; font-weight:700; letter-spacing:1px; text-transform:uppercase; }
    tbody tr:nth-child(even) { background:#f8f9fb; }
    .footer { margin-top:16px; font-size:10px; color:#aaa; text-align:center; }
    .empty { text-align:center; padding:40px; color:#aaa; font-size:14px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="sub">INSTITUTO PLÁCIDO CASTELO — IPCgov</div>
      <h1>📅 ${titulo}</h1>
      <div class="sub">Filtros: ${filtrosAtivos}</div>
    </div>
    <div class="meta">
      Gerado em: ${new Date().toLocaleString("pt-BR")}<br/>
      Total de eventos: ${itensRelatorio.length}
    </div>
  </div>
  ${itensRelatorio.length === 0
    ? `<div class="empty">Nenhum evento encontrado para os filtros selecionados.</div>`
    : `<table>
        <thead><tr>
          <th style="width:110px">Data</th>
          <th>Evento / Nome</th>
          <th style="width:150px">Tipo</th>
          <th>Observação</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>`}
  <div class="footer">IPCgov — Calendário Institucional · Impresso em ${new Date().toLocaleDateString("pt-BR")}</div>
</body>
</html>`;

    const win = window.open("","_blank","width=1100,height=700");
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split("T")[0];

  // Itens do dia selecionado (funciona para mês e semana)
  const itensDiaSelecionado = diaSelecionado
    ? itensFiltrados.filter(i => i.data === diaSelecionado)
    : [];

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        select,input,textarea{font-family:'Montserrat',sans-serif}
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}
      `}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 32px 40px" }}>
        <div style={{ maxWidth:1300, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, flexWrap:"wrap" }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPCGOV</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📅 Calendário</div>
            </div>

            {/* Toggle Mês / Semana */}
            <div style={{ display:"flex", background:"rgba(255,255,255,0.1)", borderRadius:12, padding:4, gap:2 }}>
              {["mes","semana"].map(v => (
                <div key={v} onClick={()=>{ setVisualizacao(v); setDiaSelecionado(null); }} style={{ borderRadius:9, padding:"7px 18px", fontSize:12, fontWeight:700, cursor:"pointer", color:"#fff", background:visualizacao===v?"rgba(255,255,255,0.25)":"transparent", transition:"all 0.15s" }}>
                  {v==="mes"?"📅 Mês":"📆 Semana"}
                </div>
              ))}
            </div>

            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              <div onClick={gerarPDF} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:12, padding:"8px 16px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>🖨️ Imprimir PDF</div>
              <div onClick={()=>{ setForm({ tipo:"outro", data:hojeStr }); setSelected(null); setModal("form"); }} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Nova Data</div>
            </div>
          </div>

          {/* FILTROS */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {Object.entries(COR_TIPO).map(([tipo, cfg]) => (
              <div key={tipo} onClick={()=>toggleFiltro(tipo)} style={{ display:"flex", alignItems:"center", gap:6, background:filtros[tipo]?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.07)", border:`1px solid ${filtros[tipo]?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.1)"}`, borderRadius:10, padding:"6px 14px", cursor:"pointer", transition:"all 0.15s" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:filtros[tipo]?cfg.dot:"rgba(255,255,255,0.3)" }}/>
                <span style={{ color:"#fff", fontSize:12, fontWeight:filtros[tipo]?700:400, opacity:filtros[tipo]?1:0.5 }}>{cfg.icon} {cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"28px 32px 60px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:24 }}>

          {/* ÁREA PRINCIPAL */}
          <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(27,63,122,0.08)" }}>

            {/* VISUALIZAÇÃO MÊS */}
            {visualizacao === "mes" && (<>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div onClick={()=>navMes(-1)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>‹</div>
                <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{MESES[mes]} {ano}</div>
                <div onClick={()=>navMes(1)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>›</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:8 }}>
                {DIAS_SEMANA.map(d => <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#aaa", padding:"6px 0" }}>{d}</div>)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
                {Array(primeiroDia).fill(null).map((_,i) => <div key={`e${i}`}/>)}
                {Array(diasNoMes).fill(null).map((_,i) => {
                  const dia = i + 1;
                  const ds = `${ano}-${String(mes+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
                  const itens = itensPorDia[dia] || [];
                  const isHoje = ds === hojeStr;
                  const isSel = diaSelecionado === ds;
                  return (
                    <div key={dia} onClick={()=>setDiaSelecionado(isSel?null:ds)} style={{ minHeight:76, background:isSel?"#e8f0ff":isHoje?"#eff6ff":"#fafbff", borderRadius:12, padding:"6px 8px", cursor:"pointer", border:`2px solid ${isSel?"#1B3F7A":isHoje?"#1B3F7A44":"transparent"}`, transition:"all 0.15s" }}>
                      <div style={{ fontWeight:isHoje?900:600, fontSize:13, color:isHoje?"#1B3F7A":"#333", marginBottom:3 }}>{dia}</div>
                      {itens.slice(0,3).map((item,idx) => {
                        const cfg = COR_TIPO[item.tipo];
                        return <div key={idx} style={{ background:cfg?.dot+"22", borderLeft:`3px solid ${cfg?.dot||"#aaa"}`, borderRadius:4, padding:"2px 5px", fontSize:10, fontWeight:600, color:cfg?.dot||"#333", marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.nome}</div>;
                      })}
                      {itens.length > 3 && <div style={{ fontSize:10, color:"#aaa", fontWeight:700 }}>+{itens.length-3}</div>}
                    </div>
                  );
                })}
              </div>
            </>)}

            {/* VISUALIZAÇÃO SEMANA */}
            {visualizacao === "semana" && (<>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div onClick={()=>navSemana(-1)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>‹</div>
                <div style={{ fontWeight:900, fontSize:16, color:"#1B3F7A" }}>
                  {formatDateBR(diasSemana[0].toISOString().split("T")[0])} — {formatDateBR(diasSemana[6].toISOString().split("T")[0])}
                </div>
                <div onClick={()=>navSemana(1)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>›</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
                {diasSemana.map((d,i) => {
                  const ds = d.toISOString().split("T")[0];
                  const itens = itensPorDiaSemana[i];
                  const isHoje = ds === hojeStr;
                  const isSel = diaSelecionado === ds;
                  return (
                    <div key={i} onClick={()=>setDiaSelecionado(isSel?null:ds)} style={{ minHeight:200, background:isSel?"#e8f0ff":isHoje?"#eff6ff":"#fafbff", borderRadius:16, padding:"10px 10px", cursor:"pointer", border:`2px solid ${isSel?"#1B3F7A":isHoje?"#1B3F7A44":"transparent"}` }}>
                      <div style={{ textAlign:"center", marginBottom:8 }}>
                        <div style={{ fontSize:10, color:"#aaa", fontWeight:700 }}>{DIAS_SEMANA[d.getDay()]}</div>
                        <div style={{ fontSize:20, fontWeight:900, color:isHoje?"#1B3F7A":"#333" }}>{d.getDate()}</div>
                        <div style={{ fontSize:10, color:"#aaa" }}>{MESES[d.getMonth()].slice(0,3)}</div>
                      </div>
                      {itens.map((item,idx) => {
                        const cfg = COR_TIPO[item.tipo];
                        return <div key={idx} style={{ background:cfg?.dot+"18", borderLeft:`3px solid ${cfg?.dot||"#aaa"}`, borderRadius:6, padding:"4px 6px", fontSize:10, fontWeight:600, color:cfg?.dot||"#333", marginBottom:4, wordBreak:"break-word", lineHeight:1.3 }}>{cfg?.icon} {item.nome}</div>;
                      })}
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>

          {/* PAINEL LATERAL */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Detalhe do dia */}
            {diaSelecionado && (
              <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 4px 20px rgba(27,63,122,0.08)" }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>
                  📅 {formatDateBR(diaSelecionado)}
                  <span style={{ fontSize:11, color:"#aaa", fontWeight:500, marginLeft:8 }}>{itensDiaSelecionado.length} evento{itensDiaSelecionado.length!==1?"s":""}</span>
                </div>
                {itensDiaSelecionado.length === 0 && <div style={{ color:"#aaa", fontSize:13 }}>Nenhum evento neste dia.</div>}
                {itensDiaSelecionado.map((item,i) => {
                  const cfg = COR_TIPO[item.tipo];
                  const podeArte = ["feriado_nacional","feriado_estadual","outro"].includes(item.tipo);
                  // Todos os feriados (incluindo padrão) estão no Firebase agora — todos editáveis/excluíveis
                  const estaNoFirebase = feriadosDB.some(x=>x.id===item.id);
                  return (
                    <div key={i} style={{ background:cfg.bg, border:`1px solid ${cfg.border}33`, borderRadius:14, padding:"12px 14px", marginBottom:10 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:4 }}>{cfg.icon} {item.nome}</div>
                      {item.status && <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>Status: {item.status}</div>}
                      {item.descricao && <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>{item.descricao}</div>}
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:cfg.dot }}/>
                        <span style={{ fontSize:10, color:cfg.dot, fontWeight:700 }}>{cfg.label}</span>
                      </div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {podeArte && (
                          <div onClick={()=>solicitarArte(item)} style={{ background:"#1B3F7A", borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, color:"#fff", cursor:enviando===item.id?"not-allowed":"pointer", opacity:enviando===item.id?0.6:1 }}>
                            {enviando===item.id?"⏳":"🎨 Solicitar Arte"}
                          </div>
                        )}
                        {estaNoFirebase && (
                          <div onClick={()=>{ setForm({...item}); setSelected(item); setModal("form"); }} style={{ background:"#f0f4ff", borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>✏️ Editar</div>
                        )}
                        {estaNoFirebase && (
                          <div onClick={()=>excluirData(item.id)} style={{ background:"#fee2e2", borderRadius:8, padding:"5px 10px", fontSize:10, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>🗑️ Excluir</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Próximos 30 dias */}
            <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 4px 20px rgba(27,63,122,0.08)" }}>
              <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>🗓️ Próximos 30 dias</div>
              {(() => {
                const h = new Date(); h.setHours(0,0,0,0);
                const limite = new Date(); limite.setDate(limite.getDate()+30);
                const proximos = itensFiltrados.filter(i => {
                  if (!i.data) return false;
                  const d = new Date(i.data+"T00:00:00");
                  return d >= h && d <= limite;
                }).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,10);
                if (proximos.length === 0) return <div style={{ color:"#aaa", fontSize:13 }}>Nenhum evento nos próximos 30 dias.</div>;
                return proximos.map((item,i) => {
                  const cfg = COR_TIPO[item.tipo];
                  const dias = Math.ceil((new Date(item.data+"T00:00:00") - h) / 86400000);
                  return (
                    <div key={i} onClick={()=>setDiaSelecionado(item.data)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:i<proximos.length-1?"1px solid #f0f4ff":"none", cursor:"pointer" }}>
                      <div style={{ width:34, height:34, borderRadius:10, background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{cfg.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:12, color:"#1B3F7A" }}>{item.nome}</div>
                        <div style={{ fontSize:10, color:"#888" }}>{formatDateBR(item.data)}</div>
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

      {/* MODAL FORM */}
      {modal==="form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>{ setModal(null); setForm({}); setSelected(null); }}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar Data":"📌 Nova Data Comemorativa"}</div>
              <div onClick={()=>{ setModal(null); setForm({}); setSelected(null); }} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Aniversário do IPC..." style={inputStyle}/>
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
                <textarea value={form.descricao||""} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Informações adicionais..." style={{ ...inputStyle, minHeight:70, resize:"vertical" }}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={salvarData} disabled={salvando||!form.nome||!form.data} style={{ flex:1, background:salvando||!form.nome||!form.data?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:salvando||!form.nome||!form.data?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                {salvando?"Salvando...":"💾 Salvar"}
              </button>
              {form.data && form.nome && (
                <button onClick={async()=>{ await salvarData(); await solicitarArte({...form, id:"temp"}); }} style={{ background:"#f0fdf4", border:"1px solid #05996933", borderRadius:14, padding:"14px 14px", color:"#059669", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'Montserrat',sans-serif", whiteSpace:"nowrap" }}>
                  🎨 Salvar + Arte
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
