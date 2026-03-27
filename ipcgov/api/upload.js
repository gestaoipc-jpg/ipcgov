const { google } = require("googleapis");
const { Readable } = require("stream");

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

// Lê body completo como Buffer
function lerBodyBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Parse manual de multipart/form-data
function parseMultipart(buffer, boundary) {
  const campos = {};
  let fileBuffer = null;
  let fileName = "";
  let fileMime = "application/octet-stream";

  const boundaryBuf = Buffer.from("--" + boundary);
  const partes = [];
  let inicio = 0;

  // Encontra todas as partes
  while (true) {
    const idx = buffer.indexOf(boundaryBuf, inicio);
    if (idx === -1) break;
    if (inicio > 0) partes.push(buffer.slice(inicio, idx - 2)); // remove CRLF antes do boundary
    inicio = idx + boundaryBuf.length + 2; // pula boundary + CRLF
  }

  partes.forEach(parte => {
    // Separa headers do body
    const separador = parte.indexOf(Buffer.from("\r\n\r\n"));
    if (separador === -1) return;
    const headerStr = parte.slice(0, separador).toString("utf8");
    const body = parte.slice(separador + 4);

    const dispMatch = headerStr.match(/Content-Disposition:[^\r\n]*name="([^"]+)"/i);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
    const mimeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
    const campo = dispMatch ? dispMatch[1] : null;

    if (filenameMatch) {
      // É um arquivo
      fileName = filenameMatch[1];
      fileMime = mimeMatch ? mimeMatch[1].trim() : "application/octet-stream";
      fileBuffer = body;
    } else if (campo) {
      campos[campo] = body.toString("utf8").trim();
    }
  });

  return { campos, fileBuffer, fileName, fileMime };
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
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try { await verificarToken(req); } catch(e) { return res.status(e.status||401).json({ erro: e.message }); }

  const contentType = req.headers["content-type"] || "";

  try {
    // ── Modo multipart/form-data ──
    if (contentType.includes("multipart/form-data")) {
      const boundaryMatch = contentType.match(/boundary=([^;]+)/);
      if (!boundaryMatch) return res.status(400).json({ erro: "Boundary não encontrado" });
      const boundary = boundaryMatch[1].trim();

      const bodyBuffer = await lerBodyBuffer(req);
      const { campos, fileBuffer, fileName, fileMime } = parseMultipart(bodyBuffer, boundary);

      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({ erro: "Nenhum arquivo recebido" });
      }

      const modulo = campos.modulo;
      const nomeArquivo = campos.nomeArquivo || fileName;
      const publico = campos.publico === "true";
      const pastaId = PASTAS[modulo];

      if (!pastaId) return res.status(400).json({ erro: "Módulo não reconhecido: " + modulo });

      const drive = autenticar();
      const nomeFinal = normalizarNome(modulo, nomeArquivo);
      const stream = Readable.from(fileBuffer);

      const resposta = await drive.files.create({
        supportsAllDrives: true,
        requestBody: { name: nomeFinal, parents: [pastaId] },
        media: { mimeType: fileMime, body: stream },
        fields: "id, name",
      });

      const fileId = resposta.data.id;
      if (publico) await tornarPublico(drive, fileId);

      return res.status(200).json({
        sucesso: true, fileId,
        nome: nomeFinal,
        nomeOriginal: nomeArquivo,
        linkDireto: `https://lh3.googleusercontent.com/d/${fileId}`,
        linkVisualizacao: `https://drive.google.com/file/d/${fileId}/view`,
        publico,
      });
    }

    // ── Modo JSON/base64 (imagens pequenas) ──
    const raw = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    const body = JSON.parse(raw);
    const { nomeArquivo, tipoArquivo, modulo, publico, conteudoBase64 } = body;

    if (!nomeArquivo || !tipoArquivo || !modulo || !conteudoBase64) {
      return res.status(400).json({ erro: "Dados incompletos" });
    }

    const pastaId = PASTAS[modulo];
    if (!pastaId) return res.status(400).json({ erro: "Módulo não reconhecido" });

    const drive = autenticar();
    const nomeFinal = normalizarNome(modulo, nomeArquivo);
    const buffer = Buffer.from(conteudoBase64, "base64");
    const stream = Readable.from(buffer);

    const resposta = await drive.files.create({
      supportsAllDrives: true,
      requestBody: { name: nomeFinal, parents: [pastaId] },
      media: { mimeType: tipoArquivo, body: stream },
      fields: "id, name",
    });

    const fileId = resposta.data.id;
    if (publico) await tornarPublico(drive, fileId);

    return res.status(200).json({
      sucesso: true, fileId,
      nome: nomeFinal,
      nomeOriginal: nomeArquivo,
      linkDireto: `https://lh3.googleusercontent.com/d/${fileId}`,
      linkVisualizacao: `https://drive.google.com/file/d/${fileId}/view`,
      publico: !!publico,
    });

  } catch (erro) {
    console.error("Erro upload:", erro);
    return res.status(500).json({ erro: "Erro ao fazer upload: " + erro.message });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
    sizeLimit: "50mb",
  },
};
