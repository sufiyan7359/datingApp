const express = require("express");
const app = express();
app.get('/',(req , res)=>{
   res.send("hello World ");
   console.log("hello ");
})



const PORT = 8000


app.listen(PORT,(error)=>{
    if(error){
        console.log("error===>",error);
    }else{
        console.log("server is running");
    }
})