import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase/config";
import { collection, getDoc, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
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

// Helper — chave interna para autenticar APIs
async function getAuthHeader() {
  return { "X-Internal-Key": process.env.REACT_APP_INTERNAL_API_KEY || "" };
}




const VERSAO_LGPD = "v1.0-2026-03";
const TEXTO_LGPD = `Aviso de Privacidade e Tratamento de Dados Pessoais (LGPD)

Seja bem-vindo(a).

Antes de prosseguir, informamos que os dados pessoais cadastrados neste sistema serão tratados em conformidade com a Lei Geral de Proteção de Dados Pessoais – LGPD (Lei nº 13.709/2018), observando os princípios da finalidade, necessidade, adequação, segurança e transparência.

1. Finalidade do tratamento

Os dados pessoais coletados serão utilizados exclusivamente para fins administrativos, operacionais e institucionais internos, relacionados a:
• identificação do servidor(a) ou colaborador(a);
• criação e gestão de acesso ao sistema;
• organização funcional e administrativa;
• utilização de módulos e funcionalidades internas;
• registro de participação em programas, ações educacionais e atividades institucionais;
• comunicação interna autorizada, quando aplicável.

2. Dados que poderão ser tratados

Este sistema poderá utilizar os seguintes dados:
• foto de perfil;
• nome completo;
• nome pelo qual prefere ser chamado(a);
• cargo;
• setor;
• chefia imediata;
• e-mail institucional;
• data de aniversário;
• contato/telefone;
• dados necessários à criação de acesso ao sistema;
• indicação de atuação como instrutor(a) no TCEduc;
• observações iniciais.

3. Uso em comunicação interna

Quando aplicável, a foto de perfil, o nome pelo qual prefere ser chamado(a) e a data de aniversário poderão ser utilizados em comunicações internas institucionais, como homenagens, avisos e exibição em telas corporativas internas (ex.: TV Cargo), restritas ao ambiente institucional.

4. Compartilhamento de dados

Os dados pessoais não serão compartilhados com terceiros, exceto:
• nas hipóteses legalmente autorizadas;
• por obrigação legal ou regulatória;
• por determinação administrativa legítima;
• ou por necessidade operacional devidamente justificada no âmbito institucional.

5. Acesso e segurança

O acesso aos dados será restrito a usuários autorizados e aos responsáveis pela administração do sistema, observadas as medidas de segurança compatíveis com o uso interno da plataforma.
A senha inicial fornecida pelo administrador deverá ser alterada obrigatoriamente no primeiro acesso, visando maior segurança da conta.

6. Retenção, bloqueio e exclusão

Em caso de desligamento da equipe, inativação do cadastro ou encerramento da necessidade administrativa do tratamento, os dados pessoais poderão ser bloqueados, desativados ou eliminados, conforme a finalidade do cadastro e ressalvadas as hipóteses legais de guarda obrigatória, conservação de registros administrativos, auditoria, controle interno ou demais obrigações aplicáveis.

7. Ciência do usuário

Ao prosseguir, o(a) usuário(a) declara estar ciente de que seus dados serão tratados para as finalidades informadas neste aviso, no âmbito interno do sistema institucional.`;



function ModalResetarSenha({ user, onFechar }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    getDocs(collection(db, "usuarios")).then(snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.email !== user.email && u.ativo !== false)
        .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setUsuarios(lista);
      setCarregando(false);
    });
  }, []);

  const handleReset = async () => {
    if (!selecionado) return;
    if (!window.confirm("Resetar a senha de " + selecionado.nome + "? Um e-mail será enviado automaticamente.")) return;
    setProcessando(true);
    try {
      const authHdr = await getAuthHeader();

      const resp = await fetch("/api/resetar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHdr },
        body: JSON.stringify({
          uid: selecionado.id,
          nome: selecionado.nome,
          email: selecionado.email,
          adminEmail: user.email,
        }),
      });
      const dados = await resp.json();
      setResultado(dados);
    } catch(e) {
      setResultado({ sucesso: false, erro: e.message });
    }
    setProcessando(false);
  };

  const filtrados = usuarios.filter(u =>
    (u.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(busca.toLowerCase())
  );

  const estiloBase = { fontFamily:"'Montserrat',sans-serif" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20, ...estiloBase }}>
      <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:480, maxHeight:"85vh", display:"flex", flexDirection:"column", boxShadow:"0 8px 40px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ background:"#1B3F7A", borderRadius:"24px 24px 0 0", padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:"#fff", fontWeight:900, fontSize:16 }}>🔄 Resetar Senha</div>
            <div style={{ color:"rgba(255,255,255,0.5)", fontSize:11, marginTop:2 }}>Selecione o usuário para redefinir a senha</div>
          </div>
          <div onClick={onFechar} style={{ width:32, height:32, background:"rgba(255,255,255,0.1)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:16 }}>✕</div>
        </div>

        {resultado ? (
          <div style={{ padding:32, textAlign:"center", display:"flex", flexDirection:"column", gap:16, alignItems:"center" }}>
            <div style={{ fontSize:48 }}>{resultado.sucesso ? "✅" : "❌"}</div>
            <div style={{ fontWeight:700, fontSize:16, color: resultado.sucesso ? "#059669" : "#dc2626" }}>
              {resultado.sucesso ? "Senha resetada com sucesso!" : "Erro ao resetar"}
            </div>
            {resultado.sucesso && (
              <div style={{ fontSize:13, color:"#555", lineHeight:1.6, textAlign:"center" }}>
                {resultado.emailEnviado
                  ? "✉️ E-mail enviado para " + selecionado.email
                  : "⚠️ Senha resetada, mas o e-mail não foi enviado."}
                <br/>O usuário deverá alterar a senha no próximo login.
              </div>
            )}
            {!resultado.sucesso && (
              <div style={{ fontSize:13, color:"#dc2626" }}>{resultado.erro}</div>
            )}
            <div onClick={onFechar}
              style={{ background:"#1B3F7A", borderRadius:12, padding:"10px 32px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
              Fechar
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding:"16px 24px", borderBottom:"1px solid #f0f0f0" }}>
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar usuário por nome ou e-mail..."
                style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"9px 14px", fontSize:13, color:"#1B3F7A", outline:"none", boxSizing:"border-box" }}/>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"8px 12px" }}>
              {carregando ? (
                <div style={{ textAlign:"center", padding:32, color:"#aaa" }}>Carregando...</div>
              ) : filtrados.length === 0 ? (
                <div style={{ textAlign:"center", padding:32, color:"#aaa" }}>Nenhum usuário encontrado</div>
              ) : filtrados.map(u => (
                <div key={u.id} onClick={() => setSelecionado(u)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, cursor:"pointer", marginBottom:4,
                    background: selecionado?.id === u.id ? "#f0f4ff" : "transparent",
                    border: selecionado?.id === u.id ? "1.5px solid #1B3F7A" : "1.5px solid transparent" }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:"#1B3F7A20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                    {u.foto && u.foto.startsWith("http")
                      ? <img src={u.foto} alt="" style={{ width:38, height:38, borderRadius:10, objectFit:"cover" }}/>
                      : (u.nome||"?").split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#1B3F7A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.nome}</div>
                    <div style={{ fontSize:11, color:"#888", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                  </div>
                  {selecionado?.id === u.id && <div style={{ color:"#1B3F7A", fontSize:16 }}>✓</div>}
                </div>
              ))}
            </div>
            <div style={{ padding:"16px 24px", borderTop:"1px solid #f0f0f0", display:"flex", gap:10 }}>
              <div onClick={onFechar}
                style={{ flex:1, background:"#f0f4ff", borderRadius:12, padding:12, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>
                Cancelar
              </div>
              <div onClick={handleReset}
                style={{ flex:2, background:selecionado&&!processando?"#dc2626":"#ccc", borderRadius:12, padding:12, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:selecionado&&!processando?"pointer":"not-allowed" }}>
                {processando ? "Processando..." : selecionado ? "🔄 Resetar senha de " + selecionado.nome.split(" ")[0] : "Selecione um usuário"}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AlterarSenhaVoluntaria({ user, onFechar }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  const handleTrocar = async () => {
    setErro("");
    if (novaSenha.length < 8) { setErro("A nova senha deve ter pelo menos 8 caracteres."); return; }
    if (novaSenha !== confirmar) { setErro("As senhas não coincidem."); return; }
    if (!senhaAtual) { setErro("Informe a senha atual."); return; }
    setSalvando(true);
    try {
      const { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } = await import("firebase/auth");
      const auth = getAuth();
      const credential = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, novaSenha);
      setOk(true);
      setTimeout(() => onFechar(), 2000);
    } catch(e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setErro("Senha atual incorreta.");
      } else {
        setErro("Erro: " + e.message);
      }
    }
    setSalvando(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, fontFamily:"'Montserrat',sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:24, padding:36, width:"100%", maxWidth:400, boxShadow:"0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ fontWeight:900, fontSize:18, color:"#1B3F7A", marginBottom:4 }}>🔑 Alterar senha</div>
        <div style={{ fontSize:12, color:"#888", marginBottom:24 }}>{user.email}</div>
        {ok ? (
          <div style={{ textAlign:"center", padding:20, color:"#059669", fontWeight:700, fontSize:15 }}>✅ Senha alterada com sucesso!</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {["Senha atual", "Nova senha", "Confirmar nova senha"].map((label, i) => (
              <div key={i}>
                <label style={{ fontSize:11, fontWeight:700, color:"#888", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:4 }}>{label}</label>
                <input type="password"
                  value={i===0?senhaAtual:i===1?novaSenha:confirmar}
                  onChange={e => i===0?setSenhaAtual(e.target.value):i===1?setNovaSenha(e.target.value):setConfirmar(e.target.value)}
                  style={{ width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:10, padding:"10px 14px", fontSize:14, color:"#1B3F7A", outline:"none", boxSizing:"border-box" }}/>
              </div>
            ))}
            {erro && <div style={{ background:"#fee2e2", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#dc2626" }}>{erro}</div>}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <div onClick={onFechar} style={{ flex:1, background:"#f0f4ff", borderRadius:12, padding:12, textAlign:"center", fontWeight:700, fontSize:13, color:"#1B3F7A", cursor:"pointer" }}>Cancelar</div>
              <div onClick={handleTrocar} style={{ flex:2, background:salvando?"#ccc":"#1B3F7A", borderRadius:12, padding:12, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:salvando?"not-allowed":"pointer" }}>
                {salvando ? "Salvando..." : "Alterar senha"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AvisoLGPD({ user, onAceitar, onRecusar }) {
  const [aceito, setAceito] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const handleAceitar = async () => {
    if (!aceito) return;
    setSalvando(true);
    try {
      // Busca IP
      let ip = "desconhecido";
      try {
        const r = await fetch("https://api.ipify.org?format=json");
        const d = await r.json();
        ip = d.ip || "desconhecido";
      } catch(e) {}

      const agora = new Date();
      await updateDoc(doc(db, "usuarios", user.uid), {
        aceite_lgpd: true,
        data_aceite: agora.toISOString().split("T")[0],
        hora_aceite: agora.toTimeString().slice(0,8),
        ip_aceite: ip,
        versao_termo: VERSAO_LGPD,
        primeiro_login_concluido: true,
      });

      // Log de auditoria
      await addDoc(collection(db, "lgpd_aceites"), {
        usuario_id: user.uid,
        email: user.email,
        aceite_lgpd: true,
        data_aceite: agora.toISOString().split("T")[0],
        hora_aceite: agora.toTimeString().slice(0,8),
        ip_aceite: ip,
        versao_termo: VERSAO_LGPD,
        criadoEm: agora.toISOString(),
      });

      onAceitar();
    } catch(e) {
      alert("Erro ao registrar aceite: " + e.message);
    }
    setSalvando(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#042C53", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Montserrat',sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:680, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 8px 40px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ background:"#1B3F7A", borderRadius:"24px 24px 0 0", padding:"24px 32px" }}>
          <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>TCE-CE · IPC · Sistema IPCgov</div>
          <div style={{ color:"#fff", fontWeight:900, fontSize:20 }}>Aviso de Privacidade e Tratamento de Dados Pessoais</div>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:12, marginTop:4 }}>LGPD — Lei nº 13.709/2018 · Versão {VERSAO_LGPD}</div>
        </div>
        {/* Texto rolável */}
        <div style={{ flex:1, overflowY:"auto", padding:"24px 32px", fontSize:13, color:"#333", lineHeight:1.8, whiteSpace:"pre-wrap" }}>
          {TEXTO_LGPD}
        </div>
        {/* Rodapé com checkbox */}
        <div style={{ borderTop:"1px solid #e8edf2", padding:"20px 32px", display:"flex", flexDirection:"column", gap:16 }}>
          <label style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer" }}>
            <input type="checkbox" checked={aceito} onChange={e => setAceito(e.target.checked)}
              style={{ width:18, height:18, marginTop:2, cursor:"pointer", accentColor:"#1B3F7A" }}/>
            <span style={{ fontSize:13, color:"#1B3F7A", fontWeight:600, lineHeight:1.5 }}>
              Li e aceito os termos do Aviso de Privacidade e Tratamento de Dados Pessoais (LGPD).
            </span>
          </label>
          <div style={{ display:"flex", gap:12 }}>
            <div onClick={onRecusar}
              style={{ flex:1, background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:12, textAlign:"center", fontWeight:700, fontSize:13, color:"#888", cursor:"pointer" }}>
              Não aceitar e sair
            </div>
            <div onClick={handleAceitar}
              style={{ flex:2, background:aceito&&!salvando?"#1B3F7A":"#ccc", borderRadius:12, padding:12, textAlign:"center", fontWeight:700, fontSize:13, color:"#fff", cursor:aceito&&!salvando?"pointer":"not-allowed" }}>
              {salvando ? "Registrando..." : "✅ Aceitar e continuar"}
            </div>
          </div>
          <div style={{ textAlign:"center", fontSize:11, color:"#aaa" }}>{user.email}</div>
        </div>
      </div>
    </div>
  );
}

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
  const [precisaTrocarSenha, setPrecisaTrocarSenha] = useState(false);
  const [precisaAceitarLGPD, setPrecisaAceitarLGPD] = useState(false);
  const [modalAlterarSenha, setModalAlterarSenha] = useState(false);
  const [modalResetarSenha, setModalResetarSenha] = useState(false); // { grupos:[], cargoId, cargoNome, isAlmoxAdmin, isTCEducAdmin }
  const [pendAutorizacoes, setPendAutorizacoes] = useState([]); // solicitações esperando autorização deste user
  const [modalAutorizacao, setModalAutorizacao] = useState(null); // solicitação aberta para autorizar
  const [autJustificativa, setAutJustificativa] = useState("");
  const [salvandoAut, setSalvandoAut] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadUserInfo(u);
        // Verifica LGPD e senha
        try {
          const uSnap = await getDoc(doc(db, "usuarios", u.uid));
          if (uSnap.exists()) {
            const dados = uSnap.data();
            if (!dados.aceite_lgpd) setPrecisaAceitarLGPD(true);
            else if (dados.senhaAtualizada === false) setPrecisaTrocarSenha(true);
          }
        } catch(e) { console.warn("Erro ao checar status:", e); }
      } else {
        setUserInfo(null);
        setPendAutorizacoes([]);
        setPrecisaTrocarSenha(false);
        setPrecisaAceitarLGPD(false);
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

  // Tela obrigatória LGPD — antes de qualquer acesso
  if (precisaAceitarLGPD) return (
    <AvisoLGPD
      user={user}
      onAceitar={() => {
        setPrecisaAceitarLGPD(false);
        // Após aceitar LGPD, verifica se precisa trocar senha
        getDoc(doc(db, "usuarios", user.uid)).then(snap => {
          if (snap.exists() && snap.data().senhaAtualizada === false) {
            setPrecisaTrocarSenha(true);
          }
        }).catch(() => {});
      }}
      onRecusar={() => {
        import("firebase/auth").then(({ getAuth, signOut }) => signOut(getAuth()));
      }}
    />
  );

  // Tela obrigatória de troca de senha no primeiro acesso
  if (precisaTrocarSenha) return (
    <TrocaSenhaObrigatoria
      user={user}
      onConcluido={() => setPrecisaTrocarSenha(false)}
    />
  );

  // Função para forçar troca de senha em todos os usuários
  const forcarLGPDTodos = async () => {
    const ADMINS = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"];
    if (!window.confirm("Isso vai exigir que todos os usuários aceitem a LGPD e troquem a senha no próximo login. Confirma?")) return;
    try {
      const snap = await getDocs(collection(db, "usuarios"));
      let count = 0;
      for (const d of snap.docs) {
        const dados = d.data();
        if (ADMINS.includes(dados.email)) continue;
        await updateDoc(doc(db, "usuarios", d.id), { aceite_lgpd: false, senhaAtualizada: false });
        count++;
      }
      alert("✅ " + count + " usuário(s) marcado(s) para aceitar LGPD e trocar senha.");
    } catch(e) { alert("Erro: " + e.message); }
  };

  const forcarTrocaSenhasTodos = async (excluirAdmins = true) => {
    const ADMINS = ["gestaoipc@tce.ce.gov.br","fabricio@tce.ce.gov.br"];
    if (!window.confirm("Isso vai forçar a troca de senha no próximo login de todos os usuários" + (excluirAdmins ? " (exceto administradores)" : "") + ". Confirma?")) return;
    try {
      const snap = await getDocs(collection(db, "usuarios"));
      let count = 0;
      for (const d of snap.docs) {
        const dados = d.data();
        if (excluirAdmins && ADMINS.includes(dados.email)) continue;
        await updateDoc(doc(db, "usuarios", d.id), { senhaAtualizada: false });
        count++;
      }
      alert(`✅ ${count} usuário(s) marcado(s) para troca de senha no próximo login.`);
    } catch(e) {
      alert("Erro: " + e.message);
    }
  };

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
  if (currentModule === "olimpiadas_seed") { if (!userInfo?.isAdminGlobal) return null; return <OlimpiadasSeedPage onBack={() => setCurrentModule("olimpiadas")} />; }
  if (currentModule === "olimpiadas_dashboard") return <OlimpiadasDashboard user={user} onBack={() => setCurrentModule("olimpiadas")} />;
  if (currentModule === "ipc_cursos_seed_2025") { if (!userInfo?.isAdminGlobal) return null; return <IPCCursos2025SeedPage onBack={() => setCurrentModule("ipc_cursos_dashboard")} />; }
  if (currentModule === "ipc_cursos_instrutores") return <IPCCursosInstrutoresPage user={user} onBack={() => setCurrentModule("ipc_cursos")} />;
  if (currentModule === "ipc_indicadores") return <IPCIndicadoresModule user={user} userInfo={userInfo} onBack={() => setCurrentModule(null)} onDashboard={() => setCurrentModule("ipc_indicadores_dashboard")} onSeed={() => setCurrentModule("ipc_indicadores_seed")} />;
  if (currentModule === "ipc_indicadores_dashboard") return <IPCIndicadoresDashboard user={user} onBack={() => setCurrentModule("ipc_indicadores")} onIndicador={() => setCurrentModule("ipc_indicadores")} />;
  if (currentModule === "ipc_indicadores_seed") { if (!userInfo?.isAdminGlobal) return null; return <IPCIndicadoresSeedPage onBack={() => setCurrentModule("ipc_indicadores")} />; }
  if (currentModule === "tceduc_2026_seed") { if (!userInfo?.isAdminGlobal) return null; return <TCEduc2026SeedPage onBack={() => setCurrentModule("tceduc")} />; }
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

  return (
    <>
      <HomePage user={user} onOpenModule={setCurrentModule}
        onForcarTrocaSenhas={() => forcarTrocaSenhasTodos(true)}
        onForcarLGPD={forcarLGPDTodos}
        onAlterarSenha={() => setModalAlterarSenha(true)}
        onResetarSenha={() => setModalResetarSenha(true)}/>
      {modalAlterarSenha && (
        <AlterarSenhaVoluntaria user={user} onFechar={() => setModalAlterarSenha(false)}/>
      )}
      {modalResetarSenha && (
        <ModalResetarSenha user={user} onFechar={() => setModalResetarSenha(false)}/>
      )}
    </>
  );
}
