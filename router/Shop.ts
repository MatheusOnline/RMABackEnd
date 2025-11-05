import express from "express"
import dotenv from "dotenv"

//======FUNCOES========//
import Sign from "../utils/sign";
import Timestamp from "../utils/timestamp";
import CreateShop from "../utils/dbUtius/createShop";

//====CONFIGURACOES====//
const router = express.Router();
dotenv.config();

//======VARIAVEIS======//
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;

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
        const sign = Sign({path, ts})

        const shop = await CreateShop(shop_id)

        if(!shop)
            return res.status(500).json({error:"Falha ao buscar a loja"})

        const access_token =  (shop as any).access_token

        if(!access_token)
            return res.status(500).json({error:"Falha ao buscar o access token"})
        
        const url = `${host}${path}?partner_id=${partner_id}&timestamp=${ts}&access_token=${access_token}&shop_id=${shop_id}&sign=${sign}`;
            
        try {
            const response = await fetch(url);
            const data = await response.json();
            return res.status(200).json(data);

        }catch (error) {
            return res.status(500).json(error);
        }    



    }catch(error){
        return res.status(500).json(error)
    }

})


export default router;