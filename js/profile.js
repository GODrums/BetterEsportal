//adds the like ratio to a users profile
const likeRatio = async (username) => {
    const data = await getEsportal(username);
    if (data) {
        let ratio = "1:0";
        if (data.thumbs_down != 0)
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
        for (let i = 0; i < mClasses.length; i++) {
            let item = mClasses[i];
            let matchID = item.getAttribute("href");
            matchID = item.getAttribute("href").substring(matchID.lastIndexOf("/") + 1);
            const match = await getMatchEsportal(matchID);
            if (match !== null && match.id > 0 && match.players && match.players.length > 0 && match.team1_score != null) {
                // stats: rounds won, rounds lost, kills, deaths
                let stats = [0, 0, 0, 0];
                match.players.every(player => {
                    if (player.username === username) {
                        stats[Math.abs(player.team - 1)] = match.team1_score;
                        stats[Math.abs(player.team - 2)] = match.team2_score;
                        stats[2] = player.kills;
                        if (player.deaths === 0) stats[3] = 1;
                        else stats[3] = player.deaths;
                        return false;
                    }
                    return true;
                });
                const kd = stats[2] / stats[3];
                let kdClass = null;
                if (kd >= 1.0) kdClass = "color: #739900;";
                else kdClass = "color: #a80000;";

                let row = "<td><span style='" + kdClass + "'>" + stats[2] + " - " + stats[3] + " (" + kd.toFixed(2) + ")</span></td>";
                item.parentElement.parentElement.children[3].insertAdjacentHTML('afterend', row);

                let node = item.parentElement.parentElement.children[5];
                if (node) {
                    node.innerHTML = "<span>" + node.innerHTML + " (" + stats[0] + " - " + stats[1] + ")</span>";
                }
            } else {
                let row = "<td><span style='color: #c0c6d1;'>-</span></td>";
                item.parentElement.parentElement.children[3].insertAdjacentHTML('afterend', row);
            }
        }
    }
}
const initProfile = async (username) => {
    console.debug("[BetterEsportal] Starting profile customization");
    likeRatio(username);

    let faceitdata = await getFaceitStats(username);
    setTimeout(() => {
        //add a link to the rank symbol
        //let iconClass = document.querySelector('.sc-iXTxzR');
        let iconClass = Array.from(document.querySelectorAll('h2')).find(el => el.textContent === username).parentElement.parentElement.parentElement.children[1];
        if (iconClass && iconClass.parentNode) {
            let parent = iconClass.parentNode;
            parent.removeChild(iconClass);
            let ranking = document.createElement("a");
            ranking.href = "https://esportal.com/de/ranking";
            ranking.appendChild(iconClass);
            parent.appendChild(ranking);
        }
        //add faceit rank+elo
        let ratingSection = Array.from(document.querySelectorAll('h2')).find(el => el.textContent === 'Latest Medals').parentElement.parentElement.parentElement;
        if (!ratingSection || ratingSection.children.length < 1) {
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

        if (faceitdata.level == 0) {
            let faceitDiv = document.createElement("div");
            faceitDiv.style.cssText = "height: 80px; width: 160px; margin-left: 10px; display: flex; justify-content: center; align-items: center; background: url(" + chrome.runtime.getURL('img/faceit/faceit_background_nologo.png') + ") center no-repeat; margin: 0 auto;";
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
            faceitDiv.style.cssText = "height: 80px; width: 160px; margin-left: 10px; display: flex; justify-content: center; align-items: center; background: url(" + chrome.runtime.getURL('img/faceit/faceit_background_nologo.png') + ") center no-repeat;  margin: 0 auto;";
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

        console.debug("[BetterEsportal] Finished profile customization");
    }, TIMEOUT);
}