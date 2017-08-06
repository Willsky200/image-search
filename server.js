const express = require("express");
const app = express();
const hbs = require("hbs");
const request = require("request");
const mongoose = require("mongoose");

var {Search} = require("./models/search");
const secret = require("./secret/secret");

// set the port to either the environment variable (required for heroku)
// or the localhost port.
const port = process.env.PORT || 3000;

// set the view engine for files in the views folder to hbs
app.set("view engine", "hbs");

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/image-search");

app.get("/", (req, res) => {
	res.render("index");
});

app.get("/api/imgursearch/:search", (req, res) => {
	var search = req.params.search
	// queries do not have to be specified in the path of the app.get
	// first argument, but come as a property on req.query
	var offset = req.query.offset;

	// if the offset value is less than 1 then the start object in
	// the response won't exist
	if(offset < 1){
		res.send("Please enter a valid offset value. This must be an integer greater than 0.");
	}

	var options = {
		url: `https://api.imgur.com/3/gallery/search?q=${search}`,
		headers: {
			"authorization": `Client-ID ${secret.clientID}`
		}
	}

	// send an api request
	request(options, function(err, response, body){
		if(err){
			console.log(err);
		}
		// the body came as an escaped json file so parsing removes the
		// escape characters
		var searchStore = new Search({
			term: search,
			when: new Date(),
			api: "imgur"
		});
		searchStore.save();
		var results = JSON.parse(body);
		var images = results.data;
		// There should be 10 objects returned so if offset is greater
		// than ten less than the results length then the last 10 
		// objects are shown
		if((images.length - 10) < offset) {
			offset = images.length - 10;
		}
		var offsetResults = []
		for(var i = (offset - 1); i < images.length; i++){
			// push results into an array, starting with the result of
			// number offset - 1
			offsetResults.push(images[i]);
		}
		res.json(offsetResults);
		// res.json(images);
	});
});

app.get("/api/imagesearch/:search", (req, res) => {
	var search = req.params.search
	var offset = parseInt(req.query.offset);

	if(offset < 1){
		res.send("Please enter a valid offset value. This must be an integer greater than 0.");
	}


	const endpointURL = "https://www.googleapis.com/customsearch/v1?";
	const key = secret.googleKey;
	const cx = secret.cx;
	// the Google CSE api requires a key, the search engine created by
	// the client (me) and a search term.
	// For an image search we use the searchType query and we set the
	// start query to offset so it returns images starting
	// from the value of offset
	requestURL = `${endpointURL}key=${key}&cx=${cx}&q=${search}&searchType=image&start=${offset}`;

	request(requestURL, function(err, response, body){
		if(err){
			console.log(err);
		}
		var results = JSON.parse(body);
		var images = results.items;

		var searchStore = new Search({
			term: search,
			when: new Date(),
			api: "google"
		});
		searchStore.save();

		var imageArray = [];

		images.forEach(function(image) {
			var specObject = {
				url: image.link,
				snippet: image.snippet,
				thumbnail: image.image.thumbnailLink,
				context: image.image.contextLink
			}
			imageArray.push(specObject);
		});
		var jsonImages = JSON.stringify(imageArray);
		res.json(JSON.parse(jsonImages));
		// res.json(results.items);

	});
});

app.get("/api/latest/imagesearch", (req, res) => {
	Search.find({}, {"_id": 0, "term": 1, "when": 1, "api": 1}).sort("-when").exec(function(err, docs){
		if(err){
			return res.send(err);
		}
		var resultsArr = []

		for(var i = 0; i < 10; i++){
			resultsArr.push(docs[i]);	
		}

		res.json(resultsArr);
	});
});



app.listen(port, function() {
	console.log(`Listening on port ${port}`);
})
