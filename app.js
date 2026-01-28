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

const DRIVER_IDS = ["conductor1", "conductor2", "conductor3", "conductor4"];
const DRIVER_LABELS = {
  conductor1: "POP217",
  conductor2: "POP237",
  conductor3: "NXY793",
  conductor4: "NXY794",
};

function getDriverLabel(driver) {
  return DRIVER_LABELS[driver] || driver;
}

let currentUser = null;
let currentRole = null;

// Inventario diario por fecha
let inventory = {};
// Facturas por conductor
let invoices = {};
// Movimientos de productos (registro histórico)
let movements = [];
// Preset para filtrar el historial desde tarjetas del panel
let movementsTypePreset = "";
// Preset para abrir el histórico de ventas desde el panel
let salesHistoryPreset = "";
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

// 🔍 HERRAMIENTA DE DIAGNÓSTICO - Disponible en consola
window.inspectInvoices = function() {
  console.log("🔍 ===== INSPECCIÓN DE FACTURAS =====");
  console.log("");
  
  let totalInvoices = 0;
  let invoicesWithClientData = 0;
  let invoicesWithoutClientData = 0;
  
  Object.keys(invoices).forEach(driver => {
    const driverInvoices = invoices[driver];
    console.log(`👤 ${getDriverLabel(driver)} (${driver})`);
    console.log(`   Total de facturas: ${driverInvoices.length}`);
    console.log("");
    
    driverInvoices.forEach((inv, index) => {
      totalInvoices++;
      const hasClientData = !!(inv.direccionCiudad || inv.barrio || inv.telefono || inv.nit);
      
      if (hasClientData) {
        invoicesWithClientData++;
      } else {
        invoicesWithoutClientData++;
      }
      
      console.log(`   📋 Factura #${index + 1}:`);
      console.log(`      - Negocio: ${inv.negocio || "N/A"}`);
      console.log(`      - Fecha: ${inv.date || "N/A"}`);
      console.log(`      - Total: $${(inv.total || 0).toLocaleString()}`);
      console.log(`      - Datos del cliente: ${hasClientData ? "✅ SÍ tiene" : "❌ NO tiene"}`);
      
      if (hasClientData) {
        console.log(`        • Dirección: ${inv.direccionCiudad || "N/A"}`);
        console.log(`        • Barrio: ${inv.barrio || "N/A"}`);
        console.log(`        • Teléfono: ${inv.telefono || "N/A"}`);
        console.log(`        • NIT: ${inv.nit || "N/A"}`);
      }
      console.log("");
    });
  });
  
  console.log("📊 RESUMEN:");
  console.log(`   Total de facturas: ${totalInvoices}`);
  console.log(`   ✅ Con datos del cliente: ${invoicesWithClientData}`);
  console.log(`   ❌ Sin datos del cliente: ${invoicesWithoutClientData}`);
  console.log("");
  
  if (invoicesWithoutClientData > 0) {
    console.warn("⚠️ Hay facturas sin datos del cliente.");
    console.warn("   Estas facturas mostrarán 'N/A' en el PDF.");
    console.warn("   No se pueden corregir retroactivamente.");
  }
  
  return {
    total: totalInvoices,
    withClientData: invoicesWithClientData,
    withoutClientData: invoicesWithoutClientData
  };
};

// 🔍 VERIFICAR CAMPOS DEL FORMULARIO EN TIEMPO REAL
window.checkFormFields = function() {
  console.log("🔍 ===== VERIFICACIÓN DE CAMPOS DEL FORMULARIO =====");
  console.log("");
  
  // Campos del módulo de VENTAS
  console.log("📝 MÓDULO DE VENTAS:");
  const ventasFields = {
    'direccionCiudad': document.getElementById('direccionCiudad'),
    'barrio': document.getElementById('barrio'),
    'businessName': document.getElementById('businessName'),
    'telefono': document.getElementById('telefono'),
    'nit': document.getElementById('nit')
  };
  
  Object.keys(ventasFields).forEach(fieldId => {
    const field = ventasFields[fieldId];
    if (field) {
      console.log(`   ✅ ${fieldId}:`);
      console.log(`      - Existe: SÍ`);
      console.log(`      - Visible: ${field.offsetParent !== null ? 'SÍ' : 'NO'}`);
      console.log(`      - Valor: "${field.value}" ${field.value ? '✅' : '❌ VACÍO'}`);
    } else {
      console.log(`   ❌ ${fieldId}: NO EXISTE en el DOM`);
    }
  });
  
  console.log("");
  
  // Campos del módulo de INVENTARIO
  console.log("📦 MÓDULO DE INVENTARIO:");
  const inventarioFields = {
    'direccionCiudadInvoice': document.getElementById('direccionCiudadInvoice'),
    'barrioInvoice': document.getElementById('barrioInvoice'),
    'businessNameInvoice': document.getElementById('businessNameInvoice'),
    'telefonoInvoice': document.getElementById('telefonoInvoice'),
    'nitInvoice': document.getElementById('nitInvoice')
  };
  
  Object.keys(inventarioFields).forEach(fieldId => {
    const field = inventarioFields[fieldId];
    if (field) {
      console.log(`   ✅ ${fieldId}:`);
      console.log(`      - Existe: SÍ`);
      console.log(`      - Visible: ${field.offsetParent !== null ? 'SÍ' : 'NO'}`);
      console.log(`      - Valor: "${field.value}" ${field.value ? '✅' : '❌ VACÍO'}`);
    } else {
      console.log(`   ❌ ${fieldId}: NO EXISTE en el DOM`);
    }
  });
  
  console.log("");
  console.log("💡 TIP: Llena los campos y ejecuta este comando nuevamente para verificar que se están capturando.");
  console.log("");
};

// 🧪 TEST COMPLETO: Crear factura de prueba
window.testCreateInvoice = function() {
  console.log("🧪 ===== TEST DE CREACIÓN DE FACTURA =====");
  console.log("");
  console.log("Este test simulará llenar los campos y te dirá exactamente qué pasaría.");
  console.log("");
  
  // Detectar qué módulo está visible
  const ventasVisible = document.getElementById('ventas')?.classList.contains('hidden') === false;
  const inventarioVisible = document.getElementById('inventario')?.classList.contains('hidden') === false;
  
  if (!ventasVisible && !inventarioVisible) {
    console.warn("⚠️ Ningún módulo está visible. Ve a 'Ventas' o 'Inventario' primero.");
    return;
  }
  
  if (ventasVisible) {
    console.log("📝 Módulo activo: VENTAS");
    console.log("");
    console.log("Para crear una factura de prueba:");
    console.log("1. Llena TODOS estos campos:");
    console.log("   • Dirección, Ciudad: Calle 100 #50-20, Bogotá");
    console.log("   • Barrio: Chapinero");
    console.log("   • Nombre del Negocio: TEST FACTURA");
    console.log("   • Teléfono: 3001234567");
    console.log("   • NIT: 900123456");
    console.log("2. Agrega un producto");
    console.log("3. ANTES de hacer clic en 'Generar factura', ejecuta:");
    console.log("   checkFormFields()");
    console.log("4. Verifica que todos los campos tengan valores ✅");
    console.log("5. LUEGO haz clic en 'Generar factura'");
  }
  
  if (inventarioVisible) {
    console.log("📦 Módulo activo: INVENTARIO");
    console.log("");
    console.log("Para crear una factura de prueba:");
    console.log("1. Agrega productos a la factura");
    console.log("2. Llena TODOS estos campos:");
    console.log("   • Dirección, Ciudad: Calle 100 #50-20, Bogotá");
    console.log("   • Barrio: Chapinero");
    console.log("   • Nombre del Negocio: TEST FACTURA");
    console.log("   • Teléfono: 3001234567");
    console.log("   • NIT: 900123456");
    console.log("3. ANTES de hacer clic en 'Generar Factura', ejecuta:");
    console.log("   checkFormFields()");
    console.log("4. Verifica que todos los campos tengan valores ✅");
    console.log("5. LUEGO haz clic en 'Generar Factura'");
  }
  
  console.log("");
  console.log("📊 Después de generar la factura, ejecuta:");
  console.log("   inspectInvoices()");
  console.log("   Para verificar que se guardó con los datos correctos.");
  console.log("");
};

console.log("🔧 Herramientas de diagnóstico disponibles:");
console.log("   • inspectInvoices() - Ver todas las facturas guardadas");
console.log("   • checkFormFields() - Verificar campos del formulario");
console.log("   • testCreateInvoice() - Guía paso a paso para crear factura de prueba");
console.log("");

function saveData() {
  lastSyncTimestamp = Date.now();
  
  // Log detallado antes de guardar
  console.log("💾 Guardando datos en localStorage...");
  console.log("   - Conductores con facturas:", Object.keys(invoices));
  Object.keys(invoices).forEach(driver => {
    console.log(`   - ${driver}: ${invoices[driver].length} facturas`);
  });
  
  localStorage.setItem("inventory", JSON.stringify(inventory));
  localStorage.setItem("invoices", JSON.stringify(invoices));
  localStorage.setItem("movements", JSON.stringify(movements));
  localStorage.setItem("lastSyncTimestamp", lastSyncTimestamp.toString());
  
  console.log("✅ Datos guardados en localStorage");

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
    ensurePacaInventoryMigration();
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

function normalizeUnidad(unidad) {
  return (unidad || "").toString().trim().toUpperCase();
}

function getUnitsPerPacaFromDescription(description) {
  const match = (description || "").match(/X\s*(\d+)\s*UND/i);
  return match ? parseInt(match[1], 10) : 1;
}

function formatQtyWithUnit(qty, unitLabel) {
  return unitLabel ? `${qty} ${unitLabel}` : String(qty);
}

function ensurePacaInventoryMigration() {
  const migrated = localStorage.getItem("pacaInventoryMigrated");
  if (migrated === "true") return;
  if (!inventory || Object.keys(inventory).length === 0) {
    localStorage.setItem("pacaInventoryMigrated", "true");
    return;
  }
  if (!productsCatalog || productsCatalog.length === 0) return;

  Object.keys(inventory).forEach((date) => {
    const dayInv = inventory[date] || {};
    Object.keys(dayInv).forEach((driver) => {
      const driverInv = dayInv[driver] || {};
      Object.keys(driverInv).forEach((product) => {
        const productInfo = productsCatalog.find(
          (p) => p.descripcion === product
        );
        if (!productInfo) return;
        if (normalizeUnidad(productInfo.unidad) !== "PACA") return;
        const unitsPerPaca = getUnitsPerPacaFromDescription(
          productInfo.descripcion || product
        );
        if (!unitsPerPaca || unitsPerPaca <= 1) return;
        const currentQty = Number(driverInv[product] || 0);
        driverInv[product] = currentQty * unitsPerPaca;
      });
    });
  });

  localStorage.setItem("pacaInventoryMigrated", "true");
  saveData();
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

  // El elemento welcome ya no existe, se eliminó en la simplificación
  // const welcomeEl = document.getElementById("welcome");
  // if (welcomeEl) {
  //   welcomeEl.innerText =
  //     currentRole === "coordinadora"
  //       ? "Panel de Coordinadora - Gestión y Supervisión del Sistema"
  //       : `Panel del ${currentUser}`;
  // }

  // Cargar productos si aún no están cargados
  if (productsCatalog.length === 0) {
    await loadProductsCatalog();
  }
  ensurePacaInventoryMigration();

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
  // Ocultar botones que no son para coordinadora
  const ventasBtn = document.getElementById("ventasBtn");
  if (ventasBtn) ventasBtn.classList.add("hidden");

  // Asegurar que los botones principales estén visibles
  const btnDashboard = document.getElementById("btnDashboard");
  if (btnDashboard) btnDashboard.classList.remove("hidden");

  const btnInventario = document.getElementById("btnInventario");
  if (btnInventario) {
    btnInventario.classList.remove("hidden");
    btnInventario.textContent = "Asignar Inventario";
  }

  const btnFacturas = document.getElementById("btnFacturas");
  if (btnFacturas) btnFacturas.classList.remove("hidden");

  // Mostrar botón de Editar Precios para coordinadora
  const btnEditarPrecios = document.getElementById("btnEditarPrecios");
  if (btnEditarPrecios) btnEditarPrecios.classList.remove("hidden");

  // Actualizar título del rol
  const roleTitle = document.getElementById("roleTitle");
  if (roleTitle) roleTitle.textContent = "Coordinadora";
}

function setupDriverNavigation() {
  // Ocultar botón de Panel para conductores
  const btnDashboard = document.getElementById("btnDashboard");
  if (btnDashboard) btnDashboard.classList.add("hidden");

  // Mostrar botón de ventas para conductores
  const ventasBtn = document.getElementById("ventasBtn");
  if (ventasBtn) ventasBtn.classList.remove("hidden");

  // Mostrar botón de inventario para conductores (con texto diferente)
  const btnInventario = document.getElementById("btnInventario");
  if (btnInventario) {
    btnInventario.classList.remove("hidden");
    btnInventario.textContent = "Mi Inventario";
  }

  // Mostrar botón de facturas para conductores
  const btnFacturas = document.getElementById("btnFacturas");
  if (btnFacturas) btnFacturas.classList.remove("hidden");

  // Ocultar paneles solo de coordinadora
  const coordinatorPanels = [
    "gestionInventario",
    "controlMovimientos",
    "supervisionVentas",
    "historialVentas",
    "editarPrecios",
  ];
  coordinatorPanels.forEach((id) => {
    const panel = document.getElementById(id);
    if (panel) panel.classList.add("hidden");
  });

  // Ocultar botón de Editar Precios para conductores
  const btnEditarPrecios = document.getElementById("btnEditarPrecios");
  if (btnEditarPrecios) btnEditarPrecios.classList.add("hidden");

  // Ocultar panel de dashboard para conductores
  const dashboardPanel = document.getElementById("dashboard");
  if (dashboardPanel) dashboardPanel.classList.add("hidden");

  // Actualizar título del rol
  const roleTitle = document.getElementById("roleTitle");
  const driverName = getDriverLabel(currentUser);
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
  console.log(`=== showSection('${panelId}') llamado ===`);

  // Paneles comunes
  const commonPanels = ["dashboard", "inventario", "ventas", "facturas"];
  // Paneles solo para coordinadora
  const coordinatorPanels = [
    "gestionInventario",
    "controlMovimientos",
    "supervisionVentas",
    "editarPrecios",
  ];

  const allPanels = [...commonPanels, ...coordinatorPanels];

  // Ocultar todos los paneles primero
  allPanels.forEach((id) => {
    const panel = document.getElementById(id);
    if (panel) {
      panel.classList.add("hidden");
      console.log(`Panel '${id}' ocultado`);
    }
  });

  const targetPanel = document.getElementById(panelId);
  if (!targetPanel) {
    console.error(`ERROR: No se encontró el panel con ID: ${panelId}`);
    return;
  }

  // Mostrar SOLO el panel objetivo
  targetPanel.classList.remove("hidden");
  console.log(`Panel '${panelId}' mostrado (removida clase 'hidden')`);

  // Verificar que otros paneles estén ocultos
  const ventasPanel = document.getElementById("ventas");
  const facturasPanel = document.getElementById("facturas");
  if (panelId === "facturas" && ventasPanel) {
    if (!ventasPanel.classList.contains("hidden")) {
      console.warn(
        "⚠️ ADVERTENCIA: El panel 'ventas' no está oculto cuando debería estarlo"
      );
      ventasPanel.classList.add("hidden");
    }
  }
  if (panelId === "ventas" && facturasPanel) {
    if (!facturasPanel.classList.contains("hidden")) {
      console.warn(
        "⚠️ ADVERTENCIA: El panel 'facturas' no está oculto cuando debería estarlo"
      );
      facturasPanel.classList.add("hidden");
    }
  }

  // Forzar reflow para asegurar que el panel sea visible
  targetPanel.offsetHeight;

  // Renderizar contenido según el panel
  try {
    if (panelId === "dashboard") {
      if (currentRole === "coordinadora") {
        renderDashboard();
      }
    } else if (panelId === "inventario") {
      renderInventario();
    } else if (panelId === "facturas") {
      console.log("Renderizando panel de FACTURAS");
      // Verificar que el panel correcto esté visible
      const facturasPanel = document.getElementById("facturas");
      const ventasPanel = document.getElementById("ventas");
      if (facturasPanel && !facturasPanel.classList.contains("hidden")) {
        console.log("✅ Panel 'facturas' está visible");
      } else {
        console.error("❌ Panel 'facturas' NO está visible");
        if (facturasPanel) facturasPanel.classList.remove("hidden");
      }
      if (ventasPanel && ventasPanel.classList.contains("hidden")) {
        console.log("✅ Panel 'ventas' está oculto (correcto)");
      } else {
        console.warn("⚠️ Panel 'ventas' NO está oculto (forzando ocultación)");
        if (ventasPanel) ventasPanel.classList.add("hidden");
      }
      // Pequeño delay para asegurar que el DOM esté actualizado
      setTimeout(() => {
        renderFacturas();
      }, 50);
    } else if (panelId === "ventas") {
      renderVentas();
    } else if (panelId === "controlMovimientos") {
      renderControlMovimientos();
    } else if (panelId === "supervisionVentas") {
      renderSupervisionVentas();
    } else if (panelId === "historialVentas") {
      renderHistorialVentas();
    } else if (panelId === "editarPrecios") {
      renderEditarPrecios();
    }
  } catch (error) {
    console.error(`Error al renderizar el panel ${panelId}:`, error);
    console.error("Stack trace:", error.stack);
    if (targetPanel) {
      const contentDiv =
        targetPanel.querySelector('[id$="Content"]') || targetPanel;
      contentDiv.innerHTML = `<p style="color: #ef4444; padding: 20px;">Error al cargar el contenido: ${error.message}. Por favor recarga la página.</p>`;
    }
  }
}

function showPanel(panelId) {
  showSection(panelId);
}

function openMovementsHistory(type) {
  movementsTypePreset = type || "";
  showSection("controlMovimientos");
}

function openSalesHistory(preset) {
  salesHistoryPreset = preset || "";
  showSection("historialVentas");
}

/* =========================
   DASHBOARD (COORDINADORA)
========================= */
function renderDashboard() {
  const cont = document.getElementById("dashboardContent");
  if (!cont) {
    console.error("No se encontró el elemento dashboardContent");
    return;
  }

  const date = today();
  const drivers = DRIVER_IDS;

  // Calcular estadísticas
  let totalProducts = 0;
  let totalInventoryQty = 0;
  let totalInvoices = 0;
  let totalSales = 0;

  drivers.forEach((driver) => {
    const driverInv = inventory[date]?.[driver] || {};
    totalProducts += Object.keys(driverInv).length;
    totalInventoryQty += Object.values(driverInv).reduce(
      (sum, qty) => sum + qty,
      0
    );

    const driverInvoices = invoices[driver] || [];
    totalInvoices += driverInvoices.length;
    totalSales += driverInvoices.reduce(
      (sum, inv) => sum + (inv.total || 0),
      0
    );
  });

  // Obtener facturas recientes (últimas 5)
  const allInvoices = [];
  drivers.forEach((driver) => {
    const driverInvoices = invoices[driver] || [];
    driverInvoices.forEach((inv) => {
      allInvoices.push({
        ...inv,
        driver: driver,
        driverName: getDriverLabel(driver),
      });
    });
  });

  allInvoices.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recentInvoices = allInvoices.slice(0, 5);

  cont.innerHTML = `
    <div class="dashboard-summary">
      <div class="summary-cards">
        <div class="summary-card clickable" onclick="openMovementsHistory('asignacion')" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);">
          <h5>Total Productos Asignados</h5>
          <p class="summary-value">${totalProducts}</p>
          <p style="font-size: 12px; opacity: 0.9; margin-top: 5px;">${totalInventoryQty} unidades</p>
        </div>
        <div class="summary-card clickable" onclick="openSalesHistory('productos')" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
          <h5>Total Facturado</h5>
          <p class="summary-value">$${totalSales.toLocaleString()}</p>
          <p style="font-size: 12px; opacity: 0.9; margin-top: 5px;">${totalInvoices} facturas</p>
        </div>
        <div class="summary-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
          <h5>Conductores Activos</h5>
          <p class="summary-value">${
            drivers.filter(
              (d) => Object.keys(inventory[date]?.[d] || {}).length > 0
            ).length
          }</p>
          <p style="font-size: 12px; opacity: 0.9; margin-top: 5px;">de ${
            drivers.length
          } totales</p>
        </div>
      </div>
    </div>

    <div class="dashboard-sections" style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <!-- Resumen por Conductor -->
      <div class="dashboard-section-card">
        <h3>Inventario por Conductor</h3>
        <div class="drivers-inventory-summary">
          ${drivers
            .map((driver) => {
              const driverInv = inventory[date]?.[driver] || {};
              const driverName = getDriverLabel(driver);
              const totalItems = Object.keys(driverInv).length;
              const totalQty = Object.values(driverInv).reduce(
                (sum, qty) => sum + qty,
                0
              );

              return `
              <div class="driver-summary-item">
                <div>
                  <strong>${driverName}</strong>
                  <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">
                    ${totalItems} productos | ${totalQty} unidades
                  </p>
                </div>
                <button onclick="showSection('inventario')" class="btn-primary" style="padding: 6px 12px; font-size: 12px;">
                  Ver Detalles
                </button>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>

      <!-- Facturas Recientes -->
      <div class="dashboard-section-card">
        <h3>Facturas Recientes</h3>
        <div class="recent-invoices-list">
          ${
            recentInvoices.length === 0
              ? '<p style="color: #64748b; text-align: center; padding: 20px;">No hay facturas registradas</p>'
              : recentInvoices
                  .map(
                    (inv) => `
              <div class="recent-invoice-item">
                <div>
                  <strong>${inv.negocio || "N/A"}</strong>
                  <p style="color: #64748b; font-size: 12px; margin: 3px 0 0 0;">
                    ${inv.driverName} - ${formatDate(inv.date)}
                  </p>
                </div>
                <div style="text-align: right;">
                  <strong style="color: #10b981; font-size: 16px;">$${inv.total.toLocaleString()}</strong>
                  <button onclick="downloadInvoicePDFForCoordinator('${
                    inv.driver
                  }', ${invoices[inv.driver].indexOf(inv)})" 
                          class="btn-download-pdf-small" 
                          style="margin-top: 5px; padding: 4px 8px; font-size: 11px;">
                    📄 PDF
                  </button>
                </div>
              </div>
            `
                  )
                  .join("")
          }
        </div>
        ${
          recentInvoices.length > 0
            ? `
          <div style="margin-top: 15px; text-align: center;">
            <button onclick="showSection('facturas')" class="btn-primary" style="width: 100%;">
              Ver Todas las Facturas
            </button>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
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
          <option value="conductor1">POP217</option>
          <option value="conductor2">POP237</option>
          <option value="conductor3">NXY793</option>
          <option value="conductor4">NXY794</option>
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
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="assignInventory()" class="btn-primary">Asignar Producto</button>
            <button onclick="downloadAssignedInventoryPDF()" class="btn-download-pdf">📄 Descargar PDF Inventario</button>
          </div>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
          <h4>Asignación Rápida por Conductor</h4>
          <p style="color: #64748b; margin-bottom: 15px;">Selecciona un conductor y crea su inventario completo del día:</p>
          <div class="quick-assign-section">
            <select id="quickAssignDriver" class="form-select" style="max-width: 250px; margin-bottom: 15px;">
              <option value="">Seleccionar conductor...</option>
              <option value="conductor1">POP217</option>
              <option value="conductor2">POP237</option>
              <option value="conductor3">NXY793</option>
              <option value="conductor4">NXY794</option>
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
            const isPaca = normalizeUnidad(productInfo?.unidad) === "PACA";
            const unitsPerPaca = isPaca
              ? getUnitsPerPacaFromDescription(
                  productInfo?.descripcion || product
                )
              : 1;
            const unitPrice =
              isPaca && unitsPerPaca > 0
                ? Math.round((precio / unitsPerPaca) * 100) / 100
                : precio;
            const unitLabel = isPaca ? "UND" : productInfo?.unidad || "";
            const assignedLabel = isPaca ? `${qty} ${unitLabel}` : qty;
            
            // Calcular si hay pacas completas disponibles
            let hasCompletePacas = false;
            if (isPaca && unitsPerPaca > 0) {
              const completePacas = Math.floor(qty / unitsPerPaca);
              hasCompletePacas = completePacas > 0;
            }

            return `
            <div class="inventory-item-row" data-product="${product}" data-index="${index}">
              <span class="product-name">
                <strong>${product}</strong>
                ${
                  productInfo
                    ? `<span class="product-meta">(${
                        isPaca
                          ? `PACA ${unitsPerPaca} UND`
                          : productInfo.unidad
                      } - $${unitPrice.toLocaleString()}${
                        isPaca ? " / UND" : ""
                      })</span>`
                    : ""
                }
              </span>
              <span class="qty-assigned">${assignedLabel}</span>
              <span class="qty-available" id="available-${index}">${qty}</span>
              <span class="action-buttons">
                ${
                  isPaca && hasCompletePacas
                    ? `<input id="paca-units-${index}" type="number" min="1" class="form-input" placeholder="Unidades (opcional)" style="width: 130px;" title="Dejar vacío para agregar una paca completa">`
                    : ""
                }
                <button onclick="addToInvoice('${product}', ${index}, ${unitPrice})" 
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
        <h4>Datos del Cliente</h4>
        <div class="invoice-form">
          <div class="form-row" style="margin-bottom: 15px;">
            <label style="min-width: 150px;">Dirección, Ciudad:</label>
            <input id="direccionCiudadInvoice" placeholder="Dirección y ciudad del cliente" 
                   class="form-input" style="flex: 1;">
          </div>
          
          <div class="form-row" style="margin-bottom: 15px;">
            <label style="min-width: 150px;">Barrio:</label>
            <input id="barrioInvoice" placeholder="Barrio del cliente" 
                   class="form-input" style="flex: 1;">
          </div>
          
          <div class="form-row" style="margin-bottom: 15px;">
            <label style="min-width: 150px;">Nombre del Negocio:</label>
            <input id="businessNameInvoice" placeholder="Ingresa el nombre del negocio" 
                   class="form-input" style="flex: 1;" required>
          </div>
          
          <div class="form-row" style="margin-bottom: 15px;">
            <label style="min-width: 150px;">Teléfono:</label>
            <input id="telefonoInvoice" placeholder="Número de teléfono" 
                   class="form-input" style="flex: 1;" type="tel">
          </div>

          <div class="form-row" style="margin-bottom: 15px;">
            <label style="min-width: 150px;">NIT:</label>
            <input id="nitInvoice" placeholder="Número de NIT" 
                   class="form-input" style="flex: 1;">
          </div>

          <div class="form-row" style="margin-bottom: 15px;">
            <label style="min-width: 150px;">Método de Pago:</label>
            <select id="paymentMethodInvoice" class="form-select" style="flex: 1;" onchange="toggleInstallmentsInvoice()">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>

          <div id="installmentsContainerInvoice" class="form-row" style="margin-bottom: 15px; display: none;">
            <label style="min-width: 150px;">Número de Cuotas:</label>
            <select id="installmentsInvoice" class="form-select" style="flex: 1;">
              ${Array.from({ length: 48 }, (_, i) => i + 1)
                .map(
                  (n) =>
                    `<option value="${n}">${n} cuota${
                      n > 1 ? "s" : ""
                    }</option>`
                )
                .join("")}
            </select>
          </div>
          
          <div style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
            <h4 style="margin-bottom: 15px;">Productos de la Factura</h4>
          
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

function toggleInstallmentsInvoice() {
  const method = document.getElementById("paymentMethodInvoice")?.value;
  const container = document.getElementById("installmentsContainerInvoice");
  if (!container) return;
  container.style.display = method === "tarjeta" ? "flex" : "none";
}

function renderTodayInventorySummary() {
  const date = today();
  const drivers = DRIVER_IDS;
  let summaryHTML = "";

  drivers.forEach((driver) => {
    const driverInv = inventory[date]?.[driver] || {};
    const driverName = getDriverLabel(driver);
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
  let unidad = "";

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
    unidad = selectedOption?.dataset?.unidad || "";
  } else if (productSelect.tagName === "INPUT") {
    // Es un input (versión antigua) - obtener el valor del input
    product = productSelect.value?.trim() || "";
    if (!product) {
      alert("Por favor ingresa un producto");
      return;
    }
    const productInfo = productsCatalog.find((p) => p.descripcion === product);
    codigo = productInfo?.codigo || codigo;
    precio = productInfo?.precio || precio;
    unidad = productInfo?.unidad || unidad;
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

  const isPaca = normalizeUnidad(unidad) === "PACA";
  const unitsPerPaca = isPaca ? getUnitsPerPacaFromDescription(product) : 1;
  const assignedQty = isPaca ? qty * unitsPerPaca : qty;

  const previousQty = inventory[date][driver][product] || 0;
  inventory[date][driver][product] = previousQty + assignedQty;

  // Registrar movimiento
  movements.push({
    date: date,
    type: "asignacion",
    driver: driver,
    product: product,
    codigo: codigo,
    precio: precio,
    quantity: assignedQty,
    previousQuantity: previousQty,
    newQuantity: inventory[date][driver][product],
    timestamp: new Date().toISOString(),
  });

  saveData();
  const assignedMessage = isPaca
    ? `✓ ${qty} paca(s) (${assignedQty} UND) de "${product}" asignadas a ${driver.replace(
        "conductor",
        "Conductor "
      )}`
    : `✓ ${qty} unidades de "${product}" asignadas a ${driver.replace(
        "conductor",
        "Conductor "
      )}`;
  alert(assignedMessage);

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
function renderGestionInventarioContent() {
  const date = today();
  const drivers = DRIVER_IDS;
  let html = "";

  drivers.forEach((driver) => {
    const driverInv = inventory[date]?.[driver] || {};
    const driverName = getDriverLabel(driver);

    html += `
      <div class="driver-inventory-card" style="margin-bottom: 25px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h4 style="margin-bottom: 15px; color: #1e293b;">${driverName}</h4>
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

  return html;
}

function renderGestionInventario() {
  const cont = document.getElementById("gestionInventarioContent");
  if (!cont) {
    console.error(
      "No se encontró el elemento gestionInventarioContent. Verifica que el panel esté visible."
    );
    return;
  }

  cont.innerHTML = renderGestionInventarioContent();
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
  // Actualizar inventario si estamos en la vista de coordinadora
  if (
    currentRole === "coordinadora" &&
    document.getElementById("inventoryList")
  ) {
    renderInventario();
  } else {
    renderGestionInventario();
  }
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
  // Actualizar inventario si estamos en la vista de coordinadora
  if (
    currentRole === "coordinadora" &&
    document.getElementById("inventoryList")
  ) {
    renderInventario();
  } else {
    renderGestionInventario();
  }
  dispatchDataUpdate();
}

/* =========================
   CONTROL DE MOVIMIENTOS (COORDINADORA)
========================= */
function renderControlMovimientos() {
  const cont = document.getElementById("controlMovimientosContent");
  if (!cont) {
    console.error(
      "No se encontró el elemento controlMovimientosContent. Verifica que el panel esté visible."
    );
    return;
  }

  // Guardar valores de filtros actuales antes de re-renderizar
  const currentDriver = document.getElementById("filterDriver")?.value || "";
  const currentDate = document.getElementById("filterDate")?.value || "";
  const currentProduct = document.getElementById("filterProduct")?.value || "";
  const currentType =
    document.getElementById("filterType")?.value || movementsTypePreset || "";

  cont.innerHTML = `
    <div class="filter-bar">
      <select id="filterDriver" onchange="renderControlMovimientos()">
        <option value="">Todos los conductores</option>
        <option value="conductor1" ${
          currentDriver === "conductor1" ? "selected" : ""
        }>POP217</option>
        <option value="conductor2" ${
          currentDriver === "conductor2" ? "selected" : ""
        }>POP237</option>
        <option value="conductor3" ${
          currentDriver === "conductor3" ? "selected" : ""
        }>NXY793</option>
        <option value="conductor4" ${
          currentDriver === "conductor4" ? "selected" : ""
        }>NXY794</option>
      </select>
      <select id="filterDate" onchange="renderControlMovimientos()">
        <option value="">Todas las fechas</option>
        <option value="${today()}" ${
    currentDate === today() ? "selected" : ""
  }>Hoy</option>
      </select>
      <select id="filterType" onchange="renderControlMovimientos()">
        <option value="">Todos los tipos</option>
        <option value="asignacion" ${
          currentType === "asignacion" ? "selected" : ""
        }>Asignación</option>
        <option value="modificacion" ${
          currentType === "modificacion" ? "selected" : ""
        }>Modificación</option>
        <option value="eliminacion" ${
          currentType === "eliminacion" ? "selected" : ""
        }>Eliminación</option>
        <option value="venta" ${
          currentType === "venta" ? "selected" : ""
        }>Venta</option>
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
  const filterType = document.getElementById("filterType")?.value || "";

  movementsTypePreset = "";

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
  if (filterType) {
    filteredMovements = filteredMovements.filter((m) => m.type === filterType);
  }

  const movementsList = document.getElementById("movementsList");
  if (!movementsList) {
    console.error("No se encontró el elemento movementsList");
    return;
  }

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
      const driverName = getDriverLabel(m.driver);
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
  if (!cont) {
    console.error("No se encontró el elemento supervisionVentasContent");
    return;
  }

  try {
    cont.innerHTML = `
      <div class="sales-summary">
        ${renderSalesSummary()}
      </div>
      <div class="sales-details">
        <h4>Detalle de Facturas por Conductor</h4>
        ${renderSalesByDriver()}
      </div>
    `;
  } catch (error) {
    console.error("Error al renderizar supervisión de ventas:", error);
    cont.innerHTML = `<p style="color: #ef4444; padding: 20px;">Error al cargar la información. Por favor recarga la página.</p>`;
  }
}

function renderHistorialVentas() {
  const cont = document.getElementById("historialVentasContent");
  if (!cont) {
    console.error("No se encontró el elemento historialVentasContent");
    return;
  }

  const drivers = DRIVER_IDS;
  let totalSales = 0;
  let totalInvoices = 0;
  let totalQty = 0;
  const productMap = new Map();

  drivers.forEach((driver) => {
    const driverInvoices = invoices[driver] || [];
    totalInvoices += driverInvoices.length;
    driverInvoices.forEach((inv) => {
      totalSales += inv.total || 0;
      (inv.items || []).forEach((item) => {
        const key = item.product || "Sin producto";
        const subtotal = item.subtotal ?? item.qty * item.price;
        const current = productMap.get(key) || {
          product: key,
          qty: 0,
          subtotal: 0,
        };
        current.qty += item.qty || 0;
        current.subtotal += subtotal || 0;
        totalQty += item.qty || 0;
        productMap.set(key, current);
      });
    });
  });

  salesHistoryPreset = "";

  const products = Array.from(productMap.values()).sort(
    (a, b) => b.subtotal - a.subtotal
  );

  cont.innerHTML = `
    <div class="summary-cards">
      <div class="summary-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h5>Total de Ventas</h5>
        <p class="summary-value">$${totalSales.toLocaleString()}</p>
      </div>
      <div class="summary-card" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);">
        <h5>Total Facturas</h5>
        <p class="summary-value">${totalInvoices}</p>
      </div>
      <div class="summary-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
        <h5>Unidades Vendidas</h5>
        <p class="summary-value">${totalQty}</p>
      </div>
    </div>

    <div class="movements-table">
      <div class="table-header">
        <span>Producto</span>
        <span>Cantidad</span>
        <span>Total</span>
      </div>
      <div id="historialVentasList">
        ${
          products.length === 0
            ? '<div class="table-row"><span colspan="3" style="text-align: center; padding: 20px; color: #64748b;">No hay ventas registradas</span></div>'
            : products
                .map(
                  (p) => `
            <div class="table-row">
              <span><strong>${p.product}</strong></span>
              <span>${p.qty}</span>
              <span style="color: #10b981;"><strong>$${p.subtotal.toLocaleString()}</strong></span>
            </div>
          `
                )
                .join("")
        }
      </div>
    </div>
  `;
}

function renderSalesSummary() {
  const drivers = DRIVER_IDS;
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
  const drivers = DRIVER_IDS;

  return drivers
    .map((driver, driverIndex) => {
      const driverInvoices = invoices[driver] || [];
      const driverName = getDriverLabel(driver);
      const driverTotal = driverInvoices.reduce(
        (sum, inv) => sum + (inv.total || 0),
        0
      );
      const todayInvoices = driverInvoices.filter(
        (inv) => inv.date === today()
      );

      // Guardar referencia a las facturas de este conductor para descarga
      const reversedInvoices = [...driverInvoices].reverse();

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
              ? '<div class="table-row"><span colspan="5" style="text-align: center; padding: 20px; color: #64748b;">Sin facturas registradas</span></div>'
              : `<div class="table-header" style="grid-template-columns: 1.5fr 1.5fr 2fr 1fr 1.2fr;">
                <span>Fecha</span>
                <span>Negocio</span>
                <span>Productos</span>
                <span>Total</span>
                <span>Acción</span>
              </div>
              ${reversedInvoices
                .map(
                  (inv, invIndex) => `
                <div class="table-row" style="grid-template-columns: 1.5fr 1.5fr 2fr 1fr 1.2fr;">
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
                  <span>
                    <button onclick="downloadInvoicePDFForCoordinator('${driver}', ${invIndex})" 
                            class="btn-download-pdf-small" 
                            title="Descargar PDF">
                      📄 PDF
                    </button>
                  </span>
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
  console.log("=== renderFacturas() INICIADO ===");
  console.log("currentRole:", currentRole);
  console.log("invoices:", invoices);

  // Asegurar que el panel esté visible
  const facturasPanel = document.getElementById("facturas");
  if (!facturasPanel) {
    console.error("ERROR: No se encontró el panel de facturas");
    return;
  }

  // Asegurar que el panel esté visible (siempre remover hidden)
  facturasPanel.classList.remove("hidden");
  console.log("Panel de facturas hecho visible");

  const cont = document.getElementById("invoiceList");
  if (!cont) {
    console.error(
      "ERROR: No se encontró el elemento invoiceList. Verificando estructura del DOM..."
    );
    // Intentar crear el contenedor si no existe
    const h3 = facturasPanel.querySelector("h3");
    if (h3) {
      const newCont = document.createElement("div");
      newCont.id = "invoiceList";
      facturasPanel.appendChild(newCont);
      console.log("Contenedor invoiceList creado dinámicamente");
      // Reintentar después de crear el contenedor
      setTimeout(() => renderFacturas(), 10);
      return;
    }
    facturasPanel.innerHTML =
      '<h3>Facturas</h3><p style="color: #ef4444; padding: 20px;">Error: No se encontró el contenedor de facturas.</p>';
    return;
  }

  // Limpiar contenido
  cont.innerHTML = "";

  if (currentRole === "coordinadora") {
    console.log("Renderizando facturas para COORDINADORA");
    // Mostrar todas las facturas de todos los conductores
    const drivers = DRIVER_IDS;
    const allInvoices = [];

    drivers.forEach((driver) => {
      const driverInvoices = invoices[driver] || [];
      console.log(`${driver}: ${driverInvoices.length} facturas`);
      driverInvoices.forEach((inv, index) => {
        allInvoices.push({
          ...inv,
          driver: driver,
          driverName: getDriverLabel(driver),
          originalIndex: index, // Guardar índice original para descarga
        });
      });
    });

    console.log(`Total de facturas encontradas: ${allInvoices.length}`);

    allInvoices.sort(
      (a, b) =>
        new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
    );

    if (allInvoices.length === 0) {
      cont.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p style="color: #64748b; font-size: 16px;">No hay facturas registradas</p>
        </div>
      `;
      return;
    }

    // Calcular totales
    const totalSales = allInvoices.reduce(
      (sum, inv) => sum + (inv.total || 0),
      0
    );

    const htmlContent = `
      <div class="invoices-list-header" style="margin-bottom: 20px;">
        <div>
          <h3>Facturas de Todos los Conductores</h3>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">
            Total: ${
              allInvoices.length
            } factura(s) | Total facturado: $${totalSales.toLocaleString()}
          </p>
        </div>
      </div>
      <div class="invoices-table-list">
        <div class="table-header" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;">
          <span>Fecha</span>
          <span>Conductor</span>
          <span>Negocio</span>
          <span>Total</span>
          <span>Acción</span>
        </div>
        ${allInvoices
          .map((f) => {
            // Usar el índice original guardado
            const originalIndex =
              f.originalIndex !== undefined ? f.originalIndex : 0;
            return `
            <div class="table-row" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;">
              <span>${formatDate(f.date)}</span>
              <span><strong>${f.driverName}</strong></span>
              <span>${f.negocio || "N/A"}</span>
              <span style="font-weight: 600; color: #10b981;">$${(
                f.total || 0
              ).toLocaleString()}</span>
              <span style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="downloadInvoicePDFForCoordinator('${
                  f.driver
                }', ${originalIndex})" 
                        class="btn-download-pdf" 
                        title="Descargar PDF">
                  📄 PDF
                </button>
                <button onclick="exportInvoiceToExcelForCoordinator('${
                  f.driver
                }', ${originalIndex})" 
                        class="btn-download-pdf" 
                        title="Descargar Excel">
                  📊 Excel
                </button>
              </span>
            </div>
          `;
          })
          .join("")}
      </div>
    `;

    cont.innerHTML = htmlContent;
    console.log("✅ HTML de facturas insertado correctamente");
    console.log("Total de facturas renderizadas:", allInvoices.length);
    return;
  }

  // Renderizar facturas para conductores
  console.log("Renderizando facturas para CONDUCTOR:", currentUser);
  const list = invoices[currentUser] || [];
  console.log(`Facturas encontradas para ${currentUser}:`, list.length);

  if (list.length === 0) {
    cont.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <p style="color: #64748b; font-size: 16px; margin-bottom: 10px;">No hay facturas registradas</p>
        <p style="color: #94a3b8; font-size: 14px;">Las facturas que generes aparecerán aquí</p>
      </div>
    `;
    return;
  }

  // Invertir para mostrar más recientes primero (NO modifica el array original)
  const reversedList = [...list].reverse();
  
  cont.innerHTML = `
    <div class="invoices-list-header" style="margin-bottom: 15px;">
      <h4>Mis Facturas</h4>
      <p style="color: #64748b; font-size: 14px;">Total: ${
        list.length
      } factura(s) | 🔄 Más recientes primero</p>
    </div>
    <div class="invoices-table-list">
      <div class="table-header" style="grid-template-columns: 2fr 1fr 1fr 1fr;">
        <span>Fecha</span>
        <span>Negocio</span>
        <span>Total</span>
        <span>Acción</span>
      </div>
      ${reversedList
        .map((f, i) => {
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

  // Guardar referencia a las facturas INVERTIDAS para descarga
  window.invoiceListForDownload = reversedList;
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

  // Buscar el código del producto en el catálogo
  const productInfo = productsCatalog.find((p) => p.descripcion === product);
  const codigo = productInfo?.codigo || "";
  const isPaca = normalizeUnidad(productInfo?.unidad) === "PACA";
  const unitLabel = isPaca ? "UND" : productInfo?.unidad || "";

  let qtyToAdd = 1;
  let displayQty = 1;
  let displayUnitLabel = unitLabel;
  let displayPrice = precio || 0;
  let unitsToDeduct = 1; // Cantidad en unidades para descontar del inventario
  
  if (isPaca) {
    const unitsPerPaca = getUnitsPerPacaFromDescription(
      productInfo?.descripcion || product
    );
    
    // Calcular pacas completas disponibles
    const completePacas = Math.floor(availableQty / unitsPerPaca);
    
    const unitsInput = document.getElementById(`paca-units-${index}`);
    const inputValue = unitsInput?.value?.trim();
    
    if (!inputValue || inputValue === "") {
      // Si el input está vacío, agregar una paca completa
      if (completePacas > 0) {
        unitsToDeduct = unitsPerPaca;
        displayQty = 1; // 1 paca
        displayUnitLabel = "PACA";
        displayPrice = productInfo?.precio || precio || 0; // Precio por paca
      } else {
        alert(`No hay pacas completas disponibles. Solo quedan ${availableQty} unidades sueltas.`);
        return;
      }
    } else {
      // Si hay un valor en el input, validar unidades sueltas
      qtyToAdd = parseInt(inputValue, 10);
      if (!qtyToAdd || qtyToAdd <= 0) {
        alert("Ingresa una cantidad válida de unidades");
        return;
      }
      
      // Validar que no exceda la cantidad disponible
      if (qtyToAdd > availableQty) {
        alert(`Solo quedan ${availableQty} unidades disponibles de ${product}`);
        return;
      }
      
      // Priorizar evacuar pacas completas primero
      // Solo permitir unidades sueltas si ya no hay pacas completas disponibles
      if (completePacas > 0 && qtyToAdd < unitsPerPaca) {
        alert(`Debes evacuar las pacas completas primero. Hay ${completePacas} paca(s) completa(s) disponible(s). Deja el campo vacío para agregar una paca completa.`);
        return;
      }
      
      // Unidades sueltas
      unitsToDeduct = qtyToAdd;
      displayQty = qtyToAdd;
      displayUnitLabel = "UND";
      displayPrice = precio || 0; // Precio por unidad
    }
  } else {
    unitsToDeduct = qtyToAdd;
  }

  // Verificar si el producto ya está en la factura
  // Para pacas, buscar items que coincidan en tipo (PACA o UND)
  const existingItem = invoiceItems.find((item) => {
    if (item.product === product) {
      if (isPaca) {
        // Para pacas, solo combinar si tienen el mismo unitLabel
        return item.unitLabel === displayUnitLabel;
      }
      return true;
    }
    return false;
  });

  if (existingItem) {
    // Si ya existe, aumentar la cantidad según la solicitud
    if (unitsToDeduct <= availableQty) {
      existingItem.qty += displayQty;
      existingItem.unitsToDeduct = (existingItem.unitsToDeduct || 0) + unitsToDeduct;
      existingItem.subtotal = existingItem.qty * existingItem.price;
      // Mantener el unitLabel existente (no cambiar de PACA a UND o viceversa)
    } else {
      alert(`Ya has agregado todas las unidades disponibles de ${product}`);
      return;
    }
  } else {
    // Agregar nuevo item a la factura
    invoiceItems.push({
      product: product,
      codigo: codigo,
      qty: displayQty,
      price: displayPrice,
      subtotal: displayPrice * displayQty,
      index: index,
      unitLabel: displayUnitLabel,
      unitsToDeduct: unitsToDeduct, // Guardar unidades reales para descontar del inventario
    });
  }

  updateInvoiceDisplay();
  updateAvailableQuantities();

  const unitsInput = document.getElementById(`paca-units-${index}`);
  if (unitsInput) unitsInput.value = "";
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
    <div class="invoice-items-header" style="grid-template-columns: 2fr 0.8fr 1fr 1fr 1fr 1fr;">
      <span>Producto</span>
      <span>ID</span>
      <span>Cantidad</span>
      <span>Precio Unit.</span>
      <span>Subtotal</span>
      <span>Acción</span>
    </div>
    ${invoiceItems
      .map((item, idx) => {
        total += item.subtotal;
        return `
        <div class="invoice-item-row" style="grid-template-columns: 2fr 0.8fr 1fr 1fr 1fr 1fr;">
          <span>${item.product}</span>
          <span style="color: #64748b; font-size: 13px;">${
            item.codigo || "N/A"
          }</span>
          <span>
            <button onclick="decrementInvoiceQty(${idx})" class="qty-btn-small">-</button>
            <span style="margin: 0 10px; font-weight: 600;">${formatQtyWithUnit(
              item.qty,
              item.unitLabel
            )}</span>
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

  // Calcular cantidad disponible en unidades (original - cantidad ya en factura)
  const otherItemsUnits = invoiceItems
    .filter((it, idx) => idx !== index && it.product === item.product)
    .reduce((sum, it) => {
      const productInfo = productsCatalog.find((p) => p.descripcion === it.product);
      const isPaca = normalizeUnidad(productInfo?.unidad) === "PACA";
      if (isPaca && it.unitLabel === "PACA") {
        const unitsPerPaca = getUnitsPerPacaFromDescription(
          productInfo?.descripcion || it.product
        );
        return sum + (it.qty * unitsPerPaca);
      }
      return sum + (it.unitsToDeduct || it.qty);
    }, 0);

  const availableQty = originalQty - otherItemsUnits;

  // Verificar si es una paca
  const productInfo = productsCatalog.find((p) => p.descripcion === item.product);
  const isPaca = normalizeUnidad(productInfo?.unidad) === "PACA";
  
  if (isPaca && item.unitLabel === "PACA") {
    // Es una paca completa
    const unitsPerPaca = getUnitsPerPacaFromDescription(
      productInfo?.descripcion || item.product
    );
    const completePacas = Math.floor(availableQty / unitsPerPaca);
    
    // Calcular unidades ya usadas por este item
    const currentItemUnits = item.qty * unitsPerPaca;
    const remainingAfterThis = availableQty - currentItemUnits;
    
    if (remainingAfterThis >= unitsPerPaca) {
      item.qty += 1; // Incrementar una paca
      item.unitsToDeduct = item.qty * unitsPerPaca;
      item.subtotal = item.qty * item.price;
      updateInvoiceDisplay();
      updateAvailableQuantities();
    } else {
      alert(`No hay más pacas completas disponibles. Solo quedan ${remainingAfterThis} unidades sueltas.`);
    }
  } else if (isPaca && item.unitLabel === "UND") {
    // Son unidades sueltas
    const currentItemUnits = item.unitsToDeduct || item.qty;
    const remainingAfterThis = availableQty - currentItemUnits;
    
    if (remainingAfterThis > 0) {
      item.qty += 1;
      item.unitsToDeduct = item.qty;
      item.subtotal = item.qty * item.price;
      updateInvoiceDisplay();
      updateAvailableQuantities();
    } else {
      alert(`No hay más unidades disponibles de ${item.product}`);
    }
  } else {
    // Producto normal, incrementar de a 1
    const currentItemUnits = item.unitsToDeduct || item.qty;
    const remainingAfterThis = availableQty - currentItemUnits;
    
    if (remainingAfterThis > 0) {
      item.qty += 1;
      item.unitsToDeduct = item.qty;
      item.subtotal = item.qty * item.price;
      updateInvoiceDisplay();
      updateAvailableQuantities();
    } else {
      alert(`No hay más unidades disponibles de ${item.product}`);
    }
  }
}

function decrementInvoiceQty(index) {
  if (index < 0 || index >= invoiceItems.length) return;

  const item = invoiceItems[index];
  if (item.qty > 1) {
    item.qty -= 1;
    
    // Actualizar unitsToDeduct si es necesario
    const productInfo = productsCatalog.find((p) => p.descripcion === item.product);
    const isPaca = normalizeUnidad(productInfo?.unidad) === "PACA";
    if (isPaca && item.unitLabel === "PACA") {
      const unitsPerPaca = getUnitsPerPacaFromDescription(
        productInfo?.descripcion || item.product
      );
      item.unitsToDeduct = item.qty * unitsPerPaca;
    } else if (item.unitsToDeduct !== undefined) {
      item.unitsToDeduct = item.qty;
    }
    
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

  // Calcular cantidades ya agregadas a la factura por producto (en unidades)
  const usedQty = {};
  invoiceItems.forEach((item) => {
    const productInfo = productsCatalog.find((p) => p.descripcion === item.product);
    const isPaca = normalizeUnidad(productInfo?.unidad) === "PACA";
    
    let unitsUsed = item.qty;
    if (isPaca && item.unitLabel === "PACA") {
      // Si es una paca, convertir a unidades
      const unitsPerPaca = getUnitsPerPacaFromDescription(
        productInfo?.descripcion || item.product
      );
      unitsUsed = item.qty * unitsPerPaca;
    } else if (item.unitsToDeduct !== undefined) {
      // Usar las unidades reales guardadas
      unitsUsed = item.unitsToDeduct;
    }
    
    usedQty[item.product] = (usedQty[item.product] || 0) + unitsUsed;
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
      
      // Actualizar visibilidad del input de unidades para pacas
      const productInfo = productsCatalog.find((p) => p.descripcion === product);
      const isPaca = normalizeUnidad(productInfo?.unidad) === "PACA";
      if (isPaca) {
        const unitsPerPaca = getUnitsPerPacaFromDescription(
          productInfo?.descripcion || product
        );
        const completePacas = Math.floor(available / unitsPerPaca);
        const unitsInput = document.getElementById(`paca-units-${index}`);
        if (unitsInput) {
          if (completePacas > 0) {
            unitsInput.style.display = "";
            unitsInput.placeholder = "Unidades (opcional)";
          } else {
            unitsInput.style.display = "none";
          }
        }
      }
    }
  });
}

function finalizeInvoiceFromInventory() {
  console.log("🧾 ===== INICIANDO FINALIZAR FACTURA (Módulo INVENTARIO) =====");
  
  // Capturar nombre del negocio
  const businessNameEl = document.getElementById("businessNameInvoice");
  console.log("📍 Campo businessNameInvoice existe:", !!businessNameEl);
  const businessName = businessNameEl?.value.trim();
  console.log("   Valor:", businessName || "(vacío)");
  
  // Capturar datos del cliente
  const direccionCiudadEl = document.getElementById("direccionCiudadInvoice");
  const barrioEl = document.getElementById("barrioInvoice");
  const telefonoEl = document.getElementById("telefonoInvoice");
  const nitEl = document.getElementById("nitInvoice");
  
  console.log("📍 Verificando campos del cliente:");
  console.log("   - direccionCiudadInvoice existe:", !!direccionCiudadEl);
  console.log("   - barrioInvoice existe:", !!barrioEl);
  console.log("   - telefonoInvoice existe:", !!telefonoEl);
  console.log("   - nitInvoice existe:", !!nitEl);
  
  const direccionCiudad = direccionCiudadEl?.value.trim() || "";
  const barrio = barrioEl?.value.trim() || "";
  const telefono = telefonoEl?.value.trim() || "";
  const nit = nitEl?.value.trim() || "";
  
  console.log("📝 Valores capturados:");
  console.log("   - Dirección, Ciudad:", direccionCiudad || "(vacío)");
  console.log("   - Barrio:", barrio || "(vacío)");
  console.log("   - Teléfono:", telefono || "(vacío)");
  console.log("   - NIT:", nit || "(vacío)");
  
  const paymentMethod =
    document.getElementById("paymentMethodInvoice")?.value || "efectivo";
  const installmentsValue =
    document.getElementById("installmentsInvoice")?.value || "1";
  const installments =
    paymentMethod === "tarjeta" ? parseInt(installmentsValue, 10) : null;
    
  console.log("💳 Método de pago:", paymentMethod);
  console.log("💰 Cuotas:", installments || "N/A");

  if (!businessName) {
    console.warn("⚠️ Falta nombre del negocio");
    alert("Por favor ingresa el nombre del negocio");
    return;
  }

  if (invoiceItems.length === 0) {
    console.warn("⚠️ No hay productos en la factura");
    alert("Por favor agrega al menos un producto a la factura");
    return;
  }

  if (paymentMethod === "tarjeta" && (!installments || installments < 1)) {
    alert("Por favor selecciona el número de cuotas");
    return;
  }

  const date = today();
  let total = 0;
  const saleItems = [];

  // Procesar cada item de la factura
  invoiceItems.forEach((item) => {
    saleItems.push({
      product: item.product,
      codigo: item.codigo || "",
      qty: item.qty,
      price: item.price,
      subtotal: item.subtotal,
      unitLabel: item.unitLabel || "",
    });
    total += item.subtotal;

    // Reducir inventario (calcular unidades reales a descontar)
    const driverInv = inventory[date]?.[currentUser] || {};
    if (driverInv[item.product] !== undefined) {
      const previousQty = driverInv[item.product];
      
      // Calcular unidades a descontar
      let unitsToDeduct = item.qty;
      if (item.unitsToDeduct !== undefined) {
        // Usar las unidades reales guardadas
        unitsToDeduct = item.unitsToDeduct;
      } else {
        // Calcular basándose en el unitLabel
        const productInfo = productsCatalog.find((p) => p.descripcion === item.product);
        const isPaca = normalizeUnidad(productInfo?.unidad) === "PACA";
        if (isPaca && item.unitLabel === "PACA") {
          const unitsPerPaca = getUnitsPerPacaFromDescription(
            productInfo?.descripcion || item.product
          );
          unitsToDeduct = item.qty * unitsPerPaca;
        }
      }
      
      driverInv[item.product] = Math.max(0, driverInv[item.product] - unitsToDeduct);

      // Registrar movimiento de venta
      movements.push({
        date: date,
        type: "venta",
        driver: currentUser,
        product: item.product,
        quantity: -unitsToDeduct,
        previousQuantity: previousQty,
        newQuantity: driverInv[item.product],
        timestamp: new Date().toISOString(),
      });

      if (driverInv[item.product] === 0) {
        delete driverInv[item.product];
      }
    }
  });

  // Crear objeto de factura
  const invoice = {
    date: date,
    negocio: businessName,
    direccionCiudad: direccionCiudad,
    barrio: barrio,
    telefono: telefono,
    nit: nit,
    paymentMethod: paymentMethod,
    installments: installments,
    items: saleItems,
    total: total,
    timestamp: new Date().toISOString(),
  };

  console.log("📦 Objeto de factura creado:");
  console.log("   - Negocio:", invoice.negocio);
  console.log("   - Dirección:", invoice.direccionCiudad || "(vacío)");
  console.log("   - Barrio:", invoice.barrio || "(vacío)");
  console.log("   - Teléfono:", invoice.telefono || "(vacío)");
  console.log("   - NIT:", invoice.nit || "(vacío)");
  console.log("   - Método de pago:", invoice.paymentMethod);
  console.log("   - Cuotas:", invoice.installments || "N/A");
  console.log("   - Total items:", invoice.items.length);
  console.log("   - Total:", invoice.total);

  // Guardar factura (SOLO UNA VEZ - BUG CORREGIDO)
  if (!invoices[currentUser]) invoices[currentUser] = [];
  invoices[currentUser].push(invoice);

  saveData();

  console.log("✅ Factura guardada correctamente");
  console.log("🖨️ Generando PDF...");

  // Generar y descargar PDF
  generateInvoicePDF(invoice);

  console.log("🧹 Limpiando formulario...");

  // Limpiar formulario
  invoiceItems = [];
  document.getElementById("businessNameInvoice").value = "";
  document.getElementById("direccionCiudadInvoice").value = "";
  document.getElementById("barrioInvoice").value = "";
  document.getElementById("telefonoInvoice").value = "";
  document.getElementById("nitInvoice").value = "";
  document.getElementById("paymentMethodInvoice").value = "efectivo";
  document.getElementById("installmentsInvoice").value = "1";
  toggleInstallmentsInvoice();

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
  console.log("🧾 ===== INICIANDO FINALIZAR VENTA (Módulo VENTAS) =====");
  
  // Capturar nombre del negocio
  const businessNameEl = document.getElementById("businessName");
  console.log("📍 Campo businessName existe:", !!businessNameEl);
  const businessName = businessNameEl?.value.trim() || "";
  console.log("   Valor:", businessName || "(vacío)");
  
  // Capturar datos del cliente
  const direccionCiudadEl = document.getElementById("direccionCiudad");
  const barrioEl = document.getElementById("barrio");
  const telefonoEl = document.getElementById("telefono");
  const nitEl = document.getElementById("nit");
  
  console.log("📍 Verificando campos del cliente:");
  console.log("   - direccionCiudad existe:", !!direccionCiudadEl);
  console.log("   - barrio existe:", !!barrioEl);
  console.log("   - telefono existe:", !!telefonoEl);
  console.log("   - nit existe:", !!nitEl);
  
  const direccionCiudad = direccionCiudadEl?.value.trim() || "";
  const barrio = barrioEl?.value.trim() || "";
  const telefono = telefonoEl?.value.trim() || "";
  const nit = nitEl?.value.trim() || "";
  
  console.log("📝 Valores capturados:");
  console.log("   - Dirección, Ciudad:", direccionCiudad || "(vacío)");
  console.log("   - Barrio:", barrio || "(vacío)");
  console.log("   - Teléfono:", telefono || "(vacío)");
  console.log("   - NIT:", nit || "(vacío)");
  
  const items = document.querySelectorAll(".sale-item");

  if (!businessName) {
    console.warn("⚠️ Falta nombre del negocio");
    alert("Ingresa el nombre del negocio");
    return;
  }

  if (items.length === 0) {
    console.warn("⚠️ No hay productos en la venta");
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

      // Buscar el código del producto en el catálogo
      const productInfo = productsCatalog.find(
        (p) => p.descripcion === product
      );
      const codigo = productInfo?.codigo || "";
      const unitLabel = productInfo?.unidad || "";

      saleItems.push({ product, codigo, qty, price, subtotal, unitLabel });
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
    direccionCiudad: direccionCiudad,
    barrio: barrio,
    telefono: telefono,
    nit: nit,
    items: saleItems,
    total: total,
    timestamp: new Date().toISOString(),
  };

  console.log("📦 Objeto de factura creado:");
  console.log("   - Negocio:", invoice.negocio);
  console.log("   - Dirección:", invoice.direccionCiudad || "(vacío)");
  console.log("   - Barrio:", invoice.barrio || "(vacío)");
  console.log("   - Teléfono:", invoice.telefono || "(vacío)");
  console.log("   - NIT:", invoice.nit || "(vacío)");
  console.log("   - Total items:", invoice.items.length);
  console.log("   - Total:", invoice.total);

  // Guardar factura
  if (!invoices[currentUser]) invoices[currentUser] = [];
  invoices[currentUser].push(invoice);

  saveData();

  console.log("✅ Factura guardada correctamente");
  console.log("🖨️ Generando PDF...");

  // Generar y descargar PDF
  generateInvoicePDF(invoice);

  // Limpiar formulario
  document.getElementById("businessName").value = "";
  document.getElementById("direccionCiudad").value = "";
  document.getElementById("barrio").value = "";
  document.getElementById("telefono").value = "";
  document.getElementById("nit").value = "";
  document.getElementById("saleList").innerHTML = "";
  document.getElementById("total").textContent = "0";

  alert(`Factura generada correctamente. Total: $${total.toFixed(2)}`);
  renderInventario();
}

/* =========================
   GENERAR PDF DE FACTURA
========================= */
function generateInvoicePDF(invoice) {
  console.log("📄 ===== GENERANDO PDF DE FACTURA =====");
  console.log("📦 Datos de factura recibidos:");
  console.log("   - Negocio:", invoice?.negocio || "(sin datos)");
  console.log("   - Dirección:", invoice?.direccionCiudad || "(sin datos)");
  console.log("   - Barrio:", invoice?.barrio || "(sin datos)");
  console.log("   - Teléfono:", invoice?.telefono || "(sin datos)");
  console.log("   - NIT:", invoice?.nit || "(sin datos)");
  console.log("   - Fecha:", invoice?.date || "(sin datos)");
  console.log("   - Total:", invoice?.total || 0);
  console.log("   - Items:", invoice?.items?.length || 0);
  
  // Verificar que jsPDF esté disponible
  if (typeof window.jspdf === "undefined") {
    console.error("❌ jsPDF no está disponible");
    alert(
      "Error: No se pudo generar el PDF. La biblioteca jsPDF no está cargada."
    );
    return;
  }

  console.log("✅ jsPDF está disponible");
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

  // Obtener el nombre del conductor (puede ser desde currentUser o desde la factura si es coordinadora)
  let driverName = "";
  if (currentUser && currentUser !== "coordinadora") {
    driverName = getDriverLabel(currentUser);
  } else {
    // Si es coordinadora, intentar obtener el conductor desde el contexto
    // Por ahora, usar un valor genérico o buscar en los movimientos
    driverName = "Conductor";
  }
  const invoiceDate = formatDate(invoice.date);
  const invoiceNumber = invoices[currentUser]
    ? invoices[currentUser].length
    : 1;

  // Tabla superior - Datos del cliente
  const clientTableX = 20;
  const clientTableY = yPos;
  const clientTableW = 170;
  const clientTableRowH = 8;
  const clientRows = [
    { label: "CLIENTE", value: invoice.negocio || "N/A" },
    { label: "DIRECCIÓN, CIUDAD", value: invoice.direccionCiudad || "N/A" },
    { label: "BARRIO", value: invoice.barrio || "N/A" },
    { label: "NIT", value: invoice.nit || "N/A" },
    { label: "TELÉFONO", value: invoice.telefono || "N/A" },
    {
      label: "MÉTODO DE PAGO",
      value: invoice.paymentMethod === "tarjeta" ? "Tarjeta" : "Efectivo",
    },
    {
      label: "CUOTAS",
      value:
        invoice.paymentMethod === "tarjeta" && invoice.installments
          ? String(invoice.installments)
          : "N/A",
    },
    { label: "FECHA", value: invoiceDate },
  ];

  doc.setDrawColor(...grayColor);
  doc.setFillColor(241, 245, 249);
  doc.rect(
    clientTableX,
    clientTableY,
    clientTableW,
    clientRows.length * clientTableRowH,
    "F"
  );
  doc.rect(
    clientTableX,
    clientTableY,
    clientTableW,
    clientRows.length * clientTableRowH
  );

  doc.setFontSize(9);
  clientRows.forEach((row, idx) => {
    const rowY = clientTableY + clientTableRowH * idx + 5.5;
    doc.setFont("helvetica", "bold");
    doc.text(`${row.label}:`, clientTableX + 4, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(String(row.value || "N/A"), clientTableX + 55, rowY);
  });

  // Datos del vendedor al final del bloque superior
  yPos = clientTableY + clientRows.length * clientTableRowH + 12;
  doc.setFont("helvetica", "bold");
  doc.text("VENDEDOR:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(driverName, 20, yPos + 5);
  // Número de factura en la esquina superior derecha (negrilla)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`FACTURA #${String(invoiceNumber).padStart(6, "0")}`, 195, 18, {
    align: "right",
  });
  doc.setFontSize(10);
  doc.setTextColor(...textColor);

  // Ajustar yPos para la tabla de productos
  yPos = yPos + 20;

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

  doc.text("ID", 25, yPos + 7);
  doc.text("PRODUCTO", 45, yPos + 7);
  doc.text("CANT.", 115, yPos + 7);
  doc.text("PRECIO", 135, yPos + 7);
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

    // Mostrar código/ID del producto
    const codigo = item.codigo || "N/A";
    doc.setFontSize(8);
    doc.text(String(codigo), 25, yPos + 2);

    // Ajustar texto largo del producto
    doc.setFontSize(9);
    let productText = item.product;
    if (productText.length > 30) {
      productText = productText.substring(0, 27) + "...";
    }

    doc.text(productText, 45, yPos + 2);
    doc.text(formatQtyWithUnit(item.qty, item.unitLabel), 115, yPos + 2);
    doc.text(`$${item.price.toLocaleString()}`, 135, yPos + 2);
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

/* =========================
   PDF INVENTARIO ASIGNADO
========================= */
function downloadAssignedInventoryPDF() {
  const driver = document.getElementById("invDriver")?.value;
  if (!driver) {
    alert("Por favor selecciona un conductor para descargar el PDF");
    return;
  }

  const date = today();
  const driverInv = inventory[date]?.[driver] || {};

  if (!driverInv || Object.keys(driverInv).length === 0) {
    alert("El conductor seleccionado no tiene inventario asignado hoy.");
    return;
  }

  generateInventoryAssignmentPDF(driver, date, driverInv);
}

function generateInventoryAssignmentPDF(driver, date, driverInv) {
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
  const pageHeight = doc.internal.pageSize.height || 297;
  const bottomMargin = 20;

  const driverName = getDriverLabel(driver);

  // Encabezado
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURA DE INVENTARIO", 105, 20, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Asignación de inventario diario", 105, 30, { align: "center" });

  yPos = 50;

  // Información general
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CONDUCTOR:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(driverName, 20, yPos + 5);

  doc.setFont("helvetica", "bold");
  doc.text("FECHA:", 150, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(date), 150, yPos + 5);

  yPos += 18;

  const items = Object.keys(driverInv).map((product) => {
    const qty = driverInv[product];
    const productInfo = productsCatalog.find((p) => p.descripcion === product);
    const precio = productInfo?.precio || 0;
    const isPaca = normalizeUnidad(productInfo?.unidad) === "PACA";
    const unitsPerPaca = isPaca
      ? getUnitsPerPacaFromDescription(productInfo?.descripcion || product)
      : 1;
    const unitPrice =
      isPaca && unitsPerPaca > 0
        ? Math.round((precio / unitsPerPaca) * 100) / 100
        : precio;
    const unidadLabel = isPaca ? "UND" : productInfo?.unidad || "";
    return {
      codigo: productInfo?.codigo || "",
      unidad: unidadLabel,
      product,
      qty,
      price: unitPrice,
      subtotal: qty * unitPrice,
    };
  });

  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  const totalValue = items.reduce((sum, item) => sum + item.subtotal, 0);

  doc.setTextColor(...grayColor);
  doc.setFontSize(9);
  doc.text(`Productos: ${items.length} | Unidades: ${totalQty}`, 20, yPos);
  yPos += 8;

  const addTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(20, yPos, 170, 10, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text("ID", 22, yPos + 7);
    doc.text("PRODUCTO", 35, yPos + 7);
    doc.text("UOM", 120, yPos + 7);
    doc.text("CANT.", 135, yPos + 7);
    doc.text("PRECIO", 155, yPos + 7);
    doc.text("SUBTOTAL", 190, yPos + 7, { align: "right" });

    yPos += 12;
  };

  const ensureSpace = (extraSpace = 10) => {
    if (yPos + extraSpace > pageHeight - bottomMargin) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      doc.setFont("helvetica", "bold");
      doc.text(`Inventario asignado - ${driverName}`, 20, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 6;
      addTableHeader();
    }
  };

  addTableHeader();

  // Filas
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...textColor);

  items.forEach((item, index) => {
    ensureSpace(10);

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, yPos - 3, 170, 8, "F");
    }

    const codigo = item.codigo || "N/A";
    let productText = item.product;
    if (productText.length > 40) {
      productText = productText.substring(0, 37) + "...";
    }

    doc.text(String(codigo), 22, yPos + 2);
    doc.text(productText, 35, yPos + 2);
    doc.text(String(item.unidad || "UND"), 120, yPos + 2);
    doc.text(String(item.qty), 135, yPos + 2);
    doc.text(`$${item.price.toLocaleString()}`, 155, yPos + 2);
    doc.text(`$${item.subtotal.toLocaleString()}`, 190, yPos + 2, {
      align: "right",
    });

    yPos += 8;
  });

  ensureSpace(20);

  // Total
  doc.setDrawColor(...grayColor);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  doc.setFillColor(...secondaryColor);
  doc.rect(100, yPos, 90, 12, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", 110, yPos + 8);
  doc.text(`$${totalValue.toLocaleString()}`, 185, yPos + 8, {
    align: "right",
  });

  // Nombre del archivo
  const safeDriver = driverName.replace(/[^a-z0-9]/gi, "_");
  const fileName = `Inventario_${safeDriver}_${date.replace(/-/g, "")}.pdf`;
  doc.save(fileName);
}

function generateInvoicePDFForDriver(invoice, driver) {
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

  const driverName = getDriverLabel(driver);
  const invoiceDate = formatDate(invoice.date);

  // Obtener el número de factura del conductor
  const driverInvoices = invoices[driver] || [];
  const invoiceNumber =
    driverInvoices.findIndex(
      (inv) =>
        inv.date === invoice.date &&
        inv.negocio === invoice.negocio &&
        inv.total === invoice.total
    ) + 1;

  // Tabla superior - Datos del cliente
  const clientTableX = 20;
  const clientTableY = yPos;
  const clientTableW = 170;
  const clientTableRowH = 8;
  const clientRows = [
    { label: "CLIENTE", value: invoice.negocio || "N/A" },
    { label: "DIRECCIÓN, CIUDAD", value: invoice.direccionCiudad || "N/A" },
    { label: "BARRIO", value: invoice.barrio || "N/A" },
    { label: "NIT", value: invoice.nit || "N/A" },
    { label: "TELÉFONO", value: invoice.telefono || "N/A" },
    {
      label: "MÉTODO DE PAGO",
      value: invoice.paymentMethod === "tarjeta" ? "Tarjeta" : "Efectivo",
    },
    {
      label: "CUOTAS",
      value:
        invoice.paymentMethod === "tarjeta" && invoice.installments
          ? String(invoice.installments)
          : "N/A",
    },
    { label: "FECHA", value: invoiceDate },
  ];

  doc.setDrawColor(...grayColor);
  doc.setFillColor(241, 245, 249);
  doc.rect(
    clientTableX,
    clientTableY,
    clientTableW,
    clientRows.length * clientTableRowH,
    "F"
  );
  doc.rect(
    clientTableX,
    clientTableY,
    clientTableW,
    clientRows.length * clientTableRowH
  );

  doc.setFontSize(9);
  clientRows.forEach((row, idx) => {
    const rowY = clientTableY + clientTableRowH * idx + 5.5;
    doc.setFont("helvetica", "bold");
    doc.text(`${row.label}:`, clientTableX + 4, rowY);
    doc.setFont("helvetica", "normal");
    doc.text(String(row.value || "N/A"), clientTableX + 55, rowY);
  });

  // Datos del vendedor al final del bloque superior
  yPos = clientTableY + clientRows.length * clientTableRowH + 12;
  doc.setFont("helvetica", "bold");
  doc.text("VENDEDOR:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(driverName, 20, yPos + 5);
  // Número de factura en la esquina superior derecha (negrilla)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`FACTURA #${String(invoiceNumber).padStart(6, "0")}`, 195, 18, {
    align: "right",
  });
  doc.setFontSize(10);
  doc.setTextColor(...textColor);

  // Ajustar yPos para la tabla de productos
  yPos = yPos + 20;

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

  doc.text("ID", 25, yPos + 7);
  doc.text("PRODUCTO", 45, yPos + 7);
  doc.text("CANT.", 115, yPos + 7);
  doc.text("PRECIO", 135, yPos + 7);
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

    // Mostrar código/ID del producto
    const codigo = item.codigo || "N/A";
    doc.setFontSize(8);
    doc.text(String(codigo), 25, yPos + 2);

    // Ajustar texto largo del producto
    doc.setFontSize(9);
    let productText = item.product;
    if (productText.length > 30) {
      productText = productText.substring(0, 27) + "...";
    }

    doc.text(productText, 45, yPos + 2);
    doc.text(formatQtyWithUnit(item.qty, item.unitLabel), 115, yPos + 2);
    doc.text(`$${item.price.toLocaleString()}`, 135, yPos + 2);
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
  const fileName = `Factura_${driverName.replace(
    /\s/g,
    "_"
  )}_${invoice.negocio.replace(/[^a-z0-9]/gi, "_")}_${invoice.date.replace(
    /-/g,
    ""
  )}.pdf`;

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

function escapeCsvValue(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadXlsxFile(rows, fileName) {
  console.log("📊 Iniciando descarga de Excel:", fileName);
  
  // Verificar que la librería XLSX esté cargada
  if (typeof XLSX === "undefined") {
    console.error("❌ XLSX no está definido");
    alert("⚠️ La librería de Excel no está cargada.\n\nPor favor:\n1. Verifica tu conexión a internet\n2. Recarga la página (F5)\n3. Intenta nuevamente\n\nSi el problema persiste, contacta al administrador.");
    return;
  }

  try {
    console.log("✅ XLSX está disponible. Versión:", XLSX.version || "desconocida");
    console.log("📝 Creando hoja de cálculo con", rows.length, "filas");
    
    // Validar que rows tenga datos
    if (!rows || rows.length === 0) {
      console.error("❌ No hay datos para exportar");
      alert("Error: No hay datos para exportar.");
      return;
    }
    
    // Crear la hoja de cálculo
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    
    if (!worksheet["!ref"]) {
      console.error("❌ La hoja de cálculo no se creó correctamente");
      alert("Error al crear la hoja de cálculo. Por favor, intenta nuevamente.");
      return;
    }
    
    // Obtener el rango de celdas
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    console.log("📏 Rango de celdas:", range);
    console.log("   - Filas:", range.s.r, "a", range.e.r);
    console.log("   - Columnas:", range.s.c, "a", range.e.c);
    
    // Configurar anchos de columna optimizados
    console.log("📐 Calculando anchos de columna...");
    const colWidths = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxWidth = 10;
      for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 100); row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          const cellLength = String(cell.v).length;
          maxWidth = Math.max(maxWidth, Math.min(cellLength + 2, 50));
        }
      }
      colWidths.push({ wch: maxWidth });
    }
    worksheet['!cols'] = colWidths;
    console.log("✅ Anchos de columna configurados");
    
    // Intentar aplicar estilos si está disponible (solo con xlsx-js-style)
    try {
      // Verificar si la librería soporta estilos
      const testCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: 0 })];
      if (testCell) {
        console.log("🎨 Intentando aplicar estilos al encabezado...");
        
        const headerStyle = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
          }
        };
        
        // Aplicar estilo solo al encabezado
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = headerStyle;
          }
        }
        console.log("✅ Estilos aplicados al encabezado");
      }
    } catch (styleError) {
      console.warn("⚠️ No se pudieron aplicar estilos (versión básica de XLSX):", styleError.message);
      // No es un error crítico, continuar sin estilos
    }
    
    console.log("📦 Creando libro de trabajo...");
    
    // Crear el libro de trabajo
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Factura");
    
    console.log("💾 Guardando archivo:", fileName);
    
    // Descargar el archivo
    XLSX.writeFile(workbook, fileName);
    
    console.log("✅ Excel descargado exitosamente:", fileName);
    
    // Mostrar mensaje de éxito
    setTimeout(() => {
      // Usar un mensaje más discreto si es posible
      console.log("🎉 Descarga completada");
    }, 100);
    
  } catch (error) {
    console.error("❌ Error al generar Excel:", error);
    console.error("   Stack:", error.stack);
    
    let errorMessage = "Error al generar el archivo Excel:\n\n";
    errorMessage += error.message || "Error desconocido";
    errorMessage += "\n\nPor favor:\n";
    errorMessage += "1. Verifica tu conexión a internet\n";
    errorMessage += "2. Recarga la página (F5)\n";
    errorMessage += "3. Intenta nuevamente\n\n";
    errorMessage += "Si el problema persiste, contacta al administrador.";
    
    alert(errorMessage);
  }
}

function getCoordinatorInvoiceByIndex(driver, index) {
  console.log("🔍 Buscando factura:");
  console.log("   - Driver:", driver);
  console.log("   - Index solicitado (originalIndex desde HTML):", index);
  
  const driverInvoices = invoices[driver] || [];
  console.log("   - Total facturas del conductor:", driverInvoices.length);
  
  if (!driverInvoices || driverInvoices.length === 0) {
    console.warn("⚠️ No hay facturas para este conductor");
    return null;
  }
  
  // CORRECCIÓN: El index que llega YA es el originalIndex del array
  // NO necesitamos convertirlo porque ya apunta al índice correcto
  const invoice = driverInvoices[index] || null;
  
  if (invoice) {
    console.log("✅ Factura encontrada en index:", index);
    console.log("   - Negocio:", invoice.negocio);
    console.log("   - Fecha:", invoice.date);
    console.log("   - Total:", invoice.total);
    console.log("   - Tiene direccionCiudad:", !!invoice.direccionCiudad, "→", invoice.direccionCiudad || "(vacío)");
    console.log("   - Tiene barrio:", !!invoice.barrio, "→", invoice.barrio || "(vacío)");
    console.log("   - Tiene telefono:", !!invoice.telefono, "→", invoice.telefono || "(vacío)");
    console.log("   - Tiene nit:", !!invoice.nit, "→", invoice.nit || "(vacío)");
  } else {
    console.error("❌ Factura no encontrada en el index:", index);
    console.error("   Índice válido es de 0 a", driverInvoices.length - 1);
  }
  
  return invoice;
}

function exportInvoiceToExcelForCoordinator(driver, index) {
  console.log("🚀 Iniciando exportación de factura a Excel");
  console.log("Driver:", driver, "| Index:", index);
  
  // Verificar permisos
  if (currentRole !== "coordinadora") {
    console.warn("⚠️ Usuario sin permisos para descargar facturas");
    alert("No tienes permisos para descargar estas facturas.");
    return;
  }

  // Obtener la factura
  const invoice = getCoordinatorInvoiceByIndex(driver, index);
  if (!invoice) {
    console.error("❌ Factura no encontrada para driver:", driver, "index:", index);
    alert("Error: Factura no encontrada");
    return;
  }

  console.log("✅ Factura encontrada:", invoice);

  const driverName = getDriverLabel(driver);
  console.log("👤 Nombre del conductor:", driverName);
  
  // Crear el array de filas para el Excel
  const rows = [];
  
  // Encabezado
  rows.push([
    "Fecha",
    "Conductor",
    "Negocio",
    "Dirección, Ciudad",
    "Barrio",
    "Teléfono",
    "NIT",
    "Método de pago",
    "Cuotas",
    "Producto",
    "Código",
    "Cantidad",
    "Unidad",
    "Precio",
    "Subtotal",
    "Total factura",
    "Timestamp",
  ]);

  // Verificar si hay items en la factura
  const items =
    Array.isArray(invoice.items) && invoice.items.length > 0
      ? invoice.items
      : [null];

  console.log("📦 Número de items en la factura:", items.length);

  // Agregar cada item como una fila
  items.forEach((item, idx) => {
    console.log(`  Item ${idx + 1}:`, item?.product || "Sin producto");
    
    rows.push([
      formatDate(invoice.date),
      driverName,
      invoice.negocio || "",
      invoice.direccionCiudad || "",
      invoice.barrio || "",
      invoice.telefono || "",
      invoice.nit || "",
      invoice.paymentMethod === "tarjeta" ? "Tarjeta" : "Efectivo",
      invoice.paymentMethod === "tarjeta" ? (invoice.installments || "") : "",
      item?.product || "",
      item?.codigo || "",
      item?.qty ?? "",
      item?.unitLabel || "",
      item?.price ?? "",
      item?.subtotal ?? "",
      invoice.total ?? "",
      invoice.timestamp || "",
    ]);
  });

  console.log("📊 Total de filas creadas:", rows.length, "(incluyendo encabezado)");

  // Crear nombre de archivo seguro
  const safeDriver = driverName.replace(/\s/g, "_");
  const safeBusiness = (invoice.negocio || "cliente").replace(
    /[^a-z0-9]/gi,
    "_"
  );
  const safeDate = (invoice.date || today()).replace(/-/g, "");
  const fileName = `Factura_${safeDriver}_${safeBusiness}_${safeDate}.xlsx`;

  console.log("📁 Nombre del archivo:", fileName);
  console.log("🔄 Llamando a downloadXlsxFile...");

  // Llamar a la función de descarga
  downloadXlsxFile(rows, fileName);
}

function downloadInvoicePDFForCoordinator(driver, index) {
  console.log("👩‍💼 ===== COORDINADORA DESCARGANDO PDF =====");
  console.log("📍 Driver:", driver);
  console.log("📍 Index recibido desde el botón:", index);
  
  // DIAGNÓSTICO: Mostrar TODAS las facturas de este conductor
  const allDriverInvoices = invoices[driver] || [];
  console.log("📊 TODAS las facturas del conductor (orden original):");
  allDriverInvoices.forEach((inv, idx) => {
    console.log(`   [${idx}] ${inv.date} | ${inv.negocio} | $${inv.total} | Items: ${inv.items?.length || 0}`);
  });
  
  console.log("");
  console.log("📊 Facturas en orden INVERTIDO (como se muestran en pantalla):");
  const reversedForDisplay = [...allDriverInvoices].reverse();
  reversedForDisplay.forEach((inv, idx) => {
    console.log(`   [${idx}] ${inv.date} | ${inv.negocio} | $${inv.total} | Items: ${inv.items?.length || 0} ${idx === index ? '← ESTE DEBERÍA SER' : ''}`);
  });
  
  console.log("");
  console.log("🎯 Index solicitado:", index);
  console.log("   Esto corresponde a la factura en posición", index, "del array INVERTIDO");
  
  // Obtener las facturas del conductor
  const invoice = getCoordinatorInvoiceByIndex(driver, index);

  if (!invoice) {
    console.error("❌ Factura no encontrada");
    alert("Error: Factura no encontrada");
    return;
  }

  console.log("");
  console.log("✅ Factura OBTENIDA:");
  console.log("   - Negocio:", invoice.negocio || "(sin datos)");
  console.log("   - Dirección:", invoice.direccionCiudad || "(sin datos) ⚠️");
  console.log("   - Barrio:", invoice.barrio || "(sin datos) ⚠️");
  console.log("   - Teléfono:", invoice.telefono || "(sin datos) ⚠️");
  console.log("   - NIT:", invoice.nit || "(sin datos) ⚠️");
  console.log("   - Fecha:", invoice.date || "(sin datos)");
  console.log("   - Total:", invoice.total || 0, "← VERIFICAR QUE COINCIDA CON LA PANTALLA");
  console.log("   - Items:", invoice.items?.length || 0);
  
  if (!invoice.direccionCiudad && !invoice.barrio && !invoice.telefono && !invoice.nit) {
    console.warn("");
    console.warn("⚠️⚠️⚠️ PROBLEMA IDENTIFICADO ⚠️⚠️⚠️");
    console.warn("Esta factura NO tiene datos del cliente guardados.");
    console.warn("Causa probable: El conductor NO llenó estos campos cuando generó la factura.");
    console.warn("Solución: El conductor debe llenar los campos de cliente ANTES de generar la factura.");
  }

  // Guardar temporalmente el conductor para la generación del PDF
  const originalUser = currentUser;
  currentUser = driver;

  console.log("");
  console.log("🔄 Cambiando usuario temporal de", originalUser, "a", driver);
  console.log("🖨️ Generando PDF...");

  // Generar PDF de la factura
  generateInvoicePDF(invoice);

  // Restaurar el usuario original
  currentUser = originalUser;
  console.log("🔄 Usuario restaurado a:", originalUser);
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
  const driverName = getDriverLabel(driver);

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
  if (currentPanel === "historialVentas") renderHistorialVentas();
  if (currentPanel === "facturas") renderFacturas();
  if (currentPanel === "editarPrecios") renderEditarPrecios();
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
    "historialVentas",
    "editarPrecios",
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
   EDITAR PRECIOS (COORDINADORA)
========================= */
function renderEditarPrecios() {
  const cont = document.getElementById("editarPreciosContent");
  if (!cont) {
    console.error("No se encontró el elemento editarPreciosContent");
    return;
  }

  // Asegurar que el catálogo de productos esté cargado
  if (productsCatalog.length === 0) {
    cont.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <p style="color: #64748b; font-size: 16px;">Cargando productos...</p>
      </div>
    `;
    // Intentar cargar productos
    loadProductsCatalog().then(() => {
      renderEditarPrecios();
    });
    return;
  }

  // Crear tabla de productos con precios editables
  cont.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <div>
          <h3 style="margin: 0 0 5px 0; color: #1e293b;">Listado de Productos</h3>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Total: ${
            productsCatalog.length
          } productos</p>
        </div>
        <button onclick="guardarTodosLosPrecios()" class="btn-primary">
          💾 Guardar Todos los Cambios
        </button>
      </div>
      
      <div style="margin-bottom: 15px;">
        <input 
          type="text" 
          id="buscarProductoPrecio" 
          placeholder="Buscar producto por nombre..." 
          class="form-input"
          style="width: 100%; max-width: 400px;"
          onkeyup="filtrarProductosPorPrecio()"
        >
      </div>
    </div>

    <div class="productos-precios-table" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div class="table-header" style="grid-template-columns: 3fr 1fr 1.5fr 1.5fr 1fr;">
        <span>Producto</span>
        <span>Código</span>
        <span>Unidad</span>
        <span>Precio Actual</span>
        <span>Acción</span>
      </div>
      <div id="listaProductosPrecios" style="max-height: 600px; overflow-y: auto;">
        ${productsCatalog
          .map(
            (product, index) => `
          <div class="table-row producto-precio-row" data-product-index="${index}" style="grid-template-columns: 3fr 1fr 1.5fr 1.5fr 1fr;">
            <span>
              <strong>${product.descripcion}</strong>
              ${
                product.categoria
                  ? `<span style="color: #64748b; font-size: 12px; display: block; margin-top: 4px;">${product.categoria}</span>`
                  : ""
              }
            </span>
            <span>${product.codigo || "N/A"}</span>
            <span>${product.unidad || "UND"}</span>
            <span>
              <input 
                type="number" 
                id="precio-${index}" 
                value="${product.precio || 0}" 
                min="0" 
                step="0.01"
                class="precio-input" 
                style="width: 100%; padding: 8px; border: 2px solid #cbd5e1; border-radius: 6px; font-size: 14px;"
                onchange="marcarPrecioEditado(${index})"
                data-original-price="${product.precio || 0}"
              >
            </span>
            <span>
              <button onclick="guardarPrecioIndividual(${index})" class="btn-guardar-precio" title="Guardar precio">
                💾 Guardar
              </button>
            </span>
          </div>
        `
          )
          .join("")}
      </div>
    </div>

    <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #64748b; font-size: 13px;">
        💡 <strong>Nota:</strong> Los cambios en los precios se aplicarán inmediatamente al guardar. 
        Los nuevos precios se utilizarán en las próximas facturas y asignaciones de inventario.
      </p>
    </div>
  `;
}

function marcarPrecioEditado(index) {
  const input = document.getElementById(`precio-${index}`);
  const row = document.querySelector(`[data-product-index="${index}"]`);
  if (input && row) {
    const originalPrice = parseFloat(input.dataset.originalPrice || 0);
    const newPrice = parseFloat(input.value || 0);

    if (newPrice !== originalPrice) {
      row.style.background = "#fff7ed";
      row.style.borderColor = "#fb923c";
    } else {
      row.style.background = "";
      row.style.borderColor = "";
    }
  }
}

function guardarPrecioIndividual(index) {
  const input = document.getElementById(`precio-${index}`);
  if (!input) return;

  const newPrice = parseFloat(input.value || 0);
  if (isNaN(newPrice) || newPrice < 0) {
    alert("Por favor ingresa un precio válido mayor o igual a 0");
    return;
  }

  if (index >= 0 && index < productsCatalog.length) {
    const product = productsCatalog[index];
    const oldPrice = product.precio || 0;
    product.precio = newPrice;

    // Actualizar en localStorage
    localStorage.setItem("productsCatalog", JSON.stringify(productsCatalog));

    // Actualizar precio original en el input
    input.dataset.originalPrice = newPrice.toString();

    // Remover marca visual de cambio
    const row = document.querySelector(`[data-product-index="${index}"]`);
    if (row) {
      row.style.background = "";
      row.style.borderColor = "";
    }

    alert(
      `✓ Precio de "${
        product.descripcion
      }" actualizado: $${oldPrice.toLocaleString()} → $${newPrice.toLocaleString()}`
    );
  }
}

function guardarTodosLosPrecios() {
  let cambiosGuardados = 0;
  const cambios = [];

  productsCatalog.forEach((product, index) => {
    const input = document.getElementById(`precio-${index}`);
    if (input) {
      const newPrice = parseFloat(input.value || 0);
      const originalPrice = parseFloat(input.dataset.originalPrice || 0);

      if (!isNaN(newPrice) && newPrice >= 0 && newPrice !== originalPrice) {
        const oldPrice = product.precio || 0;
        product.precio = newPrice;
        input.dataset.originalPrice = newPrice.toString();

        cambios.push({
          producto: product.descripcion,
          precioAnterior: oldPrice,
          precioNuevo: newPrice,
        });
        cambiosGuardados++;
      }
    }
  });

  if (cambiosGuardados === 0) {
    alert("No hay cambios pendientes para guardar");
    return;
  }

  // Guardar en localStorage
  localStorage.setItem("productsCatalog", JSON.stringify(productsCatalog));

  // Remover marcas visuales de cambios
  document.querySelectorAll(".producto-precio-row").forEach((row) => {
    row.style.background = "";
    row.style.borderColor = "";
  });

  const mensaje =
    cambiosGuardados === 1
      ? `✓ Se actualizó 1 precio:\n${
          cambios[0].producto
        }: $${cambios[0].precioAnterior.toLocaleString()} → $${cambios[0].precioNuevo.toLocaleString()}`
      : `✓ Se actualizaron ${cambiosGuardados} precios correctamente`;

  alert(mensaje);
}

function filtrarProductosPorPrecio() {
  const searchTerm =
    document.getElementById("buscarProductoPrecio")?.value.toLowerCase() || "";
  const rows = document.querySelectorAll(".producto-precio-row");

  rows.forEach((row) => {
    const productText = row.textContent.toLowerCase();
    row.style.display = productText.includes(searchTerm) ? "" : "none";
  });
}

/* =========================
   DESCARGA (placeholder)
========================= */
function downloadInvoices() {
  alert("Aquí irá la generación de PDF por conductor.");
}
