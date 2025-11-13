import fs from "fs";
import path from "path";
import axios from "axios";
import crypto from "crypto";

async function downloadImage(imageUrl: string): Promise<string> {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });

    const ext = path.extname(imageUrl).split("?")[0] || ".jpg"; // tenta manter extensão
    const fileName = `${crypto.randomBytes(8).toString("hex")}${ext}`;
    const filePath = path.resolve(__dirname, "..", "uploads", fileName);

    // salva arquivo localmente
    fs.writeFileSync(filePath, response.data);

    // retorna a URL local (ajuste o host se estiver em produção)
    const localUrl = `http://localhost:3000/uploads/${fileName}`;
    return localUrl;
  } catch (error) {
    console.error("Erro ao baixar imagem:", error);
    throw new Error("Falha ao baixar imagem");
  }
}

export default downloadImage