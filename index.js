const express = require("express")
const cors = require("cors")
const { MongoClient, ObjectId } = require("mongodb")
const app = express()

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const dotenv=require("dotenv")
dotenv.config()
const secretkey = process.env.SECRET_KEY
const url = process.env.DB;
app.use(cors({ origin: "https://my-shopping-web-site.netlify.app" }));
app.use(express.json())
mongoose.connect(url).then(() => {
  console.log("Database connected successfully.");
  app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
  });
});
//User schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  address: {
    addressline1: String,
    addressline2: String,
    city: String,
    state: String,
    pincode: Number
  },
  cart: [],
  total:Number
})
const Users=mongoose.model("users",userSchema);
//Admin schema
const adminSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
})
const Admin = mongoose.model("Admin", userSchema);
//JWT
let authenticate = (req, res, next) => {
  if (!req.headers.authorization) {
    res.status(401).json({ message: "unauthorized user" })
  }
  else {
    jwt.verify(req.headers.authorization, secretkey, (error, data) => {
      if (error) {
        res.status(401).json({ message: "unauthorized" })
      }
      req.userid = data.id
      //console.log(req.userid)
      next();
    })
  }
}
//Getting all productinformation
app.get("/products", async (req, res) => {
  const client = new MongoClient(url);

  try {
    await client.connect();

    const collection = client.db().collection("Products");

    const result = await collection.find({}).toArray();
    res.json(result)

    // console.log("Fetched data: ", result);
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
//To view a specific products
app.get("/productinfo/:id", async (req, res) => {
  const client = new MongoClient(url);

  try {
    await client.connect();

    const collection = client.db().collection("Products");

    const productinfo = await collection.findOne({ _id: new ObjectId(req.params.id) })
    if (productinfo) {
      res.json(productinfo)
    }
    else {
      res.status(404).json({ message: "information not found" })
    }
    // console.log("Fetched data: ", result);
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
//Getting seller information
app.get("/seller-info", authenticate, async (req, res) => {
  const client = new MongoClient(url);

  try {
    await client.connect();

    const collection = client.db().collection("sellers");

    const result = await collection.find({}).toArray();
    res.json(result)

    // console.log("Fetched data: ", result);
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
//Getting user information
app.get("/user-info", authenticate, async (req, res) => {
  const client = new MongoClient(url);

  try {
    await client.connect();

    const collection = client.db().collection("users");
    const result = await collection.findOne({ _id: new ObjectId(`${req.userid}`) });
    res.json(result)

    // console.log("Fetched data: ", result);
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})

//Creating a new user
app.post("/user-create", async (req, res) => {
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(req.body.password, salt)
  req.body.password = hash;
  let data = new Users(req.body);
  const result = await data.save();
  res.send(result);
})
//User login
app.post("/user-login", async (req, res) => {
  const client = new MongoClient(url);

  try {
    await client.connect();

    const collection = client.db().collection("users");
    const user = await collection.findOne({ email: req.body.email })
    if (!user) {
      return res.status(404).json({ message: "Invalid credentials" })
    }

    const passwordcorrect = await bcrypt.compare(req.body.password, user.password)
    if (!passwordcorrect) {
      return res.status(401).json({ message: "Invalid credentials " })
    }
    const token = jwt.sign({ id: user._id }, secretkey)
    res.json({ message: token })
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
//Adding a item to the cart
app.post("/addtocart", authenticate, async (req, res) => {
  const client = new MongoClient(url);

  try {
    await client.connect();

    const collection = client.db().collection("users");
    const id = new ObjectId(`${req.userid}`)
    //console.log(new ObjectId(`${req.body._id}`))
    const updatecart = await collection.findOneAndUpdate({ _id: id }, { $push: { cart: (req.body) }})

    if (updatecart) {
      res.json(updatecart);
    }
    else {
      res.status(500).json({ message: "not updated" })
    }
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
//Remove a item from cart
app.post("/removefromcart", authenticate, async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();

    const collection = client.db().collection("users");
    const id = new ObjectId(`${req.userid}`)
    const updatecart = await collection.findOneAndUpdate({ _id: id }, { $set: { cart: (req.body) } })

    if (updatecart) {
      res.json(updatecart);
    }
    else {
      res.status(500).json({ message: "not updated" })
    }
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    await client.close();
  }
})
//Admin login
app.post("/admin-login", async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();

    const collection = client.db().collection("admins");
    const user = await collection.findOne({ email: req.body.email })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const passwordcorrect = await bcrypt.compare(req.body.password, user.password)
    if (!passwordcorrect) {
      return res.status(401).json({ message: "incorrect password" })
    }
    const token = jwt.sign({ id: user._id }, secretkey)
    res.json({ message: token })
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
//Add product to database
app.post("/add-product", authenticate, async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();

    const collection = client.db().collection("Products");

    const result = await collection.insertOne(req.body);
    res.json(result)

    // console.log("Fetched data: ", result);
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
//Remove product from database
app.post("/remove-product", authenticate, async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();

    const collection = client.db().collection("Products");

    const result = await collection.deleteOne({ _id: new ObjectId(`${req.body._id}`) });
    res.json(result)

    // console.log("Fetched data: ", result);
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
//Add seller information
app.post("/add-seller", authenticate, async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();

    const collection = client.db().collection("sellers");

    const result = await collection.insertOne(req.body);
    res.json(result)

    // console.log("Fetched data: ", result);
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
//Delete the seller information
app.post("/delete-seller", authenticate, async (req, res) => {
  const client = new MongoClient(url);
  try {
    await client.connect();

    const collection = client.db().collection("sellers");

    const result = await collection.deleteOne({ _id: new ObjectId(`${req.body._id}`) });
    res.json(result)

    // console.log("Fetched data: ", result);
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
//Sum of cart products
app.post("/cart-total", authenticate, async (req, res) => {
  const client = new MongoClient(url);

  try {
    await client.connect();

    const collection = client.db().collection("users");
    const id = new ObjectId(`${req.userid}`)
    const updatecart = await collection.updateOne({ _id: id },{$set:{total:req.body.total}})
    if (updatecart) {
      res.json(updatecart);
    }
    else {
      res.status(500).json({ message: "not updated" })
    }
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})
app.post("/after-checkout", authenticate, async (req, res) => {
  const client = new MongoClient(url);

  try {
    await client.connect();

    const collection = client.db().collection("users");
    const id = new ObjectId(`${req.userid}`)

    const updatecart = await collection.findOneAndUpdate({ _id: id }, { $set: { cart: (req.body) }})

    if (updatecart) {
      res.json(updatecart);
    }
    else {
      res.status(500).json({ message: "not updated" })
    }
  } catch (error) {
    console.error("Error fetching data: ", error);
  } finally {
    // Close the connection to the MongoDB cluster
    await client.close();
  }
})