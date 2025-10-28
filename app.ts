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
  try {
    const { token, shop_id } = req.body;
    const timestamp = Math.floor(Date.now() / 1000);
    // 1. NOVO: Calcular o timestamp de 15 dias atrás
    const fifteenDaysAgo = timestamp - 15 * 24 * 60 * 60; // 15 dias em segundos

    const path = "/api/v2/returns/get_return_list";

    // A assinatura (sign) deve ser gerada APENAS com os 5 parâmetros obrigatórios.
    // Os parâmetros de tempo não fazem parte da string base de autenticação padrão.
    const baseString = `${partner_id}${path}${timestamp}${token}${shop_id}`;
    const sign = crypto
      .createHmac("sha256", partner_key)
      .update(baseString)
      .digest("hex");

    let page = 1;
    let allReturns: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const params = {
        access_token: token,
        partner_id: String(partner_id),
        shop_id: String(shop_id),
        page_no: String(page),
        page_size: "100",
        timestamp: String(timestamp),
        sign,
        
        // 2. NOVO: Adicionar o filtro de 15 dias!
        create_time_from: String(fifteenDaysAgo),
        create_time_to: String(timestamp) // Opcional, mas garante o limite final
      };

      const urlParams = new URLSearchParams(params).toString();
      const url = `${host}${path}?${urlParams}`;

      console.log(`🔗 Página ${page}: ${url}`);

      const response = await fetch(url);
      const data = await response.json() as {
        response?: { return?: any[]; has_more?: boolean };
      };

      // Restante do código de paginação...
      const returnList = data?.response?.return || [];
      allReturns.push(...returnList);

      hasMore = data?.response?.has_more ?? false;
      page++;
    }

    console.log(`✅ Total de devoluções encontradas: ${allReturns.length}`);
    res.json({ return_list: allReturns });

  } catch (err) {
    console.error("❌ Erro ao buscar devoluções:", err);
    res.status(500).json({ error: "Erro ao buscar devoluções" });
  }
});

app.listen(5000, () => console.log("🚀 Servidor rodando na porta 5000"));
