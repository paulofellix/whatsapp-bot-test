function convertToBRL(value) {
    return Intl.NumberFormat('pt-BR',{style: 'currency', currency: 'BRL'}).format(value)
}

module.exports = {
    convertToBRL
}