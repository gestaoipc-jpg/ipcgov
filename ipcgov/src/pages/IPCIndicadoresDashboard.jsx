import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const COR_PERF = (pct) => {
  if (pct === null || pct === undefined) return "#aaa";
  if (pct >= 100) return "#059669";
  if (pct >= 70) return "#E8730A";
  return "#dc2626";
};

function gerarPeriodos(ano, periodicidade) {
  switch(periodicidade) {
    case "Mensal": return Array.from({length:12},(_,i)=>({id:ano+"-M"+(i+1),label:["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][i]+"/"+ano,mes_inicio:i+1,mes_fim:i+1}));
    case "Bimestral": return [1,3,5,7,9,11].map((m,i)=>({id:ano+"-B"+(i+1),label:(i+1)+"º Bim/"+ano,mes_inicio:m,mes_fim:m+1}));
    case "Trimestral": return [1,4,7,10].map((m,i)=>({id:ano+"-T"+(i+1),label:(i+1)+"º Tri/"+ano,mes_inicio:m,mes_fim:m+2}));
    case "Quadrimestral": return [1,5,9].map((m,i)=>({id:ano+"-Q"+(i+1),label:(i+1)+"º Quad/"+ano,mes_inicio:m,mes_fim:m+3}));
    case "Semestral": return [1,7].map((m,i)=>({id:ano+"-S"+(i+1),label:(i+1)+"º Sem/"+ano,mes_inicio:m,mes_fim:m+5}));
    case "Anual": return [{id:ano+"-A1",label:"Ano "+ano,mes_inicio:1,mes_fim:12}];
    default: return [{id:ano+"-A1",label:"Ano "+ano,mes_inicio:1,mes_fim:12}];
  }
}

function calcPct(v, m) {
  const vn = parseFloat(String(v||"").replace(",",".").replace("%",""));
  const mn = parseFloat(String(m||"").replace(",",".").replace("%",""));
  if (isNaN(vn)||isNaN(mn)||mn===0) return null;
  return Math.round((vn/mn)*100);
}

export default function IPCIndicadoresDashboard({ user, onBack, onIndicador }) {
  const [indicadores, setIndicadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()));
  const [origemFiltro, setOrigemFiltro] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [modalImpressao, setModalImpressao] = useState(null);

  const anos = [];
  for (let y=2022;y<=2027;y++) anos.push(String(y));

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db,"ipc_indicadores"));
      setIndicadores(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const filtrados = indicadores.filter(i => origemFiltro==="todos" || i.origem===origemFiltro);

  const hoje = new Date();

  // Summary stats for the year
  const totalPeriodos = filtrados.reduce((sum,ind) => sum + gerarPeriodos(parseInt(anoFiltro), ind.periodicidade).length, 0);
  const entregues = filtrados.reduce((sum,ind) => {
    const ps = gerarPeriodos(parseInt(anoFiltro), ind.periodicidade);
    return sum + ps.filter(p => ind.medicoes?.[p.id]).length;
  }, 0);
  const acimaMeta = filtrados.reduce((sum,ind) => {
    const ps = gerarPeriodos(parseInt(anoFiltro), ind.periodicidade);
    return sum + ps.filter(p => {
      const med = ind.medicoes?.[p.id];
      if (!med) return false;
      const pct = calcPct(med.valorApurado, ind.metas?.[anoFiltro]);
      return pct !== null && pct >= 100;
    }).length;
  }, 0);

  const imprimir = (ind) => {
    const periodos = gerarPeriodos(parseInt(anoFiltro), ind.periodicidade);
    const metaAno = ind.metas?.[anoFiltro];
    const linhas = periodos.map(p => {
      const med = ind.medicoes?.[p.id];
      const pct = med ? calcPct(med.valorApurado, metaAno) : null;
      return "<tr><td style='padding:8px;border:1px solid #ddd'>" + p.label + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd'>" + (med?.dataAfericao ? new Date(med.dataAfericao+"T12:00:00").toLocaleDateString("pt-BR") : "—") + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd'>" + (med?.periodoAferido || p.label) + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd;font-weight:700'>" + (med?.valorApurado || "—") + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd;font-weight:700;color:" + (pct!==null?COR_PERF(pct):"#aaa") + "'>" + (pct!==null?pct+"%":"—") + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd'>" + (med?.status||"—") + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd'>" + (med?.observacoes||"—") + "</td></tr>";
    }).join("");

    const html = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Acompanhamento - "+ind.titulo+"</title>" +
      "<style>body{font-family:Arial,sans-serif;margin:30px;font-size:12px;color:#222} h1{font-size:14px;text-align:center;text-transform:uppercase;border-bottom:2px solid #1B3F7A;padding-bottom:8px;margin-bottom:16px} .info-table{width:100%;border-collapse:collapse;margin-bottom:20px} .info-table td{padding:6px 10px;border:1px solid #ddd} .info-table td:first-child{background:#1B3F7A;color:#fff;font-weight:700;width:30%} table{width:100%;border-collapse:collapse} th{padding:8px;background:#1B3F7A;color:#fff;border:1px solid #1B3F7A;text-align:left} @page{margin:15mm} @media print{body{margin:0}}</style></head><body>" +
      "<div style='text-align:center;margin-bottom:16px'><div style='font-size:20px;font-weight:900;color:#1B3F7A'>IPC<span style='color:#E8730A'>gov</span></div><div style='font-size:10px;color:#888;letter-spacing:2px'>Instituto Plácido Castelo</div></div>" +
      "<h1>MEDIÇÕES DO INDICADOR — " + anoFiltro + "</h1>" +
      "<table class='info-table'>" +
      "<tr><td>Título</td><td>" + ind.titulo + "</td></tr>" +
      "<tr><td>Origem</td><td>" + (ind.origem||"") + "</td></tr>" +
      "<tr><td>Tipo</td><td>" + (ind.tipo||"") + "</td></tr>" +
      "<tr><td>Periodicidade</td><td>" + (ind.periodicidade||"") + "</td></tr>" +
      "<tr><td>Unidade de Medida</td><td>" + (ind.unidade||"") + "</td></tr>" +
      "<tr><td>Fonte do Dado</td><td>" + (ind.fonte||"") + "</td></tr>" +
      "<tr><td>Meta " + anoFiltro + "</td><td style='font-weight:700;font-size:14px'>" + (metaAno||"Não definida") + "</td></tr>" +
      "<tr><td>Informações de Medição</td><td>" + (ind.formula||"") + "</td></tr>" +
      "</table>" +
      "<table><thead><tr><th>Período</th><th>Data Aferição</th><th>Período Aferido</th><th>Valor Apurado</th><th>% da Meta</th><th>Status</th><th>Observações</th></tr></thead><tbody>" + linhas + "</tbody></table>" +
      "<div style='margin-top:24px;font-size:10px;color:#888'>Emitido em "+new Date().toLocaleDateString("pt-BR")+" às "+new Date().toLocaleTimeString("pt-BR")+" · IPCgov</div>" +
      "</body></html>";

    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(()=>{win.focus();win.print();},600);
  };

  const imprimirGeral = () => {
    const linhas = filtrados.map(ind => {
      const periodos = gerarPeriodos(parseInt(anoFiltro), ind.periodicidade);
      const metaAno = ind.metas?.[anoFiltro];
      const entregP = periodos.filter(p=>ind.medicoes?.[p.id]).length;
      const ultimo = periodos.filter(p=>ind.medicoes?.[p.id]).pop();
      const ultMed = ultimo ? ind.medicoes[ultimo.id] : null;
      const pct = ultMed ? calcPct(ultMed.valorApurado, metaAno) : null;
      const cor = COR_PERF(pct);
      return "<tr><td style='padding:8px;border:1px solid #ddd'>" + (ind.numero||"") + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd'>" + ind.titulo + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd'>" + (ind.periodicidade||"") + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd'>" + (metaAno||"—") + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd'>" + entregP + "/" + periodos.length + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd;font-weight:700'>" + (ultMed?.valorApurado||"—") + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd;font-weight:700;color:"+cor+"'>" + (pct!==null?pct+"%":"—") + "</td>" +
        "<td style='padding:8px;border:1px solid #ddd'>" + (ultMed?.status||"—") + "</td></tr>";
    }).join("");

    const html = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Relatório Geral de Indicadores "+anoFiltro+"</title>" +
      "<style>body{font-family:Arial,sans-serif;margin:30px;font-size:11px} h1{font-size:14px;text-align:center;text-transform:uppercase;border-bottom:2px solid #1B3F7A;padding-bottom:8px;margin-bottom:20px} th{padding:8px;background:#1B3F7A;color:#fff;border:1px solid #1B3F7A;text-align:left;font-size:11px} td{font-size:11px} @page{margin:12mm;size:landscape} @media print{body{margin:0}}</style></head><body>" +
      "<div style='text-align:center;margin-bottom:12px'><div style='font-size:20px;font-weight:900;color:#1B3F7A'>IPC<span style='color:#E8730A'>gov</span></div></div>" +
      "<h1>RELATÓRIO GERAL DE INDICADORES — " + anoFiltro + "</h1>" +
      "<table style='width:100%;border-collapse:collapse'><thead><tr><th>Nº</th><th>Indicador</th><th>Periodicidade</th><th>Meta</th><th>Entregas</th><th>Último Valor</th><th>% Meta</th><th>Status</th></tr></thead><tbody>" + linhas + "</tbody></table>" +
      "<div style='margin-top:20px;font-size:10px;color:#888'>Emitido em "+new Date().toLocaleDateString("pt-BR")+" às "+new Date().toLocaleTimeString("pt-BR")+" · IPCgov</div>" +
      "</body></html>";

    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(()=>{win.focus();win.print();},600);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 36px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20, flexShrink:0 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC INDICADORES</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📊 Dashboard</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
              <div onClick={imprimirGeral} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>🖨️ Relatório Geral</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 32px 80px" }}>
        {/* FILTROS */}
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#555" }}>Ano:</span>
          {anos.map(a => (
            <div key={a} onClick={() => setAnoFiltro(a)}
              style={{ borderRadius:10, padding:"6px 16px", fontWeight:700, fontSize:13, cursor:"pointer",
                background:anoFiltro===a?"#1B3F7A":"#fff", color:anoFiltro===a?"#fff":"#1B3F7A",
                boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
              {a}
            </div>
          ))}
          <div style={{ marginLeft:"auto" }}>
            <select value={origemFiltro} onChange={e=>setOrigemFiltro(e.target.value)}
              style={{ background:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontSize:12, fontWeight:700, color:"#1B3F7A", outline:"none", boxShadow:"0 2px 8px rgba(27,63,122,0.08)", cursor:"pointer" }}>
              <option value="todos">Todas as origens</option>
              <option value="SEPLAG / PPA">SEPLAG / PPA</option>
              <option value="TCE / Governança">TCE / Governança</option>
              <option value="Interno IPC">Interno IPC</option>
            </select>
          </div>
        </div>

        {/* CARDS RESUMO */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:14, marginBottom:28 }}>
          {[
            { label:"Indicadores", value:filtrados.length, icon:"📊", cor:"#1B3F7A" },
            { label:"Períodos no Ano", value:totalPeriodos, icon:"📅", cor:"#0891b2" },
            { label:"Entregas Realizadas", value:entregues, icon:"✅", cor:"#059669" },
            { label:"Pendentes", value:totalPeriodos-entregues, icon:"⏳", cor:(totalPeriodos-entregues)>0?"#E8730A":"#aaa" },
            { label:"Acima da Meta", value:acimaMeta, icon:"🎯", cor:"#059669" },
          ].map((s,i) => (
            <div key={i} style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)", borderLeft:"4px solid "+s.cor }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{s.icon}</div>
              <div style={{ color:s.cor, fontWeight:900, fontSize:26 }}>{s.value}</div>
              <div style={{ color:"#888", fontSize:11, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* BARRA PROGRESSO GERAL */}
        {totalPeriodos > 0 && (
          <div style={{ background:"#fff", borderRadius:16, padding:"16px 20px", marginBottom:24, boxShadow:"0 2px 12px rgba(27,63,122,0.07)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>Progresso de Entregas — {anoFiltro}</div>
              <div style={{ fontWeight:700, fontSize:14, color:"#059669" }}>{Math.round((entregues/totalPeriodos)*100)}%</div>
            </div>
            <div style={{ height:12, background:"#e8edf2", borderRadius:6, overflow:"hidden" }}>
              <div style={{ height:"100%", background:"linear-gradient(90deg,#059669,#34D399)", borderRadius:6, width:Math.round((entregues/totalPeriodos)*100)+"%" }}/>
            </div>
            <div style={{ fontSize:11, color:"#aaa", marginTop:6 }}>{entregues} de {totalPeriodos} períodos entregues</div>
          </div>
        )}

        {/* GRID DE INDICADORES */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#aaa" }}>Carregando...</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {filtrados.map(ind => {
              const periodos = gerarPeriodos(parseInt(anoFiltro), ind.periodicidade);
              const metaAno = ind.metas?.[anoFiltro];
              const entregP = periodos.filter(p=>ind.medicoes?.[p.id]).length;
              const isExpanded = selected === ind.id;

              // Last measurement
              const ultimoEntregue = [...periodos].reverse().find(p=>ind.medicoes?.[p.id]);
              const ultMed = ultimoEntregue ? ind.medicoes[ultimoEntregue.id] : null;
              const ultPct = ultMed ? calcPct(ultMed.valorApurado, metaAno) : null;

              return (
                <div key={ind.id} style={{ background:"#fff", borderRadius:18, boxShadow:"0 2px 12px rgba(27,63,122,0.07)", overflow:"hidden" }}>
                  <div style={{ padding:"18px 22px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", gap:14, flexWrap:"wrap" }}
                    onClick={() => setSelected(isExpanded ? null : ind.id)}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                        {ind.numero && <span style={{ background:"#f0f4ff", borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>Nº {ind.numero}</span>}
                        <span style={{ background:"#f5f3ff", borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:700, color:"#7c3aed" }}>{ind.periodicidade}</span>
                        <span style={{ background:"#f0fdf4", borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:700, color:"#059669" }}>{ind.origem}</span>
                      </div>
                      <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:4 }}>{ind.titulo}</div>
                      <div style={{ fontSize:12, color:"#888" }}>
                        {metaAno && <span style={{ marginRight:12 }}>🎯 Meta: <strong>{metaAno}</strong></span>}
                        <span>{entregP}/{periodos.length} entregas</span>
                        {ultMed && <span style={{ marginLeft:12, fontWeight:700, color:COR_PERF(ultPct) }}>Último: {ultMed.valorApurado} {ultPct!==null?"("+ultPct+"%)":""}</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      {ultPct !== null && (
                        <div style={{ width:52, height:52, borderRadius:"50%", background:COR_PERF(ultPct)+"22", border:"3px solid "+COR_PERF(ultPct), display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color:COR_PERF(ultPct) }}>
                          {ultPct}%
                        </div>
                      )}
                      <div onClick={e=>{e.stopPropagation();imprimir(ind);}} style={{ background:"#f0f4ff", borderRadius:10, padding:"7px 12px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>🖨️</div>
                      {onIndicador && <div onClick={e=>{e.stopPropagation();onIndicador(ind);}} style={{ background:"#1B3F7A", borderRadius:10, padding:"7px 12px", fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer" }}>📝</div>}
                      <div style={{ color:"#1B3F7A", fontSize:14 }}>{isExpanded?"▲":"▼"}</div>
                    </div>
                  </div>

                  {/* BARRA DE PROGRESSO DO INDICADOR */}
                  <div style={{ padding:"0 22px 10px" }}>
                    <div style={{ height:8, background:"#e8edf2", borderRadius:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:COR_PERF(ultPct), borderRadius:4, width:Math.round((entregP/periodos.length)*100)+"%" }}/>
                    </div>
                  </div>

                  {/* DETALHES EXPANDIDOS */}
                  {isExpanded && (
                    <div style={{ padding:"0 22px 20px" }}>
                      <div style={{ borderTop:"1px solid #e8edf2", paddingTop:16 }}>
                        <div style={{ fontWeight:700, fontSize:12, color:"#888", marginBottom:12, letterSpacing:1 }}>PERÍODOS — {anoFiltro}</div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                          {periodos.map(p => {
                            const med = ind.medicoes?.[p.id];
                            const pct = med ? calcPct(med.valorApurado, metaAno) : null;
                            return (
                              <div key={p.id} style={{ background:med?COR_PERF(pct)+"11":"#f8f9fb", border:"1px solid "+(med?COR_PERF(pct):"#e8edf2"), borderRadius:10, padding:"8px 14px", minWidth:120 }}>
                                <div style={{ fontSize:11, fontWeight:700, color:"#888", marginBottom:4 }}>{p.label}</div>
                                {med ? <>
                                  <div style={{ fontSize:14, fontWeight:900, color:COR_PERF(pct) }}>{med.valorApurado}</div>
                                  {pct!==null && <div style={{ fontSize:11, color:COR_PERF(pct), fontWeight:700 }}>{pct}% da meta</div>}
                                  {med.arquivo && <div style={{ fontSize:10, color:"#7c3aed", marginTop:3 }}>📎</div>}
                                </> : <div style={{ fontSize:12, color:"#ccc" }}>Pendente</div>}
                              </div>
                            );
                          })}
                        </div>

                        {/* HISTÓRICO OUTROS ANOS */}
                        {Object.keys(ind.medicoes||{}).some(k=>!k.startsWith(anoFiltro)) && (
                          <div>
                            <div style={{ fontWeight:700, fontSize:11, color:"#aaa", marginBottom:8, letterSpacing:1 }}>HISTÓRICO</div>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              {Object.entries(ind.medicoes||{})
                                .filter(([k])=>!k.startsWith(anoFiltro))
                                .sort(([a],[b])=>a.localeCompare(b))
                                .map(([pid,med]) => {
                                  const anoH = pid.split("-")[0];
                                  const pct = calcPct(med.valorApurado, ind.metas?.[anoH]);
                                  return (
                                    <div key={pid} style={{ background:"#f8f9fb", borderRadius:8, padding:"5px 10px", fontSize:11 }}>
                                      <span style={{ color:"#888" }}>{pid}: </span>
                                      <span style={{ fontWeight:700, color:COR_PERF(pct) }}>{med.valorApurado}</span>
                                      {pct!==null && <span style={{ color:COR_PERF(pct) }}> ({pct}%)</span>}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
