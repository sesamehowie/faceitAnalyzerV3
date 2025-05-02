import { MAP_POOL } from './config.js';
import { getMatchDetails, getPlayerStats, getPersonalUserId } from './api/openApi.js';
import { withRetry, getTeamsInMatch, mapInfoForUser, teamAvgWinratePerMap, calculateWinProbability } from './utils/utils.js';

const API_KEY = "";

async function getMatchObject(matchId, apiKey) {
  console.log('Getting match details...', { matchId });
  const res = await withRetry(getMatchDetails, [matchId, apiKey]);
  console.log('Match Details Response:', JSON.stringify(res, null, 2));
  return res;
}

function getTeams(matchObject, userId) {
  console.log('Fetching teams in the match:', matchObject.teams);
  return getTeamsInMatch(matchObject, userId);
}

async function getTeamMapStats(team, apiKey) {
  console.log('Getting map stats for team', team.id);
  const teamStats = {};
  for (const player of team.roster) {
    console.log('Fetching stats for player:', player.id, player.name);
    try {
      const playerStats = await withRetry(getPlayerStats, [player.id, apiKey]);
      const mapInfo = mapInfoForUser(player, playerStats);
      teamStats[mapInfo.userFaceitName] = mapInfo.mapInfo;
    } catch (error) {
      console.warn(`No stats for player ${player.name} (${player.id}):`, error.message);
      teamStats[player.name] = Object.fromEntries(MAP_POOL.map(map => [map, 0]));
    }
  }
  return teamStats;
}

function calculateAvgWinrate(team, teamStats) {
  console.log('Calculating average winrate stats for team', team.id);
  return teamAvgWinratePerMap(team, teamStats);
}

async function run(matchUrl, nickname) {
  console.log('Starting run...');
  let winProbabilities = {};
  let team1, team2, myTeam, enemyTeam;
  const matchId = matchUrl.split('https://www.faceit.com/en/cs2/room/')[1]?.split('/')[0];
  if (!matchId) throw new Error('Invalid match URL format');
  const userId = await getPersonalUserId(nickname, API_KEY);
  const matchObject = await getMatchObject(matchId, API_KEY);
  if (!matchObject.teams) throw new Error('No teams data in match response');
  const teams = getTeams(matchObject, userId);
  [team1, team2] = teams;

  console.log('Team 1:', team1);
  console.log('Team 2:', team2);

  if (team1.id === 1) {
    myTeam = team1;
    enemyTeam = team2;
  } else {
    myTeam = team2;
    enemyTeam = team1;
  }

  console.log('My Team:', myTeam);
  console.log('Enemy Team:', enemyTeam);

  const myTeamMapStats = await getTeamMapStats(myTeam, API_KEY);
  const enemyTeamMapStats = await getTeamMapStats(enemyTeam, API_KEY);

  console.log('My Team Map Stats:', myTeamMapStats);
  console.log('Enemy Team Map Stats:', enemyTeamMapStats);

  console.log('Comparing winrates and getting win probabilities for each map');

  const myTeamAvg = calculateAvgWinrate(myTeam, myTeamMapStats);
  const enemyTeamAvg = calculateAvgWinrate(enemyTeam, enemyTeamMapStats);

  console.log('My Team Avg Win Rates:', myTeamAvg);
  console.log('Enemy Team Avg Win Rates:', enemyTeamAvg);

  for (const map of MAP_POOL) {
    const myWinrate = myTeamAvg[map];
    const enemyWinrate = enemyTeamAvg[map];
    const result = calculateWinProbability(myWinrate, enemyWinrate);
    winProbabilities[map] = `${result} %`;
  }

  console.log('Successful run!');
  console.log('Final Win Probabilities:', winProbabilities);

  return winProbabilities;
}

export { run };