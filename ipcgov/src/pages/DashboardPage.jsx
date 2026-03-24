import { useState, useEffect, useRef, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import TCEduc2025Dashboard from "./TCEduc2025Dashboard";
import TCEduc2024Dashboard from "./TCEduc2024Dashboard";
import TCEducDashboardDinamico from "./TCEducDashboardDinamico";

// ─── Normaliza nome para comparação ───────────────────────────────────────────
function normMun(str) {
  return (str || "").toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, "").trim();
}

// ─── Mapa do Ceará com D3 + API IBGE ──────────────────────────────────────────
function CearaMap({ geoData, mapLoading, mapError, municipaisRealizados, municipaisPendentes, evFiltrados, filtroStatus, filtroAno, filtroTipo, viagens, setTooltip }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x:0, y:0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [d3Ready, setD3Ready] = useState(!!window.d3);

  // Mede container real com ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setDims({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    return () => ro.disconnect();
  }, []);

  // Aguarda D3 carregar
  useEffect(() => {
    if (window.d3) { setD3Ready(true); return; }
    const check = setInterval(() => {
      if (window.d3) { setD3Ready(true); clearInterval(check); }
    }, 100);
    return () => clearInterval(check);
  }, []);

  useEffect(() => {
    if (!geoData || !svgRef.current || !d3Ready || dims.w === 0) return;
    const d3 = window.d3;
    const W = dims.w, H = dims.h;

    const projection = d3.geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], geoData);
    const pathGen = d3.geoPath().projection(projection);

    const realizadosNorm = new Set(municipaisRealizados.map(e => normMun(e.municipio || e.regiao)));
    const pendentesNorm  = new Set(municipaisPendentes.map(e => normMun(e.municipio || e.regiao)));

    // Build set de municípios atendidos por regionais — só quando filtro NÃO é Municipal
    const regionaisAtendidos = new Set();
    if (filtroTipo !== "Municipal") {
      (viagens || []).filter(v => {
        if (v.modalidade !== "Regional") return false;
        if (filtroStatus === "todos") return true;
        if (filtroStatus === "Realizado") return v.status === "Realizado" || v.status === "Concluída";
        return v.status === filtroStatus;
      }).forEach(v => {
        (v.municipiosAtendidos || []).forEach(m => regionaisAtendidos.add(normMun(m)));
      });
    }

    const getColor = (feat) => {
      const nm = normMun(feat.properties?.NM_MUN || feat.properties?.name || "");
      if (filtroStatus === "Realizado")  return realizadosNorm.has(nm) ? "#059669" : regionaisAtendidos.has(nm) ? "#a7f3d0" : "#e8eef8";
      if (filtroStatus === "Em Execução") return pendentesNorm.has(nm)  ? "#E8730A" : "#e8eef8";
      if (filtroStatus === "Programado") return pendentesNorm.has(nm)  ? "#7c3aed" : "#e8eef8";
      if (realizadosNorm.has(nm)) return "#059669";
      if (pendentesNorm.has(nm))  return "#E8730A";
      if (regionaisAtendidos.has(nm)) return "#dbeafe";
      return "#e8eef8";
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", W).attr("height", H);

    svg.append("g")
      .selectAll("path")
      .data(geoData.features)
      .join("path")
        .attr("d", pathGen)
        .attr("fill", d => getColor(d))
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.6)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          const nm = d.properties?.NM_MUN || d.properties?.name || "";
          const ev = evFiltrados.find(e => normMun(e.municipio || e.regiao) === normMun(nm));
          const participants = ev ? (ev.modoTotalManual ? (parseInt(ev.totalAprovadosManual)||0) : (ev.acoesEducacionais||[]).reduce((s,a) => s+(parseInt(a.participantes)||0),0)) : 0;
          setTooltip({ nome: nm, status: ev?.status || "Sem evento", data: ev?.data, participantes: participants, x: event.clientX, y: event.clientY });
        })
        .on("mouseleave", () => setTooltip(null));

  }, [geoData, d3Ready, dims, municipaisRealizados, municipaisPendentes, filtroStatus, evFiltrados]);

  return (
    <div ref={containerRef} style={{ position:"relative", background:"#f0f5ff", borderRadius:16, overflow:"hidden", height:480,
        cursor:dragging?"grabbing":"grab", userSelect:"none" }}
      onMouseDown={e => { setDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }}
      onMouseMove={e => { if (dragging && dragStart) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }}
      onMouseUp={() => { setDragging(false); setDragStart(null); }}
      onMouseLeave={() => { setDragging(false); setDragStart(null); }}
      onWheel={e => { e.preventDefault(); setZoom(z => Math.min(6, Math.max(0.5, z - e.deltaY * 0.001))); }}
    >
      <div style={{ transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin:"center center",
          position:"absolute", inset:0, transition:dragging?"none":"transform 0.15s" }}>
        <svg ref={svgRef} style={{ display:"block" }} />
      </div>

      {(mapLoading || !d3Ready || dims.w === 0) && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
            color:"#aaa", fontSize:14, flexDirection:"column", gap:10, background:"#f0f5ff" }}>
          <div style={{ fontSize:36 }}>🗺️</div>
          <div>Carregando mapa do Ceará...</div>
        </div>
      )}
      {mapError && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
            color:"#dc2626", fontSize:13, flexDirection:"column", gap:8 }}>
          <div style={{ fontSize:28 }}>⚠️</div>
          <div>Erro ao carregar mapa. Verifique a conexão.</div>
        </div>
      )}

      <div style={{ position:"absolute", bottom:14, right:14, display:"flex", flexDirection:"column", gap:6, zIndex:10 }}>
        <div onClick={() => setZoom(z => Math.min(6, z+0.3))} style={{ width:36,height:36,background:"#fff",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.15)",fontSize:20,fontWeight:700,color:"#1B3F7A",userSelect:"none" }}>+</div>
        <div onClick={() => { setZoom(1); setPan({x:0,y:0}); }} style={{ width:36,height:36,background:"#fff",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.15)",fontSize:13,fontWeight:700,color:"#1B3F7A",userSelect:"none" }}>⊙</div>
        <div onClick={() => setZoom(z => Math.max(0.5, z-0.3))} style={{ width:36,height:36,background:"#fff",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.15)",fontSize:20,fontWeight:700,color:"#1B3F7A",userSelect:"none" }}>−</div>
      </div>
      <div style={{ position:"absolute", bottom:14, left:14, background:"rgba(255,255,255,0.9)", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A", zIndex:10 }}>{Math.round(zoom*100)}%</div>
    </div>
  );
}


const normalizar = (s) => (s || "").toUpperCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();

function formatDate(d) {
  if (!d) return "—";
  const [y,m,day] = d.split("-");
  return `${day}/${m}`;
}
function daysUntil(d) {
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

export default function DashboardPage({ onBack }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroAno, setFiltroAno] = useState("todos");
  const [filtroMapa, setFiltroMapa] = useState("realizados");
  const [filtroRegiao, setFiltroRegiao] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [tooltip, setTooltip] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    loadEventos();
    if (!window.d3) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js";
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    setMapLoading(true);
    setMapError(false);
    fetch("https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-23-mun.json")
      .then(r => r.json())
      .then(data => { setGeoData(data); setMapLoading(false); })
      .catch(() => { setMapError(true); setMapLoading(false); });
  }, []);

  const [viagens, setViagens] = useState([]);

  const loadEventos = async () => {
    setLoading(true);
    try {
      const [evSnap, vSnap] = await Promise.all([
        getDocs(collection(db, "tceduc_eventos")),
        getDocs(collection(db, "tceduc_viagens")),
      ]);
      setEventos(evSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setViagens(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const evFiltrados = eventos.filter(e => {
    if (filtroAno !== "todos" && !(e.data && e.data.startsWith(filtroAno))) return false;
    if (filtroStatus !== "todos") {
      const st = e.status || "";
      if (filtroStatus === "Realizado" && st !== "Realizado" && st !== "Concluído" && st !== "Concluída") return false;
      if (filtroStatus !== "Realizado") {
        const match = st === filtroStatus ||
          (filtroStatus === "Programado" && (st === "Programado" || st === "Programada")) ||
          (filtroStatus === "Em Execução" && st === "Em Execução");
        if (!match) return false;
      }
    }
    if (filtroTipo !== "todos" && e.tipo !== filtroTipo) return false;
    return true;
  });

  const municipaisRealizados = evFiltrados.filter(e => e.tipo === "Municipal" && (e.status === "Realizado" || e.status === "Concluído"));

  // Regionais: baseado nas viagens com modalidade Regional
  const viagensRegionais = viagens.filter(v => v.modalidade === "Regional");
  const viagensRegionaisRealizadas = viagensRegionais.filter(v => v.status === "Realizado" || v.status === "Concluída" || v.status === "Realizada");
  const viagensRegionaisProgramadas = viagensRegionais.filter(v => v.status === "Programado" || v.status === "Programada" || v.status === "Em Execução");
  const regionaisRealizados = evFiltrados.filter(e => e.tipo === "Regional" && (e.status === "Realizado" || e.status === "Concluído" || e.status === "Concluída"));
  const totalRegionaisCadastradas = viagensRegionais.length || regionaisRealizados.length;
  const municipaisPendentes = evFiltrados.filter(e => e.tipo === "Municipal" && (e.status === "Pendente" || e.status === "Programado" || e.status === "Em Execução"));

  const getEvCapacitados = (e) => {
    if (e.modoTotalManual) return parseInt(e.totalAprovadosManual) || 0;
    // fallback: se tem totalAprovadosManual preenchido mesmo sem flag, usa ele
    const porAcao = (e.acoesEducacionais || []).reduce((s, a) => s + (parseInt(a.participantes) || 0), 0);
    if (porAcao === 0 && e.totalAprovadosManual) return parseInt(e.totalAprovadosManual) || 0;
    return porAcao;
  };
  const totalCapacitados = evFiltrados.reduce((acc, e) => acc + getEvCapacitados(e), 0);

  const proximosEventos = evFiltrados
    .filter(e => (e.status === "Programado" || e.status === "Em Execução") && e.data && new Date(e.data) >= new Date())
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .slice(0, 5);

  const acoesSummary = {};
  evFiltrados.forEach(e => {
    if (e.modoTotalManual) {
      const key = "Total";
      if (!acoesSummary[key]) acoesSummary[key] = 0;
      acoesSummary[key] += parseInt(e.totalAprovadosManual) || 0;
    } else {
      (e.acoesEducacionais || []).forEach(a => {
        if (!acoesSummary[a.nome]) acoesSummary[a.nome] = 0;
        acoesSummary[a.nome] += parseInt(a.participantes) || 0;
      });
    }
  });
  const acoesOrdenadas = Object.entries(acoesSummary).sort((a,b) => b[1]-a[1]).slice(0,6);
  const maxAcao = acoesOrdenadas[0]?.[1] || 1;


  // Legenda dinâmica baseada nos filtros ativos
  const legendaCores = () => {
    if (filtroStatus === "Realizado")   return [{ cor:"#059669", label:`Realizado (${municipaisRealizados.length})` }, { cor:"#e8eef8", label:"Sem evento", borda:true }];
    if (filtroStatus === "Programado")  return [{ cor:"#7c3aed", label:`Programado` }, { cor:"#e8eef8", label:"Sem evento", borda:true }];
    if (filtroStatus === "Em Execução") return [{ cor:"#E8730A", label:`Em Execução (${municipaisPendentes.length})` }, { cor:"#e8eef8", label:"Sem evento", borda:true }];
    return [
      { cor:"#059669", label:`Realizado (${municipaisRealizados.length})` },
      { cor:"#7c3aed", label:`Programado` },
      { cor:"#E8730A", label:`Pendente/Agendado (${municipaisPendentes.length})` },
      { cor:"#e8eef8", label:`Sem evento (${184 - municipaisRealizados.length})`, borda:true },
    ];
  };

  const s = { fontFamily: "'Montserrat', sans-serif" };

  if (filtroAno === "2024") {
    return <TCEduc2024Dashboard onBack={onBack} />;
  }

  if (filtroAno === "2025") {
    return <TCEduc2025Dashboard onBack={onBack} />;
  }

  if (filtroAno === "2026" || filtroAno === "2027") {
    return <TCEducDashboardDinamico ano={filtroAno} onBack={onBack} />;
  }

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", ...s }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-thumb { background:#1B3F7A44; border-radius:3px; }
        select,input { font-family:'Montserrat',sans-serif; }
      `}</style>

      {/* TOOLTIP */}
      {tooltip && (
        <div style={{
          position:"fixed", left:tooltip.x+14, top:tooltip.y-10, zIndex:9999,
          background:"#1B3F7A", color:"#fff", borderRadius:10, padding:"8px 14px",
          fontSize:12, fontWeight:700, pointerEvents:"none",
          boxShadow:"0 4px 14px rgba(0,0,0,0.3)", lineHeight:1.6,
        }}>
          <div>{tooltip.nome}</div>
          <div style={{opacity:0.7, fontWeight:400}}>
            {tooltip.status}{tooltip.data ? ` · ${formatDate(tooltip.data)}` : ""}
          </div>
          {tooltip.participantes > 0 && <div style={{color:"#E8730A"}}>👥 {tooltip.participantes} capacitados</div>}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 28px" }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>TCEDUC</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📊 Dashboard</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
              {/* Filtro Ano */}
              {[{v:"todos",l:"Todos"},{v:"2024",l:"2024"},{v:"2025",l:"2025"},{v:"2026",l:"2026"},{v:"2027",l:"2027"}].map(a => (
                <div key={a.v} onClick={() => setFiltroAno(a.v)} style={{ background: filtroAno===a.v ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", border:`1px solid ${filtroAno===a.v ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{a.l}</div>
              ))}
              <div style={{ width:1, background:"rgba(255,255,255,0.2)", margin:"0 4px" }}/>
              {/* Filtro Tipo */}
              {[{v:"todos",l:"Municipal + Regional"},{v:"Municipal",l:"Municipal"},{v:"Regional",l:"Regional"}].map(t => (
                <div key={t.v} onClick={() => setFiltroTipo(t.v)} style={{ background: filtroTipo===t.v ? "rgba(232,115,10,0.4)" : "rgba(255,255,255,0.1)", border:`1px solid ${filtroTipo===t.v ? "rgba(232,115,10,0.6)" : "rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{t.l}</div>
              ))}
              <div style={{ width:1, background:"rgba(255,255,255,0.2)", margin:"0 4px" }}/>
              {/* Filtro Status */}
              {[{v:"todos",l:"Todos status"},{v:"Em Execução",l:"Em Execução"},{v:"Programado",l:"Programado"},{v:"Realizado",l:"Realizado / Concluído"}].map(s => (
                <div key={s.v} onClick={() => setFiltroStatus(s.v)} style={{ background: filtroStatus===s.v ? "rgba(5,150,105,0.4)" : "rgba(255,255,255,0.1)", border:`1px solid ${filtroStatus===s.v ? "rgba(5,150,105,0.6)" : "rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{s.l}</div>
              ))}
            </div>
          </div>
          {/* PILLS */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {[
              { label:"Municipais realizados", value:`${municipaisRealizados.length}/184`, accent:false },
              { label:`Regionais${filtroStatus==="Realizado"?" realizados":filtroStatus==="Programado"?" programados":filtroStatus==="Em Execução"?" em execução":" cadastrados"}`, value:`${filtroTipo==="Regional" ? evFiltrados.length : viagensRegionaisRealizadas.length}/${totalRegionaisCadastradas || viagensRegionais.length || "?"}`, accent:false },
              { label:"Pessoas capacitadas", value:totalCapacitados || "0", accent:true },
              { label:"Próximos eventos", value:proximosEventos.length, accent:false },
            ].map((s,i) => (
              <div key={i} style={{ background:s.accent?"rgba(232,115,10,0.25)":"rgba(255,255,255,0.12)", border:s.accent?"1px solid rgba(232,115,10,0.4)":"none", borderRadius:14, padding:"10px 20px" }}>
                <div style={{ color:s.accent?"#E8730A":"#fff", fontWeight:900, fontSize:22 }}>{s.value}</div>
                <div style={{ color:"rgba(255,255,255,0.45)", fontSize:10, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"24px 32px 60px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:24 }}>

          {/* MAPA */}
          <div style={{ background:"#fff", borderRadius:24, padding:24, boxShadow:"0 4px 20px rgba(27,63,122,0.08)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A" }}>🗺️ Cobertura — {filtroAno==="todos"?"Todos os anos":filtroAno}{filtroTipo!=="todos"?` · ${filtroTipo}`:""}{filtroStatus!=="todos"?` · ${filtroStatus}`:""}</div>
                <div style={{ color:"#aaa", fontSize:11, marginTop:3 }}>Passe o mouse sobre o município para ver detalhes</div>
              </div>
            </div>

            {/* LEGENDA DINÂMICA */}
            <div style={{ display:"flex", gap:14, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
              {legendaCores().map((item,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#555" }}>
                  <div style={{ width:13, height:13, borderRadius:3, background:item.cor, border:item.borda?"1px solid #aaa":"none", flexShrink:0 }}/>
                  {item.label}
                </div>
              ))}
              {filtroTipo === "Regional" && (
                <div style={{ fontSize:12, color:"#888", fontStyle:"italic" }}>Mapa exibe apenas municípios — eventos regionais não têm localização no mapa</div>
              )}
            </div>

            {/* MAPA D3 - API IBGE */}
            <CearaMap
              geoData={geoData}
              mapLoading={mapLoading}
              mapError={mapError}
              municipaisRealizados={municipaisRealizados}
              municipaisPendentes={municipaisPendentes}
              evFiltrados={evFiltrados}
              filtroStatus={filtroStatus}
              filtroAno={filtroAno}
              filtroTipo={filtroTipo}
              viagens={viagens}
              setTooltip={setTooltip}
            />
          </div>

          {/* COLUNA DIREITA */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* STATS GRID */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { label:"Municipais", value:`${municipaisRealizados.length}`, sub:`de 184`, cor:"#1B3F7A", pct: (municipaisRealizados.length/184)*100 },
                { label:"Regionais", value:`${viagensRegionaisRealizadas.length}`, sub:`de ${totalRegionaisCadastradas || 7}`, cor:"#E8730A", pct: (viagensRegionaisRealizadas.length/(totalRegionaisCadastradas||7))*100 },
                { label:"Capacitados", value:totalCapacitados, sub:"total", cor:"#059669", pct:null },
                { label:"Agendados", value:municipaisPendentes.length, sub:"municipais", cor:"#7c3aed", pct:null },
              ].map((s,i) => (
                <div key={i} style={{ background:"#fff", borderRadius:18, padding:"16px 18px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)", borderTop:`3px solid ${s.cor}` }}>
                  <div style={{ fontSize:28, fontWeight:900, color:s.cor, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:11, color:"#888", marginTop:4, fontWeight:600, textTransform:"uppercase" }}>{s.label}</div>
                  <div style={{ fontSize:10, color:"#bbb", marginTop:2 }}>{s.sub}</div>
                  {s.pct !== null && (
                    <div style={{ marginTop:8, height:4, background:"#e8edf2", borderRadius:4 }}>
                      <div style={{ height:4, background:s.cor, borderRadius:4, width:`${Math.min(s.pct,100)}%`, transition:"width 0.5s" }}/>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* PRÓXIMOS EVENTOS */}
            <div style={{ background:"#fff", borderRadius:18, padding:20, boxShadow:"0 2px 12px rgba(27,63,122,0.07)" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#1B3F7A", marginBottom:14 }}>Próximos Eventos</div>
              {proximosEventos.length === 0 ? (
                <div style={{ textAlign:"center", color:"#aaa", padding:"20px 0", fontSize:13 }}>Nenhum evento agendado</div>
              ) : proximosEventos.map((ev, i) => {
                const nome = ev.tipo==="Municipal" ? ev.municipio : ev.regiao;
                const days = daysUntil(ev.data);
                return (
                  <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: i < proximosEventos.length-1 ? "1px solid #f0f0f0":"none" }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:days<=7?"#dc262618":"#1B3F7A18", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <div style={{ fontWeight:900, fontSize:15, color:days<=7?"#dc2626":"#1B3F7A", lineHeight:1 }}>{ev.data?.split("-")[2]}</div>
                      <div style={{ fontSize:9, color:days<=7?"#dc2626":"#1B3F7A", fontWeight:600, opacity:0.7, textTransform:"uppercase" }}>
                        {["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"][parseInt(ev.data?.split("-")[1])-1]}
                      </div>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>{nome}</div>
                      <div style={{ color:"#aaa", fontSize:11, marginTop:2 }}>{ev.tipo}</div>
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:days<=7?"#dc2626":days<=15?"#E8730A":"#1B3F7A", background:days<=7?"#fee2e2":days<=15?"#fff3e0":"#f0f4ff", borderRadius:8, padding:"3px 8px" }}>
                      {days}d
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CAPACITADOS POR AÇÃO */}
            <div style={{ background:"#fff", borderRadius:18, padding:20, boxShadow:"0 2px 12px rgba(27,63,122,0.07)" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#1B3F7A", marginBottom:14 }}>Capacitados por Ação</div>
              {acoesOrdenadas.length === 0 ? (
                <div style={{ textAlign:"center", color:"#aaa", padding:"20px 0", fontSize:13 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📊</div>
                  Nenhuma ação educacional registrada ainda
                </div>
              ) : acoesOrdenadas.map(([nome, total], i) => (
                <div key={nome} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#333" }}>{nome}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#1B3F7A" }}>{total}</div>
                  </div>
                  <div style={{ height:6, background:"#e8edf2", borderRadius:6 }}>
                    <div style={{ height:6, borderRadius:6, background: i===0?"#1B3F7A":i===1?"#E8730A":"#059669", width:`${(total/maxAcao)*100}%`, transition:"width 0.5s" }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* PROGRESSO GERAL */}
            <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", borderRadius:18, padding:20, boxShadow:"0 4px 20px rgba(27,63,122,0.2)" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#fff", marginBottom:14 }}>Progresso 2026</div>
              {[
                { label:"Municípios capacitados", atual:municipaisRealizados.length, total:184 },
                { label:"Regionais realizados", atual:viagensRegionaisRealizadas.length, total:totalRegionaisCadastradas||7 },
              ].map((p,i) => (
                <div key={i} style={{ marginBottom: i===0?14:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>{p.label}</div>
                    <div style={{ fontSize:12, color:"#fff", fontWeight:700 }}>{p.atual}/{p.total}</div>
                  </div>
                  <div style={{ height:6, background:"rgba(255,255,255,0.15)", borderRadius:6 }}>
                    <div style={{ height:6, background:"#E8730A", borderRadius:6, width:`${(p.atual/p.total)*100}%`, transition:"width 0.5s" }}/>
                  </div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginTop:4 }}>
                    {p.total-p.atual} {p.label.includes("Municípios")?"municípios":"regionais"} restantes
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
