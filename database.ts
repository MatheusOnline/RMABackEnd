import mongoose from "mongoose";
const uri = "mongodb+srv://matheus:minhaSenha123@dados.mkmjd.mongodb.net/";

export async function connectDB() {
  try {
    await mongoose.connect(
      "mongodb+srv://matheus:<Cavalo123!>@dados.mkmjd.mongodb.net/rmaDB"
    );
    console.log("✅ Conectado ao MongoDB Atlas com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao conectar no MongoDB:", error);
  }
}
