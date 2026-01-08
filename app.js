/* =========================
   DATOS BASE
========================= */
const USERS = {
  coordinadora: "1234",
  conductor1: "1111",
  conductor2: "2222",
  conductor3: "3333",
  conductor4: "4444",
};

let currentUser = null;
let currentRole = null;

// Inventario diario por fecha
let inventory = {};
// Facturas por conductor
let invoices = {};
// Movimientos de productos (registro histórico)
let movements = [];
// Catálogo de productos
let productsCatalog = [];
// Timestamp para sincronización en tiempo real
let lastSyncTimestamp = Date.now();

/* =========================
   LOCALSTORAGE
========================= */
function loadData() {
  const savedInventory = localStorage.getItem("inventory");
  const savedInvoices = localStorage.getItem("invoices");
  const savedMovements = localStorage.getItem("movements");
  const savedTimestamp = localStorage.getItem("lastSyncTimestamp");

  if (savedInventory) inventory = JSON.parse(savedInventory);
  if (savedInvoices) invoices = JSON.parse(savedInvoices);
  if (savedMovements) movements = JSON.parse(savedMovements);
  if (savedTimestamp) lastSyncTimestamp = parseInt(savedTimestamp);
}

function saveData() {
  lastSyncTimestamp = Date.now();
  localStorage.setItem("inventory", JSON.stringify(inventory));
  localStorage.setItem("invoices", JSON.stringify(invoices));
  localStorage.setItem("movements", JSON.stringify(movements));
  localStorage.setItem("lastSyncTimestamp", lastSyncTimestamp.toString());

  // Disparar evento personalizado para sincronización entre pestañas
  window.dispatchEvent(
    new CustomEvent("dataUpdated", {
      detail: { timestamp: lastSyncTimestamp },
    })
  );
}

/* =========================
   CARGAR PRODUCTOS JSON
========================= */
async function loadProductsCatalog() {
  try {
    const response = await fetch("productos.json");
    const data = await response.json();

    // Crear lista unificada de productos
    const productsMap = new Map();

    // Recorrer todas las categorías
    Object.keys(data).forEach((categoria) => {
      const productos = data[categoria];

      productos.forEach((producto) => {
        // Filtrar productos inválidos (TOTAL, sin artículo, etc.)
        if (
          !producto.articulo ||
          producto.articulo === "TOTAL" ||
          typeof producto.articulo !== "number"
        ) {
          return;
        }

        const key = `${producto.articulo}_${producto.descripcion}`;

        // Si el producto no existe o queremos mantener el primero encontrado
        if (!productsMap.has(key)) {
          const uom = producto.UOM || producto.Uom || "UND";
          const precio = producto.Precios || producto.precio || 0;

          productsMap.set(key, {
            codigo: producto.articulo,
            descripcion: producto.descripcion.trim(),
            unidad: uom,
            precio: precio,
            categoria: categoria,
          });
        }
      });
    });

    productsCatalog = Array.from(productsMap.values());
    productsCatalog.sort((a, b) => a.descripcion.localeCompare(b.descripcion));

    // Guardar catálogo en localStorage
    localStorage.setItem("productsCatalog", JSON.stringify(productsCatalog));

    return productsCatalog;
  } catch (error) {
    console.error("Error cargando productos:", error);
    // Intentar cargar desde localStorage si existe
    const saved = localStorage.getItem("productsCatalog");
    if (saved) {
      productsCatalog = JSON.parse(saved);
      return productsCatalog;
    }
    return [];
  }
}

// Cargar datos al iniciar
loadData();

// Cargar catálogo de productos al iniciar
let productsCatalogLoaded = false;
document.addEventListener("DOMContentLoaded", async () => {
  if (!productsCatalogLoaded) {
    await loadProductsCatalog();
    productsCatalogLoaded = true;
  }
});

/* =========================
   UTILIDADES
========================= */
function today() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* =========================
   LOGIN
========================= */
async function login() {
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
      ? "Panel de Coordinadora - Gestión y Supervisión del Sistema"
      : `Panel del ${currentUser}`;

  // Cargar productos si aún no están cargados
  if (productsCatalog.length === 0) {
    await loadProductsCatalog();
  }

  // Configurar navegación según rol
  if (currentRole === "coordinadora") {
    setupCoordinatorNavigation();
  } else {
    setupDriverNavigation();
  }

  // Iniciar sincronización en tiempo real
  startRealtimeSync();

  // Mostrar panel según el rol
  if (currentRole === "coordinadora") {
    showSection("dashboard");
  } else {
    // Conductores van directamente al inventario
    showSection("inventario");
  }
}

function setupCoordinatorNavigation() {
  // Mostrar botones de coordinadora
  const coordinatorBtns = document.querySelectorAll(".coordinator-only");
  coordinatorBtns.forEach((btn) => btn.classList.remove("hidden"));

  // Ocultar botón de ventas (coordinadora no vende)
  const ventasBtn = document.getElementById("ventasBtn");
  if (ventasBtn) ventasBtn.style.display = "none";

  // Cambiar texto del botón de inventario
  const btnInventario = document.getElementById("btnInventario");
  if (btnInventario) btnInventario.textContent = "Asignar Inventario";

  // Actualizar título del rol
  const roleTitle = document.getElementById("roleTitle");
  if (roleTitle) roleTitle.textContent = "Coordinadora";
}

function setupDriverNavigation() {
  // Ocultar botones de coordinadora
  const coordinatorBtns = document.querySelectorAll(".coordinator-only");
  coordinatorBtns.forEach((btn) => btn.classList.add("hidden"));

  // Ocultar botón de Panel para conductores
  const btnDashboard = document.getElementById("btnDashboard");
  if (btnDashboard) btnDashboard.classList.add("hidden");

  // Ocultar paneles solo de coordinadora
  const coordinatorPanels = [
    "gestionInventario",
    "controlMovimientos",
    "supervisionVentas",
  ];
  coordinatorPanels.forEach((id) => {
    const panel = document.getElementById(id);
    if (panel) panel.classList.add("hidden");
  });

  // Ocultar panel de dashboard para conductores
  const dashboardPanel = document.getElementById("dashboard");
  if (dashboardPanel) dashboardPanel.classList.add("hidden");

  // Actualizar título del rol
  const roleTitle = document.getElementById("roleTitle");
  const driverName = currentUser.replace("conductor", "Conductor ");
  if (roleTitle) roleTitle.textContent = driverName;
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
function showSection(panelId) {
  // Paneles comunes
  const commonPanels = ["dashboard", "inventario", "ventas", "facturas"];
  // Paneles solo para coordinadora
  const coordinatorPanels = [
    "gestionInventario",
    "controlMovimientos",
    "supervisionVentas",
  ];

  const allPanels = [...commonPanels, ...coordinatorPanels];

  allPanels.forEach((id) => {
    const panel = document.getElementById(id);
    if (panel) panel.classList.add("hidden");
  });

  const targetPanel = document.getElementById(panelId);
  if (targetPanel) targetPanel.classList.remove("hidden");

  // Renderizar contenido según el panel
  if (panelId === "inventario") renderInventario();
  if (panelId === "facturas") renderFacturas();
  if (panelId === "ventas") renderVentas();
  if (panelId === "gestionInventario") renderGestionInventario();
  if (panelId === "controlMovimientos") renderControlMovimientos();
  if (panelId === "supervisionVentas") renderSupervisionVentas();
}

function showPanel(panelId) {
  showSection(panelId);
}

/* =========================
   INVENTARIO
========================= */
function renderInventario() {
  const cont = document.getElementById("inventoryList");
  if (!cont) return;

  cont.innerHTML = "";

  const date = today();

  // Coordinadora: asigna inventario con productos del catálogo
  if (currentRole === "coordinadora") {
    cont.innerHTML = `
      <div class="assign-inventory-section">
        <h4>Asignar Inventario Diario</h4>
        <div class="inventory-assignment-form">
          <div class="form-row">
            <label>Conductor:</label>
            <select id="invDriver" class="form-select">
          <option value="conductor1">Conductor 1</option>
          <option value="conductor2">Conductor 2</option>
          <option value="conductor3">Conductor 3</option>
          <option value="conductor4">Conductor 4</option>
        </select>
          </div>
          <div class="form-row">
            <label>Producto:</label>
            <select id="invProduct" class="form-select product-select">
              <option value="">Seleccionar producto...</option>
              ${productsCatalog
                .map(
                  (p) =>
                    `<option value="${p.descripcion}" data-codigo="${
                      p.codigo
                    }" data-precio="${p.precio}" data-unidad="${p.unidad}">
                  ${p.descripcion} (${p.unidad}) - $${
                      p.precio?.toLocaleString() || "N/A"
                    }
                </option>`
                )
                .join("")}
            </select>
          </div>
          <div class="form-row">
            <label>Cantidad:</label>
            <input id="invQty" type="number" min="1" placeholder="Cantidad" class="form-input">
          </div>
          <button onclick="assignInventory()" class="btn-primary">Asignar Producto</button>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <h4>Asignación Rápida por Conductor</h4>
          <p style="color: #64748b; margin-bottom: 15px;">Selecciona un conductor y crea su inventario completo del día:</p>
          <div class="quick-assign-section">
            <select id="quickAssignDriver" class="form-select" style="max-width: 250px; margin-bottom: 15px;">
              <option value="">Seleccionar conductor...</option>
              <option value="conductor1">Conductor 1</option>
              <option value="conductor2">Conductor 2</option>
              <option value="conductor3">Conductor 3</option>
              <option value="conductor4">Conductor 4</option>
            </select>
            <button onclick="openQuickAssignModal()" class="btn-primary">Crear Inventario del Día</button>
          </div>
        </div>
      </div>
      <div class="today-inventory-summary" style="margin-top: 30px;">
        <h4>Resumen de Inventario del Día (${formatDate(date)})</h4>
        ${renderTodayInventorySummary()}
      </div>
    `;
  }
  // Conductor: ve su inventario y puede generar factura
  else {
    const myInv = inventory[date]?.[currentUser] || {};
    if (Object.keys(myInv).length === 0) {
      cont.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <p style="color: #64748b; font-size: 16px; margin-bottom: 20px;">No tienes inventario asignado hoy.</p>
          <p style="color: #94a3b8; font-size: 14px;">Contacta a la coordinadora para recibir tu inventario del día.</p>
        </div>
      `;
      return;
    }

    // Calcular total de productos
    const totalProducts = Object.keys(myInv).length;
    const totalQty = Object.values(myInv).reduce((sum, qty) => sum + qty, 0);

    cont.innerHTML = `
      <div class="driver-inventory-header">
        <div>
          <h3>Mi Inventario del Día</h3>
          <p style="color: #64748b; margin-top: 5px;">${formatDate(date)}</p>
        </div>
        <div class="inventory-stats">
          <div class="stat-item">
            <span class="stat-label">Productos:</span>
            <span class="stat-value">${totalProducts}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Unidades:</span>
            <span class="stat-value">${totalQty}</span>
          </div>
        </div>
      </div>

      <div class="inventory-items-list" style="margin-top: 25px;">
        <div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr;">
          <span>Producto</span>
          <span>Cantidad Asignada</span>
          <span>Cantidad Disponible</span>
          <span>Acción</span>
        </div>
        ${Object.keys(myInv)
          .map((product, index) => {
            const qty = myInv[product];
            // Buscar información del producto en el catálogo
            const productInfo = productsCatalog.find(
              (p) => p.descripcion === product
            );
            const precio = productInfo?.precio || 0;

            return `
            <div class="inventory-item-row" data-product="${product}" data-index="${index}">
              <span class="product-name">
                <strong>${product}</strong>
                ${
                  productInfo
                    ? `<span class="product-meta">(${
                        productInfo.unidad
                      } - $${precio.toLocaleString()})</span>`
                    : ""
                }
              </span>
              <span class="qty-assigned">${qty}</span>
              <span class="qty-available" id="available-${index}">${qty}</span>
              <span class="action-buttons">
                <button onclick="addToInvoice('${product}', ${index}, ${precio})" 
                        class="btn-add-invoice" 
                        title="Agregar a factura">
                  ➕ Agregar
                </button>
              </span>
            </div>
          `;
          })
          .join("")}
      </div>

      <div class="invoice-section" style="margin-top: 30px; padding-top: 25px; border-top: 2px solid #e2e8f0;">
        <h4>Generar Factura</h4>
        <div class="invoice-form">
          <div class="form-row" style="margin-bottom: 15px;">
            <label style="min-width: 120px;">Nombre del Negocio:</label>
            <input id="businessNameInvoice" placeholder="Ingresa el nombre del negocio" 
                   class="form-input" style="flex: 1;">
          </div>
          
          <div id="invoiceItemsList" class="invoice-items-preview">
            <p style="color: #64748b; text-align: center; padding: 20px;">
              No hay productos agregados a la factura. Usa el botón "➕ Agregar" para agregar productos.
            </p>
          </div>

          <div class="invoice-total-section" style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 style="margin: 0;">Total:</h4>
              <span id="invoiceTotalAmount" style="font-size: 24px; font-weight: 700; color: #10b981;">$0</span>
            </div>
          </div>

          <button onclick="finalizeInvoiceFromInventory()" 
                  id="generateInvoiceBtn" 
                  class="btn-primary" 
                  style="margin-top: 20px; width: 100%; padding: 15px; font-size: 16px;"
                  disabled>
            Generar Factura
          </button>
        </div>
        </div>
      `;
  }
}

function renderTodayInventorySummary() {
  const date = today();
  const drivers = ["conductor1", "conductor2", "conductor3", "conductor4"];
  let summaryHTML = "";

  drivers.forEach((driver) => {
    const driverInv = inventory[date]?.[driver] || {};
    const driverName = driver.replace("conductor", "Conductor ");
    const totalItems = Object.keys(driverInv).length;
    const totalQty = Object.values(driverInv).reduce(
      (sum, qty) => sum + qty,
      0
    );

    summaryHTML += `
      <div class="summary-row" style="padding: 15px; background: #f8fafc; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #2563eb;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #1e293b;">${driverName}</strong>
            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 13px;">${totalItems} productos | ${totalQty} unidades totales</p>
          </div>
          <button onclick="showSection('gestionInventario')" class="btn-primary" style="padding: 8px 16px; font-size: 13px;">Ver Detalles</button>
        </div>
      </div>
    `;
  });

  if (summaryHTML === "") {
    return "<p style='padding: 20px; text-align: center; color: #64748b;'>No hay inventario asignado hoy.</p>";
  }

  return summaryHTML;
}

function assignInventory() {
  const driver = document.getElementById("invDriver")?.value;
  const productSelect = document.getElementById("invProduct");
  const qty = parseInt(document.getElementById("invQty")?.value);

  // Validar conductor
  if (!driver) {
    alert("Por favor selecciona un conductor");
    return;
  }

  // Validar que el selector de productos exista
  if (!productSelect) {
    alert(
      "Error: No se encontró el selector de productos. Por favor recarga la página."
    );
    return;
  }

  // Obtener producto según el tipo de elemento (select o input)
  let product = "";
  let codigo = "";
  let precio = 0;

  if (productSelect.tagName === "SELECT") {
    // Es un select - validar que haya una opción seleccionada
    const selectedIndex = productSelect.selectedIndex;
    if (selectedIndex < 0 || selectedIndex >= productSelect.options.length) {
      alert("Por favor selecciona un producto");
      return;
    }

    const selectedOption = productSelect.options[selectedIndex];
    product = selectedOption?.value || "";

    if (!product || product === "") {
      alert("Por favor selecciona un producto válido");
      return;
    }

    // Obtener información adicional del producto
    codigo = selectedOption?.dataset?.codigo || "";
    precio = parseFloat(selectedOption?.dataset?.precio || 0);
  } else if (productSelect.tagName === "INPUT") {
    // Es un input (versión antigua) - obtener el valor del input
    product = productSelect.value?.trim() || "";
    if (!product) {
      alert("Por favor ingresa un producto");
      return;
    }
  } else {
    alert("Error: El elemento de producto no es válido");
    return;
  }

  // Validar cantidad
  if (!qty || qty <= 0 || isNaN(qty)) {
    alert("Por favor ingresa una cantidad válida mayor a cero");
    return;
  }

  const date = today();
  if (!inventory[date]) inventory[date] = {};
  if (!inventory[date][driver]) inventory[date][driver] = {};

  const previousQty = inventory[date][driver][product] || 0;
  inventory[date][driver][product] = previousQty + qty;

  // Registrar movimiento
  movements.push({
    date: date,
    type: "asignacion",
    driver: driver,
    product: product,
    codigo: codigo,
    precio: precio,
    quantity: qty,
    previousQuantity: previousQty,
    newQuantity: inventory[date][driver][product],
    timestamp: new Date().toISOString(),
  });

  saveData();
  alert(
    `✓ ${qty} unidades de "${product}" asignadas a ${driver.replace(
      "conductor",
      "Conductor "
    )}`
  );

  // Limpiar formulario
  if (productSelect.tagName === "SELECT") {
    productSelect.selectedIndex = 0;
  } else if (productSelect.tagName === "INPUT") {
    productSelect.value = "";
  }
  const qtyInput = document.getElementById("invQty");
  if (qtyInput) qtyInput.value = "";

  renderInventario();
  if (
    document.getElementById("gestionInventario") &&
    !document.getElementById("gestionInventario").classList.contains("hidden")
  ) {
    renderGestionInventario();
  }
}

/* =========================
   GESTIÓN DE INVENTARIO (COORDINADORA)
========================= */
function renderGestionInventario() {
  const cont = document.getElementById("gestionInventarioContent");
  if (!cont) return;

  cont.innerHTML = "";

  const date = today();
  const drivers = ["conductor1", "conductor2", "conductor3", "conductor4"];

  drivers.forEach((driver) => {
    const driverInv = inventory[date]?.[driver] || {};
    const driverName = driver.replace("conductor", "Conductor ");

    cont.innerHTML += `
      <div class="driver-inventory-card">
        <h4>${driverName}</h4>
        <div class="inventory-table">
          <div class="table-header">
            <span>Producto</span>
            <span>Cantidad</span>
            <span>Acciones</span>
          </div>
          <div id="inventory-${driver}">
            ${
              Object.keys(driverInv).length === 0
                ? '<div class="table-row"><span colspan="3" style="text-align: center; padding: 20px; color: #64748b;">Sin inventario asignado</span></div>'
                : Object.keys(driverInv)
                    .map(
                      (product) => `
                <div class="table-row" data-driver="${driver}" data-product="${product}">
                  <span>${product}</span>
                  <span><input type="number" value="${driverInv[product]}" class="qty-input" onchange="updateInventoryQty('${driver}', '${product}', this.value)"></span>
                  <span>
                    <button onclick="deleteInventoryItem('${driver}', '${product}')" class="btn-delete">Eliminar</button>
                  </span>
                </div>
              `
                    )
                    .join("")
            }
          </div>
        </div>
      </div>
    `;
  });
}

function updateInventoryQty(driver, product, newQty) {
  const qty = parseInt(newQty);
  if (isNaN(qty) || qty < 0) {
    alert("Cantidad inválida");
    renderGestionInventario();
    return;
  }

  const date = today();
  if (!inventory[date]) inventory[date] = {};
  if (!inventory[date][driver]) inventory[date][driver] = {};

  const previousQty = inventory[date][driver][product] || 0;
  const difference = qty - previousQty;

  if (qty === 0) {
    delete inventory[date][driver][product];
    if (Object.keys(inventory[date][driver]).length === 0) {
      delete inventory[date][driver];
    }
  } else {
    inventory[date][driver][product] = qty;
  }

  // Registrar movimiento
  movements.push({
    date: date,
    type: "modificacion",
    driver: driver,
    product: product,
    quantity: difference,
    previousQuantity: previousQty,
    newQuantity: qty,
    timestamp: new Date().toISOString(),
  });

  saveData();
  renderGestionInventario();
}

function deleteInventoryItem(driver, product) {
  if (!confirm(`¿Eliminar ${product} del inventario de ${driver}?`)) return;

  const date = today();
  const previousQty = inventory[date]?.[driver]?.[product] || 0;

  if (inventory[date] && inventory[date][driver]) {
    delete inventory[date][driver][product];
    if (Object.keys(inventory[date][driver]).length === 0) {
      delete inventory[date][driver];
    }
  }

  // Registrar movimiento
  movements.push({
    date: date,
    type: "eliminacion",
    driver: driver,
    product: product,
    quantity: -previousQty,
    previousQuantity: previousQty,
    newQuantity: 0,
    timestamp: new Date().toISOString(),
  });

  saveData();
  renderGestionInventario();
}

/* =========================
   CONTROL DE MOVIMIENTOS (COORDINADORA)
========================= */
function renderControlMovimientos() {
  const cont = document.getElementById("controlMovimientosContent");
  if (!cont) return;

  // Guardar valores de filtros actuales antes de re-renderizar
  const currentDriver = document.getElementById("filterDriver")?.value || "";
  const currentDate = document.getElementById("filterDate")?.value || "";
  const currentProduct = document.getElementById("filterProduct")?.value || "";

  cont.innerHTML = `
    <div class="filter-bar">
      <select id="filterDriver" onchange="renderControlMovimientos()">
        <option value="">Todos los conductores</option>
        <option value="conductor1" ${
          currentDriver === "conductor1" ? "selected" : ""
        }>Conductor 1</option>
        <option value="conductor2" ${
          currentDriver === "conductor2" ? "selected" : ""
        }>Conductor 2</option>
        <option value="conductor3" ${
          currentDriver === "conductor3" ? "selected" : ""
        }>Conductor 3</option>
        <option value="conductor4" ${
          currentDriver === "conductor4" ? "selected" : ""
        }>Conductor 4</option>
      </select>
      <select id="filterDate" onchange="renderControlMovimientos()">
        <option value="">Todas las fechas</option>
        <option value="${today()}" ${
    currentDate === today() ? "selected" : ""
  }>Hoy</option>
      </select>
      <input type="text" id="filterProduct" placeholder="Filtrar por producto" value="${currentProduct}" onkeyup="renderControlMovimientos()">
    </div>
    <div class="movements-table">
      <div class="table-header">
        <span>Fecha</span>
        <span>Hora</span>
        <span>Conductor</span>
        <span>Tipo</span>
        <span>Producto</span>
        <span>Cantidad</span>
        <span>Antes</span>
        <span>Después</span>
      </div>
      <div id="movementsList"></div>
    </div>
  `;

  const filterDriver = document.getElementById("filterDriver")?.value || "";
  const filterDate = document.getElementById("filterDate")?.value || "";
  const filterProduct =
    document.getElementById("filterProduct")?.value.toLowerCase() || "";

  let filteredMovements = [...movements].reverse(); // Más recientes primero

  if (filterDriver) {
    filteredMovements = filteredMovements.filter(
      (m) => m.driver === filterDriver
    );
  }
  if (filterDate) {
    filteredMovements = filteredMovements.filter((m) => m.date === filterDate);
  }
  if (filterProduct) {
    filteredMovements = filteredMovements.filter((m) =>
      m.product.toLowerCase().includes(filterProduct)
    );
  }

  const movementsList = document.getElementById("movementsList");
  if (filteredMovements.length === 0) {
    movementsList.innerHTML =
      '<div class="table-row"><span colspan="8" style="text-align: center; padding: 20px; color: #64748b;">No hay movimientos registrados</span></div>';
    return;
  }

  movementsList.innerHTML = filteredMovements
    .map((m) => {
      const dateObj = new Date(m.timestamp);
      const timeStr = dateObj.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const driverName = m.driver.replace("conductor", "Conductor ");
      const typeLabels = {
        asignacion: "➕ Asignación",
        modificacion: "✏️ Modificación",
        eliminacion: "❌ Eliminación",
        venta: "💰 Venta",
      };
      const typeLabel = typeLabels[m.type] || m.type;
      const qtyColor =
        m.quantity > 0 ? "#10b981" : m.quantity < 0 ? "#ef4444" : "#64748b";

      return `
      <div class="table-row">
        <span>${formatDate(m.date)}</span>
        <span>${timeStr}</span>
        <span>${driverName}</span>
        <span>${typeLabel}</span>
        <span><strong>${m.product}</strong></span>
        <span style="color: ${qtyColor};">${m.quantity > 0 ? "+" : ""}${
        m.quantity
      }</span>
        <span>${m.previousQuantity}</span>
        <span>${m.newQuantity}</span>
      </div>
    `;
    })
    .join("");
}

/* =========================
   SUPERVISIÓN DE VENTAS (COORDINADORA)
========================= */
function renderSupervisionVentas() {
  const cont = document.getElementById("supervisionVentasContent");
  if (!cont) return;

  cont.innerHTML = `
    <div class="sales-summary">
      ${renderSalesSummary()}
    </div>
    <div class="sales-details">
      <h4>Detalle de Facturas por Conductor</h4>
      ${renderSalesByDriver()}
    </div>
  `;
}

function renderSalesSummary() {
  const drivers = ["conductor1", "conductor2", "conductor3", "conductor4"];
  let totalSales = 0;
  let totalInvoices = 0;

  drivers.forEach((driver) => {
    const driverInvoices = invoices[driver] || [];
    totalInvoices += driverInvoices.length;
    totalSales += driverInvoices.reduce(
      (sum, inv) => sum + (inv.total || 0),
      0
    );
  });

  const todayDate = today();
  const todaySales = movements
    .filter((m) => m.type === "venta" && m.date === todayDate)
    .reduce((sum, m) => sum + (m.quantity || 0), 0);

  return `
    <div class="summary-cards">
      <div class="summary-card">
        <h5>Total Facturado</h5>
        <p class="summary-value">$${totalSales.toFixed(2)}</p>
      </div>
      <div class="summary-card">
        <h5>Total Facturas</h5>
        <p class="summary-value">${totalInvoices}</p>
      </div>
      <div class="summary-card">
        <h5>Ventas Hoy</h5>
        <p class="summary-value">${todaySales}</p>
      </div>
    </div>
  `;
}

function renderSalesByDriver() {
  const drivers = ["conductor1", "conductor2", "conductor3", "conductor4"];

  return drivers
    .map((driver) => {
      const driverInvoices = invoices[driver] || [];
      const driverName = driver.replace("conductor", "Conductor ");
      const driverTotal = driverInvoices.reduce(
        (sum, inv) => sum + (inv.total || 0),
        0
      );
      const todayInvoices = driverInvoices.filter(
        (inv) => inv.date === today()
      );

      return `
      <div class="driver-sales-card">
        <div class="driver-sales-header">
          <h4>${driverName}</h4>
          <span class="driver-total">Total: $${driverTotal.toFixed(
            2
          )} | Facturas: ${driverInvoices.length}</span>
        </div>
        <div class="invoices-table">
          ${
            driverInvoices.length === 0
              ? '<div class="table-row"><span colspan="4" style="text-align: center; padding: 20px; color: #64748b;">Sin facturas registradas</span></div>'
              : `<div class="table-header">
                <span>Fecha</span>
                <span>Negocio</span>
                <span>Productos</span>
                <span>Total</span>
              </div>
              ${driverInvoices
                .reverse()
                .map(
                  (inv) => `
                <div class="table-row">
                  <span>${formatDate(inv.date)}</span>
                  <span><strong>${inv.negocio || "N/A"}</strong></span>
                  <span>${
                    inv.items
                      ? inv.items
                          .map((i) => `${i.product} (${i.qty})`)
                          .join(", ")
                      : "N/A"
                  }</span>
                  <span class="invoice-total">$${inv.total.toFixed(2)}</span>
                </div>
              `
                )
                .join("")}
            `
          }
        </div>
      </div>
    `;
    })
    .join("");
}

/* =========================
   FACTURAS
========================= */
function renderFacturas() {
  const cont = document.getElementById("invoiceList");
  cont.innerHTML = "";

  if (currentRole === "coordinadora") {
    cont.innerHTML = `
      <p>Para ver el detalle completo de ventas y facturas, ve a la sección "Supervisión de Ventas".</p>
      <button onclick="showSection('supervisionVentas')" class="btn-primary">Ir a Supervisión de Ventas</button>
    `;
    return;
  }

  const list = invoices[currentUser] || [];
  if (list.length === 0) {
    cont.innerHTML = "<p>No hay facturas.</p>";
    return;
  }

  cont.innerHTML = `
    <div class="invoices-list-header" style="margin-bottom: 15px;">
      <h4>Mis Facturas</h4>
      <p style="color: #64748b; font-size: 14px;">Total: ${
        list.length
      } factura(s)</p>
    </div>
    <div class="invoices-table-list">
      <div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr;">
        <span>Fecha</span>
        <span>Negocio</span>
        <span>Total</span>
        <span>Acción</span>
      </div>
      ${list
        .reverse()
        .map((f, i) => {
          // Guardar referencia de la factura original
          const originalIndex = list.length - 1 - i;
          return `
          <div class="table-row">
            <span>${formatDate(f.date)}</span>
            <span><strong>${f.negocio || "N/A"}</strong></span>
            <span style="font-weight: 600; color: #10b981;">$${f.total.toLocaleString()}</span>
            <span>
              <button onclick="downloadInvoicePDFFromList(${i})" class="btn-download-pdf" title="Descargar PDF">
                📄 Descargar PDF
              </button>
            </span>
          </div>
        `;
        })
        .join("")}
    </div>
  `;

  // Guardar referencia a las facturas para descarga
  window.invoiceListForDownload = list;
}

/* =========================
   FACTURA DESDE INVENTARIO (CONDUCTOR)
========================= */
let invoiceItems = []; // Array para almacenar items de la factura

function addToInvoice(product, index, precio) {
  const date = today();
  const myInv = inventory[date]?.[currentUser] || {};
  const availableQty = parseInt(
    document.getElementById(`available-${index}`)?.textContent ||
      myInv[product] ||
      0
  );

  if (availableQty <= 0) {
    alert(`No hay más unidades disponibles de ${product}`);
    return;
  }

  // Verificar si el producto ya está en la factura
  const existingItem = invoiceItems.find((item) => item.product === product);

  if (existingItem) {
    // Si ya existe, aumentar la cantidad en 1
    if (existingItem.qty < availableQty) {
      existingItem.qty += 1;
      existingItem.subtotal = existingItem.qty * existingItem.price;
    } else {
      alert(`Ya has agregado todas las unidades disponibles de ${product}`);
      return;
    }
  } else {
    // Agregar nuevo item a la factura
    invoiceItems.push({
      product: product,
      qty: 1,
      price: precio || 0,
      subtotal: precio || 0,
      index: index,
    });
  }

  updateInvoiceDisplay();
  updateAvailableQuantities();
}

function updateInvoiceDisplay() {
  const invoiceList = document.getElementById("invoiceItemsList");
  const totalAmount = document.getElementById("invoiceTotalAmount");
  const generateBtn = document.getElementById("generateInvoiceBtn");

  if (!invoiceList) return;

  if (invoiceItems.length === 0) {
    invoiceList.innerHTML = `
      <p style="color: #64748b; text-align: center; padding: 20px;">
        No hay productos agregados a la factura. Usa el botón "➕ Agregar" para agregar productos.
      </p>
    `;
    if (totalAmount) totalAmount.textContent = "$0";
    if (generateBtn) generateBtn.disabled = true;
    return;
  }

  let total = 0;
  invoiceList.innerHTML = `
    <div class="invoice-items-header">
      <span>Producto</span>
      <span>Cantidad</span>
      <span>Precio Unit.</span>
      <span>Subtotal</span>
      <span>Acción</span>
    </div>
    ${invoiceItems
      .map((item, idx) => {
        total += item.subtotal;
        return `
        <div class="invoice-item-row">
          <span>${item.product}</span>
          <span>
            <button onclick="decrementInvoiceQty(${idx})" class="qty-btn-small">-</button>
            <span style="margin: 0 10px; font-weight: 600;">${item.qty}</span>
            <button onclick="incrementInvoiceQty(${idx})" class="qty-btn-small">+</button>
          </span>
          <span>$${item.price.toLocaleString()}</span>
          <span style="font-weight: 600; color: #10b981;">$${item.subtotal.toLocaleString()}</span>
          <span>
            <button onclick="removeInvoiceItem(${idx})" class="btn-delete-small">Eliminar</button>
          </span>
        </div>
      `;
      })
      .join("")}
  `;

  if (totalAmount) totalAmount.textContent = `$${total.toLocaleString()}`;
  if (generateBtn) generateBtn.disabled = false;
}

function incrementInvoiceQty(index) {
  if (index < 0 || index >= invoiceItems.length) return;

  const item = invoiceItems[index];
  const date = today();
  const myInv = inventory[date]?.[currentUser] || {};
  const originalQty = myInv[item.product] || 0;

  // Calcular cantidad disponible (original - cantidad ya en factura)
  const otherItemsQty = invoiceItems
    .filter((it, idx) => idx !== index && it.product === item.product)
    .reduce((sum, it) => sum + it.qty, 0);

  const availableQty = originalQty - otherItemsQty;

  if (item.qty < availableQty) {
    item.qty += 1;
    item.subtotal = item.qty * item.price;
    updateInvoiceDisplay();
    updateAvailableQuantities();
  } else {
    alert(`No hay más unidades disponibles de ${item.product}`);
  }
}

function decrementInvoiceQty(index) {
  if (index < 0 || index >= invoiceItems.length) return;

  const item = invoiceItems[index];
  if (item.qty > 1) {
    item.qty -= 1;
    item.subtotal = item.qty * item.price;
    updateInvoiceDisplay();
    updateAvailableQuantities();
  } else {
    removeInvoiceItem(index);
  }
}

function removeInvoiceItem(index) {
  if (index < 0 || index >= invoiceItems.length) return;
  invoiceItems.splice(index, 1);
  updateInvoiceDisplay();
  updateAvailableQuantities();
}

function updateAvailableQuantities() {
  const date = today();
  const myInv = inventory[date]?.[currentUser] || {};

  // Calcular cantidades ya agregadas a la factura por producto
  const usedQty = {};
  invoiceItems.forEach((item) => {
    usedQty[item.product] = (usedQty[item.product] || 0) + item.qty;
  });

  // Actualizar visualización de cantidades disponibles
  Object.keys(myInv).forEach((product, index) => {
    const availableEl = document.getElementById(`available-${index}`);
    if (availableEl) {
      const used = usedQty[product] || 0;
      const available = myInv[product] - used;
      availableEl.textContent = available;
      availableEl.style.color = available > 0 ? "#10b981" : "#ef4444";
      availableEl.style.fontWeight = "600";
    }
  });
}

function finalizeInvoiceFromInventory() {
  const businessName = document
    .getElementById("businessNameInvoice")
    ?.value.trim();

  if (!businessName) {
    alert("Por favor ingresa el nombre del negocio");
    return;
  }

  if (invoiceItems.length === 0) {
    alert("Por favor agrega al menos un producto a la factura");
    return;
  }

  const date = today();
  let total = 0;
  const saleItems = [];

  // Procesar cada item de la factura
  invoiceItems.forEach((item) => {
    saleItems.push({
      product: item.product,
      qty: item.qty,
      price: item.price,
      subtotal: item.subtotal,
    });
    total += item.subtotal;

    // Reducir inventario
    const driverInv = inventory[date]?.[currentUser] || {};
    if (driverInv[item.product] !== undefined) {
      const previousQty = driverInv[item.product];
      driverInv[item.product] = Math.max(0, driverInv[item.product] - item.qty);

      // Registrar movimiento de venta
      movements.push({
        date: date,
        type: "venta",
        driver: currentUser,
        product: item.product,
        quantity: -item.qty,
        previousQuantity: previousQty,
        newQuantity: driverInv[item.product],
        timestamp: new Date().toISOString(),
      });

      if (driverInv[item.product] === 0) {
        delete driverInv[item.product];
      }
    }
  });

  // Guardar factura
  if (!invoices[currentUser]) invoices[currentUser] = [];
  invoices[currentUser].push({
    date: date,
    negocio: businessName,
    items: saleItems,
    total: total,
    timestamp: new Date().toISOString(),
  });

  // Crear objeto de factura
  const invoice = {
    date: date,
    negocio: businessName,
    items: saleItems,
    total: total,
    timestamp: new Date().toISOString(),
  };

  // Guardar factura
  if (!invoices[currentUser]) invoices[currentUser] = [];
  invoices[currentUser].push(invoice);

  saveData();

  // Generar y descargar PDF
  generateInvoicePDF(invoice);

  // Limpiar formulario
  invoiceItems = [];
  document.getElementById("businessNameInvoice").value = "";

  alert(`✓ Factura generada correctamente. Total: $${total.toLocaleString()}`);

  // Actualizar vista
  renderInventario();

  // Opcional: ir a la sección de facturas
  setTimeout(() => {
    showSection("facturas");
  }, 500);
}

/* =========================
   VENTAS (CONDUCTORES)
========================= */
function renderVentas() {
  // Actualizar select de productos cuando se carga la sección de ventas
  const saleProductSelect = document.getElementById("saleProduct");
  if (saleProductSelect && productsCatalog.length > 0) {
    // Agregar productos del catálogo al select
    const existingOptions = saleProductSelect.querySelectorAll(
      'option:not([value=""]):not([value="custom"])'
    );
    if (existingOptions.length === 0) {
      // Agregar productos solo si no están ya agregados
      productsCatalog.forEach((p) => {
        const option = document.createElement("option");
        option.value = p.descripcion;
        option.textContent = `${p.descripcion} (${p.unidad}) - $${
          p.precio?.toLocaleString() || "N/A"
        }`;
        option.dataset.precio = p.precio || 0;
        saleProductSelect.appendChild(option);
      });
    }

    // Event listener para cuando se selecciona un producto del catálogo
    saleProductSelect.addEventListener("change", function () {
      const selectedOption = this.options[this.selectedIndex];
      const precioInput = document.getElementById("salePrice");
      const customInput = document.getElementById("saleProductCustom");

      if (this.value === "custom") {
        if (customInput) {
          customInput.classList.remove("hidden");
          if (precioInput) precioInput.value = "";
        }
      } else if (this.value && selectedOption.dataset.precio) {
        if (customInput) customInput.classList.add("hidden");
        if (precioInput) precioInput.value = selectedOption.dataset.precio;
      }
    });
  }
}

function addSaleItem() {
  const productSelect = document.getElementById("saleProduct");
  const productCustom = document
    .getElementById("saleProductCustom")
    ?.value.trim();
  const isCustom = productSelect?.value === "custom";
  const product = isCustom
    ? productCustom
    : productSelect?.options[productSelect.selectedIndex]?.value;
  const qty = parseInt(document.getElementById("saleQty")?.value);
  const price = parseFloat(document.getElementById("salePrice")?.value);

  if (!product || qty <= 0 || price <= 0) {
    alert("Por favor completa todos los campos correctamente");
    return;
  }

  const saleList = document.getElementById("saleList");
  if (!saleList) return;

  const itemDiv = document.createElement("div");
  itemDiv.className = "sale-item";
  itemDiv.innerHTML = `
    <span>${product} x ${qty} @ $${price.toFixed(2)} = $${(qty * price).toFixed(
    2
  )}</span>
    <button onclick="removeSaleItem(this)" class="btn-delete">Eliminar</button>
  `;
  saleList.appendChild(itemDiv);

  // Limpiar formulario
  if (productSelect) productSelect.selectedIndex = 0;
  const customInput = document.getElementById("saleProductCustom");
  if (customInput) {
    customInput.classList.add("hidden");
    customInput.value = "";
  }
  document.getElementById("saleQty").value = "";
  document.getElementById("salePrice").value = "";
  updateSaleTotal();
}

function removeSaleItem(btn) {
  btn.parentElement.remove();
  updateSaleTotal();
}

function updateSaleTotal() {
  const items = document.querySelectorAll(".sale-item");
  let total = 0;
  items.forEach((item) => {
    const text = item.querySelector("span").textContent;
    const match = text.match(/\$([\d.]+)$/);
    if (match) total += parseFloat(match[1]);
  });
  document.getElementById("total").textContent = total.toFixed(2);
}

function finalizeSale() {
  const businessName = document.getElementById("businessName").value.trim();
  const items = document.querySelectorAll(".sale-item");

  if (!businessName) {
    alert("Ingresa el nombre del negocio");
    return;
  }

  if (items.length === 0) {
    alert("Agrega al menos un producto a la venta");
    return;
  }

  const saleItems = [];
  let total = 0;
  const date = today();

  items.forEach((item) => {
    const text = item.querySelector("span").textContent;
    const match = text.match(
      /^(.+?)\s+x\s+(\d+)\s+@\s+\$([\d.]+)\s+=\s+\$([\d.]+)$/
    );
    if (match) {
      const product = match[1].trim();
      const qty = parseInt(match[2]);
      const price = parseFloat(match[3]);
      const subtotal = parseFloat(match[4]);

      saleItems.push({ product, qty, price, subtotal });
      total += subtotal;

      // Reducir inventario
      const driverInv = inventory[date]?.[currentUser] || {};
      if (driverInv[product] !== undefined) {
        const previousQty = driverInv[product];
        driverInv[product] = Math.max(0, driverInv[product] - qty);

        // Registrar movimiento de venta
        movements.push({
          date: date,
          type: "venta",
          driver: currentUser,
          product: product,
          quantity: -qty,
          previousQuantity: previousQty,
          newQuantity: driverInv[product],
          timestamp: new Date().toISOString(),
        });

        if (driverInv[product] === 0) {
          delete driverInv[product];
        }
      }
    }
  });

  // Crear objeto de factura
  const invoice = {
    date: date,
    negocio: businessName,
    items: saleItems,
    total: total,
    timestamp: new Date().toISOString(),
  };

  // Guardar factura
  if (!invoices[currentUser]) invoices[currentUser] = [];
  invoices[currentUser].push(invoice);

  saveData();

  // Generar y descargar PDF
  generateInvoicePDF(invoice);

  // Limpiar formulario
  document.getElementById("businessName").value = "";
  document.getElementById("saleList").innerHTML = "";
  document.getElementById("total").textContent = "0";

  alert(`Factura generada correctamente. Total: $${total.toFixed(2)}`);
  renderInventario();
}

/* =========================
   GENERAR PDF DE FACTURA
========================= */
function generateInvoicePDF(invoice) {
  // Verificar que jsPDF esté disponible
  if (typeof window.jspdf === "undefined") {
    console.error("jsPDF no está disponible");
    alert(
      "Error: No se pudo generar el PDF. La biblioteca jsPDF no está cargada."
    );
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Configuración de colores
  const primaryColor = [37, 99, 235]; // #2563eb
  const secondaryColor = [16, 185, 129]; // #10b981
  const textColor = [30, 41, 59]; // #1e293b
  const grayColor = [100, 116, 139]; // #64748b

  let yPos = 20;

  // Encabezado
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, "F");

  // Logo o título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURA", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Conductores Pro", 105, 30, { align: "center" });

  yPos = 50;

  // Información de la factura
  doc.setTextColor(...textColor);
  doc.setFontSize(10);

  const driverName = currentUser.replace("conductor", "Conductor ");
  const invoiceDate = formatDate(invoice.date);
  const invoiceNumber = invoices[currentUser]
    ? invoices[currentUser].length
    : 1;

  // Columna izquierda - Vendedor
  doc.setFont("helvetica", "bold");
  doc.text("VENDEDOR:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(driverName, 20, yPos + 5);

  // Columna derecha - Cliente y Fecha
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE:", 150, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.negocio || "N/A", 150, yPos + 5);

  doc.setFont("helvetica", "bold");
  doc.text("FECHA:", 150, yPos + 12);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceDate, 150, yPos + 17);

  doc.setFont("helvetica", "bold");
  doc.text("FACTURA #:", 150, yPos + 24);
  doc.setFont("helvetica", "normal");
  doc.text(String(invoiceNumber).padStart(6, "0"), 150, yPos + 29);

  yPos += 45;

  // Línea separadora
  doc.setDrawColor(...grayColor);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  // Encabezado de la tabla
  doc.setFillColor(241, 245, 249);
  doc.rect(20, yPos, 170, 10, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);

  doc.text("PRODUCTO", 25, yPos + 7);
  doc.text("CANT.", 100, yPos + 7);
  doc.text("PRECIO UNIT.", 125, yPos + 7);
  doc.text("SUBTOTAL", 165, yPos + 7, { align: "right" });

  yPos += 12;

  // Items de la factura
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...textColor);

  invoice.items.forEach((item, index) => {
    // Alternar color de fila
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, yPos - 3, 170, 8, "F");
    }

    // Ajustar texto largo del producto
    let productText = item.product;
    if (productText.length > 35) {
      productText = productText.substring(0, 32) + "...";
    }

    doc.text(productText, 25, yPos + 2);
    doc.text(String(item.qty), 100, yPos + 2);
    doc.text(`$${item.price.toLocaleString()}`, 125, yPos + 2);
    doc.text(`$${item.subtotal.toLocaleString()}`, 165, yPos + 2, {
      align: "right",
    });

    yPos += 8;
  });

  yPos += 5;

  // Línea separadora antes del total
  doc.setDrawColor(...grayColor);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  // Total
  doc.setFillColor(...secondaryColor);
  doc.rect(100, yPos, 90, 12, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", 110, yPos + 8);
  doc.text(`$${invoice.total.toLocaleString()}`, 185, yPos + 8, {
    align: "right",
  });

  yPos += 20;

  // Notas o pie de página
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Gracias por su compra", 105, yPos, { align: "center" });
  yPos += 5;
  doc.text("Factura generada electrónicamente", 105, yPos, { align: "center" });

  // Generar nombre del archivo
  const fileName = `Factura_${invoice.negocio.replace(
    /[^a-z0-9]/gi,
    "_"
  )}_${invoice.date.replace(/-/g, "")}.pdf`;

  // Descargar el PDF
  doc.save(fileName);
}

function downloadInvoicePDFFromList(index) {
  // La lista ya está en orden inverso (más recientes primero)
  const list = window.invoiceListForDownload;
  if (!list || index < 0 || index >= list.length) {
    alert("Error: No se pudo encontrar la factura");
    return;
  }

  // Obtener la factura (ya está en orden inverso desde renderFacturas)
  const invoice = list[index];

  if (!invoice) {
    alert("Error: Factura no encontrada");
    return;
  }

  // Generar PDF de la factura
  generateInvoicePDF(invoice);
}

/* =========================
   ASIGNACIÓN RÁPIDA DE INVENTARIO
========================= */
function openQuickAssignModal() {
  const driver = document.getElementById("quickAssignDriver")?.value;
  if (!driver) {
    alert("Por favor selecciona un conductor");
    return;
  }

  const date = today();
  const driverName = driver.replace("conductor", "Conductor ");

  // Crear modal
  const modalHTML = `
    <div id="quickAssignModal" class="modal-overlay" onclick="if(event.target.id === 'quickAssignModal') closeQuickAssignModal()">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Crear Inventario para ${driverName}</h3>
          <button onclick="closeQuickAssignModal()" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 20px; color: #64748b;">Selecciona productos y cantidades para asignar:</p>
          <div class="quick-assign-products">
            <div class="products-search">
              <input type="text" id="productSearch" placeholder="Buscar producto..." 
                     class="form-input" style="margin-bottom: 15px;"
                     onkeyup="filterProductsQuickAssign()">
            </div>
            <div id="quickAssignProductsList" class="products-list">
              ${productsCatalog
                .map(
                  (p, index) => `
                <div class="product-assign-item" data-product="${
                  p.descripcion
                }">
                  <div class="product-info">
                    <strong>${p.descripcion}</strong>
                    <span class="product-meta">${p.unidad} - $${
                    p.precio?.toLocaleString() || "N/A"
                  }</span>
                  </div>
                  <div class="product-assign-controls">
                    <button onclick="decrementQty(${index})" class="qty-btn">-</button>
                    <input type="number" id="qty-${index}" value="0" min="0" class="qty-input-small" 
                           onchange="updateQuickAssignTotal()">
                    <button onclick="incrementQty(${index})" class="qty-btn">+</button>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
            <div class="quick-assign-summary" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
              <p><strong>Total de productos seleccionados: <span id="totalProductsSelected">0</span></strong></p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeQuickAssignModal()" class="btn-secondary">Cancelar</button>
          <button onclick="confirmQuickAssign('${driver}')" class="btn-primary">Asignar Inventario</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function closeQuickAssignModal() {
  const modal = document.getElementById("quickAssignModal");
  if (modal) modal.remove();
}

function filterProductsQuickAssign() {
  const searchTerm =
    document.getElementById("productSearch")?.value.toLowerCase() || "";
  const items = document.querySelectorAll(".product-assign-item");

  items.forEach((item) => {
    const productText = item.dataset.product.toLowerCase();
    item.style.display = productText.includes(searchTerm) ? "flex" : "none";
  });
}

function incrementQty(index) {
  const input = document.getElementById(`qty-${index}`);
  if (input) {
    input.value = parseInt(input.value || 0) + 1;
    updateQuickAssignTotal();
  }
}

function decrementQty(index) {
  const input = document.getElementById(`qty-${index}`);
  if (input && parseInt(input.value) > 0) {
    input.value = parseInt(input.value) - 1;
    updateQuickAssignTotal();
  }
}

function updateQuickAssignTotal() {
  const inputs = document.querySelectorAll(".qty-input-small");
  let total = 0;
  inputs.forEach((input) => {
    if (parseInt(input.value) > 0) total++;
  });
  const totalSpan = document.getElementById("totalProductsSelected");
  if (totalSpan) totalSpan.textContent = total;
}

function confirmQuickAssign(driver) {
  const date = today();
  const items = document.querySelectorAll(".product-assign-item");
  let assigned = 0;

  if (!inventory[date]) inventory[date] = {};
  if (!inventory[date][driver]) inventory[date][driver] = {};

  items.forEach((item, index) => {
    const input = document.getElementById(`qty-${index}`);
    const qty = parseInt(input?.value || 0);

    if (qty > 0) {
      const product = item.dataset.product;
      const productData = productsCatalog.find(
        (p) => p.descripcion === product
      );

      const previousQty = inventory[date][driver][product] || 0;
      inventory[date][driver][product] = previousQty + qty;

      // Registrar movimiento
      movements.push({
        date: date,
        type: "asignacion",
        driver: driver,
        product: product,
        codigo: productData?.codigo || "",
        precio: productData?.precio || 0,
        quantity: qty,
        previousQuantity: previousQty,
        newQuantity: inventory[date][driver][product],
        timestamp: new Date().toISOString(),
      });

      assigned++;
    }
  });

  if (assigned === 0) {
    alert("No has seleccionado ningún producto para asignar");
    return;
  }

  saveData();
  closeQuickAssignModal();
  alert(
    `✓ Inventario creado: ${assigned} productos asignados a ${driver.replace(
      "conductor",
      "Conductor "
    )}`
  );
  renderInventario();
  if (
    document.getElementById("gestionInventario") &&
    !document.getElementById("gestionInventario").classList.contains("hidden")
  ) {
    renderGestionInventario();
  }
}

/* =========================
   SINCRONIZACIÓN EN TIEMPO REAL
========================= */
let syncInterval = null;
let isSyncing = false;

function startRealtimeSync() {
  // Event listener para cambios en localStorage desde otras pestañas
  window.addEventListener("storage", handleStorageChange);

  // Event listener para cambios en la misma pestaña (evento personalizado)
  window.addEventListener("dataUpdated", handleDataUpdated);

  // Polling periódico como respaldo (cada 3 segundos)
  syncInterval = setInterval(() => {
    checkForUpdates();
  }, 3000);

  // Mostrar indicador de sincronización
  showSyncIndicator();
}

function stopRealtimeSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  window.removeEventListener("storage", handleStorageChange);
  window.removeEventListener("dataUpdated", handleDataUpdated);
  hideSyncIndicator();
}

function handleStorageChange(e) {
  if (
    e.key === "inventory" ||
    e.key === "invoices" ||
    e.key === "movements" ||
    e.key === "lastSyncTimestamp"
  ) {
    // Recargar datos si han cambiado desde otra pestaña
    const newTimestamp = parseInt(
      localStorage.getItem("lastSyncTimestamp") || "0"
    );
    if (newTimestamp > lastSyncTimestamp) {
      loadData();
      refreshCurrentView();
      showSyncNotification("Datos actualizados");
    }
  }
}

function handleDataUpdated(e) {
  // Actualizar timestamp local pero no recargar (ya tenemos los datos más recientes)
  if (e.detail?.timestamp) {
    lastSyncTimestamp = e.detail.timestamp;
  }
}

function checkForUpdates() {
  if (isSyncing) return;

  const savedTimestamp = parseInt(
    localStorage.getItem("lastSyncTimestamp") || "0"
  );
  if (savedTimestamp > lastSyncTimestamp) {
    isSyncing = true;
    loadData();
    refreshCurrentView();
    lastSyncTimestamp = savedTimestamp;
    isSyncing = false;
  }
}

function refreshCurrentView() {
  const currentPanel = getCurrentVisiblePanel();
  if (currentPanel === "inventario") renderInventario();
  if (currentPanel === "gestionInventario") renderGestionInventario();
  if (currentPanel === "controlMovimientos") renderControlMovimientos();
  if (currentPanel === "supervisionVentas") renderSupervisionVentas();
  if (currentPanel === "facturas") renderFacturas();
}

function getCurrentVisiblePanel() {
  const panels = [
    "dashboard",
    "inventario",
    "ventas",
    "facturas",
    "gestionInventario",
    "controlMovimientos",
    "supervisionVentas",
  ];
  for (let panel of panels) {
    const el = document.getElementById(panel);
    if (el && !el.classList.contains("hidden")) {
      return panel;
    }
  }
  return "dashboard";
}

function showSyncIndicator() {
  // Crear o actualizar indicador de sincronización
  let indicator = document.getElementById("syncIndicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "syncIndicator";
    indicator.className = "sync-indicator";
    indicator.innerHTML = '<span class="sync-dot"></span> Sincronizado';
    document.body.appendChild(indicator);
  }
}

function hideSyncIndicator() {
  const indicator = document.getElementById("syncIndicator");
  if (indicator) indicator.remove();
}

function showSyncNotification(message) {
  // Mostrar notificación temporal
  const notification = document.createElement("div");
  notification.className = "sync-notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Limpiar sincronización al cerrar
window.addEventListener("beforeunload", () => {
  stopRealtimeSync();
});

/* =========================
   DESCARGA (placeholder)
========================= */
function downloadInvoices() {
  alert("Aquí irá la generación de PDF por conductor.");
}
