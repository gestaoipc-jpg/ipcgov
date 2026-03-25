const { google } = require("googleapis");

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

module.exports = async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const { fileId } = req.body;
  if (!fileId) {
    return res.status(400).json({ erro: "fileId não informado" });
  }

  try {
    const drive = autenticar();
    await drive.files.delete({ fileId });
    return res.status(200).json({ sucesso: true });
  } catch (erro) {
    if (erro.code === 404) {
      return res.status(200).json({ sucesso: true, aviso: "Arquivo não encontrado no Drive" });
    }
    console.error("Erro ao excluir do Drive:", erro);
    return res.status(500).json({ erro: "Erro ao excluir: " + erro.message });
  }
};
