// ==UserScript==
// @name         Job Search Highlighting
// @namespace    https://github.com/FiniteLooper/UserScripts
// @version      0.9
// @description  Highlights key words and locations on many popular job sites
// @author       Chris Barr
// @homepageURL  https://github.com/FiniteLooper/UserScripts
// @updateURL    https://github.com/FiniteLooper/UserScripts/blob/master/src/job-search-highlighter.user.js
// @match        https://www.indeed.com/*
// @match        https://www.dice.com/jobs*
// @match        https://www.dice.com/job-detail/*
// @match        https://www.remote.co/job/*
// @match        https://www.ziprecruiter.com/jobs/*
// @match        https://www.linkedin.com/jobs/*
// @match        https://jobsfordevelopers.com/jobs/*
// @match        https://jobot.com/*
// @icon         https://www.indeed.com/images/favicon.ico
// @grant        GM_addStyle
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://bartaz.github.io/sandbox.js/jquery.highlight.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==

(function () {
  "use strict";
  var $ = window.jQuery;

  //Options for additional things to flag in the words list
  const flagSecurityClearances = true;
  const flagCriminalRecord = false;

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
  ];

  //a list of terms to always highlight, but with a red/flagged color. These are things to be alerted about
  const descriptionAlwaysFlag = [
    "initially remote",
    "not available to",
    "employment is contingent upon",
    "will not be considered",
    "may be required",
    "should be able to",
    "must be able to",
    "should be comfortable",
    "must be comfortable",
    "is a must",
    "must have",
    "must be",
    "Must possess",
    "required",
    "able to use",
    "is a requirement",
    "Experience with",
    "Experience in ", //intentional space here to avoid flagging part of "experience including" (for example)
    "Experienced with",
    "Experienced in",
    "do not apply if",
    "encouraged to apply",
    "are encouraged to",
    "encourage you to",
  ];

  if (flagSecurityClearances) {
    descriptionAlwaysFlag.push(
      ...[
        "ability to obtain",
        "able to obtain",
        "TS/SCI",
        "DoD Secret",
        "DoE Secret",
        "Top Secret/Sensitive Compartmented Information",
        "security clearance",
        "top secret clearance",
        "secret clearance",
        "public trust clearance",
        "public trust",
        "Q clearance",
        "L clearance",
        "government background investigation",
      ]
    );
  }

  if (flagCriminalRecord) {
    descriptionAlwaysFlag.push(
      ...[
        "background investigation",
        "background check",
        "fair chance",
        "conviction record",
        "arrest record",
        "criminal history",
        "criminal histories",
        "criminal record",
        "criminal",
        "felony",
        "felonies",
      ]
    );
  }

  //Work types that are highlighted in a different color
  const workTypesAlwaysHighlight = [
    "no c2c",
    "not a C2C",
    "No third-party/C2C",
    "c2c",
    "corp-to-corp",
    "corp to corp",
    "freelance",
    "fulltime",
    "full time",
    "full-time",
    "parttime",
    "part time",
    "part-time",
    "contract to hire",
    "contract-to-hire",
    "c2h",
    "contract",
    "w2",
    "1099",
  ];

  //Just "remote" or any location that includes specific words like "remote in Charlotte, NC"
  //This way we don't highlight results like "Remote from Las Vegas, NM" - although it is remote, you don't live there
  const locationHighlightPattern =
    /(^remote(, US.*)?$)|(^remote;? united states$)|(^remote or.+)|United States;? \(?Remote\)?|(^hybrid remote$)|charlotte|, nc|north carolina/i;

  //Any mention of currency is highlighted
  const currencyHighlightPattern = /[$£€][\d,.]+[BMK]?\+?/gi;

  //------------------------------------------------------------------------------------------------------------
  // HIGHLIGHTING STYLES
  //------------------------------------------------------------------------------------------------------------
  //.jsh-mark is added to all highlight types
  GM_addStyle(`
.jsh-mark {
  position: relative;
  outline-width: 1px;
  outline-style: solid;
  border-radius: 0.25rem;
  cursor: help;
}
.jsh-mark::before {
  display:none;
  position: absolute;
  bottom: 1.25rem;
  left: 0;
  width: 150px;
  padding: 0.25rem;
  font-size: 12px;
  font-weight: normal;
  line-height: 1.1;
  color: hsl(50, 60%, 40%);
  background-color: hsl(50, 95%, 90%);
  border: 1px solid hsl(50, 60%, 70%);
  border-radius: 0.5rem;
  box-shadow: 0 0.15rem 0.5rem rgba(45,45,45,0.15);
}
.jsh-mark:hover::before {
  display: block;
}

.jsh-always-highlight {background-color:hsla(46,100%,70%,0.5); outline-color:hsla(46,100%,50%,0.5);}
.jsh-always-highlight:hover {outline-color:hsla(46,100%,50%,1);}
.jsh-always-highlight::before {content:'Job Search Highlighter: You specified this word or phrase to always be highlighted';}

.jsh-location {background-color:hsla(28,100%,80%,0.75); outline-color:hsla(28,90%,60%,0.75);}
.jsh-location:hover {outline-color:hsla(28,90%,60%,1);}
.jsh-location::before {content:'Job Search Highlighter: This location matches the pattern you specified';}

.jsh-search-term {background-color:hsla(203,100%,90%,0.75); outline-color:hsla(203,90%,75%,0.75);}
.jsh-search-term:hover {outline-color:hsla(203,90%,75%,1);}
.jsh-search-term::before {content:'Job Search Highlighter: You searched for this word or phrase on this website';}

.jsh-flagged {background-color:hsla(0,80%,80%,0.75); outline-color:hsla(0,70%,70%,0.75);}
.jsh-flagged:hover {outline-color:hsla(0,70%,70%,1);}
.jsh-flagged::before {content:'Job Search Highlighter: You specified this as a flagged term that you should be made aware of';}

.jsh-work-type {background-color:hsla(268,100%,90%,0.75); outline-color:hsla(268,85%,85%,0.75);}
.jsh-work-type:hover {outline-color:hsla(268,85%,85%,1);}
.jsh-work-type::before {content:'Job Search Highlighter: You marked this as a type of work';}

.jsh-currency {background-color:hsla(126,70%,80%,0.75); outline-color:hsla(126,70%,70%,0.75);}
.jsh-currency:hover {outline-color:hsla(126,70%,70%,1);}
.jsh-currency::before {content:'Job Search Highlighter: This matches a pattern that looks like it might mention a compensation amount';}
`);

  //------------------------------------------------------------------------------------------------------------
  // Highlighting logic
  //------------------------------------------------------------------------------------------------------------
  let searchParam = "";
  function highlightJobDesc(jNode) {
    const $node = $(jNode);
    

    //Find words to highlight from the search parameters
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get(searchParam);
    if (searchQuery) {
      [...searchQuery.matchAll(/"([\w ]+?)"|\w+/g)].forEach((q) => {
        //prefer match 1 first with the quoted string, then look for the other one
        if (q[1]) {
          $node.highlight(q[1].replace(/"/g, ""), {
            className: "jsh-mark jsh-search-term",
          });
        } else if (q[0]) {
          $node.highlight(q[0], { className: "jsh-mark jsh-search-term" });
        }
      });
    }

      //always highlight these words
    $node.highlight(descriptionAlwaysHighlight, {
      className: "jsh-mark jsh-always-highlight",
    });
    $node.highlight(descriptionAlwaysFlag, {
      className: "jsh-mark jsh-flagged",
    });
    $node.highlight(workTypesAlwaysHighlight, {
      className: "jsh-mark jsh-work-type",
    });

    $node.each((_i, n) => {
      [...n.innerText.matchAll(currencyHighlightPattern)].forEach((m) => {
        $(n).highlight(m[0], { className: "jsh-mark jsh-currency" });
      });
    });
  }

  function highlightLocation(jNode, textNodesOnly) {
    $(jNode).each((_i, n) => {
      let txt = n.innerText;

      if (textNodesOnly) {
        //This will ignore text from any child nodes
        txt = [...n.childNodes]
          .filter((c) => c.nodeType === 3)
          .map((c) => c.nodeValue)
          .join("");
      }

      txt = txt
        .replace(/^location:/i, "")
        .replace(/[\n\r]+/gi, " ")
        .trim();

      if (locationHighlightPattern.test(txt)) {
        $(n).highlight(txt, { className: "jsh-mark jsh-location" });
      }
    });
  }

  function runForHostname(partialUrl, fn) {
    if (location.hostname.includes(partialUrl)) fn(location.pathname);
  }

  //------------------------------------------------------------------------------------------------------------
  // Website-specific elements
  //------------------------------------------------------------------------------------------------------------

  //===========
  //INDEED
  runForHostname("indeed.com", (path) => {
    searchParam = "q";
    //Improve the look of the currently selected job - a more visible shadow/glow
    GM_addStyle(`.mosaic-provider-jobcards .desktop.vjs-highlight .slider_container{
      box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,.5), 0 0 0.8rem rgba(37, 87, 167,.5);
    }`);

    if (path.startsWith("/job/") || path.startsWith("/viewjob")) {
      //static individual job details page
      waitForKeyElements("#jobDescriptionText", highlightJobDesc);
      waitForKeyElements(
        ".jobsearch-CompanyInfoWithReview > div > div > div:nth-child(2)",
        highlightLocation
      );
    } else {
      //ajax job search page
      setInterval(function () {
        highlightJobDesc($("#jobDescriptionText"));
        highlightLocation(
          $(
            "#mosaic-provider-jobcards .companyLocation, #mosaic-provider-jobcards .companyLocation span:not(.companyLocation--extras)"
          ),
          true
        );
        highlightLocation(
          $(
            '.jobsearch-CompanyInfoWithReview [data-testid="inlineHeader-companyLocation"], .jobsearch-CompanyInfoWithoutHeaderImage [data-testid="inlineHeader-companyLocation"]'
          )
        );
      }, 1000);
    }
  });

  //===========
  //DICE
  runForHostname("dice.com", (path) => {
    searchParam = "q";

      //Show full descriptions on the search results page. This also prevents the tooltips from being cut off
      GM_addStyle(
      `.search-card .card-description{overflow:visible !important; max-height:none !important;}`
    );

    if (path.startsWith("/job-detail/")) {
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
      waitForKeyElements(".card-description", highlightJobDesc, false);
    }
  });

  //===========
  //REMOTE.CO
  runForHostname("remote.co", (path) => {
    waitForKeyElements(".job_description", highlightJobDesc);
    waitForKeyElements(".location_sm", highlightLocation);
  });

  //===========
  //ZIP RECRUITER
  runForHostname("ziprecruiter.com", (path) => {
    waitForKeyElements(".job_description", highlightJobDesc);
    waitForKeyElements(".job_header .hiring_location", highlightLocation);

    //auto-expand the description
    $(".job_details_tile").addClass("clicked");
  });

  //===========
  //LINKEDIN
  runForHostname("linkedin.com", (path) => {
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
        path.startsWith("/jobs/collections/") ||
        path.startsWith("/jobs/search/")
      ) {
        //select additional items for the AJAX search
        highlightLocation(
          document.querySelectorAll(
            ".job-card-container__metadata-wrapper .job-card-container__metadata-item"
          )
        );
      }
    }, 1000);
  });

  //===========
  //JOBS FOR DEVELOPERS
  runForHostname("jobsfordevelopers.com", (path) => {
    //Locations are easy to see on this site, and the format they use is different from other sites. Not worth highlighting locations for this site
    waitForKeyElements(".container .prose", highlightJobDesc);
  });

  //===========
  //JOBOT
  runForHostname("jobot.com", (path) => {
    searchParam = "q";

    //More clear highlighting of the current job
    GM_addStyle(
      `.search-result .job.selected{box-shadow: 0 0 0.8rem #23b3e7;border-radius:10px 0 0 10px;}`
    );

    //This is a single-page app so we cannot check for URLs since the page never reloads
    //We need to wait a bit for the app to initialize and then it's good to go
    setTimeout(() => {
      waitForKeyElements(".JobDescription", highlightJobDesc, false);
      waitForKeyElements(
        ".header-details li, .JobInfoCard .q-item__section--main, .JobInfoCard .q-item__section--main .content div",
        highlightLocation,
        false
      );
    }, 1000);
  });
})();
