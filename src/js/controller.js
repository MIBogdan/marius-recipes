import * as model from "./model.js";

// Import as URL that Parcel will rewrite to /icons.[hash].svg
import iconsUrl from "url:../img/icons.svg";
import { MODAL_CLOSE_SEC } from "./config.js";
import recipeView from "./views/recipeView.js";
import searchView from "./views/searchView.js";
import resultsView from "./views/resultsView.js";
import paginationView from "./views/paginationView.js";
import bookmarksView from "./views/bookmarksView.js";
import addRecipeView from "./views/addRecipeView.js";

import "core-js/stable";
import "regenerator-runtime/runtime";

// --- ULTRA-ROBUST SPRITE INJECTION & REFRESH ---
(async () => {
  try {
    // 1) Fetch sprite with no-cache to avoid stale/incomplete content on CDNs
    const res = await fetch(iconsUrl, { cache: "no-cache" });
    const svgText = await res.text();

    // 2) Parse into a REAL <svg> element (not innerHTML in a div)
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const spriteEl = svgDoc.documentElement;

    // 3) Hide safely so <use> can resolve (NOT display:none)
    spriteEl.setAttribute("aria-hidden", "true");
    spriteEl.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;");

    // 4) Prepend to <body> BEFORE we touch any <use>
    document.body.prepend(spriteEl);

    // 5) Force every <use> to re-bind AFTER the sprite exists
    const XLINK = "http://www.w3.org/1999/xlink";

    const refreshUses = () => {
      document.querySelectorAll("use").forEach((u) => {
        const val = u.getAttribute("href") || u.getAttribute("xlink:href") || u.getAttributeNS(XLINK, "href") || u.getAttributeNS(XLINK, "xlink:href");

        if (!val) return;

        // Set BOTH modern and legacy attributes to cover all renderers
        u.setAttribute("href", val);
        u.setAttributeNS(XLINK, "xlink:href", val);

        // Nudge the browser to repaint if needed
        // (toggle a non-layout-affecting attribute)
        u.setAttribute("data-refresh", Date.now().toString());
      });
    };

    // Run once now…
    refreshUses();
    // …and again on DOMContentLoaded & load (covers static HTML + view renders)
    window.addEventListener("DOMContentLoaded", refreshUses);
    window.addEventListener("load", refreshUses);
  } catch (e) {
    console.error("Failed to inject/refresh SVG sprite:", e);
  }
})();

// if(module.hot) {
//   module.hot.accept();
// }

///////////////////////////////////////

const controlRecipes = async function () {
  try {
    const id = window.location.hash.slice(1);

    if (!id) return;
    recipeView.renderSpinner();

    // 0) Update results view to mark selected search result
    resultsView.update(model.getSearchResultsPage());

    // 1) Updating Bookmarks View
    bookmarksView.update(model.state.bookmarks);

    // 2) Loading recipe
    await model.loadRecipe(id);

    // 3) Rendering recipe
    recipeView.render(model.state.recipe);
  } catch (err) {
    console.error(err);
    recipeView.renderError();
  }
};

const controlSearchResults = async function () {
  try {
    resultsView.renderSpinner();

    // Get search query
    const query = searchView.getQuery();
    if (!query) return;

    // Load search
    await model.loadSearchResults(`${query}`);

    // Render Results
    // resultsView.render(model.state.search.results);
    resultsView.render(model.getSearchResultsPage());

    // Render initial pagination buttons
    paginationView.render(model.state.search);
  } catch (err) {
    console.error(`${err}`);
  }
};

const controlPagination = function (goToPage) {
  // Render NEW Results
  resultsView.render(model.getSearchResultsPage(goToPage));

  // Render NEW pagination buttons
  paginationView.render(model.state.search);
};

const controlServings = function (newServings) {
  // Update the recipe servings (in state)
  model.updateServings(newServings);

  // Update the recipe view
  // recipeView.render(model.state.recipe);
  recipeView.update(model.state.recipe);
};

const controlAddBookmark = function () {
  // 1) Add/remove bookmark
  if (!model.state.recipe.bookmarked) {
    model.addBookmark(model.state.recipe);
  } else {
    model.deleteBookmark(model.state.recipe.id);
  }

  // 2) Update recipe view
  recipeView.update(model.state.recipe);

  // 3) Render bookmarks
  bookmarksView.render(model.state.bookmarks);
};

const controlBookmarks = function () {
  bookmarksView.render(model.state.bookmarks);
};

const controlAddRecipe = async function (newRecipe) {
  try {
    // Show loading spinner
    addRecipeView.renderSpinner();

    // Upload the new recipe data
    await model.uploadRecipe(newRecipe);
    console.log(model.state.recipe);

    // Render recipe
    recipeView.render(model.state.recipe);

    // Success message
    addRecipeView.renderMessage();

    // Render bookmark view
    bookmarksView.render(model.state.bookmarks);

    // Change ID in URL
    window.history.pushState(null, "", `#${model.state.recipe.id}`);

    // Close form window
    setTimeout(function () {
      addRecipeView.toggleWindow();
    }, MODAL_CLOSE_SEC * 1000);
  } catch (err) {
    console.error(err);
    addRecipeView.renderError(err.message);
  }
};

const init = function () {
  bookmarksView.addHandlerRender(controlBookmarks);
  recipeView.addHandlerRender(controlRecipes);
  recipeView.addHandlerUpdateServings(controlServings);
  recipeView.addHandlerAddBookmark(controlAddBookmark);
  searchView.addHandlerSearch(controlSearchResults);
  paginationView.addHandlerClick(controlPagination);
  addRecipeView.addHandlerUpload(controlAddRecipe);
};

init();
