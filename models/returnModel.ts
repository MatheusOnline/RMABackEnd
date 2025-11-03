import mongoose from "mongoose"

const buyerVideosSchemas = new mongoose.Schema({
    thumbnail_url: {type: String, required: false},
    video_url: {type: String, required: false}
})

const userSchema = new mongoose.Schema({
    username: {type: String, required: true},
    portrait: {type: String, required: false}
})

const itemSchema = new mongoose.Schema({
    images: { type: [String], required: true }, // array de strings
    item_id: { type: String, required: true },
    item_price: { type: String, required: true },
    amount: { type: String, required: true },
    name: { type: String, required: true }
});

const returnSchema = new mongoose.Schema({
    shop_id:{type: String, required: true},
    return_sn: {type: String, required: true},
    order_sn: {type: String, required: true},
    tracking_number: {type: String, required: false},
    status: {type: String, required: true},
    reason: {type: String, required: true},
    text_reason: {type: String, required: true},
    create_time: {type: String, required: true},

    buyerVideos: buyerVideosSchemas,
    user: userSchema,
    item: { type: [itemSchema], required: true },

})

export const ReturnModel = mongoose.model("Return", returnSchema)