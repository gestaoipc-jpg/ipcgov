const { google } = require("googleapis");
const { Readable } = require("stream");

const PASTAS = {
  ipcmidiaindoor: "1tqsEA3unM4kEyV8bQy5DicoI7WU2l5SX",
};

const TIPOS_PERMITIDOS = [
  "image/jpeg","image/png","image/gif","image/webp",
  "video/mp4","video/quicktime","application/pdf",
];

const TAMANHO_MAXIMO = 50 * 1024 * 1024;

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

async function tornarPublico(drive, fileId) {
  await drive.permissions.create({
    fileId,
    supportsAllDrives: true,
    requestBody: { role: "reader", type: "anyone" },
  });
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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const { nomeArquivo, tipoArquivo, tamanho, modulo, publico, conteudoBase64 } = req.body;

    if (!nomeArquivo || !tipoArquivo || !modulo || !conteudoBase64) {
      return res.status(400).json({ erro: "Dados incompletos" });
    }
    if (!TIPOS_PERMITIDOS.includes(tipoArquivo)) {
      return res.status(400).json({ erro: "Tipo de arquivo não permitido" });
    }
    if (tamanho > TAMANHO_MAXIMO) {
      return res.status(400).json({ erro: "Arquivo muito grande. Máximo 50MB" });
    }
    const pastaId = PASTAS[modulo];
    if (!pastaId) {
      return res.status(400).json({ erro: "Módulo não reconhecido" });
    }

    const drive = autenticar();
    const nomeFinal = normalizarNome(modulo, nomeArquivo);
    const buffer = Buffer.from(conteudoBase64, "base64");
    const stream = Readable.from(buffer);

    const resposta = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: nomeFinal,
        parents: [pastaId],
      },
      media: {
        mimeType: tipoArquivo,
        body: stream,
      },
      fields: "id, name, webViewLink, webContentLink",
    });

    const fileId = resposta.data.id;
    if (publico) await tornarPublico(drive, fileId);

    const linkDireto = `https://lh3.googleusercontent.com/d/${fileId}`;
    const linkVisualizacao = `https://drive.google.com/file/d/${fileId}/view`;

    return res.status(200).json({
      sucesso: true,
      fileId,
      nome: nomeFinal,
      nomeOriginal: nomeArquivo,
      linkDireto,
      linkVisualizacao,
      publico: !!publico,
    });

  } catch (erro) {
    console.error("Erro no upload:", erro);
    return res.status(500).json({ erro: "Erro ao fazer upload: " + erro.message });
  }
};
