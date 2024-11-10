import React, { useEffect } from "react";
import Arweave from "arweave";
import { message, results } from "@permaweb/aoconnect";
import { createDataItemSigner as nodeCDIS } from "@permaweb/aoconnect/node";
import { useNavigate } from "react-router";
import { getUserInfoDryRun, parseCustomJson } from "../../utils/function";
import Loader from "../../Components/Loader";

import toast, { Toaster } from "react-hot-toast";
export default function Landing() {
  const navigate = useNavigate();

  const [usernameInput, setUsernameInput] = React.useState("");

  const [wallet, setWallet] = React.useState(null);
  const [address, setAddress] = React.useState(null);

  const [isLoadingUsername, setIsLoadingUsername] = React.useState(true);
  const [username, setUsername] = React.useState("");

  const PROCESS_ID = "4T8COHVsKeuOa7zgMN8Jy9LhdZxr0MRMPMhP4Ml_JZY";
  const [isCreatingRoom, setIsCreatingRoom] = React.useState(false);

  async function initializeGameState() {
    // first check if the wallet is in local storage
    let addressTemp = "";
    if (localStorage.getItem("wallet")) {
      const wallet = JSON.parse(localStorage.getItem("wallet"));
      addressTemp = localStorage.getItem("address");
      setWallet(wallet);
      window.arweaveWallet = wallet;

      console.log("Wallet found in local storage", addressTemp);
    } else {
      const arweave = Arweave.init({
        host: "arweave.net",
        port: 443,
        protocol: "https",
      });

      const key = await arweave.wallets.generate();
      const addressGenerated = await arweave.wallets.jwkToAddress(key);

      console.log(key);
      console.log(addressGenerated);

      addressTemp = addressGenerated;

      setWallet(key);
      setAddress(addressGenerated);
      localStorage.setItem("wallet", JSON.stringify(key));
      localStorage.setItem("address", addressGenerated);
      window.arweaveWallet = key;

      console.log(
        "Wallet generated! This is new user or new browser",
        addressGenerated
      );
    }
    console.log(addressTemp);
    const userInfo = await getUserInfoDryRun(addressTemp);
    console.log(userInfo);

    if (userInfo.username) {
      setUsername(userInfo.username);
    }

    setIsLoadingUsername(false);
  }

  async function createRoom() {
    let loadingToast;
    try {
      const wallet = JSON.parse(localStorage.getItem("wallet"));
    

      window.arweaveWallet = wallet;
      if (!wallet) {
        toast.error("No wallet found. Please connect your wallet first");
        return;
      }
      if (!window.arweaveWallet) {
        toast.error("Arweave wallet not detected in window object");
        return;
      }

      loadingToast = toast.loading("Creating room...");

      console.log("creating room")

      console.log(window.arweaveWallet)

      const messageResult = await message({
        process: PROCESS_ID,
        tags: [{ name: "Action", value: "CreateGameRoom" }],
        signer: nodeCDIS(window.arweaveWallet),
        data: "",
      });

      if (!messageResult) {
        throw new Error("Failed to send registration message");
      }

      // sleep for 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get results
      const resultsOut = await results({
        process: PROCESS_ID,
        sort: "DESC",
        limit: 1,
      });

      console.log("Results from createRoom:", resultsOut);

      if (
        !resultsOut?.edges?.length ||
        !resultsOut.edges[0]?.node?.Messages?.length
      ) {
        throw new Error("Invalid response from registration");
      }

      const resultData = resultsOut.edges[0].node.Messages[0].Data;
      const jsonData = parseCustomJson(resultData);

      const messageText = jsonData.message;
      const gameID = jsonData.gameID;
      const password = jsonData.password;

      toast.dismiss(loadingToast);
      //setRoomLink(`${window.location.origin}/${gameID}?code=${password}`);

      toast.success(messageText);

      // after 1 second navigate to the game room
      setTimeout(() => {
        navigate(`/room/${gameID}?c=${password}`);
      }, 1000);
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error(error.message || "Failed to create room. Please try again");
    } finally {
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
    }
  }

  async function registerPlayer() {
    let loadingToast;
    try {
      // Input validation
      if (!usernameInput || usernameInput.trim() === "") {
        toast.error("Please enter a username");
        return;
      }

      // Wallet validation
      const wallet = JSON.parse(localStorage.getItem("wallet"));

      window.arweaveWallet = wallet;

      if (!wallet) {
        toast.error("No wallet found. Please connect your wallet first");
        return;
      }

      if (!window.arweaveWallet) {
        toast.error("Arweave wallet not detected in window object");
        return;
      }

      // Set loading state if you have one

      loadingToast = toast.loading("Registering username...");

      console.log("registering player...");
      console.log(window.arweaveWallet);
      const messageResult = await message({
        process: PROCESS_ID,
        tags: [
          { name: "username", value: usernameInput.trim() },
          { name: "Action", value: "RegisterPlayer" },
        ],
        signer: nodeCDIS(window.arweaveWallet),
        data: "",
      });

      if (!messageResult) {
        throw new Error("Failed to send registration message");
      }

      // sleep for 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get results
      const resultsOut = await results({
        process: PROCESS_ID,
        sort: "DESC",
        limit: 1,
      });

      if (
        !resultsOut?.edges?.length ||
        !resultsOut.edges[0]?.node?.Messages?.length
      ) {
        throw new Error("Invalid response from registration");
      }

      const resultData = resultsOut.edges[0].node.Messages[0].Data;
      console.log("Result data:", resultData);
      // Handle response

      if (resultData === "Username already taken") {
        toast.dismiss(loadingToast);
        toast.error("Username already taken");
        return;
      } else if (
        resultData === "Successfully registered player" ||
        resultData === "Username updated successfully"
      ) {
        toast.dismiss(loadingToast);
        toast.success("Username registered successfully");
        setUsername(usernameInput.trim());
        localStorage.setItem("gameUsername", usernameInput.trim());

        // check if there is gameID and password in local storage
        const gameID = localStorage.getItem("gameID");
        const password = localStorage.getItem("password");

        console.log(gameID, password);
        if (gameID && password) {
          // remove gameID and password from local storage
          localStorage.removeItem("gameID");
          localStorage.removeItem("password");

          window.location.href = `/room/${gameID}?c=${password}`;
        }
      } else {
      }
    } catch (error) {
      console.error("Registration error:", error);

      toast.error(error.message || "Failed to register. Please try again");
    } finally {
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
    }
  }

  useEffect(() => {
    initializeGameState();
    // createWallet();
  }, []);
  return (
    <div>
      <>
        <div className='min-h-screen bg-gray-900 py-10 sm:py-28'>
          <Toaster />
          <div className=' px-4 mx-auto'>
            <div className='max-w-4xl mx-auto text-center'>
              <h1 className='text-5xl font-bold text-white mb-6'>
                4 Cards : Can you collect'em all?
              </h1>
              <p className='text-2xl text-white mb-12'>
                Four Cards. One Champion.
              </p>

              {/* Registration Form */}

              {/* Image Section */}
              <div className='max-w-2xl mx-auto'>
                {/* Uncomment and update image path when ready */}
              </div>
            </div>

            <div className='flex justify-center items-center'>
              {isLoadingUsername && (
                <div className='flex items-center justify-center py-24'>
                  <Loader />
                </div>
              )}
              {!isLoadingUsername && !username && (
                <div className='max-w-2xl mx-auto bg-gray-800/90 backdrop-blur-sm rounded-xl p-8 shadow-2xl'>
                  <div className='text-center mb-8'>
                    <h2 className='text-3xl font-bold text-white mb-4'>
                      Join the Arena
                    </h2>
                    <p className='text-gray-300 mb-2'>Get, Set, Pass!</p>
                  </div>

                  <div className='flex flex-col items-center space-y-6'>
                    <div className='w-full max-w-md'>
                      <div className='relative'>
                        <input
                          type='text'
                          placeholder='Enter your username'
                          className='w-full bg-gray-900 text-white px-5 py-4 rounded-lg 
                                  border-2 border-gray-700 focus:border-green-500
                                  focus:outline-none focus:ring-2 focus:ring-green-500/50
                                  transition-all duration-200 text-lg'
                          onChange={(e) => setUsernameInput(e.target.value)}
                        />
                        <div className='absolute right-4 top-1/2 transform -translate-y-1/2'>
                          <svg
                            className='w-6 h-6 text-gray-500'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                            />
                          </svg>
                        </div>
                      </div>

                      <div className='mt-8'>
                        <button
                          onClick={registerPlayer}
                          className='w-full bg-green-500 hover:bg-green-600 text-white 
                                font-bold py-4 px-8 rounded-lg transform transition-all 
                                duration-200 hover:scale-[1.02] active:scale-[0.98]
                                shadow-lg hover:shadow-green-500/25'>
                          Register!
                        </button>
                      </div>

                      <div className='mt-6 text-center'>
                        <p className='text-gray-400 text-sm'>
                          This will be your name in the game
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center gap-8 mt-8 pt-6 border-t border-gray-700 w-full max-w-md'>
                      <div className='flex-1 text-center'>
                        <div className='text-green-500 font-bold text-xl mb-1'>
                          Fast Matches
                        </div>
                        <p className='text-gray-400 text-sm'>
                          Quick game setup
                        </p>
                      </div>
                      <div className='flex-1 text-center'>
                        <div className='text-green-500 font-bold text-xl mb-1'>
                          On-Chain
                        </div>
                        <p className='text-gray-400 text-sm'>Using AO</p>
                      </div>
                      <div className='flex-1 text-center'>
                        <div className='text-green-500 font-bold text-xl mb-1'>
                          Smooth
                        </div>
                        <p className='text-gray-400 text-sm'>
                          like an ice-cream!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isLoadingUsername && username && (
                <div>
                  <div className='max-w-2xl w-full bg-gray-800 rounded-xl p-8 shadow-2xl'>
                    {/* Header */}
                    <h2 className='text-4xl font-bold text-white text-center mb-4'>
                      Ready to Play?
                    </h2>
                    <p className='text-gray-400 text-center mb-12'></p>

                    <div className='flex flex-col items-center space-y-6 max-w-xl mx-auto'>
                      <button
                        className='w-full bg-green-500 hover:bg-green-600 text-white 
                   font-bold py-4 px-8 rounded-lg transform transition-all 
                   duration-200 hover:scale-105 active:scale-95 
                   shadow-lg hover:shadow-green-500/25 disabled:opacity-50'
                        onClick={createRoom}
                        disabled={isCreatingRoom}>
                        {isCreatingRoom ? (
                          <span className='flex items-center justify-center gap-2'>
                            <svg
                              className='animate-spin h-5 w-5'
                              viewBox='0 0 24 24'>
                              <circle
                                className='opacity-25'
                                cx='12'
                                cy='12'
                                r='10'
                                stroke='currentColor'
                                strokeWidth='4'
                                fill='none'
                              />
                              <path
                                className='opacity-75'
                                fill='currentColor'
                                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                              />
                            </svg>
                            Creating Room...
                          </span>
                        ) : (
                          "Create Room"
                        )}
                      </button>
                      <p className='text-gray-500 text-sm text-center'>
                        Start a new game room and invite your friends to join
                      </p>
                    </div>

                    {/* Footer Info */}
                    <div className='mt-12 text-center'>
                      <p className='text-gray-400 text-sm'>
                        Need help?{" "}
                        <span className='text-blue-400 hover:text-blue-300 cursor-pointer'>
                          View tutorial
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Bottom Text */}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    </div>
  );
}
