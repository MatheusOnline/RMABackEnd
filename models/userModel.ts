import mongoose from "mongoose";



const userSchema = new mongoose.Schema({
  userName: { type: String, required: true,},
  password: {type: String, required: true,},
  cpf:  {type: String, required: true,},
  shops: [
    {
      shop_id: { type: String, required: true },
      name: { type: String, required: true },
    }
  ]
});

export const UserModel = mongoose.model("user", userSchema)