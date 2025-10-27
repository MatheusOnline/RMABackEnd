import express from "express";
import cors from "cors";
import fetch from "node-fetch"; 
import crypto from "crypto";

import { RmaModel } from "./RmaModel";
import mongoose from "mongoose";

const partner_id = 2013259;
const partner_key = "shpk79414a436a4a64585553496764445948414c66555372416945654d7a424a";
const host = "https://partner.shopeemobile.com";

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

app.post("/generateToken", async (req, res) => {
  try {
    const { code, shop_id } = req.body;

    if (!code || !shop_id)
      return res.status(400).json({ error: "code e shop_id são obrigatórios" });

    const ts = Math.floor(Date.now() / 1000);
    const path = "/api/v2/auth/token/get";
    const baseStr = `${partner_id}${path}${ts}`;
    const sign = crypto
      .createHmac("sha256", partner_key)
      .update(baseStr)
      .digest("hex");

    const url = `${host}${path}?partner_id=${partner_id}&timestamp=${ts}&sign=${sign}`;
    const body = {
      code,
      shop_id: Number(shop_id),
      partner_id: partner_id,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao gerar o token");
  }
});

app.post("/get_profile", async (req, res) => {
  const { token, shop_id } = req.body; // <-- era req.query
  const access_token = token;          // alias p/ manter compatível

  const timestamp = Math.floor(Date.now() / 1000);
  const path = "/api/v2/shop/get_profile";

  const baseString = `${partner_id}${path}${timestamp}${access_token}${shop_id}`;
  const sign = crypto
    .createHmac("sha256", partner_key)
    .update(baseString)
    .digest("hex");

  const url = `${host}${path}?partner_id=${partner_id}&timestamp=${timestamp}&access_token=${access_token}&shop_id=${shop_id}&sign=${sign}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar perfil" });
  }
});

interface ShopeeReturn {
  return_id: number;
  // outros campos que quiser
}

interface ShopeeReturnsResponse {
  returns?: ShopeeReturn[];
  // outros campos que a API retorna
}

app.post("/get_return", async (req, res) => {
  const { shop_id, token } = req.body;

  if (!shop_id || !token) return res.status(400).json({ error: "Faltando shop_id ou token" });

  try {
    const response = await fetch("https://partner.shopeemobile.com/api/v2/returns/get_returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_id,
        access_token: token,
        pagination_offset: 0,
        pagination_entries_per_page: 100,
      }),
    });

    // Tipando a resposta
    const data = (await response.json()) as ShopeeReturnsResponse;
    const returnIds = data.returns?.map(r => r.return_id) || [];

    res.json({ returnIds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar devoluções" });
  }
});

app.listen(5000, () => console.log("🚀 Servidor rodando na porta 5000"));
