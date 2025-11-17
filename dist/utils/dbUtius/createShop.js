"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shopModel_1 = require("../../models/shopModel");
async function CreateShop({ shop_id }) {
    try {
        let store = await shopModel_1.ShopModel.findOne({ shop_id });
        if (!store) {
            store = await shopModel_1.ShopModel.create({ shop_id, dayCount: "1" });
        }
        return store; // sempre retorna um documento Mongoose válido
    }
    catch (error) {
        console.error("Erro ao criar ou buscar loja:", error);
        throw error; // importante: lança o erro, não retorna
    }
}
exports.default = CreateShop;
