# Uhhnomia
A multiplayer online party card game made with Node.js and React

## Playing
Up to 4 players can play together. All players should join the same room, then press the start button.  
Players will take turns drawing cards (by pressing the draw button). When the icons on your card matches another players card, you have to type in an answer that fits into the category of their card before they do, and you will score a point. For example, if you both have :four_leaf_clover: cards, and the other players category is *Breakfast Cereal*, you might enter in *Shredded Wheat*. If the players accept your answer, you will get the other players card and play will continue within a few seconds. However, if a majority of players decide your answer doesn't fit within a few seconds by pressing the **Reject** button, then you won't get points.

## Development
[![Standard - JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)  

To install, run `git clone https://github.com/cucumbur/uhhnomia.git` in terminal. Then, `npm install` in the `uhhnomia` directory. To run StandardJS linting and Mocha tests, do `npm test`. To start the server, run `npm start`, which will use port 3012 by default.

### Frontend
The frontend uses React and Socket.io, and a transition to also use the state management library Redux is planned. The source of the frontend is is currently contained entirely in `/src/client/client.jsx`, the assets are in `/public/`, and the SCSS files in `/scss/`. It is built with Gulp tasks using Babel. To build it, have Gulp installed globally on npm via `npm install -g gulp` and then run `gulp` in the uhhnomia directory. This will lint the frontend, compile the sass to CSS, then run the `.jsx` files through Babel and concatenate and minify them. Then it will watch the directories for changes and automatically rebuild when necessary.

### Backend
The backend uses Node.js, Socket.io, and many other utility libraries. The backend is comprised of `server.js` and `/lib/`. After installation, run it with `npm start`.
