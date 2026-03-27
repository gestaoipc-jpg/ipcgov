const { google } = require("googleapis");
const { PassThrough } = require("stream");

const PASTAS = {
  ipcmidiaindoor: "1tqsEA3unM4kEyV8bQy5DicoI7WU2l5SX",
  ipcpessoas: "15_35hi3Bn6Y4Do3TzKvXX6X8MtFTza9I",
  ipctceduc: "1s-Vgn85xRgy7tGZLwHdDbQLUJYGN0BRV",
  ipctceduc_apresentacoes: "1z5CUfR7lU6Bz5VO6YLmJTWn21Zc73C6u",
};

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

function normalizarNome(modulo, nomeOriginal) {
  const timestamp = Date.now();
  const nomeLimpo = nomeOriginal
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase();
  return `${modulo}_${timestamp}_${nomeLimpo}`;
}


// Verifica Firebase ID Token (usa Firebase Admin já inicializado ou inicializa uma vez)
async function verificarToken(req) {
  const header = req.headers["authorization"] || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw Object.assign(new Error("Token ausente."), { status: 401 });
  try {
    const { initializeApp, cert, getApps } = require("firebase-admin/app");
    const { getAuth } = require("firebase-admin/auth");
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
          privateKey:  (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
      });
    }
    return await getAuth().verifyIdToken(token);
  } catch(e) {
    if (e.status === 401) throw e;
    throw Object.assign(new Error("Token inválido ou expirado."), { status: 401 });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try { await verificarToken(req); } catch(e) { return res.status(e.status||401).json({ erro: e.message }); }

  try {
    const modulo = req.headers["x-modulo"];
    const nomeArquivo = decodeURIComponent(req.headers["x-nome-arquivo"] || "arquivo");
    const tipoArquivo = req.headers["x-tipo-arquivo"] || "application/octet-stream";
    const publico = req.headers["x-publico"] !== "false";

    if (!modulo) return res.status(400).json({ erro: "Header X-Modulo obrigatório" });

    const pastaId = PASTAS[modulo];
    if (!pastaId) return res.status(400).json({ erro: "Módulo não reconhecido: " + modulo });

    const drive = autenticar();
    const nomeFinal = normalizarNome(modulo, nomeArquivo);

    // Cria um PassThrough para fazer pipe do request para o Google Drive
    const passThrough = new PassThrough();
    req.pipe(passThrough);

    const resposta = await drive.files.create({
      supportsAllDrives: true,
      requestBody: { name: nomeFinal, parents: [pastaId] },
      media: { mimeType: tipoArquivo, body: passThrough },
      fields: "id, name",
    });

    const fileId = resposta.data.id;

    // Torna público
    if (publico) {
      await drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: { role: "reader", type: "anyone" },
      });
    }

    return res.status(200).json({
      sucesso: true,
      fileId,
      nome: nomeFinal,
      nomeOriginal: nomeArquivo,
      linkDireto: `https://lh3.googleusercontent.com/d/${fileId}`,
      linkVisualizacao: `https://drive.google.com/file/d/${fileId}/view`,
      publico,
    });

  } catch (erro) {
    console.error("Erro upload-stream:", erro);
    return res.status(500).json({ erro: "Erro ao fazer upload: " + erro.message });
  }
};

// Desativa o body parser para receber o stream bruto
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
