import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/config";
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import LoginPage from "./pages/LoginPage";
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

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentModule, setCurrentModule] = useState(null);
  const [relatorioEventoId, setRelatorioEventoId] = useState(null);
  const [processoRelatorioId, setProcessoRelatorioId] = useState(null);
  const [projetoCursoSelected, setProjetoCursoSelected] = useState(null);
  const [userInfo, setUserInfo] = useState(null); // { grupos:[], cargoId, cargoNome, isAlmoxAdmin, isTCEducAdmin }
  const [pendAutorizacoes, setPendAutorizacoes] = useState([]); // solicitações esperando autorização deste user
  const [modalAutorizacao, setModalAutorizacao] = useState(null); // solicitação aberta para autorizar
  const [autJustificativa, setAutJustificativa] = useState("");
  const [salvandoAut, setSalvandoAut] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadUserInfo(u);
      } else {
        setUserInfo(null);
        setPendAutorizacoes([]);
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

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#1B3F7A", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:42, fontWeight:900, color:"#fff", letterSpacing:-2 }}>IPC<span style={{ color:"#E8730A" }}>gov</span></div>
      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13, letterSpacing:3 }}>CARREGANDO...</div>
    </div>
  );

  // Rota pública — formulário de ocorrência via QR Code (sem login)
  if (window.location.pathname === "/ocorrencia" || window.location.pathname.startsWith("/ocorrencia?")) {
    return <OcorrenciaPublicaPage />;
  }

  if (!user) return <LoginPage onLogin={setUser} />;

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
  if (currentModule === "ipc_cursos") return <IPCCursosModule user={user} userInfo={userInfo} onBack={() => setCurrentModule(null)} onInstrutores={() => setCurrentModule("ipc_cursos_instrutores")} onFormProjeto={(p) => { setProjetoCursoSelected(p); setCurrentModule("ipc_cursos_form"); }} />;
  if (currentModule === "ipc_cursos_form") return <IPCCursosFormPage user={user} projeto={projetoCursoSelected} onBack={() => setCurrentModule("ipc_cursos")} onSaved={() => setCurrentModule("ipc_cursos")} />;
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
