import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, query, where } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../firebase/config";
import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE = "service_m6wjek9";
const EMAILJS_TEMPLATE = "template_lglpt37";
const EMAILJS_PUBLIC_KEY = "j--nV6wNKs8Pqyxlo";

const MODULOS_NOMES = {
  tceduc:"🎓 TCEduc", designer:"🎨 IPC Designer", processos:"📁 IPC Processos",
  almoxarifado:"🗃️ Almoxarifado", pessoas:"👥 IPC Pessoas",
};

const TIPOS_EXTERNO = ["Instrutor(a)","Motorista","Apoio de Outro Órgão","Consultor(a)","Voluntário(a)","Outro"];
const ORGAOS = ["SESA","SEDUC","SECULT","STDS","SSPDS","TCE","MPE","Prefeitura","Outro"];
const MODULOS = [
  { id:"tceduc", nome:"TCEduc", icon:"🎓" },
  { id:"designer", nome:"IPC Designer", icon:"🎨" },
  { id:"processos", nome:"IPC Processos", icon:"📁" },
  { id:"almoxarifado", nome:"Almoxarifado", icon:"🗃️" },
  { id:"pessoas", nome:"IPC Pessoas", icon:"👥" },
];
const SENHA_PADRAO = "Tce1234567890!@#";

function initials(nome) { if(!nome)return"?"; return nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase(); }
function corAvatar(nome) { const cores=["#1B3F7A","#7c3aed","#059669","#E8730A","#0891b2","#dc2626"]; let h=0; for(let c of (nome||""))h+=c.charCodeAt(0); return cores[h%cores.length]; }
function formatDate(d) { if(!d)return"—"; const[y,m,day]=d.split("-"); return`${day}/${m}/${y}`; }

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

const PESSOAS_ICON = (<svg width="20" height="20" viewBox="0 0 42 42" fill="none"><circle cx="21" cy="17" r="5.5" stroke="white" strokeWidth="1.8" fill="rgba(255,255,255,0.22)"/><path d="M10 35C10 29 15 25 21 25C27 25 32 29 32 35" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/><circle cx="31.5" cy="14" r="3.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" fill="none"/><circle cx="10.5" cy="14" r="3.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" fill="none"/></svg>);

export default function PessoasModule({ user, onBack, onOrganograma, onAniversarios, onEstrutura, onFerias }) {
  const [servidores, setServidores] = useState([]);
  const [externos, setExternos] = useState([]);
  const [setores, setSetores] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState("equipe");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [formExterno, setFormExterno] = useState({});
  const [busca, setBusca] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("todos");
  const [salvando, setSalvando] = useState(false);
  const [erroLogin, setErroLogin] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sSnap, eSnap, setSnap, cSnap, gSnap] = await Promise.all([
        getDocs(collection(db,"ipc_servidores")),
        getDocs(collection(db,"ipc_externos")),
        getDocs(collection(db,"ipc_setores")),
        getDocs(collection(db,"ipc_cargos")),
        getDocs(collection(db,"ipc_grupos_trabalho")),
      ]);
      const servidoresCarregados = sSnap.docs.map(d=>({id:d.id,...d.data()}));
      setServidores(servidoresCarregados);
      setExternos(eSnap.docs.map(d=>({id:d.id,...d.data()})));
      setSetores(setSnap.docs.map(d=>({id:d.id,...d.data()})));
      setCargos(cSnap.docs.map(d=>({id:d.id,...d.data()})));
      setGrupos(gSnap.docs.map(d=>({id:d.id,...d.data()})));
      verificarTodosAniversarios(servidoresCarregados).catch(e=>console.error(e));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const enviarEmailCadastro = async (servidor) => {
    if (!servidor.email) return { ok: false, erro: "Servidor sem e-mail cadastrado." };
    setEnviandoEmail(true);
    try {
      // Busca template customizado do Firebase
      let template = null;
      try {
        const tSnap = await getDoc(doc(db,"config_emails","templates"));
        if (tSnap.exists()) template = tSnap.data()?.confirmacao_cadastro;
      } catch(e) {}

      const modulosTexto = servidor.isAdmin
        ? Object.values(MODULOS_NOMES).join("\n• ")
        : (servidor.modulosAcesso||[]).map(m => MODULOS_NOMES[m]||m).join("\n• ");

      const corpo = (template?.corpo || "")
        .replace("{{nome}}", servidor.nome)
        .replace("{{email}}", servidor.email)
        .replace("{{senha}}", "Tce1234567890!@#")
        .replace("{{modulos}}", modulosTexto ? `• ${modulosTexto}` : "Nenhum módulo selecionado");

      const saudacao = (template?.saudacao || "Olá, {{nome}}!").replace("{{nome}}", servidor.nome);
      const rodape = template?.rodape || "Atenciosamente,\nEquipe IPCgov — Instituto Plácido Castelo";

      // corpo_completo é a única variável no template do EmailJS
      const corpo_completo = `${saudacao}\n\n${corpo}\n\n---\n${rodape}\n\n🔗 Acesse: https://ipcgov.vercel.app`;

      const params = {
        to_name: servidor.nome,
        to_email: servidor.email,
        subject: template?.assunto || "Bem-vindo(a) ao IPCgov — Seus dados de acesso",
        corpo_completo,
      };

      await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, params, EMAILJS_PUBLIC_KEY);
      setEnviandoEmail(false);
      setEmailEnviado(true);
      setTimeout(() => setEmailEnviado(false), 4000);
      return { ok: true };
    } catch(e) {
      console.error(e);
      setEnviandoEmail(false);
      return { ok: false, erro: e?.text || "Erro ao enviar e-mail." };
    }
  };

  // Calcula chefia imediata pelo cargo selecionado
  const calcularChefiaImediata = (cargoId, chefiaManual) => {
    if (chefiaManual) return chefiaManual;
    if (!cargoId) return "";
    const cargo = cargos.find(c => c.id === cargoId);
    if (!cargo?.cargoPaiId) return "";
    // Busca servidor que tem esse cargo pai
    const cargoPai = cargos.find(c => c.id === cargo.cargoPaiId);
    if (!cargoPai) return "";
    const servidorChefe = servidores.find(s => s.cargoId === cargo.cargoPaiId);
    return servidorChefe?.nome || cargoPai.nome;
  };

  const uploadFoto = async (file, servidorId) => {
    setUploadingFoto(true);
    try {
      const storageRef = ref(storage, `servidores/${servidorId || Date.now()}/foto`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setUploadingFoto(false);
      return url;
    } catch(e) { console.error(e); setUploadingFoto(false); return null; }
  };

  const salvarServidor = async () => {
    if (!form.nome) return;
    setSalvando(true); setErroLogin("");
    try {
      let uid = form.uid || null;
      // Nunca salvar blob URL no Firestore — só URLs reais do Firebase Storage
      let fotoUrl = (form.foto && form.foto.startsWith("http")) ? form.foto : "";

      if (form._fotoFile) {
        fotoUrl = await uploadFoto(form._fotoFile, selected?.id) || "";
      }

      const chefiaFinal = calcularChefiaImediata(form.cargoId, form.chefiaManual);

      if (form.criarAcesso && form.email && !form.uid) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, form.email, SENHA_PADRAO);
          uid = cred.user.uid;
          await setDoc(doc(db, "usuarios", cred.user.uid), {
            email: form.email, nome: form.nome, cargo: form.cargo||"", cargoId: form.cargoId||"",
            setor: form.setor||"", setorId: form.setorId||"", perfil: form.isAdmin?"admin":"usuario",
            modulos: form.isAdmin ? MODULOS.map(m=>m.id) : (form.modulosAcesso||[]),
            ativo: true, servidorId: selected?.id||null,
            criadoEm: new Date().toISOString()
          });
          uid = cred.user.uid;
        } catch(e) {
          setErroLogin(e.code==="auth/email-already-in-use"?"E-mail já cadastrado no sistema.":`Erro ao criar acesso: ${e.message}`);
          setSalvando(false); return;
        }
      }

      // Se editando e já tem uid, sincroniza permissões
      if (form.uid && selected) {
        try {
          await updateDoc(doc(db, "usuarios", form.uid), {
            perfil: form.isAdmin ? "admin" : "usuario",
            modulos: form.isAdmin ? MODULOS.map(m=>m.id) : (form.modulosAcesso||[]),
            nome: form.nome, cargo: form.cargo||"", setor: form.setor||"",
          });
        } catch(e) { console.error("Erro ao atualizar permissões:", e); }
      }

      const { _fotoFile, chefiaManual, enviarEmail, ...formLimpo } = form;
      const dados = { ...formLimpo, foto: fotoUrl, uid: uid||"", chefia: chefiaFinal, atualizadoEm: new Date().toISOString() };

      if (selected) {
        await updateDoc(doc(db,"ipc_servidores",selected.id), dados);
        setServidores(s=>s.map(x=>x.id===selected.id?{...x,...dados}:x));
      } else {
        dados.criadoEm = new Date().toISOString();
        dados.registros = [];
        const docRef = await addDoc(collection(db,"ipc_servidores"), dados);
        setServidores(s=>[...s,{id:docRef.id,...dados}]);
        if (dados.dataAniversario) verificarAniversarioProximo({id:docRef.id,...dados}).catch(()=>{});
        if (enviarEmail && form.email) enviarEmailCadastro({...dados, id:docRef.id}).catch(()=>{});
      }

      // Sincronizar com tceduc_instrutores
      const servidorId = selected?.id || dados.servidorId || null;
      if (form.isInstrutor && form.nomeInstrutor?.trim()) {
        try {
          // Verifica se já existe instrutor vinculado a este servidor
          const instSnap = await getDocs(collection(db, "tceduc_instrutores"));
          const instExist = instSnap.docs.find(d => d.data().servidorId === (selected?.id || "") || d.data().email === (form.email || ""));
          const dadosInst = {
            nome: form.nomeInstrutor.trim(),
            email: form.email || "",
            servidorId: selected?.id || "",
            servidorNome: form.nome || "",
            atualizadoEm: new Date().toISOString(),
          };
          if (instExist) {
            await updateDoc(doc(db, "tceduc_instrutores", instExist.id), dadosInst);
          } else {
            await addDoc(collection(db, "tceduc_instrutores"), { ...dadosInst, criadoEm: new Date().toISOString() });
          }
        } catch(e) { console.error("Erro ao sincronizar instrutor:", e); }
      } else if (!form.isInstrutor && selected) {
        // Se desmarcou isInstrutor, remove o cadastro de instrutor vinculado
        try {
          const instSnap = await getDocs(collection(db, "tceduc_instrutores"));
          const instExist = instSnap.docs.find(d => d.data().servidorId === selected.id || (form.email && d.data().email === form.email));
          if (instExist) {
            await deleteDoc(doc(db, "tceduc_instrutores", instExist.id));
          }
        } catch(e) { console.error("Erro ao remover instrutor:", e); }
      }

      // Toast de sucesso
      setErroLogin("");
      setSalvando(false);
      setModal(null);
      setForm({});
      setToast({ tipo:"sucesso", msg: selected ? "✅ Cadastro atualizado com sucesso!" : "✅ Servidor cadastrado com sucesso!" });
      setTimeout(() => setToast(null), 4000);
      return;
    } catch(e) {
      console.error("Erro ao salvar:", e);
      setToast({ tipo:"erro", msg:`❌ Erro no cadastro: ${e.message||"Tente novamente."}` });
      setTimeout(() => setToast(null), 5000);
    }
    setSalvando(false);
  };


  // Verifica todos os servidores e cria tarefas no Designer para aniversários próximos
  const verificarTodosAniversarios = async (listaServidores) => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();

    // Busca tarefas de aniversário já criadas para evitar duplicatas
    const atSnap = await getDocs(collection(db,"designer_atividades"));
    const tarefasExistentes = atSnap.docs
      .map(d => d.data())
      .filter(t => t.tipo === "aniversario");

    for (const servidor of listaServidores) {
      if (!servidor.dataAniversario) continue;
      const [,mes,dia] = servidor.dataAniversario.split("-");
      const proxAniv = new Date(`${anoAtual}-${mes}-${dia}`);
      if (proxAniv < hoje) proxAniv.setFullYear(anoAtual+1);
      const diasAte = Math.ceil((proxAniv - hoje) / 86400000);

      if (diasAte <= 5 && diasAte >= 0) {
        // Verifica se já existe tarefa para este servidor neste ano
        const jaExiste = tarefasExistentes.some(t =>
          t.servidorId === servidor.id &&
          t.dataEntrega?.startsWith(proxAniv.getFullYear().toString())
        );
        if (jaExiste) continue;

        const dataEntrega = new Date(proxAniv);
        dataEntrega.setDate(dataEntrega.getDate() - 1);
        await addDoc(collection(db,"designer_atividades"), {
          titulo: `Fazer arte de aniversário de ${servidor.nome}`,
          descricao: `Criar arte comemorativa para o aniversário de ${servidor.nome} em ${dia}/${mes}`,
          status: "Aguardando", prioridade: "Alta",
          dataEntrega: dataEntrega.toISOString().split("T")[0],
          tipo: "aniversario", servidorId: servidor.id,
          criadoEm: new Date().toISOString(), criadoPor: "sistema",
          ocorrencias: [],
        });
      }
    }
  };

  // Verifica aniversário de um servidor específico (no cadastro)
  const verificarAniversarioProximo = async (servidor) => {
    await verificarTodosAniversarios([servidor]);
  };

  const salvarExterno = async () => {
    if (!formExterno.nome || !formExterno.tipo) return;
    setSalvando(true);
    try {
      const dados = { ...formExterno, atualizadoEm: new Date().toISOString() };
      if (selected) {
        await updateDoc(doc(db,"ipc_externos",selected.id), dados);
        setExternos(e=>e.map(x=>x.id===selected.id?{...x,...dados}:x));
      } else {
        dados.criadoEm = new Date().toISOString();
        const docRef = await addDoc(collection(db,"ipc_externos"), dados);
        setExternos(e=>[...e,{id:docRef.id,...dados}]);
      }
      setModal(null); setFormExterno({});
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const deletarServidor = async (id) => {
    if (!window.confirm("Excluir servidor? Esta ação também removerá o acesso ao sistema.")) return;
    // Busca o servidor para pegar o uid
    const servidor = servidores.find(s => s.id === id);
    // Remove doc do Firestore do servidor
    await deleteDoc(doc(db, "ipc_servidores", id));
    // Se tinha acesso, remove o doc de permissões de usuário
    if (servidor?.uid) {
      try {
        await deleteDoc(doc(db, "usuarios", servidor.uid));
      } catch(e) { console.error("Erro ao remover permissões:", e); }
    }
    setServidores(s => s.filter(x => x.id !== id));
    setModal(null);
  };

  const deletarExterno = async (id) => {
    if (!window.confirm("Excluir colaborador externo?")) return;
    await deleteDoc(doc(db,"ipc_externos",id));
    setExternos(e=>e.filter(x=>x.id!==id));
    setModal(null);
  };

  const adicionarRegistro = async (servidor, texto, tipo) => {
    if (!texto.trim()) return;
    const reg = { texto, tipo, data: new Date().toISOString(), autor: user?.email||"sistema" };
    const novos = [...(servidor.registros||[]), reg];
    await updateDoc(doc(db,"ipc_servidores",servidor.id), { registros: novos });
    const atualizado = { ...servidor, registros: novos };
    setServidores(s=>s.map(x=>x.id===servidor.id?atualizado:x));
    if(selected?.id===servidor.id) setSelected(atualizado);
  };

  const filtradosServidor = servidores.filter(s=>{
    if (filtroSetor!=="todos" && s.setor!==filtroSetor) return false;
    if (busca) { const b=busca.toLowerCase(); if(!((s.nome||"").toLowerCase().includes(b)||(s.cargo||"").toLowerCase().includes(b)||(s.setor||"").toLowerCase().includes(b))) return false; }
    return true;
  });
  const filtradosExterno = externos.filter(e=>{
    if (busca) { const b=busca.toLowerCase(); if(!((e.nome||"").toLowerCase().includes(b)||(e.tipo||"").toLowerCase().includes(b))) return false; }
    return true;
  });

  const setoresExistentes = [...new Set(servidores.map(s=>s.setor).filter(Boolean))];

  // Aniversários próximos (5 dias)
  const aniversariosProximos = servidores.filter(s=>{
    if(!s.dataAniversario) return false;
    const hoje = new Date(); const anoAtual = hoje.getFullYear();
    const [,mes,dia] = s.dataAniversario.split("-");
    const proxAniv = new Date(`${anoAtual}-${mes}-${dia}`);
    if(proxAniv < hoje) proxAniv.setFullYear(anoAtual+1);
    return Math.ceil((proxAniv-hoje)/86400000) <= 5;
  });

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px} select,input,textarea{font-family:'Montserrat',sans-serif}`}</style>

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed", top:24, left:"50%", transform:"translateX(-50%)", zIndex:999, background:toast.tipo==="sucesso"?"#059669":"#dc2626", color:"#fff", borderRadius:16, padding:"14px 28px", fontWeight:700, fontSize:15, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", display:"flex", alignItems:"center", gap:10, minWidth:280, textAlign:"center", justifyContent:"center" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px" }}>
        <div style={{ maxWidth:1300, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20, flexShrink:0 }}>←</div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(145deg,#0369A1,#38BDF8)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 3px 10px rgba(3,105,161,0.4)" }}>{PESSOAS_ICON}</div>
              <div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>MÓDULO</div>
                <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>IPC Pessoas</div>
              </div>
            </div>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
              <div onClick={onOrganograma} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>🌳 Organograma</div>
              <div onClick={onEstrutura} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>🏗️ Estrutura</div>
              <div onClick={onFerias} style={{ background:"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>🏖️ Férias</div>
              <div onClick={onAniversarios} style={{ background:aniversariosProximos.length>0?"rgba(232,115,10,0.4)":"rgba(255,255,255,0.12)", borderRadius:12, padding:"8px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                🎂 Aniversários{aniversariosProximos.length>0?` (${aniversariosProximos.length})` :""}
              </div>
              {aba==="equipe" && <div onClick={()=>{ setForm({ modulosAcesso:[] }); setSelected(null); setModal("form_servidor"); }} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Novo Servidor</div>}
              {aba==="externos" && <div onClick={()=>{ setFormExterno({}); setSelected(null); setModal("form_externo"); }} style={{ background:"#E8730A", borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Novo Colaborador</div>}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            {[{id:"equipe",label:"👥 Equipe IPC"},{id:"externos",label:"🤝 Colaboradores Externos"}].map(a=>(
              <div key={a.id} onClick={()=>{ setAba(a.id); setBusca(""); setFiltroSetor("todos"); }} style={{ background:aba===a.id?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${aba===a.id?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:12, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>{a.label}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"24px 32px 80px" }}>
        {/* STATS */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
          {[
            { label:"Servidores IPC", value:servidores.length, cor:"#1B3F7A" },
            { label:"Com acesso ao sistema", value:servidores.filter(s=>s.criarAcesso).length, cor:"#0891b2" },
            { label:"Colaboradores externos", value:externos.length, cor:"#7c3aed" },
            { label:"Aniversários próximos", value:aniversariosProximos.length, cor:aniversariosProximos.length>0?"#E8730A":"#aaa" },
          ].map((s,i)=>(
            <div key={i} style={{ background:"#fff", borderRadius:14, padding:"12px 20px", boxShadow:"0 2px 12px rgba(27,63,122,0.07)", borderLeft:`4px solid ${s.cor}` }}>
              <div style={{ color:s.cor, fontWeight:900, fontSize:22 }}>{s.value}</div>
              <div style={{ color:"#888", fontSize:11, marginTop:2, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder={`🔍 Buscar ${aba==="equipe"?"servidor":"colaborador"}...`} style={{ ...inputStyle, maxWidth:300, padding:"9px 14px" }}/>
          {aba==="equipe" && (
            <select value={filtroSetor} onChange={e=>setFiltroSetor(e.target.value)} style={{ background:"#fff", border:"none", borderRadius:20, padding:"8px 16px", fontSize:12, fontWeight:700, color:"#1B3F7A", cursor:"pointer", outline:"none", boxShadow:"0 2px 8px rgba(27,63,122,0.08)" }}>
              <option value="todos">Todos os setores</option>
              {setoresExistentes.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {(busca||filtroSetor!=="todos") && <div onClick={()=>{ setBusca(""); setFiltroSetor("todos"); }} style={{ background:"#fee2e2", borderRadius:20, padding:"8px 14px", fontSize:12, fontWeight:700, color:"#dc2626", cursor:"pointer" }}>✕ Limpar</div>}
          <span style={{ marginLeft:"auto", fontSize:12, color:"#aaa" }}>{aba==="equipe"?filtradosServidor.length:filtradosExterno.length} resultado{(aba==="equipe"?filtradosServidor.length:filtradosExterno.length)!==1?"s":""}</span>
        </div>

        {loading ? <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>Carregando...</div> : (
          <>
            {aba==="equipe" && (
              filtradosServidor.length===0 ? (
                <div style={{ textAlign:"center", padding:60 }}>
                  <div style={{ fontSize:56, marginBottom:16 }}>👥</div>
                  <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum servidor cadastrado</div>
                  <div onClick={()=>{ setForm({modulosAcesso:[]}); setSelected(null); setModal("form_servidor"); }} style={{ display:"inline-block", background:"#1B3F7A", borderRadius:14, padding:"12px 24px", color:"#fff", fontWeight:700, cursor:"pointer", marginTop:12 }}>+ Cadastrar Servidor</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                  {filtradosServidor.map(s=>(
                    <div key={s.id} onClick={()=>{ setSelected(s); setModal("perfil"); }} style={{ background:"#fff", borderRadius:20, padding:"22px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)", cursor:"pointer", transition:"transform 0.15s, box-shadow 0.15s" }}
                      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(27,63,122,0.14)"}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 12px rgba(27,63,122,0.08)"}}>
                      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                        {s.foto ? (
                          <img src={s.foto} alt={s.nome} style={{ width:52, height:52, borderRadius:16, objectFit:"cover", flexShrink:0 }}/>
                        ) : (
                          <div style={{ width:52, height:52, borderRadius:16, background:corAvatar(s.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:18, flexShrink:0 }}>{initials(s.nome)}</div>
                        )}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.nome}</div>
                          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{s.cargo}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {s.setor && <div style={{ background:"#f0f4ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>{s.setor}</div>}
                        {s.criarAcesso && <div style={{ background:"#e8f5e9", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#059669" }}>🔑 {s.isAdmin?"admin":"colaborador"}</div>}{s.isInstrutor && <div style={{ background:"#f3e8ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#7c3aed" }}>👨‍🏫 instrutor</div>}
                      </div>
                      {s.dataAniversario && (() => {
                        const hoje = new Date(); const [,mes,dia] = s.dataAniversario.split("-");
                        const proxAniv = new Date(`${hoje.getFullYear()}-${mes}-${dia}`);
                        if(proxAniv<hoje) proxAniv.setFullYear(hoje.getFullYear()+1);
                        const dias = Math.ceil((proxAniv-hoje)/86400000);
                        return dias<=5 ? <div style={{ marginTop:8, background:"#fff3e0", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#E8730A" }}>🎂 {dias===0?"Hoje!":dias===1?"Amanhã!":`Em ${dias} dias`}</div> : null;
                      })()}
                    </div>
                  ))}
                </div>
              )
            )}

            {aba==="externos" && (
              filtradosExterno.length===0 ? (
                <div style={{ textAlign:"center", padding:60 }}>
                  <div style={{ fontSize:56, marginBottom:16 }}>🤝</div>
                  <div style={{ fontWeight:700, fontSize:16, color:"#333", marginBottom:8 }}>Nenhum colaborador externo</div>
                  <div onClick={()=>{ setFormExterno({}); setSelected(null); setModal("form_externo"); }} style={{ display:"inline-block", background:"#1B3F7A", borderRadius:14, padding:"12px 24px", color:"#fff", fontWeight:700, cursor:"pointer", marginTop:12 }}>+ Cadastrar Colaborador</div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
                  {filtradosExterno.map(e=>(
                    <div key={e.id} onClick={()=>{ setSelected(e); setModal("perfil_externo"); }} style={{ background:"#fff", borderRadius:20, padding:"22px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)", cursor:"pointer", transition:"transform 0.15s" }}
                      onMouseEnter={ev=>ev.currentTarget.style.transform="translateY(-3px)"} onMouseLeave={ev=>ev.currentTarget.style.transform=""}>
                      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                        <div style={{ width:52, height:52, borderRadius:16, background:corAvatar(e.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:18, flexShrink:0 }}>{initials(e.nome)}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:15, color:"#1B3F7A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.nome}</div>
                          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>{e.tipo}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        <div style={{ background:"#f5f3ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#7c3aed" }}>{e.tipo}</div>
                        {e.orgao && <div style={{ background:"#f0f4ff", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#1B3F7A" }}>{e.orgao}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* MODAL PERFIL */}
      {modal==="perfil" && selected && <PerfilModal servidor={selected} onClose={()=>setModal(null)} onEditar={()=>{ setForm({...selected, modulosAcesso:selected.modulosAcesso||[], grupos:selected.grupos||[]}); setModal("form_servidor"); }} onDeletar={()=>deletarServidor(selected.id)} onAddRegistro={adicionarRegistro} user={user} servidores={servidores} grupos={grupos} />}

      {/* MODAL PERFIL EXTERNO */}
      {modal==="perfil_externo" && selected && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:500, padding:32 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:60, height:60, borderRadius:18, background:corAvatar(selected.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:22 }}>{initials(selected.nome)}</div>
                <div>
                  <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected.nome}</div>
                  <div style={{ fontSize:13, color:"#888" }}>{selected.tipo}</div>
                </div>
              </div>
              <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              {[{label:"Tipo",value:selected.tipo},{label:"Órgão/Origem",value:selected.orgao},{label:"Contato",value:selected.contato},{label:"Email",value:selected.email},{label:"Especialidade",value:selected.especialidade},{label:"Observações",value:selected.observacoes}].filter(f=>f.value).map((f,i)=>(
                <div key={i} style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px", gridColumn:f.label==="Observações"?"1/-1":"auto" }}>
                  <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{f.label}</div>
                  <div style={{ color:"#1B3F7A", fontWeight:600, fontSize:13 }}>{f.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{ setFormExterno({...selected}); setModal("form_externo"); }} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✏️ Editar</button>
              <button onClick={()=>deletarExterno(selected.id)} style={{ background:"#fee2e2", border:"none", borderRadius:14, padding:"14px 18px", color:"#dc2626", fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>🗑️</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM SERVIDOR */}
      {modal==="form_servidor" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:700, maxHeight:"93vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"28px 32px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div style={{ fontWeight:900, fontSize:20, color:"#1B3F7A" }}>{selected?"✏️ Editar Servidor":"➕ Novo Servidor IPC"}</div>
                <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f0f4ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#1B3F7A" }}>✕</div>
              </div>

              {/* FOTO */}
              <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:24 }}>
                <div style={{ width:80, height:80, borderRadius:"50%", background:form.foto?"transparent":corAvatar(form.nome||""), overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"3px solid #e8edf2" }}>
                  {form.foto ? <img src={form.foto} alt="foto" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ color:"#fff", fontWeight:900, fontSize:24 }}>{initials(form.nome||"")}</span>}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:"#1B3F7A", marginBottom:6 }}>Foto de perfil</div>
                  <label style={{ background:"#f0f4ff", borderRadius:10, padding:"8px 14px", fontSize:12, color:"#1B3F7A", fontWeight:700, cursor:"pointer", display:"inline-block" }}>
                    {uploadingFoto?"Enviando...":"📷 Selecionar foto"}
                    <input type="file" accept="image/*" style={{ display:"none" }} onChange={async(e)=>{
                      const file = e.target.files[0];
                      if(file){ const preview = URL.createObjectURL(file); setForm(f=>({...f, foto:preview, _fotoFile:file})); }
                    }}/>
                  </label>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>JPG, PNG — máx. 2MB</div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Nome Completo *</label>
                  <input value={form.nome||""} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome completo do servidor" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Cargo</label>
                  <select value={form.cargoId||""} onChange={e=>{
                    const cargoSel = cargos.find(c=>c.id===e.target.value);
                    setForm(f=>({...f, cargoId:e.target.value, cargo:cargoSel?.nome||""}));
                  }} style={inputStyle}>
                    <option value="">Sem cargo formal</option>
                    {[...cargos].sort((a,b)=>(a.nivel||1)-(b.nivel||1)).map(c=><option key={c.id} value={c.id}>{'  '.repeat((c.nivel||1)-1)}{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Setor</label>
                  <select value={form.setorId||""} onChange={e=>{
                    const setorSel = setores.find(s=>s.id===e.target.value);
                    setForm(f=>({...f, setorId:e.target.value, setor:setorSel?.nome||""}));
                  }} style={inputStyle}>
                    <option value="">Selecione o setor...</option>
                    {setores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Grupos de Trabalho</label>
                  {grupos.length === 0 ? (
                    <div style={{ fontSize:12, color:"#aaa", padding:"10px 14px", background:"#f8f9fb", borderRadius:12 }}>Nenhum grupo cadastrado ainda. Crie grupos em Estrutura Organizacional.</div>
                  ) : (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {grupos.sort((a,b)=>(a.nome||"").localeCompare(b.nome||"")).map(g => {
                        const sel = (form.grupos||[]).includes(g.id);
                        return (
                          <div key={g.id} onClick={()=>{
                            const atual = form.grupos||[];
                            setForm(f=>({...f, grupos: sel ? atual.filter(x=>x!==g.id) : [...atual, g.id]}));
                          }} style={{ display:"flex", alignItems:"center", gap:6, background:sel?"#1B3F7A":"#f0f4ff", border:`1px solid ${sel?"#1B3F7A":"#e8edf2"}`, borderRadius:10, padding:"7px 14px", cursor:"pointer", transition:"all 0.15s" }}>
                            <div style={{ width:8, height:8, borderRadius:"50%", background:sel?"#fff":"#1B3F7A44" }}/>
                            <span style={{ fontSize:12, fontWeight:700, color:sel?"#fff":"#1B3F7A" }}>👥 {g.nome}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Chefia Imediata</label>
                  {form.cargoId && calcularChefiaImediata(form.cargoId, null) ? (
                    <div style={{ background:"#e8f5e9", borderRadius:12, padding:"12px 14px", fontSize:13, color:"#059669", fontWeight:600 }}>
                      ✅ Calculada automaticamente: <strong>{calcularChefiaImediata(form.cargoId, null)}</strong>
                      <div style={{ fontSize:11, color:"#888", marginTop:4, fontWeight:400 }}>Baseada na hierarquia de cargos</div>
                    </div>
                  ) : (
                    <div>
                      <select value={form.chefiaManual||""} onChange={e=>setForm(f=>({...f,chefiaManual:e.target.value,chefia:e.target.value}))} style={inputStyle}>
                        <option value="">Selecione a chefia imediata...</option>
                        {servidores.filter(s=>s.id!==selected?.id).map(s=><option key={s.id} value={s.nome}>{s.nome} {s.cargo?"— "+s.cargo:""}</option>)}
                      </select>
                      <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>
                        {form.cargoId ? "Cargo selecionado não tem superior cadastrado — selecione manualmente" : "Sem cargo formal — selecione a chefia diretamente"}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input type="email" value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@tce.ce.gov.br" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Data de Aniversário</label>
                  <input type="date" value={form.dataAniversario||""} onChange={e=>setForm(f=>({...f,dataAniversario:e.target.value}))} style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Matrícula</label>
                  <input value={form.matricula||""} onChange={e=>setForm(f=>({...f,matricula:e.target.value}))} placeholder="Nº de matrícula" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Contato / Telefone</label>
                  <input value={form.contato||""} onChange={e=>setForm(f=>({...f,contato:e.target.value}))} placeholder="(85) 99999-9999" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Data de Ingresso</label>
                  <input type="date" value={form.dataIngresso||""} onChange={e=>setForm(f=>({...f,dataIngresso:e.target.value}))} style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>CPF</label>
                  <input value={form.cpf||""} onChange={e=>setForm(f=>({...f,cpf:e.target.value}))} placeholder="000.000.000-00" style={inputStyle}/>
                </div>

                {/* ACESSO AO SISTEMA */}
                <div style={{ gridColumn:"1/-1", background:"#f0f4ff", borderRadius:16, padding:"18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:form.criarAcesso?16:0 }}>
                    <div onClick={()=>setForm(f=>({...f,criarAcesso:!f.criarAcesso}))} style={{ width:44, height:24, borderRadius:12, background:form.criarAcesso?"#1B3F7A":"#ddd", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                      <div style={{ position:"absolute", top:3, left:form.criarAcesso?22:3, width:18, height:18, borderRadius:9, background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:"#1B3F7A" }}>🔑 Criar acesso ao sistema</div>
                      <div style={{ fontSize:11, color:"#888" }}>Senha padrão: <strong>{SENHA_PADRAO}</strong></div>
                    </div>
                  </div>
                  {form.criarAcesso && (
                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      <div>
                        <label style={labelStyle}>E-mail de acesso *</label>
                        <input type="email" value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Mesmo e-mail acima" style={inputStyle}/>
                        <div style={{ fontSize:11, color:"#888", marginTop:4 }}>Usando o e-mail do campo acima automaticamente</div>
                      </div>
                      {/* Admin toggle */}
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div onClick={()=>setForm(f=>({...f,isAdmin:!f.isAdmin}))} style={{ width:44, height:24, borderRadius:12, background:form.isAdmin?"#E8730A":"#ddd", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                          <div style={{ position:"absolute", top:3, left:form.isAdmin?22:3, width:18, height:18, borderRadius:9, background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
                        </div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>👑 Administrador</div>
                          <div style={{ fontSize:11, color:"#888" }}>{form.isAdmin?"Acesso total a todos os módulos":"Acesso somente aos módulos selecionados"}</div>
                        </div>
                      </div>
                      {/* Módulos */}
                      {!form.isAdmin && (
                        <div>
                          <label style={labelStyle}>Módulos com acesso</label>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                            {MODULOS.map(m=>{
                              const sel = (form.modulosAcesso||[]).includes(m.id);
                              return (
                                <div key={m.id} onClick={()=>{
                                  const atual = form.modulosAcesso||[];
                                  setForm(f=>({...f,modulosAcesso:sel?atual.filter(x=>x!==m.id):[...atual,m.id]}));
                                }} style={{ background:sel?"#1B3F7A":"#f0f4ff", borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:700, color:sel?"#fff":"#1B3F7A", cursor:"pointer", border:`1px solid ${sel?"#1B3F7A":"#dce8f5"}` }}>
                                  {m.icon} {m.nome}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {erroLogin && <div style={{ marginTop:10, color:"#dc2626", fontSize:12, fontWeight:600 }}>⚠️ {erroLogin}</div>}

                  {/* Toggle enviar e-mail */}
                  {form.criarAcesso && form.email && (
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:8, padding:"10px 0", borderTop:"1px solid #e8edf2" }}>
                      <div onClick={()=>setForm(f=>({...f,enviarEmail:!f.enviarEmail}))} style={{ width:44, height:24, borderRadius:12, background:form.enviarEmail?"#059669":"#ddd", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                        <div style={{ position:"absolute", top:3, left:form.enviarEmail?22:3, width:18, height:18, borderRadius:9, background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A" }}>📧 Enviar e-mail de boas-vindas</div>
                        <div style={{ fontSize:11, color:"#888" }}>Envia usuário, senha e módulos para {form.email}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* INSTRUTOR TCEDUC */}
                <div style={{ gridColumn:"1/-1", background:"#f3e8ff", borderRadius:16, padding:"18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: form.isInstrutor ? 16 : 0 }}>
                    <div onClick={()=>setForm(f=>({...f, isInstrutor:!f.isInstrutor, nomeInstrutor: !f.isInstrutor ? f.nome : f.nomeInstrutor}))} style={{ width:44, height:24, borderRadius:12, background:form.isInstrutor?"#7c3aed":"#ddd", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                      <div style={{ position:"absolute", top:3, left:form.isInstrutor?22:3, width:18, height:18, borderRadius:9, background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:"#7c3aed" }}>👨‍🏫 Também é Instrutor (TCEduc)</div>
                      <div style={{ fontSize:11, color:"#888" }}>Cadastra automaticamente na lista de instrutores do TCEduc</div>
                    </div>
                  </div>
                  {form.isInstrutor && (
                    <div>
                      <label style={labelStyle}>Como identificar na lista de instrutores *</label>
                      <input
                        value={form.nomeInstrutor||""}
                        onChange={e=>setForm(f=>({...f, nomeInstrutor:e.target.value}))}
                        placeholder="Ex: Dr. João Silva, Prof. João, João Silva (TCE)"
                        style={inputStyle}
                      />
                      <div style={{ fontSize:11, color:"#888", marginTop:4 }}>Nome que aparecerá ao alocar o instrutor em eventos e viagens</div>
                    </div>
                  )}
                </div>

                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelStyle}>Observações Iniciais</label>
                  <textarea value={form.observacoes||""} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} placeholder="Observações gerais..." style={{ ...inputStyle, minHeight:70, resize:"vertical" }}/>
                </div>
              </div>
              <button onClick={salvarServidor} disabled={salvando||!form.nome} style={{ width:"100%", marginTop:20, background:salvando||!form.nome?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!form.nome?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                {salvando?"Salvando...":selected?"💾 Salvar Alterações":"💾 Cadastrar Servidor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM EXTERNO */}
      {modal==="form_externo" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:600, maxHeight:"90vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"28px 32px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div style={{ fontWeight:900, fontSize:20, color:"#7c3aed" }}>{selected?"✏️ Editar Colaborador":"➕ Novo Colaborador Externo"}</div>
                <div onClick={()=>setModal(null)} style={{ width:36, height:36, background:"#f5f3ff", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18, color:"#7c3aed" }}>✕</div>
              </div>
              <div style={{ background:"#f5f3ff", borderRadius:12, padding:"10px 14px", marginBottom:20, fontSize:12, color:"#7c3aed", fontWeight:600 }}>🤝 Colaboradores externos não têm acesso ao sistema IPCgov</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div style={{ gridColumn:"1/-1" }}><label style={labelStyle}>Nome Completo *</label><input value={formExterno.nome||""} onChange={e=>setFormExterno(f=>({...f,nome:e.target.value}))} placeholder="Nome completo" style={inputStyle}/></div>
                <div><label style={labelStyle}>Tipo *</label><select value={formExterno.tipo||""} onChange={e=>setFormExterno(f=>({...f,tipo:e.target.value}))} style={inputStyle}><option value="">Selecione...</option>{TIPOS_EXTERNO.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>Órgão / Origem</label><select value={formExterno.orgao||""} onChange={e=>setFormExterno(f=>({...f,orgao:e.target.value}))} style={inputStyle}><option value="">Selecione...</option>{ORGAOS.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={labelStyle}>Contato / Telefone</label><input value={formExterno.contato||""} onChange={e=>setFormExterno(f=>({...f,contato:e.target.value}))} placeholder="(85) 99999-9999" style={inputStyle}/></div>
                <div><label style={labelStyle}>E-mail</label><input type="email" value={formExterno.email||""} onChange={e=>setFormExterno(f=>({...f,email:e.target.value}))} placeholder="email@exemplo.com" style={inputStyle}/></div>
                <div style={{ gridColumn:"1/-1" }}><label style={labelStyle}>Especialidade / Área</label><input value={formExterno.especialidade||""} onChange={e=>setFormExterno(f=>({...f,especialidade:e.target.value}))} placeholder="Ex: Gestão Fiscal, CNH categoria D..." style={inputStyle}/></div>
                <div style={{ gridColumn:"1/-1" }}><label style={labelStyle}>Observações</label><textarea value={formExterno.observacoes||""} onChange={e=>setFormExterno(f=>({...f,observacoes:e.target.value}))} style={{ ...inputStyle, minHeight:70, resize:"vertical" }}/></div>
              </div>
              <button onClick={salvarExterno} disabled={salvando||!formExterno.nome||!formExterno.tipo} style={{ width:"100%", marginTop:20, background:salvando||!formExterno.nome||!formExterno.tipo?"#ccc":"linear-gradient(135deg,#7c3aed,#8b5cf6)", border:"none", borderRadius:14, padding:16, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando||!formExterno.nome||!formExterno.tipo?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                {salvando?"Salvando...":"💾 Salvar Colaborador"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PerfilModal({ servidor, onClose, onEditar, onDeletar, onAddRegistro, user, servidores, grupos }) {
  const [novoRegistro, setNovoRegistro] = useState("");
  const [tipoRegistro, setTipoRegistro] = useState("observacao");
  const [novaSolicitacao, setNovaSolicitacao] = useState("");
  const [abaP, setAbaP] = useState("dados");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:680, maxHeight:"92vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"24px 28px", borderRadius:"24px 24px 0 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              {servidor.foto ? (
                <img src={servidor.foto} alt={servidor.nome} style={{ width:64, height:64, borderRadius:18, objectFit:"cover", flexShrink:0, border:"3px solid rgba(255,255,255,0.3)" }}/>
              ) : (
                <div style={{ width:64, height:64, borderRadius:18, background:corAvatar(servidor.nome), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:24, flexShrink:0 }}>{initials(servidor.nome)}</div>
              )}
              <div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:2 }}>SERVIDOR IPC</div>
                <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>{servidor.nome}</div>
                <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13, marginTop:2 }}>{servidor.cargo} · {servidor.setor}</div>
              </div>
            </div>
            <div onClick={onClose} style={{ width:36, height:36, background:"rgba(255,255,255,0.15)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:18 }}>✕</div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:18 }}>
            {[{id:"dados",label:"📋 Dados"},{id:"registros",label:`📝 Registros (${(servidor.registros||[]).length})`},{id:"solicitacoes",label:"📚 Solicitações"}].map(a=>(
              <div key={a.id} onClick={()=>setAbaP(a.id)} style={{ background:abaP===a.id?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.1)", border:`1px solid ${abaP===a.id?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.15)"}`, borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>{a.label}</div>
            ))}
          </div>
        </div>

        <div style={{ padding:"24px 28px" }}>
          {abaP==="dados" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
                {[
                  { label:"Cargo", value:servidor.cargo },
                  { label:"Setor", value:servidor.setor },
                  { label:"Chefia", value:servidor.chefia||"Topo da hierarquia" },
                  { label:"E-mail", value:servidor.email },
                  { label:"Matrícula", value:servidor.matricula },
                  { label:"Contato", value:servidor.contato },
                  { label:"Aniversário", value:servidor.dataAniversario?formatDate(servidor.dataAniversario):null },
                  { label:"Data de Ingresso", value:servidor.dataIngresso?new Date(servidor.dataIngresso).toLocaleDateString("pt-BR"):null },
                  { label:"Acesso", value:servidor.criarAcesso?`✅ ${servidor.isAdmin?"admin":"colaborador"}`:"❌ Sem acesso" },
                ].filter(f=>f.value).map((f,i)=>(
                  <div key={i} style={{ background:"#f8f9fb", borderRadius:12, padding:"12px 14px" }}>
                    <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{f.label}</div>
                    <div style={{ color:"#1B3F7A", fontWeight:600, fontSize:13 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              {servidor.criarAcesso && !servidor.isAdmin && (servidor.modulosAcesso||[]).length>0 && (
                <div style={{ background:"#f0f4ff", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
                  <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Módulos com acesso</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {(servidor.modulosAcesso||[]).map(m=>{ const mod=MODULOS.find(x=>x.id===m); return mod?<div key={m} style={{ background:"#1B3F7A", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#fff" }}>{mod.icon} {mod.nome}</div>:null; })}
                  </div>
                </div>
              )}
              {(servidor.grupos||[]).length > 0 && (
                <div style={{ background:"#f0fdf4", borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
                  <div style={{ color:"#aaa", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Grupos de Trabalho</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {(servidor.grupos||[]).map(gId=>{ const g=(grupos||[]).find(x=>x.id===gId); return g?<div key={gId} style={{ background:"#059669", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#fff" }}>👥 {g.nome}</div>:null; })}
                  </div>
                </div>
              )}
              {servidor.isInstrutor && (
                <div style={{ background:"#f3e8ff", borderRadius:12, padding:"12px 14px", marginBottom:16, border:"1px solid #e9d5ff" }}>
                  <div style={{ color:"#7c3aed", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>👨‍🏫 Instrutor TCEduc</div>
                  <div style={{ color:"#7c3aed", fontWeight:700, fontSize:14 }}>{servidor.nomeInstrutor || servidor.nome}</div>
                  <div style={{ color:"#888", fontSize:11, marginTop:2 }}>Identificado assim na lista de instrutores</div>
                </div>
              )}
              {servidor.observacoes && (
                <div style={{ background:"#f5f3ff", borderRadius:12, padding:"14px 16px", marginBottom:20, borderLeft:"3px solid #7c3aed" }}>
                  <div style={{ color:"#7c3aed", fontSize:10, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>Observações</div>
                  <div style={{ color:"#333", fontSize:14, lineHeight:1.6 }}>{servidor.observacoes}</div>
                </div>
              )}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={onEditar} style={{ flex:1, background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>✏️ Editar</button>
                <button onClick={onDeletar} style={{ background:"#fee2e2", border:"none", borderRadius:14, padding:"14px 18px", color:"#dc2626", fontWeight:700, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>🗑️</button>
              </div>
            </>
          )}
          {abaP==="registros" && (
            <>
              <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                {[{id:"observacao",label:"📝 Obs."},{id:"curso",label:"📚 Curso"},{id:"elogio",label:"⭐ Elogio"},{id:"ocorrencia",label:"⚠️ Ocorrência"}].map(t=>(
                  <div key={t.id} onClick={()=>setTipoRegistro(t.id)} style={{ flex:1, textAlign:"center", padding:"8px", borderRadius:10, border:`2px solid ${tipoRegistro===t.id?"#1B3F7A":"#e8edf2"}`, background:tipoRegistro===t.id?"#f0f4ff":"#fff", color:tipoRegistro===t.id?"#1B3F7A":"#888", fontWeight:700, fontSize:11, cursor:"pointer" }}>{t.label}</div>
                ))}
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                <textarea value={novoRegistro} onChange={e=>setNovoRegistro(e.target.value)} placeholder="Digite o registro..." style={{ flex:1, background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:13, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif", minHeight:70, resize:"vertical" }}/>
                <div onClick={()=>{ if(novoRegistro.trim()){ onAddRegistro(servidor,novoRegistro,tipoRegistro); setNovoRegistro(""); } }} style={{ width:44, background:"#1B3F7A", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:22, flexShrink:0 }}>+</div>
              </div>
              {(servidor.registros||[]).length===0 ? <div style={{ textAlign:"center", color:"#aaa", padding:30, fontSize:13 }}>Nenhum registro ainda</div>
              : [...(servidor.registros||[])].reverse().map((r,i)=>(
                <div key={i} style={{ background:r.tipo==="ocorrencia"?"#fff3e0":r.tipo==="elogio"?"#f0fdf4":r.tipo==="curso"?"#f5f3ff":"#f8f9fb", borderRadius:12, padding:"12px 14px", marginBottom:8, borderLeft:`3px solid ${r.tipo==="ocorrencia"?"#E8730A":r.tipo==="elogio"?"#059669":r.tipo==="curso"?"#7c3aed":"#1B3F7A"}` }}>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>{new Date(r.data).toLocaleString("pt-BR")} · {r.autor} · {r.tipo}</div>
                  <div style={{ fontSize:13, color:"#333" }}>{r.texto}</div>
                </div>
              ))}
            </>
          )}
          {abaP==="solicitacoes" && (
            <>
              <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                <textarea value={novaSolicitacao} onChange={e=>setNovaSolicitacao(e.target.value)} placeholder="Ex: Solicito participação no curso de Gestão Pública..." style={{ flex:1, background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:13, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif", minHeight:70, resize:"vertical" }}/>
                <div onClick={()=>{ if(novaSolicitacao.trim()){ onAddRegistro(servidor,novaSolicitacao,"solicitacao"); setNovaSolicitacao(""); } }} style={{ width:44, background:"#E8730A", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:22, flexShrink:0 }}>+</div>
              </div>
              {(servidor.registros||[]).filter(r=>r.tipo==="solicitacao").length===0 ? <div style={{ textAlign:"center", color:"#aaa", padding:30, fontSize:13 }}>Nenhuma solicitação ainda</div>
              : [...(servidor.registros||[])].filter(r=>r.tipo==="solicitacao").reverse().map((r,i)=>(
                <div key={i} style={{ background:"#fff8f0", borderRadius:12, padding:"12px 14px", marginBottom:8, borderLeft:"3px solid #E8730A" }}>
                  <div style={{ fontSize:11, color:"#aaa", marginBottom:4 }}>{new Date(r.data).toLocaleString("pt-BR")} · {r.autor}</div>
                  <div style={{ fontSize:13, color:"#333" }}>{r.texto}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
