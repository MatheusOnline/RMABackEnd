import mongoose from "mongoose";

const storeSchema = new mongoose.Schema({
    shop_id: {type: String, required: true},
    dayCount: {type: String}
    
})

export const StoreModel = mongoose.model("store", storeSchema)