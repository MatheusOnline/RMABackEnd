"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const shopModel_1 = require("../models/shopModel");
const router = express_1.default.Router();
router.post("/shoplist", async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({ success: false, message: "user_id é obrigatório" });
        }
        const stores = await shopModel_1.ShopModel.find({ user_id });
        if (stores.length === 0) {
            return res.status(200).json({ success: false, stores: [] });
        }
        return res.status(200).json({ success: true, stores });
    }
    catch {
        return res.status(500).json({ success: false });
    }
});
exports.default = router;
