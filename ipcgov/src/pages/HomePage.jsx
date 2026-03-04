import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const MODULES = [
  { id: "tceduc", name: "TCEduc", icon: "🎓", desc: "Programa de Capacitação", color: "#1B3F7A", available: true },
  { id: "designer", name: "IPC Designer", icon: "🎨", desc: "Artes e Vídeos", color: "#7c3aed", available: false },
  { id: "processos", name: "IPC Processos", icon: "📋", desc: "Gestão Processual", color: "#0891b2", available: false },
  { id: "almoxarifado", name: "Almoxarifado", icon: "📦", desc: "Controle de Estoque", color: "#059669", available: false },
  { id: "indicadores", name: "Indicadores", icon: "📊", desc: "Metas e Relatórios", color: "#d97706", available: false },
  { id: "pessoas", name: "IPC Pessoas", icon: "👥", desc: "Gestão de Equipe", color: "#dc2626", available: false },
];

export default function HomePage({ user, onOpenModule }) {
  const [userData, setUserData] = useState(null);
  const [tab, setTab] = useState("home");
  const [notifCount] = useState(3);

  useEffect(() => {
    const loadUser = async () => {
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setUserData(snap.data());
      } else {
        // First time admin setup
        const adminEmails = ["gestaoipc@tce.ce.gov.br", "fabricio@tce.ce.gov.br"];
        const isAdmin = adminEmails.includes(user.email);
        const newUser = {
          email: user.email,
          nome: user.email.split("@")[0],
          perfil: isAdmin ? "admin" : "usuario",
          modulos: isAdmin ? MODULES.map(m => m.id) : [],
          primeiroAcesso: true,
          criadoEm: new Date().toISOString(),
        };
        await setDoc(ref, newUser);
        setUserData(newUser);
      }
    };
    loadUser();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const canAccess = (moduleId) => {
    if (!userData) return false;
    if (userData.perfil === "admin") return true;
    return userData.modulos?.includes(moduleId);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#E8EDF2",
      fontFamily: "'Montserrat', sans-serif",
      maxWidth: 480, margin: "0 auto",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)",
        padding: "24px 24px 70px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Mapa decorativo */}
        <div style={{
          position: "absolute", right: -20, bottom: -40,
          width: 200, height: 200, opacity: 0.08,
          fontSize: 180, lineHeight: 1,
        }}>🗺</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, position: "relative", zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>
              IPC<span style={{ color: "#E8730A" }}>gov</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: 2 }}>
              INSTITUTO PLÁCIDO CASTELO
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{
              position: "relative",
              width: 38, height: 38,
              background: "rgba(255,255,255,0.12)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 18,
            }}>
              🔔
              {notifCount > 0 && (
                <div style={{
                  position: "absolute", top: 6, right: 6,
                  width: 8, height: 8, background: "#E8730A",
                  borderRadius: "50%", border: "2px solid #1B3F7A",
                }} />
              )}
            </div>
            <div onClick={handleLogout} style={{
              width: 38, height: 38,
              background: "rgba(255,255,255,0.12)",
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 18,
            }}>🚪</div>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 4 }}>
            Bem-vindo,
          </div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>
            {userData?.nome || user.email.split("@")[0]} 👋
          </div>
          <div style={{
            display: "inline-block", marginTop: 8,
            background: userData?.perfil === "admin" ? "rgba(232,115,10,0.3)" : "rgba(255,255,255,0.15)",
            border: `1px solid ${userData?.perfil === "admin" ? "rgba(232,115,10,0.5)" : "rgba(255,255,255,0.2)"}`,
            borderRadius: 20, padding: "3px 12px",
            color: userData?.perfil === "admin" ? "#E8730A" : "rgba(255,255,255,0.7)",
            fontSize: 11, fontWeight: 700, letterSpacing: 1,
          }}>
            {userData?.perfil === "admin" ? "👑 ADMINISTRADOR" : "👤 USUÁRIO"}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12, padding: "0 20px",
        marginTop: -38, marginBottom: 24,
        position: "relative", zIndex: 10,
      }}>
        {[
          { label: "Municipais", value: "54", sub: "2026", color: "#1B3F7A" },
          { label: "Realizados", value: "0", sub: "até agora", color: "#E8730A" },
          { label: "Regionais", value: "7", sub: "2026", color: "#059669" },
        ].map((s, i) => (
          <div key={i} style={{
            background: "#fff", borderRadius: 16, padding: "14px 10px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(27,63,122,0.12)",
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#333", marginTop: 2 }}>{s.label}</div>
            <div style={{ fontSize: 9, color: "#aaa", marginTop: 1 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ALERT BANNER */}
      {notifCount > 0 && (
        <div style={{
          margin: "0 20px 20px",
          background: "linear-gradient(135deg, #E8730A, #f0920a)",
          borderRadius: 18, padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 4px 20px rgba(232,115,10,0.3)",
          cursor: "pointer",
        }}>
          <div style={{ fontSize: 26 }}>⚠️</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
              {notifCount} alertas pendentes
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>
              Toque para ver os alertas do TCEduc
            </div>
          </div>
          <div style={{ marginLeft: "auto", color: "rgba(255,255,255,0.6)", fontSize: 20 }}>›</div>
        </div>
      )}

      {/* MODULES */}
      <div style={{ padding: "0 20px 100px" }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#1B3F7A", marginBottom: 16 }}>
          Módulos do Sistema
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {MODULES.map(mod => {
            const hasAccess = canAccess(mod.id);
            return (
              <div
                key={mod.id}
                onClick={() => hasAccess && mod.available && onOpenModule(mod.id)}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: "22px 16px",
                  textAlign: "center",
                  boxShadow: "0 2px 12px rgba(27,63,122,0.08)",
                  cursor: hasAccess && mod.available ? "pointer" : "default",
                  opacity: hasAccess ? 1 : 0.4,
                  filter: hasAccess ? "none" : "grayscale(0.5)",
                  transition: "transform .15s, box-shadow .15s",
                  position: "relative",
                  border: hasAccess && mod.available ? `2px solid ${mod.color}22` : "2px solid transparent",
                }}
                onMouseEnter={e => { if (hasAccess && mod.available) e.currentTarget.style.transform = "scale(1.02)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                {!hasAccess && (
                  <div style={{
                    position: "absolute", top: 10, right: 10,
                    fontSize: 14, opacity: 0.5,
                  }}>🔒</div>
                )}
                {!mod.available && hasAccess && (
                  <div style={{
                    position: "absolute", top: 8, right: 8,
                    background: "#f0f4ff", borderRadius: 6, padding: "2px 6px",
                    fontSize: 9, color: "#1B3F7A", fontWeight: 700, letterSpacing: 0.5,
                  }}>EM BREVE</div>
                )}
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: `${mod.color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, margin: "0 auto 12px",
                }}>
                  {mod.icon}
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#1B3F7A", marginBottom: 4 }}>
                  {mod.name}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>{mod.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "#fff", borderTop: "1px solid #e8edf2",
        padding: "10px 20px 20px",
        display: "flex", justifyContent: "space-around",
        zIndex: 100,
      }}>
        {[
          { id: "home", icon: "🏠", label: "Início" },
          { id: "eventos", icon: "📅", label: "Eventos" },
          { id: "alertas", icon: "🔔", label: "Alertas" },
          { id: "relatorios", icon: "📊", label: "Relatórios" },
          { id: "perfil", icon: "👤", label: "Perfil" },
        ].map(item => (
          <div key={item.id} onClick={() => setTab(item.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            cursor: "pointer",
          }}>
            <div style={{ fontSize: 22 }}>{item.icon}</div>
            <div style={{
              fontSize: 9, fontWeight: tab === item.id ? 700 : 500,
              color: tab === item.id ? "#1B3F7A" : "#aaa",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>{item.label}</div>
            {tab === item.id && (
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1B3F7A" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
