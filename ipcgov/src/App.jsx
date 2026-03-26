import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/config";
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import LoginPage from "./pages/LoginPage";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import HomePage from "./pages/HomePage";
import TCEducModule from "./pages/TCEducModule";
import UsuariosPage from "./pages/UsuariosPage";
import CadastrosPage from "./pages/CadastrosPage";
import AlertasPage from "./pages/AlertasPage";
import DashboardPage from "./pages/DashboardPage";
import RelatorioPage from "./pages/RelatorioPage";
import DesignerModule from "./pages/DesignerModule";
import FiltrosAdminPage from "./pages/FiltrosAdminPage";
import KanbanPage from "./pages/KanbanPage";
import SolicitacoesPage from "./pages/SolicitacoesPage";
import ProcessosModule from "./pages/ProcessosModule";
import ProcessosFuturosPage from "./pages/ProcessosFuturosPage";
import IPCCursosModule from "./pages/IPCCursosModule";
import IPCCursosFormPage from "./pages/IPCCursosFormPage";
import IPCCursosDashboard from "./pages/IPCCursosDashboard";
import OlimpiadasModule from "./pages/OlimpiadasModule";
import OlimpiadasDashboard from "./pages/OlimpiadasDashboard";
import OlimpiadasSeedPage from "./pages/OlimpiadasSeedPage";
import IPCMidiaModule from "./pages/IPCMidiaModule";
import IPCMidiaTelaPublica from "./pages/IPCMidiaTelaPublica";
import IPCCursos2025SeedPage from "./pages/IPCCursos2025SeedPage";
import IPCCursosInstrutoresPage from "./pages/IPCCursosInstrutoresPage";
import IPCIndicadoresModule from "./pages/IPCIndicadoresModule";
import IPCIndicadoresDashboard from "./pages/IPCIndicadoresDashboard";
import IPCIndicadoresSeedPage from "./pages/IPCIndicadoresSeedPage";
import TCEduc2026SeedPage from "./pages/TCEduc2026SeedPage";
import ProcessosKanbanPage from "./pages/ProcessosKanbanPage";
import ProcessosFiltrosPage from "./pages/ProcessosFiltrosPage";
import ProcessosAlertasPage from "./pages/ProcessosAlertasPage";
import ProcessosRelatorioPage from "./pages/ProcessosRelatorioPage";
import AlmoxarifadoModule from "./pages/AlmoxarifadoModule";
import AlmoxSolicitacoesPage from "./pages/AlmoxSolicitacoesPage";
import AlmoxDashboardPage from "./pages/AlmoxDashboardPage";
import AlmoxRelatorioPage from "./pages/AlmoxRelatorioPage";
import DesignerDashboardPage from "./pages/DesignerDashboardPage";
import ProcessosDashboardPage from "./pages/ProcessosDashboardPage";
import PessoasModule from "./pages/PessoasModule";
import OrganogramaPage from "./pages/OrganogramaPage";
import AniversariosPage from "./pages/AniversariosPage";
import EstruturaPessoasPage from "./pages/EstruturaPessoasPage";
import GestaoEmailsPage from "./pages/GestaoEmailsPage";
import CalendarioPage from "./pages/CalendarioPage";
import OcorrenciasPage from "./pages/OcorrenciasPage";
import PlanoAcaoPage from "./pages/PlanoAcaoPage";
import FeriasPage from "./pages/FeriasPage";
import OcorrenciaPublicaPage from "./pages/OcorrenciaPublicaPage";


function TrocaSenhaObrigatoria({ user, onConcluido }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const handleTrocar = async () => {
    setErro("");
    if (novaSenha.length < 8) { setErro("A nova senha deve ter pelo menos 8 caracteres."); return; }
    if (novaSenha !== confirmar) { setErro("As senhas não coincidem."); return; }
    if (!senhaAtual) { setErro("Informe a senha atual (padrão) para confirmar."); return; }
    setSalvando(true);
    try {
      // Reautentica com senha atual antes de trocar
      const credential = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, credential);
      // Troca a senha
      await updatePassword(user, novaSenha);
      // Marca como atualizada no Firestore
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "usuarios", user.uid), { senhaAtualizada: true });
      onConcluido();
    } catch(e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErro("Senha atual incorreta.");
      } else {
        setErro("Erro ao trocar senha: " + e.message);
      }
    }
    setSalvando(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#042C53", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Montserrat',sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:24, padding:40, width:"100%", maxWidth:420, boxShadow:"0 8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔐</div>
          <div style={{ fontWeight:900, fontSize:22, color:"#1B3F7A", marginBottom:8 }}>Troca de senha obrigatória</div>
          <div style={{ fontSize:13, color:"#888", lineHeight:1.5 }}>
            Este é seu primeiro acesso. Por segurança, defina uma senha pessoal antes de continuar.
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#888", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:4 }}>Senha atual (padrão)</label>
            <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
              placeholder="Digite a senha padrão recebida"
              style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"10px 14px", fontSize:14, color:"#1B3F7A", outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#888", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:4 }}>Nova senha</label>
            <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"10px 14px", fontSize:14, color:"#1B3F7A", outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#888", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:4 }}>Confirmar nova senha</label>
            <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
              placeholder="Repita a nova senha"
              style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"10px 14px", fontSize:14, color:"#1B3F7A", outline:"none", boxSizing:"border-box" }}/>
          </div>
          {erro && <div style={{ background:"#fee2e2", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#dc2626" }}>{erro}</div>}
          <div onClick={handleTrocar}
            style={{ background:salvando?"#ccc":"#1B3F7A", borderRadius:12, padding:14, textAlign:"center",
              fontWeight:700, fontSize:14, color:"#fff", cursor:salvando?"not-allowed":"pointer", marginTop:4 }}>
            {salvando ? "Salvando..." : "✅ Definir nova senha"}
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#aaa" }}>
          {user.email}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentModule, setCurrentModule] = useState(null);
  const [relatorioEventoId, setRelatorioEventoId] = useState(null);
  const [processoRelatorioId, setProcessoRelatorioId] = useState(null);
  const [projetoCursoSelected, setProjetoCursoSelected] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [precisaTrocarSenha, setPrecisaTrocarSenha] = useState(false); // { grupos:[], cargoId, cargoNome, isAlmoxAdmin, isTCEducAdmin }
  const [pendAutorizacoes, setPendAutorizacoes] = useState([]); // solicitações esperando autorização deste user
  const [modalAutorizacao, setModalAutorizacao] = useState(null); // solicitação aberta para autorizar
  const [autJustificativa, setAutJustificativa] = useState("");
  const [salvandoAut, setSalvandoAut] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadUserInfo(u);
        // Verifica se precisa trocar senha
        try {
          const { getDoc, doc } = await import("firebase/firestore");
          const uSnap = await getDoc(doc(db, "usuarios", u.uid));
          if (uSnap.exists() && uSnap.data().senhaAtualizada === false) {
            setPrecisaTrocarSenha(true);
          }
        } catch(e) { console.warn("Erro ao checar senha:", e); }
      } else {
        setUserInfo(null);
        setPendAutorizacoes([]);
        setPrecisaTrocarSenha(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loadUserInfo = async (u) => {
    try {
      const ADMINS = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"];
      const isAdminGlobal = ADMINS.includes(u.email);

      // Load grupos_trabalho
      const gruposSnap = await getDocs(collection(db, "ipc_grupos_trabalho"));
      const todosGrupos = gruposSnap.docs.map(d=>({id:d.id,...d.data()}));

      // Load servidor by email
      const srvSnap = await getDocs(query(collection(db,"ipc_servidores"), where("email","==",u.email)));
      let servidor = null;
      if (!srvSnap.empty) servidor = { id: srvSnap.docs[0].id, ...srvSnap.docs[0].data() };

      const meusGrupoIds = servidor?.grupos || [];

      // Check Almoxarifado Administrativo
      const grupoAlmox = todosGrupos.find(g => g.nome?.toLowerCase().includes("almoxarifado administrativo"));
      const isAlmoxAdmin = isAdminGlobal || (grupoAlmox ? meusGrupoIds.includes(grupoAlmox.id) : false);

      // Check TCEduc Administrativo
      const grupoTCEduc = todosGrupos.find(g => g.nome?.toLowerCase().includes("tceduc administrativo"));
      const isTCEducAdmin = isAdminGlobal || (grupoTCEduc ? meusGrupoIds.includes(grupoTCEduc.id) : false);

      const info = {
        grupos: meusGrupoIds,
        cargoId: servidor?.cargoId || null,
        cargoNome: servidor?.cargoNome || null,
        servidorId: servidor?.id || null,
        servidorNome: servidor?.nome || u.displayName || u.email,
        isAlmoxAdmin,
        isTCEducAdmin,
        isAdminGlobal,
      };
      setUserInfo(info);

      // Load pending authorizations for this user's cargo
      if (info.cargoId) {
        await loadPendAutorizacoes(info.cargoId);
      }
    } catch(e) { console.error("loadUserInfo", e); }
  };

  const loadPendAutorizacoes = async (cargoId) => {
    try {
      const snap = await getDocs(query(
        collection(db, "almox_solicitacoes"),
        where("status", "==", "Aguardando Autorização"),
        where("cargoAutorizadorId", "==", cargoId)
      ));
      setPendAutorizacoes(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
  };

  const autorizarSolicitacao = async (sol, aprovado) => {
    setSalvandoAut(true);
    try {
      const novoStatus = aprovado ? "Aguardando Homologação" : "Recusada";
      const textoHist = aprovado
        ? `✅ Autorizado por ${userInfo?.servidorNome || user?.email} (${userInfo?.cargoNome})`
        : `❌ Não autorizado por ${userInfo?.servidorNome || user?.email} (${userInfo?.cargoNome}). Motivo: ${autJustificativa}`;
      const novoHist = [...(sol.historico||[]), {
        data: new Date().toISOString(), autor: user?.email,
        tipo: aprovado ? "autorizacao" : "recusa_autorizacao", texto: textoHist,
      }];
      const upd = { status: novoStatus, historico: novoHist, atualizadoEm: new Date().toISOString() };
      if (!aprovado) upd.motivoRecusa = autJustificativa;
      await updateDoc(doc(db, "almox_solicitacoes", sol.id), upd);

      // Alerta para solicitante
      await addDoc(collection(db, "almox_alertas"), {
        tipo: aprovado ? "autorizacao_aprovada" : "autorizacao_recusada",
        solicitacaoId: sol.id, destinatario: sol.solicitante, lido: false,
        mensagem: aprovado
          ? `✅ Sua solicitação de materiais foi autorizada por ${userInfo?.servidorNome}. Aguarde homologação do almoxarifado.`
          : `❌ Sua solicitação de materiais foi recusada por ${userInfo?.servidorNome}. Motivo: ${autJustificativa}`,
        criadoEm: new Date().toISOString(),
      });

      // Se aprovado: alerta para Almoxarifado Administrativo
      if (aprovado) {
        await addDoc(collection(db, "almox_alertas"), {
          tipo: "homologacao_pendente", grupo: "Almoxarifado Administrativo",
          solicitacaoId: sol.id, lido: false,
          mensagem: `📦 Nova solicitação de materiais autorizada aguardando homologação. Solicitante: ${sol.solicitanteNome || sol.solicitante}`,
          criadoEm: new Date().toISOString(),
        });
      }

      setPendAutorizacoes(p => p.filter(x => x.id !== sol.id));
      setModalAutorizacao(null);
      setAutJustificativa("");
    } catch(e) { console.error(e); }
    setSalvandoAut(false);
  };

  // Rotas públicas — sem login, sem aguardar auth
  if (window.location.pathname === "/ocorrencia" || window.location.pathname.startsWith("/ocorrencia?")) return <OcorrenciaPublicaPage />;
  const telaMatch = window.location.pathname.match(/^\/tela\/([^/]+)$/);
  if (telaMatch) return <IPCMidiaTelaPublica telaId={telaMatch[1]}/>;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#1B3F7A", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:42, fontWeight:900, color:"#fff", letterSpacing:-2 }}>IPC<span style={{ color:"#E8730A" }}>gov</span></div>
      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13, letterSpacing:3 }}>CARREGANDO...</div>
    </div>
  );

  if (!user) return <LoginPage onLogin={setUser} />;

  // Tela obrigatória de troca de senha no primeiro acesso
  if (precisaTrocarSenha) return (
    <TrocaSenhaObrigatoria
      user={user}
      onConcluido={() => setPrecisaTrocarSenha(false)}
    />
  );

  if (currentModule === "tceduc") return <TCEducModule user={user} onBack={() => setCurrentModule(null)} onCadastros={() => setCurrentModule("cadastros")} onAlertas={() => setCurrentModule("alertas")} onDashboard={() => setCurrentModule("dashboard")} onOcorrencias={() => setCurrentModule("tceduc_ocorrencias")} onPlanos={() => setCurrentModule("tceduc_planos")} onRelatorio={(id) => { setRelatorioEventoId(id||null); setCurrentModule("relatorio"); }} onSeed={() => setCurrentModule("tceduc_2026_seed")} />;
  if (currentModule === "tceduc_ocorrencias") return <OcorrenciasPage user={user} onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "tceduc_planos") return <PlanoAcaoPage user={user} onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "usuarios") return <UsuariosPage onBack={() => setCurrentModule(null)} />;
  if (currentModule === "cadastros") return <CadastrosPage onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "alertas") return <AlertasPage onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "dashboard") return <DashboardPage onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "relatorio") return <RelatorioPage onBack={() => setCurrentModule("tceduc")} eventoId={relatorioEventoId} />;

  if (currentModule === "designer") return <DesignerModule user={user} onBack={() => setCurrentModule(null)} onFiltros={() => setCurrentModule("designer_filtros")} onKanban={() => setCurrentModule("designer_kanban")} onSolicitacoes={() => setCurrentModule("designer_solicitacoes")} onDashboard={() => setCurrentModule("designer_dashboard")} />;
  if (currentModule === "designer_filtros") return <FiltrosAdminPage onBack={() => setCurrentModule("designer")} />;
  if (currentModule === "designer_kanban") return <KanbanPage onBack={() => setCurrentModule("designer")} onAbrirAtividade={() => setCurrentModule("designer")} />;
  if (currentModule === "designer_solicitacoes") return <SolicitacoesPage user={user} onBack={() => setCurrentModule("designer")} />;
  if (currentModule === "designer_dashboard") return <DesignerDashboardPage onBack={() => setCurrentModule("designer")} />;

  if (currentModule === "processos") return <ProcessosModule user={user} userInfo={userInfo} onBack={() => setCurrentModule(null)} onFiltros={() => setCurrentModule("processos_filtros")} onKanban={() => setCurrentModule("processos_kanban")} onRelatorio={(id) => { setProcessoRelatorioId(id||null); setCurrentModule("processos_relatorio"); }} onAdminAlertas={() => setCurrentModule("processos_alertas")} onDashboard={() => setCurrentModule("processos_dashboard")} onFuturos={() => setCurrentModule("processos_futuros")} />;
  if (currentModule === "processos_futuros") return <ProcessosFuturosPage user={user} userInfo={userInfo} onBack={() => setCurrentModule("processos")} />;
  if (currentModule === "ipc_cursos") return <IPCCursosModule user={user} userInfo={userInfo} onBack={() => setCurrentModule(null)} onInstrutores={() => setCurrentModule("ipc_cursos_instrutores")} onFormProjeto={(p) => { setProjetoCursoSelected(p); setCurrentModule("ipc_cursos_form"); }} onDashboard={() => setCurrentModule("ipc_cursos_dashboard")} />;
  if (currentModule === "ipc_cursos_form") return <IPCCursosFormPage user={user} userInfo={userInfo} projeto={projetoCursoSelected} onBack={() => setCurrentModule("ipc_cursos")} onSaved={() => { setProjetoCursoSelected(null); setCurrentModule("ipc_cursos"); }} />;
  if (currentModule === "ipc_cursos_dashboard") return <IPCCursosDashboard user={user} onBack={() => setCurrentModule("ipc_cursos")} onSeed={() => setCurrentModule("ipc_cursos_seed_2025")} />;
  if (currentModule === "olimpiadas") return <OlimpiadasModule user={user} userInfo={userInfo} onBack={() => setCurrentModule(null)} onDashboard={() => setCurrentModule("olimpiadas_dashboard")} onSeed={() => setCurrentModule("olimpiadas_seed")} />;
  if (currentModule === "ipc_midia") return <IPCMidiaModule user={user} userInfo={userInfo} onBack={() => setCurrentModule(null)}/>;
  if (currentModule === "olimpiadas_seed") return <OlimpiadasSeedPage onBack={() => setCurrentModule("olimpiadas")} />;
  if (currentModule === "olimpiadas_dashboard") return <OlimpiadasDashboard user={user} onBack={() => setCurrentModule("olimpiadas")} />;
  if (currentModule === "ipc_cursos_seed_2025") return <IPCCursos2025SeedPage onBack={() => setCurrentModule("ipc_cursos_dashboard")} />;
  if (currentModule === "ipc_cursos_instrutores") return <IPCCursosInstrutoresPage user={user} onBack={() => setCurrentModule("ipc_cursos")} />;
  if (currentModule === "ipc_indicadores") return <IPCIndicadoresModule user={user} userInfo={userInfo} onBack={() => setCurrentModule(null)} onDashboard={() => setCurrentModule("ipc_indicadores_dashboard")} onSeed={() => setCurrentModule("ipc_indicadores_seed")} />;
  if (currentModule === "ipc_indicadores_dashboard") return <IPCIndicadoresDashboard user={user} onBack={() => setCurrentModule("ipc_indicadores")} onIndicador={() => setCurrentModule("ipc_indicadores")} />;
  if (currentModule === "ipc_indicadores_seed") return <IPCIndicadoresSeedPage onBack={() => setCurrentModule("ipc_indicadores")} />;
  if (currentModule === "tceduc_2026_seed") return <TCEduc2026SeedPage onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "processos_kanban") return <ProcessosKanbanPage user={user} userInfo={userInfo} onBack={() => setCurrentModule("processos")} />;
  if (currentModule === "processos_filtros") return <ProcessosFiltrosPage onBack={() => setCurrentModule("processos")} />;
  if (currentModule === "processos_alertas") return <ProcessosAlertasPage onBack={() => setCurrentModule("processos")} />;
  if (currentModule === "processos_relatorio") return <ProcessosRelatorioPage onBack={() => setCurrentModule("processos")} processoId={processoRelatorioId} />;
  if (currentModule === "processos_dashboard") return <ProcessosDashboardPage onBack={() => setCurrentModule("processos")} />;

  if (currentModule === "almoxarifado") return <AlmoxarifadoModule user={user} userInfo={userInfo} onBack={() => setCurrentModule(null)} onDashboard={() => setCurrentModule("almox_dashboard")} onRelatorio={() => setCurrentModule("almox_relatorio")} onSolicitacoes={() => setCurrentModule("almox_solicitacoes")} />;
  if (currentModule === "almox_dashboard") return <AlmoxDashboardPage onBack={() => setCurrentModule("almoxarifado")} />;
  if (currentModule === "almox_solicitacoes") return <AlmoxSolicitacoesPage user={user} userInfo={userInfo} onBack={() => setCurrentModule("almoxarifado")} isAdmin={userInfo?.isAlmoxAdmin || false} />;
  if (currentModule === "almox_relatorio") return <AlmoxRelatorioPage onBack={() => setCurrentModule("almoxarifado")} />;

  if (currentModule === "pessoas") return <PessoasModule user={user} onBack={() => setCurrentModule(null)} onOrganograma={() => setCurrentModule("organograma")} onAniversarios={() => setCurrentModule("aniversarios")} onEstrutura={() => setCurrentModule("estrutura_pessoas")} onFerias={() => setCurrentModule("ferias_servidores")} />;
  if (currentModule === "organograma") return <OrganogramaPage onBack={() => setCurrentModule("pessoas")} />;
  if (currentModule === "aniversarios") return <AniversariosPage onBack={() => setCurrentModule("pessoas")} />;
  if (currentModule === "ferias_servidores") return <FeriasPage user={user} onBack={() => setCurrentModule("pessoas")} />;
  if (currentModule === "estrutura_pessoas") return <EstruturaPessoasPage onBack={() => setCurrentModule("pessoas")} />;
  if (currentModule === "gestao_emails") return <GestaoEmailsPage onBack={() => setCurrentModule(null)} />;
  if (currentModule === "calendario") return <CalendarioPage onBack={() => setCurrentModule(null)} user={user} />;

  return <HomePage user={user} onOpenModule={setCurrentModule} />;
}
