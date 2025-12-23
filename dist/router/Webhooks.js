"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const shopModel_1 = require("../models/shopModel");
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
        order_sn_list: [order_sn].join(","),
        response_optional_fields: "cancel_by,cancel_reason,package_list,shipping_carrier,fulfillment_flag,pickup_done_time"
    };
    const url = `${host}${path}?${new URLSearchParams(params)}`;
    const response = await fetch(url);
    const json = await response.json();
    const datas = { "order_sn": order_sn, "Shop": shop.name, "Motivo": json.response.order_list[0].cancel_reason };
    return datas;
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
    if (status === "TO_RETURN" || status === "CANCELLED") {
        // processamento em background
        (async () => {
            const shop_id = shop;
            const order_sn = ordersn;
            console.log("🚨 EVENTO CRÍTICO");
            const response = await IsfalidDelivery({ shop_id, order_sn });
            console.log(response);
        })();
    }
});
exports.default = router;
