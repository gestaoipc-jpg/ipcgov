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

function autenticar() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return auth;
}


// Verifica Firebase ID Token (usa Firebase Admin já inicializado ou inicializa uma vez)
async function verificarToken(req) {
  const chaveRecebida = req.headers["x-internal-key"] || "";
  const chaveEsperada = process.env.INTERNAL_API_KEY || "";
  if (!chaveEsperada) throw Object.assign(new Error("Configuração ausente."), { status: 500 });
  if (!chaveRecebida || chaveRecebida !== chaveEsperada) {
    throw Object.assign(new Error("Não autorizado."), { status: 401 });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido" });

  try { await verificarToken(req); } catch(e) { return res.status(e.status||401).json({ erro: e.message }); }

  const body = req.body;
  const acao = body.acao;

  try {
    const auth = autenticar();
    const client = await auth.getClient();
    const tokenObj = await client.getAccessToken();
    const accessToken = tokenObj.token;

    // ── AÇÃO: iniciar sessão de upload ──
    if (acao === "iniciar") {
      const { modulo, nomeArquivo, tipoArquivo, tamanho } = body;
      if (!modulo || !nomeArquivo || !tipoArquivo || !tamanho) {
        return res.status(400).json({ erro: "Campos obrigatórios: modulo, nomeArquivo, tipoArquivo, tamanho" });
      }
      const pastaId = PASTAS[modulo];
      if (!pastaId) return res.status(400).json({ erro: "Módulo não reconhecido: " + modulo });

      const nomeFinal = normalizarNome(modulo, nomeArquivo);

      const initResp = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": tipoArquivo,
            "X-Upload-Content-Length": String(tamanho),
          },
          body: JSON.stringify({ name: nomeFinal, parents: [pastaId] }),
        }
      );

      if (!initResp.ok) throw new Error("Erro ao iniciar: " + await initResp.text());
      const uploadUrl = initResp.headers.get("location");

      return res.status(200).json({ sucesso: true, uploadUrl, nomeFinal });
    }

    // ── AÇÃO: enviar chunk ──
    if (acao === "chunk") {
      const { uploadUrl, chunkBase64, contentRange, tipoArquivo } = body;
      if (!uploadUrl || !chunkBase64 || !contentRange) {
        return res.status(400).json({ erro: "uploadUrl, chunkBase64 e contentRange são obrigatórios" });
      }

      const chunkBuffer = Buffer.from(chunkBase64, "base64");

      const chunkResp = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Range": contentRange,
          "Content-Type": tipoArquivo || "application/octet-stream",
        },
        body: chunkBuffer,
      });

      // 308 = chunk aceito, aguardando mais
      // 200/201 = upload completo
      if (chunkResp.status === 308) {
        return res.status(200).json({ sucesso: true, concluido: false });
      }
      if (chunkResp.status === 200 || chunkResp.status === 201) {
        const data = await chunkResp.json().catch(() => ({}));
        return res.status(200).json({ sucesso: true, concluido: true, fileId: data.id });
      }

      const errText = await chunkResp.text();
      return res.status(200).json({ sucesso: false, erro: "Chunk falhou " + chunkResp.status + ": " + errText });
    }

    // ── AÇÃO: publicar ──
    if (acao === "publicar") {
      const { fileId } = body;
      if (!fileId) return res.status(400).json({ erro: "fileId obrigatório" });

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
      if (!permResp.ok) throw new Error("Erro ao publicar: " + await permResp.text());

      return res.status(200).json({
        sucesso: true, fileId,
        linkVisualizacao: `https://drive.google.com/file/d/${fileId}/view`,
        linkDireto: `https://lh3.googleusercontent.com/d/${fileId}`,
      });
    }

    return res.status(400).json({ erro: "Ação não reconhecida: " + acao });

  } catch (erro) {
    console.error("Erro upload-chunk:", erro);
    return res.status(500).json({ erro: erro.message });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: "4mb" } },
};
