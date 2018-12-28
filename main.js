const express = require('express')
const async = require('async');
const request = require('request')

const app = express();
const bodyParser = require('body-parser')
const port = 3000
var path = require('path');
var request_path = 'https://experimentation.getsnaptravel.com/interview/hotels';
var cache = []

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', (req, res) => res.sendFile(path.join(__dirname + '/index.html')))
app.post('/result', (req, res) => {
	var body = req.body;
	var providers = ['snaptravel', 'retail'];
	providers.forEach(p => {
		body['provider'] = p
		var initializePromise = initialize(request_path, body);
		initializePromise.then(function(result) {
	        userDetails = result;
	        // Use user details from here
	        console.log(userDetails)
	    }, function(err) {
	        console.log(err);
	    });
	});
})

function initialize(url, data) {
	const options = {
	    url :  url,
	    data : JSON.stringify(data),
	    headers: {'content-type' : 'application/x-www-form-urlencoded'},
  	};
  	console.log(options);
    return new Promise(function(resolve, reject) {
        request.post(options, function(err, resp, body) {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        })
    });
}

function onResults(res) {
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`))