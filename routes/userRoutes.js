const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const Product = require("../models/productModel");

router.post("/login", (req, res, next) => {
  let getUser;
  User.findOne({
    email: req.body.email,
  })
    .then((user) => {
      if (!user) {
        return res.status(401).json({
          error: "User not exists",
          isAuthenticated: false,
        });
      }
      getUser = user;
      return bcrypt.compare(req.body.password, user.password);
    })
    .then((response) => {
      if (!response) {
        return res.status(401).json({
          error: "Invalid Password",
          isAuthenticated: false,
        });
      }
      let jwtToken = jwt.sign(
        {
          email: getUser.email,
          userId: getUser._id,
        },
        process.env.JWT_ACC_ACTIVATE,
        {
          expiresIn: "1h",
        }
      );
      res.status(200).json({
        token: jwtToken,
        expiresIn: 3600,
        email: getUser.email,
        userId: getUser._id,
        message: "successfully authenticated",
        isAuthenticated: true,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: "Authentication failed",
        isAuthenticated: false,
      });
    });
});

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  User.findOne({ email }, async (err, doc) => {
    if (err) throw err;
    if (doc) res.status(400).json({ error: "user already exists" });
    else {
      const token = await jwt.sign(
        { username, email, password },
        process.env.JWT_ACC_ACTIVATE,
        { expiresIn: "20m" }
      );

      let smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_PASSWORD,
        },
      });

      let mailOptions = {
        to: email,
        from: "noreply@gmail.com",
        subject: "verify your email id ",
        html: ` 
                  <h2>Please click the given link to activate your account</h2>
                  <div style="padding: 50px; margin[top:10px; margin-bottom:10px;">
                  <a href="${process.env.SERVER_URL}/activate/${token}"><button style="position: absolute;
                  width: 191px;
                  height: 36px;
                  left: 227px;
                  top: 204px;
                  background: linear-gradient(270deg, #78D7FF 0%, rgba(113, 32, 244, 0.32) 96.86%);
                  border-radius: 20px;border:none; font-family: Roboto;
                  font-style: normal;
                  font-weight: bold;
                  font-size: 18px;
                  line-height: 21px;
                  color: #FDFCFC;">
                  verify email address</button></a></div>
                  <br/>
                  <br/>
                 <div><b>NOTE:&nbsp;</b>This is computer generated mail. please don't reply to this.</div>
                `,
      };
      smtpTransport.sendMail(mailOptions, (err) => {
        if (err) {
          console.log(err)
          return res.status(400).json({
            error: "try again after sometime",
          });
        }
        return res.json({
          message:
            "Email has been sent to your Email ID, kindly visit to your account for verfying your Email ID",
        });
      });
    }
  }).catch((err) => {
    res.status(400).json({ error: "Network issue" });
  });
});

router.get("/activate/:token", async (req, res) => {
  const token = req.params.token;
  if (token) {
    await jwt.verify(
      token,
      process.env.JWT_ACC_ACTIVATE,
      async function (err, decodedToken) {
        if (err) {
          return res
            .status(400)
            .json({ message: "token may be incorrect or expired" });
        }
        const { username, email, password } = decodedToken;
        const hashPassword = await bcrypt.hash(password, 15);
        const newUser = new User({
          username,
          email,
          password: hashPassword,
        });
        await newUser.save();
        res.redirect(`${process.env.CLIENT_URL}`);
        return res.send("user created");
      }
    );
  } else {
    return res.json({ message: "something went wrong!" });
  }
});

router.get("/verify/:token", async (req, res) => {
  const token = req.params.token;
  if (token) {
    await jwt.verify(
      token,
      process.env.JWT_ACC_ACTIVATE,
      async function (err, decodedToken) {
        if (err) {
          return res.status(400).json({
            message: "token may be incorrect or expired",
            isAuthenticated: false,
          });
        }
        return res.json({
          email: decodedToken.email,
          userId: decodedToken.userId,
          isAuthenticated: true,
        });
      }
    );
  } else {
    return res
      .status(400)
      .json({ message: "token not found", isAuthenticated: false });
  }
});

router.get("/user", (req, res) => {
  if (req.user) {
    res.json({ user: req.user, isAuth: true });
  } // The req.user stores the entire user that has been authenticated inside of it.
  else {
    res.status(401).json({ user: null, isAuth: false });
  }
});

router.get("/current/userid", (req, res) => {
  res.send(req.user.id); // The req.user stores the entire user that has been authenticated inside of it.
});

router.get("/cart/product/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const { cart } = await User.findOne({ _id });
    const cartProductid = [...cart];
    let cartProducts = [];
    let cartTotal = 0;
    if (cartProductid.length != 0) {
      cartProducts = await Promise.all(
        cartProductid.map(async function (prod, ind) {
          const product = await Product.findOne({ _id: prod.id });
          const total = product._doc.price * prod.count;
          cartTotal += total;
          return { ...product._doc, count: prod.count, total };
        })
      );
      res.json({ cartProducts, cartTotal });
    } else {
      res.json({ cartProducts, cartTotal });
    }
  } catch (err) {
    res.status(400).json({ message: "user not found" });
  }
});

router.get("/cart/clear/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const user = await User.findOne({ _id });
    if (user) {
      await User.updateOne({ _id }, { cart: [] });

      res.json({ message: "cart clear successfully" });
    } else {
      res.status(400).json({ message: "user not found" });
    }
  } catch (err) {
    res.status(400).json({ message: "user not found" });
  }
});

router.post("/cart/remove", async (req, res) => {
  try {
    const { productId, _id } = req.body;

    let { cart } = await User.findOne({ _id });

    cart = cart.filter((prod) => prod.id !== productId);
    await User.updateOne({ _id }, { cart });

    res.json({ message: "item removed successfully" });
  } catch (err) {
    res.status(400).json({ message: "user not found" });
  }
});
router.post("/cart/product/increment", async (req, res) => {
  try {
    const { productId, _id } = req.body;
    const { cart } = await User.findOne({ _id });
    const index = cart.findIndex((prod) => prod.id == productId);
    if (index > -1) {
      cart[index]["count"] += 1;
      await User.updateOne({ _id }, { cart });
      res.json({ message: "count increase in cart" });
    } else {
      res.status(400).json({ message: "item not exists in cart" });
    }
  } catch (err) {
    res.status(400).json({ message: "user not found" });
  }
});
router.post("/cart/product/decrement", async (req, res) => {
  try {
    const { productId, _id } = req.body;
    const { cart } = await User.findOne({ _id });
    const index = cart.findIndex((prod) => prod.id == productId);
    if (index > -1) {
      cart[index]["count"] -= 1;
      if (cart[index]["count"] == 0) {
        cart.splice(index, 1);
      }
      await User.updateOne({ _id }, { cart });
      res.json({ message: "count decrease in cart" });
    } else {
      res.status(400).json({ message: "item not exists in cart" });
    }
  } catch (err) {
    res.status(400).json({ message: "user not found" });
  }
});

router.post("/cart/add", async (req, res) => {
  try {
    const { productId, _id } = req.body;

    const { cart } = await User.findOne({ _id });
    if (cart != null && _id != null) {
      const index = cart.findIndex((prod) => prod.id == productId);
      if (index != -1) {
        cart[index]["count"] += 1;
      } else {
        cart.push({ id: productId, count: 1 });
      }
      await User.updateOne({ _id }, { cart });
      res.json({ message: "product added in cart" });
    } else {
      res.status(400).json({ message: "user not exists" });
    }
  } catch (err) {
    res.status(400).json({ message: "something went wrong" });
  }
});

router.post("/create/order", async (req, res) => {
  try {
    const { products, amount, date, _id } = req.body;

    const { orders } = await User.findOne({ _id });

    const order = [...orders];
    order.push({ products, amount, date });
    const result = await User.updateOne({ orders: order });
    if (result) res.json({ message: "order added successfully" });
  } catch (err) {
    res.status(400).json({ message: "something went wrong" });
  }
});

router.get("/show/order/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const { orders } = await User.findOne({ _id });

    res.json({ orders });
  } catch (err) {
    res.status(400).json({ message: "something went wrong" });
  }
});

router.post("/favourite/add", async (req, res) => {
  try {
    const { productId, _id } = req.body;
    const { favourites } = await User.findOne({ _id });
    if (!productId) {
      return res.status(400).json({ message: "product doesn't exist" });
    }
    const index = favourites.findIndex((id) => {
      return id == productId;
    });
    if (index > -1) {
      res.status(400).send(false);
      return;
    }

    favourites.push(productId);
    await User.updateOne({ _id }, { favourites });
    res.json({ message: "product added in favourite" });
  } catch (err) {
    res.status(400).json({ message: "something went wrong" });
  }
});

router.get("/favourites/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const { favourites } = await User.findOne({ _id });
    const favouritesId = [...favourites];
    let favouriteProducts = [];
    if (favouritesId.length != 0) {
      favouriteProducts = await Promise.all(
        favouritesId.map(async function (id, ind) {
          return await Product.findOne({ _id: id });
        })
      );
      res.json({ favouriteProducts });
    } else {
      res.json({ favouriteProducts });
    }
  } catch (err) {
    res.status(400).json({ message: "something went wrong" });
  }
});

router.post("/favourite/remove", async (req, res) => {
  try {
    const { productId, _id } = req.body;
    const { favourites } = await User.findOne({ _id });
    let favouritesId = [...favourites];
    const index = favouritesId.findIndex((id) => {
      return id == productId;
    });
    if (index == -1) {
      res.status(400).send(false);
      return;
    }
    favouritesId = favouritesId.filter((id) => id !== productId);
    await User.updateOne({ _id }, { favourites: favouritesId });
    res.json({ message: "favourite removed successfully" });
  } catch (err) {
    res.status(400).json({ message: "something went wrong" });
  }
});

router.post("/favourite/check", async (req, res) => {
  try {
    const {productId} = req.body;
   const  _id = "60ca2319a3a5a43ec0c99b8f";
    const user = await User.findOne({ _id });
    console.log(user)
    if (!productId)
      return res.status(400).json({ message: "product do not exist" });

    const index = favourites.findIndex((id) => {
      return id == productId;
    });
    if (index != -1) res.send(true);
    else res.send(false);
  } catch (err) {
    console.log(err)
    res.status(400).json({ message: "something went wrong" });
  }
});

module.exports = router;
