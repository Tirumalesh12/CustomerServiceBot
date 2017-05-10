var restify = require('restify');
var builder = require('botbuilder');
var http = require('http');
var sess = require('client-sessions');

WishMe = function(){
	var currentTime = new Date();
	var currentOffset = currentTime.getTimezoneOffset();
	var ISTOffset = 330;   // IST offset UTC +5:30 
	var myDate = new Date(currentTime.getTime() + (ISTOffset + currentOffset)*60000);
    if (myDate.getHours()>4 && myDate.getHours() < 12 ){ 
    return "Good Morning!"
	} else if (myDate.getHours() >= 12 && myDate.getHours() < 16 ) { 
	return "Good Afternoon!"; 
	} else if ( myDate.getHours() >= 16 && myDate.getHours() <= 22 ) { 
	return "Good Evening!";
	}else {
		return "I guess it is very late now, Anyway"
	} 
};

var connector = new builder.ChatConnector({appId:"", appPassword:""});
var bot = new builder.UniversalBot(connector);
var recognizer = new builder.LuisRecognizer('https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/6a533e77-b06a-4d2f-b563-f0dc114998ee?subscription-key=caad2e27fd634364a3dff4b0adf8b6dd&timezoneOffset=0&verbose=true&q=');
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

dialog.matches('Welcome', function (session, args) {
	session.sendTyping();
	console.log ('in greeting intent');	
	var username = session.message;
	session.send("Hello " +username.address.user.name+ ". " +WishMe());
	session.send("How can I help you?");
});

dialog.matches('Order', function (session, args, results) {
	session.sendTyping();
	console.log("in issue intent");
	var order = builder.EntityRecognizer.findEntity(args.entities, 'Order');
	var orderID = builder.EntityRecognizer.findEntity(args.entities, 'Order::OrderID');
	var statuss = builder.EntityRecognizer.findEntity(args.entities, 'Order::Status');
	var track = builder.EntityRecognizer.findEntity(args.entities, 'Order::Track');
	var details = builder.EntityRecognizer.findEntity(args.entities, 'Order::Details');
	var cancel = builder.EntityRecognizer.findEntity(args.entities, 'Order::Cancel');
	var returnn = builder.EntityRecognizer.findEntity(args.entities, 'Order::Return');
	
	session.userData = {
		order    : order    ? order.entity    : "",
		orderID  : orderID  ? orderID.entity  : "",
	    statuss  : statuss  ? statuss.entity  : "",
        track    : track    ? track.entity    : "",
		details  : details  ? details.entity  : "",
		cancel   : cancel   ? cancel.entity   : "",
		returnn  : returnn  ? returnn.entity  : ""
	}
	if(session.userData.orderID == ""){
		session.send('Please provide the orderID of your order');
		session.endDialog();
	}else {
		session.beginDialog("/OrderReply");
	}
})

bot.dialog('/OrderReply', function (session, args, results){
	session.send("Please provide your 10 digit order ID?");
	session.endDialog();
})

dialog.matches('Change address', [
function (session, args) {
	session.sendTyping();
	builder.Prompts.choice(session, "It's super easy, Click on the button and let me guide you" , ['change address','Cancel']);
},
function(session, results){
	if (results.response.entity != 'Cancel' ) {
		     builder.Prompts.number(session, "Firstly provide the PIN code to check for availability of delivery");
		}else {
			session.send("OK, We will deliver your order to the previously saved address");
			session.endDialog();
		}
},
function(session, results){
		if (results.response){
		session.send("Delivery is available to this PIN");
		builder.Prompts.text(session, "Please provide the new address separated by comma");
		}
},
function(session, results){
	if(results.response)
	session.userData.address = results.response;
	session.send("We have saved your address and delivers your order to this address");
	session.endDialog();
}
])

dialog.matches('None', function (session, args) {
	console.log ('in none intent');	
	session.send("I am sorry! I am a bot, perhaps not programmed to understand this command");
    session.endDialog();	
});

// Setup Restify Server
var server = restify.createServer();
server.post('/api/messages', connector.listen());
server.listen(process.env.port || 8000, function () {
    console.log('%s listening to %s', server.name, server.url); 
});
