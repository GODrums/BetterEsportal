let switchLobbies = document.getElementById("lobbies");
let switchProfiles = document.getElementById("profiles");
let switchAccept = document.getElementById("accept");
let switchStream = document.getElementById("stream");
let switchLevels = document.getElementById("levels");
let switchMedals = document.getElementById("medals");

document.getElementById("version").innerHTML = "Version: "+chrome.runtime.getManifest().version;


chrome.storage.local.get("lobbies", (data) => {
  if (data.lobbies) {
    switchLobbies.checked = true;
  } else {
    switchLobbies.checked = false;
  }
});
chrome.storage.local.get("profiles", (data) => {
  if (data.profiles) {
    switchProfiles.checked = true;
  } else {
    switchProfiles.checked = false;
  }
});
chrome.storage.local.get("accept", (data) => {
  if (data.accept) {
    switchAccept.checked = true;
  } else {
    switchAccept.checked = false;
  }
});
chrome.storage.local.get("stream", (data) => {
  if (data.stream) {
    switchStream.checked = true;
  } else {
    switchStream.checked = false;
  }
});
chrome.storage.local.get("levels", (data) => {
  if (data.levels) {
    switchLevels.checked = true;
  } else {
    switchLevels.checked = false;
  }
});
chrome.storage.local.get("medals", (data) => {
  if (data.medals) {
    switchMedals.checked = true;
  } else {
    switchMedals.checked = false;
  }
});

document.getElementById("lobbies").addEventListener('change', e => {
  chrome.storage.local.set({'lobbies': e.target.checked});
});
document.getElementById("profiles").addEventListener('change', e => {
  chrome.storage.local.set({'profiles': e.target.checked});
});
document.getElementById("accept").addEventListener('change', e => {
  chrome.storage.local.set({'accept': e.target.checked});
});
document.getElementById("stream").addEventListener('change', e => {
  chrome.storage.local.set({'stream': e.target.checked});
});
document.getElementById("levels").addEventListener('change', e => {
  chrome.storage.local.set({'levels': e.target.checked});
});
document.getElementById("medals").addEventListener('change', e => {
  chrome.storage.local.set({'medals': e.target.checked});
});

var coll = document.getElementsByClassName("collapsible");
var i;

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  });
}

//localization
//stackoverflow.com/questions/25467009/internationalization-of-html-pages-for-my-google-chrome-extension
document.querySelectorAll('[data-locale]').forEach(elem => {
  elem.innerText = chrome.i18n.getMessage(elem.dataset.locale)
})
