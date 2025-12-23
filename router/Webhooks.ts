import express from "express";
import { ShopModel } from "../models/shopModel";

const router = express.Router();


async function SeachShop(shop_id:string) {
    const shop  =  await ShopModel.findOne({shop_id})
    
    if(shop)
        return shop

    
}


router.post("/shopee", async (req, res) => {

  // 🔐 verificação Shopee
  if (req.body.code === 0) {
    return res.status(200).json({
      code: 0,
      message: "success",
    });
  }

  // só eventos de pedido
  if (req.body.code === 3 && req.body.data?.status === "TO_RETURN") {
    const shop = await SeachShop(req.body.shop_id);

    console.log("🚨 TO_RETURN DETECTADO");
    console.log("Pedido:", req.body.data.ordersn);
    console.log("Shop ID:", req.body.shop_id);
    console.log("Loja:", shop?.name ?? "não encontrada");
  }

  return res.status(200).json({ ok: true });
});



export default router;
