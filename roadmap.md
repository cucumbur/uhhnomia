# Development Roadmap

## Pre-Alpha
- [x] Implement some type of visual display for typed answers
- [x] Add Sound
- [x] Implement 2 second wait and voting on answer
- [x] Re-factor server into smaller pieces

## Alpha
- [x] Reformat code to StandardJS
- [ ] Cleanup code base

### Frontend
- [ ] Make it clear which answer player should when matched
- [x] Redo login screen
- [ ] Make disconnections, reconnections, etc robust
- [ ] Make sure rooms are cleared when empty
- [ ] Add choosing room options
- [ ] Add options for game rooms
- [ ] Implement Redux for client
- [ ] Make use of ES6 features
    - [ ] => functions
    - [ ] lexical this
    - [ ] string interpolation
- [x] Organize project and pay more attention to version control
- [ ] Clean up game and room state (ie no .playing = true, .voting=true, etc)
- [x] Display deck name properly

### Backend
- [ ] Add server-side unit tests
    - [ ] Room tests
    - [ ] Game tests
    - [ ] Suppress console messages from code
- [ ] Allow "game logic" server to be decoupled from express file server

## Beta
- [ ] Add room browser
- [ ] Add racism/sexism/etc filter
- [ ] Add bans and kicking
- [ ] Add passworded rooms
- [ ] Add bug report feature
- [ ] Implement motion
