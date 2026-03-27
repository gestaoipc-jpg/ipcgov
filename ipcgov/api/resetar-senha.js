const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const EMAILJS_SERVICE   = "service_m6wjek9";
const EMAILJS_TEMPLATE  = "template_lglpt37";
const EMAILJS_PUBLIC_KEY = "j--nV6wNKs8Pqyxlo";

async function enviarEmailReset(nomeUsuario, emailUsuario, adminEmail) {
  const corpo_completo =
`Prezado(a) ${nomeUsuario},

Informamos que sua senha de acesso ao sistema foi redefinida pelo administrador.

Sua nova senha temporária é: ${process.env.SENHA_PADRAO}

Por segurança, no seu próximo acesso será obrigatória a alteração da senha antes da liberação do uso do sistema.

Em caso de dúvidas, entre em contato com a administração do sistema.

Atenciosamente,
Instituto Plácido Castelo

🔗 Acesse: https://ipcgov.vercel.app`;

  const payload = {
    service_id:  EMAILJS_SERVICE,
    template_id: EMAILJS_TEMPLATE,
    user_id:     EMAILJS_PUBLIC_KEY,
    template_params: {
      to_name:        nomeUsuario,
      to_email:       emailUsuario,
      subject:        "Redefinição de Senha – Acesso ao Sistema",
      corpo_completo,
    },
  };

  const resp = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error("Erro ao enviar e-mail: " + err);
  }
}


// Verifica Firebase ID Token
async function verificarToken(req) {
  const chaveRecebida = req.headers["x-internal-key"] || "";
  const chaveEsperada = process.env.INTERNAL_API_KEY || "";
  if (!chaveEsperada) throw Object.assign(new Error("Configuração ausente."), { status: 500 });
  if (!chaveRecebida || chaveRecebida !== chaveEsperada) {
    throw Object.assign(new Error("Não autorizado."), { status: 401 });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try { await verificarToken(req); } catch(e) { return res.status(e.status||401).json({ erro: e.message }); }

  const { uid, nome, email, adminEmail } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ erro: "uid e email são obrigatórios" });
  }

  try {
    const auth = getAuth();
    const db   = getFirestore();

    // 1. Redefine a senha via Firebase Admin
    await auth.updateUser(uid, { password: process.env.SENHA_PADRAO });

    // 1b. Revoga todos os refresh tokens — força logout imediato
    await auth.revokeRefreshTokens(uid);

    const agora = new Date();

    // 2. Atualiza flags no Firestore
    await db.collection("usuarios").doc(uid).update({
      senhaAtualizada:          false,
      senha_resetada_por_admin: true,
      data_reset_senha:         agora.toISOString(),
      admin_responsavel_reset:  adminEmail || "desconhecido",
    });

    // 3. Log de auditoria
    await db.collection("reset_senha_logs").add({
      usuario_uid:             uid,
      usuario_email:           email,
      usuario_nome:            nome || "",
      admin_responsavel:       adminEmail || "desconhecido",
      data_reset:              agora.toISOString().split("T")[0],
      hora_reset:              agora.toTimeString().slice(0, 8),
      email_enviado:           false, // atualizado abaixo
      criadoEm:                agora.toISOString(),
    });

    // 4. Envia e-mail (server-side — senha nunca toca o frontend)
    let emailEnviado = false;
    try {
      await enviarEmailReset(nome || email, email, adminEmail);
      emailEnviado = true;
    } catch(e) {
      console.error("Erro e-mail reset:", e.message);
    }

    // 5. Atualiza log com status do e-mail
    const logSnap = await db.collection("reset_senha_logs")
      .where("usuario_uid", "==", uid)
      .orderBy("criadoEm", "desc")
      .limit(1)
      .get();
    if (!logSnap.empty) {
      await logSnap.docs[0].ref.update({ email_enviado: emailEnviado });
    }

    return res.status(200).json({
      sucesso: true,
      emailEnviado,
      mensagem: emailEnviado
        ? "Senha resetada e e-mail enviado com sucesso."
        : "Senha resetada. Não foi possível enviar o e-mail.",
    });

  } catch(err) {
    console.error("Erro reset-senha:", err);
    return res.status(500).json({ erro: err.message });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};
