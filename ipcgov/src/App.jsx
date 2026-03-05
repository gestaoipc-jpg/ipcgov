import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/config";
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
import ProcessosKanbanPage from "./pages/ProcessosKanbanPage";
import ProcessosFiltrosPage from "./pages/ProcessosFiltrosPage";
import ProcessosAlertasPage from "./pages/ProcessosAlertasPage";
import ProcessosRelatorioPage from "./pages/ProcessosRelatorioPage";
import AlmoxarifadoModule from "./pages/AlmoxarifadoModule";
import AlmoxSolicitacoesPage from "./pages/AlmoxSolicitacoesPage";
import AlmoxDashboardPage from "./pages/AlmoxDashboardPage";
import AlmoxRelatorioPage from "./pages/AlmoxRelatorioPage";
import PessoasModule from "./pages/PessoasModule";
import OrganogramaPage from "./pages/OrganogramaPage";
import AniversariosPage from "./pages/AniversariosPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentModule, setCurrentModule] = useState(null);
  const [relatorioEventoId, setRelatorioEventoId] = useState(null);
  const [processoRelatorioId, setProcessoRelatorioId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#1B3F7A", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:42, fontWeight:900, color:"#fff", letterSpacing:-2 }}>IPC<span style={{ color:"#E8730A" }}>gov</span></div>
      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13, letterSpacing:3 }}>CARREGANDO...</div>
    </div>
  );

  if (!user) return <LoginPage onLogin={setUser} />;

  if (currentModule === "tceduc") return <TCEducModule user={user} onBack={() => setCurrentModule(null)} onCadastros={() => setCurrentModule("cadastros")} onAlertas={() => setCurrentModule("alertas")} onDashboard={() => setCurrentModule("dashboard")} onRelatorio={(id) => { setRelatorioEventoId(id||null); setCurrentModule("relatorio"); }} />;
  if (currentModule === "usuarios") return <UsuariosPage onBack={() => setCurrentModule(null)} />;
  if (currentModule === "cadastros") return <CadastrosPage onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "alertas") return <AlertasPage onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "dashboard") return <DashboardPage onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "relatorio") return <RelatorioPage onBack={() => setCurrentModule("tceduc")} eventoId={relatorioEventoId} />;

  if (currentModule === "designer") return <DesignerModule user={user} onBack={() => setCurrentModule(null)} onFiltros={() => setCurrentModule("designer_filtros")} onKanban={() => setCurrentModule("designer_kanban")} onSolicitacoes={() => setCurrentModule("designer_solicitacoes")} />;
  if (currentModule === "designer_filtros") return <FiltrosAdminPage onBack={() => setCurrentModule("designer")} />;
  if (currentModule === "designer_kanban") return <KanbanPage onBack={() => setCurrentModule("designer")} onAbrirAtividade={() => setCurrentModule("designer")} />;
  if (currentModule === "designer_solicitacoes") return <SolicitacoesPage user={user} onBack={() => setCurrentModule("designer")} />;

  if (currentModule === "processos") return <ProcessosModule user={user} onBack={() => setCurrentModule(null)} onFiltros={() => setCurrentModule("processos_filtros")} onKanban={() => setCurrentModule("processos_kanban")} onRelatorio={(id) => { setProcessoRelatorioId(id||null); setCurrentModule("processos_relatorio"); }} onAdminAlertas={() => setCurrentModule("processos_alertas")} />;
  if (currentModule === "processos_kanban") return <ProcessosKanbanPage onBack={() => setCurrentModule("processos")} />;
  if (currentModule === "processos_filtros") return <ProcessosFiltrosPage onBack={() => setCurrentModule("processos")} />;
  if (currentModule === "processos_alertas") return <ProcessosAlertasPage onBack={() => setCurrentModule("processos")} />;
  if (currentModule === "processos_relatorio") return <ProcessosRelatorioPage onBack={() => setCurrentModule("processos")} processoId={processoRelatorioId} />;

  if (currentModule === "almoxarifado") return <AlmoxarifadoModule user={user} onBack={() => setCurrentModule(null)} onDashboard={() => setCurrentModule("almox_dashboard")} onRelatorio={() => setCurrentModule("almox_relatorio")} onSolicitacoes={() => setCurrentModule("almox_solicitacoes")} />;
  if (currentModule === "almox_dashboard") return <AlmoxDashboardPage onBack={() => setCurrentModule("almoxarifado")} />;
  if (currentModule === "almox_solicitacoes") return <AlmoxSolicitacoesPage user={user} onBack={() => setCurrentModule("almoxarifado")} isAdmin={true} />;
  if (currentModule === "almox_relatorio") return <AlmoxRelatorioPage onBack={() => setCurrentModule("almoxarifado")} />;

  if (currentModule === "pessoas") return <PessoasModule user={user} onBack={() => setCurrentModule(null)} onOrganograma={() => setCurrentModule("organograma")} onAniversarios={() => setCurrentModule("aniversarios")} />;
  if (currentModule === "organograma") return <OrganogramaPage onBack={() => setCurrentModule("pessoas")} />;
  if (currentModule === "aniversarios") return <AniversariosPage onBack={() => setCurrentModule("pessoas")} />;

  return <HomePage user={user} onOpenModule={setCurrentModule} />;
}
