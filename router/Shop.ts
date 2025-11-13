import express from "express"
import dotenv from "dotenv"
import crypto from "crypto";

//======FUNCOES========//
import Timestamp from "../utils/timestamp";
import CreateShop from "../utils/dbUtius/createShop";
import refreshAccessToken from "../utils/refreshAccessToken";
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

//=======ROUTA PARA BUSCAR OS DADOS DA EMPRESA
router.post("/datas", async (req, res) =>{
    try{
        const {shop_id} = req.body

        if(!shop_id)
            return res.status(400).json({error:"shop_id não pode ser nulo"})

        if (!process.env.PARTNER_ID || !process.env.HOST) 
            return res.status(500).json({error:"As variaveis de processo não forão coletadas"})

        const path = "/api/v2/shop/get_profile";
        const ts = Timestamp();
        
        const shop = await CreateShop({shop_id})

        if(!shop)
            return res.status(500).json({error:"Falha ao buscar a loja"})

        const access_token =  (shop as any).access_token
        const sign = Sign({path, ts, access_token, shop_id})


        if(!access_token)
            return res.status(500).json({error:"Falha ao buscar o access token"})
        
        const url = `${host}${path}?partner_id=${partner_id}&timestamp=${ts}&access_token=${access_token}&shop_id=${shop_id}&sign=${sign}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();

            if(data.error === "invalid_acceess_token"){
                const newToken = await refreshAccessToken(shop_id);
                if (!newToken) {
                    return res.status(401).json({ error: "Falha ao renovar token" });
                }
            }
            
            if (data.response.shop_name) {
                shop.name = data.response.shop_name;
            }

            await shop.save();
            return res.status(200).json(data);

        }catch (error) {
            return res.status(500).json(error);
        }    



    }catch(error){
        return res.status(500).json({error:error})
    }

})


export default router;