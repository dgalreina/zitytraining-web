export function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-[#a2c037]/15 text-[#4b7a1f]',
    inactive: 'bg-gray-100 text-gray-600',
    deleted: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    deleted: 'Eliminado',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.inactive}`}>
      {labels[status] || status}
    </span>
  );
}
