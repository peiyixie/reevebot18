const Telegraf = require('telegraf')
var mysql = require('mysql')
const config = require('./config');

var con = mysql.createConnection({

    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database

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
app.command('about', ({ reply }) => reply('<Insert information here>'))

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
        // TODO: check whether user has got subscription
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

app.startPolling()