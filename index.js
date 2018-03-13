const Telegraf = require('telegraf')
var mysql = require('mysql')
const config = require('../config.js');
var QRCode = require('qrcode')


var crypto = require('crypto'),
    algorithm = 'aes-128-ecb',
    password = config.encode.passphrase;

var db_config = {

    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name

};

// con.connect(function(err) {

//     if (err) throw err;
//     console.log("connected!");

// });

function handleDisconnect() {
    con = mysql.createConnection(db_config); // Recreate the connection, since
                                                    // the old one cannot be reused.
  
    con.connect(function(err) {              // The server is either down
      if(err) {                                     // or restarting (takes a while sometimes).
        console.log('error when connecting to db:', err);
        setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
      }                                   // to avoid a hot loop, and to allow our node script to
      console.log('connected! ' + new Date())
    });                                     // process asynchronous requests in the meantime.
                                            // If you're also serving http, display a 503 error.
    con.on('error', function(err) {
      console.log('db error', err);
      if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
        handleDisconnect();                         // lost due to either server restart, or a
      } else {                                      // connnection idle timeout (the wait_timeout
        throw err;                                  // server variable configures this)
      }
    });
  }
  
handleDisconnect();

const { Markup } = Telegraf

const app = new Telegraf(config.app.token)
const PAYMENT_TOKEN = config.app.ptoken

//Product offer -- no longer needed
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


// Create invoice for purchase -- no longer needed
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
     reply }) => reply('Welcome to Reeve, the first lunchbox rental service in Singapore! \nPress /about to know more about us and /register to start using Reeve!'))

     app.command('about', ({ reply }) => reply('Welcome to Reeve!'))

app.command('info', (ctx) => {
    getUser(ctx.from.id, function(err, data){
        if (err) { console.log("ERROR: ", err);}
        else {
            if (data == ctx.from.id){
                replyString = `Welcome, ${ctx.from.first_name}!`;                
                ctx.reply(replyString);    
            }else{
                ctx.replyWithMarkdown(`Welcome, ${ctx.from.first_name}! You have not registered!`,
                Markup.keyboard(['/register']).oneTime().resize().extra());    
            }
        }

        getRegisterStage(ctx.from.id, function(err, data){
            if (err) { console.log("ERROR: ", err);}
            else {
                stage = data;
                if (stage == 1){
                    ctx.reply('Please reply with your email to continue registration.');

                }else if (stage == 2){
                    ctx.reply('Please reply with your mobile phone number to continue registration.');
                }else if (stage == 3){
                    chat_id = ctx.chat.id;

                    txt = chat_id + '|-|' + 'register';
                    txt_en = encrypt(txt);
                
                    QRCode.toFile('./'+ctx.from.id+'_register.jpeg', txt, function(err){
                        if (err) throw err
                        try{
                            filepath = `./`+ctx.from.id+`_register.jpeg`;
                            ctx.replyWithPhoto({ source: filepath });
                            ctx.reply('Show this QR code and pay 3 dollars to complete registeration at our booths.');
                        }
                        catch (err){
                            console.log(err)
                        }
                
                    })
                }else if (stage == 4){
                    getUserInfo(ctx.from.id, function(err, data){
                        if (err) { console.log("ERROR: ", err);}
                        else{
                            email = data.email;
                            mobile = data.mobile;
                            point = data.point;
                            replyString = `Email: ` + email + `\nMobile: ` + mobile + `\nPoint: ` + point;
                            ctx.reply(replyString);
                        }
                    })

                    getDeposit(ctx.from.id, function(err, data){
                        if (err) { console.log("ERROR: ", err);}
                        else {
                            var now = new Date();
                            epoch_time = data;
                            var exp_date = new Date(epoch_time * 1000);
                
                            if (epoch_time != 'no user' && epoch_time != 'no deposit'){
                                if (exp_date >= now){
                                    ctx.reply('Your deposit will expire on ' + formatDate(exp_date));    
                                   
                                }else{                                                                        
                                    ctx.reply('Your deposit expired on ' + formatDate(exp_date) + '. Please type /info to deposit again');    
                                }
                            }else{
                                ctx.reply('You have no deposit, type /info to continue.');                     
                            }
                        }
                        
                    });  
                    


                }            
            }
        });
        
    });   

    }
)

//register user - stage 1: ask for email 
app.command('register', (ctx) => {

    getUser(ctx.from.id, function(err, data){
        if (err) { console.log("ERROR: ", err);}
        else {
            telegram_id = data;
            if (telegram_id == ctx.from.id){

                getRegisterStage(ctx.from.id, function(err, data){
                    if (err) { console.log("ERROR: ", err);}
                    else{
                        stage = data;
                        if (stage == 4){
                            replyString = `You are already registered.`;                
                            ctx.reply(replyString); 
                        }else if (stage == 3){                            
                            chat_id = ctx.chat.id;

                            txt = chat_id + '|-|' + 'register';
                            txt_en = encrypt(txt);
                        
                            QRCode.toFile('./'+ctx.from.id+'_register.jpeg', txt, function(err){
                                if (err) throw err
                                try{
                                    filepath = `./`+ctx.from.id+`_register.jpeg`;
                                    ctx.replyWithPhoto({ source: filepath });
                                    ctx.reply('Show this QR code to complete registeration at our booths. 5 SGD deposit needed.');
                                }
                                catch (err){
                                    console.log(err)
                                }
                        
                            })
                        }else if (stage==2){
                            replyString = `Please reply with your mobile phone number to continue registration.`;                
                            ctx.reply(replyString); 
                        }else if (stage ==1){
                            replyString = `Please reply with your email to continue registration.`;                
                            ctx.reply(replyString); 

                        }
                        

                    }


                })
                // replyString = `You are already registered.`;                
                // ctx.reply(replyString);    
            }else{
                queryString = `INSERT INTO status (telegram_id, register_stage) VALUES ('${ctx.from.id}' , 1)`;        
                con.query(queryString);
                ctx.reply('Please reply with your email');    
            }
        }
        
    });  

})

//register user - stage 2: ask for phone number
app.hears(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i, (ctx) => {
    getRegisterStage(ctx.from.id, function(err, data){
        if (err) { console.log("ERROR: ", err);}
        else {
            stage = data;
            var email = ctx.message.text;
            if (stage == 1){
                queryString = `INSERT INTO user (telegram_id, first_name, last_name, email) VALUES ('${ctx.from.id}', '${ctx.from.first_name}', '${ctx.from.last_name}', '${email}')`
                con.query(queryString);
                ctx.reply('Please reply with your mobile phone number.');
                queryString = `UPDATE status SET register_stage = 2 WHERE telegram_id = '${ctx.from.id}';`
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
    getRegisterStage(ctx.from.id, function(err, data){
        if (err) { console.log("ERROR: ", err);}
        else {
            stage = data;
            var number = ctx.message.text;
            if (stage == 2){
                queryString = `UPDATE user SET mobile = '${number}' WHERE telegram_id = '${ctx.from.id}'`;
                con.query(queryString);
                queryString = `UPDATE status SET register_stage = 3 WHERE telegram_id = '${ctx.from.id}';`
                con.query(queryString);
        
            }else if (stage == 3){//TODO: add edit number function
                ctx.replyWithMarkdown(`Do you want to update your phone number?`, 
                    Markup.keyboard([`Update Mobile to ${number}`, `Cancel`]).oneTime().resize().extra() 
                )
            }            
        }
    });

    chat_id = ctx.chat.id;

    txt = chat_id + '|-|' + 'register';
    txt_en = encrypt(txt);

    QRCode.toFile('./'+ctx.from.id+'_register.jpeg', txt, function(err){
        if (err) throw err
        try{
            filepath = `./`+ctx.from.id+`_register.jpeg`;
            ctx.replyWithPhoto({ source: filepath });
            ctx.reply('Show this QR code to complete registeration at our booths. 5 SGD deposit needed.');
        }
        catch (err){
            console.log(err)
        }

    })

})// end collecting phone number and generated qr code for user to complete registration


app.command('rent', (ctx) => {
    telegram_id = ctx.from.id;

    getDeposit(ctx.from.id, function(err, data){
        if (err) { console.log("ERROR: ", err);}
        else {
            var now = new Date();
            epoch_time = data;
            var exp_date = new Date(epoch_time * 1000);

            if (epoch_time != 'no user' && epoch_time != 'no deposit'){
                if (exp_date >= now){
                    txt = ctx.chat.id + '|-|' + new Date().toLocaleString() + '|-|' + 'rent';
                    txt_en = encrypt(txt);
                    console.log('-->' + txt_en + '<--')
                        QRCode.toFile('./'+ctx.from.id+'_rent.jpeg', txt, function(err){
                        if (err) throw err
                
                        try{
                            filepath = `./`+ctx.from.id+`_rent.jpeg`;                
                            ctx.replyWithPhoto({ source: filepath });
                            ctx.reply('Scan QR code to get a lunchbox!');
                        }
                        catch (err){
                            console.log(err)
                        }
                
                    })                                    
                }else{                                    
                    
                    ctx.reply('Your deposit expired on ' + formatDate(exp_date) + '. Please type /info to deposit again');    
                }
            }else{
                ctx.reply('You have no deposit, type /info to continue.');    

            }
        }
        
    });  

    

})


app.command('return', (ctx) => {
    telegram_id = ctx.chat.id;

// TODO: add checking of existing rentals to prevent user from renting more than one box
    getRental(ctx.from.id, function(err, data){
        if (err) { console.log("ERROR: ", err);}
        else {
            var now = new Date();
            r_id = data;

            if (r_id != 'no user'){
                txt = telegram_id + '|-|' + new Date().toLocaleString() + '|-|' + 'return' + '|-|' + r_id;
                txt_en = encrypt(txt);
                console.log('-->' + txt_en + '<--')
                QRCode.toFile('./'+ctx.from.id+'_return.jpeg', txt, function(err){
                    if (err) throw err
            
                    try{
                        filepath = `./`+ctx.from.id+`_return.jpeg`;                
                        ctx.replyWithPhoto({ source: filepath });
                        ctx.reply('Scan QR code to return your lunchbox!');
                    }
                    catch (err){
                        console.log(err)
                    }
        
                })                                    

            }else{
                ctx.reply('You have no rentals, type /rent to rent a new one.');

            }
        }
        
    });  

    

})



// Show offer -- no longer needed
// app.hears(/^what.*/i, ({ replyWithMarkdown }) => replyWithMarkdown(`
// You want to know what I have to offer? Sure!
// ${products.reduce((acc, p) => acc += `*${p.name}* - ${p.price} SGD\n`, '')}    
// What do you want?`,
//     Markup.keyboard(products.map(p => p.name)).oneTime().resize().extra()
// ))
// app.command('product', ({ replyWithMarkdown }) => replyWithMarkdown(`
// You want to know what I have to offer? Sure!
// ${products.reduce((acc, p) => acc += `*${p.name}* - ${p.price} SGD\n`, '')}    
// What do you want?`,
//     Markup.keyboard(products.map(p => p.name)).oneTime().resize().extra()
// ))

// Order product -- no longer needed
/*
products.forEach(p => {
    app.hears(p.name, (ctx) => {
        console.log(`${ctx.from.first_name} is about to buy a ${p.name}.`);
        if (p.name == 'One Month Pass') pid = 1;
        else pid = 3;
        queryString = `SELECT * FROM PURCHASE WHERE telegram_id = '${ctx.from.id}' AND pid = '${pid}';`;
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

// Handle payment callbacks -- no longer needed
app.on('pre_checkout_query', ({ answerPreCheckoutQuery }) => answerPreCheckoutQuery(true))
app.on('successful_payment', (ctx) => {
    console.log(`${ctx.from.first_name} (${ctx.from.id}) just payed ${ctx.message.successful_payment.total_amount / 100} SGD.`)
    
    if (ctx.message.successful_payment.total_amount == 999) 
        pid = 1;
    else
        pid = 3;
    console.log(`INSERT INTO purchase (telegram_id, pid) VALUES ('${ctx.from.id}', '${pid}')`);
    con.query(`INSERT INTO purchase (telegram_id, pid) VALUES ('${ctx.from.id}', '${pid}')`);
    

})
*/

function getUser(id, callback){
    queryString = `SELECT * FROM user WHERE telegram_id = '${id}';`;
    if (queryString == 'SELECT * FROM user WHERE telegram_id = \'undefined\'')
        callback(null, 'no user');
    else{
        con.query(queryString, function(err, result){
            if (err) callback(err, null);
            else {
                if(result.length > 0)
                    callback(null, result[0].telegram_id);
                else
                callback(null, 'no user');
            }
        });
    }
}

function getUserInfo(id, callback){
    queryString = `SELECT * FROM user WHERE telegram_id = '${id}';`;
    if (queryString == 'SELECT * FROM user WHERE telegram_id = \'undefined\'')
        callback(null, 'no user');
    else{
        con.query(queryString, function(err, result){
            if (err) callback(err, null);
            else {
                if(result.length > 0)
                    callback(null, result[0]);
                else
                callback(null, 'no user');
            }
        });
    }
}

function getDeposit(id, callback){
    queryString = `SELECT UNIX_TIMESTAMP(exp_date) AS exp_epoch FROM deposit WHERE telegram_id = '${id}';`;
    if (queryString == 'SELECT UNIX_TIMESTAMP(exp_date) AS exp_epoch FROM deposit WHERE telegram_id = \'undefined\'')
        callback(null, 'no user');
    else{
        con.query(queryString, function(err, result){
            if (err) callback(err, null);
            else {
                if(result.length > 0){
                    callback(null, result[0].exp_epoch);
                }
                else{
                    callback(null, 'no deposit');

                }
                

            }
        });
    }
}

function getRental(id, callback){
    queryString = `SELECT * FROM rental WHERE t_id = '${id}';`;
    if (queryString == 'SELECT * FROM rental WHERE t_id = \'undefined\'')
        callback(null, 'no user');
    else{
        con.query(queryString, function(err, result){
            if (err) callback(err, null);
            else {
                if(result.length > 0){
                    callback(null, result[0].r_id);
                }
                else{
                    callback(null, 'no user');
                }
                

            }
        });
    }
}

function getRegisterStage(id, callback){
    queryString = `SELECT * FROM status WHERE telegram_id = '${id}';`;

    if (queryString == 'SELECT * FROM status WHERE telegram_id = \'undefined\'')
        callback(null, 'no user');
    con.query(queryString, function(err, result){
        if (err) callback(err, null);
            else {
                if(result.length > 0){
                    callback(null, result[0].register_stage);
                }
                else{
                    callback(null, 'no user');
                }
            }
    });    
}

function encrypt(text){
    var cipher = crypto.createCipher(algorithm,password)
    var crypted = cipher.update(text,'utf8','hex')
    crypted += cipher.final('hex');
    return crypted;
}
   
function decrypt(text){
    var decipher = crypto.createDecipher(algorithm,password)
    var dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
}

function formatDate(date) {
    var monthNames = [
      "January", "February", "March",
      "April", "May", "June", "July",
      "August", "September", "October",
      "November", "December"
    ];
  
    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();
  
    return day + ' ' + monthNames[monthIndex] + ' ' + year;
  }
  

app.startPolling()