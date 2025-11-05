import { ShopModel } from "../../models/shopModel";

interface ShopFunction {
    shop_id: string;
}

async function CreateShop({ shop_id }: ShopFunction) {
    try {
        let store = await ShopModel.findOne({ shop_id });

        if (!store) {
            store = await ShopModel.create({ shop_id, dayCount:"1" });
        }

        return store; // sempre retorna um documento Mongoose válido
    } catch (error) {
        console.error("Erro ao criar ou buscar loja:", error);
        throw error; // importante: lança o erro, não retorna
    }
}

export default CreateShop;
