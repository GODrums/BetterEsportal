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

  // show loading text
  let gameStatusDiv = document.querySelector('.gameStatus');
  if (gameStatusDiv) {
    gameStatusDiv.insertAdjacentHTML('afterend', `<div class="${gameStatusDiv.className} betteresportal-gameStatus" style="color: #FF5500; margin-top: 10px;"><p style="margin: 10px 0 10px 0;">BetterEsportal is loading</p><span class="be-loader"></span></div>`);
  }

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
    console.log("[BetterEsportal] Error: Player count is " + players.length + ". Trying to proceed anyway...");
    //return false;
  }
  let playerData = [];
  let playerRecent = [];
  for (let i = 0; i < players.length; i++) {
    let name = players[i].getElementsByTagName("h4")[0].innerHTML;
    let faceitdata = await getFaceitStats(name);
    let recentdata = await getRecentStats(name);

    playerData.push(faceitdata);
    playerRecent.push(recentdata);
  }

  //account for players without faceit account
  let dataPerTeam = [0, 0];
  for (let i = 0; i < players.length; i++) {
    if (playerData[i].level == 0) {
      let faceitDiv = document.createElement("div");
      let faceitIcon = document.createElement("img");
      faceitIcon.src = chrome.runtime.getURL(`img/faceit/faceit0.svg`);
      faceitIcon.style.cssText = "height: 30px; width: 30px; margin-left: 10px; position: relative; top: 11px;";
      faceitDiv.className = "Tipsy-inlineblock-wrapper";
      faceitDiv.appendChild(faceitIcon);
      players[i].firstChild.after(faceitDiv);
    } else {
      dataPerTeam[i < 5 ? 0 : 1] += 1;
      let faceitDiv = document.createElement("div");
      let faceitElement = document.createElement("a");
      let faceitIcon = document.createElement("img");
      let faceitElo = document.createElement("p");
      faceitDiv.className = "Tipsy-inlineblock-wrapper";
      faceitIcon.src = chrome.runtime.getURL(`img/faceit/faceit${playerData[i].level}.svg`);
      faceitIcon.style.cssText = "height: 30px; width: 30px; margin-left: 10px; position: relative; top: 5px;";

      faceitElo.innerHTML = playerData[i].elo;
      faceitElo.style.cssText = "float: right; color: #FF5500;";
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
    sumT1 = playerData.slice(0, 5).map(a => a.elo).reduce((a, b) => a + b, 0) * (5 / dataPerTeam[0]);
    sumT2 = playerData.slice(-5).map(a => a.elo).reduce((a, b) => a + b, 0) * (5 / dataPerTeam[1]);

    let avgT1 = ((sumT1 / (sumT1 + sumT2)) * 100).toFixed(0);
    let avgT2 = 100 - avgT1;

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

    let playersText = Array.from(document.querySelectorAll('span')).filter(el => el.textContent === 'Player');
    if (playersText) {
      playersText[0].innerHTML = `Player (avg: <span style='color: #FF5500;'>${(sumT1 / 5).toFixed(0)}</span>)`;
      playersText[1].innerHTML = `Player (avg: <span style='color: #FF5500;'>${(sumT2 / 5).toFixed(0)}</span>)`;
    }
  }

  // remove the loading text
  let loadingDiv = document.querySelector(".betteresportal-gameStatus");
  if (loadingDiv) {
    //loadingDiv.remove();
    loadingDiv.children[0].innerHTML = "BetterEsportal loaded!";
    loadingDiv.style.color = "rgb(127, 208, 76)";
    loadingDiv.children[1].remove();
  }

  //release mutex for the method
  mutexLobby = false;

  console.debug("[BetterEsportal] Finished Lobby process.");
}