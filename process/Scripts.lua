
admin:exec([[
  CREATE TABLE IF NOT EXISTS GameRooms (
    GameID INTEGER PRIMARY KEY AUTOINCREMENT,
    PlayerString TEXT NOT NULL CHECK(length(PlayerString) <= 500),
    GameState TEXT NOT NULL CHECK(GameState IN ('LOOKING FOR MEMBERS', 'ON-GOING', 'COMPLETED')),
    Result INTEGER CHECK(Result IN (0, 1)),
    Winner TEXT CHECK(length(Winner) <= 50),
    PointsGiven INTEGER CHECK(PointsGiven BETWEEN 1 AND 1000),
    RoomPassword TEXT NOT NULL CHECK(length(RoomPassword) <= 10)
  );
]])