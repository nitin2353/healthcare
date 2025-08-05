const express = require('express');
const route = express.Router();
const pool = require('../database/database');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
// const OpenAI = require("openai");
const pdf  = require('pdf-parse');
const {CohereClient} = require("cohere-ai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { queryObjects } = require('v8');
const { constants } = require('buffer');
const { Result } = require('pg');

// const openai = new OpenAI();

route.use(session({
    secret: process.env.SECRETKEY,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 }
}))


route.get('/', (req, res) => {
    res.render('index')
})


// route.get('/signup', (req, res) => {
//     req.session.isAuth=false
//     res.render("signup")
// })


route.get('/checkreport', (req, res) =>{
    if(!req.session.isAuth){
        res.redirect('/login')
    }else{
      res.render('checkreport')
    }
    // res.render('checkreport')
})


route.get('/Login', (req, res) => {
    if(req.session.isAuth === true){
        res.redirect('/checkreport');
    }else{
        res.render("Login")
    }
})




route.post('/usersignup', async (req, res) => {
    const query = 'INSERT INTO public.users(name, phone, age, height, weight, created_at, gender) VALUES($1, $2, $3, $4, $5, $6, $7)';
    try {
        const now = new Date();
        const date = now.toDateString();
        let result = await pool.query(query, [
            req.body.name,
            req.body.phone,
            req.body.age,
            req.body.height,
            req.body.weight,
            date,
            req.body.gender

        ]);

        let userDetail = { 
            'gender': req.body.gender, 
            'name': req.body.name,
            'age': req.body.age
        }
        res.cookie('user', userDetail)
        req.session.isAuth = true;
        
        
        req.session.phone = req.body.phone;
        req.session.name = req.body.name;
        req.session.age = req.body.age;
        req.session.gen = req.body.gender;
        res.redirect('/checkreport');

    } catch (err) {
        console.log(err.message)
        res.status(500).send({ error: err.message });
    }
});

var uid='';
route.post('/loginuser', async(req, res) => {
    let query = 'select *from public.users where phone = $1'
    try {
        const result = await pool.query(query, [req.body.phone]);
        if(result.rows.length > 0){
            req.session.isAuth = true;
            req.session.phone = result.rows[0].phone;

            uid = result.rows[0].id;

            let userDetail = { 
                'gender': result.rows[0].gender, 
                'name': result.rows[0].name,
                'age': result.rows[0].age
            }
            req.session.gen = result.rows[0].gender

            res.cookie('user', userDetail)
            res.redirect('/checkreport');
        }else{
            res.render("signup", {phone : req.body.phone})
        }
    } catch (error) {
        res.status(500).send({error : error.message});
    }

})

//----------------report Send in backend--------------------


let fileName;
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); 
  },
  filename: function (req, file, cb) {
    fileName = file.originalname;
    cb(null, Date.now() + "-" + file.originalname);
  }
});


const upload = multer({ storage: storage });


route.post('/userreport', upload.single('report'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = file.path;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const rawText = data.text;
 

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    async function main() {
  

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    
        let reportData = rawText.split('\n');

        const finalPrompt = `
            Please analyze the following medical report data line by line.

            Instructions:
            - For each test, numerically compare the result with the given reference range.
            - If the result is lower than the reference range, label it as "LOW".
            - If the result is higher than the reference range, label it as "HIGH".
            - If the result is within the reference range, label it as "NORMAL".
            - Do not provide any explanations, summaries, or extra text. Only process the data as provided.
            - Do not guess or add any interpretations outside the data.
            - The output must be a JSON array.
            - The first index (0th) of the array must contain:
            - "report_name": (string) example: "blood test"
            - "summary": array of exactly 3 strings: 
                - must start with "Warning: ...(Give name and reason also)"
                - then "Info: ...(Give name and reason also)"
                - then "Normal: ...(Give name and reason also)"
            - "risk_assessment": an object with two keys:
                - "warning": percentage string of total tests that are HIGH or LOW
                - "modrate": percentage string of total tests that are HIGH or LOW(Average)
                - "normal": percentage string of tests that are NORMAL
            - Keys in the first index object must be in **lowercase only**. No capital letters.
            - All remaining indexes (1st onwards) must be test data only, in this format:
            - "test"
            - "result"
            - "range"
            - "final_result"

            - If the result depends on gender, use this gender: ${req.session.gen}

            Output format:
            Return only a valid JSON array as described above.
            Do not include any markdown, code block, comments, or extra text. Only return the JSON array.

            Here is the data:
            ${reportData.join('\n')}

        `;
        // console.log(req.cookies.gender.gender);
        const result = await model.generateContent(finalPrompt);
        const text = result.response.text();

        const string_report = text.split('\n'); 

        let objects = string_report.join('\n');

        objects = objects.replace(/```json/g, "").replace(/```/g, "").trim();

        const start_index = objects.indexOf('[');
        const last_index = objects.lastIndexOf(']') + 1;
        objects = objects.slice(start_index, last_index);

        const final_result = JSON.parse(objects);

        lastreport = final_result;

        var high='';
        var mordrate='';
        var low='';
        var warn='';
        var info='';
        var normal='';
        final_result.forEach((element,i) =>{
            if(i==0)
            parseSummary(element, element["risk_assessment"]);
        })


         function parseSummary(summary, assessment){

                console.log()
                summary["summary"].forEach((e,i) => {
                    if(i === 2)
                    warn = e;
                })
                summary["summary"].forEach((e,i) => {
                    if(i === 1)
                    info = e;
                })
                summary["summary"].forEach((e,i) => {
                if(i === 0)
                    normal = e;
                })

                high = assessment["warning"];
                mordrate = assessment["modrate"];
                low = assessment["normal"];
                
            }
            

         try{    
            let query1 = 'insert into public.report(user_id, warn, info, normal, high, moderate, low) VALUES($1, $2, $3, $4, $5, $6, $7) ';            
            let getUser = await pool.query(query1, [uid, warn, info, normal, high, mordrate, low]);
            if(getUser){
                console.log(getUser.rows[0])
            }
        }catch(err){
            console.log(err.message)
        }

        res.redirect('/insights')
        // res.json({ text:final_result});

        // console.log(final_result);
    }
    
    main().catch(console.error);
    
    
} catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Something went wrong", detail: error.message });
}
});

let lastreport = null;
route.get('/insights-report', async ( req, res) => {
    res.json(lastreport)
})


route.get('/insights', (req, res) => {
    res.render('report_insights', {
        name: req.cookies.user.name,
        age: req.cookies.user.age,
        gender: req.cookies.user.gender
    });
})


route.get('/dashboard', (req, res) => {
    res.render('dashboard');
})


route.get('/detailBoard', async(req, res) => {

    try {
        const query = 'select *from public.report';
        var result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
            console.log(error.message);
    }   

})

route.get('/alluser', async(req, res) => {

    try {
        const query = 'select *from public.users';
        var result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
            console.log(error.message);
    }   

})


module.exports = route;