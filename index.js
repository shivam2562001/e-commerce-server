const mongoose = require('mongoose');
const express = require('express');
const cors= require('cors');
const dotenv = require("dotenv");
const app= express();
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");


//config
dotenv.config({ path: "./config.env" });
//db
mongoose
.connect(process.env.DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
})
.then((_) => {
  console.log("Database connected successfully");
}).catch(err=>{
  console.log(err);
});


//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
 app.use(cors({
    origin : process.env.CLIENT_URL,
     credentials:true
 }))

app.use(userRoutes);
app.use(productRoutes);

app.listen(process.env.PORT ||4000,()=>{
    console.log("server started at 4000");
});