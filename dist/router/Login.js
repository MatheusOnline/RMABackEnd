"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userModel_1 = require("../models/userModel");
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../utils/auth");
const router = express_1.default.Router();
dotenv_1.default.config();
//====================LOGIN=======================//
router.post("/login", async (req, res) => {
    const { user, password } = req.body;
    try {
        const findUser = await userModel_1.UserModel.findOne({ userName: user });
        if (!findUser)
            return res.status(400).json({ message: "Usuário não encontrado", success: false });
        // compara senha digitada com senha criptografada
        const correctPassword = await bcrypt_1.default.compare(password, findUser.password);
        if (!correctPassword)
            return res.status(400).json({ message: "Senha incorreta", success: false });
        // gera token JWT
        const token = jsonwebtoken_1.default.sign({ id: findUser._id, userName: findUser.userName }, process.env.SECRET_KEY, // use .env
        { expiresIn: "1d" });
        const user_id = findUser._id;
        return res.status(200).json({
            message: "Login bem sucedido",
            success: true,
            token,
            user_id,
        });
    }
    catch (error) {
        return res.status(500).json({ error, success: false });
    }
});
router.get("/checktoken", auth_1.auth, (req, res) => {
    res.json({ valid: true });
});
//====================CADASTRAR=======================//
router.post("/register", async (req, res) => {
    const { user, password, cpf } = req.body;
    try {
        if (!user || !password || !cpf) {
            return res.status(400).json({
                message: "Preencha todos os campos",
                success: false
            });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10); // 10 = salt rounds
        const newUser = await userModel_1.UserModel.create({
            userName: user,
            password: hashedPassword,
            cpf: cpf
        });
        return res.status(201).json({ message: "Usuário criado", success: true });
    }
    catch (error) {
        return res.status(500).json({ error, success: false });
    }
});
exports.default = router;
