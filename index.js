require('dotenv').config();
const express = require('express');
const app = express();
const route = require('./router/routes');
const path = require('path');
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const port = process.env.PORT;

app.set('view engine','ejs');
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(__dirname))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(route)

app.listen(port, ()=>{
    console.log('Server is Started on port ',port);
})


