"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
//======FUNCOES========//
const sign_1 = __importDefault(require("../utils/sign"));
const timestamp_1 = __importDefault(require("../utils/timestamp"));
const createShop_1 = __importDefault(require("../utils/dbUtius/createShop"));
const shopModel_1 = require("../models/shopModel");
//====CONFIGURACOES====//
const router = express_1.default.Router();
dotenv_1.default.config();
// CORS para todas as rotas deste router
//======VARIAVEIS======//
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;
//=======ROTA PARA GERAR O TOKEN DA LOJA========//
router.post("/generate", async (req, res) => {
    try {
        const { code, shop_id, user_id } = req.body;
        if (!code || !shop_id)
            return res.status(400).json("Code e shop_id não pode ser nulo");
        if (!process.env.PARTNER_ID || !process.env.HOST)
            return res.status(500).json("As variaveis de processo nao forao coletadas");
        const path = "/api/v2/auth/token/get";
        const ts = (0, timestamp_1.default)();
        const sign = (0, sign_1.default)({ path, ts });
        const url = `${host}${path}?partner_id=${partner_id}&timestamp=${ts}&sign=${sign}`;
        const body = {
            code,
            shop_id: Number(shop_id),
            partner_id: Number(partner_id),
        };
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        const shop = await (0, createShop_1.default)({ shop_id });
        if (shop instanceof shopModel_1.ShopModel) {
            shop.access_token = data.access_token;
            shop.refresh_token = data.refresh_token;
            shop.user_id = user_id;
            await shop.save();
        }
        else {
            console.error("CreateShop  não retornou uma instância válida de ShopModel:", shop);
        }
        return res.status(200).json(data);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro interno ao gerar token" });
    }
});
//=====ROTA PARA ATUALIZAR O TOKEN DA LOJA======//
router.post("/refresh", async (req, res) => {
    try {
        const { shop_id } = req.body;
        if (!shop_id)
            return res.status(400).json("shop_id não pode ser nulo");
        if (!process.env.PARTNER_ID || !process.env.HOST)
            return res.status(500).json("As variaveis de processo nao forão coletadas");
        const shop = await shopModel_1.ShopModel.findOne({ shop_id });
        if (!shop) {
            return res.status(500).json("As variaveis de processo nao forão coletadas");
        }
        const path = "/api/v2/auth/access_token/get";
        const ts = (0, timestamp_1.default)();
        const sign = (0, sign_1.default)({ path, ts });
        const url = `${host}${path}?partner_id=${partner_id}&sign=${sign}&timestamp=${ts}`;
        const body = {
            shop_id: Number(shop_id),
            refresh_token: shop?.refresh_token,
            partner_id: Number(partner_id),
        };
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (shop) {
            if (data.refresh_token && data.access_token) {
                shop.access_token = data.access_token;
                shop.refresh_token = data.refresh_token;
                await shop.save();
            }
        }
        return res.status(200).json(data);
    }
    catch (error) {
        return res.status(500).json({ error: "Erro interno ao atualizar token" });
    }
});
exports.default = router;
