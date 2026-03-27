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

function descriptografar(texto) {
  if (!texto || !String(texto).startsWith(PREFIXO)) return texto;
  try {
    const sem = String(texto).slice(PREFIXO.length);
    const [ivHex, encHex] = sem.split(":");
    const iv      = Buffer.from(ivHex, "hex");
    const enc     = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITMO, getChave(), iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch(e) {
    console.error("Erro ao descriptografar:", e.message);
    return texto; // retorna original se falhar
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { acao, campos } = req.body;

  if (!acao || !campos) {
    return res.status(400).json({ erro: "acao e campos são obrigatórios" });
  }

  try {
    if (acao === "criptografar") {
      const resultado = {};
      Object.keys(campos).forEach(k => {
        resultado[k] = criptografar(campos[k]);
      });
      return res.status(200).json({ sucesso: true, campos: resultado });
    }

    if (acao === "descriptografar") {
      // campos pode ser array de objetos ou objeto único
      if (Array.isArray(campos)) {
        const resultado = campos.map(obj => {
          const dec = {};
          Object.keys(obj).forEach(k => {
            dec[k] = descriptografar(obj[k]);
          });
          return dec;
        });
        return res.status(200).json({ sucesso: true, campos: resultado });
      } else {
        const resultado = {};
        Object.keys(campos).forEach(k => {
          resultado[k] = descriptografar(campos[k]);
        });
        return res.status(200).json({ sucesso: true, campos: resultado });
      }
    }

    return res.status(400).json({ erro: "acao deve ser criptografar ou descriptografar" });

  } catch(err) {
    console.error("Erro cripto:", err);
    return res.status(500).json({ erro: err.message });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};
