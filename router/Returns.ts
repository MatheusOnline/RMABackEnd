import express from "express";
import dotenv from "dotenv"
import crypto from "crypto";

//=======SCHEMA=======//
import { ReturnModel } from "../models/returnModel";

//======FUNCOES========//
import CreateShop from "../utils/dbUtius/createShop";
import CreateReturn from "../utils/dbUtius/createReturn";
import Timestamp from "../utils/timestamp";
import { ShopModel } from "../models/shopModel";
//====CONFIGURACOES====//
const router = express.Router();
dotenv.config();

//======VARIAVEIS======//
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;


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


router.post("/get", async (req, res) =>{
    try{
        const {shop_id} = req.body;
        let days = 1;
        let listReturns;
        if(!shop_id)
            return res.status(400).json({error:"shop_id não pode ser nulo"})

        const shop = await CreateShop({shop_id})
        
        if(!shop)
            return res.status(400).json({error:"Erro na hora de pegar a loja"})
        else
            days = Number(shop.dayCount);

        while(true){
            const fifteenDaysAgo = Timestamp() - days * 24 * 60 * 60;
            
            const path = "/api/v2/returns/get_return_list";
            const ts = Timestamp()
            const access_token = (shop as any).access_token
            const sign = Sign({path, ts, access_token, shop_id})

            const params = {
                access_token: access_token,
                partner_id: String(partner_id),
                shop_id: String(shop_id),
                page_no: "1",
                page_size: "100",
                timestamp: String(ts),
                sign,
                create_time_from: String(fifteenDaysAgo),
            };

            const urlParams = new URLSearchParams(params).toString();
            const url = `${host}${path}?${urlParams}`;

            const response = await fetch(url);
            const data = await response.json() as {
                response?: { return?: any[]; has_more?: boolean };
                error?: string;
                message?: string;
            };
            
            //listReturns = data?.response?.return || []
            const returnList = data?.response?.return || [];

            if(returnList.length > 0){
                const result = await CreateReturn(shop_id, returnList);
                break;
            }
            
        

            if (shop instanceof ShopModel) {
                shop.dayCount = String(days);
                await shop.save();
            } else {
                console.error("CreateShop não retornou uma instância válida de ShopModel:", shop);
            }
            if(days > 150){
                return res.status(500).json({success: false, error: "Nenhuma devoluçao encontrada"})
                break;
            }
            days++;
            await new Promise((r) => setTimeout(r, 500));
        }
        
        
        
        listReturns = await ReturnModel.find({ shop_id: shop_id });
      
        res.json({success: true, return_list: listReturns});


    }catch(error){
        return res.status(500).json({error: error})
    }

})


router.post("/seach", async (req, res) =>{
    const { return_sn} = req.body

    try{
        const data = await ReturnModel.findOne({return_sn})

        if(!data)
            res.status(200).json({error:"Essa devoluçao nao existe", succeso:false})
        
        res.status(200).json({data:data, succeso:true})
    }
    catch(error){
        res.status(500).json(error)
    }
})
export default router;