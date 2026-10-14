const { google } = require("googleapis");

const PASTAS = {
  ipcmidiaindoor: "1tqsEA3unM4kEyV8bQy5DicoI7WU2l5SX",
  ipcpessoas: "15_35hi3Bn6Y4Do3TzKvXX6X8MtFTza9I",
  ipctceduc: "1s-Vgn85xRgy7tGZLwHdDbQLUJYGN0BRV",
  ipctceduc_apresentacoes: "1z5CUfR7lU6Bz5VO6YLmJTWn21Zc73C6u",
};

function normalizarNome(modulo, nomeOriginal) {
  const timestamp = Date.now();
  const nomeLimpo = nomeOriginal
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase();
  return `${modulo}_${timestamp}_${nomeLimpo}`;
}


async function verificarToken(req) {
  const header = req.headers["authorization"] || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw Object.assign(new Error("Token ausente."), { status: 401 });
  try {
    const { initializeApp, cert, getApps } = require("firebase-admin/app");
    const { getAuth } = require("firebase-admin/auth");
    if (!getApps().length) {
      initializeApp({ credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
        privateKey:  (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      })});
    }
    return await getAuth().verifyIdToken(token);
  } catch(e) {
    if (e.status) throw e;
    throw Object.assign(new Error("Token inválido ou expirado."), { status: 401 });
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  try { await verificarToken(req); } catch(e) { return res.status(e.status||401).json({ erro: e.message }); }

  const body = req.body;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const client = await auth.getClient();
    const tokenObj = await client.getAccessToken();
    const accessToken = tokenObj.token;

    // ── Ação: tornar público ──
    if (body.action === "publicar") {
      const { fileId } = body;
      if (!fileId) return res.status(400).json({ erro: "fileId obrigatório" });

      // Usa fetch com o token para criar permissão
      const permResp = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "reader", type: "anyone" }),
        }
      );
      if (!permResp.ok) {
        const err = await permResp.text();
        throw new Error("Erro ao publicar: " + err);
      }
      return res.status(200).json({
        sucesso: true, fileId,
        linkVisualizacao: `https://drive.google.com/file/d/${fileId}/view`,
        linkDireto: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
      });
    }

    // ── Ação: preparar upload — retorna token + metadados ──
    const { modulo, nomeArquivo, tipoArquivo, tamanho } = body;
    if (!modulo || !nomeArquivo || !tipoArquivo) {
      return res.status(400).json({ erro: "modulo, nomeArquivo e tipoArquivo são obrigatórios" });
    }

    const pastaId = PASTAS[modulo];
    if (!pastaId) return res.status(400).json({ erro: "Módulo não reconhecido: " + modulo });

    const nomeFinal = normalizarNome(modulo, nomeArquivo);

    // Inicia sessão de upload resumável no servidor (sem CORS problem pois é server-to-server)
    const initResp = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": tipoArquivo,
          ...(tamanho ? { "X-Upload-Content-Length": String(tamanho) } : {}),
        },
        body: JSON.stringify({ name: nomeFinal, parents: [pastaId] }),
      }
    );

    if (!initResp.ok) {
      const errText = await initResp.text();
      throw new Error("Erro ao iniciar sessão: " + errText);
    }

    const uploadUrl = initResp.headers.get("location");
    if (!uploadUrl) throw new Error("URL de upload não retornada");

    // Devolve a uploadUrl para o frontend — o Google permite PUT na uploadUrl sem CORS
    // pois a URL já contém o token embutido (upload session URL)
    return res.status(200).json({
      sucesso: true,
      uploadUrl,
      nomeFinal,
    });

  } catch (erro) {
    console.error("Erro upload-resumable:", erro);
    return res.status(500).json({ erro: erro.message });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};
