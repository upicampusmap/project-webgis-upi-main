const navLinks = document.getElementById("navLinks");
const openButton = document.getElementById("openMenu");
const closeButton = document.getElementById("closeMenu");
const mobile = window.matchMedia("(max-width: 700px)");
let menuOpen = false;
function setMenu(open) {
  menuOpen = open;
  navLinks.style.right = open ? "0" : "-200px";
  navLinks.inert = mobile.matches && !open;
  openButton.setAttribute("aria-expanded", String(open));
}
openButton.addEventListener("click", () => { setMenu(true); closeButton.focus(); });
closeButton.addEventListener("click", () => { setMenu(false); openButton.focus(); });
navLinks.addEventListener("click", (event) => {
  if (event.target.closest("a") && mobile.matches) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuOpen) { setMenu(false); openButton.focus(); }
});
mobile.addEventListener("change", () => setMenu(false));
setMenu(false);
