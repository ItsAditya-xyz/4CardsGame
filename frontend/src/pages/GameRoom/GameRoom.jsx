import { useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import Arweave from "arweave";
import { message, result } from "@permaweb/aoconnect";
import { createDataItemSigner as nodeCDIS } from "@permaweb/aoconnect/node";
import { useNavigate } from "react-router";
import toast, { Toaster } from "react-hot-toast";
import { useRef, useEffect } from "react";
import {
  GetCurrentTurn,
  GetCurrentTurnDryRun,
  getRoomStatus,
  getRoomStatusDryRun,
  getSelfCards,
  getUserInfo,
  getUserInfoDryRun,
  parseCustomJson,
  passCard,
} from "../../utils/function";
import bunny from "../../assets/bunny.jpg";
import cat from "../../assets/cat.jpg";
import dog from "../../assets/dog.webp";
import panda from "../../assets/panda.jpg";
import nullImage from "../../assets/Null.png";
import React from "react";
import Loader from "../../Components/Loader";
const GameChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    setMessages((prev) => [
      ...prev,
      { text: inputMessage, sender: "You", timestamp: new Date() },
    ]);
    setInputMessage("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg">
      <div className="p-2 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Game Chat</h2>
      </div>

      <div className="flex items-center justify-center bg-gray-800 text-gray-200 p-4">
        Coming soon
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="text-xs text-gray-400">{msg.sender}</span>
            <p className="text-sm text-white bg-gray-700 rounded-lg p-2 max-w-[80%]">
              {msg.text}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="p-2 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 text-white px-3 py-1.5 rounded-md text-sm
                     focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            className="bg-green-500 text-white px-3 py-1.5 rounded-md text-sm
                     hover:bg-green-600 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

const getCardImage = (number) => {
  switch (number) {
    case 1:
      return { img: dog, points: 1000, name: "Dog" };
    case 2:
      return { img: cat, points: 850, name: "Cat" };
    case 3:
      return { img: bunny, points: 700, name: "Bunny" };
    case 4:
      return { img: panda, points: 500, name: "Panda" };
    case 0:
      return { img: nullImage, points: 0, name: "Null" };
    default:
      return { img: nullImage, points: 0, name: "Unknown" };
  }
};

const GameArea = ({
  isLoading,
  roomInfo,
  password,
  isRoomCreator,
  arweaveWindow,
  selfAddress,
}) => {
  // console.log(roomInfo);

  const isRunningRef = useRef(false);
  const [playerList, setPlayerList] = useState({});

  const [isCopied, setIsCopied] = useState(false);

  const roomLink = `${window.location.origin}/room/${roomInfo.gameID}?c=${password}`;

  const [gameStage, setGameStage] = useState(roomInfo.gameState); // can be "LOOKING FOR MEMBERS" || "ON-GOING" || "COMPLETED"

  const [currentTurn, setCurrentTurn] = useState(null);
  const [selfCards, setSelfCards] = useState([]);

  const [isLookingForPlayers, setIsLookingForPlayers] = useState(
    roomInfo.gameState
  );

  const [roomStatusFullData, setRoomStatusFullData] = useState(null);
  const playerListRef = useRef({});
  const timeoutRef = useRef(null);

  async function controlGameFlow() {
    // Prevent concurrent runs
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;

    try {
      const tempRoomStatus = await getRoomStatusDryRun(roomInfo?.gameID);
      if (!tempRoomStatus) {
        console.error("Invalid room status");
        return;
      }
      setRoomStatusFullData(tempRoomStatus);

      const playerArray = tempRoomStatus.players
        ? tempRoomStatus.players.split(",")
        : [];
      console.log("Current playerList:", playerListRef.current); // Log current state

      const playerJson = await playerArray.reduce(
        async (accPromise, player) => {
          const acc = await accPromise;
          if (!playerListRef.current[player]) {
            // Use ref instead of playerList
            try {
              const userInfo = await getUserInfoDryRun(player);
              return { ...acc, [player]: userInfo?.username || "Unknown" };
            } catch (error) {
              console.error(`Error getting user info for ${player}:`, error);
              return { ...acc, [player]: "Unknown" };
            }
          }
          return { ...acc, [player]: playerListRef.current[player] }; // Use ref
        },
        Promise.resolve({})
      );

      // Update both the ref and the state

      console.log("Player list:", playerJson);
      playerListRef.current = playerJson;
      setPlayerList(playerJson);
      setGameStage(tempRoomStatus.gameState);

      if (tempRoomStatus.gameState === "ON-GOING") {
        if (isLookingForPlayers !== "ON-GOING") {
          setIsLookingForPlayers("ON-GOING");
        }
        const [currentTurn, selfCards] = await Promise.all([
          GetCurrentTurnDryRun(roomInfo.gameID),
          getSelfCards(roomInfo.gameID, arweaveWindow),
        ]);

        console.log(currentTurn);

        if (currentTurn?.status === "success") {
          setCurrentTurn(currentTurn);
        }

        if (selfCards?.status === "success") {
          console.log(selfCards);
          const tempCardList = selfCards.cards.split("");

          setSelfCards(tempCardList);
        }
      } else if (tempRoomStatus.gateState === "COMPLETED") {
        // Game completed
        console.log("Game completed");
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    } catch (error) {
      console.error("Error in game flow:", error);
      toast.error("Some error happened. Reload page if it persists.");
    } finally {
      // Reset the running flag
      isRunningRef.current = false;

      // Schedule next run
      timeoutRef.current = setTimeout(controlGameFlow, 3000);
    }
  }

  useEffect(() => {
    if (!roomStatusFullData) {
      return;
    }

    console.log(roomStatusFullData);

    if (roomStatusFullData.gameState === "COMPLETED") {
      setIsLookingForPlayers("COMPLETED");
    }
  }, [roomStatusFullData]);
  const getPlayerPosition = (playerIndex, selfAddressIndex) => {
    // Calculate relative position based on player's index relative to self
    const positions = ["bottom", "left", "top", "right"];
    const relativePosition = (playerIndex - selfAddressIndex + 4) % 4;
    return positions[relativePosition];
  };

  const renderGameLayout = () => {
    if (
      !playerList ||
      Object.keys(playerList).length !== 4 ||
      !selfCards ||
      !currentTurn
    ) {
      return null;
    }

    console.log(currentTurn);

    const addresses = Object.keys(playerList);
    const selfAddressIndex = addresses.indexOf(selfAddress);

    return (
      <div className="h-full flex flex-col justify-between">
        {/* Top player */}
        <div className="flex justify-center mb-4 md:mb-6 lg:mb-8">
          {addresses.map((address, index) => {
            if (getPlayerPosition(index, selfAddressIndex) === "top") {
              return (
                <div
                  key={address}
                  className="flex flex-col items-center gap-2 md:gap-4"
                >
                  <PlayerInfo
                    username={playerList[address]}
                    position="top"
                    isCurrentPlayer={currentTurn.player === address}
                  />
                  <div className="flex gap-1 md:gap-2 lg:gap-3">
                    {[1, 2, 3, 4].map((_, cardIndex) => (
                      <Card
                        key={cardIndex}
                        number={0}
                        isHidden={true}
                        gameID={roomInfo.gameID}
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
                      username={playerList[address]}
                      position="left"
                      isCurrentPlayer={currentTurn.player === address}
                    />
                    <div className="flex mt-2 gap-1 md:gap-2 lg:gap-3">
                      {[1, 2, 3, 4].map((_, cardIndex) => (
                        <Card
                          key={cardIndex}
                          number={0}
                          isHidden={true}
                          gameID={roomInfo.gameID}
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
          <div className="w-20 h-20 md:w-20 md:h-20 lg:w-32 lg:h-32 rounded-full bg-gray-700/50 flex items-center justify-center ">
            <span className="text-white text-xs md:text-sm lg:text-base">
              Game On!
            </span>
          </div>

          {/* Right player */}
          <div className="flex flex-col gap-2 md:gap-4">
            {addresses.map((address, index) => {
              if (getPlayerPosition(index, selfAddressIndex) === "right") {
                return (
                  <div key={address}>
                    <PlayerInfo
                      username={playerList[address]}
                      position="right"
                      isCurrentPlayer={currentTurn.player === address}
                    />
                    <div className="flex mt-2 gap-1 md:gap-2 lg:gap-3">
                      {[1, 2, 3, 4].map((_, cardIndex) => (
                        <Card
                          key={cardIndex}
                          number={0}
                          isHidden={true}
                          gameID={roomInfo.gameID}
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
                <div
                  key={address}
                  className="flex flex-col items-center gap-2 md:gap-4"
                >
                  <div className="flex gap-1 md:gap-2 lg:gap-3">
                    {selfCards.map((cardValue, cardIndex) => (
                      <Card
                        key={cardIndex}
                        number={parseInt(cardValue)}
                        isSelfCard={true}
                        gameID={roomInfo.gameID}
                      />
                    ))}
                  </div>
                  <PlayerInfo
                    username={playerList[address]}
                    position="bottom"
                    isCurrentPlayer={currentTurn.player === address}
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  const WinnerDisplay = ({ roomStatusFullData, playerList }) => {
    // Extract winner info from roomStatusFullData
    const winner = roomStatusFullData.winner;
    const pointsGiven = parseInt(roomStatusFullData.pointsGiven);

    // Determine which set of cards was collected based on points
    const getCollectedCardSet = (points) => {
      switch (points) {
        case 1000: // 4 Dogs (1000 points each)
          return Array(4).fill(1);
        case 850: // 4 Cats (850 points each)
          return Array(4).fill(2);
        case 700: // 4 Bunnies (700 points each)
          return Array(4).fill(3);
        case 500: // 4 Pandas (500 points each)
          return Array(4).fill(4);
        default:
          return Array(4).fill(0);
      }
    };

    const collectedCards = getCollectedCardSet(pointsGiven);

    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-800/50 rounded-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Game Over!</h2>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${winner}`}
                alt="Winner Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-2xl text-white font-medium">
                {playerList[winner]} Wins!
              </p>
              <p className="text-xl text-green-400">{pointsGiven} Points</p>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h3 className="text-xl text-gray-300 mb-4">Winning Collection</h3>
          <div className="flex justify-center gap-4">
            {collectedCards.map((cardNumber, index) => (
              <Card
                key={index}
                number={cardNumber}
                isHidden={false}
                isSelfCard={true}
                gameID="" // Not needed for display
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg 
                       transition-colors duration-200 font-medium"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!roomInfo) return;

    // Start the initial flow

   controlGameFlow();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      isRunningRef.current = false; // Reset the running flag on cleanup
    };
  }, [roomInfo]); // Remove gameStage from dependencies

  // async function testScript() {
  //   const test = await getSelfCards("10", arweaveWindow);
  //   console.log(test)
  // }

  // useEffect(() => {
  //   testScript();
  // }, [roomInfo]);

  console.log(isLookingForPlayers);

  return (
    <div className="bg-gray-800 rounded-lg p-4 lg:p-8 h-full relative">
      {!isLoading &&
        isLookingForPlayers === "ON-GOING" &&
        Object.keys(playerList).length < 4 && (
          <div className="flex items-center justify-center h-full">
            <Loader />
          </div>
        )}

      {!isLoading &&
        isLookingForPlayers === "ON-GOING" &&
        Object.keys(playerList).length === 4 &&
        selfCards.length > 2 &&
        currentTurn.cards.length > 0 &&
        renderGameLayout()}

      {!isLoading &&
        isLookingForPlayers === "COMPLETED" &&
        Object.keys(playerList).length === 4 &&
        WinnerDisplay({ roomStatusFullData, playerList })}

      {!isLoading &&
        isLookingForPlayers === "LOOKING FOR MEMBERS" &&
        isRoomCreator && (
          <div>
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">
                Room Created!
              </h2>
              <p className="text-gray-400 mb-8">
                Share this link with your friends to invite them to your game. 4
                players are required to start the game!
              </p>

              <div
                className="flex flex-col md:flex-row items-center gap-4 mb-8 
                          max-w-xl mx-auto bg-gray-900 p-4 rounded-lg"
              >
                <input
                  type="text"
                  readOnly
                  value={roomLink}
                  className="w-full bg-transparent text-white px-4 py-2 
                         rounded-md border border-gray-700 focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(roomLink);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className={`whitespace-nowrap px-6 py-2 rounded-md font-medium
                        transition-all duration-200 ${
                          isCopied
                            ? "bg-green-500 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                >
                  {isCopied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              <div className="bg-gray-900 rounded-lg p-8 text-white h-full flex flex-col justify-center">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-3xl font-bold">Players in Room</h1>
                  <span className="text-gray-400 text-lg">
                    {Object.keys(playerList).length}/4 players joined
                  </span>
                </div>

                <div className="flex flex-col items-center gap-4">
                  {Object.keys(playerList).map((player, idx) => (
                    <div
                      key={idx}
                      className="flex items-center bg-gray-800 rounded-lg p-4 w-full max-w-md"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player}`}
                          alt={player}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 text-center">
                        <h3 className="text-lg font-medium">
                          {playerList[player]}{" "}
                          <span>{player === selfAddress && " (You)"}</span>
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  {Object.keys(playerList).length === 4 ? (
                    <p className="text-green-500 text-sm font-medium">
                      Game will begin soon
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Waiting for players...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {!isLoading &&
        isLookingForPlayers === "LOOKING FOR MEMBERS" &&
        !isRoomCreator && (
          <div>
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">
                Joined Room!
              </h2>
              <p className="text-gray-400 mb-8">
                Waiting for other players to join the game
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-8 text-white h-full flex flex-col justify-center">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Players in Room</h1>
                <span className="text-gray-400 text-lg">
                  {Object.keys(playerList).length}/4 players joined
                </span>
              </div>

              <div className="flex flex-col items-center gap-4">
                {Object.keys(playerList).map((player, idx) => (
                  <div
                    key={idx}
                    className="flex items-center bg-gray-800 rounded-lg p-4 w-full max-w-md"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player}`}
                        alt={player}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 text-center">
                      <h3 className="text-lg font-medium">
                        {playerList[player]}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                {Object.keys(playerList).length === 4 ? (
                  <p className="text-green-500 text-sm font-medium">
                    Game will begin soon
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Waiting for players...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

const Card = ({ number, isHidden = false, isSelfCard = false, gameID }) => {
  const cardInfo = getCardImage(number);

  const handleCardClick = async () => {
    if (isSelfCard) {
      const loadingToast = toast.loading(
        `Passing card ${cardInfo.name} to next Player...`
      );

      const wallet = JSON.parse(localStorage.getItem("wallet"));
      window.arweaveWallet = wallet;

      const response = await passCard(gameID, number, window.arweaveWallet);
      if (response.status === "error") {
        toast.dismiss(loadingToast);
        toast.error(response.message);
      } else {
        toast.dismiss(loadingToast);
        toast.success("Card passed successfully!");

        // if(response.message === "Game Over!"){
        //   window.location.reload();
        // }
      }
    }
  };

  return (
    <div
      className={`relative group ${isSelfCard ? "cursor-pointer" : ""}`}
      onClick={handleCardClick}
    >
      {/* Card Container */}
      <div
        className={`
          

         
          rounded-xl transform transition-all duration-300
          ${
            isSelfCard ? "group-hover:scale-105 group-hover:-translate-y-2  w-20 h-28 md:w-24 md:h-32 lg:w-32 lg:h-44" : " w-12 h-20 md:w-20 md:h-32 lg:w-20 lg:h-28"
          }
          ${
            isHidden
              ? "bg-gradient-to-br from-blue-400 to-blue-600"
              : "bg-white"
          }
          shadow-lg hover:shadow-2xl
        `}
      >
        {!isHidden && (
          <>
            {/* Card Content */}
            <div className="h-full flex flex-col">
              {/* Image Container */}
              <div className="absolute inset-0 m-1 md:m-2 rounded-lg overflow-hidden">
                <img
                  src={cardInfo.img}
                  alt={cardInfo.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Points Display */}
              <div
                className="absolute bottom-0 inset-x-0 p-1 md:p-1.5
                              bg-gradient-to-t from-black/80 to-transparent"
              >
                <p className="text-center text-white text-xs md:text-sm font-semibold">
                  {cardInfo.points}
                </p>
              </div>

              {/* Hover Effect Overlay */}
              <div
                className="absolute inset-0 bg-white/0 group-hover:bg-black/10 
                              transition-all duration-300 rounded-xl"
              ></div>

              {/* Card Border */}
              <div
                className="absolute inset-0 rounded-xl border-2 border-gray-200
                              group-hover:border-green-400 transition-colors duration-300"
              ></div>
            </div>
          </>
        )}

        {/* Hidden Card Back Design */}
        {isHidden && (
          <div className="h-full w-full flex items-center justify-center relative">
            <div className="absolute inset-2 border-2 border-blue-300/30 rounded-lg"></div>
            <div
              className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 
                            rounded-full bg-blue-300/30"
            ></div>
          </div>
        )}
      </div>

      {/* Card Glow Effect */}
      <div
        className={`absolute -inset-2 bg-gradient-to-r from-green-400 to-blue-500 
                      rounded-xl opacity-0 ${
                        isSelfCard ? "group-hover:opacity-20" : ""
                      } blur-xl transition-all 
                      duration-300 -z-10`}
      ></div>
    </div>
  );
};

const PlayerInfo = ({ username, position, isCurrentPlayer }) => {
  return (
    <div
      className={`flex items-center gap-2 ${
        position === "bottom"
          ? "flex-col"
          : position === "top"
          ? "flex-col"
          : position === "left"
          ? "flex-row"
          : "flex-row-reverse"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 md:w-10 md:h-10 lg:w-16 lg:h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
            alt={username}
            className="w-full h-full object-cover"
          />
        </div>
        <span
          className={`text-xs md:text-sm lg:text-base font-medium ${
            isCurrentPlayer ? "text-green-500" : "text-white"
          }`}
        >
          {username}
        </span>
      </div>
    </div>
  );
};

const GameRoom = () => {
  const { gameID } = useParams();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("c");
  const [isCopied, setIsCopied] = useState(false);
  const roomLink = `${window.location.origin}/room/${gameID}?c=${code}`;

  const [isRoomCreator, setIsRoomCreator] = useState(false);

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = React.useState(null);
  const [address, setAddress] = React.useState(null);

  const [roomStatus, setRoomStatus] = useState(null);

  const [selfUsername, setSelfUsername] = useState("");

  const PROCESS_ID = "4T8COHVsKeuOa7zgMN8Jy9LhdZxr0MRMPMhP4Ml_JZY";

  async function initializeGameState() {
    // first check if the wallet is in local storage
    let addressTemp = "";

    const localStorageUsername = localStorage.getItem("gameUsername");

    console.log(localStorageUsername);
    if (!localStorageUsername) {
      localStorage.setItem("gameID", gameID);
      localStorage.setItem("password", code);

      window.location.href = "/";
      return;
    }

    if (localStorage.getItem("wallet")) {
      const wallet = JSON.parse(localStorage.getItem("wallet"));
      addressTemp = localStorage.getItem("address");
      setAddress(addressTemp);
      setWallet(wallet);
      window.arweaveWallet = wallet;

      console.log("Wallet found in local storage", addressTemp);
    }
    console.log(addressTemp);

    const userInfo = await getUserInfoDryRun(addressTemp);
    console.log(userInfo);

    if (userInfo.username) {
      setSelfUsername(userInfo.username);
    }

    const tempRoomStatus = await getRoomStatusDryRun(gameID);
    console.log(tempRoomStatus);

    //check if user is room creator
    const playersInRoom = tempRoomStatus.players; // could be like this "address1"   or "address1,address2,address3"
    const playersArray = playersInRoom.split(",");
    console.log(playersArray);
    if (playersArray[0] === addressTemp) {
      setIsRoomCreator(true);
    } else {
      // join room
      const loadingToast = toast.loading("Joining Room...");

      // Send registration message

      const wallet = JSON.parse(localStorage.getItem("wallet"));
      window.arweaveWallet = wallet;
      const messageResult = await message({
        process: PROCESS_ID,
        tags: [
          { name: "gameID", value: gameID },
          { name: "password", value: code },
          { name: "Action", value: "JoinRoom" },
        ],
        signer: nodeCDIS(window.arweaveWallet),
        data: "",
      });

     
      let { Messages, Spawns, Output, Error } = await result({
        // the arweave TXID of the message
        message: messageResult,
        // the arweave TXID of the process
        process: PROCESS_ID,
      });
      console.log(Messages, Spawns, Output, Error);
      const dataTemp = Messages[0].Data;
      console.log(dataTemp);
      const parsedJoinRoomData = parseCustomJson(dataTemp)
      console.log(parsedJoinRoomData);

      if (
        parsedJoinRoomData.status === "success" ||
        parsedJoinRoomData.status === "You are already in this game"
      ) {
        toast.dismiss(loadingToast);
        toast.success("Successfully joined room!");
      } else if (parsedJoinRoomData.status === "error") {
        toast.dismiss(loadingToast);
        toast.error(parsedJoinRoomData.message);
      
        // // sleep for 1 hour 
        // await new Promise(r => setTimeout(r, 3600000));
      }
    }
    setRoomStatus(tempRoomStatus);
    setLoading(false);
  }

  useEffect(() => {
    if (!gameID) return;
    initializeGameState();
  }, [gameID]);

  return (
    <div className="h-screen bg-gray-900 p-4">
      <Toaster />
      <div className="h-full flex flex-col">
        {/* Game Layout */}
        <div className="flex-1 flex gap-4">
          {/* Game Area - Takes up most of the space */}
          <div className="flex-1">
            {loading && (
              <div className="flex items-center justify-center bg-gray-800 rounded-lg p-4 lg:p-8 h-full relative">
                <div>
                  <Loader />
                </div>
              </div>
            )}
            {!loading && (
              <GameArea
                isLoading={loading}
                roomInfo={roomStatus}
                password={code}
                isRoomCreator={isRoomCreator}
                arweaveWindow={window.arweaveWallet}
                selfAddress={address}
              />
            )}
          </div>

          {/* Chat Section - Fixed width */}
          <div className="hidden sm:block w-80">
            <GameChat />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
