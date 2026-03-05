import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const inputStyle = { width:"100%", background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:12, padding:"12px 14px", fontSize:14, color:"#1B3F7A", outline:"none", fontFamily:"'Montserrat',sans-serif" };
const labelStyle = { display:"block", color:"#888", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6, fontWeight:600 };

const MODULOS_NOMES = {
  tceduc:"TCEduc", designer:"IPC Designer", processos:"IPC Processos",
  almoxarifado:"Almoxarifado", pessoas:"IPC Pessoas",
};

const TEMPLATE_PADRAO = {
  assunto: "Bem-vindo(a) ao IPCgov — Seus dados de acesso",
  saudacao: "Olá, {{nome}}!",
  corpo: `Seu cadastro no sistema IPCgov — plataforma de gestão do Instituto Plácido Castelo — foi criado com sucesso.

Seus dados de acesso:
🔗 Link: https://ipcgov.vercel.app
👤 Usuário: {{email}}
🔑 Senha: {{senha}}

Módulos disponíveis para você:
{{modulos}}

Por segurança, recomendamos que você altere sua senha no primeiro acesso.

Em caso de dúvidas, entre em contato com a equipe de TI do IPC.`,
  rodape: "Atenciosamente,\nEquipe IPCgov — Instituto Plácido Castelo",
};

export default function GestaoEmailsPage({ onBack }) {
  const [templates, setTemplates] = useState({ confirmacao_cadastro: TEMPLATE_PADRAO });
  const [emailAtivo, setEmailAtivo] = useState("confirmacao_cadastro");
  const [form, setForm] = useState({ ...TEMPLATE_PADRAO });
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const snap = await getDoc(doc(db, "config_emails", "templates"));
      if (snap.exists()) {
        const data = snap.data();
        setTemplates(data);
        setForm(data[emailAtivo] || TEMPLATE_PADRAO);
      }
    } catch(e) { console.error(e); }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const atualizados = { ...templates, [emailAtivo]: form };
      await setDoc(doc(db,"config_emails","templates"), atualizados);
      setTemplates(atualizados);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch(e) { console.error(e); }
    setSalvando(false);
  };

  const previewTexto = () => {
    return form.corpo
      .replace("{{nome}}", "João da Silva")
      .replace("{{email}}", "joao.silva@tce.ce.gov.br")
      .replace("{{senha}}", "Tce1234567890!@#")
      .replace("{{modulos}}", "• 🎓 TCEduc\n• 🎨 IPC Designer");
  };

  return (
    <div style={{ minHeight:"100vh", background:"#E8EDF2", fontFamily:"'Montserrat',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-thumb{background:#1B3F7A44;border-radius:3px} select,input,textarea{font-family:'Montserrat',sans-serif}`}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 32px 32px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
            <div onClick={onBack} style={{ width:40, height:40, background:"rgba(255,255,255,0.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", fontSize:20 }}>←</div>
            <div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3 }}>ADMINISTRAÇÃO</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:22 }}>✉️ Gestão de E-mails</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"24px 32px 80px", display:"grid", gridTemplateColumns:"240px 1fr", gap:24 }}>

        {/* SIDEBAR — tipos de e-mail */}
        <div>
          <div style={{ fontWeight:700, fontSize:12, color:"#aaa", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Templates</div>
          {[
            { id:"confirmacao_cadastro", icon:"👤", label:"Confirmação de Cadastro", desc:"Enviado ao criar acesso" },
          ].map(t => (
            <div key={t.id} onClick={() => { setEmailAtivo(t.id); setForm(templates[t.id]||TEMPLATE_PADRAO); }} style={{ background:emailAtivo===t.id?"#1B3F7A":"#fff", borderRadius:16, padding:"16px", marginBottom:10, cursor:"pointer", boxShadow:"0 2px 8px rgba(27,63,122,0.08)", border:`2px solid ${emailAtivo===t.id?"#1B3F7A":"transparent"}` }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{t.icon}</div>
              <div style={{ fontWeight:700, fontSize:13, color:emailAtivo===t.id?"#fff":"#1B3F7A" }}>{t.label}</div>
              <div style={{ fontSize:11, color:emailAtivo===t.id?"rgba(255,255,255,0.6)":"#888", marginTop:3 }}>{t.desc}</div>
            </div>
          ))}

          <div style={{ marginTop:20, background:"#f0f4ff", borderRadius:14, padding:"14px", fontSize:12, color:"#1B3F7A" }}>
            <div style={{ fontWeight:700, marginBottom:6 }}>📌 Variáveis disponíveis</div>
            {["{{nome}}","{{email}}","{{senha}}","{{modulos}}"].map(v => (
              <div key={v} style={{ background:"#fff", borderRadius:6, padding:"3px 8px", marginBottom:4, fontSize:11, fontFamily:"monospace", color:"#7c3aed" }}>{v}</div>
            ))}
          </div>
        </div>

        {/* EDITOR */}
        <div>
          <div style={{ display:"flex", gap:10, marginBottom:20 }}>
            <div onClick={()=>setPreview(false)} style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:10, background:!preview?"#1B3F7A":"#fff", color:!preview?"#fff":"#1B3F7A", fontWeight:700, fontSize:13, cursor:"pointer", boxShadow:"0 1px 4px rgba(27,63,122,0.1)" }}>✏️ Editar</div>
            <div onClick={()=>setPreview(true)} style={{ flex:1, textAlign:"center", padding:"9px", borderRadius:10, background:preview?"#1B3F7A":"#fff", color:preview?"#fff":"#1B3F7A", fontWeight:700, fontSize:13, cursor:"pointer", boxShadow:"0 1px 4px rgba(27,63,122,0.1)" }}>👁️ Preview</div>
          </div>

          {!preview ? (
            <div style={{ background:"#fff", borderRadius:20, padding:"28px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                <div>
                  <label style={labelStyle}>Assunto do E-mail</label>
                  <input value={form.assunto||""} onChange={e=>setForm(f=>({...f,assunto:e.target.value}))} style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Saudação inicial</label>
                  <input value={form.saudacao||""} onChange={e=>setForm(f=>({...f,saudacao:e.target.value}))} placeholder="Ex: Olá, {{nome}}!" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Corpo do E-mail</label>
                  <textarea value={form.corpo||""} onChange={e=>setForm(f=>({...f,corpo:e.target.value}))} style={{ ...inputStyle, minHeight:260, resize:"vertical", lineHeight:1.7 }}/>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:4 }}>Use as variáveis ao lado para personalização automática</div>
                </div>
                <div>
                  <label style={labelStyle}>Rodapé / Assinatura</label>
                  <textarea value={form.rodape||""} onChange={e=>setForm(f=>({...f,rodape:e.target.value}))} style={{ ...inputStyle, minHeight:80, resize:"vertical" }}/>
                </div>
              </div>

              <div style={{ display:"flex", gap:10, marginTop:24 }}>
                <button onClick={salvar} disabled={salvando} style={{ flex:1, background:salvando?"#ccc":"linear-gradient(135deg,#1B3F7A,#2a5ba8)", border:"none", borderRadius:14, padding:14, color:"#fff", fontWeight:700, fontSize:15, cursor:salvando?"not-allowed":"pointer", fontFamily:"'Montserrat',sans-serif" }}>
                  {salvando ? "Salvando..." : salvo ? "✅ Salvo!" : "💾 Salvar Template"}
                </button>
                <button onClick={()=>setForm({...TEMPLATE_PADRAO})} style={{ background:"#f8f9fb", border:"1px solid #e8edf2", borderRadius:14, padding:"14px 20px", color:"#888", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>↺ Restaurar padrão</button>
              </div>
            </div>
          ) : (
            /* PREVIEW */
            <div style={{ background:"#fff", borderRadius:20, padding:"28px", boxShadow:"0 2px 12px rgba(27,63,122,0.08)" }}>
              <div style={{ background:"#f0f4ff", borderRadius:12, padding:"10px 14px", marginBottom:20, fontSize:12, color:"#1B3F7A", fontWeight:600 }}>
                📧 Preview com dados de exemplo
              </div>
              {/* Simulação de e-mail */}
              <div style={{ border:"1px solid #e8edf2", borderRadius:16, overflow:"hidden" }}>
                <div style={{ background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", padding:"20px 24px" }}>
                  <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, marginBottom:4 }}>ASSUNTO</div>
                  <div style={{ color:"#fff", fontWeight:700, fontSize:15 }}>{form.assunto}</div>
                </div>
                <div style={{ padding:"24px" }}>
                  <div style={{ fontWeight:700, fontSize:16, color:"#1B3F7A", marginBottom:16 }}>{form.saudacao?.replace("{{nome}}","João da Silva")}</div>
                  <div style={{ fontSize:14, color:"#333", lineHeight:1.8, whiteSpace:"pre-wrap", marginBottom:20 }}>{previewTexto()}</div>
                  <div style={{ borderTop:"1px solid #e8edf2", paddingTop:16, fontSize:13, color:"#888", whiteSpace:"pre-wrap" }}>{form.rodape}</div>
                  <div style={{ marginTop:20, textAlign:"center" }}>
                    <div style={{ display:"inline-block", background:"linear-gradient(135deg,#1B3F7A,#2a5ba8)", borderRadius:12, padding:"12px 28px", color:"#fff", fontWeight:700, fontSize:14 }}>🔗 Acessar IPCgov</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
