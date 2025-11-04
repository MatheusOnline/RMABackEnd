import express from "express"
import Timestamp from "../utils/timestamp";
import Sign from "../utils/sign";
import dotenv from "dotenv"

const router = express.Router();
dotenv.config();

const partner_id = process.env.PARTNER_ID;
const host = process.env.HOST;

router.post("/generate", async (req,res) =>{
    try{ 
        const { code, shop_id } = req.body;

        
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
            partner_id: partner_id,
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return res.status(200).json(data);
    }catch(error){
        return res.status(500).json({error:"Erro interno ao gerar token"})
    }
})

export default router