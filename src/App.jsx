import React, { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import ScannerZXing from "./components/ScannerZXing"; // ⬅️ nuevo

/* ========= utilidades ========= */
const money = (n) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(
    Number(n || 0)
  );
const todayISO = () => new Date().toISOString();
const nextId = (arr) => (arr.length ? Math.max(...arr.map((x) => x.id || 0)) + 1 : 1);

/* ========= datos iniciales ========= */
const seedEmpresa = {
  id: 1,
  nombre: "Mi Empresa",
  ubicacion: "Ciudad, Guatemala",
  telefono: "5555-0000",
};
const seedClientes = [
  { id: 1, cedula: "", nombre: "C/F", apellido: "", telefono: "", direccion: "" },
  { id: 2, cedula: "1234567-8", nombre: "Ana", apellido: "Pérez", telefono: "5555-0001", direccion: "Zona 1" },
];
const seedProductos = [
  { id: 1, nombre: "Lector de codigo de barras", codigo: "810098151139", stock: 100, precio: 4.5 },
  { id: 2, nombre: "Libro muchos cuerpos una misma alma", codigo: "9788496546080", stock: 60, precio: 18.0 },
];
const seedVentas = [
  {
    id: 1,
    clienteId: 1, // C/F
    vendedor: "Kenny",
    fechaISO: "2025-10-10T09:32:00Z",
    total: 63.0,
    items: [
      { productId: 1, cantidad: 3, precio: 4.5 },
      { productId: 2, cantidad: 3, precio: 18.0 },
    ],
  },
  {
    id: 2,
    clienteId: 2, // Ana Pérez
    vendedor: "Mario",
    fechaISO: "2025-10-11T15:45:00Z",
    total: 22.5,
    items: [
      { productId: 1, cantidad: 5, precio: 4.5 },
    ],
  },
  {
    id: 3,
    clienteId: 2,
    vendedor: "Eiler",
    fechaISO: "2025-10-12T11:15:00Z",
    total: 36.0,
    items: [
      { productId: 2, cantidad: 2, precio: 18.0 },
    ],
  },
];


/* ========= almacenamiento local ========= */
function useStore() {
  const [empresa, setEmpresa] = useState(() => loadLS("empresa", seedEmpresa));
  const [clientes, setClientes] = useState(() => loadLS("clientes", seedClientes));
  const [productos, setProductos] = useState(() => loadLS("productos", seedProductos));
  const [ventas, setVentas] = useState(() => loadLS("ventas", seedVentas));

  useEffect(() => saveLS("empresa", empresa), [empresa]);
  useEffect(() => saveLS("clientes", clientes), [clientes]);
  useEffect(() => saveLS("productos", productos), [productos]);
  useEffect(() => saveLS("ventas", ventas), [ventas]);

  const addProducto = (p) => setProductos((arr) => [...arr, { ...p, id: nextId(arr) }]);
  const updateProducto = (p) => setProductos((arr) => arr.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
  const deleteProducto = (id) => setProductos((arr) => arr.filter((x) => x.id !== id));

  const addCliente = (c) => setClientes((arr) => [...arr, { ...c, id: nextId(arr) }]);
  const updateCliente = (c) => setClientes((arr) => arr.map((x) => (x.id === c.id ? { ...x, ...c } : x)));
  const deleteCliente = (id) => setClientes((arr) => arr.filter((x) => x.id !== id));

  const registrarVenta = (venta) => {
    setVentas((arr) => [...arr, { ...venta, id: nextId(arr) }]);
    setProductos((arr) =>
      arr.map((p) => {
        const it = venta.items.find((i) => i.productId === p.id);
        return it ? { ...p, stock: Math.max(0, p.stock - it.cantidad) } : p;
      })
    );
  };

  const resetAll = () => {
    setEmpresa(seedEmpresa);
    setClientes(seedClientes);
    setProductos(seedProductos);
    setVentas([]);
  };

  return {
    empresa, setEmpresa,
    clientes, addCliente, updateCliente, deleteCliente,
    productos, addProducto, updateProducto, deleteProducto,
    ventas, registrarVenta, resetAll,
  };
}
function loadLS(k, fallback) {
  try { const raw = localStorage.getItem(`ventas-sim:${k}`); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function saveLS(k, v) {
  try { localStorage.setItem(`ventas-sim:${k}`, JSON.stringify(v)); } catch {}
}

/* ========= componentes base ========= */
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

/* ========= Productos (CRUD) ========= */
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
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, stock: Number(f.stock), precio: Number(f.precio) }); }} className="grid gap-3">
      <Field label="Nombre"><input className="input" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required/></Field>
      <Field label="Código"><input className="input" value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })}/></Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Stock"><input type="number" className="input" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })}/></Field>
        <Field label="Precio"><input type="number" step="0.01" className="input" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })}/></Field>
      </div>
      <div className="flex justify-end"><button type="submit" className="btn-primary">Guardar</button></div>
    </form>
  );
}

/* ========= Clientes (CRUD) ========= */
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

/* ========= Vender (con ZXing) ========= */
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

  const handleAdd = () => {
    const val = productIdOrCode.trim();
    if (!val) return;
    const p = /^\d+$/.test(val) ? (productosById[Number(val)] || productosByCode[val]) : productosByCode[val];
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
    onRegistrarVenta(venta);
    await generarFacturaPDF({ venta, clientes, productosById });
    setCart([]);
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Section title="Nueva venta">
        {/* input arriba */}
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
            // Si quieres agregar automáticamente al leer:
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
                  <td className="td">{new Date(v.fechaISO).toLocaleString()}</td>
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
    <Section title="Empresa" right={<button className="btn-danger" onClick={onReset}>Restablecer datos</button>}>
      <div className="grid gap-3 max-w-xl">
        <Field label="Nombre"><input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}/></Field>
        <Field label="Ubicación"><input className="input" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}/></Field>
        <Field label="Teléfono"><input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}/></Field>
        <div className="pt-1"><button className="btn-primary" onClick={() => setEmpresa(form)}>Guardar</button></div>
      </div>
    </Section>
  );
}

/* ========= Factura ========= */
async function generarFacturaPDF({ venta, clientes, productosById }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margen = 36;
  const ancho = 595 - margen * 2;

  const empresa = JSON.parse(localStorage.getItem("ventas-sim:empresa") || "null") || seedEmpresa;

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
  y += 14; doc.text(`Fecha: ${new Date(venta.fechaISO).toLocaleString()}`, xRight, y, { align: "right" });
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

  venta.items.forEach((it) => {
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

/* ========= App principal ========= */
export default function App() {
  const store = useStore();
  const [tab, setTab] = useState("vender");

  return (
    <div className="min-h-screen">
      <TopBar tab={tab} onTab={setTab} />
      <div className="container-app space-y-6 py-6">
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
