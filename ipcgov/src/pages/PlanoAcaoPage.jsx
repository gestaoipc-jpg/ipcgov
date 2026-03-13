import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif", boxSizing:"border-box" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

const STATUS_COR = { Pendente:"#E8730A", "Em andamento":"#0891b2", Concluída:"#059669" };
const PRIORIDADE_COR = { Alta:"#dc2626", Média:"#E8730A", Baixa:"#059669" };

export default function PlanoAcaoPage({ onBack, user }) {
  const [planos, setPlanos] = useState([]);
  const [minhasAcoes, setMinhasAcoes] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("Pendente");
  const [respostas, setRespostas] = useState({});
  const [statusEdit, setStatusEdit] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(null);

  useEffect(() => { carregarPlanos(); }, []);

  const carregarPlanos = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "tceduc_planos_acao"));
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlanos(todos);

      // Filtrar ações onde o usuário logado é responsável
      const acoes = [];
      todos.forEach(plano => {
        (plano.acoes || []).forEach(acao => {
          const isResponsavel =
            acao.responsavelEmail === user?.email ||
            acao.responsavelId === user?.uid;
          if (isResponsavel) {
            acoes.push({
              ...acao,
              planoId: plano.id,
              planoTitulo: plano.titulo || "Plano sem título",
              eventoNome: plano.eventoNome || "",
              viagem: plano.viagem || false,
            });
          }
        });
      });
      setMinhasAcoes(acoes);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const salvarAcao = async (acao) => {
    setSalvando(acao.id);
    try {
      const plano = planos.find(p => p.id === acao.planoId);
      if (!plano) return;
      const novoStatus    = statusEdit[acao.id] ?? acao.status ?? "Pendente";
      const novaResposta  = respostas[acao.id]  ?? acao.andamento ?? "";
      const primeiroNome  = (user?.displayName || user?.email || "").split(" ")[0];

      const novasAcoes = (plano.acoes || []).map(a =>
        a.id === acao.id
          ? { ...a, status: novoStatus, andamento: novaResposta, atualizadoPor: primeiroNome, atualizadoEm: new Date().toISOString() }
          : a
      );
      await updateDoc(doc(db, "tceduc_planos_acao", acao.planoId), {
        acoes: novasAcoes,
        atualizadoEm: new Date().toISOString(),
      });
      setPlanos(ps => ps.map(p => p.id === acao.planoId ? { ...p, acoes: novasAcoes } : p));
      setMinhasAcoes(ms => ms.map(a =>
        a.id === acao.id ? { ...a, status: novoStatus, andamento: novaResposta } : a
      ));
    } catch (e) {
      console.error(e);
    }
    setSalvando(null);
  };

  const pendentes   = minhasAcoes.filter(a => !a.status || a.status === "Pendente" || a.status === "Em andamento");
  const concluidas  = minhasAcoes.filter(a => a.status === "Concluída");
  const listaAtual  = filtroStatus === "Pendente" ? pendentes : concluidas;

  const primeiroNome = (user?.displayName || user?.email || "Usuário").split(" ")[0];

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4ff", fontFamily:"'Montserrat',sans-serif" }}>
      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#059669,#047857)", padding:"20px 24px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:700, margin:"0 auto", display:"flex", alignItems:"center", gap:14 }}>
          <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:18 }}>←</div>
          <div style={{ flex:1 }}>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:2 }}>Plano de Ação — TCEduc</div>
            <div style={{ color:"#fff", fontWeight:900, fontSize:18 }}>📋 Minhas Ações</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11 }}>Olá,</div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>{primeiroNome}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:700, margin:"0 auto", padding:"24px 16px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando ações...</div>
        ) : minhasAcoes.length === 0 ? (
          <div style={{ background:"#fff", borderRadius:20, padding:40, textAlign:"center", boxShadow:"0 4px 16px rgba(27,63,122,0.07)" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
            <div style={{ fontWeight:700, fontSize:16, color:"#1B3F7A" }}>Nenhuma ação delegada para você</div>
            <div style={{ color:"#aaa", fontSize:13, marginTop:6 }}>Quando uma ação do plano for atribuída a você, ela aparecerá aqui.</div>
          </div>
        ) : (
          <>
            {/* COUNTERS */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
              {[
                { label:"Pendentes/Em andamento", count:pendentes.length, cor:"#E8730A", icon:"⚠️" },
                { label:"Concluídas", count:concluidas.length, cor:"#059669", icon:"✅" },
              ].map(p => (
                <div key={p.label} style={{ background:"#fff", borderRadius:16, padding:"16px 20px", boxShadow:"0 2px 8px rgba(27,63,122,0.06)", borderLeft:`4px solid ${p.cor}` }}>
                  <div style={{ fontSize:22, fontWeight:900, color:p.cor }}>{p.icon} {p.count}</div>
                  <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{p.label}</div>
                </div>
              ))}
            </div>

            {/* FILTRO */}
            <div style={{ display:"flex", gap:10, marginBottom:20 }}>
              {[
                { key:"Pendente", label:`⚠️ Pendentes/Em andamento (${pendentes.length})` },
                { key:"Concluída", label:`✅ Concluídas (${concluidas.length})` },
              ].map(f => (
                <div key={f.key} onClick={() => setFiltroStatus(f.key)} style={{
                  borderRadius:12, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer",
                  background: filtroStatus === f.key ? (f.key === "Concluída" ? "#059669" : "#E8730A") : "#fff",
                  color: filtroStatus === f.key ? "#fff" : "#888",
                  boxShadow:"0 2px 8px rgba(27,63,122,0.08)",
                }}>{f.label}</div>
              ))}
            </div>

            {/* LISTA */}
            {listaAtual.length === 0 ? (
              <div style={{ background:"#fff", borderRadius:20, padding:40, textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>{filtroStatus === "Pendente" ? "✅" : "📋"}</div>
                <div style={{ fontWeight:700, color:"#1B3F7A" }}>
                  {filtroStatus === "Pendente" ? "Nenhuma ação pendente!" : "Nenhuma ação concluída ainda"}
                </div>
              </div>
            ) : listaAtual.map((acao, i) => {
              const statusAtual   = statusEdit[acao.id] ?? acao.status ?? "Pendente";
              const andamentoAtual = respostas[acao.id] ?? acao.andamento ?? "";
              const isPendente    = statusAtual !== "Concluída";
              const corStatus     = STATUS_COR[statusAtual] || "#E8730A";
              const corPrioridade = PRIORIDADE_COR[acao.prioridade] || "#888";

              return (
                <div key={`${acao.planoId}-${acao.id}`} style={{ background:"#fff", borderRadius:20, padding:22, marginBottom:16, border:`2px solid ${corStatus}22`, boxShadow:"0 4px 16px rgba(27,63,122,0.07)" }}>
                  {/* HEADER DA AÇÃO */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ background:corStatus+"22", borderRadius:8, padding:"3px 10px", fontSize:10, fontWeight:700, color:corStatus }}>{statusAtual}</span>
                      {acao.prioridade && (
                        <span style={{ background:corPrioridade+"22", borderRadius:8, padding:"3px 10px", fontSize:10, fontWeight:700, color:corPrioridade }}>
                          {acao.prioridade === "Alta" ? "🔴" : acao.prioridade === "Média" ? "🟡" : "🟢"} {acao.prioridade}
                        </span>
                      )}
                      {acao.prazo && (
                        <span style={{ background:"#f8f9fb", borderRadius:8, padding:"3px 10px", fontSize:10, fontWeight:600, color:"#888" }}>
                          📅 {new Date(acao.prazo + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ORIGEM */}
                  <div style={{ fontSize:11, color:"#aaa", marginBottom:6, display:"flex", gap:6, alignItems:"center" }}>
                    {acao.viagem ? "✈️" : "📍"} {acao.eventoNome}
                    <span style={{ color:"#ddd" }}>•</span>
                    <span style={{ fontWeight:600, color:"#059669" }}>📋 {acao.planoTitulo}</span>
                  </div>

                  {/* TÍTULO E DESCRIÇÃO */}
                  <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:6 }}>{acao.titulo}</div>
                  {acao.descricao && (
                    <div style={{ fontSize:13, color:"#555", background:"#f8f9fb", borderRadius:10, padding:"10px 14px", marginBottom:12, lineHeight:1.6 }}>{acao.descricao}</div>
                  )}

                  {/* ANDAMENTO ANTERIOR */}
                  {acao.andamento && statusAtual !== "Concluída" && (
                    <div style={{ background:"#e0f2fe", borderRadius:10, padding:"10px 14px", marginBottom:12, borderLeft:"3px solid #0891b2" }}>
                      <div style={{ fontSize:10, color:"#0891b2", fontWeight:700, marginBottom:3 }}>
                        🔄 Último andamento {acao.atualizadoEm ? `· ${new Date(acao.atualizadoEm).toLocaleString("pt-BR")}` : ""}
                      </div>
                      <div style={{ fontSize:13, color:"#333" }}>{acao.andamento}</div>
                    </div>
                  )}

                  {/* CONCLUÍDA */}
                  {statusAtual === "Concluída" && acao.andamento && (
                    <div style={{ background:"#e8f5e9", borderRadius:10, padding:"10px 14px", marginBottom:10, borderLeft:"3px solid #059669" }}>
                      <div style={{ fontSize:10, color:"#059669", fontWeight:700, marginBottom:3 }}>
                        ✅ Concluída por {acao.atualizadoPor} {acao.atualizadoEm ? `· ${new Date(acao.atualizadoEm).toLocaleString("pt-BR")}` : ""}
                      </div>
                      <div style={{ fontSize:13, color:"#333" }}>{acao.andamento}</div>
                    </div>
                  )}

                  {/* FORMULÁRIO DE ATUALIZAÇÃO */}
                  {isPendente && (
                    <div style={{ background:"#f8f9fb", borderRadius:14, padding:16, marginTop:8 }}>
                      <div style={{ marginBottom:10 }}>
                        <label style={labelStyle}>Atualizar andamento</label>
                        <textarea
                          value={andamentoAtual}
                          onChange={e => setRespostas(r => ({ ...r, [acao.id]: e.target.value }))}
                          placeholder="Descreva o que foi feito, dificuldades encontradas..."
                          style={{ ...inputStyle, minHeight:70, resize:"vertical" }}
                        />
                      </div>
                      <div style={{ marginBottom:12 }}>
                        <label style={labelStyle}>Status</label>
                        <div style={{ display:"flex", gap:8 }}>
                          {["Pendente","Em andamento","Concluída"].map(s => (
                            <div key={s} onClick={() => setStatusEdit(se => ({ ...se, [acao.id]: s }))}
                              style={{ flex:1, textAlign:"center", padding:"8px 4px", borderRadius:10, cursor:"pointer", fontSize:11, fontWeight:700,
                                background: statusAtual === s ? STATUS_COR[s] : "#fff",
                                color: statusAtual === s ? "#fff" : "#888",
                                border:`1px solid ${statusAtual === s ? STATUS_COR[s] : "#e8edf2"}`,
                              }}>{s}</div>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => salvarAcao(acao)} disabled={salvando === acao.id} style={{
                        width:"100%", background: salvando === acao.id ? "#ccc" : "#059669",
                        border:"none", borderRadius:12, padding:"11px", color:"#fff",
                        fontWeight:700, fontSize:13, cursor: salvando === acao.id ? "not-allowed" : "pointer",
                        fontFamily:"'Montserrat',sans-serif",
                      }}>
                        {salvando === acao.id ? "Salvando..." : "💾 Salvar Atualização"}
                      </button>
                    </div>
                  )}

                  <div style={{ fontSize:10, color:"#ccc", marginTop:8 }}>
                    Delegada por: {acao.criadoPor || "—"} · {acao.criadoEm ? new Date(acao.criadoEm).toLocaleString("pt-BR") : ""}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
