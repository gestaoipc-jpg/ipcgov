import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/config";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import TCEducModule from "./pages/TCEducModule";
import UsuariosPage from "./pages/UsuariosPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentModule, setCurrentModule] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return (
    <div style={{
      minHeight: "100vh", background: "#1B3F7A",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
    }}>
      <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 42, fontWeight: 900, color: "#fff", letterSpacing: -2 }}>
        IPC<span style={{ color: "#E8730A" }}>gov</span>
      </div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, letterSpacing: 3 }}>CARREGANDO...</div>
    </div>
  );

  if (!user) return <LoginPage onLogin={setUser} />;
  if (currentModule === "tceduc") return <TCEducModule user={user} onBack={() => setCurrentModule(null)} />;
  if (currentModule === "usuarios") return <UsuariosPage onBack={() => setCurrentModule(null)} />;

  return <HomePage user={user} onOpenModule={setCurrentModule} />;
}
