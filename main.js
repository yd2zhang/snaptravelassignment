const express = require('express')
const async = require('async');
const request = require('request')
const crypto = require('crypto');
const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const bodyParser = require('body-parser')
var path = require('path');
const format = require('string-format')

const app = express();

const port = 3000
var request_path = 'https://experimentation.getsnaptravel.com/interview/hotels';
var cache = [] // Does this ever expire?

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', (req, res) => res.sendFile(path.join(__dirname + '/index.html')))
app.post('/result', (req, res) => {
	var body = req.body;
	const hash = getHash(body);
	if (cache[hash]) {
		// Do something
		checkResults(hash);
		return;
	}
	cache[hash] = {};
	cache[hash]['ids'] = []
	cache[hash].response = res; // Not sure the proper way of doing this
	var providers = ['snaptravel', 'retail'];
	providers.forEach(p => {
		body['provider'] = p
		var initializePromise = initialize(request_path, body);
		initializePromise.then(function(result) {
	        onResults(hash, p, result, res);
	    }, function(err) {
	        console.log(err);
	    });
	});
})

function getHash(body) {
	return crypto.createHash('md5').update(JSON.stringify(body)).digest("hex");
}

function initialize(url, data) {
	const options = {
	    url :  url,
	    json : data,
	    headers: {'content-type' : 'application/json'},
  	};
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

function onResults(hash, provider, results) {
	results['hotels'].forEach(result => {
		if (result) {
			var id = result['id'];
			if (id == []) {
				return;
			}
			if (!cache[hash]['ids'][id]) {
				cache[hash]['ids'][id] = []
			}
			result['provider'] = provider;
			cache[hash]['ids'][id].push(result);
		}
	});
	cache[hash][provider] = true;
	if (cache[hash]['snaptravel'] && cache[hash]['retail']) {
		checkResults(hash);
	}
}

function checkResults(hash) {
	if (!cache[hash] || !cache[hash]['snaptravel'] || !cache[hash]['retail']){
		return;
	}
	results = {'snaptravel':[], 'retail':[]};
	for (id in cache[hash]['ids']) {
		if (cache[hash]['ids'][id].length == 2) {
			cache[hash]['ids'][id].forEach(val => {
				results[val['provider']].push(val);
			});
		}
	}
	response = cache[hash]['response'];
	sendResponse(response, results);
	delete cache[hash].response;
}

function sendResponse(response, results) {
	var page_template = fs.readFileSync('results.html','utf-8');
	// Time for ghetto HTML Manipulation
	var halves = page_template.split('</table>')
	row = []
	for (i in results.snaptravel) {
		snaptravel = results.snaptravel[i];
		retail = results.retail[i];
		retail.snapprice = snaptravel.price;
		retail.amenities = retail.amenities.join("<br/>");
		row.push(format("<tr><th>{id}</th><th>{hotel_name}</th><th>{num_reviews}</th><th>{address}</th><th>{num_stars}</th><th>{amenities}</th><th><img src={image_url}/></th><th>{snapprice}</th><th>{price}</th></tr>", retail));
	}
	row.push('</table>')
	html = halves[0] + row.join("") + halves[1];
	response.send(html);
}


app.listen(port, () => console.log(`Example app listening on port ${port}!`))