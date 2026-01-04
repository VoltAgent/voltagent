import "./styles.css";

const STORAGE_KEY = "va-new-year-2025-dismissed";
const OVERLAY_ID = "va-new-year-overlay";

function getStorage() {
  try {
    return window.localStorage;
  } catch (_error) {
    return null;
  }
}

function isDismissed(storage) {
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(STORAGE_KEY) === "true";
  } catch (_error) {
    return false;
  }
}

function markDismissed(storage) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, "true");
  } catch (_error) {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }
}

function lockBodyScroll() {
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  return () => {
    document.body.style.overflow = previousOverflow;
  };
}

function createModalElements() {
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "va-new-year-overlay";
  overlay.setAttribute("role", "presentation");

  const modal = document.createElement("div");
  modal.className = "va-new-year-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "va-new-year-title");
  modal.setAttribute("aria-describedby", "va-new-year-message");
  modal.tabIndex = -1;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "va-new-year-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "Close";

  const header = document.createElement("div");
  header.className = "va-new-year-header";

  const headerRow = document.createElement("div");
  headerRow.className = "va-new-year-header-row";

  const title = document.createElement("h2");
  title.id = "va-new-year-title";
  title.className = "va-new-year-title";
  title.textContent = "Happy New Year!";

  const message = document.createElement("p");
  message.id = "va-new-year-message";
  message.className = "va-new-year-message";
  message.textContent = "Thanks to the VoltAgent community for building with us.";

  const subMessage = document.createElement("p");
  subMessage.className = "va-new-year-submessage";
  subMessage.textContent = "We appreciate your support and wish you an amazing year ahead.";

  const videoWrapper = document.createElement("div");
  videoWrapper.className = "va-new-year-video";

  const iframe = document.createElement("iframe");
  iframe.width = "560";
  iframe.height = "315";
  iframe.src = "https://www.youtube.com/embed/TJjPGiQu_Zc?si=e3rrbaXefbqe_294";
  iframe.title = "YouTube video player";
  iframe.frameBorder = "0";
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;

  headerRow.append(title, closeButton);
  header.append(headerRow, message, subMessage);
  videoWrapper.appendChild(iframe);
  modal.append(header, videoWrapper);
  overlay.appendChild(modal);

  return {
    overlay,
    modal,
    closeButton,
  };
}

function showModal() {
  if (document.getElementById(OVERLAY_ID)) {
    return;
  }

  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const storage = getStorage();
  if (isDismissed(storage)) {
    return;
  }

  const { overlay, closeButton } = createModalElements();
  const restoreBodyScroll = lockBodyScroll();

  const closeModal = () => {
    if (!overlay.isConnected) {
      return;
    }

    restoreBodyScroll();
    markDismissed(storage);
    overlay.remove();
    document.removeEventListener("keydown", handleKeydown);
    if (previouslyFocused) {
      previouslyFocused.focus();
    }
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  };

  closeButton.addEventListener("click", closeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });
  document.addEventListener("keydown", handleKeydown);

  document.body.appendChild(overlay);
  closeButton.focus();
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showModal, { once: true });
  } else {
    showModal();
  }
}
