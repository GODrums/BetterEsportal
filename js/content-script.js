// get Esportal data from Esportal username
const getEsportal = async (user) => {
  const response = await fetch(`https://esportal.com/api/user_profile/get?_=1&username=${user}`);
  const data = await response.json();
  if (data) {
    return data;
  } else {
    return null;
  }
}

// timeout until finished page loading
const TIMEOUT = 500;

// convert Esportal accountid to steamid
const toSteamID = (accountid) => "76561" + (accountid + 197960265728 + "");

// get Steamid from Esportal username
const getSteamID = async (username) => {
  let result = await getEsportal(username);
  if (result) {
    return toSteamID(result.id);
  }

  return null;
}

// get EsportalID from Esportal username
const getEsportalID = async (username) => {
  let result = await getEsportal(username);
  if (result) {
    return result.id;
  }

  return null;
}

// get Faceit data from Esportal username
// V4 has limit of 10.000 requests/hour
const getFaceit = async (username) => {
  let steamID = await getSteamID(username);
  if (!steamID) return null;
  let response = await fetch(`https://open.faceit.com/data/v4/players?game=csgo&game_player_id=${steamID}`, {
    method: `GET`,
    headers: {
      Authorization: `Bearer 9efc8231-626a-4ef9-9727-14e87161e0fb`
    }
  });
  const data = await response.json();
  if (data) {
    return data;
  } else {
    return null;
  }
}

const getFaceit2 = async (username) => {
  let steamID = await getSteamID(username);
  if (!steamID) return null;
  fetch(`https://open.faceit.com/data/v4/players?game=csgo&game_player_id=${steamID}`, {
    method: `GET`,
    headers: {
      Authorization: `Bearer 9efc8231-626a-4ef9-9727-14e87161e0fb`
    }
  }).then(async (response) => {
    if (response.ok) {
      data = await response.json();
      return data;
    }
    else {
      return null;
    }
  });
}

//V1: https://api.faceit.com/search/v1/?limit=1&query=${faceit_name}
//V1: https://api.faceit.com/users/v1/nicknames/${faceit_name}
//V1: https://api.faceit.com/sheriff/v1/bans/${faceit_guid}
//V4: https://open.faceit.com/data/v4/search/players?nickname=${faceit_name}&game=csgo&offset=0&limit=1

const getFaceitBanStatus = async (faceit_name) => {
  const response = await fetch(`https://open.faceit.com/data/v4/search/players?nickname=${faceit_name}&game=csgo&offset=0&limit=1`, {
    method: `GET`,
    headers: {
      Authorization: `Bearer 9efc8231-626a-4ef9-9727-14e87161e0fb`
    }
  });
  const data = await response.json();
  if (data) {
    return data.items[0].status;
    //return data.payload.players.results[0].status;
  } else {
    return null;
  }
}

const getFaceitCsgoStats = async (player_id) => {
  fetch(`https://open.faceit.com/data/v4/players/${player_id}/stats/csgo`, {
    method: `GET`,
    headers: {
      Authorization: `Bearer 9efc8231-626a-4ef9-9727-14e87161e0fb`
    }
  }).then(async (response) => {
    if (response.ok) {
      data = await response.json();
      return { "player_id": data.player_id, "KD": data.lifetime["Average K/D Ratio"] };
    }
    else {
      return null;
    }
  });
}

// get Faceit csgo stats from Esportal username
// output: {"nickname","player_id","elo","level","banned"}
// TODO: avoid GET players 404 by executing GET search/players first => items.length == 0
// TODO: handle cases where faceit has no csgo connection set up
const getFaceitStats = async (username) => {
  let result = await getFaceit(username);
  let data = result?.games?.csgo
  if (data && result.player_id) {
    let status = await getFaceitBanStatus(result.nickname);
    return { "nickname": result.nickname, "player_id": result.player_id, "level": data.skill_level, "elo": data.faceit_elo, "banned": status == "banned" };
  } else {
    return { "nickname": "", "player_id": "", "elo": 0, "level": 0, "banned": false };
  }
}

// TODO: Fix 429 too many requests error => timeout and reattempt?
const getMatchEsportal = async (matchID) => {
  const response = await fetch(`https://esportal.com/api/match/get?_=1&id=${matchID}`);
  if (!response.ok) {
    //console.log("Esportal match request error code "+response.status);
    return {};
  }
  const data = await response.json();
  if (data) {
    return data;
  } else {
    return {};
  }
}

//https://stackoverflow.com/questions/1053843/get-the-element-with-the-highest-occurrence-in-an-array
function mostCommonElement(arr) {
  return arr.sort((a, b) =>
    arr.filter(v => v === a).length
    - arr.filter(v => v === b).length
  ).pop();
}

const getLastMatchesEsportal = async (userID, page, limit = 8) => {
  const response = await fetch(`https://esportal.com/api/user_profile/get_latest_matches?id=${userID}&page=${page}&v=2`);
  const data = await response.json();
  let wins = [];
  //map ids
  let maps = [];
  //[kills, deaths, headshots, rounds, opening kills, opening deaths, clutches, elo]
  let playerStats = [0, 0, 0, 0, 0, 0, 0, 0];
  if (data) {
    for (let i = 0; i < data.length && i < limit; i++) {
      let match = data[i];
      playerStats[7] += match.elo_change;
      wins.push(match.winner);
      maps.push(match.map_id);
      let matchStats = await getMatchEsportal(match.id);
      if (matchStats && matchStats.players && matchStats.players.length > 0) {
        playerStats[3] += matchStats.team1_score + matchStats.team2_score;
        matchStats.players.filter(x => x.id === userID).forEach(user => {
          playerStats[0] += user.kills;
          playerStats[1] += user.deaths;
          playerStats[2] += user.headshots;
          playerStats[4] += user.opening_kills;
          playerStats[5] += user.opening_deaths;
          playerStats[6] += user.clutches;
        });
      } else {
        // mark values as invalid?
      }
    }
    return {
      "maps": maps,
      "wins": wins,
      "elo": playerStats[7],
      "kills": playerStats[0],
      "deaths": playerStats[1],
      "hs": playerStats[2],
      "rounds": playerStats[3],
      "opkills": playerStats[4],
      "opdeaths": playerStats[5],
      "clutches": playerStats[6]
    };
  }
  return null;
}

const getStatsLastMatchesEsportal = async (userID, page, limit = 8) => {
  const response = await fetch(`https://esportal.com/api/user_profile/get_latest_matches?id=${userID}&page=${page}&v=2`);
  const data = await response.json();
  //[kills, deaths, headshots, rounds, wins]
  // wins: wins-deaths; => winrate = 50%+(wins/2)*10
  let playerStats = [0, 0, 0, 0, 0];
  if (data) {
    for (let i = 0; i < data.length && i < limit; i++) {
      let match = data[i];
      // unranked is also in the winrate => otherwise: match.elo_change>0?1:-1
      playerStats[4] += match.winner ? 1 : -1;
      let matchStats = await getMatchEsportal(match.id);
      if (matchStats) {
        playerStats[3] += matchStats.team1_score + matchStats.team2_score;
        matchStats.players.filter(x => x.id === userID).forEach(user => {
          playerStats[0] += user.kills;
          playerStats[1] += user.deaths;
          playerStats[2] += user.headshots;
        });
      }
    }
    return {
      "kills": playerStats[0],
      "deaths": playerStats[1],
      "hs": playerStats[2],
      "rounds": playerStats[3],
      "wins": playerStats[4]
    };
  }
  return null;
}

// create stats box on profile page for last 10 matches
// TODO: ratingchange, opkills, clutches, opening success
const createProfileStats = async (username) => {
  const userID = await getEsportalID(username);
  let recent1 = await getLastMatchesEsportal(userID, 1);
  let recent2 = await getLastMatchesEsportal(userID, 2, 2);

  while (!document.getElementsByClassName("user-stats-view-latest-match"))
    await new Promise(r => setTimeout(r, 100));

  let parent = document.getElementsByClassName("user-stats-latest-matches")[0].parentElement;
  let holder = document.createElement("div");
  let header = document.createElement("div");
  let row = document.createElement("div");
  let boxes = [];
  holder.className = "column is-12";
  header.className = "user-profile-heading";
  header.innerHTML = "Last 10 matches";
  row.className = "user-profile-stats-boxes user-profile-stats-summary-stats-section";
  row.style.cssText = "width: 100%";

  for (let i = 0; i < 5; i++) {
    boxes[i] = document.createElement("div");
    boxes[i].className = "user-profile-stats-box";
    boxes[i].style.cssText = "width: 19%";
    let value = document.createElement("div");
    let text = document.createElement("div");
    let label = document.createElement("div");
    value.className = "user-profile-stats-box-value";
    text.className = "Tipsy-inlineblock-wrapper";
    label.className = "label";
    value.appendChild(text);
    value.appendChild(label);
    boxes[i].appendChild(value);
    row.appendChild(boxes[i]);
  }
  if (recent1 && recent2) {
    boxes[0].children[0].children[0].innerHTML = ((recent1.kills + recent2.kills) / (recent1.maps.length + recent2.maps.length)).toFixed(0);
    boxes[1].children[0].children[0].innerHTML = ((recent1.kills + recent2.kills) / (recent1.deaths + recent2.deaths)).toFixed(2);
    boxes[2].children[0].children[0].innerHTML = ((recent1.kills + recent2.kills) / (recent1.rounds + recent2.rounds)).toFixed(2);
    boxes[3].children[0].children[0].innerHTML = (((recent1.hs + recent2.hs) / (recent1.kills + recent2.kills)) * 100).toFixed(0);
    boxes[4].children[0].children[0].innerHTML = (recent1.wins.filter(x => x == true).length + recent2.wins.filter(x => x == true).length) / (recent1.wins.length + recent2.wins.length) * 100;
  }
  else
    for (let i = 0; i < 5; i++)
      boxes[i].children[0].children[0].innerHTML = 0;
  boxes[0].children[0].children[1].innerHTML = chrome.i18n.getMessage("avgKills");
  boxes[1].children[0].children[1].innerHTML = chrome.i18n.getMessage("avgKD");
  boxes[2].children[0].children[1].innerHTML = chrome.i18n.getMessage("avgKR");
  boxes[3].children[0].children[1].innerHTML = chrome.i18n.getMessage("avgHS");
  boxes[4].children[0].children[1].innerHTML = chrome.i18n.getMessage("winrate");

  holder.appendChild(header);
  holder.appendChild(row);
  parent.parentElement.insertBefore(holder, parent);
}

//remove ads / upgrade button in the header
const clearHeadBar = () => {
  setTimeout(() => {
    //find updateButton
    let updateButton = Array.from(document.querySelectorAll('button')).filter(el => el.textContent === 'Upgrade');
    if (updateButton.length > 0) {
      for (let i = 0; i < updateButton.length; i++)
        updateButton[i].style.display = "none";
    }
    //find ad
    let adButton = Array.from(document.querySelectorAll('button')).filter(el => el.textContent === 'Remove ads');
    if (adButton.length > 0) {
      for (let i = 0; i < adButton.length; i++)
        adButton[i].parentElement.style.display = "none";
    }
  }, TIMEOUT * 3);
}

//remove twitch stream from site
const clearStream = () => {
  setTimeout(() => {
    let stream = document.querySelector("iframe[src*='twitch.tv']");
    if (stream)
      stream.parentElement.style.display = "none";
    //stream.parentElement.remove()
  }, TIMEOUT * 5);
}

// accept matches via the popup
const acceptMatch = () => {
  if (!settings.accept)
    return true;
  setTimeout(() => {
    let acceptW = document.querySelector(".queue-header-time");
    let acceptB = document.querySelector(".match-ready-btn");
    if (acceptW && acceptB)
      acceptB.click();
  }, 5000);
}

// get W/L of last 5 esportal matches of a player
const getRecentStats = async (username) => {
  const currentTime = Date.now();
  let userID = await getEsportalID(username);
  const response = await fetch(`https://esportal.com/api/user_profile/get_latest_matches?_=${currentTime}&id=${userID}&page=1&v=2`);
  const matches = await response.json();
  let recent = [];
  if (!matches) {
    return null;
  }
  for (let i = 0; i < matches.length && i < 5; i++) {
    if (matches[i].winner)
      recent.push("<span style='color: #739900; margin-right: 2px;'>W</span>");
    else
      recent.push("<span style='color: #a80000; margin-right: 2px;'>L</span>");
  }
  return recent.reverse();
}

const init = async (url) => {
  let msg = url.split('/')[4];

  chrome.storage.local.get(null, (data) => {
    settings.profiles = data.profiles;
    settings.levels = data.levels;
    settings.medals = data.medals;
    settings.accept = data.accept;
    settings.stream = data.stream;
    settings.lobbies = data.lobbies;
  });
  console.debug("[BetterEsportal] Waiting 1.5s for the Chrome storage. Message: ", msg);
  //Chrome Storage is async and takes about 1.5s
  setTimeout(() => {
    if (typeof settings.profiles === 'undefined') {
      console.debug("[BetterEsportal] Chrome storage returned undefined values. Assuming true.");
      settings.profiles = true;
      settings.levels = true;
      settings.medals = true;
      settings.accept = true;
      settings.stream = true;
    }
    if (msg === "profile") {
      if (settings.profiles)
        initProfile(url.split('/')[5]);
    } else if (msg === "match") {
      if (settings.lobbies)
        initLobby();
    } else if (msg == "tournament") {
      let tab = url.split('/')[7];
      if (tab == "match")
        initLobbyFaceit();
    }
  }, 1500);
}

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    console.debug("[BetterEsportal] Received message from background script:", request.message);
    const site = window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
    clearHeadBar();
    if (request.message === "profile") {
      if (settings.profiles)
        initProfile(site);
    } else if (request.message === "lobby") {
      if (settings.lobbies)
        initLobby();
    }
    if (settings.accept)
      acceptMatch();
    sendResponse("Received message " + sender + ": ", request);
    return true;
  }
);

//all user settings
var settings = {};

let url = window.location.href;
if (url.includes("esportal")) {
  console.log("[BetterEsportal] Initializing extension. Applying settings...");
  clearHeadBar();
  clearStream();
  init(url);
}
