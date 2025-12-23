"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const shopModel_1 = require("../models/shopModel");
const router = express_1.default.Router();
async function SeachShop(shop_id) {
    const shop = await shopModel_1.ShopModel.findOne({ shop_id });
    if (shop)
        return shop;
}
router.post("/shopee", (req, res) => {
    // 🚀 responde imediatamente
    res.status(200).json({ success: true });
    // 👇 tudo abaixo não afeta mais a Shopee
    if (req.body.code === 0)
        return;
    if (req.body.code !== 3 || !req.body.data?.status)
        return;
    const { status, ordersn } = req.body.data;
    const shopId = req.body.shop_id;
    if (status === "TO_RETURN" || status === "CANCELLED") {
        // processamento em background
        (async () => {
            const shop = await SeachShop(shopId);
            console.log("🚨 EVENTO CRÍTICO");
            console.log("Status:", status);
            console.log("Pedido:", ordersn);
            console.log("Loja:", shop?.name);
        })();
    }
});
exports.default = router;
