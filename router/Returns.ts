import express from "express";
import dotenv from "dotenv"
import crypto from "crypto";

//=======SCHEMA=======//
import { ReturnModel } from "../models/returnModel";

//======FUNCOES========//
import CreateShop from "../utils/dbUtius/createShop";
import CreateReturn from "../utils/dbUtius/createReturn";
import Timestamp from "../utils/timestamp";
import refreshAccessToken from "../utils/refreshAccessToken";
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


router.post("/get", async (req, res) => {
    try {
        const { shop_id } = req.body;
        if (!shop_id)
            return res.status(400).json({ error: "shop_id não pode ser nulo" });

        const days = 4; // últimos 5 dias
        const shop = await CreateShop({ shop_id });
        if (!shop)
            return res.status(400).json({ error: "Erro na hora de pegar a loja" });

        // 🕒 timestamps em segundos
        const ts = Math.floor(Date.now() / 1000);
        const fiveDaysAgo = ts - days * 24 * 60 * 60;

        const path = "/api/v2/returns/get_return_list";
        let access_token = (shop as any).access_token;
        let sign = Sign({ path, ts, access_token, shop_id });

        const params = {
            access_token,
            partner_id: String(partner_id),
            shop_id: String(shop_id),
            page_no: "1",
            page_size: "50",
            timestamp: String(ts),
            sign,
            create_time_from: String(fiveDaysAgo),
            create_time_to: String(ts),
        };

        const urlParams = new URLSearchParams(params).toString();
        let url = `${host}${path}?${urlParams}`;

        let data;
        try {
            const response = await fetch(url);
            data = await response.json();

            // Se o token for inválido, renova e tenta novamente
            if (data.error === "invalid_acceess_token") {
                console.warn("Token inválido, tentando renovar...");

                const newToken = await refreshAccessToken(shop_id);
                if (!newToken) {
                    return res.status(401).json({ error: "Falha ao renovar token" });
                }

                const newSign = Sign({ path, ts, access_token: newToken, shop_id });
                const newParams = new URLSearchParams({
                    ...params,
                    access_token: newToken,
                    sign: newSign,
                }).toString();

                url = `${host}${path}?${newParams}`;
                const retryResponse = await fetch(url);
                data = await retryResponse.json();
            }

        } catch (err) {
            console.error("Erro na requisição:", err);
            return res.status(500).json({ error: "Erro ao buscar devoluções" });
        }

        console.log("Resposta Shopee:", data);

        const returnList = data?.response?.return || [];

        if (returnList.length > 0) {
            await CreateReturn(shop_id, returnList);
        }

        const listReturns = await ReturnModel.find({ shop_id });
        return res.json({ success: true, return_list: listReturns });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error });
    }
});



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

router.post("/tracking", async (req, res) =>{
    const { return_sn, shop_id} = req.body
    try {
    console.log("Body recebido:", req.body);

    const shop = await CreateShop({ shop_id });
    console.log("Shop retornado:", shop);

    const path = "/api/v2/returns/get_reverse_tracking_info";
    
    const ts = Timestamp();
    const access_token = (shop as any).access_token
    const sign = Sign({path, ts, access_token, shop_id})


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
    console.log("URL:", url);

    const response = await fetch(url);
    const datas = await response.json();
    

    res.status(200).json({datas:datas, success: true});
} catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ error: err, stack: err });
}
})
export default router;