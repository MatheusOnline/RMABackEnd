import express from "express"
import dotenv from "dotenv"



//======FUNCOES========//
import Sign from "../utils/sign";
import Timestamp from "../utils/timestamp";
import CreateShop from "../utils/dbUtius/createShop";
import { ShopModel } from "../models/shopModel";

//====CONFIGURACOES====//
const router = express.Router();
dotenv.config();

// CORS para todas as rotas deste router





//======VARIAVEIS======//
const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;



//=======ROTA PARA GERAR O TOKEN DA LOJA========//
router.post("/generate", async (req,res) =>{
    try{ 
        const { code, shop_id, user_id } = req.body;

        
        if(!code || !shop_id)   
            return res.status(400).json("Code e shop_id não pode ser nulo")

        if (!process.env.PARTNER_ID || !process.env.HOST) 
            return res.status(500).json("As variaveis de processo nao forao coletadas" )
               

        const path = "/api/v2/auth/token/get";
        const ts = Timestamp();
        const sign = Sign({path, ts})

        const url = `${host}${path}?partner_id=${partner_id}&timestamp=${ts}&sign=${sign}`;

        const body = {
            code,
            shop_id: Number(shop_id),
            partner_id: Number(partner_id),
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        const shop = await CreateShop({shop_id})
        
        if (shop instanceof ShopModel) {
            shop.access_token = data.access_token;
            shop.refresh_token = data.refresh_token;   
            shop.user_id =  user_id;
            await shop.save();
        } else {
            console.error("CreateShop  não retornou uma instância válida de ShopModel:", shop);
        }

        
        return res.status(200).json(data);
    }catch(error){
        return res.status(500).json({error:"Erro interno ao gerar token"})
    }
})


//=====ROTA PARA ATUALIZAR O TOKEN DA LOJA======//
router.post("/refresh", async(req,res) => {
    try{
        const {shop_id} = req.body

        if(!shop_id)
            return res.status(400).json("shop_id não pode ser nulo")

        if (!process.env.PARTNER_ID || !process.env.HOST) 
            return res.status(500).json("As variaveis de processo nao forão coletadas" )

        
        const shop = await ShopModel.findOne({shop_id})

        if(!shop){
            return res.status(500).json("As variaveis de processo nao forão coletadas" )
        }
        const path = "/api/v2/auth/access_token/get";
        const ts = Timestamp();
        const sign = Sign({path, ts})

        const url = `${host}${path}?partner_id=${partner_id}&sign=${sign}&timestamp=${ts}`

        const body = {
            shop_id: Number(shop_id),
            refresh_token: shop?.refresh_token,
            partner_id: Number(partner_id),
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        
        
        if(shop)
        {
            if(data.refresh_token && data.access_token)
            {
                (shop as any).access_token = data.access_token;
                (shop as any).refresh_token = data.refresh_token;
                await (shop as any).save()
            }
        }

        return res.status(200).json(data)
    }
    catch(error){
        return res.status(500).json({error:"Erro interno ao atualizar token"})
    }
})

export default router