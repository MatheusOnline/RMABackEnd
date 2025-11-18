import { ShopModel } from "../../models/shopModel";
import crypto from "crypto";
import refreshAccessToken from "../refreshAccessToken";
function Sign(path: string, ts: string, access_token: string, shop_id: string) {
    const partnerKey = process.env.PARTNER_KEY!;
    const baseStr = `${process.env.PARTNER_ID}${path}${ts}${access_token}${shop_id}`;

    return crypto
        .createHmac("sha256", partnerKey)
        .update(baseStr)
        .digest("hex");
}

const partner_id = process.env.PARTNER_ID!;
const host = process.env.HOST!;

async function SeachReturns(shop_id: string) {
    try {
        console.log("🔍 Buscando devoluções...");

        const shop = await ShopModel.findOne({ shop_id });
        if (!shop) {
            console.log("Loja não encontrada.");
            return null;
        }

        const access_token = String((shop as any).access_token);
        const ts = String(Math.floor(Date.now() / 1000));
        const create_from = String(Number(ts) - 10 * 24 * 60 * 60);
        const create_to = ts;

        const path = "/api/v2/returns/get_return_list";
        const sign = Sign(path, ts, access_token, shop_id);

        const params = {
            access_token,
            partner_id,
            shop_id,
            page_no: "1",
            page_size: "50",
            timestamp: ts,
            sign,
            create_time_from: create_from,
            create_time_to: create_to,
        };

        const url = `${host}${path}?${new URLSearchParams(params).toString()}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = await response.json();
        
        if(data.error === "invalid_acceess_token"){
            await refreshAccessToken(shop_id)
        }
        
        console.log("✔️ Resposta da Shopee:", data);

        return data;
    } catch (error) {
        console.log("❌ Erro ao buscar devoluções:", error);
        return null;
    }
}

export default SeachReturns;
