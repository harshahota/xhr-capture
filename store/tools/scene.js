// Sets up the panel state for a screenshot; scene is picked by the URL hash.
setTimeout(() => {
  const scene = location.hash.slice(1);
  const rows  = document.querySelectorAll("#list .row:not(.header-row)");
  if (scene === "detail") rows[4].click();
  if (scene === "domains") {
    document.getElementById("filter").value = "checkout";
    document.getElementById("filter").dispatchEvent(new Event("input"));
    document.querySelector('#domainList input[value="api.example.com"]').click();
    document.getElementById("domainFilterBtn").click();
    document.querySelectorAll("#list .row:not(.header-row)")[1].click();
    document.querySelector("details.headers").open = true;
    document.getElementById("domainFilterBtn").click();
  }
}, 300);
