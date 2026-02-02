
export default function RemindersPage() {
    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="mb-8 border-b border-cyan-500/10 pb-6">
                <h1 className="text-3xl font-bold text-gradient-ocean">
                    Hatırlatmalar
                </h1>
                <p className="text-slate-400 mt-2">Günlük görevler ve takip listesi.</p>
            </div>
            <div className="grid gap-6">
                <div className="bg-[#0c1929]/80 p-6 rounded-xl border border-cyan-500/10">
                    <p className="text-slate-400">Hatırlatıcılar burada olacak...</p>
                </div>
            </div>
        </div>
    )
}
