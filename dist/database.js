"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const uri = "mongodb+srv://matheus:minhaSenha123@dados.mkmjd.mongodb.net/";
async function connectDB() {
    try {
        await mongoose_1.default.connect("mongodb+srv://matheus:<Cavalo123!>@dados.mkmjd.mongodb.net/rmaDB");
        console.log("✅ Conectado ao MongoDB Atlas com sucesso!");
    }
    catch (error) {
        console.error("❌ Erro ao conectar no MongoDB:", error);
    }
}
