"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const shopModel_1 = require("../models/shopModel");
const refreshAccessToken_1 = __importDefault(require("../utils/refreshAccessToken"));
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;
const router = express_1.default.Router();
async function SeachShop(shop_id) {
    const shop = await shopModel_1.ShopModel.findOne({ shop_id });
    if (shop)
        return shop;
}
//=======FUNÇAO PARA GERAR O SING=======//
function Sing({ path, ts, access_token, shop_id }) {
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
async function IsfalidDelivery({ shop_id, order_sn }) {
    let retries = 0;
    while (retries < 2) {
        const shop = await shopModel_1.ShopModel.findOne({ shop_id });
        if (!shop)
            return { isFailed: false };
        const path = "/api/v2/order/get_order_detail";
        const ts = Math.floor(Date.now() / 1000);
        let access_token = shop.access_token;
        const sign = Sing({
            path,
            ts,
            access_token,
            shop_id: Number(shop_id),
        });
        const params = {
            partner_id: String(partner_id),
            sign,
            timestamp: String(ts),
            shop_id: String(shop_id),
            access_token,
            order_sn_list: order_sn,
            response_optional_fields: "cancel_by,cancel_reason,package_list,shipping_carrier,fulfillment_flag,pickup_done_time",
        };
        const url = `${host}${path}?${new URLSearchParams(params)}`;
        const response = await fetch(url);
        const json = await response.json();
        // ⚠️ erro estava escrito errado
        if (json.error === "invalid_acceess_token") {
            const newToken = await (0, refreshAccessToken_1.default)(shop_id);
            if (!newToken)
                return { isFailed: true };
            shop.access_token = newToken;
            await shop.save();
            retries++;
            continue;
        }
        if (!json.response?.order_list?.length) {
            return { isFailed: true };
        }
        return {
            order_sn,
            Shop: shop.name,
            Motivo: json.response.order_list[0].cancel_reason,
        };
    }
    return { isFailed: true };
}
router.post("/test", async (req, res) => {
    const { shop_id, order_sn } = req.body;
    const response = await IsfalidDelivery({ shop_id, order_sn });
    return res.status(200).json(response);
});
router.post("/shopee", (req, res) => {
    // 🚀 responde imediatamente
    res.status(200).json({ success: true });
    // 👇 tudo abaixo não afeta mais a Shopee
    if (req.body.code === 0)
        return;
    if (req.body.code !== 3 || !req.body.data?.status)
        return;
    const { status, ordersn } = req.body.data;
    const shop = req.body.shop_id;
    if (status === "CANCELLED") {
        (async () => {
            console.log("🚨 EVENTO CRÍTICO - CANCELADO");
            const response = await IsfalidDelivery({
                shop_id: shop,
                order_sn: ordersn,
            });
            console.log(response);
        })();
    }
    if (status === "TO_RETURN") {
        console.log("📦 Pedido em devolução:", ordersn);
    }
});
exports.default = router;
