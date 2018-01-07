const Telegraf = require('telegraf')
var mysql = require('mysql')
const config = require('../config.js');

var con = mysql.createConnection({

    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name

});

con.connect(function(err) {

    if (err) throw err;
    console.log("connected!");

});

const { Markup } = Telegraf

const app = new Telegraf(config.app.token)
const PAYMENT_TOKEN = config.app.ptoken

const products = [
    {
        name: 'One Month Pass',
        price: 9.99,
        description: 'Enjoy one month of lunch box rental for free!'
    },
    {
        name: '3 Month Pass',
        price: 24.99,
        description: 'Enjoy three months of lunch box rental for free!'
    }
]

function createInvoice(product) {
    return {
        provider_token: PAYMENT_TOKEN,
        start_parameter: 'foo',
        title: product.name,
        description: product.description,
        currency: 'SGD',
        photo_url: product.photoUrl,
        is_flexible: false,
        need_shipping_address: false,
        prices: [{ label: product.name, amount: Math.trunc(product.price * 100) }],
        payload: {}
    }
}

// Start command
app.command('start', ({
     reply }) => reply('Welcome to Reeve, the first lunchbox vending machine in Singapore! \nPress /about to know more about us and /product to see our subscription packages for lunchboxes!'))
app.command('about', ({ reply }) => reply('<INSERT ABOUT US INFORMATION HERE>'))

app.command('info', (ctx) => {
    getUser(ctx.from.username, function(err, data){
        if (err) { console.log("ERROR: ", err);}
        else {
            telegram_id = data;
            if (telegram_id == ctx.from.username){
                replyString = `Welcome, ${ctx.from.username}!`;
                queryString = `SELECT * FROM purchase WHERE telegram_id = '${ctx.from.username}'`;
                con.query(queryString, function(err, rows, fields) {
                    if (err) throw err;
                    for (var i in rows) {
                    replyString = `\n You have a ${rows[i].pid} Month Subscription until ${rows[i].exp_date}`;
                    ctx.reply(replyString);        
                }
                });
                ctx.reply(replyString);    
            }else{
                ctx.replyWithMarkdown('You have not registered!',
                Markup.keyboard(['register now']).oneTime().resize().extra());    
            }
        }
        
    });   


    }
)

//register user - stage 1: ask for email
app.hears('register now', (ctx) => {
    var hasUser = checkUser(ctx.from.username);
    if (hasUser)
        ctx.reply('You are already registered');
    else{    
        queryString = `INSERT INTO status (telegram_id, register_stage) VALUES ('${ctx.from.username}' , 1)`;        
        console.log(queryString);
        con.query(queryString);
        ctx.reply('Please reply with your email');
    }

})

//register user - stage 2: ask for phone number
app.hears(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i, (ctx) => {
    getRegisterStage(ctx.from.username, function(err, data){
        if (err) { console.log("ERROR: ", err);}
        else {
            stage = data;
            var email = ctx.message.text;
            if (stage == 1){
                queryString = `INSERT INTO user (telegram_id, first_name, last_name, email) VALUES ('${ctx.from.username}', '${ctx.from.first_name}', '${ctx.from.last_name}', '${email}')`
                console.log(queryString);
                con.query(queryString);
                ctx.reply('Please reply with your mobile phone number.');
                queryString = `UPDATE status SET register_stage = 2 WHERE telegram_id = '${ctx.from.username}';`
                con.query(queryString);
        
            }else if (stage != 1){//TODO: add edit email function
                ctx.replyWithMarkdown(`Do you want to update your email address?`, 
                    Markup.keyboard([`Update Email to ${email}`, `Cancel`]).oneTime().resize().extra() 
                )
            }            
        }
    });
})// end collecting email


//register user - stage 3: done
app.hears(/^\d{8}$/i, (ctx) => {
    getRegisterStage(ctx.from.username, function(err, data){
        if (err) { console.log("ERROR: ", err);}
        else {
            stage = data;
            var number = ctx.message.text;
            if (stage == 2){
                queryString = `UPDATE user SET mobile = '${number}' WHERE telegram_id = '${ctx.from.username}'`;
                console.log(queryString);
                con.query(queryString);
                ctx.reply('Thank you for registering!');
                queryString = `UPDATE status SET register_stage = 3 WHERE telegram_id = '${ctx.from.username}';`
                con.query(queryString);
        
            }else if (stage == 3){//TODO: add edit email function
                ctx.replyWithMarkdown(`Do you want to update your phone number?`, 
                    Markup.keyboard([`Update Mobile to ${number}`, `Cancel`]).oneTime().resize().extra() 
                )
            }            
        }
    });
})// end collecting phone number


// Show offer
app.hears(/^what.*/i, ({ replyWithMarkdown }) => replyWithMarkdown(`
You want to know what I have to offer? Sure!
${products.reduce((acc, p) => acc += `*${p.name}* - ${p.price} SGD\n`, '')}    
What do you want?`,
    Markup.keyboard(products.map(p => p.name)).oneTime().resize().extra()
))
app.command('product', ({ replyWithMarkdown }) => replyWithMarkdown(`
You want to know what I have to offer? Sure!
${products.reduce((acc, p) => acc += `*${p.name}* - ${p.price} SGD\n`, '')}    
What do you want?`,
    Markup.keyboard(products.map(p => p.name)).oneTime().resize().extra()
))

// Order product
products.forEach(p => {
    app.hears(p.name, (ctx) => {
        console.log(`${ctx.from.first_name} is about to buy a ${p.name}.`);
        if (p.name == 'One Month Pass') pid = 1;
        else pid = 3;
        queryString = `SELECT * FROM PURCHASE WHERE telegram_id = '${ctx.from.username}' AND pid = '${pid}';`;
        console.log(queryString);
        // TODO: check whether user has already got subscription, if have, ask if it is to top up or not.
        con.query(queryString, function(err, rows, fields) {
            if (err) throw err;
            for (var i in rows) {
            console.log('DATE EXP is : ', rows[i].exp_date);            
            }
        });
        ctx.replyWithInvoice(createInvoice(p))
    })
})



// Handle payment callbacks
app.on('pre_checkout_query', ({ answerPreCheckoutQuery }) => answerPreCheckoutQuery(true))
app.on('successful_payment', (ctx) => {
    console.log(`${ctx.from.first_name} (${ctx.from.username}) just payed ${ctx.message.successful_payment.total_amount / 100} SGD.`)
    
    if (ctx.message.successful_payment.total_amount == 999) 
        pid = 1;
    else
        pid = 3;
    console.log(`INSERT INTO purchase (telegram_id, pid) VALUES ('${ctx.from.username}', '${pid}')`);
    con.query(`INSERT INTO purchase (telegram_id, pid) VALUES ('${ctx.from.username}', '${pid}')`);
    

})

function getUser(username, callback){
    queryString = `SELECT * FROM user WHERE telegram_id = '${username}';`;
    con.query(queryString, function(err, result){
        if (err) callback(err, null);
        else callback(null, result[0].telegram_id)
    });
}

function getRegisterStage(username, callback){
    queryString = `SELECT * FROM status WHERE telegram_id = '${username}';`;
    console.log(queryString);
    con.query(queryString, function(err, result){
        if (err) callback(err, null);
        else callback(null, result[0].register_stage)
    });    
}


app.startPolling()