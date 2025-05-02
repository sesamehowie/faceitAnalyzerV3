const MAP_POOL = [
  "Ancient",
  "Anubis",
  "Dust2",
  "Inferno",
  "Mirage",
  "Nuke",
  "Train",
];
const FACTIONS = ["faction1", "faction2"];
const API_KEY = "";

async function withRetry(func, params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await func(...params);
    } catch (error) {
      console.error(
        `Attempt ${attempt}/${maxRetries} failed: ${error.message}`
      );
      if (attempt === maxRetries) throw error;
    }
  }
}

async function getMatchDetails(matchId, apiKey) {
  const url = `https://open.faceit.com/data/v4/matches/${matchId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok)
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  const data = await response.json();
  console.log("Match Details Response:", JSON.stringify(data, null, 2));
  return data;
}

async function getPlayerStats(playerId, apiKey) {
  const url = `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok)
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.json();
}

async function getPersonalUserId(nickname, apiKey) {
  const url = `https://open.faceit.com/data/v4/players?nickname=${nickname}&game=cs2`;;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    console.log("User ID Response:", JSON.stringify(data, null, 2));
    if (!data?.player_id) throw new Error("User ID not found");
    return data.player_id;
  } catch (error) {
    console.error("getPersonalUserId Error:", error);
    throw error;
  }
}

function mapInfoForUser(user, mapInfoObject) {
  const mapInfo = {};
  for (const map of MAP_POOL) {
    mapInfo[map] = 0;
  }
  for (const segment of mapInfoObject.segments) {
    if (
      segment.type === "Map" &&
      segment.mode === "5v5" &&
      MAP_POOL.includes(segment.label)
    ) {
      mapInfo[segment.label] = parseInt(segment.stats["Win Rate %"]) || 0;
    }
  }
  return { userFaceitName: user.name, mapInfo };
}

function getTeamsInMatch(matchObject, userId) {
  const teams = [];
  console.log("Match Object Teams:", matchObject.teams);
  for (const faction of FACTIONS) {
    const teamData = matchObject.teams?.[faction];
    if (!teamData) {
      console.warn(`Faction ${faction} not found in teams`);
      continue;
    }
    const roster = teamData.roster;
    if (!Array.isArray(roster)) {
      console.warn(`Roster for ${faction} is not an array:`, roster);
      teams.push({ id: faction === "faction1" ? 1 : 2, roster: [] });
      continue;
    }
    let teamId = 0;
    const players = [];
    for (const playerObject of roster) {
      const playerId = playerObject.player_id;
      const playerName = playerObject.nickname;
      if (playerId === userId) teamId = 1;
      players.push({ id: playerId, name: playerName });
    }
    if (teamId === 0) teamId = 2;
    teams.push({ id: teamId, roster: players });
  }
  if (teams.length === 0) throw new Error("No valid teams found in match data");
  console.log("Processed Teams:", teams);
  return teams;
}

async function getTeamMapStats(team, apiKey) {
  const teamStats = {};
  for (const player of team.roster) {
    try {
      const playerStats = await withRetry(getPlayerStats, [player.id, apiKey]);
      const mapInfo = mapInfoForUser(player, playerStats);
      teamStats[mapInfo.userFaceitName] = mapInfo.mapInfo;
    } catch (error) {
      console.warn(
        `No stats for player ${player.name} (${player.id}): ${error.message}`
      );
      teamStats[player.name] = Object.fromEntries(
        MAP_POOL.map((map) => [map, 0])
      );
    }
  }
  return teamStats;
}

function teamAvgWinratePerMap(team, mapStats) {
  const playerAmount = team.roster.length;
  const avgWrPerMap = {};
  for (const map of MAP_POOL) {
    let total = 0;
    for (const player of team.roster) {
      const winRate = mapStats[player.name]?.[map] || 0;
      total += winRate;
    }
    avgWrPerMap[map] = total / playerAmount;
  }
  return avgWrPerMap;
}

function calculateWinProbability(myWinRate, enemyWinRate) {
  myWinRate = Number(myWinRate) || 0;
  enemyWinRate = Number(enemyWinRate) || 0;
  if (myWinRate === 0 && enemyWinRate === 0) return 50;
  const winProbability = myWinRate / (myWinRate + enemyWinRate);
  return (winProbability * 100).toFixed(2);
}

async function run(matchUrl, nickname) {
  try {
    const matchId = matchUrl.split("/room/")[1]?.split("/")[0];
    if (!matchId) throw new Error("Invalid match URL format");
    const userId = await getPersonalUserId(nickname, API_KEY);
    const matchObject = await getMatchDetails(matchId, API_KEY);
    if (!matchObject.teams) throw new Error("No teams data in match response");
    const teams = getTeamsInMatch(matchObject, userId);
    const [team1, team2] = teams;

    const myTeam = team1.id === 1 ? team1 : team2;
    const enemyTeam = team1.id === 1 ? team2 : team1;

    const myTeamMapStats = await getTeamMapStats(myTeam, API_KEY);
    const enemyTeamMapStats = await getTeamMapStats(enemyTeam, API_KEY);

    const myTeamAvg = teamAvgWinratePerMap(myTeam, myTeamMapStats);
    const enemyTeamAvg = teamAvgWinratePerMap(enemyTeam, enemyTeamMapStats);

    const winProbabilities = {};
    for (const map of MAP_POOL) {
      const myWinrate = myTeamAvg[map];
      const enemyWinrate = enemyTeamAvg[map];
      winProbabilities[map] = `${calculateWinProbability(
        myWinrate,
        enemyWinrate
      )} %`;
    }

    return winProbabilities;
  } catch (error) {
    console.error("Run Error:", error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeMatch") {
    (async () => {
      try {
        const winProbabilities = await run(request.matchUrl, request.nickname);
        sendResponse({ winProbabilities });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }
});
