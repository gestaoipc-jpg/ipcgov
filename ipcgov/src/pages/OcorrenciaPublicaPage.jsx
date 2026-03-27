import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function OcorrenciaPublicaPage() {
  const params   = new URLSearchParams(window.location.search);
  const eventoId = params.get("evento");
  const acaoId   = params.get("acao");
  const viagemId = params.get("viagem");

  const [evento,   setEvento]   = useState(null);
  const [viagem,   setViagem]   = useState(null);
  const [acao,     setAcao]     = useState(null);
  const [grupo,    setGrupo]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ nome:"", cpf:"", email:"", descricao:"" });
  const [enviando, setEnviando] = useState(false);
  const [enviado,  setEnviado]  = useState(false);
  const [erro,     setErro]     = useState("");

  useEffect(() => { loadDados(); }, []);

  const loadDados = async () => {
    try {
      const [evSnap, grSnap, vSnap] = await Promise.all([
        getDocs(collection(db,"tceduc_eventos")),
        getDocs(collection(db,"ipc_grupos_trabalho")),
        getDocs(collection(db,"tceduc_viagens")),
      ]);
      const ev = evSnap.docs.map(d=>({id:d.id,...d.data()})).find(e=>e.id===eventoId);
      setEvento(ev || null);
      if (viagemId) {
        const v = vSnap.docs.map(d=>({id:d.id,...d.data()})).find(v=>v.id===viagemId);
        setViagem(v || null);
      }

      if (ev && acaoId) {
        const ac = (ev.acoesEducacionais||[]).find((a,idx) =>
          a.acaoId===acaoId || a.id===acaoId || String(idx)===acaoId
        );
        setAcao(ac || null);
      }

      // Busca grupo IPCeduc
      const ipceduc = grSnap.docs.map(d=>({id:d.id,...d.data()})).find(
        g => g.nome?.toLowerCase().replace(/\s/g,"").includes("ipceduc")
      );
      setGrupo(ipceduc || null);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const enviar = async () => {
    if (!form.nome.trim() || !form.cpf.trim() || !form.email.trim() || !form.descricao.trim()) {
      setErro("Preencha todos os campos obrigatórios: nome, CPF, e-mail e descrição."); return;
    }
    if (!evento && !viagem) { setErro("Evento/Viagem não encontrado."); return; }
    setErro(""); setEnviando(true);
    try {
      // Criptografa dados pessoais antes de salvar
      let nomeCripto = form.nome.trim();
      let cpfCripto  = form.cpf.trim();
      let emailCripto = form.email.trim();
      try {
        const crResp = await fetch("/api/cripto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acao: "criptografar",
            campos: { nome: form.nome.trim(), cpf: form.cpf.trim(), email: form.email.trim() },
          }),
        });
        const crDados = await crResp.json();
        if (crDados.sucesso) {
          nomeCripto  = crDados.campos.nome;
          cpfCripto   = crDados.campos.cpf;
          emailCripto = crDados.campos.email;
        }
      } catch(e) { console.warn("Criptografia falhou, salvando sem criptografia:", e); }

      const novaOc = {
        id: Date.now(),
        tipo: "inscricao",
        acaoId:    acaoId || "",
        acaoNome:  acao?.acaoNome || acao?.nome || "",
        nome:      nomeCripto,
        cpf:       cpfCripto,
        email:     emailCripto,
        descricao: form.descricao.trim(),
        destinoTipo:  "grupo",
        destinoId:    grupo?.id   || "",
        destinoNome:  grupo?.nome || "IPCeduc",
        autorId:      "publico",
        autorEmail:   "formulario-publico",
        autorNome:    form.nome.trim(),
        status:       "Pendente",
        resposta:     "",
        respondidoPor:"",
        respondidoEm: "",
        data:   new Date().toISOString(),
        origem: "qrcode",
      };
      if (viagemId && viagem) {
        const novasOcs = [...(viagem.ocorrencias||[]), novaOc];
        await updateDoc(doc(db,"tceduc_viagens",viagemId), {
          ocorrencias: novasOcs,
          atualizadoEm: new Date().toISOString(),
        });
      } else {
        const novasOcs = [...(evento.ocorrencias||[]), novaOc];
        await updateDoc(doc(db,"tceduc_eventos",eventoId), {
          ocorrencias: novasOcs,
          atualizadoEm: new Date().toISOString(),
        });
      }
      setEnviado(true);
    } catch(e) {
      console.error(e); setErro("Erro ao enviar. Tente novamente.");
    }
    setEnviando(false);
  };

  const nomeMunicipio = viagemId ? (viagem?.titulo||"Viagem") : (evento?.municipio || evento?.regiao || "Evento");
  const nomeAcao      = viagemId ? "" : (acao?.acaoNome || acao?.nome || "");
  const dataEvento    = viagemId
    ? (viagem?.dataInicio ? new Date(viagem.dataInicio+"T12:00:00").toLocaleDateString("pt-BR") : "")
    : (evento?.data ? new Date(evento.data+"T12:00:00").toLocaleDateString("pt-BR") : "");

  const S = {
    page:   { minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" },
    header: { background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"28px 24px 52px", textAlign:"center" },
    card:   { background:"#fff", borderRadius:20, padding:22, boxShadow:"0 8px 32px rgba(27,63,122,0.12)" },
    label:  { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 },
    input:  { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif", marginBottom:0 },
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#1B3F7A", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#fff", fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:18 }}>Carregando...</div>
    </div>
  );

  if (!evento && !viagem) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ ...S.card, maxWidth:360, textAlign:"center", padding:40 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>❌</div>
        <div style={{ fontWeight:800, fontSize:18, color:"#1B3F7A", marginBottom:8 }}>Não encontrado</div>
        <div style={{ color:"#aaa", fontSize:14 }}>O link pode estar incorreto ou expirado.</div>
      </div>
    </div>
  );

  if (enviado) return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ ...S.card, maxWidth:420, textAlign:"center", padding:40 }}>
        <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
        <div style={{ fontWeight:900, fontSize:22, color:"#059669", marginBottom:10 }}>Ocorrência registrada!</div>
        <div style={{ color:"#555", fontSize:14, lineHeight:1.7, marginBottom:24 }}>
          Sua ocorrência foi enviada com sucesso para a equipe do IPC e será analisada em breve.
        </div>
        <div style={{ background:"#f0fdf4", borderRadius:14, padding:"14px 20px", marginBottom:10 }}>
          <div style={{ fontSize:12, color:"#aaa", marginBottom:4 }}>Evento</div>
          <div style={{ fontWeight:700, color:"#1B3F7A" }}>{nomeMunicipio} · {dataEvento}</div>
        </div>
        {nomeAcao && (
          <div style={{ background:"#eff6ff", borderRadius:14, padding:"14px 20px" }}>
            <div style={{ fontSize:12, color:"#aaa", marginBottom:4 }}>Curso</div>
            <div style={{ fontWeight:700, color:"#1B3F7A" }}>📚 {nomeAcao}</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* HEADER */}
      <div style={S.header}>
        <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:4, marginBottom:4 }}>INSTITUTO PLÁCIDO CASTELO · TCEduc</div>
        <div style={{ color:"#fff", fontWeight:900, fontSize:22, marginBottom:2 }}>📋 Registro de Ocorrência</div>
        <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13 }}>Inscrição / Frequência</div>
      </div>

      <div style={{ maxWidth:520, margin:"0 auto", padding:"0 20px 60px" }}>
        {/* INFO EVENTO */}
        <div style={{ ...S.card, marginTop:-28, marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:17, color:"#1B3F7A", marginBottom:2 }}>📍 {nomeMunicipio}</div>
          {dataEvento && <div style={{ fontSize:13, color:"#888", marginBottom:4 }}>📅 {dataEvento}</div>}
          {evento?.local && <div style={{ fontSize:12, color:"#888", marginBottom:8 }}>🏛️ {evento.local}</div>}
          {nomeAcao && (
            <div style={{ background:"#eff6ff", borderRadius:12, padding:"10px 14px", marginTop:8 }}>
              <div style={{ fontSize:10, color:"#1B3F7A", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>Curso</div>
              <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A" }}>📚 {nomeAcao}</div>
            </div>
          )}
        </div>

        {/* FORM */}
        <div style={{ ...S.card, padding:24 }}>
          <div style={{ fontWeight:800, fontSize:16, color:"#1B3F7A", marginBottom:20 }}>Preencha os dados da ocorrência</div>

          <div style={{ marginBottom:16 }}>
            <label style={S.label}>Nome completo *</label>
            <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Seu nome completo" style={S.input} />
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={S.label}>CPF *</label>
            <input value={form.cpf} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))} placeholder="000.000.000-00" style={S.input} />
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={S.label}>E-mail *</label>
            <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="seu@email.com" type="email" style={S.input} />
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={S.label}>Descrição da ocorrência *</label>
            <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}
              placeholder="Descreva detalhadamente a ocorrência que deseja registrar..." rows={5}
              style={{ ...S.input, resize:"vertical" }} />
          </div>

          {erro && (
            <div style={{ background:"#fee2e2", borderRadius:10, padding:"10px 14px", marginBottom:16, color:"#dc2626", fontSize:13, fontWeight:600 }}>
              ⚠️ {erro}
            </div>
          )}

          {/* Aviso LGPD */}
          <div style={{ background:"#f0f4ff", borderRadius:10, padding:"10px 14px", border:"1px solid #dbe4ff", display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>🔒</span>
            <p style={{ margin:0, fontSize:11, color:"#4a5568", lineHeight:1.6, fontFamily:"'Montserrat',sans-serif" }}>
              Ao clicar em enviar, você declara estar ciente de que os dados coletados (CPF, nome e e-mail) serão utilizados exclusivamente para a resolução da ocorrência no sistema IPCeduc, com acesso restrito e em conformidade com a <strong>LGPD</strong>. Em relatórios, essas informações serão ocultadas sempre que possível.
            </p>
          </div>

          <button onClick={enviar}
            disabled={enviando || !form.nome.trim() || !form.cpf.trim() || !form.email.trim() || !form.descricao.trim()}
            style={{ width:"100%", background:enviando||!form.nome.trim()||!form.cpf.trim()||!form.email.trim()||!form.descricao.trim()?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:16, cursor:enviando||!form.nome.trim()||!form.cpf.trim()||!form.email.trim()||!form.descricao.trim()?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
            {enviando ? "⏳ Enviando..." : "📤 Enviar Ocorrência"}
          </button>

          <div style={{ textAlign:"center", marginTop:14, fontSize:11, color:"#aaa" }}>
            Suas informações são tratadas com sigilo pelo IPC.
          </div>
        </div>
      </div>
    </div>
  );
}
