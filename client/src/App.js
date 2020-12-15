import { Component } from './ColorComponent';
import './App.css';

function App() {
  return (
    <div className="App">
      <div id='title-top'>
        <div id ='title'><h1>Phillips Hue Controller</h1></div>
        <div id='author'>written by: Richard Stanley</div>
      </div>
      
      <hr></hr>
      <Component />
    </div>
  );
}

export default App;
