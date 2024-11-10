
function generatePassword()
    local chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    local password = ""
    for i = 1, 5 do
        local randomIndex = math.random(1, #chars)
        password = password .. string.sub(chars, randomIndex, randomIndex)
    end
    return password
end

function getPlayers(gameID)
    -- Query the database for players in the game room
    local result = admin:select(
        [[SELECT PlayerString 
          FROM GameRooms
          WHERE GameID = ?;]], 
        { gameID }
    )

    -- Check if we got a result
    if result and #result > 0 and result[1].PlayerString then
        -- Assuming Players is stored as a comma-separated string
        local playersString = result[1].PlayerString
        local players = {}
        
        -- Split the comma-separated string into a table
        for playerID in playersString:gmatch("[^,]+") do
            -- Trim any whitespace and add to players table
            playerID = playerID:match("^%s*(.-)%s*$")
            table.insert(players, playerID)
        end
        
        return players
    end
    
    -- Return empty table if no players found
    return {}
end



function getMovesFromGameID(gameID)
    -- Safety check for gameID
    if not gameID then
        return "INVALID GAME ID"
    end
    -- Get all moves from the game table
    local tableName = "Game_" .. gameID
    local query = "SELECT * FROM " .. tableName
    local results = admin:exec(query)

    -- If query failed or no results found
    if #results == 0 then
        print(results)
        return "GAME NOT FOUND"
    end
    return results
end

function isRegistered(address)
    -- Query the RegisteredPlayers table for the address
    local results = admin:select('SELECT Address FROM RegisteredPlayers WHERE Address = ?;', { address })
    
    -- If results has any rows, address is registered
    return #results > 0
end



function getRoomStatus(gameID)
    -- Get all info except RoomPassword
    local results = admin:select(
        [[SELECT GameID, PlayerString, GameState, Result, Winner, PointsGiven 
          FROM GameRooms 
          WHERE GameID = ?;]], 
        { gameID }
    )

    -- Check if room exists
    if #results == 0 then
        return "ROOM NOT FOUND"
    end

    return results[1]  -- Return the first (and only) row
end


function CreateCardState()
    -- Initialize deck with 4 cards of each type (1-4) and one '0' card
    local deck = {'1', '1', '1', '1', '2', '2', '2', '2', '3', '3', '3', '3', '4', '4', '4', '4'}
    local playerCards = {'', '', '', ''}
    
    -- Fisher-Yates shuffle
    for i = #deck, 2, -1 do
        local j = math.random(i)
        deck[i], deck[j] = deck[j], deck[i]
    end

    -- Function to check if adding a card would result in 3 of same type
    local function isValidAdd(playerHand, card)
        if card == '0' then return true end
        local count = 0
        for i = 1, #playerHand do
            if playerHand:sub(i,i) == card then
                count = count + 1
                if count >= 2 then return false end
            end
        end
        return true
    end

    -- Distribute cards while ensuring no player gets 3 of same type
    local currentPlayer = 1
    local retryCount = 0
    local maxRetries = 100  -- prevent infinite loops

    -- First distribute 4 cards to each player
    for i = 1, 16 do
        local card = deck[i]
        local distributed = false
        
        while not distributed and retryCount < maxRetries do
            if isValidAdd(playerCards[currentPlayer], card) then
                playerCards[currentPlayer] = playerCards[currentPlayer] .. card
                currentPlayer = currentPlayer % 4 + 1
                distributed = true
            else
                -- If can't add to current player, try next player
                currentPlayer = currentPlayer % 4 + 1
                retryCount = retryCount + 1
            end
        end
        
        if retryCount >= maxRetries then
            -- If we hit max retries, start over
            return CreateCardState()
        end
    end

    -- Add the '0' card to a random player
    local randomPlayer = math.random(4)
    playerCards[randomPlayer] = playerCards[randomPlayer] .. '0'

    -- Join all player cards with commas
    return table.concat(playerCards, ', ')
end

