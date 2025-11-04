
import { json } from "body-parser";
import { ShopModel } from "../../models/shopModel";

interface ShopFunction{
    shop_id: String
}

async function CreateShop({shop_id}:ShopFunction){
    try{
        const FindStore = await ShopModel.findOne({shop_id});
        if(!FindStore){
            const createdStore = await ShopModel.create({shop_id: shop_id}); 
            return createdStore;
        }else{
            return FindStore; 
        }
    }
    catch(error){
        return error;
    }
    
}

export default CreateShop;