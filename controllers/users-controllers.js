const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const HttpError = require('../models/http-error')
const User = require('../models/user')

const getUsers = async (req, res, next) => {
  let users

  try {
    users = await User.find({}, '-password')
  } catch (err) {
    return next(new HttpError('Fetching User failed!'), 500)
  }

  res.json({ users: users.map(u => u.toObject({ getters: true })) })
}

const signup = async (req, res, next) => {
  const err = validationResult(req)
  if (!err.isEmpty()) {
    return next(new HttpError('Invalid entered inputs'), 422)
  }

  const { name, email, password } = req.body

  let existingUser
  try {
    existingUser = await User.findOne({ email })
  } catch (err) {
    return next(new HttpError('Singing up failed, try again later'))
  }

  if (existingUser) {
    return next(new HttpError('User already exist', 422))
  }

  let hashPassword
  try {
    hashPassword = await bcrypt.hash(password, 12)
  } catch (err) {
    return next(new HttpError('Could not create a user, please try again'), 500)
  }

  const createdUser = new User({
    name,
    email,
    password: hashPassword,
    places: [],
    image: req.file.path,
  })

  try {
    await createdUser.save()
  } catch (err) {
    return next(new HttpError('Signing up failed, try again later', 500))
  }

  let token
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    )
  } catch (err) {
    return next(new HttpError('Signing up failed, try again later', 500))
  }

  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    token,
  })
}

const login = async (req, res, next) => {
  const { email, password } = req.body

  let existingUser

  try {
    existingUser = await User.findOne({ email })
  } catch (err) {
    return next(new HttpError('Loggin in failed, try again later'))
  }

  if (!existingUser) {
    return next(new HttpError('Invalid credentials, could not log you in'), 403)
  }

  let isValidPassword = false
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password)
  } catch (err) {
    return next(new HttpError('Invalid credentials, could not log you in'), 500)
  }

  if (!isValidPassword) {
    return next(new HttpError('Invalid credentials, could not log you in'), 403)
  }

  let token
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    )
  } catch (err) {
    return next(new HttpError('Loggin in failed, try again later', 500))
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token,
  })
}

module.exports = {
  getUsers,
  signup,
  login,
}
