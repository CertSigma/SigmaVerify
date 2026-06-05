import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import Anthropic from '@anthropic-ai/sdk'
import { UserPlus, Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { supabase, invokeFunction } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const manualSchema = z.object({
  full_name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
})
type ManualFormData = z.infer<typeof manualSchema>

interface BulkEmployee { full_name: string; email: string; phone?: string; error?: string }

export default function AddEmployee() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [bulkEmployees, setBulkEmployees] = useState<BulkEmployee[]>([])
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeData, setResumeData] = useState<{ full_name: string; email: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ManualFormData>({
    resolver: zodResolver(manualSchema),
  })

  const addAndInvite = async (employees: BulkEmployee[]) => {
    const results = await Promise.all(employees.map(async emp => {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          hr_id: profile!.id,
          full_name: emp.full_name,
          email: emp.email,
          phone: emp.phone ?? null,
          status: 'pending_initiation',
        })
        .select()
        .single()

      if (error || !data) return { ok: false, name: emp.full_name }

      await supabase.from('audit_logs').insert({
        actor_id: profile!.id,
        action: 'employee_added',
        entity_type: 'employee',
        entity_id: data.id,
        metadata: { email: data.email, status: 'pending_initiation' },
      })

      return { ok: true, name: emp.full_name }
    }))

    return results
  }

  const manualMutation = useMutation({
    mutationFn: (data: ManualFormData) => addAndInvite([data]),
    onSuccess: () => {
      toast.success('Employee added successfully')
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate('/hr/dashboard')
    },
    onError: () => toast.error('Failed to add employee'),
  })

  const bulkMutation = useMutation({
    mutationFn: () => addAndInvite(bulkEmployees.filter(e => !e.error)),
    onSuccess: (results) => {
      const ok = results.filter(r => r.ok).length
      toast.success(`${ok} employee(s) added successfully`)
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate('/hr/dashboard')
    },
    onError: () => toast.error('Bulk add failed'),
  })

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      const parsed: BulkEmployee[] = rows.map(row => {
        const name = String(row['Name'] ?? row['Full Name'] ?? row['full_name'] ?? '').trim()
        const email = String(row['Email'] ?? row['email'] ?? '').trim()
        const phone = String(row['Phone'] ?? row['phone'] ?? '').trim()

        if (!name) return { full_name: name, email, phone, error: 'Name missing' }
        if (!email || !z.string().email().safeParse(email).success)
          return { full_name: name, email, phone, error: 'Invalid email' }

        return { full_name: name, email, phone: phone || undefined }
      })

      setBulkEmployees(parsed)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF resume')
      return
    }

    setResumeLoading(true)
    setResumeData(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

      const client = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true })

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            {
              type: 'text',
              text: 'Extract the candidate\'s full name and email address from this resume. Respond with JSON only: {"full_name": "...", "email": "..."}. If not found, use empty string.',
            },
          ],
        }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { full_name: string; email: string }
        setResumeData(parsed)
        setValue('full_name', parsed.full_name)
        setValue('email', parsed.email)
        toast.success('Resume parsed — please confirm the details')
      } else {
        toast.error('Could not extract data from resume')
      }
    } catch (err) {
      toast.error('Resume parsing failed')
      console.error(err)
    } finally {
      setResumeLoading(false)
      e.target.value = ''
    }
  }

  return (
    <PageWrapper title="Add Employee">
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <Tabs defaultValue="manual">
          <TabsList className="w-full">
            <TabsTrigger value="manual" className="flex-1 gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Manual
            </TabsTrigger>
            <TabsTrigger value="excel" className="flex-1 gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Excel Upload
            </TabsTrigger>
            <TabsTrigger value="resume" className="flex-1 gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Resume Parse
            </TabsTrigger>
          </TabsList>

          {/* Manual */}
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Add Employee Manually</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(data => manualMutation.mutate(data))} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name *</Label>
                    <Input placeholder="Rahul Kumar" {...register('full_name')} />
                    {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input type="email" placeholder="rahul@email.com" {...register('email')} />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone (optional)</Label>
                    <Input placeholder="+91 98765 43210" {...register('phone')} />
                  </div>
                  <Button type="submit" className="w-full" loading={isSubmitting || manualMutation.isPending}>
                    Add Employee
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Excel */}
          <TabsContent value="excel">
            <Card>
              <CardHeader>
                <CardTitle>Upload Excel File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a .xlsx file with columns: <strong>Name</strong>, <strong>Email</strong>, Phone (optional)
                </p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Excel File
                </Button>

                {bulkEmployees.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground">
                      {bulkEmployees.filter(e => !e.error).length} valid / {bulkEmployees.length} total
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {bulkEmployees.map((emp, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            emp.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'
                          }`}
                        >
                          {emp.error
                            ? <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          <span className="flex-1 truncate">{emp.full_name || '(No name)'} · {emp.email}</span>
                          {emp.error && <span className="text-xs opacity-70">{emp.error}</span>}
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      loading={bulkMutation.isPending}
                      disabled={!bulkEmployees.some(e => !e.error)}
                      onClick={() => bulkMutation.mutate()}
                    >
                      Add {bulkEmployees.filter(e => !e.error).length} Employees
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resume */}
          <TabsContent value="resume">
            <Card>
              <CardHeader>
                <CardTitle>Parse from Resume</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a PDF resume — AI will extract the candidate's name and email for you to confirm.
                </p>
                <input ref={resumeInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleResumeUpload} />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => resumeInputRef.current?.click()}
                  loading={resumeLoading}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {resumeLoading ? 'Parsing resume...' : 'Upload PDF Resume'}
                </Button>

                {resumeData && (
                  <div className="p-3 bg-[#063840]/5 rounded-lg border border-[#063840]/20 text-sm">
                    <p className="font-medium text-[#063840] mb-1">Extracted from resume:</p>
                    <p>Name: <strong>{resumeData.full_name || '—'}</strong></p>
                    <p>Email: <strong>{resumeData.email || '—'}</strong></p>
                  </div>
                )}

                <form onSubmit={handleSubmit(data => manualMutation.mutate(data))} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name *</Label>
                    <Input placeholder="Auto-filled from resume" {...register('full_name')} />
                    {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input type="email" placeholder="Auto-filled from resume" {...register('email')} />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone (optional)</Label>
                    <Input placeholder="+91 98765 43210" {...register('phone')} />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    loading={isSubmitting || manualMutation.isPending}
                    disabled={!resumeData}
                  >
                    Confirm & Add Employee
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  )
}
