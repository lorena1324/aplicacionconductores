/* =========================
   DATOS BASE
========================= */
const USERS = {
  coordinadora: "1234",
  conductor1: "1111",
  conductor2: "2222",
  conductor3: "3333",
  conductor4: "4444"
};

let currentUser = null;
let currentRole = null;

// Inventario diario por fecha
let inventory = {};
// Facturas por conductor
let invoices = {};

/* =========================
   UTILIDADES
========================= */
function today() {
  return new Date().toISOString().split("T")[0];
}

/* =========================
   LOGIN
========================= */
function login() {
  const user = document.getElementById("userSelect").value;
  const pass = document.getElementById("password").value;

  if (!user || !pass) {
    alert("Selecciona usuario y contraseña");
    return;
  }

  if (!USERS[user] || USERS[user] !== pass) {
    alert("Usuario o contraseña incorrectos");
    return;
  }

  currentUser = user;
  currentRole = user === "coordinadora" ? "coordinadora" : "conductor";

  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  document.getElementById("welcome").innerText =
    currentRole === "coordinadora"
      ? "Panel de Coordinadora"
      : `Panel del ${currentUser}`;

  showPanel("dashboard");
}

/* =========================
   LOGOUT
========================= */
function logout() {
  location.reload();
}

/* =========================
   NAVEGACIÓN
========================= */
function showPanel(panelId) {
  const panels = ["dashboard", "inventario", "facturas"];
  panels.forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById(panelId).classList.remove("hidden");

  if (panelId === "inventario") renderInventario();
  if (panelId === "facturas") renderFacturas();
}

/* =========================
   INVENTARIO
========================= */
function renderInventario() {
  const cont = document.getElementById("inventoryList");
  cont.innerHTML = "";

  const date = today();

  // Coordinadora: asigna inventario
  if (currentRole === "coordinadora") {
    cont.innerHTML = `
      <div class="row">
        <select id="invDriver">
          <option value="conductor1">Conductor 1</option>
          <option value="conductor2">Conductor 2</option>
          <option value="conductor3">Conductor 3</option>
          <option value="conductor4">Conductor 4</option>
        </select>
        <input id="invProduct" placeholder="Producto">
        <input id="invQty" type="number" placeholder="Cantidad">
        <button onclick="assignInventory()">Asignar</button>
      </div>
    `;
  } 
  // Conductor: ve su inventario
  else {
    const myInv = inventory[date]?.[currentUser] || {};
    if (Object.keys(myInv).length === 0) {
      cont.innerHTML = "<p>No tienes inventario asignado hoy.</p>";
      return;
    }

    for (let p in myInv) {
      cont.innerHTML += `
        <div class="row">
          <strong>${p}</strong>
          <span>${myInv[p]}</span>
        </div>
      `;
    }
  }
}

function assignInventory() {
  const driver = document.getElementById("invDriver").value;
  const product = document.getElementById("invProduct").value;
  const qty = parseInt(document.getElementById("invQty").value);

  if (!product || qty <= 0) {
    alert("Datos inválidos");
    return;
  }

  const date = today();
  if (!inventory[date]) inventory[date] = {};
  if (!inventory[date][driver]) inventory[date][driver] = {};

  inventory[date][driver][product] =
    (inventory[date][driver][product] || 0) + qty;

  alert("Inventario asignado correctamente");
  document.getElementById("invProduct").value = "";
  document.getElementById("invQty").value = "";
}

/* =========================
   FACTURAS
========================= */
function renderFacturas() {
  const cont = document.getElementById("invoiceList");
  cont.innerHTML = "";

  if (currentRole === "coordinadora") {
    cont.innerHTML = "<p>Las facturas se descargan por conductor.</p>";
    return;
  }

  const list = invoices[currentUser] || [];
  if (list.length === 0) {
    cont.innerHTML = "<p>No hay facturas.</p>";
    return;
  }

  list.forEach((f, i) => {
    cont.innerHTML += `
      <div class="row">
        <span>${f.date} - ${f.negocio}</span>
        <strong>$${f.total}</strong>
      </div>
    `;
  });
}

/* =========================
   DESCARGA (placeholder)
========================= */
function downloadInvoices() {
  alert("Aquí irá la generación de PDF por conductor.");
}
