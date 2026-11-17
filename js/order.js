(() => {
  const storageKey = "house-of-icecream-cart";
  const whatsappNumber = "917745036055";
  const main = document.querySelector("main");
  const checkout = document.querySelector("[data-order-form]");
  let cart = [];
  let storageReady = true;

  function getStatusElement() {
    let status = document.querySelector("[data-order-status]");
    if (status || !main || checkout) return status;

    status = document.createElement("p");
    status.className = "order-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.dataset.orderStatus = "";
    const navigation = main.querySelector(".catalog-page-nav, .menu-entry-navigation");
    if (navigation) navigation.insertAdjacentElement("afterend", status);
    else main.prepend(status);
    status.hidden = true;
    return status;
  }

  const statusElement = getStatusElement();

  function showStatus(message, isError) {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.classList.toggle("is-error", Boolean(isError));
    statusElement.hidden = !message;
  }

  function isCartItem(item) {
    return item &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      (item.section === undefined || typeof item.section === "string") &&
      typeof item.option === "string" &&
      Number.isFinite(item.price) &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0;
  }

  function readCart() {
    let stored;
    try {
      stored = localStorage.getItem(storageKey);
    } catch {
      throw new Error("Cart storage is unavailable in this browser.");
    }

    if (stored === null) return [];

    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch {
      throw new Error("Saved cart data is invalid. It was not changed.");
    }

    if (!Array.isArray(parsed) || !parsed.every(isCartItem)) {
      throw new Error("Saved cart data is invalid. It was not changed.");
    }
    return parsed.map((item) => {
      const section = item.section || "";
      const id = `${section.toLocaleLowerCase()}|${item.name.toLocaleLowerCase()}|${item.option.toLocaleLowerCase()}|${item.price}`;
      return { ...item, id, section };
    });
  }

  function saveCart(nextCart) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextCart));
    } catch {
      showStatus("The cart could not be saved. Check browser storage and try again.", true);
      return false;
    }
    return true;
  }

  function cleanName(element) {
    const copy = element.cloneNode(true);
    copy.querySelectorAll(".catalog-marathi, .flavor-marathi").forEach((part) => part.remove());
    return copy.textContent.trim();
  }

  function priceOptions(priceText, labelsText) {
    const labels = labelsText ? labelsText.split("/").map((label) => label.trim()) : [];
    return priceText.split("/").map((part, index) => {
      const match = part.match(/[\d,]+/);
      if (!match) return null;
      return {
        label: labels[index] || (labels.length ? `Option ${index + 1}` : "Regular"),
        price: Number(match[0].replace(/,/g, ""))
      };
    }).filter((option) => option && Number.isFinite(option.price) && option.price > 0);
  }

  function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const countElement = document.querySelector("[data-cart-count]");
    if (countElement) countElement.textContent = String(count);
    const link = document.querySelector("[data-cart-link]");
    if (link) link.setAttribute("aria-label", `View order, ${count} item${count === 1 ? "" : "s"}`);
  }

  function createCartLink() {
    if (!main || checkout || document.querySelector("[data-cart-link]")) return;
    const dock = document.createElement("div");
    dock.className = "order-cart-dock";

    const hint = document.createElement("span");
    hint.className = "order-cart-hint";
    hint.lang = "mr";
    hint.textContent = "तुम्ही जोडलेले पदार्थ कार्टमध्ये जाऊन ऑर्डर करा";

    const link = document.createElement("a");
    link.className = "order-cart-link";
    link.href = "order.html";
    link.dataset.cartLink = "";
    link.setAttribute("aria-label", "View your order");

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.classList.add("order-cart-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");

    const trolley = document.createElementNS("http://www.w3.org/2000/svg", "path");
    trolley.setAttribute("d", "M2.5 3.5h2l2.3 11.2c.2.9 1 1.5 1.9 1.5h9.1c.9 0 1.7-.6 1.9-1.5L22 7H6");
    icon.append(trolley);

    const firstWheel = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    firstWheel.setAttribute("cx", "9");
    firstWheel.setAttribute("cy", "20");
    firstWheel.setAttribute("r", "1.5");
    icon.append(firstWheel);

    const secondWheel = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    secondWheel.setAttribute("cx", "18");
    secondWheel.setAttribute("cy", "20");
    secondWheel.setAttribute("r", "1.5");
    icon.append(secondWheel);

    link.append(icon, document.createTextNode("Cart "));

    const count = document.createElement("span");
    count.className = "order-cart-count";
    count.dataset.cartCount = "";
    count.textContent = "0";
    link.append(count);

    dock.append(hint, link);
    document.body.append(dock);
  }

  function addToCart(name, section, option) {
    const id = `${section.toLocaleLowerCase()}|${name.toLocaleLowerCase()}|${option.label.toLocaleLowerCase()}|${option.price}`;
    const existing = cart.find((item) => item.id === id);
    const nextCart = existing
      ? cart.map((item) => item.id === id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cart, { id, name, section, option: option.label, price: option.price, quantity: 1 }];

    if (!saveCart(nextCart)) return;
    cart = nextCart;
    updateCartCount();
    showStatus(`${name} added to your order.`);
  }

  function createOrderControls(row, name, section, options, priceElement) {
    if (!name || options.length === 0) {
      showStatus("An item is missing its name or price, so it cannot be ordered.", true);
      return;
    }

    row.classList.add("orderable-row");
    const actions = document.createElement("div");
    actions.className = "order-actions";

    if (options.length > 1) {
      if (priceElement) priceElement.remove();
      const select = document.createElement("select");
      select.className = "order-option";
      select.setAttribute("aria-label", `Choose size for ${name}`);
      options.forEach((option, index) => {
        const choice = document.createElement("option");
        choice.value = String(index);
        choice.textContent = `${option.label} — ₹${option.price}`;
        select.append(choice);
      });
      actions.append(select);
    } else if (priceElement) {
      actions.append(priceElement);
    } else {
      const price = document.createElement("span");
      price.className = "catalog-price";
      price.textContent = `₹${options[0].price}`;
      actions.append(price);
    }

    if (row.hasAttribute("data-unavailable")) {
      const mark = document.createElement("span");
      mark.className = "unavailable-mark";
      mark.setAttribute("role", "img");
      mark.setAttribute("aria-label", "Currently unavailable");
      mark.title = "Currently unavailable";
      mark.textContent = "×";
      actions.append(mark);
      row.append(actions);
      return;
    }

    const button = document.createElement("button");
    button.className = "add-to-order";
    button.type = "button";
    button.textContent = "Add +";
    button.setAttribute("aria-label", `Add ${name} to your order`);
    button.disabled = !storageReady;
    button.addEventListener("click", () => {
      const select = actions.querySelector("select");
      const option = options[select ? Number(select.value) : 0];
      addToCart(name, section, option);
    });
    actions.append(button);
    row.append(actions);
  }

  function initializeCatalogRows() {
    document.querySelectorAll(".catalog-row").forEach((row) => {
      if (row.classList.contains("orderable-row")) return;
      const nameElement = row.querySelector(".catalog-name");
      const priceElement = row.querySelector(".catalog-price");
      const category = row.closest(".catalog-category");
      const labels = category?.querySelector(".catalog-prices")?.innerText.replace(/\s+/g, " ").trim();
      const heading = category?.querySelector("h2") || document.querySelector(".catalog-title h1, .flavor-heading h1");
      const section = heading ? cleanName(heading) : "";
      const name = nameElement ? cleanName(nameElement) : "";
      const sectionLabel = section && name.toLocaleLowerCase().includes(section.toLocaleLowerCase()) ? "" : section;
      const options = priceElement ? priceOptions(priceElement.innerText, labels) : [];
      createOrderControls(row, name, sectionLabel, options, priceElement);
    });
  }

  function initializeFlavorRows() {
    const header = document.querySelector(".flavor-columns");
    if (!header) return;

    const labels = Array.from(header.children).slice(1).map((cell) => cell.innerText.replace(/\s+/g, " ").trim());
    header.classList.add("orderable-columns");
    if (header.children.length > 2) header.children[2].remove();
    if (header.children[1]) header.children[1].textContent = "Price / size";

    document.querySelectorAll(".flavor-row").forEach((row) => {
      if (row.classList.contains("orderable-row")) return;
      const cells = Array.from(row.children);
      const nameElement = cells[0];
      const priceCells = cells.slice(1);
      const options = priceCells.flatMap((cell, index) => priceOptions(cell.innerText, labels[index]));
      const displayPrice = document.createElement("span");
      displayPrice.className = "catalog-price";
      displayPrice.textContent = options.map((option) => `₹${option.price}`).join(" / ");
      priceCells.forEach((cell) => cell.remove());
      createOrderControls(row, cleanName(nameElement), "Season Reason", options, displayPrice);
    });
  }

  function formatPrice(amount) {
    return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
  }

  function renderCheckout() {
    const list = document.querySelector("[data-order-items]");
    const empty = document.querySelector("[data-order-empty]");
    const totalElement = document.querySelector("[data-order-total]");
    const submit = document.querySelector("[data-order-submit]");
    if (!list || !empty || !totalElement || !submit) return;

    list.replaceChildren();
    empty.hidden = cart.length > 0;
    submit.disabled = cart.length === 0;
    let total = 0;

    cart.forEach((item) => {
      total += item.price * item.quantity;
      const row = document.createElement("li");
      row.className = "order-summary-row";

      const details = document.createElement("div");
      details.className = "order-summary-details";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const option = document.createElement("span");
      option.textContent = `${item.section ? `${item.section} · ` : ""}${item.option} · ${formatPrice(item.price)} each`;
      details.append(name, option);

      const controls = document.createElement("div");
      controls.className = "order-summary-controls";
      const decrement = document.createElement("button");
      decrement.type = "button";
      decrement.dataset.cartAction = "decrease";
      decrement.dataset.itemId = item.id;
      decrement.setAttribute("aria-label", `Decrease ${item.name} quantity`);
      decrement.textContent = "−";
      const quantity = document.createElement("span");
      quantity.textContent = String(item.quantity);
      const increment = document.createElement("button");
      increment.type = "button";
      increment.dataset.cartAction = "increase";
      increment.dataset.itemId = item.id;
      increment.setAttribute("aria-label", `Increase ${item.name} quantity`);
      increment.textContent = "+";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "order-remove";
      remove.dataset.cartAction = "remove";
      remove.dataset.itemId = item.id;
      remove.textContent = "Remove";
      controls.append(decrement, quantity, increment, remove);
      row.append(details, controls);
      list.append(row);
    });

    totalElement.textContent = formatPrice(total);
    updateCartCount();
  }

  function handleCartAction(event) {
    const button = event.target.closest("button[data-cart-action]");
    if (!button) return;
    const item = cart.find((entry) => entry.id === button.dataset.itemId);
    if (!item) return;

    let nextCart;
    if (button.dataset.cartAction === "remove") {
      nextCart = cart.filter((entry) => entry.id !== item.id);
    } else if (button.dataset.cartAction === "increase") {
      nextCart = cart.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry);
    } else {
      nextCart = cart.map((entry) => entry.id === item.id ? { ...entry, quantity: Math.max(1, entry.quantity - 1) } : entry);
    }

    if (!saveCart(nextCart)) return;
    cart = nextCart;
    showStatus("Your order has been updated.");
    renderCheckout();
  }

  function setupCheckout() {
    const list = document.querySelector("[data-order-items]");
    if (!list) return;
    list.addEventListener("click", handleCartAction);

    checkout.addEventListener("submit", (event) => {
      event.preventDefault();
      if (cart.length === 0) {
        showStatus("Add an item before placing your order.", true);
        return;
      }

      const formData = new FormData(checkout);
      const customer = String(formData.get("customerName") || "").trim();
      const phone = String(formData.get("customerPhone") || "").trim();
      if (formData.get("orderConfirmation") !== "yes") {
        showStatus("Confirm your order details before continuing.", true);
        return;
      }

      const lines = cart.map((item) => `• ${item.quantity} × ${item.section ? `${item.section}: ` : ""}${item.name} (${item.option}) — ${formatPrice(item.price * item.quantity)}`);
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const message = [
        "New ice cream order",
        `Customer: ${customer}`,
        `Phone: ${phone}`,
        "",
        ...lines,
        "",
        `Total: ${formatPrice(total)}`
      ].filter(Boolean).join("\n");
      window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    });

    renderCheckout();
  }

  try {
    cart = readCart();
  } catch (error) {
    storageReady = false;
    showStatus(error.message, true);
  }

  createCartLink();
  initializeCatalogRows();
  initializeFlavorRows();
  updateCartCount();
  setupCheckout();

  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey) return;
    try {
      cart = readCart();
      renderCheckout();
      updateCartCount();
    } catch (error) {
      showStatus(error.message, true);
    }
  });
})();
