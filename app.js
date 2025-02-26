const express = require("express")
const app = express()
const exhbs = require("express-handlebars")
const Handlebars = require("handlebars")
const session = require('express-session')
const nocache = require("nocache")
const cookieParser = require('cookie-parser')
const path = require("path")
const mongoose = require("mongoose")
const userRouter = require("./routes/userRoutes")
const adminRouter = require("./routes/adminRoutes")
const hbsHelper=require('./helpers/hbsHelpers')
const DB=require("./DB/connectDb")

const morgan = require('morgan')

require('dotenv').config()

DB()

app.engine('hbs', exhbs.engine({
    layoutsDir: __dirname + '/views/layouts/',
    extname: 'hbs',
    defaultLayout: 'userLayout',
    partialsDir: __dirname + '/views/partials/'
  }));
  
  app.use(session({
    secret: 'cats',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000000  }
  }));
  
  app.use(cookieParser());
  
  app.use(nocache());
  
  app.use(morgan('dev'))
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.set("view engine", "hbs")
  app.set("views", path.join(__dirname, "views"))
  
  app.use(express.static(path.join(__dirname,"public")))


app.use("/", userRouter)
app.use("/", adminRouter)

const PORT = process.env.PORT

app.listen(PORT, (req, res) => {
  console.log(`http://localhost:${PORT}`)
})
