"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.post("/shopee", (req, res) => {
    console.log("📩 CHEGOU DA SHOPEE");
    console.log(req.body);
    // 🔐 mensagem de verificação
    if (req.body.code === 0) {
        return res.status(200).json({
            code: 0,
            message: "success"
        });
    }
    if (req.body.code === 3) {
        switch (req.body.data.status) {
            case "READY_TO_SHIP":
                return res.status(200);
            case "UNPAID":
                return res.status(200);
            case "TO_CONFIRM_RECEIVE":
                return res.status(200);
            case "SHIPPED":
                return res.status(200);
            default:
                break;
        }
    }
    // eventos normais
    res.status(200).json({ ok: true });
});
exports.default = router;
