const express = require('express')
const path = require('path')
const opn = require('opn')

const app = express()

const viewsDir = path.join(__dirname, 'views')

app.use(express.static(viewsDir))
app.use(express.static(path.join(__dirname, './static')))
app.use(express.static(path.join(__dirname, './node_modules/face-api.js/dist')))

app.get('/', (req, res) => res.redirect('/face-expression'))
app.get('/face-expression', (req, res) => res.sendFile(path.join(viewsDir, 'face-expression.html')))


app.listen(3001, () => console.log('Your app is available at http://localhost:3001'))
opn('http://localhost:3001');
