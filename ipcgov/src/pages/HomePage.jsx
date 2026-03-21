import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const MODULES = [
  { id: "tceduc",       name: "TCEduc",        desc: "Programa de Capacitação", color: "#4338CA", grad: "linear-gradient(145deg,#4338CA,#818CF8)", available: true },
  { id: "designer",    name: "IPC Designer",  desc: "Gestão de Atividades",    color: "#BE185D", grad: "linear-gradient(145deg,#BE185D,#F472B6)", available: true },
  { id: "processos",   name: "IPC Processos", desc: "Gestão de Processos",     color: "#047857", grad: "linear-gradient(145deg,#047857,#34D399)", available: true },
  { id: "almoxarifado",name: "Almoxarifado",  desc: "Controle de Estoque",     color: "#C2410C", grad: "linear-gradient(145deg,#C2410C,#FB923C)", available: true },
  { id: "pessoas",     name: "IPC Pessoas",   desc: "Gestão de Pessoas",       color: "#0369A1", grad: "linear-gradient(145deg,#0369A1,#38BDF8)", available: true },
  { id: "ipc_cursos", name: "IPC Cursos",    desc: "Projetos de Cursos",       color: "#0891b2", grad: "linear-gradient(145deg,#0369A1,#38BDF8)", available: true },
  { id: "indicadores", name: "Indicadores",   desc: "Metas e Relatórios",      color: "#B45309", grad: "linear-gradient(145deg,#B45309,#FCD34D)", available: false },
];

const MI_TCEDUC = (<svg width="32" height="32" viewBox="0 0 42 42" fill="none"><path d="M21 8L33 14V18C33 25 27.2 31.5 21 33C14.8 31.5 9 25 9 18V14L21 8Z" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.15)"/><polyline points="16,21 20,25 27,17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>);
const MI_DESIGNER = (<svg width="32" height="32" viewBox="0 0 42 42" fill="none"><circle cx="21" cy="21" r="9" stroke="white" strokeWidth="2" fill="none"/><circle cx="21" cy="21" r="3" fill="white"/><line x1="21" y1="10" x2="21" y2="14.5" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="30.5" y1="15.5" x2="27" y2="17.4" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="30.5" y1="26.5" x2="27" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="21" y1="32" x2="21" y2="27.5" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="11.5" y1="26.5" x2="15" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="11.5" y1="15.5" x2="15" y2="17.4" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>);
const MI_PROCESSOS = (<svg width="32" height="32" viewBox="0 0 42 42" fill="none"><rect x="10" y="9" width="13" height="17" rx="2.5" fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="1.8"/><rect x="19" y="16" width="13" height="17" rx="2.5" fill="rgba(255,255,255,0.32)" stroke="white" strokeWidth="1.8"/><line x1="13" y1="15" x2="19" y2="15" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><line x1="13" y1="18.5" x2="19" y2="18.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><line x1="22" y1="22" x2="28" y2="22" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><line x1="22" y1="25.5" x2="28" y2="25.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>);
const MI_ALMOX = (<svg width="32" height="32" viewBox="0 0 42 42" fill="none"><rect x="9" y="20" width="10" height="12" rx="2" fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="1.8"/><rect x="23" y="20" width="10" height="12" rx="2" fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="1.8"/><rect x="16" y="10" width="10" height="12" rx="2" fill="rgba(255,255,255,0.32)" stroke="white" strokeWidth="1.8"/><line x1="19" y1="16" x2="23" y2="16" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round"/><line x1="12" y1="26" x2="16" y2="26" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round"/><line x1="26" y1="26" x2="30" y2="26" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round"/></svg>);
const MI_PESSOAS = (<svg width="32" height="32" viewBox="0 0 42 42" fill="none"><circle cx="21" cy="17" r="5.5" stroke="white" strokeWidth="1.8" fill="rgba(255,255,255,0.22)"/><path d="M10 35C10 29 15 25 21 25C27 25 32 29 32 35" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/><circle cx="31.5" cy="14" r="3.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" fill="none"/><path d="M35 23C35 20.5 33.5 19 31.5 18.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round"/><circle cx="10.5" cy="14" r="3.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" fill="none"/><path d="M7 23C7 20.5 8.5 19 10.5 18.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round"/></svg>);
const MI_IPCCURSOS = (<svg width="32" height="32" viewBox="0 0 42 42" fill="none"><rect x="8" y="6" width="18" height="24" rx="2.5" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.8"/><line x1="12" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><line x1="12" y1="16" x2="22" y2="16" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><line x1="12" y1="20" x2="18" y2="20" stroke="white" strokeWidth="1.3" strokeLinecap="round"/><circle cx="30" cy="28" r="8" fill="rgba(255,255,255,0.35)" stroke="white" strokeWidth="1.8"/><line x1="30" y1="24" x2="30" y2="28" stroke="white" strokeWidth="1.8" strokeLinecap="round"/><circle cx="30" cy="31" r="1.2" fill="white"/></svg>);
const MI_INDICADORES = (<svg width="32" height="32" viewBox="0 0 42 42" fill="none"><rect x="9" y="9" width="10" height="10" rx="2.5" fill="rgba(255,255,255,0.32)" stroke="white" strokeWidth="1.5"/><rect x="23" y="9" width="10" height="10" rx="2.5" fill="rgba(255,255,255,0.14)" stroke="white" strokeWidth="1.5"/><rect x="9" y="23" width="10" height="10" rx="2.5" fill="rgba(255,255,255,0.14)" stroke="white" strokeWidth="1.5"/><rect x="23" y="23" width="10" height="10" rx="2.5" fill="rgba(255,255,255,0.32)" stroke="white" strokeWidth="1.5"/><line x1="12" y1="29.5" x2="12" y2="31" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><line x1="15" y1="27.5" x2="15" y2="31" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><line x1="18" y1="25.5" x2="18" y2="31" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>);
const MODULE_ICONS = {
  tceduc: MI_TCEDUC, designer: MI_DESIGNER, processos: MI_PROCESSOS,
  almoxarifado: MI_ALMOX, pessoas: MI_PESSOAS, indicadores: MI_INDICADORES,
};

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
          <div style={{ fontSize: 24 }}>{MODULE_ICONS[item.id] || item.icon}</div>
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
  const [showDashboard, setShowDashboard] = useState(false);

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
      const [alertasSnap, eventosSnap, servidoresSnap] = await Promise.all([
        getDocs(collection(db, "alertas")),
        getDocs(collection(db, "tceduc_eventos")),
        getDocs(collection(db, "ipc_servidores")),
      ]);
      const alertasBase = alertasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Descobre os grupos do usuário logado via ipc_servidores
      const uid = user?.uid || "";
      const email = user?.email || "";
      const servidores = servidoresSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const meuServidor = servidores.find(s => s.id === uid || s.email === email);
      const meusGrupoIds = meuServidor?.grupos || [];

      // Ocorrências TCEduc direcionadas ao usuário logado (direto ou via grupo)
      const alertasOcs = [];
      eventosSnap.docs.forEach(d => {
        const ev = { id: d.id, ...d.data() };
        (ev.ocorrencias || []).forEach(oc => {
          if (!oc.status || oc.status === "Pendente") {
            let paraMim = false;
            if (oc.destinoTipo === "usuario") {
              paraMim = oc.destinoId === uid || oc.destinoId === email;
            } else if (oc.destinoTipo === "grupo") {
              paraMim = meusGrupoIds.includes(oc.destinoId);
            }
            if (paraMim) {
              alertasOcs.push({
                id: `oc_${ev.id}_${oc.id}`,
                modulo: "tceduc",
                tipo: "ocorrencia",
                titulo: `Ocorrência pendente: ${ev.municipio || ev.regiao || "Evento"}`,
                mensagem: oc.descricao,
                eventoId: ev.id,
                lido: false,
                criadoEm: oc.data,
              });
            }
          }
        });
      });

      setAlertas([...alertasBase, ...alertasOcs]);
    } catch { setAlertas([]); }
  };

  const marcarLido = async (id) => {
    // Alertas virtuais de ocorrência (id começa com "oc_") só ficam na memória
    if (id.startsWith("oc_")) {
      setAlertas(a => a.filter(al => al.id !== id));
      return;
    }
    try {
      await updateDoc(doc(db, "alertas", id), { lido: true });
    } catch(e) { console.error(e); }
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
  if (!userData) return (
    <div style={{ minHeight: "100vh", background: "#1B3F7A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 42, fontWeight: 900, color: "#fff", letterSpacing: -2 }}>IPC<span style={{ color: "#E8730A" }}>gov</span></div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, letterSpacing: 3 }}>CARREGANDO...</div>
    </div>
  );

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
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div onClick={() => onOpenModule("calendario")} style={{
                width: 44, height: 44,
                background: "rgba(255,255,255,0.12)", borderRadius: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 20,
              }}>📅</div>
              <div onClick={() => setShowDashboard(true)} style={{
                width: 44, height: 44,
                background: "rgba(255,255,255,0.12)", borderRadius: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 20,
              }}>📊</div>
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
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
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
              <div onClick={() => onOpenModule("gestao_emails")} style={{
                background: "#fff", borderRadius: 20, padding: "20px 24px",
                display: "flex", alignItems: "center", gap: 16,
                boxShadow: "0 2px 12px rgba(27,63,122,0.08)",
                cursor: "pointer", border: "2px solid #059669 22",
                transition: "transform .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "#05966918", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✉️</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1B3F7A" }}>Gestão de E-mails</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Editar templates e configurar envios</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: 24, color: "#ccc" }}>›</div>
              </div>
            </div>
          </div>
        )}

        {/* MODULES */}
        <div style={{ fontWeight: 700, fontSize: 18, color: "#1B3F7A", marginBottom: 18 }}>Módulos do Sistema</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
          {MODULES.map(mod => {
            const hasAccess = canAccess(mod.id);
            const modAlertas = alertas.filter(a => a.modulo === mod.id && !a.lido).length;
            return (
              <div key={mod.id}
                onClick={() => hasAccess && mod.available && onOpenModule(mod.id)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                  cursor: hasAccess && mod.available ? "pointer" : "default",
                  opacity: hasAccess ? 1 : 0.45,
                }}
                onMouseEnter={e => { if (hasAccess && mod.available) { const ic = e.currentTarget.firstChild; if (ic) ic.style.transform = "scale(1.06) translateY(-3px)"; } }}
                onMouseLeave={e => { const ic = e.currentTarget.firstChild; if (ic) ic.style.transform = "scale(1) translateY(0)"; }}
              >
                <div style={{
                  width: "100%", paddingBottom: "100%", borderRadius: 22, position: "relative",
                  background: mod.grad,
                  boxShadow: hasAccess ? ("0 8px 24px " + mod.color + "44") : "none",
                  transition: "transform .15s",
                  filter: hasAccess ? "none" : "grayscale(0.5)",
                  overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", width: "70%", height: "70%", borderRadius: "50%", background: "rgba(255,255,255,0.12)", top: "-20%", right: "-20%" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ transform: "scale(1.6)" }}>{MODULE_ICONS[mod.id]}</div>
                  </div>
                  {!hasAccess && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "2px 6px", fontSize: 10, color: "rgba(255,255,255,0.8)" }}>🔒</div>}
                  {(!mod.available && hasAccess) && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.35)", borderRadius: 6, padding: "2px 7px", fontSize: 9, color: "#fff", fontWeight: 700, letterSpacing: 0.5 }}>EM BREVE</div>}
                  {modAlertas > 0 && <div style={{ position: "absolute", top: 8, left: 8, background: "#fff", borderRadius: 10, padding: "2px 7px", fontSize: 10, color: mod.color, fontWeight: 800 }}>{modAlertas}</div>}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1B3F7A", marginBottom: 2 }}>{mod.name}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{mod.desc}</div>
                </div>
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
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{MODULE_ICONS[mod.id] ? <span style={{transform:"scale(0.55)"}}>{MODULE_ICONS[mod.id]}</span> : <span style={{fontSize:18}}>{mod.icon||"📌"}</span>}</div>
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

      {/* MODAL DASHBOARD */}
      {showDashboard && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setShowDashboard(false)}>
          <div style={{
            background: "#fff", borderRadius: 24,
            width: "100%", maxWidth: 560, padding: 32,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1B3F7A" }}>📊 Dashboards</div>
                <div style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>Selecione o módulo</div>
              </div>
              <div onClick={() => setShowDashboard(false)} style={{
                width: 36, height: 36, background: "#f0f4ff", borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 18, color: "#1B3F7A",
              }}>✕</div>
            </div>
            {[
              { id: "dashboard",          modulo: "tceduc",        icon: "🎓", nome: "TCEduc",        desc: "Eventos, capacitados e municípios",     color: "#1B3F7A" },
              { id: "almox_dashboard",    modulo: "almoxarifado",  icon: "🗃️", nome: "Almoxarifado",  desc: "Estoque, entradas e saídas",            color: "#059669" },
              { id: "designer_dashboard", modulo: "designer",      icon: "🎨", nome: "IPC Designer",  desc: "Atividades, status e prioridades",      color: "#7c3aed" },
              { id: "processos_dashboard",modulo: "processos",     icon: "📁", nome: "IPC Processos", desc: "Processos, prazos e andamento",         color: "#0891b2" },
            ].filter(d => canAccess(d.modulo)).map(d => (
              <div key={d.id} onClick={() => { setShowDashboard(false); onOpenModule(d.id); }} style={{
                display: "flex", alignItems: "center", gap: 16,
                background: "#f8f9fb", borderRadius: 16, padding: "18px 20px",
                cursor: "pointer", marginBottom: 12,
                border: `2px solid ${d.color}22`,
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(27,63,122,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `${d.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{MODULE_ICONS[d.modulo] ? <span style={{transform:"scale(0.65)", display:"flex"}}>{MODULE_ICONS[d.modulo]}</span> : <span style={{fontSize:26}}>{d.icon}</span>}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#1B3F7A" }}>{d.nome}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{d.desc}</div>
                </div>
                <div style={{ fontSize: 24, color: "#ccc" }}>›</div>
              </div>
            ))}
            {[
              { id: "dashboard", modulo: "tceduc" },
              { id: "almox_dashboard", modulo: "almoxarifado" },
              { id: "designer_dashboard", modulo: "designer" },
              { id: "processos_dashboard", modulo: "processos" },
            ].filter(d => canAccess(d.modulo)).length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 0", color: "#aaa", fontSize: 14 }}>
                Nenhum dashboard disponível para o seu perfil.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
