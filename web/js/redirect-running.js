// Preserve old shared links without keeping a separate running storefront.
const url = new URL("showroom.html", location.href);
url.search = location.search;
url.searchParams.set("category", "Running");
if (["weight", "drop"].includes(url.searchParams.get("order"))) {
  url.searchParams.set("sort", url.searchParams.get("order"));
}
url.searchParams.delete("order");
url.searchParams.delete("view");
location.replace(url.href);
