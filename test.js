const config = require('../config.js');
var QRCode = require('qrcode')


var crypto = require('crypto'),
    algorithm = 'aes-128-ecb',
    password ='1218DEF';

var text = '332160683|-|05/03/2018, 11:18:51|-|return|-|1'

console.log(encrypt(text))

console.log(password);
console.log(decrypt('2czV9wifyTPKvCLbVFtHdAZx5me/Xm25hUn6cdE1ZCjs5UucgiYkfQkWnHmL3kgf'))

function decrypt(text){
    var decipher = crypto.createDecipher(algorithm,password)
    var dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
}

function encrypt(text){
    var cipher = crypto.createCipher(algorithm,password)
    var crypted = cipher.update(text,'utf8','hex')
    crypted += cipher.final('hex');
    return crypted;
}