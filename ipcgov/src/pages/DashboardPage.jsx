import { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const MUNICIPIO_PATH_MAP = {
  "ABAIARA":"path608","ACARAPE":"path8001","ACARAÚ":"path640","ACOPIARA":"path892",
  "AIUABA":"path528","ALCÂNTARAS":"path692","ALTANEIRA":"path598","ALTO SANTO":"path904",
  "AMONTADA":"path662","ANTONINA DO NORTE":"path568","APUIARÉS":"path720","AQUIRAZ":"path742",
  "ARACATI":"path816","ARACOIABA":"path786","ARARENDÁ":"path820","ARARIPE":"path556",
  "ARATUBA":"path780","ARNEIROZ":"path5281","ASSARÉ":"path564","AURORA":"path584",
  "BAIXIO":"path592","BANABUIÚ":"path866","BARBALHA":"path602","BARREIRA":"path800",
  "BARRO":"path624","BARROQUINHA":"path6341","BATURITÉ":"path7861","BEBERIBE":"path812",
  "BELA CRUZ":"path652","BOA VIAGEM":"path862","BREJO SANTO":"path620","CAMOCIM":"path636",
  "CAMPOS SALES":"path566","CANINDÉ":"path770","CAPISTRANO":"path7821","CARIDADE":"path7701",
  "CARIRIAÇU":"path586","CARIRÉ":"path702","CARIÚS":"path630","CARNAUBAL":"path7441",
  "CASCAVEL":"path808","CATARINA":"path536","CATUNDA":"path766","CAUCAIA":"path730",
  "CEDRO":"path582","CHAVAL":"path632","CHOROZINHO":"path7961","CHORÓ":"path910",
  "COREAÚ":"path684","CRATEÚS":"path824","CRATO":"path562","CROATÁ":"path750",
  "CRUZ":"path6401","DEP. IRAPUAN PINHEIRO":"path890","ERERÊ":"path5521","EUSÉBIO":"path7421",
  "FARIAS BRITO":"path570","FORQUILHA":"path7061","FORTALEZA":"path7361","FORTIM":"path8141",
  "FRECHEIRINHA":"path6741","GENERAL SAMPAIO":"path7201","GRANJA":"path6361","GRANJEIRO":"path5861",
  "GRAÇA":"path9241","GROAÍRAS":"path706","GUAIÚBA":"path7981","GUARACIABA DO NORTE":"path924",
  "GUARAMIRANGA":"path7741","HIDROLÂNDIA":"path760","HORIZONTE":"path738","IBARETAMA":"path9161",
  "IBIAPINA":"path678","IBICUITINGA":"path9121","ICAPUÍ":"path852","ICÓ":"path588",
  "IGUATU":"path5821","INDEPENDÊNCIA":"path828","IPAPORANGA":"path8201","IPAUMIRIM":"path590",
  "IPU":"path754","IPUEIRAS":"path826","IRACEMA":"path906","IRAUÇUBA":"path708",
  "ITAITINGA":"path734","ITAIÇABA":"path8501","ITAPAJÉ":"path7101","ITAPIPOCA":"path6641",
  "ITAPIÚNA":"path782","ITAREMA":"path642","ITATIRA":"path834","JAGUARETAMA":"path548",
  "JAGUARIBARA":"path9001","JAGUARIBE":"path5481","JAGUARUANA":"path848","JARDIM":"path618",
  "JATI":"path628","JIJOCA DE JERICOACOARA":"path638","JUAZEIRO DO NORTE":"path6021",
  "JUCÁS":"path5781","LAVRAS DA MANGABEIRA":"path5841","LIMOEIRO DO NORTE":"path8761",
  "MADALENA":"path836","MARACANAÚ":"path7341","MARANGUAPE":"path7721","MARCO":"path656",
  "MARTINÓPOLE":"path6481","MASSAPÊ":"path694","MAURITI":"path6241","MERUOCA":"path6921",
  "MILAGRES":"path610","MILHÃ":"path898","MIRAÍMA":"path718","MISSÃO VELHA":"path6101",
  "MOMBAÇA":"path8921","MONSENHOR TABOSA":"path7661","MORADA NOVA":"path870","MORAÚJO":"path650",
  "MORRINHOS":"path658","MUCAMBO":"path680","MULUNGU":"path784","NOVA OLINDA":"path5621",
  "NOVA RUSSAS":"path8221","NOVO ORIENTE":"path884","OCARA":"path796","ORÓS":"path546",
  "PACAJUS":"path8061","PACATUBA":"path736","PACOTI":"path788","PACUJÁ":"path6821",
  "PALHANO":"path850","PALMÁCIA":"path802","PARACURU":"path670","PARAIPABA":"path6681",
  "PARAMBU":"path886","PARAMOTI":"path768","PEDRA BRANCA":"path8621","PENAFORTE":"path614",
  "PENTECOSTE":"path726","PEREIRO":"path550","PINDORETAMA":"path8081","PIQUET CARNEIRO":"path8901",
  "PIRES FERREIRA":"path748","PORANGA":"path818","PORTEIRAS":"path616","POTENGI":"path596",
  "POTIRETAMA":"path9041","QUITERIANÓPOLIS":"path8841","QUIXADÁ":"path916","QUIXELÔ":"path540",
  "QUIXERAMOBIM":"path864","QUIXERÉ":"path882","REDENÇÃO":"path798","RERIUTABA":"path7541",
  "RUSSAS":"path846","SABOEIRO":"path572","SALITRE":"path5561","SANTA QUITÉRIA":"path830",
  "SANTANA DO ACARAÚ":"path6561","SANTANA DO CARIRI":"path560","SENADOR POMPEU":"path8981",
  "SENADOR SÁ":"path6941","SOBRAL":"path51421","SOLONÓPOLE":"path896","SÃO BENEDITO":"path752",
  "SÃO GONÇALO DO AMARANTE":"path668","SÃO JOÃO DO JAGUARIBE":"path9081","SÃO LUÍS DO CURU":"path7261",
  "TABULEIRO DO NORTE":"path8781","TAMBORIL":"path822","TARRAFAS":"path574","TAUÁ":"path856",
  "TEJUÇUOCA":"path710","TIANGUÁ":"path672","TRAIRI":"path666","TURURU":"path7141",
  "UBAJARÁ":"path674","UMARI":"path594","UMIRIM":"path714","URUBURETAMA":"path712",
  "URUOCA":"path648","VARJOTA":"path7561","VIÇOSA DO CEARÁ":"path6721","VÁRZEA ALEGRE":"path5701",
  "PALHANO":"path850","PARAIPABA":"path6681",
};

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
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const svgRef = useRef(null);
  const mapContainerRef = useRef(null);

  useEffect(() => { loadEventos(); }, []);

  useEffect(() => {
    if (svgLoaded && !loading) colorirMapa();
  }, [svgLoaded, loading, filtroMapa, filtroAno, filtroRegiao, filtroStatus, filtroTipo, eventos]);

  const loadEventos = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "tceduc_eventos"));
      setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const evFiltrados = eventos.filter(e => {
    if (filtroAno !== "todos" && !(e.data && e.data.startsWith(filtroAno))) return false;
    if (filtroStatus !== "todos" && e.status !== filtroStatus) return false;
    if (filtroTipo !== "todos" && e.tipo !== filtroTipo) return false;
    return true;
  });

  const municipaisRealizados = evFiltrados.filter(e => e.tipo === "Municipal" && e.status === "Realizado");
  const regionaisRealizados = evFiltrados.filter(e => e.tipo === "Regional" && e.status === "Realizado");
  const municipaisPendentes = evFiltrados.filter(e => e.tipo === "Municipal" && (e.status === "Pendente" || e.status === "Programado"));

  const totalCapacitados = evFiltrados.reduce((acc, e) =>
    acc + (e.acoesEducacionais || []).reduce((s, a) => s + (parseInt(a.participantes) || 0), 0), 0);

  const proximosEventos = evFiltrados
    .filter(e => e.status === "Pendente" && e.data && new Date(e.data) >= new Date())
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .slice(0, 5);

  const acoesSummary = {};
  evFiltrados.forEach(e => {
    (e.acoesEducacionais || []).forEach(a => {
      if (!acoesSummary[a.nome]) acoesSummary[a.nome] = 0;
      acoesSummary[a.nome] += parseInt(a.participantes) || 0;
    });
  });
  const acoesOrdenadas = Object.entries(acoesSummary).sort((a,b) => b[1]-a[1]).slice(0,6);
  const maxAcao = acoesOrdenadas[0]?.[1] || 1;

  const colorirMapa = () => {
    const svgDoc = svgRef.current?.contentDocument;
    if (!svgDoc) return;

    // Mapas de status por município considerando TODOS os filtros ativos
    const municipioEventos = {};
    evFiltrados.filter(e => e.tipo === "Municipal" && e.municipio).forEach(e => {
      const norm = normalizar(e.municipio);
      if (!municipioEventos[norm]) municipioEventos[norm] = [];
      municipioEventos[norm].push(e);
    });

    // Reset all paths
    svgDoc.querySelectorAll("path").forEach(p => {
      p.style.fill = "#e8eef8";
      p.style.stroke = "#c0cfe0";
      p.style.strokeWidth = "0.5";
      p.style.cursor = "default";
      p.onmouseenter = null;
      p.onmouseleave = null;
    });

    // Só colorir municípios se filtro não for exclusivamente Regional
    if (filtroTipo !== "Regional") {
      Object.entries(MUNICIPIO_PATH_MAP).forEach(([muni, pathId]) => {
        const el = svgDoc.getElementById(pathId);
        if (!el) return;

        const muniNorm = normalizar(muni);
        const evs = municipioEventos[muniNorm] || [];
        const temRealizado   = evs.some(e => e.status === "Realizado");
        const temProgramado  = evs.some(e => e.status === "Programado");
        const temPendente    = evs.some(e => e.status === "Pendente");
        const semEvento      = evs.length === 0;

        // Cor baseada na combinação de filtros
        let color = "#e8eef8"; // sem evento

        if (filtroStatus === "Realizado") {
          color = temRealizado ? "#059669" : "#e8eef8";
        } else if (filtroStatus === "Programado") {
          color = temProgramado ? "#7c3aed" : "#e8eef8";
        } else if (filtroStatus === "Pendente") {
          color = temPendente ? "#E8730A" : "#e8eef8";
        } else {
          // Todos os status — prioridade: Realizado > Programado > Pendente
          if (temRealizado) color = "#059669";
          else if (temProgramado) color = "#7c3aed";
          else if (temPendente) color = "#E8730A";
          else color = "#e8eef8";
        }

        el.style.fill = color;
        el.style.stroke = color === "#e8eef8" ? "#c0cfe0" : "#1B3F7A";
        el.style.strokeWidth = "0.5";
        el.style.cursor = "pointer";
        el.style.transition = "fill 0.2s";

        const ev = evs[0];
        const savedColor = color;
        el.onmouseenter = (e) => {
          el.style.fill = "#1B3F7A";
          el.style.strokeWidth = "1.5";
          const participants = evs.reduce((s, ev) =>
            s + (ev.acoesEducacionais||[]).reduce((ss,a) => ss+(parseInt(a.participantes)||0),0), 0);
          setTooltip({ nome:muni, status:ev?.status||"Sem evento", data:ev?.data, participantes:participants, x:e.clientX, y:e.clientY });
        };
        el.onmouseleave = () => { el.style.fill = savedColor; el.style.strokeWidth = "0.5"; setTooltip(null); };
      });
    }
  };

  // Legenda dinâmica baseada nos filtros ativos
  const legendaCores = () => {
    if (filtroStatus === "Realizado")   return [{ cor:"#059669", label:`Realizado (${municipaisRealizados.length})` }, { cor:"#e8eef8", label:"Sem evento", borda:true }];
    if (filtroStatus === "Programado")  return [{ cor:"#7c3aed", label:`Programado` }, { cor:"#e8eef8", label:"Sem evento", borda:true }];
    if (filtroStatus === "Pendente")    return [{ cor:"#E8730A", label:`Pendente (${municipaisPendentes.length})` }, { cor:"#e8eef8", label:"Sem evento", borda:true }];
    return [
      { cor:"#059669", label:`Realizado (${municipaisRealizados.length})` },
      { cor:"#7c3aed", label:`Programado` },
      { cor:"#E8730A", label:`Pendente/Agendado (${municipaisPendentes.length})` },
      { cor:"#e8eef8", label:`Sem evento (${184 - municipaisRealizados.length})`, borda:true },
    ];
  };

  const s = { fontFamily: "'Montserrat', sans-serif" };

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
              {[{v:"todos",l:"Todos"},{v:"2026",l:"2026"},{v:"2027",l:"2027"}].map(a => (
                <div key={a.v} onClick={() => setFiltroAno(a.v)} style={{ background: filtroAno===a.v ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", border:`1px solid ${filtroAno===a.v ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{a.l}</div>
              ))}
              <div style={{ width:1, background:"rgba(255,255,255,0.2)", margin:"0 4px" }}/>
              {/* Filtro Tipo */}
              {[{v:"todos",l:"Municipal + Regional"},{v:"Municipal",l:"Municipal"},{v:"Regional",l:"Regional"}].map(t => (
                <div key={t.v} onClick={() => setFiltroTipo(t.v)} style={{ background: filtroTipo===t.v ? "rgba(232,115,10,0.4)" : "rgba(255,255,255,0.1)", border:`1px solid ${filtroTipo===t.v ? "rgba(232,115,10,0.6)" : "rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{t.l}</div>
              ))}
              <div style={{ width:1, background:"rgba(255,255,255,0.2)", margin:"0 4px" }}/>
              {/* Filtro Status */}
              {[{v:"todos",l:"Todos status"},{v:"Realizado",l:"Realizado"},{v:"Pendente",l:"Pendente"},{v:"Programado",l:"Programado"}].map(s => (
                <div key={s.v} onClick={() => setFiltroStatus(s.v)} style={{ background: filtroStatus===s.v ? "rgba(5,150,105,0.4)" : "rgba(255,255,255,0.1)", border:`1px solid ${filtroStatus===s.v ? "rgba(5,150,105,0.6)" : "rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{s.l}</div>
              ))}
            </div>
          </div>
          {/* PILLS */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {[
              { label:"Municipais realizados", value:`${municipaisRealizados.length}/184`, accent:false },
              { label:"Regionais realizados", value:`${regionaisRealizados.length}/7`, accent:false },
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

            {/* SVG */}
            <div
              ref={mapContainerRef}
              style={{ position:"relative", background:"#f0f5ff", borderRadius:16, overflow:"hidden", height:460, cursor:dragging?"grabbing":"grab", userSelect:"none" }}
              onMouseDown={e => { setDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); }}
              onMouseMove={e => { if (dragging && dragStart) { setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); } }}
              onMouseUp={() => { setDragging(false); setDragStart(null); }}
              onMouseLeave={() => { setDragging(false); setDragStart(null); }}
              onWheel={e => { e.preventDefault(); setZoom(z => Math.min(4, Math.max(0.8, z - e.deltaY * 0.001))); }}
            >
              <div style={{ transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin:"center center", width:"100%", height:"100%", transition:dragging?"none":"transform 0.1s" }}>
                <object
                  ref={svgRef}
                  data="/ceara.svg"
                  type="image/svg+xml"
                  style={{ width:"100%", height:"100%", display:"block", pointerEvents: dragging ? "none" : "auto" }}
                  onLoad={() => setSvgLoaded(true)}
                />
              </div>
              {!svgLoaded && (
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#aaa", fontSize:14, flexDirection:"column", gap:10 }}>
                  <div style={{ fontSize:32 }}>🗺️</div>
                  <div>Carregando mapa do Ceará...</div>
                </div>
              )}
              {/* Zoom controls */}
              <div style={{ position:"absolute", bottom:14, right:14, display:"flex", flexDirection:"column", gap:6 }}>
                <div onClick={() => setZoom(z => Math.min(4, z + 0.3))} style={{ width:36, height:36, background:"#fff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", fontSize:20, fontWeight:700, color:"#1B3F7A", userSelect:"none" }}>+</div>
                <div onClick={() => { setZoom(1); setPan({x:0,y:0}); }} style={{ width:36, height:36, background:"#fff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", fontSize:13, fontWeight:700, color:"#1B3F7A", userSelect:"none" }}>⊙</div>
                <div onClick={() => setZoom(z => Math.max(0.8, z - 0.3))} style={{ width:36, height:36, background:"#fff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.15)", fontSize:20, fontWeight:700, color:"#1B3F7A", userSelect:"none" }}>−</div>
              </div>
              {/* Zoom indicator */}
              <div style={{ position:"absolute", bottom:14, left:14, background:"rgba(255,255,255,0.9)", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>{Math.round(zoom*100)}%</div>
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* STATS GRID */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { label:"Municipais", value:`${municipaisRealizados.length}`, sub:`de 184`, cor:"#1B3F7A", pct: (municipaisRealizados.length/184)*100 },
                { label:"Regionais", value:`${regionaisRealizados.length}`, sub:`de 7`, cor:"#E8730A", pct: (regionaisRealizados.length/7)*100 },
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
                { label:"Regionais realizados", atual:regionaisRealizados.length, total:7 },
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
