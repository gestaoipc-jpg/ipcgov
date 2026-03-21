import { useState } from "react";

const MUNICIPIOS_2024 = [
  {municipio:"ALCÂNTARAS",semana:3,mes:4,nll:17,conselhos:0},
  {municipio:"BAIXIO",semana:5,mes:5,nll:26,conselhos:25},
  {municipio:"CATARINA",semana:6,mes:5,nll:28,conselhos:0},
  {municipio:"UMARÍ",semana:5,mes:5,nll:28,conselhos:0},
  {municipio:"ARNEIROZ",semana:8,mes:6,nll:30,conselhos:0},
  {municipio:"CAMPOS SALES",semana:8,mes:6,nll:30,conselhos:24},
  {municipio:"SOLONÓPOLE",semana:6,mes:5,nll:30,conselhos:30},
  {municipio:"SABOEIRO",semana:8,mes:6,nll:31,conselhos:35},
  {municipio:"SENADOR POMPEU",semana:6,mes:5,nll:31,conselhos:0},
  {municipio:"AIUABA",semana:8,mes:6,nll:33,conselhos:0},
  {municipio:"BARROQUINHA",semana:1,mes:2,nll:33,conselhos:0},
  {municipio:"UMIRIM",semana:3,mes:4,nll:33,conselhos:0},
  {municipio:"PIQUET CARNEIRO",semana:6,mes:5,nll:36,conselhos:0},
  {municipio:"CRUZ",semana:1,mes:2,nll:36,conselhos:42},
  {municipio:"MISSÃO VELHA",semana:2,mes:3,nll:37,conselhos:0},
  {municipio:"ITAPAJÉ",semana:3,mes:4,nll:39,conselhos:14},
  {municipio:"JAGUARUANA",semana:7,mes:6,nll:39,conselhos:0},
  {municipio:"FORTIM",semana:7,mes:6,nll:39,conselhos:0},
  {municipio:"QUIXELÔ",semana:5,mes:5,nll:39,conselhos:0},
  {municipio:"ICÓ",semana:5,mes:5,nll:41,conselhos:0},
  {municipio:"MARCO",semana:1,mes:2,nll:41,conselhos:0},
  {municipio:"TURURU",semana:4,mes:4,nll:41,conselhos:0},
  {municipio:"ACOPIARA",semana:6,mes:5,nll:42,conselhos:18},
  {municipio:"MERUOCA",semana:3,mes:4,nll:42,conselhos:0},
  {municipio:"ARACATI",semana:7,mes:6,nll:43,conselhos:17},
  {municipio:"MORRINHOS",semana:4,mes:4,nll:44,conselhos:0},
  {municipio:"SANTANA DO CARIRI",semana:2,mes:3,nll:44,conselhos:0},
  {municipio:"QUITERIANÓPOLIS",semana:8,mes:6,nll:44,conselhos:0},
  {municipio:"PARAMBU",semana:8,mes:6,nll:45,conselhos:0},
  {municipio:"PALHANO",semana:7,mes:6,nll:45,conselhos:13},
  {municipio:"MOMBAÇA",semana:6,mes:5,nll:46,conselhos:24},
  {municipio:"AMONTADA",semana:4,mes:4,nll:47,conselhos:13},
  {municipio:"ORÓS",semana:5,mes:5,nll:47,conselhos:0},
  {municipio:"PARAIPABA",semana:4,mes:4,nll:48,conselhos:0},
  {municipio:"ANTONINA DO NORTE",semana:8,mes:6,nll:48,conselhos:0},
  {municipio:"ITAIÇABA",semana:7,mes:6,nll:49,conselhos:0},
  {municipio:"TAUÁ",semana:8,mes:6,nll:50,conselhos:21},
  {municipio:"SALITRE",semana:8,mes:6,nll:51,conselhos:0},
  {municipio:"NOVA OLINDA",semana:2,mes:3,nll:51,conselhos:24},
  {municipio:"BEBERIBE",semana:7,mes:6,nll:53,conselhos:0},
  {municipio:"MILHÃ",semana:6,mes:5,nll:55,conselhos:0},
  {municipio:"RUSSAS",semana:7,mes:6,nll:55,conselhos:13},
  {municipio:"IPAUMIRIM",semana:5,mes:5,nll:56,conselhos:0},
  {municipio:"TRAIRÍ",semana:4,mes:4,nll:59,conselhos:0},
  {municipio:"DEP. IRAPUÃ PINHEIRO",semana:6,mes:5,nll:60,conselhos:0},
  {municipio:"ALTANEIRA",semana:2,mes:3,nll:61,conselhos:0},
  {municipio:"MIRAÍMA",semana:4,mes:4,nll:61,conselhos:0},
  {municipio:"CHAVAL",semana:1,mes:2,nll:62,conselhos:0},
  {municipio:"PEDRA BRANCA",semana:6,mes:5,nll:62,conselhos:0},
  {municipio:"BELA CRUZ",semana:1,mes:2,nll:64,conselhos:24},
  {municipio:"ACARAÚ",semana:1,mes:2,nll:65,conselhos:65},
  {municipio:"CEDRO",semana:5,mes:5,nll:65,conselhos:0},
  {municipio:"GROAÍRAS",semana:3,mes:4,nll:65,conselhos:35},
  {municipio:"URUBURETAMA",semana:4,mes:4,nll:66,conselhos:0},
  {municipio:"PARACURU",semana:4,mes:4,nll:67,conselhos:17},
  {municipio:"ICAPUÍ",semana:7,mes:6,nll:71,conselhos:0},
  {municipio:"IRAUÇUBA",semana:3,mes:4,nll:71,conselhos:0},
  {municipio:"ITAPIPOCA",semana:4,mes:4,nll:74,conselhos:27},
  {municipio:"JUAZEIRO DO NORTE",semana:2,mes:3,nll:74,conselhos:31},
  {municipio:"FORQUILHA",semana:3,mes:4,nll:77,conselhos:0},
  {municipio:"LAVRAS DA MANGABEIRA",semana:5,mes:5,nll:77,conselhos:27},
  {municipio:"ITAREMA",semana:1,mes:2,nll:81,conselhos:0},
  {municipio:"BARBALHA",semana:2,mes:3,nll:86,conselhos:33},
  {municipio:"IGUATU",semana:5,mes:5,nll:89,conselhos:33},
  {municipio:"CAMOCIM",semana:1,mes:2,nll:94,conselhos:14},
  {municipio:"CARIRIAÇU",semana:2,mes:3,nll:94,conselhos:0},
  {municipio:"CARIRÉ",semana:3,mes:4,nll:96,conselhos:0},
  {municipio:"SOBRAL",semana:3,mes:4,nll:102,conselhos:0},
  {municipio:"QUIXERÉ",semana:7,mes:6,nll:118,conselhos:0},
  {municipio:"CRATO",semana:2,mes:3,nll:122,conselhos:0},
  {municipio:"JIJOCA DE JERICOACOARA",semana:1,mes:2,nll:123,conselhos:0},
  {municipio:"JARDIM",semana:2,mes:3,nll:141,conselhos:0},
];

const SEMANAS_2024 = [
  {semana:1,label:"Semana 1",mes:"Fevereiro",dataInicio:"26/02",dataFim:"01/03",
   municipios:["CAMOCIM","BARROQUINHA","CHAVAL","CRUZ","JIJOCA DE JERICOACOARA","BELA CRUZ","ACARAÚ","MARCO","ITAREMA"],
   instrutoria:8908.41,diarias:10120.00,combustivel:5545.13,passagem:0,total:24574.54,participantes:659},
  {semana:2,label:"Semana 2",mes:"Março",dataInicio:"11/03",dataFim:"15/03",
   municipios:["SANTANA DO CARIRI","NOVA OLINDA","ALTANEIRA","BARBALHA","MISSÃO VELHA","JARDIM","CARIRIAÇU","CRATO","JUAZEIRO DO NORTE"],
   instrutoria:11018.29,diarias:11320.00,combustivel:5492.04,passagem:947.22,total:28777.10,participantes:948},
  {semana:3,label:"Semana 3",mes:"Abril",dataInicio:"01/04",dataFim:"05/04",
   municipios:["GROAÍRAS","SOBRAL","ITAPAJÉ","CARIRÉ","ALCÂNTARAS","UMIRIM","FORQUILHA","MERUOCA","IRAUÇUBA"],
   instrutoria:10666.65,diarias:8400.00,combustivel:4595.28,passagem:0,total:23661.93,participantes:688},
  {semana:4,label:"Semana 4",mes:"Abril",dataInicio:"15/04",dataFim:"18/04",
   municipios:["AMONTADA","ITAPIPOCA","PARACURU","MORRINHOS","URUBURETAMA","TRAIRÍ","MIRAÍMA","TURURU","PARAIPABA"],
   instrutoria:8908.41,diarias:5760.00,combustivel:4041.47,passagem:0,total:18710.44,participantes:613},
  {semana:5,label:"Semana 5",mes:"Maio",dataInicio:"06/05",dataFim:"10/05",
   municipios:["BAIXIO","IPAUMIRIM","UMARÍ","LAVRAS DA MANGABEIRA","CEDRO","ICÓ","IGUATU","ORÓS","QUIXELÔ"],
   instrutoria:11018.29,diarias:8400.00,combustivel:4332.53,passagem:0,total:23750.82,participantes:557},
  {semana:6,label:"Semana 6",mes:"Maio",dataInicio:"20/05",dataFim:"24/05",
   municipios:["ACOPIARA","PIQUET CARNEIRO","CATARINA","MOMBAÇA","SENADOR POMPEU","PEDRA BRANCA","SOLONÓPOLE","MILHÃ","DEP. IRAPUÃ PINHEIRO"],
   instrutoria:10080.57,diarias:8400.00,combustivel:3952.18,passagem:0,total:22432.75,participantes:479},
  {semana:7,label:"Semana 7",mes:"Junho",dataInicio:"03/06",dataFim:"07/06",
   municipios:["RUSSAS","QUIXERÉ","JAGUARUANA","ITAIÇABA","PALHANO","ICAPUÍ","ARACATI","FORTIM","BEBERIBE"],
   instrutoria:9494.49,diarias:8400.00,combustivel:3555.83,passagem:0,total:21450.32,participantes:584},
  {semana:8,label:"Semana 8",mes:"Junho",dataInicio:"24/06",dataFim:"28/06",
   municipios:["CAMPOS SALES","SALITRE","ANTONINA DO NORTE","AIUABA","ARNEIROZ","SABOEIRO","TAUÁ","PARAMBU","QUITERIANÓPOLIS"],
   instrutoria:9494.49,diarias:8920.00,combustivel:4749.83,passagem:0,total:23164.32,participantes:434},
];

const MESES = ["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtNum(n) {
  if (n >= 1000) return n.toLocaleString("pt-BR");
  return String(n);
}
function fmtBRL(n) {
  return "R$ " + (n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
}

export default function TCEduc2024Dashboard({ onBack }) {
  const [filtroSemana, setFiltroSemana] = useState("todas");
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos");

  const limpar = () => { setFiltroSemana("todas"); setFiltroMes("todos"); setFiltroMunicipio("todos"); };
  const temFiltro = filtroSemana!=="todas"||filtroMes!=="todos"||filtroMunicipio!=="todos";

  const dadosFiltrados = MUNICIPIOS_2024.filter(r => {
    if (filtroSemana !== "todas" && r.semana !== parseInt(filtroSemana)) return false;
    if (filtroMes !== "todos" && r.mes !== parseInt(filtroMes)) return false;
    if (filtroMunicipio !== "todos" && r.municipio !== filtroMunicipio) return false;
    return true;
  });

  const semanasFiltradas = SEMANAS_2024.filter(s => {
    if (filtroSemana !== "todas" && s.semana !== parseInt(filtroSemana)) return false;
    if (filtroMes !== "todos") {
      const mesNum = {"Fevereiro":2,"Março":3,"Abril":4,"Maio":5,"Junho":6}[s.mes]||0;
      if (mesNum !== parseInt(filtroMes)) return false;
    }
    return true;
  });

  const municipiosVisitados = new Set(dadosFiltrados.map(r => r.municipio)).size;
  const totalNLL = dadosFiltrados.reduce((s,r) => s+r.nll, 0);
  const totalConselhos = dadosFiltrados.reduce((s,r) => s+r.conselhos, 0);
  const totalCapacitados = totalNLL + totalConselhos;
  const custoTotal = semanasFiltradas.reduce((s,v) => s+v.total, 0);
  const custoPorAluno = totalCapacitados > 0 ? custoTotal/totalCapacitados : 0;
  const mediaNLLMun = municipiosVisitados > 0 ? (totalNLL/municipiosVisitados).toFixed(2) : "0";
  const sedesConselhos = dadosFiltrados.filter(r => r.conselhos > 0).length;
  const mediaConsReg = sedesConselhos > 0 ? (totalConselhos/sedesConselhos).toFixed(2) : "0";

  const mesesDisp = [...new Set(SEMANAS_2024.map(s => ({"Fevereiro":2,"Março":3,"Abril":4,"Maio":5,"Junho":6}[s.mes]||0)))].sort((a,b)=>a-b);

  const cardStyle = (bg) => ({ background:bg||"#fff", borderRadius:14, padding:"16px 18px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" });
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
          <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, fontWeight:600 }}>Ano: 2024</div>
        </div>

        {/* FILTROS */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", paddingBottom:12 }}>
          <select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}
            style={{ background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:600,outline:"none",cursor:"pointer" }}>
            <option value="todos" style={{ color:"#1B3F7A",background:"#fff" }}>Mês ▼</option>
            {mesesDisp.map(m=><option key={m} value={m} style={{ color:"#1B3F7A",background:"#fff" }}>{MESES[m]}</option>)}
          </select>

          <select value={filtroMunicipio} onChange={e=>setFiltroMunicipio(e.target.value)}
            style={{ background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:600,outline:"none",cursor:"pointer" }}>
            <option value="todos" style={{ color:"#1B3F7A",background:"#fff" }}>Município ▼</option>
            {[...MUNICIPIOS_2024].sort((a,b)=>a.municipio.localeCompare(b.municipio)).map(r=>(
              <option key={r.municipio} value={r.municipio} style={{ color:"#1B3F7A",background:"#fff" }}>{r.municipio}</option>
            ))}
          </select>

          <select value={filtroSemana} onChange={e=>setFiltroSemana(e.target.value)}
            style={{ background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:600,outline:"none",cursor:"pointer" }}>
            <option value="todas" style={{ color:"#1B3F7A",background:"#fff" }}>Viagem ▼</option>
            {SEMANAS_2024.map(s=><option key={s.semana} value={s.semana} style={{ color:"#1B3F7A",background:"#fff" }}>{s.label} — {s.mes}</option>)}
          </select>

          {temFiltro && (
            <div onClick={limpar} style={{ background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer" }}>
              ✕ Limpar
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:"20px 20px 60px", maxWidth:1200, margin:"0 auto" }}>

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
              <div style={{ fontWeight:900, fontSize:26, color:"#fff" }}>{fmtNum(totalCapacitados)}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Capacitados</div>
            </div>
            <div style={{ background:"#059669", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:22, color:"#fff" }}>100%</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Conclusão</div>
            </div>
            <div style={{ background:"#ec4899", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:14, color:"#fff" }}>{fmtBRL(custoTotal)}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>Custo Total</div>
            </div>
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
                <div style={bigNum("#222")}>{fmtNum(totalCapacitados)}</div>
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
                <div style={bigNum("#222")}>{semanasFiltradas.length}</div>
                <div style={lbl()}>Viagens realizadas</div>
              </div>
              <div style={cardStyle()}>
                <div style={bigNum("#222")}>{fmtNum(Math.round(totalCapacitados / (municipiosVisitados||1)))}</div>
                <div style={lbl()}>Média por município</div>
              </div>
              <div style={cardStyle()}>
                <div style={{ fontWeight:900, fontSize:26, color:"#222", lineHeight:1, marginBottom:4 }}>{fmtBRL(custoPorAluno)}</div>
                <div style={lbl()}>Custo por capacitado</div>
              </div>
            </div>
            {/* Linha 3: NLL + Conselhos */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ ...cardStyle("#e8f4ff"), border:"none" }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:10, borderBottom:"2px solid #1B3F7A", paddingBottom:6 }}>Nova Lei de Licitações</div>
                <div style={{ fontWeight:700, fontSize:11, color:"#888", marginBottom:4 }}>Participantes</div>
                <div style={bigNum("#1B3F7A")}>{fmtNum(totalNLL)}</div>
                <div style={{ marginTop:10, fontWeight:700, fontSize:11, color:"#888" }}>Média por município</div>
                <div style={{ fontWeight:900, fontSize:24, color:"#1B3F7A" }}>{mediaNLLMun}</div>
                <div style={{ marginTop:6, fontSize:11, color:"#888" }}>
                  Todos os {municipiosVisitados} municípios
                </div>
              </div>
              <div style={{ ...cardStyle("#fce4ec"), border:"none" }}>
                <div style={{ fontWeight:800, fontSize:15, color:"#c2185b", marginBottom:10, borderBottom:"2px solid #c2185b", paddingBottom:6 }}>Cidadania e Controle Social</div>
                <div style={{ fontWeight:700, fontSize:11, color:"#888", marginBottom:4 }}>Participantes</div>
                <div style={{ fontWeight:900, fontSize:32, color:"#c2185b", lineHeight:1 }}>{fmtNum(totalConselhos)}</div>
                <div style={{ marginTop:10, fontWeight:700, fontSize:11, color:"#888" }}>Média por sede</div>
                <div style={{ fontWeight:900, fontSize:24, color:"#c2185b" }}>{mediaConsReg}</div>
                <div style={{ marginTop:6, fontSize:11, color:"#888" }}>
                  {sedesConselhos} municípios sede ★
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABELA POR MUNICÍPIO */}
        <div style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", marginBottom:14, overflowX:"auto" }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>📋 Participantes por Município</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#1a6b78", color:"#fff" }}>
                <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Município</th>
                <th style={{ padding:"8px 10px", textAlign:"center", fontWeight:700 }}>Viagem</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>NLL</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Conselhos</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.sort((a,b)=>a.municipio.localeCompare(b.municipio)).map((r,i) => (
                <tr key={r.municipio} style={{ background:i%2===0?"#fff":"#f8f9fb", borderBottom:"1px solid #e8edf2" }}>
                  <td style={{ padding:"7px 10px", fontWeight:600 }}>
                    {r.municipio}
                    {r.conselhos > 0 && <span style={{ marginLeft:6, color:"#c2185b", fontSize:11 }}>★</span>}
                  </td>
                  <td style={{ padding:"7px 10px", textAlign:"center", color:"#888" }}>Sem. {r.semana}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, color:"#1B3F7A" }}>{r.nll}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700, color:r.conselhos>0?"#c2185b":"#ddd" }}>{r.conselhos>0?r.conselhos:"—"}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700 }}>{r.nll + r.conselhos}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr style={{ background:"#1a6b78" }}>
                <td colSpan={2} style={{ padding:"8px 10px", fontWeight:800, color:"#fff", fontSize:13 }}>TOTAL</td>
                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:900, color:"#fff", fontSize:14 }}>{fmtNum(totalNLL)}</td>
                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:900, color:"#fff", fontSize:14 }}>{fmtNum(totalConselhos)}</td>
                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:900, color:"#fff", fontSize:14 }}>{fmtNum(totalCapacitados)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop:10, fontSize:11, color:"#888" }}>★ Município sede do Curso de Cidadania e Controle Social dos Conselhos de Políticas Públicas</div>
        </div>

        {/* CUSTOS POR VIAGEM */}
        <div style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", overflowX:"auto" }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:14 }}>💰 Investimento por Viagem</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#1a6b78", color:"#fff" }}>
                <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Viagem</th>
                <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Período</th>
                <th style={{ padding:"8px 10px", textAlign:"left", fontWeight:700 }}>Municípios</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Instrutoria</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Diárias</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Combustível</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Part.</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>Total</th>
                <th style={{ padding:"8px 10px", textAlign:"right", fontWeight:700 }}>R$/Part.</th>
              </tr>
            </thead>
            <tbody>
              {semanasFiltradas.map((s,i) => (
                <tr key={s.semana} style={{ background:i%2===0?"#fff":"#f8f9fb", borderBottom:"1px solid #e8edf2" }}>
                  <td style={{ padding:"7px 10px", fontWeight:700, color:"#1B3F7A" }}>{s.label}</td>
                  <td style={{ padding:"7px 10px", color:"#555" }}>{s.dataInicio} — {s.dataFim}/{s.semana<=2?"2024":""}</td>
                  <td style={{ padding:"7px 10px", color:"#555", fontSize:11 }}>{s.municipios.slice(0,3).join(", ")}{s.municipios.length>3?" +"+( s.municipios.length-3):""}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right" }}>{fmtBRL(s.instrutoria)}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right" }}>{fmtBRL(s.diarias)}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right" }}>{fmtBRL(s.combustivel)}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700 }}>{s.participantes}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right", fontWeight:700 }}>{fmtBRL(s.total)}</td>
                  <td style={{ padding:"7px 10px", textAlign:"right", color:"#E8730A", fontWeight:700 }}>{fmtBRL(s.total/s.participantes)}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr style={{ background:"#1a6b78" }}>
                <td colSpan={3} style={{ padding:"8px 10px", fontWeight:800, color:"#fff" }}>TOTAL</td>
                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:900, color:"#fff" }}>{fmtBRL(semanasFiltradas.reduce((s,v)=>s+v.instrutoria,0))}</td>
                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:900, color:"#fff" }}>{fmtBRL(semanasFiltradas.reduce((s,v)=>s+v.diarias,0))}</td>
                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:900, color:"#fff" }}>{fmtBRL(semanasFiltradas.reduce((s,v)=>s+v.combustivel,0))}</td>
                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:900, color:"#fff" }}>{fmtNum(semanasFiltradas.reduce((s,v)=>s+v.participantes,0))}</td>
                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:900, color:"#fff" }}>{fmtBRL(custoTotal)}</td>
                <td style={{ padding:"8px 10px", textAlign:"right", fontWeight:900, color:"#fff" }}>{fmtBRL(custoPorAluno)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
