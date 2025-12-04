import express from "express";
import { UserModel } from "../models/userModel";
import dotenv from "dotenv"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { auth } from "../utils/auth";
const router = express.Router()

dotenv.config()


//====================LOGIN=======================//
router.post("/login", async (req, res) => {
    const { user, password } = req.body

    try {
        const findUser = await UserModel.findOne({ userName: user })

        if (!findUser)
            return res.status(400).json({ message: "Usuário não encontrado", success: false })

        // compara senha digitada com senha criptografada
        const correctPassword = await bcrypt.compare(password, findUser.password)

        if (!correctPassword)
            return res.status(400).json({ message: "Senha incorreta", success: false })

        // gera token JWT
        const token = jwt.sign(
            { id: findUser._id, userName: findUser.userName },
             process.env.SECRET_KEY as string, // use .env
            { expiresIn: "1d" }
        )

        const user_id = findUser._id
        return res.status(200).json({
            message: "Login bem sucedido",
            success: true,
            token,
            user_id,
        })

    } catch (error) {
        return res.status(500).json({ error, success: false })
    }
})

router.get("/checktoken", auth, (req, res) => {
  res.json({ valid: true })
})


//====================CADASTRAR=======================//
router.post("/register", async (req, res) => {
    const { user, password, cpf } = req.body
    

    try {
        if (!user || !password || !cpf) {
            return res.status(400).json({
                message: "Preencha todos os campos",
                success: false
            })
        }


        const hashedPassword = await bcrypt.hash(password, 10) // 10 = salt rounds

        const newUser = await UserModel.create({
            userName: user,
            password: hashedPassword,
            cpf: cpf
        })


        return res.status(201).json({ message: "Usuário criado", success: true })
    } catch (error) {
        return res.status(500).json({ error, success: false })
    }
})


export default router;