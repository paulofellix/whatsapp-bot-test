const { Client } = require('whatsapp-web.js');
const qrCode = require('qrcode-terminal')
const fs = require('fs')
const mongoose = require('mongoose')
const objectAssignDeep = require('object-assign-deep')
const moment = require('moment')
const utils = require('./utils')

class WhatsappBot {

    constructor(clientOptions) {
        const fileSession = './session.data'
        const sessionData = fs.existsSync(fileSession) ? JSON.parse(fs.readFileSync(fileSession).toString()) : {}

        this.client = new Client(objectAssignDeep({
            session: sessionData,
            restartOnAuthFail: true,
            puppeteer: {
                headless: true,
                devtools: false
            }
        }, clientOptions))

        this.client.on('qr', (qr) => {
            // Generate and scan this code with your phone
            console.log('QR RECEIVED', qr);
            qrCode.generate(qr, {small: true})
        });

        this.client.on('authenticated', (session) => {
            fs.writeFileSync(fileSession, JSON.stringify(session, '\t', 2))
            console.log('authenticated')
        })

        this.client.on('ready', () => {
            console.log('Client is ready!');
        });

        this.client.on('disconnected', () => {
            console.log('desconectado')
            this.initialize()
        })

        this.client.on('auth_failure', () => {

        })

        this.client.on('message', this.handleMessage);
    }

    async handleMessage(msg) {
        const chat = await msg.getChat()
        const Lead = mongoose.model('Lead')
        const Product = mongoose.model('Product')

        let msgData = {
            date: moment.unix(msg.timestamp).utcOffset(-4).toISOString(true),
            type: msg.type,
            phoneNumber: msg.from.replace(/\D/gi,''),
            text: msg.body,
            location: msg.location
        }

        if (msgData.phoneNumber != '559294422262') return

        if (msgData.type != 'chat' && msgData.type != 'location') {
            await chat.sendMessage('Não entendo esse tipo de mensagem')
            return
        }

        let lead = await Lead.findOne({
            number: msgData.phoneNumber
        })

        if (!lead){
            lead = await Lead.create({
                number: msgData.phoneNumber
            })
        }

        if (!lead.name && !lead.lastAction){
            await chat.sendMessage(`Oi, eu sou um robô virtual e me chamo *Optimus* 🤖, estou aqui para fazer o seu atendimento de forma rápida e inteligente.

Qual o seu nome?`)

            lead.lastAction = 'NameQuestion'
            await lead.save()
            return
        }else if (!lead.name && lead.lastAction === 'NameQuestion'){
            lead.name = msgData.text
            await chat.sendMessage(`Olá *${lead.name}*,

Seja bem vindo ao atendimento automatizado da *Smart System*. Para que seja possível atendê-lo com mais rapidez,
precisamos de algumas informações ok ?

Selecione abaixo uma das opções parar iniciarmos o seu atendimento:

*[ 1 ]* - Comprar produto
*[ 2 ]* - Fazer assinatura

A qualquer momento você pode digitar *Menu* para voltar ao menu principal.`)
            lead.lastAction = 'TypeServiceQuestion'
            await lead.save()
            return
        }

        let answer

        switch (lead.lastAction) {
            case 'TypeServiceQuestion':
                answer = Number.parseInt(msgData.text)
                if (Number.isInteger(answer)) {
                    switch (answer) {
                        case 1:
                            const products = await Product.find({type: "water"})
                            let msg = `Nos temos os seguintes produtos:

`
                            products.forEach((product, index) => {
                                msg += `*[ ${index + 1} ]* - ${product.name} - ${utils.convertToBRL(product.value)}`
                                msg += (index + 1) == products.length ? '' : `
`
                            })

                            await chat.sendMessage(msg)
                            lead.lastAction = 'ProductsQuestion'
                            await lead.save()
                            break;

                        case 2:
                            break

                        default:
                            throw new Error('resposta fora do range')
                            break;
                    }
                }else{
                    throw new Error('não respondeu com número')
                }
                break
            case 'ProductsQuestion':
                answer = Number.parseInt(msgData.text)
                if (Number.isInteger(answer) && answer > 0) {
                    const products = await Product.find({type: "water"})
                    const product = products[answer-1]

                    if (product) {
                        let msg = `Você selecionou o produto *${product.name}* no valor de ${utils.convertToBRL(product.value)}, quantas unidades você deseja comprar ?`
                        await chat.sendMessage(msg)
                        lead.lastAction = 'ProductQuantityQuestion'
                        lead.flow = {
                            productId: product.id
                        }
                        await lead.save()
                    }else{
                        throw new Error('respondeu fora do range')
                    }

                }else{
                    throw new Error('não respondeu com número')
                }
                break

            case 'ProductQuantityQuestion':
                answer = Number.parseInt(msgData.text)
                if (Number.isInteger(answer) && answer > 0) {
                    const product = await Product.findById(lead.flow.productId)

                    if (product) {
                        let msg = `Total do pedido

Item: *${product.name}*
Qtd: *${answer}*

Total: *${utils.convertToBRL(answer * product.value)}*

Qual será a forma de pagamento ?

*[ 1 ]* Dinheiro
*[ 2 ]* Cartão`

                        await chat.sendMessage(msg)
                        lead.lastAction = 'PaymentMethodQuestion'
                        lead.flow = {
                            ...lead.flow,
                            productQuantity: answer
                        }
                        await lead.save()
                    }else{
                        throw new Error('respondeu fora do range')
                    }

                }else{
                    throw new Error('não respondeu com número')
                }
                break

            case 'PaymentMethodQuestion':
                answer = Number.parseInt(msgData.text)
                if (Number.isInteger(answer)) {
                    switch (answer) {
                        case 1: { //Dinheiro
                            let msg = `Você escolheu *Dinheiro*, caso necessite de troco informe o *valor que irá pagar*, para que possamos levar o troco certinho 😉, se você não precisa de troco digite *não*`
                            await chat.sendMessage(msg)

                            lead.flow = {
                                ...lead.flow,
                                paymentMethod: 'Money'
                            }
                            lead.lastAction = 'MoneyChangeQuestion'
                            await lead.save()
                            break;
                        }
                        case 2: { //Cartão
                            let msg = `Você escolheu *Cartão*, agora para finalizar o seu pedido é necessário que me *informe o seu endereço* ou nos envie uma *localização fixa* ok ?`
                            await chat.sendMessage(msg)

                            lead.flow = {
                                ...lead.flow,
                                paymentMethod: 'Charge'
                            }
                            lead.lastAction = 'AddressQuestion'
                            await lead.save()
                            break
                        }
                        default:
                            throw new Error('resposta fora do range')
                            break;
                    }
                }else{
                    throw new Error('não respondeu com número')
                }
                break

            case 'MoneyChangeQuestion':
                answer = Number.parseFloat(msgData.text.replace(',','.').replace(/[^.\d]/gi,''))
                if (!Number.isNaN(answer)){
                    let msg = `Ok, troco para ${utils.convertToBRL(answer)}, agora para finalizar o seu pedido é necessário que me informe o seu endereço ou nos envie uma localização ok ?`
                    await chat.sendMessage(msg)

                    lead.flow = {
                        ...lead.flow,
                        moneyChange: answer
                    }
                    lead.lastAction = 'AddressQuestion'
                    await lead.save()
                }
                break
            case 'AddressQuestion':
                let address = null
                if (msgData.type === 'chat') {
                    address = {
                        primary: true,
                        type: 'plain',
                        plain: msgData.text
                    }
                }else if (msgData.type === 'location') {
                    address = {
                        primary: true,
                        type: 'point',
                        coordinates: [
                            msgData.location.latitude,
                            msgData.location.longitude
                        ]
                    }
                }else{
                    throw new Error('enviou um tipo de mensagem não suportado para endereço')
                }

                if (address) {
                    let product = await Product.findById(lead.flow.productId)
                    let msg = `Perfeito ${lead.name}, temos aqui então

Item: *${product.name}*
Qtd: *${lead.flow.productQuantity}*
Total do Pedido: *${utils.convertToBRL(lead.flow.productQuantity * product.value)}*

Forma de Pagamento: *${lead.flow.paymentMethod === 'Money' ? 'Dinheiro' : 'Cartão'}*

${lead.flow.paymentMethod === 'Money'
? `Total do Pagamento: *${utils.convertToBRL(lead.flow.moneyChange)}*
Troco a receber: *${utils.convertToBRL(lead.flow.moneyChange - (lead.flow.productQuantity * product.value))}*

Endereço para entrega: *${address.type === 'plain' ? address.plain : 'Localização whatsapp'}*`
:`Endereço para entrega: *${address.type === 'plain' ? address.plain : 'Localização whatsapp'}*`}

Confirma o Pedido ?

*[ 1 ]* Sim
*[ 2 ]* Não`
                    await chat.sendMessage(msg)

                    lead.addresses.push(address)
                    lead.lastAction = 'FinishOrder'
                    await lead.save()
                }
                break
            case 'FinishOrder':
                let product = await Product.findById(lead.flow.productId)
                await chat.sendMessage('Pedido finalizado, agora é só aguardar a chegada do produto 😉')
                break
            default:
                break
        }

        console.log('finish')
    }

    initialize() {
        this.client.initialize()
    }
}

module.exports = WhatsappBot
