import React, { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ScannerZXing from "./components/ScannerZXing";

/** API base desde .env (sin slash al final) */
const API_BASE =
  (import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
    "https://mystoreappbackonline.onrender.com/api");

/* ======================= helpers HTTP ======================= */
const asJson = (r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};
// Si la API responde { ok, data }, devuelve data. Si no, devuelve el objeto tal cual.
const pickData = (r) => (r && typeof r === "object" && "data" in r ? r.data : r);

const api = {
  // Productos
  getProductos: () => fetch(`${API_BASE}/productos`).then(asJson).then(pickData),
  getProductoPorCodigo: (codigo) =>
    fetch(`${API_BASE}/productos/codigo/${encodeURIComponent(codigo)}`)
      .then(asJson).then(pickData),
  postProducto: (data) =>
    fetch(`${API_BASE}/productos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(asJson).then(pickData),
  putProducto: (id, data) =>
    fetch(`${API_BASE}/productos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(asJson).then(pickData),
  delProducto: (id) =>
    fetch(`${API_BASE}/productos/${id}`, { method: "DELETE" })
      .then(asJson).then(pickData),

  // Clientes
  getClientes: () => fetch(`${API_BASE}/clientes`).then(asJson).then(pickData),
  postCliente: (data) =>
    fetch(`${API_BASE}/clientes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(asJson).then(pickData),
  putCliente: (id, data) =>
    fetch(`${API_BASE}/clientes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(asJson).then(pickData),
  delCliente: (id) =>
    fetch(`${API_BASE}/clientes/${id}`, { method: "DELETE" })
      .then(asJson).then(pickData),

  // Ventas
  getVentas: () => fetch(`${API_BASE}/ventas`).then(asJson).then(pickData),
  getVentaById: (id) =>
    fetch(`${API_BASE}/ventas/${encodeURIComponent(id)}`)
      .then(asJson).then(pickData),
  postVenta: (data) =>
    fetch(`${API_BASE}/ventas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(asJson).then(pickData),

  // Empresa
  getEmpresa: () => fetch(`${API_BASE}/empresa`).then(asJson).then(pickData),
  putEmpresa: (data) =>
    fetch(`${API_BASE}/empresa`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(asJson).then(pickData),
};

const money = (n) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(Number(n || 0));
const todayISO = () => new Date().toISOString();

/* ======================= store con API (sin localStorage) ======================= */
function useStore() {
  const [empresa, setEmpresa] = useState({ id: 1, nombre: "", ubicacion: "", telefono: "" });
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarTodo = async () => {
    setCargando(true);
    setError(null);
    try {
      const [e, c, p, v] = await Promise.all([
        api.getEmpresa(),
        api.getClientes(),
        api.getProductos(),
        api.getVentas(),
      ]);

      // Normaliza empresa (mapear null -> "")
      const eNorm = e && typeof e === "object"
        ? {
            id: e.id ?? 1,
            nombre: e.nombre ?? "",
            ubicacion: e.ubicacion ?? "",
            telefono: e.telefono ?? "",
            modificacion: !!e.modificacion,
          }
        : { id: 1, nombre: "", ubicacion: "", telefono: "" };

      setEmpresa(eNorm);
      setClientes(Array.isArray(c) ? c : []);
      setProductos(Array.isArray(p) ? p : []);
      setVentas(Array.isArray(v) ? v : []);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar a la API.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // ============ Productos ============
  const addProducto = async (prod) => {
    await api.postProducto(prod);
    const p = await api.getProductos();
    setProductos(Array.isArray(p) ? p : []);
  };
  const updateProducto = async (prod) => {
    await api.putProducto(prod.id, prod);
    const p = await api.getProductos();
    setProductos(Array.isArray(p) ? p : []);
  };
  const deleteProducto = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;
    await api.delProducto(id);
    const p = await api.getProductos();
    setProductos(Array.isArray(p) ? p : []);
  };

  // ============ Clientes ============
  const addCliente = async (cli) => {
    await api.postCliente(cli);
    const c = await api.getClientes();
    setClientes(Array.isArray(c) ? c : []);
  };
  const updateCliente = async (cli) => {
    await api.putCliente(cli.id, cli);
    const c = await api.getClientes();
    setClientes(Array.isArray(c) ? c : []);
  };
  const deleteCliente = async (id) => {
    if (id === 1) return alert("No se puede eliminar el cliente C/F");
    if (!confirm("¿Eliminar cliente?")) return;
    await api.delCliente(id);
    const c = await api.getClientes();
    setClientes(Array.isArray(c) ? c : []);
  };

  // ============ Ventas ============
  const registrarVenta = async (venta) => {
    // Enviar exactamente: { clienteId, vendedor, fechaISO, items }
    const payload = {
      clienteId: Number(venta.clienteId),
      vendedor: String(venta.vendedor || ""),
      fechaISO: venta.fechaISO || todayISO(),
      items: (venta.items || []).map((it) => ({
        productId: it.productId,
        cantidad: it.cantidad,
        precio: it.precio,
      })),
    };

    // POST: devuelve { id, total, fecha }
    const creado = await api.postVenta(payload);

    // GET por id para obtener items y datos finales (con nombre y precio definitivos + cliente)
    const ventaCompleta = await api.getVentaById(creado.id);

    // refrescar ventas y productos (stock)
    const [v, p] = await Promise.all([api.getVentas(), api.getProductos()]);
    setVentas(Array.isArray(v) ? v : []);
    setProductos(Array.isArray(p) ? p : []);

    return ventaCompleta; // devolver a la UI para facturar luego
  };

  // ============ Empresa ============
  const guardarEmpresa = async (e) => {
    await api.putEmpresa(e);
    const fresh = await api.getEmpresa();

    const eNorm = fresh && typeof fresh === "object"
      ? {
          id: fresh.id ?? 1,
          nombre: fresh.nombre ?? "",
          ubicacion: fresh.ubicacion ?? "",
          telefono: fresh.telefono ?? "",
          modificacion: true,
        }
      : { id: 1, nombre: "", ubicacion: "", telefono: "" };

    setEmpresa(eNorm);
    return true; // para que la UI muestre el banner
  };

  return {
    empresa,
    guardarEmpresa,
    clientes,
    addCliente,
    updateCliente,
    deleteCliente,
    productos,
    addProducto,
    updateProducto,
    deleteProducto,
    ventas,
    registrarVenta,
    recargar: cargarTodo,
    cargando,
    error,
  };
}

/* ======================= UI base ======================= */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w/full max-w-2xl rounded-xl shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="block text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
function Section({ title, right, children }) {
  return (
    <div className="section">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {right}
      </div>
      <div className="section-body">{children}</div>
    </div>
  );
}

/* ======================= Productos ======================= */
function ProductosTab({ productos, onAdd, onUpdate, onDelete }) {
  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [edit, setEdit] = useState(null);

  const filtered = useMemo(
    () =>
      Array.isArray(productos)
        ? productos.filter((p) =>
            [p.nombre, p.codigo].some((s) =>
              String(s).toLowerCase().includes(q.toLowerCase())
            )
          )
        : [],
    [q, productos]
  );

  return (
    <Section title="Productos" right={<button type="button" className="btn-primary" onClick={() => setOpenAdd(true)}>+ Nuevo</button>}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
        <input className="input" placeholder="Buscar por nombre o código..." value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-sm muted">{filtered.length} resultados</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead className="thead">
            <tr>
              <th className="th">ID</th>
              <th className="th">Nombre</th>
              <th className="th">Código</th>
              <th className="th text-right">Stock</th>
              <th className="th text-right">Precio</th>
              <th className="th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="tr-hover border-t">
                <td className="td">{p.id}</td>
                <td className="td">{p.nombre}</td>
                <td className="td">{p.codigo}</td>
                <td className="td text-right">{p.stock}</td>
                <td className="td text-right">{money(p.precio)}</td>
                <td className="td flex gap-2">
                  <button type="button" className="btn-outline" onClick={() => setEdit(p)}>Editar</button>
                  <button type="button" className="btn-danger" onClick={() => onDelete(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td className="td text-center muted py-8" colSpan={6}>Sin productos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Nuevo producto">
        <ProductoForm onSubmit={(v) => { onAdd(v); setOpenAdd(false); }} />
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Editar producto">
        {edit && <ProductoForm initial={edit} onSubmit={(v) => { onUpdate({ ...edit, ...v }); setEdit(null); }} />}
      </Modal>
    </Section>
  );
}
function ProductoForm({ initial, onSubmit }) {
  const [f, setF] = useState(initial || { nombre: "", codigo: "", stock: 0, precio: 0 });
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, stock: Number(f.stock), precio: Number(f.precio) }); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
      className="grid gap-3"
    >
      <Field label="Nombre">
        <input className="input" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required />
      </Field>
      <Field label="Código de barras / QR">
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Escanea o escribe el código..." value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })}/>
          <button type="button" className="btn-outline" onClick={() => setScannerOpen(true)}>📷</button>
        </div>
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Stock"><input type="number" className="input" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })}/></Field>
        <Field label="Precio"><input type="number" step="0.01" className="input" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })}/></Field>
      </div>
      <div className="flex justify-end"><button type="submit" className="btn-primary">Guardar</button></div>

      <Modal open={scannerOpen} onClose={() => setScannerOpen(false)} title="Escanear código de producto">
        <ScannerZXing
          onResult={(code) => { setF({ ...f, codigo: String(code) }); setScannerOpen(false); }}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>
    </form>
  );
}

/* ======================= Clientes ======================= */
function ClientesTab({ clientes, onAdd, onUpdate, onDelete }) {
  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [edit, setEdit] = useState(null);

  const filtered = useMemo(
    () =>
      Array.isArray(clientes)
        ? clientes.filter((c) =>
            [c.cedula, c.nombre, c.apellido].some((s) =>
              String(s).toLowerCase().includes(q.toLowerCase())
            )
          )
        : [],
    [q, clientes]
  );

  return (
    <Section title="Clientes" right={<button type="button" className="btn-primary" onClick={() => setOpenAdd(true)}>+ Nuevo</button>}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
        <input className="input" placeholder="Buscar por NIT o nombre..." value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-sm muted">{filtered.length} resultados</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead className="thead">
            <tr>
              <th className="th">ID</th><th className="th">Cédula/NIT</th><th className="th">Nombre</th><th className="th">Apellido</th><th className="th">Teléfono</th><th className="th">Dirección</th><th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="tr-hover border-t">
                <td className="td">{c.id}</td><td className="td">{c.cedula}</td><td className="td">{c.nombre}</td><td className="td">{c.apellido}</td><td className="td">{c.telefono}</td><td className="td">{c.direccion}</td>
                <td className="td flex gap-2">
                  <button type="button" className="btn-outline" onClick={() => setEdit(c)}>Editar</button>
                  {c.id !== 1 && <button type="button" className="btn-danger" onClick={() => onDelete(c.id)}>Eliminar</button>}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td className="td text-center muted py-8" colSpan={7}>Sin clientes</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Nuevo cliente">
        <ClienteForm onSubmit={(v) => { onAdd(v); setOpenAdd(false); }} />
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Editar cliente">
        {edit && <ClienteForm initial={edit} onSubmit={(v) => { onUpdate({ ...edit, ...v }); setEdit(null); }} />}
      </Modal>
    </Section>
  );
}
function ClienteForm({ initial, onSubmit }) {
  const [f, setF] = useState(initial || { cedula: "", nombre: "", apellido: "", telefono: "", direccion: "" });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
      className="grid gap-3"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Cédula/NIT"><input className="input" value={f.cedula} onChange={(e) => setF({ ...f, cedula: e.target.value })}/></Field>
        <Field label="Teléfono"><input className="input" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })}/></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nombre"><input className="input" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })}/></Field>
        <Field label="Apellido"><input className="input" value={f.apellido} onChange={(e) => setF({ ...f, apellido: e.target.value })}/></Field>
      </div>
      <Field label="Dirección"><input className="input" value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })}/></Field>
      <div className="flex justify-end"><button type="submit" className="btn-primary">Guardar</button></div>
    </form>
  );
}

/* ======================= Vender ======================= */
function VenderTab({ productos, clientes, empresa, onRegistrarVenta }) {
  const [productIdOrCode, setProductIdOrCode] = useState("");
  const inputRef = useRef(null);
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [clienteSel, setClienteSel] = useState(1);
  const [vendedor, setVendedor] = useState("Vendedor");
  const [scannerOpen, setScannerOpen] = useState(false);

  // Estado para Pagar/Facturar flujo
  const [ultimaVenta, setUltimaVenta] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  const productosById = useMemo(
    () => (Array.isArray(productos) ? Object.fromEntries(productos.map((p) => [p.id, p])) : {}),
    [productos]
  );
  const productosByCode = useMemo(
    () => (Array.isArray(productos) ? Object.fromEntries(productos.map((p) => [String(p.codigo), p])) : {}),
    [productos]
  );

  const addToCart = (p, cantidad) => {
    if (!p) return alert("Producto no encontrado");
    if (cantidad <= 0) return;
    setCart((arr) => {
      const ex = arr.find((x) => x.productId === p.id);
      const maxQty = Number(p.stock);
      const newQty = Math.min(maxQty, (ex?.cantidad || 0) + Number(cantidad));
      return ex
        ? arr.map((x) => (x.productId === p.id ? { ...x, cantidad: newQty } : x))
        : [...arr, { productId: p.id, nombre: p.nombre, precio: p.precio, cantidad: Math.min(maxQty, Number(cantidad)) }];
    });
    if (ultimaVenta) { setUltimaVenta(null); setStatusMsg(""); }
  };

  const handleAdd = async () => {
    const val = productIdOrCode.trim();
    if (!val) return;

    let p = /^\d+$/.test(val) ? productosById[Number(val)] : null;
    if (!p) {
      try {
        const byCode = await api.getProductoPorCodigo(val);
        p = byCode || productosByCode[val];
      } catch {
        p = productosByCode[val];
      }
    }

    addToCart(p, qty);
    setProductIdOrCode("");
    setQty(1);
    inputRef.current?.focus();
  };

  const total = cart.reduce((s, it) => s + it.cantidad * it.precio, 0);

  const pagar = async () => {
    if (!cart.length) return;
    const payload = {
      clienteId: Number(clienteSel),
      vendedor,
      fechaISO: todayISO(),
      items: cart.map((it) => ({ productId: it.productId, cantidad: it.cantidad, precio: it.precio })),
    };
    const ventaSrv = await onRegistrarVenta(payload);
    setUltimaVenta(ventaSrv);
    setStatusMsg("Pago registrado correctamente. ");
  };

  const facturar = async () => {
    if (!ultimaVenta || !ultimaVenta.id) return;
    let venta = ultimaVenta;
    if (!venta.items || !venta.cliente) {
      venta = await api.getVentaById(ultimaVenta.id);
      setUltimaVenta(venta);
    }
    await generarFacturaPDF({ venta, empresa });
    setStatusMsg("Factura generada.");
    setCart([]);
    setUltimaVenta(null);
  };

  const nuevaVenta = () => {
    setCart([]);
    setUltimaVenta(null);
    setStatusMsg("");
    setProductIdOrCode("");
    setQty(1);
    inputRef.current?.focus();
  };

  const pagarDisabled = !cart.length || !!ultimaVenta;
  const facturarEnabled = !!ultimaVenta && !!ultimaVenta.id;
  const nuevaVentaDisabled = !cart.length && !ultimaVenta;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Section title="Nueva venta">
        <div
          data-allow-enter="add"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleAdd(); } }}
        >
          <div className="space-y-2 mb-3">
            <input
              className="input w-full"
              placeholder="ID de producto o Código de barras / QR"
              autoFocus
              ref={inputRef}
              value={productIdOrCode}
              onChange={(e) => setProductIdOrCode(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" className="btn-outline" onClick={() => setScannerOpen(true)}>📷 Escanear</button>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="input w-full sm:w-32"
              />
              <button type="button" className="btn-primary" onClick={handleAdd}>Agregar</button>
            </div>
          </div>

          {/* Tabla de ítems con letra más pequeña */}
          <div className="table-wrap mb-3">
            <table className="table text-sm">
              <thead className="thead">
                <tr>
                  <th className="th">Producto</th>
                  <th className="th text-right">Precio</th>
                  <th className="th text-right">Cant.</th>
                  <th className="th text-right">Subtotal</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((it) => (
                  <tr key={it.productId} className="tr-hover border-t">
                    <td className="td py-1">{it.nombre}</td>
                    <td className="td py-1 text-right">{money(it.precio)}</td>
                    <td className="td py-1 text-right">
                      <input
                        type="number"
                        min={1}
                        className="input w-24 ml-auto"
                        value={it.cantidad}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value));
                          setCart((arr) =>
                            arr.map((x) => (x.productId === it.productId ? { ...x, cantidad: v } : x))
                          );
                        }}
                      />
                    </td>
                    <td className="td py-1 text-right">{money(it.cantidad * it.precio)}</td>
                    <td className="td py-1 text-right">
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => {
                          setCart((arr) => arr.filter((x) => x.productId !== it.productId));
                          if (ultimaVenta) { setUltimaVenta(null); setStatusMsg(""); }
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {!cart.length && (
                  <tr><td className="td text-center muted py-8" colSpan={5}>Agrega productos por ID, código o escaneo</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mensaje de estado (verde) */}
          {statusMsg && (
            <div className="card card-body text-green-800 bg-green-50 border-green-200 mb-2">
              {statusMsg}
            </div>
          )}

          {/* Total + Cliente/Vendedor + Botones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm muted">Total</div>
              <div className="text-2xl font-semibold">{money(total)}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-600 mb-1">Cliente</div>
                <select
                  className="select w-full"
                  value={String(clienteSel)}
                  onChange={(e) => { setClienteSel(Number(e.target.value)); if (ultimaVenta) { setUltimaVenta(null); setStatusMsg(""); } }}
                >
                  {(clientes || []).map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.id}. {c.nombre} {c.apellido}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Vendedor</div>
                <input
                  className="input w-full"
                  value={vendedor}
                  onChange={(e) => { setVendedor(e.target.value); if (ultimaVenta) { setUltimaVenta(null); setStatusMsg(""); } }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                className={`btn-primary ${pagarDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={pagarDisabled}
                onClick={pagar}
                title={pagarDisabled ? "Agrega productos para pagar" : "Pagar"}
              >
                Pagar
              </button>

              <button
                type="button"
                className={`btn-outline ${facturarEnabled ? "" : "opacity-50 cursor-not-allowed"}`}
                disabled={!facturarEnabled}
                onClick={facturar}
                style={facturarEnabled ? { backgroundColor: "#000", color: "#fff", borderColor: "#000" } : {}}
                title={facturarEnabled ? "Generar factura" : "Primero realiza el pago"}
              >
                Facturar
              </button>

              <button
                type="button"
                className={`btn-outline ${nuevaVentaDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={nuevaVentaDisabled}
                onClick={nuevaVenta}
                title="Limpiar y comenzar una nueva venta"
              >
                Nueva venta
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* ============ RESUMEN TIPO TICKET ============ */}
      <Section title="Resumen">
        {cart.length ? (
          <div className="card border rounded-xl p-3 bg-white shadow-sm">
            <div className="space-y-2 text-sm">
              {cart.map((it) => (
                <div key={it.productId} className="border-b pb-2 last:border-none">
                  <div className="font-medium text-slate-800">{it.nombre}</div>
                  <div className="flex justify-between text-slate-600">
                    <span>Cant.</span>
                    <span className="text-slate-900">{it.cantidad}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Precio</span>
                    <span className="text-slate-900">{money(it.precio)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">
                      {money(it.cantidad * it.precio)}
                    </span>
                  </div>
                </div>
              ))}

              <div className="border-t pt-3 mt-2 flex justify-between text-base font-semibold text-slate-800">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="muted text-sm">Sin ítems en el carrito.</div>
        )}
      </Section>

      <Modal open={scannerOpen} onClose={() => setScannerOpen(false)} title="Escanear código">
        <ScannerZXing
          onResult={(code) => { setProductIdOrCode(String(code)); inputRef.current?.focus(); }}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>
    </div>
  );
}

/* ======================= FECHAS (zona America/Guatemala) ======================= */
const formatFechaLocal = (fechaStr) => {
  if (!fechaStr) return "";

  // Si viene en formato ISO sin hora útil
  if (/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(fechaStr)) {
    const [y, m, d] = fechaStr.split("T")[0].split("-");
    return `${d}/${m}/${y}`; // Ej: 14/10/2025
  }

  const fecha = new Date(fechaStr);
  if (isNaN(fecha)) return String(fechaStr);

  // Formato completo con hora local
  return fecha.toLocaleString("es-GT", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Clave YYYY-MM-DD en zona GT (ideal para comparar y filtrar rango/hoy)
// Clave de fecha en zona America/Guatemala (YYYY-MM-DD)
const toGTDateKey = (d) => {
  if (!d) return "";

  // Si viene exactamente como "YYYY-MM-DDT00:00:00.000Z", usa la parte de fecha tal cual.
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(d)) {
    return d.slice(0, 10); // "YYYY-MM-DD"
  }

  const date = new Date(d);
  if (isNaN(date)) return String(d);

  // Formatear a zona America/Guatemala y aaaaa-mm-dd
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return fmt.format(date); // "YYYY-MM-DD"
};


/* ======================= Ventas ======================= */
function VentasTab({ ventas, clientes, productos }) {
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  // Buscador + Filtros (Hoy / Todas / Rango)
  const [q, setQ] = useState("");
  const [modo, setModo] = useState("todas"); // 'todas' | 'hoy' | 'rango'
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const ventasFiltradas = useMemo(() => {
    let arr = Array.isArray(ventas) ? ventas.slice() : [];

    // Filtro por modo de fecha (en zona GT)
    if (modo === "hoy") {
      const hoyKey = toGTDateKey(new Date());
      arr = arr.filter((v) => toGTDateKey(v.fecha || v.fechaISO || new Date()) === hoyKey);
    } else if (modo === "rango" && (desde || hasta)) {
      const d1 = desde ? desde : null; // YYYY-MM-DD
      const d2 = hasta ? hasta : null; // YYYY-MM-DD
      arr = arr.filter((v) => {
        const key = toGTDateKey(v.fecha || v.fechaISO || new Date());
        if (d1 && key < d1) return false;
        if (d2 && key > d2) return false;
        return true;
      });
    }

    // Buscador
    const QQ = q.trim().toLowerCase();
    if (QQ) {
      arr = arr.filter((v) => {
        const c = v.cliente || (clientes || []).find((x) => x.id === v.clienteId);
        const campos = [
          String(v.id),
          v.vendedor || "",
          c ? `${c.nombre} ${c.apellido}` : "",
          c?.cedula || "",
          formatFechaLocal(v.fecha || v.fechaISO),
          String(v.total),
        ].join(" ").toLowerCase();
        return campos.includes(QQ);
      });
    }
    return arr;
  }, [ventas, clientes, q, modo, desde, hasta]);

  /* ============ DETALLE ============ */
  const abrirDetalle = async (ventaId) => {
    setDetalleLoading(true);
    try {
      const v = await api.getVentaById(ventaId);
      setDetalleVenta(v);
      setDetalleOpen(true);
    } catch (e) {
      alert("No se pudo obtener el detalle de la venta.");
    } finally {
      setDetalleLoading(false);
    }
  };

  const generarFactura = async (ventaId) => {
    try {
      const v = await api.getVentaById(ventaId);
      await generarFacturaPDF({ venta: v });
    } catch {
      alert("No se pudo generar la factura.");
    }
  };

  /* ============ EXPORTAR PDF ============ */
  const exportarPDF = () => {
    if (!ventasFiltradas.length) return alert("No hay datos para exportar.");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Reporte de Ventas", 14, 20);
    const body = ventasFiltradas.map((v) => {
      const c = v.cliente || (clientes || []).find((x) => x.id === v.clienteId);
      return [
        v.id,
        formatFechaLocal(v.fecha || v.fechaISO),
        c ? `${c.nombre} ${c.apellido}` : "",
        c?.cedula || "",
        v.vendedor,
        money(v.total),
      ];
    });
    autoTable(doc, {
      head: [["ID", "Fecha", "Cliente", "NIT", "Vendedor", "Total"]],
      body,
      startY: 30,
    });
    doc.save(`reporte_ventas_${toGTDateKey(new Date())}.pdf`);
  };

  /* ============ EXPORTAR EXCEL ============ */
  const exportarExcel = () => {
    if (!ventasFiltradas.length) return alert("No hay datos para exportar.");
    const datos = ventasFiltradas.map((v) => {
      const c = v.cliente || (clientes || []).find((x) => x.id === v.clienteId);
      return {
        ID: v.id,
        Fecha: formatFechaLocal(v.fecha || v.fechaISO),
        Cliente: c ? `${c.nombre} ${c.apellido}` : "",
        NIT: c?.cedula || "",
        Vendedor: v.vendedor,
        Total: v.total,
      };
    });
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, `reporte_ventas_${toGTDateKey(new Date())}.xlsx`);
  };

  return (
    <Section
      title="Ventas"
      right={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          {/* Buscador */}
          <div className="w-full sm:w-64">
            <input
              className="input w-full"
              placeholder="Buscar Factura, cliente, vendedor, NIT…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Modo de filtro (Combobox) */}
          <div>
            <div className="text-xs text-slate-600 mb-1">Filtrar por</div>
            <select
              className="select w-full sm:w-40"
              value={modo}
              onChange={(e) => setModo(e.target.value)}
            >
              <option value="todas">Todas</option>
              <option value="hoy">Hoy</option>
              <option value="rango">Rango</option>
            </select>
          </div>

          {/* Rango de fechas, solo cuando modo === "rango" */}
          {modo === "rango" && (
            <div className="flex items-end gap-2">
              <div>
                <div className="text-xs text-slate-600 mb-1">Desde</div>
                <input
                  type="date"
                  className="input"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-slate-600 mb-1">Hasta</div>
                <input
                  type="date"
                  className="input"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Exportar */}
          <div className="flex gap-2">
            <button type="button" className="btn-outline" onClick={exportarPDF}>
              PDF
            </button>
            <button type="button" className="btn-outline" onClick={exportarExcel}>
              Excel
            </button>
          </div>
        </div>
      }

    >
      <div className="table-wrap">
        <table className="table">
          <thead className="thead">
            <tr>
              <th className="th">#</th>
              <th className="th">Fecha</th>
              <th className="th">Cliente</th>
              <th className="th">Vendedor</th>
              <th className="th text-right">Total</th>
              <th className="th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(ventasFiltradas || []).map((v) => {
              const c = v.cliente || (clientes || []).find((x) => x.id === v.clienteId);
              return (
                <tr key={v.id} className="tr-hover border-t">
                  <td className="td">{v.id}</td>
                  <td className="td">{formatFechaLocal(v.fecha || v.fechaISO)}</td>
                  <td className="td">{c ? `${c.nombre} ${c.apellido}` : ""}</td>
                  <td className="td">{v.vendedor}</td>
                  <td className="td text-right">{money(v.total)}</td>
                  <td className="td flex gap-2">
                    <button type="button" className="btn-outline" onClick={() => abrirDetalle(v.id)}>Detalles</button>
                    <button type="button" className="btn-primary" onClick={() => generarFactura(v.id)}>Facturar</button>
                  </td>
                </tr>
              );
            })}
            {(!ventasFiltradas || !ventasFiltradas.length) && (
              <tr><td className="td text-center muted py-8" colSpan={6}>Sin ventas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={detalleOpen} onClose={() => setDetalleOpen(false)} title={`Detalle de venta ${detalleVenta?.id ?? ""}`}>
        {detalleLoading && <div>Cargando…</div>}
        {!detalleLoading && detalleVenta && (
          <div className="space-y-3 text-sm">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="muted">Fecha</div>
                <div>{formatFechaLocal(detalleVenta.fecha || detalleVenta.fechaISO)}</div>
              </div>
              <div>
                <div className="muted">Vendedor</div>
                <div>{detalleVenta.vendedor}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="muted">Cliente</div>
                <div>
                  {detalleVenta.cliente
                    ? `${detalleVenta.cliente.nombre} ${detalleVenta.cliente.apellido} — NIT: ${detalleVenta.cliente.cedula}`
                    : `#${detalleVenta.clienteId}`}
                </div>
                {detalleVenta.cliente?.direccion && (
                  <div className="muted">Dirección: {detalleVenta.cliente.direccion}</div>
                )}
                {detalleVenta.cliente?.telefono && (
                  <div className="muted">Tel: {detalleVenta.cliente.telefono}</div>
                )}
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead className="thead">
                  <tr>
                    <th className="th">Producto</th>
                    <th className="th text-right">Precio</th>
                    <th className="th text-right">Cant.</th>
                    <th className="th text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(detalleVenta.items || []).map((it) => {
                    const nombre = it.nombre || `#${it.productId}`;
                    const precio = Number(it.precio || 0);
                    return (
                      <tr key={it.id} className="tr-hover border-t">
                        <td className="td">{nombre}</td>
                        <td className="td text-right">{money(precio)}</td>
                        <td className="td text-right">{it.cantidad}</td>
                        <td className="td text-right">{money(precio * it.cantidad)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-4 text-base font-semibold">
              <div>Total: {money(detalleVenta.total)}</div>
            </div>
          </div>
        )}
      </Modal>
    </Section>
  );
}

/* ======================= Empresa ======================= */
function EmpresaTab({ empresa, guardarEmpresa, onReload }) {
  const [form, setForm] = useState(empresa);
  const [okMsg, setOkMsg] = useState("");
  useEffect(() => setForm(empresa), [empresa]);

  const onSave = async () => {
    await guardarEmpresa(form);
    setOkMsg("Empresa actualizada correctamente.");
    setTimeout(() => setOkMsg(""), 3000);
  };

  return (
    <Section title="Empresa" right={<button type="button" className="btn-danger" onClick={onReload}>Recargar</button>}>
      {okMsg && (
        <div className="card card-body text-green-800 bg-green-50 border-green-200 mb-3">
          {okMsg}
        </div>
      )}
      <div className="grid gap-3 max-w-xl">
        <Field label="Nombre">
          <input className="input" value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })}/>
        </Field>
        <Field label="Ubicación">
          <input className="input" value={form.ubicacion ?? ""} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}/>
        </Field>
        <Field label="Teléfono">
          <input className="input" value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })}/>
        </Field>
        <div className="pt-1">
          <button type="button" className="btn-primary" onClick={onSave}>Guardar</button>
        </div>
      </div>
    </Section>
  );
}

/* ======================= PDF ======================= */
async function generarFacturaPDF({ venta, empresa }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margen = 36;
  const ancho = 595 - margen * 2;

  const emp = empresa || { nombre: "", ubicacion: "", telefono: "" };

  let y = margen;
  doc.setFontSize(16); doc.setFont(undefined, "bold");
  doc.text(emp.nombre || "Empresa", margen, y);
  doc.setFontSize(10); doc.setFont(undefined, "normal");
  y += 16; doc.text(emp.ubicacion || "", margen, y);
  y += 14; doc.text(`Tel: ${emp.telefono || ""}`, margen, y);

  y = margen; const xRight = 595 - margen;
  doc.setFont(undefined, "bold"); doc.text("FACTURA", xRight, y, { align: "right" });
  doc.setFont(undefined, "normal");
  y += 14; doc.text(`No.: ${venta.id ?? ""}`, xRight, y, { align: "right" });
  y += 14; doc.text(`Fecha: ${formatFechaLocal(venta.fechaISO || venta.fecha || new Date())}`, xRight, y, { align: "right" });
  y += 14; doc.text(`Vendedor: ${venta.vendedor}`, xRight, y, { align: "right" });

  // Cliente (prioriza venta.cliente)
  y += 24; doc.setFont(undefined, "bold"); doc.text("Cliente", margen, y);
  doc.setFont(undefined, "normal");
  const c = venta.cliente || null;
  const nombreCli = c ? `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim() : "";
  const cedulaCli = c?.cedula || "";
  const dirCli = c?.direccion || "";
  y += 14; doc.text(`Nombre: ${nombreCli}`, margen, y);
  y += 14; doc.text(`Cédula/NIT: ${cedulaCli}`, margen, y);
  y += 14; doc.text(`Dirección: ${dirCli}`, margen, y);

  // Detalle
  y += 24; doc.setFont(undefined, "bold"); doc.text("Detalle", margen, y);
  y += 10; doc.setLineWidth(0.5); doc.line(margen, y, margen + ancho, y);
  y += 14; doc.setFont(undefined, "normal");

  const colW = [ancho * 0.5, ancho * 0.16, ancho * 0.12, ancho * 0.22];
  const printRow = (cells) => { let x = margen; cells.forEach((t, i) => { doc.text(String(t), x, y); x += colW[i]; }); y += 16; };

  printRow(["Producto", "Precio", "Cant.", "Subtotal"]);
  y -= 8; doc.setLineWidth(0.2); doc.line(margen, y, margen + ancho, y); y += 14;

  (venta.items || []).forEach((it) => {
    const nombre = it.nombre || `#${it.productId}`;
    const precio = Number(it.precio || 0);
    printRow([nombre, money(precio), it.cantidad, money(it.cantidad * precio)]);
  });

  y += 6; doc.setLineWidth(0.5); doc.line(margen, y, margen + ancho, y); y += 18;
  doc.setFont(undefined, "bold"); doc.text("Total:", margen + colW[0] + colW[1] + colW[2], y);
  doc.text(money(venta.total), margen + colW[0] + colW[1] + colW[2] + 80, y);

  y += 28; doc.setFont(undefined, "normal"); doc.setFontSize(9);
  doc.text("Gracias por su compra.", margen, y);

  doc.save(`factura_${venta.id ?? "venta"}.pdf`);
}

/* ======================= App ======================= */
export default function App() {
  const [tab, setTab] = useState("vender");
  const store = useStore();

  // Guard global: bloquea Enter en todo, salvo donde se permita expresamente
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Enter') return;
      const path = e.composedPath ? e.composedPath() : (function(el){ const arr=[]; while(el){ arr.push(el); el = el.parentElement; } return arr; })(e.target);
      const allow = path.some((el) => el && el.dataset && el.dataset.allowEnter === 'add') || (e.target && e.target.tagName === 'TEXTAREA');
      if (!allow) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handler, true); // capture
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  return (
    <div className="min-h-screen">
      <TopBar tab={tab} onTab={setTab} />
      <div className="container-app space-y-6 py-6">
        {store.cargando && <div className="card card-body">Cargando datos…</div>}
        {!store.cargando && store.error && (
          <div className="card card-body text-amber-700 bg-amber-50 border-amber-200">
            {store.error}
          </div>
        )}

        {tab === "productos" && (
          <ProductosTab
            productos={store.productos}
            onAdd={store.addProducto}
            onUpdate={store.updateProducto}
            onDelete={store.deleteProducto}
          />
        )}
        {tab === "clientes" && (
          <ClientesTab
            clientes={store.clientes}
            onAdd={store.addCliente}
            onUpdate={store.updateCliente}
            onDelete={store.deleteCliente}
          />
        )}
        {tab === "vender" && (
          <VenderTab
            productos={store.productos}
            clientes={store.clientes}
            empresa={store.empresa}
            onRegistrarVenta={store.registrarVenta}
          />
        )}
        {tab === "ventas" && (
          <VentasTab
            ventas={store.ventas}
            clientes={store.clientes}
            productos={store.productos}
          />
        )}
        {tab === "empresa" && (
          <EmpresaTab
            empresa={store.empresa}
            guardarEmpresa={store.guardarEmpresa}
            onReload={store.recargar}
          />
        )}
      </div>
    </div>
  );
}

function TopBar({ tab, onTab }) {
  const tabs = ["productos", "clientes", "vender", "ventas", "empresa"];
  const labels = { productos: "Productos", clientes: "Clientes", vender: "Vender", ventas: "Ventas", empresa: "Empresa" };
  return (
    <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="container-app flex items-center justify-between py-3">
        <div className="font-semibold tracking-tight text-lg">MyStore</div>
        <nav className="tabs-bar">
          {tabs.map((t) => (
            <button
              type="button"
              key={t}
              className={`tab ${tab === t ? "tab-active" : ""}`}
              onClick={() => onTab(t)}
            >
              {labels[t]}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
