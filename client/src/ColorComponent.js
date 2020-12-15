import React from 'react';
import { HuePicker } from 'react-color';
import { w3cwebsocket as W3CWebSocket } from "websocket";
const client = new W3CWebSocket('ws://127.0.0.1:8080');
const colorCode = (hsvColor) => parseInt(hsvColor * 182.548746518);

// This is a function that will convert HSL color to Hex
function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// React Class that will parse all the bulbs comming from the server socket,
// and display the objects in the web app in the render component.
export class Component extends React.Component {
  state = {
    lightsObj: {},
    background: '#fff',
  };

  // When the component mounts, connect to the websocket.
  componentWillMount() {
    try {
      client.onopen = () => {
        console.log('WebSocket Client Connected');
      };
      client.onmessage = (message) => {
        let j = JSON.parse(message.data);
        this.setState({ lightsObj: j, background: this.state.background })
        // a timout is needed since message comming back from the websocket server,
        // might not render React.  Therefore, we need to forceUpdate.  There might be a better way to 
        // do this, but I can't seem to figure out how.
        setTimeout(() => {
          this.forceUpdate();
        }, 2000)
      };
    } catch (error) {
      console.log(`websocket error: ${error}`);
    }
  }

  handleChangeComplete = (indivividualLight) => (color) => {
    //console.log(`color: ${JSON.stringify(indivividualLight)}`)
    //console.log(color.hsv.h * 182.548746518);
    if(Object.keys(this.state.lightsObj).length !== 0) {
      client.send( JSON.stringify({reactColor: colorCode(color.hsv.h), light: parseInt(indivividualLight)}));
    }
  };

  handleLightControl = (indivividualLight) => (on) => {
    // console.log(indivividualLight, on)
    if(Object.keys(this.state.lightsObj).length !== 0) {
      let newLightState = this.state.lightsObj;
      let lightToggle = this.state.lightsObj[indivividualLight].state.on
      if (Object.keys(newLightState) !== 0) {
        newLightState[indivividualLight].state.on = !lightToggle;
        client.send( JSON.stringify({light: parseInt(indivividualLight), toggle: !lightToggle}));
        setTimeout(() => {
          this.setState({ lightsObj: newLightState })
        }, 1000);
      }
      
    }
  }


  render() {
    return (
        // Map all the lights to a component, the first return is the color bulbs, and the second return is the basic on/off bulbs.
        Object.keys(this.state.lightsObj).map((e, idx) => {
          let id = this.state.lightsObj[e].name.replaceAll(' ', '-');
          let newColor = (this.state.lightsObj[e].state.hue)? 
            `${hslToHex(parseInt(this.state.lightsObj[e].state.hue/182.548746518),100,50)}` 
            : "#000";
          if (this.state.lightsObj[e].type === 'Extended color light') {
            let words = this.state.lightsObj[e].name.split(' ');
            return (
              <div id={id} key={id} className='light-component'>
                <label>
                  <input
                    type="checkbox"
                    value={(this.state.lightsObj[e].state.on)? 'On' : 'Off'}
                    checked={this.state.lightsObj[e].state.on}
                    onChange={this.handleLightControl(e)}
                  />
                  {(this.state.lightsObj[e].state.on)? 'On' : 'Off'}
                </label>
                <h2 style={{
                    color: `${(this.state.lightsObj[e].state.on)? newColor : '#DDDDDD'}`,
                    textShadow: `2px 2px ${(this.state.lightsObj[e].state.on)? '#999999' : '#FFFFFF'}`
                  }}>{words.map((word) => word[0].toUpperCase() + word.substring(1)).join(" ")}</h2>
                <HuePicker
                  color={this.state.background}
                  onChangeComplete={this.handleChangeComplete(e)}
                  onChange={this.handleChangeComplete(e)}
                />
                <hr></hr>
              </div>
            )
          } 
          else {
            let words = this.state.lightsObj[e].name.split(' ');
            return (
              <div id={id} key={id} className='light-component'>
                <label>
                  <input
                    type="checkbox"
                    value={(this.state.lightsObj[e].state.on)? 'On' : 'Off'}
                    checked={this.state.lightsObj[e].state.on}
                    onChange={this.handleLightControl(e)}
                  />
                  {(this.state.lightsObj[e].state.on)? 'On' : 'Off'}
                </label>
                <h2 style={{
                    color: (this.state.lightsObj[e].state.on)? '#000000' : '#DDDDDD',
                    textShadow: `2px 2px ${(this.state.lightsObj[e].state.on)? '#999999' : '#FFFFFF'}`
                  }}>{words.map((word) => word[0].toUpperCase() + word.substring(1)).join(" ")}</h2>
                <hr></hr>
              </div>
            )
          }
        }
        )
      );
    }
  }