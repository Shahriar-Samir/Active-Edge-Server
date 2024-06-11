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
    const voteCollection = client.db('Active-Edge').collection('Votes')
    const feedbackCollection = client.db('Active-Edge').collection('Feedbacks')





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
  const verifyAllUser = async (req,res,next)=>{
     const {email} = req.decoded
     const user = await usersCollection.findOne({email})
     const isTrainer = user?.role === 'trainer'
     const isAdmin = user?.role === 'admin'
     const isMember = user?.role === 'member'
     if(isTrainer || isAdmin || isMember){
       return next()
       }
      return res.status(403).send({message:'forbidden access'})
  }



    // token related routes

    app.post('/jwt', (req,res)=>{
      const user = req.body
      const token =jwt.sign(user, process.env.TOKEN, {expiresIn: '24h'})
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
    app.get('/userData/:id' ,async (req,res)=>{
        const {id} = req.params
        const getUser = await usersCollection.findOne({uid:id})
        if(getUser){
          if(getUser?.fullName){
            return res.send({displayName:getUser?.fullName,photoURL:getUser?.photoURL})
          }
          return  res.send({displayName:getUser?.displayName,photoURL:getUser?.photoURL})
        }
        res.send()
    })
    app.put('/updateUserData/:id' ,async (req,res)=>{
      const data = req.body
      const {id} = req.params
      const options = {upsert:true}
      const filter = { uid:id};
      const updatedData = {
        $set:{
          displayName : data.displayName,
          photoURL : data.photoURL,
        },
      }
        const updateUser = await usersCollection.updateOne(filter,updatedData,options)
        res.send(updateUser)
    })
    app.get('/userRole/:id',async (req,res)=>{
        const {id} = req.params
        const getUser = await usersCollection.findOne({uid:id})
        res.send(getUser?.role)
    })
    app.get('/featuredClasses',async (req,res)=>{
        const getClasses = await classCollection.aggregate([
          {$sort: {bookings:-1}},
          {$limit: 6}
        ]).toArray()
        res.send(getClasses)
    })



    app.get('/allClassesName', async (req,res)=>{
         const getClasses = await classCollection.find().toArray()
         return res.send(getClasses)
    })


   app.get('/allClasses', async (req,res)=>{
      const {size,page,searchValue} = req.query
          if(searchValue === 'false'){
            const sizeInt = parseInt(size)
            const pageInt = parseInt(page)
         const getClasses = await classCollection.find().skip(pageInt*sizeInt).limit(sizeInt).toArray()
         return res.send(getClasses)
          }
          if(searchValue?.length >= 1){
            const getClasses = await classCollection.find({className:{$regex: new RegExp(searchValue,'i')}}).toArray()
            return res.send(getClasses)
          }
   
    })
    app.get('/subscribers',secureRoute,verifyAdmin, async (req,res)=>{
        const subscribers = await subscriberCollection.find().toArray()
        res.send(subscribers)
        
    })

    app.get('/forumPosts',async (req,res)=>{
      const {size,page} = req.query
      const sizeInt = parseInt(size)
      const pageInt = parseInt(page)
      const posts = await forumPostCollection.find().skip(pageInt*sizeInt).limit(sizeInt).sort({date:-1}).toArray()
      res.send(posts)
    })
    app.get('/latestPosts',async (req,res)=>{
      const posts = await forumPostCollection.find().sort({date:-1}).limit(6).toArray()
      res.send(posts)
    })
    app.get('/forumPost/:id',async (req,res)=>{
      const {id} = req.params
      const post = await forumPostCollection.findOne({_id:new ObjectId(id)})
      res.send(post)
    })
    app.get('/forumPostsCount',async (req,res)=>{
      const posts = await forumPostCollection.find().toArray()
      const postsLength = posts.length
      res.send({postsLength})
    })
    app.get('/classesCount',async (req,res)=>{
      const classes = await classCollection.find().toArray()
      const classesLength = classes.length
      res.send({classesLength})
    })

    app.get('/trainers',secureRoute,verifyAdmin, async(req,res)=>{
      const trainers = await usersCollection.find({role:'trainer'}).toArray()
      res.send(trainers)
    })

    app.get('/allTrainers',async(req,res)=>{
      const trainers = await usersCollection.find({role:'trainer'}).toArray()
      res.send(trainers)
    })
    app.get('/trainersTeam',async(req,res)=>{
      const trainers = await usersCollection.find({role:'trainer'}).sort({startedDate: 1}).limit(3).toArray()
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

    app.get('/application/:uid',secureRoute, verifyMember,async (req,res)=>{
      const {uid} = req.params
      const application = await applicationCollection.findOne({uid, status:'pending'})
      res.send(application)

    })

    app.get('/userApplications',secureRoute,verifyMember,async (req,res)=>{
      const {uid} = req.query
      const application = await applicationCollection.find({uid, status:'rejected'}).sort({applyDate:-1}).toArray()
      res.send(application)
    })
    app.get('/trainerSlots/:id',async (req,res)=>{
      const {id} = req.params
      const slots = await slotCollection.find({uid:id}).toArray()
      res.send(slots)
    })
    app.get('/trainerSlot/:id',secureRoute,verifyMember,async (req,res)=>{
      const {id} = req.params
      const idInt = new ObjectId(id)
      const slot = await slotCollection.findOne({_id:idInt})
      res.send(slot)
    })
    app.get('/payments',secureRoute, verifyAdmin,async (req,res)=>{
      const payments = await paymentCollection.find().sort({ date: -1 }).limit(6).toArray()
      res.send(payments)
    })
    app.get('/allReviews',async (req,res)=>{
      const reviews = await feedbackCollection.find().sort({ date: -1 }).toArray()
      res.send(reviews)
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

    app.get('/myVoteStatus',async (req,res)=>{
        const {uid,postId} = req.query
        const vote = await voteCollection.findOne({uid,postId})
        if(vote){
          const voteStatus = vote.type
          return res.send(voteStatus)
        }
        const voteStatus = 'noVote'
        return res.send(voteStatus)
    })

    app.get('/getUpVotes/:postId',async(req,res)=>{
      const {postId} = req.params
      const upVotes = await voteCollection.find({postId,type:'upVote'}).toArray()
      const allUpVotes = upVotes.length
      res.send({allUpVotes})
    })

    app.post('/addUpVote', secureRoute,verifyAllUser,async (req,res)=>{
        const data = req.body
        const addData = await voteCollection.insertOne(data)
        res.send(addData)
    })
    app.delete('/removeUpVote',secureRoute,verifyAllUser ,async (req,res)=>{
        const {postId,uid} = req.query
        const addData = await voteCollection.deleteOne({postId,uid,type:'upVote'})
        res.send(addData)
    })
    app.get('/getDownVotes/:postId',async(req,res)=>{
      const {postId} = req.params
      const downVotes = await voteCollection.find({postId,type:'downVote'}).toArray()
      const allDownVotes = downVotes.length
      res.send({allDownVotes})
    })

    app.post('/addDownVote',secureRoute,verifyAllUser,async (req,res)=>{
        const data = req.body
        const addData = await voteCollection.insertOne(data)
        res.send(addData)
    })
    app.delete('/removeDownVote',secureRoute,verifyAllUser, async(req,res)=>{
        const {postId,uid} = req.query
        const addData = await voteCollection.deleteOne({postId,uid,type:'downVote'})
        res.send(addData)
    })
    
    app.post('/addClass',secureRoute,verifyAdmin,async (req,res)=>{
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
    app.post('/addFeedback',secureRoute,verifyMember,async (req,res)=>{
        const post = req.body
        const addPost = await feedbackCollection.insertOne(post)
        res.send(addPost)
    })
    app.post('/confirmApplication',secureRoute,verifyAdmin,async (req,res)=>{
        const {applicantData} = req.body
        const options = {upsert:true}
        const updatedData = {
            $set:{
             fullName: applicantData.fullName,
             photoURL: applicantData.image,
             xp: applicantData.xp,
             media: applicantData.media,
             bio: applicantData.bio,
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

    app.post('/trainerApply',secureRoute,verifyMember,async (req,res)=>{
        const application = req.body
        const addApplication = await applicationCollection.insertOne(application)
        res.send(addApplication)
    })

    app.post('/addSlot',secureRoute,verifyTrainer,async (req,res)=>{
        const slotInfo = req.body
        const addSlot = await slotCollection.insertOne(slotInfo)
        res.send(addSlot)
    })

    app.post('/addPayment',secureRoute,verifyMember,async (req,res)=>{
        const paymentInfo = req.body
        const addPayment = await paymentCollection.insertOne(paymentInfo)
        res.send(addPayment)
    })

    
    app.put('/updateClasses',secureRoute,verifyTrainer,async (req,res)=>{
      const data = req.body
      const options = {upsert:true}
      const filter = { className: { $in: data.selectedClasses } };
      const updatedData = {
        $addToSet:{
         trainers: {
           trainerName: data.displayName,
           trainerUid: data.uid,
           trainerPhotoURL: data.photoURL,
         },
      }
    }
      const updateClass = await classCollection.updateMany(filter,updatedData,options)
      res.send(updateClass)
    }) 

    app.put('/removeClassTrainer',secureRoute, verifyTrainer, async(req,res)=>{
      const data = req.body
      const slots = await slotCollection.find({uid:data.uid}).toArray()
      if(slots?.length < 1){
        const options = {upsert:true}
        const filter = { className: { $in: data.selectedClasses } };
        const updatedData = {
          $pull:{
           trainers: {
             trainerName: data.displayName,
             trainerUid: data.uid,
             trainerPhotoURL: data.photoURL,
           },
        }
      }
        const updateClass = await classCollection.updateMany(filter,updatedData,options)
        res.send(updateClass)
      }
      res.send()
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
              bio:'',
              xp:'',
              media:'',
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

    app.put('/updateUser',async (req,res)=>{
          const updateInfo = req.body
          const options = {upsert:true}
          const {uid} = updateInfo
          const updateData = {
            $set:{
              displayName : updateInfo.displayName,
              photoURL : updateInfo.photoURL,
              phoneNumber : updateInfo.phoneNumber,
            },
          }
          const updateUserData = await usersCollection.updateOne({uid},updateData,options)
          res.send(updateUserData)
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



    app.post('/createPaymentIntent',secureRoute,verifyMember,async (req,res)=>{
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