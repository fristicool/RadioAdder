const puppeteer = require("puppeteer");
const request = require('request')
const open = require('open');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const btoa = function (str) { return Buffer.from(str).toString('base64'); }
var bodyParser = require('body-parser')
const express = require('express')
const app = express()
const port = 3000

var SpotifyWebApi = require('spotify-web-api-node');
const { post } = require("request");
const req = require("express/lib/request");
const res = require("express/lib/response");
app.use(bodyParser.json())

var redirect_uri = "http://localhost:3000"
var client_id = "0446ec98a7ec44b5b5e8704b9347e7ce"
var client_secret = "85ee468ff45d4eeca4f0f4fae93cf58e"
var creating_refresh_token = true
var latest_refresh_token = ''

// credentials are optional
var spotifyApi = new SpotifyWebApi({
    clientId: '0446ec98a7ec44b5b5e8704b9347e7ce',
    clientSecret: '85ee468ff45d4eeca4f0f4fae93cf58e', //private Change
    redirectUri: 'https://google.com'
});

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

app.get('/', async (req, res) => {
    var code = req.url
    code.split('/?code=')

    if (code.substring(0, 7) == "/?code=") {
        console.log(code.substring(7))

        console.log('fetching')
        fetchAccessToken(code.substring(7))

        await delay(3000)
        // creating_refresh_token = true
        console.log('refresh_token: ', spotifyApi.getRefreshToken())
        res.send("copy this code and paste it in settings: " + spotifyApi.getRefreshToken())
    } else {
        res.send('hello World')
    }
})

const scrapeLatestSong = async () => {

    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    await page.goto('https://nuopderadio.be/stubru/')

    //await page.screenshot({path: '1.png'})

    let [artElement] = await page.$x("//*[@id='content']/div[1]/div[1]/div[1]/div[2]/span[1]")
    let artist = await page.evaluate(artElement => artElement.textContent, artElement)

    let [titElement] = await page.$x("//*[@id='content']/div[1]/div[1]/div[1]/div[2]/span[3]")
    let title = await page.evaluate(titElement => titElement.textContent, titElement)

    const search = artist + " " + title;
    console.log(search)

    // await spotifyApi.clientCredentialsGrant().then(
    //     function (data) {
    //         console.log('The access token expires in ' + data.body['expires_in']);
    //         console.log('The access token is ' + data.body['access_token']);

    //         // Save the access token so that it's used in future calls
    //         spotifyApi.setAccessToken(data.body['access_token']);

    //         addTrackToPlaylist('10VSJdHTScQ9Y6SdKI7XZG', search)
    //     },
    //     function (err) {
    //         console.log('Something went wrong when retrieving an access token', err);
    //     }
    // );

    addTrackToPlaylist('10VSJdHTScQ9Y6SdKI7XZG', search)
}

function addTrackToPlaylist(playlistId, trackName) {
    spotifyApi.searchTracks(trackName)
        .then(function (data) {
            const trackUri = data.body.tracks.items[0].uri

            spotifyApi.addTracksToPlaylist(playlistId, [trackUri])
                .then(function (data) {
                    console.log('Added track to playlist!');
                }, function (err) {
                    console.log('Something went wrong!', err);
                });

        }, function (err) {
            console.error(err);
        });
}

const getAccesToken = async () => {
    client_id = '0446ec98a7ec44b5b5e8704b9347e7ce'
    client_secret = '85ee468ff45d4eeca4f0f4fae93cf58e'

    let url = 'https://accounts.spotify.com/authorize';
    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=playlist-modify-public";
    open(url) // Show Spotify's authorization screen
}

const getAuthUrl = async () => {
    client_id = '0446ec98a7ec44b5b5e8704b9347e7ce'
    client_secret = '85ee468ff45d4eeca4f0f4fae93cf58e'

    let url = 'https://accounts.spotify.com/authorize';
    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=playlist-modify-public";

    return url
}

function fetchAccessToken(code) {
    let body = "grant_type=authorization_code";
    body += "&code=" + code;
    body += "&redirect_uri=" + encodeURI(redirect_uri);
    body += "&client_id=" + client_id;
    body += "&client_secret=" + client_secret;
    callAuthorizationApi(body);
}

function callAuthorizationApi(body) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "https://accounts.spotify.com/api/token", true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}

function handleAuthorizationResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        var data = JSON.parse(this.responseText);
        if (data.access_token != undefined) {
            spotifyApi.setAccessToken(data.access_token)

            console.log('athenthicared')
            // scrapeLatestSong()
        }
        if (data.refresh_token != undefined) {
            spotifyApi.setRefreshToken(data.refresh_token)
            console.log("fatched")

            latest_refresh_token = data.refresh_token
        }
    }
    else {
        console.log(this.responseText);
        //alert(this.responseText);
    }
}

app.get('/latest', (req, res) => {
    console.log(req.body)
    spotifyApi.setRefreshToken(req.body.refresh_token)

    spotifyApi.refreshAccessToken().then(
        function (data) {
            console.log('The access token has been refreshed!');

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
        },
        function (err) {
            console.log('Could not refresh access token', err);
        }
    );

    scrapeLatestSong()

    res.send("Added The Latest Song")
})

app.put('/latest/put', (req, res) => {
    console.log(req.body)
    spotifyApi.setRefreshToken(req.body.refresh_token)

    spotifyApi.refreshAccessToken().then(
        function (data) {
            console.log('The access token has been refreshed!');

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
        },
        function (err) {
            console.log('Could not refresh access token', err);
        }
    );

    scrapeLatestSong()

    res.send("Added The Latest Song")
})

app.get('/auth', async (req, res) => {
    var auth_uri = await getAuthUrl()

    res.send({ "uri": auth_uri })
})

//getAccesToken()