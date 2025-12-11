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
import { UserModel } from "../models/userModel";

//======FUNCOES========//
import CreateReturn from "../utils/dbUtius/createReturn";
import Timestamp from "../utils/timestamp";
import refreshAccessToken from "../utils/refreshAccessToken";

import SeachReturns from "../utils/returns/SeachReturns";
import UpdateRetuns from "../utils/returns/UpdateRetuns";



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

            await SeachReturns(shop_id);
             await UpdateRetuns(shop_id)
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
// Rota para buscar e salvar a devolucao 
// Atraves da API da shopee
//
router.post("/save", async (req, res) =>{
    try {
        const { shop_id } = req.body;

        await SeachReturns(shop_id)
       
        return res.status(200).json({success:false, message:"Salvo"})
    }catch(error){
        console.log(error)
        return res.status(500).json({error:error, success: false})
    }
})

//
// Rota para atualizar o status das devolucoes
//atualiza com base se tiver numero de transporte
//
router.post("/update", async (req, res)=>{
    try{
        const { shop_id } = req.body;

        await UpdateRetuns(shop_id)

        return res.status(200).json({success:true, menssage:"Atualizado"})
    }catch(error){
        console.log(error)
        return res.status(500).json({error:error, success: false})
    }



})

//
//Rota para buscar a as devolucoes no banco de dados
//Retorna as devolucoes para o frontend
// 
router.post("/get", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id)
      return res.status(400).json({ error: "user_id não pode ser nulo" });

    const user = await UserModel.findById(user_id).lean();

    if (!user || !user.shops || user.shops.length === 0) {
      return res.status(404).json({ error: "Usuário sem lojas cadastradas" });
    }

    const shopIds = user.shops.map((shop: any) => shop.shop_id);

    const listReturns = await ReturnModel.find({
      shop_id: { $in: shopIds }
    })
      .limit(500)
      .lean();

    // AGRUPA AS DEVOLUÇÕES POR LOJA
    const returnsByShop = user.shops.map((shop: any) => ({
      shop_id: shop.shop_id,
      shop_name: shop.name,
      devolucoes: listReturns.filter((ret: any) => ret.shop_id == shop.shop_id)
    }));

    return res.status(200).json({
      success: true,
      shops: returnsByShop
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno" });
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
// Rota do scanear de devoluçao 
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

        if(returnData.status === "RECEBIDO"){
            return res.status(400).json({ success: false, error: "Devolução já finalizada" });
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
router.post("/finish", upload.array("photos", 10), async (req, res) => {
    const { return_sn, observation } = req.body;

    if (!return_sn) {
        return res.status(400).json({ success: false, error: "return_sn é obrigatório" });
    }

    try {
        const returnData = await ReturnModel.findOneAndUpdate(
            { return_sn },
            { status: "RECEBIDO" },
            { new: true }
        ).lean();

        if (!returnData) {
            return res.status(404).json({ success: false, error: "Falha em achar a devolução" });
        }

        if(returnData.status === "RECEBIDO"){
            return res.status(400).json({ success: false, error: "Devolução já finalizada" });
        }
 
        const files = Array.isArray(req.files) ? req.files : [];

        const filePaths = files.map(f => `/uploads/${f.filename}`);

        await FinishModel.create({
            return_id: returnData.return_sn,
            observation: observation || null,
            imagen: filePaths,
            data_finish: Timestamp()
        });

        return res.status(200).json({
            success: true,
            message: "Devolução concluída"
        });

    } catch (error) {
        console.error("Erro REAL na rota /finish:", error);
        return res.status(500).json({ success: false, error: "Erro interno no servidor"});
    }
});


export default router;