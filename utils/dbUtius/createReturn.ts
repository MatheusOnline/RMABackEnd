import { ReturnModel } from "../../models/returnModel";

interface ShopeeItem {
  images?: string[];
  item_id?: number;
  item_price?: number;
  amount?: number;
  name?: string;
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
  thumbnail_url?: string;
  video_url?: string;
}

async function CreateReturn(shop_id: string, returnList: ShopeeReturn[]) {
  try {
    const allReturns: ShopeeReturn[] = [...returnList];
    console.log(`✅ Total de devoluções encontradas: ${allReturns.length}`);

    for (const ret of allReturns) {
      const verify = await ReturnModel.findOne({ return_sn: ret.return_sn });
      if (!verify) {
        await ReturnModel.create({
          shop_id: shop_id,
          return_sn: ret.return_sn,
          order_sn: ret.order_sn,
          tracking_number: ret.tracking_number,
          status: ret.status || '',
          reason: ret.reason || '',
          text_reason: ret.text_reason || '',
          create_time: ret.create_time,
          item:
            ret.item?.map((i: ShopeeItem) => ({
              images: i.images || [],
              item_id: i.item_id || 0,
              item_price: i.item_price || 0,
              amount: i.amount || 1,
              name: i.name || 'unknown',
            })) || [],
          user: {
            username: ret.user?.username || 'unknown',
            portrait: ret.user?.portrait || '',
          },
          buyerVideos: {
            thumbnail_url: ret.thumbnail_url || '',
            video_url: ret.video_url || '',
          },
        });
      }
    }

    console.log("✅ Salvamento concluído com sucesso.");
    return { success: true, count: allReturns.length };
  } catch (error) {
    console.error("❌ Erro ao salvar devoluções:", error);
    return { success: false, error: error instanceof Error ? error.message : error };
  }
}


export default CreateReturn;