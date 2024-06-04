const express = require('express');
const cors = require('cors');
require('dotenv').config()

const port = process.env.PORT || 5000
const app = express()

app.use(express.json())
app.use(cors({
    origin: ['http://localhost:5173','https://active-edge-0.web.app','https://active-edge-0.firebaseapp.com']
}))

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const subscriberCollection = client.db('Active-Edge').collection('Subscribers')
    const forumPostCollection = client.db('Active-Edge').collection('Forum_Posts')
    const applicationCollection = client.db('Active-Edge').collection('Applications')

    app.get('/',(req,res)=>{
        res.send('Active Edge Server')
    })

    app.get('/user/:id',async (req,res)=>{
        const {id} = req.params
        const getUser = await usersCollection.findOne({uid:id})
        res.send(getUser)
    })
    app.get('/featuredClasses',async (req,res)=>{
        const getClasses = await classCollection.aggregate([
          {$sort: {bookings:-1}},
          {$limit: 6}
        ]).toArray()
        res.send(getClasses)
    })

    app.get('/allClasses',async (req,res)=>{
        const getClasses = await classCollection.find().toArray()
        res.send(getClasses)
    })
    app.get('/subscribers',async (req,res)=>{
        const subscribers = await subscriberCollection.find().toArray()
        res.send(subscribers)
    })

    app.get('/forumPosts',async (req,res)=>{
      const posts = await forumPostCollection.find().toArray()
      res.send(posts)
    })

    app.get('/trainers',async (req,res)=>{
      const trainers = await usersCollection.find({role:'trainer'}).toArray()
      res.send(trainers)
    })

    app.get('/trainerData/:uid',async (req,res)=>{
      const {uid} = req.params
      const trainer = await usersCollection.findOne({uid})
      res.send(trainer)
    })

    app.get('/applications',async (req,res)=>{
      const applications = await applicationCollection.find().toArray()
      res.send(applications)
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

    app.post('/addSubscriber',async (req,res)=>{
        const subscriber = req.body
        const addSubscriber = await subscriberCollection.insertOne(subscriber)
        res.send(addSubscriber)
    })

    app.post('/addForumPost',async (req,res)=>{
        const post = req.body
        const addPost = await forumPostCollection.insertOne(post)
        res.send(addPost)
    })

    app.post('/trainerApply',async (req,res)=>{
        const application = req.body
        const addApplication = await applicationCollection.insertOne(application)
        res.send(addApplication)
    })

    app.delete('/deleteApplication/:id',async (req,res)=>{
          const {id} = req.params
          const applicationId = new ObjectId(id)
          const deleteApplication = await applicationCollection.deleteOne({_id:applicationId})
          res.send(deleteApplication)
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