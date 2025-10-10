interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}

export function StatCard({ icon, label, value, description }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent">
      <div className="mb-2 flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mb-1 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}
