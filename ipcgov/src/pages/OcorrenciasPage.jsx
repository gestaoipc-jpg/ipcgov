import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

const STATUS_COR = { Pendente:"#E8730A", Ciente:"#0891b2", Resolvido:"#059669" };
const TIPO_LABEL = { inscricao:"Inscrição/Frequência", equipamento:"Equipamentos/Material", logistica:"Logística/Local/Transporte" };

export default function OcorrenciasPage({ onBack, user }) {
  const [eventos, setEventos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("Pendente");
  const [respostas, setRespostas] = useState({});
  const [statusEdit, setStatusEdit] = useState({});
  const [salvando, setSalvando] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [evSnap, srvSnap, grSnap] = await Promise.all([
        getDocs(collection(db,"tceduc_eventos")),
        getDocs(collection(db,"ipc_servidores")),
        getDocs(collection(db,"ipc_grupos_trabalho")),
      ]);
      setEventos(evSnap.docs.map(d=>({id:d.id,...d.data()})));
      setUsuarios(srvSnap.docs.map(d=>({id:d.id,...d.data()})));
      setGrupos(grSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const uid = user?.uid || "";
  const email = user?.email || "";
  const meuServidor = usuarios.find(u => u.id===uid || u.email===email);
  const meusGrupoIds = meuServidor?.grupos || [];
  const isAdmin = email && ["admin","administrador"].some(a=>email.toLowerCase().includes(a));

  // Monta todas as ocorrências direcionadas ao usuário
  const minhasOcs = [];
  eventos.forEach(ev => {
    (ev.ocorrencias||[]).forEach(oc => {
      let paraMim = false;
      if (oc.destinoTipo==="usuario") paraMim = oc.destinoId===uid || oc.destinoId===email;
      else if (oc.destinoTipo==="grupo") paraMim = meusGrupoIds.includes(oc.destinoId);
      if (paraMim) minhasOcs.push({...oc, eventoId:ev.id, eventoNome:ev.municipio||ev.regiao||"Evento", eventoData:ev.data, acoesEducacionais:ev.acoesEducacionais||[]});
    });
  });

  const pendentes = minhasOcs.filter(o => !o.status || o.status==="Pendente");
  const cientes = minhasOcs.filter(o => o.status==="Ciente" || o.status==="Resolvido");

  const listaAtual = filtroStatus==="Pendente" ? pendentes : cientes;

  const salvarResposta = async (oc) => {
    const novoStatus = statusEdit[oc.id] || oc.status || "Pendente";
    const novaResposta = respostas[oc.id] ?? oc.resposta ?? "";
    setSalvando(oc.id);
    try {
      const ev = eventos.find(e=>e.id===oc.eventoId);
      if (!ev) return;
      const primeiroNome = (meuServidor?.nome||email||"Usuário").split(" ")[0];
      const novasOcs = (ev.ocorrencias||[]).map(o =>
        o.id===oc.id
          ? { ...o, resposta:novaResposta, status:novoStatus, respondidoPor:primeiroNome, respondidoEm:new Date().toISOString() }
          : o
      );
      await updateDoc(doc(db,"tceduc_eventos",oc.eventoId), { ocorrencias:novasOcs, atualizadoEm:new Date().toISOString() });
      setEventos(evs => evs.map(e => e.id===oc.eventoId ? {...e, ocorrencias:novasOcs} : e));
      // Limpa estado local
      setRespostas(r=>{ const n={...r}; delete n[oc.id]; return n; });
      setStatusEdit(s=>{ const n={...s}; delete n[oc.id]; return n; });
    } catch(e){ console.error(e); }
    setSalvando(null);
  };

  const nomeAcao = (eventoId, acaoId) => {
    const ev = eventos.find(e=>e.id===eventoId);
    const acao = (ev?.acoesEducacionais||[]).find(a=>a.acaoId===acaoId||a.id===acaoId);
    return acao?.acaoNome || acao?.nome || "—";
  };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 32px 40px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>TCEDUC</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>⚠️ Ocorrências</div>
            </div>
          </div>

          {/* PILLS RESUMO */}
          <div style={{ display:"flex", gap:10 }}>
            {[
              { label:"Pendentes", count:pendentes.length, cor:"#E8730A" },
              { label:"Cientes/Resolvidas", count:cientes.length, cor:"#059669" },
            ].map(p=>(
              <div key={p.label} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 16px", color:"#fff" }}>
                <span style={{ fontWeight:900, fontSize:18 }}>{p.count}</span>
                <span style={{ fontSize:12, opacity:0.7, marginLeft:6 }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"28px 32px 80px" }}>
        {/* FILTRO */}
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {["Pendente","Resolvido"].map(s=>(
            <div key={s} onClick={()=>setFiltroStatus(s)} style={{ borderRadius:12, padding:"8px 20px", fontSize:13, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
              background:filtroStatus===s ? STATUS_COR[s==="Resolvido"?"Resolvido":"Pendente"] : "#fff",
              color:filtroStatus===s ? "#fff" : "#888",
              boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
              {s==="Pendente" ? `⚠️ Pendentes (${pendentes.length})` : `✅ Resolvidas/Cientes (${cientes.length})`}
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign:"center", padding:"60px 0", color:"#aaa" }}>Carregando...</div>}

        {!loading && listaAtual.length===0 && (
          <div style={{ background:"#fff", borderRadius:20, padding:"60px 20px", textAlign:"center", color:"#aaa" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{filtroStatus==="Pendente"?"✅":"📋"}</div>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>
              {filtroStatus==="Pendente" ? "Nenhuma ocorrência pendente!" : "Nenhuma ocorrência resolvida ainda"}
            </div>
          </div>
        )}

        {!loading && listaAtual.map((oc,i) => {
          const statusAtual = statusEdit[oc.id] ?? oc.status ?? "Pendente";
          const respostaAtual = respostas[oc.id] ?? oc.resposta ?? "";
          const isPendente = !oc.status || oc.status==="Pendente";
          const nomeAcaoOc = oc.acaoId ? nomeAcao(oc.eventoId, oc.acaoId) : null;

          return (
            <div key={i} style={{ background:"#fff", borderRadius:20, padding:22, marginBottom:16, border:`2px solid ${STATUS_COR[statusAtual]||"#E8730A"}22`, boxShadow:"0 4px 16px rgba(27,63,122,0.07)" }}>
              {/* Cabeçalho */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A" }}>📅 {oc.eventoNome}</div>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>
                    {oc.eventoData ? new Date(oc.eventoData+"T12:00:00").toLocaleDateString("pt-BR") : ""}
                    {" · "}Registrado em {oc.data ? new Date(oc.data).toLocaleString("pt-BR") : ""}
                  </div>
                </div>
                <div style={{ background:STATUS_COR[statusAtual]+"22", borderRadius:10, padding:"4px 12px", fontSize:12, fontWeight:700, color:STATUS_COR[statusAtual]||"#E8730A" }}>
                  {statusAtual}
                </div>
              </div>

              {/* Tipo + Ação */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                <span style={{ background:"#fff3e0", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#E8730A" }}>
                  {TIPO_LABEL[oc.tipo]||oc.tipo}
                </span>
                {nomeAcaoOc && (
                  <span style={{ background:"#eff6ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>
                    📚 {nomeAcaoOc}
                  </span>
                )}
                {oc.destinoNome && (
                  <span style={{ background:"#f0fdf4", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:600, color:"#059669" }}>
                    {oc.destinoTipo==="grupo"?"👥":"👤"} {oc.destinoNome}
                  </span>
                )}
              </div>

              {/* Pessoa envolvida */}
              {(oc.nome||oc.cpf) && (
                <div style={{ fontSize:12, color:"#888", marginBottom:8 }}>
                  👤 {oc.nome}{oc.cpf ? ` · CPF: ${oc.cpf}` : ""}
                </div>
              )}

              {/* Descrição */}
              <div style={{ fontSize:14, color:"#333", lineHeight:1.6, marginBottom:12, background:"#f8f9fb", borderRadius:10, padding:"10px 14px" }}>
                {oc.descricao}
              </div>

              {/* Resposta anterior */}
              {oc.resposta && (
                <div style={{ background:"#e8f5e9", borderRadius:12, padding:"10px 14px", marginBottom:12, borderLeft:"3px solid #059669" }}>
                  <div style={{ fontSize:10, color:"#059669", fontWeight:700, marginBottom:4 }}>
                    Resposta de {oc.respondidoPor} {oc.respondidoEm ? `· ${new Date(oc.respondidoEm).toLocaleString("pt-BR")}` : ""}
                  </div>
                  <div style={{ fontSize:13, color:"#333" }}>{oc.resposta}</div>
                </div>
              )}

              {/* Área de resposta — sempre visível para pendentes, editável para todos */}
              {isPendente && (
                <div style={{ marginTop:8 }}>
                  <label style={labelStyle}>Sua resposta</label>
                  <textarea
                    value={respostaAtual}
                    onChange={e=>setRespostas(r=>({...r,[oc.id]:e.target.value}))}
                    placeholder="Escreva sua resposta ou observação..."
                    style={{ ...inputStyle, minHeight:72, resize:"vertical", marginBottom:10 }}
                  />
                  <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                    {["Pendente","Ciente","Resolvido"].map(s=>(
                      <div key={s} onClick={()=>setStatusEdit(st=>({...st,[oc.id]:s}))}
                        style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:12, cursor:"pointer", fontSize:12, fontWeight:700,
                          background:statusAtual===s ? STATUS_COR[s] : STATUS_COR[s]+"18",
                          color:statusAtual===s ? "#fff" : STATUS_COR[s],
                          border:`1px solid ${STATUS_COR[s]}44` }}>
                        {s}
                      </div>
                    ))}
                  </div>
                  <div onClick={()=>salvarResposta(oc)}
                    style={{ background:salvando===oc.id?"#aaa":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", borderRadius:14, padding:"12px", textAlign:"center", color:"#fff", fontWeight:700, fontSize:14, cursor:salvando===oc.id?"not-allowed":"pointer" }}>
                    {salvando===oc.id ? "Salvando..." : "💾 Salvar Resposta"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
