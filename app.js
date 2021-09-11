const fs = require('fs')
const path = require('path')
const express = require('express')
const mongoose = require('mongoose')

const placeRoutes = require('./routes/places-routes')
const userRoutes = require('./routes/users-routes')

const app = express()

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.n3vpc.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use('/uploads/images', express.static(path.join('uploads', 'images')))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  )
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
  next()
})

app.use('/api/users', userRoutes)
app.use('/api/places', placeRoutes)

app.use((err, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, err => {
      console.log(err)
    })
  }

  if (res.headerSent) {
    return next(err)
  }
  res
    .status(err.code || 500)
    .json({ message: err.message || 'An unknown error occured' })
})

mongoose
  .connect(uri)
  .then(() => {
    app.listen(5000)
  })
  .catch(err => {
    console.log(err)
  })
