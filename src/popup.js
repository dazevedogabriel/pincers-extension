const IS_FIREFOX = typeof browser !== "undefined" && typeof browser.runtime?.getBrowserInfo === "function";
const api = IS_FIREFOX ? browser : chrome;
const $ = (id) => document.getElementById(id);

// Keep in sync with DEFAULT_EXTENSIONS in background.js.
const DEFAULT_EXTENSIONS =
  "3gp 7z aac ace aif apk arj asf avi bin bz2 dmg exe gz gzip img iso lzh m4a m4v mkv mov mp3 mp4 mpa mpe mpeg mpg msi msix " +
  "msu ogg ogv pdf plj pps ppt qt r0* r1* ra rar rm rmvb sea sit sitx tar tif tiff wav webm wma wmv xz z zip zst";

function badge(name) {
  const m = /\.([^.]+)$/.exec(name || "");
  return m ? m[1].slice(0, 4).toUpperCase() : "URL";
}

async function load() {
  const s = await api.storage.local.get(["enabled", "send", "extensions", "excluded", "captured", "debugLog"]);
  $("enabled").checked = s.enabled ?? true;
  $("send").checked = s.send ?? true;
  $("extensions").value = s.extensions ?? DEFAULT_EXTENSIONS;
  $("excluded").value = s.excluded ?? "";
  $("log").textContent = (s.debugLog ?? []).slice().reverse().join("\n") || "—";

  const links = (s.captured ?? []).flatMap((e) => e.links).slice(0, 6);
  $("history-empty").hidden = links.length > 0;
  for (const l of links) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="badge"></span><span class="text"><span class="name"></span><span class="url"></span></span><button></button>`;
    li.querySelector("button").textContent = t("copy");
    li.querySelector(".badge").textContent = badge(l.name);
    li.querySelector(".name").textContent = l.name || l.url;
    li.querySelector(".url").textContent = l.url;
    li.querySelector("button").addEventListener("click", async (e) => {
      await navigator.clipboard.writeText(l.url);
      e.target.textContent = t("copied");
    });
    $("history").append(li);
  }
}

function save() {
  api.storage.local.set({
    enabled: $("enabled").checked,
    send: $("send").checked,
    extensions: $("extensions").value.trim(),
    excluded: $("excluded").value.trim(),
  });
}

/** Asks the native host whether Pincers is reachable. The browser starts
 * pincers.exe from the path Pincers registered the last time it opened. */
async function checkHost() {
  try {
    const reply = await api.runtime.sendNativeMessage("com.pincers.host", { type: "ping" });
    if (!reply?.ok) throw new Error();
    $("host").className = "status tall ok";
    $("host-text").textContent = t("popupConnected", reply.version);
  } catch {
    $("host").className = "status tall bad";
    $("host-text").textContent = t("popupNotFound");
    $("host-hint").hidden = false;
  }
}

$("enabled").addEventListener("change", save);
$("send").addEventListener("change", save);
$("extensions").addEventListener("input", save);
$("excluded").addEventListener("input", save);
$("reset").addEventListener("click", () => {
  $("extensions").value = DEFAULT_EXTENSIONS;
  save();
});

load();
checkHost();
