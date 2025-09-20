import * as model from "./model.js";

// Import as URL that Parcel will rewrite to /icons.[hash].svg
// import iconsUrl from "url:../img/icons.svg";
import { MODAL_CLOSE_SEC } from "./config.js";
import recipeView from "./views/recipeView.js";
import searchView from "./views/searchView.js";
import resultsView from "./views/resultsView.js";
import paginationView from "./views/paginationView.js";
import bookmarksView from "./views/bookmarksView.js";
import addRecipeView from "./views/addRecipeView.js";

import "core-js/stable";
import "regenerator-runtime/runtime";

const iconsUrl = "/icons.svg";

(async () => {
  try {
    const res = await fetch(iconsUrl, { cache: "no-cache" });
    const svgText = await res.text();

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const spriteEl = svgDoc.documentElement;

    // Keep it resolvable by <use>, but hidden
    spriteEl.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    spriteEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    spriteEl.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    document.body.prepend(spriteEl);
  } catch (e) {
    console.error("SVG sprite inject failed:", e);
  }
})();

const uploadFormEl = document.querySelector(".upload");
const UPLOAD_DEFAULT_HTML = uploadFormEl.innerHTML;


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

    // // Close form window
    // setTimeout(function () {
    //   addRecipeView.toggleWindow();
    // }, MODAL_CLOSE_SEC * 1000);

    // schedule auto-close
    const autoId = setTimeout(() => {
      // guard: only close if still open
      const win = document.querySelector(".add-recipe-window");
      if (win && !win.classList.contains("hidden")) addRecipeView.toggleWindow();
    }, MODAL_CLOSE_SEC * 1000);

    // cancel auto-close if user closes manually
    [".btn--close-modal", ".overlay"].forEach((sel) => {
      document.querySelector(sel)?.addEventListener(
        "click",
        () => clearTimeout(autoId),
        { once: true } // listener removes itself
      );
    });
  } catch (err) {
    console.error(err);
    addRecipeView.renderError(err.message);
  }
};

// whenever the Add Recipe button is clicked, restore the form markup
document.querySelector(".nav__btn--add-recipe").addEventListener("click", () => {
  uploadFormEl.innerHTML = UPLOAD_DEFAULT_HTML;
  uploadFormEl.reset?.();
});

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
