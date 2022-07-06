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
const getFaceit = async (username) => {
  let steamID = await getSteamID(username);
  if(!steamID) return null;
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
  if(!steamID) return null;
  fetch(`https://open.faceit.com/data/v4/players?game=csgo&game_player_id=${steamID}`, {
						method: `GET`,
						headers: {
							Authorization: `Bearer 9efc8231-626a-4ef9-9727-14e87161e0fb`
						}
	}).then(async(response) => {
    if (response.ok) {
      data = await response.json();
      return data;
    }
    else {
      return null;
    }
  });
}

//unusable because of CORS policy
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
	}).then(async(response) => {
    if (response.ok) {
      data = await response.json();
      return {"player_id": data.player_id, "KD": data.lifetime["Average K/D Ratio"]};
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
    return {"nickname": result.nickname, "player_id": result.player_id, "level": data.skill_level, "elo": data.faceit_elo, "banned": status  == "banned"};
  } else {
    return {"nickname": "", "player_id": "", "elo": 0, "level": 0, "banned": false};
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
  return arr.sort((a,b) =>
          arr.filter(v => v===a).length
        - arr.filter(v => v===b).length
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
    for (let i=0; i < data.length && i < limit; i++) {
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
      "deaths":  playerStats[1],
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
    for (let i=0; i < data.length && i < limit; i++) {
      let match = data[i];
      // unranked is also in the winrate => otherwise: match.elo_change>0?1:-1
      playerStats[4] += match.winner?1:-1;
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
      "deaths":  playerStats[1],
      "hs": playerStats[2],
      "rounds": playerStats[3],
      "wins": playerStats[4]
    };
  }
  return null;
}

// create stats box on profile page for last 10 matches
const createProfileStats = async (username) => {
  const userID = await getEsportalID(username);
  let recent1 = await getLastMatchesEsportal(userID, 1);
  let recent2 = await getLastMatchesEsportal(userID, 2, 2);

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

  for (let i=0; i < 5; i++) {
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
    boxes[0].children[0].children[0].innerHTML = ((recent1.kills+recent2.kills)/(recent1.maps.length+recent2.maps.length)).toFixed(0);
    boxes[1].children[0].children[0].innerHTML = ((recent1.kills+recent2.kills)/(recent1.deaths+recent2.deaths)).toFixed(2);
    boxes[2].children[0].children[0].innerHTML = ((recent1.kills+recent2.kills)/(recent1.rounds+recent2.rounds)).toFixed(2);
    boxes[3].children[0].children[0].innerHTML = (((recent1.hs+recent2.hs)/(recent1.kills+recent2.kills)) * 100).toFixed(0);
    boxes[4].children[0].children[0].innerHTML = (recent1.wins.filter(x => x == true).length+recent2.wins.filter(x => x == true).length)/(recent1.wins.length+recent2.wins.length)*100;
  }
  else
    for (let i=0; i<5; i++)
      boxes[i].children[0].children[0].innerHTML = 0;
  boxes[0].children[0].children[1].innerHTML = "AVERAGE KILLS";
  boxes[1].children[0].children[1].innerHTML = "AVERAGE K/D";
  boxes[2].children[0].children[1].innerHTML = "AVERAGE K/R";
  boxes[3].children[0].children[1].innerHTML = "AVERAGE HEADSHOTS %";
  boxes[4].children[0].children[1].innerHTML = "WIN RATE %";


  holder.appendChild(header);
  holder.appendChild(row);
  parent.parentElement.insertBefore(holder, parent);
}

//remove adds in the header
const clearHeadBar = () => {
  setTimeout(() => {
    let items = document.querySelector(".top-bar-left").querySelectorAll(".is-hidden-mobile");
    if (items && items.length > 0) {
      for (let i=1; i<items.length; i++)
        items[i].remove();
    }
  }, TIMEOUT);
}

//remove level container
const clearLevels = () => {
  setTimeout(() => {
    document.querySelector(".user-profile-level-container").parentElement.remove();
  }, TIMEOUT);
}
//remove medal container
const clearMedals = () => {
  setTimeout(() => {
    document.querySelector(".user-profile-medal-column-header").parentElement.parentElement.remove();
  }, TIMEOUT);
}

//remove twitch stream from site
const clearStream = () => {
  setTimeout(() => {
        let elements = document.querySelectorAll(".live-streams");
        if (elements && elements.length > 0)
            elements.forEach(e => { e.remove(); });
    }, TIMEOUT);
}

//shows current rating in the top bar
const ratingScale = async (username) => {
  const user = await getEsportal(username);
  const elo = user.elo;

  while (!document.querySelectorAll(".top-bar-menu")[0])
        await new Promise(r => setTimeout(r, 100));

  let element = document.getElementsByClassName("top-bar-menu")[2].children[1];
  let bar = element.children[1];
  //bar.innerHTML += "Hi";
  element.removeChild(bar);

  let ratingDiv = document.createElement("div");
  let topDiv = document.createElement("div");
  let barDiv = document.createElement("div");
  let ratingText = document.createElement("span");
  let currentText = document.createElement("span");
  ratingText.innerHTML = "RATING";
  currentText.innerHTML = elo;
  topDiv.style.cssText = "display: flex; justify-content: space-between;";
  topDiv.appendChild(ratingText);
  topDiv.appendChild(currentText);
  let bottomDiv = document.createElement("div");
  let lowerrankText = document.createElement("span");
  let elodiffText = document.createElement("span");
  let upperrankText = document.createElement("span");
  bar.style.cssText += "margin: 1px 0px; height: 2px; width: 110px; background: rgb(75, 78, 78);";

  if (elo >= 2000) {
    lowerrankText.innerHTML = "2000";
    elodiffText.innerHTML = (2000-elo)+"/∞";
    upperrankText.innerHTML = "∞";
  } else if (elo < 1000) {
    lowerrankText.innerHTML = "0";
    elodiffText.innerHTML = "0/"+elo;
    upperrankText.innerHTML = "1000";
  } else {
    let lower = Math.floor(elo/100)*100;
    let upper = lower+100;
    lowerrankText.innerHTML = lower;
    elodiffText.innerHTML = (lower-elo)+"/"+(upper-elo);
    upperrankText.innerHTML = upper;
  }
  bottomDiv.style.cssText = "display: flex; justify-content: space-between;";
  bottomDiv.appendChild(lowerrankText);
  bottomDiv.appendChild(elodiffText);
  bottomDiv.appendChild(upperrankText);
  barDiv.appendChild(bar);
  barDiv.appendChild(bottomDiv);

  ratingDiv.style.cssText = "display: block; font-size: 13px;";

  ratingDiv.appendChild(topDiv);
  ratingDiv.appendChild(barDiv);

  element.appendChild(ratingDiv);
}

//adds the like ratio to a users profile
const likeRatio = async (username) => {
  const data = await getEsportal(username);
  if (data) {
      let ratio = "1:0";
      if (data.thumbs_down!=0)
        ratio = Math.round(data.thumbs_up / data.thumbs_down) + ":1";

      let eClass = document.querySelector('.user-profile-thumbs');
      if (eClass) {
          let element = `<span style="display: block; width: 100%; text-align: center; color: #fff; font-size: 11px;">${ratio} Like-Ratio</span>`;
          eClass.insertAdjacentHTML('beforeend', element);
      }
  }
}

const changeHistory = async (username) => {
  let mClasses = document.getElementsByClassName("user-stats-view-latest-match");
  if (mClasses && mClasses.length > 0) {
    document.getElementsByClassName("user-stats-latest-matches")[0].getElementsByTagName("th")[3].insertAdjacentHTML('afterend', "<th>K/D</th>");
    //mClasses.forEach(item => {
    for (let i=0; i<mClasses.length;i++) {
      let item = mClasses[i];
      let matchID = item.getAttribute("href");
      matchID = item.getAttribute("href").substring(matchID.lastIndexOf("/") + 1);
      const match = await getMatchEsportal(matchID);
      if(match !== null &&  match.id > 0 && match.players && match.players.length > 0) {
        // stats: rounds won, rounds lost, kills, deaths
        let stats = [0, 0, 0, 0];
        match.players.every(player => {
          if (player.username === username) {
            stats[Math.abs(player.team-1)] = match.team1_score;
            stats[Math.abs(player.team-2)] = match.team2_score;
            stats[2] = player.kills;
            if(player.deaths===0) stats[3] = 1;
            else stats[3] = player.deaths;
            return false;
          }
          return true;
        });
        const kd = stats[2] / stats[3];
        let kdClass = null;
        if (kd>=1.0) kdClass = "color: #739900;";
        else kdClass = "color: #a80000;";

        let row = "<td><span style='"+kdClass+"'>"+stats[2]+" - "+stats[3]+" ("+kd.toFixed(2)+")</span></td>";
        item.parentElement.parentElement.children[3].insertAdjacentHTML('afterend', row);

        let node = item.parentElement.parentElement.children[5];
        if (node) {
          node.innerHTML = "<span>"+node.innerHTML+" ("+stats[0]+" - "+stats[1]+")</span>";
        }
      } else {
        let row = "<td><span style='color: #c0c6d1;'>0</span></td>";
        item.parentElement.parentElement.children[3].insertAdjacentHTML('afterend', row);
      }
    }//);
  }
}

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
  if(!matches) {
    return null;
  }
  for (let i=0; i<matches.length && i<5;i++) {
    if (matches[i].winner)
      recent.push("<span style='color: #739900; margin-right: 2px;'>W</span>");
    else
      recent.push("<span style='color: #a80000; margin-right: 2px;'>L</span>");
  }
  return recent.reverse();
}

const init = async (url) => {
  let msg = url.split('/')[4];

  while (!document.querySelectorAll(".top-bar-dropdown")[0])
        await new Promise(r => setTimeout(r, 100));

  let lastSite = document.getElementsByClassName("top-bar-item")[2].href.split('/')[5];
  //TODO: Getting username => maybe through extension interface +
  ratingScale(lastSite);
  chrome.storage.local.get(null, (data) => {
    settings.profiles = data.profiles;
    settings.levels = data.levels;
    settings.medals = data.medals;
    settings.accept = data.accept;
    settings.stream = data.stream;
    settings.lobbies = data.lobbies;
  });
  console.debug("Waiting 1.5s for the Chrome storage");
  //Chrome Storage is async and takes about 1.5s
  setTimeout(() => {
    if (typeof settings.profiles === 'undefined') {
      console.debug("Chrome storage returned undefined values. Assuming true.");
      settings.profiles = true;
      settings.levels = true;
      settings.medals = true;
      settings.accept = true;
      settings.stream = true;
    }
    if (msg === "profile") {
      if (settings.profiles)
        initProfile(lastSite);
      if (settings.levels)
        clearLevels();
      if (settings.medals)
        clearMedals();
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

const initProfile = async (username) => {
  likeRatio(username);

  let faceitdata = await getFaceitStats(username);
  setTimeout(() => {
    //add a link to the rank symbol
    let iconClass = document.querySelector('.user-profile-rank');
    if (iconClass && iconClass.parentNode) {
      let parent = iconClass.parentNode;
      parent.removeChild(iconClass);
      let ranking = document.createElement("a");
      ranking.href = "https://esportal.com/de/ranking";
      ranking.appendChild(iconClass);
      parent.appendChild(ranking);
    }
    //add faceit rank+elo
    //let ratingSection = document.querySelector(".user-profile-rank-rating").querySelectorAll(".section")[1];
    let ratingSection = document.querySelector(".user-profile-rank-elo");

    if(faceitdata.level == 0) {
      let faceitDiv = document.createElement("div");
      faceitDiv.style.cssText = "height: 80px; width: 160px; margin-left: 10px; display: flex; justify-content: center; align-items: center; background: url("+chrome.runtime.getURL('img/faceit/faceit_background_nologo.png')+") center no-repeat;";
      let faceitElo = document.createElement("span");
      faceitElo.style.cssText = "color: #FF5500";
      faceitElo.innerHTML = "No Faceit Account";
      faceitDiv.appendChild(faceitElo);
      ratingSection.appendChild(faceitDiv);
    } else {
      let faceitDiv = document.createElement("div");
      let faceitElement = document.createElement("a");
      let faceitIcon = document.createElement("img");
      let faceitElo = document.createElement("span");
      //ratingSection.style.cssText = "width: 35%;"
      faceitIcon.src = chrome.runtime.getURL(`img/faceit/faceit${faceitdata.level}.svg`);
      faceitIcon.style.cssText = "height: 40px; width: 40px; margin-right: 10px; vertical-align: middle;";
      faceitDiv.style.cssText = "height: 80px; width: 160px; margin-left: 10px; display: flex; justify-content: center; align-items: center; background: url("+chrome.runtime.getURL('img/faceit/faceit_background_nologo.png')+") center no-repeat;";
      //faceitElement.style.cssText = "";
      faceitElo.innerHTML = faceitdata.elo + " ELO";
      faceitElo.style.cssText = "color: #FF5500; display: inline";
      faceitElement.target = "_BLANK";
      faceitElement.href = `https://faceit.com/en/players/${faceitdata.nickname}`;
      faceitElement.appendChild(faceitIcon);
      faceitElement.appendChild(faceitElo);
      faceitDiv.appendChild(faceitElement);
      ratingSection.appendChild(faceitDiv);
    }

    //add stats to the last played matches
    //chrome.runtime.sendMessage({message: "here"});
    changeHistory(username);
    createProfileStats(username);
  }, TIMEOUT);
}

// mutex for the lobby init method
var mutexLobby = false;

// init player stats, winrate,
const initLobby = async () => {
  while (!document.querySelectorAll(".match-lobby-team-tables")[1])
        await new Promise(r => setTimeout(r, 100));

  // prevent multiple execution => check for mutex
  if (document.querySelectorAll(".faceitRank").length > 0 || mutexLobby)
    return true;

  console.debug("Starting lobby initialization.");

  // aquire mutex/lock for the method
  mutexLobby = true;

  let players = [...document.getElementsByClassName("match-lobby-team-username")];
  let playerData = [];
  let playerRecent = [];
  for (let i=0; i<players.length;i++) {
    let name = players[i].getElementsByTagName("span")[0].innerHTML;
    let faceitdata = await getFaceitStats(name);
    let recentdata = await getRecentStats(name);
    //let faceitdata = players[i].getElementsByTagName("span")[0].innerHTML;
    playerData.push(faceitdata);
    playerRecent.push(recentdata);
  }
  //account for players without faceit account
  let dataPerTeam = [0, 0];
  for (let i=0; i<players.length;i++) {
    if (playerData[i].level == 0) {
      let faceitDiv = document.createElement("div");
      let faceitIcon = document.createElement("img");
      faceitIcon.src = chrome.runtime.getURL(`img/faceit/faceit0.svg`);
      faceitIcon.style.cssText = "height: 30px; width: 30px; margin-left: 10px; position: relative; top: 11px;";
      faceitDiv.className = "Tipsy-inlineblock-wrapper";
      faceitDiv.appendChild(faceitIcon);
      players[i].parentElement.appendChild(faceitDiv);
    } else {
      dataPerTeam[i<5?0:1] += 1;
      let faceitDiv = document.createElement("div");
      let faceitElement = document.createElement("a");
      let faceitIcon = document.createElement("img");
      let faceitElo = document.createElement("p");
      faceitDiv.className = "Tipsy-inlineblock-wrapper";
      faceitIcon.src = chrome.runtime.getURL(`img/faceit/faceit${playerData[i].level}.svg`);
      faceitIcon.style.cssText = "height: 30px; width: 30px; margin-left: 10px; position: relative; top: 11px;";

      faceitElo.innerHTML = playerData[i].elo;
      faceitElo.style.cssText = "float: right; color: #FF5500; margin: 1em 0 0 0;";
      faceitElement.className = "faceitRank";
      faceitElement.style.cssText = "display: inline";
      faceitElement.target = "_BLANK";
      faceitElement.href = `https://faceit.com/en/players/${playerData[i].nickname}`;

      faceitElement.appendChild(faceitIcon);
      faceitElement.appendChild(faceitElo);
      faceitDiv.appendChild(faceitElement);
      players[i].parentElement.appendChild(faceitDiv);

      // mark players who are banned on Faceit
      if (playerData[i].banned)
        players[i].parentElement.cssText += "background-color: rgba(225, 74, 0, 0.52);";
    }
  }
  let scoreElement = document.getElementsByClassName("match-lobby-win-chance");
  let sumT1 = 0;
  let sumT2 = 0;
  if (scoreElement && scoreElement.length > 0) {
    sumT1 = playerData.slice(0, 5).map(a => a.elo).reduce((a,b) => a+b, 0) * (5/dataPerTeam[0]);
    sumT2 = playerData.slice(-5).map(a => a.elo).reduce((a,b) => a+b, 0) * (5/dataPerTeam[1]);

    let avgT1 = ((sumT1/(sumT1+sumT2))*100).toFixed(0);
    let avgT2 = 100-avgT1;
    let elementWin = document.createElement("div");
    elementWin.innerHTML = "Calculated Real Winchance";
    let elementT1 = document.createElement("span");
    let elementT2 = document.createElement("span");
    let barT1 = document.createElement("div");
    let barT2 = document.createElement("div");
    barT1.style.cssText = `margin: 5px 2px; height: 16px; background: linear-gradient(270deg,#FF8500 0%,#FF5500 100%); width: ${avgT1}%;`;
    elementT1.innerHTML = avgT1 + "%";
    barT2.style.cssText = `margin: 5px 2px; height: 16px; background: linear-gradient(270deg,#FF5500 0%,#FF8500 100%); width: ${avgT2}%;`;
    elementT2.innerHTML = avgT2 + "%";

    let elementParent = document.createElement("div");
    elementParent.className = "match-lobby-win";
    elementParent.appendChild(elementT1);
    elementParent.appendChild(barT1);
    elementParent.appendChild(barT2);
    elementParent.appendChild(elementT2);

    scoreElement[0].appendChild(elementWin);
    scoreElement[0].appendChild(elementParent);
  }
  let tables = document.getElementsByClassName("match-lobby-team-tables");
  if (tables) {
    let streamHolder = document.getElementsByClassName("match-lobby-info")[0].children[1];
    //move streams from table to top info bar
    for (let i = 0; i < tables.length; i++) {
      let rows = tables[i].rows;
      if (rows[0].cells.length > 3)
        rows[0].deleteCell(4);
      for (let j=1; j<rows.length; j++) {
        if(rows[j].cells[4].innerHTML.length > 1) {
          let stream = rows[j].cells[4].children[0];
          if (!stream.classList.contains("match-lobby-team-tables-icon-headset"))
            streamHolder.appendChild(stream);
        }
        rows[j].deleteCell(4);
        let cell = rows[j].insertCell(2);
        if(playerRecent[(i*5)+(j-1)])
          cell.innerHTML = playerRecent[(i*5)+(j-1)].join("");
      }
      let recentCell = rows[0].insertCell(2);
      recentCell.innerHTML = "Last 5";
      //display average faceit elo
      //TODO: change to be displayed as last row of table + Faceit LVL Symbol / AVG KD / AVG Esportal rating
      let eloavg = " (avg: <span style='color: #FF5500;'>"+((i==0?sumT1:sumT2)/5).toFixed(0)+"</span>)";
      rows[0].cells[0].innerHTML += eloavg;
    }
  }

  //release mutex for the method
  mutexLobby = false;
}

// faceit like lobby
const initLobbyFaceit = async () => {
  while (!document.querySelectorAll(".match-lobby-team-tables")[1])
        await new Promise(r => setTimeout(r, 100));

  let players = [...document.getElementsByClassName("match-lobby-team-username")];
  let playerData = [];
  let playerRecent = [];
  let playerStats = [];
  for (let i=0; i<players.length;i++) {
    let name = players[i].getElementsByTagName("span")[0].innerHTML;
    let faceitdata = await getFaceitStats(name);
    let recentdata = await getRecentStats(name);
    //let user = await getEsportal(name);
    //let userID = user.id;
    //let stats1 = await getStatsLastMatchesEsportal(userID, 1);
    //let stats2 = await getStatsLastMatchesEsportal(userID, 2, 2);
    playerData.push(faceitdata);
    playerRecent.push(recentdata);
    //if (stats1 && stats2)
    //  playerStats[i] = [stats1.kills+stats2.kills, stats1.deaths+stats2.deaths, stats1.hs+stats2.hs, stats1.rounds+stats2.rounds, stats1.wins+stats2.wins, user.matches];
  }
  //number of players with faceit account
  let dataPerTeam = [0, 0];
  for (let i=0; i<players.length;i++) {
    if (playerData[i].level == 0) {
      let faceitDiv = document.createElement("div");
      let faceitIcon = document.createElement("img");
      faceitIcon.src = chrome.runtime.getURL(`img/faceit/faceit0.svg`);
      faceitIcon.style.cssText = "height: 30px; width: 30px; margin-left: 10px; position: relative; top: 11px;";
      faceitDiv.className = "Tipsy-inlineblock-wrapper";
      faceitDiv.appendChild(faceitIcon);
      players[i].parentElement.appendChild(faceitDiv);
    } else {
      dataPerTeam[i<5?0:1] += 1;
      let faceitDiv = document.createElement("div");
      let faceitElement = document.createElement("a");
      let faceitIcon = document.createElement("img");
      let faceitElo = document.createElement("p");
      faceitDiv.className = "Tipsy-inlineblock-wrapper";
      faceitIcon.src = chrome.runtime.getURL(`img/faceit/faceit${playerData[i].level}.svg`);
      faceitIcon.style.cssText = "height: 30px; width: 30px; margin-left: 10px; position: relative; top: 11px;";

      faceitElo.innerHTML = playerData[i].elo;
      faceitElo.style.cssText = "color: #FF5500; display: inline;";
      faceitElement.style.cssText = "display: inline";
      faceitElement.target = "_BLANK";
      faceitElement.href = `https://faceit.com/en/players/${playerData[i].nickname}`;

      faceitElement.appendChild(faceitIcon);
      faceitElement.appendChild(faceitElo);
      faceitDiv.appendChild(faceitElement);
      players[i].parentElement.appendChild(faceitDiv);

      // mark players who are banned on Faceit
      if (playerData[i].banned)
        players[i].parentElement.parentElement.style.cssText = "background-color: rgba(225, 74, 0, 0.52);";
    }
  }
  let scoreElement = document.getElementsByClassName("match-lobby-win-chance");
  let sumT1 = 0;
  let sumT2 = 0;
  if (scoreElement && scoreElement.length > 0) {
    sumT1 = playerData.slice(0, 5).map(a => a.elo).reduce((a,b) => a+b, 0) * (5/dataPerTeam[0]);
    sumT2 = playerData.slice(-5).map(a => a.elo).reduce((a,b) => a+b, 0) * (5/dataPerTeam[1]);

    let avgT1 = ((sumT1/(sumT1+sumT2))*100).toFixed(0);
    let avgT2 = 100-avgT1;
    let elementWin = document.createElement("div");
    elementWin.innerHTML = "Calculated Real Winchance";
    let elementT1 = document.createElement("span");
    let elementT2 = document.createElement("span");
    let barT1 = document.createElement("div");
    let barT2 = document.createElement("div");
    barT1.style.cssText = `margin: 5px 2px; height: 16px; background: linear-gradient(270deg,#FF8500 0%,#FF5500 100%); width: ${avgT1}%;`;
    elementT1.innerHTML = avgT1 + "%";
    barT2.style.cssText = `margin: 5px 2px; height: 16px; background: linear-gradient(270deg,#FF5500 0%,#FF8500 100%); width: ${avgT2}%;`;
    elementT2.innerHTML = avgT2 + "%";

    let elementParent = document.createElement("div");
    elementParent.className = "match-lobby-win";
    elementParent.appendChild(elementT1);
    elementParent.appendChild(barT1);
    elementParent.appendChild(barT2);
    elementParent.appendChild(elementT2);

    scoreElement[0].appendChild(elementWin);
    scoreElement[0].appendChild(elementParent);
  }
  let tables = document.getElementsByClassName("match-lobby-team-tables");
  if (tables) {
    let streamHolder = document.getElementsByClassName("match-lobby-info")[0].children[1];
    //move streams from table to top info bar
    for (let i = 0; i < tables.length; i++) {
      let rows = tables[i].rows;
      rows[0].deleteCell(4);
      //rows[0].deleteCell(1);
      for (let j=1; j<rows.length; j++) {
        if(rows[j].cells[4].innerHTML.length > 1) {
          let stream = rows[j].cells[4].children[0];
          if (!stream.classList.contains("match-lobby-team-tables-icon-headset"))
            streamHolder.appendChild(stream);
        }
        rows[j].deleteCell(4);
        //rows[j].deleteCell(1);
        let cell = rows[j].insertCell(2);
        if(playerRecent[(i*5)+(j-1)])
          cell.innerHTML = playerRecent[(i*5)+(j-1)].join("");
      }
      let recentCell = rows[0].insertCell(2);
      recentCell.innerHTML = "Last 5";
      //display average faceit elo
      //TODO: change to be displayed as last row of table + Faceit LVL Symbol / AVG KD / AVG Esportal rating
      let eloavg = " (avg: <span style='color: #FF5500;'>"+((i==0?sumT1:sumT2)/5).toFixed(0)+"</span>)";
      rows[0].cells[0].innerHTML += eloavg;
    }
  }
}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
      const site = window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
      if (lastSite === site)
        return true;
      lastSite = site;
      if (request.message === "profile") {
        if (settings.profiles)
          initProfile(site);
        if (settings.levels)
          clearLevels();
        if (settings.medals)
          clearMedals();
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
//prevent double execution
var lastSite = null;

let url = window.location.href;
if (url.includes("esportal")) {
  clearHeadBar();
  clearStream();
  init(url);
}
