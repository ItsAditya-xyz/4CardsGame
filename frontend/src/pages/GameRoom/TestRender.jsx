import React from 'react';

const TestRender = () => {
  // Sample data
  const sampleGameData = {
    playerList: {
      'addr1': 'Alice',
      'addr2': 'Bob',
      'addr3': 'Charlie',
      'addr4': 'David'
    },
    selfAddress: 'addr1',
    currentTurn: {
      player: 'addr1',
      cards: ['1', '2', '3', '4']
    },
    selfCards: ['1', '2', '3', '4']
  };

  const getPlayerPosition = (playerIndex, selfAddressIndex) => {
    const positions = ["bottom", "left", "top", "right"];
    const relativePosition = (playerIndex - selfAddressIndex + 4) % 4;
    return positions[relativePosition];
  };

  const addresses = Object.keys(sampleGameData.playerList);
  const selfAddressIndex = addresses.indexOf(sampleGameData.selfAddress);

  return (
    <div className="h-screen bg-gray-900 p-4">
      <div className="h-full bg-gray-800 rounded-lg p-4 lg:p-8">
        <div className="h-full flex flex-col justify-between">
          {/* Top player */}
          <div className="flex justify-center mb-4 md:mb-6 lg:mb-8">
            {addresses.map((address, index) => {
              if (getPlayerPosition(index, selfAddressIndex) === "top") {
                return (
                  <div key={address} className="flex flex-col items-center gap-2 md:gap-4">
                    <PlayerInfo
                      username={sampleGameData.playerList[address]}
                      position="top"
                      isCurrentPlayer={sampleGameData.currentTurn.player === address}
                    />
                    <div className="flex gap-1 md:gap-2 lg:gap-3">
                      {[1, 2, 3, 4].map((_, cardIndex) => (
                        <Card
                          key={cardIndex}
                          number={0}
                          isHidden={true}
                          gameID="test"
                        />
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>

          {/* Middle section */}
          <div className="flex-1 flex justify-between items-center px-4 md:px-8 lg:px-16">
            {/* Left player */}
            <div className="flex flex-col gap-2 md:gap-4">
              {addresses.map((address, index) => {
                if (getPlayerPosition(index, selfAddressIndex) === "left") {
                  return (
                    <div key={address}>
                      <PlayerInfo
                        username={sampleGameData.playerList[address]}
                        position="left"
                        isCurrentPlayer={sampleGameData.currentTurn.player === address}
                      />
                      <div className="flex gap-1 md:gap-2 lg:gap-3">
                        {[1, 2, 3, 4].map((_, cardIndex) => (
                          <Card
                            key={cardIndex}
                            number={0}
                            isHidden={true}
                            gameID="test"
                          />
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* Center area */}
            <div className="w-20 h-20 md:w-28 md:h-28 lg:w-36 lg:h-36 rounded-full bg-gray-700/50 flex items-center justify-center">
              <span className="text-white text-xs md:text-sm lg:text-base">Game Center</span>
            </div>

            {/* Right player */}
            <div className="flex flex-col gap-2 md:gap-4">
              {addresses.map((address, index) => {
                if (getPlayerPosition(index, selfAddressIndex) === "right") {
                  return (
                    <div key={address}>
                      <PlayerInfo
                        username={sampleGameData.playerList[address]}
                        position="right"
                        isCurrentPlayer={sampleGameData.currentTurn.player === address}
                      />
                      <div className="flex gap-1 md:gap-2 lg:gap-3">
                        {[1, 2, 3, 4].map((_, cardIndex) => (
                          <Card
                            key={cardIndex}
                            number={0}
                            isHidden={true}
                            gameID="test"
                          />
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>

          {/* Bottom player (self) */}
          <div className="flex justify-center mt-4 md:mt-6 lg:mt-8">
            {addresses.map((address, index) => {
              if (getPlayerPosition(index, selfAddressIndex) === "bottom") {
                return (
                  <div key={address} className="flex flex-col items-center gap-2 md:gap-4">
                    <div className="flex gap-1 md:gap-2 lg:gap-3">
                      {sampleGameData.selfCards.map((cardValue, cardIndex) => (
                        <Card
                          key={cardIndex}
                          number={parseInt(cardValue)}
                          isSelfCard={true}
                          gameID="test"
                        />
                      ))}
                    </div>
                    <PlayerInfo
                      username={sampleGameData.playerList[address]}
                      position="bottom"
                      isCurrentPlayer={sampleGameData.currentTurn.player === address}
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusing the PlayerInfo component from the original code
const PlayerInfo = ({ username, position, isCurrentPlayer }) => {
  return (
    <div className={`flex items-center gap-2 ${
      position === "bottom" || position === "top"
        ? "flex-col"
        : position === "left"
        ? "flex-row"
        : "flex-row-reverse"
    }`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 md:w-10 md:h-10 lg:w-16 lg:h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
            alt={username}
            className="w-full h-full object-cover"
          />
        </div>
        <span className={`text-xs md:text-sm lg:text-base font-medium ${
          isCurrentPlayer ? "text-green-500" : "text-white"
        }`}>
          {username}
        </span>
      </div>
    </div>
  );
};

// Simplified Card component for testing
const Card = ({ number, isHidden = false, isSelfCard = false }) => {
  return (
    <div className={`relative group ${isSelfCard ? "cursor-pointer" : ""}`}>
      <div className={`
        w-12 h-20 md:w-20 md:h-32 lg:w-24 lg:h-40
        rounded-xl transform transition-all duration-300
        ${isSelfCard ? "group-hover:scale-105 group-hover:-translate-y-2" : ""}
        ${isHidden ? "bg-gradient-to-br from-blue-400 to-blue-600" : "bg-white"}
        shadow-lg hover:shadow-2xl
      `}>
        {isHidden ? (
          <div className="h-full w-full flex items-center justify-center relative">
            <div className="absolute inset-2 border-2 border-blue-300/30 rounded-lg"></div>
            <div className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-full bg-blue-300/30"></div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="absolute inset-0 m-3 md:m-4 rounded-lg bg-gray-200"></div>
            <div className="absolute bottom-0 inset-x-0 p-1 md:p-1.5 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-center text-white text-xs md:text-sm font-semibold">
                {number * 100}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestRender;