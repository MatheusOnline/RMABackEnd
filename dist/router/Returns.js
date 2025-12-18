"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
const multer_1 = __importDefault(require("multer"));
//====CONFIGURACOES====//
const multerConfig_1 = __importDefault(require("../config/multerConfig"));
//=======SCHEMA=======//
const returnModel_1 = require("../models/returnModel");
const finishModel_1 = require("../models/finishModel");
const shopModel_1 = require("../models/shopModel");
const userModel_1 = require("../models/userModel");
const timestamp_1 = __importDefault(require("../utils/timestamp"));
const refreshAccessToken_1 = __importDefault(require("../utils/refreshAccessToken"));
const SeachReturns_1 = __importDefault(require("../utils/returns/SeachReturns"));
const UpdateRetuns_1 = __importDefault(require("../utils/returns/UpdateRetuns"));
//====CONFIGURACOES====//
const router = express_1.default.Router();
dotenv_1.default.config();
const upload = (0, multer_1.default)({ storage: multerConfig_1.default });
//======VARIAVEIS======//
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;
//
//Funçao é chamada acada X tempo
//Salva no banco de dados as devolucoes
//
router.get("/cron/get", async (req, res) => {
    try {
        const shops = await shopModel_1.ShopModel.find().lean(); // todas as lojas
        console.log(`🔍 Encontradas ${shops.length} lojas`);
        for (const shop of shops) {
            const shop_id = String(shop.shop_id);
            console.log(`Buscando devoluções da loja: ${shop_id}`);
            await (0, SeachReturns_1.default)(shop_id);
            await (0, UpdateRetuns_1.default)(shop_id);
        }
        return res.send("Cron OK — todas as lojas processadas");
    }
    catch (error) {
        console.error("❌ erro no cron:", error);
        return res.status(500).json({ error: "Erro geral no cron" });
    }
});
//=======FUNÇAO PARA GERAR O SING=======//
function Sign({ path, ts, access_token, shop_id }) {
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
//
// Rota para buscar e salvar a devolucao 
// Atraves da API da shopee
//
router.post("/save", async (req, res) => {
    try {
        const { shop_id } = req.body;
        await (0, SeachReturns_1.default)(shop_id);
        return res.status(200).json({ success: false, message: "Salvo" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: error, success: false });
    }
});
//
// Rota para atualizar o status das devolucoes
//atualiza com base se tiver numero de transporte
//
router.post("/update", async (req, res) => {
    try {
        const { shop_id } = req.body;
        await (0, UpdateRetuns_1.default)(shop_id);
        return res.status(200).json({ success: true, menssage: "Atualizado" });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: error, success: false });
    }
});
//
//Rota para buscar a as devolucoes no banco de dados
//Retorna as devolucoes para o frontend
// 
router.post("/get", async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id)
            return res.status(400).json({ error: "user_id não pode ser nulo" });
        const user = await userModel_1.UserModel.findById(user_id).lean();
        if (!user || !user.shops || user.shops.length === 0) {
            return res.status(404).json({ error: "Usuário sem lojas cadastradas" });
        }
        const shopIds = user.shops.map((shop) => shop.shop_id);
        const listReturns = await returnModel_1.ReturnModel.find({
            shop_id: { $in: shopIds }
        })
            .limit(500)
            .lean();
        // AGRUPA AS DEVOLUÇÕES POR LOJA
        const returnsByShop = user.shops.map((shop) => ({
            shop_id: shop.shop_id,
            shop_name: shop.name,
            devolucoes: listReturns.filter((ret) => ret.shop_id == shop.shop_id)
        }));
        return res.status(200).json({
            success: true,
            shops: returnsByShop
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno" });
    }
});
//
// Rota para procurar Devolucos no banco de dados 
// Atraves da solicitaçao de devoluçao 
//
router.post("/seach", async (req, res) => {
    const { return_sn } = req.body;
    if (!return_sn) {
        return res.status(400).json({ error: "Return é obrigatorio", success: false });
    }
    try {
        const data = await returnModel_1.ReturnModel.findOne({ return_sn }).lean();
        if (!data) {
            return res.status(200).json({ error: "Essa devoluçao nao existe", success: false });
        }
        return res.status(200).json({ data: data, success: true });
    }
    catch (error) {
        return res.status(500).json({ error: error, success: false });
    }
});
//
// Rota para listar a logisstica reversa 
// Atraves do numero de da devoluçao
//
router.post("/tracking", async (req, res) => {
    const { return_sn } = req.body;
    if (!return_sn)
        return res.status(400).json({ error: "return_sn e shop_id são obrigatórios", sucesso: false });
    try {
        const returnContent = await returnModel_1.ReturnModel.findOne({ return_sn });
        if (!returnContent)
            return;
        const shop_id = returnContent.shop_id;
        const shop = await shopModel_1.ShopModel.findOne({ shop_id });
        if (!shop)
            return res.status(400).json({ error: "Falha em buscar a loja", success: false });
        const path = "/api/v2/returns/get_reverse_tracking_info";
        const ts = (0, timestamp_1.default)();
        let access_token = shop.access_token;
        let sign = Sign({ path, ts, access_token, shop_id: Number(shop_id), });
        const params = {
            partner_id: String(partner_id),
            sign,
            timestamp: String(ts),
            shop_id: String(shop_id),
            access_token,
            return_sn
        };
        const urlParams = new URLSearchParams(params).toString();
        const url = `${host}${path}?${urlParams}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        let data = await response.json();
        console.log(data);
        if (data.error === "invalid_acceess_token") {
            const newToken = await (0, refreshAccessToken_1.default)(shop_id);
            if (!newToken) {
                return res.status(401).json({ error: "Falha ao renovar token" });
            }
        }
        if (data.error === "returns.error_reverse_logistics") {
            return res.status(200).json({ message: "Pedido não tem logistica reversa", success: false });
        }
        return res.status(200).json({ datas: data, success: true });
    }
    catch (error) {
        console.error("Erro:", error);
        return res.status(500).json({ error: error, success: false });
    }
});
//
// Rota do scanear de devoluçao 
// E buscar atraves do numero de tranporte
//
router.post("/scan", async (req, res) => {
    const { tracking_id } = req.body;
    // Validação de entrada
    if (!tracking_id) {
        return res.status(400).json({ success: false, error: "tracking_id é obrigatório" });
    }
    try {
        // Busca devolução
        const returnData = await returnModel_1.ReturnModel.findOne({ tracking_number: tracking_id }).lean();
        if (!returnData) {
            return res.status(404).json({ success: false, error: "Nenhuma devolução encontrada" });
        }
        if (returnData.status === "RECEBIDO") {
            return res.status(400).json({ success: false, error: "Devolução já finalizada" });
        }
        // Busca loja
        const shop = await shopModel_1.ShopModel.findOne({ shop_id: returnData.shop_id }).lean();
        if (!shop) {
            return res.status(404).json({ success: false, error: "Loja não encontrada" });
        }
        // Resposta final
        return res.status(200).json({
            success: true,
            message: "Devolução encontrada",
            data: returnData,
            shop_name: shop.name
        });
    }
    catch (error) {
        console.error("Erro na rota /scan:", error);
        return res.status(500).json({ success: false, error: "Erro interno no servidor"
        });
    }
});
// 
// Rota para finalizar a devoluçao 
// E salvar no banco as informacoes 
//
router.post("/finish", upload.array("photos", 10), async (req, res) => {
    const { return_sn, observation } = req.body;
    if (!return_sn) {
        return res.status(400).json({ success: false, error: "return_sn é obrigatório" });
    }
    try {
        const returnData = await returnModel_1.ReturnModel.findOneAndUpdate({ return_sn }, { status: "RECEBIDO" }, { new: true }).lean();
        if (!returnData) {
            return res.status(404).json({ success: false, error: "Falha em achar a devolução" });
        }
        if (returnData.status === "RECEBIDO") {
            return res.status(400).json({ success: false, error: "Devolução já finalizada" });
        }
        const files = Array.isArray(req.files) ? req.files : [];
        const filePaths = files.map(f => `/uploads/${f.filename}`);
        await finishModel_1.FinishModel.create({
            return_id: returnData.return_sn,
            observation: observation || null,
            imagen: filePaths,
            data_finish: (0, timestamp_1.default)()
        });
        return res.status(200).json({
            success: true,
            message: "Devolução concluída"
        });
    }
    catch (error) {
        console.error("Erro REAL na rota /finish:", error);
        return res.status(500).json({ success: false, error: "Erro interno no servidor" });
    }
});
exports.default = router;
