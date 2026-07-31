import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  companyName: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#555", marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 18 },
  table: { display: "flex", width: "100%" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e5e5", paddingVertical: 6 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    fontWeight: 700,
  },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.3, textAlign: "right" },
  aiNote: { color: "#a15c00", fontSize: 8, marginTop: 2 },
  totalsBlock: { marginTop: 16, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalsLabel: { color: "#555" },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#333" },
  grandTotalLabel: { fontWeight: 700, fontSize: 12 },
  grandTotalValue: { fontWeight: 700, fontSize: 12 },
  footer: { marginTop: 32, fontSize: 8, color: "#888" },
});

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export type EstimatePdfProps = {
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    licenseNo: string;
  };
  job: {
    title: string;
    siteAddress: string | null;
  };
  client: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  estimate: {
    version: number;
    createdAt: Date;
    materialSubtotal: number;
    laborSubtotal: number;
    total: number;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unit: string | null;
    clientPrice: number;
    aiEstimated: boolean;
  }>;
};

export function EstimatePdf({ company, job, client, estimate, lineItems }: EstimatePdfProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address ? <Text style={styles.muted}>{company.address}</Text> : null}
            {company.phone ? <Text style={styles.muted}>{company.phone}</Text> : null}
            {company.email ? <Text style={styles.muted}>{company.email}</Text> : null}
            {company.licenseNo ? <Text style={styles.muted}>License #{company.licenseNo}</Text> : null}
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: 700 }}>Estimate</Text>
            <Text style={styles.muted}>Version {estimate.version}</Text>
            <Text style={styles.muted}>{estimate.createdAt.toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={styles.sectionTitle}>Prepared for</Text>
            <Text>{client.name}</Text>
            {client.email ? <Text style={styles.muted}>{client.email}</Text> : null}
            {client.phone ? <Text style={styles.muted}>{client.phone}</Text> : null}
          </View>
          <View>
            <Text style={styles.sectionTitle}>Project</Text>
            <Text>{job.title}</Text>
            {job.siteAddress ? <Text style={styles.muted}>{job.siteAddress}</Text> : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Price</Text>
          </View>
          {lineItems.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.colDescription}>
                <Text>{item.description}</Text>
                {item.aiEstimated ? (
                  <Text style={styles.aiNote}>AI-estimated cost</Text>
                ) : null}
              </View>
              <Text style={styles.colQty}>
                {item.quantity}
                {item.unit ? ` ${item.unit}` : ""}
              </Text>
              <Text style={styles.colPrice}>{money(item.clientPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Material</Text>
            <Text>{money(estimate.materialSubtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Labor</Text>
            <Text>{money(estimate.laborSubtotal)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{money(estimate.total)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This estimate is valid for 30 days from the date above. Final pricing may be adjusted
          upon discovery of conditions not visible at the time of the site visit.
        </Text>
      </Page>
    </Document>
  );
}
