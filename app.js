const { database } = require('./config')

const express = require('express')
const mongoose = require('mongoose')
const requireDir = require('require-dir')
const cors = require('cors')
const WhatsappBot = require('./src/whatsappBot')

async function main() {

    const whatsappBot = new WhatsappBot({puppeteer: {
        headless: true
    }})
    const app = express()
    app.use(express.json())
    app.use(cors())

    await mongoose.connect(
        database.connectionString,
        { 
            useNewUrlParser: true ,
            useUnifiedTopology: true
        }
    )

    requireDir('./src/api/models')

    //rotas
    app.use(require("./src/api/routes"))

    app.listen(process.env.PORT, () => {
        console.log(`Server is online on http://localhost:${process.env.PORT}`)
    })

    whatsappBot.initialize()
}

main()
