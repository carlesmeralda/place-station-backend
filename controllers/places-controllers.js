const fs = require('fs')
const mongoose = require('mongoose')
const { validationResult } = require('express-validator')

const HttpError = require('../models/http-error')
const getCoords = require('../utils/location')
const Place = require('../models/place')
const User = require('../models/user')

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.placeId

  let place
  try {
    place = await Place.findById(placeId)
  } catch (err) {
    return next(
      new HttpError('Something went wrong, could not find a place', 500)
    )
  }

  if (!place) {
    return next(
      new HttpError('Could not find a place for the provided place id', 404)
    )
  }

  res.json({ place: place.toObject({ getters: true }) })
}

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.userId

  let userWithPlaces
  try {
    userWithPlaces = await User.findById(userId).populate('places')
  } catch (err) {
    return next(
      new HttpError('Something went wrong, could not find places', 500)
    )
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError('Could not find places for the provided user id', 404)
    )
  }

  res.json({
    places: userWithPlaces.places.map(p => p.toObject({ getters: true })),
  })
}

const createPlace = async (req, res, next) => {
  const err = validationResult(req)

  if (!err.isEmpty()) {
    return next(new HttpError('Invalid entered inputs'), 422)
  }

  const { title, description, address, creator } = req.body

  let location
  try {
    location = await getCoords()
  } catch (err) {
    return next(err)
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location,
    image: req.file.path,
    creator,
  })

  let user
  try {
    user = await User.findById(creator)
  } catch (err) {
    return next(new HttpError('Creating place failed', 500))
  }

  if (!user) {
    return next(new HttpError('Could not find user for the provided id', 404))
  }

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await createdPlace.save({ session: sess })
    user.places.push(createdPlace)
    await user.save({ session: sess })
    await sess.commitTransaction()
  } catch (err) {
    return next(new HttpError('Creating place failed, try again', 500))
  }

  res.status(201).json({ place: createdPlace })
}

const updatePlace = async (req, res, next) => {
  const err = validationResult(req)

  if (!err.isEmpty()) {
    next(new HttpError('Invalid entered inputs'), 422)
  }

  const { title, description } = req.body

  const placeId = req.params.placeId

  let updatedPlace
  try {
    updatedPlace = await Place.findById(placeId)
  } catch (err) {
    return next(new HttpError('Something went wrong', 500))
  }

  if (updatedPlace.creator.toString() !== req.userData.userId) {
    return next(new HttpError('You are not allowed to edit this place', 401))
  }

  updatedPlace.title = title
  updatedPlace.description = description

  try {
    await updatedPlace.save()
  } catch (err) {
    return next(new HttpError('Updating place failed', 500))
  }

  res.status(200).json({ place: updatedPlace.toObject({ getters: true }) })
}

const deletePlace = async (req, res, next) => {
  const placeId = req.params.placeId

  let deletePlace
  try {
    deletePlace = await Place.findById(placeId).populate('creator')

    if (!deletePlace) {
      return next(new HttpError('Could not find place for this id', 404))
    }
  } catch (err) {
    return next(
      new HttpError('Something went wrong, deleting place failed'),
      500
    )
  }

  if (deletePlace.creator.id !== req.userData.userId) {
    return next(new HttpError('You are not allowed to delete this place'), 401)
  }

  const imagePath = deletePlace.image

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await deletePlace.remove({ session: sess })
    deletePlace.creator.places.pull(deletePlace)
    await deletePlace.creator.save({ session: sess })
    await sess.commitTransaction()
  } catch (error) {}

  fs.unlink(imagePath, err => {
    console.log(err)
  })

  res.status(200).json({ message: 'A place has been deleted succesfully' })
}

module.exports = {
  getPlaceById,
  getPlacesByUserId,
  createPlace,
  updatePlace,
  deletePlace,
}
