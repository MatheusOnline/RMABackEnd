import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

interface SignFunctions {
  path: string;
  ts: Number;
}


function Sign({ path, ts }: SignFunctions) {

    const partnerKey = process.env.PARTNER_KEY;
    if (!partnerKey) {
        throw new Error("PARTNER_KEY não definida no .env");
    }

    // monta a base string corretamente
    const baseStr = `${process.env.PARTNER_ID}${path}${ts}`;

    // cria o hash HMAC-SHA256
    const sign = crypto
        .createHmac("sha256", partnerKey )
        .update(baseStr)
        .digest("hex");

    return sign;
}

export default Sign;
