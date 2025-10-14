import React, { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import ScannerZXing from "./components/ScannerZXing";

/* ========= Config & helpers ========= */
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "https://mystoreappbackonline.onrender.com/api";
const json = (r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};
const api = {
  // Productos
  getProductos: () => fetch(`${API_BASE}/productos`).then(json),
  getProductoPorCodigo: (codigo) => fetch(`${API_BASE}/productos/codigo/${encodeURIComponent(codigo)}`).then(json),
  postProducto: (data) =>
    fetch(`${API_BASE}/productos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json),
  putProducto: (id, data) =>
    fetch(`${API_BASE}/productos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json),
  delProducto: (id) => fetch(`${API_BASE}/productos/${id}`, { method: "DELETE" }).then(json),

  // Clientes
  getClientes: () => fetch(`${API_BASE}/clientes`).then(json),
  postCliente: (data) =>
    fetch(`${API_BASE}/clientes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json),
  putCliente: (id, data) =>
    fetch(`${API_BASE}/clientes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json),
  delCliente: (id) => fetch(`${API_BASE}/clientes/${id}`, { method: "DELETE" }).then(json),

  // Ventas
  getVentas: () => fetch(`${API_BASE}/ventas`).then(json),
  postVenta: (data) =>
    fetch(`${API_BASE}/ventas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json),

  // Empresa
  getEmpresa: () => fetch(`${API_BASE}/empresa`).then(json),
  putEmpresa: (data) =>
    fetch(`${API_BASE}/empresa/1`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json),
};

const money = (n) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(Number(n || 0));
const todayISO = () => new Date().toISOString();

/* ========= seeds de fallback (sólo si API falla) ========= */
const seedEmpresa = { id: 1, nombre: "Mi Empresa", ubicacion: "Ciudad, Guatemala", telefono: "5555-0000" };
const seedClientes = [
  { id: 1, cedula: "", nombre: "C/F", apellido: "", telefono: "", direccion: "" },
  { id: 2, cedula: "1234567-8", nombre: "Ana", apellido: "Pérez", telefono: "5555-0001", direccion: "Zona 1" },
];
const seedProductos = [
  { id: 1, nombre: "Lector de codigo de barras", codigo: "810098151139", stock: 100, precio: 200 },
  { id: 2, nombre: "Libro muchos cuerpos una misma alma", codigo: "9788496546080", stock: 60, precio: 150 },
];

/* ========= store (con API) ========= */
function useStore() {
  const [empresa, setEmpresa] = useState(seedEmpresa);
  const [clientes, setClientes] = useState(seedClientes);
  const [productos, setProductos] = useState(seedProductos);
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
      // Normaliza empresa: si API devuelve arreglo, toma el primero
      setEmpresa(Array.isArray(e) ? (e[0] || seedEmpresa) : e);
      setClientes(c || []);
      setProductos(p || []);
      setVentas(v || []);
    } catch (err) {
      console.warn("Fallo al cargar API. Usando seeds de fallback.", err);
      setError("No se pudo conectar a la API. Trabajando con datos locales temporales.");
      // seeds ya quedaron cargados por defecto
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // Productos
  const addProducto = async (prod) => {
    try {
      const nuevo = await api.postProducto(prod);
      setProductos((arr) => [...arr, nuevo]);
    } catch (err) {
      alert("No se pudo crear el producto");
      console.error(err);
    }
  };
  const updateProducto = async (prod) => {
    try {
      const actualizado = await api.putProducto(prod.id, prod);
      setProductos((arr) => arr.map((x) => (x.id === prod.id ? actualizado : x)));
    } catch (err) {
      alert("No se pudo actualizar el producto");
      console.error(err);
    }
  };
  const deleteProducto = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      await api.delProducto(id);
      setProductos((arr) => arr.filter((x) => x.id !== id));
    } catch (err) {
      alert("No se pudo eliminar el producto");
      console.error(err);
    }
  };

  // Clientes
  const addCliente = async (cli) => {
    try {
      const nuevo = await api.postCliente(cli);
      setClientes((arr) => [...arr, nuevo]);
    } catch (err) {
      alert("No se pudo crear el cliente");
      console.error(err);
    }
  };
  const updateCliente = async (cli) => {
    try {
      const actualizado = await api.putCliente(cli.id, cli);
      setClientes((arr) => arr.map((x) => (x.id === cli.id ? actualizado : x)));
    } catch (err) {
      alert("No se pudo actualizar el cliente");
      console.error(err);
    }
  };
  const deleteCliente = async (id) => {
    if (id === 1) return alert("No se puede eliminar el cliente C/F");
    if (!confirm("¿Eliminar cliente?")) return;
    try {
      await api.delCliente(id);
      setClientes((arr) => arr.filter((x) => x.id !== id));
    } catch (err) {
      alert("No se pudo eliminar el cliente");
      console.error(err);
    }
  };

  // Ventas
  const registrarVenta = async (venta) => {
    try {
      // El backend se encarga de descontar stocks y guardar detalle
      const creada = await api.postVenta({
        clienteId: venta.clienteId,
        vendedor: venta.vendedor,
        total: venta.total,
        fecha: new Date(venta.fechaISO).toISOString().slice(0, 10),
        items: venta.items.map((it) => ({
          productoId: it.productId,
          cantidad: it.cantidad,
          precio: it.precio,
        })),
      });
      setVentas((arr) => [...arr, creada]);

      // Como el stock cambia, recargamos productos desde la API:
      try {
        const p = await api.getProductos();
        setProductos(p || []);
      } catch {}
    } catch (err) {
      alert("No se pudo registrar la venta");
      console.error(err);
    }
  };

  const resetAll = () => {
    // Sólo para demo: vuelve a cargar desde API (o seeds en caso de error)
    cargarTodo();
  };

  return {
    empresa,
    setEmpresa: async (e) => {
      try {
        const upd = await api.putEmpresa(e);
        setEmpresa(upd);
      } catch (err) {
        alert("No se pudo guardar la empresa");
        console.error(err);
      }
    },

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

    resetAll,
    cargando,
    error,
  };
}

/* ========= UI base ========= */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">✕</button>
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

/* ========= Productos ========= */
function ProductosTab({ productos, onAdd, onUpdate, onDelete }) {
  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [edit, setEdit] = useState(null);
  const filtered = useMemo(
    () => productos.filter((p) => [p.nombre, p.codigo].some((s) => String(s).toLowerCase().includes(q.toLowerCase()))),
    [q, productos]
  );
  return (
    <Section title="Productos" right={<button className="btn-primary" onClick={() => setOpenAdd(true)}>+ Nuevo</button>}>
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
                  <button className="btn-outline" onClick={() => setEdit(p)}>Editar</button>
                  <button className="btn-danger" onClick={() => onDelete(p.id)}>Eliminar</button>
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
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...f, stock: Number(f.stock), precio: Number(f.precio) });
      }}
      className="grid gap-3"
    >
      <Field label="Nombre">
        <input
          className="input"
          value={f.nombre}
          onChange={(e) => setF({ ...f, nombre: e.target.value })}
          required
        />
      </Field>

      <Field label="Código de barras / QR">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Escanea o escribe el código..."
            value={f.codigo}
            onChange={(e) => setF({ ...f, codigo: e.target.value })}
          />
          <button type="button" className="btn-outline" onClick={() => setScannerOpen(true)}>📷</button>
        </div>
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Stock">
          <input type="number" className="input" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })}/>
        </Field>
        <Field label="Precio">
          <input type="number" step="0.01" className="input" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })}/>
        </Field>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">Guardar</button>
      </div>

      <Modal open={scannerOpen} onClose={() => setScannerOpen(false)} title="Escanear código de producto">
        <ScannerZXing
          onResult={(code) => { setF({ ...f, codigo: String(code) }); setScannerOpen(false); }}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>
    </form>
  );
}

/* ========= Clientes ========= */
function ClientesTab({ clientes, onAdd, onUpdate, onDelete }) {
  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [edit, setEdit] = useState(null);
  const filtered = useMemo(
    () =>
      clientes.filter((c) =>
        [c.cedula, c.nombre, c.apellido].some((s) =>
          String(s).toLowerCase().includes(q.toLowerCase())
        )
      ),
    [q, clientes]
  );
  return (
    <Section title="Clientes" right={<button className="btn-primary" onClick={() => setOpenAdd(true)}>+ Nuevo</button>}>
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
                  <button className="btn-outline" onClick={() => setEdit(c)}>Editar</button>
                  {c.id !== 1 && <button className="btn-danger" onClick={() => onDelete(c.id)}>Eliminar</button>}
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
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="grid gap-3">
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

/* ========= Vender ========= */
function VenderTab({ productos, clientes, onRegistrarVenta }) {
  const [productIdOrCode, setProductIdOrCode] = useState("");
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [clienteSel, setClienteSel] = useState(1);
  const [vendedor, setVendedor] = useState("Vendedor");
  const [scannerOpen, setScannerOpen] = useState(false);

  const productosById = useMemo(() => Object.fromEntries(productos.map((p) => [p.id, p])), [productos]);
  const productosByCode = useMemo(() => Object.fromEntries(productos.map((p) => [String(p.codigo), p])), [productos]);

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
  };

  const handleAdd = async () => {
    const val = productIdOrCode.trim();
    if (!val) return;

    // Buscar por ID o por código:
    let p = /^\d+$/.test(val) ? productosById[Number(val)] : null;
    if (!p) {
      try {
        const byCode = await api.getProductoPorCodigo(val);
        p = byCode || productosByCode[val];
      } catch {
        // si la API no tiene endpoint de código o falla, recurre al local
        p = productosByCode[val];
      }
    }

    addToCart(p, qty);
    setProductIdOrCode("");
    setQty(1);
  };

  const total = cart.reduce((s, it) => s + it.cantidad * it.precio, 0);

  const pagar = async () => {
    if (!cart.length) return;
    const venta = {
      clienteId: Number(clienteSel),
      vendedor,
      total: Number(total.toFixed(2)),
      fechaISO: todayISO(),
      items: cart.map((it) => ({ productId: it.productId, cantidad: it.cantidad, precio: it.precio })),
    };
    await onRegistrarVenta(venta);
    await generarFacturaPDF({ venta, clientes, productosById });
    setCart([]);
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Section title="Nueva venta">
        <div className="space-y-2 mb-3">
          <input
            className="input w-full"
            placeholder="ID de producto o Código de barras / QR"
            value={productIdOrCode}
            onChange={(e) => setProductIdOrCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="btn-outline" onClick={() => setScannerOpen(true)}>📷 Escanear</button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="input w-full sm:w-32"
            />
            <button className="btn-primary" onClick={handleAdd}>Agregar</button>
          </div>
        </div>

        <div className="table-wrap mb-3">
          <table className="table">
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
                  <td className="td">{it.nombre}</td>
                  <td className="td text-right">{money(it.precio)}</td>
                  <td className="td text-right">
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
                  <td className="td text-right">{money(it.cantidad * it.precio)}</td>
                  <td className="td text-right">
                    <button className="btn-danger" onClick={() => setCart((arr) => arr.filter((x) => x.productId !== it.productId))}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {!cart.length && (
                <tr><td className="td text-center muted py-8" colSpan={5}>Agrega productos por ID, código o escaneo</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="grid gap-2 sm:grid-cols-3 sm:items-end w-full sm:w-auto">
            <div>
              <div className="text-xs text-slate-600 mb-1">Cliente</div>
              <select className="select" value={String(clienteSel)} onChange={(e) => setClienteSel(Number(e.target.value))}>
                {clientes.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.id}. {c.nombre} {c.apellido}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Vendedor</div>
              <input className="input" value={vendedor} onChange={(e) => setVendedor(e.target.value)} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm muted">Total</div>
            <div className="text-2xl font-semibold">{money(total)}</div>
            <button className="btn-primary mt-2" disabled={!cart.length} onClick={pagar}>Pagar y Facturar</button>
          </div>
        </div>
      </Section>

      <Section title="Resumen">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Ítems:</span><span>{cart.length}</span></div>
          <div className="flex justify-between font-medium text-base"><span>Total:</span><span>{money(total)}</span></div>
        </div>
      </Section>

      <Modal open={scannerOpen} onClose={() => setScannerOpen(false)} title="Escanear código">
        <ScannerZXing
          onResult={(code) => {
            setProductIdOrCode(String(code));
            // Si deseas agregar automáticamente al leer:
            // setQty(1); handleAdd();
          }}
          onClose={() => setScannerOpen(false)}
        />
      </Modal>
    </div>
  );
}

/* ========= Ventas ========= */
function VentasTab({ ventas, clientes, productos }) {
  const productosById = useMemo(() => Object.fromEntries(productos.map((p) => [p.id, p])), [productos]);
  const descargar = async (venta) => { await generarFacturaPDF({ venta, clientes, productosById }); };
  return (
    <Section title="Ventas">
      <div className="table-wrap">
        <table className="table">
          <thead className="thead">
            <tr>
              <th className="th">#</th>
              <th className="th">Fecha</th>
              <th className="th">Cliente</th>
              <th className="th">Vendedor</th>
              <th className="th text-right">Total</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => {
              const c = clientes.find((x) => x.id === v.clienteId);
              return (
                <tr key={v.id} className="tr-hover border-t">
                  <td className="td">{v.id}</td>
                  <td className="td">{new Date(v.fechaISO || v.fecha || new Date()).toLocaleString()}</td>
                  <td className="td">{c ? `${c.nombre} ${c.apellido}` : ""}</td>
                  <td className="td">{v.vendedor}</td>
                  <td className="td text-right">{money(v.total)}</td>
                  <td className="td"><button className="btn-outline" onClick={() => descargar(v)}>Descargar factura</button></td>
                </tr>
              );
            })}
            {!ventas.length && (<tr><td className="td text-center muted py-8" colSpan={6}>Sin ventas</td></tr>)}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ========= Empresa ========= */
function EmpresaTab({ empresa, setEmpresa, onReset }) {
  const [form, setForm] = useState(empresa);
  useEffect(() => setForm(empresa), [empresa]);
  return (
    <Section title="Empresa" right={<button className="btn-danger" onClick={onReset}>Recargar</button>}>
      <div className="grid gap-3 max-w-xl">
        <Field label="Nombre"><input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}/></Field>
        <Field label="Ubicación"><input className="input" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}/></Field>
        <Field label="Teléfono"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}/></Field>
        <div className="pt-1"><button className="btn-primary" onClick={() => setEmpresa(form)}>Guardar</button></div>
      </div>
    </Section>
  );
}

/* ========= Factura (PDF) ========= */
async function generarFacturaPDF({ venta, clientes, productosById }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margen = 36;
  const ancho = 595 - margen * 2;

  // Empresa se imprime con lo que haya actualmente en local (ya está en estado)
  const empresaLS = JSON.parse(localStorage.getItem("ventas-sim:empresa") || "null");

  const empresa = empresaLS || { nombre: "Empresa", ubicacion: "", telefono: "" };

  let y = margen;
  doc.setFontSize(16); doc.setFont(undefined, "bold");
  doc.text(empresa.nombre || "Empresa", margen, y);
  doc.setFontSize(10); doc.setFont(undefined, "normal");
  y += 16; doc.text(empresa.ubicacion || "", margen, y);
  y += 14; doc.text(`Tel: ${empresa.telefono || ""}`, margen, y);

  y = margen; const xRight = 595 - margen;
  doc.setFont(undefined, "bold"); doc.text("FACTURA", xRight, y, { align: "right" });
  doc.setFont(undefined, "normal");
  y += 14; doc.text(`No.: ${venta.id ?? ""}`, xRight, y, { align: "right" });
  y += 14; doc.text(`Fecha: ${new Date(venta.fechaISO || venta.fecha || new Date()).toLocaleString()}`, xRight, y, { align: "right" });
  y += 14; doc.text(`Vendedor: ${venta.vendedor}`, xRight, y, { align: "right" });

  y += 24; doc.setFont(undefined, "bold"); doc.text("Cliente", margen, y);
  doc.setFont(undefined, "normal");
  const c = clientes.find((x) => x.id === venta.clienteId);
  y += 14; doc.text(`Nombre: ${c ? `${c.nombre} ${c.apellido}` : ""}`, margen, y);
  y += 14; doc.text(`Cédula/NIT: ${c?.cedula || ""}`, margen, y);
  y += 14; doc.text(`Dirección: ${c?.direccion || ""}`, margen, y);

  y += 24; doc.setFont(undefined, "bold"); doc.text("Detalle", margen, y);
  y += 10; doc.setLineWidth(0.5); doc.line(margen, y, margen + ancho, y);
  y += 14; doc.setFont(undefined, "normal");

  const colW = [ancho * 0.5, ancho * 0.16, ancho * 0.12, ancho * 0.22];
  const printRow = (cells) => { let x = margen; cells.forEach((t, i) => { doc.text(String(t), x, y); x += colW[i]; }); y += 16; };

  printRow(["Producto", "Precio", "Cant.", "Subtotal"]);
  y -= 8; doc.setLineWidth(0.2); doc.line(margen, y, margen + ancho, y); y += 14;

  (venta.items || []).forEach((it) => {
    const p = productosById[it.productId];
    printRow([p?.nombre || `#${it.productId}`, money(it.precio), it.cantidad, money(it.cantidad * it.precio)]);
  });

  y += 6; doc.setLineWidth(0.5); doc.line(margen, y, margen + ancho, y); y += 18;
  doc.setFont(undefined, "bold"); doc.text("Total:", margen + colW[0] + colW[1] + colW[2], y);
  doc.text(money(venta.total), margen + colW[0] + colW[1] + colW[2] + 80, y);

  y += 28; doc.setFont(undefined, "normal"); doc.setFontSize(9);
  doc.text("Gracias por su compra.", margen, y);

  doc.save(`factura_${venta.id ?? "venta"}.pdf`);
}

/* ========= App ========= */
export default function App() {
  const store = useStore();
  const [tab, setTab] = useState("vender");

  return (
    <div className="min-h-screen">
      <TopBar tab={tab} onTab={setTab} />
      <div className="container-app space-y-6 py-6">
        {store.cargando && (
          <div className="card card-body">Cargando datos…</div>
        )}
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
            onRegistrarVenta={store.registrarVenta}
          />
        )}
        {tab === "ventas" && (
          <VentasTab ventas={store.ventas} clientes={store.clientes} productos={store.productos} />
        )}
        {tab === "empresa" && (
          <EmpresaTab empresa={store.empresa} setEmpresa={store.setEmpresa} onReset={store.resetAll} />
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
