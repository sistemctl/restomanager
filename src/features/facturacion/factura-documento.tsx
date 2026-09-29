import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { FacturaData } from "@/features/facturacion/factura-data";

const styles = StyleSheet.create({
  page: { padding: 38, fontFamily: "Helvetica", fontSize: 9, color: "#1e293b" },
  header: { borderBottomWidth: 2, borderBottomColor: "#e63946", paddingBottom: 14, marginBottom: 18 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  muted: { color: "#64748b", marginTop: 3 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  meta: { textAlign: "right", color: "#475569" },
  tableHeader: { flexDirection: "row", backgroundColor: "#0f172a", color: "#ffffff", padding: 8, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 8, paddingHorizontal: 8 },
  qty: { width: "10%" }, item: { width: "65%" }, amount: { width: "25%", textAlign: "right" },
  modifier: { color: "#64748b", fontSize: 8, marginTop: 3 },
  totals: { marginTop: 16, marginLeft: "55%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#0f172a", marginTop: 5, paddingTop: 8, fontSize: 14, fontFamily: "Helvetica-Bold" },
  payments: { marginTop: 22, padding: 12, backgroundColor: "#f8fafc" },
  footer: { position: "absolute", bottom: 28, left: 38, right: 38, textAlign: "center", color: "#94a3b8", fontSize: 8 },
});

export function FacturaDocumento({ data }: { data: FacturaData }) {
  const { pedido, config } = data;
  const simbolo = config?.simboloMoneda ?? "$";
  const money = (value: number) => `${simbolo} ${value.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
  return <Document title={`Comprobante ${pedido.codigo}`} author={config?.nombreRestaurante ?? "RestoManager"}>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}><Text style={styles.brand}>{config?.nombreRestaurante ?? "RestoManager"}</Text>{config?.razonSocial && <Text style={styles.muted}>{config.razonSocial}</Text>}<Text style={styles.muted}>{[config?.identificacionTributaria && `NIT ${config.identificacionTributaria}`, config?.direccion, config?.ciudad, config?.telefono].filter(Boolean).join(" · ")}</Text></View>
      <View style={styles.titleRow}><View><Text style={styles.title}>COMPROBANTE DE VENTA</Text><Text style={styles.muted}>Documento interno - #{pedido.codigo}</Text></View><View><Text style={styles.meta}>{new Date(pedido.createdAt).toLocaleString("es-CO")}</Text><Text style={styles.meta}>{pedido.mesa ? `${pedido.mesa.sala.nombre} · Mesa ${pedido.mesa.numero}` : pedido.tipo.replace("_", " ")}</Text><Text style={styles.meta}>Atendió: {pedido.usuario?.nombre ?? "-"}</Text></View></View>
      <View style={styles.tableHeader}><Text style={styles.qty}>Cant.</Text><Text style={styles.item}>Producto</Text><Text style={styles.amount}>Importe</Text></View>
      {pedido.detalles.map((detalle) => <View key={detalle.id} style={styles.row}><Text style={styles.qty}>{detalle.cantidad}</Text><View style={styles.item}><Text>{detalle.nombre}</Text>{detalle.modificadores.map((m) => <Text key={m} style={styles.modifier}>+ {m}</Text>)}</View><Text style={styles.amount}>{money(detalle.subtotal)}</Text></View>)}
      <View style={styles.totals}><View style={styles.totalRow}><Text>Subtotal</Text><Text>{money(pedido.subtotal)}</Text></View>{pedido.descuento > 0 && <View style={styles.totalRow}><Text>Descuento</Text><Text>- {money(pedido.descuento)}</Text></View>}<View style={styles.totalRow}><Text>Impuestos</Text><Text>{money(pedido.impuesto)}</Text></View>{pedido.propina > 0 && <View style={styles.totalRow}><Text>Propina</Text><Text>{money(pedido.propina)}</Text></View>}<View style={styles.grandTotal}><Text>Total</Text><Text>{money(pedido.total + pedido.propina)}</Text></View></View>
      <View style={styles.payments}><Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 6 }}>Pagos</Text>{pedido.pagos.map((pago) => <View key={pago.id} style={styles.totalRow}><Text>{pago.metodoPago.replaceAll("_", " ")}{pago.comensal ? ` · Comensal ${pago.comensal}` : ""}</Text><Text>{money(pago.monto)}</Text></View>)}</View>
      <Text style={styles.footer}>{config?.mensajeTicket ?? "Gracias por su visita"} · Generado por RestoManager</Text>
    </Page>
  </Document>;
}
