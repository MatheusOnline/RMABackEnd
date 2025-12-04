import express from "express";
import cors from "cors"

import { ReturnModel } from "./models/returnModel";
import { ShopModel } from "./models/shopModel";
import { FinishModel } from "./models/finishModel";
import mongoose from "mongoose";

//=======IMPORTANDO ROTAS========//
import returnRoutes from "./router/Returns"
import tokenRoutes from "./router/Tokens"
import shopRoutes from "./router/Shop"
import dashboard from "./router/Dashboard"
import loginRouter from "./router/Login"
import userRouter from "./router/user"

import path from "path";


  const app = express();
  app.use(cors({
    origin: ["http://localhost:5173",
      "https://rma-controller.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));


// 👉 habilita acesso público à pasta 'uploads'
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const uri = "mongodb+srv://matheus:Cavalo123!@dados.mkmjd.mongodb.net/meuBanco?retryWrites=true&w=majority";



mongoose.connect(uri)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
  .catch(err => console.error("❌ Erro ao conectar no MongoDB:", err));


app.use("/return", returnRoutes)
app.use("/token", tokenRoutes)
app.use("/shop", shopRoutes)
app.use("/dashboard", dashboard)
app.use("/login", loginRouter )
app.use("/user", userRouter)



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
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
