"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function Sign({ path, ts }) {
    const partnerKey = process.env.PARTNER_KEY;
    if (!partnerKey) {
        throw new Error("PARTNER_KEY não definida no .env");
    }
    // monta a base string corretamente
    const baseStr = `${process.env.PARTNER_ID}${path}${ts}`;
    // cria o hash HMAC-SHA256
    const sign = crypto_1.default
        .createHmac("sha256", partnerKey)
        .update(baseStr)
        .digest("hex");
    return sign;
}
exports.default = Sign;
