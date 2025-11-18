import { ReturnModel } from "../../models/returnModel";

interface ShopeeItem {
  images?: string[];
  item_id?: number;
  item_price?: number;
  amount?: number;
  name?: string;
}

interface ShopeeBuyerVideo {
  thumbnail_url?: string;
  video_url?: string;
}

interface ShopeeReturn {
  return_sn: string;
  order_sn?: string;
  tracking_number?: string;
  status?: string;
  reason?: string;
  text_reason?: string;
  create_time?: number;
  item?: ShopeeItem[];
  user?: {
    username?: string;
    portrait?: string;
  };
  buyer_videos?: ShopeeBuyerVideo[];
}

async function CreateReturn(shop_id: string, returnList: ShopeeReturn[]) {
  try {

    const filteredReturns = returnList.filter(ret => ret.status !== "CANCELLED");
    console.log(`🔍 Recebidas ${returnList.length} devoluções.`);
    console.log(`🚫 Removidas (CANCELLED): ${returnList.length - filteredReturns.length}`);
    console.log(`📦 Processando: ${filteredReturns.length}`);
    
    const operations = returnList.map((ret) => ({
      updateOne: {
        filter: { return_sn: ret.return_sn },
        update: {
          $setOnInsert: {
            shop_id,
            return_sn: ret.return_sn,
            order_sn: ret.order_sn,
            tracking_number: ret.tracking_number,
            status: ret.status || "",
            reason: ret.reason || "",
            text_reason: ret.text_reason || "",
            create_time: ret.create_time,
            item:
              ret.item?.map((i) => ({
                images: i.images || [],
                item_id: i.item_id || 0,
                item_price: i.item_price || 0,
                amount: i.amount || 1,
                name: i.name || "unknown",
              })) || [],
            user: {
              username: ret.user?.username || "unknown",
              portrait: ret.user?.portrait || "",
            },
            buyer_videos:
              ret.buyer_videos?.map((v) => ({
                thumbnail_url: v.thumbnail_url || "",
                video_url: v.video_url || "",
              })) || [],
          },
        },
        upsert: true
      }
    }));

    const result = await ReturnModel.bulkWrite(operations, { ordered: false });

    console.log("✅ Bulk concluído.");
    console.log(`➡️ Inseridos: ${result.upsertedCount}`);
    console.log(`➡️ Já existiam: ${returnList.length - result.upsertedCount}`);

    return {
      success: true,
      inserted: result.upsertedCount
    };

  } catch (error) {
    console.error("❌ Erro no bulk:", error);
    return { success: false, error: error };
  }
}

export default CreateReturn;
