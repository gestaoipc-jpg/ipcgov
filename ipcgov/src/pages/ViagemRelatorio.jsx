import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function formatDateTime() {
  return new Date().toLocaleString("pt-BR");
}
function fmtWhats(num) {
  const d = (num || "").replace(/\D/g, "");
  if (d.length >= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
  return num;
}

const TIPO_OC = { transporte: "🚌 Transporte", hotel: "🏨 Hotel/Hospedagem", alimentacao: "🍽️ Alimentação", outro: "📌 Outro" };
const TIPO_OC_SHORT = { transporte: "Transporte", hotel: "Hotel", alimentacao: "Alimentação", outro: "Outro" };
const TIPO_CFG_OC_EVENTO = {
    inscricao:      { label:"Inscrição/Frequência",       bg:"#fff3e0", cor:"#E8730A" },
    equipamento:    { label:"Equipamentos/Material",       bg:"#e8f5e9", cor:"#059669" },
    logistica:      { label:"Logística/Local/Transporte",  bg:"#f3f4f6", cor:"#6b7280" },
    infraestrutura: { label:"Infraestrutura",              bg:"#f3e8ff", cor:"#7c3aed" },
    tecnico:        { label:"Problemas Técnicos",          bg:"#fee2e2", cor:"#dc2626" },
    comunicacao:    { label:"Comunicação",                 bg:"#e0f2fe", cor:"#0891b2" },
    outro:          { label:"Outro",                       bg:"#f8f9fb", cor:"#888"    },
  };
const ORDEM_TIPOS_OC = ["inscricao","infraestrutura","tecnico","comunicacao","equipamento","logistica","outro"];
const STATUS_COR = { Programada: "#7c3aed", "Em Execução": "#E8730A", Concluída: "#059669" };

const sec = (cor = "#1B3F7A") => ({
  fontWeight: 800, fontSize: 15, color: cor, marginBottom: 14,
  display: "flex", alignItems: "center", gap: 8,
});
const bar = (cor = "#1B3F7A") => ({
  width: 4, height: 18, background: cor, borderRadius: 2, flexShrink: 0,
});
const card = {
  background: "#fff", borderRadius: 20, padding: "24px 32px",
  marginBottom: 20, boxShadow: "0 2px 12px rgba(27,63,122,0.07)",
};
const tag = (bg, cor) => ({
  display: "inline-flex", alignItems: "center", gap: 4,
  background: bg, borderRadius: 8, padding: "3px 10px",
  fontSize: 12, fontWeight: 700, color: cor, textDecoration: "none",
});

export default function ViagemRelatorio({ viagem, eventos, onBack, servidores, usuarios, instrutores, motoristas }) {
  const [tipo, setTipo] = useState("resumido");
  const [solicitacoesViagem, setSolicitacoesViagem] = useState([]);

  useEffect(() => {
    if (!viagem?.id) return;
    getDocs(query(collection(db, "almox_solicitacoes"), where("origemViagem", "==", viagem.id)))
      .then(snap => setSolicitacoesViagem(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error);
  }, [viagem?.id]);

  if (!viagem) return null;

  const resolveMembroNome = (chave) => {
    if (!chave) return { nome: "—", tipo: "usuario" };
    if (chave.startsWith("inst_")) {
      const m = (instrutores || []).find(x => x.id === chave.replace("inst_", ""));
      return m ? { nome: m.nome || m.email || chave, tipo: "instrutor" } : { nome: chave, tipo: "instrutor" };
    }
    if (chave.startsWith("mot_")) {
      const m = (motoristas || []).find(x => x.id === chave.replace("mot_", ""));
      return m ? { nome: m.nome || m.email || chave, tipo: "motorista" } : { nome: chave, tipo: "motorista" };
    }
    const srv = (servidores || []).find(x => x.email === chave);
    if (srv) return { nome: srv.nome || chave, tipo: "servidor" };
    const usr = (usuarios || []).find(x => x.email === chave);
    if (usr) return { nome: usr.nome || usr.displayName || chave, tipo: "usuario" };
    const inst = (instrutores || []).find(x => x.email === chave);
    if (inst) return { nome: inst.nome || chave, tipo: "instrutor" };
    const mot = (motoristas || []).find(x => x.email === chave);
    if (mot) return { nome: mot.nome || chave, tipo: "motorista" };
    return { nome: chave, tipo: "usuario" };
  };

  const eventosVinculados = (eventos || []).filter(e => (viagem.municipiosIds || []).includes(e.id)).sort((a, b) => (a.data || "").localeCompare(b.data || ""));
  const getCapacitados = (e) => e.modoTotalManual
    ? (parseInt(e.totalAprovadosManual) || 0)
    : (e.acoesEducacionais || []).reduce((ss, a) => ss + (parseInt(a.participantes) || 0), 0);
  const getInscritos = (e) => e.modoTotalManual
    ? (parseInt(e.totalInscritosManual) || 0)
    : (e.posEvento?.totalInscritos || 0);
  const totalParticipantes = eventosVinculados.reduce((s, e) => s + getCapacitados(e), 0);
  const totalInscritos = eventosVinculados.reduce((s, e) => s + getInscritos(e), 0);
  const totalOcEventos = eventosVinculados.reduce((s, e) => s + (e.ocorrencias || []).length, 0);
  const totalOcViagem = (viagem.ocorrencias || []).length;
  const totalHospedagens = (viagem.hospedagens || []).length;
  const totalHorarios = (viagem.horarios || []).length;
  const totalContatos = (viagem.contatos || []).length;
  const totalAlimentacao = (viagem.alimentacao || []).length;
  const totalAgenda = (viagem.agenda || []).length;

  // Consolidar por ação educacional — normaliza chave para evitar duplicatas por grafia
  const porAcaoMap = {};
  eventosVinculados.forEach(e => {
    if (e.modoTotalManual) {
      const chave = "total";
      if (!porAcaoMap[chave]) porAcaoMap[chave] = { nomeExibido: "Total capacitados", total: 0 };
      porAcaoMap[chave].total += parseInt(e.totalAprovadosManual) || 0;
    } else {
      (e.acoesEducacionais || []).forEach(a => {
        const nomeOriginal = (a.acaoNome || a.nome || "—").trim();
        const chave = nomeOriginal.toLowerCase().replace(/\s+/g, " ");
        if (!porAcaoMap[chave]) porAcaoMap[chave] = { nomeExibido: nomeOriginal, total: 0 };
        porAcaoMap[chave].total += parseInt(a.participantes) || 0;
      });
    }
  });
  const acoesOrdenadas = Object.values(porAcaoMap).sort((a, b) => b.total - a.total);


  // Ocorrências viagem agrupadas por tipo
  const ocPorTipo = (viagem.ocorrencias || []).reduce((acc, oc) => {
    acc[oc.tipo] = (acc[oc.tipo] || 0) + 1; return acc;
  }, {});

  // Agenda ordenada
  const agendaOrdenada = [...(viagem.agenda || [])].sort((a, b) =>
    (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || ""))
  );

  // Horários ordenados
  const horariosOrdenados = [...(viagem.horarios || [])].sort((a, b) =>
    (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || ""))
  );

  // Checklist stats
  const todosItensChecklist = [
    "Solicitar viagem", "Solicitar diária terceirizados", "Solicitar divulgação site/redes sociais",
    "Organizar material e equipamentos", "Reunião de alinhamento",
    ...(viagem.itensCustom || [])
  ];
  const checkFeitos = todosItensChecklist.filter(i => viagem.checklist?.[i]?.feito).length;

  // Render equipe badges
  const renderEquipe = () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {(viagem.equipe || []).map((chave, i) => {
        const m = resolveMembroNome(chave);
        const bg = m.tipo === "instrutor" ? "#f3e8ff" : m.tipo === "motorista" ? "#e0f2fe" : "#eff6ff";
        const cor = m.tipo === "instrutor" ? "#7c3aed" : m.tipo === "motorista" ? "#0891b2" : "#1B3F7A";
        const borda = m.tipo === "instrutor" ? "#e9d5ff" : m.tipo === "motorista" ? "#bae6fd" : "#1B3F7A33";
        const ico = m.tipo === "instrutor" ? "👨‍🏫" : m.tipo === "motorista" ? "🚗" : "👤";
        return <div key={i} style={{ background: bg, borderRadius: 10, padding: "6px 14px", fontSize: 13, color: cor, fontWeight: 600, border: `1px solid ${borda}` }}>{ico} {m.nome}</div>;
      })}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-area { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      {/* CONTROLES */}
      <div className="no-print" style={{ background: "linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding: "16px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div onClick={onBack} style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 16 }}>←</div>
          <div style={{ flex: 1, color: "#fff", fontWeight: 700, fontSize: 15 }}>{viagem.titulo} — Relatório</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["resumido", "completo"].map(t => (
              <div key={t} onClick={() => setTipo(t)} style={{ background: tipo === t ? "#fff" : "rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 16px", cursor: "pointer", color: tipo === t ? "#1B3F7A" : "#fff", fontWeight: 700, fontSize: 13 }}>
                {t === "resumido" ? "📋 Resumido" : "📑 Completo"}
              </div>
            ))}
            <div onClick={() => window.print()} style={{ background: "#E8730A", borderRadius: 10, padding: "8px 16px", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 13 }}>🖨️ PDF</div>
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO */}
      <div className="print-area" style={{ maxWidth: 900, margin: "32px auto", padding: "0 24px 80px" }}>

        {/* CABEÇALHO */}
        <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 24px rgba(27,63,122,0.1)", marginBottom: 24 }}>
          <div style={{ background: "#1B3F7A", padding: "32px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#fff", fontSize: 11, letterSpacing: 3, marginBottom: 6, fontWeight: 700 }}>INSTITUTO PLÁCIDO CASTELO — TCEDUC</div>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 28, letterSpacing: -1 }}>IPC<span style={{ color: "#E8730A" }}>gov</span></div>
                <div style={{ color: "#fff", fontSize: 14, marginTop: 4, fontWeight: 600 }}>Relatório de Viagem — {tipo === "resumido" ? "Resumido" : "Completo"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ background: STATUS_COR[viagem.status] || "#888", borderRadius: 10, padding: "5px 14px", color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{viagem.status || "—"}</div>
                <div style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>Gerado em {formatDateTime()}</div>
              </div>
            </div>
            <div style={{ marginTop: 24, borderTop: "1px solid #2d5a9e", paddingTop: 18 }}>
              <div style={{ color: "#fff", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>VIAGEM</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 32, letterSpacing: -1, marginTop: 4 }}>{viagem.titulo}</div>
              <div style={{ color: "#fff", fontSize: 14, marginTop: 6, fontWeight: 600 }}>
                📅 {formatDate(viagem.dataInicio)}{viagem.dataFim ? ` → ${formatDate(viagem.dataFim)}` : ""}
                {" · "}📍 {eventosVinculados.length} município{eventosVinculados.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* CARDS ESTATÍSTICAS — 8 cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "#f8f9fb", borderTop: "1px solid #e8edf2" }}>
            {[
              { label: "Municípios", value: eventosVinculados.length, icon: "📍", cor: "#1B3F7A" },
              { label: "Inscritos", value: totalInscritos || "—", icon: "📝", cor: "#0891b2" },
              { label: "Capacitados", value: totalParticipantes, icon: "👥", cor: "#059669" },
              { label: "Ocorr. Eventos", value: totalOcEventos, icon: "⚠️", cor: "#E8730A" },
              { label: "Ocorr. Viagem", value: totalOcViagem, icon: "🚌", cor: "#7c3aed" },
              { label: "Hospedagens", value: totalHospedagens, icon: "🏨", cor: "#0891b2" },
              { label: "Horários", value: totalHorarios, icon: "🕐", cor: "#059669" },
              { label: "Contatos", value: totalContatos, icon: "📞", cor: "#1B3F7A" },
              { label: "Agenda", value: totalAgenda, icon: "📅", cor: "#7c3aed" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "16px 12px", textAlign: "center", borderRight: i % 4 < 3 ? "1px solid #e8edf2" : "none", borderBottom: i < 4 ? "1px solid #e8edf2" : "none" }}>
                <div style={{ fontSize: 20, marginBottom: 3 }}>{s.icon}</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: s.cor }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 2, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ==================== RESUMIDO ==================== */}
        {tipo === "resumido" && (
          <>
            {/* MUNICÍPIOS ATENDIDOS — apenas para Regional */}
            {viagem.modalidade === "Regional" && (viagem.municipiosAtendidos || []).length > 0 && (
              <div style={card}>
                <div style={sec("#1B3F7A")}>🗺️ Municípios Atendidos pela Regional</div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
                  {(viagem.municipiosAtendidos || []).length} município{(viagem.municipiosAtendidos || []).length !== 1 ? "s" : ""} abrangidos por esta regional
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(viagem.municipiosAtendidos || []).sort().map((m, i) => (
                    <span key={i} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#1B3F7A" }}>{m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* EQUIPE */}
            {(viagem.equipe || []).length > 0 && (
              <div style={card}><div style={sec()}>👥 Equipe da Viagem</div>{renderEquipe()}</div>
            )}

            {/* DISTÂNCIAS — entre municípios */}
            {(viagem.distancias || []).length > 0 && (
              <div style={card}>
                <div style={sec("#0891b2")}>📏 Distâncias entre Municípios</div>
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", background: "#0891b2", padding: "11px 18px" }}>
                    {["Origem", "Destino", "Distância"].map(h => (
                      <div key={h} style={{ color: "#fff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                    ))}
                  </div>
                  {(viagem.distancias || []).map((d, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", padding: "11px 18px", borderBottom: i < viagem.distancias.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f0f9ff" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>📍 {d.origemLabel || d.origem}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>📍 {d.destinoLabel || d.destino}</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#0891b2" }}>{d.km} km</div>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", padding: "11px 18px", background: "#0891b2" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", gridColumn: "1 / 3" }}>TOTAL</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>
                      {(viagem.distancias || []).reduce((s, d) => s + (parseFloat(d.km) || 0), 0).toFixed(0)} km
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EQUIPAMENTOS — resumido */}
            {(viagem.equipamentos || []).length > 0 && (
              <div style={card}>
                <div style={sec("#7c3aed")}>🎒 Equipamentos e Acessórios ({(viagem.equipamentos || []).length})</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(viagem.equipamentos || []).map((eq, i) => (
                    <div key={i} style={{ background: "#f8f4ff", borderRadius: 10, padding: "6px 14px", border: "1px solid #e9d5ff" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed" }}>🎒 {eq.tipo}</span>
                      {eq.tombo && <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>🏷️ {eq.tombo}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MUNICÍPIOS */}
            <div style={card}>
              <div style={sec()}>📍 Municípios da Viagem ({eventosVinculados.length})</div>
              {eventosVinculados.length === 0 ? (
                <div style={{ textAlign: "center", color: "#aaa", padding: 20 }}>Nenhum município vinculado</div>
              ) : (
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr 1fr 1fr", background: "#1B3F7A", padding: "12px 18px" }}>
                    {["Município/Região", "Data", "Equipe", "Inscritos", "Capacitados", "Ocorrências"].map(h => (
                      <div key={h} style={{ color: "#fff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                    ))}
                  </div>
                  {eventosVinculados.map((ev, i) => {
                    const cap = getCapacitados(ev); const insc = getInscritos(ev);
                    return (
                      <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr 1fr", padding: "12px 18px", borderBottom: i < eventosVinculados.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{ev.tipo === "Municipal" ? ev.municipio : ev.regiao}</div>
                        <div style={{ fontSize: 13, color: "#555" }}>{formatDate(ev.data)}</div>
                        <div>
                          {((viagem.equipeMunicipio || {})[ev.id]?.motoristas || []).map((ch, i) => {
                            const { nome } = resolveMembroNome(ch);
                            return <div key={i} style={{ fontSize: 11, color: "#0891b2", fontWeight: 400 }}>🚗 {nome}</div>;
                          })}
                          {((viagem.equipeMunicipio || {})[ev.id]?.apoios || []).map((ch, i) => {
                            const { nome } = resolveMembroNome(ch);
                            return <div key={i} style={{ fontSize: 11, color: "#1B3F7A", fontWeight: 700 }}>👤 {nome}</div>;
                          })}
                          {(ev.acoesEducacionais || []).filter(a => a.instrutorNome).map((a, i) => (
                            <div key={i} style={{ fontSize: 11, color: a.modalidade === "EaD" ? "#7c3aed" : "#059669", fontWeight: 600 }}>
                              {a.modalidade === "EaD" ? "💻" : "👨‍🏫"} {a.instrutorNome}
                              {a.modalidade === "EaD" && <span style={{ fontSize: 9, marginLeft: 3, background: "#f3e8ff", color: "#7c3aed", borderRadius: 4, padding: "1px 4px", fontWeight: 700 }}>EaD</span>}
                            </div>
                          ))}
                          {!((viagem.equipeMunicipio || {})[ev.id]?.motoristas || []).length && !((viagem.equipeMunicipio || {})[ev.id]?.apoios || []).length && !(ev.acoesEducacionais || []).some(a => a.instrutorNome) && <span style={{ color: "#ccc", fontSize: 11 }}>—</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#0891b2" }}>{insc > 0 ? insc : "—"}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#059669" }}>{cap || "—"}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: (ev.ocorrencias || []).length > 0 ? "#E8730A" : "#aaa" }}>{(ev.ocorrencias || []).length || "—"}</div>
                      </div>
                    );
                  })}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr 1fr", padding: "13px 18px", background: "#E8730A", borderTop: "2px solid #c45f00" }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>TOTAL</div>
                    <div />
                    <div />
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{totalParticipantes}</div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{totalOcEventos}</div>
                  </div>
                </div>
              )}
            </div>

            {/* CAPACITADOS POR AÇÃO */}
            {acoesOrdenadas.length > 0 && (
              <div style={card}>
                <div style={{ ...sec(), ...{ color: "#059669" } }}>📚 Capacitados por Ação Educacional</div>
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", background: "#059669", padding: "12px 18px" }}>
                    {["Ação Educacional", "Total", "%"].map(h => <div key={h} style={{ color: "#fff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>)}
                  </div>
                  {acoesOrdenadas.map(({ nomeExibido: nome, total }, i) => {
                    const pct = totalParticipantes > 0 ? Math.round((total / totalParticipantes) * 100) : 0;
                    const cores = ["#1B3F7A", "#059669", "#E8730A", "#7c3aed", "#0891b2", "#dc2626"];
                    return (
                      <div key={nome} style={{ padding: "12px 18px", borderBottom: i < acoesOrdenadas.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", marginBottom: 6 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{nome}</div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: "#059669", paddingRight: 16 }}>{total}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>{pct}%</div>
                        </div>
                        <div style={{ height: 4, background: "#e8edf2", borderRadius: 2 }}>
                          <div style={{ height: 4, background: cores[i % cores.length], borderRadius: 2, width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LOGÍSTICA — RESUMO */}
            {(totalHospedagens + totalHorarios + totalContatos + totalAlimentacao + totalAgenda) > 0 && (
              <div style={card}>
                <div style={sec("#2a5ba8")}>🗺️ Logística de Viagem — Resumo</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                  {[
                    { icon: "🏨", label: "Hospedagens", val: totalHospedagens, cor: "#0891b2" },
                    { icon: "🕐", label: "Horários", val: totalHorarios, cor: "#059669" },
                    { icon: "📞", label: "Contatos", val: totalContatos, cor: "#1B3F7A" },
                    { icon: "🍽️", label: "Restaurantes", val: totalAlimentacao, cor: "#E8730A" },
                    { icon: "📅", label: "Agendas", val: totalAgenda, cor: "#7c3aed" },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", background: "#f8f9fb", borderRadius: 12, padding: "14px 8px", border: `1px solid ${s.cor}22` }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontWeight: 900, fontSize: 20, color: s.cor }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Hospedagem total financeiro se houver */}
                {totalHospedagens > 0 && (() => {
                  const totalH = (viagem.hospedagens || []).reduce((s, h) => s + (parseFloat(h.valorDiaria || 0) * parseInt(h.qtdDiaria || 0)), 0);
                  return totalH > 0 ? (
                    <div style={{ marginTop: 12, background: "#e0f2fe", borderRadius: 10, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0891b2" }}>💰 Total estimado hospedagens por pessoa</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: "#0891b2" }}>R$ {totalH.toFixed(2)}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* MATERIAIS ALMOXARIFADO — resumido */}
            {solicitacoesViagem.length > 0 && (
              <div style={card}>
                <div style={sec("#059669")}>📦 Materiais Solicitados ao Almoxarifado</div>
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.5fr", background: "#059669", padding: "11px 18px" }}>
                    {["Material", "Qtd", "Status", "Solicitante"].map(h => (
                      <div key={h} style={{ color: "#fff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                    ))}
                  </div>
                  {solicitacoesViagem.map((sol, si) =>
                    (sol.itens || []).map((it, ii) => {
                      const statusCores = { "Entregue":"#059669","Entregue Parcial":"#059669","Recusada":"#dc2626","Devolução Homologada":"#0891b2" };
                      const cor = statusCores[sol.status] || "#E8730A";
                      return (
                        <div key={`${si}-${ii}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.5fr", padding: "10px 18px", borderBottom: "1px solid #f0f0f0", background: (si + ii) % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{it.materialNome}</div>
                          <div style={{ fontSize: 13, color: "#1B3F7A", fontWeight: 700 }}>{it.quantidade} {it.unidade || "un."}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: cor }}>{sol.status}</div>
                          <div style={{ fontSize: 12, color: "#555" }}>{sol.solicitanteNome || sol.solicitante}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* OCORRÊNCIAS VIAGEM — resumo por tipo */}
            {totalOcViagem > 0 && (
              <div style={card}>
                <div style={sec("#E8730A")}>⚠️ Ocorrências de Viagem ({totalOcViagem})</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                  {Object.entries(ocPorTipo).map(([tipo_oc, qtd]) => (
                    <div key={tipo_oc} style={{ textAlign: "center", background: (TIPO_CFG_OC_EVENTO[tipo_oc]||{bg:"#fff3e0"}).bg, borderRadius: 10, padding: "10px 6px", border: `1px solid ${(TIPO_CFG_OC_EVENTO[tipo_oc]||{cor:"#E8730A"}).cor}44` }}>
                      <div style={{ fontSize: 18, marginBottom: 3 }}>{TIPO_OC[tipo_oc]?.split(" ")[0] || "📌"}</div>
                      <div style={{ fontWeight: 900, fontSize: 18, color: (TIPO_CFG_OC_EVENTO[tipo_oc]||{cor:"#E8730A"}).cor }}>{qtd}</div>
                      <div style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>{TIPO_CFG_OC_EVENTO[tipo_oc]?.label || TIPO_OC_SHORT[tipo_oc] || tipo_oc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LIÇÕES APRENDIDAS — resumo */}
            {viagem.licoesAprendidas && (
              <div style={card}>
                <div style={sec("#059669")}>✅ Avaliação e Observações da Equipe</div>
                <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: "#333", lineHeight: 1.7, border: "1px solid #bbf7d0", whiteSpace: "pre-wrap" }}>{viagem.licoesAprendidas}</div>
              </div>
            )}

            {/* PLANO DE AÇÃO — contador resumido */}
            {(viagem.planoAcaoViagem?.acoes || []).length > 0 && (() => {
              const acoes = viagem.planoAcaoViagem.acoes;
              const total = acoes.length;
              const concluidas = acoes.filter(a => a.status === "Concluída").length;
              const emAndamento = acoes.filter(a => a.status === "Em andamento").length;
              const pendentes = acoes.filter(a => !a.status || a.status === "Pendente").length;
              return (
                <div style={card}>
                  <div style={sec("#059669")}>📋 Plano de Ação ({total} ação{total !== 1 ? "ões" : ""})</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                    {[
                      { label: "Pendentes",    count: pendentes,   cor: "#E8730A" },
                      { label: "Em andamento", count: emAndamento, cor: "#0891b2" },
                      { label: "Concluídas",   count: concluidas,  cor: "#059669" },
                    ].map(({ label, count, cor }) => (
                      <div key={label} style={{ textAlign: "center", background: cor + "12", borderRadius: 12, padding: "14px 8px", border: `1px solid ${cor}33` }}>
                        <div style={{ fontWeight: 900, fontSize: 26, color: cor }}>{count}</div>
                        <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e8edf2" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "#059669", padding: "9px 14px" }}>
                      {["Ação", "Responsável", "Prazo", "Status"].map(h => (
                        <div key={h} style={{ color: "#fff", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                      ))}
                    </div>
                    {acoes.map((a, i) => {
                      const corSt = { Pendente: "#E8730A", "Em andamento": "#0891b2", Concluída: "#059669" }[a.status] || "#E8730A";
                      return (
                        <div key={a.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "9px 14px", borderBottom: i < acoes.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb", alignItems: "center" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#1B3F7A" }}>{a.titulo}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>{a.responsavelNome}</div>
                          <div style={{ fontSize: 11, color: "#888" }}>{a.prazo ? new Date(a.prazo + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: corSt, background: corSt + "18", borderRadius: 6, padding: "2px 6px", display: "inline-block" }}>{a.status || "Pendente"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ==================== COMPLETO ==================== */}
        {tipo === "completo" && (
          <>
            {/* CHECKLIST */}
            <div style={card}>
              <div style={sec()}>📋 Logística Antes da Viagem ({checkFeitos}/{todosItensChecklist.length})</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {todosItensChecklist.map((item, i) => {
                  const v = viagem.checklist?.[item] || {};
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: v.feito ? "#e8f5e9" : "#f8f9fb", borderRadius: 10, padding: "10px 14px", border: `1px solid ${v.feito ? "#c8e6c9" : "#e8edf2"}` }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: v.feito ? "#059669" : "#ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", flexShrink: 0, marginTop: 1 }}>{v.feito ? "✓" : ""}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: v.feito ? "#059669" : "#333", fontWeight: v.feito ? 600 : 400, textDecoration: v.feito ? "line-through" : "none" }}>{item}</div>
                        {v.responsavel && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>👤 {v.responsavel}</div>}
                        {v.dataLimite && <div style={{ fontSize: 11, color: "#888" }}>📅 {formatDate(v.dataLimite)}</div>}
                        {(v.ocorrencias || []).length > 0 && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ fontSize: 11, color: "#E8730A", fontWeight: 700, marginBottom: 4 }}>⚠️ {v.ocorrencias.length} ocorrência{v.ocorrencias.length !== 1 ? "s" : ""}</div>
                            {(v.ocorrencias || []).map((oc, oi) => (
                              <div key={oi} style={{ background: "#fff3e0", borderRadius: 6, padding: "5px 9px", marginBottom: 3, border: "1px solid #fed7aa", fontSize: 11 }}>
                                <div style={{ fontWeight: 700, color: "#E8730A" }}>
                                  {oc.tipo ? `${TIPO_OC[oc.tipo] || oc.tipo}` : "Ocorrência"}
                                  {oc.data ? <span style={{ fontWeight: 400, color: "#aaa", marginLeft: 6 }}>{new Date(oc.data).toLocaleString("pt-BR")}</span> : null}
                                </div>
                                <div style={{ color: "#333", marginTop: 2, lineHeight: 1.4 }}>{oc.descricao || oc.texto || "—"}</div>
                                {oc.autorEmail && <div style={{ color: "#aaa", marginTop: 1, fontSize: 10 }}>Por: {oc.autorEmail}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, height: 5, background: "#e8edf2", borderRadius: 3 }}>
                <div style={{ height: 5, background: checkFeitos === todosItensChecklist.length ? "#059669" : "#1B3F7A", borderRadius: 3, width: `${todosItensChecklist.length > 0 ? Math.round((checkFeitos / todosItensChecklist.length) * 100) : 0}%` }} />
              </div>
            </div>

            {/* MUNICÍPIOS ATENDIDOS — apenas para Regional */}
            {viagem.modalidade === "Regional" && (viagem.municipiosAtendidos || []).length > 0 && (
              <div style={card}>
                <div style={sec("#1B3F7A")}>🗺️ Municípios Atendidos pela Regional</div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
                  {(viagem.municipiosAtendidos || []).length} município{(viagem.municipiosAtendidos || []).length !== 1 ? "s" : ""} abrangidos por esta regional
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(viagem.municipiosAtendidos || []).sort().map((m, i) => (
                    <span key={i} style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "#1B3F7A" }}>{m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* EQUIPE */}
            {(viagem.equipe || []).length > 0 && (
              <div style={card}><div style={sec()}>👥 Equipe da Viagem</div>{renderEquipe()}</div>
            )}

            {/* DISTÂNCIAS — entre municípios */}
            {(viagem.distancias || []).length > 0 && (
              <div style={card}>
                <div style={sec("#0891b2")}>📏 Distâncias entre Municípios</div>
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", background: "#0891b2", padding: "11px 18px" }}>
                    {["Origem", "Destino", "Distância"].map(h => (
                      <div key={h} style={{ color: "#fff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                    ))}
                  </div>
                  {(viagem.distancias || []).map((d, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", padding: "11px 18px", borderBottom: i < viagem.distancias.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f0f9ff" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>📍 {d.origemLabel || d.origem}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>📍 {d.destinoLabel || d.destino}</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#0891b2" }}>{d.km} km</div>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", padding: "11px 18px", background: "#0891b2" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", gridColumn: "1 / 3" }}>TOTAL</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>
                      {(viagem.distancias || []).reduce((s, d) => s + (parseFloat(d.km) || 0), 0).toFixed(0)} km
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EQUIPAMENTOS — completo */}
            {(viagem.equipamentos || []).length > 0 && (
              <div style={card}>
                <div style={sec("#7c3aed")}>🎒 Equipamentos e Acessórios</div>
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", background: "#7c3aed", padding: "12px 18px" }}>
                    {["Equipamento / Acessório", "Tombo", "Descrição"].map(h => (
                      <div key={h} style={{ color: "#fff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                    ))}
                  </div>
                  {(viagem.equipamentos || []).map((eq, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", padding: "11px 18px", borderBottom: i < (viagem.equipamentos.length - 1) ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#faf8ff" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed" }}>🎒 {eq.tipo}</div>
                      <div style={{ fontSize: 13, color: "#555" }}>{eq.tombo || "—"}</div>
                      <div style={{ fontSize: 13, color: "#333" }}>{eq.descricao || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HOSPEDAGEM */}
            {(viagem.hospedagens || []).length > 0 && (
              <div style={card}>
                <div style={sec("#0891b2")}>🏨 Hospedagem</div>
                {(viagem.hospedagens || []).map((h, i) => (
                  <div key={i} style={{ background: "#f8f9fb", borderRadius: 14, padding: "14px 18px", marginBottom: 10, border: "1px solid #e0f2fe" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0891b2" }}>🏨 {h.nome}</div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>
                          📍 {h.municipio}{h.tipoQuarto ? ` · ${h.tipoQuarto}` : ""}
                        </div>
                      </div>
                      {h.valorDiaria && (
                        <div style={{ textAlign: "right", background: "#e0f2fe", borderRadius: 8, padding: "6px 12px" }}>
                          <div style={{ fontSize: 11, color: "#0891b2", fontWeight: 600 }}>R$ {h.valorDiaria} × {h.qtdDiaria} diárias</div>
                          <div style={{ fontWeight: 900, fontSize: 15, color: "#0891b2" }}>R$ {(parseFloat(h.valorDiaria||0)*parseInt(h.qtdDiaria||0)).toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                    {h.infoPagamento && (
                      <div style={{ background: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#555", border: "1px solid #bae6fd", marginTop: 8 }}>
                        <span style={{ fontWeight: 700, color: "#0891b2" }}>Pagamento: </span>{h.infoPagamento}
                      </div>
                    )}
                  </div>
                ))}
                {/* Total hospedagem */}
                {(() => {
                  const total = (viagem.hospedagens || []).reduce((s, h) => s + (parseFloat(h.valorDiaria||0)*parseInt(h.qtdDiaria||0)), 0);
                  return total > 0 ? (
                    <div style={{ background: "#0891b2", borderRadius: 10, padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>💰 Total estimado</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>R$ {total.toFixed(2)}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* HORÁRIOS */}
            {horariosOrdenados.length > 0 && (
              <div style={card}>
                <div style={sec("#059669")}>🕐 Horários de Deslocamento</div>
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr 1fr", background: "#059669", padding: "12px 18px" }}>
                    {["Data", "Hora", "Origem", "Destino"].map(h => <div key={h} style={{ color: "#fff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>)}
                  </div>
                  {horariosOrdenados.map((h, i) => (
                    <div key={i}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr 1fr", padding: "12px 18px", borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A" }}>{formatDate(h.data)}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#E8730A" }}>{h.hora}</div>
                        <div style={{ fontSize: 13, color: "#333" }}>{h.origem}</div>
                        <div style={{ fontSize: 13, color: "#333" }}>{h.destino}</div>
                      </div>
                      {h.extra && (
                        <div style={{ padding: "6px 18px 10px", background: i % 2 === 0 ? "#fff" : "#f8f9fb", borderBottom: i < horariosOrdenados.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                          <div style={{ fontSize: 11, color: "#888", background: "#f0f4ff", borderRadius: 6, padding: "4px 10px", display: "inline-block" }}>{h.extra}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CONTATOS */}
            {(viagem.contatos || []).length > 0 && (
              <div style={card}>
                <div style={sec("#1B3F7A")}>📞 Contatos Importantes</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
                  {(viagem.contatos || []).map((c, i) => (
                    <div key={i} style={{ background: "#f8f9fb", borderRadius: 14, padding: "14px 16px", border: "1px solid #e8edf2" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A", marginBottom: 8 }}>👤 {c.nome}</div>
                      {c.whatsapp && (
                        <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                          style={{ ...tag("#dcfce7", "#16a34a"), marginBottom: 6, display: "inline-flex" }}>
                          💬 {fmtWhats(c.whatsapp)}
                        </a>
                      )}
                      {c.extra && <div style={{ fontSize: 12, color: "#555", marginTop: 6, lineHeight: 1.5 }}>{c.extra}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ALIMENTAÇÃO */}
            {(viagem.alimentacao || []).length > 0 && (
              <div style={card}>
                <div style={sec("#E8730A")}>🍽️ Locais de Alimentação</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {(viagem.alimentacao || []).map((a, i) => (
                    <div key={i} style={{ background: "#f8f9fb", borderRadius: 14, padding: "14px 16px", border: "1px solid #e8edf2" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#E8730A", marginBottom: 8 }}>🍽️ {a.nome}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                        {a.endereco && (
                          <a href={`https://waze.com/ul?q=${encodeURIComponent(a.endereco)}`} target="_blank" rel="noreferrer"
                            style={{ ...tag("#dbeafe", "#1d4ed8") }}>
                            📍 {a.endereco}
                          </a>
                        )}
                        {a.whatsapp && (
                          <a href={`https://wa.me/55${a.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                            style={{ ...tag("#dcfce7", "#16a34a") }}>
                            💬 {fmtWhats(a.whatsapp)}
                          </a>
                        )}
                      </div>
                      {a.extra && <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{a.extra}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AGENDA */}
            {agendaOrdenada.length > 0 && (
              <div style={card}>
                <div style={sec("#7c3aed")}>📅 Agenda da Viagem</div>
                {agendaOrdenada.map((a, i) => (
                  <div key={i} style={{ background: "#f8f9fb", borderRadius: 14, padding: "14px 18px", marginBottom: 10, border: "1px solid #e8edf2", borderLeft: "4px solid #7c3aed" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{formatDate(a.data)}</span>
                      {a.hora && <span style={{ background: "#E8730A", color: "#fff", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{a.hora}</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A", marginBottom: 6 }}>{a.descricao}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {a.destino && <span style={{ fontSize: 12, color: "#555", background: "#fff", borderRadius: 6, padding: "3px 10px", border: "1px solid #e8edf2" }}>📍 {a.destino}</span>}
                      {a.motorista && (
                        <span style={{ fontSize: 12, color: "#0891b2", background: "#e0f2fe", borderRadius: 6, padding: "3px 10px", fontWeight: 700 }}>
                          🚗 {resolveMembroNome(a.motorista).nome}
                        </span>
                      )}
                      {(a.pessoas || []).map((p, j) => (
                        <span key={j} style={{ fontSize: 12, color: "#1B3F7A", background: "#eff6ff", borderRadius: 6, padding: "3px 10px", fontWeight: 600 }}>
                          👤 {resolveMembroNome(p).nome}
                        </span>
                      ))}
                    </div>
                    {a.extra && <div style={{ fontSize: 12, color: "#555", marginTop: 8, background: "#fff", borderRadius: 8, padding: "6px 12px", border: "1px solid #e8edf2" }}>{a.extra}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* MATERIAIS ALMOXARIFADO — completo */}
            {solicitacoesViagem.length > 0 && (
              <div style={card}>
                <div style={sec("#059669")}>📦 Materiais Solicitados ao Almoxarifado</div>
                {solicitacoesViagem.map((sol, si) => {
                  const statusCores = { "Entregue":"#059669","Entregue Parcial":"#059669","Recusada":"#dc2626","Aguardando Autorização":"#E8730A","Aguardando Homologação":"#7c3aed","Em Separação":"#0891b2","Devolução Pendente":"#0891b2","Devolução Homologada":"#059669" };
                  const cor = statusCores[sol.status] || "#888";
                  return (
                    <div key={si} style={{ background: "#f8f9fb", borderRadius: 14, padding: "14px 18px", marginBottom: 10, borderLeft: `4px solid ${cor}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1B3F7A" }}>{sol.solicitanteNome || sol.solicitante}</div>
                          {sol.setor && <div style={{ fontSize: 12, color: "#888" }}>{sol.setor}</div>}
                          {sol.justificativa && <div style={{ fontSize: 12, color: "#555", marginTop: 3, fontStyle: "italic" }}>"{sol.justificativa}"</div>}
                        </div>
                        <div style={{ background: cor + "18", borderRadius: 8, padding: "3px 12px", fontSize: 11, fontWeight: 700, color: cor, whiteSpace: "nowrap", marginLeft: 10 }}>{sol.status}</div>
                      </div>
                      {/* Itens */}
                      <div style={{ border: "1px solid #e8edf2", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", background: "#1B3F7A", padding: "8px 14px" }}>
                          {["Material", "Solicitado", "Entregue"].map(h => <div key={h} style={{ color: "#fff", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>)}
                        </div>
                        {(sol.itens || []).map((it, ii) => {
                          const entregue = (sol.itensEntregues || [])[ii];
                          return (
                            <div key={ii} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "8px 14px", borderBottom: ii < sol.itens.length - 1 ? "1px solid #f0f0f0" : "none", background: ii % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{it.materialNome}</div>
                              <div style={{ fontSize: 13, color: "#1B3F7A", fontWeight: 700 }}>{it.quantidade} {it.unidade || "un."}</div>
                              <div style={{ fontSize: 13, color: entregue ? "#059669" : "#aaa", fontWeight: entregue ? 700 : 400 }}>
                                {entregue ? `${entregue.quantidade} ${entregue.unidade || "un."}` : "—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Devolução */}
                      {sol.status === "Devolução Homologada" && (sol.itensDevolucao || []).length > 0 && (
                        <div style={{ background: sol.devolucaoAceita ? "#e8f5e9" : "#fee2e2", borderRadius: 8, padding: "8px 12px", border: `1px solid ${sol.devolucaoAceita ? "#c8e6c9" : "#fecaca"}` }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: sol.devolucaoAceita ? "#059669" : "#dc2626", marginBottom: 4 }}>
                            {sol.devolucaoAceita ? "✅" : "❌"} Devolução {sol.devolucaoAceita ? "aceita" : "não homologada"}
                          </div>
                          {(sol.itensDevolucao || []).map((it, di) => (
                            <div key={di} style={{ fontSize: 12, color: "#333" }}>
                              ↩️ {it.materialNome} QTD {it.qtdDevolvida} — aceita em {new Date(sol.devolucaoHomologadaEm).toLocaleString("pt-BR")} por {sol.devolucaoHomologadaPor}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Histórico */}
                      {(sol.historico || []).length > 0 && (
                        <div style={{ marginTop: 8, borderTop: "1px solid #e8edf2", paddingTop: 8 }}>
                          <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>Histórico</div>
                          {(sol.historico || []).map((h, hi) => (
                            <div key={hi} style={{ fontSize: 11, color: "#555", borderLeft: "2px solid #e8edf2", paddingLeft: 8, marginBottom: 3 }}>
                              <span style={{ fontWeight: 700, color: "#888" }}>{new Date(h.data).toLocaleString("pt-BR")}</span> — {h.texto}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* MUNICÍPIOS — tabela resumo no completo */}
            <div style={card}>
              <div style={sec()}>📍 Municípios da Viagem ({eventosVinculados.length})</div>
              {eventosVinculados.length === 0 ? (
                <div style={{ textAlign: "center", color: "#aaa", padding: 20 }}>Nenhum município vinculado</div>
              ) : (
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr 1fr 1fr", background: "#1B3F7A", padding: "12px 18px" }}>
                    {["Município/Região", "Data", "Equipe", "Inscritos", "Capacitados", "Ocorrências"].map(h => (
                      <div key={h} style={{ color: "#fff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                    ))}
                  </div>
                  {eventosVinculados.map((ev, i) => {
                    const cap = getCapacitados(ev); const insc = getInscritos(ev);
                    return (
                      <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr 1fr", padding: "12px 18px", borderBottom: i < eventosVinculados.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{ev.tipo === "Municipal" ? ev.municipio : ev.regiao}</div>
                        <div style={{ fontSize: 13, color: "#555" }}>{formatDate(ev.data)}</div>
                        <div>
                          {((viagem.equipeMunicipio || {})[ev.id]?.motoristas || []).map((ch, i) => {
                            const { nome } = resolveMembroNome(ch);
                            return <div key={i} style={{ fontSize: 11, color: "#0891b2", fontWeight: 400 }}>🚗 {nome}</div>;
                          })}
                          {((viagem.equipeMunicipio || {})[ev.id]?.apoios || []).map((ch, i) => {
                            const { nome } = resolveMembroNome(ch);
                            return <div key={i} style={{ fontSize: 11, color: "#1B3F7A", fontWeight: 700 }}>👤 {nome}</div>;
                          })}
                          {(ev.acoesEducacionais || []).filter(a => a.instrutorNome).map((a, i) => (
                            <div key={i} style={{ fontSize: 11, color: a.modalidade === "EaD" ? "#7c3aed" : "#059669", fontWeight: 600 }}>
                              {a.modalidade === "EaD" ? "💻" : "👨‍🏫"} {a.instrutorNome}
                              {a.modalidade === "EaD" && <span style={{ fontSize: 9, marginLeft: 3, background: "#f3e8ff", color: "#7c3aed", borderRadius: 4, padding: "1px 4px", fontWeight: 700 }}>EaD</span>}
                            </div>
                          ))}
                          {!((viagem.equipeMunicipio || {})[ev.id]?.motoristas || []).length && !((viagem.equipeMunicipio || {})[ev.id]?.apoios || []).length && !(ev.acoesEducacionais || []).some(a => a.instrutorNome) && <span style={{ color: "#ccc", fontSize: 11 }}>—</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#0891b2" }}>{insc > 0 ? insc : "—"}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#059669" }}>{cap || "—"}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: (ev.ocorrencias || []).length > 0 ? "#E8730A" : "#aaa" }}>{(ev.ocorrencias || []).length || "—"}</div>
                      </div>
                    );
                  })}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr 1fr", padding: "13px 18px", background: "#E8730A", borderTop: "2px solid #c45f00" }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>TOTAL</div>
                    <div /><div />
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{totalParticipantes}</div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{totalOcEventos}</div>
                  </div>
                </div>
              )}
            </div>

            {/* DETALHAMENTO POR MUNICÍPIO */}
            <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(27,63,122,0.07)", marginBottom: 20 }}>
              <div style={{ background: "#059669", padding: "18px 32px" }}>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>📍 Detalhamento por Município</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 }}>{eventosVinculados.length} municípios · {totalParticipantes} capacitados</div>
              </div>
              {eventosVinculados.map((ev, idx) => {
                const cap = getCapacitados(ev); const insc = getInscritos(ev);
                return (
                  <div key={ev.id} style={{ padding: "24px 32px", borderBottom: idx < eventosVinculados.length - 1 ? "2px solid #e8edf2" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 18, color: "#1B3F7A" }}>{ev.tipo === "Municipal" ? ev.municipio : ev.regiao}</div>
                        <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>📅 {formatDate(ev.data)}{ev.local ? ` · 📍 ${ev.local}` : ""}</div>
                        <div style={{ fontSize: 12, color: "#aaa", marginTop: 1 }}>{ev.status}</div>
                        {/* Equipe do município */}
                        {(((viagem.equipeMunicipio || {})[ev.id]?.motoristas || []).length > 0 || ((viagem.equipeMunicipio || {})[ev.id]?.apoios || []).length > 0) && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                            {((viagem.equipeMunicipio || {})[ev.id]?.motoristas || []).map((ch, mi) => {
                              const { nome } = resolveMembroNome(ch);
                              return <span key={mi} style={{ background: "#e0f2fe", borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 400, color: "#0891b2" }}>🚗 {nome}</span>;
                            })}
                            {((viagem.equipeMunicipio || {})[ev.id]?.apoios || []).map((ch, mi) => {
                              const { nome } = resolveMembroNome(ch);
                              return <span key={mi} style={{ background: "#eff6ff", borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700, color: "#1B3F7A" }}>👤 {nome}</span>;
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{ background: "#059669", borderRadius: 12, padding: "8px 16px", textAlign: "center" }}>
                        {insc > 0 && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginBottom: 2 }}>{insc} inscritos</div>}
                        <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>{cap}</div>
                        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>capacitados</div>
                      </div>
                    </div>
                    {/* Ações educacionais */}
                    {(ev.acoesEducacionais || []).length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Ações Educacionais</div>
                        {(ev.acoesEducacionais || []).map((a, j) => {
                          const pct = cap > 0 ? Math.round(((parseInt(a.participantes)||0) / cap) * 100) : 0;
                          const cores = ["#1B3F7A", "#059669", "#E8730A", "#7c3aed"];
                          return (
                            <div key={j} style={{ marginBottom: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 13, color: "#333" }}>{a.acaoNome || a.nome || "—"}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#1B3F7A" }}>{a.participantes || 0} ({pct}%)</span>
                              </div>
                              <div style={{ height: 5, background: "#e8edf2", borderRadius: 3 }}>
                                <div style={{ height: 5, background: cores[j % cores.length], borderRadius: 3, width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Ocorrências do evento — agrupadas por tipo */}
                    {(ev.ocorrencias || []).length > 0 && (() => {
                      const grupos_oc = {};
                      (ev.ocorrencias||[]).forEach(oc => { const t=oc.tipo||"outro"; if(!grupos_oc[t])grupos_oc[t]=[]; grupos_oc[t].push(oc); });
                      return (
                        <div>
                          <div style={{ fontSize:12,fontWeight:700,color:"#E8730A",textTransform:"uppercase",letterSpacing:1,marginBottom:10 }}>⚠️ Ocorrências do Evento ({ev.ocorrencias.length})</div>
                          {ORDEM_TIPOS_OC.filter(t=>grupos_oc[t]).map(tipo => {
                            const cfg = TIPO_CFG_OC_EVENTO[tipo]||{label:tipo,bg:"#f8f9fb",cor:"#888"};
                            return (
                              <div key={tipo} style={{ marginBottom:10 }}>
                                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                                  <span style={{ background:cfg.bg,borderRadius:6,padding:"2px 10px",fontSize:10,fontWeight:800,color:cfg.cor,border:`1px solid ${cfg.cor}33` }}>{cfg.label}</span>
                                  <span style={{ fontSize:10,color:"#aaa" }}>{grupos_oc[tipo].length}×</span>
                                </div>
                                {grupos_oc[tipo].map((oc,j) => (
                                  <div key={j} style={{ background:cfg.bg,borderRadius:8,padding:"8px 12px",marginBottom:5,border:`1px solid ${cfg.cor}33` }}>
                                    <div style={{ fontSize:10,color:"#aaa",marginBottom:3 }}>{oc.data?new Date(oc.data).toLocaleString("pt-BR"):""}{oc.autorEmail?` · ${oc.autorEmail}`:""}</div>
                                    {oc.nome && (
                                    <div style={{ fontSize:11,color:"#555",marginBottom:3,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap" }}>
                                      👤
                                      <span>
                                        {oc.nome.split(" ")[0]}{" "}
                                        <span style={{ display:"inline-block", background:"#111", borderRadius:2, width:80, height:12, verticalAlign:"middle", WebkitPrintColorAdjust:"exact", printColorAdjust:"exact" }} />
                                      </span>
                                      {oc.cpf && <span>· CPF: <span style={{ display:"inline-block", background:"#111", borderRadius:2, width:100, height:12, verticalAlign:"middle", WebkitPrintColorAdjust:"exact", printColorAdjust:"exact" }} /></span>}
                                      {oc.email && <span>· <span style={{ display:"inline-block", background:"#111", borderRadius:2, width:130, height:12, verticalAlign:"middle", WebkitPrintColorAdjust:"exact", printColorAdjust:"exact" }} /></span>}
                                    </div>
                                  )}
                                    <div style={{ fontSize:12,color:"#333" }}>{oc.descricao||oc.texto}</div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {/* OCORRÊNCIAS DE VIAGEM — detalhadas */}
            {(viagem.ocorrencias || []).length > 0 && (
              <div style={card}>
                <div style={sec("#E8730A")}>⚠️ Ocorrências de Viagem ({viagem.ocorrencias.length})</div>
                {/* Resumo por tipo */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {Object.entries(ocPorTipo).map(([tp, qtd]) => (
                    <div key={tp} style={{ background: "#fff3e0", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: "#E8730A", border: "1px solid #fed7aa" }}>
                      {TIPO_OC[tp] || tp} ({qtd})
                    </div>
                  ))}
                </div>
                {/* Lista completa */}
                {(viagem.ocorrencias || []).map((oc, i) => (
                  <div key={oc.id || i} style={{ background: "#f8f9fb", borderRadius: 12, padding: "12px 16px", marginBottom: 8, borderLeft: "4px solid #E8730A" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ background: (TIPO_CFG_OC_EVENTO[oc.tipo]||{bg:"#fff3e0"}).bg, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: (TIPO_CFG_OC_EVENTO[oc.tipo]||{cor:"#E8730A"}).cor }}>{TIPO_CFG_OC_EVENTO[oc.tipo]?.label || TIPO_OC[oc.tipo] || oc.tipo}</span>
                      <span style={{ fontSize: 11, color: "#aaa" }}>{oc.data ? new Date(oc.data).toLocaleString("pt-BR") : ""}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#333", background: "#fff", borderRadius: 8, padding: "8px 12px", marginBottom: 4 }}>{oc.descricao}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>Por: {oc.autorEmail}</div>
                  </div>
                ))}
              </div>
            )}

            {/* CONSOLIDADO FINAL */}
            <div style={{ background: "#1B3F7A", borderRadius: 20, padding: "24px 32px", marginBottom: 20 }}>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 4, height: 20, background: "#E8730A", borderRadius: 2 }} />📊 Consolidado Geral
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Municípios atendidos", value: eventosVinculados.length, cor: "#93c5fd" },
                  { label: "Total inscritos", value: totalInscritos || "—", cor: "#93c5fd" },
                  { label: "Total capacitados", value: totalParticipantes, cor: "#6ee7b7" },
                  { label: "Ocorr. registradas", value: totalOcEventos + totalOcViagem, cor: "#fcd34d" },
                  { label: "Logística checklist", value: `${checkFeitos}/${todosItensChecklist.length}`, cor: "#c4b5fd" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 8px" }}>
                    <div style={{ fontWeight: 900, fontSize: 26, color: s.cor }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* LIÇÕES APRENDIDAS */}
            {viagem.licoesAprendidas && (
              <div style={card}>
                <div style={sec("#059669")}>✅ Pós Viagem — Avaliação e Observações da Equipe</div>
                <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: "#333", lineHeight: 1.7, border: "1px solid #bbf7d0", whiteSpace: "pre-wrap" }}>{viagem.licoesAprendidas}</div>
              </div>
            )}

            {/* PLANO DE AÇÃO — detalhado completo */}
            {(viagem.planoAcaoViagem?.acoes || []).length > 0 && (() => {
              const acoes = viagem.planoAcaoViagem.acoes;
              const total = acoes.length;
              const concluidas = acoes.filter(a => a.status === "Concluída").length;
              return (
                <div style={card}>
                  <div style={sec("#059669")}>📋 Plano de Ação — {total} ação{total !== 1 ? "ões" : ""} · {concluidas} concluída{concluidas !== 1 ? "s" : ""}</div>
                  {acoes.map((a, i) => {
                    const corSt = { Pendente: "#E8730A", "Em andamento": "#0891b2", Concluída: "#059669" }[a.status] || "#E8730A";
                    const corPr = { Alta: "#dc2626", Média: "#E8730A", Baixa: "#059669" }[a.prioridade] || "#888";
                    return (
                      <div key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fb", borderRadius: 14, padding: "16px 18px", marginBottom: 10, border: `1px solid ${corSt}33` }}>
                        {/* Badges */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                          <span style={{ background: corSt + "22", borderRadius: 6, padding: "2px 10px", fontSize: 10, fontWeight: 800, color: corSt }}>{a.status || "Pendente"}</span>
                          {a.prioridade && <span style={{ background: corPr + "22", borderRadius: 6, padding: "2px 10px", fontSize: 10, fontWeight: 700, color: corPr }}>{a.prioridade === "Alta" ? "🔴" : a.prioridade === "Média" ? "🟡" : "🟢"} {a.prioridade}</span>}
                          {a.prazo && <span style={{ background: "#f3f4f6", borderRadius: 6, padding: "2px 10px", fontSize: 10, fontWeight: 600, color: "#888" }}>📅 {new Date(a.prazo + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
                        </div>
                        {/* Título */}
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#1B3F7A", marginBottom: 6 }}>{a.titulo}</div>
                        {/* Descrição */}
                        {a.descricao && <div style={{ fontSize: 13, color: "#555", background: "#f8f9fb", borderRadius: 8, padding: "8px 12px", marginBottom: 10, lineHeight: 1.6 }}>{a.descricao}</div>}
                        {/* Responsável e criador */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: a.andamento ? 10 : 0 }}>
                          <div style={{ background: "#eff6ff", borderRadius: 8, padding: "8px 12px" }}>
                            <div style={{ fontSize: 10, color: "#1B3F7A", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Responsável</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1B3F7A" }}>👤 {a.responsavelNome}</div>
                            <div style={{ fontSize: 11, color: "#888" }}>{a.responsavelEmail}</div>
                          </div>
                          <div style={{ background: "#f8f9fb", borderRadius: 8, padding: "8px 12px" }}>
                            <div style={{ fontSize: 10, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Criado por</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#333" }}>{a.criadoPor || "—"}</div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>{a.criadoEm ? new Date(a.criadoEm).toLocaleString("pt-BR") : "—"}</div>
                          </div>
                        </div>
                        {/* Andamento */}
                        {a.andamento && (
                          <div style={{ background: "#e0f2fe", borderRadius: 10, padding: "10px 14px", marginTop: 8, borderLeft: "3px solid #0891b2" }}>
                            <div style={{ fontSize: 10, color: "#0891b2", fontWeight: 700, marginBottom: 3 }}>
                              🔄 Andamento — {a.atualizadoPor || "—"} · {a.atualizadoEm ? new Date(a.atualizadoEm).toLocaleString("pt-BR") : ""}
                            </div>
                            <div style={{ fontSize: 13, color: "#333" }}>{a.andamento}</div>
                          </div>
                        )}
                        {/* Conclusão */}
                        {a.status === "Concluída" && (
                          <div style={{ background: "#e8f5e9", borderRadius: 10, padding: "6px 12px", marginTop: 8, borderLeft: "3px solid #059669" }}>
                            <div style={{ fontSize: 10, color: "#059669", fontWeight: 700 }}>
                              ✅ Concluída por {a.atualizadoPor || "—"} · {a.atualizadoEm ? new Date(a.atualizadoEm).toLocaleString("pt-BR") : ""}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
