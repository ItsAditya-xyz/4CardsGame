import { message, results, connect, result } from "@permaweb/aoconnect";
import { createDataItemSigner as nodeCDIS } from "@permaweb/aoconnect/node";

const ao = connect();
export const PROCESS_ID = "4T8COHVsKeuOa7zgMN8Jy9LhdZxr0MRMPMhP4Ml_JZY";
export function parseCustomJson(str) {
  try {
    // Replace single quotes with double quotes
    const jsonString = str.replace(/'/g, '"');
    // Parse the resulting valid JSON string
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing string:", error);
    return null; // or return {} if you prefer an empty object
  }
}

export async function getUserInfo(address, arweaveWindow) {
  try {
    // First, send the message
    await message({
      process: PROCESS_ID,
      tags: [
        { name: "address", value: address },
        { name: "Action", value: "GetUserInfo" },
      ],
      signer: nodeCDIS(arweaveWindow),
      data: "",
    });

    // Then get the results
    const resultsOut = await results({
      process: PROCESS_ID,
      sort: "DESC",
      limit: 1,
    });

    //   console.log("Results from getUserInfo:", resultsOut);
    return resultsOut;
  } catch (error) {
    console.error("Error in getUserInfo:", error);
    throw error; // Re-throw the error so the caller can handle it
  }
}

export async function getRoomStatus(gameID, arweaveWindow) {
  try {
    // First, send the message

    console.log(arweaveWindow);
    await message({
      process: PROCESS_ID,
      tags: [
        { name: "gameID", value: `${gameID}` },
        { name: "Action", value: "GetRoomStatus" },
      ],
      signer: nodeCDIS(arweaveWindow),
      data: "",
    });

    //wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Then get the results
    const resultsOut = await results({
      process: PROCESS_ID,
      sort: "DESC",
      limit: 1,
    });
    console.log("Results from getRoomStatus:", resultsOut);

    //   console.log("Results from getUserInfo:", resultsOut);
    return resultsOut;
  } catch (error) {
    console.error("Error in getRoomStatus:", error);
    throw error; // Re-throw the error so the caller can handle it
  }
}

export async function getSelfCards(gameID, arweaveWindow) {
  try {
    // First, send the message

    console.log(arweaveWindow);
    const messageRes = await message({
      process: PROCESS_ID,
      tags: [
        { name: "gameID", value: `${gameID}` },
        { name: "Action", value: "GetMyCards" },
      ],
      signer: nodeCDIS(arweaveWindow),
      data: "",
    });

    // console.log(messageRes);

    let { Messages, Spawns, Output, Error } = await result({
      // the arweave TXID of the message
      message: messageRes,
      // the arweave TXID of the process
      process: PROCESS_ID,
    }); 
   console.log(Messages,Spawns, Output, Error )
    const dataTemp = Messages[0].Data;
    console.log(dataTemp)
    const parsedJsonData = parseCustomJson(dataTemp)
    return parsedJsonData;
  } catch (error) {
    console.error("Error in getSelfCards:", error);
    throw error; // Re-throw the error so the caller can handle it
  }
}

export async function GetCurrentTurn(gameID, arweaveWindow) {
  try {
    // First, send the message

    console.log(arweaveWindow);
    await message({
      process: PROCESS_ID,
      tags: [
        { name: "gameID", value: `${gameID}` },
        { name: "Action", value: "GetCurrentTurn" },
      ],
      signer: nodeCDIS(arweaveWindow),
      data: "",
    });

    //wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Then get the results
    const resultsOut = await results({
      process: PROCESS_ID,
      sort: "DESC",
      limit: 1,
    });
    console.log("Results from GetCurrentTurn:", resultsOut);

    //   console.log("Results from getUserInfo:", resultsOut);
    return resultsOut;
  } catch (error) {
    console.error("Error in GetCurrentTurn:", error);
    throw error; // Re-throw the error so the caller can handle it
  }
}

export async function getRoomStatusDryRun(gameID) {
  // const addr = await arweaveWindow.getActiveAddress();

  console.log("getRoomStatusDryRun called");
  const res = await ao.dryrun({
    process: PROCESS_ID,
    tags: [
      { name: "gameID", value: `${gameID}` },
      { name: "Action", value: "GetRoomStatus" },
    ],
    data: "",
  });
  // console.log(res);
  const { Messages } = res;

  const data = Messages[0].Data;

  const parsedMessages = parseCustomJson(data);
  return parsedMessages;
}

export async function getUserInfoDryRun(address) {
  console.log("getUserInfoDryRun called");
  // const addr = await arweaveWindow.getActiveAddress();
  const res = await ao.dryrun({
    process: PROCESS_ID,
    tags: [
      { name: "address", value: address },
      { name: "Action", value: "GetUserInfo" },
    ],
    data: "",
  });
  // console.log(res);
  const { Messages } = res;

  const data = Messages[0].Data;

  const parsedMessages = parseCustomJson(data);
  return parsedMessages;
}

export async function GetCurrentTurnDryRun(gameID) {
  console.log("GetCurrentTurnDryRun called");
  const res = await ao.dryrun({
    process: PROCESS_ID,
    tags: [
      { name: "gameID", value: `${gameID}` },
      { name: "Action", value: "GetCurrentTurn" },
    ],
    data: "",
  });
  console.log(res);
  const { Messages } = res;

  const data = Messages[0].Data;

  const parsedMessages = parseCustomJson(data);
  return parsedMessages;
}