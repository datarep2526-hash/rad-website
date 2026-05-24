function createMetaItem(label, valueHtml) {
    return `
        <div class="meta-row">
            <div class="meta-label">${label}</div>
            <div class="meta-value">${valueHtml}</div>
        </div>
    `;
}

function createStackedMetaItem(label, valueHtml) {
    return `
        <div class="meta-row stacked">
            <div class="meta-label">${label}</div>
            <div class="meta-value">${valueHtml}</div>
        </div>
    `;
}

function renderChips(items) {
    if (!items || items.length === 0) {
        return '<span class="empty">None</span>';
    }

    const chips = items.map((item) => `<span class="chip">${item}</span>`).join("");
    return `<div class="chips">${chips}</div>`;
}

function renderScreenshots(screenshots) {
    const entries = Object.entries(screenshots || {}).filter(([, link]) => Boolean(link));
    if (entries.length === 0) {
        return '<span class="empty">No screenshots provided</span>';
    }

    const slides = entries
        .map(([name, link], index) => {
            return `
                <figure class="screenshot-item ${index === 0 ? "active" : ""}" data-slide="${index}">
                    <a href="${link}" target="_blank" rel="noopener noreferrer">
                        <div class="screenshot-media">
                            <img src="${link}" alt="Screenshot ${index + 1}: ${name}" loading="lazy" />
                        </div>
                    </a>
                </figure>
            `;
        })
        .join("");

    return `
        <div class="slideshow" data-total-slides="${entries.length}">
            <div class="slideshow-track">
                ${slides}
            </div>
            <div class="slideshow-controls">
                <button type="button" class="slide-btn" data-direction="prev">Prev</button>
                <span class="slide-count">1 / ${entries.length}</span>
                <button type="button" class="slide-btn" data-direction="next">Next</button>
            </div>
        </div>
    `;
}

function wireSlideshow(card) {
    const slideshow = card.querySelector(".slideshow");
    if (!slideshow) return;

    const slides = Array.from(slideshow.querySelectorAll(".screenshot-item"));
    const count = slideshow.querySelector(".slide-count");
    const buttons = Array.from(slideshow.querySelectorAll(".slide-btn"));

    if (slides.length <= 1) {
        buttons.forEach((button) => {
            button.disabled = true;
        });
        return;
    }

    let currentIndex = 0;

    function updateSlide(nextIndex) {
        currentIndex = (nextIndex + slides.length) % slides.length;

        slides.forEach((slide, index) => {
            slide.classList.toggle("active", index === currentIndex);
        });

        if (count) {
            count.textContent = `${currentIndex + 1} / ${slides.length}`;
        }
    }

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const direction = button.dataset.direction;
            updateSlide(direction === "next" ? currentIndex + 1 : currentIndex - 1);
        });
    });
}

async function renderSubmission() {
    const submission = await loadData();

    const card = document.getElementById("submission-card");
    if (!card) return;

    if (!submission) {
        card.innerHTML = '<p class="empty">Invalid or missing submission ID.</p>';
        return;
    }

    const subredditPath = submission.subreddit ? `r/${submission.subreddit}` : "N/A";
    const subredditUrl = submission.subreddit ? `https://www.reddit.com/r/${submission.subreddit}` : "#";

    card.innerHTML = `
        <div class="split-layout">
            <section class="left-panel">
                <h2 class="section-title">Submission Info</h2>
                <div class="meta-list">
                    ${createMetaItem("Subreddit", submission.subreddit ? `<span class="subreddit-link-wrap"><span class="subreddit-icon" aria-hidden="true"></span><a href="${subredditUrl}" target="_blank" rel="noopener noreferrer">${subredditPath}</a></span>` : '<span class="empty">N/A</span>')}
                    ${createMetaItem("Link", `<a href="${submission.url}" target="_blank" rel="noopener noreferrer">Open Submission</a>`)}
                    ${createMetaItem("Type", submission.contentType)}
                    ${createMetaItem("Availability", submission.contentAvailability)}
                    ${createMetaItem("Awards", submission.contentAwards)}
                    ${createStackedMetaItem("Tags", renderChips(submission.tags))}
                    ${createStackedMetaItem("Reddit TOS Violations", renderChips(submission.redditTosViolations))}
                </div>
            </section>

            <section class="right-panel">
                <h2 class="section-title">Screenshots</h2>
                ${renderScreenshots(submission.screenshots)}
            </section>
        </div>
    `;

    wireSlideshow(card);
}

renderSubmission();

function splitCsvChips(value) {
    if (!value) return [];

    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizeSubmission(reportData) {
    if (!reportData || typeof reportData !== "object") {
        return null;
    }

    return {
        status: reportData["Status"] || "",
        subreddit: reportData["Subreddit"] || "",
        url: reportData["URL"] || "",
        contentType: reportData["Content Type"] || "",
        contentAvailability: reportData["Content Availability"] || "",
        contentAwards: reportData["Content Awards"] || "",
        tags: splitCsvChips(reportData["Tags"]),
        redditTosViolations: splitCsvChips(reportData["Reddit TOS Violations"]),
        screenshots: {
            screenshot: reportData["Screenshot"] || "",
            secondScreenshot: reportData["Second Screenshot"] || "",
            thirdScreenshot: reportData["Third Screenshot"] || "",
        },
    };
}

async function loadData() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        return null;
    }

    const res = await fetch('../../parsed_data.json');
    const data = await res.json();

    const reportData = data?.[id];
    return normalizeSubmission(reportData);
}