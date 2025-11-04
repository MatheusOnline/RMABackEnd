import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import crypto from "crypto";
import { StoreModel } from "./models/storeModel";
import { ReturnModel } from "./models/returnModel";
import { ShopModel } from "./models/shopModel";
import mongoose from "mongoose";

//=======IMPORTANDO ROTAS========//
import returnRoutes from "./router/Returns"
import tokenRoutes from "./router/Tokens"



const partner_id = 2013259;
const partner_key = "shpk79414a436a4a64585553496764445948414c66555372416945654d7a424a";
const host = "https://partner.shopeemobile.com";

const app = express();
app.use(express.json());
app.use(cors());

const uri = "mongodb+srv://matheus:Cavalo123!@dados.mkmjd.mongodb.net/meuBanco?retryWrites=true&w=majority";



mongoose.connect(uri)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
  .catch(err => console.error("❌ Erro ao conectar no MongoDB:", err));


app.use(returnRoutes)
app.use("/token", tokenRoutes)



app.post("/get_profile", async (req, res) => {
  const { token, shop_id } = req.body; // <-- era req.query
  const access_token = token;          // alias p/ manter compatível

  const timestamp = Math.floor(Date.now() / 1000);
  const path = "/api/v2/shop/get_profile";

  const baseString = `${partner_id}${path}${timestamp}${access_token}${shop_id}`;
  const sign = crypto
    .createHmac("sha256", partner_key)
    .update(baseString)
    .digest("hex");

  const url = `${host}${path}?partner_id=${partner_id}&timestamp=${timestamp}&access_token=${access_token}&shop_id=${shop_id}&sign=${sign}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar perfil" });
  }
});

interface ShopeeReturn {
  return_id: number;
  // outros campos que quiser
}


interface ShopeeItem {
  images?: string[];
  item_id?: number;
  item_price?: number;
  amount?: number;
  name?: string;
}
app.post("/get_return", async (req, res) => {
  try {
    const { token, shop_id } = req.body;
    const timestamp = Math.floor(Date.now() / 1000);

    var dayCount = 1;
    let allReturns: any[] = [];

    let store = await StoreModel.findOne({ shop_id });

    if(!store){
      store = new StoreModel({ shop_id, dayCount });
      await store.save();

    }else{
      if (store.dayCount) {
        dayCount = Number(store.dayCount);
      }
    }

   while(true){
      const fifteenDaysAgo = timestamp - dayCount * 24 * 60 * 60;

      const path = "/api/v2/returns/get_return_list";

      const baseString = `${partner_id}${path}${timestamp}${token}${shop_id}`;
      const sign = crypto
        .createHmac("sha256", partner_key)
        .update(baseString)
        .digest("hex");

      const params = {
        access_token: token,
        partner_id: String(partner_id),
        shop_id: String(shop_id),
        page_no: "1",
        page_size: "100",
        timestamp: String(timestamp),
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

      if (data.error) {
        throw new Error(`API Error: ${data.error} - ${data.message}`);
      }

      const returnList = data?.response?.return || [];
      if(returnList.length > 0){
        
        //========VAI SALVAR AS DEVOULUCOES NO BANCO=========//
        allReturns.push(...returnList);
        console.log(`✅ Total de devoluções encontradas: ${allReturns.length}`);
        for(const ret of allReturns){
          try{
            const verify = await ReturnModel.findOne({ return_sn: ret.return_sn });
            if(!verify)
            {

              await ReturnModel.create({
                shop_id:shop_id,
                return_sn: ret.return_sn,
                order_sn: ret.order_sn,
                tracking_number: ret.tracking_number,
                status: ret.status || '',
                reason: ret.reason || '',
                text_reason: ret.text_reason || '',
                create_time: ret.create_time,
                item: ret.item?.map((i:ShopeeItem) => ({
                  images: i.images || [],
                  item_id: i.item_id || 0,
                  item_price: i.item_price || 0,
                  amount: i.amount || 1,
                  name: i.name || 'unknown'
                })) || [],
                user:{
                  username: ret.user.username,
                  portrait: ret.user.portrait
                },
                buyerVideos:{
                  thumbnail_url: ret.thumbnail_url,
                  video_url: ret.video_url
                }
              }) 
            }
          }catch(erro){
            res.json("Error na hora de salvar no banco:" + erro )
          }
        }
        
        await StoreModel.updateOne(
          { shop_id },
          { $set: { dayCount: String(dayCount) } }
        );
        break;
      }

      
      dayCount++;
      console.log(dayCount)
      await new Promise((r) => setTimeout(r, 500));
    }
    

   const listReturns = await ReturnModel.find({ shop_id: shop_id });
    res.json({success: true, return_list: listReturns});
  } catch (err) {
    res.status(500).json({ err });
  }
});

//====================//
//  ROTAS DE TESTES   //
//====================//

app.get("/stores", async (req, res) => {
  try {
    const rmas = await ShopModel.find();

    res.send(rmas)
  } catch (err) {
    console.error(err);

    res.status(500).send("Erro ao buscar RMAs");
  }
});
app.get("/ClearReturns", async (req, res) => {
  try {
    await ReturnModel.deleteMany({ });

    res.send("deletado")
  } catch (err) {
    console.error(err);

    res.status(500).send("Erro ao buscar RMAs");
  }
});
app.listen(5000, () => console.log("🚀 Servidor rodando na porta 5000"));
