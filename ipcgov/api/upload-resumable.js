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

// ── PASSO 1: Gera URL de upload resumável ──
// Frontend chama POST /api/upload-resumable com { modulo, nomeArquivo, tipoArquivo }
// Recebe { uploadUrl, fileId } e faz o upload direto para o Google
// ── PASSO 2: Torna público ──
// Frontend chama POST /api/upload-resumable com { action: "publicar", fileId }

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

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
    const token = await client.getAccessToken();
    const accessToken = token.token;

    // ── Ação: tornar público após upload ──
    if (body.action === "publicar") {
      const { fileId } = body;
      if (!fileId) return res.status(400).json({ erro: "fileId obrigatório" });

      const drive = google.drive({ version: "v3", auth });
      await drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: { role: "reader", type: "anyone" },
      });

      return res.status(200).json({
        sucesso: true,
        fileId,
        linkVisualizacao: `https://drive.google.com/file/d/${fileId}/view`,
        linkDireto: `https://lh3.googleusercontent.com/d/${fileId}`,
      });
    }

    // ── Ação: iniciar upload resumável ──
    const { modulo, nomeArquivo, tipoArquivo, tamanho } = body;
    if (!modulo || !nomeArquivo || !tipoArquivo) {
      return res.status(400).json({ erro: "modulo, nomeArquivo e tipoArquivo são obrigatórios" });
    }

    const pastaId = PASTAS[modulo];
    if (!pastaId) return res.status(400).json({ erro: "Módulo não reconhecido: " + modulo });

    const nomeFinal = normalizarNome(modulo, nomeArquivo);

    // Inicia sessão de upload resumável no Google Drive
    const metadata = {
      name: nomeFinal,
      parents: [pastaId],
    };

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
        body: JSON.stringify(metadata),
      }
    );

    if (!initResp.ok) {
      const errText = await initResp.text();
      throw new Error("Erro ao iniciar upload: " + errText);
    }

    const uploadUrl = initResp.headers.get("location");
    if (!uploadUrl) throw new Error("URL de upload não retornada pelo Google");

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
