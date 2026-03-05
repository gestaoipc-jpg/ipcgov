import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const MODULES = [
  { id: "tceduc", name: "TCEduc", icon: "🎓", desc: "Programa de Capacitação", color: "#1B3F7A", available: true },
  { id: "designer", name: "IPC Designer", icon: "🎨", desc: "Gestão de Atividades", color: "#7c3aed", available: true },
  { id: "processos", name: "IPC Processos", icon: "📁", desc: "Gestão de Processos", color: "#0891b2", available: true },
  { id: "almoxarifado", name: "Almoxarifado", icon: "🗃️", desc: "Controle de Estoque", color: "#059669", available: true },
  { id: "designer", name: "IPC Designer", icon: "🎨", desc: "Artes e Vídeos", color: "#7c3aed", available: false },
  { id: "processos", name: "IPC Processos", icon: "📋", desc: "Gestão Processual", color: "#0891b2", available: false },
  { id: "almoxarifado", name: "Almoxarifado", icon: "📦", desc: "Controle de Estoque", color: "#059669", available: false },
  { id: "indicadores", name: "Indicadores", icon: "📊", desc: "Metas e Relatórios", color: "#d97706", available: false },
  { id: "pessoas", name: "IPC Pessoas", icon: "👥", desc: "Gestão de Equipe", color: "#dc2626", available: false },
];

function BottomNav({ tab, setTab }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#fff", borderTop: "1px solid #e8edf2",
      padding: "10px 40px 20px",
      display: "flex", justifyContent: "center", gap: 80,
      zIndex: 100, boxShadow: "0 -4px 20px rgba(27,63,122,0.08)",
    }}>
      {[
        { id: "home", icon: "🏠", label: "Início" },
        { id: "perfil", icon: "👤", label: "Perfil" },
      ].map(item => (
        <div key={item.id} onClick={() => setTab(item.id)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          cursor: "pointer",
        }}>
          <div style={{ fontSize: 24 }}>{item.icon}</div>
          <div style={{
            fontSize: 10, fontWeight: tab === item.id ? 700 : 500,
            color: tab === item.id ? "#1B3F7A" : "#aaa",
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>{item.label}</div>
          {tab === item.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1B3F7A" }} />}
        </div>
      ))}
    </div>
  );
}

export default function HomePage({ user, onOpenModule }) {
  const [userData, setUserData] = useState(null);
  const [tab, setTab] = useState("home");
  const [alertas, setAlertas] = useState([]);
  const [showAlertas, setShowAlertas] = useState(false);

  useEffect(() => {
    loadUser();
    loadAlertas();
  }, [user]);

  const loadUser = async () => {
    const ref = doc(db, "usuarios", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setUserData(snap.data());
    } else {
      const adminEmails = ["gestaoipc@tce.ce.gov.br", "fabricio@tce.ce.gov.br"];
      const isAdmin = adminEmails.includes(user.email);
      const newUser = {
        email: user.email,
        nome: user.email.split("@")[0],
        perfil: isAdmin ? "admin" : "usuario",
        modulos: isAdmin ? MODULES.map(m => m.id) : [],
        criadoEm: new Date().toISOString(),
      };
      await setDoc(ref, newUser);
      setUserData(newUser);
    }
  };

  const loadAlertas = async () => {
    try {
      const snap = await getDocs(collection(db, "alertas"));
      setAlertas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { setAlertas([]); }
  };

  const marcarLido = async (id) => {
    await updateDoc(doc(db, "alertas", id), { lido: true });
    setAlertas(a => a.map(al => al.id === id ? { ...al, lido: true } : al));
  };

  const handleLogout = async () => await signOut(auth);

  const canAccess = (moduleId) => {
    if (!userData) return false;
    if (userData.perfil === "admin") return true;
    return userData.modulos?.includes(moduleId);
  };

  const alertasNaoLidos = alertas.filter(a => !a.lido);
  const alertasPorModulo = MODULES.map(m => ({
    ...m,
    alertas: alertas.filter(a => a.modulo === m.id && !a.lido),
  })).filter(m => m.alertas.length > 0);

  // PERFIL
  if (tab === "perfil") return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)", padding: "50px 40px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Meu Perfil</div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 32 }}>{userData?.nome}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 4 }}>{user.email}</div>
          <div style={{
            display: "inline-block", marginTop: 14,
            background: "rgba(232,115,10,0.3)", border: "1px solid rgba(232,115,10,0.5)",
            borderRadius: 20, padding: "5px 16px",
            color: "#E8730A", fontSize: 12, fontWeight: 700,
          }}>{userData?.perfil === "admin" ? "👑 ADMINISTRADOR" : "👤 USUÁRIO"}</div>
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "30px 24px 120px" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 28, marginBottom: 16, boxShadow: "0 2px 12px rgba(27,63,122,0.08)" }}>
          <div style={{ fontWeight: 700, color: "#1B3F7A", fontSize: 16, marginBottom: 16 }}>Módulos com acesso</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {MODULES.filter(m => canAccess(m.id)).map(m => (
              <div key={m.id} style={{
                background: `${m.color}15`, border: `1px solid ${m.color}30`,
                borderRadius: 12, padding: "8px 16px", fontSize: 13, color: m.color, fontWeight: 600,
              }}>{m.icon} {m.name}</div>
            ))}
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: "100%", background: "#fee2e2", border: "none", borderRadius: 16,
          padding: 18, color: "#dc2626", fontWeight: 700, fontSize: 15,
          cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
        }}>🚪 Sair do sistema</button>
      </div>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );

  // HOME
  return (
    <div style={{ minHeight: "100vh", background: "#E8EDF2", fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #1B3F7A, #2a5ba8)",
        padding: "28px 32px 50px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: 40, bottom: -60, fontSize: 220, opacity: 0.04, lineHeight: 1 }}>🗺</div>
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>
                IPC<span style={{ color: "#E8730A" }}>gov</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, letterSpacing: 3 }}>INSTITUTO PLÁCIDO CASTELO</div>
            </div>
            <div onClick={() => setShowAlertas(true)} style={{
              position: "relative", width: 44, height: 44,
              background: "rgba(255,255,255,0.12)", borderRadius: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 20,
            }}>
              🔔
              {alertasNaoLidos.length > 0 && (
                <div style={{
                  position: "absolute", top: 7, right: 7,
                  width: 9, height: 9, background: "#E8730A",
                  borderRadius: "50%", border: "2px solid #1B3F7A",
                }} />
              )}
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 4 }}>Bem-vindo,</div>
          <div style={{ color: "#fff", fontSize: 26, fontWeight: 700 }}>{userData?.nome || user.email.split("@")[0]} 👋</div>
          <div style={{
            display: "inline-block", marginTop: 10,
            background: userData?.perfil === "admin" ? "rgba(232,115,10,0.3)" : "rgba(255,255,255,0.15)",
            border: `1px solid ${userData?.perfil === "admin" ? "rgba(232,115,10,0.5)" : "rgba(255,255,255,0.2)"}`,
            borderRadius: 20, padding: "4px 14px",
            color: userData?.perfil === "admin" ? "#E8730A" : "rgba(255,255,255,0.7)",
            fontSize: 11, fontWeight: 700, letterSpacing: 1,
          }}>
            {userData?.perfil === "admin" ? "👑 ADMINISTRADOR" : "👤 USUÁRIO"}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 120px" }}>
        {/* ALERT BANNER */}
        <div onClick={() => setShowAlertas(true)} style={{
          marginTop: 24, marginBottom: 24,
          background: "linear-gradient(135deg, #E8730A, #f0920a)",
          borderRadius: 20, padding: "16px 22px",
          display: "flex", alignItems: "center", gap: 16,
          boxShadow: "0 4px 20px rgba(232,115,10,0.3)",
          cursor: "pointer",
        }}>
          <div style={{ fontSize: 30 }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
              {alertasNaoLidos.length > 0 ? `${alertasNaoLidos.length} alertas pendentes` : "Nenhum alerta pendente"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 3 }}>
              Toque para ver alertas organizados por módulo
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 28 }}>›</div>
        </div>

        {/* ADMIN AREA */}
        {userData?.perfil === "admin" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1B3F7A", marginBottom: 14 }}>Administração</div>
            <div onClick={() => onOpenModule("usuarios")} style={{
              background: "#fff", borderRadius: 20, padding: "20px 24px",
              display: "flex", alignItems: "center", gap: 16,
              boxShadow: "0 2px 12px rgba(27,63,122,0.08)",
              cursor: "pointer", border: "2px solid #E8730A22",
              transition: "transform .15s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ width: 52, height: 52, borderRadius: 16, background: "#E8730A18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👥</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A" }}>Gestão de Usuários</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Criar, editar e gerenciar acessos</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 24, color: "#ccc" }}>›</div>
            </div>
          </div>
        )}

        {/* MODULES */}
        <div style={{ fontWeight: 700, fontSize: 18, color: "#1B3F7A", marginBottom: 18 }}>Módulos do Sistema</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {MODULES.map(mod => {
            const hasAccess = canAccess(mod.id);
            const modAlertas = alertas.filter(a => a.modulo === mod.id && !a.lido).length;
            return (
              <div key={mod.id}
                onClick={() => hasAccess && mod.available && onOpenModule(mod.id)}
                style={{
                  background: "#fff", borderRadius: 22, padding: "26px 18px",
                  textAlign: "center",
                  boxShadow: "0 2px 12px rgba(27,63,122,0.08)",
                  cursor: hasAccess && mod.available ? "pointer" : "default",
                  opacity: hasAccess ? 1 : 0.4,
                  filter: hasAccess ? "none" : "grayscale(0.5)",
                  transition: "transform .15s, box-shadow .15s",
                  position: "relative",
                  border: hasAccess && mod.available ? `2px solid ${mod.color}22` : "2px solid transparent",
                }}
                onMouseEnter={e => { if (hasAccess && mod.available) { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(27,63,122,0.15)"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(27,63,122,0.08)"; }}
              >
                {!hasAccess && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 14, opacity: 0.5 }}>🔒</div>}
                {!mod.available && hasAccess && (
                  <div style={{
                    position: "absolute", top: 10, right: 10,
                    background: "#f0f4ff", borderRadius: 7, padding: "2px 8px",
                    fontSize: 9, color: "#1B3F7A", fontWeight: 700, letterSpacing: 0.5,
                  }}>EM BREVE</div>
                )}
                {modAlertas > 0 && (
                  <div style={{
                    position: "absolute", top: 10, left: 10,
                    background: "#E8730A", borderRadius: 10, padding: "2px 8px",
                    fontSize: 10, color: "#fff", fontWeight: 700,
                  }}>{modAlertas}</div>
                )}
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: `${mod.color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, margin: "0 auto 14px",
                }}>{mod.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A", marginBottom: 6 }}>{mod.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{mod.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav tab={tab} setTab={setTab} />

      {/* MODAL ALERTAS */}
      {showAlertas && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setShowAlertas(false)}>
          <div style={{
            background: "#fff", borderRadius: 24,
            width: "100%", maxWidth: 600, padding: 32,
            maxHeight: "80vh", overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1B3F7A" }}>🔔 Alertas</div>
                <div style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>Organizados por módulo</div>
              </div>
              <div onClick={() => setShowAlertas(false)} style={{
                width: 36, height: 36, background: "#f0f4ff", borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 18, color: "#1B3F7A",
              }}>✕</div>
            </div>

            {alertasPorModulo.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#333", marginBottom: 8 }}>Tudo em dia!</div>
                Nenhum alerta pendente no momento.
              </div>
            ) : alertasPorModulo.map(mod => (
              <div key={mod.id} style={{ marginBottom: 28 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
                  paddingBottom: 10, borderBottom: "1px solid #e8edf2",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${mod.color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                  }}>{mod.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1B3F7A" }}>{mod.name}</div>
                  <div style={{
                    background: "#E8730A", color: "#fff", borderRadius: 10,
                    padding: "2px 10px", fontSize: 11, fontWeight: 700,
                  }}>{mod.alertas.length}</div>
                </div>
                {mod.alertas.map(al => (
                  <div key={al.id} style={{
                    background: "#f8f9fb", borderRadius: 14, padding: "14px 18px",
                    marginBottom: 10, display: "flex", alignItems: "center", gap: 14,
                    border: "1px solid #e8edf2",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#333" }}>{al.titulo || "Alerta"}</div>
                      {al.mensagem && <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>{al.mensagem}</div>}
                    </div>
                    <div onClick={() => marcarLido(al.id)} style={{
                      background: "#e8f5e9", border: "1px solid #c8e6c9",
                      borderRadius: 10, padding: "7px 14px",
                      color: "#059669", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}>✓ Marcar lido</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
