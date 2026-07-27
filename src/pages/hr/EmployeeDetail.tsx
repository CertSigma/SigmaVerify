import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, ExternalLink, Mail, Phone, Calendar } from 'lucide-react'
import { supabase, getSignedUrl } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { StatusBadge, VerificationBadge } from '@/components/dashboard/StatusBadge'
import { Progress } from '@/components/ui/progress'
import { formatDate, formatDateTime } from '@/lib/utils'
import { DOC_TYPE_LABELS, ALL_DOC_TYPES } from '@/lib/types'
import type { Employee, Verification, EmployeeDocument, Report } from '@/lib/types'

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['employee-detail', id],
    queryFn: async () => {
      const [empRes, verRes, docRes, repRes] = await Promise.all([
        supabase.from('employees').select('*').eq('id', id!).single(),
        supabase.from('verifications').select('*').eq('employee_id', id!),
        supabase.from('employee_documents').select('*').eq('employee_id', id!),
        supabase.from('reports').select('*').eq('employee_id', id!).maybeSingle(),
      ])

      return {
        employee: empRes.data as Employee | null,
        verifications: (verRes.data ?? []) as Verification[],
        documents: (docRes.data ?? []) as EmployeeDocument[],
        report: repRes.data as Report | null,
      }
    },
    enabled: !!id,
  })

  const handleDownload = async (filePath: string, label: string) => {
    const url = await getSignedUrl('employee-docs', filePath)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = label
      a.target = '_blank'
      a.click()
    }
  }

  const progress = data
    ? Math.round(
      (data.verifications.filter(v => v.status === 'verified' || v.status === 'failed').length / 5) * 100
    )
    : 0

  if (isLoading) {
    return (
      <PageWrapper title="Employee Details">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    )
  }

  const { employee, verifications, documents, report } = data ?? {}

  if (!employee) {
    return (
      <PageWrapper title="Employee Details">
        <div className="text-center py-12 text-muted-foreground">Employee not found</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Employee Details">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Employee info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#063840]/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-[#063840] text-xl font-bold">{employee.full_name.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{employee.full_name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" /> {employee.email}
                    </span>
                    {employee.phone && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" /> {employee.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" /> Added {formatDate(employee.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <StatusBadge status={employee.status} />
            </div>

            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Verification Progress</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Report */}
        {report?.report_url && (
          <Card className="border-[#34C270] bg-green-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">BGV Report Ready</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Generated {formatDateTime(report.generated_at)}</p>
                </div>
                <Button
                  variant="success"
                  size="sm"
                  onClick={async () => {
                    const url = await getSignedUrl('reports', report.report_url!)
                    if (url) window.open(url, '_blank')
                  }}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verifications */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ALL_DOC_TYPES.map(docType => {
                const verif = verifications?.find(v => v.doc_type === docType)
                const doc = documents?.find(d => d.doc_type === docType)

                return (
                  <div key={docType} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{DOC_TYPE_LABELS[docType]}</div>
                      {verif?.notes && (
                        <div className="text-xs text-muted-foreground mt-0.5">{verif.notes}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {doc && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc.file_path, DOC_TYPE_LABELS[docType])}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <VerificationBadge status={verif?.status ?? 'pending'} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
