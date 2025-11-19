"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const shopModel_1 = require("../../models/shopModel");
const returnModel_1 = require("../../models/returnModel");
const crypto_1 = __importDefault(require("crypto"));
const refreshAccessToken_1 = __importDefault(require("../refreshAccessToken"));
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;
function Sign(path, ts, access_token, shop_id) {
    const partnerKey = process.env.PARTNER_KEY;
    const baseStr = `${process.env.PARTNER_ID}${path}${ts}${access_token}${shop_id}`;
    return crypto_1.default
        .createHmac("sha256", partnerKey)
        .update(baseStr)
        .digest("hex");
}
async function UpdateRetuns(shop_id) {
    try {
        let data;
        let attempts = 0;
        while (attempts < 2) { // evita loop infinito
            attempts++;
            //Busca a loja para pegar o token 
            const shop = await shopModel_1.ShopModel.findOne({ shop_id });
            if (!shop) {
                console.log("Loja não encontrada.");
                return null;
            }
            const access_token = String(shop.access_token);
            const ts = String(Math.floor(Date.now() / 1000));
            const create_from = String(Number(ts) - 10 * 24 * 60 * 60);
            const create_to = ts;
            const path = "/api/v2/returns/get_return_list";
            const sign = Sign(path, ts, access_token, shop_id);
            const params = {
                access_token,
                partner_id,
                shop_id,
                page_no: "1",
                page_size: "100",
                timestamp: ts,
                sign,
                update_time_from: create_from,
            };
            const url = `${host}${path}?${new URLSearchParams(params).toString()}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(url, {
                method: "GET",
                signal: controller.signal,
            });
            clearTimeout(timeout);
            data = await response.json();
            // ----- TOKEN INVÁLIDO -----
            if (data.error === "invalid_acceess_token") {
                console.log("⚠ Token inválido, tentando renovar...");
                await (0, refreshAccessToken_1.default)(shop_id);
                continue; // tentar de novo com token atualizado
            }
            break; // sucesso → sair do loop
        }
        const returnList = data?.response?.return || [];
        if (!Array.isArray(returnList)) {
            console.log(`Resposta inválida para loja ${shop_id}`);
        }
        //Atualizar O status da devolucoa
        //Se ja tiver o numero de transporte ele atualiza para 'EM TRANSPOTER'
        for (const r of returnList) {
            if (r.tracking_number) {
                const updateReturn = await returnModel_1.ReturnModel.findOneAndUpdate({
                    return_sn: r.return_sn,
                    shop_id,
                    status: "SOLICITADA"
                }, {
                    $set: {
                        status: "EM TRANSPORTE",
                        status_shopee: r.status,
                    },
                }, { new: true });
                console.log(updateReturn); // null se não encontrou ou já não estava SOLICITADA
            }
        }
    }
    catch (error) {
        return console.log(error);
    }
}
exports.default = UpdateRetuns;
