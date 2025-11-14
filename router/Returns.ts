import express from "express";
import dotenv from "dotenv"
import crypto from "crypto";
import multer from "multer";
import path from "path";

//=======SCHEMA=======//
import { ReturnModel } from "../models/returnModel";
import { FinishModel } from "../models/finishModel";

//======FUNCOES========//
import CreateShop from "../utils/dbUtius/createShop";
import CreateReturn from "../utils/dbUtius/createReturn";
import Timestamp from "../utils/timestamp";
import refreshAccessToken from "../utils/refreshAccessToken";
import { ShopModel } from "../models/shopModel";
import  downloadImage from "../utils/downloadImage";
//====CONFIGURACOES====//
const router = express.Router();
dotenv.config();

//======VARIAVEIS======//
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // pasta onde salva
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // nome único
  },
});

const upload = multer({ storage });


interface SignFunctions {
  path: string;
  ts: Number;
  access_token: Number;
  shop_id: Number;
}

//=======FUNÇAO PARA GERAR O SING=======//
function Sign({ path, ts, access_token, shop_id }: SignFunctions) {

    const partnerKey = process.env.PARTNER_KEY;
    if (!partnerKey) {
        throw new Error("PARTNER_KEY não definida no .env");
    }

    // monta a base string corretamente
    const baseStr = `${process.env.PARTNER_ID}${path}${ts}${access_token}${shop_id}`;

    // cria o hash HMAC-SHA256
    const sign = crypto
        .createHmac("sha256", partnerKey )
        .update(baseStr)
        .digest("hex");

    return sign;
}

// ================================
//  ROTA GET OTIMIZADA DE DEVOLUÇÕES
// ================================
router.post("/get", async (req, res) => {
    try {
        const { shop_id } = req.body;

        if (!shop_id) {
            return res.status(400).json({
                success: false,
                error: "shop_id não pode ser nulo"
            });
        }

        // ===========================
        // 1. BUSCA A LOJA
        // ===========================
        const shop = await CreateShop({ shop_id });
        if (!shop) {
            return res.status(400).json({
                success: false,
                error: "Erro ao buscar a loja"
            });
        }

        const ts = Math.floor(Date.now() / 1000);
        const fiveDaysAgo = ts - 4 * 24 * 60 * 60;

        const path = "/api/v2/returns/get_return_list";
        let access_token = (shop as any).access_token;
        let sign = Sign({ path, ts, access_token, shop_id });

        const params = {
            partner_id: String(partner_id),
            shop_id: String(shop_id),
            access_token,
            timestamp: String(ts),
            sign,
            page_no: "1",
            page_size: "50",
            create_time_from: String(fiveDaysAgo),
            create_time_to: String(ts)
        };

        const url = `${host}${path}?${new URLSearchParams(params).toString()}`;

        // Timeout prevent server freeze
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        let apiResponse;

        // ===========================
        // 2. CHAMADA PARA SHOPEE
        // ===========================
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            apiResponse = await response.json();
        } catch (err) {
            clearTimeout(timeout);
            return res.status(503).json({
                success: false,
                error: "Shopee timeout"
            });
        }

        // Token expirado → renovar
        if (apiResponse.error === "invalid_acceess_token") {
            const newToken = await refreshAccessToken(shop_id);
            if (!newToken) {
                return res.status(401).json({ success: false, error: "Falha ao renovar token" });
            }
            
            access_token = newToken ;
            const newSign = Sign({ path, ts, access_token, shop_id });

            const retryParams = new URLSearchParams({
                ...params,
                access_token,
                sign: newSign
            });

            const retryUrl = `${host}${path}?${retryParams.toString()}`;
            const retryRes = await fetch(retryUrl);
            apiResponse = await retryRes.json();
        }

        const apiReturns = apiResponse?.response?.return || [];

        if (!Array.isArray(apiReturns)) {
            return res.status(500).json({
                success: false,
                error: "Resposta inválida da Shopee"
            });
        }

        // ===========================
        // 3. Buscar devoluções locais
        // ===========================
        const existingReturns = await ReturnModel.find(
            { shop_id },
            { return_sn: 1 }
        ).lean();

        const existingSN = new Set(existingReturns.map(r => r.return_sn));

        // ===========================
        // 4. Filtrar SOMENTE as novas
        // ===========================
        const newReturns = apiReturns.filter(ret => !existingSN.has(ret.return_sn));

        // ===========================
        // 5. Inserir somente NOVAS
        // ===========================
        if (newReturns.length > 0) {
            await CreateReturn(shop_id, newReturns);
        }

        // ===========================
        // 6. Retornar lista final
        // ===========================
        const listReturns = await ReturnModel.find({ shop_id })
            .sort({ create_time: -1 })
            .limit(500)
            .lean();

        return res.json({
            success: true,
            new_count: newReturns.length,
            total: listReturns.length,
            return_list: listReturns
        });

    } catch (error) {
        console.error("ERRO ROTA /get:", error);
        return res.status(500).json({
            success: false,
            error: "Erro interno do servidor"
        });
    }
});


//
// Rota para procurar Devolucos no banco de dados 
// Atraves da solicitaçao de devoluçao 
//
router.post("/seach", async (req, res) =>{
    const { return_sn} = req.body

    if(!return_sn){
        return res.status(400).json({error: "Return é obrigatorio", success: false})
    }

    try{
        const data = await ReturnModel.findOne({return_sn}).lean();

        if(!data){
            return res.status(200).json({error:"Essa devoluçao nao existe", success:false})
        }

       return res.status(200).json({data:data, success:true})
    }
    catch(error){
       return res.status(500).json({error: error, success:false})
    }
})

//
// Rota para listar a logisstica reversa 
// Atraves do numero de da devoluçao
//
router.post("/tracking", async (req, res) =>{
    const { return_sn, shop_id} = req.body

    if (!return_sn || !shop_id) 
        return res.status(400).json({ error: "return_sn e shop_id são obrigatórios",sucesso: false });
    
    try {
        const shop = await ShopModel.findOne({ shop_id }).lean();
        if(!shop)
             return res.status(400).json({ error: "Falha em buscar a loja", success: false});
        

        const path = "/api/v2/returns/get_reverse_tracking_info";
        const ts = Timestamp();
        let access_token = (shop as any).access_token
        let sign = Sign({path, ts, access_token, shop_id})


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
        
        if(data.error === "invalid_acceess_token"){
            const newToken = await refreshAccessToken(shop_id);
            if (!newToken) {
                return res.status(401).json({ error: "Falha ao renovar token" });
            }
        }

        return res.status(200).json({datas:data, success: true});
    } catch (error) {
        console.error("Erro:", error);
        return res.status(500).json({ error: error, success: false});
    }
})

//
// Rota para scanear a  devoluçao 
// E buscar atraves do numero de tranporte
//
router.post("/scan", async (req, res) => {
    const { tracking_id } = req.body;

    // Validação de entrada
    if (!tracking_id) {
        return res.status(400).json({ success: false, error: "tracking_id é obrigatório"});
    }

    try {
        // Busca devolução
        const returnData = await ReturnModel.findOne({ tracking_number: tracking_id }).lean();

        if (!returnData) {
            return res.status(404).json({success: false, error: "Nenhuma devolução encontrada"});
        }

        // Busca loja
        const shop = await ShopModel.findOne({ shop_id: returnData.shop_id }).lean();

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

    } catch (error) {
        console.error("Erro na rota /scan:", error);
        return res.status(500).json({success: false, error: "Erro interno no servidor"
        });
    }
});


// 
// Rota para finalizar a devoluçao 
// E salvar no banco as informacoes 
//
router.post("/finish", upload.single("imagen"), async (req, res) => {
    const { return_sn, observation } = req.body;

    if (!return_sn) {
        return res.status(400).json({ success: false, error: "return_sn é obrigatório"});
    }

    try {
        // Atualiza o status e já retorna o documento
        const returnData = await ReturnModel.findOneAndUpdate(
            { return_sn },
            { status: "Concluida" },
            { new: true }
        ).lean();

        if (!returnData) {
            return res.status(404).json({ success: false, error: "Falha em achar a devolução"});
        }

        // Caminho da imagem (se enviada)
        const filePath = req.file ? `/uploads/${req.file.filename}` : null;

        // Cria o registro da conclusão
        await FinishModel.create({
            return_id: returnData.return_sn,
            observation: observation || null,
            imagen: filePath,
            data_finish: Timestamp()
        });

        return res.status(200).json({success: true, message: "Devolução concluída",});

    } catch (error) {
        console.error("Erro na rota /finish:", error);
        return res.status(500).json({success: false, error: "Erro no servidor"});
    }
});

export default router; 