
export default function RemindersPage() {
    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="mb-8 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Hatırlatmalar
                </h1>
                <p className="text-slate-400 mt-2">Günlük görevler ve takip listesi.</p>
            </div>
            <div className="grid gap-6">
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                    <p className="text-slate-400">Hatırlatıcılar burada olacak...</p>
                </div>
            </div>
        </div>
    )
}
