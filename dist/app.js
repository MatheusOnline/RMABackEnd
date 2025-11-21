"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const returnModel_1 = require("./models/returnModel");
const shopModel_1 = require("./models/shopModel");
const mongoose_1 = __importDefault(require("mongoose"));
//=======IMPORTANDO ROTAS========//
const Returns_1 = __importDefault(require("./router/Returns"));
const Tokens_1 = __importDefault(require("./router/Tokens"));
const Shop_1 = __importDefault(require("./router/Shop"));
const Dashboard_1 = __importDefault(require("./router/Dashboard"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "https://rma-controller.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
// 👉 habilita acesso público à pasta 'uploads'
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "uploads")));
const uri = "mongodb+srv://matheus:Cavalo123!@dados.mkmjd.mongodb.net/meuBanco?retryWrites=true&w=majority";
mongoose_1.default.connect(uri)
    .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
    .catch(err => console.error("❌ Erro ao conectar no MongoDB:", err));
app.use("/return", Returns_1.default);
app.use("/token", Tokens_1.default);
app.use("/shop", Shop_1.default);
app.use("/dashboard", Dashboard_1.default);
//====================//
//  ROTAS DE TESTES   //
//====================//
app.get("/stores", async (req, res) => {
    try {
        const rmas = await shopModel_1.ShopModel.find();
        res.send(rmas);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar RMAs");
    }
});
app.get("/returns", async (req, res) => {
    try {
        const rmas = await returnModel_1.ReturnModel.find();
        res.send(rmas);
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar RMAs");
    }
});
app.get("/ClearReturns", async (req, res) => {
    try {
        await returnModel_1.ReturnModel.deleteMany({});
        res.send("deletado");
    }
    catch (err) {
        console.error(err);
        res.status(500).send("Erro ao buscar RMAs");
    }
});
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
