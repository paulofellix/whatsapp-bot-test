const fs = require('fs')
const dotenv = require('dotenv')

let envConfig = dotenv.config()

if (fs.existsSync('.env.dev')){
    let parsed = dotenv.parse(fs.readFileSync('.env.dev'))
    Object.keys(envConfig.parsed).forEach(prop => {
        process.env[prop] = parsed[prop]
    })
}

const database = require('./database')

module.exports = {
    database
}