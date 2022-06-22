const { compile } = require('nexe')

const inputAppName = './index.js'
const outputAppName = 'Ludari'

compile({
    input: inputAppName,
    output: outputAppName,
    ico: 'Ludari.ico',
    build: true,
}).then((err) => {
    if (err) throw err
    console.log('success')
});
