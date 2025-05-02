const FACTIONS = ['faction1', 'faction2'];

async function withRetry(func, params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await func(...params);
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt === maxRetries) throw error;
    }
  }
}

function getTeamsInMatch(matchObject, userId) {
  const teams = [];
  for (const faction of FACTIONS) {
    const teamData = matchObject.teams?.[faction];
    if (!teamData) {
      console.warn(`Faction ${faction} not found in teams`);
      continue;
    }
    const roster = teamData.roster;
    if (!Array.isArray(roster)) {
      console.warn(`Roster for ${faction} is not an array:`, roster);
      teams.push({ id: faction === 'faction1' ? 1 : 2, roster: [] });
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
  if (teams.length === 0) throw new Error('No valid teams found in match data');
  return teams;
}

function mapInfoForUser(user, mapInfoObject) {
  const mapInfo = {};
  const MAP_POOL = ['Ancient', 'Anubis', 'Dust2', 'Inferno', 'Mirage', 'Nuke', 'Train'];
  for (const map of MAP_POOL) {
    mapInfo[map] = 0;
  }
  for (const segment of mapInfoObject.segments) {
    if (segment.type === 'Map' && segment.mode === '5v5' && MAP_POOL.includes(segment.label)) {
      mapInfo[segment.label] = parseInt(segment.stats['Win Rate %']) || 0;
    }
  }
  return { userFaceitName: user.name, mapInfo };
}

function teamAvgWinratePerMap(team, mapStats) {
  const playerAmount = team.roster.length;
  const avgWrPerMap = {};
  const MAP_POOL = ['Ancient', 'Anubis', 'Dust2', 'Inferno', 'Mirage', 'Nuke', 'Train'];
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

export { withRetry, getTeamsInMatch, mapInfoForUser, teamAvgWinratePerMap, calculateWinProbability };