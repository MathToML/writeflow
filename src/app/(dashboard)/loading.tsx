export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-slate-200 rounded-lg" />
      <div className="space-y-3">
        <div className="h-24 bg-slate-100 rounded-xl" />
        <div className="h-16 bg-slate-100 rounded-xl" />
        <div className="h-16 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}
