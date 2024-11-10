local sqlite3 = require("lsqlite3")
local dbAdmin = require("@rakis/DbAdmin")

-- Open an in-memory database
db = sqlite3.open_memory()

-- Create a DbAdmin instance
admin = dbAdmin.new(db)

admin:exec([[
  CREATE TABLE IF NOT EXISTS RegisteredPlayers (
    Address TEXT PRIMARY KEY CHECK(length(Address) <= 64),
    Name TEXT NOT NULL UNIQUE CHECK(length(Name) <= 15)
  );
]])



CARD_VALUE = {
    ["1"] = 1000,
    ["2"] = 850,
    ["3"] = 700,
    ["4"] = 500
}



Handlers.add(
    "RegisterPlayer",  -- Handler name
    "RegisterPlayer",  -- Process name
    function(msg)
        -- Check if username was provided
        if not msg.Tags.username then
            msg.reply({ Data = "{'status': 'error', 'message': 'Please provide a username with your request'}" })
            return
        end

        -- Get the username from Tags
        local username = msg.Tags.username
        
        -- Validate username length (must be <= 15 characters as per schema)
        if #username > 15 then
            msg.reply({ Data = "{'status': 'error', 'message': 'Username must be 15 characters or less'}" })
            return
        end

        -- Check if player is already registered
        local results = admin:select('SELECT Address FROM RegisteredPlayers WHERE Address = ?;', { msg.From })
        
        local success, err
        if #results > 0 then
            -- Player exists, update their username
            success, err = pcall(function()
                admin:apply(
                    'UPDATE RegisteredPlayers SET Name = ? WHERE Address = ?;',
                    { username, msg.From }
                )
            end)
        else
            -- New player, insert new record
            success, err = pcall(function()
                admin:apply(
                    'INSERT INTO RegisteredPlayers (Address, Name) VALUES (?, ?);',
                    { msg.From, username }
                )
            end)
        end

        if success then
            local response
            if #results > 0 then
                response = string.format(
                    "{'status': 'success', 'message': 'Username updated successfully', 'username': '%s', 'address': '%s'}",
                    username,
                    msg.From
                )
            else
                response = string.format(
                    "{'status': 'success', 'message': 'Successfully registered player', 'username': '%s', 'address': '%s'}",
                    username,
                    msg.From
                )
            end
            msg.reply({ Data = response })
        else
            -- Handle potential UNIQUE constraint violation for Name
            if string.find(err, "UNIQUE constraint failed") then
                msg.reply({ Data = "{'status': 'error', 'message': 'Username already taken'}" })
            else
                msg.reply({ Data = "{'status': 'error', 'message': 'Failed to register/update player. Please try again.'}" })
            end
        end
    end
)


Handlers.add(
    "CreateGameRoom",
    "CreateGameRoom",
    function(msg)
        if not isRegistered(msg.From) then
            local response = string.format(
                "{'status': 'error', 'message': 'You need to be registered to create a game room'}"
            )
            msg.reply({ Data = response })
            return
        end

        local password = generatePassword()

        local success, err = pcall(function()
            admin:apply(
                [[INSERT INTO GameRooms 
                  (PlayerString, GameState, RoomPassword, Result, PointsGiven, Winner) 
                  VALUES (?, 'LOOKING FOR MEMBERS', ?, 0, 1, NULL);]],
                { msg.From, password }
            )
        end)

        if success then
            local results = admin:select(
                [[SELECT GameID, RoomPassword 
                  FROM GameRooms 
                  WHERE PlayerString = ? 
                  ORDER BY GameID DESC LIMIT 1;]], 
                { msg.From }
            )
            
            local response = string.format(
                "{'status': 'success', 'message': 'Game room created successfully', 'gameID': '%s', 'password': '%s'}",
                results[1].GameID,
                results[1].RoomPassword
            )
            msg.reply({ Data = response })
        else
            local response = string.format(
                "{'status': 'error', 'message': 'Failed to create game room. Please try again.'}"
            )
            msg.reply({ Data = response })
        end
    end
)


Handlers.add(
    "JoinRoom",
    "JoinRoom",
    function(msg)
        -- Check if required tags are present
        if not msg.Tags.gameID or not msg.Tags.password then
            msg.reply({ Data = "{'status': 'error', 'message': 'Please provide both gameID and password'}" })
            return
        end

        local gameID = msg.Tags.gameID
        local password = msg.Tags.password

        -- Check if game exists
        local gameResults = admin:select('SELECT * FROM GameRooms WHERE GameID = ?;', { gameID })
        if #gameResults == 0 then
            msg.reply({ Data = "{'status': 'error', 'message': 'Game does not exist'}" })
            return
        end

        -- Verify password
        if gameResults[1].RoomPassword ~= password then
            msg.reply({ Data = "{'status': 'error', 'message': 'Invalid Password'}" })
            return
        end

        -- Get current players
        local playerString = gameResults[1].PlayerString
        local players = {}
        for player in string.gmatch(playerString, "[^,]+") do
            table.insert(players, player)
        end

        -- Check if player is already in the game
        for _, player in ipairs(players) do
            if player == msg.From then
                msg.reply({ Data = "{'status': 'error', 'message': 'You are already in this game'}" })
                return
            end
        end

        -- Check room capacity
        if #players >= 4 then
            msg.reply({ Data = "{'status': 'error', 'message': 'Room is full'}" })
            return
        end

        -- Add new player (without spaces)
        table.insert(players, msg.From)
        local newPlayerString = table.concat(players, ",")  -- No spaces after comma

        local success, err = pcall(function()
            -- Update player string
            admin:apply(
                'UPDATE GameRooms SET PlayerString = ? WHERE GameID = ?;',
                { newPlayerString, gameID }
            )

            -- If this is the fourth player, initialize the game
            if #players == 4 then
                -- Create game moves table
                local createTableQuery = string.format([[
                    CREATE TABLE IF NOT EXISTS Game_%d (
                        MoveNumber INTEGER PRIMARY KEY AUTOINCREMENT,
                        Player TEXT CHECK(length(Player) <= 50),
                        toPlayer TEXT CHECK(length(toPlayer) <= 50),
                        CardPassed INTEGER CHECK(CardPassed BETWEEN 0 AND 4),
                        CardState TEXT CHECK(length(CardState) <= 50)
                    );
                ]], gameID)
                admin:exec(createTableQuery)

                -- Set initial sequence
                admin:exec(string.format(
                    "INSERT INTO sqlite_sequence (name, seq) VALUES ('Game_%d', 0);",
                    gameID
                ))

                -- Generate and insert initial card state
                local cardState = CreateCardState()
                admin:apply(
                    string.format(
                        "INSERT INTO Game_%d (Player, toPlayer, CardPassed, CardState) VALUES (NULL, NULL, NULL, ?);",
                        gameID
                    ),
                    { cardState }
                )

                -- Update game state to ON-GOING
                admin:apply(
                    'UPDATE GameRooms SET GameState = ? WHERE GameID = ?;',
                    { 'ON-GOING', gameID }
                )
            end
        end)

        if success then
            if #players == 4 then
                local response = string.format(
                    "{'status': 'success', 'message': 'Game has begun!', 'gameID': '%s', 'players': '%s'}",
                    gameID,
                    newPlayerString
                )
                msg.reply({ Data = response })
            else
                local response = string.format(
                    "{'status': 'success', 'message': 'Successfully joined game room', 'gameID': '%s', 'players': '%s'}",
                    gameID,
                    newPlayerString
                )
                msg.reply({ Data = response })
            end
        else
            msg.reply({ Data = "{'status': 'error', 'message': 'Failed to join game room. Please try again.'}" })
        end
    end
)


Handlers.add(
    "GetCurrentTurn",
    "GetCurrentTurn",
    function(msg)
        -- Validate input parameters
        if not msg.Tags.gameID then
            msg.reply({ Data = "{'status': 'error', 'message': 'Please provide gameID'}" })
            return
        end

        local gameID = msg.Tags.gameID

        -- Get room status
        local roomInfo = getRoomStatus(gameID)
        if not roomInfo then
            msg.reply({ Data = "{'status': 'error', 'message': 'Game room not found'}" })
            return
        end

        if roomInfo.GameState ~= "ON-GOING" then
            msg.reply({ Data = "{'status': 'error', 'message': 'Game is not on-going'}" })
            return
        end

        -- Get latest move to get card state
        local moves = getMovesFromGameID(gameID)
        if type(moves) == "string" then  -- Error case
            msg.reply({ Data = "{'status': 'error', 'message': 'Could not retrieve game moves'}" })
            return
        end

        local lastMove = moves[#moves]  -- Get the last move
        local cardStates = {}
        
        -- Split the card states
        for card in string.gmatch(lastMove.CardState, "[^,]+") do
            table.insert(cardStates, card:gsub("%s+", ""))  -- Remove whitespace
        end

        -- Get players list
        local players = {}
        for player in string.gmatch(roomInfo.PlayerString, "[^,]+") do
            table.insert(players, player:gsub("%s+", ""))  -- Remove whitespace
        end

        -- Find player with 5 cards
        local currentPlayerIndex = 0
        for i, cards in ipairs(cardStates) do
            if #cards == 5 then
                currentPlayerIndex = i
                break
            end
        end

        if currentPlayerIndex == 0 then
            msg.reply({ Data = "{'status': 'error', 'message': 'Invalid game state - no player with 5 cards'}" })
            return
        end

        local currentPlayer = players[currentPlayerIndex]
        
        -- Get username from RegisteredPlayers
        local playerInfo = admin:select(
            "SELECT Name FROM RegisteredPlayers WHERE Address = ?;",
            { currentPlayer }
        )

        if #playerInfo == 0 then
            msg.reply({ Data = "{'status': 'error', 'message': 'Could not find player information'}" })
            return
        end

        -- Return current player's address and username
        local response = string.format(
            "{'status': 'success', 'message': 'Current turn retrieved', " ..
            "'player': '%s', 'username': '%s', 'cards': '%s'}",
            currentPlayer,
            playerInfo[1].Name,
            cardStates[currentPlayerIndex]
        )
        
        msg.reply({ Data = response })
    end
)


Handlers.add(
    "GetMyCards",
    "GetMyCards",
    function(msg)
        -- Validate input parameter
        if not msg.Tags.gameID then
            msg.reply({ Data = "{'status': 'error', 'message': 'Please provide gameID'}" })
            return
        end

        local gameID = msg.Tags.gameID

        -- Check if game exists and player is in it
        local roomInfo = getRoomStatus(gameID)
        if not roomInfo then
            msg.reply({ Data = "{'status': 'error', 'message': 'Game room not found'}" })
            return
        end

        -- Check if player is in game
        local playerFound = false
        local playerIndex = 0
        local index = 1
        for player in string.gmatch(roomInfo.PlayerString, "[^,]+") do
            if player == msg.From then
                playerFound = true
                playerIndex = index
                break
            end
            index = index + 1
        end

        if not playerFound then
            msg.reply({ Data = "{'status': 'error', 'message': 'You are not a part of this game'}" })
            return
        end

        -- Get latest move
        local moves = getMovesFromGameID(gameID)
        if type(moves) == "string" then
            msg.reply({ Data = "{'status': 'error', 'message': 'Could not retrieve game moves'}" })
            return
        end

        local lastMove = moves[#moves]

        -- Parse card state and get player's cards
        local cardStates = {}
        local index = 1
        for card in string.gmatch(lastMove.CardState, "[^,]+") do
            cardStates[index] = card
            index = index + 1
        end

        -- Get player's cards from their index
        local myCards = cardStates[playerIndex]

        local response = string.format(
            "{'status': 'success', 'message': 'Cards retrieved', 'cards': '%s'}",
            myCards
        )
        msg.reply({ Data = response })
    end
)


Handlers.add(
    "GetRoomStatus",
    "GetRoomStatus",
    function(msg)
        -- Validate input parameter
        if not msg.Tags.gameID then
            msg.reply({ Data = "{'status': 'error', 'message': 'Please provide gameID'}" })
            return
        end

        local gameID = msg.Tags.gameID

        -- Get room status
        local roomInfo = getRoomStatus(gameID)
        
        -- Check if room exists
        if type(roomInfo) == "string" then
            msg.reply({ Data = "{'status': 'error', 'message': 'Room not found'}" })
            return
        end

        -- Format response with all room info
        local response = string.format(
            "{'status': 'success', " ..
            "'gameID': '%s', " ..
            "'players': '%s', " ..
            "'gameState': '%s', " ..
            "'result': '%s', " ..
            "'winner': '%s', " ..
            "'pointsGiven': '%s'}",
            roomInfo.GameID,
            roomInfo.PlayerString,
            roomInfo.GameState,
            roomInfo.Result or '',
            roomInfo.Winner or '',
            roomInfo.PointsGiven or ''
        )

        msg.reply({ Data = response })
    end
)

Handlers.add(
    "GetUserInfo",     -- Handler name
    "GetUserInfo",     -- Process name
    function(msg)
        -- Check if address was provided
        if not msg.Tags.address then
            msg.reply({ Data = "{'status': 'error', 'message': 'Please provide an address with your request'}" })
            return
        end

        -- Get the address from Tags
        local address = msg.Tags.address
        
        -- Query the database for the username
        local results = admin:select('SELECT Name FROM RegisteredPlayers WHERE Address = ?;', { address })
        
        local response
        if #results > 0 then
            -- User found, return their information
            response = string.format(
                "{'status': 'success', 'address': '%s', 'username': '%s'}",
                address,
                results[1].Name
            )
        else
            -- User not found, return empty username
            response = string.format(
                "{'status': 'success', 'address': '%s', 'username': ''}",
                address
            )
        end
        
        msg.reply({ Data = response })
    end
)