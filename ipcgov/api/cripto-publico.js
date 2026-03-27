const crypto = require("crypto");

const ALGORITMO = "aes-256-cbc";
const PREFIXO   = "enc:";

function getChave() {
  const chave = process.env.CRIPTOGRAFIA_CHAVE;
  if (!chave) throw new Error("CRIPTOGRAFIA_CHAVE não configurada — operação abortada.");
  return crypto.createHash("sha256").update(chave).digest();
}

function criptografar(texto) {
  if (!texto) return texto;
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITMO, getChave(), iv);
  const enc    = Buffer.concat([cipher.update(String(texto), "utf8"), cipher.final()]);
  return PREFIXO + iv.toString("hex") + ":" + enc.toString("hex");
}

module.exports = async function handler(req, res) {
  // Só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  // Verifica chave interna
  const chaveRecebida = req.headers["x-internal-key"];
  const chaveEsperada = process.env.INTERNAL_API_KEY;

  if (!chaveEsperada) {
    return res.status(500).json({ erro: "Configuração interna ausente." });
  }
  if (!chaveRecebida || chaveRecebida !== chaveEsperada) {
    return res.status(401).json({ erro: "Não autorizado." });
  }

  const { campos } = req.body;
  if (!campos || typeof campos !== "object") {
    return res.status(400).json({ erro: "campos é obrigatório." });
  }

  // SOMENTE criptografa — nunca descriptografa
  try {
    const resultado = {};
    Object.keys(campos).forEach(k => {
      resultado[k] = criptografar(campos[k]);
    });
    return res.status(200).json({ sucesso: true, campos: resultado });
  } catch(err) {
    console.error("Erro cripto-publico:", err);
    return res.status(500).json({ erro: err.message });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};
