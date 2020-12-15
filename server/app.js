const { symlinkSync } = require('fs');
const WebSocket = require('ws');
const fs = require('fs').promises;
const configFile = __dirname+'/config.json';
const Hue = require('philips-hue');
const hue = new Hue;
hue.bridge = "192.168.4.38";  // from hue.getBridges
// To get a username from the hue bridge : https://developers.meethue.com/develop/get-started-2/
hue.username = "Jb-xDhFWppqpdbMpERD6TeeTg4Fa8TYcMDcsc3h4"; // from hue.auth
let lightsObjOld = {};
let lightsObj = {};
let lastLightChange = "1";

// my light is light number: 8
const wss = new WebSocket.Server({ port: 8081 });

// Wesocket Connection to client.
wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    // Parse incomming messages
    let reactColorObj = JSON.parse(message);
    // There are two message types, one that is for color bulbs, and one for on/off bulbs
    if (Object.keys(lightsObj).length !== 0 
            && lightsObj[reactColorObj.light]
            && lightsObj[reactColorObj.light].state.on
            && reactColorObj.reactColor) {
        console.log(`reactColorChange ${JSON.stringify(reactColorObj)}`)
        lightsObj[reactColorObj.light].incommingColor = reactColorObj;
        lastLightChange = reactColorObj.light;
        wss.clients.forEach(client => {
            client.send(JSON.stringify(lightsObj))
        })
    } else if (Object.keys(lightsObj).length !== 0 
                && lightsObj[reactColorObj.light]
                && 'toggle' in reactColorObj) {
            console.log(`reactToggleChange ${JSON.stringify(reactColorObj)}`)
            lightsObj[reactColorObj.light].incommingColor = reactColorObj;
            lastLightChange = reactColorObj.light;

            wss.clients.forEach(client => {
                client.send(JSON.stringify(lightsObj));
            })
        }
  });

  // rebroadcast the new message to all clients.
  if (Object.keys(lightsObj).length !== 0) {
        ws.send(JSON.stringify(lightsObj));
    }
});

setInterval(() => {
    // if the local lights object has changed,
    // then we can send a new message to the Phillips Hue Bridge API.
    // The reason that we cannot do this directly from inside the websocket event callback function
    // is because the Phillips Hue Bridge will crash if we ping the API as fast as we can get data from
    // the incomming websocket connection messages.
    if (lightsObj !== lightsObjOld 
            && Object.keys(lightsObj).length !== 0 
            && lightsObj[lastLightChange].incommingColor
            && lightsObj[lastLightChange].incommingColor.reactColor) {
        hue.light(lastLightChange).setState({ hue: lightsObj[lastLightChange].incommingColor.reactColor, sat: 254, bri: 254 });
        lightsObjOld = lightsObj;
    } else if (lightsObj !== lightsObjOld 
        && Object.keys(lightsObj).length !== 0 
        && lightsObj[lastLightChange].incommingColor
        &&'toggle' in lightsObj[lastLightChange].incommingColor) {
            console.log(lightsObj[lastLightChange].incommingColor.toggle);
            if (lightsObj[lastLightChange].incommingColor.toggle) {
                hue.light(lastLightChange).on();
            } else {
                hue.light(lastLightChange).off();
            }
        }
}, 100)

// This function caches the lights object when the server is initially started.
hue.login(configFile)
    .then(conf => {
        setInterval( () => {
            hue.getLights()
            .then(lights => {
                lightsObj = lights;
            })
        }, 200);
    }).catch(err => console.error(err));

// This will read the config.jon file and crash iff the file DNE.
// This function was for helping setup the Phillips Hue credenials, though
// this is a much easier process with this process : https://developers.meethue.com/develop/get-started-2/
const readFromConfig = () => {
    return fs.readFile('./config.json')
            .then((data) => data)
            .catch(err => {
                if (err.code === `ENOENT`) {
                    fs.writeFile(`./config.json`, `{}`);
                    console.log(`please try to start the app again.`);
                    process.exit(1);
                }
            });
}

console.log(`confFile: ${configFile}`)
