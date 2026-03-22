import { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

function fmtNum(n) {
  if (!n && n !== 0) return "0";
  return n.toLocaleString("pt-BR");
}

// Simple pie chart using canvas-style SVG
function PieChart({ data, colors }) {
  const size = 160;
  const cx = size / 2, cy = size / 2, r = 60;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ height: size, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13 }}>Sem dados</div>;

  let startAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const midAngle = startAngle + angle / 2;
    const lx = cx + (r + 18) * Math.cos(midAngle);
    const ly = cy + (r + 18) * Math.sin(midAngle);
    const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;
    const pct = Math.round((d.value / total) * 100);
    const slice = { path, color: colors[i % colors.length], pct, lx, ly, midAngle };
    startAngle = endAngle;
    return slice;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1.5" />)}
      {slices.filter(s => s.pct >= 8).map((s, i) => (
        <text key={i} x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle"
          fontSize="9" fontWeight="700" fill="#fff"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
          {s.pct}%
        </text>
      ))}
    </svg>
  );
}

function Legend({ data, colors }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
          <span style={{ color: "#555" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function PieCard({ title, data, colors }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "20px 20px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#333", marginBottom: 14, textAlign: "center" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <PieChart data={data} colors={colors} />
        <Legend data={data} colors={colors} />
      </div>
    </div>
  );
}

const COLORS_BLUE = ["#1B3F7A", "#4A90D9", "#A8C8F0", "#7B9FC0", "#C5D8F0"];
const COLORS_AMBER = ["#D97706", "#F59E0B", "#FCD34D", "#FDE68A", "#FEF3C7"];

export default function IPCCursosDashboard({ user, onBack }) {
  const [aba, setAba] = useState("servidores");
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros Servidores
  const [filtroAnoServ, setFiltroAnoServ] = useState("2025");
  const [filtroMesServ, setFiltroMesServ] = useState("todos");
  const [filtroModalServ, setFiltroModalServ] = useState("todos");
  const [filtroCompServ, setFiltroCompServ] = useState("todos");
  const [filtroEixoServ, setFiltroEixoServ] = useState("todos");
  const [filtroPublicoServ, setFiltroPublicoServ] = useState("todos");

  // Filtros Jurisdicionados
  const [filtroAnoJur, setFiltroAnoJur] = useState("todos");
  const [filtroMesJur, setFiltroMesJur] = useState("todos");
  const [filtroModalJur, setFiltroModalJur] = useState("todos");
  const [filtroEixoJur, setFiltroEixoJur] = useState("todos");
  const [filtroPublicoJur, setFiltroPublicoJur] = useState("todos");

  const MESES = ["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const ANOS = ["todos","2024","2025","2026","2027"];

  useEffect(() => {
    getDocs(collection(db, "ipc_cursos_projetos"))
      .then(snap => { setProjetos(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const PUBLICOS_SERV = ["Servidores", "Membros", "Serv+Membros", "Serv+Colaborador"];
  const PUBLICOS_JUR = ["Jurisdicionado", "Público"];

  // Filter for Servidores
  const projServ = projetos.filter(p => {
    if (!PUBLICOS_SERV.includes(p.publicoAlvo)) return false;
    if (filtroAnoServ !== "todos" && !(p.data||"").startsWith(filtroAnoServ)) return false;
    if (filtroMesServ !== "todos" && parseInt((p.data||"").split("-")[1]) !== parseInt(filtroMesServ)) return false;
    if (filtroModalServ !== "todos" && p.modalidade !== filtroModalServ) return false;
    if (filtroCompServ !== "todos" && !(p.competencias||[]).includes(filtroCompServ)) return false;
    if (filtroEixoServ !== "todos" && !(p.eixosTematicos||[]).includes(filtroEixoServ)) return false;
    if (filtroPublicoServ !== "todos" && p.publicoAlvo !== filtroPublicoServ) return false;
    return true;
  });

  // Filter for Jurisdicionados
  const projJur = projetos.filter(p => {
    if (!PUBLICOS_JUR.includes(p.publicoAlvo)) return false;
    if (filtroAnoJur !== "todos" && !(p.data||"").startsWith(filtroAnoJur)) return false;
    if (filtroMesJur !== "todos" && parseInt((p.data||"").split("-")[1]) !== parseInt(filtroMesJur)) return false;
    if (filtroModalJur !== "todos" && p.modalidade !== filtroModalJur) return false;
    if (filtroEixoJur !== "todos" && !(p.eixosTematicos||[]).includes(filtroEixoJur)) return false;
    if (filtroPublicoJur !== "todos" && p.publicoAlvo !== filtroPublicoJur) return false;
    return true;
  });

  // ── SERVIDORES stats ──────────────────────────────────────────────────────────
  const realizadasServ = projServ.filter(p => p.status === "Realizado" || p.status === "Aprovado");
  const viabilizadasServ = projServ.filter(p => p.realizacao === "Externa");

  const cursosServ = new Set(realizadasServ.map(p => p.nomeCurso)).size;
  const tecnicaServ = realizadasServ.filter(p => (p.competencias||[]).includes("Técnica")).length;
  const comportServ = realizadasServ.filter(p => (p.competencias||[]).includes("Comportamental")).length;
  const gerencServ = realizadasServ.filter(p => (p.competencias||[]).includes("Gerencial")).length;

  const acoesRealizServ = realizadasServ.length;
  const certEmitidosServ = realizadasServ.reduce((s, p) => s + (p.posRealizacao?.totalConcludentes || 0), 0);
  const totalInscServ = realizadasServ.reduce((s, p) => s + (p.posRealizacao?.totalInscritos || 0), 0);
  const ausenciaServ = totalInscServ > 0 ? Math.round(((totalInscServ - certEmitidosServ) / totalInscServ) * 100) : 0;

  const acoesViabServ = viabilizadasServ.length;
  const partViabServ = viabilizadasServ.reduce((s, p) => s + (p.posRealizacao?.totalConcludentes || 0), 0);

  // Pizzas Servidores
  const modalServ = ["Presencial","EaD","Híbrido"].map(m => ({ label: m, value: realizadasServ.filter(p => p.modalidade === m).length })).filter(d => d.value > 0);
  const compServ = ["Técnica","Comportamental","Gerencial"].map(m => ({ label: m, value: realizadasServ.filter(p => (p.competencias||[]).includes(m)).length })).filter(d => d.value > 0);
  const publicoServData = ["Serv+Colaborador","Servidores","Membros","Serv+Membros","Público"].map(m => ({ label: m, value: realizadasServ.filter(p => p.publicoAlvo === m).length })).filter(d => d.value > 0);

  // ── JURISDICIONADOS stats ─────────────────────────────────────────────────────
  const realizadasJur = projJur.filter(p => p.status === "Realizado" || p.status === "Aprovado");
  const presenciaisJur = realizadasJur.filter(p => p.modalidade === "Presencial").length;
  const eadJur = realizadasJur.filter(p => p.modalidade === "EaD").length;

  const acoesRealizJur = realizadasJur.length;
  const jursInscritos = realizadasJur.reduce((s, p) => s + (p.posRealizacao?.totalInscritos || 0), 0);
  const certEmitidosJur = realizadasJur.reduce((s, p) => s + (p.posRealizacao?.totalConcludentes || 0), 0);
  const ausenciaJur = jursInscritos > 0 ? Math.round(((jursInscritos - certEmitidosJur) / jursInscritos) * 100) : 0;

  const modalJur = ["A distância","Presencial","Híbrido"].map(m => {
    const key = m === "A distância" ? "EaD" : m;
    return { label: m, value: realizadasJur.filter(p => p.modalidade === key).length };
  }).filter(d => d.value > 0);
  const tipoJur = ["Curso","Palestra","Evento"].map(m => ({ label: m, value: realizadasJur.filter(p => p.tipo === m).length })).filter(d => d.value > 0);
  const publicoJurData = ["Público","Jurisdicionado","Sociedade"].map(m => ({ label: m, value: realizadasJur.filter(p => p.publicoAlvo === m).length })).filter(d => d.value > 0);

  // ── DADOS HISTÓRICOS 2025 (estáticos do modelo) ───────────────────────────────
  const useHistorico2025Serv = filtroAnoServ === "2025" && acoesRealizServ === 0;
  const useHistorico2025Jur = (filtroAnoJur === "2025" || filtroAnoJur === "todos") && acoesRealizJur === 0;

  const H_SERV = {
    cursos: 29, tecnica: 24, comportamental: 5, gerencial: 0,
    acoesRealiz: 126, certEmitidos: 3254, ausencia: 20,
    acoesViab: 68, partViab: 168,
    modal: [{ label:"Presencial", value:83.5 },{ label:"A distância", value:13.9 },{ label:"Híbrido", value:2.6 }],
    comp: [{ label:"Técnica", value:80.9 },{ label:"Comportamental", value:14.4 },{ label:"Gerencial", value:4.7 }],
    publico: [{ label:"Serv+Colaborador", value:45.9 },{ label:"Servidores", value:41.2 },{ label:"Membros", value:5 },{ label:"Serv+Membros", value:5 },{ label:"Público", value:2.9 }],
  };

  const H_JUR = {
    acoes: 13, presenciais: 3, ead: 10,
    acoesRealiz: 39, jursInscritos: 5095, certEmitidos: 2715, ausencia: 47,
    modal: [{ label:"A distância", value:56.4 },{ label:"Presencial", value:35.9 },{ label:"Híbrido", value:7.7 }],
    tipo: [{ label:"Curso", value:66.7 },{ label:"Palestra", value:20.5 },{ label:"Evento", value:12.8 }],
    publico: [{ label:"Público", value:89.7 },{ label:"Jurisdicionados", value:7 },{ label:"Sociedade", value:3.3 }],
  };

  const sServ = useHistorico2025Serv ? H_SERV : { cursos: cursosServ, tecnica: tecnicaServ, comportamental: comportServ, gerencial: gerencServ, acoesRealiz: acoesRealizServ, certEmitidos: certEmitidosServ, ausencia: ausenciaServ, acoesViab: acoesViabServ, partViab: partViabServ, modal: modalServ, comp: compServ, publico: publicoServData };
  const sJur = useHistorico2025Jur ? H_JUR : { acoes: realizadasJur.length, presenciais: presenciaisJur, ead: eadJur, acoesRealiz: acoesRealizJur, jursInscritos, certEmitidos: certEmitidosJur, ausencia: ausenciaJur, modal: modalJur, tipo: tipoJur, publico: publicoJurData };

  const selectStyle = { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" };
  const optStyle = { color: "#1B3F7A", background: "#fff" };
  const kpiCard = (val, label, size) => (
    <div style={{ background: "#fff", borderRadius: 16, padding: "20px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", textAlign: "center" }}>
      <div style={{ fontWeight: 900, fontSize: size || 36, color: "#222", lineHeight: 1, marginBottom: 6 }}>{val}</div>
      <div style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>{label}</div>
    </div>
  );

  const isAzul = aba === "servidores";
  const accentColor = isAzul ? "#1B3F7A" : "#D97706";
  const headerBg = isAzul ? "linear-gradient(135deg,#1B3F7A,#2a5ba8)" : "linear-gradient(135deg,#D97706,#F59E0B)";

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background: headerBg, padding: "0 0 0 0" }}>
        <div style={{ padding: "14px 28px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div onClick={onBack} style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18 }}>←</div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>📚 IPC Cursos — Dashboard</div>
          </div>

          {/* ABA SELECTOR */}
          <div style={{ display: "flex", gap: 0, marginBottom: 0 }}>
            {[{ id: "servidores", label: "FORMAÇÃO SERVIDORES TCE" }, { id: "jurisdicionados", label: "FORMAÇÃO DE JURISDICIONADOS" }].map(a => (
              <div key={a.id} onClick={() => setAba(a.id)}
                style={{ padding: "10px 24px", fontWeight: 700, fontSize: 13, cursor: "pointer", borderRadius: "12px 12px 0 0", letterSpacing: 0.5,
                  background: aba === a.id ? "#f0f2f5" : "rgba(255,255,255,0.15)",
                  color: aba === a.id ? accentColor : "rgba(255,255,255,0.85)" }}>
                {a.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px 60px", maxWidth: 1300, margin: "0 auto" }}>

        {/* ══ FORMAÇÃO SERVIDORES ══════════════════════════════════════════════════ */}
        {aba === "servidores" && (
          <>
            {/* Filtros */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, background: "#fff", borderRadius: 14, padding: "12px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <select value={filtroAnoServ} onChange={e => setFiltroAnoServ(e.target.value)} style={{ ...selectStyle, background: "#f0f4ff", color: "#1B3F7A", border: "1px solid #dbe4ff" }}>
                <option value="todos" style={optStyle}>Todos os anos</option>
                {["2024","2025","2026","2027"].map(a => <option key={a} value={a} style={optStyle}>Ano: {a}</option>)}
              </select>
              <select value={filtroMesServ} onChange={e => setFiltroMesServ(e.target.value)} style={{ ...selectStyle, background: "#f0f4ff", color: "#1B3F7A", border: "1px solid #dbe4ff" }}>
                <option value="todos" style={optStyle}>Mês ▼</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m} style={optStyle}>{MESES[m]}</option>)}
              </select>
              {["Presencial","EaD","Híbrido"].length > 0 && (
                <select value={filtroModalServ} onChange={e => setFiltroModalServ(e.target.value)} style={{ ...selectStyle, background: "#f0f4ff", color: "#1B3F7A", border: "1px solid #dbe4ff" }}>
                  <option value="todos" style={optStyle}>Modalidade ▼</option>
                  {["Presencial","EaD","Híbrido"].map(m => <option key={m} value={m} style={optStyle}>{m}</option>)}
                </select>
              )}
              <select value={filtroCompServ} onChange={e => setFiltroCompServ(e.target.value)} style={{ ...selectStyle, background: "#f0f4ff", color: "#1B3F7A", border: "1px solid #dbe4ff" }}>
                <option value="todos" style={optStyle}>Competência ▼</option>
                {["Técnica","Comportamental","Gerencial"].map(m => <option key={m} value={m} style={optStyle}>{m}</option>)}
              </select>
              <select value={filtroPublicoServ} onChange={e => setFiltroPublicoServ(e.target.value)} style={{ ...selectStyle, background: "#f0f4ff", color: "#1B3F7A", border: "1px solid #dbe4ff" }}>
                <option value="todos" style={optStyle}>Público ▼</option>
                {["Servidores","Membros","Serv+Membros","Serv+Colaborador"].map(m => <option key={m} value={m} style={optStyle}>{m}</option>)}
              </select>
              {(filtroMesServ !== "todos" || filtroModalServ !== "todos" || filtroCompServ !== "todos" || filtroPublicoServ !== "todos") && (
                <div onClick={() => { setFiltroMesServ("todos"); setFiltroModalServ("todos"); setFiltroCompServ("todos"); setFiltroPublicoServ("todos"); }}
                  style={{ background: "#fee2e2", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#dc2626", cursor: "pointer" }}>✕ Limpar</div>
              )}
              {useHistorico2025Serv && (
                <span style={{ background: "#eff6ff", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "#1B3F7A", fontWeight: 600 }}>📊 Dados históricos 2025</span>
              )}
            </div>

            {/* Layout principal */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {/* Sidebar Resultados Chave */}
              <div style={{ width: 170, flexShrink: 0, background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#1B3F7A", textAlign: "center", marginBottom: 4 }}>Resultados<br/>Chave</div>
                <div style={{ background: "#2196F3", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 26, color: "#fff" }}>{fmtNum(sServ.cursos)}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>Cursos</div>
                </div>
                <div style={{ background: "#1565C0", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 26, color: "#fff" }}>{fmtNum(sServ.tecnica)}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>Técnica</div>
                </div>
                <div style={{ background: "#42A5F5", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 26, color: "#fff" }}>{fmtNum(sServ.comportamental)}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>Comportamental</div>
                </div>
                <div style={{ background: "#90CAF9", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 26, color: "#1B3F7A" }}>{fmtNum(sServ.gerencial)}</div>
                  <div style={{ fontSize: 11, color: "#1B3F7A", fontWeight: 600 }}>Gerencial</div>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Realizadas */}
                <div style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#888", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>Realizadas</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {kpiCard(fmtNum(sServ.acoesRealiz), "Ações Educacionais")}
                    {kpiCard(fmtNum(sServ.certEmitidos), "Certificados Emitidos")}
                    {kpiCard(sServ.ausencia + "%", "Ausência Acumulada")}
                  </div>
                </div>
                {/* Viabilizadas */}
                <div style={{ background: "#fff", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#888", marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>Viabilizadas</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {kpiCard(fmtNum(sServ.acoesViab), "Ações Educacionais")}
                    {kpiCard(fmtNum(sServ.partViab), "Participantes")}
                  </div>
                </div>
                {/* Pizzas */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <PieCard title="Modalidade" data={sServ.modal} colors={COLORS_BLUE} />
                  <PieCard title="Competência" data={sServ.comp} colors={COLORS_BLUE} />
                  <PieCard title="Público-alvo" data={sServ.publico} colors={COLORS_BLUE} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ FORMAÇÃO JURISDICIONADOS ════════════════════════════════════════════ */}
        {aba === "jurisdicionados" && (
          <>
            {/* Filtros */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, background: "#fff", borderRadius: 14, padding: "12px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <select value={filtroAnoJur} onChange={e => setFiltroAnoJur(e.target.value)} style={{ ...selectStyle, background: "#fffbeb", color: "#D97706", border: "1px solid #fde68a" }}>
                <option value="todos" style={optStyle}>Ano ▼</option>
                {["2024","2025","2026","2027"].map(a => <option key={a} value={a} style={optStyle}>{a}</option>)}
              </select>
              <select value={filtroMesJur} onChange={e => setFiltroMesJur(e.target.value)} style={{ ...selectStyle, background: "#fffbeb", color: "#D97706", border: "1px solid #fde68a" }}>
                <option value="todos" style={optStyle}>Mês ▼</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m} style={optStyle}>{MESES[m]}</option>)}
              </select>
              <select value={filtroModalJur} onChange={e => setFiltroModalJur(e.target.value)} style={{ ...selectStyle, background: "#fffbeb", color: "#D97706", border: "1px solid #fde68a" }}>
                <option value="todos" style={optStyle}>Modalidade ▼</option>
                {["Presencial","EaD","Híbrido"].map(m => <option key={m} value={m} style={optStyle}>{m}</option>)}
              </select>
              <select value={filtroPublicoJur} onChange={e => setFiltroPublicoJur(e.target.value)} style={{ ...selectStyle, background: "#fffbeb", color: "#D97706", border: "1px solid #fde68a" }}>
                <option value="todos" style={optStyle}>Público ▼</option>
                {["Jurisdicionado","Público"].map(m => <option key={m} value={m} style={optStyle}>{m}</option>)}
              </select>
              {(filtroMesJur !== "todos" || filtroModalJur !== "todos" || filtroPublicoJur !== "todos") && (
                <div onClick={() => { setFiltroMesJur("todos"); setFiltroModalJur("todos"); setFiltroPublicoJur("todos"); }}
                  style={{ background: "#fee2e2", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#dc2626", cursor: "pointer" }}>✕ Limpar</div>
              )}
              {useHistorico2025Jur && (
                <span style={{ background: "#fffbeb", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "#D97706", fontWeight: 600 }}>📊 Dados históricos 2025</span>
              )}
            </div>

            {/* Layout principal */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {/* Sidebar */}
              <div style={{ width: 170, flexShrink: 0, background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#D97706", textAlign: "center", marginBottom: 4 }}>Resultados<br/>Chave</div>
                <div style={{ background: "#D97706", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 22, color: "#fff" }}>{fmtNum(sJur.acoes)}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>Ações<br/>Educacionais</div>
                </div>
                <div style={{ background: "#F59E0B", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 26, color: "#fff" }}>{fmtNum(sJur.presenciais)}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>Ações<br/>presenciais</div>
                </div>
                <div style={{ background: "#FCD34D", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 26, color: "#92400e" }}>{fmtNum(sJur.ead)}</div>
                  <div style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>Ações EaD</div>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* KPIs principais */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                  {kpiCard(fmtNum(sJur.acoesRealiz), "Ações Educacionais Realizadas", 30)}
                  {kpiCard(fmtNum(sJur.jursInscritos), "Jurisdicionados Inscritos", 30)}
                  {kpiCard(fmtNum(sJur.certEmitidos), "Certificados Emitidos", 30)}
                  {kpiCard(sJur.ausencia + "%", "Ausência Acumulada", 34)}
                </div>
                {/* Pizzas */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <PieCard title="Modalidade" data={sJur.modal} colors={COLORS_AMBER} />
                  <PieCard title="Tipo" data={sJur.tipo} colors={COLORS_AMBER} />
                  <PieCard title="Público-alvo" data={sJur.publico} colors={COLORS_AMBER} />
                </div>
              </div>
            </div>
          </>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>Carregando dados...</div>
        )}
      </div>
    </div>
  );
}
