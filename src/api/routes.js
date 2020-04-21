const express = require('express')
const routes = express.Router()

const LoginController = require('./controllers/loginController')
const MainController = require('./controllers/mainController')

module.exports = routes