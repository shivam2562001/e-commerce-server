const express = require("express");
const router = express.Router();
const Product = require("../models/productModel");
const User = require("../models/userModel");


router.get("/products/:_id",async (req,res)=>{
     try{
        const  {_id} = req.params;
        const products = await Product.find();
        const {favourites} =await User.findOne({_id});
       const productfav = products.map((prod,ind)=>{
         const index = favourites.findIndex(id => id == prod._id);
         if(index != -1){
             return {...prod._doc,fav : true};
         }else{
             return {...prod._doc,fav : false};
         }
        })
        res.json({products : productfav});
     }catch(err){
         res.status(400).json({message : "something went wrong"});
     }
     
});





router.post("/create/product",async (req,res)=>{
    try{
       const product = req.body;
       await Product.create(product);
       res.json({message: "product created successfully"});
    }catch(err){
        res.status(400).json({message : "something went wrong"});
    }
    
});





module.exports = router;


