import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const EIXOS = [
  "Auditoria","Contabilidade, Orçamento e Finanças Públicas","Controle Externo","Controle Interno",
  "Controle Social","Criatividade e Inovação","Direito","Educação e Cultura",
  "Gestão Ambiental, Sustentabilidade e ESG","Gestão do Conhecimento","Gestão de Pessoas",
  "Gestão Pública","Governança","Licitação, Contratos Administrativos e Convênios",
  "Ouvidoria","Outros","Planejamento, Processos e Projetos","Tecnologia da Informação",
];
const COMPETENCIAS = ["Comportamentais","Gerenciais","Técnicas"];

const lbl = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };
const inp = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"11px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };

export default function IPCCursosFormPage({ user, projeto, onBack, onSaved }) {
  const [form, setForm] = useState({
    nomeCurso:"", modalidade:"Presencial", justificativaObjetivo:"",
    eixosTematicos:[], competencias:[], programa:"", publicoAlvo:"",
    cargaHoraria:"", data:"", horario:"", local:"", numParticipantes:"",
    conteudoProgramatico:"", metasEntrega:"", prazoEntregas:"", materialDidatico:"",
    avaliacao:"", metodologia:"", bibliografia:"", elaboracaoProjeto:"",
    valorProposta:"", instrutores:[],
    status:"Em elaboração",
  });
  const [instrutoresCadastrados, setInstrutoresCadastrados] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  useEffect(() => {
    if (projeto) setForm({ ...form, ...projeto });
    loadInstrutores();
  }, []);

  const loadInstrutores = async () => {
    try {
      const snap = await getDocs(collection(db, "ipc_cursos_instrutores"));
      setInstrutoresCadastrados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.error(e); }
  };

  const toggleEixo = (e) => setForm(f => ({
    ...f, eixosTematicos: f.eixosTematicos.includes(e)
      ? f.eixosTematicos.filter(x => x !== e)
      : [...f.eixosTematicos, e]
  }));
  const toggleComp = (c) => setForm(f => ({
    ...f, competencias: f.competencias.includes(c)
      ? f.competencias.filter(x => x !== c)
      : [...f.competencias, c]
  }));

  const addInstrutor = () => setForm(f => ({
    ...f, instrutores: [...(f.instrutores||[]), { instrutorId:"", nome:"", miniCurriculo:"", pagamento:false, valorPagamento:"" }]
  }));
  const removeInstrutor = (i) => setForm(f => ({ ...f, instrutores: f.instrutores.filter((_,idx)=>idx!==i) }));
  const updateInstrutor = (i, field, val) => {
    const instrs = [...(form.instrutores||[])];
    instrs[i] = { ...instrs[i], [field]: val };
    if (field === "instrutorId") {
      const found = instrutoresCadastrados.find(x => x.id === val);
      if (found) { instrs[i].nome = found.nome; instrs[i].miniCurriculo = found.miniCurriculo||""; }
    }
    setForm(f => ({ ...f, instrutores: instrs }));
  };

  const salvar = async () => {
    if (!form.nomeCurso.trim()) { alert("Informe o nome do curso."); return; }
    setSalvando(true);
    try {
      const dados = { ...form, atualizadoEm: new Date().toISOString() };
      if (projeto?.id) {
        await updateDoc(doc(db, "ipc_cursos_projetos", projeto.id), dados);
        onSaved({ ...projeto, ...dados });
      } else {
        dados.criadoEm = new Date().toISOString();
        dados.criadoPor = user?.email || "sistema";
        const ref = await addDoc(collection(db, "ipc_cursos_projetos"), dados);
        onSaved({ id: ref.id, ...dados });
      }
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const gerarPDF = () => {
    setGerandoPDF(true);
    const ead = form.modalidade === "EaD";
    const instrutoresHTML = (form.instrutores||[]).map(i => (
      "<tr><td style='padding:8px;border:1px solid #ddd;font-weight:700'>" + (i.nome||"—") + "</td><td style='padding:8px;border:1px solid #ddd'>" + (i.miniCurriculo||"—") + "</td><td style='padding:8px;border:1px solid #ddd'>" + (i.pagamento ? "Sim" + (i.valorPagamento ? " — R$ "+i.valorPagamento : "") : "Não") + "</td></tr>"
    )).join("");

    const html = "<!DOCTYPE html><html><head><meta charset='UTF-8'/><title>Projeto de Curso</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#222;font-size:13px} h1{font-size:16px;text-align:center;text-transform:uppercase;border-bottom:2px solid #1B3F7A;padding-bottom:8px;margin-bottom:20px} .section{margin-bottom:16px} .label{font-weight:700;font-size:11px;text-transform:uppercase;color:#1B3F7A;letter-spacing:1px;margin-bottom:4px} .value{border:1px solid #ddd;border-radius:4px;padding:8px;min-height:36px;background:#fafafa} table{width:100%;border-collapse:collapse} .checkbox-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:4px} .cb{display:flex;align-items:center;gap:6px;padding:3px 0} @page{margin:20mm} @media print{body{margin:0}}</style></head><body>" +
      "<div style='text-align:center;margin-bottom:20px'><div style='font-size:22px;font-weight:900;color:#1B3F7A'>IPC<span style='color:#E8730A'>gov</span></div><div style='font-size:11px;color:#888;letter-spacing:2px'>Instituto Plácido Castelo — IPC</div></div>" +
      "<h1>Projeto de " + (ead?"Curso EaD":"Curso/Evento") + "</h1>" +
      "<div class='section'><div class='label'>Nome do Curso/Evento</div><div class='value'>" + (form.nomeCurso||"") + "</div></div>" +
      "<div class='section'><div class='label'>Modalidade</div><div class='value'>" + (form.modalidade||"") + "</div></div>" +
      "<div class='section'><div class='label'>Justificativa e Objetivo</div><div class='value' style='white-space:pre-wrap'>" + (form.justificativaObjetivo||"") + "</div></div>" +
      "<div class='section'><div class='label'>Eixo Temático</div><div class='checkbox-grid'>" + EIXOS.map(e => "<div class='cb'><div style='width:14px;height:14px;border:1.5px solid #1B3F7A;border-radius:3px;background:" + (form.eixosTematicos.includes(e)?"#1B3F7A":"#fff") + ";flex-shrink:0'></div><span>" + e + "</span></div>").join("") + "</div></div>" +
      "<div class='section'><div class='label'>Competência</div><div style='display:flex;gap:16'>" + COMPETENCIAS.map(c => "<div class='cb'><div style='width:14px;height:14px;border:1.5px solid #1B3F7A;border-radius:3px;background:" + (form.competencias.includes(c)?"#1B3F7A":"#fff") + ";flex-shrink:0'></div><span>" + c + "</span></div>").join("") + "</div></div>" +
      "<div class='section'><div class='label'>Programa</div><div class='value' style='white-space:pre-wrap'>" + (form.programa||"") + "</div></div>" +
      "<div class='section'><div class='label'>Público Alvo</div><div class='value'>" + (form.publicoAlvo||"") + "</div></div>" +
      "<div class='section'><div class='label'>Carga Horária</div><div class='value'>" + (form.cargaHoraria ? form.cargaHoraria+"h" : "") + "</div></div>" +
      (!ead ? "<div class='section'><div class='label'>Data</div><div class='value'>" + (form.data ? new Date(form.data+"T12:00:00").toLocaleDateString("pt-BR") : "") + "</div></div>" : "") +
      (!ead ? "<div class='section'><div class='label'>Horário</div><div class='value'>" + (form.horario||"") + "</div></div>" : "") +
      (!ead ? "<div class='section'><div class='label'>Local</div><div class='value'>" + (form.local||"") + "</div></div>" : "") +
      (!ead ? "<div class='section'><div class='label'>Número de Participantes</div><div class='value'>" + (form.numParticipantes||"") + "</div></div>" : "") +
      "<div class='section'><div class='label'>Conteúdo Programático</div><div class='value' style='white-space:pre-wrap'>" + (form.conteudoProgramatico||"") + "</div></div>" +
      (ead ? "<div class='section'><div class='label'>Metas de Entrega</div><div class='value' style='white-space:pre-wrap'>" + (form.metasEntrega||"") + "</div></div>" : "") +
      (ead ? "<div class='section'><div class='label'>Avaliação</div><div class='value' style='white-space:pre-wrap'>" + (form.avaliacao||"") + "</div></div>" : "") +
      (instrutoresHTML ? "<div class='section'><div class='label'>Instrutores</div><table><thead><tr><th style='padding:8px;border:1px solid #ddd;background:#f0f4ff;text-align:left'>Nome</th><th style='padding:8px;border:1px solid #ddd;background:#f0f4ff;text-align:left'>Mini Currículo</th><th style='padding:8px;border:1px solid #ddd;background:#f0f4ff;text-align:left'>Pagamento</th></tr></thead><tbody>" + instrutoresHTML + "</tbody></table></div>" : "") +
      "<div class='section'><div class='label'>Metodologia e Recursos Humanos</div><div class='value' style='white-space:pre-wrap'>" + (form.metodologia||"") + "</div></div>" +
      "<div class='section'><div class='label'>Bibliografia</div><div class='value' style='white-space:pre-wrap'>" + (form.bibliografia||"") + "</div></div>" +
      "<div class='section'><div class='label'>Proposta de Valor</div><div class='value' style='white-space:pre-wrap'>" + (form.valorProposta||"") + "</div></div>" +
      "<div class='section'><div class='label'>Elaboração do Projeto</div><div class='value'>" + (form.elaboracaoProjeto||"") + "</div></div>" +
      "<div style='margin-top:40px;text-align:right'><div>Fortaleza, ___/___/______</div><div style='margin-top:40px;border-top:1px solid #333;padding-top:8px;display:inline-block;min-width:300px;text-align:center'>Coordenação de Educação Continuada, Extensão e Pós-Graduação<br>Instituto Plácido Castelo — IPC</div></div>" +
      "</body></html>";

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); setGerandoPDF(false); }, 800);
  };

  const isEaD = form.modalidade === "EaD";
  const isTramitado = projeto?.status === "Tramitado" || projeto?.status === "Aprovado";

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 36px" }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20, flexShrink:0 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>IPC CURSOS</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>{projeto ? "Editar Projeto" : "Novo Projeto de Curso"}</div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              <div onClick={gerarPDF} style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"8px 16px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                {gerandoPDF ? "Gerando..." : "📄 Gerar PDF"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 32px 80px" }}>
        {isTramitado && (
          <div style={{ background:"#f5f3ff", border:"2px solid #7c3aed", borderRadius:14, padding:"14px 18px", marginBottom:20, fontSize:13, color:"#7c3aed", fontWeight:700 }}>
            🔒 Este projeto foi tramitado e está bloqueado para edição.
          </div>
        )}

        <div style={{ background:"#fff", borderRadius:20, padding:28, boxShadow:"0 2px 16px rgba(27,63,122,0.08)", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:20, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:4, height:18, background:"#1B3F7A", borderRadius:2 }} />📋 Identificação
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>Nome do Curso/Evento *</label>
              <input value={form.nomeCurso} onChange={e=>setForm(f=>({...f,nomeCurso:e.target.value}))} placeholder="Ex: Curso de Gestão Pública" style={inp} disabled={isTramitado}/>
            </div>
            <div>
              <label style={lbl}>Modalidade *</label>
              <select value={form.modalidade} onChange={e=>setForm(f=>({...f,modalidade:e.target.value}))} style={inp} disabled={isTramitado}>
                <option value="Presencial">Presencial/Evento</option>
                <option value="EaD">EaD</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Carga Horária (h)</label>
              <input type="number" value={form.cargaHoraria} onChange={e=>setForm(f=>({...f,cargaHoraria:e.target.value}))} placeholder="Ex: 8" style={inp} disabled={isTramitado}/>
            </div>
            {!isEaD && <>
              <div>
                <label style={lbl}>Data</label>
                <input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} style={inp} disabled={isTramitado}/>
              </div>
              <div>
                <label style={lbl}>Horário</label>
                <input value={form.horario} onChange={e=>setForm(f=>({...f,horario:e.target.value}))} placeholder="Ex: 08h às 12h" style={inp} disabled={isTramitado}/>
              </div>
              <div>
                <label style={lbl}>Local</label>
                <input value={form.local} onChange={e=>setForm(f=>({...f,local:e.target.value}))} placeholder="Ex: Auditório do IPC" style={inp} disabled={isTramitado}/>
              </div>
              <div>
                <label style={lbl}>Número de Participantes</label>
                <input type="number" value={form.numParticipantes} onChange={e=>setForm(f=>({...f,numParticipantes:e.target.value}))} placeholder="Ex: 50" style={inp} disabled={isTramitado}/>
              </div>
            </>}
          </div>
        </div>

        {/* EIXO TEMÁTICO */}
        <div style={{ background:"#fff", borderRadius:20, padding:28, boxShadow:"0 2px 16px rgba(27,63,122,0.08)", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:4, height:18, background:"#1B3F7A", borderRadius:2 }} />🏷️ Eixo Temático
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:8 }}>
            {EIXOS.map(e => (
              <div key={e} onClick={() => !isTramitado && toggleEixo(e)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:10, cursor:isTramitado?"default":"pointer",
                  background:form.eixosTematicos.includes(e)?"#eff6ff":"#f8f9fb",
                  border:"1px solid "+(form.eixosTematicos.includes(e)?"#1B3F7A":"#e8edf2") }}>
                <div style={{ width:18, height:18, borderRadius:5, border:"2px solid "+(form.eixosTematicos.includes(e)?"#1B3F7A":"#ccc"), background:form.eixosTematicos.includes(e)?"#1B3F7A":"#fff", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, flexShrink:0 }}>
                  {form.eixosTematicos.includes(e) && "✓"}
                </div>
                <span style={{ fontSize:13, color:"#333" }}>{e}</span>
              </div>
            ))}
          </div>
        </div>

        {/* COMPETÊNCIA */}
        <div style={{ background:"#fff", borderRadius:20, padding:28, boxShadow:"0 2px 16px rgba(27,63,122,0.08)", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:4, height:18, background:"#1B3F7A", borderRadius:2 }} />🎯 Competência
          </div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {COMPETENCIAS.map(c => (
              <div key={c} onClick={() => !isTramitado && toggleComp(c)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 18px", borderRadius:12, cursor:isTramitado?"default":"pointer",
                  background:form.competencias.includes(c)?"#eff6ff":"#f8f9fb",
                  border:"2px solid "+(form.competencias.includes(c)?"#1B3F7A":"#e8edf2") }}>
                <div style={{ width:18, height:18, borderRadius:5, border:"2px solid "+(form.competencias.includes(c)?"#1B3F7A":"#ccc"), background:form.competencias.includes(c)?"#1B3F7A":"#fff", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, flexShrink:0 }}>
                  {form.competencias.includes(c) && "✓"}
                </div>
                <span style={{ fontSize:14, fontWeight:600, color:"#333" }}>{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CONTEÚDO */}
        <div style={{ background:"#fff", borderRadius:20, padding:28, boxShadow:"0 2px 16px rgba(27,63,122,0.08)", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:20, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:4, height:18, background:"#1B3F7A", borderRadius:2 }} />📝 Conteúdo
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={lbl}>Justificativa e Objetivo *</label>
              <textarea value={form.justificativaObjetivo} onChange={e=>setForm(f=>({...f,justificativaObjetivo:e.target.value}))} placeholder="Justificativa: ...\n\nObjetivo: ..." style={{ ...inp, minHeight:100, resize:"vertical" }} disabled={isTramitado}/>
            </div>
            <div>
              <label style={lbl}>Programa</label>
              <textarea value={form.programa} onChange={e=>setForm(f=>({...f,programa:e.target.value}))} style={{ ...inp, minHeight:80, resize:"vertical" }} disabled={isTramitado}/>
            </div>
            <div>
              <label style={lbl}>Público Alvo</label>
              <textarea value={form.publicoAlvo} onChange={e=>setForm(f=>({...f,publicoAlvo:e.target.value}))} style={{ ...inp, minHeight:60, resize:"vertical" }} disabled={isTramitado}/>
            </div>
            <div>
              <label style={lbl}>Conteúdo Programático</label>
              <textarea value={form.conteudoProgramatico} onChange={e=>setForm(f=>({...f,conteudoProgramatico:e.target.value}))} style={{ ...inp, minHeight:100, resize:"vertical" }} disabled={isTramitado}/>
            </div>
            {isEaD && <>
              <div>
                <label style={lbl}>Metas de Entrega (Prazo e Material Didático)</label>
                <textarea value={form.metasEntrega} onChange={e=>setForm(f=>({...f,metasEntrega:e.target.value}))} placeholder="Prazo para as entregas: ...\n\nMaterial didático do curso a ser elaborado pelo professor(a): ..." style={{ ...inp, minHeight:80, resize:"vertical" }} disabled={isTramitado}/>
              </div>
              <div>
                <label style={lbl}>Avaliação</label>
                <textarea value={form.avaliacao} onChange={e=>setForm(f=>({...f,avaliacao:e.target.value}))} style={{ ...inp, minHeight:80, resize:"vertical" }} disabled={isTramitado}/>
              </div>
            </>}
            <div>
              <label style={lbl}>Metodologia e Recursos Humanos</label>
              <textarea value={form.metodologia} onChange={e=>setForm(f=>({...f,metodologia:e.target.value}))} style={{ ...inp, minHeight:80, resize:"vertical" }} disabled={isTramitado}/>
            </div>
            <div>
              <label style={lbl}>Bibliografia</label>
              <textarea value={form.bibliografia} onChange={e=>setForm(f=>({...f,bibliografia:e.target.value}))} style={{ ...inp, minHeight:60, resize:"vertical" }} disabled={isTramitado}/>
            </div>
          </div>
        </div>

        {/* INSTRUTORES */}
        <div style={{ background:"#fff", borderRadius:20, padding:28, boxShadow:"0 2px 16px rgba(27,63,122,0.08)", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:4, height:18, background:"#1B3F7A", borderRadius:2 }} />👨‍🏫 Instrutores
            </div>
            {!isTramitado && <div onClick={addInstrutor} style={{ background:"#eff6ff", borderRadius:10, padding:"6px 14px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer" }}>+ Instrutor</div>}
          </div>
          {(form.instrutores||[]).length === 0 && <div style={{ color:"#aaa", fontSize:13, textAlign:"center", padding:"20px 0" }}>Nenhum instrutor adicionado</div>}
          {(form.instrutores||[]).map((inst, i) => (
            <div key={i} style={{ background:"#f8f9fb", borderRadius:14, padding:16, marginBottom:12, border:"1px solid #e8edf2" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:10 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={lbl}>Selecionar Instrutor</label>
                  <select value={inst.instrutorId||""} onChange={e=>updateInstrutor(i,"instrutorId",e.target.value)} style={inp} disabled={isTramitado}>
                    <option value="">Selecione ou preencha manualmente...</option>
                    {instrutoresCadastrados.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={lbl}>Nome *</label>
                  <input value={inst.nome||""} onChange={e=>updateInstrutor(i,"nome",e.target.value)} placeholder="Nome completo" style={inp} disabled={isTramitado}/>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={lbl}>Mini Currículo</label>
                  <textarea value={inst.miniCurriculo||""} onChange={e=>updateInstrutor(i,"miniCurriculo",e.target.value)} style={{ ...inp, minHeight:60, resize:"vertical" }} disabled={isTramitado}/>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:inst.pagamento?10:0,
                background:inst.pagamento?"#f0fdf4":"#f8f9fb", borderRadius:10, padding:"10px 14px",
                border:"1px solid "+(inst.pagamento?"#c8e6c9":"#e8edf2"), cursor:isTramitado?"default":"pointer" }}
                onClick={() => !isTramitado && updateInstrutor(i,"pagamento",!inst.pagamento)}>
                <div style={{ width:18, height:18, borderRadius:5, border:"2px solid "+(inst.pagamento?"#059669":"#ccc"), background:inst.pagamento?"#059669":"#fff", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, flexShrink:0 }}>
                  {inst.pagamento && "✓"}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:inst.pagamento?"#059669":"#555" }}>💰 Tem pagamento de instrutoria</div>
                </div>
              </div>
              {inst.pagamento && (
                <div style={{ marginTop:10 }}>
                  <label style={lbl}>Valor do Pagamento (R$)</label>
                  <input value={inst.valorPagamento||""} onChange={e=>updateInstrutor(i,"valorPagamento",e.target.value)} placeholder="Ex: 1.500,00" style={inp} disabled={isTramitado}/>
                </div>
              )}
              {!isTramitado && (
                <div onClick={() => removeInstrutor(i)} style={{ color:"#dc2626", fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"right", marginTop:10 }}>🗑️ Remover instrutor</div>
              )}
            </div>
          ))}
        </div>

        {/* PROPOSTA E ELABORAÇÃO */}
        <div style={{ background:"#fff", borderRadius:20, padding:28, boxShadow:"0 2px 16px rgba(27,63,122,0.08)", marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1B3F7A", marginBottom:20, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:4, height:18, background:"#E8730A", borderRadius:2 }} />💼 Proposta e Elaboração
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={lbl}>Proposta de Valor (caso aplicável)</label>
              <textarea value={form.valorProposta} onChange={e=>setForm(f=>({...f,valorProposta:e.target.value}))} style={{ ...inp, minHeight:80, resize:"vertical" }} disabled={isTramitado}/>
            </div>
            <div>
              <label style={lbl}>Elaboração do Projeto</label>
              <input value={form.elaboracaoProjeto} onChange={e=>setForm(f=>({...f,elaboracaoProjeto:e.target.value}))} placeholder="Nome do responsável pela elaboração" style={inp} disabled={isTramitado}/>
            </div>
          </div>
        </div>

        {!isTramitado && (
          <button onClick={salvar} disabled={salvando} style={{ width:"100%", background:salvando?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
            {salvando ? "Salvando..." : "💾 Salvar Projeto"}
          </button>
        )}
      </div>
    </div>
  );
}
