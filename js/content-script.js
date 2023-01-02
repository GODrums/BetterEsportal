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
  boxes[0].children[0].children[1].innerHTML = chrome.i18n.getMessage("avgKills");
  boxes[1].children[0].children[1].innerHTML = chrome.i18n.getMessage("avgKD");
  boxes[2].children[0].children[1].innerHTML = chrome.i18n.getMessage("avgKR");
  boxes[3].children[0].children[1].innerHTML = chrome.i18n.getMessage("avgHS");
  boxes[4].children[0].children[1].innerHTML = chrome.i18n.getMessage("winrate");

  holder.appendChild(header);
  holder.appendChild(row);
  parent.parentElement.insertBefore(holder, parent);
}

//remove adds in the header
const clearHeadBar = () => {
  setTimeout(() => {
    let updateButton = document.querySelector('.sc-jOiSOi');
    if (updateButton) {
      updateButton.style.display = "none";
    }
  }, TIMEOUT*3);
}

//remove twitch stream from site
const clearStream = () => {
  setTimeout(() => {
      let stream = document.querySelector("iframe[src*='twitch.tv']");
      if (stream)
        stream.parentElement.style.display = "none";
      //stream.parentElement.remove()
    }, TIMEOUT*5);
}

//shows current rating in the top bar
//TODO: Update rating after matches
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

      //let eClass = document.querySelector('.user-profile-thumbs');
      let oldElements = document.querySelectorAll('.betteresportal-likeratio');
      if (oldElements) {
        oldElements.forEach((element) => {
          element.remove();
        });
      }
      let eClass = document.querySelector('.sc-cDegIk');
      if (eClass) {
          //let element = `<div style="display: block; width: 100%; text-align: center; color: #fff; font-size: 11px;">${ratio} ${chrome.i18n.getMessage("likeRatio")}</div>`;
          let element = `<div class="${eClass.className} betteresportal-likeratio" style="display: flex; justify-content: center; align-items: center; gap: 9px;"><svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style="transform: translateY(-3px);" ><path d="M16.2426 6.34319C16.6331 5.95266 17.2663 5.95266 17.6568 6.34319C18.0474 6.73371 18.0474 7.36688 17.6568 7.7574L7.75734 17.6569C7.36681 18.0474 6.73365 18.0474 6.34313 17.6569C5.9526 17.2664 5.9526 16.6332 6.34313 16.2427L16.2426 6.34319Z" fill="grey" /><path d="M9.87866 9.87872C9.09761 10.6598 7.83128 10.6598 7.05023 9.87872C6.26918 9.09767 6.26918 7.83134 7.05023 7.05029C7.83128 6.26924 9.09761 6.26924 9.87866 7.05029C10.6597 7.83134 10.6597 9.09767 9.87866 9.87872Z" fill="grey" /><path d="M14.1213 16.9498C14.9023 17.7308 16.1687 17.7308 16.9497 16.9498C17.7308 16.1687 17.7308 14.9024 16.9497 14.1214C16.1687 13.3403 14.9023 13.3403 14.1213 14.1214C13.3403 14.9024 13.3403 16.1687 14.1213 16.9498Z" fill="grey" /></svg><h4 class="${eClass.children[0].children[1].className}">${ratio} ${chrome.i18n.getMessage("likeRatio")}</h4></div>`;
          eClass.parentElement.insertAdjacentHTML('beforeend', element);
      } else {
        console.debug("[BetterEsportal] Could not find like ratio element.");
      }
  }
}

// add KD and score to past matches
const changeHistory = async (username) => {
  while (!document.getElementsByClassName("user-stats-view-latest-match"))
        await new Promise(r => setTimeout(r, 100));
  let mClasses = document.getElementsByClassName("user-stats-view-latest-match");
  if (mClasses && mClasses.length > 0) {
    document.getElementsByClassName("user-stats-latest-matches")[0].getElementsByTagName("th")[3].insertAdjacentHTML('afterend', "<th>K/D</th>");
    //mClasses.forEach(item => {
    for (let i=0; i<mClasses.length;i++) {
      let item = mClasses[i];
      let matchID = item.getAttribute("href");
      matchID = item.getAttribute("href").substring(matchID.lastIndexOf("/") + 1);
      const match = await getMatchEsportal(matchID);
      if(match !== null &&  match.id > 0 && match.players && match.players.length > 0 && match.team1_score != null) {
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
        let row = "<td><span style='color: #c0c6d1;'>-</span></td>";
        item.parentElement.parentElement.children[3].insertAdjacentHTML('afterend', row);
      }
    }//);
  }
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

  //await new Promise(r => setTimeout(r, 500));

  //let lastSite = document.getElementsByClassName("top-bar-item")[2].href.split('/')[5];
  //TODO: Getting username => maybe through extension interface +
  //ratingScale(lastSite);
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
      if (settings.levels)
        clearLevels();
      if (settings.medals)
        clearMedals();
    } else if (msg === "match") {
      //if (settings.lobbies)
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
    console.debug("[BetterEsportal] Starting profile customization");
    //add a link to the rank symbol
    let iconClass = document.querySelector('.sc-kEvSyQ');
    if (iconClass && iconClass.parentNode) {
      let parent = iconClass.parentNode;
      parent.removeChild(iconClass);
      let ranking = document.createElement("a");
      ranking.href = "https://esportal.com/de/ranking";
      ranking.appendChild(iconClass);
      parent.appendChild(ranking);
    }
    //add faceit rank+elo
    //let ratingSection = document.querySelector(".user-profile-rank-elo");
    let ratingSection = document.querySelector(".sc-fNALa");
    if (!ratingSection) {
      console.debug("[BetterEsportal] No rating section found. Aborting.");
      return;
    }
    if (ratingSection.firstChild.className.includes("betteresportal-faceit-element")) {
      ratingSection.removeChild(ratingSection.firstChild);
    }
    ratingSection = ratingSection.firstChild;
    let ratingDiv = ratingSection.cloneNode(true);
    ratingDiv.className += " betteresportal-faceit-element";
    if (!ratingSection.className.includes("betteresportal-faceit-element")) {
      ratingSection.style.borderRadius = "0px";
    }
    ratingDiv.style.borderRadius = "30px 30px 0px 0px";
    ratingSection = ratingSection.parentElement;
  
    let ratingHeader = ratingDiv.querySelector("h2");
   if (ratingHeader) {
      ratingHeader.innerHTML = "Faceit";
    }
    while (ratingDiv.children.length > 1)
      ratingDiv.removeChild(ratingDiv.children[1]);
  
    if(faceitdata.level == 0) {
      let faceitDiv = document.createElement("div");
      faceitDiv.style.cssText = "height: 80px; width: 160px; margin-left: 10px; display: flex; justify-content: center; align-items: center; background: url("+chrome.runtime.getURL('img/faceit/faceit_background_nologo.png')+") center no-repeat; margin: 0 auto;";
      let faceitElo = document.createElement("span");
      faceitElo.style.cssText = "color: #FF5500";
      faceitElo.innerHTML = "No Faceit Account";
      faceitDiv.appendChild(faceitElo);
      ratingDiv.appendChild(faceitDiv);
    } else {
      let faceitDiv = document.createElement("div");
      let faceitElement = document.createElement("a");
      let faceitIcon = document.createElement("img");
      let faceitElo = document.createElement("span");
      //ratingSection.style.cssText = "width: 35%;"
      faceitIcon.src = chrome.runtime.getURL(`img/faceit/faceit${faceitdata.level}.svg`);
      faceitIcon.style.cssText = "height: 40px; width: 40px; margin-right: 10px; vertical-align: middle;";
      faceitDiv.style.cssText = "height: 80px; width: 160px; margin-left: 10px; display: flex; justify-content: center; align-items: center; background: url("+chrome.runtime.getURL('img/faceit/faceit_background_nologo.png')+") center no-repeat;  margin: 0 auto;";
      //faceitElement.style.cssText = "";
      faceitElo.innerHTML = faceitdata.elo + " ELO";
      faceitElo.style.cssText = "color: #FF5500; display: inline";
      faceitElement.target = "_BLANK";
      faceitElement.href = `https://faceit.com/en/players/${faceitdata.nickname}`;
      faceitElement.className = "betteresportal-faceit-rating-link";
      faceitElement.appendChild(faceitIcon);
      faceitElement.appendChild(faceitElo);
      faceitDiv.appendChild(faceitElement);
      ratingDiv.appendChild(faceitDiv);
    }
    ratingSection.insertBefore(ratingDiv, ratingSection.children[0]);
  }, TIMEOUT);
}

// mutex for the lobby init method
var mutexLobby = false;

// init player stats, winrate,
const initLobby = async () => {
  while (!document.querySelector('ul'))
        await new Promise(r => setTimeout(r, 100));


  // prevent multiple execution => check for mutex
  if (document.querySelectorAll(".faceitRank").length > 0 || mutexLobby)
    return true;

  // aquire mutex/lock for the method
  mutexLobby = true;

  console.debug("[BetterEsportal] Lobby detected. Initializing...");

  let playersClass = Array.from(document.querySelectorAll('span')).find(el => el.textContent === 'K/D').parentElement.parentElement.className.split(' ')[0];
  let players = [...document.querySelectorAll(`.${playersClass}`)];
  while (players.length == 0) {
    await new Promise(r => setTimeout(r, 500));
    console.debug("[BetterEsportal] Waiting for players to load...");
    players = [...document.querySelectorAll('.sc-dplrdh')];
  }

  if (players.length == 12) {
    players.shift();
    players.splice(5, 1);
  } else {
    console.log("[BetterEsportal] Error: Player count is "+players.length+". Trying to proceed anyway...");
    //return false;
  }
  let playerData = [];
  let playerRecent = [];
  for (let i=0; i<players.length;i++) {
    let name = players[i].getElementsByTagName("h4")[0].innerHTML;
    let faceitdata = await getFaceitStats(name);
    let recentdata = await getRecentStats(name);
    
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
      players[i].firstChild.after(faceitDiv);
    } else {
      dataPerTeam[i<5?0:1] += 1;
      let faceitDiv = document.createElement("div");
      let faceitElement = document.createElement("a");
      let faceitIcon = document.createElement("img");
      let faceitElo = document.createElement("p");
      faceitDiv.className = "Tipsy-inlineblock-wrapper";
      faceitIcon.src = chrome.runtime.getURL(`img/faceit/faceit${playerData[i].level}.svg`);
      faceitIcon.style.cssText = "height: 30px; width: 30px; margin-left: 10px; position: relative; top: 5px;";

      faceitElo.innerHTML = playerData[i].elo;
      faceitElo.style.cssText = "float: right; color: #FF5500; margin: 0.3em 0 0 0;";
      faceitElement.className = "faceitRank";
      faceitElement.style.cssText = "display: inline";
      faceitElement.target = "_BLANK";
      faceitElement.href = `https://faceit.com/en/players/${playerData[i].nickname}`;

      faceitElement.appendChild(faceitIcon);
      faceitElement.appendChild(faceitElo);
      faceitDiv.appendChild(faceitElement);
      players[i].firstChild.after(faceitDiv);

      // mark players who are banned on Faceit
      if (playerData[i].banned) {
        console.debug(`[BetterEsportal] ${playerData[i].nickname} is banned on Faceit.`);
        players[i].style.backgroundColor = "rgba(225, 74, 0, 0.52)";
      }
    }
  }

  //let scoreElement = document.querySelector('.sc-kDZQpm');
  let scoreElement = Array.from(document.querySelectorAll('span')).find(el => el.textContent === 'Win Chance').parentElement.parentElement;
  let sumT1 = 0;
  let sumT2 = 0;
  //gather detection
  /*if (!scoreElement || scoreElement.length == 0) {
    let winChanceElement = document.getElementsByClassName("match-lobby-page-header");
    if (winChanceElement && winChanceElement[0].children.length == 2) {
      let newScore = document.createElement("div");
      newScore.className = "match-lobby-win-chance";
      winChanceElement[0].insertBefore(newScore, winChanceElement[0].children[1]);
      scoreElement = [newScore];
    }
  }*/
  if (scoreElement && scoreElement.children.length > 0) {
    sumT1 = playerData.slice(0, 5).map(a => a.elo).reduce((a,b) => a+b, 0) * (5/dataPerTeam[0]);
    sumT2 = playerData.slice(-5).map(a => a.elo).reduce((a,b) => a+b, 0) * (5/dataPerTeam[1]);

    let avgT1 = ((sumT1/(sumT1+sumT2))*100).toFixed(0);
    let avgT2 = 100-avgT1;

    let winchanceHeader = scoreElement.children[0].cloneNode(true);
    winchanceHeader.children[0].innerText = "BetterEsportal Win Chance (Faceit)";
    winchanceHeader.removeChild(winchanceHeader.children[1]);
    let winchanceBars = scoreElement.children[1].cloneNode(true);
    winchanceBars.children[0].children[0].children[0].style.width = `${avgT1}%`;
    winchanceBars.children[0].children[0].children[1].style.width = `${avgT2}%`;
    let winchanceNewText = document.createElement("div");
    winchanceNewText.style = "text-align: center; margin-top: 13px; font-size: 13px; letter-spacing: 0.1em; color: rgb(105, 117, 140);";
    winchanceNewText.innerText = `${avgT1}% - ${avgT2}%`;
    winchanceBars.children[0].firstChild.after(winchanceNewText);
    scoreElement.lastChild.after(winchanceHeader, winchanceBars);

    //let playersText = [...document.querySelectorAll('.sc-cTcUcm')];
    let playersText = Array.from(document.querySelectorAll('span')).filter(el => el.textContent === 'Player');
    if (playersText) {
      playersText[0].innerHTML = `Player (avg: <span style='color: #FF5500;'>${(sumT1/5).toFixed(0)}</span>)`;
      playersText[1].innerHTML = `Player (avg: <span style='color: #FF5500;'>${(sumT2/5).toFixed(0)}</span>)`;
    }
  }
  mutexLobby = false;
  return;

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
      recentCell.innerHTML = chrome.i18n.getMessage("last5");
      //display average faceit elo
      //TODO: change to be displayed as last row of table + Faceit LVL Symbol / AVG KD / AVG Esportal rating
      let eloavg = " (avg: <span style='color: #FF5500;'>"+((i==0?sumT1:sumT2)/5).toFixed(0)+"</span>)";
      rows[0].cells[0].innerHTML += eloavg;
    }
  }

  //release mutex for the method
  mutexLobby = false;
}

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
      console.debug("[BetterEsportal] Received message from background script:", request.message);
      const site = window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
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
//prevent double execution / mutal exclusion
var lastSite = null;

let url = window.location.href;
if (url.includes("esportal")) {
  console.log("[BetterEsportal] Initializing extension. Applying settings...");
  clearHeadBar();
  clearStream();
  init(url);
}
