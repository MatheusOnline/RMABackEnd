import mongoose from "mongoose";

const storeSchema = new mongoose.Schema({
    id_store: {type: String, required: true},
    dayCount: {type: String}
})

export const StoreModel = mongoose.model("store", storeSchema)