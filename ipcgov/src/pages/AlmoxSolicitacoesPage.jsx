import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

function formatDateTime(iso) { if(!iso)return"—"; return new Date(iso).toLocaleString("pt-BR"); }
function formatDate(d) { if(!d)return"—"; const[y,m,day]=d.split("-"); return`${day}/${m}/${y}`; }

const STATUS_FLOW = {
  "Aguardando Autorização": { cor:"#E8730A", bg:"#fff3e0", icon:"🔐" },
  "Aguardando Homologação": { cor:"#7c3aed", bg:"#f3e8ff", icon:"⏳" },
  "Em Separação":           { cor:"#0891b2", bg:"#e0f2fe", icon:"📦" },
  "Entregue":               { cor:"#059669", bg:"#e8f5e9", icon:"✅" },
  "Entregue Parcial":       { cor:"#059669", bg:"#e8f5e9", icon:"⚠️" },
  "Recusada":               { cor:"#dc2626", bg:"#fee2e2", icon:"❌" },
  "Devolução Pendente":     { cor:"#0891b2", bg:"#e0f2fe", icon:"↩️" },
  "Devolução Homologada":   { cor:"#059669", bg:"#e8f5e9", icon:"✅" },
};

const inp = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"10px 14px", fontSize:13, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const lbl = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:5, fontWeight:600 };

export default function AlmoxSolicitacoesPage({ user, userInfo, onBack, isAdmin }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ itens:[], justificativa:"", setor:"" });
  const [novoItem, setNovoItem] = useState({ materialId:"", quantidade:1 });
  const [homolForm, setHomolForm] = useState({ itens:[], obs:"" }); // qtd editável
  const [salvando, setSalvando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [devForm, setDevForm] = useState({});
  const [showDevForm, setShowDevForm] = useState(false);

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

  const criarAlerta = async (dados) => {
    try { await addDoc(collection(db,"almox_alertas"),{ ...dados, lido:false, criadoEm:new Date().toISOString() }); }
    catch(e){ console.error("alerta",e); }
  };

  // ---- CRIAR SOLICITAÇÃO ----
  const criarSolicitacao = async () => {
    if (form.itens.length===0) { alert("Adicione ao menos um material."); return; }
    setSalvando(true);
    try {
      // Verificar se algum item tem cargo autorizador
      const itensComCargo = form.itens.filter(it=>{
        const mat = materiais.find(m=>m.id===it.materialId);
        return mat?.cargoAutorizadorId;
      });
      const precisaAutorizacao = itensComCargo.length > 0;
      const cargoAutorizadorId = itensComCargo[0] ? materiais.find(m=>m.id===itensComCargo[0].materialId)?.cargoAutorizadorId : null;
      const cargoAutorizadorNome = itensComCargo[0] ? materiais.find(m=>m.id===itensComCargo[0].materialId)?.cargoAutorizadorNome : null;

      const novoStatus = precisaAutorizacao ? "Aguardando Autorização" : "Aguardando Homologação";

      const dados = {
        itens: form.itens.map(it=>{
          const mat = materiais.find(m=>m.id===it.materialId);
          return { materialId:it.materialId, materialNome:mat?.nome||"", quantidade:parseInt(it.quantidade)||1, unidade:mat?.unidade||"un." };
        }),
        justificativa: form.justificativa||"",
        setor: form.setor||"",
        origemViagem: form.origemViagem||null,
        origemViagemTitulo: form.origemViagemTitulo||null,
        status: novoStatus,
        solicitante: user?.email||"sistema",
        solicitanteNome: userInfo?.servidorNome || user?.displayName || user?.email,
        cargoAutorizadorId: cargoAutorizadorId||null,
        cargoAutorizadorNome: cargoAutorizadorNome||null,
        criadoEm: new Date().toISOString(),
        historico: [{
          data: new Date().toISOString(), autor: user?.email||"sistema",
          tipo:"criacao",
          texto:`📋 Solicitação criada por ${userInfo?.servidorNome||user?.email}. Status: ${novoStatus}`,
        }],
      };

      const ref = await addDoc(collection(db,"almox_solicitacoes"), dados);
      const nova = { id:ref.id, ...dados };
      setSolicitacoes(s=>[nova,...s]);

      // Alertas
      if (precisaAutorizacao) {
        await criarAlerta({
          tipo:"autorizacao_necessaria", solicitacaoId:ref.id,
          cargoDestinatario: cargoAutorizadorId, grupo: null,
          mensagem:`🔐 Solicitação de materiais aguarda sua autorização. Solicitante: ${userInfo?.servidorNome||user?.email}. Materiais: ${dados.itens.map(i=>i.materialNome).join(", ")}`,
        });
      } else {
        await criarAlerta({
          tipo:"homologacao_pendente", solicitacaoId:ref.id,
          grupo:"Almoxarifado Administrativo",
          mensagem:`📦 Nova solicitação de materiais para homologação. Solicitante: ${userInfo?.servidorNome||user?.email}`,
        });
      }

      setModal(null); setForm({ itens:[], justificativa:"", setor:"" });
    } catch(e){ console.error(e); alert("Erro ao criar solicitação."); }
    setSalvando(false);
  };

  // ---- HOMOLOGAR (Almox Admin) ----
  const homologar = async (entregar) => {
    if (!selected) return;
    setSalvando(true);
    try {
      const itensFinais = homolForm.itens.length > 0 ? homolForm.itens : selected.itens;
      const algumParcial = itensFinais.some((it,i)=>parseInt(it.quantidade)<parseInt(selected.itens[i]?.quantidade||it.quantidade));
      const novoStatus = !entregar ? "Recusada" : algumParcial ? "Entregue Parcial" : "Entregue";

      const textoHist = !entregar
        ? `❌ Recusada pelo almoxarifado. Motivo: ${homolForm.obs||"sem justificativa"}`
        : `✅ Homologada e entregue por ${userInfo?.servidorNome||user?.email}${algumParcial?" (entrega parcial)":""}${homolForm.obs?`. Obs: ${homolForm.obs}`:""}`;

      const novoHist = [...(selected.historico||[]), {
        data: new Date().toISOString(), autor: user?.email, tipo:"homologacao", texto: textoHist,
      }];

      await updateDoc(doc(db,"almox_solicitacoes",selected.id), {
        status: novoStatus, historico: novoHist, itensEntregues: itensFinais,
        observacaoAlmox: homolForm.obs||"", atualizadoEm: new Date().toISOString(),
      });

      // Dar baixa no estoque para itens entregues
      if (entregar) {
        await Promise.all(itensFinais.map(async it => {
          const mat = materiais.find(m=>m.id===it.materialId);
          if (!mat) return;
          const qtd = parseInt(it.quantidade)||0;
          const novoEstoque = Math.max(0, (mat.estoqueAtual||0) - qtd);
          await updateDoc(doc(db,"almox_materiais",mat.id), { estoqueAtual:novoEstoque, atualizadoEm:new Date().toISOString() });
          setMateriais(m=>m.map(x=>x.id===mat.id?{...x,estoqueAtual:novoEstoque}:x));
          await addDoc(collection(db,"almox_movimentacoes"),{
            tipo:"saida_solicitacao", materialId:mat.id, materialNome:mat.nome,
            quantidade:qtd, solicitacaoId:selected.id,
            solicitanteNome:selected.solicitanteNome||selected.solicitante,
            registradoPor:user?.email, criadoEm:new Date().toISOString(),
          });
          if (novoEstoque <= (mat.estoqueMinimo||0) && mat.estoqueMinimo>0) {
            await criarAlerta({ tipo:"estoque_minimo", materialId:mat.id, materialNome:mat.nome, grupo:"Almoxarifado Administrativo",
              mensagem:`⚠️ Estoque de "${mat.nome}" em ${novoEstoque} un. (mínimo: ${mat.estoqueMinimo})` });
          }
        }))
      }

      // Alerta para solicitante
      await criarAlerta({
        tipo: novoStatus==="Recusada" ? "solicitacao_recusada" : "solicitacao_entregue",
        solicitacaoId:selected.id, destinatario:selected.solicitante,
        mensagem: novoStatus==="Recusada"
          ? `❌ Sua solicitação de materiais foi recusada pelo almoxarifado. Motivo: ${homolForm.obs||"sem justificativa"}`
          : `✅ Seus materiais foram separados e entregues${algumParcial?" (parcialmente)":""}. Verifique os detalhes no sistema.`,
      });

      const atualizada = { ...selected, status:novoStatus, historico:novoHist, itensEntregues:itensFinais };
      setSolicitacoes(s=>s.map(x=>x.id===selected.id?atualizada:x));
      setSelected(atualizada);
      setModal("detalhe");
    } catch(e){ console.error(e); }
    setSalvando(false);
  };

  // ---- REGISTRAR DEVOLUÇÃO ----
  const registrarDevolucao = async (itensDevolucao) => {
    if (!selected) return;
    setSalvando(true);
    try {
      const textoHist = `↩️ Devolução solicitada por ${userInfo?.servidorNome||user?.email}: ${itensDevolucao.map(it=>`${it.materialNome} (${it.qtdDevolvida})`).join(", ")}`;
      const novoHist = [...(selected.historico||[]), {
        data:new Date().toISOString(), autor:user?.email, tipo:"devolucao_solicitada", texto:textoHist,
      }];
      await updateDoc(doc(db,"almox_solicitacoes",selected.id),{
        status:"Devolução Pendente", historico:novoHist, itensDevolucao, atualizadoEm:new Date().toISOString(),
      });
      await criarAlerta({
        tipo:"devolucao_pendente", solicitacaoId:selected.id, grupo:"Almoxarifado Administrativo",
        mensagem:`↩️ Devolução de materiais aguardando homologação. Solicitante: ${selected.solicitanteNome}. Itens: ${itensDevolucao.map(it=>it.materialNome).join(", ")}`,
      });
      const atualizada = { ...selected, status:"Devolução Pendente", historico:novoHist, itensDevolucao };
      setSolicitacoes(s=>s.map(x=>x.id===selected.id?atualizada:x));
      setSelected(atualizada);
      setModal("detalhe");
    } catch(e){ console.error(e); }
    setSalvando(false);
  };

  // ---- HOMOLOGAR DEVOLUÇÃO (Almox Admin) ----
  const homologarDevolucao = async (aceito) => {
    if (!selected) return;
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      const itensDev = selected.itensDevolucao||[];
      const textoHist = aceito
        ? `✅ Devolução homologada por ${userInfo?.servidorNome||user?.email} em ${new Date().toLocaleString("pt-BR")}`
        : `❌ Devolução não homologada por ${userInfo?.servidorNome||user?.email}`;
      const novoHist = [...(selected.historico||[]),{ data:agora, autor:user?.email, tipo:"devolucao_homologada", texto:textoHist }];

      await updateDoc(doc(db,"almox_solicitacoes",selected.id),{
        status:"Devolução Homologada", historico:novoHist,
        devolucaoHomologadaEm:agora, devolucaoHomologadaPor:userInfo?.servidorNome||user?.email,
        devolucaoAceita:aceito, atualizadoEm:agora,
      });

      if (aceito) {
        await Promise.all(itensDev.map(async it => {
          const mat = materiais.find(m=>m.id===it.materialId);
          if (!mat) return;
          const qtd = parseInt(it.qtdDevolvida)||0;
          const novoEstoque = (mat.estoqueAtual||0)+qtd;
          await updateDoc(doc(db,"almox_materiais",mat.id),{estoqueAtual:novoEstoque,atualizadoEm:agora});
          setMateriais(m=>m.map(x=>x.id===mat.id?{...x,estoqueAtual:novoEstoque}:x));
          await addDoc(collection(db,"almox_movimentacoes"),{
            tipo:"entrada_devolucao", materialId:mat.id, materialNome:mat.nome,
            quantidade:qtd, solicitacaoId:selected.id,
            solicitanteNome:selected.solicitanteNome,
            registradoPor:user?.email, criadoEm:agora,
          });
        }))
      }

      await criarAlerta({
        tipo:"devolucao_resultado", solicitacaoId:selected.id, destinatario:selected.solicitante,
        mensagem: aceito
          ? `✅ Sua devolução foi aceita em ${new Date().toLocaleString("pt-BR")} por ${userInfo?.servidorNome||user?.email}`
          : `❌ Sua devolução não foi homologada pelo almoxarifado.`,
      });

      const atualizada = { ...selected, status:"Devolução Homologada", historico:novoHist, devolucaoAceita:aceito };
      setSolicitacoes(s=>s.map(x=>x.id===selected.id?atualizada:x));
      setSelected(atualizada);
      setModal("detalhe");
    } catch(e){ console.error(e); }
    setSalvando(false);
  };

  const filtradas = filtroStatus==="todos" ? solicitacoes : solicitacoes.filter(s=>s.status===filtroStatus);

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 24px 28px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div onClick={onBack} style={{ width:38, height:38, background:"rgba(255,255,255,0.15)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:18 }}>←</div>
            <div style={{ flex:1 }}>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>ALMOXARIFADO</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>📤 Solicitações</div>
            </div>
            <div onClick={()=>{ setForm({itens:[],justificativa:"",setor:""}); setNovoItem({materialId:"",quantidade:1}); setModal("nova"); }}
              style={{ background:"#E8730A", borderRadius:12, padding:"10px 18px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              + Nova Solicitação
            </div>
          </div>
          {/* Stats */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {Object.entries(STATUS_FLOW).map(([st,{cor,icon}])=>{
              const qtd = solicitacoes.filter(s=>s.status===st).length;
              if (!qtd) return null;
              return <div key={st} style={{ background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"6px 12px" }}>
                <span style={{ color:"#fff", fontWeight:700, fontSize:13 }}>{icon} {qtd}</span>
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:10, marginLeft:5 }}>{st}</span>
              </div>;
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 20px 80px" }}>
        {/* FILTROS */}
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {["todos",...Object.keys(STATUS_FLOW)].map(s=>(
            <div key={s} onClick={()=>setFiltroStatus(s)} style={{ background:filtroStatus===s?"#1B3F7A":"#fff", borderRadius:20, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:700, color:filtroStatus===s?"#fff":"#1B3F7A", boxShadow:"0 2px 8px rgba(27,63,122,0.07)" }}>
              {s==="todos"?"Todas":s} ({s==="todos"?solicitacoes.length:solicitacoes.filter(x=>x.status===s).length})
            </div>
          ))}
        </div>

        {loading ? <div style={{ textAlign:"center", color:"#aaa", padding:40 }}>Carregando...</div> : (
          filtradas.length === 0 ? <div style={{ textAlign:"center", color:"#aaa", padding:40 }}>Nenhuma solicitação</div> :
          filtradas.map(sol=>{
            const sf = STATUS_FLOW[sol.status]||{cor:"#888",bg:"#f8f9fb",icon:"📋"};
            return (
              <div key={sol.id} onClick={()=>{ setSelected(sol); setHomolForm({ itens: sol.itens?.map(it=>({...it})) || [], obs:"" }); setDevForm({}); setShowDevForm(false); setModal("detalhe"); }}
                style={{ background:"#fff", borderRadius:16, padding:"16px 20px", marginBottom:10, cursor:"pointer", border:`2px solid ${sf.cor}22`, boxShadow:"0 2px 12px rgba(27,63,122,0.07)", display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:sf.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{sf.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A", marginBottom:3 }}>
                    {sol.solicitanteNome||sol.solicitante}
                    {sol.origemViagemTitulo && <span style={{ marginLeft:6, background:"#eff6ff", borderRadius:5, padding:"1px 7px", fontSize:10, color:"#1B3F7A", fontWeight:700 }}>🗺️ {sol.origemViagemTitulo}</span>}
                  </div>
                  <div style={{ fontSize:12, color:"#555", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {(sol.itens||[]).map(it=>`${it.materialNome} (${it.quantidade})`).join(" · ")}
                  </div>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:3 }}>{formatDateTime(sol.criadoEm)}</div>
                </div>
                <div style={{ background:sf.cor+"18", border:`1px solid ${sf.cor}44`, borderRadius:10, padding:"4px 12px", color:sf.cor, fontSize:11, fontWeight:700, flexShrink:0 }}>{sol.status}</div>
              </div>
            );
          })
        )}
      </div>

      {/* ===== MODAL NOVA SOLICITAÇÃO ===== */}
      {modal==="nova" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:600, maxHeight:"92vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 24px", borderRadius:"24px 24px 0 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ color:"#fff", fontWeight:900, fontSize:18 }}>📋 Nova Solicitação</div>
              <div onClick={()=>setModal(null)} style={{ color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:22 }}>✕</div>
            </div>
            <div style={{ padding:"20px 24px" }}>
              <div style={{ marginBottom:14 }}><label style={lbl}>Setor Solicitante</label><input value={form.setor} onChange={e=>setForm(f=>({...f,setor:e.target.value}))} placeholder="Seu setor" style={inp}/></div>
              <div style={{ marginBottom:14 }}><label style={lbl}>Justificativa</label><textarea value={form.justificativa} onChange={e=>setForm(f=>({...f,justificativa:e.target.value}))} placeholder="Por que você precisa destes materiais?" style={{ ...inp, minHeight:70, resize:"vertical" }}/></div>

              {/* Adicionar itens */}
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Materiais ({form.itens.length} item{form.itens.length!==1?"s":""})</label>
                <div style={{ background:"#f8f9fb", borderRadius:12, padding:12, border:"1px solid #e8edf2" }}>
                  {form.itens.map((it,i)=>{
                    const mat=materiais.find(m=>m.id===it.materialId);
                    const temCargo = mat?.cargoAutorizadorId;
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, background:"#fff", borderRadius:8, padding:"8px 12px", border:`1px solid ${temCargo?"#fed7aa":"#e8edf2"}` }}>
                        <span style={{ flex:1, fontSize:13, color:"#333", fontWeight:600 }}>{mat?.nome||"—"}</span>
                        {temCargo && <span style={{ fontSize:10, color:"#E8730A", fontWeight:700, background:"#fff3e0", borderRadius:5, padding:"1px 6px" }}>🔐 {mat.cargoAutorizadorNome}</span>}
                        <span style={{ fontSize:13, color:"#1B3F7A", fontWeight:700 }}>{it.quantidade} {mat?.unidade||"un."}</span>
                        <button onClick={()=>setForm(f=>({...f,itens:f.itens.filter((_,j)=>j!==i)}))} style={{ background:"none", border:"none", color:"#dc2626", fontSize:18, cursor:"pointer" }}>×</button>
                      </div>
                    );
                  })}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto 80px", gap:8, marginTop:8, alignItems:"center" }}>
                    <select value={novoItem.materialId} onChange={e=>setNovoItem(n=>({...n,materialId:e.target.value}))} style={{ ...inp, padding:"8px 12px" }}>
                      <option value="">Selecione o material...</option>
                      {materiais.filter(m=>(m.estoqueAtual||0)>0).map(m=><option key={m.id} value={m.id}>{m.nome} ({m.estoqueAtual||0} {m.unidade||"un."} disponíveis)</option>)}
                    </select>
                    <input type="number" min="1" value={novoItem.quantidade} onChange={e=>setNovoItem(n=>({...n,quantidade:e.target.value}))} style={{ ...inp, padding:"8px 12px", width:70 }}/>
                    <button onClick={()=>{
                      if(!novoItem.materialId) return;
                      const mat=materiais.find(m=>m.id===novoItem.materialId);
                      const qtd=parseInt(novoItem.quantidade)||1;
                      if(qtd>(mat?.estoqueAtual||0)){ alert(`Estoque insuficiente! Disponível: ${mat?.estoqueAtual||0} ${mat?.unidade||"un."}`); return; }
                      if(form.itens.find(it=>it.materialId===novoItem.materialId)){ alert("Material já adicionado."); return; }
                      setForm(f=>({...f,itens:[...f.itens,{materialId:novoItem.materialId,quantidade:qtd}]}));
                      setNovoItem({materialId:"",quantidade:1});
                    }} style={{ background:"#1B3F7A", border:"none", borderRadius:10, padding:"8px 14px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif", whiteSpace:"nowrap" }}>+ Add</button>
                  </div>
                </div>
              </div>

              {/* Aviso de autorização */}
              {form.itens.some(it=>materiais.find(m=>m.id===it.materialId)?.cargoAutorizadorId) && (
                <div style={{ background:"#fff3e0", borderRadius:10, padding:"10px 14px", marginBottom:14, border:"1px solid #fed7aa", fontSize:12, color:"#E8730A", fontWeight:600 }}>
                  🔐 Esta solicitação requer autorização prévia de um cargo antes de ser processada pelo almoxarifado.
                </div>
              )}

              <button onClick={criarSolicitacao} disabled={salvando||form.itens.length===0}
                style={{ width:"100%", background:salvando||form.itens.length===0?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                {salvando?"Enviando...":"📤 Enviar Solicitação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DETALHE / HOMOLOGAÇÃO ===== */}
      {modal==="detalhe" && selected && (() => {
        const sf = STATUS_FLOW[selected.status]||{cor:"#888",bg:"#f8f9fb",icon:"📋"};
        const podeHomologar = isAdmin && (selected.status==="Aguardando Homologação");
        const podeHomolDev = isAdmin && selected.status==="Devolução Pendente";
        const possoDevolver = selected.solicitante===user?.email && ["Entregue","Entregue Parcial"].includes(selected.status);
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
            <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:620, maxHeight:"94vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
              {/* Header */}
              <div style={{ background:`linear-gradient(135deg,${sf.cor},${sf.cor}cc)`, padding:"20px 24px", borderRadius:"24px 24px 0 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:10, letterSpacing:2 }}>SOLICITAÇÃO</div>
                    <div style={{ color:"#fff", fontWeight:900, fontSize:18, marginTop:4 }}>{selected.solicitanteNome||selected.solicitante}</div>
                    {selected.setor && <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>{selected.setor}</div>}
                    {selected.origemViagemTitulo && <div style={{ color:"rgba(255,255,255,0.9)", fontSize:12, marginTop:3, background:"rgba(255,255,255,0.15)", borderRadius:6, padding:"2px 8px", display:"inline-block" }}>🗺️ {selected.origemViagemTitulo}</div>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                    <div style={{ background:"rgba(255,255,255,0.25)", borderRadius:8, padding:"4px 12px", color:"#fff", fontWeight:700, fontSize:12 }}>{sf.icon} {selected.status}</div>
                    <div onClick={()=>setModal(null)} style={{ color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:20 }}>✕</div>
                  </div>
                </div>
              </div>

              <div style={{ padding:"20px 24px" }}>
                {/* Itens */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:8 }}>📦 Itens Solicitados</div>
                  {(selected.itens||[]).map((it,i)=>{
                    const entregue = (selected.itensEntregues||[])[i];
                    return (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:i%2===0?"#f8f9fb":"#fff", borderRadius:8, marginBottom:4, border:"1px solid #e8edf2" }}>
                        <span style={{ fontSize:13, color:"#333", fontWeight:600 }}>{it.materialNome}</span>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:13, color:"#1B3F7A", fontWeight:700 }}>Solicitado: {it.quantidade} {it.unidade}</span>
                          {entregue && entregue.quantidade!==it.quantidade && <span style={{ fontSize:12, color:"#E8730A", fontWeight:700 }}>Entregue: {entregue.quantidade}</span>}
                        </div>
                        {/* Edição de qtd na homologação */}
                        {podeHomologar && (
                          <input type="number" min="0" max={it.quantidade} value={homolForm.itens[i]?.quantidade??it.quantidade}
                            onChange={e=>{
                              const arr=[...homolForm.itens];
                              arr[i]={...it,quantidade:parseInt(e.target.value)||0};
                              setHomolForm(f=>({...f,itens:arr}));
                            }}
                            style={{ width:60, ...inp, padding:"4px 8px", fontSize:12 }}/>
                        )}
                      </div>
                    );
                  })}
                  {podeHomologar && <div style={{ fontSize:11, color:"#888", marginTop:4 }}>💡 Edite a quantidade a entregar se necessário (entregas parciais serão registradas)</div>}
                </div>

                {selected.justificativa && (
                  <div style={{ background:"#f0f4ff", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
                    <div style={{ fontSize:10, color:"#888", letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>Justificativa</div>
                    <div style={{ fontSize:13, color:"#333", lineHeight:1.5 }}>{selected.justificativa}</div>
                  </div>
                )}

                {selected.cargoAutorizadorNome && (
                  <div style={{ background:selected.status==="Aguardando Autorização"?"#fff3e0":"#e8f5e9", borderRadius:10, padding:"8px 14px", marginBottom:14, fontSize:12, fontWeight:600, color:selected.status==="Aguardando Autorização"?"#E8730A":"#059669" }}>
                    {selected.status==="Aguardando Autorização"?"🔐":"✅"} Cargo autorizador: {selected.cargoAutorizadorNome}
                  </div>
                )}

                {/* Obs homologação */}
                {podeHomologar && (
                  <div style={{ marginBottom:14 }}>
                    <label style={lbl}>Observação do Almoxarifado</label>
                    <textarea value={homolForm.obs} onChange={e=>setHomolForm(f=>({...f,obs:e.target.value}))} placeholder="Motivo de recusa, observações de entrega..." style={{ ...inp, minHeight:60, resize:"vertical" }}/>
                  </div>
                )}

                {/* Ações de homologação */}
                {podeHomologar && (
                  <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                    <button onClick={()=>homologar(true)} disabled={salvando} style={{ flex:1, background:salvando?"#ccc":"#059669", border:"none", borderRadius:12, padding:12, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✅ Homologar e Entregar</button>
                    <button onClick={()=>homologar(false)} disabled={salvando} style={{ flex:1, background:salvando?"#ccc":"#dc2626", border:"none", borderRadius:12, padding:12, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>❌ Recusar</button>
                  </div>
                )}

                {/* Devolução Pendente — Almox Admin homologa */}
                {podeHomolDev && (
                  <div style={{ background:"#e0f2fe", borderRadius:12, padding:14, marginBottom:14, border:"1px solid #bae6fd" }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#0891b2", marginBottom:8 }}>↩️ Devolução Aguardando Homologação</div>
                    {(selected.itensDevolucao||[]).map((it,i)=>(
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 10px", background:"#fff", borderRadius:8, marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:600 }}>{it.materialNome}</span>
                        <span style={{ fontSize:13, color:"#0891b2", fontWeight:700 }}>↩️ {it.qtdDevolvida} {it.unidade}</span>
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:8, marginTop:10 }}>
                      <button onClick={()=>homologarDevolucao(true)} disabled={salvando} style={{ flex:1, background:salvando?"#ccc":"#059669", border:"none", borderRadius:10, padding:10, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✅ Aceitar Devolução</button>
                      <button onClick={()=>homologarDevolucao(false)} disabled={salvando} style={{ flex:1, background:salvando?"#ccc":"#dc2626", border:"none", borderRadius:10, padding:10, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>❌ Recusar</button>
                    </div>
                  </div>
                )}

                {/* FORM DEVOLUÇÃO — solicitante */}
                {possoDevolver && !showDevForm && (
                  <button onClick={()=>{ setShowDevForm(true); const f={}; (selected.itensEntregues||selected.itens||[]).forEach(it=>{ f[it.materialId]=0; }); setDevForm(f); }}
                    style={{ width:"100%", background:"#e0f2fe", border:"none", borderRadius:12, padding:12, color:"#0891b2", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif", marginBottom:14 }}>
                    ↩️ Registrar Devolução de Materiais
                  </button>
                )}
                {showDevForm && (
                  <div style={{ background:"#e0f2fe", borderRadius:12, padding:14, marginBottom:14, border:"1px solid #bae6fd" }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#0891b2", marginBottom:10 }}>↩️ Informe as quantidades a devolver</div>
                    {(selected.itensEntregues||selected.itens||[]).map((it,i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                        <span style={{ flex:1, fontSize:13, color:"#333", fontWeight:600 }}>{it.materialNome}</span>
                        <span style={{ fontSize:11, color:"#888" }}>Entregue: {it.quantidade}</span>
                        <input type="number" min="0" max={it.quantidade} value={devForm[it.materialId]??0}
                          onChange={e=>setDevForm(f=>({...f,[it.materialId]:parseInt(e.target.value)||0}))}
                          style={{ width:65, ...inp, padding:"5px 8px", fontSize:12 }}/>
                        <span style={{ fontSize:11, color:"#888" }}>{it.unidade}</span>
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:8, marginTop:10 }}>
                      <button onClick={()=>{
                        const itens=(selected.itensEntregues||selected.itens||[]).filter(it=>(devForm[it.materialId]||0)>0).map(it=>({
                          materialId:it.materialId, materialNome:it.materialNome, qtdDevolvida:devForm[it.materialId]||0, unidade:it.unidade
                        }));
                        if(itens.length===0){ alert("Informe ao menos uma quantidade."); return; }
                        registrarDevolucao(itens);
                      }} disabled={salvando} style={{ flex:1, background:salvando?"#ccc":"#0891b2", border:"none", borderRadius:10, padding:10, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                        ↩️ Confirmar Devolução
                      </button>
                      <button onClick={()=>setShowDevForm(false)} style={{ background:"#f0f4ff", border:"none", borderRadius:10, padding:"10px 14px", color:"#1B3F7A", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>Cancelar</button>
                    </div>
                  </div>
                )}

                {/* HISTÓRICO */}
                <div style={{ marginTop:16 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", marginBottom:8 }}>📋 Histórico Completo</div>
                  {(selected.historico||[]).slice().reverse().map((h,i)=>(
                    <div key={i} style={{ borderLeft:"3px solid #1B3F7A22", paddingLeft:12, marginBottom:10 }}>
                      <div style={{ fontSize:10, color:"#aaa", marginBottom:2 }}>{formatDateTime(h.data)} · {h.autor}</div>
                      <div style={{ fontSize:13, color:"#333", lineHeight:1.5 }}>{h.texto}</div>
                    </div>
                  ))}

                  {/* Resultado devolução */}
                  {selected.status==="Devolução Homologada" && (
                    <div style={{ background:selected.devolucaoAceita?"#e8f5e9":"#fee2e2", borderRadius:10, padding:"10px 14px", marginTop:8, border:`1px solid ${selected.devolucaoAceita?"#c8e6c9":"#fecaca"}` }}>
                      <div style={{ fontWeight:700, fontSize:13, color:selected.devolucaoAceita?"#059669":"#dc2626" }}>
                        {selected.devolucaoAceita?"✅ Devolução aceita":"❌ Devolução não homologada"}
                      </div>
                      {selected.devolucaoHomologadaEm && <div style={{ fontSize:11, color:"#888", marginTop:3 }}>em {new Date(selected.devolucaoHomologadaEm).toLocaleString("pt-BR")} por {selected.devolucaoHomologadaPor}</div>}
                      {(selected.itensDevolucao||[]).map((it,i)=>(
                        <div key={i} style={{ fontSize:12, color:"#333", marginTop:4 }}>
                          ↩️ {it.materialNome} — {selected.origemViagemTitulo||""} QTD {it.qtdDevolvida} ({selected.devolucaoAceita?"Devolução aceita":"Não aceita"} no dia {new Date(selected.devolucaoHomologadaEm).toLocaleDateString("pt-BR")} às {new Date(selected.devolucaoHomologadaEm).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} por {selected.devolucaoHomologadaPor})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
