import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

export default function ProcessosAlertasPage({ onBack }) {
  const [regras, setRegras] = useState([]);
  const [alertasAtivos, setAlertasAtivos] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [selecionado, setSelecionado] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [regrasSnap, procSnap, alertSnap] = await Promise.all([
        getDocs(collection(db, "processos_alertas_regras")),
        getDocs(collection(db, "processos")),
        getDocs(collection(db, "processos_alertas")),
      ]);
      const regrasData = regrasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const procData = procSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const alertData = alertSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRegras(regrasData);
      setProcessos(procData);
      setAlertasAtivos(alertData);
      // Gerar alertas automáticos
      await gerarAlertas(regrasData, procData, alertData);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const gerarAlertas = async (regrasData, procData, alertExistentes) => {
    const hoje = new Date();
    const novos = [];
    for (const regra of regrasData) {
      for (const p of procData) {
        if (!p.dataSaida || ["Concluído","Arquivado","Cancelado"].includes(p.status)) continue;
        const dataSaida = new Date(p.dataSaida);
        const dias = Math.ceil((dataSaida - hoje) / 86400000);
        if (dias <= regra.diasAntes && dias >= 0) {
          const chave = `${p.id}_${regra.id}`;
          const jaExiste = alertExistentes.find(a => a.chave === chave);
          if (!jaExiste) {
            const alerta = {
              chave, processoId: p.id, regraId: regra.id,
              titulo: `${regra.nome}: ${p.titulo || p.numero}`,
              descricao: `Prazo em ${dias} dia${dias!==1?"s":""} — ${p.dataSaida}`,
              tipo: "prazo", lido: false,
              criadoEm: new Date().toISOString(),
            };
            const ref = await addDoc(collection(db, "processos_alertas"), alerta);
            novos.push({ id: ref.id, ...alerta });
          }
        }
      }
    }
    if (novos.length > 0) setAlertasAtivos(a => [...a, ...novos]);
  };

  const salvarRegra = async () => {
    if (!form.nome || !form.diasAntes) return;
    setSalvando(true);
    try {
      const dados = { nome: form.nome, diasAntes: parseInt(form.diasAntes), descricao: form.descricao||"" };
      if (selecionado) {
        await updateDoc(doc(db, "processos_alertas_regras", selecionado.id), dados);
        setRegras(r => r.map(x => x.id===selecionado.id ? { ...x, ...dados } : x));
      } else {
        const ref = await addDoc(collection(db, "processos_alertas_regras"), dados);
        setRegras(r => [...r, { id: ref.id, ...dados }]);
      }
      setModal(null); setForm({});
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const deletarRegra = async (id) => {
    if (!window.confirm("Excluir regra de alerta?")) return;
    await deleteDoc(doc(db, "processos_alertas_regras", id));
    setRegras(r => r.filter(x => x.id !== id));
  };

  const marcarLido = async (id) => {
    await updateDoc(doc(db, "processos_alertas", id), { lido: true });
    setAlertasAtivos(a => a.map(x => x.id===id ? { ...x, lido: true } : x));
  };

  const pendentes = alertasAtivos.filter(a => !a.lido);
  const lidos = alertasAtivos.filter(a => a.lido);

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 32px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC PROCESSOS · ADMIN</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>🔔 Alertas de Prazo</div>
            </div>
            <div style={{ marginLeft:"auto" }}>
              <div onClick={() => { setForm({}); setSelecionado(null); setModal("regra"); }} style={{ background:"#E8730A", borderRadius:14, padding:"10px 22px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Nova Regra</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            {[
              { label:"Regras configuradas", value:regras.length },
              { label:"Alertas pendentes", value:pendentes.length },
              { label:"Processos monitorados", value:processos.filter(p=>p.dataSaida&&!["Concluído","Arquivado","Cancelado"].includes(p.status)).length },
            ].map((s,i) => (
              <div key={i} style={{ background:i===1&&pendentes.length>0?"rgba(232,115,10,0.3)":"rgba(255,255,255,0.12)", borderRadius:14, padding:"10px 18px" }}>
                <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>{s.value}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 32px 80px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        {/* REGRAS */}
        <div>
          <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:16 }}>⚙️ Regras de Alerta</div>
          {loading ? <div style={{ color:"#aaa", textAlign:"center", padding:40 }}>Carregando...</div> :
          regras.length === 0 ? (
            <div style={{ background:"#fff", borderRadius:18, padding:32, textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>⚙️</div>
              <div style={{ color:"#aaa", fontSize:14 }}>Nenhuma regra configurada</div>
              <div onClick={() => { setForm({}); setSelecionado(null); setModal("regra"); }} style={{ display:"inline-block", marginTop:14, background:"#1B3F7A", borderRadius:12, padding:"10px 20px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Criar primeira regra</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {regras.map(r => (
                <div key={r.id} style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 2px 10px rgba(27,63,122,0.07)", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:"#fff3e0", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", flexShrink:0 }}>
                    <div style={{ fontWeight:900, fontSize:18, color:"#E8730A", lineHeight:1 }}>{r.diasAntes}</div>
                    <div style={{ fontSize:9, color:"#E8730A", fontWeight:700 }}>dias</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{r.nome}</div>
                    {r.descricao && <div style={{ fontSize:12, color:"#aaa", marginTop:3 }}>{r.descricao}</div>}
                    <div style={{ fontSize:11, color:"#888", marginTop:4 }}>Alerta {r.diasAntes} dia{r.diasAntes!==1?"s":""} antes do prazo</div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <div onClick={() => { setSelecionado(r); setForm({ nome:r.nome, diasAntes:r.diasAntes, descricao:r.descricao }); setModal("regra"); }} style={{ width:34, height:34, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16 }}>✏️</div>
                    <div onClick={() => deletarRegra(r.id)} style={{ width:34, height:34, background:"#fee2e2", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16 }}>🗑️</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ALERTAS ATIVOS */}
        <div>
          <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:16 }}>🔔 Alertas Ativos ({pendentes.length} pendentes)</div>
          {alertasAtivos.length === 0 ? (
            <div style={{ background:"#fff", borderRadius:18, padding:32, textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
              <div style={{ color:"#aaa", fontSize:14 }}>Nenhum alerta ativo</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[...pendentes, ...lidos].map(a => {
                const proc = processos.find(p => p.id === a.processoId);
                return (
                  <div key={a.id} style={{ background:"#fff", borderRadius:14, padding:"14px 18px", boxShadow:"0 2px 8px rgba(27,63,122,0.06)", opacity:a.lido?0.6:1, borderLeft:`3px solid ${a.lido?"#ccc":"#E8730A"}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:a.lido?"#888":"#1B3F7A", marginBottom:4 }}>{a.titulo}</div>
                        <div style={{ fontSize:12, color:"#aaa" }}>{a.descricao}</div>
                        {proc && <div style={{ fontSize:11, color:"#888", marginTop:4 }}>👤 {proc.responsavel || "Sem responsável"}</div>}
                      </div>
                      {!a.lido && (
                        <div onClick={() => marcarLido(a.id)} style={{ background:"#f0f4ff", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A", cursor:"pointer", flexShrink:0, marginLeft:10 }}>✓ Lido</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL REGRA */}
      {modal==="regra" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:460, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selecionado?"✏️ Editar Regra":"➕ Nova Regra"}</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><label style={labelStyle}>Nome da Regra *</label><input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Alerta de Vencimento, Aviso Urgente..." style={inputStyle}/></div>
              <div>
                <label style={labelStyle}>Alertar quantos dias antes? *</label>
                <input type="number" min="1" max="365" value={form.diasAntes||""} onChange={e=>setForm(f=>({...f,diasAntes:e.target.value}))} placeholder="Ex: 5" style={inputStyle}/>
                <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>O alerta será gerado quando o prazo estiver a {form.diasAntes||"X"} dia{parseInt(form.diasAntes)!==1?"s":""} de vencer</div>
              </div>
              <div><label style={labelStyle}>Descrição</label><input value={form.descricao||""} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descrição opcional..." style={inputStyle}/></div>
            </div>
            <button onClick={salvarRegra} disabled={salvando||!form.nome||!form.diasAntes} style={{ width:"100%", marginTop:20, background:salvando||!form.nome||!form.diasAntes?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.nome||!form.diasAntes?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando?"Salvando...":"💾 Salvar Regra"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
