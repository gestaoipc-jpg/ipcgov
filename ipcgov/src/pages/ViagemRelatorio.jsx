import { useState } from "react";

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function formatDateTime() {
  return new Date().toLocaleString("pt-BR");
}

const TIPO_OC = { transporte: "Transporte", hotel: "Hotel/Hospedagem", alimentacao: "Alimentação", outro: "Outro" };
const STATUS_COR = { Programada: "#7c3aed", "Em Execução": "#E8730A", Concluída: "#059669" };

export default function ViagemRelatorio({ viagem, eventos, onBack, servidores, usuarios, instrutores, motoristas }) {
  const [tipo, setTipo] = useState("resumido"); // "resumido" | "completo"

  if (!viagem) return null;

  // Resolve nome a partir do email/chave armazenado na equipe
  const resolveMembroNome = (chave) => {
    if (!chave) return chave;
    // Instrutores (chave inst_ID)
    if (chave.startsWith("inst_")) {
      const id = chave.replace("inst_", "");
      const m = (instrutores || []).find(x => x.id === id);
      return m ? { nome: m.nome || m.email || chave, tipo: "instrutor" } : { nome: chave, tipo: "instrutor" };
    }
    // Motoristas (chave mot_ID)
    if (chave.startsWith("mot_")) {
      const id = chave.replace("mot_", "");
      const m = (motoristas || []).find(x => x.id === id);
      return m ? { nome: m.nome || m.email || chave, tipo: "motorista" } : { nome: chave, tipo: "motorista" };
    }
    // Por email — busca em todas as listas
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

  const eventosVinculados = (eventos || []).filter(e => (viagem.municipiosIds || []).includes(e.id));
  const totalParticipantes = eventosVinculados.reduce((s, e) =>
    s + (e.acoesEducacionais || []).reduce((ss, a) => ss + (parseInt(a.participantes) || 0), 0), 0);
  const totalOcorrencias = eventosVinculados.reduce((s, e) => s + (e.ocorrencias || []).length, 0);
  const totalOcViagem = (viagem.ocorrencias || []).length;

  // Consolidar participantes por ação educacional
  const porAcao = {};
  eventosVinculados.forEach(e => {
    (e.acoesEducacionais || []).forEach(a => {
      const nome = a.acaoNome || a.nome || "—";
      if (!porAcao[nome]) porAcao[nome] = 0;
      porAcao[nome] += parseInt(a.participantes) || 0;
    });
  });
  const acoesOrdenadas = Object.entries(porAcao).sort((a, b) => b[1] - a[1]);

  const gerarPDF = () => {
    window.print();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-area { padding: 0 !important; background: #fff !important; margin: 0 !important; max-width: 100% !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 12mm; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* HEADER - no print */}
      <div className="no-print" style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "20px 24px 28px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div onClick={onBack} style={{ width: 38, height: 38, background: "rgba(255,255,255,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 18 }}>←</div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 3 }}>TCEDUC · VIAGEM</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>📄 Relatório de Viagem</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              {["resumido", "completo"].map(t => (
                <div key={t} onClick={() => setTipo(t)} style={{ background: tipo === t ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", border: `1px solid ${tipo === t ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`, borderRadius: 12, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
                  {t === "resumido" ? "📋 Resumido" : "📑 Completo"}
                </div>
              ))}
              <div onClick={gerarPDF} style={{ background: "#E8730A", borderRadius: 12, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                🖨️ Gerar PDF
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO */}
      <div className="print-area" style={{ maxWidth: 900, margin: "32px auto", padding: "0 24px 80px" }}>

        {/* ===== CABEÇALHO DO RELATÓRIO ===== */}
        <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 24px rgba(27,63,122,0.1)", marginBottom: 24 }}>
          <div style={{ background: "#1B3F7A", padding: "32px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#ffffff", fontSize: 11, letterSpacing: 3, marginBottom: 6, fontWeight: 700 }}>INSTITUTO PLÁCIDO CASTELO — TCEDUC</div>
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 28, letterSpacing: -1 }}>IPC<span style={{ color: "#E8730A" }}>gov</span></div>
                <div style={{ color: "#ffffff", fontSize: 14, marginTop: 4, fontWeight: 600 }}>
                  Relatório de Viagem — {tipo === "resumido" ? "Resumido" : "Completo"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ background: STATUS_COR[viagem.status] || "#1B3F7A", borderRadius: 10, padding: "5px 14px", color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{viagem.status || "—"}</div>
                <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 600 }}>Gerado em {formatDateTime()}</div>
              </div>
            </div>
            <div style={{ marginTop: 24, borderTop: "1px solid #2d5a9e", paddingTop: 18 }}>
              <div style={{ color: "#ffffff", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>VIAGEM</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 32, letterSpacing: -1, marginTop: 4 }}>{viagem.titulo}</div>
              <div style={{ color: "#ffffff", fontSize: 14, marginTop: 6, fontWeight: 600 }}>
                📅 {formatDate(viagem.dataInicio)}{viagem.dataFim ? ` → ${formatDate(viagem.dataFim)}` : ""}
                {" · "}📍 {eventosVinculados.length} município{eventosVinculados.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* CARDS ESTATÍSTICAS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", background: "#f8f9fb", borderTop: "1px solid #e8edf2" }}>
            {[
              { label: "Municípios", value: eventosVinculados.length, icon: "📍", cor: "#1B3F7A" },
              { label: "Total Capacitados", value: totalParticipantes, icon: "👥", cor: "#059669" },
              { label: "Ocorr. Eventos", value: totalOcorrencias, icon: "⚠️", cor: "#E8730A" },
              { label: "Ocorr. Viagem", value: totalOcViagem, icon: "🚌", cor: "#7c3aed" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "20px 16px", textAlign: "center", borderRight: i < 3 ? "1px solid #e8edf2" : "none" }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontWeight: 900, fontSize: 24, color: s.cor }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== RELATÓRIO RESUMIDO ===== */}
        {tipo === "resumido" && (
          <>
            {/* EQUIPE */}
            {(viagem.equipe || []).length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: "24px 32px", marginBottom: 20, boxShadow: "0 2px 12px rgba(27,63,122,0.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 18, background: "#1B3F7A", borderRadius: 2 }} />
                  Equipe da Viagem
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {viagem.equipe.map((chave, i) => {
                    const m = resolveMembroNome(chave);
                    const bg = m.tipo === "instrutor" ? "#f3e8ff" : m.tipo === "motorista" ? "#e0f2fe" : "#eff6ff";
                    const cor = m.tipo === "instrutor" ? "#7c3aed" : m.tipo === "motorista" ? "#0891b2" : "#1B3F7A";
                    const borda = m.tipo === "instrutor" ? "#e9d5ff" : m.tipo === "motorista" ? "#bae6fd" : "#1B3F7A33";
                    const icone = m.tipo === "instrutor" ? "👨‍🏫" : m.tipo === "motorista" ? "🚗" : "👤";
                    return (
                      <div key={i} style={{ background: bg, borderRadius: 10, padding: "6px 14px", fontSize: 13, color: cor, fontWeight: 600, border: `1px solid ${borda}` }}>
                        {icone} {m.nome}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TABELA MUNICÍPIOS */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "24px 32px", marginBottom: 20, boxShadow: "0 2px 12px rgba(27,63,122,0.07)" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 4, height: 18, background: "#1B3F7A", borderRadius: 2 }} />
                Municípios da Viagem ({eventosVinculados.length})
              </div>
              {eventosVinculados.length === 0 ? (
                <div style={{ textAlign: "center", color: "#aaa", padding: 20 }}>Nenhum município vinculado</div>
              ) : (
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "#1B3F7A", padding: "12px 18px" }}>
                    {["Município/Região", "Data", "Capacitados", "Ocorrências"].map(h => (
                      <div key={h} style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                    ))}
                  </div>
                  {eventosVinculados.map((ev, i) => {
                    const cap = (ev.acoesEducacionais || []).reduce((s, a) => s + (parseInt(a.participantes) || 0), 0);
                    return (
                      <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "12px 18px", borderBottom: i < eventosVinculados.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{ev.tipo === "Municipal" ? ev.municipio : ev.regiao}</div>
                        <div style={{ fontSize: 13, color: "#555" }}>{formatDate(ev.data)}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#059669" }}>{cap || "—"}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: (ev.ocorrencias || []).length > 0 ? "#E8730A" : "#aaa" }}>{(ev.ocorrencias || []).length || "—"}</div>
                      </div>
                    );
                  })}
                  {/* Totais */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "13px 18px", background: "#E8730A", borderTop: "2px solid #c45f00" }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>TOTAL</div>
                    <div />
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{totalParticipantes}</div>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{totalOcorrencias}</div>
                  </div>
                </div>
              )}
            </div>

            {/* PARTICIPANTES POR CURSO */}
            {acoesOrdenadas.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: "24px 32px", marginBottom: 20, boxShadow: "0 2px 12px rgba(27,63,122,0.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 18, background: "#059669", borderRadius: 2 }} />
                  Capacitados por Ação Educacional
                </div>
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", background: "#059669", padding: "12px 18px" }}>
                    <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Ação Educacional</div>
                    <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Total</div>
                  </div>
                  {acoesOrdenadas.map(([nome, total], i) => (
                    <div key={nome} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "12px 18px", borderBottom: i < acoesOrdenadas.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{nome}</div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "#059669" }}>{total}</div>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "13px 18px", background: "#E8730A" }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>TOTAL GERAL</div>
                    <div style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>{totalParticipantes}</div>
                  </div>
                </div>

                {/* GRÁFICO DE BARRAS SIMPLES */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 12 }}>📊 Distribuição por Curso</div>
                  {acoesOrdenadas.map(([nome, total], i) => {
                    const pct = totalParticipantes > 0 ? Math.round((total / totalParticipantes) * 100) : 0;
                    const cores = ["#1B3F7A", "#059669", "#E8730A", "#7c3aed", "#0891b2", "#dc2626"];
                    const cor = cores[i % cores.length];
                    return (
                      <div key={nome} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>{nome}</div>
                          <div style={{ fontSize: 12, color: "#555", fontWeight: 700 }}>{total} ({pct}%)</div>
                        </div>
                        <div style={{ height: 8, background: "#e8edf2", borderRadius: 4 }}>
                          <div style={{ height: 8, background: cor, borderRadius: 4, width: `${pct}%`, transition: "width .3s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OCORRÊNCIAS DE VIAGEM RESUMO */}
            {(viagem.ocorrencias || []).length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: "24px 32px", marginBottom: 20, boxShadow: "0 2px 12px rgba(27,63,122,0.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 18, background: "#E8730A", borderRadius: 2 }} />
                  Ocorrências de Viagem ({viagem.ocorrencias.length})
                </div>
                {/* Agrupado por tipo */}
                {Object.entries(
                  viagem.ocorrencias.reduce((acc, oc) => { acc[oc.tipo] = (acc[oc.tipo] || 0) + 1; return acc; }, {})
                ).map(([tipo, count]) => (
                  <div key={tipo} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", background: "#f8f9fb", borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>{TIPO_OC[tipo] || tipo}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#E8730A" }}>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== RELATÓRIO COMPLETO ===== */}
        {tipo === "completo" && (
          <>
            {/* CHECKLIST LOGÍSTICA */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "24px 32px", marginBottom: 20, boxShadow: "0 2px 12px rgba(27,63,122,0.07)" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 4, height: 18, background: "#1B3F7A", borderRadius: 2 }} />
                Logística Antes da Viagem
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[...Object.keys(viagem.checklist || {})].map((item, i) => {
                  const val = (viagem.checklist || {})[item] || {};
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: val.feito ? "#e8f5e9" : "#f8f9fb", borderRadius: 10, border: `1px solid ${val.feito ? "#059669" : "#b0b8c8"}` }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: val.feito ? "#059669" : "#e0e0e0", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, flexShrink: 0 }}>{val.feito ? "✓" : ""}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: val.feito ? "#059669" : "#333", fontWeight: val.feito ? 600 : 500, textDecoration: val.feito ? "line-through" : "none" }}>{item}</div>
                        {val.responsavel && <div style={{ fontSize: 10, color: "#666" }}>👤 {val.responsavel}</div>}
                        {val.dataLimite && <div style={{ fontSize: 10, color: "#666" }}>📅 {formatDate(val.dataLimite)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* EQUIPE */}
            {(viagem.equipe || []).length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: "24px 32px", marginBottom: 20, boxShadow: "0 2px 12px rgba(27,63,122,0.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 18, background: "#1B3F7A", borderRadius: 2 }} /> Equipe da Viagem
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {viagem.equipe.map((chave, i) => {
                    const m = resolveMembroNome(chave);
                    const bg = m.tipo === "instrutor" ? "#f3e8ff" : m.tipo === "motorista" ? "#e0f2fe" : "#eff6ff";
                    const cor = m.tipo === "instrutor" ? "#7c3aed" : m.tipo === "motorista" ? "#0891b2" : "#1B3F7A";
                    const borda = m.tipo === "instrutor" ? "#e9d5ff" : m.tipo === "motorista" ? "#bae6fd" : "#1B3F7A33";
                    const icone = m.tipo === "instrutor" ? "👨‍🏫" : m.tipo === "motorista" ? "🚗" : "👤";
                    return (
                      <div key={i} style={{ background: bg, borderRadius: 10, padding: "6px 14px", fontSize: 13, color: cor, fontWeight: 600, border: `1px solid ${borda}` }}>
                        {icone} {m.nome}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DETALHAMENTO POR MUNICÍPIO */}
            {eventosVinculados.map((ev, idx) => {
              const cap = (ev.acoesEducacionais || []).reduce((s, a) => s + (parseInt(a.participantes) || 0), 0);
              return (
                <div key={ev.id} className={idx > 0 ? "page-break" : ""} style={{ background: "#fff", borderRadius: 20, overflow: "hidden", marginBottom: 24, boxShadow: "0 2px 12px rgba(27,63,122,0.07)" }}>
                  {/* Header município */}
                  <div style={{ background: "#1B3F7A", padding: "20px 32px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ color: "#a8bdd8", fontSize: 10, letterSpacing: 2, fontWeight: 700 }}>EVENTO {idx + 1} / {eventosVinculados.length}</div>
                        <div style={{ color: "#fff", fontWeight: 900, fontSize: 24, marginTop: 4 }}>{ev.tipo === "Municipal" ? ev.municipio : ev.regiao}</div>
                        <div style={{ color: "#d0e0f0", fontSize: 13, marginTop: 4, fontWeight: 600 }}>📅 {formatDate(ev.data)}{ev.local ? ` · 📍 ${ev.local}` : ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#fff", fontWeight: 900, fontSize: 36 }}>{cap}</div>
                        <div style={{ color: "#a8bdd8", fontSize: 11, fontWeight: 600 }}>capacitados</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "20px 32px" }}>
                    {/* Ações educacionais */}
                    {(ev.acoesEducacionais || []).length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 10 }}>Ações Educacionais</div>
                        <div style={{ border: "1px solid #e8edf2", borderRadius: 12, overflow: "hidden" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", background: "#1B3F7A", padding: "10px 16px" }}>
                            <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Curso</div>
                            <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Participantes</div>
                          </div>
                          {ev.acoesEducacionais.map((a, i) => (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "10px 16px", borderBottom: i < ev.acoesEducacionais.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>{a.acaoNome || a.nome || "—"}</div>
                              <div style={{ fontWeight: 900, fontSize: 14, color: "#1B3F7A" }}>{a.participantes || 0}</div>
                            </div>
                          ))}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "11px 16px", background: "#E8730A" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>TOTAL</div>
                            <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>{cap}</div>
                          </div>
                        </div>

                        {/* Mini gráfico de barras */}
                        <div style={{ marginTop: 12 }}>
                          {ev.acoesEducacionais.map((a, i) => {
                            const pct = cap > 0 ? Math.round(((parseInt(a.participantes) || 0) / cap) * 100) : 0;
                            const cores = ["#1B3F7A", "#059669", "#E8730A", "#7c3aed"];
                            return (
                              <div key={i} style={{ marginBottom: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                  <div style={{ fontSize: 11, color: "#555" }}>{a.acaoNome || a.nome || "—"}</div>
                                  <div style={{ fontSize: 11, color: "#555", fontWeight: 700 }}>{pct}%</div>
                                </div>
                                <div style={{ height: 6, background: "#e8edf2", borderRadius: 3 }}>
                                  <div style={{ height: 6, background: cores[i % cores.length], borderRadius: 3, width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Ocorrências do evento */}
                    {(ev.ocorrencias || []).length > 0 && (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#E8730A", marginBottom: 10 }}>⚠️ Ocorrências ({ev.ocorrencias.length})</div>
                        {ev.ocorrencias.map((oc, i) => {
                          const TIPO_LBL = { inscricao: "Inscrição/Frequência", equipamento: "Equipamentos/Material", logistica: "Logística/Local/Transporte" };
                          return (
                            <div key={i} style={{ background: "#fff3e0", borderRadius: 10, padding: "10px 14px", marginBottom: 8, borderLeft: "3px solid #E8730A" }}>
                              <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                                <span style={{ background: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#E8730A", border: "1px solid #E8730A" }}>{TIPO_LBL[oc.tipo] || oc.tipo}</span>
                                {oc.acaoNome && <span style={{ background: "#eff6ff", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#1B3F7A" }}>📚 {oc.acaoNome}</span>}
                                <span style={{ background: oc.status === "Resolvido" ? "#e8f5e9" : "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: oc.status === "Resolvido" ? "#059669" : "#E8730A", border: `1px solid ${oc.status === "Resolvido" ? "#059669" : "#E8730A"}` }}>{oc.status || "Pendente"}</span>
                              </div>
                              {oc.nome && <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>👤 {oc.nome}{oc.cpf ? ` · CPF: ${oc.cpf}` : ""}{oc.email ? ` · ${oc.email}` : ""}</div>}
                              <div style={{ fontSize: 12, color: "#333" }}>{oc.descricao}</div>
                              {oc.resposta && (
                                <div style={{ marginTop: 6, background: "#e8f5e9", borderRadius: 8, padding: "8px 10px", borderLeft: "2px solid #059669" }}>
                                  <div style={{ fontSize: 10, color: "#059669", fontWeight: 700, marginBottom: 2 }}>✅ Resposta: {oc.respondidoPor}</div>
                                  <div style={{ fontSize: 12, color: "#333" }}>{oc.resposta}</div>
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
            })}

            {/* OCORRÊNCIAS DE VIAGEM DETALHADAS */}
            {(viagem.ocorrencias || []).length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: "24px 32px", marginBottom: 20, boxShadow: "0 2px 12px rgba(27,63,122,0.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 18, background: "#E8730A", borderRadius: 2 }} />
                  Ocorrências de Viagem ({viagem.ocorrencias.length})
                </div>
                {viagem.ocorrencias.map((oc, i) => (
                  <div key={i} style={{ background: "#f8f9fb", borderRadius: 12, padding: "12px 16px", marginBottom: 10, borderLeft: "3px solid #E8730A" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ background: "#fff3e0", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#E8730A" }}>{TIPO_OC[oc.tipo] || oc.tipo}</span>
                      <span style={{ fontSize: 10, color: "#888" }}>{oc.data ? new Date(oc.data).toLocaleString("pt-BR") : ""}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#333", marginBottom: 4 }}>{oc.descricao}</div>
                    <div style={{ fontSize: 10, color: "#888" }}>Registrado por: {oc.autorEmail}</div>
                  </div>
                ))}
              </div>
            )}

            {/* CONSOLIDADO GERAL */}
            {acoesOrdenadas.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 20, padding: "24px 32px", marginBottom: 20, boxShadow: "0 2px 12px rgba(27,63,122,0.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 4, height: 18, background: "#059669", borderRadius: 2 }} />
                  Consolidado — Capacitados por Ação Educacional
                </div>
                <div style={{ border: "1px solid #e8edf2", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", background: "#059669", padding: "12px 18px" }}>
                    <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Ação Educacional</div>
                    <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Total</div>
                  </div>
                  {acoesOrdenadas.map(([nome, total], i) => (
                    <div key={nome} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "12px 18px", borderBottom: i < acoesOrdenadas.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{nome}</div>
                      <div style={{ fontWeight: 900, fontSize: 15, color: "#059669" }}>{total}</div>
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "13px 18px", background: "#E8730A" }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>TOTAL GERAL</div>
                    <div style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>{totalParticipantes}</div>
                  </div>
                </div>
                {/* Gráfico comparativo */}
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1B3F7A", marginBottom: 10 }}>📊 Gráfico Comparativo</div>
                {acoesOrdenadas.map(([nome, total], i) => {
                  const max = acoesOrdenadas[0]?.[1] || 1;
                  const pct = Math.round((total / max) * 100);
                  const cores = ["#1B3F7A", "#059669", "#E8730A", "#7c3aed", "#0891b2", "#dc2626"];
                  return (
                    <div key={nome} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontSize: 12, color: "#333", fontWeight: 600 }}>{nome}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>{total}</div>
                      </div>
                      <div style={{ height: 10, background: "#e8edf2", borderRadius: 5 }}>
                        <div style={{ height: 10, background: cores[i % cores.length], borderRadius: 5, width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* RODAPÉ */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 24px", display: "flex", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(27,63,122,0.06)" }}>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>IPCgov — Instituto Plácido Castelo · TCEduc</div>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 600 }}>Relatório gerado em {formatDateTime()}</div>
        </div>
      </div>
    </div>
  );
}
