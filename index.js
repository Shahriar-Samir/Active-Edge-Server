const express = require('express');
const cors = require('cors');
require('dotenv').config()

const port = process.env.PORT || 5000
const app = express()

app.get('/',(req,res)=>{
    res.send('Active Edge Server')
})

app.listen(port,()=>{
    console.log(`listening on port ${port}`)
})