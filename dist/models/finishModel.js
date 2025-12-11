"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinishModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const finishSchema = new mongoose_1.default.Schema({
    return_id: { type: String },
    observation: { type: String, default: "" },
    imagen: { type: [String], default: [] },
    data_finish: { type: String }
});
exports.FinishModel = mongoose_1.default.model("finish", finishSchema);
