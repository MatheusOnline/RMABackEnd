import express from "express";
import cors from "cors";

import { RmaModel } from "./RmaModel";
import mongoose from "mongoose";
const app = express();
app.use(express.json());
app.use(cors());

const uri = "mongodb+srv://matheus:Cavalo123!@dados.mkmjd.mongodb.net/meuBanco?retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas"))
  .catch(err => console.error("❌ Erro ao conectar no MongoDB:", err));


// Recebe RMA via POST e salva no MongoDB
app.post("/rma", async (req, res) => {
  try {
    const { id, motivo, data, status } = req.body;

    if (!id || !motivo) {
      return res.status(400).send("Dados incompletos");
    }

    const novoRma = new RmaModel({ id, motivo, data, status });
    await novoRma.save();

    console.log("RMA salvo:", novoRma);
    res.status(201).json({ message: "RMA cadastrado com sucesso!", rma: novoRma });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao salvar RMA");
  }
});

// Retorna todos os RMAs
app.get("/rma", async (req, res) => {
  try {
    const rmas = await RmaModel.find();
   
    res.status(201).json({ "returns": rmas})
  } catch (err) {
    console.error(err); 
    
    res.status(500).send("Erro ao buscar RMAs");
  }
});

app.get("/teste", (req,res) =>{
  res.send("teste")
})

app.listen(5000, () => console.log("🚀 Servidor rodando na porta 5000"));
