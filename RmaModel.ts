import mongoose from "mongoose";

const RmaSchema = new mongoose.Schema({
  id: { type: String, required: true },
  motivo: { type: String, required: true },
  data: { type: String, required: true },
  status: { type: String, required: true },
});

export const RmaModel = mongoose.model("Rma", RmaSchema);
