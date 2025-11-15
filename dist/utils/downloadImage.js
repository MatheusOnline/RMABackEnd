"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
async function downloadImage(imageUrl) {
    try {
        const response = await axios_1.default.get(imageUrl, { responseType: "arraybuffer" });
        const ext = path_1.default.extname(imageUrl).split("?")[0] || ".jpg"; // tenta manter extensão
        const fileName = `${crypto_1.default.randomBytes(8).toString("hex")}${ext}`;
        const filePath = path_1.default.resolve(__dirname, "..", "uploads", fileName);
        // salva arquivo localmente
        fs_1.default.writeFileSync(filePath, response.data);
        // retorna a URL local (ajuste o host se estiver em produção)
        const localUrl = `http://localhost:3000/uploads/${fileName}`;
        return localUrl;
    }
    catch (error) {
        console.error("Erro ao baixar imagem:", error);
        throw new Error("Falha ao baixar imagem");
    }
}
exports.default = downloadImage;
