const express = require('express')
const { check } = require('express-validator')

const fileUpload = require('../middleware/file-upload')
const checkAuth = require('../middleware/check-auth')

const router = express.Router()

const placeControllers = require('../controllers/places-controllers')

router.get('/:placeId', placeControllers.getPlaceById)

router.get('/user/:userId', placeControllers.getPlacesByUserId)

router.use(checkAuth)

router.post(
  '/',
  fileUpload.single('image'),
  [
    check('title').not().isEmpty(),
    check('description').isLength({ min: 5 }),
    check('address').not().isEmpty(),
  ],
  placeControllers.createPlace
)

router.patch(
  '/:placeId',
  [check('title').not().isEmpty(), check('description').isLength({ min: 5 })],
  placeControllers.updatePlace
)

router.delete('/:placeId', placeControllers.deletePlace)

module.exports = router
