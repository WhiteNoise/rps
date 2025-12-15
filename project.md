# Rock Paper Scissors multiplayer game

This project will be a web hosted, multiplayer rock paper scissors game. As many people can join as they want and conduct rock paper scissors battles until a single winner remains. The game will show a top down view of all participants and they can move around freely by clicking a spot. Clicking on another player will challenge them to a best of 3 rock paper scissors match. The winner can go on to challenge other people and the losers cannot do anything anymore.

## Game phases

1. Joining phase
2. Fighting phase
3. Game End phase

During the fighting phase, players will click on an opponent to start a match.

## Architecture

We will aim to keep this project as simple and quick as possible with as few dependencies as possible.
The will be a node.js project

We will want to run a simple node.js server which serves a html / javascript page for the clients.

We will use websockets to enable the muliplayer game

We will use pixi.js for the game client visuals

## Main Files

Client:

src/client/src/main.ts
src/client/src/player.ts
src/client/src/messages.ts

Server:

src/server/server.js

## Game Flow

Players start in the idle state

- If the context.currentPlayer is in the "idle" state,
  - when you click on another player who is also in the "idle" state
    - both players will be put into the "battling" state (this requires a message to the server)
      - the server sets the appropriate battlingPlayerId on each player
      - The server should move the player who initiated the battle 50 pixels below the player he challenged
      - the server should initialize the battleScore to zero for both players
    - the local player's actionUI is made visible

- when the local player clicks one of the buttons on the action ui send a message to the server setting the currently chosen move (rock, paper or scissors)

- on the server, when we receive a move choice
  - if both players have submitted a move, then the outcome is decided
  - the battleScore is updated for the winner
  - Send messages to both players notifying them of the move choice of the other player and the outcome. For now just console.log this on the client.

  - if one player succeeds in a best of 3 scoring, the match is over

- When the match is over,
  - the winner is set to 'idle' state and the loser is set to 'dead'
  - the winner's total wins is increased by 1
  - the client players should be notified of this state change
  - the current player's actionUI should be made not visible
