import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

function fmtNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1).replace(".",",") + "M";
  if (n >= 1000) return n.toLocaleString("pt-BR");
  return String(n);
}
function fmtBRL(n) {
  return "R$ " + (n||0).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2});
}

export default function TCEducDashboardDinamico({ ano, onBack }) {
  const [eventos, setEventos] = useState([]);
  const [viagens, setViagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos");
  const [filtroViagem, setFiltroViagem] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  useEffect(() => { loadAll(); }, [ano]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [evSnap, vSnap] = await Promise.all([
        getDocs(collection(db,"tceduc_eventos")),
        getDocs(collection(db,"tceduc_viagens")),
      ]);
      const todosEvs = evSnap.docs.map(d=>({id:d.id,...d.data()}));
      const todasVgs = vSnap.docs.map(d=>({id:d.id,...d.data()}));
      // Viagens do ano: dataInicio ou dataFim contém o ano
      const vgs = todasVgs.filter(v =>
        (v.dataInicio && v.dataInicio.startsWith(ano)) ||
        (v.dataFim && v.dataFim.startsWith(ano))
      );
      // Mapa: eventoId -> viagemId (viagem tem municipiosIds = array de IDs de eventos)
      const eventoIdToViagemId = {};
      const viagemIdToModalidade = {};
      vgs.forEach(v => {
        viagemIdToModalidade[v.id] = v.modalidade || "Municipal";
        (v.municipiosIds || []).forEach(evId => {
          eventoIdToViagemId[evId] = v.id;
        });
      });
      // Eventos do ano: data começa com o ano OU pertence a uma viagem do ano
      const idsViagensAno = new Set(Object.keys(eventoIdToViagemId));
      const evs = todosEvs
        .filter(e => (e.data && e.data.startsWith(ano)) || idsViagensAno.has(e.id))
        .map(e => ({ ...e, _viagemId: eventoIdToViagemId[e.id] || null, _modalidade: viagemIdToModalidade[eventoIdToViagemId[e.id]] || e.tipo || "Municipal" }));
      setEventos(evs);
      setViagens(vgs);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // Apply filters
  const eventosFiltrados = eventos.filter(e => {
    if (filtroTipo !== "todos" && e._modalidade !== filtroTipo) return false;
    if (filtroViagem !== "todos" && e._viagemId !== filtroViagem) return false;
    if (filtroMunicipio !== "todos" && (e.municipio || e.regiao) !== filtroMunicipio) return false;
    if (filtroMes !== "todos") {
      const mes = parseInt((e.data||"").split("-")[1]);
      if (mes !== parseInt(filtroMes)) return false;
    }
    return true;
  });

  const viagensFiltradas = viagens.filter(v => {
    if (filtroViagem !== "todos" && v.id !== filtroViagem) return false;
    if (filtroTipo !== "todos" && (v.modalidade || "Municipal") !== filtroTipo) return false;
    if (filtroMes !== "todos") {
      const mesInicio = parseInt((v.dataInicio||"").split("-")[1]);
      const mesFim = parseInt((v.dataFim||v.dataInicio||"").split("-")[1]);
      if (mesInicio !== parseInt(filtroMes) && mesFim !== parseInt(filtroMes)) return false;
    }
    return true;
  });

  // Aggregate stats
  const municipiosVisitados = new Set(eventosFiltrados.map(e => e.municipio || e.regiao).filter(Boolean)).size;

  // Total inscritos e aprovados por ação
  let totalInscritos = 0, totalAprovados = 0;
  const acoesSummary = {};
  eventosFiltrados.forEach(e => {
    if (e.modoTotalManual) {
      // Modo total direto — usa o total manual, distribui proporcionalmente nas ações se existirem
      const totalAprovM = parseInt(e.totalAprovadosManual)||0;
      const totalInscM = parseInt(e.totalInscritosManual)||0;
      totalInscritos += totalInscM;
      totalAprovados += totalAprovM;
      // Para o summary de ações, distribui pelo número de ações
      const nAcoes = (e.acoesEducacionais||[]).length || 1;
      (e.acoesEducacionais||[]).forEach(a => {
        const nome = a.acaoNome || a.nome || "Sem nome";
        if (!acoesSummary[nome]) acoesSummary[nome] = { inscritos:0, aprovados:0 };
        acoesSummary[nome].inscritos += Math.round(totalInscM / nAcoes);
        acoesSummary[nome].aprovados += Math.round(totalAprovM / nAcoes);
      });
      if ((e.acoesEducacionais||[]).length === 0) {
        if (!acoesSummary["Total"]) acoesSummary["Total"] = { inscritos:0, aprovados:0 };
        acoesSummary["Total"].inscritos += totalInscM;
        acoesSummary["Total"].aprovados += totalAprovM;
      }
    } else {
      (e.acoesEducacionais||[]).forEach(a => {
        const nome = a.acaoNome || a.nome || "Sem nome";
        if (!acoesSummary[nome]) acoesSummary[nome] = { inscritos:0, aprovados:0 };
        acoesSummary[nome].inscritos += parseInt(a.inscritos)||0;
        acoesSummary[nome].aprovados += parseInt(a.participantes)||0;
        totalInscritos += parseInt(a.inscritos)||0;
        totalAprovados += parseInt(a.participantes)||0;
      });
    }
  });
  const ausenciaAcum = totalInscritos > 0 ? Math.round((totalInscritos - totalAprovados) / totalInscritos * 100) : 0;

  // Custos das viagens filtradas
  const custoTranspTotal = viagensFiltradas.reduce((s,v) => s + (parseFloat(v.custoTransporte)||0), 0);
  const custoInstrTotal = viagensFiltradas.reduce((s,v) => s + (parseFloat(v.custoInstrutoria)||0), 0);
  const custoDiarTotal = viagensFiltradas.reduce((s,v) => s + (parseFloat(v.custoDiarias)||0), 0);
  const custoTotal = custoTranspTotal + custoInstrTotal + custoDiarTotal;
  const custoPorAluno = totalAprovados > 0 ? custoTotal / totalAprovados : 0;

  // Médias por ação
  const acoesOrdenadas = Object.entries(acoesSummary).sort((a,b) => b[1].aprovados - a[1].aprovados);

  // Listas para filtros
  const mesesDisp = [...new Set([
    ...eventos.map(e => parseInt((e.data||"").split("-")[1])),
    ...viagens.map(v => parseInt((v.dataInicio||"").split("-")[1])),
  ])].filter(Boolean).sort((a,b)=>a-b);
  const municDisp = [...new Set(eventos.map(e => e.municipio||e.regiao).filter(Boolean))].sort();
  const viagensDisp = viagens.sort((a,b) => (a.dataInicio||"").localeCompare(b.dataInicio||""));
  const temRegional = eventos.some(e => e._modalidade === "Regional");
  const temMunicipal = eventos.some(e => e._modalidade === "Municipal");

  const cardStyle = (bg) => ({
    background: bg || "#fff",
    borderRadius:14,
    padding:"16px 18px",
    boxShadow:"0 2px 10px rgba(0,0,0,0.06)",
  });
  const bigNum = (color) => ({ fontWeight:900, fontSize:32, color:color||"#222", lineHeight:1, marginBottom:4 });
  const lbl = (color) => ({ fontSize:12, color:color||"#888", fontWeight:600 });

  return (
    <div style={{ minHeight:"100vh", background:"#f0f2f5", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background:"#1a6b78", padding:"12px 24px 0" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div onClick={onBack} style={{ width:36,height:36,background:"rgba(255,255,255,0.15)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:18 }}>←</div>
            <div style={{ color:"#fff", fontWeight:900, fontSize:22, letterSpacing:2 }}>TCEDUC</div>
          </div>
          <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, fontWeight:600 }}>Ano: {ano}</div>
        </div>

        {/* FILTROS */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", paddingBottom:12 }}>
          <select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}
            style={{ background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:600,outline:"none",cursor:"pointer" }}>
            <option value="todos" style={{ color:"#1B3F7A",background:"#fff" }}>Mês ▼</option>
            {mesesDisp.map(m=><option key={m} value={m} style={{ color:"#1B3F7A",background:"#fff" }}>{MESES[m-1]}</option>)}
          </select>
          <select value={filtroMunicipio} onChange={e=>setFiltroMunicipio(e.target.value)}
            style={{ background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:600,outline:"none",cursor:"pointer" }}>
            <option value="todos" style={{ color:"#1B3F7A",background:"#fff" }}>Município ▼</option>
            {municDisp.map(m=><option key={m} value={m} style={{ color:"#1B3F7A",background:"#fff" }}>{m}</option>)}
          </select>
          <select value={filtroViagem} onChange={e=>setFiltroViagem(e.target.value)}
            style={{ background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:600,outline:"none",cursor:"pointer" }}>
            <option value="todos" style={{ color:"#1B3F7A",background:"#fff" }}>Viagem ▼</option>
            {viagensDisp.map(v=><option key={v.id} value={v.id} style={{ color:"#1B3F7A",background:"#fff" }}>{v.titulo||"Viagem"}</option>)}
          </select>
          {(temMunicipal && temRegional) && (
            <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
              style={{ background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:600,outline:"none",cursor:"pointer" }}>
              <option value="todos" style={{ color:"#1B3F7A",background:"#fff" }}>Municipal + Regional</option>
              <option value="Municipal" style={{ color:"#1B3F7A",background:"#fff" }}>Municipal</option>
              <option value="Regional" style={{ color:"#1B3F7A",background:"#fff" }}>Regional</option>
            </select>
          )}
          {(filtroMes!=="todos"||filtroMunicipio!=="todos"||filtroViagem!=="todos"||filtroTipo!=="todos") && (
            <div onClick={()=>{setFiltroMes("todos");setFiltroMunicipio("todos");setFiltroViagem("todos");setFiltroTipo("todos");}}
              style={{ background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer" }}>
              ✕ Limpar
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:"20px 20px 60px", maxWidth:1200, margin:"0 auto" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#aaa" }}>Carregando dados de {ano}...</div>
        ) : eventos.length === 0 && viagens.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📭</div>
            <div style={{ fontWeight:700, fontSize:18, color:"#1B3F7A", marginBottom:8 }}>Nenhum dado encontrado para {ano}</div>
            <div style={{ color:"#aaa", fontSize:13 }}>Cadastre eventos e viagens com datas em {ano} no módulo TCEduc para visualizar o dashboard.</div>
          </div>
        ) : (
          <>
            {/* LAYOUT: sidebar + grade de KPIs */}
            <div style={{ display:"flex", gap:14, marginBottom:14, alignItems:"flex-start" }}>

              {/* RESULTADOS CHAVE */}
              <div style={{ width:180, flexShrink:0, background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ fontWeight:800, fontSize:13, color:"#1B3F7A", marginBottom:4, textAlign:"center" }}>Resultados<br/>Chave</div>
                <div style={{ background:"#7c3aed", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontWeight:900, fontSize:26, color:"#fff" }}>{fmtNum(municipiosVisitados)}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Municípios</div>
                </div>
                <div style={{ background:"#0891b2", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontWeight:900, fontSize:26, color:"#fff" }}>{fmtNum(totalAprovados)}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Capacitados</div>
                </div>
                <div style={{ background:"#059669", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontWeight:900, fontSize:22, color:"#fff" }}>{100 - ausenciaAcum}%</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Conclusão</div>
                </div>
                {custoTotal > 0 && (
                  <div style={{ background:"#ec4899", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontWeight:900, fontSize:14, color:"#fff" }}>{fmtBRL(custoTotal)}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Custo Total</div>
                  </div>
                )}
              </div>

              {/* GRADE DE KPIs */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                {/* Linha 1 */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <div style={cardStyle()}>
                    <div style={bigNum("#222")}>{fmtNum(municipiosVisitados)}</div>
                    <div style={lbl()}>Municípios visitados</div>
                  </div>
                  <div style={cardStyle()}>
                    <div style={bigNum("#222")}>{fmtNum(totalAprovados)}</div>
                    <div style={lbl()}>Participantes capacitados</div>
                  </div>
                  <div style={cardStyle()}>
                    <div style={{ fontWeight:900, fontSize:24, color:"#222", lineHeight:1, marginBottom:4 }}>{fmtBRL(custoTotal)}</div>
                    <div style={lbl()}>Custo total</div>
                  </div>
                </div>
                {/* Linha 2 */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <div style={cardStyle()}>
                    <div style={bigNum("#222")}>{fmtNum(totalInscritos)}</div>
                    <div style={lbl()}>Participantes inscritos</div>
                  </div>
                  <div style={cardStyle()}>
                    <div style={bigNum("#222")}>{ausenciaAcum}%</div>
                    <div style={lbl()}>Ausência acumulada</div>
                  </div>
                  <div style={cardStyle()}>
                    <div style={{ fontWeight:900, fontSize:26, color:"#222", lineHeight:1, marginBottom:4 }}>{fmtBRL(custoPorAluno)}</div>
                    <div style={lbl()}>Custo por capacitado</div>
                  </div>
                </div>
                {/* Linha 3: cards por ação educacional */}
                {acoesOrdenadas.length > 0 && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:10 }}>
                    {acoesOrdenadas.map(([nome, vals]) => {
                      const ausAcao = vals.inscritos > 0 ? Math.round((vals.inscritos - vals.aprovados) / vals.inscritos * 100) : null;
                      const mediaM = municipiosVisitados > 0 ? (vals.aprovados / municipiosVisitados).toFixed(2) : "0";
                      const cores = [
                        { bg:"#e8f4ff", cor:"#1B3F7A" },
                        { bg:"#fce4ec", cor:"#c2185b" },
                        { bg:"#e8f5e9", cor:"#2e7d32" },
                        { bg:"#fff3e0", cor:"#E8730A" },
                        { bg:"#f3e5f5", cor:"#7c3aed" },
                      ];
                      const cIdx = acoesOrdenadas.findIndex(x => x[0]===nome) % cores.length;
                      const cor = cores[cIdx];
                      return (
                        <div key={nome} style={{ ...cardStyle(cor.bg), border:"none" }}>
                          <div style={{ fontWeight:800, fontSize:14, color:cor.cor, marginBottom:8, borderBottom:"2px solid "+cor.cor, paddingBottom:6 }}>{nome}</div>
                          <div style={{ fontWeight:700, fontSize:11, color:"#888", marginBottom:4 }}>Participantes</div>
                          <div style={{ fontWeight:900, fontSize:28, color:cor.cor, lineHeight:1 }}>{fmtNum(vals.aprovados)}</div>
                          {ausAcao !== null && (
                            <div style={{ fontSize:11, color: ausAcao > 30 ? "#dc2626" : "#059669", fontWeight:700, marginTop:6 }}>Ausência: {ausAcao}%</div>
                          )}
                          <div style={{ marginTop:8, fontWeight:700, fontSize:11, color:"#888" }}>Média por município</div>
                          <div style={{ fontWeight:900, fontSize:20, color:cor.cor }}>{mediaM}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* TABELA DETALHE */}
            <div style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", marginBottom:14, overflowX:"auto" }}>
              <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>📋 Detalhe por Evento</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#1a6b78", color:"#fff" }}>
                    <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Data</th>
                    <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Município/Regional</th>
                    <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Tipo</th>
                    {acoesOrdenadas.map(([nome]) => (
                      <th key={nome} style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>{nome}</th>
                    ))}
                    <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Total</th>
                    <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Ausência</th>
                  </tr>
                </thead>
                <tbody>
                  {eventosFiltrados.sort((a,b) => (a.data||"").localeCompare(b.data||"")).map((ev,i) => {
                    const totalEvInsc = (ev.acoesEducacionais||[]).reduce((s,a) => s+(parseInt(a.inscritos)||0), 0);
                    const totalEvAprov = (ev.acoesEducacionais||[]).reduce((s,a) => s+(parseInt(a.participantes)||0), 0);
                    const ausEv = totalEvInsc > 0 ? Math.round((totalEvInsc-totalEvAprov)/totalEvInsc*100) : null;
                    return (
                      <tr key={ev.id} style={{ background:i%2===0?"#fff":"#f8f9fb", borderBottom:"1px solid #e8edf2" }}>
                        <td style={{ padding:"7px 10px", color:"#555" }}>{ev.data ? ev.data.split("-").reverse().join("/") : "—"}</td>
                        <td style={{ padding:"7px 10px", fontWeight:600 }}>{ev.municipio||ev.regiao||"—"}</td>
                        <td style={{ padding:"7px 10px" }}>
                          <span style={{ background:ev._modalidade==="Regional"?"#f5f3ff":"#eff6ff", color:ev._modalidade==="Regional"?"#7c3aed":"#1B3F7A", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{ev._modalidade||"—"}</span>
                        </td>
                        {acoesOrdenadas.map(([nome]) => {
                          const acao = (ev.acoesEducacionais||[]).find(a=>(a.acaoNome||a.nome)===nome);
                          return <td key={nome} style={{ padding:"7px 10px", textAlign:"right", fontWeight:acao?700:400, color:acao?"#1B3F7A":"#ccc" }}>{acao ? parseInt(acao.participantes)||0 : "—"}</td>;
                        })}
                        <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700 }}>{totalEvAprov}</td>
                        <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, color:ausEv!==null&&ausEv>30?"#dc2626":"#059669" }}>{ausEv!==null ? ausEv+"%" : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {eventosFiltrados.length === 0 && (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#aaa", fontSize:13 }}>Nenhum evento realizado{filtroTipo!=="todos"?" ("+filtroTipo+")":""} em {ano} com os filtros selecionados.</div>
              )}
            </div>

            {/* CUSTOS */}
            {custoTotal > 0 && (
              <div style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflowX:"auto" }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>💰 Custos por Viagem</div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"#1a6b78", color:"#fff" }}>
                      <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Viagem</th>
                      <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Transporte</th>
                      <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Instrutoria</th>
                      <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Diárias</th>
                      <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viagensFiltradas.filter(v => (parseFloat(v.custoTransporte)||0)+(parseFloat(v.custoInstrutoria)||0)+(parseFloat(v.custoDiarias)||0) > 0).map((v,i) => {
                      const tot = (parseFloat(v.custoTransporte)||0)+(parseFloat(v.custoInstrutoria)||0)+(parseFloat(v.custoDiarias)||0);
                      return (
                        <tr key={v.id} style={{ background:i%2===0?"#fff":"#f8f9fb", borderBottom:"1px solid #e8edf2" }}>
                          <td style={{ padding:"7px 10px", fontWeight:700, color:"#1B3F7A" }}>{v.titulo||"Viagem"}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right" }}>{parseFloat(v.custoTransporte)>0?fmtBRL(parseFloat(v.custoTransporte)):"—"}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right" }}>{parseFloat(v.custoInstrutoria)>0?fmtBRL(parseFloat(v.custoInstrutoria)):"—"}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right" }}>{parseFloat(v.custoDiarias)>0?fmtBRL(parseFloat(v.custoDiarias)):"—"}</td>
                          <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700 }}>{fmtBRL(tot)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
