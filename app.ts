import express from "express";
import cors from "cors";
import { ReturnModel } from "./models/returnModel";
import { ShopModel } from "./models/shopModel";
import mongoose from "mongoose";

//=======IMPORTANDO ROTAS========//
import returnRoutes from "./router/Returns"
import tokenRoutes from "./router/Tokens"
import shopRoutes from "./router/Shop"



const app = express();
app.use(express.json());
app.use(cors());

const uri = "mongodb+srv://matheus:Cavalo123!@dados.mkmjd.mongodb.net/meuBanco?retryWrites=true&w=majority";



mongoose.connect(uri)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
  .catch(err => console.error("❌ Erro ao conectar no MongoDB:", err));


app.use("/return", returnRoutes)
app.use("/token", tokenRoutes)
app.use("/shop", shopRoutes)





//====================//
//  ROTAS DE TESTES   //
//====================//

app.get("/stores", async (req, res) => {
  try {
    const rmas = await ShopModel.find();

    res.send(rmas)
  } catch (err) {
    console.error(err);

    res.status(500).send("Erro ao buscar RMAs");
  }
});

app.get("/returns", async (req, res) => {
  try {
    const rmas = await ReturnModel.find();

    res.send(rmas)
  } catch (err) {
    console.error(err);

    res.status(500).send("Erro ao buscar RMAs");
  }
});
app.get("/ClearReturns", async (req, res) => {
  try {
    await ReturnModel.deleteMany({ });
    
    

    res.send("deletado")
  } catch (err) {
    console.error(err);

    res.status(500).send("Erro ao buscar RMAs");
  }
});
app.listen(5000, () => console.log("🚀 Servidor rodando na porta 5000"));
