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

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentModule, setCurrentModule] = useState(null);
  const [relatorioEventoId, setRelatorioEventoId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#1B3F7A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 42, fontWeight: 900, color: "#fff", letterSpacing: -2 }}>
        IPC<span style={{ color: "#E8730A" }}>gov</span>
      </div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, letterSpacing: 3 }}>CARREGANDO...</div>
    </div>
  );

  if (!user) return <LoginPage onLogin={setUser} />;
  if (currentModule === "tceduc") return <TCEducModule user={user} onBack={() => setCurrentModule(null)} onCadastros={() => setCurrentModule("cadastros")} onAlertas={() => setCurrentModule("alertas")} onDashboard={() => setCurrentModule("dashboard")} onRelatorio={(id) => { setRelatorioEventoId(id || null); setCurrentModule("relatorio"); }} />;
  if (currentModule === "usuarios") return <UsuariosPage onBack={() => setCurrentModule(null)} />;
  if (currentModule === "cadastros") return <CadastrosPage onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "alertas") return <AlertasPage onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "dashboard") return <DashboardPage onBack={() => setCurrentModule("tceduc")} />;
  if (currentModule === "relatorio") return <RelatorioPage onBack={() => setCurrentModule("tceduc")} eventoId={relatorioEventoId} />;

  return <HomePage user={user} onOpenModule={setCurrentModule} />;
}
