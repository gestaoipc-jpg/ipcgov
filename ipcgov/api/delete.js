const { google } = require("googleapis");
const { initializeApp: initAdminApp, cert, getApps } = require("firebase-admin/app");
const { getAuth: getAdminAuth } = require("firebase-admin/auth");
if (!getApps().length) {
  initAdminApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\n/g, "\n"),
    }),
  });
}
const adminAuth = getAdminAuth();


function autenticar() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}


// Verifica Firebase ID Token
// Verifica Firebase ID Token (usa Firebase Admin já inicializado ou inicializa uma vez)
async function verificarToken(req) {
  const header = req.headers["authorization"] || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw Object.assign(new Error("Token ausente."), { status: 401 });
  if (!adminAuth) throw Object.assign(new Error("Configuração de autenticação ausente."), { status: 500 });
  try {
    return await adminAuth.verifyIdToken(token);
  } catch(e) {
    throw Object.assign(new Error("Token inválido ou expirado."), { status: 401 });
  }
}
}

module.exports = async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try { await verificarToken(req); } catch(e) { return res.status(e.status||401).json({ erro: e.message }); }

  const { fileId } = req.body;
  if (!fileId) {
    return res.status(400).json({ erro: "fileId não informado" });
  }

  try {
    const drive = autenticar();
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });
    return res.status(200).json({ sucesso: true });
  } catch (erro) {
    if (erro.code === 404) {
      return res.status(200).json({ sucesso: true, aviso: "Arquivo não encontrado no Drive" });
    }
    console.error("Erro ao excluir do Drive:", erro);
    return res.status(500).json({ erro: "Erro ao excluir: " + erro.message });
  }
};
