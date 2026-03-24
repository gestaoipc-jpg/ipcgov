import { useState, useEffect, useRef, useCallback } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const ADMINS = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"];
const MUNICIPIOS_CE = ["Abaiara", "Acarape", "Acaraú", "Acopiara", "Aiuaba", "Alcântaras", "Altaneira", "Alto Santo", "Amontada", "Antonina do Norte", "Apuiarés", "Aquiraz", "Aracati", "Aracoiaba", "Ararendá", "Araripe", "Aratuba", "Arneiroz", "Assaré", "Aurora", "Baixio", "Banabuiú", "Barbalha", "Barreira", "Barro", "Barroquinha", "Baturité", "Beberibe", "Bela Cruz", "Boa Viagem", "Brejo Santo", "Camocim", "Campos Sales", "Canindé", "Capistrano", "Caridade", "Caririaçu", "Cariré", "Cariús", "Carnaubal", "Cascavel", "Catarina", "Catunda", "Caucaia", "Cedro", "Chaval", "Chorozinho", "Choró", "Coreaú", "Crateús", "Crato", "Croatá", "Cruz", "Dep. Irapuã Pinheiro", "Ereré", "Eusébio", "Farias Brito", "Forquilha", "Fortaleza", "Fortim", "Frecheirinha", "General Sampaio", "Granja", "Granjeiro", "Graça", "Groaíras", "Guaiúba", "Guaraciaba do Norte", "Guaramiranga", "Hidrolândia", "Horizonte", "Ibaretama", "Ibiapina", "Ibicuitinga", "Icapuí", "Icó", "Iguatu", "Independência", "Ipaporanga", "Ipaumirim", "Ipu", "Ipueiras", "Iracema", "Irauçuba", "Itaitinga", "Itaiçaba", "Itapajé", "Itapipoca", "Itapiúna", "Itarema", "Itatira", "Jaguaretama", "Jaguaribara", "Jaguaribe", "Jaguaruana", "Jardim", "Jati", "Jijoca de Jericoacoara", "Juazeiro do Norte", "Jucás", "Lavras da Mangabeira", "Limoeiro do Norte", "Madalena", "Maracanaú", "Maranguape", "Marco", "Martinópole", "Massapê", "Mauriti", "Meruoca", "Milagres", "Milhã", "Miraíma", "Missão Velha", "Mombaça", "Monsenhor Tabosa", "Morada Nova", "Moraújo", "Morrinhos", "Mucambo", "Mulungu", "Nova Olinda", "Nova Russas", "Novo Oriente", "Ocara", "Orós", "Pacajus", "Pacatuba", "Pacoti", "Pacujá", "Palhano", "Palmácia", "Paracuru", "Paraipaba", "Parambu", "Paramoti", "Pedra Branca", "Penaforte", "Pentecoste", "Pereiro", "Pindoretama", "Piquet Carneiro", "Pires Ferreira", "Poranga", "Porteiras", "Potengi", "Potiretama", "Quiterianópolis", "Quixadá", "Quixelô", "Quixeramobim", "Quixeré", "Redenção", "Reriutaba", "Russas", "Saboeiro", "Salitre", "Santa Quitéria", "Santana do Acaraú", "Santana do Cariri", "Senador Pompeu", "Senador Sá", "Sobral", "Solonópole", "São Benedito", "São Gonçalo do Amarante", "São João do Jaguaribe", "São Luís do Curu", "Tabuleiro do Norte", "Tamboril", "Tarrafas", "Tauá", "Tejuçuoca", "Tianguá", "Trairi", "Tururu", "Ubajara", "Umirim", "Uruburetama", "Uruoca", "Varjota", "Viçosa do Ceará", "Várzea Alegre"];
const CREDES_LIST = ["CREDE 1", "CREDE 2", "CREDE 3", "CREDE 4", "CREDE 5", "CREDE 6", "CREDE 7", "CREDE 8", "CREDE 9", "CREDE 10", "CREDE 11", "CREDE 12", "CREDE 13", "CREDE 14", "CREDE 15", "CREDE 16", "CREDE 17", "CREDE 18", "CREDE 19", "CREDE 20", "SEFOR 1", "SEFOR 2", "SEFOR 3", "SEFOR 4"];

function normMun(s) {
  return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").trim();
}

function fmtNum(n) {
  if (!n && n !== 0) return "0";
  return Number(n).toLocaleString("pt-BR");
}

function BarChart({ data }) {
  if (!data || data.length === 0) return <div style={{ color:"#aaa", textAlign:"center", padding:20 }}>Sem dados</div>;
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {data.map((d,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:140, fontSize:11, color:"#555", textAlign:"right", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.label}</div>
          <div style={{ flex:1, background:"#f0f4ff", borderRadius:4, height:20, overflow:"hidden" }}>
            <div style={{ width: max > 0 ? (d.value/max*100)+"%" : "0%", height:"100%", background:"linear-gradient(90deg,#1B3F7A,#0891b2)", borderRadius:4, display:"flex", alignItems:"center", paddingLeft:6, transition:"width 0.4s" }}>
              {d.value > max*0.15 && <span style={{ fontSize:10, color:"#fff", fontWeight:700 }}>{fmtNum(d.value)}</span>}
            </div>
          </div>
          {d.value <= max*0.15 && <span style={{ fontSize:10, color:"#888", minWidth:30 }}>{fmtNum(d.value)}</span>}
        </div>
      ))}
    </div>
  );
}

function CearaMapOlimpiadas({ geoData, mapLoading, escolas, setTooltip }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w:0, h:0 });
  const [d3Ready, setD3Ready] = useState(false);

  useEffect(() => {
    if (!document.getElementById("d3-olimpiadas")) {
      const s = document.createElement("script");
      s.id = "d3-olimpiadas";
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js";
      document.head.appendChild(s);
    }
    const check = setInterval(() => { if (window.d3) { setD3Ready(true); clearInterval(check); } }, 100);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!d3Ready || !geoData || !svgRef.current || dims.w < 10) return;
    const d3 = window.d3;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = dims.w, H = dims.h;
    const proj = d3.geoMercator().fitExtent([[10,10],[W-10,H-10]], geoData);
    const path = d3.geoPath().projection(proj);

    // Build municipio map
    const munMap = {};
    escolas.forEach(e => {
      if (!e.municipio) return;
      const k = normMun(e.municipio);
      if (!munMap[k]) munMap[k] = { alunos:0, escolas:0, municipio: e.municipio };
      munMap[k].alunos += parseInt(e.alunosInscritos)||0;
      munMap[k].escolas += 1;
    });

    svg.selectAll("path").data(geoData.features).join("path")
      .attr("d", path)
      .attr("fill", feat => {
        const nm = normMun(feat.properties?.NM_MUN || feat.properties?.name || "");
        return munMap[nm] ? "#1B3F7A" : "#e8eef8";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .style("cursor", feat => {
        const nm = normMun(feat.properties?.NM_MUN || feat.properties?.name || "");
        return munMap[nm] ? "pointer" : "default";
      })
      .on("mousemove", (event, feat) => {
        const nm = normMun(feat.properties?.NM_MUN || feat.properties?.name || "");
        const info = munMap[nm];
        setTooltip({ nome: feat.properties?.NM_MUN || feat.properties?.name, info, x: event.clientX, y: event.clientY });
      })
      .on("mouseleave", () => setTooltip(null));

  }, [d3Ready, geoData, dims, escolas]);

  if (mapLoading) return <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando mapa...</div>;

  return (
    <div ref={containerRef} style={{ width:"100%", height:"100%" }}>
      <svg ref={svgRef} width={dims.w} height={dims.h} style={{ display:"block" }}/>
    </div>
  );
}

export default function OlimpiadasDashboard({ user, onBack }) {
  const [escolas, setEscolas] = useState([]);
  const [metas, setMetas] = useState({});
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [aba, setAba] = useState("mapa"); // "mapa" | "indicadores"
  const [filtroEdicao, setFiltroEdicao] = useState(2026);
  const [filtroCrede, setFiltroCrede] = useState("todas");
  const [filtroMunicipio, setFiltroMunicipio] = useState("todos");
  const [editandoMetas, setEditandoMetas] = useState(false);
  const [metasForm, setMetasForm] = useState({});

  const isAdmin = ADMINS.includes(user?.email);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "olimpiadas_escolas")),
      getDoc(doc(db, "olimpiadas_config", "metas")),
      fetch("https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-23-mun.json").then(r=>r.json()),
    ]).then(([snap, metasDoc, geo]) => {
      setEscolas(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      setMetas(metasDoc.exists() ? metasDoc.data() : {});
      setGeoData(geo);
      setMapLoading(false);
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); setMapLoading(false); });
  }, []);

  const salvarMetas = async () => {
    await setDoc(doc(db, "olimpiadas_config", "metas"), { ...metas, ...metasForm });
    setMetas(m => ({ ...m, ...metasForm }));
    setEditandoMetas(false);
  };

  // Filtered data
  const escolasFiltradas = escolas.filter(e => {
    if (filtroEdicao && e.edicao !== filtroEdicao) return false;
    if (filtroCrede !== "todas" && e.crede !== filtroCrede) return false;
    if (filtroMunicipio !== "todos" && e.municipio !== filtroMunicipio) return false;
    return true;
  });

  // Stats
  const totalAlunos = escolasFiltradas.reduce((s,e) => s + (parseInt(e.alunosInscritos)||0), 0);
  const totalProfs = escolasFiltradas.reduce((s,e) => s + (parseInt(e.professoresResponsaveis)||0), 0);
  const totalMunicipios = new Set(escolasFiltradas.map(e=>e.municipio).filter(Boolean)).size;
  const totalCredes = new Set(escolasFiltradas.map(e=>e.crede).filter(Boolean)).size;
  const eemtiPart = escolasFiltradas.filter(e => (e.nomeEscola||"").startsWith("EEMTI")).length;

  // EEMTI não participantes em 2026 (participaram em outros anos)
  const eemtiAnterior = new Set(escolas.filter(e => e.edicao !== 2026 && (e.nomeEscola||"").startsWith("EEMTI")).map(e=>e.nomeEscola));
  const eemtiAtual2026 = new Set(escolas.filter(e => e.edicao === 2026 && (e.nomeEscola||"").startsWith("EEMTI")).map(e=>e.nomeEscola));
  const eemtiNaoPart = [...eemtiAnterior].filter(n => !eemtiAtual2026.has(n));

  // Escolas sem participação na edição atual
  const escolasNaoEdicao = eemtiNaoPart.length;

  // Bar chart por município
  const porMunicipio = Object.entries(
    escolasFiltradas.reduce((acc, e) => {
      if (!e.municipio) return acc;
      if (!acc[e.municipio]) acc[e.municipio] = 0;
      acc[e.municipio] += parseInt(e.alunosInscritos)||0;
      return acc;
    }, {})
  ).sort((a,b) => b[1]-a[1]).map(([label,value]) => ({ label, value }));

  // Metas da edição
  const metaEd = metas[filtroEdicao] || {};
  const metaKey = (field) => `${filtroEdicao}_${field}`;

  const sel = { background:"#fff", border:"none", borderRadius:10, padding:"7px 14px", fontSize:12, color:"#555", fontWeight:600, cursor:"pointer", boxShadow:"0 2px 8px rgba(27,63,122,0.08)", outline:"none" };

  return (
    <div style={{ minHeight:"100vh", background:"#f0f2f5", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"0" }}>
        <div style={{ padding:"14px 28px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div onClick={onBack} style={{ width:36,height:36,background:"rgba(255,255,255,0.15)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:18 }}>←</div>
            <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>🏆 Olímpiadas — Dashboard</div>
          </div>

          {/* ABAS */}
          <div style={{ display:"flex", gap:0 }}>
            {[{id:"mapa",l:"🗺️ Mapa"},{id:"indicadores",l:"📊 Indicadores"}].map(a => (
              <div key={a.id} onClick={()=>setAba(a.id)}
                style={{ padding:"10px 24px", fontWeight:700, fontSize:13, cursor:"pointer", borderRadius:"12px 12px 0 0",
                  background: aba===a.id ? "#f0f2f5" : "rgba(255,255,255,0.15)",
                  color: aba===a.id ? "#1B3F7A" : "rgba(255,255,255,0.85)" }}>
                {a.l}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 24px 60px", maxWidth:1400, margin:"0 auto" }}>

        {/* FILTROS */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20, background:"#fff", borderRadius:14, padding:"12px 16px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display:"flex", gap:4 }}>
            {[2024,2025,2026].map(ed => (
              <div key={ed} onClick={()=>setFiltroEdicao(ed)}
                style={{ background:filtroEdicao===ed?"#1B3F7A":"#f0f4ff", color:filtroEdicao===ed?"#fff":"#555", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>{ed}ª Ed.</div>
            ))}
          </div>
          <select value={filtroCrede} onChange={e=>setFiltroCrede(e.target.value)} style={sel}>
            <option value="todas">Todas as CREDEs</option>
            {CREDES_LIST.map(cr => <option key={cr} value={cr}>{cr}</option>)}
          </select>
          <select value={filtroMunicipio} onChange={e=>setFiltroMunicipio(e.target.value)} style={sel}>
            <option value="todos">Todos municípios</option>
            {MUNICIPIOS_CE.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {(filtroCrede!=="todas"||filtroMunicipio!=="todos") && (
            <div onClick={()=>{setFiltroCrede("todas");setFiltroMunicipio("todos");}} style={{ background:"#fee2e2", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>✕ Limpar</div>
          )}
        </div>

        {/* ABA MAPA */}
        {aba === "mapa" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20, height:520 }}>
            {/* MAPA */}
            <div style={{ background:"#fff", borderRadius:20, padding:16, boxShadow:"0 2px 16px rgba(27,63,122,0.08)" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#1B3F7A", marginBottom:10 }}>
                🗺️ Municípios participantes — {filtroEdicao}
                <span style={{ marginLeft:10, fontSize:12, fontWeight:600, color:"#0891b2" }}>{totalMunicipios} município{totalMunicipios!==1?"s":""}</span>
              </div>
              <div style={{ height:"calc(100% - 36px)" }}>
                <CearaMapOlimpiadas geoData={geoData} mapLoading={mapLoading} escolas={escolasFiltradas} setTooltip={setTooltip}/>
              </div>
            </div>
            {/* LEGENDA + TOP */}
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:10 }}>Legenda</div>
                <div style={{ display:"flex", gap:8, alignItems:"center", fontSize:12 }}>
                  <div style={{ width:16,height:16,borderRadius:3,background:"#1B3F7A",flexShrink:0 }}/>
                  <span style={{ color:"#555" }}>Município participante</span>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", fontSize:12, marginTop:6 }}>
                  <div style={{ width:16,height:16,borderRadius:3,background:"#e8eef8",border:"1px solid #aaa",flexShrink:0 }}/>
                  <span style={{ color:"#555" }}>Sem participação</span>
                </div>
              </div>
              <div style={{ background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 10px rgba(0,0,0,0.06)", flex:1, overflow:"hidden" }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:10 }}>Top municípios por alunos</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {porMunicipio.slice(0,8).map((d,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11 }}>
                      <span style={{ color:"#1B3F7A", fontWeight:700, minWidth:16 }}>{i+1}.</span>
                      <span style={{ flex:1, color:"#555", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.label}</span>
                      <span style={{ fontWeight:800, color:"#0891b2" }}>{fmtNum(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA INDICADORES */}
        {aba === "indicadores" && (
          <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>

            {/* SIDEBAR RESULTADOS CHAVE */}
            <div style={{ width:200, flexShrink:0, background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontWeight:800, fontSize:13, color:"#1B3F7A" }}>Resultados<br/>Chave</div>
                {isAdmin && (
                  <div onClick={()=>{ setMetasForm({...metas}); setEditandoMetas(!editandoMetas); }}
                    style={{ fontSize:11, color:"#0891b2", cursor:"pointer", fontWeight:700 }}>
                    {editandoMetas ? "✕" : "✏️"}
                  </div>
                )}
              </div>
              {[
                { key:"municipios", label:"Municípios", cor:"#1B3F7A", icon:"📍" },
                { key:"alunos", label:"Alunos", cor:"#0891b2", icon:"👨‍🎓" },
                { key:"escolas", label:"Escolas", cor:"#059669", icon:"🏫" },
                { key:"professores", label:"Professores", cor:"#7c3aed", icon:"👨‍🏫" },
              ].map(rc => {
                const metaVal = metas[`${filtroEdicao}_${rc.key}`] || "—";
                return (
                  <div key={rc.key} style={{ background:rc.cor, borderRadius:12, padding:"10px 10px", textAlign:"center", marginBottom:8 }}>
                    {editandoMetas ? (
                      <input type="number" value={metasForm[`${filtroEdicao}_${rc.key}`]||""} 
                        onChange={e=>setMetasForm(m=>({...m,[`${filtroEdicao}_${rc.key}`]:parseInt(e.target.value)||0}))}
                        placeholder="Meta" style={{ width:"100%", textAlign:"center", background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.4)", borderRadius:6, padding:"4px", fontSize:13, color:"#fff", fontWeight:700, outline:"none" }}/>
                    ) : (
                      <div style={{ fontWeight:900, fontSize:22, color:"#fff" }}>{fmtNum(metaVal)}</div>
                    )}
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.85)", fontWeight:600 }}>{rc.icon} {rc.label}</div>
                  </div>
                );
              })}
              {editandoMetas && (
                <div onClick={salvarMetas} style={{ background:"#E8730A", borderRadius:10, padding:"8px", textAlign:"center", fontSize:12, fontWeight:700, color:"#fff", cursor:"pointer", marginTop:4 }}>💾 Salvar</div>
              )}
            </div>

            {/* KPIs + GRÁFICO */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12 }}>
              {/* Linha 1 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                {[
                  { label:"Alunos Inscritos", value:totalAlunos, cor:"#0891b2", icon:"👨‍🎓" },
                  { label:"EEMTI participantes", value:eemtiPart, cor:"#1B3F7A", icon:"🏫" },
                  { label:"Municípios participantes", value:totalMunicipios, cor:"#059669", icon:"📍" },
                ].map((k,i) => (
                  <div key={i} style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)", textAlign:"center" }}>
                    <div style={{ fontSize:24 }}>{k.icon}</div>
                    <div style={{ fontWeight:900, fontSize:32, color:k.cor, lineHeight:1.1, margin:"6px 0" }}>{fmtNum(k.value)}</div>
                    <div style={{ fontSize:12, color:"#888", fontWeight:600 }}>{k.label}</div>
                  </div>
                ))}
              </div>
              {/* Linha 2 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                {[
                  { label:"Professores participantes", value:totalProfs, cor:"#7c3aed", icon:"👨‍🏫" },
                  { label:"EEMTI não participantes (2026)", value:eemtiNaoPart.length, cor:"#E8730A", icon:"⚠️" },
                  { label:"CREDEs/SEFOR participantes", value:totalCredes + "/24", cor:"#dc2626", icon:"🏛️" },
                ].map((k,i) => (
                  <div key={i} style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)", textAlign:"center" }}>
                    <div style={{ fontSize:24 }}>{k.icon}</div>
                    <div style={{ fontWeight:900, fontSize:32, color:k.cor, lineHeight:1.1, margin:"6px 0" }}>{typeof k.value === "number" ? fmtNum(k.value) : k.value}</div>
                    <div style={{ fontSize:12, color:"#888", fontWeight:600 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Gráfico barras */}
              <div style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
                <div style={{ fontWeight:800, fontSize:14, color:"#1B3F7A", marginBottom:16 }}>👨‍🎓 Alunos por Município</div>
                {porMunicipio.length === 0 ? (
                  <div style={{ color:"#aaa", textAlign:"center", padding:20 }}>Sem dados de município preenchidos</div>
                ) : (
                  <div style={{ maxHeight:400, overflowY:"auto" }}>
                    <BarChart data={porMunicipio}/>
                  </div>
                )}
              </div>

              {/* Relatório EEMTI não participantes */}
              {eemtiNaoPart.length > 0 && (
                <div style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontWeight:800, fontSize:14, color:"#E8730A", marginBottom:12 }}>⚠️ EEMTI que participaram em edições anteriores mas não em 2026</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {eemtiNaoPart.sort().map((n,i) => (
                      <span key={i} style={{ background:"#fff3e0", border:"1px solid #fcd34d", borderRadius:8, padding:"3px 10px", fontSize:11, color:"#92400e" }}>{n}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TOOLTIP */}
      {tooltip && (
        <div style={{ position:"fixed", left:tooltip.x+12, top:tooltip.y-10, background:"rgba(27,63,122,0.95)", borderRadius:12, padding:"10px 14px", zIndex:1000, pointerEvents:"none", boxShadow:"0 4px 20px rgba(0,0,0,0.3)", maxWidth:220 }}>
          <div style={{ color:"#fff", fontWeight:800, fontSize:13, marginBottom:4 }}>{tooltip.nome}</div>
          {tooltip.info ? (
            <>
              <div style={{ color:"rgba(255,255,255,0.8)", fontSize:11 }}>🏫 {tooltip.info.escolas} escola{tooltip.info.escolas!==1?"s":""}</div>
              <div style={{ color:"rgba(255,255,255,0.8)", fontSize:11 }}>👨‍🎓 {fmtNum(tooltip.info.alunos)} alunos</div>
            </>
          ) : (
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11 }}>Sem participação</div>
          )}
        </div>
      )}
    </div>
  );
}
