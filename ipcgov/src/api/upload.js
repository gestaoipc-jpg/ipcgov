const { google } = require("googleapis");

// Pastas por módulo
const PASTAS = {
  ipcmidiaindoor: "1ArG684gg8Vr3Er9pDijHyHeuRcj_hrz4",
};

// Tipos de arquivo permitidos
const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
];

// Tamanho máximo: 50MB
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
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });
}

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const { nomeArquivo, tipoArquivo, tamanho, modulo, publico, conteudoBase64 } = req.body;

    // Validações
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

    // Autenticar
    const drive = autenticar();

    // Converter base64 para buffer
    const buffer = Buffer.from(conteudoBase64, "base64");
    const { Readable } = require("stream");
    const stream = Readable.from(buffer);

    // Fazer upload
    const resposta = await drive.files.create({
      requestBody: {
        name: nomeArquivo,
        parents: [pastaId],
      },
      media: {
        mimeType: tipoArquivo,
        body: stream,
      },
      fields: "id, name, webViewLink, webContentLink",
    });

    const fileId = resposta.data.id;

    // Tornar público se solicitado
    if (publico) {
      await tornarPublico(drive, fileId);
    }

    // Montar link direto para imagem
    const linkDireto = `https://drive.google.com/uc?export=view&id=${fileId}`;
    const linkVisualizacao = `https://drive.google.com/file/d/${fileId}/view`;

    return res.status(200).json({
      sucesso: true,
      fileId,
      nome: resposta.data.name,
      linkDireto,
      linkVisualizacao,
      publico: !!publico,
    });

  } catch (erro) {
    console.error("Erro no upload:", erro);
    return res.status(500).json({ erro: "Erro ao fazer upload: " + erro.message });
  }
}
