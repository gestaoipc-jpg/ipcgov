import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/config";

function formatDateTime(iso) { if(!iso)return"—"; return new Date(iso).toLocaleString("pt-BR"); }

const STATUS_CORES = { "Aguardando":"#E8730A","Aprovada":"#059669","Recusada":"#dc2626","Entregue":"#1B3F7A" };

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

export default function AlmoxSolicitacoesPage({ user, onBack, isAdmin }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ itens:[] });
  const [respostaForm, setRespostaForm] = useState({ tipo:"aprovar", observacao:"" });
  const [salvando, setSalvando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [solSnap, matSnap] = await Promise.all([
        getDocs(collection(db, "almox_solicitacoes")),
        getDocs(collection(db, "almox_materiais")),
      ]);
      setSolicitacoes(solSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(b.criadoEm)-new Date(a.criadoEm)));
      setMateriais(matSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const criarSolicitacao = async () => {
    if (!form.setor || form.itens.length===0) return;
    setSalvando(true);
    try {
      const dados = {
        ...form,
        status: "Aguardando",
        solicitante: user?.email || "sistema",
        criadoEm: new Date().toISOString(),
        historico: [{
          data: new Date().toISOString(),
          autor: user?.email || "sistema",
          tipo: "criacao",
          texto: `Solicitação criada por ${user?.email||"sistema"}`,
        }],
      };
      const ref = await addDoc(collection(db, "almox_solicitacoes"), dados);
      setSolicitacoes(s=>[{id:ref.id,...dados},...s]);
      setModal(null); setForm({ itens:[] });
    } catch(e){ console.error(e); }
    setSalvando(false);
  };

  const responder = async () => {
    if (!selected) return;
    setSalvando(true);
    try {
      const novoStatus = respostaForm.tipo==="aprovar" ? "Aprovada" : "Recusada";
      const textoHist = respostaForm.tipo==="aprovar"
        ? `✅ Solicitação aprovada por ${user?.email||"admin"}${respostaForm.observacao?`. Obs: ${respostaForm.observacao}`:""}`
        : `❌ Solicitação recusada por ${user?.email||"admin"}. Motivo: ${respostaForm.observacao}`;

      const novoHist = [...(selected.historico||[]), {
        data: new Date().toISOString(), autor: user?.email||"admin",
        tipo: respostaForm.tipo, texto: textoHist,
      }];

      const dados = { status: novoStatus, atualizadoEm: new Date().toISOString(), historico: novoHist, respostaAdmin: respostaForm.observacao||"" };

      // Se aprovada: dar baixa no estoque
      if (novoStatus==="Aprovada") {
        for (const item of selected.itens||[]) {
          const mat = materiais.find(m=>m.id===item.materialId);
          if (mat) {
            const novoEstoque = Math.max(0,(mat.estoqueAtual||0)-parseInt(item.quantidade));
            await updateDoc(doc(db,"almox_materiais",mat.id),{ estoqueAtual:novoEstoque, atualizadoEm:new Date().toISOString() });
            setMateriais(m=>m.map(x=>x.id===mat.id?{...x,estoqueAtual:novoEstoque}:x));
            await addDoc(collection(db,"almox_movimentacoes"),{
              materialId:mat.id, materialNome:mat.nome,
              quantidade:parseInt(item.quantidade), tipo:"saida",
              solicitacaoId:selected.id, solicitante:selected.solicitante,
              setor:selected.setor, aprovadoPor:user?.email||"admin",
              data:new Date().toISOString().split("T")[0],
              criadoEm:new Date().toISOString(),
            });
            // Verificar estoque mínimo
            if (novoEstoque <= (mat.estoqueMinimo||0) && mat.estoqueMinimo > 0) {
              await addDoc(collection(db,"almox_alertas"),{
                materialId:mat.id, materialNome:mat.nome, tipo:"estoque_minimo", lido:false,
                mensagem:`Estoque de "${mat.nome}" está em ${novoEstoque} unidade${novoEstoque!==1?"s":""} (mínimo: ${mat.estoqueMinimo})`,
                criadoEm:new Date().toISOString(),
              });
            }
          }
        }
      }

      await updateDoc(doc(db,"almox_solicitacoes",selected.id),dados);
      const atualizada = { ...selected, ...dados };
      setSolicitacoes(s=>s.map(x=>x.id===selected.id?atualizada:x));
      setSelected(atualizada);
      setModal("detalhe");
      setRespostaForm({ tipo:"aprovar", observacao:"" });
    } catch(e){ console.error(e); }
    setSalvando(false);
  };

  const marcarEntregue = async (sol) => {
    const novoHist = [...(sol.historico||[]),{ data:new Date().toISOString(), autor:user?.email||"admin", tipo:"entrega", texto:`📦 Material entregue por ${user?.email||"admin"}` }];
    await updateDoc(doc(db,"almox_solicitacoes",sol.id),{ status:"Entregue", historico:novoHist, atualizadoEm:new Date().toISOString() });
    setSolicitacoes(s=>s.map(x=>x.id===sol.id?{...x,status:"Entregue",historico:novoHist}:x));
    if(selected?.id===sol.id) setSelected(s=>({...s,status:"Entregue",historico:novoHist}));
  };

  const filtradas = solicitacoes.filter(s=>filtroStatus==="todos"||s.status===filtroStatus);
  const pendentes = solicitacoes.filter(s=>s.status==="Aguardando");

  const adicionarItem = () => setForm(f=>({...f,itens:[...(f.itens||[]),{materialId:"",quantidade:""}]}));
  const removerItem = (idx) => setForm(f=>({...f,itens:(f.itens||[]).filter((_,i)=>i!==idx)}));
  const atualizarItem = (idx, campo, val) => setForm(f=>({...f,itens:(f.itens||[]).map((it,i)=>i===idx?{...it,[campo]:val}:it)}));

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px} select,input,textarea{font-family:'Montserrat',sans-serif}`}</style>

      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 32px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>ALMOXARIFADO</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>📤 Solicitações de Material</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
              {pendentes.length>0 && <div style={{ background:"rgba(232,115,10,0.3)", border:"1px solid rgba(232,115,10,0.5)", borderRadius:14, padding:"10px 18px" }}>
                <div style={{ color:"#E8730A", fontWeight:900, fontSize:18 }}>{pendentes.length}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10 }}>Aguardando</div>
              </div>}
              <div onClick={()=>{ setForm({ itens:[] }); setModal("nova"); }} style={{ background:"#E8730A", borderRadius:14, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Nova Solicitação</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {["todos","Aguardando","Aprovada","Recusada","Entregue"].map(s=>(
              <div key={s} onClick={()=>setFiltroStatus(s)} style={{ background:filtroStatus===s?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${filtroStatus===s?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:20, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {s==="todos"?"Todas":s} ({s==="todos"?solicitacoes.length:solicitacoes.filter(x=>x.status===s).length})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 32px 80px" }}>
        {loading ? <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando...</div>
        : filtradas.length===0 ? (
          <div style={{ textAlign:"center", padding:80 }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📤</div>
            <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhuma solicitação</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {filtradas.map(sol=>{
              const cor = STATUS_CORES[sol.status]||"#aaa";
              return (
                <div key={sol.id} onClick={()=>{ setSelected(sol); setModal("detalhe"); }} style={{ background:"#fff", borderRadius:18, padding:"18px 22px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)", cursor:"pointer", border:sol.status==="Aguardando"?"2px solid #E8730A30":"2px solid transparent", display:"flex", alignItems:"center", gap:16, transition:"transform 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
                  <div style={{ width:44, height:44, borderRadius:12, background:cor+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                    {sol.status==="Aguardando"?"⏳":sol.status==="Aprovada"?"✅":sol.status==="Recusada"?"❌":"📦"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A", marginBottom:4 }}>
                      {sol.setor} — {(sol.itens||[]).length} item{(sol.itens||[]).length!==1?"s":""}
                    </div>
                    <div style={{ fontSize:12, color:"#aaa" }}>
                      👤 {sol.solicitante} · {formatDateTime(sol.criadoEm)}
                    </div>
                    {sol.justificativa && <div style={{ fontSize:12, color:"#888", marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sol.justificativa}</div>}
                  </div>
                  <div style={{ background:cor+"18", border:`1px solid ${cor}40`, borderRadius:10, padding:"5px 14px", color:cor, fontSize:12, fontWeight:700, flexShrink:0 }}>{sol.status}</div>
                  {sol.status==="Aprovada" && isAdmin && (
                    <div onClick={e=>{ e.stopPropagation(); marcarEntregue(sol); }} style={{ background:"#1B3F7A", borderRadius:10, padding:"6px 12px", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0 }}>📦 Entregar</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETALHE */}
      {modal==="detalhe" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:640, maxHeight:"90vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 28px", borderRadius:"24px 24px 0 0" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div>
                  <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:2, marginBottom:4 }}>SOLICITAÇÃO · {selected.setor}</div>
                  <div style={{ color:"#fff", fontWeight:900, fontSize:18 }}>{(selected.itens||[]).length} item{(selected.itens||[]).length!==1?"s":""} solicitado{(selected.itens||[]).length!==1?"s":""}</div>
                  <div style={{ background:(STATUS_CORES[selected.status]||"#aaa")+"30", border:`1px solid ${(STATUS_CORES[selected.status]||"#aaa")}50`, borderRadius:8, padding:"3px 12px", color:"#fff", fontSize:12, fontWeight:700, display:"inline-block", marginTop:8 }}>{selected.status}</div>
                </div>
                <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"rgba(255,255,255,0.15)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:18 }}>✕</div>
              </div>
            </div>
            <div style={{ padding:"24px 28px" }}>
              {/* ITENS */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A", marginBottom:10 }}>📦 Itens Solicitados</div>
                {(selected.itens||[]).map((item,i)=>{
                  const mat = materiais.find(m=>m.id===item.materialId);
                  return (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#f8f9fb", borderRadius:10, marginBottom:8 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:"#333" }}>{mat?.nome||item.materialNome||"Material"}</div>
                      <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>{item.quantidade} {mat?.unidade||"un."}</div>
                    </div>
                  );
                })}
              </div>
              {selected.justificativa && (
                <div style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px", marginBottom:20 }}>
                  <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>Justificativa</div>
                  <div style={{ color:"#333", fontSize:13 }}>{selected.justificativa}</div>
                </div>
              )}
              {/* HISTÓRICO */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A", marginBottom:10 }}>📋 Histórico</div>
                {(selected.historico||[]).map((h,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, marginBottom:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:h.tipo==="aprovar"?"#e8f5e9":h.tipo==="recusar"?"#fee2e2":h.tipo==="entrega"?"#f0f4ff":"#f8f9fb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                      {h.tipo==="aprovar"?"✅":h.tipo==="recusar"?"❌":h.tipo==="entrega"?"📦":"📝"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:"#333" }}>{h.texto}</div>
                      <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{formatDateTime(h.data)} · {h.autor}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* AÇÕES ADMIN */}
              {selected.status==="Aguardando" && isAdmin && (
                <div onClick={()=>setModal("responder")} style={{ width:"100%", background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", textAlign:"center" }}>
                  📬 Responder Solicitação
                </div>
              )}
              {selected.status==="Aprovada" && isAdmin && (
                <div onClick={()=>marcarEntregue(selected)} style={{ width:"100%", background:"linear-gradient(135deg,#059669,#10b981)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", textAlign:"center" }}>
                  📦 Confirmar Entrega
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESPONDER */}
      {modal==="responder" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal("detalhe")}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:500, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>📬 Responder Solicitação</div>
              <div onClick={()=>setModal("detalhe")} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:20 }}>
              {[{id:"aprovar",label:"✅ Aprovar",cor:"#059669"},{id:"recusar",label:"❌ Recusar",cor:"#dc2626"}].map(t=>(
                <div key={t.id} onClick={()=>setRespostaForm(r=>({...r,tipo:t.id}))} style={{ flex:1, textAlign:"center", padding:"12px", borderRadius:12, border:`2px solid ${respostaForm.tipo===t.id?t.cor:"#e8edf2"}`, background:respostaForm.tipo===t.id?t.cor+"12":"#f8f9fb", color:respostaForm.tipo===t.id?t.cor:"#888", fontWeight:700, fontSize:14, cursor:"pointer" }}>{t.label}</div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>{respostaForm.tipo==="recusar"?"Motivo da Recusa *":"Observação"}</label>
              <textarea value={respostaForm.observacao||""} onChange={e=>setRespostaForm(r=>({...r,observacao:e.target.value}))} placeholder={respostaForm.tipo==="recusar"?"Informe o motivo...":"Observações opcionais..."} style={{ ...inputStyle, minHeight:80, resize:"vertical" }}/>
            </div>
            <button onClick={responder} disabled={salvando||(respostaForm.tipo==="recusar"&&!respostaForm.observacao)} style={{ width:"100%", marginTop:20, background:salvando?"#ccc":respostaForm.tipo==="aprovar"?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#dc2626,#ef4444)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando?"Salvando...":respostaForm.tipo==="aprovar"?"✅ Aprovar e Dar Baixa no Estoque":"❌ Recusar Solicitação"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL NOVA SOLICITAÇÃO */}
      {modal==="nova" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:600, maxHeight:"92vh", overflow:"auto", padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>📤 Nova Solicitação</div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={labelStyle}>Setor Solicitante *</label>
                <select value={form.setor||""} onChange={e=>setForm(f=>({...f,setor:e.target.value}))} style={inputStyle}>
                  <option value="">Selecione o setor...</option>
                  {["TCEduc","IPC Designer","IPC Processos","Administração","Financeiro","Jurídico","Comunicação"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Itens Solicitados *</label>
                {(form.itens||[]).map((item,idx)=>(
                  <div key={idx} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"center" }}>
                    <select value={item.materialId||""} onChange={e=>{ const mat=materiais.find(m=>m.id===e.target.value); atualizarItem(idx,"materialId",e.target.value); atualizarItem(idx,"materialNome",mat?.nome||""); }} style={{ ...inputStyle, flex:2 }}>
                      <option value="">Selecione o material...</option>
                      {materiais.filter(m=>(m.setoresAutorizados||[]).includes(form.setor)||(m.setoresAutorizados||[]).includes("Todos")||(m.setoresAutorizados||[]).length===0).map(m=><option key={m.id} value={m.id}>{m.nome} (estoque: {m.estoqueAtual||0})</option>)}
                    </select>
                    <input type="number" min="1" value={item.quantidade||""} onChange={e=>atualizarItem(idx,"quantidade",e.target.value)} placeholder="Qtd" style={{ ...inputStyle, flex:1 }}/>
                    <div onClick={()=>removerItem(idx)} style={{ width:36, height:44, background:"#fee2e2", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#dc2626", fontSize:18, flexShrink:0 }}>×</div>
                  </div>
                ))}
                <div onClick={adicionarItem} style={{ background:"#f0f4ff", borderRadius:12, padding:"10px 16px", fontSize:13, color:"#1B3F7A", fontWeight:700, cursor:"pointer", textAlign:"center", border:"2px dashed #1B3F7A33", marginTop:4 }}>+ Adicionar Item</div>
              </div>
              <div>
                <label style={labelStyle}>Justificativa</label>
                <textarea value={form.justificativa||""} onChange={e=>setForm(f=>({...f,justificativa:e.target.value}))} placeholder="Por que você precisa destes materiais?" style={{ ...inputStyle, minHeight:70, resize:"vertical" }}/>
              </div>
            </div>
            <button onClick={criarSolicitacao} disabled={salvando||!form.setor||(form.itens||[]).length===0} style={{ width:"100%", marginTop:20, background:salvando||!form.setor||(form.itens||[]).length===0?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.setor||(form.itens||[]).length===0?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
              {salvando?"Enviando...":"📤 Enviar Solicitação"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

}
