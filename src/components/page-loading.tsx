export function PageLoading() {
  return <div className="page-loading" role="status">
    <span className="page-loading-spinner" aria-hidden="true" />
    <div className="page-loading-skeleton" aria-hidden="true">
      <span className="page-loading-bar page-loading-bar-title" />
      <span className="page-loading-bar" />
      <span className="page-loading-bar" />
    </div>
    <span className="page-loading-text">Loading… · Cargando…</span>
  </div>;
}
