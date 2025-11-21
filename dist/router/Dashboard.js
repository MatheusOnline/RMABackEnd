"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const returnModel_1 = require("../models/returnModel");
const router = express_1.default.Router();
router.post("/", async (req, res) => {
    const { shop_id } = req.body;
    if (!shop_id)
        return res.status(400).json({ error: "shop_id não pode ser nulo" });
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
        const datas = await returnModel_1.ReturnModel.aggregate([
            { $match: { shop_id } },
            // Converte timestamp para date
            {
                $addFields: {
                    create_date: {
                        $toDate: {
                            $multiply: [
                                { $toLong: "$create_time" },
                                1000
                            ]
                        }
                    }
                }
            },
            {
                $facet: {
                    // 🔥 DEVOLUÇÕES POR DIA (últimos 7 dias)
                    last7Days: [
                        {
                            $match: {
                                create_date: { $gte: sevenDaysAgo }
                            }
                        },
                        {
                            $group: {
                                _id: {
                                    $dateToString: {
                                        format: "%Y-%m-%d", // dia-mes-ano
                                        date: "$create_date"
                                    }
                                },
                                total: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    // outros contadores (igual antes)
                    statusCount: [
                        { $group: { _id: "$status", total: { $sum: 1 } } }
                    ],
                    reasonCount: [
                        { $group: { _id: "$reason", total: { $sum: 1 } } }
                    ],
                    totalCount: [
                        { $count: "total" }
                    ]
                }
            }
        ]);
        return res.status(200).json({
            success: true,
            datas: datas[0]
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno", success: false });
    }
});
exports.default = router;
