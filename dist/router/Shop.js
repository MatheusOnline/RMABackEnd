"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
//======FUNCOES========//
const timestamp_1 = __importDefault(require("../utils/timestamp"));
const createShop_1 = __importDefault(require("../utils/dbUtius/createShop"));
const refreshAccessToken_1 = __importDefault(require("../utils/refreshAccessToken"));
//====CONFIGURACOES====//
const router = express_1.default.Router();
dotenv_1.default.config();
//======VARIAVEIS======//
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;
//=======FUNÇAO PARA GERAR O SING=======//
function Sign({ path, ts, access_token, shop_id }) {
    const partnerKey = process.env.PARTNER_KEY;
    if (!partnerKey) {
        throw new Error("PARTNER_KEY não definida no .env");
    }
    // monta a base string corretamente
    const baseStr = `${process.env.PARTNER_ID}${path}${ts}${access_token}${shop_id}`;
    // cria o hash HMAC-SHA256
    const sign = crypto_1.default
        .createHmac("sha256", partnerKey)
        .update(baseStr)
        .digest("hex");
    return sign;
}
//=======ROUTA PARA BUSCAR OS DADOS DA EMPRESA
router.post("/datas", async (req, res) => {
    try {
        const { shop_id } = req.body;
        if (!shop_id)
            return res.status(400).json({ error: "shop_id não pode ser nulo" });
        if (!process.env.PARTNER_ID || !process.env.HOST)
            return res.status(500).json({ error: "As variaveis de processo não forão coletadas" });
        const path = "/api/v2/shop/get_profile";
        const ts = (0, timestamp_1.default)();
        const shop = await (0, createShop_1.default)({ shop_id });
        if (!shop)
            return res.status(500).json({ error: "Falha ao buscar a loja" });
        const access_token = shop.access_token;
        const sign = Sign({ path, ts, access_token, shop_id });
        if (!access_token)
            return res.status(500).json({ error: "Falha ao buscar o access token" });
        const url = `${host}${path}?partner_id=${partner_id}&timestamp=${ts}&access_token=${access_token}&shop_id=${shop_id}&sign=${sign}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.error === "invalid_acceess_token") {
                const newToken = await (0, refreshAccessToken_1.default)(shop_id);
                if (!newToken) {
                    return res.status(401).json({ error: "Falha ao renovar token" });
                }
            }
            if (data.response.shop_name) {
                shop.name = data.response.shop_name;
                shop.img = data.response.shop_logo;
            }
            await shop.save();
            return res.status(200).json(data);
        }
        catch (error) {
            return res.status(500).json(error);
        }
    }
    catch (error) {
        return res.status(500).json({ error: error });
    }
});
exports.default = router;
