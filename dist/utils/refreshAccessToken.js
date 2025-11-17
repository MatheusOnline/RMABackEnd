"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shopModel_1 = require("../models/shopModel");
const timestamp_1 = __importDefault(require("./timestamp"));
const sign_1 = __importDefault(require("./sign"));
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;
async function refreshAccessToken(shop_id) {
    try {
        const shop = await shopModel_1.ShopModel.findOne({ shop_id });
        if (!shop) {
            console.log("Falha em achar a loja");
            return null;
        }
        const path = "/api/v2/auth/access_token/get";
        const ts = (0, timestamp_1.default)();
        const sign = (0, sign_1.default)({ path, ts });
        const url = `${host}${path}?partner_id=${partner_id}&sign=${sign}&timestamp=${ts}`;
        const body = {
            shop_id: Number(shop_id),
            refresh_token: shop.refresh_token,
            partner_id: Number(partner_id),
        };
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (data.error) {
                console.log("Erro ao atualizar token:", data.error);
                return null;
            }
            if (data.access_token) {
                shop.access_token = data.access_token;
                if (data.refresh_token) {
                    shop.refresh_token = data.refresh_token;
                }
                await shop.save();
                console.log("Token atualizado com sucesso!");
                return data.access_token;
            }
            return null;
        }
        catch (error) {
            console.error("Erro na requisição de token:", error);
            return null;
        }
    }
    catch (error) {
        console.error("Erro geral no refreshAccessToken:", error);
        return null;
    }
}
exports.default = refreshAccessToken;
