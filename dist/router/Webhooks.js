"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const shopModel_1 = require("../models/shopModel");
const returnModel_1 = require("../models/returnModel");
const refreshAccessToken_1 = __importDefault(require("../utils/refreshAccessToken"));
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;
const router = express_1.default.Router();
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
            response_optional_fields: "cancel_by,cancel_reason,package_list,pickup_done_time,buyer_username,item_list,image_info",
        };
        const url = `${host}${path}?${new URLSearchParams(params)}`;
        const response = await fetch(url);
        const json = await response.json();
        if (json.error === "invalid_acceess_token") {
            const newToken = await (0, refreshAccessToken_1.default)(shop_id);
            if (!newToken)
                return { isFailed: true };
            shop.access_token = newToken;
            await shop.save();
            retries++;
            continue;
        }
        //if (!json.response?.order_list?.length) {
        // return { isFailed: true };
        //}
        const order = json.response.order_list[0];
        const pkg = order.package_list?.[0];
        const item = order.item_list?.[0];
        if (pkg?.logistics_status === "LOGISTICS_DELIVERY_FAILED") {
            const rma = await returnModel_1.ReturnModel.create({
                shop_id,
                return_sn: "", // Shopee ainda não gera return_sn nesse ponto
                order_sn: order.order_sn,
                status_shopee: pkg?.logistics_status ?? "UNKNOWN",
                tracking_number: pkg?.package_number ?? "",
                status: "EM TRANSPORTE",
                reason: order.cancel_reason || "Falha na entrega",
                text_reason: order.cancel_reason || "",
                create_time: String(order.create_time),
                buyer_videos: [], // Shopee não envia vídeos nesse endpoint
                user: {
                    username: order.buyer_username,
                    portrait: "", // Shopee não envia avatar
                },
                item: [
                    {
                        images: [
                            item?.image_info?.image_url
                        ].filter(Boolean),
                        item_id: String(item.item_id),
                        item_price: String(item.model_discounted_price),
                        amount: String(item.model_quantity_purchased),
                        name: item.item_name,
                    }
                ],
            });
            return rma;
        }
    }
    return { isFailed: true };
}
async function GetReturnDetailAndSave({ shop_id, return_sn }) {
    let retries = 0;
    while (retries < 2) {
        const shop = await shopModel_1.ShopModel.findOne({ shop_id });
        if (!shop)
            return { isFailed: true };
        const path = "/api/v2/returns/get_return_detail";
        const ts = Math.floor(Date.now() / 1000);
        const access_token = shop.access_token;
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
            return_sn,
        };
        const url = `${host}${path}?${new URLSearchParams(params)}`;
        const response = await fetch(url);
        const json = await response.json();
        // 🔁 token expirado (ESSE ERRO TA CERTO SIM)
        if (json.error === "invalid_acceess_token") {
            const newToken = await (0, refreshAccessToken_1.default)(shop_id);
            if (!newToken)
                return { isFailed: true };
            shop.access_token = newToken;
            await shop.save();
            retries++;
            continue;
        }
        console.log(json);
        if (!json.response) {
            return { isFailed: true };
        }
        const r = json.response;
        // 🧠 monta itens
        const items = (r.item || []).map((it) => ({
            images: it.images ?? [],
            item_id: String(it.item_id),
            item_price: String(it.item_price ?? it.refund_amount ?? 0),
            amount: String(it.amount),
            name: it.name,
        }));
        // 💾 salva no banco
        const saved = await returnModel_1.ReturnModel.create({
            shop_id,
            return_sn: r.return_sn,
            order_sn: r.order_sn,
            status_shopee: r.reverse_logistic_status || r.logistics_status || r.status,
            tracking_number: r.tracking_number ?? "",
            status: r.status,
            reason: r.reason ?? "",
            text_reason: r.text_reason ?? "",
            create_time: String(r.create_time),
            buyer_videos: r.buyer_videos ?? [],
            user: {
                username: r.user?.username ?? "",
                portrait: r.user?.portrait ?? "",
            },
            item: items,
        });
        return saved;
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
    const { status, ordersn } = req.body.data;
    const shop = req.body.shop_id;
    console.log(req.body);
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
    if (req.body.code === 29) {
        console.log("📦 Pedido em devolução:", req.body.data.return_sn);
        (async () => {
            const response = await GetReturnDetailAndSave({
                shop_id: shop,
                return_sn: req.body.data.return_sn,
            });
            console.log(response);
        })();
    }
});
exports.default = router;
