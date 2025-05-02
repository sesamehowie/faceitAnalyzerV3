import { request } from "../client/client.js";

async function getMatchDetails(matchId, apiKey) {
    try {
        if (!matchId || !apiKey) {
            throw new Error(`matchId and apiKey are required, received: matchId=${matchId}, apiKey=${apiKey}`);
        }
        const url = `https://open.faceit.com/data/v4/matches/${matchId}`;
        const response = await request(url, "GET", apiKey);
        return response;
    } catch (error) {
        console.error("Error getting match details:", error);
        return null;
    }
}

async function getPlayerStats(playerId, apiKey) {
    try {
        if (!playerId || !apiKey) {
            throw new Error(`playerId and apiKey are required, received: playerId=${playerId}, apiKey=${apiKey}`);
        }
        const url = `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`;
        const response = await request(url, "GET", apiKey);
        return response;
    } catch (error) {
        console.error("Error getting player stats:", error);
        return null;
    }    
}

async function getPersonalUserId(nickname, apiKey) {
    const url = `https://open.faceit.com/data/v4/players?nickname=${nickname}&game=cs2`;
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const data = response.data;
      console.log('User ID Response:', JSON.stringify(data, null, 2));
      if (!data?.player_id) throw new Error('User ID not found');
      return data.player_id;
    } catch (error) {
      console.error('getPersonalUserId Error:', error.response?.data || error.message);
      throw error;
    }
  }

export { getMatchDetails, getPlayerStats, getPersonalUserId };