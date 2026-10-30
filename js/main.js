
(() => {
  const issues = Array.isArray(window.DOSSIER_ISSUES)
    ? window.DOSSIER_ISSUES
    : [];

  const featured = document.querySelector("#featured-issue");
  const archive = document.querySelector("#archive-grid");
  const reader = document.querySelector("#reader");
  const canvas = document.querySelector("#pdf-canvas");
  const ctx = canvas.getContext("2d");

  const pageIndicator = document.querySelector("#page-indicator");
  const prevButton = document.querySelector("#prev-page");
  const nextButton = document.querySelector("#next-page");

  let pdfDocument = null;
  let currentPage = 1;
  let renderTask = null;

  // Display the current date and year
  document.querySelector("#today-date").textContent =
    new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric"
    }).format(new Date());

  document.querySelector("#year").textContent =
    new Date().getFullYear();

  // Open a magazine PDF
  function openIssue(issue) {
    if (!window.pdfjsLib) {
      alert("The PDF reader could not load. Please reload the page.");
      return;
    }

    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    document.querySelector("#reader-title").textContent =
      issue.title.toUpperCase();

    reader.hidden = false;
    reader.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    window.pdfjsLib.getDocument(issue.pdf).promise
      .then(pdf => {
        pdfDocument = pdf;
        currentPage = 1;
        renderPage(currentPage);
      })
      .catch(() => {
        alert(
          "This PDF could not be opened. Check the file path in js/issues.js."
        );
      });
  }

  // Display an individual PDF page
  function renderPage(pageNumber) {
    if (!pdfDocument) return;

    if (renderTask) {
      renderTask.cancel();
    }

    pdfDocument.getPage(pageNumber).then(page => {
      const originalViewport = page.getViewport({ scale: 1 });

      const availableWidth = Math.min(
        700,
        window.innerWidth * 0.72
      );

      const scale = Math.min(
        1.7,
        availableWidth / originalViewport.width
      );

      const viewport = page.getViewport({ scale });
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);

      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform = pixelRatio !== 1
        ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
        : null;

      renderTask = page.render({
        canvasContext: ctx,
        viewport,
        transform
      });

      return renderTask.promise;
    }).then(() => {
      pageIndicator.textContent =
        `PAGE ${currentPage} / ${pdfDocument.numPages}`;

      prevButton.disabled = currentPage <= 1;
      nextButton.disabled =
        currentPage >= pdfDocument.numPages;
    }).catch(error => {
      if (
        error &&
        error.name !== "RenderingCancelledException"
      ) {
        console.error(error);
      }
    });
  }

  // Move between pages
  function changePage(amount) {
    if (!pdfDocument) return;

    const next = currentPage + amount;

    if (next < 1 || next > pdfDocument.numPages) return;

    currentPage = next;
    renderPage(currentPage);
  }

  prevButton.addEventListener("click", () => {
    changePage(-1);
  });

  nextButton.addEventListener("click", () => {
    changePage(1);
  });

  // Close the PDF reader
  document.querySelector("#close-reader")
    .addEventListener("click", () => {
      reader.hidden = true;
      pdfDocument = null;

      document.querySelector("#latest").scrollIntoView({
        behavior: "smooth"
      });
    });

  // Keyboard page navigation
  document.addEventListener("keydown", event => {
    if (reader.hidden) return;

    if (event.key === "ArrowLeft") {
      changePage(-1);
    }

    if (event.key === "ArrowRight") {
      changePage(1);
    }
  });

  // Create an archive card for each older edition
  function makeCard(issue) {
    const card = document.createElement("article");
    card.className = "archive-card";
    card.tabIndex = 0;

    const image = document.createElement("img");
    image.src = issue.cover;
    image.alt = `${issue.title} cover`;

    const title = document.createElement("h3");
    title.textContent = issue.title;

    const date = document.createElement("p");
    date.textContent = issue.date || "";

    card.append(image, title, date);

    card.addEventListener("click", () => {
      openIssue(issue);
    });

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openIssue(issue);
      }
    });

    return card;
  }

  // Populate the latest issue and archive
  if (issues.length > 0) {
    const latest = issues[0];

    featured.innerHTML = "";

    const cover = document.createElement("img");
    cover.className = "featured-cover";
    cover.src = latest.cover;
    cover.alt = `${latest.title} magazine cover`;

    const copy = document.createElement("div");
    copy.className = "featured-copy";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = latest.date || "LATEST EDITION";

    const heading = document.createElement("h2");
    heading.textContent = latest.title;

    const description = document.createElement("p");
    description.textContent =
      latest.description ||
      "Read the latest digital edition of The Dossier Journal.";

    const link = document.createElement("a");
    link.className = "text-link";
    link.href = "#reader";
    link.textContent = "READ THE ISSUE →";

    link.addEventListener("click", event => {
      event.preventDefault();
      openIssue(latest);
    });

    copy.append(eyebrow, heading, description, link);
    featured.append(cover, copy);

    // Add older editions to the archive
    archive.innerHTML = "";

    issues.slice(1).forEach(issue => {
      archive.append(makeCard(issue));
    });

    if (issues.length === 1) {
      const note = document.createElement("p");
      note.className = "empty-state";
      note.textContent =
        "Older editions will appear here as they are published.";

      archive.append(note);
    }
  }
})();
