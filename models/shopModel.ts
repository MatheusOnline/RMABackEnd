import mongoose, { Document, Schema } from "mongoose";

export interface IShop extends Document {
  shop_id: string;
  user_id: string;
  name: string;
  dayCount?: string;
  access_token?: string;
  refresh_token?: string;
}

const shopSchema = new Schema<IShop>({
  shop_id: { type: String, required: true, unique: true },
  user_id: {type: String},
  name: {type: String, default: ""},
  dayCount: { type: String },
  access_token: { type: String },
  refresh_token: { type: String },
});

export const ShopModel = mongoose.model<IShop>("Shop", shopSchema);
