import express from "express";
import dotenv from "dotenv"
import crypto from "crypto";
import multer from "multer";

//====CONFIGURACOES====//
import storage from "../config/multerConfig";


//=======SCHEMA=======//
import { ReturnModel } from "../models/returnModel";
import { FinishModel } from "../models/finishModel";
import { ShopModel } from "../models/shopModel";


//======FUNCOES========//
import CreateReturn from "../utils/dbUtius/createReturn";
import Timestamp from "../utils/timestamp";
import refreshAccessToken from "../utils/refreshAccessToken";
import SeachReturns from "../utils/returns/SeachReturns";



//====CONFIGURACOES====//
const router = express.Router();
dotenv.config();

const upload = multer({storage: storage})



//======VARIAVEIS======//
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;


interface SignFunctions {
  path: string;
  ts: Number;
  access_token: Number;
  shop_id: Number;
}

//
//Funçao é chamada acada X tempo
//Salva no banco de dados as devolucoes
//
router.get("/cron/get", async (req, res) => {
    try {
        const shops = await ShopModel.find().lean(); // todas as lojas

        console.log(`🔍 Encontradas ${shops.length} lojas`);

        for (const shop of shops) {
            const shop_id = String(shop.shop_id);

            console.log(`Buscando devoluções da loja: ${shop_id}`);

            let data = await SeachReturns(shop_id);

            const returnList = data?.response?.return || [];

            if (!Array.isArray(returnList)) {
                console.log(`Resposta inválida para loja ${shop_id}`);
                continue; // pula essa loja e segue
            }

            if (returnList.length > 0) {
                console.log(` Encontradas ${returnList.length} devoluções para ${shop_id}`);
                await CreateReturn(shop_id, returnList);
            } else {
                console.log(`Nenhuma devolução encontrada para ${shop_id}`);
            }
        }

        return res.send("Cron OK — todas as lojas processadas");

    } catch (error) {
        console.error("❌ erro no cron:", error);
        return res.status(500).json({ error: "Erro geral no cron" });
    }
});

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
//
//Rota para buscara as devolucoes no banco de dados
//Retorna as devolucoes para o frontend
// 
router.post("/get", async (req, res) => {
    try {
        const { shop_id } = req.body;
        if (!shop_id)
            return res.status(400).json({ error: "shop_id não pode ser nulo" });

        let data = await SeachReturns(shop_id)


        const returnList = data?.response?.return || [];

        if(!Array.isArray(returnList)){
            return res.status(500).json({ error: "Resposta invalida da Shopee"})
        }

        data = null

        if (returnList.length > 0) {
            await CreateReturn(shop_id, returnList);
        }

        const listReturns = await ReturnModel.find({ shop_id }).limit(500).lean();
      
        return res.json({ success: true, return_list: listReturns });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error });
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
        console.log(data)

        

        if(data.error === "invalid_acceess_token"){
            const newToken = await refreshAccessToken(shop_id);
            if (!newToken) {
                return res.status(401).json({ error: "Falha ao renovar token" });
            }
        }

        if(data.error === "returns.error_reverse_logistics"){
            return res.status(200).json({message:"Pedido não tem logistica reversa", success: false})
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