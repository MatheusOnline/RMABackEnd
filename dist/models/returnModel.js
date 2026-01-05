"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const buyerVideosSchemas = new mongoose_1.default.Schema({
    thumbnail_url: { type: String, required: false },
    video_url: { type: String, required: false }
});
const userSchema = new mongoose_1.default.Schema({
    username: { type: String, required: true },
    portrait: { type: String, required: false }
});
const itemSchema = new mongoose_1.default.Schema({
    images: { type: [String], required: true }, // array de strings
    item_id: { type: String, required: true },
    item_price: { type: String, required: true },
    amount: { type: String, required: true },
    name: { type: String, required: true }
});
const returnSchema = new mongoose_1.default.Schema({
    shop_id: { type: String, required: true },
    return_sn: { type: String, required: false },
    order_sn: { type: String, required: true },
    status_shopee: { type: String, required: true },
    tracking_number: { type: String, required: false },
    status: { type: String, required: true },
    reason: { type: String, required: true },
    text_reason: { type: String, required: false },
    create_time: { type: String, required: true },
    buyer_videos: [buyerVideosSchemas],
    user: userSchema,
    item: { type: [itemSchema], required: true },
});
exports.ReturnModel = mongoose_1.default.model("Return", returnSchema);
