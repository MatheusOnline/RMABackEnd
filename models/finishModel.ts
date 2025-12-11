import mongoose from "mongoose";



const finishSchema = new mongoose.Schema({
  return_id: { type: String},
  observation: {type: String, default: "" },
  imagen: { type: [String], default: [] },
  data_finish: { type: String }
});

export const FinishModel = mongoose.model("finish", finishSchema)