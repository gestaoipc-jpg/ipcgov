import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      onLogin(result.user);
    } catch (err) {
      setError("E-mail ou senha incorretos. Tente novamente.");
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!resetEmail) return;
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch {
      setError("E-mail não encontrado.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0d2a5e 0%, #1B3F7A 50%, #0d2a5e 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "'Montserrat', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Lora:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.3); }
        input:focus { border-color: rgba(232,115,10,0.6) !important; outline: none; }
      `}</style>

      {/* Background decoration */}
      <div style={{
        position: "absolute", bottom: -100, right: -100,
        width: 500, height: 500, opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 220' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M100,10 L160,30 L190,80 L180,140 L150,180 L100,200 L50,185 L20,140 L15,80 L40,35 Z'/%3E%3C/svg%3E")`,
        backgroundSize: "contain", backgroundRepeat: "no-repeat",
      }} />

      <div style={{
        width: "100%", maxWidth: 420,
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 24, padding: "40px 36px",
        boxShadow: "0 40px 80px rgba(0,0,0,0.4)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", letterSpacing: -3, lineHeight: 1 }}>
            IPC<span style={{ color: "#E8730A" }}>gov</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: 4, marginTop: 8, textTransform: "uppercase" }}>
            Instituto Plácido Castelo · TCE-CE
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "20px 0 0" }} />
        </div>

        {!showReset ? (
          <form onSubmit={handleLogin}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 20 }}>
              Acesse sua conta
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>E-mail</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@tce.ce.gov.br" required
                style={{
                  width: "100%", background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12,
                  color: "#fff", padding: "14px 16px", fontSize: 14,
                  transition: "border-color .2s",
                }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Senha</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••" required
                style={{
                  width: "100%", background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12,
                  color: "#fff", padding: "14px 16px", fontSize: 14,
                  transition: "border-color .2s",
                }}
              />
            </div>

            <div style={{ textAlign: "right", marginBottom: 24 }}>
              <span onClick={() => setShowReset(true)} style={{ color: "#E8730A", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                Esqueci minha senha
              </span>
            </div>

            {error && (
              <div style={{
                background: "rgba(231,76,60,0.15)", border: "1px solid rgba(231,76,60,0.3)",
                borderRadius: 10, padding: "12px 14px", marginBottom: 16,
                color: "#ff6b6b", fontSize: 13,
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%",
              background: loading ? "rgba(232,115,10,0.5)" : "linear-gradient(135deg, #E8730A, #f0920a)",
              border: "none", borderRadius: 12, padding: "16px",
              color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Montserrat', sans-serif",
              letterSpacing: 1, transition: "opacity .2s",
            }}>
              {loading ? "ENTRANDO..." : "ENTRAR"}
            </button>
          </form>
        ) : (
          <div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 20 }}>
              Digite seu e-mail para receber o link de redefinição de senha.
            </div>
            <input
              type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
              placeholder="seu@tce.ce.gov.br"
              style={{
                width: "100%", background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12,
                color: "#fff", padding: "14px 16px", fontSize: 14, marginBottom: 14,
              }}
            />
            {resetSent && (
              <div style={{ color: "#2ecc71", fontSize: 13, marginBottom: 14 }}>
                ✅ E-mail enviado! Verifique sua caixa de entrada.
              </div>
            )}
            <button onClick={handleReset} style={{
              width: "100%", background: "linear-gradient(135deg, #E8730A, #f0920a)",
              border: "none", borderRadius: 12, padding: "14px",
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif", marginBottom: 12,
            }}>ENVIAR LINK</button>
            <div onClick={() => setShowReset(false)} style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", cursor: "pointer" }}>
              ← Voltar ao login
            </div>
          </div>
        )}

        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", marginTop: 32 }}>
          IPCgov · Biênio 2026–2027
        </div>
      </div>
    </div>
  );
}
