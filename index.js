const express = require('express');
const cors = require('cors');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET)
const jwt = require('jsonwebtoken')
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
    const slotCollection = client.db('Active-Edge').collection('Slots')
    const paymentCollection = client.db('Active-Edge').collection('Payments')





    const secureRoute = (req,res,next)=>{
      if(!req.headers.authorization){
        return res.status(401).send({message:'forbidden access'})
      }
      const {authorization} = req.headers
      const token = authorization.split(' ')[1]
      jwt.verify(token,process.env.TOKEN,(err,decoded)=>{    
        if(err){
          return res.status(401).send({message:'forbidden access'})
        }
        req.decoded = decoded
        next()
      })
  }
  
  const verifyAdmin = async (req,res,next)=>{
     const {email} = req.decoded
     const user = await usersCollection.findOne({email})
     const isAdmin = user?.role === 'admin'
     if(!isAdmin){
       return res.status(403).send({message:'forbidden access'})
     }
     next()
  }
  const verifyTrainer = async (req,res,next)=>{
     const {email} = req.decoded
     const user = await usersCollection.findOne({email})
     const isTrainer = user?.role === 'trainer'
     if(!isTrainer){
       return res.status(403).send({message:'forbidden access'})
     }
     next()
  }
  const verifyMember = async (req,res,next)=>{
     const {email} = req.decoded
     const user = await usersCollection.findOne({email})
     const isMember = user?.role === 'member'
     if(!isMember){
       return res.status(403).send({message:'forbidden access'})
     }
     next()
  }
  const verifyCrossUser = async (req,res,next)=>{
     const {email} = req.decoded
     const user = await usersCollection.findOne({email})
     const isTrainer = user?.role === 'trainer'
     const isAdmin = user?.role === 'admin'
     if(isTrainer || isAdmin){
       return next()
       }
      return res.status(403).send({message:'forbidden access'})
  }



    // token related routes

    app.post('/jwt', (req,res)=>{
      const user = req.body
      const token =jwt.sign(user, process.env.TOKEN, {expiresIn: '1h'})
      res.send({token})
    })  



    app.get('/',(req,res)=>{
        res.send('Active Edge Server')
    })

    app.get('/user/:id', secureRoute ,async (req,res)=>{
        const {id} = req.params
        const getUser = await usersCollection.findOne({uid:id})
        res.send(getUser)
    })
    app.get('/userRole/:id',async (req,res)=>{
        const {id} = req.params
        const getUser = await usersCollection.findOne({uid:id})
        const userRole = await getUser.role
        res.send(userRole)
    })
    app.get('/featuredClasses',async (req,res)=>{
        const getClasses = await classCollection.aggregate([
          {$sort: {bookings:-1}},
          {$limit: 6}
        ]).toArray()
        res.send(getClasses)
    })

    app.get('/allClasses', async (req,res)=>{
        const getClasses = await classCollection.find().toArray()
        res.send(getClasses)
    })
    app.get('/subscribers',secureRoute,verifyAdmin, async (req,res)=>{
        const subscribers = await subscriberCollection.find().toArray()
        res.send(subscribers)
        
    })

    app.get('/forumPosts',async (req,res)=>{
      const posts = await forumPostCollection.find().toArray()
      res.send(posts)
    })

    app.get('/trainers',secureRoute,verifyAdmin, async(req,res)=>{
      const trainers = await usersCollection.find({role:'trainer'}).toArray()
      res.send(trainers)
    })

    app.get('/allTrainers',async(req,res)=>{
      const trainers = await usersCollection.find({role:'trainer'}).toArray()
      res.send(trainers)
    })

    app.get('/trainerData/:uid',async (req,res)=>{
      const {uid} = req.params
      const trainer = await usersCollection.findOne({uid})
      res.send(trainer)
    })

    app.get('/applications',secureRoute,verifyAdmin ,async (req,res)=>{
      const applications = await applicationCollection.find().toArray()
      res.send(applications)
    })

    app.get('/application',secureRoute, verifyMember,async (req,res)=>{
      const {uid} = req.query
      const application = await applicationCollection.findOne({uid, status:'pending'})
      res.send(application)

    })

    app.get('/userApplications',secureRoute,verifyMember,async (req,res)=>{
      const {uid} = req.query
      const application = await applicationCollection.find({uid, status:'rejected'}).sort({applyDate:-1}).toArray()
      res.send(application)
    })
    app.get('/trainerSlots/:id',secureRoute,verifyTrainer,async (req,res)=>{
      const {id} = req.params
      const slots = await slotCollection.find({uid:id}).toArray()
      res.send(slots)
    })
    app.get('/trainerSlot/:id',secureRoute,async (req,res)=>{
      const {id} = req.params
      const idInt = new ObjectId(id)
      const slot = await slotCollection.findOne({_id:idInt})
      res.send(slot)
    })
    app.get('/payments',secureRoute, verifyAdmin,async (req,res)=>{
      const payments = await paymentCollection.find().sort({ date: -1 }).limit(6).toArray()
      res.send(payments)
    })
    app.get('/totalBalance',secureRoute,verifyAdmin,async (req,res)=>{
      const paymentsAmount = await paymentCollection.aggregate([
        {
          $group:{
            _id:null,
            totalSum:{$sum:'$price'}
          }
        }
      ]).toArray()
      const totalBalance = paymentsAmount.length > 0? paymentsAmount[0].totalSum : 0
      res.status(200).send({totalBalance})
    })

    app.post('/addUser',async (req,res)=>{
        const userData = req.body
        const addUser = await usersCollection.insertOne(userData)
        res.send(addUser)
    })
    
    app.post('/addClass',secureRoute,async (req,res)=>{
        const userData = req.body
        const addClass = await classCollection.insertOne(userData)
        res.send(addClass)
    })

    app.post('/addSubscriber',async (req,res)=>{
        const subscriber = req.body
        const addSubscriber = await subscriberCollection.insertOne(subscriber)
        res.send(addSubscriber)
    })

    app.post('/addForumPost',secureRoute,verifyCrossUser,async (req,res)=>{
        const post = req.body
        const addPost = await forumPostCollection.insertOne(post)
        res.send(addPost)
    })
    app.post('/confirmApplication',secureRoute,verifyAdmin,async (req,res)=>{
        const {applicantData} = req.body
        const options = {upsert:true}
        const updatedData = {
            $set:{
             fullName: applicantData.fullName,
             photoURL: applicantData.image,
             role: 'trainer',
             age: applicantData.age,
             skills: applicantData.skills,
             time: applicantData.time,
             days: applicantData.days,
             startedDate: applicantData.startedDate,
          }
        }
        const addTrainer = await usersCollection.updateOne({uid: applicantData.uid},updatedData,options)
        res.send(addTrainer)
    })

    app.post('/trainerApply',secureRoute,async (req,res)=>{
        const application = req.body
        const addApplication = await applicationCollection.insertOne(application)
        res.send(addApplication)
    })

    app.post('/addSlot',secureRoute,verifyTrainer,async (req,res)=>{
        const slotInfo = req.body
        const addSlot = await slotCollection.insertOne(slotInfo)
        res.send(addSlot)
    })

    app.post('/addPayment',secureRoute,async (req,res)=>{
        const paymentInfo = req.body
        const addPayment = await paymentCollection.insertOne(paymentInfo)
        res.send(addPayment)
    })

    app.put('/removeTrainer',secureRoute,verifyAdmin,async(req,res)=>{
          const trainerData = req.body
          const options = {upsert:true}
          const updatedData = {
              $set:{
               role: 'member',
            },
            $unset:{
              fullName: '',
              age: '',
              skills: '',
              time: '',
              days: '',
              startedDate: '',
            }
          }
          const addTrainer = await usersCollection.updateOne({uid: trainerData.uid},updatedData,options)
          res.send(addTrainer)

    })

    app.put('/rejectApplication',secureRoute,verifyAdmin,async (req,res)=>{
      const applicationData = req.body
      const options = {upsert:true}
      const applicationId = new ObjectId(applicationData._id)
      const updateData = {
        $set:{
          status:'rejected',
          feedback: applicationData.feedback
        },
      }
      const deleteApplication = await applicationCollection.updateOne({_id: applicationId},updateData,options)
      res.send(deleteApplication)
    }) 

    app.delete('/deleteApplication/:id',secureRoute,verifyAdmin,async (req,res)=>{
          const {id} = req.params
          const applicationId = new ObjectId(id)
          const deleteApplication = await applicationCollection.deleteOne({_id:applicationId})
          res.send(deleteApplication)
    })
    app.delete('/deleteSlot/:id',secureRoute,verifyTrainer,async (req,res)=>{
          const {id} = req.params
          const applicationId = new ObjectId(id)
          const deleteApplication = await slotCollection.deleteOne({_id:applicationId})
          res.send(deleteApplication)
    })


    app.post('/createPaymentIntent',secureRoute,async (req,res)=>{
      const {price} = req.body
      const amount = parseInt(price*100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
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