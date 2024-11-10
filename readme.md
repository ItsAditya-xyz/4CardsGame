# 4 Cards Game

## Overview
This is a multiplayer card game where players try to collect 4 cards of the same type. The game is built on the AO network with a React frontend and Lua backend process.

## Project Structure

### Frontend Repository

In folder frontend

#### Tech Stack
- React.js
- Tailwind CSS


#### Key Features
1. **Room Management**
   - Create game rooms
   - Join existing rooms with password
   - View room status and players

2. **Game Interface**
   - Real-time card updates
   - Player turn indication
   - Card passing mechanism
   - Winner detection

### Process Repository (Lua Backend)
```
process/
    ├── Function.lua   
    ├── Main.lua    (Has handlers)
    ├── Scripts.lua       


```

## Game Rules
1. Each game has 4 players (Cat, Dog, Bunny, Panda)
2. Players get 4 cards each initially
3. One random player gets an extra '0' or NULL card
5. Can't pass:
   - '0' card on first move
   - The card just received (unless having multiple)
6. Win condition: Collect 4 cards of same type

## Points System
```lua
CARD_VALUE = {
    ["1"] = 1000,
    ["2"] = 850,
    ["3"] = 700,
    ["4"] = 500
}
```

## Data Structures

### Game Room
```json
{
    "GameID": "5",
    "PlayerString": "player1,player2,player3,player4",
    "GameState": "ON-GOING",
    "RoomPassword": "abc12",
    "Winner": null,
    "PointsGiven": 0
}
```

### Card State
```json
{
    "MoveNumber": 1,
    "CardState": "22140,1132,3244,3413",
    "Player": "player1",
    "toPlayer": "player2",
    "CardPassed": "2"
}
```

```


## Notes for Developers
- Game state updates every 2 seconds
- All database operations use SQLite
- Card states are comma-separated strings
- Player addresses are used as unique identifiers
- Handlers return JSON-formatted responses
