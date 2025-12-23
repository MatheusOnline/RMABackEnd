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
router.post("/shopee", async (req, res) => {
    // 🔐 verificação Shopee
    if (req.body.code === 0) {
        return res.status(200).json({
            code: 0,
            message: "success"
        });
    }
    if (req.body.code === 3 && req.body.data?.status) {
        switch (req.body.data.status) {
            case "READY_TO_SHIP":
            case "UNPAID":
            case "TO_CONFIRM_RECEIVE":
            case "SHIPPED":
            case "PROCESSED":
            case "COMPLETED":
                return res.status(200);
            case "TO_RETURN":
                const shop = await SeachShop(req.body.shop_id);
                console.log("🚨 FALHA NA ENTREGA / DEVOLUÇÃO INICIADA");
                console.log("Pedido:", req.body.data.ordersn);
                console.log("Shop ID:", req.body.shop_id);
                console.log("Loja:", shop);
                return res.status(200);
            default:
                console.log("📦 EVENTO DESCONHECIDO DA SHOPEE");
                console.log(req.body);
                return res.status(200).json({ received: true });
        }
    }
    return res.status(200).json({ ok: true });
});
exports.default = router;
