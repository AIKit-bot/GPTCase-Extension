window.addEventListener("load", async function () {
  const hljsREG = /^.*(hljs).*(language-[a-z0-9]+).*$/i;
  const gfm = turndownPluginGfm.gfm;
  const turndownService = new TurndownService({
    hr: "---",
  })
    .use(gfm)
    .addRule("code", {
      filter: (node) => {
        if (node.nodeName === "CODE" && hljsREG.test(node.classList.value)) {
          return "code";
        }
      },
      replacement: (content, node) => {
        const classStr = node.getAttribute("class");
        if (hljsREG.test(classStr)) {
          const lang = classStr.match(/.*language-(\w+)/)[1];
          if (lang) {
            return `\`\`\`${lang}\n${content}\n\`\`\``;
          }
          return `\`\`\`\n${content}\n\`\`\``;
        }
      },
    })
    .addRule("ignore", {
      filter: ["button", "img"],
      replacement: () => "",
    })
    .addRule("table", {
      filter: "table",
      replacement: function (content, node) {
        return `\`\`\`${content}\n\`\`\``;
      },
    });

  if (window.location.pathname === "/auth/login") return;
  const buttonOuterHTMLFallback = `<button class="btn flex justify-center gap-2 btn-neutral" id="gptcase-share-button">Try Again</button>`;
  removeButtons();
  if (window.buttonsInterval) {
    clearInterval(window.buttonsInterval);
  }
  if (window.innerWidth < 767) return;

  window.buttonsInterval = setInterval(() => {
    const actionsArea = document.querySelector("form>div>div");
    if (!actionsArea) {
      return;
    }

    if (shouldAddButtons(actionsArea)) {
      let TryAgainButton = actionsArea.querySelector("button");
      if (!TryAgainButton) {
        const parentNode = document.createElement("div");
        parentNode.innerHTML = buttonOuterHTMLFallback;
        TryAgainButton = parentNode.querySelector("button");
      }
      addActionsButtons(actionsArea, TryAgainButton);
    } else if (shouldRemoveButtons()) {
      removeButtons();
    }
  }, 1000);

  function shouldRemoveButtons() {
    if (document.querySelector("form .text-2xl")) {
      return true;
    }
    return false;
  }

  function shouldAddButtons(actionsArea) {
    // first, check if there's a "Try Again" button and no other buttons
    const buttons = actionsArea.querySelectorAll("button");

    const hasTryAgainButton = Array.from(buttons).some((button) => {
      return !/gptcase-/.test(button.id);
    });

    const stopBtn = buttons?.[0]?.innerText;

    if (/Stop generating/gi.test(stopBtn)) {
      return false;
    }

    if (
      buttons.length === 1 &&
      (/Regenerate response/gi.test(stopBtn) || buttons[1].innerText === "")
    ) {
      return true;
    }

    if (hasTryAgainButton && buttons.length === 1) {
      return true;
    }

    // otherwise, check if open screen is not visible
    const isOpenScreen = document.querySelector("h1.text-4xl");
    if (isOpenScreen) {
      return false;
    }

    // check if the conversation is finished and there are no share buttons
    const finishedConversation = document.querySelector("form button>svg");
    const hasShareButtons = actionsArea.querySelectorAll("button[share-ext]");
    if (finishedConversation && !hasShareButtons.length) {
      return true;
    }

    return false;
  }

  function removeButtons() {
    const shareButton = document.getElementById("gptcase-share-button");
    if (shareButton) {
      shareButton.remove();
    }
  }

  function addActionsButtons(actionsArea, TryAgainButton) {
    // Export markdown
    const shareButton = TryAgainButton.cloneNode(true);
    shareButton.id = "gptcase-share-button";
    shareButton.setAttribute("share-ext", "true");
    shareButton.title = "Share";

    shareButton.innerHTML = `${setIcon(
      "share"
    )} <span style="padding-left:5px;">Share</span>`;
    shareButton.onclick = share;
    actionsArea.appendChild(shareButton);
  }

  async function share() {
    const messages = Array.from(
      document.querySelectorAll(
        "main .items-center>div:not(.items-center).text-gray-800>div>div:nth-child(2)"
      )
    ).map((i) => {
      let role = "";
      if (i.childElementCount === 3) {
        role = "user";
      } else if (i.childElementCount === 2) {
        role = "assistant";
      } else {
        role = "unknown";
      }
      const markdown = turndownService.turndown(i);
      return { content: markdown, role };
    });
    const title = document.querySelectorAll(
      ".bg-gray-800>.flex-1.text-ellipsis"
    )[0].textContent;
    const model = document
      .querySelectorAll(
        ".justify-center.gap-1.border-b.bg-gray-50.p-3.text-gray-500"
      )[0]
      .textContent.match(/GPT-\d+/)[0];

    // Send a message to the background script with the chat data
    const response = await chrome.runtime.sendMessage({
      messages,
      title,
      model,
    });
    if (response == "Unauthorized") {
      alert(
        "To proceed, please log in. After logging in successfully, please try again."
      );
    } else if (response == false) {
      alert("Something went wrong. Please try again later.");
    }
  }

  function setIcon(type) {
    return {
      share: `<svg viewBox="64 64 896 896" focusable="false" data-icon="share-alt" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M752 664c-28.5 0-54.8 10-75.4 26.7L469.4 540.8a160.68 160.68 0 000-57.6l207.2-149.9C697.2 350 723.5 360 752 360c66.2 0 120-53.8 120-120s-53.8-120-120-120-120 53.8-120 120c0 11.6 1.6 22.7 4.7 33.3L439.9 415.8C410.7 377.1 364.3 352 312 352c-88.4 0-160 71.6-160 160s71.6 160 160 160c52.3 0 98.7-25.1 127.9-63.8l196.8 142.5c-3.1 10.6-4.7 21.8-4.7 33.3 0 66.2 53.8 120 120 120s120-53.8 120-120-53.8-120-120-120zm0-476c28.7 0 52 23.3 52 52s-23.3 52-52 52-52-23.3-52-52 23.3-52 52-52zM312 600c-48.5 0-88-39.5-88-88s39.5-88 88-88 88 39.5 88 88-39.5 88-88 88zm440 236c-28.7 0-52-23.3-52-52s23.3-52 52-52 52 23.3 52 52-23.3 52-52 52z"></path></svg>`,
    }[type];
  }
});
