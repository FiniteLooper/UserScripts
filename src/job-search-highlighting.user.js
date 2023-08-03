// ==UserScript==
// @name         Job Search Highlighting (Indeed, Dice, ZipRecruiter, LinkedIn, Remote.co)
// @namespace    https://github.com/FiniteLooper/UserScripts
// @version      0.7
// @description  Highlights key words and locations on Indeed.com, Dice.com, LinkedIn.com, and Remote.co - also highlights your search string on Indeed
// @author       Chris Barr
// @homepageURL  https://github.com/FiniteLooper/UserScripts
// @updateURL    https://github.com/FiniteLooper/UserScripts/blob/master/src/job-search-highlighter.user.js
// @match        https://www.indeed.com/*
// @match        https://www.dice.com/jobs*
// @match        https://www.dice.com/job-detail/*
// @match        https://www.remote.co/job/*
// @match        https://www.ziprecruiter.com/jobs/*
// @match        https://www.linkedin.com/jobs/*
// @icon         https://www.indeed.com/images/favicon.ico
// @grant        GM_addStyle
// @grant        unsafeWindow
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://bartaz.github.io/sandbox.js/jquery.highlight.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==

(function () {
  "use strict";
  var $ = window.jQuery;
  var waitForKeyElements = unsafeWindow.waitForKeyElements;

  //A list of terms to always highlight
  const descriptionAlwaysHighlight = [
    "angular",
    "typescript",
    "type script",
    "javascript",
    "java script",
    "css",
    "scss",
    "html",
    "encouraged to apply",
  ];

  //a list of terms to always highlight, but with a red/flagged color. These are things to be alerted about
  const descriptionAlwaysFlag = [
    "initially remote",
    "no c2c",
    "not a C2C",
    "not available to",
    "employment is contingent upon",
    "may be required",
    "be able to",
    "ability to obtain",
    "able to obtain",
    "security clearance",
    "(Required)",
    " do not apply if",
    "should be comfortable",
    "must be comfortable",
  ];

  //Work types that are highlighted in a different color
  const workTypesAlwaysHighlight = [
    "freelance",
    "fulltime",
    "full time",
    "part time",
    "contract to hire",
    "c2h",
    "contract",
    "w2",
    "1099",
    "c2c",
    "corp-to-corp",
    "corp to corp",
  ];

  //Just "remote" or any location that includes specific words like "remote in Charlotte, NC"
  //This way we don't highlight results like "Remote from Las Vegas, NM" - although it is remote, you don't live there
  const locationHighlightPattern =
    /(^remote(, US.*)?$)|(^remote or.+)|United States \(?Remote\)?|hybrid remote|charlotte|, nc|north carolina/i;

  //------------------------------------------------------------------------------------------------------------
  // HIGHLIGHTING STYLES
  //------------------------------------------------------------------------------------------------------------
  //Change the color of the highlighting
  GM_addStyle(`.job-highlight{background-color:#ffdb62;}`);
  GM_addStyle(`.job-searchterm{background-color:#cfecff;}`); // light blue highlighting of your search terms
  GM_addStyle(`.job-flagged{background-color:#ffa7a7;}`); //red highlighting of flagged terms
  GM_addStyle(`.job-worktype{background-color:#edddff;}`); //light purple highlighting of work type terms

  //------------------------------------------------------------------------------------------------------------
  // Highlighting logic
  //------------------------------------------------------------------------------------------------------------
  let searchParam = "";
  function highlightJobDesc(jNode) {
    //always highlight these words
    $(jNode).highlight(descriptionAlwaysHighlight, {
      className: "job-highlight",
    });
    $(jNode).highlight(descriptionAlwaysFlag, { className: "job-flagged" });
    $(jNode).highlight(workTypesAlwaysHighlight, { className: "job-worktype" });

    //Find words to highlight from the search parameters
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get(searchParam);
    if (searchQuery) {
      [...searchQuery.matchAll(/"([\w ]+?)"|\w+/g)].forEach((q) => {
        //prefer match 1 first with the quoted string, then look for the other one
        if (q[1]) {
          $(jNode).highlight(q[1].replace(/"/g, ""), {
            className: "job-searchterm",
          });
        } else if (q[0]) {
          $(jNode).highlight(q[0], { className: "job-searchterm" });
        }
      });
    }
  }

  function highlightLocation(jNode) {
    $(jNode).each((i, n) => {
      const txt = n.innerText
        .replace(/^location:/i, "")
        .replace(/[\n\r]+/gi, " ")
        .trim();
      if (locationHighlightPattern.test(txt)) {
        $(n).highlight(txt, { className: "job-highlight" });
      }
    });
  }

  //------------------------------------------------------------------------------------------------------------
  // Website-specific elements
  //------------------------------------------------------------------------------------------------------------
  if (location.hostname.includes("indeed.com")) {
    searchParam = "q";
    //Improve the look of the currently selected job - a more visible shadow/glow
    GM_addStyle(`.mosaic-provider-jobcards .desktop.vjs-highlight .slider_container{
          box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,.5), 0 0 0.8rem rgba(37, 87, 167,.5);
        }`);

    if (
      location.pathname.startsWith("/job/") ||
      location.pathname.startsWith("/viewjob")
    ) {
      //static individual job details page
      waitForKeyElements("#jobDescriptionText", highlightJobDesc);
      waitForKeyElements(
        ".jobsearch-CompanyInfoWithReview > div > div > div:nth-child(2)",
        highlightLocation
      );
    } else {
      //ajax job search page
      setInterval(function () {
        highlightJobDesc(document.querySelectorAll("#jobDescriptionText"));
        highlightLocation(
          document.querySelectorAll(
            '#mosaic-provider-jobcards .companyLocation, .jobsearch-CompanyInfoWithReview [data-testid="inlineHeader-companyLocation"], .jobsearch-CompanyInfoWithoutHeaderImage [data-testid="inlineHeader-companyLocation"]'
          )
        );
      }, 1000);
    }
  } else if (location.hostname.includes("dice.com")) {
    if (location.pathname.startsWith("/job-detail/")) {
      //individual job detail page
      waitForKeyElements("#jobDescription", highlightJobDesc);
      waitForKeyElements(
        '.companyInfo li[data-cy="companyLocation"]',
        highlightLocation
      );

      //auto-expand the job description
      setTimeout(() => {
        $("#descriptionToggle").click();
      }, 1000);
    } else {
      //ajax job search page
      waitForKeyElements(".search-result-location", highlightLocation, false);
    }
  } else if (location.hostname.includes("remote.co")) {
    waitForKeyElements(".job_description", highlightJobDesc);
    waitForKeyElements(".location_sm", highlightLocation);
  } else if (location.hostname.includes("ziprecruiter.com")) {
    waitForKeyElements(".job_description", highlightJobDesc);
    waitForKeyElements(".job_header .hiring_location", highlightLocation);

    //auto-expand the description
    $(".job_details_tile").addClass("clicked");
  } else if (location.hostname.includes("linkedin.com")) {
    searchParam = "keywords";
    //auto-expand the description
    waitForKeyElements(".jobs-description footer button", function (n) {
      setTimeout(() => {
        $(n).click();
      }, 1000);
    });

    setInterval(function () {
      highlightJobDesc(document.querySelectorAll("#job-details"));

      const locationEl = document.querySelector(
        ".jobs-unified-top-card__primary-description > div"
      );
      if (locationEl) {
        const locationTextNode = Array.from(locationEl.childNodes).filter(
          (n) => n.nodeType === 3 && n.data.trim() !== ""
        )[0];
        if (locationTextNode) {
          locationTextNode.data = locationTextNode.data.replace("· ", "");
          $(locationTextNode).wrap('<span id="LOCATION_FOR_HIGHLIGHT"></span>');
          const wrappedLocation = $("#LOCATION_FOR_HIGHLIGHT");
          $("<span>· </span>").insertBefore(wrappedLocation);
          highlightLocation(wrappedLocation);
        }
      }

      if (
        location.pathname.startsWith("/jobs/collections/") ||
        location.pathname.startsWith("/jobs/search/")
      ) {
        //select additional items for the AJAX search
        highlightLocation(
          document.querySelectorAll(
            ".job-card-container__metadata-wrapper .job-card-container__metadata-item"
          )
        );
      }
    }, 1000);
  }
})();