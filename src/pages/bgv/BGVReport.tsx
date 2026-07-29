import { Document, Page, Text, View, Image, Link, StyleSheet } from '@react-pdf/renderer'
import { DOC_TYPE_LABELS } from '@/lib/types'
import type { Employee, DocType, VerificationStatus } from '@/lib/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { backgroundColor: '#063840', padding: 24, marginBottom: 24, borderRadius: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { color: '#6FC2CB', fontSize: 18, fontFamily: 'Helvetica-Bold' },
  tagline: { color: '#6FC2CB', fontSize: 8, marginTop: 2 },
  reportTitle: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#063840', marginBottom: 10, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  row: { flexDirection: 'row', marginBottom: 6 },
  label: { fontSize: 9, color: '#64748b', width: 120 },
  value: { fontSize: 9, color: '#0f172a', flex: 1, fontFamily: 'Helvetica-Bold' },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 8, borderRadius: 4 },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  colDocument: { flex: 2, fontSize: 9 },
  colStatus: { flex: 1, fontSize: 9 },
  colNotes: { flex: 2, fontSize: 9 },
  tableHeaderText: { fontSize: 8, color: '#64748b', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  verdictBox: { padding: 16, borderRadius: 8, marginBottom: 20 },
  verdictText: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  verdictSub: { fontSize: 9, textAlign: 'center', marginTop: 4 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerText: { fontSize: 8, color: '#94a3b8', textAlign: 'center' },
  docImage: { width: '100%', height: 140, objectFit: 'contain', borderRadius: 4, marginBottom: 4 },
  docLink: { fontSize: 8, color: '#2563eb', textDecoration: 'underline', textAlign: 'center' },
  docCard: { width: '30%', marginBottom: 12 },
  docRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
})

const statusColors: Record<VerificationStatus, string> = {
  pending: '#64748b',
  in_progress: '#2563eb',
  verified: '#16a34a',
  failed: '#dc2626',
}

interface ReportVerification {
  docType: DocType
  status: VerificationStatus
  notes: string
}

interface ReportDocument {
  docType: DocType
  signedUrl: string
  isImage: boolean
}

interface BGVReportProps {
  employee: Employee
  verifications: ReportVerification[]
  documents: ReportDocument[]
  verifiedBy: string
  verdict: 'CLEAR' | 'DISCREPANCY FOUND'
  generatedAt: string
}

export function BGVReport({ employee, verifications, documents, verifiedBy, verdict, generatedAt }: BGVReportProps) {
  const isClear = verdict === 'CLEAR'

  const formatDt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.logo}>relynt</Text>
              <Text style={styles.tagline}>Secure Background Verification Platform</Text>
            </View>
            <View>
              <Text style={{ color: '#6FC2CB', fontSize: 9 }}>Report Date</Text>
              <Text style={{ color: '#ffffff', fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
                {formatDt(generatedAt)}
              </Text>
            </View>
          </View>
          <Text style={styles.reportTitle}>Background Verification Report</Text>
        </View>

        {/* Verdict */}
        <View style={[styles.verdictBox, { backgroundColor: isClear ? '#f0fdf4' : '#fef2f2', borderWidth: 1, borderColor: isClear ? '#bbf7d0' : '#fecaca' }]}>
          <Text style={[styles.verdictText, { color: isClear ? '#16a34a' : '#dc2626' }]}>
            {isClear ? '✓ CLEAR' : '⚠ DISCREPANCY FOUND'}
          </Text>
          <Text style={[styles.verdictSub, { color: isClear ? '#166534' : '#991b1b' }]}>
            {isClear
              ? 'All verification checks have passed successfully.'
              : 'One or more verification checks require attention. See details below.'}
          </Text>
        </View>

        {/* Employee details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Candidate Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Full Name</Text>
            <Text style={styles.value}>{employee.full_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email Address</Text>
            <Text style={styles.value}>{employee.email}</Text>
          </View>
          {employee.phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{employee.phone}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Documents Submitted</Text>
            <Text style={styles.value}>{employee.submitted_at ? formatDt(employee.submitted_at) : '—'}</Text>
          </View>
        </View>

        {/* Verification table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Results</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDocument, styles.tableHeaderText]}>Document</Text>
              <Text style={[styles.colStatus, styles.tableHeaderText]}>Status</Text>
              <Text style={[styles.colNotes, styles.tableHeaderText]}>Notes</Text>
            </View>
            {verifications.map(v => (
              <View key={v.docType} style={styles.tableRow}>
                <Text style={[styles.colDocument, { color: '#0f172a' }]}>{DOC_TYPE_LABELS[v.docType]}</Text>
                <Text style={[styles.colStatus, { color: statusColors[v.status], fontFamily: 'Helvetica-Bold' }]}>
                  {v.status.charAt(0).toUpperCase() + v.status.replace(/_/g, ' ').slice(1)}
                </Text>
                <Text style={[styles.colNotes, { color: '#475569' }]}>{v.notes || '—'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Document Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submitted Documents</Text>
          <View style={styles.docRow}>
            {documents.map(doc => (
              <View key={doc.docType} style={styles.docCard}>
                <Text style={{ fontSize: 8, color: '#063840', fontFamily: 'Helvetica-Bold', marginBottom: 4, textAlign: 'center' }}>
                  {DOC_TYPE_LABELS[doc.docType]}
                </Text>
                {doc.isImage ? (
                  <Image src={doc.signedUrl} style={styles.docImage} />
                ) : (
                  <View style={{ height: 140, backgroundColor: '#f8fafc', borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 8, color: '#64748b' }}>PDF</Text>
                    <Text style={{ fontSize: 7, color: '#94a3b8', marginTop: 2 }}>View via link below</Text>
                  </View>
                )}
                <Link src={doc.signedUrl} style={styles.docLink}>View Document</Link>
              </View>
            ))}
          </View>
        </View>

        {/* Sign-off */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Sign-off</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Verified By</Text>
            <Text style={styles.value}>{verifiedBy}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Verified On</Text>
            <Text style={styles.value}>{formatDt(generatedAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Platform</Text>
            <Text style={styles.value}>relynt — Secure BGV Platform</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This report is confidential and intended for authorized HR personnel only.
            Generated by relynt · {formatDt(generatedAt)}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
