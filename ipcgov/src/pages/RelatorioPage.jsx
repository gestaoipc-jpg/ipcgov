import { useState, useEffect, useRef } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

function formatDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function formatDateTime() {
  return new Date().toLocaleString("pt-BR");
}

const CHECKLIST_ANTES = [
  "Solicitar viagem",
  "Cadastrar evento no IPCeduc e liberar inscrição",
  "Solicitar diária terceirizados",
  "Solicitar divulgação site/redes sociais",
  "Reunião de alinhamento",
  "Alocar instrutores",
  "Alocar apoio IPC município",
  "Alocar apoio IPC salas Fortaleza",
  "Organizar material e equipamentos",
];
const CHECKLIST_VIAGEM = [
  "Hotel e hospedagem confirmados",
  "Horários de saída definidos",
  "Alimentação organizada",
  "Documentos e materiais separados",
];

const statusCor = { Pendente: "#E8730A", Realizado: "#059669", Cancelado: "#dc2626" };

export default function RelatorioPage({ onBack, eventoId }) {
  const [modo, setModo] = useState(eventoId ? "evento" : "geral");
  const [eventos, setEventos] = useState([]);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const printRef = useRef(null);

  useEffect(() => { loadEventos(); }, []);
  useEffect(() => {
    if (eventoId && eventos.length > 0) {
      const ev = eventos.find(e => e.id === eventoId);
      if (ev) setEventoSelecionado(ev);
    }
  }, [eventoId, eventos]);

  const loadEventos = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "tceduc_eventos"));
      const evs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(a.data) - new Date(b.data));
      setEventos(evs);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const gerarPDF = () => {
    setGerando(true);
    setTimeout(() => {
      window.print();
      setGerando(false);
    }, 300);
  };

  const totalCapacitados = (ev) =>
    (ev?.acoesEducacionais || []).reduce((s, a) => s + (parseInt(a.participantes) || 0), 0);

  const progChecklist = (ev, items) => {
    const ch = ev?.checklist || {};
    const done = items.filter(i => ch[i]).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  };

  // Relatorio Geral stats
  const realizados = eventos.filter(e => e.status === "Realizado");
  const municipaisReal = realizados.filter(e => e.tipo === "Municipal");
  const regionaisReal = realizados.filter(e => e.tipo === "Regional");
  const totalCap = eventos.reduce((s, e) => s + totalCapacitados(e), 0);
  const proximos = eventos.filter(e => e.status === "Pendente" && e.data && new Date(e.data) >= new Date())
    .sort((a, b) => new Date(a.data) - new Date(b.data)).slice(0, 10);

  const acoesSummary = {};
  eventos.forEach(e => {
    (e.acoesEducacionais || []).forEach(a => {
      if (!acoesSummary[a.nome]) acoesSummary[a.nome] = 0;
      acoesSummary[a.nome] += parseInt(a.participantes) || 0;
    });
  });

  const nome = eventoSelecionado?.tipo === "Municipal"
    ? eventoSelecionado?.municipio
    : eventoSelecionado?.regiao;

  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #1B3F7A44; border-radius: 3px; }
        select, input { font-family: 'Montserrat', sans-serif; }

        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-area { padding: 0 !important; background: #fff !important; margin: 0 !important; max-width: 100% !important; }
          .page-break { page-break-before: always; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 12mm; }
        }
      `}</style>

      {/* HEADER - no print */}
      <div className="no-print" style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "20px 32px 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div onClick={onBack} style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 20 }}>←</div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 3 }}>TCEDUC</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>📄 Relatórios</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <div onClick={() => setModo("evento")} style={{ background: modo === "evento" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", border: `1px solid ${modo === "evento" ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`, borderRadius: 12, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Por Evento
              </div>
              <div onClick={() => setModo("geral")} style={{ background: modo === "geral" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", border: `1px solid ${modo === "geral" ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`, borderRadius: 12, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Geral
              </div>
            </div>
          </div>

          {/* Seletor de evento */}
          {modo === "evento" && (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <select
                value={eventoSelecionado?.id || ""}
                onChange={e => setEventoSelecionado(eventos.find(ev => ev.id === e.target.value) || null)}
                style={{ flex: 1, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 14, fontWeight: 600, outline: "none" }}
              >
                <option value="">Selecione um evento...</option>
                {eventos.map(ev => (
                  <option key={ev.id} value={ev.id} style={{ color: "#1B3F7A", background: "#fff" }}>
                    {ev.tipo === "Municipal" ? ev.municipio : ev.regiao} — {formatDate(ev.data)} [{ev.status}]
                  </option>
                ))}
              </select>
              {eventoSelecionado && (
                <div onClick={gerarPDF} style={{ background: "#E8730A", borderRadius: 12, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(232,115,10,0.4)" }}>
                  {gerando ? "Gerando..." : "🖨️ Gerar PDF"}
                </div>
              )}
            </div>
          )}

          {modo === "geral" && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div onClick={gerarPDF} style={{ background: "#E8730A", borderRadius: 12, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(232,115,10,0.4)" }}>
                {gerando ? "Gerando..." : "🖨️ Gerar PDF"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO */}
      <div ref={printRef} className="print-area" style={{ maxWidth: 900, margin: "32px auto", padding: "0 32px 80px" }}>

        {/* ===== RELATÓRIO POR EVENTO ===== */}
        {modo === "evento" && !eventoSelecionado && (
          <div style={{ textAlign: "center", padding: 80 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1B3F7A", marginBottom: 8 }}>Selecione um evento</div>
            <div style={{ color: "#aaa" }}>Escolha o evento acima para gerar o relatório</div>
          </div>
        )}

        {modo === "evento" && eventoSelecionado && (() => {
          const ev = eventoSelecionado;
          const progAntes = progChecklist(ev, CHECKLIST_ANTES);
          const progViagem = progChecklist(ev, CHECKLIST_VIAGEM);
          const cap = totalCapacitados(ev);

          return (
            <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 24px rgba(27,63,122,0.1)" }}>

              {/* CABEÇALHO DO RELATÓRIO */}
              <div style={{ background: "#1B3F7A", padding: "32px 40px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: "#ffffff", fontSize: 11, letterSpacing: 3, marginBottom: 6, fontWeight: 700 }}>INSTITUTO PLÁCIDO CASTELO — TCEDUC</div>
                    <div style={{ color: "#fff", fontWeight: 900, fontSize: 28, letterSpacing: -1 }}>IPC<span style={{ color: "#E8730A" }}>gov</span></div>
                    <div style={{ color: "#ffffff", fontSize: 14, marginTop: 4, fontWeight: 600 }}>Relatório de Evento</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ background: "#fff", border: `2px solid ${statusCor[ev.status]}`, borderRadius: 12, padding: "6px 18px", color: statusCor[ev.status], fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{ev.status}</div>
                    <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 600 }}>Gerado em {formatDateTime()}</div>
                  </div>
                </div>

                <div style={{ marginTop: 28, borderTop: "1px solid #2d5a9e", paddingTop: 20 }}>
                  <div style={{ color: "#ffffff", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>{ev.tipo?.toUpperCase()}</div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: 36, letterSpacing: -1, marginTop: 4 }}>{nome}</div>
                  <div style={{ color: "#ffffff", fontSize: 15, marginTop: 6, fontWeight: 600 }}>
                    📅 {formatDate(ev.data)}{ev.hora ? ` às ${ev.hora}` : ""}{ev.local ? ` · 📍 ${ev.local}` : ""}
                  </div>
                </div>
              </div>

              {/* CORPO */}
              <div style={{ padding: "32px 40px" }}>

                {/* INFO GRID */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
                  {[
                    { label: "Instrutor Presencial", value: ev.instrutorPresencial, icon: "👨‍🏫" },
                    { label: "Instrutor Remoto", value: ev.instrutorRemoto, icon: "💻" },
                    { label: "Motorista", value: ev.motorista, icon: "🚗" },
                    { label: "Link Meet", value: ev.linkMeet, icon: "🎥" },
                    { label: "Inscritos", value: ev.inscritos, icon: "📋" },
                    { label: "Capacitados", value: cap || "—", icon: "👥" },
                  ].map((f, i) => f.value ? (
                    <div key={i} style={{ background: "#f8f9fb", borderRadius: 14, padding: "14px 16px" }}>
                      <div style={{ color: "#555", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontWeight: 700 }}>{f.icon} {f.label}</div>
                      <div style={{ color: "#1B3F7A", fontWeight: 600, fontSize: 13, wordBreak: "break-all" }}>{f.value}</div>
                    </div>
                  ) : null)}
                </div>

                {/* AÇÕES EDUCACIONAIS */}
                {(ev.acoesEducacionais || []).length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 4, height: 20, background: "#1B3F7A", borderRadius: 2 }} />
                      Ações Educacionais
                    </div>
                    <div style={{ border: "1px solid #e8edf2", borderRadius: 16, overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", background: "#1B3F7A", padding: "12px 20px" }}>
                        <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Ação Educacional</div>
                        <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Participantes</div>
                      </div>
                      {ev.acoesEducacionais.map((a, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "12px 20px", borderBottom: i < ev.acoesEducacionais.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>{a.acaoNome || a.nome || "—"}</div>
                          <div style={{ fontWeight: 900, fontSize: 16, color: "#1B3F7A" }}>{a.participantes || 0}</div>
                        </div>
                      ))}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "14px 20px", background: "#E8730A", borderTop: "2px solid #c45f00" }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#ffffff" }}>TOTAL DE CAPACITADOS</div>
                        <div style={{ fontWeight: 900, fontSize: 20, color: "#ffffff" }}>{cap}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CHECKLIST LOGÍSTICA ANTES */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 4, height: 20, background: "#1B3F7A", borderRadius: 2 }} />
                    Logística Antes do Evento
                    <span style={{ background: progAntes.pct === 100 ? "#e8f5e9" : "#fff3e0", color: progAntes.pct === 100 ? "#059669" : "#E8730A", borderRadius: 8, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                      {progAntes.done}/{progAntes.total} — {progAntes.pct}%
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {CHECKLIST_ANTES.map((item, i) => {
                      const done = (ev.checklist || {})[item];
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: done ? "#e8f5e9" : "#f0f2f5", borderRadius: 10, border: `1px solid ${done ? "#059669" : "#b0b8c8"}` }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: done ? "#059669" : "#e0e0e0", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, flexShrink: 0 }}>{done ? "✓" : ""}</div>
                          <div style={{ fontSize: 12, color: done ? "#059669" : "#333", fontWeight: done ? 600 : 500, textDecoration: done ? "line-through" : "none" }}>{item}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CHECKLIST VIAGEM */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 4, height: 20, background: "#2a5ba8", borderRadius: 2 }} />
                    Logística em Viagem
                    <span style={{ background: progViagem.pct === 100 ? "#e8f5e9" : "#fff3e0", color: progViagem.pct === 100 ? "#059669" : "#E8730A", borderRadius: 8, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                      {progViagem.done}/{progViagem.total} — {progViagem.pct}%
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {CHECKLIST_VIAGEM.map((item, i) => {
                      const done = (ev.checklist || {})[item];
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: done ? "#e8f5e9" : "#f0f2f5", borderRadius: 10, border: `1px solid ${done ? "#059669" : "#b0b8c8"}` }}>
                          <div style={{ width: 20, height: 20, borderRadius: 6, background: done ? "#059669" : "#e0e0e0", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, flexShrink: 0 }}>{done ? "✓" : ""}</div>
                          <div style={{ fontSize: 12, color: done ? "#059669" : "#333", fontWeight: done ? 600 : 500, textDecoration: done ? "line-through" : "none" }}>{item}</div>
                        </div>
                      );
                    })}
                  </div>
                  {ev.infoViagem?.avisos && (
                    <div style={{ marginTop: 12, background: "#f8f9fb", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#555", borderLeft: "3px solid #2a5ba8" }}>
                      <div style={{ fontWeight: 700, fontSize: 11, color: "#444", marginBottom: 4, fontWeight: 700 }}>AVISOS DE VIAGEM</div>
                      {ev.infoViagem.avisos}
                    </div>
                  )}
                </div>

                {/* OCORRÊNCIAS */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 4, height: 20, background: "#E8730A", borderRadius: 2 }} />
                    Ocorrências Durante o Evento
                    <span style={{ background: "#fff3e0", color: "#E8730A", borderRadius: 8, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                      {(ev.ocorrencias || []).length} registradas
                    </span>
                  </div>
                  {(ev.ocorrencias || []).length === 0 ? (
                    <div style={{ background: "#f8f9fb", borderRadius: 12, padding: "20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>
                      ✅ Nenhuma ocorrência registrada
                    </div>
                  ) : (() => {
                    const TIPO_CFG = {
                        inscricao:      { label:"Inscrição/Frequência",       bg:"#fff3e0", cor:"#E8730A" },
                        equipamento:    { label:"Equipamentos/Material",       bg:"#e8f5e9", cor:"#059669" },
                        logistica:      { label:"Logística/Local/Transporte",  bg:"#f3f4f6", cor:"#6b7280" },
                        infraestrutura: { label:"Infraestrutura",              bg:"#f3e8ff", cor:"#7c3aed" },
                        tecnico:        { label:"Problemas Técnicos",          bg:"#fee2e2", cor:"#dc2626" },
                        comunicacao:    { label:"Comunicação",                 bg:"#e0f2fe", cor:"#0891b2" },
                        outro:          { label:"Outro",                       bg:"#f8f9fb", cor:"#888"    },
                      };
                    const ORDEM = ["inscricao","infraestrutura","tecnico","comunicacao","equipamento","logistica","outro"];
                    const grupos_oc = {};
                    (ev.ocorrencias||[]).forEach(oc => { const t=oc.tipo||"outro"; if(!grupos_oc[t])grupos_oc[t]=[]; grupos_oc[t].push(oc); });
                    return ORDEM.filter(t=>grupos_oc[t]).map(tipo => {
                      const cfg = TIPO_CFG[tipo]||{label:tipo,bg:"#f8f9fb",cor:"#888"};
                      return (
                        <div key={tipo} style={{ marginBottom:14 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                            <span style={{ background:cfg.bg,borderRadius:8,padding:"3px 12px",fontSize:11,fontWeight:800,color:cfg.cor,border:`1px solid ${cfg.cor}33` }}>{cfg.label}</span>
                            <span style={{ fontSize:11,color:"#aaa",fontWeight:600 }}>{grupos_oc[tipo].length} ocorrência{grupos_oc[tipo].length!==1?"s":""}</span>
                          </div>
                          {grupos_oc[tipo].map((oc,i) => {
                            const statusCor = oc.status==="Resolvido"?"#059669":oc.status==="Ciente"?"#0891b2":"#E8730A";
                            return (
                              <div key={i} style={{ background:"#fff",borderRadius:14,padding:"16px 18px",marginBottom:10,border:`2px solid ${statusCor}22` }}>
                                <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:8 }}>
                                  <span style={{ background:statusCor+"22",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,color:statusCor }}>{oc.status||"Pendente"}</span>
                                  {oc.acaoNome && <span style={{ background:"#eff6ff",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,color:"#1B3F7A" }}>📚 {oc.acaoNome}</span>}
                                  {oc.destinoNome && <span style={{ background:"#f0fdf4",borderRadius:6,padding:"2px 8px",fontSize:10,color:"#059669",fontWeight:600 }}>{oc.destinoTipo==="grupo"?"👥":"👤"} {oc.destinoNome}</span>}
                                </div>
                                {(oc.nome||oc.cpf) && <div style={{ fontSize:12,color:"#888",marginBottom:6 }}>👤 {oc.nome}{oc.cpf?` · CPF: ${oc.cpf}`:""}</div>}
                                <div style={{ fontSize:13,color:"#333",background:"#f8f9fb",borderRadius:8,padding:"8px 12px",marginBottom:oc.resposta?8:0 }}>{oc.descricao}</div>
                                {oc.resposta && (
                                  <div style={{ background:"#e8f5e9",borderRadius:10,padding:"10px 14px",marginTop:6,borderLeft:"3px solid #059669" }}>
                                    <div style={{ fontSize:10,color:"#059669",fontWeight:700,marginBottom:3 }}>✅ Respondido por {oc.respondidoPor} {oc.respondidoEm?`· ${new Date(oc.respondidoEm).toLocaleString("pt-BR")}`:""}</div>
                                    <div style={{ fontSize:13,color:"#333" }}>{oc.resposta}</div>
                                  </div>
                                )}
                                <div style={{ fontSize:10,color:"#aaa",marginTop:6 }}>Registrado por: {oc.autorEmail||"—"} · {oc.data?new Date(oc.data).toLocaleString("pt-BR"):""}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* LIÇÕES APRENDIDAS */}
                {ev.licoesAprendidas && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 4, height: 20, background: "#059669", borderRadius: 2 }} />
                      Lições Aprendidas
                    </div>
                    <div style={{ background: "#e8f5e9", borderRadius: 14, padding: "18px 20px", fontSize: 14, color: "#333", lineHeight: 1.7, borderLeft: "4px solid #059669" }}>
                      {ev.licoesAprendidas}
                    </div>
                  </div>
                )}

                {/* OBSERVAÇÕES */}
                {ev.observacoes && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 4, height: 20, background: "#7c3aed", borderRadius: 2 }} />
                      Observações Gerais
                    </div>
                    <div style={{ background: "#f5f3ff", borderRadius: 14, padding: "18px 20px", fontSize: 14, color: "#333", lineHeight: 1.7, borderLeft: "4px solid #7c3aed" }}>
                      {ev.observacoes}
                    </div>
                  </div>
                )}

                {/* RODAPÉ */}
                <div style={{ borderTop: "1px solid #e8edf2", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: "#555" }}>IPCgov — Instituto Plácido Castelo · TCEduc</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>Relatório gerado em {formatDateTime()}</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ===== RELATÓRIO GERAL ===== */}
        {modo === "geral" && (
          <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 24px rgba(27,63,122,0.1)" }}>
            {/* CABEÇALHO */}
            <div style={{ background: "#1B3F7A", padding: "32px 40px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "#ffffff", fontSize: 11, letterSpacing: 3, marginBottom: 6, fontWeight: 700 }}>INSTITUTO PLÁCIDO CASTELO — TCEDUC</div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: 28, letterSpacing: -1 }}>IPC<span style={{ color: "#E8730A" }}>gov</span></div>
                  <div style={{ color: "#ffffff", fontSize: 14, marginTop: 4, fontWeight: 600 }}>Relatório Geral do Programa</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 600 }}>Gerado em {formatDateTime()}</div>
                </div>
              </div>
              {/* STATS PILLS */}
              <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Municipais realizados", value: `${municipaisReal.length}/184` },
                  { label: "Regionais realizados", value: `${regionaisReal.length}/7` },
                  { label: "Total capacitados", value: totalCap },
                  { label: "Total de eventos", value: eventos.length },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#2d5a9e", borderRadius: 12, padding: "10px 18px" }}>
                    <div style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>{s.value}</div>
                    <div style={{ color: "#d0e4f8", fontSize: 10, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "32px 40px" }}>
              {/* AÇÕES EDUCACIONAIS CONSOLIDADAS */}
              {Object.keys(acoesSummary).length > 0 && (
                <div style={{ marginBottom: 36 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 4, height: 20, background: "#1B3F7A", borderRadius: 2 }} />
                    Capacitados por Ação Educacional
                  </div>
                  <div style={{ border: "1px solid #e8edf2", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", background: "#1B3F7A", padding: "12px 20px" }}>
                      <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Ação Educacional</div>
                      <div style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Participantes</div>
                    </div>
                    {Object.entries(acoesSummary).sort((a, b) => b[1] - a[1]).map(([nome, total], i, arr) => (
                      <div key={nome} style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>{nome}</div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: "#1B3F7A" }}>{total}</div>
                      </div>
                    ))}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "14px 20px", background: "#E8730A", borderTop: "2px solid #c45f00" }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#ffffff" }}>TOTAL GERAL</div>
                      <div style={{ fontWeight: 900, fontSize: 20, color: "#ffffff" }}>{totalCap}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* EVENTOS REALIZADOS */}
              <div style={{ marginBottom: 36 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 4, height: 20, background: "#059669", borderRadius: 2 }} />
                  Eventos Realizados ({realizados.length})
                </div>
                {realizados.length === 0 ? (
                  <div style={{ background: "#f8f9fb", borderRadius: 12, padding: 20, textAlign: "center", color: "#aaa" }}>Nenhum evento realizado ainda</div>
                ) : (
                  <div style={{ border: "1px solid #e8edf2", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", background: "#059669", padding: "12px 20px" }}>
                      {["Município/Região", "Data", "Tipo", "Capacitados"].map(h => (
                        <div key={h} style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                      ))}
                    </div>
                    {realizados.map((ev, i) => (
                      <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", padding: "11px 20px", borderBottom: i < realizados.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{ev.tipo === "Municipal" ? ev.municipio : ev.regiao}</div>
                        <div style={{ fontSize: 13, color: "#666" }}>{formatDate(ev.data)}</div>
                        <div style={{ fontSize: 13, color: "#666" }}>{ev.tipo}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#059669" }}>{totalCapacitados(ev) || "—"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PRÓXIMOS EVENTOS */}
              {proximos.length > 0 && (
                <div style={{ marginBottom: 36 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#1B3F7A", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 4, height: 20, background: "#E8730A", borderRadius: 2 }} />
                    Próximos Eventos Agendados ({proximos.length})
                  </div>
                  <div style={{ border: "1px solid #e8edf2", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", background: "#E8730A", padding: "12px 20px" }}>
                      {["Município/Região", "Data", "Tipo", "Dias"].map(h => (
                        <div key={h} style={{ color: "#ffffff", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{h}</div>
                      ))}
                    </div>
                    {proximos.map((ev, i) => {
                      const days = Math.ceil((new Date(ev.data) - new Date()) / 86400000);
                      return (
                        <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", padding: "11px 20px", borderBottom: i < proximos.length - 1 ? "1px solid #f0f0f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8f9fb" }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{ev.tipo === "Municipal" ? ev.municipio : ev.regiao}</div>
                          <div style={{ fontSize: 13, color: "#666" }}>{formatDate(ev.data)}</div>
                          <div style={{ fontSize: 13, color: "#666" }}>{ev.tipo}</div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: days <= 7 ? "#dc2626" : "#E8730A" }}>{days}d</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RODAPÉ */}
              <div style={{ borderTop: "1px solid #e8edf2", paddingTop: 20, display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, color: "#555" }}>IPCgov — Instituto Plácido Castelo · TCEduc</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>Relatório gerado em {formatDateTime()}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
