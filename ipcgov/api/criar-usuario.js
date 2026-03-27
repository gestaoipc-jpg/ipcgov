const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

// Inicializa Firebase Admin apenas uma vez
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
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
  // Apenas POST
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try { await verificarToken(req); } catch(e) { return res.status(e.status||401).json({ erro: e.message }); }

  const { email, nome, cargo, setor, perfil, modulos, servidorId } = req.body;

  if (!email || !nome) {
    return res.status(400).json({ erro: "E-mail e nome são obrigatórios" });
  }

  try {
    const auth = getAuth();
    const db = getFirestore();

    // Cria usuário no Firebase Auth com senha padrão
    const userRecord = await auth.createUser({
      email,
      password: process.env.SENHA_PADRAO,
      displayName: nome,
    });

    // Salva dados no Firestore
    await db.collection("usuarios").doc(userRecord.uid).set({
      email,
      nome,
      cargo: cargo || "",
      setor: setor || "",
      perfil: perfil || "usuario",
      modulos: modulos || [],
      ativo: true,
      servidorId: servidorId || null,
      senhaAtualizada: false, // flag para forçar troca de senha
      criadoEm: new Date().toISOString(),
    });

    return res.status(200).json({ sucesso: true, uid: userRecord.uid });

  } catch (err) {
    console.error("Erro ao criar usuário:", err);
    const msg = err.code === "auth/email-already-exists"
      ? "E-mail já cadastrado no sistema."
      : err.message;
    return res.status(500).json({ erro: msg });
  }
};
