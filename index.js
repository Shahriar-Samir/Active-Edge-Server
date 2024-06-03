const express = require('express');
const cors = require('cors');
require('dotenv').config()

const port = process.env.PORT || 5000
const app = express()

app.use(express.json())
app.use(cors({
    origin: ['http://localhost:5173','https://active-edge-0.web.app','https://active-edge-0.firebaseapp.com']
}))

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@databases1.utppk3d.mongodb.net/?retryWrites=true&w=majority&appName=databases1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db('Active-Edge').collection('Users')
    const classCollection = client.db('Active-Edge').collection('Classes')

    app.get('/',(req,res)=>{
        res.send('Active Edge Server')
    })

    app.get('/user/:id',async (req,res)=>{
        const {id} = req.params
        const getUser = await usersCollection.findOne({uid:id})
        res.send(getUser)
    })
    app.get('/featuredClasses',async (req,res)=>{
        const getUser = await classCollection.aggregate([
          {$sort: {bookings:-1}},
          {$limit: 6}
        ]).toArray()
        res.send(getUser)
    })

    app.post('/addUser',async (req,res)=>{
        const userData = req.body
        const addUser = await usersCollection.insertOne(userData)
        res.send(addUser)
    })
    
    app.post('/addClass',async (req,res)=>{
        const userData = req.body
        const addClass = await classCollection.insertOne(userData)
        res.send(addClass)
    })
   
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port,()=>{
    console.log(`listening on port ${port}`)
})