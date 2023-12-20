// ==UserScript==
// @name         Amazon Vine UI Enhancer
// @namespace    https://github.com/FiniteLooper/UserScripts
// @version      0.5.5
// @description  Minor UI improvements to browsing items on Amazon Vine
// @author       Chris Barr
// @homepageURL  https://github.com/FiniteLooper/UserScripts
// @updateURL    https://github.com/FiniteLooper/UserScripts/raw/main/src/amazon-vine-enhancer.user.js
// @match        https://*.amazon.com/vine/vine-items*
// @match        https://*.amazon.ca/vine/vine-items*
// @match        https://*.amazon.co.uk/vine/vine-items*
// @match        https://*.amazon.de/vine/vine-items*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.com
// @grant        unsafeWindow
// @grant        GM_addStyle
// ==/UserScript==

/*
TODO:
 * Customizable dim list
 * customizable highlight list
 * Customizable grid size
*/

(function () {
  "use strict";

  //=========================================================================
  //User configurable variables =============================================
  const dimmedItemWordList = [
    //Hair stuff
    "wig",
    "hair extension",
    "dreadlock extension",
    "ponytail extension",
    "crochet hair",
    "baby hair",
    "braiding hair",
    "eyelash extension",
    "false eyelash",

    //Printer ink/toner
    "ink cartridge",
    "ink refill",
    "toner",

    //Cakes & party decorations
    "cake topper",
    "cupcake wrapper",
    "cake decoration",
    "party decoration",

    //Misc.
    "castor oil",
    "shower pan liner",
    "anti-colic bottle",
    "tub spout",
  ];

  //=========================================================================
  //Variables used for multiple sections ====================================

  //Detect if any StyleBot styles are being injected,
  //for Amazon Vine users this typically means they are using Thorvarium's styles: https://github.com/Thorvarium/vine-styling
  //if so we may want to do a few things differently for compatibility between these two things
  const clientAlsoUsingStyleBot = !!document.querySelector('style[id^="stylebot-"]');

  //Grab the body BG color in case any custom themes are applied to the site
  const bodyBgColor = getComputedStyle(document.body).backgroundColor;

  //grab the border color, style, and size
  const border = getComputedStyle(document.querySelector('[data-a-name="vine-items"]')).border;

  //=========================================================================
  //Styles needed for various features
  GM_addStyle(
    [
      //Hide the "recently viewed items" and the footer underneath all the vine items
      //This make the page easier to scroll around on and speeds up the page since it will never load the data dynamically now
      `#rhf, #navFooter{display: none !important;}`,
      //Slightly taller popup modal window to the ETV is always visible =========
      `.a-popover-modal-fixed-height{height: 550px !important;} .a-popover-inner{padding-bottom: 112px !important;}`,
      //Side categories: bolded selected items and show nesting better ==========
      `a.selectedNode{font-weight: bold;}
      a.selectedNode:hover{color: inherit !important;}
      .child-node{
        padding-left: 10px;
        margin-left: 0;
        border-left: ${border};
      }`,
      //Sticky footer pagination
      `#vvp-items-grid-container > [role="navigation"] {
        position:sticky;
        bottom:0;
        padding-top: 5px;
        background-color: ${bodyBgColor};
        border-top: ${border};
        z-index: 30;
      }`,
      //Sticky top bar with search
      `[data-a-name="vine-items"] .vvp-items-button-and-search-container {
        position: sticky;
        top: 0;
        z-index: 1;
        background-color: ${bodyBgColor};
        border-bottom: ${border};
        z-index: 30;
      }`,
      //Sticky side bar with categories
      `#vvp-browse-nodes-container {
        align-self: start;
        position: sticky;
      }`,
      //Fade/Dim tiles
      `.dimmed-tile {
        opacity: .25;
        transition: opacity 300ms;
      }
      .dimmed-tile:hover { opacity: 1; }`,
    ].join("")
  );

  //=========================================================================
  //Sticky top bar with search ==============================================
  const elBtnAndSearch = document.querySelector('[data-a-name="vine-items"] .vvp-items-button-and-search-container');

  //Steal the margin value and use it as padding instead for the header so we can have a colored BG
  const btnAndSearchStyles = getComputedStyle(elBtnAndSearch);
  elBtnAndSearch.style.padding = btnAndSearchStyles.margin;
  elBtnAndSearch.style.margin = "0 !important";

  //=========================================================================
  //Sticky side bar with categories =========================================
  const elCategories = document.querySelector("#vvp-browse-nodes-container");

  //Set the sticky top position of the categories to the height of the top bar
  //unless the categories are taller than the screen
  if (elCategories.offsetHeight + elBtnAndSearch.offsetHeight <= document.documentElement.clientHeight) {
    elCategories.style.top = `${elBtnAndSearch.offsetHeight}px`;
  }

  //=========================================================================
  //When searching...
  if (document.location.search.includes("search=")) {
    //Put the RFY/AFA/AI area buttons back - why are they hidden during a search anyway?
    const areaButtonContainer = document.querySelector("#vvp-items-button-container");
    if (areaButtonContainer.innerHTML.trim() === "") {
      areaButtonContainer.innerHTML = `
      <span id="vvp-items-button--recommended" class="a-button a-button-normal a-button-toggle" role="radio"><span class="a-button-inner"><a href="vine-items?queue=potluck" class="a-button-text">Recommended for you</a></span></span>
      <span id="vvp-items-button--all" class="a-button a-button-normal a-button-toggle" role="radio"><span class="a-button-inner"><a href="vine-items?queue=last_chance" class="a-button-text">Available for all</a></span></span>
      <span id="vvp-items-button--seller" class="a-button a-button-normal a-button-toggle" role="radio"><span class="a-button-inner"><a href="vine-items?queue=encore" class="a-button-text">Additional items</a></span></span>`;
    }

    //pressing "show all" will return you to the AI section instead of RFY
    const showAllLink = document.querySelector("#vvp-browse-nodes-container>p>a");
    showAllLink.href = showAllLink.href.replace(/\?queue=\w+$/, "?queue=encore");
  }

  //=========================================================================
  //Pagination when left/right arrow keys are pressed =======================
  document.body.addEventListener("keyup", (ev) => {
    if (document.activeElement.tagName.toLowerCase() !== "input") {
      //Only do this if you are not currently in an input field
      if (ev.key === "ArrowLeft") {
        const el = document.querySelector(".a-pagination li:first-child a");
        el.focus();
        el.click();
      } else if (ev.key === "ArrowRight") {
        const el = document.querySelector(".a-pagination li:last-child a");
        el.focus();
        el.click();
      }
    }
  });

  //=========================================================================
  //Fade/Dim items with descriptions that match something in the word list defined at the top
  function dimTileWithDescriptionWordInList(itemElement) {
    const description = itemElement.querySelector(".vvp-item-product-title-container .a-truncate-full").innerText.toLowerCase();
    if (dimmedItemWordList.some((listItem) => description.includes(listItem))) {
      itemElement.classList.add("dimmed-tile");
    }
  }

  //=========================================================================
  //Add links/buttons to replace ASIN number for products that are broken with infinite spinners

  const detailsButtonGridSize = clientAlsoUsingStyleBot ? 6 : 8;
  const extraButtonGridSize = clientAlsoUsingStyleBot ? 3 : 2;
  const extraButtonWidth = clientAlsoUsingStyleBot ? "25%" : "17%"; //match the amazon grid system sizes

  GM_addStyle(
    [
      `.vvp-item-tile-content{ position: relative; }
      .vvp-details-btn{
        border-top-right-radius:0 !important;
        border-bottom-right-radius:0 !important;
      }
      .get-etv-link, .fix-asin-link {
        height: auto !important;
        position: absolute;
        bottom:0;
      }
      .get-etv-link {
        border-radius:0 !important;
        right: ${extraButtonWidth};
      }
      .fix-asin-link {
        border-top-left-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
        right:0;
      }
      .get-etv-link .a-button-text, .fix-asin-link .a-button-text{
        padding:0;
      }
      .get-etv-link.a-button-disabled, .get-etv-link.a-button-disabled .a-button-text{
        cursor: not-allowed !important;
        filter: saturate(50%);
      }`,
      `.etv-display{
        font-size: 12px;
        margin: 0 !important;
      }`,

      clientAlsoUsingStyleBot
        ? `.a-button-inner{height: auto !important}`
        : `
        .etv-display{
          position: absolute;
          right: ${extraButtonWidth};
          bottom: 55px;
          width: auto !important;
        }`,
    ].join("")
  );

  if (clientAlsoUsingStyleBot) {
    //When also using StyleBot, the all buttons need less padding so they can fit
    GM_addStyle(".vvp-item-tile .a-button-text{padding:5px 2px;}");
  }

  function addTileLinks(itemElement) {
    const tileContentEl = itemElement.querySelector(".vvp-item-tile-content");
    const detailsButtonEl = itemElement.querySelector(".vvp-details-btn");
    const inputEl = detailsButtonEl.querySelector("input.a-button-input");
    const isParent = /true/i.test(inputEl.getAttribute("data-is-parent-asin"));

    //Use an Amazon grid class to size the "see details" button
    detailsButtonEl.classList.add(`a-button-span${detailsButtonGridSize}`);
    if (clientAlsoUsingStyleBot) {
      //less text in the details button when using StyleBot styles so the extra buttons can fit better
      detailsButtonEl.querySelector(".a-button-text").innerText = "details";
    }

    //Add a link to check the ETV
    const getEtvLink = document.createElement("button");
    getEtvLink.setAttribute("type", "button");
    getEtvLink.setAttribute("class", `get-etv-link a-button a-button-primary a-button-span${extraButtonGridSize}`);
    getEtvLink.innerHTML = `<div class='a-button-text'>💵</div>`;

    const etvLinkClickFn = async (ev) => {
      ev.preventDefault();

      //Only one click per button
      getEtvLink.classList.remove("a-button-primary");
      getEtvLink.classList.add("a-button-disabled");
      getEtvLink.removeEventListener("click", etvLinkClickFn);

      const etvDisplayEl = document.createElement("div");
      etvDisplayEl.className = "etv-display";
      etvDisplayEl.innerText = "loading...";
      tileContentEl.insertBefore(etvDisplayEl, detailsButtonEl);

      const recommendationId = encodeURIComponent(inputEl.getAttribute("data-recommendation-id"));
      const asin = inputEl.getAttribute("data-asin");
      let url = `${location.origin}/vine/api/recommendations/${recommendationId}/item/${asin}?imageSize=180`;
      const req = await fetch(url);
      const response = await req.json();
      const data = response.result;

      if (data) {
        const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: data.taxCurrency });
        etvDisplayEl.innerText = `ETV: ${currencyFormatter.format(data.taxValue)}`;
      } else {
        etvDisplayEl.innerText = "Error getting ETV!";
      }
    };

    if (isParent) {
      getEtvLink.title = "Has variations, see the details";
      getEtvLink.classList.remove("a-button-primary");
      getEtvLink.classList.add("a-button-disabled");
      getEtvLink.setAttribute("disabled", "");
    } else {
      getEtvLink.title = "Get ETV";
      getEtvLink.addEventListener("click", etvLinkClickFn);
    }

    tileContentEl.append(getEtvLink);

    //Add a link to fix the infinite load issue
    const fixLink = document.createElement("button");
    fixLink.setAttribute("type", "button");
    fixLink.className = `fix-asin-link a-button a-button-primary a-button-span${extraButtonGridSize}`;
    fixLink.innerHTML = `<span class='a-button-text'>🔃</span>`;
    fixLink.title = "Fix infinite spinner error";
    tileContentEl.append(fixLink);

    fixLink.addEventListener("click", (ev) => {
      ev.preventDefault();
      const newASIN = prompt("Open the product page, copy the ASIN number, and put it here...");
      if (newASIN !== "") {
        inputEl.setAttribute("data-is-parent-asin", "false");
        inputEl.setAttribute("data-asin", newASIN);
        inputEl.focus();
      }
    });
  }

  //=========================================================================
  //Loop over each product tile and run functions for each one
  document.querySelectorAll("#vvp-items-grid > .vvp-item-tile").forEach((itemElement) => {
    dimTileWithDescriptionWordInList(itemElement);
    addTileLinks(itemElement);
  });
})();
