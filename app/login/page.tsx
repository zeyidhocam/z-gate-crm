"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, ChevronRight, Fingerprint, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                toast.error("Giriş başarısız!", { description: error.message })
                setLoading(false)
                return
            }

            toast.success("Giriş Başarılı", { description: "Yönlendiriliyorsunuz..." })
            router.push("/")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Bir hata oluştu")
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">

                {/* Logo & Header */}
                <div className="text-center mb-8 space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 shadow-[0_0_40px_-10px_rgba(34,211,238,0.5)] mb-4">
                        <Fingerprint className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Z-Gate <span className="text-cyan-400">Security</span>
                    </h1>
                    <p className="text-slate-400 text-sm">
                        Lütfen yetkili personel girişi yapınız.
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-6">

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-300 ml-1">E-Posta Adresi</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-slate-950/50 border-slate-700 pl-10 text-slate-200 focus:border-cyan-500/50 transition-all h-11"
                                    placeholder="admin@z-gate.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-300 ml-1">Güvenlik Anahtarı (Şifre)</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-slate-950/50 border-slate-700 pl-10 text-slate-200 focus:border-cyan-500/50 transition-all h-11"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold h-11 shadow-lg shadow-cyan-900/30 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/80" />
                            ) : (
                                <>
                                    Sisteme Giriş Yap
                                    <ChevronRight className="ml-2 w-4 h-4" />
                                </>
                            )}
                        </Button>

                    </form>
                </div>

                {/* Footer Security Badge */}
                <div className="mt-8 flex items-center justify-center gap-2 text-slate-600 text-xs font-medium opacity-60">
                    <ShieldCheck size={14} />
                    <span>256-bit SSL Secured Connection</span>
                </div>
            </div>
        </div>
    )
}
